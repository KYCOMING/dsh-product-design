/**
 * Persisted editor preferences: zoom, snapping, resize policy and panel sizes.
 */

import { loadUi, saveUi } from '../model.js';
import { useEffect, useRef, useState } from '../react.js';

export function useUiPrefs() {
  const [zoom, setZoom] = useState(1);
  const [snapEnabled, setSnapEnabled] = useState(() => loadUi().snapEnabled !== false);
  const [resizeMode, setResizeMode] = useState(() => {
    const mode = loadUi().resizeMode;
    return mode === 'scale' || mode === 'none' ? mode : 'constraints';
  });
  const [leftWidth, setLeftWidth] = useState(() => {
    const width = Number(loadUi().leftWidth);
    return width >= 168 && width <= 460 ? width : 264;
  });
  const [rightWidth, setRightWidth] = useState(() => {
    const width = Number(loadUi().rightWidth);
    return width >= 200 && width <= 520 ? width : 242;
  });
  const [rightCollapsed, setRightCollapsed] = useState(() => loadUi().rightCollapsed === true);
  const [section, setSection] = useState(() => {
    const value = loadUi().section;
    return value === null || value === 'pages' || value === 'components' || value === 'layers'
      ? value
      : 'pages';
  });

  const snapRef = useRef(snapEnabled);
  snapRef.current = snapEnabled;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    saveUi({
      leftWidth,
      rightWidth,
      rightCollapsed,
      section,
      snapEnabled,
      resizeMode,
    });
  }, [leftWidth, rightWidth, rightCollapsed, section, snapEnabled, resizeMode]);

  return {
    zoom,
    setZoom,
    zoomRef,
    snapEnabled,
    setSnapEnabled,
    snapRef,
    resizeMode,
    setResizeMode,
    leftWidth,
    setLeftWidth,
    rightWidth,
    setRightWidth,
    rightCollapsed,
    setRightCollapsed,
    section,
    setSection,
  };
}
