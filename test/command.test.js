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

  it('为 /design 命令菜单行补充图标与中文本地化标题，且不影响其他行', async () => {
    const commandUi = {
      register: () => () => {},
      decorate: () => () => {},
      candidates: async () => [
        { name: 'goal', description: 'g' },
        { name: 'design', description: 'd' },
      ],
    };
    loadPlugin({ commandUi });
    const rows = await commandUi.candidates({}, {});
    const design = rows.find((r) => r.name === 'design');
    const goal = rows.find((r) => r.name === 'goal');
    expect(design.label).toBe('设计');
    expect(design.description).toBe('提交产品设计需求，让 AI 在画布上生成或修改设计');
    expect(typeof design.icon).toBe('function');
    expect(goal.label).toBeUndefined();
    expect(goal.icon).toBeUndefined();
  });
});
