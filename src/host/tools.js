/**
 * Agent tools: read the canvas, apply an ordered operation list.
 */

import { summarizeDoc } from './model.js';
import { productPreviewMeta } from './preview.js';

/** Resolve the session whose canvas this tool call edits. */
function sessionIdOf(exec) {
  return (
    exec?.agent?.session?.header?.id ||
    exec?.agent?.session?.id ||
    exec?.agent?.id ||
    exec?.sessionId ||
    ''
  );
}

function renderJson(_args, value) {
  let payload = value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const { preview, ...rest } = value;
    payload = rest;
  }
  return [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload) }];
}

function getDocumentTool(stores) {
  return {
    name: 'product_design_get_document',
    description: [
      'Read the host-authoritative product-design canvas document: its pages, each page frame size, and every element with position/size/state/props.',
      'Call this before editing, and after changes to verify the result. The document may be empty (no pages) on first use.',
    ].join(' '),
    parameters: { type: 'object', properties: {} },
    output: {
      schema: {},
      render: renderJson,
      presentationMeta: (_args, value) => (value && value.preview) || null,
    },
    isConcurrencySafe: () => true,
    async execute(_args, exec) {
      const store = stores.forSession(sessionIdOf(exec));
      const snap = store.snapshot();
      return {
        ok: true,
        docId: snap.docId,
        revision: snap.revision,
        doc: snap.doc,
        summary: summarizeDoc(snap.doc),
        preview: productPreviewMeta(store, []),
      };
    },
  };
}

function applyTool(stores) {
  return {
    name: 'product_design_apply',
    description: [
      'Apply an ordered list of operations to the product-design canvas (a simplified Figma). The Host owns the document and broadcasts the result to the open canvas.',
      'Operations (each an object with `kind`):',
      'add_page {name?, preset?: mobile|tablet|desktop, width?, height?, background?} → pageId',
      'duplicate_page {pageId, name?} → pageId (copies the whole page with fresh element ids)',
      'delete_page {pageId}; rename_page {pageId, name}; set_active_page {pageId}',
      'set_page_frame {pageId, preset?|width?, height?, background?, resizeMode?: constraints|scale|none} (default constraints)',
      'add_page_state {pageId, key: loading|empty|error, name?} → pageId (creates a real variant page by copying the base page; edit it like any page); delete_page_state {pageId, key}',
      'clear_page {pageId}',
      'add_container {pageId?, containerId?, x?, y?, w?, h?, name?, background?, radius?, clipContent?, hidden?, locked?, opacity?, constraints?, layout?} → elementId (a frame-like container; pass containerId (or "@last") to nest it)',
      'add_element {pageId?, containerId?, type, x?, y?, w?, h?, name?, hidden?, locked?, opacity?, state?, props?: {text,color,fontSize,fontWeight,radius,src,fit}, interactions?} → elementId (containerId also accepts "@last")',
      'update_element {pageId?, elementId, x?, y?, w?, h?, name?, hidden?, locked?, opacity?, state?, props?, interactions?, constraints?, layout?}; delete_element {pageId?, elementId}',
      'move_element {pageId?, elementId, containerId?: string|null, index?} (reparent without moving on screen); reorder_element {pageId?, elementId, position: front|back|forward|backward}',
      'group_elements {pageId?, elementIds: string[]} → groupId; ungroup_elements {pageId?, elementId}',
      'set_document_name {name}',
      'Element types: container, button, input, card, navbar, tabs, toggle, checkbox, avatar, text, image, badge, select.',
      'Container children use coordinates relative to the container; containers clip content by default. States: button[default,hover,active,disabled]; input[default,focus,filled,error,disabled]; card[default,hover]; toggle[on,off]; checkbox[unchecked,checked]; select[default,open,disabled]; others default.',
      'interactions: [{ action: "navigate"|"back"|"openOverlay", targetPageId }] — wire buttons between pages so the prototype can be walked through in preview.',
      'constraints: { h: "left"|"right"|"leftRight"|"center"|"scale", v: "top"|"bottom"|"topBottom"|"center"|"scale" } control how an element reacts when its parent frame resizes.',
      'layout (containers/groups): { mode: "stack", direction: "row"|"column", gap, padding: {t,r,b,l}|number, align: "start"|"center"|"end"|"stretch", justify: "start"|"center"|"end"|"between" }. Children x/y are owned by the layout; array order is visual order.',
      'Page targeting: any op that needs a page accepts pageId, or pageId: "@last" for the most recently added page, or pageIndex (0-based). Without pageId the op targets the active page; add_page and duplicate_page make the new page active, so add_page followed by add_element lands on the new page.',
      'Returns generated page/element ids and the new revision. Prefer one apply call with several ops over many calls.',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        operations: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of operation objects (see the description for shapes).',
        },
      },
      required: ['operations'],
    },
    output: {
      schema: {},
      render: renderJson,
      presentationMeta: (_args, value) => (value && value.preview) || null,
    },
    isConcurrencySafe: () => false,
    async execute(args, exec) {
      const store = stores.forSession(sessionIdOf(exec));
      const result = store.apply(args?.operations);
      return {
        ok: result.ok,
        docId: result.docId,
        revision: result.revision,
        results: result.results,
        summary: summarizeDoc(result.doc),
        preview: productPreviewMeta(store, result.results),
      };
    },
  };
}

export { applyTool, getDocumentTool };
