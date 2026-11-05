import { isContainerType } from '../../shared/elements.js';
import { TYPE_INFO } from '../constants.js';
import { h } from '../react.js';
import { renderWidget } from '../widgets.js';

const GAP = 72;
const LABEL = 30;

const HANDLES = [
  ['nw', 'nwse-resize'],
  ['n', 'ns-resize'],
  ['ne', 'nesw-resize'],
  ['e', 'ew-resize'],
  ['se', 'nwse-resize'],
  ['s', 'ns-resize'],
  ['sw', 'nesw-resize'],
  ['w', 'ew-resize'],
];

function textStyle(el) {
  return {
    fontSize: (el.props && el.props.fontSize) || 14,
    fontWeight: (el.props && el.props.fontWeight) || 400,
    color: (el.props && el.props.color) || '#111827',
    textAlign: (el.props && el.props.textAlign) || 'left',
    lineHeight: 1.4,
  };
}

export function CanvasView(props) {
  const {
    t,
    doc,
    activePage,
    zoom,
    selIds,
    selBoxes,
    multiBounds,
    sel,
    preview,
    ui,
    canvasRef,
    spaceRef,
    spaceDown,
    panning,
    guides,
    marquee,
    hoverId,
    editing,
    breadcrumb,
    overlayPage,
    renderStateFor,
    startDrag,
    startResize,
    startMarquee,
    startPan,
    setSelId,
    setActivePage,
    setUi,
    setUiFor,
    activate,
    setHoverId,
    onContextMenu,
    onInteract,
    onStartTextEdit,
    onTextChange,
    onTextCommit,
    onTextCancel,
    onCloseOverlay,
  } = props;

  const selectedSet = new Set(selIds || []);

  function renderElements(elements, pageId, isOverlay) {
    return elements.map((el) => {
      if (el.hidden) return null;
      const st = renderStateFor(el);
      const u = ui[el.id] || {};
      const info = TYPE_INFO[el.type] || TYPE_INFO.text;
      const isEditing = !!(editing && editing.id === el.id && !preview);
      const cursor = spaceDown
        ? panning
          ? 'grabbing'
          : 'grab'
        : preview
          ? info.interactive || (el.interactions && el.interactions.length)
            ? 'pointer'
            : 'default'
          : el.locked
            ? 'default'
            : 'move';
      const isBox = isContainerType(el.type);
      const selected = selectedSet.has(el.id) && !preview && !isOverlay;
      const style = {
        left: el.x,
        top: el.y,
        width: el.w,
        height: el.h,
        cursor,
        opacity: el.opacity == null ? 1 : el.opacity,
      };
      let className = 'dpd-el';
      if (selected) className += ' dpd-sel';
      if (!preview && !isOverlay && hoverId === el.id && !selected) className += ' dpd-hover';
      if (el.locked) className += ' dpd-locked';
      if (isBox) {
        className += el.type === 'container' ? ' dpd-container' : ' dpd-group';
        if (el.type === 'container') {
          style.background = el.props.background || '#ffffff';
          style.borderRadius = el.props.radius != null ? el.props.radius : 12;
          style.overflow = el.props.clipContent === false ? 'visible' : 'hidden';
        }
      }
      const handlers = {
        onMouseDown: (ev) => {
          if (ev.button === 1 || spaceRef.current) return;
          if (preview || isOverlay) {
            if (preview && el.type === 'button') setUiFor(el.id, { press: true });
            return;
          }
          ev.stopPropagation();
          if (el.locked) {
            setSelId(el.id);
            return;
          }
          startDrag(ev, pageId, el);
        },
        onMouseEnter: () => {
          if (preview) {
            if (el.type === 'button' || el.type === 'card') setUiFor(el.id, { hover: true });
          } else if (!isOverlay) {
            setHoverId(el.id);
          }
        },
        onMouseLeave: () => {
          if (preview) setUiFor(el.id, { hover: false, press: false });
          else if (!isOverlay && hoverId === el.id) setHoverId(null);
        },
        onMouseUp: () => {
          if (preview && el.type === 'button') setUiFor(el.id, { press: false });
        },
        onDoubleClick: (ev) => {
          if (preview || isOverlay) return;
          if (!info.hasText) return;
          ev.stopPropagation();
          setSelId(el.id);
          onStartTextEdit(el.id, el.props.text || '');
        },
        onClick: (ev) => {
          if (preview) {
            ev.stopPropagation();
            if (el.interactions && el.interactions.length) onInteract(el);
            else activate(el, ev);
          } else if (!isOverlay) {
            ev.stopPropagation();
            setSelId(el.id);
          }
        },
        onContextMenu: (ev) => {
          if (preview || isOverlay) return;
          ev.preventDefault();
          ev.stopPropagation();
          onContextMenu(ev, el);
        },
      };
      return h(
        'div',
        {
          key: el.id,
          'data-el-id': el.id,
          className,
          style,
          title: el.name || el.props.name || t('comp.' + el.type),
          ...handlers,
        },
        isEditing
          ? h('textarea', {
              className: 'dpd-textEditor',
              value: editing.value,
              autoFocus: true,
              spellCheck: false,
              style: textStyle(el),
              onMouseDown: (ev) => ev.stopPropagation(),
              onDoubleClick: (ev) => ev.stopPropagation(),
              onChange: (ev) => onTextChange(el.id, ev.target.value),
              onBlur: () => onTextCommit(el.id),
              onKeyDown: (ev) => {
                ev.stopPropagation();
                if (ev.key === 'Escape') {
                  ev.preventDefault();
                  onTextCancel();
                } else if (ev.key === 'Enter' && !ev.shiftKey) {
                  ev.preventDefault();
                  onTextCommit(el.id);
                }
              },
            })
          : isBox
            ? renderElements(el.children || [], pageId, isOverlay)
            : h(
                'div',
                { style: { width: '100%', height: '100%', pointerEvents: 'none' } },
                renderWidget(el, st, t, { tabsActive: u.tabs, preview }),
              ),
      );
    });
  }

  const visiblePages = preview ? [activePage] : doc.pages;
  const labelOffset = preview ? 0 : LABEL;
  const positions = {};
  let cursorX = 0;
  visiblePages.forEach((p) => {
    positions[p.id] = cursorX;
    cursorX += p.frame.w + GAP;
  });
  const totalW = Math.max(1, cursorX - GAP);
  const maxH = visiblePages.reduce((m, p) => Math.max(m, p.frame.h), 0);
  const worldW = totalW;
  const worldH = labelOffset + maxH;

  const pageLabels = (preview ? [] : doc.pages).map((p) =>
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

  const frameNodes = visiblePages.map((p) => {
    const pageActive = p.id === activePage.id;
    const els = renderElements(p.elements, p.id);

    const selectionNodes =
      !preview && pageActive
        ? selBoxes.map((box) => {
            const single = selBoxes.length === 1;
            const node = sel;
            const showHandles = single && node && !node.locked;
            return h(
              'div',
              {
                key: 'sel-' + box.id,
                className: 'dpd-selBox' + (single ? '' : ' multi'),
                style: { left: box.x, top: box.y, width: box.w, height: box.h },
              },
              showHandles
                ? HANDLES.map(([dir, cur]) =>
                    h('div', {
                      key: dir,
                      className: 'dpd-handle h-' + dir,
                      'data-dir': dir,
                      style: { cursor: cur },
                      onMouseDown: (ev) => startResize(ev, node, dir),
                    }),
                  )
                : null,
            );
          })
        : null;

    const multiSelection =
      !preview && pageActive && multiBounds && selBoxes.length > 1
        ? h('div', {
            className: 'dpd-multiBox',
            style: {
              left: multiBounds.x,
              top: multiBounds.y,
              width: multiBounds.w,
              height: multiBounds.h,
            },
          })
        : null;

    const guideNodes =
      pageActive && !preview && guides && guides.length
        ? guides.map((g, i) =>
            g.axis === 'x'
              ? h('div', {
                  key: 'gx-' + i,
                  className: 'dpd-guide v',
                  style: { left: g.pos, top: g.from, height: Math.max(1, g.to - g.from) },
                })
              : h('div', {
                  key: 'gy-' + i,
                  className: 'dpd-guide h',
                  style: { top: g.pos, left: g.from, width: Math.max(1, g.to - g.from) },
                }),
          )
        : null;

    const marqueeNode =
      pageActive && marquee && marquee.pageId === p.id
        ? h('div', {
            className: 'dpd-marquee',
            style: {
              left: marquee.x,
              top: marquee.y,
              width: marquee.w,
              height: marquee.h,
            },
          })
        : null;

    return h(
      'div',
      {
        key: p.id,
        className: 'dpd-frame',
        style: {
          left: positions[p.id],
          top: labelOffset,
          width: p.frame.w,
          height: p.frame.h,
          background: p.frame.background || '#ffffff',
        },
        onMouseDown: (ev) => {
          if (ev.button === 1 || spaceRef.current) return;
          if (preview) {
            setUi({});
            return;
          }
          startMarquee(ev, p);
        },
        onContextMenu: (ev) => {
          if (preview) return;
          ev.preventDefault();
          ev.stopPropagation();
          onContextMenu(ev, null);
        },
      },
      els,
      selectionNodes,
      multiSelection,
      guideNodes,
      marqueeNode,
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
      className: 'dpd-canvas' + (preview ? ' dpd-preview' : ''),
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
      onContextMenu: (ev) => {
        if (preview) return;
        ev.preventDefault();
        setSelId(null);
        onContextMenu(ev, null);
      },
    },
    h(
      'div',
      {
        className: 'dpd-canvasinner',
        style: {
          backgroundImage: preview ? 'none' : gridImage,
          backgroundSize: preview ? 'auto' : gridSize,
          backgroundPosition: '0 0',
        },
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
    overlayPage
      ? h(OverlayLayer, {
          page: overlayPage,
          t,
          renderElements,
          onClose: onCloseOverlay,
        })
      : null,
  );

  return h(
    'div',
    { className: 'dpd-canvasWrap' },
    !preview && breadcrumb && breadcrumb.length
      ? h(
          'div',
          { className: 'dpd-breadcrumb' },
          breadcrumb.map((item, i) =>
            h(
              'span',
              { key: item.id || i, style: { display: 'contents' } },
              i > 0 ? h('span', { className: 'sep' }, '›') : null,
              h(
                'button',
                {
                  type: 'button',
                  className: i === breadcrumb.length - 1 ? 'cur' : '',
                  onClick: () => setSelId(item.id),
                  title: item.label,
                },
                item.label,
              ),
            ),
          ),
        )
      : null,
    canvas,
  );
}

/** Modal / dialog prototype: a target page rendered on top of the current one. */
function OverlayLayer(props) {
  const { page, renderElements, onClose } = props;
  const frame = page.frame || { w: 390, h: 844 };
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const scale = Math.min(1, (vh * 0.8) / Math.max(1, frame.h), (vw * 0.6) / Math.max(1, frame.w));
  return h(
    'div',
    { className: 'dpd-overlayBackdrop', onMouseDown: onClose },
    h(
      'div',
      {
        className: 'dpd-overlayFrame',
        style: {
          width: Math.round(frame.w * scale),
          height: Math.round(frame.h * scale),
          background: frame.background || '#ffffff',
        },
        onMouseDown: (ev) => ev.stopPropagation(),
        onClick: (ev) => ev.stopPropagation(),
      },
      h(
        'div',
        {
          style: {
            width: frame.w,
            height: frame.h,
            position: 'relative',
            transform: 'scale(' + scale + ')',
            transformOrigin: 'top left',
          },
        },
        renderElements(page.elements || [], page.id, true),
      ),
    ),
  );
}
