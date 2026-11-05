/**
 * React + Tailwind code export.
 *
 * Produces one copy-pasteable `Prototype.jsx`: a component per page, absolute
 * positioning for free-form layout, flex classes for auto-layout containers,
 * semantic tags for buttons/inputs, and a small state-based page router.
 */

import { rgba, shade } from '../color.js';
import { ACCENT } from '../constants.js';

const cls = (...parts) => parts.filter(Boolean).join(' ');

function safeName(value, fallback) {
  const cleaned = String(value || '')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, ' ')
    .trim();
  if (!cleaned) return fallback;
  if (/^[0-9]/.test(cleaned)) return fallback + cleaned;
  return cleaned.replace(/\s+/g, '');
}

function componentNames(pages) {
  const used = new Set();
  return pages.map((page, index) => {
    let base = safeName(page.name, `Page${index + 1}`);
    base = base.charAt(0).toUpperCase() + base.slice(1);
    let name = base;
    let suffix = 2;
    while (used.has(name)) name = `${base}${suffix++}`;
    used.add(name);
    return name;
  });
}

function interactionProps(el) {
  const link = (el.interactions || [])[0];
  if (!link) return '';
  if (link.action === 'navigate') return ` onClick={() => onNavigate('${link.targetPageId}')}`;
  if (link.action === 'back') return ' onClick={onBack}';
  if (link.action === 'openOverlay') return ` onClick={() => onOverlay('${link.targetPageId}')}`;
  return '';
}

function boxClasses(el, options = {}) {
  const parts = [];
  if (options.flow) {
    parts.push('relative');
  } else {
    parts.push('absolute', `left-[${el.x}px]`, `top-[${el.y}px]`);
  }
  if (!options.skipSize) {
    parts.push(`w-[${el.w}px]`, `h-[${el.h}px]`);
  }
  if (el.opacity != null && el.opacity !== 1) parts.push(`opacity-[${el.opacity}]`);
  return parts.join(' ');
}

function stackClasses(layout) {
  const padding = layout.padding || { t: 0, r: 0, b: 0, l: 0 };
  const uniform = padding.t === padding.r && padding.r === padding.b && padding.b === padding.l;
  const parts = [
    'flex',
    layout.direction === 'row' ? 'flex-row' : 'flex-col',
    `gap-[${layout.gap || 0}px]`,
    `justify-${layout.justify === 'between' ? 'between' : layout.justify || 'start'}`,
    `items-${layout.align || 'start'}`,
  ];
  if (uniform) {
    if (padding.t) parts.push(`p-[${padding.t}px]`);
  } else {
    if (padding.t) parts.push(`pt-[${padding.t}px]`);
    if (padding.r) parts.push(`pr-[${padding.r}px]`);
    if (padding.b) parts.push(`pb-[${padding.b}px]`);
    if (padding.l) parts.push(`pl-[${padding.l}px]`);
  }
  return parts.join(' ');
}

function childClasses(el, parentLayout) {
  const flow = parentLayout && parentLayout.mode === 'stack';
  if (!flow) return boxClasses(el);
  const parts = [];
  if (parentLayout.align === 'stretch') {
    parts.push(parentLayout.direction === 'row' ? 'h-full' : 'w-full');
  } else {
    parts.push(`w-[${el.w}px]`, `h-[${el.h}px]`);
  }
  if (el.opacity != null && el.opacity !== 1) parts.push(`opacity-[${el.opacity}]`);
  return parts.join(' ');
}

function textOf(el, fallback) {
  return JSON.stringify((el.props && el.props.text) || fallback);
}

