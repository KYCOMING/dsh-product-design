/**
 * Prototype preview: page stack, overlays, page-state preview and the
 * transient hover/focus state used to fake component interaction.
 */

import { statePageId } from '../../shared/page-states.js';
import { defaultState } from '../constants.js';
import { useState } from '../react.js';

export function usePreview({ docRef, setSelIds, setEditing, t }) {
  const [preview, setPreview] = useState(false);
  const [ui, setUi] = useState({}); // per-element transient preview state
  const [previewStack, setPreviewStack] = useState([]);
  const [previewOverlay, setPreviewOverlay] = useState(null);

  const setUiFor = (id, patch) => {
    setUi((current) => ({ ...current, [id]: { ...(current[id] || {}), ...patch } }));
  };

  function exitPreview() {
    setPreview(false);
    setPreviewStack([]);
    setPreviewOverlay(null);
    setUi({});
  }
  function togglePreview() {
    if (preview) {
      exitPreview();
      return;
    }
    setPreviewStack([docRef.current.activePageId]);
    setPreviewOverlay(null);
    setUi({});
    setSelIds([]);
    setEditing(null);
    setPreview(true);
  }
  function back() {
    setPreviewStack((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack));
  }
  function closeOverlay() {
    setPreviewOverlay(null);
  }

  /** Switch the previewed page to one state variant (or back to the base page). */
  function showState(key) {
    setPreviewStack((stack) => {
      if (!stack.length) return stack;
      const current = docRef.current.pages.find((page) => page.id === stack[stack.length - 1]);
      if (!current) return stack;
      const base = current.variantOf
        ? docRef.current.pages.find((page) => page.id === current.variantOf)
        : current;
      if (!base) return stack;
      const target = key === 'normal' ? base.id : statePageId(docRef.current, base.id, key);
      if (!target) return stack;
      return [...stack.slice(0, -1), target];
    });
  }

  function interact(el) {
    const link = (el.interactions || [])[0];
    if (!link) return;
    if (link.action === 'back') {
      back();
      return;
    }
    const page = docRef.current.pages.find((candidate) => candidate.id === link.targetPageId);
    if (!page) return;
    if (link.action === 'openOverlay') {
      setPreviewOverlay(page);
    } else {
      setPreviewOverlay(null);
      setPreviewStack((stack) => [...stack, page.id]);
    }
  }

  function renderStateFor(el) {
    const base = el.state || defaultState(el.type);
    if (!preview) return base;
    const transient = ui[el.id] || {};
    if (transient.state) return transient.state;
    if (el.type === 'button') {
      if (base === 'disabled') return 'disabled';
      if (transient.press) return 'active';
      if (transient.hover) return 'hover';
      return base;
    }
    if (el.type === 'card') return transient.hover ? 'hover' : base;
    if (el.type === 'input') return transient.focus ? 'focus' : base;
    return base;
  }

  function activate(el, ev) {
    if (!preview) return;
    const current = renderStateFor(el);
    if (el.type === 'toggle') setUiFor(el.id, { state: current === 'on' ? 'off' : 'on' });
    else if (el.type === 'checkbox')
      setUiFor(el.id, { state: current === 'checked' ? 'unchecked' : 'checked' });
    else if (el.type === 'select')
      setUiFor(el.id, { state: current === 'open' ? 'default' : 'open' });
    else if (el.type === 'input') setUiFor(el.id, { focus: true });
    else if (el.type === 'tabs') {
      const rect = ev.currentTarget.getBoundingClientRect();
      const count = (el.props.text || t('sample.tabs')).split(',').length || 1;
      const index = Math.min(
        count - 1,
        Math.max(0, Math.floor(((ev.clientX - rect.left) / rect.width) * count)),
      );
      setUiFor(el.id, { tabs: index });
    }
  }

  return {
    preview,
    setPreview,
    togglePreview,
    exitPreview,
    back,
    closeOverlay,
    showState,
    ui,
    setUi,
    setUiFor,
    previewStack,
    setPreviewStack,
    previewOverlay,
    setPreviewOverlay,
    interact,
    renderStateFor,
    activate,
  };
}
