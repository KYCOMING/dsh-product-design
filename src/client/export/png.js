/**
 * PNG export: render the page to a standalone SVG (foreignObject), then
 * rasterise it through a canvas. No third-party dependency, no network.
 */

import { escapeHtml, renderPageBody } from './render.js';

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif";

/** @returns {string} an SVG document sized at `scale`× the page. */
export function buildSvg(page, ctx, scale = 2) {
  const frame = page.frame || { w: 390, h: 844, background: '#ffffff' };
  const w = Math.max(1, Math.round(frame.w));
  const h = Math.max(1, Math.round(frame.h));
  const factor = Math.max(1, Math.min(4, Number(scale) || 1));
  const body = renderPageBody(page, { ...ctx, raster: true });
  const style = escapeHtml(
    `position:relative;width:${w}px;height:${h}px;overflow:hidden;background:${frame.background || '#ffffff'};font-family:${FONT}`,
  );
  const html = `<div xmlns="http://www.w3.org/1999/xhtml" style="${style}">${body}</div>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * factor}" height="${h * factor}" viewBox="0 0 ${w} ${h}"><foreignObject x="0" y="0" width="${w}" height="${h}">${html}</foreignObject></svg>`;
}

function clonePage(page) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(page);
    } catch {
      /* fall through */
    }
  }
  return JSON.parse(JSON.stringify(page));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('image read failed'));
    reader.readAsDataURL(blob);
  });
}

/** Remote images must become data URLs, otherwise the canvas is tainted. */
async function inlineImages(page) {
  const copy = clonePage(page);
  const tasks = [];
  const walk = (elements) => {
    for (const el of elements || []) {
      const src = el && el.props && el.props.src;
      if (el.type === 'image' && typeof src === 'string' && /^https?:/i.test(src)) {
        tasks.push(
          (async () => {
            try {
              const res = await fetch(src, {
                signal:
                  typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
                    ? AbortSignal.timeout(4000)
                    : undefined,
              });
              if (!res.ok) throw new Error('image fetch failed');
              el.props.src = await blobToDataUrl(await res.blob());
            } catch {
              // Keep the SVG renderable: fall back to the striped placeholder.
              el.props.src = '';
            }
          })(),
        );
      }
      if (Array.isArray(el.children)) walk(el.children);
    }
  };
  walk(copy.elements);
  await Promise.all(tasks);
  return copy;
}

/** Rasterise one page to a PNG blob. */
export async function renderPagePng(page, ctx, scale = 2) {
  if (typeof document === 'undefined') throw new Error('png export requires a browser');
  if (document.fonts && document.fonts.ready) {
    try {
      // Fonts are best-effort: never let a pending webfont block the export.
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);
    } catch {
      /* ignore */
    }
  }
  const exportPage = await inlineImages(page);
  const frame = exportPage.frame || { w: 390, h: 844, background: '#ffffff' };
  const w = Math.max(1, Math.round(frame.w));
  const h = Math.max(1, Math.round(frame.h));
  const factor = Math.max(1, Math.min(4, Number(scale) || 1));
  const svg = buildSvg(exportPage, ctx, factor);
  // A data: URL keeps the SVG same-origin for Chromium; a blob: URL makes a
  // canvas with foreignObject content tainted, so toBlob() would throw.
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const image = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = w * factor;
  canvas.height = h * factor;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas unavailable');
  context.fillStyle = frame.background || '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return await new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('png encode failed'))),
        'image/png',
      );
    } catch (error) {
      reject(error);
    }
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => reject(new Error('png render timed out')), 10000);
    image.onload = () => {
      clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timer);
      reject(new Error('png render failed'));
    };
    image.src = url;
  });
}
