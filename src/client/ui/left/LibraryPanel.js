/** Component library panel (extracted from LeftView). */
import { defaultState, LIB_ORDER } from '../../constants.js';
import { h } from '../../react.js';
import { renderWidget } from '../../widgets.js';

export function LibraryPanel(props) {
  const { t, addElement } = props;
  const componentsBody = h(
    'div',
    { className: 'dpd-sectionBody' },
    h('div', { className: 'dpd-panelTitle' }, h('span', null, t('library.title'))),
    h('div', { className: 'dpd-hint' }, t('library.hint')),
    h(
      'div',
      { className: 'dpd-libScroll' },
      h(
        'div',
        { className: 'dpd-libGrid' },
        LIB_ORDER.map((type) => {
          const sample = {
            id: 'lib-' + type,
            type,
            x: 0,
            y: 0,
            w: 120,
            h: 32,
            state: defaultState(type),
            props: {},
          };
          return h(
            'button',
            {
              key: type,
              type: 'button',
              className: 'dpd-libItem',
              onClick: () => addElement(type),
              title: t('comp.' + type),
            },
            h(
              'div',
              { className: 'dpd-libThumb' },
              h(
                'div',
                {
                  style: {
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 96,
                    height: 30,
                    transform: 'translate(-50%,-50%) scale(.62)',
                    transformOrigin: 'center',
                    pointerEvents: 'none',
                  },
                },
                renderWidget(sample, defaultState(type), t, {}),
              ),
            ),
            h('span', { className: 'dpd-libName' }, t('comp.' + type)),
          );
        }),
      ),
    ),
  );

  return componentsBody;
}
