import { useEffect, useState } from './react.js';

/**
 * Bridge to the Web UI's active Session binding. The product-design panel is a
 * global main panel, so it must follow the Session the shell currently shows
 * instead of assuming a process-wide document.
 */
let adapter = null;
const adapterListeners = new Set();

export function setSessionSource(next) {
  adapter = next && typeof next === 'object' ? next : null;
  for (const listener of adapterListeners) {
    try {
      listener();
    } catch {
      /* one broken listener must not block the rest */
    }
  }
}

function currentSessionId() {
  try {
    const current = adapter && adapter.current;
    const snapshot =
      current && typeof current.getSnapshot === 'function' ? current.getSnapshot() : null;
    return snapshot && typeof snapshot.key === 'string' ? snapshot.key : '';
  } catch {
    return '';
  }
}

export function useSessionId() {
  const [id, setId] = useState(currentSessionId);
  useEffect(() => {
    let unsubscribe = null;
    const attach = () => {
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch {
          /* ignore */
        }
      }
      unsubscribe = null;
      setId(currentSessionId());
      try {
        const current = adapter && adapter.current;
        if (current && typeof current.subscribe === 'function') {
          unsubscribe = current.subscribe(() => setId(currentSessionId()));
        }
      } catch {
        /* uiSession unavailable */
      }
    };
    adapterListeners.add(attach);
    attach();
    return () => {
      adapterListeners.delete(attach);
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);
  return id;
}
