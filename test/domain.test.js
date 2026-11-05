import { describe, expect, it } from 'vitest';
import {
  addPage,
  groupEntries,
  pasteElements,
  removePage,
  reorderElements,
  ungroupEntry,
} from '../src/client/domain/document.js';
import { collectElementEntries } from '../src/shared/elements.js';

const el = (over) => ({
  id: 'e1',
  type: 'text',
  name: '',
  x: 0,
  y: 0,
  w: 100,
  h: 30,
  hidden: false,
  locked: false,
  opacity: 1,
  state: 'default',
  props: {},
  interactions: [],
  constraints: { h: 'left', v: 'top' },
  ...over,
});

const doc = () => ({
  name: '',
  activePageId: 'p1',
  pages: [
    {
      id: 'p1',
      name: 'P',
      frame: { w: 390, h: 844, preset: 'mobile', background: '#fff' },
      states: {},
      elements: [
        el({ id: 'a', x: 10, y: 10 }),
        el({ id: 'b', x: 120, y: 10 }),
        el({ id: 'box', type: 'container', x: 200, y: 200, w: 150, h: 100, children: [] }),
      ],
    },
  ],
});

describe('domain/document 纯变换', () => {
  it('addPage / removePage 维护 activePageId', () => {
    const page = { id: 'p2', name: 'P2', frame: doc().pages[0].frame, states: {}, elements: [] };
    const added = addPage(doc(), page);
    expect(added.pages).toHaveLength(2);
    expect(added.activePageId).toBe('p2');
    const removed = removePage(added, 'p2');
    expect(removed.pages).toHaveLength(1);
    expect(removed.activePageId).toBe('p1');
  });

  it('pasteElements 保留绝对位置，并可粘贴进容器', () => {
    const source = collectElementEntries(doc().pages[0].elements).find((e) => e.el.id === 'a');
    const items = [{ el: source.el, absX: source.absX, absY: source.absY }];
    const rootPaste = pasteElements(doc(), 'p1', items, null);
    const pasted = rootPaste.doc.pages[0].elements.find((e) => e.id === rootPaste.ids[0]);
    expect(pasted).toMatchObject({ x: 26, y: 26 });

    const boxPaste = pasteElements(doc(), 'p1', items, 'box');
    const box = boxPaste.doc.pages[0].elements.find((e) => e.id === 'box');
    expect(box.children[0]).toMatchObject({ x: 10 + 16 - 200, y: 10 + 16 - 200 });
  });

  it('reorderElements 调整层级', () => {
    const out = reorderElements(doc(), 'p1', ['a'], 'front');
    expect(out.pages[0].elements.map((e) => e.id)).toEqual(['b', 'box', 'a']);
  });

  it('groupEntries / ungroupEntry 保持绝对坐标', () => {
    const entries = collectElementEntries(doc().pages[0].elements).filter((e) =>
      ['a', 'b'].includes(e.el.id),
    );
    const grouped = groupEntries(doc(), 'p1', entries, 'G');
    const group = grouped.doc.pages[0].elements.find((e) => e.id === grouped.groupId);
    expect(group.children.map((e) => [e.x, e.y])).toEqual([
      [0, 0],
      [110, 0],
    ]);
    const ungrouped = ungroupEntry(grouped.doc, 'p1', group.id);
    const restored = ungrouped.doc.pages[0].elements;
    expect(restored.map((e) => [e.id, e.x, e.y])).toEqual([
      ['a', 10, 10],
      ['b', 120, 10],
      ['box', 200, 200],
    ]);
  });
});
