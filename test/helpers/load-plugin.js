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
 */
export function loadPlugin() {
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

  const registered = [];
  let currentSlot = null;
  const ctx = {
    get() {
      return null;
    },
    effect(fn) {
      return fn ? fn() : () => {};
    },
    slots: {
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
    },
  };

  api.apply(ctx);

  const panel = registered.find((r) => r.slot === 'main')?.component;
  const icon = registered.find((r) => r.slot === 'sidebar.panellist')?.component;

  return { api, registered, panel, icon };
}
