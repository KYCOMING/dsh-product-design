/**
 * Blank-Session entry point.
 *
 * A Session without messages hides the whole View tab row, so the
 * `conversation.view` seat is not available yet. The hero options row is
 * rendered in exactly that state, so a compact button there is the one entry
 * that works before the first message.
 */

import { useT } from '../i18n.js';
import { IconDesign } from '../icons.js';
import { h } from '../react.js';

export function HeroDesignEntry(props) {
  const t = useT();
  return h(
    'button',
    {
      type: 'button',
      title: t('hero.open'),
      'aria-label': t('hero.open'),
      onClick: props.open,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 28,
        padding: '0 10px',
        borderRadius: 999,
        border: '1px solid var(--dsw-alias-border-l1, #e5e6eb)',
        background: 'var(--dsw-alias-bg-base, #ffffff)',
        color: 'var(--dsw-alias-label-secondary, #4b5563)',
        font: 'inherit',
        fontSize: 12,
        lineHeight: 1,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      },
    },
    h(IconDesign, { size: 14 }),
    t('hero.open'),
  );
}
