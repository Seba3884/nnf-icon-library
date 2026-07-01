#!/usr/bin/env node
/**
 * Inject the NNF icon set into the deployed site (site/index.html) from the
 * local raw-icons/ source of truth.
 *
 * The page is a self-contained bundle whose icons live in a single
 * `ICONS = [ { category, name, inner }, ... ]` array embedded inside an
 * escaped JS-string payload. At render time the page wraps each icon's
 * `inner` geometry in:
 *
 *   <g transform="translate(8,8)" stroke=… stroke-width="1.5" fill="none"
 *      stroke-linecap="round" stroke-linejoin="round"> … </g>
 *
 * and (for the "circle" themes) adds <circle cx=20 cy=20 r=16.9706 fill=…>.
 *
 * The source SVGs in raw-icons/ are authored in that exact coordinate system,
 * so each unique icon's geometry is just the inner content of its outer <g>.
 * We use the `_blue` (non-circle) variant of each icon — blue/white share
 * identical geometry, and the page draws the background circle itself.
 *
 * The extract/normalise/encode/splice helpers live in ./svg-geometry.mjs and
 * are shared with scripts/sync-from-sanity.mjs (the CMS-driven flow).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {svgToInner, iconEntry, iconsArray, replaceIconsArray} from './svg-geometry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'raw-icons');
const sitePath = join(root, 'site', 'index.html');

const files = readdirSync(srcDir)
  .filter((f) => f.endsWith('_blue.svg'))
  .sort();

const seen = new Set();
const entries = [];
const byCategory = {};

for (const file of files) {
  const base = file.replace(/\.svg$/, '');
  const parts = base.split('_');
  if (parts.length < 3) {
    console.warn(`skip (unexpected name): ${file}`);
    continue;
  }
  const category = parts[0];
  const name = parts.slice(1, -1).join('_'); // middle segment(s)
  const key = `${category}/${name}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const inner = svgToInner(readFileSync(join(srcDir, file), 'utf8'));
  if (!inner) {
    console.warn(`skip (empty geometry): ${file}`);
    continue;
  }
  if (inner.includes('[') || inner.includes(']')) {
    throw new Error(`Geometry of ${file} contains a bracket; would break array parsing.`);
  }
  entries.push(iconEntry({ category, name, inner }));
  byCategory[category] = (byCategory[category] || 0) + 1;
}

const html = readFileSync(sitePath, 'utf8');
writeFileSync(sitePath, replaceIconsArray(html, iconsArray(entries)));

console.log(`Injected ${entries.length} icons into site/index.html`);
console.log('Per category:');
for (const [cat, n] of Object.entries(byCategory).sort()) {
  console.log(`  ${cat.padEnd(22)} ${n}`);
}
