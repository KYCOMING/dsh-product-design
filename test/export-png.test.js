import { afterEach, describe, expect, it } from 'vitest';
import { renderPagePng } from '../src/client/export/png.js';

const t = (key) => key;
const page = {
  id: 'p',
  name: 'P',
  frame: { w: 390, h: 844, background: '#ffffff' },
  states: {},
  elements: [
    {
      id: 'e',
      type: 'text',
      x: 10,
      y: 10,
      w: 100,
      h: 30,
      hidden: false,
      locked: false,
      opacity: 1,
      state: 'default',
      props: { text: 'Hi' },
      interactions: [],
      constraints: { h: 'left', v: 'top' },
    },
  ],
};

let restore = [];
afterEach(() => {
  for (const fn of restore.reverse()) fn();
  restore = [];
});

describe('PNG 光栅化', () => {
  it('使用 data: URL（blob: 会污染 canvas）并输出 PNG blob', async () => {
    const OriginalImage = globalThis.Image;
    const originalCreate = document.createElement.bind(document);
    let src = '';
    const FakeImage = class {
      set src(value) {
        src = value;
        queueMicrotask(() => this.onload && this.onload());
      }
    };
    globalThis.Image = FakeImage;
    window.Image = FakeImage;
    restore.push(() => {
      globalThis.Image = OriginalImage;
      window.Image = OriginalImage;
    });

    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ fillRect() {}, drawImage() {} }),
      toBlob: (callback) => callback(new Blob(['png'], { type: 'image/png' })),
    };
    document.createElement = (tag) => (tag === 'canvas' ? canvas : originalCreate(tag));
    restore.push(() => {
      document.createElement = originalCreate;
    });

    const blob = await renderPagePng(page, { t }, 2);
    expect(blob.type).toBe('image/png');
    expect(src.startsWith('data:image/svg+xml')).toBe(true);
    expect(canvas.width).toBe(780);
    expect(canvas.height).toBe(1688);
  });
});
