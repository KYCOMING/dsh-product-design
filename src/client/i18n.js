import { useCallback, useEffect, useState } from 'react';
import { NS } from './constants.js';

let APP_CTX = null;

/** Bind the client context so i18n can reach the locale service. */
export function setAppCtx(ctx) {
  APP_CTX = ctx;
}

const DICT = {
  zh: {
    'entry.label': '产品设计',
    'app.title': '产品设计画布',
    'name.placeholder': '未命名设计',
    'toolbar.preview': '预览',
    'toolbar.edit': '编辑',
    'toolbar.reset': '重置',
    'toolbar.resetConfirm': '确定重置为示例设计？当前所有页面将被清空。',
    'toolbar.saved': '已自动保存',
    'toolbar.undo': '撤销 (⌘Z)',
    'toolbar.redo': '重做 (⇧⌘Z)',
    'toolbar.panHint': '空格 / 中键拖拽平移画布',
    'command.canvas.label': '产品设计画布',
    'command.canvas.desc': '打开产品设计画布，开始搭原型',
    'frame.title': '画布尺寸',
    'frame.mobile': '手机 390×844',
    'frame.tablet': '平板 768×1024',
    'frame.desktop': '桌面 1280×800',
    'state.normal': '正常',
    'state.loading': '加载中',
    'state.empty': '空状态',
    'state.error': '错误',
    'pages.title': '页面',
    'pages.add': '新增页',
    'pages.default': '页面',
    'pages.copySuffix': '副本',
    'pages.duplicate': '复制页面',
    'pages.delete': '删除页面',
    'pages.deleteConfirm': '确定删除这个页面？页面上的组件会一并删除。',
    'library.title': '组件库',
    'library.hint': '点击添加到当前页面',
    'inspector.title': '属性',
    'inspector.frame': '画布设置',
    'inspector.page': '页面',
    'inspector.pageName': '页面名称',
    'inspector.empty': '选中一个组件可编辑属性、切换状态；不选中时可设置当前页面。',
    'inspector.text': '文本',
    'inspector.color': '颜色',
    'inspector.position': '位置',
    'inspector.size': '尺寸',
    'inspector.radius': '圆角',
    'inspector.fontSize': '字号',
    'inspector.background': '背景',
    'inspector.state': '状态',
    'inspector.duplicate': '复制',
    'inspector.delete': '删除',
    'inspector.front': '置顶',
    'inspector.back': '置底',
    'layers.title': '图层',
    'comp.button': '按钮',
    'comp.input': '输入框',
    'comp.card': '卡片',
    'comp.navbar': '导航栏',
    'comp.tabs': '标签页',
    'comp.toggle': '开关',
    'comp.checkbox': '复选框',
    'comp.avatar': '头像',
    'comp.text': '文本',
    'comp.image': '图片',
    'comp.badge': '徽标',
    'comp.select': '下拉框',
    'sample.button': '按钮',
    'sample.placeholder': '请输入内容',
    'sample.filled': '已输入内容',
    'sample.card': '卡片标题',
    'sample.cardSub': '支持拖拽、缩放与状态切换',
    'sample.navbar': '页面标题',
    'sample.tabs': '推荐,关注,附近',
    'sample.checkbox': '记住我',
    'sample.text': '文本内容',
    'sample.select': '请选择',
    'sample.opt1': '选项一',
    'sample.opt2': '选项二',
    'sample.opt3': '选项三',
    'sample.welcome': '欢迎回来',
    'sample.welcomeSub': '今天想设计点什么？',
    'stateName.default': '默认',
    'stateName.hover': '悬停',
    'stateName.active': '按下',
    'stateName.disabled': '禁用',
    'stateName.focus': '聚焦',
    'stateName.filled': '已填写',
    'stateName.error': '错误',
    'stateName.open': '展开',
    'stateName.on': '开',
    'stateName.off': '关',
    'stateName.checked': '选中',
    'stateName.unchecked': '未选',
    'overlay.loading': '正在加载…',
    'overlay.emptyTitle': '这里还什么都没有',
    'overlay.emptyDesc': '添加第一个组件，开始搭建你的页面',
    'overlay.emptyBtn': '新建组件',
    'overlay.errorTitle': '出了点问题',
    'overlay.errorDesc': '请检查网络后重试',
    'overlay.errorBtn': '重试',
  },
  en: {
    'entry.label': 'Product Design',
    'app.title': 'Product Design Canvas',
    'name.placeholder': 'Untitled design',
    'toolbar.preview': 'Preview',
    'toolbar.edit': 'Edit',
    'toolbar.reset': 'Reset',
    'toolbar.resetConfirm': 'Reset to the sample design? All pages will be cleared.',
    'toolbar.saved': 'Auto-saved',
    'toolbar.undo': 'Undo (⌘Z)',
    'toolbar.redo': 'Redo (⇧⌘Z)',
    'toolbar.panHint': 'Hold Space / middle-drag to pan the canvas',
    'command.canvas.label': 'Product Design Canvas',
    'command.canvas.desc': 'Open the product design canvas to build a prototype',
    'frame.title': 'Frame size',
    'frame.mobile': 'Phone 390×844',
    'frame.tablet': 'Tablet 768×1024',
    'frame.desktop': 'Desktop 1280×800',
    'state.normal': 'Default',
    'state.loading': 'Loading',
    'state.empty': 'Empty',
    'state.error': 'Error',
    'pages.title': 'Pages',
    'pages.add': 'Add page',
    'pages.default': 'Page',
    'pages.copySuffix': 'copy',
    'pages.duplicate': 'Duplicate page',
    'pages.delete': 'Delete page',
    'pages.deleteConfirm': 'Delete this page? Its components will be removed too.',
    'library.title': 'Components',
    'library.hint': 'Click to add to the current page',
    'inspector.title': 'Properties',
    'inspector.frame': 'Frame settings',
    'inspector.page': 'Page',
    'inspector.pageName': 'Page name',
    'inspector.empty':
      'Select a component to edit properties and switch states; with nothing selected you can configure the current page.',
    'inspector.text': 'Text',
    'inspector.color': 'Color',
    'inspector.position': 'Position',
    'inspector.size': 'Size',
    'inspector.radius': 'Radius',
    'inspector.fontSize': 'Font size',
    'inspector.background': 'Background',
    'inspector.state': 'State',
    'inspector.duplicate': 'Duplicate',
    'inspector.delete': 'Delete',
    'inspector.front': 'Bring front',
    'inspector.back': 'Send back',
    'layers.title': 'Layers',
    'comp.button': 'Button',
    'comp.input': 'Input',
    'comp.card': 'Card',
    'comp.navbar': 'Navbar',
    'comp.tabs': 'Tabs',
    'comp.toggle': 'Toggle',
    'comp.checkbox': 'Checkbox',
    'comp.avatar': 'Avatar',
    'comp.text': 'Text',
    'comp.image': 'Image',
    'comp.badge': 'Badge',
    'comp.select': 'Select',
    'sample.button': 'Button',
    'sample.placeholder': 'Enter text',
    'sample.filled': 'Typed value',
    'sample.card': 'Card title',
    'sample.cardSub': 'Drag, resize and switch states',
    'sample.navbar': 'Page title',
    'sample.tabs': 'Home,Explore,You',
    'sample.checkbox': 'Remember me',
    'sample.text': 'Text content',
    'sample.select': 'Select an option',
    'sample.opt1': 'Option one',
    'sample.opt2': 'Option two',
    'sample.opt3': 'Option three',
    'sample.welcome': 'Welcome back',
    'sample.welcomeSub': 'What will you design today?',
    'stateName.default': 'Default',
    'stateName.hover': 'Hover',
    'stateName.active': 'Pressed',
    'stateName.disabled': 'Disabled',
    'stateName.focus': 'Focus',
    'stateName.filled': 'Filled',
    'stateName.error': 'Error',
    'stateName.open': 'Open',
    'stateName.on': 'On',
    'stateName.off': 'Off',
    'stateName.checked': 'Checked',
    'stateName.unchecked': 'Unchecked',
    'overlay.loading': 'Loading…',
    'overlay.emptyTitle': 'Nothing here yet',
    'overlay.emptyDesc': 'Add your first component to start building',
    'overlay.emptyBtn': 'Add component',
    'overlay.errorTitle': 'Something went wrong',
    'overlay.errorDesc': 'Check your connection and try again',
    'overlay.errorBtn': 'Retry',
  },
};

