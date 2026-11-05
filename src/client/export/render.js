/**
 * Clean model → HTML renderer used by the HTML and PNG exporters.
 *
 * This is deliberately not the editor renderer: editor chrome (container
 * outlines, layer labels, selection boxes) must never leak into an export.
 * Everything is inline-styled so the result is self-contained and can be
 * rasterised through an SVG foreignObject.
 */

import { rgba, shade } from '../color.js';
import { ACCENT } from '../constants.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

function css(style) {
  return Object.entries(style)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${value}`)
    .join(';');
}

const px = (n) => `${Math.round(Number(n) || 0)}px`;

function interactionAttrs(el) {
  const link = (el.interactions || [])[0];
  if (!link) return '';
  if (link.action === 'navigate')
    return ` data-nav="${escapeHtml(link.targetPageId)}" role="button" tabindex="0"`;
  if (link.action === 'back') return ' data-back="1" role="button" tabindex="0"';
  if (link.action === 'openOverlay')
    return ` data-overlay="${escapeHtml(link.targetPageId)}" role="button" tabindex="0"`;
  return '';
}

function box(el, style, inner, attrs = '') {
  const merged = {
    position: 'absolute',
    left: px(el.x),
    top: px(el.y),
    width: px(el.w),
    height: px(el.h),
    boxSizing: 'border-box',
    opacity: el.opacity == null ? 1 : el.opacity,
    ...style,
  };
  return `<div data-el="${escapeHtml(el.id)}"${attrs} style="${css(merged)}">${inner}</div>`;
}

function dots() {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="#6b7280" aria-hidden="true"><circle cx="3" cy="8" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="13" cy="8" r="1.4"/></svg>';
}

function imageIcon() {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="38%" height="38%" viewBox="0 0 24 24" fill="none" stroke="#b3b9c6" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/></svg>';
}

function chevron() {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#6b7280" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5"/></svg>';
}

/** Render one element (and its subtree) to a positioned HTML fragment. */
export function renderElement(el, ctx) {
  if (!el || el.hidden) return '';
  const t = ctx.t;
  const p = el.props || {};
  const acc = p.color || ACCENT;
  const state = el.state || 'default';
  const attrs = interactionAttrs(el);

  if (el.type === 'container' || el.type === 'group') {
    const inner = (el.children || []).map((child) => renderElement(child, ctx)).join('');
    const style =
      el.type === 'container'
        ? {
            background: p.background || '#ffffff',
            borderRadius: px(p.radius != null ? p.radius : 12),
            overflow: p.clipContent === false ? 'visible' : 'hidden',
          }
        : {};
    return box(el, style, inner, attrs);
  }

  if (el.type === 'button') {
    let bg = acc;
    let fg = '#ffffff';
    if (state === 'disabled') {
      bg = '#c9ccd4';
      fg = '#f7f8fa';
    }
    const inner = `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;padding:0 12px;overflow:hidden;white-space:nowrap">${escapeHtml(p.text || t('sample.button'))}</span>`;
    return box(
      el,
      {
        background: bg,
        color: fg,
        borderRadius: px(p.radius != null ? p.radius : 8),
        fontWeight: 600,
        fontSize: px(p.fontSize || 14),
        overflow: 'hidden',
      },
      inner,
      ` data-role="button"${attrs}`,
    );
  }

  if (el.type === 'input') {
    const disabled = state === 'disabled';
    const error = state === 'error';
    const focused = state === 'focus';
    const filled = state === 'filled';
    const value = p.text || (filled ? t('sample.filled') : t('sample.placeholder'));
    const field = {
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      padding: '0 12px',
      border: `1.5px solid ${error ? '#e5484d' : focused ? acc : '#d6d9e2'}`,
      borderRadius: px(p.radius != null ? p.radius : 8),
      background: disabled ? '#f4f5f7' : '#ffffff',
      color: filled ? '#1a1d26' : '#9aa1ad',
      fontSize: px(p.fontSize || 14),
      fontFamily: 'inherit',
      outline: 'none',
      boxShadow: focused ? `0 0 0 3px ${rgba(acc, 0.18)}` : 'none',
    };
    if (ctx.raster) {
      return box(
        el,
        { ...field, display: 'flex', alignItems: 'center' },
        `<span style="overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escapeHtml(value)}</span>`,
      );
    }
    return box(
      el,
      {},
      `<input data-role="input" value="${filled ? escapeHtml(value) : ''}" placeholder="${escapeHtml(value)}" ${disabled ? 'disabled' : ''} style="${css(field)}" />`,
    );
  }

  if (el.type === 'card') {
    const hover = state === 'hover';
    const inner = `<div style="display:flex;flex-direction:column;gap:6px;height:100%;padding:14px;box-sizing:border-box;overflow:hidden">
      <div style="font-size:15px;font-weight:600;color:#161a22;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.text || t('sample.card'))}</div>
      <div style="font-size:12.5px;color:#6b7280;line-height:1.5;overflow:hidden">${escapeHtml(t('sample.cardSub'))}</div>
      <div style="margin-top:auto;height:6px;background:#eef0f5;border-radius:999px;overflow:hidden"><div style="width:62%;height:100%;background:${acc};border-radius:999px"></div></div>
    </div>`;
    return box(
      el,
      {
        background: '#ffffff',
        border: '1px solid #eceef3',
        borderRadius: px(p.radius != null ? p.radius : 12),
        boxShadow: hover ? '0 10px 26px rgba(17,24,39,.14)' : '0 1px 3px rgba(17,24,39,.06)',
        overflow: 'hidden',
      },
      inner,
      attrs,
    );
  }

  if (el.type === 'navbar') {
    const inner = `<div style="display:flex;align-items:center;gap:8px;height:100%;padding:0 16px;box-sizing:border-box">
      <div style="flex:1;font-size:16px;font-weight:600;color:#161a22;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escapeHtml(p.text || t('sample.navbar'))}</div>${dots()}
    </div>`;
    return box(
      el,
      { background: '#ffffff', borderBottom: '1px solid #eceef3', overflow: 'hidden' },
      inner,
      attrs,
    );
  }

  if (el.type === 'tabs') {
    const labels = (p.text || t('sample.tabs')).split(',').map((label) => label.trim());
    const inner = `<div class="dpd-tabs" data-tabs="1" style="display:flex;align-items:stretch;height:100%;border-bottom:1px solid #eceef3;background:#fff;--on:${acc}">
      ${labels
        .map(
          (label, index) =>
            `<div class="dpd-tab${index === 0 ? ' active' : ''}" data-tab="${index}" role="button" tabindex="0" style="flex:1;display:flex;align-items:center;justify-content:center;font-size:13.5px;box-sizing:border-box;white-space:nowrap;overflow:hidden;color:${index === 0 ? acc : '#6b7280'};font-weight:${index === 0 ? 600 : 500};border-bottom:2px solid ${index === 0 ? acc : 'transparent'}">${escapeHtml(label)}</div>`,
        )
        .join('')}
    </div>`;
    return box(el, { overflow: 'hidden' }, inner, attrs);
  }

  if (el.type === 'toggle') {
    const on = state === 'on';
    const knob = Math.max(12, (el.h || 26) - 6);
    const travel = Math.max(0, (el.w || 48) - knob - 6);
    const inner = `<span class="knob" style="position:absolute;top:3px;left:3px;width:${knob}px;height:${knob}px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .18s ease;transform:translateX(${on ? travel : 0}px)"></span>`;
    return box(
      el,
      {
        background: on ? acc : '#d5d8df',
        borderRadius: '999px',
        '--on': acc,
        '--tx': `${travel}px`,
        transition: 'background .18s ease',
      },
      inner,
      ` data-toggle="1" data-on="${on ? '1' : '0'}"${attrs}`,
    );
  }

  if (el.type === 'checkbox') {
    const checked = state === 'checked';
    const inner = `<span class="box" style="width:20px;height:20px;border-radius:5px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${checked ? acc : '#fff'};border:1.5px solid ${checked ? acc : '#c9ccd4'}"><svg xmlns="http://www.w3.org/2000/svg" class="tick" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:${checked ? 1 : 0}"><path d="M2 6l2.5 2.5L10 3"/></svg></span><span style="font-size:13.5px;color:#333a45;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escapeHtml(p.text || t('sample.checkbox'))}</span>`;
    return box(
      el,
      { display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', '--on': acc },
      inner,
      ` class="dpd-check" data-check="1" data-checked="${checked ? '1' : '0'}"${attrs}`,
    );
  }

  if (el.type === 'avatar') {
    const initial = (p.text || 'U').trim().slice(0, 2).toUpperCase();
    const inner = `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:${Math.max(12, Math.round((el.h || 48) * 0.34))}px;overflow:hidden">${escapeHtml(initial)}</span>`;
    return box(
      el,
      {
        borderRadius: '50%',
        background: `linear-gradient(135deg,${shade(acc, 0.15)},${acc})`,
        overflow: 'hidden',
      },
      inner,
      attrs,
    );
  }

  if (el.type === 'text') {
    const inner = `<div style="width:100%;height:100%;display:flex;align-items:center;font-size:${px(p.fontSize || 18)};font-weight:${p.fontWeight || 600};color:${p.color || '#161a22'};line-height:1.3;white-space:pre-wrap;overflow:hidden;text-align:${p.textAlign || 'left'}">${escapeHtml(p.text || t('sample.text'))}</div>`;
    return box(el, {}, inner, attrs);
  }

  if (el.type === 'image') {
    if (p.src) {
      const fit = ['cover', 'contain', 'fill'].includes(p.fit) ? p.fit : 'cover';
      return box(
        el,
        { borderRadius: px(p.radius != null ? p.radius : 10), overflow: 'hidden' },
        `<img src="${escapeHtml(p.src)}" alt="${escapeHtml(p.alt || '')}" style="display:block;width:100%;height:100%;object-fit:${fit}" />`,
        attrs,
      );
    }
    return box(
      el,
      {
        borderRadius: px(p.radius != null ? p.radius : 10),
        background:
          'repeating-linear-gradient(45deg,#eef0f5,#eef0f5 10px,#e6e9f0 10px,#e6e9f0 20px)',
        border: '1px solid #e6e9f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      },
      imageIcon(),
      attrs,
    );
  }

  if (el.type === 'badge') {
    const inner = `<span style="display:inline-flex;align-items:center;height:100%;padding:0 10px;border-radius:999px;background:${rgba(acc, 0.14)};color:${shade(acc, -0.12)};font-size:12px;font-weight:700;letter-spacing:.03em">${escapeHtml(p.text || 'NEW')}</span>`;
    return box(el, { display: 'flex', alignItems: 'center' }, inner, attrs);
  }

  if (el.type === 'select') {
    const open = state === 'open';
    const options = [t('sample.opt1'), t('sample.opt2'), t('sample.opt3')];
    const inner = `<div class="dpd-select" data-select="1" style="position:relative;width:100%;height:100%">
      <div class="field" style="display:flex;width:100%;height:100%;align-items:center;justify-content:space-between;padding:0 12px;box-sizing:border-box;border:1.5px solid ${open ? acc : '#d6d9e2'};border-radius:8px;background:#fff;font-size:14px;color:#333a45">
        <span style="overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escapeHtml(p.text || t('sample.select'))}</span>${chevron()}
      </div>
      <div class="menu" style="display:${open ? 'block' : 'none'};position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1px solid #eceef3;border-radius:8px;box-shadow:0 10px 24px rgba(17,24,39,.14);padding:4px;z-index:5">
        ${options
          .map(
            (option, index) =>
              `<div style="padding:7px 10px;font-size:13.5px;color:#333a45;border-radius:5px;background:${index === 0 ? rgba(acc, 0.1) : 'transparent'}">${escapeHtml(option)}</div>`,
          )
          .join('')}
      </div>
    </div>`;
    return box(el, { overflow: 'visible' }, inner, attrs);
  }

  return box(el, {}, '');
}

/** Page body: positioned children only (no frame wrapper). */
export function renderPageBody(page, ctx) {
  return (page.elements || []).map((el) => renderElement(el, ctx)).join('');
}

/** A single page as a self-contained, clipped frame. */
export function renderPage(page, ctx) {
  const frame = page.frame || { w: 390, h: 844, background: '#ffffff' };
  const variant = page.variantOf
    ? ` data-variant-of="${escapeHtml(page.variantOf)}" data-state-key="${escapeHtml(page.stateKey || '')}"`
    : '';
  return `<div class="dpd-page" data-page="${escapeHtml(page.id)}"${variant} style="position:relative;width:${px(frame.w)};height:${px(frame.h)};background:${frame.background || '#ffffff'};overflow:hidden">${renderPageBody(page, ctx)}</div>`;
}
