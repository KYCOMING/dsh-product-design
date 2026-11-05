/**
 * Prototype preview: page stack, overlays, page-state preview and the
 * transient hover/focus state used to fake component interaction.
 */

import { defaultState } from '../constants.js';
import { patchElement } from '../domain/document.js';
import { useState } from '../react.js';

export function usePreview({ docRef, setDoc, setSelIds, setEditing, t }) {
  const [preview, setPreview] = useState(false);
  const [pageState, setPageState] = useState('normal');
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
  }
  function togglePreview() {
    if (preview) {
      exitPreview();
      return;
    }
    setPreviewStack([docRef.current.activePageId]);
    setPreviewOverlay(null);
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
    const patch = (fn) => setDoc((doc) => patchElement(doc, el.id, fn));
    if (el.type === 'toggle')
      patch((current) => ({ ...current, state: current.state === 'on' ? 'off' : 'on' }));
    else if (el.type === 'checkbox')
      patch((current) => ({
        ...current,
        state: current.state === 'checked' ? 'unchecked' : 'checked',
      }));
    else if (el.type === 'select')
      patch((current) => ({ ...current, state: current.state === 'open' ? 'default' : 'open' }));
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
    pageState,
    setPageState,
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
