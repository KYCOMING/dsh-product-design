/** Draggable side-panel resizers. Extracted from panel.js. */
import { useCallback } from '../react.js';

function dragWidth(startX, startWidth, event, min, max, sign) {
  return Math.max(min, Math.min(max, Math.round(startWidth + sign * (event.clientX - startX))));
}

export function usePanelResize(prefs) {
  const startResizeLeft = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startWidth = prefs.leftWidth;
      const move = (moveEvent) => {
        prefs.setLeftWidth(dragWidth(startX, startWidth, moveEvent, 168, 460, 1));
      };
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    },
    [prefs],
  );

  const startResizeRight = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (prefs.rightCollapsed) return;
      const startX = event.clientX;
      const startWidth = prefs.rightWidth;
      const move = (moveEvent) => {
        prefs.setRightWidth(dragWidth(startX, startWidth, moveEvent, 200, 520, -1));
      };
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    },
    [prefs],
  );

  return { startResizeLeft, startResizeRight };
}
