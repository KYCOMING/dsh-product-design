import { describe, expect, it } from 'vitest';
import { duplicateElements, groupEntries } from '../src/client/domain/document.js';
import { renderElement } from '../src/client/export/index.js';
import { normalizeDoc as clientNormalize } from '../src/client/model.js';
import { renderWidget } from '../src/client/widgets.js';
import { applyOps, ensureDoc as hostEnsure } from '../src/host/model.js';
import { ACCENT, accentOf, fontSizeOf, radiusOf } from '../src/shared/element-visual.js';
import { collectElementEntries } from '../src/shared/elements.js';
import { ELEMENT_TYPES } from '../src/shared/schema.js';

/** Minimal valid document used by the regression tests below. */
function docWith(elements) {
  return {
    name: '',
    activePageId: 'p',
    pages: [
      {
        id: 'p',
        name: 'Page',
        frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
        states: {},
        elements,
      },
    ],
  };
}

function textEl(id) {
  return {
    id,
    type: 'text',
    name: '',
    x: 10,
    y: 10,
    w: 100,
    h: 20,
    hidden: false,
    locked: false,
    opacity: 1,
    state: 'default',
    props: {},
    interactions: [],
    constraints: { h: 'left', v: 'top' },
  };
}

function containerEl(id, children) {
  return {
    id,
    type: 'container',
    name: '',
    x: 0,
    y: 0,
    w: 200,
    h: 200,
    hidden: false,
    locked: false,
    opacity: 1,
    state: 'default',
    props: {},
    interactions: [],
    constraints: { h: 'leftRight', v: 'top' },
    children,
  };
}

// P0-0 regression: duplicateInTree used cloneElementDeep/uid without importing
// them, which threw `ReferenceError: cloneElementDeep is not defined` at runtime.
describe('复制元素回归（P0-0）', () => {
  it('复制顶层元素不抛错，生成新 id 并保留原元素', () => {
    const { doc, ids } = duplicateElements(docWith([textEl('a')]), 'p', ['a']);
    expect(ids).toHaveLength(1);
    expect(ids[0]).not.toBe('a');
    expect(doc.pages[0].elements).toHaveLength(2);
    expect(doc.pages[0].elements[0].id).toBe('a');
  });

  it('复制嵌套容器内的元素不抛错，深拷贝并生成新 id', () => {
    const { doc, ids } = duplicateElements(docWith([containerEl('c', [textEl('a')])]), 'p', ['a']);
    const container = doc.pages[0].elements[0];
    expect(container.children).toHaveLength(2);
    expect(container.children[0].id).toBe('a');
    expect(container.children[1].id).not.toBe('a');
    expect(ids).toHaveLength(1);
    // offset applied
    expect(container.children[1].x).toBe(textEl('a').x + 16);
  });
});

// P0-1 parity guard: the client view-model and host reducer must normalize the
// same raw input to the same document. If schema.js is ever bypassed, this fails.
describe('client↔host 归一化对拍（P0-1）', () => {
  const rawDoc = {
    name: 'Design',
    activePageId: 'p1',
    pages: [
      {
        id: 'p1',
        name: 'Page 1',
        frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
        states: {},
        elements: [
          {
            id: 'e1',
            type: 'button',
            x: 1,
            y: 2,
            w: 100,
            h: 40,
            state: 'hover',
            props: { text: 'Hi', color: '#111111' },
            interactions: [{ action: 'navigate', targetPageId: 'p1' }],
            constraints: { h: 'left', v: 'top' },
          },
        ],
      },
    ],
  };

  it('同一份输入两端产出相同的元素与页面', () => {
    const client = clientNormalize(structuredClone(rawDoc));
    const host = hostEnsure(structuredClone(rawDoc));
    expect(client).not.toBeNull();
    expect(host.pages[0].elements[0]).toEqual(client.pages[0].elements[0]);
    expect(host.pages[0].frame).toEqual(client.pages[0].frame);
    expect(host.activePageId).toBe(client.activePageId);
  });

  it('非法 state 两端都被归一到默认值', () => {
    const dirty = structuredClone(rawDoc);
    dirty.pages[0].elements[0].state = 'totally-invalid';
    const client = clientNormalize(structuredClone(dirty));
    const host = hostEnsure(structuredClone(dirty));
    expect(client.pages[0].elements[0].state).toBe('default');
    expect(host.pages[0].elements[0].state).toBe('default');
  });

  it('空文档：client 返回 null（需播种），host 返回空文档', () => {
    const empty = { name: '', pages: [], activePageId: null };
    expect(clientNormalize(structuredClone(empty))).toBeNull();
    expect(hostEnsure(structuredClone(empty)).pages).toEqual([]);
  });
});

