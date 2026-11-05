/**
 * Host half of dsh-product-design — the authoritative document service.
 *
 * The browser canvas is a view: this half owns the design document, persists it
 * under the DSH home, serves it over same-origin HTTP routes (doc + SSE change
 * stream), and exposes agent tools so the model can read and edit the canvas.
 *
 * Each conversation owns one document under
 * `storages/dsh-product-design/sessions/<sessionId>/doc.json`. A request
 * without a session id falls back to the `default` session.
 *
 * Modules:
 *   paths.js    filesystem layout
 *   store.js    per-session document + revision + subscribers
 *   http.js     same-origin API routes
 *   tools.js    agent tools
 *   prompt.js   model guidance
 *   command.js  /design command
 *   model.js    pure operation reducer
 */

import { registerDesignCommand } from './command.js';
import { API_PREFIX, makeHandler } from './http.js';
import { registerPrompt } from './prompt.js';
import { createStores } from './store.js';
import { applyTool, getDocumentTool } from './tools.js';

export const inject = ['webServer'];

function registerTools(ctx, stores) {
  const install = (scope) => {
    const tools = (scope && scope.tools) || ctx.get('tools');
    if (!tools || typeof tools.register !== 'function') return;
    scope.effect(() => {
      const disposers = [
        tools.register(getDocumentTool(stores)),
        tools.register(applyTool(stores)),
      ];
      return () => {
        for (const dispose of disposers) {
          try {
            dispose();
          } catch {
            /* ignore */
          }
        }
      };
    }, 'dsh-product-design: agent tools');
  };
  if (typeof ctx.inject === 'function') {
    ctx.inject(['tools'], install);
  } else {
    install(ctx);
  }
}

export function apply(ctx) {
  const stores = createStores();

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: API_PREFIX,
        handler: makeHandler(ctx, stores),
      }),
    'dsh-product-design: host api',
  );

  registerTools(ctx, stores);
  registerDesignCommand(ctx);
  registerPrompt(ctx);
}
