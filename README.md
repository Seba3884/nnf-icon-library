# NNF Icon Library

A clean, consistent set of **24×24 outline SVG icons**, shipped in every form you might need:

- 🎨 **Raw SVG files** — the source of truth in [`icons/`](./icons)
- 🧩 **SVG sprite** — one request, `<use>` anywhere (`dist/sprite.svg`)
- 📦 **Framework-agnostic data** — `icons`, `iconNames`, `getIcon()` (`@nnf/icons`)
- ⚛️ **React components** — one tree-shakeable component per icon (`@nnf/icons/react`)
- 🔎 **Searchable gallery** — [`gallery/index.html`](./gallery/index.html)

All icons share one grid (`viewBox="0 0 24 24"`), `stroke="currentColor"`,
`stroke-width="2"`, and round caps/joins, so they sit together cleanly and
inherit color and size from their context.

## Install

```bash
npm install @nnf/icons
# react is an optional peer dependency, only needed for @nnf/icons/react
```

## Usage

### React

```jsx
import { Home, Search, Settings } from '@nnf/icons/react';

export function Toolbar() {
  return (
    <nav>
      <Home />
      <Search size={20} />
      <Settings size={32} title="Settings" /> {/* title => role="img" + <title> */}
    </nav>
  );
}
```

Every component forwards refs and spreads SVG props (`className`, `onClick`,
`style`, …). Color comes from CSS `color`; size from the `size` prop (default 24).

### Framework-agnostic data

```js
import { icons, iconNames, getIcon } from '@nnf/icons';

iconNames;            // ['arrow-left', 'arrow-right', 'bell', ...]
getIcon('home').svg;  // '<svg xmlns=... >…</svg>'
getIcon('home').body; // inner markup only, for your own <svg> wrapper
```

### SVG sprite

Inline the sprite once (e.g. at the top of `<body>`), then reference symbols:

```html
<!-- contents of dist/sprite.svg, inlined once -->
<svg width="24" height="24"><use href="#nnf-home" /></svg>
<svg width="24" height="24" style="color:#4493f8"><use href="#nnf-heart" /></svg>
```

### Raw SVG

Drop any file from [`icons/`](./icons) straight into your markup, `<img src>`,
or design tool.

## Icon set

`arrow-left` · `arrow-right` · `bell` · `calendar` · `check` · `chevron-down` ·
`chevron-up` · `close` · `download` · `edit` · `eye` · `heart` · `home` ·
`lock` · `mail` · `menu` · `minus` · `plus` · `search` · `settings` · `star` ·
`trash` · `upload` · `user`

## Develop

The SVGs in `icons/` are the only source of truth. Everything in `dist/` is
generated.

```bash
npm run build   # regenerate dist/ from icons/
npm test        # validate the build (zero dependencies)
```

### Add an icon

1. Add `icons/<name>.svg` using the shared attributes
   (`viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
   stroke-linecap="round" stroke-linejoin="round"`).
2. Run `npm run build`. The data API, React component (`<Name>` in PascalCase),
   sprite symbol (`#nnf-<name>`), and types are generated automatically.

### Preview the gallery

```bash
npm run build
npx serve .        # or any static server
# open http://localhost:3000/gallery/
```

## Manage the deployed gallery in Sanity

The large NNF category set shown on the deployed site (145 icons × 4 colour
treatments) is managed in a **Sanity CMS** so non-developers can add and edit
icons without touching code.

- **Studio (edit here):** <https://nnf-icon-library.sanity.studio/>
  Each `icon` document has a `name`, `title`, `category`, and an `svg` field.
- **Project:** `NNF Icon Library` (`5jdxcai4`), dataset `production` (public read).

### Add or edit an icon

1. Open the Studio, create/edit an **Icon**, and fill in `name` (lowercase
   kebab-case), `title`, `category`, and paste the `svg`.
2. The SVG must use the NNF grid — `viewBox="0 0 40 40"` with an outer
   `<g transform="translate(8,8)" …>` wrapper (the `_blue` variant). The site
   strips the baked-in colours and draws each colour/circle treatment itself.
3. **Publish.** A Sanity → Netlify webhook rebuilds the site, or trigger a
   deploy manually.

### How it syncs to the site

`scripts/sync-from-sanity.mjs` runs on every Netlify build (see `netlify.toml`).
It queries the public dataset, converts each `svg` into the bundle's `inner`
geometry via `scripts/svg-geometry.mjs` (the same helpers the local
`raw-icons/` flow uses), and rewrites the `ICONS` array in `site/index.html`.
Run it locally too:

```bash
node scripts/sync-from-sanity.mjs   # Sanity → site/index.html
```

### Seed / re-seed from raw-icons

To (re)populate Sanity from the local `raw-icons/` source of truth:

```bash
SANITY_PROJECT_ID=5jdxcai4 SANITY_DATASET=production \
SANITY_WRITE_TOKEN=sk... node scripts/sanity-seed.mjs
```

The `studio/` folder is the code copy of the Studio (nice SVG previews); run it
with `cd studio && npm install && npm run dev`.

## License

[MIT](./LICENSE)
