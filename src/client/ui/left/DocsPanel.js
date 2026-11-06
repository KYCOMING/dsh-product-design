/** Design-document library panel (own rename state; extracted from LeftView). */
import {
  IconCopy,
  IconDesign,
  IconDownload,
  IconPencil,
  IconPlus,
  IconTrash,
} from '../../icons.js';
import { h, useEffect, useState } from '../../react.js';
import { docTime } from './labels.js';

export function DocsPanel(props) {
  const {
    t,
    docs,
    docsReady,
    docsError,
    activeDocId,
    onOpenDoc,
    onCreateDoc,
    onDuplicateDoc,
    onRenameDoc,
    onDeleteDoc,
    onExportDoc,
    onRefreshDocs,
  } = props;
  const [renamingDoc, setRenamingDoc] = useState(null);
  const [docNameValue, setDocNameValue] = useState('');

  useEffect(() => {
    if (onRefreshDocs) onRefreshDocs();
  }, [onRefreshDocs]);

  const commitDocRename = (item) => {
    const value = docNameValue.trim();
    setRenamingDoc(null);
    if (value && value !== (item.name || '')) onRenameDoc(item.id, value);
  };

  const docAction = (icon, title, onClick) =>
    h(
      'button',
      {
        className: 'dpd-mini',
        type: 'button',
        title,
        'aria-label': title,
        onClick: (e) => {
          e.stopPropagation();
          onClick();
        },
      },
      h(icon, { size: 12 }),
    );

  const docsBody = h(
    'div',
    { className: 'dpd-sectionBody' },
    h(
      'div',
      { className: 'dpd-panelTitle' },
      h('span', null, t('docs.title')),
      h(
        'span',
        { style: { textTransform: 'none', letterSpacing: 0 } },
        String((docs || []).length),
      ),
    ),
    h(
      'div',
      { className: 'dpd-docBar' },
      h(
        'button',
        { className: 'dpd-btn', type: 'button', onClick: onCreateDoc },
        h(IconPlus),
        t('docs.add'),
      ),
    ),
    docsError ? h('div', { className: 'dpd-hint' }, docsError) : null,
    !docsReady && !docsError ? h('div', { className: 'dpd-hint' }, t('docs.offline')) : null,
    h(
      'div',
      { className: 'dpd-docs' },
      (docs || []).length === 0
        ? h('div', { className: 'dpd-empty' }, t('docs.empty'))
        : (docs || []).map((item) => {
            const active = item.id === activeDocId;
            const name = item.name || t('docs.untitled');
            return h(
              'div',
              {
                key: item.id,
                className: 'dpd-docRow' + (active ? ' active' : ''),
                onClick: () => onOpenDoc(item.id),
              },
              h('span', { className: 'dot' }, h(IconDesign, { size: 13 })),
              h(
                'div',
                { className: 'dpd-docMain' },
                renamingDoc === item.id
                  ? h('input', {
                      className: 'nmInput',
                      value: docNameValue,
                      autoFocus: true,
                      onClick: (e) => e.stopPropagation(),
                      onChange: (e) => setDocNameValue(e.target.value),
                      onBlur: () => commitDocRename(item),
                      onKeyDown: (e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') commitDocRename(item);
                        else if (e.key === 'Escape') setRenamingDoc(null);
                      },
                    })
                  : h(
                      'span',
                      {
                        className: 'nm',
                        title: t('docs.rename'),
                        onDoubleClick: (e) => {
                          e.stopPropagation();
                          setRenamingDoc(item.id);
                          setDocNameValue(item.name || '');
                        },
                      },
                      name,
                    ),
                h(
                  'span',
                  { className: 'meta' },
                  `${item.pages} ${t('docs.pages')}` +
                    (item.updatedAt ? ` · ${docTime(item.updatedAt)}` : ''),
                ),
              ),
              h(
                'div',
                { className: 'dpd-docActions' },
                docAction(IconPencil, t('docs.rename'), () => {
                  setRenamingDoc(item.id);
                  setDocNameValue(item.name || '');
                }),
                docAction(IconCopy, t('docs.duplicate'), () => onDuplicateDoc(item.id)),
                docAction(IconDownload, t('docs.export'), () => onExportDoc(item.id)),
                docAction(IconTrash, t('docs.delete'), () => onDeleteDoc(item.id)),
              ),
            );
          }),
    ),
  );
  return docsBody;
}
