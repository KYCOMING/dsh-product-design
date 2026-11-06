/** Ctrl/⌘ + wheel over the canvas zooms (clamped 0.2–2). Extracted from panel.js. */
import { useEffect } from '../react.js';

export function useCanvasZoom(canvasRef, setZoom) {
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return undefined;
    const onWheel = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      setZoom((value) =>
        Math.max(0.2, Math.min(2, Math.round((value + direction * 0.1) * 10) / 10)),
      );
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [canvasRef, setZoom]);
}
