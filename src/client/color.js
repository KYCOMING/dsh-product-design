// ------------------------------------------------------------------
// colour utils (artboard artwork palette)
// ------------------------------------------------------------------
function hexToRgb(hex) {
  let s = String(hex || '').replace('#', '');
  if (s.length === 3)
    s = s
      .split('')
      .map((c) => c + c)
      .join('');
  const n = parseInt(s, 16);
  if (isNaN(n)) return { r: 99, g: 102, b: 241 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function shade(hex, p) {
  const { r, g, b } = hexToRgb(hex);
  const f = (t) => Math.max(0, Math.min(255, Math.round(p < 0 ? t + t * p : t + (255 - t) * p)));
  return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
}
function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

export { hexToRgb, rgba, shade };
