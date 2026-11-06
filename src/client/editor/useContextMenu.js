/** Context-menu open state + outside-press dismissal. */
import { useEffect, useState } from '../react.js';

export function useContextMenu(selIds, setSelIds) {
  const [ctxMenu, setCtxMenu] = useState(null);
  useEffect(() => {
    if (!ctxMenu) return undefined;
    const close = () => setCtxMenu(null);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [ctxMenu]);

  function openContextMenu(event, element) {
    if (element) {
      if (!selIds.includes(element.id)) setSelIds([element.id]);
    } else {
      setSelIds([]);
    }
    setCtxMenu({ x: event.clientX, y: event.clientY });
  }

  return { ctxMenu, setCtxMenu, openContextMenu };
}
