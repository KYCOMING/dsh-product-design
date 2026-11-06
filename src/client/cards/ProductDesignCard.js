/** The Visualize-style product card and its turn-tail list. */
import { useT } from '../i18n.js';
import { h } from '../react.js';
import { cardsBefore } from './meta.js';
import { openCanvas } from './openCanvas.js';
import { ProductPagePreview } from './preview.js';

/** One Visualize-style product card. */
export function ProductDesignCard(props) {
  const t = useT();
  const meta = props.meta;
  const page = meta.page || {};
  const frame = page.frame || { w: 390, h: 844 };
  const count = meta.pageCount || 1;
  const index = meta.pageIndex != null ? meta.pageIndex + 1 : 1;
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 14,
        borderRadius: 14,
        border: '1px solid var(--dsw-alias-border-l1,#e5e6eb)',
        background: 'var(--dsw-alias-bg-base,#ffffff)',
        color: 'var(--dsw-alias-label-primary,#111827)',
        boxShadow: '0 1px 3px rgba(17,24,39,.05)',
        maxWidth: '100%',
        boxSizing: 'border-box',
      },
    },
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        },
      },
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } },
        h(
          'div',
          {
            style: {
              fontSize: 13,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          },
          meta.title || page.name || t('app.title'),
        ),
        h(
          'div',
          { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary,#6b7280)' } },
          `${frame.w}×${frame.h}${count > 1 ? ` · ${index}/${count}` : ''}`,
        ),
      ),
      h(
        'button',
        {
          type: 'button',
          onClick: openCanvas,
          style: {
            border: '1px solid var(--dsw-alias-border-l2,#d6d9e2)',
            background: 'var(--dsw-alias-bg-layer-1,#fafafa)',
            color: 'inherit',
            borderRadius: 7,
            padding: '5px 10px',
            fontSize: 12,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          },
        },
        t('visualize.openCanvas'),
      ),
    ),
    h(
      'div',
      { style: { display: 'flex', justifyContent: 'center', maxWidth: '100%', overflow: 'auto' } },
      h(ProductPagePreview, { page, maxWidth: 520, maxHeight: 520 }),
    ),
  );
}

/** Turn-tail list of product cards. */
export function ProductDesignCards(props) {
  const cards = cardsBefore(props.turn, props.seq);
  if (!cards.length) return null;
  return h(
    'div',
    {
      style: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr)',
        gap: 12,
        margin: '8px 0 4px',
      },
    },
    cards.map((card) => h(ProductDesignCard, { key: card.callId, meta: card.meta })),
  );
}
