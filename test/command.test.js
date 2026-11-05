import { describe, expect, it } from 'vitest';
import { loadPlugin } from './helpers/load-plugin.js';

describe('命令入口', () => {
  it('不再注册 /canvas 命令，避免手动跳转', () => {
    const { commands, panel } = loadPlugin();
    expect(commands.find((c) => c.name === 'canvas')).toBeUndefined();
    expect(commands).toHaveLength(0);
    expect(panel).toBeTruthy();
  });

  it('commandUi 服务缺失时不影响面板注册', () => {
    const { commands, panel } = loadPlugin({ commandUi: null });
    expect(commands).toHaveLength(0);
    expect(panel).toBeTruthy();
  });
});
