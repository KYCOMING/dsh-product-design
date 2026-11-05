import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';

const here = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_PATH = path.resolve(here, '../../client.js');

/**
 * Load the browser half of the plugin the same way the DSH client loader does:
 * evaluate `client.js` (which calls `window.__ModuleLoader__.load`), build the
 * module through its factory, then `apply()` it against a minimal fake client
 * context so the registered slot components can be rendered in a test.
 *
 * @param {{ commandUi?: object|null, layout?: object, uiSession?: object }} [options]
 *   - `commandUi`: fake service; pass `null` to simulate the service being absent.
 *   - `layout`: fake layout service (defaults to one that records selectPanel calls).
 *   - `uiSession`: fake session service for active-session tests.
 */
export function loadPlugin(options = {}) {
  let definition = null;
  globalThis.window.__ModuleLoader__ = {
    load(def) {
      definition = def;
    },
  };

  const code = fs.readFileSync(CLIENT_PATH, 'utf8');
  vm.runInThisContext(code, { filename: CLIENT_PATH });

  if (!definition) throw new Error('client.js did not call window.__ModuleLoader__.load');

  const api = definition.factory((name) => {
    if (name === 'react') return React;
    throw new Error(`unexpected require("${name}") in client bundle`);
  });

  const layoutCalls = [];
  const layout = options.layout ?? {
    selectPanel(panelId) {
      layoutCalls.push(panelId);
    },
    panelInfo: {
      getSnapshot: () => ({ activePanelId: null }),
      subscribe: () => () => {},
    },
  };

  const contributions = [];
  const hasCommandUi = options.commandUi !== null;
  const commandUi = options.commandUi ?? {
    register(contribution) {
      contributions.push(contribution);
      return () => {};
    },
    decorate: () => () => {},
  };

  const services = { layout };
  if (hasCommandUi) services.commandUi = commandUi;
  if (options.uiSession) services.uiSession = options.uiSession;

  const get = (name) => services[name] ?? null;
  const effect = (fn) => (fn ? fn() : () => {});

  const registered = [];
  let currentSlot = null;
  const slots = {
    inject(name, cb) {
      currentSlot = name;
      try {
        return cb();
      } finally {
        currentSlot = null;
      }
    },
    register(config, component) {
      registered.push({ slot: currentSlot, config, component });
      return () => {};
    },
  };

  const ctx = {
    get,
    effect,
    slots,
    inject(deps, cb) {
      if (!deps.every((d) => services[d] !== undefined)) return () => {};
      const scope = { get, effect, slots, ...services };
      const result = cb(scope);
      return typeof result === 'function' ? result : () => {};
    },
  };

  api.apply(ctx);

  const panel = registered.find((r) => r.slot === 'main')?.component;
  const icon = registered.find((r) => r.slot === 'sidebar.panellist')?.component;

  return { api, registered, panel, icon, commands: contributions, layout, layoutCalls };
}