function isZh(active) {
  return (
    String(active || '')
      .toLowerCase()
      .indexOf('zh') === 0
  );
}
function pickDict(active, key) {
  const dict = isZh(active) ? DICT.zh : DICT.en;
  if (dict[key] != null) return dict[key];
  if (DICT.en[key] != null) return DICT.en[key];
  return key;
}
function activeLocale() {
  try {
    const loc = APP_CTX && APP_CTX.get('locale');
    return loc ? loc.getLocale().active : 'zh';
  } catch (e) {
    return 'zh';
  }
}
function useT() {
  const read = () => activeLocale();
  const [active, setActive] = useState(read);
  useEffect(() => {
    let loc = null;
    try {
      loc = APP_CTX && APP_CTX.get('locale');
    } catch (e) {
      loc = null;
    }
    if (!loc || typeof loc.subscribe !== 'function') return undefined;
    setActive(loc.getLocale().active);
    return loc.subscribe(() => setActive(loc.getLocale().active));
  }, []);
  let bound = null;
  try {
    const loc = APP_CTX && APP_CTX.get('locale');
    if (loc) bound = loc.bind(NS);
  } catch (e) {
    bound = null;
  }
  return useCallback(
    (key) => {
      if (bound) {
        try {
          const out = bound(key);
          if (out && out !== key) return out;
        } catch (e) {
          /* fall through */
        }
      }
      return pickDict(active, key);
    },
    [active, bound],
  );
}

export { activeLocale, DICT, isZh, pickDict, useT };
