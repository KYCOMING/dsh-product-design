/** Viewport size held in state so ui/ never reads window directly. */
import { useEffect, useState } from '../react.js';

function readViewport() {
  if (typeof window === 'undefined') return { w: 1200, h: 900 };
  return { w: window.innerWidth, h: window.innerHeight };
}

export function useViewport() {
  const [viewport, setViewport] = useState(readViewport);
  useEffect(() => {
    const onResize = () => setViewport(readViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return viewport;
}
