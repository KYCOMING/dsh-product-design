/**
 * Single source of truth for the product_design_apply operation vocabulary.
 *
 * Previously the op list was written three times: the tool description
 * (`tools.js`), the model guidance (`prompt.js`), and the reducer
 * (`model.js#applyOne`). `OP_KINDS` and `OP_SIGNATURES` feed the first two;
 * the reducer's dispatch keys must stay in sync with `OP_KINDS`.
 */

export const OP_KINDS = [
  'add_page',
  'duplicate_page',
  'delete_page',
  'rename_page',
  'set_active_page',
  'set_page_frame',
  'add_page_state',
  'delete_page_state',
  'clear_page',
  'add_container',
  'add_element',
  'update_element',
  'delete_element',
  'move_element',
  'reorder_element',
  'group_elements',
  'ungroup_elements',
  'set_document_name',
];

/** Human/model-facing signature lines (rendered into the tool description). */
export const OP_SIGNATURES = [
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
];
