#!/usr/bin/env node
/**
 * Inject the NNF icon set into the deployed site (site/index.html).
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
 * This script extracts that geometry, re-encodes it the way the bundle does
 * (`"` -> \", `/` -> /, self-closing tags -> explicit close tags), and
 * replaces the existing ICONS array in place.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'raw-icons');
const sitePath = join(root, 'site', 'index.html');

/** Extract the inner geometry of an icon SVG (content of its outer <g>). */
function extractInner(svg) {
  const body = svg.replace(/[\s\S]*?<svg[^>]*>/i, '').replace(/<\/svg>[\s\S]*$/i, '');
  return body
    .replace(/^\s*<g\b[^>]*>/i, '') // drop the outer stroke wrapper's opening tag
    .replace(/<\/g>\s*$/i, '')      // ...and its closing tag (nested <g> kept)
    .trim();
}

/** Normalise geometry to the bundle's tag style and collapse whitespace. */
function normalise(inner) {
  return inner
    // Strip baked-in presentation attributes so each element inherits stroke
    // and fill from the page's treatment wrapper <g>. Without this, the source
    // SVGs' hardcoded stroke="#2355C8" overrides the treatment colour, making
    // the icon invisible on the blue-circle treatment (blue on blue) and wrong
    // on the white/white-circle treatments.
    .replace(/\s+(stroke|stroke-width|stroke-linecap|stroke-linejoin|fill)="[^"]*"/g, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    // self-closing -> explicit open/close, matching existing entries
    .replace(/<([a-zA-Z]+)((?:\s+[\w:-]+="[^"]*")*)\s*\/>/g, '<$1$2></$1>')
    .trim();
}

/** Encode a normalised inner string into the escaped payload form. */
function encodeInner(inner) {
  return inner.replace(/"/g, '\\"').replace(/\//g, '\\u002F');
}

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

  const inner = normalise(extractInner(readFileSync(join(srcDir, file), 'utf8')));
  if (!inner) {
    console.warn(`skip (empty geometry): ${file}`);
    continue;
  }
  if (inner.includes('[') || inner.includes(']')) {
    throw new Error(`Geometry of ${file} contains a bracket; would break array parsing.`);
  }
  entries.push(
    `    { category: \\"${category}\\", name: \\"${name}\\", inner: \`${encodeInner(inner)}\` },\\n`
  );
  byCategory[category] = (byCategory[category] || 0) + 1;
}

const newArray = `ICONS = [\\n${entries.join('')}  ]`;

const html = readFileSync(sitePath, 'utf8');
const start = html.indexOf('ICONS = [');
if (start === -1) throw new Error('Could not find ICONS array in site/index.html');
const end = html.indexOf(']', start);
if (end === -1) throw new Error('Could not find end of ICONS array');

const updated = html.slice(0, start) + newArray + html.slice(end + 1);
writeFileSync(sitePath, updated);

console.log(`Injected ${entries.length} icons into site/index.html`);
console.log('Per category:');
for (const [cat, n] of Object.entries(byCategory).sort()) {
  console.log(`  ${cat.padEnd(22)} ${n}`);
}
