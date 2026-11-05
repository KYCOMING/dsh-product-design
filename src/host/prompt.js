/**
 * Model-facing guidance: tells the agent that the canvas exists and how to use
 * its tools.
 */

/** Model-facing guidance so the agent knows the canvas and its tools exist. */
const GUIDANCE = [
  '本机已安装 dsh-product-design 插件：一个「简化版 Figma」产品设计画布，宿主权威。',
  '打开方式：侧边栏「产品设计」图标；或直接用 /design <需求> 让 AI 绘制。',
  '每个会话拥有独立设计稿；你可以直接用工具读写当前会话的画布，不需要用户先打开面板：',
  '  product_design_get_document：读取页面/元素/状态。',
  '  product_design_apply：按操作增删改（add_page / duplicate_page / set_active_page / set_page_frame / set_page_states / add_container / add_element / update_element / delete_element / move_element / reorder_element / group_elements / ungroup_elements / clear_page / set_document_name）。',
  '画布坐标原点在每页左上角；默认手机页 390×844。元素类型：container, button, input, card, navbar, tabs, toggle, checkbox, avatar, text, image, badge, select。',
  '容器（container）可以嵌套子元素：add_element/add_container 传 containerId 即可放入容器，子元素坐标相对容器左上角；容器支持裁剪内容。move_element 可把元素移到另一个容器。',
  'props 常用键：text、color、fontSize、fontWeight、radius；容器还可传 name、background、clipContent。元素还支持 name（图层名）、hidden、locked、opacity、interactions。',
  'interactions 是原型连线：[{ action: "navigate"|"back"|"openOverlay", targetPageId }]。给按钮加 navigate 就能在预览里走通流程。',
  'constraints 决定画板/容器尺寸变化时元素怎么变：{ h: "left"|"right"|"leftRight"|"center"|"scale", v: "top"|"bottom"|"topBottom"|"center"|"scale" }。默认 left/top；navbar、tabs、card、image、input、container、group 默认左右拉伸。',
  '容器与编组可以开启 Auto Layout：layout { mode: "stack", direction: "row"|"column", gap, padding, align: "start"|"center"|"end"|"stretch", justify: "start"|"center"|"end"|"between" }。开启后子元素的 x/y 由布局接管，顺序即数组顺序。',
  'set_page_frame 默认 resizeMode:"constraints"（按约束重排）；也支持 "scale"（整体缩放）与 "none"（保持不变）。',
  '页面级状态用 set_page_states 写文案：states.loading.text、states.empty.title/desc/action、states.error.title/desc/action。',
  '状态见各类型（如 button: default/hover/active/disabled）。不传 pageId 时默认作用于当前活动页；add_page / duplicate_page 会把新页设为活动页，所以「先 add_page 再 add_element」会自然落在新页。也可用 pageId:"@last" / pageIndex（0基）显式指定。',
  '当用户提出产品设计/原型需求时：先 get_document，再用一次 apply 批量搭好页面与元素；结果会自动出现在对话内的产品预览卡片里，用户也可点侧边栏「产品设计」查看完整画布。',
].join('\n');

function registerPrompt(ctx) {
  if (typeof ctx.inject !== 'function') return;
  ctx.inject(['systemPrompt', 'tools'], (scope) => {
    const prompt = (scope && scope.systemPrompt) || ctx.get('systemPrompt');
    if (!prompt || typeof prompt.section !== 'function') return;
    scope.effect(
      () => prompt.section({ name: 'plugin:dsh-product-design', order: 160, text: GUIDANCE }),
      'dsh-product-design: prompt section',
    );
  });
}

export { registerPrompt };
