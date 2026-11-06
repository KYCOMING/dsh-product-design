/** Hold Space to enter pan mode; released on keyup / window blur. */
import { useEffect, useState } from '../react.js';
import { isEditableTarget } from './gestureUtils.js';

export function useSpacePan(spaceRef) {
  const [spaceDown, setSpaceDown] = useState(false);
  useEffect(() => {
    const down = (e) => {
      if (e.code !== 'Space' || isEditableTarget(e.target)) return;
      e.preventDefault();
      if (!spaceRef.current) {
        spaceRef.current = true;
        setSpaceDown(true);
      }
    };
    const up = (e) => {
      if (e.code === 'Space') {
        spaceRef.current = false;
        setSpaceDown(false);
      }
    };
    const blur = () => {
      spaceRef.current = false;
      setSpaceDown(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [spaceRef]);
  return spaceDown;
}
