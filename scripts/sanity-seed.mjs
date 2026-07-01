#!/usr/bin/env node
/**
 * Seed the Sanity "icon" dataset from the local raw-icons/ source of truth.
 *
 * Reads every `*_blue.svg` (one per unique icon — all four variants share
 * geometry) and upserts one `icon` document per icon using a deterministic
 * `_id`, so re-running is idempotent (createOrReplace).
 *
 * Usage:
 *   SANITY_PROJECT_ID=xxxx SANITY_DATASET=production \
 *   SANITY_WRITE_TOKEN=sk... node scripts/sanity-seed.mjs
 *
 * The write token is only needed for this one-off/occasional seed. Never commit
 * it — pass it via the environment.
 */
import {readdirSync, readFileSync} from 'node:fs'
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'raw-icons')

const projectId = process.env.SANITY_PROJECT_ID
const dataset = process.env.SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN
const apiVersion = process.env.SANITY_API_VERSION || 'v2024-01-01'

if (!projectId || !token) {
  console.error(
    'Missing env. Required: SANITY_PROJECT_ID, SANITY_WRITE_TOKEN (SANITY_DATASET optional, defaults to production).',
  )
  process.exit(1)
}

/** "annual-report" -> "Annual report" */
function toTitle(name) {
  const s = name.replace(/-/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const files = readdirSync(srcDir)
  .filter((f) => f.endsWith('_blue.svg'))
  .sort()

const seen = new Set()
const mutations = []

for (const file of files) {
  const parts = file.replace(/\.svg$/, '').split('_')
  if (parts.length < 3) {
    console.warn(`skip (unexpected name): ${file}`)
    continue
  }
  const category = parts[0]
  const name = parts.slice(1, -1).join('_')
  const key = `${category}/${name}`
  if (seen.has(key)) continue
  seen.add(key)

  mutations.push({
    createOrReplace: {
      _id: `icon-${category}-${name}`,
      _type: 'icon',
      name,
      title: toTitle(name),
      category,
      svg: readFileSync(join(srcDir, file), 'utf8').trim(),
    },
  })
}

const url = `https://${projectId}.api.sanity.io/${apiVersion}/data/mutate/${dataset}?returnIds=false`

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({mutations}),
})

if (!res.ok) {
  console.error(`Seed failed: ${res.status} ${res.statusText}`)
  console.error(await res.text())
  process.exit(1)
}

console.log(`Seeded ${mutations.length} icons into ${projectId}/${dataset}.`)
