/**
 * Context-menu model. Kept separate from both the menu component and the
 * editor state so the command list can be reused (e.g. a command palette).
 */

export function buildMenuItems({ t, selIds, selEntries, hasClipboard, ctxEl, actions }) {
  const hasSelection = selIds.length > 0;
  return [
    { label: t('ctx.copy'), key: '⌘C', onClick: actions.copySelection, disabled: !hasSelection },
    { label: t('ctx.cut'), key: '⌘X', onClick: actions.cutSelection, disabled: !hasSelection },
    {
      label: t('ctx.paste'),
      key: '⌘V',
      onClick: actions.pasteClipboard,
      disabled: !hasClipboard,
    },
    { sep: true },
    {
      label: t('ctx.duplicate'),
      key: '⌘D',
      onClick: actions.duplicateSelection,
      disabled: !hasSelection,
    },
    { sep: true },
    {
      label: t('ctx.front'),
      onClick: () => actions.reorderSelection('front'),
      disabled: !hasSelection,
    },
    {
      label: t('ctx.forward'),
      key: '⌘]',
      onClick: () => actions.reorderSelection('forward'),
      disabled: !hasSelection,
    },
    {
      label: t('ctx.backward'),
      key: '⌘[',
      onClick: () => actions.reorderSelection('backward'),
      disabled: !hasSelection,
    },
    {
      label: t('ctx.back'),
      onClick: () => actions.reorderSelection('back'),
      disabled: !hasSelection,
    },
    { sep: true },
    {
      label: t('ctx.group'),
      key: '⌘G',
      onClick: actions.groupSelection,
      disabled: selEntries.length < 2,
    },
    ...(ctxEl && ctxEl.type === 'group'
      ? [{ label: t('ctx.ungroup'), key: '⇧⌘G', onClick: actions.ungroupSelection }]
      : []),
    ...(ctxEl
      ? [
          {
            label: ctxEl.hidden ? t('ctx.show') : t('ctx.hide'),
            onClick: () => actions.applyAttrs({ hidden: !ctxEl.hidden }),
          },
          {
            label: ctxEl.locked ? t('ctx.unlock') : t('ctx.lock'),
            onClick: () => actions.applyAttrs({ locked: !ctxEl.locked }),
          },
        ]
      : []),
    { sep: true },
    {
      label: t('ctx.delete'),
      key: '⌫',
      onClick: actions.deleteSelection,
      danger: true,
      disabled: !hasSelection,
    },
  ];
}