// P0-3 regression: all emitters must derive radius/font/accent from the shared
// token module (so exports can't silently drift from the editor).
describe('元素视觉 token 一致（P0-3）', () => {
  it('radiusOf / fontSizeOf / accentOf 从统一 token 派生', () => {
    expect(radiusOf({ type: 'button', props: {} })).toBe(8);
    expect(radiusOf({ type: 'card', props: {} })).toBe(12);
    expect(radiusOf({ type: 'image', props: {} })).toBe(10);
    expect(radiusOf({ type: 'button', props: { radius: 4 } })).toBe(4);
    expect(fontSizeOf({ type: 'text', props: {} }, 18)).toBe(18);
    expect(fontSizeOf({ type: 'text', props: { fontSize: 22 } }, 18)).toBe(22);
    expect(accentOf({ type: 'button', props: {} })).toBe(ACCENT);
    expect(accentOf({ type: 'button', props: { color: '#111111' } })).toBe('#111111');
  });

  it('HTML 导出按钮/卡片尺寸取自同一 token（8 / 12）', () => {
    const ctx = { depth: 0, t: (k) => k };
    const btn = renderElement(
      {
        id: 'b',
        type: 'button',
        x: 0,
        y: 0,
        w: 100,
        h: 44,
        hidden: false,
        locked: false,
        opacity: 1,
        state: 'default',
        props: { text: 'Hi' },
        interactions: [],
        constraints: { h: 'left', v: 'top' },
      },
      ctx,
    );
    expect(btn).toContain('border-radius:8px');
    expect(btn).toContain('font-size:14px');
  });
});

// P0-2b parity guard: host `applyOps group_elements` and client `groupEntries`
// must build the same group (same bounds, same relative child offsets, name in
// el.name). Both now delegate to shared/elements.js.
describe('group 双引擎对拍（P0-2b）', () => {
  const mk = (id, x, y, w, h) => ({
    id,
    type: 'text',
    name: '',
    x,
    y,
    w,
    h,
    hidden: false,
    locked: false,
    opacity: 1,
    state: 'default',
    props: {},
    interactions: [],
    constraints: { h: 'left', v: 'top' },
  });
  const baseDoc = () => ({
    name: '',
    activePageId: 'p',
    pages: [
      {
        id: 'p',
        name: 'P',
        frame: { w: 390, h: 844, preset: 'mobile', background: '#ffffff' },
        states: {},
        elements: [mk('a', 10, 10, 100, 20), mk('b', 150, 60, 80, 30)],
      },
    ],
  });

  it('两端生成的 group 结构与子级相对坐标一致', () => {
    const host = applyOps(baseDoc(), [
      { kind: 'group_elements', elementIds: ['a', 'b'], name: 'G' },
    ]).doc;
    const clientDoc = baseDoc();
    const entries = collectElementEntries(clientDoc.pages[0].elements);
    const client = groupEntries(clientDoc, 'p', entries, 'G').doc;
    const hg = host.pages[0].elements[0];
    const cg = client.pages[0].elements[0];
    expect(hg.type).toBe('group');
    expect(cg.type).toBe('group');
    expect(hg.name).toBe('G');
    expect(cg.name).toBe('G');
    expect([hg.w, hg.h]).toEqual([cg.w, cg.h]);
    expect(hg.children.map((c) => [c.x, c.y, c.w, c.h])).toEqual(
      cg.children.map((c) => [c.x, c.y, c.w, c.h]),
    );
  });
});

// P1-5: the widget registry (split into widgets/*.js) must cover every element
// type in the schema, or the editor silently renders nothing for a type.
describe('widget 注册表完整（P1-5）', () => {
  it('每种元素类型都注册了渲染器且不抛错', () => {
    const t = (k) => k;
    for (const type of Object.keys(ELEMENT_TYPES)) {
      const el = {
        id: 'x',
        type,
        name: '',
        x: 0,
        y: 0,
        w: 100,
        h: 40,
        hidden: false,
        locked: false,
        opacity: 1,
        state: 'default',
        props: {},
        interactions: [],
        constraints: { h: 'left', v: 'top' },
      };
      if (type === 'container' || type === 'group') el.children = [];
      expect(() => renderWidget(el, 'default', t, {})).not.toThrow();
    }
  });
});