/** Render one element as JSX. `depth` only affects readability. */
function renderElement(el, ctx, parentLayout) {
  if (!el || el.hidden) return '';
  const p = el.props || {};
  const acc = p.color || ACCENT;
  const state = el.state || 'default';
  const size = childClasses(el, parentLayout);
  const inter = interactionProps(el);
  const pad = '  '.repeat(ctx.depth);

  if (el.type === 'container' || el.type === 'group') {
    const flow = el.layout && el.layout.mode === 'stack';
    const style =
      el.type === 'container'
        ? [
            p.background ? `bg-[${p.background}]` : 'bg-white',
            `rounded-[${p.radius != null ? p.radius : 12}px]`,
            p.clipContent === false ? '' : 'overflow-hidden',
          ]
        : [];
    const layoutCls = flow ? stackClasses(el.layout) : '';
    const children = (el.children || [])
      .map((child) => renderElement(child, { ...ctx, depth: ctx.depth + 1 }, el.layout))
      .join('\n');
    return `${pad}<div className={${JSON.stringify(cls(size, ...style, layoutCls))}}${inter}>\n${children}\n${pad}</div>`;
  }

  if (el.type === 'button') {
    const bg = state === 'disabled' ? 'bg-[#c9ccd4]' : `bg-[${acc}]`;
    const fg = state === 'disabled' ? 'text-[#f7f8fa]' : 'text-white';
    return `${pad}<button type="button" className={${JSON.stringify(
      cls(
        size,
        bg,
        fg,
        `rounded-[${p.radius != null ? p.radius : 8}px]`,
        `text-[${p.fontSize || 14}px]`,
        'font-semibold',
        'flex items-center justify-center px-3 overflow-hidden whitespace-nowrap',
      ),
    )}}${inter}>{${textOf(el, ctx.t('sample.button'))}}</button>`;
  }

  if (el.type === 'input') {
    const disabled = state === 'disabled' ? ' disabled' : '';
    return `${pad}<input${disabled} placeholder={${textOf(el, ctx.t('sample.placeholder'))}} className={${JSON.stringify(
      cls(
        size,
        'rounded-[8px]',
        'border-[1.5px]',
        'border-[#d6d9e2]',
        'bg-white',
        'px-3',
        `text-[${p.fontSize || 14}px]`,
        'text-[#1a1d26]',
        'outline-none',
        'focus:border-[#6366f1]',
      ),
    )}} />`;
  }

  if (el.type === 'card') {
    const inner = [
      `${pad}  <div className="text-[15px] font-semibold text-[#161a22] truncate">{${textOf(el, ctx.t('sample.card'))}}</div>`,
      `${pad}  <div className="text-[12.5px] text-[#6b7280] leading-normal">{${JSON.stringify(ctx.t('sample.cardSub'))}}</div>`,
      `${pad}  <div className="mt-auto h-1.5 rounded-full bg-[#eef0f5] overflow-hidden"><div className="h-full w-[62%] rounded-full bg-[${acc}]" /></div>`,
    ].join('\n');
    return `${pad}<div className={${JSON.stringify(
      cls(
        size,
        'rounded-[12px]',
        'border',
        'border-[#eceef3]',
        'bg-white',
        'p-3.5',
        'shadow-sm',
        'flex',
        'flex-col',
        'gap-1.5',
        'overflow-hidden',
      ),
    )}}${inter}>\n${inner}\n${pad}</div>`;
  }

  if (el.type === 'navbar') {
    return `${pad}<header className={${JSON.stringify(
      cls(
        size,
        'flex',
        'items-center',
        'gap-2',
        'px-4',
        'bg-white',
        'border-b',
        'border-[#eceef3]',
      ),
    )}}${inter}>
${pad}  <div className="flex-1 text-[16px] font-semibold text-[#161a22] truncate">{${textOf(el, ctx.t('sample.navbar'))}}</div>
${pad}  <span className="flex gap-1 text-[#6b7280]"><span>●</span><span>●</span><span>●</span></span>
${pad}</header>`;
  }

  if (el.type === 'tabs') {
    const labels = String(p.text || ctx.t('sample.tabs'))
      .split(',')
      .map((label) => label.trim());
    const items = labels
      .map(
        (label, index) =>
          `${pad}  <button type="button" className={${JSON.stringify(
            cls(
              'flex-1',
              'py-3',
              'text-[13.5px]',
              index === 0 ? 'font-semibold' : 'font-medium',
              index === 0 ? 'border-b-2' : 'border-b-2 border-transparent',
              index === 0 ? 'text-[#6366f1]' : 'text-[#6b7280]',
            ),
          )}}>${JSON.stringify(label)}</button>`,
      )
      .join('\n');
    return `${pad}<nav className={${JSON.stringify(cls(size, 'flex', 'bg-white', 'border-b', 'border-[#eceef3]'))}}${inter}>\n${items}\n${pad}</nav>`;
  }

  if (el.type === 'toggle') {
    const on = state === 'on';
    const knob = Math.max(12, (el.h || 26) - 6);
    const travel = Math.max(0, (el.w || 48) - knob - 6);
    return `${pad}<div className={${JSON.stringify(cls(size, 'rounded-full', 'relative', on ? `bg-[${acc}]` : 'bg-[#d5d8df]'))}}${inter}>\n${pad}  <span className={${JSON.stringify(
      cls(
        'absolute',
        'top-[3px]',
        'left-[3px]',
        `w-[${knob}px]`,
        `h-[${knob}px]`,
        'rounded-full',
        'bg-white',
        'shadow',
        on ? `translate-x-[${travel}px]` : '',
      ),
    )}} />\n${pad}</div>`;
  }

  if (el.type === 'checkbox') {
    const checked = state === 'checked';
    return `${pad}<label className={${JSON.stringify(cls(size, 'flex', 'items-center', 'gap-2'))}}${inter}>
${pad}  <span className={${JSON.stringify(cls('w-5', 'h-5', 'rounded-[5px]', 'flex', 'items-center', 'justify-center', checked ? `bg-[${acc}]` : 'bg-white', 'border', checked ? 'border-transparent' : 'border-[#c9ccd4]'))}}>${checked ? '<span className="text-white text-[12px]">✓</span>' : ''}</span>
${pad}  <span className="text-[13.5px] text-[#333a45] truncate">{${textOf(el, ctx.t('sample.checkbox'))}}</span>
${pad}</label>`;
  }

  if (el.type === 'avatar') {
    const initial = ((p.text || 'U').trim().slice(0, 2) || 'U').toUpperCase();
    const fontSize = Math.max(12, Math.round((el.h || 48) * 0.34));
    return `${pad}<div className={${JSON.stringify(
      cls(
        size,
        'rounded-full',
        'flex',
        'items-center',
        'justify-center',
        'text-white',
        'font-semibold',
        `text-[${fontSize}px]`,
      ),
    )}} style={{ background: 'linear-gradient(135deg, ${shade(acc, 0.15)}, ${acc})' }}>${JSON.stringify(initial)}</div>`;
  }

  if (el.type === 'text') {
    return `${pad}<p className={${JSON.stringify(
      cls(
        size,
        'flex',
        'items-center',
        `text-[${p.fontSize || 18}px]`,
        p.fontWeight ? `font-[${p.fontWeight}]` : 'font-semibold',
        `text-[${p.color || '#161a22'}]`,
        'leading-[1.3]',
        'whitespace-pre-wrap',
        'overflow-hidden',
      ),
    )}}${inter}>{${textOf(el, ctx.t('sample.text'))}}</p>`;
  }

  if (el.type === 'image') {
    if (p.src) {
      const fit = ['cover', 'contain', 'fill'].includes(p.fit) ? p.fit : 'cover';
      const fitCls =
        fit === 'contain' ? 'object-contain' : fit === 'fill' ? 'object-fill' : 'object-cover';
      return `${pad}<img src={${JSON.stringify(p.src)}} alt={${JSON.stringify(
        p.alt || '',
      )}} className={${JSON.stringify(
        cls(size, `rounded-[${p.radius != null ? p.radius : 10}px]`, fitCls),
      )}}${inter} />`;
    }
    return `${pad}<div className={${JSON.stringify(
      cls(
        size,
        'rounded-[10px]',
        'border',
        'border-[#e6e9f0]',
        'bg-slate-100',
        'flex',
        'items-center',
        'justify-center',
        'text-[#b3b9c6]',
        'text-2xl',
      ),
    )}}${inter}>▧</div>`;
  }

  if (el.type === 'badge') {
    return `${pad}<span className={${JSON.stringify(
      cls(
        size,
        'inline-flex',
        'items-center',
        'justify-center',
        'rounded-full',
        'px-2.5',
        'text-[12px]',
        'font-bold',
        'tracking-wide',
      ),
    )}} style={{ background: '${rgba(acc, 0.14)}', color: '${shade(acc, -0.12)}' }}>{${textOf(el, 'NEW')}}</span>`;
  }

  if (el.type === 'select') {
    return `${pad}<div className={${JSON.stringify(
      cls(
        size,
        'flex',
        'items-center',
        'justify-between',
        'rounded-[8px]',
        'border-[1.5px]',
        'border-[#d6d9e2]',
        'bg-white',
        'px-3',
        'text-[14px]',
        'text-[#333a45]',
      ),
    )}}${inter}>
${pad}  <span className="truncate">{${textOf(el, ctx.t('sample.select'))}}</span>
${pad}  <span className="text-[#6b7280]">▾</span>
${pad}</div>`;
  }

  return `${pad}<div className={${JSON.stringify(size)}} />`;
}

