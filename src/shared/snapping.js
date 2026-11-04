/**
 * Magnetic snapping (smart guides) for the design canvas.
 *
 * Pure geometry: callers pass a moving box and a list of target boxes in the
 * same coordinate space (page coordinates). The result is the correction to
 * apply plus the guide lines to draw.
 */

export const SNAP_THRESHOLD = 5;

function xCandidates(targets) {
  const out = [];
  for (const t of targets) {
    out.push({ pos: t.x, target: t, kind: 'left' });
    out.push({ pos: t.x + t.w / 2, target: t, kind: 'centerX' });
    out.push({ pos: t.x + t.w, target: t, kind: 'right' });
  }
  return out;
}

function yCandidates(targets) {
  const out = [];
  for (const t of targets) {
    out.push({ pos: t.y, target: t, kind: 'top' });
    out.push({ pos: t.y + t.h / 2, target: t, kind: 'centerY' });
    out.push({ pos: t.y + t.h, target: t, kind: 'bottom' });
  }
  return out;
}

function bestSnap(movingPositions, candidates, threshold) {
  let best = null;
  for (const moving of movingPositions) {
    for (const cand of candidates) {
      const delta = cand.pos - moving.pos;
      if (Math.abs(delta) > threshold) continue;
      if (!best || Math.abs(delta) < Math.abs(best.delta)) {
        best = { delta, candidate: cand, moving };
      }
    }
  }
  return best;
}

function span(aStart, aEnd, bStart, bEnd) {
  return { from: Math.min(aStart, bStart), to: Math.max(aEnd, bEnd) };
}

/**
 * Snap a moving rectangle to target edges/centres.
 * @param {{x:number,y:number,w:number,h:number}} box proposed rect
 * @param {Array<{x:number,y:number,w:number,h:number}>} targets
 * @param {number} [threshold]
 * @returns {{dx:number,dy:number,guides:Array<{axis:'x'|'y',pos:number,from:number,to:number}>}}
 */
export function snapMoveBox(box, targets, threshold = SNAP_THRESHOLD) {
  const xs = xCandidates(targets);
  const ys = yCandidates(targets);
  const movingX = [
    { pos: box.x, edge: 'left' },
    { pos: box.x + box.w / 2, edge: 'centerX' },
    { pos: box.x + box.w, edge: 'right' },
  ];
  const movingY = [
    { pos: box.y, edge: 'top' },
    { pos: box.y + box.h / 2, edge: 'centerY' },
    { pos: box.y + box.h, edge: 'bottom' },
  ];
  const sx = bestSnap(movingX, xs, threshold);
  const sy = bestSnap(movingY, ys, threshold);
  const dx = sx ? sx.delta : 0;
  const dy = sy ? sy.delta : 0;
  const guides = [];
  if (sx) {
    const t = sx.candidate.target;
    const v = span(box.y + dy, box.y + box.h + dy, t.y, t.y + t.h);
    guides.push({ axis: 'x', pos: sx.candidate.pos, from: v.from, to: v.to });
  }
  if (sy) {
    const t = sy.candidate.target;
    const h = span(box.x + dx, box.x + box.w + dx, t.x, t.x + t.w);
    guides.push({ axis: 'y', pos: sy.candidate.pos, from: h.from, to: h.to });
  }
  return { dx, dy, guides };
}

/**
 * Snap the moving edges of a resize gesture.
 * @param {{x:number,y:number,w:number,h:number}} box proposed rect after raw resize
 * @param {string} dir one of n/s/e/w/ne/nw/se/sw
 * @param {Array} targets
 * @param {number} [threshold]
 * @returns {{box:{x:number,y:number,w:number,h:number},guides:Array}}
 */
export function snapResizeBox(box, dir, targets, threshold = SNAP_THRESHOLD) {
  const xCands = xCandidates(targets);
  const yCands = yCandidates(targets);
  const next = { ...box };
  const guides = [];

  const snapEdge = (value, candidates, axis, spanStart, spanEnd, targetSpan) => {
    let best = null;
    for (const cand of candidates) {
      const delta = cand.pos - value;
      if (Math.abs(delta) > threshold) continue;
      if (!best || Math.abs(delta) < Math.abs(best.delta)) best = { delta, candidate: cand };
    }
    if (!best) return null;
    const t = best.candidate.target;
    const s = targetSpan(t);
    const v = span(spanStart, spanEnd, s.start, s.end);
    guides.push({ axis, pos: best.candidate.pos, from: v.from, to: v.to });
    return best.delta;
  };

  if (dir.indexOf('w') !== -1) {
    const d = snapEdge(next.x, xCands, 'x', next.y, next.y + next.h, (t) => ({
      start: t.y,
      end: t.y + t.h,
    }));
    if (d != null) {
      next.x += d;
      next.w -= d;
    }
  }
  if (dir.indexOf('e') !== -1) {
    const d = snapEdge(next.x + next.w, xCands, 'x', next.y, next.y + next.h, (t) => ({
      start: t.y,
      end: t.y + t.h,
    }));
    if (d != null) next.w += d;
  }
  if (dir.indexOf('n') !== -1) {
    const d = snapEdge(next.y, yCands, 'y', next.x, next.x + next.w, (t) => ({
      start: t.x,
      end: t.x + t.w,
    }));
    if (d != null) {
      next.y += d;
      next.h -= d;
    }
  }
  if (dir.indexOf('s') !== -1) {
    const d = snapEdge(next.y + next.h, yCands, 'y', next.x, next.x + next.w, (t) => ({
      start: t.x,
      end: t.x + t.w,
    }));
    if (d != null) next.h += d;
  }

  // Keep a sane minimum; clamping here keeps callers simple.
  if (next.w < 12) {
    if (dir.indexOf('w') !== -1) next.x -= 12 - next.w;
    next.w = 12;
  }
  if (next.h < 8) {
    if (dir.indexOf('n') !== -1) next.y -= 8 - next.h;
    next.h = 8;
  }
  return { box: next, guides };
}
