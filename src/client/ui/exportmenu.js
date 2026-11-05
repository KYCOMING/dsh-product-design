import { h, useEffect, useRef, useState } from '../react.js';

/** Toolbar dropdown for the three export formats. */
export function ExportMenu(props) {
  const { t, onPng, onHtml, onReact } = props;
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  const run = (fn) => () => {
    setOpen(false);
    Promise.resolve(fn()).catch(() => {
      /* export failures are non-fatal */
    });
  };

  return h(
    'div',
    { className: 'dpd-exportMenu', ref },
    h(
      'button',
      {
        className: 'dpd-btn' + (open ? ' primary' : ''),
        type: 'button',
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        onClick: () => setOpen((value) => !value),
      },
      t('toolbar.export'),
    ),
    open
      ? h(
          'div',
          { className: 'dpd-exportPop', role: 'menu' },
          h('button', { type: 'button', onClick: run(() => onPng(1)) }, t('export.png1x')),
          h('button', { type: 'button', onClick: run(() => onPng(2)) }, t('export.png2x')),
          h('div', { className: 'dpd-ctxsep' }),
          h('button', { type: 'button', onClick: run(onHtml) }, t('export.html')),
          h('button', { type: 'button', onClick: run(onReact) }, t('export.react')),
        )
      : null,
  );
}
