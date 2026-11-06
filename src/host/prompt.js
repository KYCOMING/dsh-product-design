/**
 * Model-facing guidance: tells the agent that the canvas exists and how to use
 * its tools.
 */

import { OP_KINDS } from '../shared/ops-manifest.js';

/** Model-facing guidance so the agent knows the canvas and its tools exist. */
const GUIDANCE = [
  '本机已安装 dsh-product-design 插件：一个「简化版 Figma」产品设计画布，宿主权威。',
  '打开方式：会话顶部「产品设计」标签；或直接用 /design <需求> 让 AI 绘制。',
  '每个会话绑定设计稿库中的一份设计稿；你可以直接用工具读写当前会话的画布，不需要用户先打开面板：',
  '  product_design_get_document：读取页面/元素/状态。',
  `  product_design_apply：按操作增删改（${OP_KINDS.join(' / ')}）。`,
  '画布坐标原点在每页左上角；默认手机页 390×844。元素类型：container, button, input, card, navbar, tabs, toggle, checkbox, avatar, text, image, badge, select。',
  '容器（container）可以嵌套子元素：add_element/add_container 传 containerId 即可放入容器，子元素坐标相对容器左上角；容器支持裁剪内容。move_element 可把元素移到另一个容器。',
  'props 常用键：text、color、fontSize、fontWeight、radius；图片（image）用 src（http(s) 或 data URL）+ fit（cover/contain/fill）；容器还可传 name、background、clipContent。元素还支持 name（图层名）、hidden、locked、opacity、interactions。',
  'interactions 是原型连线：[{ action: "navigate"|"back"|"openOverlay", targetPageId }]。给按钮加 navigate 就能在预览里走通流程。',
  'constraints 决定画板/容器尺寸变化时元素怎么变：{ h: "left"|"right"|"leftRight"|"center"|"scale", v: "top"|"bottom"|"topBottom"|"center"|"scale" }。默认 left/top；navbar、tabs、card、image、input、container、group 默认左右拉伸。',
  '容器与编组可以开启 Auto Layout：layout { mode: "stack", direction: "row"|"column", gap, padding, align: "start"|"center"|"end"|"stretch", justify: "start"|"center"|"end"|"between" }。开启后子元素的 x/y 由布局接管，顺序即数组顺序。',
  'set_page_frame 默认 resizeMode:"constraints"（按约束重排）；也支持 "scale"（整体缩放）与 "none"（保持不变）。',
  '页面状态（加载/空/错误）是真实的变体页面：用 add_page_state {pageId, key} 复制基础页生成，返回的 pageId 就是变体页，像普通页一样增删元素；delete_page_state 删除。基础页的 states 记录各状态对应的变体页 id。',
  '状态见各类型（如 button: default/hover/active/disabled）。不传 pageId 时默认作用于当前活动页；add_page / duplicate_page 会把新页设为活动页，所以「先 add_page 再 add_element」会自然落在新页。也可用 pageId:"@last" / pageIndex（0基）显式指定。',
  '做产品设计时，先根据用户的不同需求判断目标平台属于 Web、移动端 App 还是小程序，再参考对应平台的优秀设计与规范，而不是凭空臆造界面：Web 参考成熟 SaaS / 官网的信息架构、栅格与响应式布局；移动端参考 iOS Human Interface Guidelines 与 Material Design 的导航、控件与手势习惯；小程序参考微信小程序设计指南与轻量、即用即走的交互模式。',
  '可优先参考即时设计（js.design）资源广场等优秀开源设计社区，以及 Dribbble、Behance、Mobbin 等设计资源库中的开源设计稿与案例，借鉴其布局、组件、留白与视觉语言，再结合本次需求落到画布。画板尺寸随平台对齐：Web 用桌面尺寸，移动端默认 390×844，小程序贴近手机尺寸。',
  '当用户提出产品设计/原型需求时：先 get_document，再用一次 apply 批量搭好页面与元素；结果会自动出现在对话内的产品预览卡片里，用户也可点会话顶部「产品设计」标签查看完整画布。',
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
