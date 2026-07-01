#!/usr/bin/env node
/**
 * Build-time bridge: pull icons from Sanity and regenerate the ICONS array in
 * the deployed site (site/index.html).
 *
 * This is the CMS-driven counterpart to scripts/build-site-icons.mjs (which
 * builds from the local raw-icons/ folder). Both share the geometry helpers in
 * ./svg-geometry.mjs, so an icon edited in the Studio renders exactly like a
 * hand-authored raw-icon.
 *
 * Reads from the public `production` dataset over the Sanity query API — no
 * token required. Configure via env (defaults shown):
 *   SANITY_PROJECT_ID=5jdxcai4
 *   SANITY_DATASET=production
 *
 * Run on every deploy (see netlify.toml). Wire a Sanity webhook to the Netlify
 * build hook so publishing an icon triggers a rebuild.
 */
import {readFileSync, writeFileSync} from 'node:fs'
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {
  extractInner,
  normalise,
  encodeInner,
  iconEntry,
  iconsArray,
  replaceIconsArray,
} from './svg-geometry.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sitePath = join(root, 'site', 'index.html')

const projectId = process.env.SANITY_PROJECT_ID || '5jdxcai4'
const dataset = process.env.SANITY_DATASET || 'production'
const apiVersion = process.env.SANITY_API_VERSION || 'v2024-01-01'

const query = '*[_type == "icon" && defined(svg)] | order(category asc, name asc){category, name, svg}'
const url =
  `https://${projectId}.apicdn.sanity.io/${apiVersion}/data/query/${dataset}` +
  `?query=${encodeURIComponent(query)}`

const res = await fetch(url)
if (!res.ok) {
  console.error(`Sanity query failed: ${res.status} ${res.statusText}`)
  console.error(await res.text())
  process.exit(1)
}

const {result: icons = []} = await res.json()

if (icons.length === 0) {
  console.error('Refusing to write: Sanity returned 0 icons. Is the dataset seeded and public?')
  process.exit(1)
}

const seen = new Set()
const entries = []
const byCategory = {}

for (const {category, name, svg} of icons) {
  if (!category || !name || !svg) {
    console.warn(`skip (missing field): ${category}/${name}`)
    continue
  }
  const key = `${category}/${name}`
  if (seen.has(key)) continue
  seen.add(key)

  const inner = normalise(extractInner(svg))
  if (!inner) {
    console.warn(`skip (empty geometry): ${key}`)
    continue
  }
  if (inner.includes('[') || inner.includes(']')) {
    console.warn(`skip (bracket in geometry, would break array parsing): ${key}`)
    continue
  }
  entries.push(iconEntry({category, name, inner: encodeInner(inner)}))
  byCategory[category] = (byCategory[category] || 0) + 1
}

if (entries.length === 0) {
  console.error('Refusing to write: no valid icon geometry after processing.')
  process.exit(1)
}

const html = readFileSync(sitePath, 'utf8')
writeFileSync(sitePath, replaceIconsArray(html, iconsArray(entries)))

console.log(`Synced ${entries.length} icons from ${projectId}/${dataset} into site/index.html`)
console.log('Per category:')
for (const [cat, n] of Object.entries(byCategory).sort()) {
  console.log(`  ${cat.padEnd(22)} ${n}`)
}
