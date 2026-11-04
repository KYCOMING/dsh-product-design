import { describe, expect, it } from 'vitest';
import { loadPlugin } from './helpers/load-plugin.js';

describe('/canvas 命令', () => {
  it('注册一个 canvas 客户端动作命令', () => {
    const { commands } = loadPlugin();
    const canvas = commands.find((c) => c.name === 'canvas');
    expect(canvas).toBeTruthy();
    expect(canvas.ui.kind).toBe('action');
    expect(typeof canvas.ui.run).toBe('function');
    expect(canvas.available({})).toBe(true);
    // 无 locale 注入时回退到中文
    expect(canvas.label()).toBe('产品设计画布');
    expect(canvas.description()).toContain('产品设计画布');
  });

  it('执行命令会选中 dsh-product-design 面板', () => {
    const { commands, layoutCalls } = loadPlugin();
    const canvas = commands.find((c) => c.name === 'canvas');
    canvas.ui.run({});
    expect(layoutCalls).toEqual(['dsh-product-design']);
  });

  it('commandUi 服务缺失时不报错、不注册命令', () => {
    const { commands, panel } = loadPlugin({ commandUi: null });
    expect(commands.length).toBe(0);
    // 面板注册不受影响
    expect(panel).toBeTruthy();
  });
});