/** @returns {string} a single-file JSX component tree. */
export function buildReact(doc, ctx) {
  const pages = doc.pages || [];
  const names = componentNames(pages);

  const components = pages
    .map((page, index) => {
      const frame = page.frame || { w: 390, h: 844, background: '#ffffff' };
      const body = (page.elements || [])
        .map((el) => renderElement(el, { depth: 3, t: ctx.t }, null))
        .join('\n');
      return `// ${page.name} · ${frame.w}×${frame.h}
function ${names[index]}({ onNavigate, onBack, onOverlay }) {
  return (
    <div className="relative w-[${frame.w}px] h-[${frame.h}px] bg-[${frame.background || '#ffffff'}] overflow-hidden">
${body}
    </div>
  );
}`;
    })
    .join('\n\n');

  const registry = pages.map((page, index) => `  '${page.id}': ${names[index]},`).join('\n');
  const bases = pages.filter((page) => !page.variantOf);
  const first = (bases[0] || pages[0] || {}).id || '';
  const baseOf = {};
  const stateOf = {};
  const statePages = {};
  for (const page of pages) {
    if (!page.variantOf) continue;
    baseOf[page.id] = page.variantOf;
    stateOf[page.id] = page.stateKey;
    statePages[page.variantOf] = statePages[page.variantOf] || {};
    statePages[page.variantOf][page.stateKey] = page.id;
  }
  const stateKeys = ['normal', 'loading', 'empty', 'error'];
  const stateLabels = stateKeys.map((key) => ctx.t('state.' + key));

  const source = `// Generated by dsh-product-design.
// ${doc.name || 'Prototype'} — ${bases.length} page(s) + ${pages.length - bases.length} state variant(s). Tailwind CSS required.
import { useState } from 'react';

${components}

const PAGES = {
${registry}
};

const BASE_OF = ${JSON.stringify(baseOf)};
const STATE_OF = ${JSON.stringify(stateOf)};
const STATE_PAGES = ${JSON.stringify(statePages)};

export default function App() {
  const [page, setPage] = useState('${first}');
  const [stack, setStack] = useState(['${first}']);
  const [overlay, setOverlay] = useState(null);

  const navigate = (id) => {
    setStack((current) => [...current, id]);
    setPage(id);
  };
  const switchState = (id) => {
    setStack((current) => [...current.slice(0, -1), id]);
    setPage(id);
  };
  const base = BASE_OF[page] || page;
  const currentState = STATE_OF[page] || 'normal';
  const stateTarget = (key) => (key === 'normal' ? base : (STATE_PAGES[base] || {})[key] || null);
  const back = () => {
    setStack((current) => {
      if (current.length <= 1) return current;
      const next = current.slice(0, -1);
      setPage(next[next.length - 1]);
      return next;
    });
  };

  const Current = PAGES[page] || PAGES['${first}'];
  const Overlay = overlay ? PAGES[overlay] : null;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1">
          {${JSON.stringify(stateKeys)}.map((key) => {
            const target = stateTarget(key);
            return (
              <button
                key={key}
                type="button"
                disabled={!target}
                onClick={() => target && switchState(target)}
                className={[
                  'rounded-full border px-3 py-1 text-[11px]',
                  currentState === key ? 'bg-[#111827] text-white border-transparent' : 'bg-white text-[#6b7280] border-[#d6d9e2]',
                  target ? 'cursor-pointer' : 'opacity-40 cursor-default',
                ].join(' ')}
              >
                {${JSON.stringify(stateLabels)}[${JSON.stringify(stateKeys)}.indexOf(key)]}
              </button>
            );
          })}
        </div>
        <div className="rounded-2xl shadow-2xl overflow-hidden">
          <Current onNavigate={navigate} onBack={back} onOverlay={setOverlay} />
        </div>
      </div>
      {Overlay ? (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-8"
          onClick={() => setOverlay(null)}
        >
          <div className="rounded-2xl shadow-2xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <Overlay onNavigate={navigate} onBack={back} onOverlay={setOverlay} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
`;
  return source
    .replace(/className=\{("(?:[^"\\]|\\.)*")\}/g, 'className=$1')
    .replace(/placeholder=\{("(?:[^"\\]|\\.)*")\}/g, 'placeholder=$1');
}
