/**
 * `/design <需求>` — submit a normal user turn that makes the model draw.
 */

/** A plain user message accepted by Agent.followup(); avoids importing the LLM package. */
function newUserMessage(text) {
  const id =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  };
}

/** `/design <需求>` — submit a normal user turn that makes the model draw in the canvas. */
function registerDesignCommand(ctx) {
  const install = (scope) => {
    const commands = (scope && scope.commands) || ctx.get('commands');
    if (!commands || typeof commands.register !== 'function') return;
    const register = () =>
      commands.register({
        name: 'design',
        description: '提交产品设计需求，让 AI 在画布上生成或修改设计',
        input: { hint: '<需求>' },
        recordInput: false,
        handler: ({ agent, rawInput }) => {
          const text = String(rawInput || '').trim();
          if (!text) return { kind: 'error', text: '用法：/design <你的产品设计需求>' };
          if (!agent || typeof agent.followup !== 'function') {
            return { kind: 'error', text: '当前会话不支持直接提交需求。' };
          }
          agent.followup(newUserMessage(text));
          return {
            kind: 'success',
            text: '已提交设计需求，AI 会在产品设计画布上开始绘制。',
          };
        },
      });
    if (typeof scope.effect === 'function') {
      scope.effect(register, 'dsh-product-design: /design command');
    } else {
      register();
    }
  };
  if (typeof ctx.inject === 'function') ctx.inject(['commands'], install);
  else install(ctx);
}

export { registerDesignCommand };
