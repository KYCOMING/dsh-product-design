/** Transient toast state with a 3.2s auto-dismiss. */
import { useEffect, useState } from '../react.js';

export function useToast() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);
  return { toast, setToast };
}
