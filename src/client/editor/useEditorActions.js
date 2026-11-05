/**
 * User-facing document commands: pages, elements, arrange and frame changes.
 * Each one is a thin wrapper around a pure transform in `domain/document.js`.
 */

import { boundsOfEntries, cloneElementDeep, isContainerType } from '../../shared/elements.js';
import { TYPE_INFO } from '../constants.js';
import {
  addElement,
  addPage,
  alignEntries,
  distributeEntries,
  duplicateElements,
  fitContent,
  groupEntries,
  insertPageAfter,
  moveElementTo,
  patchFrame,
  patchPageStates,
  removeElements,
  removePage,
  renamePage,
  reorderElements,
  resizePageTo,
  ungroupEntry,
} from '../domain/document.js';
import { emptyStates, makeEl, uid } from '../model.js';

export function useEditorActions({
  doc,
  setDoc,
  t,
  activePage,
  selIds,
  selEntries,
  topSelectedEntries,
  setSelIds,
  resizeMode,
}) {
  function addPageAction() {
    const base = activePage;
    const page = {
      id: uid(),
      name: t('pages.default') + ' ' + (doc.pages.length + 1),
      frame: {
        w: base ? base.frame.w : 390,
        h: base ? base.frame.h : 844,
        preset: base ? base.frame.preset : 'mobile',
        background: '#ffffff',
      },
      states: emptyStates(),
      elements: [],
    };
    setDoc((current) => addPage(current, page));
    setSelIds([]);
  }

  function duplicatePage(id) {
    const source = doc.pages.find((candidate) => candidate.id === id);
    if (!source) return;
    const copy = {
      id: uid(),
      name: source.name + ' ' + t('pages.copySuffix'),
      frame: { ...source.frame },
      states: JSON.parse(JSON.stringify(source.states || emptyStates())),
      elements: cloneElementDeep(
        { id: 'root', type: 'group', x: 0, y: 0, w: 0, h: 0, children: source.elements },
        () => uid(),
      ).children,
    };
    setDoc((current) => insertPageAfter(current, id, copy));
    setSelIds([]);
  }

  function deletePage(id) {
    if (doc.pages.length <= 1) return;
    if (!window.confirm(t('pages.deleteConfirm'))) return;
    setDoc((current) => removePage(current, id));
    setSelIds([]);
  }

  function addElementAction(type) {
    if (!activePage) return;
    const info = TYPE_INFO[type];
    if (!info) return;
    const selected = selEntries.length === 1 ? selEntries[0] : null;
    const parent = selected && isContainerType(selected.el.type) ? selected.el : null;
    const boundW = parent ? parent.w : activePage.frame.w;
    const boundH = parent ? parent.h : activePage.frame.h;
    const fullWidth = type === 'navbar' || type === 'tabs';
    const width = fullWidth ? boundW : info.size[0];
    const height = info.size[1];
    const count = (parent ? parent.children || [] : activePage.elements).length;
    const x = fullWidth ? 0 : parent ? 16 : 24;
    const y = fullWidth
      ? Math.min(24 + (count % 6) * 16, Math.max(0, boundH - height))
      : 24 + (count % 8) * 18;
    const props =
      type === 'container'
        ? {
            name: t('comp.container') + ' ' + (count + 1),
            background: '#ffffff',
            radius: 12,
            clipContent: true,
          }
        : {};
    const el = makeEl(
      type,
      Math.max(0, Math.min(x, boundW - width)),
      Math.max(0, Math.min(y, boundH - height)),
      width,
      height,
      props,
    );
    setDoc((current) => addElement(current, activePage.id, parent ? parent.id : null, el));
    setSelIds([el.id]);
  }

  function duplicateSelection() {
    const ids = topSelectedEntries().map((entry) => entry.el.id);
    if (!ids.length || !activePage) return;
    let created = [];
    setDoc((current) => {
      const out = duplicateElements(current, activePage.id, ids);
      created = out.ids;
      return out.doc;
    });
    if (created.length) setSelIds(created);
  }

  function deleteSelection() {
    if (!selIds.length || !activePage) return;
    setDoc((current) => removeElements(current, activePage.id, selIds));
    setSelIds([]);
  }

  function reorderSelection(mode) {
    const ids = topSelectedEntries().map((entry) => entry.el.id);
    if (!ids.length || !activePage) return;
    setDoc((current) => reorderElements(current, activePage.id, ids, mode));
  }

  function bringFront() {
    if (!selIds.length) return;
    reorderSelection('front');
  }
  function sendBack() {
    if (!selIds.length) return;
    reorderSelection('back');
  }

  function moveLayer(id, targetId, position) {
    if (!activePage) return;
    setDoc((current) => moveElementTo(current, activePage.id, id, targetId, position));
  }

  function setPreset(key) {
    const sizes = { mobile: [390, 844], tablet: [768, 1024], desktop: [1280, 800] };
    const size = sizes[key];
    if (!size || !activePage) return;
    setDoc((current) => resizePageTo(current, activePage.id, size[0], size[1], resizeMode, key));
  }

  function fitContentToFrame() {
    if (!activePage) return;
    setDoc((current) => fitContent(current, activePage.id));
  }

  function patchActiveFrame(patch) {
    if (!activePage) return;
    setDoc(
      (current) => patchFrame(current, activePage.id, patch),
      'frame:' + Object.keys(patch).join(','),
    );
  }

  function renameActivePage(name) {
    if (!activePage) return;
    setDoc((current) => renamePage(current, activePage.id, name), 'pagename:' + activePage.id);
  }

  function patchStates(key, patch) {
    if (!activePage) return;
    setDoc((current) => patchPageStates(current, activePage.id, key, patch), 'pstate:' + key);
  }

  function groupSelection() {
    const entries = topSelectedEntries();
    if (entries.length < 2 || !activePage) return;
    let groupId = null;
    setDoc((current) => {
      const out = groupEntries(current, activePage.id, entries, t('comp.group'));
      groupId = out.groupId;
      return out.doc;
    });
    if (groupId) setSelIds([groupId]);
  }

  function ungroupSelection() {
    const entry = selEntries[0];
    if (!entry || entry.el.type !== 'group' || !activePage) return;
    let ids = [];
    setDoc((current) => {
      const out = ungroupEntry(current, activePage.id, entry.el.id);
      ids = out.ids;
      return out.doc;
    });
    if (ids.length) setSelIds(ids);
  }

  function alignSelection(mode) {
    const entries = topSelectedEntries();
    if (!entries.length || !activePage) return;
    const target =
      entries.length === 1
        ? { x: 0, y: 0, w: activePage.frame.w, h: activePage.frame.h }
        : boundsOfEntries(entries);
    if (!target) return;
    setDoc(
      (current) => alignEntries(current, activePage.id, entries, target, mode),
      'align:' + mode,
    );
  }

  function distributeSelection(axis) {
    const entries = topSelectedEntries();
    if (entries.length < 3 || !activePage) return;
    setDoc((current) => distributeEntries(current, activePage.id, entries, axis));
  }

  return {
    addPage: addPageAction,
    duplicatePage,
    deletePage,
    addElement: addElementAction,
    duplicateSelection,
    deleteSelection,
    reorderSelection,
    bringFront,
    sendBack,
    moveLayer,
    setPreset,
    fitContentToFrame,
    patchActiveFrame,
    renameActivePage,
    patchStates,
    groupSelection,
    ungroupSelection,
    alignSelection,
    distributeSelection,
  };
}
