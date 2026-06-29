#!/usr/bin/env node
/**
 * Smoke test for the built library. Runs with zero dependencies:
 * validates the generated data/sprite/json against the SVG sources and
 * syntax-checks the generated React modules.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');

let failures = 0;
const check = (cond, msg) => {
  if (cond) {
    console.log(`  ok   ${msg}`);
  } else {
    console.error(`  FAIL ${msg}`);
    failures++;
  }
};

const sources = readdirSync(join(root, 'icons')).filter((f) => f.endsWith('.svg'));
const { icons, iconNames, getIcon } = await import(join(distDir, 'data.mjs'));
const json = JSON.parse(readFileSync(join(distDir, 'icons.json'), 'utf8'));
const sprite = readFileSync(join(distDir, 'sprite.svg'), 'utf8');

console.log('Verifying NNF icon library build...');
check(iconNames.length === sources.length, `data exports all ${sources.length} icons`);
check(json.length === sources.length, `icons.json lists all ${sources.length} icons`);

for (const name of iconNames) {
  const i = getIcon(name);
  check(!!i && i.body.length > 0, `${name}: has non-empty body`);
  check(i.svg.startsWith('<svg') && i.svg.endsWith('</svg>'), `${name}: svg is well-formed`);
  check(sprite.includes(`id="nnf-${name}"`), `${name}: present in sprite`);
}

check(getIcon('does-not-exist') === undefined, 'getIcon returns undefined for unknown name');

for (const mod of ['react.mjs', 'react.cjs', 'data.cjs']) {
  try {
    execFileSync(process.execPath, ['--check', join(distDir, mod)]);
    check(true, `${mod}: syntax valid`);
  } catch {
    check(false, `${mod}: syntax valid`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log(`\nAll checks passed (${iconNames.length} icons).`);
