/**
 * Slash-menu face for the plugin's host `/design` command.
 *
 * The harness `/` menu renders `candidate.icon`, `candidate.label` and
 * `candidate.description`. For *host* commands the client only supplies that
 * face to built-in commands (by `definitionId`, see the client `HOST_FACES`):
 * a third-party host command keeps its raw name (`design`) and its own
 * (unlocalized) description, and gets no icon.
 *
 * A client-side `commandUi` contribution could carry a label and icon, but it
 * cannot take the `/design` name (that collides with the host command) and it
 * cannot accept the free-form `<需求>` argument. So `/design` stays a host
 * command and this shim wraps the command menu source's `candidates()`,
 * attaching the same localized label / description / glyph the built-ins get.
 * The registered command name stays `design`, so it shows as the alias next to
 * the localized label (e.g. “设计 design”), exactly like 压缩 compact.
 *
 * Presentation-only; degrades silently when `commandUi` is absent or has no
 * `candidates()` to wrap.
 */

import { activeLocale, pickDict } from '../i18n.js';
import { IconDesign } from '../icons.js';

function resolveCommandUi(ctx, scope) {
  if (scope?.commandUi) return scope.commandUi;
  try {
    return ctx.get('commandUi');
  } catch {
    return null;
  }
}

/** Localized face for the `design` row (re-read on every render for locale changes). */
function designFace() {
  return {
    label: pickDict(activeLocale(), 'command.design.label'),
    description: pickDict(activeLocale(), 'command.design.desc'),
    icon: IconDesign,
  };
}

/** Attach the localized label, description and glyph to the host `/design` row. */
export function augmentDesignCommandFace(ctx) {
  const install = (scope) => {
    const commandUi = resolveCommandUi(ctx, scope);
    if (!commandUi || commandUi.__dshProductDesignFace === true) return;
    const original = commandUi.candidates;
    if (typeof original !== 'function') return;

    try {
      commandUi.candidates = function candidates(...args) {
        const result = original.apply(this, args);
        if (!result || typeof result.then !== 'function') return result;
        return result.then((rows) => {
          if (!Array.isArray(rows)) return rows;
          let changed = false;
          const next = rows.map((row) => {
            if (row && row.name === 'design') {
              changed = true;
              return { ...row, ...designFace() };
            }
            return row;
          });
          return changed ? next : rows;
        });
      };
      Object.defineProperty(commandUi, '__dshProductDesignFace', {
        value: true,
        configurable: true,
      });
    } catch {
      // A frozen/read-only service: leave the menu row as the raw host command.
      return;
    }

    const restore = () => {
      try {
        if (commandUi.candidates !== original) commandUi.candidates = original;
        delete commandUi.__dshProductDesignFace;
      } catch {
        /* ignore */
      }
    };
    if (scope && typeof scope.effect === 'function') {
      scope.effect(() => restore, 'dsh-product-design: /design menu face');
    }
  };

  if (typeof ctx.inject === 'function') ctx.inject(['commandUi'], install);
  else install(ctx);
}
