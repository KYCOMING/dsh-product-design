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

function currentBinding() {
  try {
    const current = adapter && adapter.current;
    return current && typeof current.getSnapshot === 'function' ? current.getSnapshot() : null;
  } catch {
    return null;
  }
}

function currentSessionId() {
  const snapshot = currentBinding();
  return snapshot && typeof snapshot.key === 'string' ? snapshot.key : '';
}

function titleOfBinding(snapshot) {
  if (!snapshot) return '';
  // Read the Session's durable `title` projection. Different DSH versions reach
  // it through the slot-style `projection(key)` accessor or the Session's own
  // projection store; try each, and fall back to an empty title (untitled).
  const fromValue = (value) => {
    if (typeof value === 'string') return value.trim();
    if (value && typeof value.title === 'string') return value.title.trim();
    return '';
  };
  try {
    const projection = snapshot.keyedHooks && snapshot.keyedHooks.projection;
    if (typeof projection === 'function') {
      const face = projection('title');
      if (face && typeof face.getSnapshot === 'function') {
        const title = fromValue(face.getSnapshot());
        if (title) return title;
      }
    }
  } catch {
    /* keyed projection unavailable */
  }
  try {
    const session = snapshot.hooks && snapshot.hooks.session;
    const store = session && session.projections;
    if (store && typeof store.get === 'function') {
      const title = fromValue(store.get('title'));
      if (title) return title;
    }
    if (store && typeof store.faceOf === 'function') {
      const face = store.faceOf('title');
      if (face && typeof face.getSnapshot === 'function') {
        const title = fromValue(face.getSnapshot());
        if (title) return title;
      }
    }
  } catch {
    /* session projections unavailable */
  }
  return '';
}

/** Current Session's display title, or '' when the deployment exposes none. */
export function currentSessionTitle() {
  return titleOfBinding(currentBinding());
}

/** Subscribe to the active Session's title projection (re-renders on change). */
export function useSessionTitle() {
  const [title, setTitle] = useState(currentSessionTitle);
  useEffect(() => {
    let unsubscribeFace = null;
    const detachFace = () => {
      if (typeof unsubscribeFace === 'function') {
        try {
          unsubscribeFace();
        } catch {
          /* ignore */
        }
      }
      unsubscribeFace = null;
    };
    const attach = () => {
      detachFace();
      setTitle(currentSessionTitle());
      try {
        const snapshot = currentBinding();
        const projection = snapshot && snapshot.keyedHooks && snapshot.keyedHooks.projection;
        if (typeof projection === 'function') {
          const face = projection('title');
          if (face && typeof face.subscribe === 'function') {
            unsubscribeFace = face.subscribe(() => setTitle(currentSessionTitle()));
          }
        }
      } catch {
        /* projection subscription unavailable */
      }
    };
    adapterListeners.add(attach);
    attach();
    return () => {
      adapterListeners.delete(attach);
      detachFace();
    };
  }, []);
  return title;
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
