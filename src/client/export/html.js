/**
 * Single-file interactive HTML prototype.
 *
 * All pages are embedded; a tiny runtime handles navigation, back, overlays and
 * the interactive components (toggle / checkbox / tabs / select). No network,
 * no build step: the file opens directly in a browser.
 */

import { escapeHtml, renderPage } from './render.js';

const CSS = `
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;background:#e9ebf0;color:#111827;display:flex;flex-direction:column}
#stage{flex:1;display:flex;align-items:center;justify-content:center;padding:32px 16px 16px;overflow:auto}
#pages{position:relative;filter:drop-shadow(0 14px 44px rgba(17,24,39,.20))}
.dpd-page{display:none;border-radius:18px;overflow:hidden}
.dpd-page.active{display:block}
#bar{display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap;padding:10px 16px 16px}
#bar button{border:1px solid #d6d9e2;background:#fff;color:#374151;border-radius:999px;padding:6px 12px;font:inherit;font-size:12px;cursor:pointer}
#bar button.active{background:#6366f1;border-color:transparent;color:#fff}
#bar .spacer{width:8px}
#statebar{display:none;gap:4px;align-items:center;justify-content:center;flex-wrap:wrap;padding:4px 16px 0}
#statebar button{border:1px solid #d6d9e2;background:#fff;color:#6b7280;border-radius:999px;padding:3px 10px;font:inherit;font-size:11px;cursor:pointer}
#statebar button.active{background:#111827;border-color:transparent;color:#fff}
#statebar button:disabled{opacity:.35;cursor:default}
#overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:50}
#overlay.open{display:flex}
#overlayBackdrop{position:absolute;inset:0;background:rgba(17,24,39,.38)}
#overlayHost{position:relative;border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(17,24,39,.4)}
#overlayHost .dpd-page{display:block}
.dpd-tabs .dpd-tab{border-bottom:2px solid transparent;color:#6b7280;font-weight:500;cursor:pointer}
.dpd-tabs .dpd-tab.active{color:var(--on);border-bottom-color:var(--on);font-weight:600}
.dpd-check .tick{opacity:0;transition:opacity .15s}
.dpd-check[data-checked="1"] .tick{opacity:1}
.dpd-select .menu{display:none}
.dpd-select.open .menu{display:block}
[data-role="button"]{cursor:pointer;transition:filter .15s}
[data-role="button"]:hover{filter:brightness(.94)}
[data-role="input"]:focus{border-color:#6366f1!important}
[data-nav],[data-back],[data-overlay]{cursor:pointer}
`;

