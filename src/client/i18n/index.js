import { useCallback, useEffect, useState } from 'react';
import { NS } from '../constants.js';
import { en } from './en.js';
import { zh } from './zh.js';

let APP_CTX = null;

/** Bind the client context so i18n can reach the locale service. */
export function setAppCtx(ctx) {
  APP_CTX = ctx;
}

const DICT = { zh, en };

function isZh(active) {
  return (
    String(active || '')
      .toLowerCase()
      .indexOf('zh') === 0
  );
}
function pickDict(active, key) {
  const dict = isZh(active) ? DICT.zh : DICT.en;
  if (dict[key] != null) return dict[key];
  if (DICT.en[key] != null) return DICT.en[key];
  return key;
}
function activeLocale() {
  try {
    const loc = APP_CTX && APP_CTX.get('locale');
    return loc ? loc.getLocale().active : 'zh';
  } catch {
    return 'zh';
  }
}
function useT() {
  const read = () => activeLocale();
  const [active, setActive] = useState(read);
  useEffect(() => {
    let loc = null;
    try {
      loc = APP_CTX && APP_CTX.get('locale');
    } catch {
      loc = null;
    }
    if (!loc || typeof loc.subscribe !== 'function') return undefined;
    setActive(loc.getLocale().active);
    return loc.subscribe(() => setActive(loc.getLocale().active));
  }, []);
  let bound = null;
  try {
    const loc = APP_CTX && APP_CTX.get('locale');
    if (loc) bound = loc.bind(NS);
  } catch {
    bound = null;
  }
  return useCallback(
    (key) => {
      if (bound) {
        try {
          const out = bound(key);
          if (out && out !== key) return out;
        } catch {
          /* fall through */
        }
      }
      return pickDict(active, key);
    },
    [active, bound],
  );
}

export { activeLocale, DICT, pickDict, useT };
