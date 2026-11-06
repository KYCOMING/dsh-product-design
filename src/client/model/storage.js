/** localStorage persistence (documents + UI prefs). */
import { STORAGE_KEY, UI_KEY } from '../constants.js';
import { normalizeDoc } from './factory.js';

function docStorageKey(sessionId) {
  return sessionId ? `${STORAGE_KEY}:${sessionId}` : STORAGE_KEY;
}

function loadDoc(sessionId) {
  try {
    const raw = window.localStorage.getItem(docStorageKey(sessionId));
    if (!raw) return null;
    return normalizeDoc(JSON.parse(raw));
  } catch {
    return null;
  }
}

function saveDoc(doc, sessionId) {
  try {
    window.localStorage.setItem(docStorageKey(sessionId), JSON.stringify(doc));
  } catch {
    /* quota / private mode: ignore */
  }
}

function loadUi() {
  try {
    const raw = window.localStorage.getItem(UI_KEY);
    return raw ? JSON.parse(raw) || {} : {};
  } catch {
    return {};
  }
}

function saveUi(ui) {
  try {
    window.localStorage.setItem(UI_KEY, JSON.stringify(ui));
  } catch {
    /* ignore */
  }
}

export { loadDoc, loadUi, saveDoc, saveUi };
