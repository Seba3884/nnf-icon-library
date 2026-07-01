/**
 * Shared helpers for turning a source SVG into the escaped `inner` geometry
 * payload embedded in the site bundle's `ICONS` array.
 *
 * The site renders each icon by wrapping its `inner` geometry in
 *   <g transform="translate(8,8)" stroke="currentColor" stroke-width="1.5"
 *      fill="none" stroke-linecap="round" stroke-linejoin="round"> … </g>
 * on a 40×40 canvas (and, for the circle themes, a background circle). So the
 * `inner` geometry must live in a ~0…24 coordinate box and inherit its colour
 * and stroke from that wrapper.
 *
 * Two source shapes are supported so editors don't have to think about grids:
 *
 *   1. NNF-native: viewBox="0 0 40 40" with an outer
 *      <g transform="translate(8,8)" …> wrapper (the raw-icons/ files and the
 *      seeded Sanity docs). The inner content is already in the 0…24 box.
 *
 *   2. Plain icon: any square viewBox with the geometry drawn directly (e.g. a
 *      24×24 outline icon exported from a design tool / Claude). We fit it into
 *      the 0…24 box automatically and compensate the stroke width so it still
 *      renders at the NNF 1.5 weight.
 *
 * In both cases the baked-in stroke/fill colours are stripped so the icon
 * inherits the page's treatment colour.
 */

const DRAW = 24; // side of the inner drawing box the site expects
const STROKE = 1.5; // NNF stroke weight applied by the page wrapper

/** Round to 4 dp and drop trailing zeros, for compact transform values. */
function r(n) {
  return Number.parseFloat(n.toFixed(4)).toString();
}

/** Parse `viewBox="minX minY w h"` → {minX,minY,w,h}, or null. */
export function extractViewBox(svg) {
  const m = svg.match(/viewBox\s*=\s*"([^"]+)"/i);
  if (!m) return null;
  const parts = m[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length < 4 || parts.some(Number.isNaN)) return null;
  const [minX, minY, w, h] = parts;
  return {minX, minY, w, h};
}

/** True when the SVG uses the NNF-native translate(8,…) wrapper. */
export function hasNnfWrapper(svg) {
  const body = svg.replace(/[\s\S]*?<svg[^>]*>/i, '').replace(/<\/svg>[\s\S]*$/i, '').trim();
  return /^<g\b[^>]*\btransform\s*=\s*"[^"]*translate\(\s*8(\.0+)?\b/i.test(body);
}

/** Extract the inner geometry of an icon SVG (content of its outer <g>/<svg>). */
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

/**
 * Full pipeline: raw SVG text -> escaped `inner` payload string.
 *
 * NNF-native SVGs pass straight through (byte-identical to the legacy path).
 * Plain icons on any other square grid are scaled/offset into the 0…24 box
 * with a stroke-width that renders back at the NNF weight after scaling.
 */
export function svgToInner(svg) {
  let inner = normalise(extractInner(svg));
  if (!inner) return '';

  if (!hasNnfWrapper(svg)) {
    const vb = extractViewBox(svg);
    const size = vb ? Math.max(vb.w, vb.h) : DRAW;
    const needsFit = !vb || vb.minX || vb.minY || Math.abs(size - DRAW) > 0.01;
    if (needsFit && size > 0) {
      const s = DRAW / size;
      const tx = -(vb ? vb.minX : 0) * s;
      const ty = -(vb ? vb.minY : 0) * s;
      const transform = tx || ty ? `translate(${r(tx)},${r(ty)}) scale(${r(s)})` : `scale(${r(s)})`;
      // stroke-width is divided by the scale so it renders back at STROKE.
      inner = `<g transform="${transform}" stroke-width="${r(STROKE / s)}">${inner}</g>`;
    }
  }

  return encodeInner(inner);
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
export function iconEntry({category, name, inner}) {
  return `    { category: \\"${category}\\", name: \\"${name}\\", inner: \`${inner}\` },\\n`;
}

/** Assemble the full `ICONS = [ … ]` payload from a list of entry lines. */
export function iconsArray(entries) {
  return `ICONS = [\\n${entries.join('')}  ]`;
}
