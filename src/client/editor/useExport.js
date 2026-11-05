/**
 * Export commands: PNG (current page), standalone HTML prototype and a
 * React + Tailwind component file. All three run entirely in the browser.
 */

import {
  buildHtml,
  buildReact,
  downloadBlob,
  downloadText,
  renderPagePng,
  safeFileName,
} from '../export/index.js';
import { useCallback } from '../react.js';

export function useExport({ doc, activePage, t }) {
  const exportPng = useCallback(
    async (scale = 2) => {
      if (!activePage) return;
      const blob = await renderPagePng(activePage, { t }, scale);
      const base = safeFileName(doc.name || activePage.name, 'design');
      downloadBlob(blob, `${base}-${safeFileName(activePage.name, 'page')}-${scale}x.png`);
    },
    [activePage, doc.name, t],
  );

  const exportHtml = useCallback(() => {
    const html = buildHtml(doc, { t });
    downloadText(
      html,
      `${safeFileName(doc.name, 'design')}-prototype.html`,
      'text/html;charset=utf-8',
    );
  }, [doc, t]);

  const exportReact = useCallback(() => {
    const source = buildReact(doc, { t });
    downloadText(
      source,
      `${safeFileName(doc.name, 'design')}-prototype.jsx`,
      'text/javascript;charset=utf-8',
    );
  }, [doc, t]);

  return { exportPng, exportHtml, exportReact };
}
