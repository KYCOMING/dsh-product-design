// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createStores } from '../src/host/store.js';

let home;
beforeAll(() => {
  home = mkdtempSync(join(tmpdir(), 'dpd-own-'));
  process.env.DSH_HOME = home;
});
afterAll(() => {
  try {
    rmSync(home, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

// P1-6 security regression: a document may only be renamed/duplicated/deleted/
// exported by the Session that owns it; other Sessions must get `forbidden`.
describe('store 文档归属校验（P1-6）', () => {
  it('跨会话 rename / delete / export 被拒绝，所属会话允许', () => {
    const stores = createStores();
    const created = stores.createDocFor({ sessionId: 'sess-a', name: 'A' });
    const docId = created.snapshot.docId;

    expect(() => stores.renameDoc(docId, 'hijack', 'sess-b')).toThrow(/forbidden/);
    expect(() => stores.deleteDoc(docId, 'sess-b')).toThrow(/forbidden/);
    expect(() => stores.exportDoc(docId, 'sess-b')).toThrow(/forbidden/);
    expect(() => stores.duplicateDoc(docId, 'sess-b')).toThrow(/forbidden/);

    const renamed = stores.renameDoc(docId, 'A2', 'sess-a');
    expect(renamed.name).toBe('A2');
    expect(stores.exportDoc(docId, 'sess-a').doc.name).toBe('A2');
  });
});
