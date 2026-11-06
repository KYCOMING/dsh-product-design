/** Canvas-opener plumbing: click the in-conversation tab or fall back to the opener. */
import { activeLocale, pickDict } from '../i18n.js';

let canvasOpener = () => {};

/** Wire the "open canvas" action used by cards; called from the plugin entry. */
export function setCanvasOpener(fn) {
  canvasOpener = typeof fn === 'function' ? fn : () => {};
}

/**
 * Switch to the in-conversation "产品设计" view — the exact same result as the
 * user clicking that tab. The panel is otherwise a full-screen main panel
 * (`selectPanel`), which lays out differently (no app sidebar / no view tabs),
 * so preferring the tab keeps "打开画布" consistent with the tab. Falls back to
 * the opener when the tab row is unavailable (blank session / hidden tab).
 */
export function activateDesignTab() {
  try {
    if (typeof document === 'undefined') return false;
    const labels = new Set([pickDict(activeLocale(), 'entry.label'), '产品设计', 'Product Design']);
    const tabs = Array.from(
      document.querySelectorAll('[data-conversation-tabs] button[role="tab"]'),
    );
    const target = tabs.find((btn) => labels.has((btn.textContent || '').trim()));
    if (!target) return false;
    target.click();
    return true;
  } catch {
    return false;
  }
}

export function openCanvas() {
  if (activateDesignTab()) return;
  try {
    canvasOpener();
  } catch {
    /* the layout service may be absent in a non-Web host */
  }
}