const RUNTIME = `
(function(){
  var pages = Array.prototype.slice.call(document.querySelectorAll('#pages .dpd-page'));
  var byId = {};
  pages.forEach(function(page){ byId[page.getAttribute('data-page')] = page; });
  var stack = [];
  var overlay = document.getElementById('overlay');
  var overlayHost = document.getElementById('overlayHost');
  var statebar = document.getElementById('statebar');

  function baseIdOf(page){
    return page.getAttribute('data-variant-of') || page.getAttribute('data-page');
  }
  function statePage(base, key){
    if(key === 'normal') return byId[base] || null;
    for(var i=0;i<pages.length;i++){
      if(pages[i].getAttribute('data-variant-of') === base && pages[i].getAttribute('data-state-key') === key) return pages[i];
    }
    return null;
  }
  function refreshStateBar(page){
    if(!statebar) return;
    var base = baseIdOf(page);
    var key = page.getAttribute('data-state-key') || 'normal';
    var buttons = statebar.querySelectorAll('button[data-state]');
    for(var i=0;i<buttons.length;i++){
      var state = buttons[i].getAttribute('data-state');
      buttons[i].classList.toggle('active', state === key);
      buttons[i].disabled = statePage(base, state) === null;
    }
  }

  function show(id, push){
    var page = byId[id];
    if(!page) return;
    pages.forEach(function(candidate){ candidate.classList.toggle('active', candidate === page); });
    if(push) stack.push(id);
    var base = baseIdOf(page);
    var buttons = document.querySelectorAll('#bar button[data-go]');
    for(var i=0;i<buttons.length;i++){
      buttons[i].classList.toggle('active', buttons[i].getAttribute('data-go') === base);
    }
    refreshStateBar(page);
  }
  function back(){
    if(stack.length > 1){ stack.pop(); show(stack[stack.length-1], false); }
  }
  function closeOverlay(){
    overlay.classList.remove('open');
    overlayHost.innerHTML = '';
  }
  function openOverlay(id){
    var page = byId[id];
    if(!page) return;
    overlayHost.innerHTML = '';
    var clone = page.cloneNode(true);
    clone.classList.add('active');
    overlayHost.appendChild(clone);
    var rect = page.getBoundingClientRect();
    var scale = Math.min(1, (window.innerHeight * 0.8) / Math.max(1, rect.height), (window.innerWidth * 0.8) / Math.max(1, rect.width));
    overlayHost.style.width = Math.round(rect.width * scale) + 'px';
    overlayHost.style.height = Math.round(rect.height * scale) + 'px';
    clone.style.transformOrigin = 'top left';
    clone.style.transform = 'scale(' + scale + ')';
    overlay.classList.add('open');
  }

  document.addEventListener('click', function(event){
    var target = event.target;
    var stateBtn = target.closest('#statebar [data-state]');
    if(stateBtn && !stateBtn.disabled){
      var activePage = document.querySelector('#pages .dpd-page.active');
      if(activePage){
        var next = statePage(baseIdOf(activePage), stateBtn.getAttribute('data-state'));
        if(next) show(next.getAttribute('data-page'), false);
      }
      return;
    }
    var nav = target.closest('[data-nav]');
    if(nav){ show(nav.getAttribute('data-nav'), true); return; }
    var backEl = target.closest('[data-back]');
    if(backEl){ back(); return; }
    var overlayEl = target.closest('[data-overlay]');
    if(overlayEl){ openOverlay(overlayEl.getAttribute('data-overlay')); return; }
    var toggle = target.closest('[data-toggle]');
    if(toggle){
      var on = toggle.getAttribute('data-on') === '1';
      toggle.setAttribute('data-on', on ? '0' : '1');
      toggle.style.background = on ? '#d5d8df' : (toggle.style.getPropertyValue('--on') || '#6366f1');
      var knob = toggle.querySelector('.knob');
      if(knob){ knob.style.transform = 'translateX(' + (on ? '0px' : (toggle.style.getPropertyValue('--tx') || '0px')) + ')'; }
      return;
    }
    var check = target.closest('[data-check]');
    if(check){
      var checked = check.getAttribute('data-checked') === '1';
      check.setAttribute('data-checked', checked ? '0' : '1');
      var box = check.querySelector('.box');
      var onColor = check.style.getPropertyValue('--on') || '#6366f1';
      if(box){
        box.style.background = checked ? '#fff' : onColor;
        box.style.borderColor = checked ? '#c9ccd4' : onColor;
      }
      var tick = check.querySelector('.tick');
      if(tick){ tick.style.opacity = checked ? '0' : '1'; }
      return;
    }
    var tab = target.closest('[data-tab]');
    if(tab){
      var group = tab.closest('.dpd-tabs');
      var onColor = group.style.getPropertyValue('--on') || '#6366f1';
      var tabs = group.querySelectorAll('[data-tab]');
      for(var i=0;i<tabs.length;i++){
        var active = tabs[i] === tab;
        tabs[i].classList.toggle('active', active);
        tabs[i].style.color = active ? onColor : '#6b7280';
        tabs[i].style.fontWeight = active ? '600' : '500';
        tabs[i].style.borderBottom = '2px solid ' + (active ? onColor : 'transparent');
      }
      return;
    }
    var field = target.closest('[data-select] .field');
    if(field){
      var root = field.parentNode;
      var menu = root.querySelector('.menu');
      if(menu){ menu.style.display = menu.style.display === 'none' ? 'block' : 'none'; }
      return;
    }
    if(target.closest('#overlayBackdrop')){ closeOverlay(); }
  });

  document.addEventListener('keydown', function(event){
    if(event.key === 'Escape') closeOverlay();
  });

  var bar = document.getElementById('bar');
  bar.addEventListener('click', function(event){
    var go = event.target.closest('[data-go]');
    if(go){ stack = [go.getAttribute('data-go')]; show(go.getAttribute('data-go'), false); }
    var reset = event.target.closest('[data-reset]');
    if(reset && stack.length){ show(stack[0], false); stack = [stack[0]]; }
  });

  var first = pages.filter(function(page){ return !page.getAttribute('data-variant-of'); })[0] || pages[0];
  if(first){ stack = [first.getAttribute('data-page')]; show(stack[0], false); }
  if(statebar && pages.some(function(page){ return !!page.getAttribute('data-variant-of'); })) statebar.style.display = 'flex';
})();
`;

/** @returns {string} a complete, standalone HTML document */
export function buildHtml(doc, ctx) {
  const title = escapeHtml(doc.name || ctx.t('app.title'));
  const pages = (doc.pages || []).map((page) => renderPage(page, ctx)).join('');
  const buttons = (doc.pages || [])
    .filter((page) => !page.variantOf)
    .map(
      (page) =>
        `<button type="button" data-go="${escapeHtml(page.id)}">${escapeHtml(page.name)}</button>`,
    )
    .join('');
  const stateBar = ['normal', 'loading', 'empty', 'error']
    .map(
      (key) =>
        `<button type="button" data-state="${key}">${escapeHtml(ctx.t('state.' + key))}</button>`,
    )
    .join('');
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>${CSS}</style>
</head>
<body>
<main id="stage"><div id="pages">${pages}</div></main>
<div id="overlay"><div id="overlayBackdrop"></div><div id="overlayHost"></div></div>
<div id="statebar">${stateBar}</div>
<nav id="bar">${buttons}<span class="spacer"></span><button type="button" data-reset="1">↺</button></nav>
<script>${RUNTIME}</script>
</body>
</html>`;
}
