import { findElementEntry } from '../shared/elements.js';
import { activePageOf } from './domain/document.js';
import { buildMenuItems } from './editor/contextMenuItems.js';
import { useClipboard } from './editor/useClipboard.js';
import { useDocument } from './editor/useDocument.js';
import { useEditorActions } from './editor/useEditorActions.js';
import { useExport } from './editor/useExport.js';
import { useGestures } from './editor/useGestures.js';
import { useKeyboardShortcuts } from './editor/useKeyboard.js';
import { usePreview } from './editor/usePreview.js';
import { useSelection } from './editor/useSelection.js';
import { useTextEditing } from './editor/useTextEditing.js';
import { useUiPrefs } from './editor/useUiPrefs.js';
import { useT } from './i18n.js';
import { h, useCallback, useEffect, useRef, useState } from './react.js';
import { useSessionId } from './session.js';
import { StyleBlock } from './styles.js';
import { CanvasView } from './ui/canvas.js';
import { ContextMenu } from './ui/contextmenu.js';
import { InspectorView } from './ui/inspector.js';
import { LeftView } from './ui/left.js';
import { ToolbarView } from './ui/toolbar.js';

/**
 * Editor composition root.
 *
 * Everything with behaviour lives in `editor/*` hooks; this file wires them to
 * the presentational components under `ui/*` and owns only transient layout
 * state (panel widths, layer search, context-menu position).
 */
