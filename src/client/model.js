/**
 * Client document model. Split into ./model/*.js; this entry re-exports the
 * public surface (kept stable for all consumers).
 */

export { uid } from '../shared/id.js';
export { apiFetch } from './model/api.js';
export { defaultDoc, makeEl, normalizeDoc } from './model/factory.js';
export { loadDoc, loadUi, saveDoc, saveUi } from './model/storage.js';
