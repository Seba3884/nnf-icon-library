/**
 * Shared helpers for turning an NNF-grid source SVG into the escaped `inner`
 * geometry payload embedded in the site bundle's `ICONS` array.
 *
 * The source SVGs (raw-icons/ and the Sanity `icon.svg` field) are authored on a
 * `viewBox="0 0 40 40"` grid with an outer
 *   <g transform="translate(8,8)" stroke=… stroke-width="1.5" fill="none" …>
 * wrapper. The site draws that wrapper (and, for the circle themes, the
 * background circle) itself, so each icon only needs the *inner* geometry with
 * its baked-in presentation attributes stripped.
 *
 * Both scripts/build-site-icons.mjs (raw-icons -> site) and
 * scripts/sync-from-sanity.mjs (Sanity -> site) use these helpers so the
 * escaping logic lives in exactly one place.
 */

/** Extract the inner geometry of an icon SVG (content of its outer <g>). */
export function extractInner(svg) {
  const body = svg.replace(/[\s\S]*?<svg[^>]*>/i, '').replace(/<\/svg>[\s\S]*$/i, '');
  return body
    .replace(/^\s*<g\b[^>]*>/i, '') // drop the outer stroke wrapper's opening tag
    .replace(/<\/g>\s*$/i, '')      // ...and its closing tag (nested <g> kept)
    .trim();
}

/** Normalise geometry to the bundle's tag style and collapse whitespace. */
export function normalise(inner) {
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
export function encodeInner(inner) {
  return inner.replace(/"/g, '\\"').replace(/\//g, '\\u002F');
}

/** Full pipeline: raw SVG text -> escaped `inner` payload string. */
export function svgToInner(svg) {
  return encodeInner(normalise(extractInner(svg)));
}

/**
 * Splice a freshly built `ICONS = [ … ]` array into the site bundle HTML,
 * replacing the existing one in place. Throws if the markers are missing.
 */
export function replaceIconsArray(html, newArray) {
  const start = html.indexOf('ICONS = [');
  if (start === -1) throw new Error('Could not find ICONS array in site/index.html');
  const end = html.indexOf(']', start);
  if (end === -1) throw new Error('Could not find end of ICONS array');
  return html.slice(0, start) + newArray + html.slice(end + 1);
}

/** Build one escaped `{ category, name, inner }` entry line. */
export function iconEntry({ category, name, inner }) {
  return `    { category: \\"${category}\\", name: \\"${name}\\", inner: \`${inner}\` },\\n`;
}

/** Assemble the full `ICONS = [ … ]` payload from a list of entry lines. */
export function iconsArray(entries) {
  return `ICONS = [\\n${entries.join('')}  ]`;
}