function ProductDesignPanel(props = {}) {
  const t = useT();
  const adapterSessionId = useSessionId();
  const sessionId = props.sessionId || adapterSessionId;
  const canvasRef = useRef(null);
  const spaceRef = useRef(false);
  const [layerQuery, setLayerQuery] = useState('');
  const [ctxMenu, setCtxMenu] = useState(null);
  const [toast, setToast] = useState(null);

  // The document hook owns history + Host sync. Its session-reset / remote
  // callbacks need setters that live in later hooks, so route them via refs.
  const resetTransientRef = useRef(() => {});
  const adoptRef = useRef(() => {});
  const { doc, docRef, setDoc, mapEl, setEl, undo, redo, canUndo, canRedo, pushPastSnapshot } =
    useDocument({
      sessionId,
      t,
      resetTransient: () => resetTransientRef.current(),
      onAdopt: (next) => adoptRef.current(next),
    });

  const prefs = useUiPrefs();
  const activePage = activePageOf(doc);
  const selection = useSelection({ setDoc, activePage });
  const { selIds, setSelIds, selEntries, sel, selBoxes, multiBounds, topSelectedEntries } =
    selection;

  const actions = useEditorActions({
    doc,
    setDoc,
    t,
    activePage,
    selIds,
    selEntries,
    topSelectedEntries,
    setSelIds,
    resizeMode: prefs.resizeMode,
  });

  const exporter = useExport({
    doc,
    activePage,
    t,
    onStatus: (ok, error) =>
      setToast({
        ok,
        message: t(ok ? 'export.done' : 'export.failed'),
        detail: error && error.message,
      }),
  });
  const clipboard = useClipboard({
    docRef,
    setDoc,
    setSelIds,
    getSelected: topSelectedEntries,
    deleteSelection: actions.deleteSelection,
  });
  const text = useTextEditing({ setDoc });
  const { editing, editingRef, setEditing } = text;
  const previewState = usePreview({ docRef, setDoc, setSelIds, setEditing, t });
  const {
    preview,
    togglePreview,
    exitPreview,
    back,
    closeOverlay,
    pageState,
    setPageState,
    ui,
    setUi,
    setUiFor,
    previewStack,
    previewOverlay,
    interact,
    renderStateFor,
    activate,
  } = previewState;
  const { pruneSelection } = selection;

  const setActivePage = useCallback(
    (id) => {
      setEditing(null);
      selection.setHoverId(null);
      setSelIds((ids) => {
        const page = docRef.current.pages.find((candidate) => candidate.id === id);
        if (!page) return [];
        const kept = ids.filter((item) => !!findElementEntry(page.elements, item));
        return kept.length === ids.length ? ids : kept;
      });
      setDoc((current) =>
        current.activePageId === id ? current : { ...current, activePageId: id },
      );
    },
    [docRef, setDoc, setSelIds],
  );

  const gestures = useGestures({
    docRef,
    setDoc,
    mapEl,
    activePage,
    setActivePage,
    selIds,
    setSelIds,
    zoomRef: prefs.zoomRef,
    snapRef: prefs.snapRef,
    canvasRef,
    spaceRef,
    pushPastSnapshot,
  });

  resetTransientRef.current = () => {
    setSelIds([]);
    previewState.setPreview(false);
    previewState.setPreviewStack([]);
    previewState.setPreviewOverlay(null);
    setEditing(null);
  };
  adoptRef.current = (nextDoc) => {
    setEditing(null);
    pruneSelection(nextDoc);
  };

  // Ctrl/⌘ + wheel zooms the canvas.
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return undefined;
    const onWheel = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      prefs.setZoom((value) =>
        Math.max(0.2, Math.min(2, Math.round((value + direction * 0.1) * 10) / 10)),
      );
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [prefs.setZoom]);

  useKeyboardShortcuts({
    preview,
    editingRef,
    ctxMenu,
    setEditing,
    setCtxMenu,
    selIds,
    setSelIds,
    undo,
    redo,
    groupSelection: actions.groupSelection,
    ungroupSelection: actions.ungroupSelection,
    duplicateSelection: actions.duplicateSelection,
    copySelection: clipboard.copySelection,
    cutSelection: clipboard.cutSelection,
    pasteClipboard: clipboard.pasteClipboard,
    deleteSelection: actions.deleteSelection,
    nudgeSelected: selection.nudgeSelected,
    reorderSelection: actions.reorderSelection,
    onEscapePreview: () => {
      if (previewOverlay) closeOverlay();
      else if (previewStack.length > 1) back();
      else exitPreview();
    },
  });

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  // Close the context menu on any outside press.
  useEffect(() => {
    if (!ctxMenu) return undefined;
    const close = () => setCtxMenu(null);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [ctxMenu]);

  function toggleSnap() {
    prefs.setSnapEnabled((value) => !value);
  }

  function startResizeLeft(event) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = prefs.leftWidth;
    const move = (moveEvent) => {
      prefs.setLeftWidth(
        Math.max(168, Math.min(460, Math.round(startWidth + (moveEvent.clientX - startX)))),
      );
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  function startResizeRight(event) {
    event.preventDefault();
    event.stopPropagation();
    if (prefs.rightCollapsed) return;
    const startX = event.clientX;
    const startWidth = prefs.rightWidth;
    const move = (moveEvent) => {
      prefs.setRightWidth(
        Math.max(200, Math.min(520, Math.round(startWidth - (moveEvent.clientX - startX)))),
      );
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  function openContextMenu(event, element) {
    if (element) {
      if (!selIds.includes(element.id)) setSelIds([element.id]);
    } else {
      setSelIds([]);
    }
    setCtxMenu({ x: event.clientX, y: event.clientY });
  }

  const viewPage = preview
    ? doc.pages.find((page) => page.id === previewStack[previewStack.length - 1]) || activePage
    : activePage;
  const crumbEntry = selEntries[0];
  const breadcrumb = activePage
    ? [
        { id: activePage.id, label: activePage.name },
        ...(crumbEntry
          ? crumbEntry.ancestors.map((id) => {
              const entry = selection.entryById.get(id);
              return {
                id,
                label: entry
                  ? entry.el.name || entry.el.props.name || t('comp.' + entry.el.type)
                  : id,
              };
            })
          : []),
        ...(crumbEntry
          ? [
              {
                id: crumbEntry.el.id,
                label:
                  crumbEntry.el.name || crumbEntry.el.props.text || t('comp.' + crumbEntry.el.type),
              },
            ]
          : []),
      ]
    : [];

  const ctxEl = selEntries[0] ? selEntries[0].el : null;
  const menuItems = ctxMenu
    ? buildMenuItems({
        t,
        selIds,
        selEntries,
        hasClipboard: clipboard.clipboardRef.current.length > 0,
        ctxEl,
        actions: {
          ...actions,
          applyAttrs: selection.applyAttrs,
          copySelection: clipboard.copySelection,
          cutSelection: clipboard.cutSelection,
          pasteClipboard: clipboard.pasteClipboard,
        },
      })
    : null;

  return h(
    'div',
    {
      className:
        'dpd-root' + (preview ? ' dpd-previewMode' : '') + (props.embedded ? ' dpd-embedded' : ''),
      'data-dsh-plugin': 'product-design',
    },
    h(StyleBlock),
    preview
      ? null
      : h(ToolbarView, {
          t,
          doc,
          setDoc,
          activePage,
          setPreset: actions.setPreset,
          pageState,
          setPageState,
          zoom: prefs.zoom,
          setZoom: prefs.setZoom,
          preview,
          togglePreview,
          undo,
          redo,
          canUndo,
          canRedo,
          setSelId: selection.selectOnly,
          snapEnabled: prefs.snapEnabled,
          toggleSnap,
          onExportPng: exporter.exportPng,
          onExportHtml: exporter.exportHtml,
          onExportReact: exporter.exportReact,
          onExpand: props.onExpand,
          onCollapse: props.onCollapse,
        }),
    h(
      'div',
      { className: 'dpd-body' },
      preview
        ? null
        : h(LeftView, {
            t,
            doc,
            activePage,
            setActivePage,
            addPage: actions.addPage,
            duplicatePage: actions.duplicatePage,
            deletePage: actions.deletePage,
            addElement: actions.addElement,
            section: prefs.section,
            setSection: prefs.setSection,
            leftWidth: prefs.leftWidth,
            startResizeLeft,
            selIds,
            setSelId: selection.selectOnly,
            setPreview: previewState.setPreview,
            setEl,
            onLayerMove: actions.moveLayer,
            layerQuery,
            setLayerQuery,
          }),
      h(CanvasView, {
        t,
        doc,
        activePage: viewPage,
        zoom: prefs.zoom,
        selIds,
        selBoxes,
        multiBounds,
        sel,
        preview,
        pageState,
        ui,
        canvasRef,
        spaceRef,
        spaceDown: gestures.spaceDown,
        panning: gestures.panning,
        guides: gestures.guides,
        marquee: gestures.marquee,
        hoverId: selection.hoverId,
        editing,
        breadcrumb,
        overlayPage: previewOverlay,
        renderStateFor,
        startDrag: gestures.startDrag,
        startResize: gestures.startResize,
        startMarquee: gestures.startMarquee,
        startPan: gestures.startPan,
        setSelId: selection.selectOnly,
        setActivePage,
        setUi,
        setUiFor,
        activate,
        setHoverId: selection.setHoverId,
        onContextMenu: openContextMenu,
        onInteract: interact,
        onStartTextEdit: text.startTextEdit,
        onTextChange: text.changeText,
        onTextCommit: text.commitText,
        onTextCancel: text.cancelText,
        onCloseOverlay: closeOverlay,
      }),
      preview
        ? null
        : h(InspectorView, {
            t,
            doc,
            sel,
            selCount: selEntries.length,
            activePage,
            pageState,
            resizeMode: prefs.resizeMode,
            setResizeMode: prefs.setResizeMode,
            fitContentToFrame: actions.fitContentToFrame,
            setEl,
            applyAttrs: selection.applyAttrs,
            applyProps: selection.applyProps,
            duplicateEl: actions.duplicateSelection,
            bringFront: actions.bringFront,
            sendBack: actions.sendBack,
            deleteEl: actions.deleteSelection,
            setPreset: actions.setPreset,
            renameActivePage: actions.renameActivePage,
            patchActiveFrame: actions.patchActiveFrame,
            patchPageStates: actions.patchStates,
            alignSelection: actions.alignSelection,
            distributeSelection: actions.distributeSelection,
            groupSelection: actions.groupSelection,
            ungroupSelection: actions.ungroupSelection,
            rightWidth: prefs.rightWidth,
            rightCollapsed: prefs.rightCollapsed,
            toggleRight: () => prefs.setRightCollapsed((value) => !value),
            startResizeRight,
          }),
    ),
    preview && previewStack.length > 1
      ? h(
          'div',
          { className: 'dpd-previewNav' },
          h('button', { type: 'button', onClick: back }, '‹ ' + t('preview.back')),
        )
      : null,
    preview
      ? h(
          'button',
          {
            className: 'dpd-previewExit',
            type: 'button',
            title: t('toolbar.exitPreview'),
            onClick: exitPreview,
          },
          t('toolbar.exitPreview'),
        )
      : null,
    ctxMenu
      ? h(ContextMenu, {
          x: ctxMenu.x,
          y: ctxMenu.y,
          items: menuItems,
          onClose: () => setCtxMenu(null),
        })
      : null,
  );
}

export { ProductDesignPanel };
