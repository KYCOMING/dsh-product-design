import { TYPE_INFO } from '../constants.js';
import { PageOverlay } from '../overlay.js';
import { h } from '../react.js';
import { renderWidget } from '../widgets.js';

const GAP = 72;
const LABEL = 30;

export function CanvasView(props) {
  const {
    t,
    doc,
    activePage,
    zoom,
    selId,
    sel,
    selPage,
    preview,
    pageState,
    ui,
    canvasRef,
    spaceRef,
    spaceDown,
    panning,
    renderStateFor,
    startDrag,
    startResize,
    startPan,
    setSelId,
    setActivePage,
    setUi,
    setUiFor,
    activate,
  } = props;

  // -------------------------------------------------- canvas (all pages side by side)
  const positions = {};
  let cursorX = 0;
  doc.pages.forEach((p) => {
    positions[p.id] = cursorX;
    cursorX += p.frame.w + GAP;
  });
  const totalW = Math.max(1, cursorX - GAP);
  const maxH = doc.pages.reduce((m, p) => Math.max(m, p.frame.h), 0);
  const worldW = totalW;
  const worldH = LABEL + maxH;

  const pageLabels = doc.pages.map((p) =>
    h(
      'div',
      {
        key: p.id + '#lbl',
        className: 'dpd-pageLabel' + (p.id === activePage.id ? ' active' : ''),
        style: { left: positions[p.id], top: 4, height: LABEL - 8, cursor: 'pointer' },
        onMouseDown: (e) => e.stopPropagation(),
        onClick: () => setActivePage(p.id),
        title: p.name,
      },
      h('span', { className: 'pin' }, p.name),
      h('span', { className: 'sz' }, p.frame.w + '×' + p.frame.h),
    ),
  );

  const frameNodes = doc.pages.map((p) => {
    const pageActive = p.id === activePage.id;
    const els = p.elements.map((el) => {
      const st = renderStateFor(el);
      const u = ui[el.id] || {};
      const info = TYPE_INFO[el.type] || TYPE_INFO.text;
      const cursor = spaceDown
        ? panning
          ? 'grabbing'
          : 'grab'
        : preview
          ? info.interactive
            ? 'pointer'
            : 'default'
          : 'move';
      return h(
        'div',
        {
          key: el.id,
          className: 'dpd-el' + (selId === el.id && !preview ? ' dpd-sel' : ''),
          style: { left: el.x, top: el.y, width: el.w, height: el.h, cursor },
          onMouseDown: (ev) => {
            if (ev.button === 1 || spaceRef.current) return; // let the canvas pan
            if (preview) {
              if (el.type === 'button') setUiFor(el.id, { press: true });
              return;
            }
            startDrag(ev, p.id, el);
          },
          onMouseEnter: () => {
            if (preview && (el.type === 'button' || el.type === 'card'))
              setUiFor(el.id, { hover: true });
          },
          onMouseLeave: () => {
            if (preview) setUiFor(el.id, { hover: false, press: false });
          },
          onMouseUp: () => {
            if (preview && el.type === 'button') setUiFor(el.id, { press: false });
          },
          onClick: (ev) => {
            if (preview) {
              ev.stopPropagation();
              activate(el, ev);
            }
          },
        },
        h(
          'div',
          { style: { width: '100%', height: '100%', pointerEvents: 'none' } },
          renderWidget(el, st, t, { tabsActive: u.tabs, preview }),
        ),
      );
    });

    const selNode =
      sel && selPage && selPage.id === p.id && !preview
        ? h(
            'div',
            {
              className: 'dpd-selBox',
              style: { left: sel.x, top: sel.y, width: sel.w, height: sel.h },
            },
            h('div', { className: 'dpd-handle br', onMouseDown: (ev) => startResize(ev, sel) }),
          )
        : null;

    const overlay = pageActive && pageState !== 'normal' ? h(PageOverlay, { pageState, t }) : null;

    return h(
      'div',
      {
        key: p.id,
        className: 'dpd-frame',
        style: {
          left: positions[p.id],
          top: LABEL,
          width: p.frame.w,
          height: p.frame.h,
          background: p.frame.background || '#ffffff',
        },
        onMouseDown: (ev) => {
          if (ev.button === 1 || spaceRef.current) return; // let the canvas pan
          ev.stopPropagation();
          setActivePage(p.id);
          if (!preview) setSelId(null);
        },
      },
      els,
      selNode,
      overlay,
    );
  });

  const gridCell = 20 * zoom;
  const gridMinor = 'var(--dsw-alias-border-l1,#e2e5ec)';
  const gridMajor = 'var(--dsw-alias-border-l2,#cfd3db)';
  const gridImage =
    'linear-gradient(to right,' +
    gridMinor +
    ' 1px,transparent 1px),' +
    'linear-gradient(to bottom,' +
    gridMinor +
    ' 1px,transparent 1px),' +
    'linear-gradient(to right,' +
    gridMajor +
    ' 1px,transparent 1px),' +
    'linear-gradient(to bottom,' +
    gridMajor +
    ' 1px,transparent 1px)';
  const gridSize =
    gridCell +
    'px ' +
    gridCell +
    'px,' +
    gridCell +
    'px ' +
    gridCell +
    'px,' +
    gridCell * 5 +
    'px ' +
    gridCell * 5 +
    'px,' +
    gridCell * 5 +
    'px ' +
    gridCell * 5 +
    'px';

  const canvas = h(
    'div',
    {
      className: 'dpd-canvas',
      ref: canvasRef,
      title: t('toolbar.panHint'),
      style: { cursor: panning ? 'grabbing' : spaceDown ? 'grab' : 'default' },
      onMouseDown: (ev) => {
        if (ev.button === 1 || spaceRef.current) {
          startPan(ev);
          return;
        }
        if (!preview) setSelId(null);
        else setUi({});
      },
    },
    h(
      'div',
      {
        className: 'dpd-canvasinner',
        style: { backgroundImage: gridImage, backgroundSize: gridSize, backgroundPosition: '0 0' },
      },
      h(
        'div',
        { className: 'dpd-stage', style: { width: worldW * zoom, height: worldH * zoom } },
        h(
          'div',
          {
            className: 'dpd-world',
            style: {
              width: worldW,
              height: worldH,
              transform: 'scale(' + zoom + ')',
              transformOrigin: 'top left',
            },
          },
          pageLabels,
          frameNodes,
        ),
      ),
    ),
  );

  return canvas;
}
