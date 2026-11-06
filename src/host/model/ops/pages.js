/** pages op handlers (split out of host/model.js#applyOne). */

import { newId } from '../../../shared/id.js';
import {
  addStateVariant,
  basePageOf,
  basePages,
  duplicatePageDeep,
  PAGE_STATE_KEYS,
  removePageDeep,
  removeStateVariant,
  resizePageFamily,
} from '../../../shared/page-states.js';
import { PRESETS } from '../../../shared/schema.js';

export function createPagesHandlers(deps) {
  const { findPage, requirePageById, ensurePage, num, str } = deps;
  return {
    set_document_name: (doc, op, index, state) => {
      const kind = 'set_document_name';
      doc.name = str(op.name, '');
      return { op: index, kind };
    },
    add_page: (doc, op, index, state) => {
      const kind = 'add_page';
      const preset = PRESETS[op.preset] ? op.preset : 'mobile';
      const size = PRESETS[preset];
      const page = ensurePage({
        id: newId('p'),
        name: str(op.name, `Page ${basePages(doc).length + 1}`),
        frame: {
          w: Math.max(1, num(op.width, size[0])),
          h: Math.max(1, num(op.height, size[1])),
          preset,
          background: str(op.background, '#ffffff'),
        },
        elements: [],
      });
      doc.pages.push(page);
      doc.activePageId = page.id;
      return { op: index, kind, pageId: page.id, name: page.name };
    },
    duplicate_page: (doc, op, index, state) => {
      const kind = 'duplicate_page';
      const source = requirePageById(doc, op.pageId, index, 'duplicate_page');
      const out = duplicatePageDeep(doc, source.id, { suffix: 'copy', id: newId });
      doc.pages = out.pages;
      doc.activePageId = out.activePageId;
      const copy = doc.pages.find((page) => page.id === out.activePageId);
      if (copy && op.name !== undefined) copy.name = str(op.name, copy.name);
      return { op: index, kind, pageId: copy ? copy.id : '', name: copy ? copy.name : '' };
    },
    delete_page: (doc, op, index, state) => {
      const kind = 'delete_page';
      const page = doc.pages.find((p) => p.id === op.pageId);
      if (!page) throw new Error(`op[${index}] delete_page: unknown page "${op.pageId}"`);
      const out = removePageDeep(doc, page.id);
      doc.pages = out.pages;
      doc.activePageId = out.activePageId;
      return { op: index, kind, pageId: page.id };
    },
    rename_page: (doc, op, index, state) => {
      const kind = 'rename_page';
      const page = findPage(doc, op, index);
      page.name = str(op.name, page.name);
      return { op: index, kind, pageId: page.id };
    },
    set_active_page: (doc, op, index, state) => {
      const kind = 'set_active_page';
      const page = requirePageById(doc, op.pageId, index, 'set_active_page');
      doc.activePageId = page.id;
      return { op: index, kind, pageId: page.id };
    },
    set_page_frame: (doc, op, index, state) => {
      const kind = 'set_page_frame';
      const page = findPage(doc, op, index);
      const preset = PRESETS[op.preset] ? op.preset : page.frame.preset;
      const size = PRESETS[preset] || [page.frame.w, page.frame.h];
      const nw = Math.max(1, num(op.width, op.preset ? size[0] : page.frame.w));
      const nh = Math.max(1, num(op.height, op.preset ? size[1] : page.frame.h));
      const mode = ['constraints', 'scale', 'none'].includes(op.resizeMode)
        ? op.resizeMode
        : 'constraints';
      const resized = resizePageFamily(doc, page.id, nw, nh, mode, preset);
      doc.pages = resized.pages;
      const target = doc.pages.find((candidate) => candidate.id === page.id);
      if (target) {
        target.frame = {
          ...target.frame,
          background: str(op.background, target.frame.background),
        };
      }
      return { op: index, kind, pageId: page.id, resizeMode: mode };
    },
    add_page_state: (doc, op, index, state) => {
      const kind = 'add_page_state';
      const page = findPage(doc, op, index);
      const key = PAGE_STATE_KEYS.includes(op.key) ? op.key : null;
      if (!key) throw new Error(`op[${index}] add_page_state: unknown state "${op.key}"`);
      const out = addStateVariant(doc, page.id, key, { name: str(op.name, ''), id: newId });
      if (!out.pageId)
        throw new Error(`op[${index}] add_page_state: no base page for "${page.id}"`);
      doc.pages = out.doc.pages;
      doc.activePageId = out.doc.activePageId;
      const base = basePageOf(doc, out.pageId);
      return {
        op: index,
        kind,
        pageId: out.pageId,
        basePageId: base ? base.id : '',
        created: out.created,
      };
    },
    delete_page_state: (doc, op, index, state) => {
      const kind = 'delete_page_state';
      const page = findPage(doc, op, index);
      const key = PAGE_STATE_KEYS.includes(op.key) ? op.key : null;
      if (!key) throw new Error(`op[${index}] delete_page_state: unknown state "${op.key}"`);
      const out = removeStateVariant(doc, page.id, key);
      if (!out.removedId) throw new Error(`op[${index}] delete_page_state: no such variant`);
      doc.pages = out.doc.pages;
      doc.activePageId = out.doc.activePageId;
      return { op: index, kind, pageId: out.removedId };
    },
    clear_page: (doc, op, index, state) => {
      const kind = 'clear_page';
      const page = findPage(doc, op, index);
      page.elements = [];
      return { op: index, kind, pageId: page.id };
    },
  };
}
