import { findElementEntry } from '../shared/elements.js';
import { PAGE_STATE_KEYS, statePageId } from '../shared/page-states.js';
import { useDocs } from './docs.js';
import { activePageOf } from './domain/document.js';
import { buildMenuItems } from './editor/contextMenuItems.js';
import { useActivePage } from './editor/useActivePage.js';
import { useCanvasZoom } from './editor/useCanvasZoom.js';
import { useClipboard } from './editor/useClipboard.js';
import { useContextMenu } from './editor/useContextMenu.js';
import { useDocument } from './editor/useDocument.js';
import { useEditorActions } from './editor/useEditorActions.js';
import { useExport } from './editor/useExport.js';
import { useGestures } from './editor/useGestures.js';
import { useKeyboardShortcuts } from './editor/useKeyboard.js';
import { usePanelResize } from './editor/usePanelResize.js';
import { usePreview } from './editor/usePreview.js';
import { useSelection } from './editor/useSelection.js';
import { useTextEditing } from './editor/useTextEditing.js';
import { useToast } from './editor/useToast.js';
import { useUiPrefs } from './editor/useUiPrefs.js';
import { useViewport } from './editor/useViewport.js';
import { useT } from './i18n.js';
import { breadcrumbModel, previewViewModels } from './panel/viewModels.js';
import { h, useRef, useState } from './react.js';
import { useSessionId, useSessionTitle } from './session.js';
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
  const sessionTitle = useSessionTitle();
  const canvasRef = useRef(null);
  const spaceRef = useRef(false);
  const [layerQuery, setLayerQuery] = useState('');

  // The document hook owns history + Host sync. Its session-reset / remote
  // callbacks need setters that live in later hooks, so route them via refs.
  const resetTransientRef = useRef(() => {});
  const adoptRef = useRef(() => {});
  const docsRefreshRef = useRef(() => {});
  const { toast, setToast } = useToast();
  const {
    doc,
    docId,
    docRef,
    setDoc,
    mapEl,
    setEl,
    undo,
    redo,
    canUndo,
    canRedo,
    pushPastSnapshot,
    switchDoc,
    syncState,
    resolveConflict,
  } = useDocument({
    sessionId,
    sessionTitle,
    t,
    resetTransient: () => resetTransientRef.current(),
    onAdopt: (next) => adoptRef.current(next),
    onAutoSeeded: () => docsRefreshRef.current(),
  });

  const docs = useDocs({
    sessionId,
    activeDocId: docId,
    t,
    onSwitch: switchDoc,
    onStatus: (ok, message) =>
      setToast({ ok, message: t(message || (ok ? 'export.done' : 'export.failed')) }),
  });
  docsRefreshRef.current = docs.refresh;

  const prefs = useUiPrefs();
  const { startResizeLeft, startResizeRight } = usePanelResize(prefs);
  const viewport = useViewport();
  useCanvasZoom(canvasRef, prefs.setZoom);
  const activePage = activePageOf(doc);
  const selection = useSelection({ setDoc, activePage });
  const { selIds, setSelIds, selEntries, sel, selBoxes, multiBounds, topSelectedEntries } =
    selection;
  const { ctxMenu, setCtxMenu, openContextMenu } = useContextMenu(selIds, setSelIds);

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
  const previewState = usePreview({ docRef, setSelIds, setEditing, t });
  const {
    preview,
    togglePreview,
    exitPreview,
    back,
    closeOverlay,
    showState,
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

  const setActivePage = useActivePage({
    docRef,
    setDoc,
    setEditing,
    setHoverId: selection.setHoverId,
    setSelIds,
  });

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
    previewState.setUi({});
    setEditing(null);
  };
  adoptRef.current = (nextDoc) => {
    setEditing(null);
    pruneSelection(nextDoc);
  };

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

  function toggleSnap() {
    prefs.setSnapEnabled((value) => !value);
  }

  const { viewPage, previewBase, previewStateKey, previewStateIds, hasPreviewState } =
    previewViewModels(doc, activePage, preview, previewStack);
  const crumbEntry = selEntries[0];
  const breadcrumb = breadcrumbModel(activePage, crumbEntry, selection.entryById, t);

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
    syncState === 'conflict'
      ? h(
          'div',
          { className: 'dpd-syncBar' },
          h('span', { className: 'dpd-syncMsg' }, t('sync.conflictMessage')),
          h(
            'button',
            {
              className: 'dpd-syncBtn primary',
              type: 'button',
              onClick: () => resolveConflict('mine'),
            },
            t('sync.keepMine'),
          ),
          h(
            'button',
            {
              className: 'dpd-syncBtn',
              type: 'button',
              onClick: () => resolveConflict('theirs'),
            },
            t('sync.useRemote'),
          ),
        )
      : null,
    preview
      ? null
      : h(ToolbarView, {
          t,
          doc,
          setDoc,
          activePage,
          setPreset: actions.setPreset,
          zoom: prefs.zoom,
          setZoom: prefs.setZoom,
          preview,
          togglePreview,
          undo,
          redo,
          canUndo,
          canRedo,
          syncState,
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
            docs: docs.docs,
            docsReady: docs.ready,
            docsError: docs.error,
            activeDocId: docId,
            onOpenDoc: switchDoc,
            onCreateDoc: docs.create,
            onDuplicateDoc: docs.duplicate,
            onRenameDoc: docs.rename,
            onDeleteDoc: (id) => {
              if (id === docId || window.confirm(t('docs.deleteConfirm'))) docs.remove(id);
            },
            onExportDoc: docs.exportDoc,
            onRefreshDocs: docs.refresh,
          }),
      h(CanvasView, {
        t,
        viewport,
        doc,
        activePage: viewPage,
        zoom: prefs.zoom,
        selIds,
        selBoxes,
        multiBounds,
        sel,
        preview,
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
            onImageError: () => setToast({ ok: false, message: t('inspector.imageTooLarge') }),
            doc,
            sel,
            selCount: selEntries.length,
            activePage,
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
    preview && hasPreviewState
      ? h(
          'div',
          { className: 'dpd-stateBar' },
          ['normal', ...PAGE_STATE_KEYS].map((key) => {
            const available = key === 'normal' || !!previewStateIds[key];
            return h(
              'button',
              {
                key,
                type: 'button',
                className: previewStateKey === key ? 'active' : '',
                disabled: !available,
                title: available ? t('state.' + key) : t('preview.noState'),
                onClick: () => showState(key),
              },
              t('state.' + key),
            );
          }),
        )
      : null,
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
          viewport,
          items: menuItems,
          onClose: () => setCtxMenu(null),
        })
      : null,
    toast
      ? h(
          'div',
          { className: 'dpd-toast' + (toast.ok === false ? ' err' : ''), role: 'status' },
          toast.message,
        )
      : null,
  );
}

export { ProductDesignPanel };
