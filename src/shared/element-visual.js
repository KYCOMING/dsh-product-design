/**
 * Shared visual tokens for element rendering.
 *
 * The editor (`widgets.js`) and the two exporters (`export/render.js`,
 * `export/react.js`) target different output formats (React elements, HTML
 * strings, JSX strings) and therefore keep their own emitters — but the numeric
 * and colour tokens they use must come from one place, or they drift (this is
 * exactly what produced the "textAlign ignored in export" / "tab accent
 * hardcoded" bugs).
 *
 * NOTE: `export/render.js` deliberately keeps editor chrome out of exports, so
 * this module shares *data*, not a renderer.
 */

export const ACCENT = '#6366f1';

/** Default corner radius per element type (px). */
export const RADIUS = {
  container: 12,
  group: 0,
  button: 8,
  input: 8,
  card: 12,
  navbar: 0,
  tabs: 0,
  toggle: 0,
  checkbox: 0,
  avatar: 0,
  text: 0,
  image: 10,
  badge: 0,
  select: 8,
};

/** Resolve an element's corner radius: explicit prop wins, else type default. */
export function radiusOf(el, fallback = 8) {
  const p = (el && el.props) || {};
  if (p.radius != null) return p.radius;
  const r = RADIUS[el && el.type];
  return r != null ? r : fallback;
}

/** Resolve an element's font size: explicit prop wins, else the given fallback. */
export function fontSizeOf(el, fallback = 14) {
  const p = (el && el.props) || {};
  return p.fontSize || fallback;
}

/** Resolve an element's accent colour: explicit prop wins, else the global accent. */
export function accentOf(el) {
  const p = (el && el.props) || {};
  return p.color || ACCENT;
}

/** Sample-text i18n keys shared by every emitter (so they never diverge). */
export const SAMPLE_TEXT = {
  button: 'sample.button',
  card: 'sample.card',
  cardSub: 'sample.cardSub',
  placeholder: 'sample.placeholder',
  checkbox: 'sample.checkbox',
  tabs: 'sample.tabs',
  text: 'sample.text',
  navbar: 'sample.navbar',
  input: 'sample.input',
};
