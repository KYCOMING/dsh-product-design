/**
 * Design-document library client: list, create, rename, duplicate, delete,
 * import and export. All requests go through the Host; when it is absent the
 * panel stays usable but the library reports that it is unavailable.
 */

import { downloadText, safeFileName } from './export/index.js';
import { apiFetch, uid } from './model.js';
import { useCallback, useEffect, useRef, useState } from './react.js';

/** A fresh one-page document with no elements. */
export function blankDoc(t) {
  const page = {
    id: uid(),
    name: (t ? t('pages.default') : 'Page') + ' 1',
    frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
    states: {},
    elements: [],
  };
  return { name: '', pages: [page], activePageId: page.id };
}

export function useDocs({ sessionId, activeDocId, t, onSwitch, onStatus }) {
  const [docs, setDocs] = useState([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const switchRef = useRef(onSwitch);
  switchRef.current = onSwitch;
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;
  const tRef = useRef(t);
  tRef.current = t;

  const refresh = useCallback(async () => {
    const res = await apiFetch('/docs', undefined, sessionId);
    if (!res) {
      setReady(false);
      return null;
    }
    if (res.status !== 200 || !res.body) {
      setError(tRef.current('docs.loadFailed'));
      return null;
    }
    setError('');
    setReady(true);
    setDocs(Array.isArray(res.body.docs) ? res.body.docs : []);
    return res.body;
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async () => {
    const res = await apiFetch(
      '/docs',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, doc: blankDoc(tRef.current) }),
      },
      sessionId,
    );
    if (!res || res.status !== 200 || !res.body || !res.body.meta) {
      setError(tRef.current('docs.createFailed'));
      return null;
    }
    await refresh();
    await switchRef.current(res.body.meta.id);
    return res.body.meta;
  }, [refresh, sessionId]);

  const duplicate = useCallback(
    async (docId) => {
      const res = await apiFetch(
        '/docs/duplicate',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ docId, sessionId }),
        },
        sessionId,
      );
      if (!res || res.status !== 200) {
        setError(tRef.current('docs.duplicateFailed'));
        return null;
      }
      await refresh();
      return res.body;
    },
    [refresh, sessionId],
  );

  const rename = useCallback(
    async (docId, name) => {
      const res = await apiFetch(
        '/docs/rename',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ docId, name }),
        },
        sessionId,
      );
      if (!res || res.status !== 200) {
        setError(tRef.current('docs.renameFailed'));
        return null;
      }
      await refresh();
      return res.body;
    },
    [refresh, sessionId],
  );

  const remove = useCallback(
    async (docId) => {
      // The draft the current Session is showing (the selected one) cannot be
      // deleted; tell the user instead of silently swapping in a blank draft.
      if (docId === activeDocId) {
        if (statusRef.current) statusRef.current(false, 'docs.deleteActive');
        return false;
      }
      const res = await apiFetch(
        '/docs/delete',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ docId }),
        },
        sessionId,
      );
      if (!res || res.status !== 200) {
        setError(tRef.current('docs.deleteFailed'));
        return false;
      }
      // Always refresh the library so a deleted row disappears.
      await refresh();
      return true;
    },
    [activeDocId, refresh, sessionId],
  );

  const exportDoc = useCallback(
    async (docId) => {
      const res = await apiFetch(
        '/docs/export?docId=' + encodeURIComponent(docId),
        undefined,
        sessionId,
      );
      if (!res || res.status !== 200 || !res.body) {
        setError(tRef.current('docs.exportFailed'));
        return false;
      }
      const name = res.body.doc && res.body.doc.name ? res.body.doc.name : 'design';
      downloadText(
        JSON.stringify(res.body, null, 2),
        `${safeFileName(name, 'design')}.json`,
        'application/json;charset=utf-8',
      );
      if (statusRef.current) statusRef.current(true, 'export.done');
      return true;
    },
    [sessionId],
  );

  return {
    docs,
    ready,
    error,
    refresh,
    create,
    duplicate,
    rename,
    remove,
    exportDoc,
  };
}
