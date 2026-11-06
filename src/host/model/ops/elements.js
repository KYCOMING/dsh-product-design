/** elements op handlers (split out of host/model.js#applyOne). */
import {
  collectElementEntries,
  findElementEntry,
  isContainerType,
} from '../../../shared/elements.js';
import { newId } from '../../../shared/id.js';
import { normalizeConstraints, normalizeLayout } from '../../../shared/layout.js';
import { ELEMENT_TYPES, normalizeInteractions } from '../../../shared/schema.js';

export function createElementsHandlers(deps) {
  const { findPage, findPageForElement, ensureElement, clone, isObj, num, str, removeElementById } =
    deps;
  return {
    add_element: (doc, op, index, state) => {
      const kind = 'add_element';
      const page = findPage(doc, op, index);
      const type = ELEMENT_TYPES[op.type] ? op.type : null;
      if (!type) throw new Error(`op[${index}] add_element: unknown type "${op.type}"`);
      const containerId = op.containerId === '@last' ? state.lastContainerId : op.containerId;
      const target = containerId ? findElementEntry(page.elements, containerId) : null;
      if (containerId && (!target || !isContainerType(target.el.type)))
        throw new Error(`op[${index}] add_element: unknown container "${containerId}"`);
      const [dw, dh] = ELEMENT_TYPES[type].size;
      const fullWidth = type === 'navbar' || type === 'tabs';
      const boundW = target ? target.el.w : page.frame.w;
      const targetList = target ? target.el.children || [] : page.elements;
      const w = Math.max(12, num(op.w, fullWidth ? boundW : dw));
      const n = targetList.length;
      const el = ensureElement({
        id: newId('e'),
        type,
        name: str(op.name, ''),
        x: num(op.x, target ? 16 : fullWidth ? 0 : 24),
        y: num(op.y, 24 + (n % 10) * 18),
        w,
        h: Math.max(8, num(op.h, dh)),
        hidden: op.hidden === true,
        locked: op.locked === true,
        opacity: num(op.opacity, 1),
        state: op.state,
        props: op.props,
        interactions: op.interactions,
        constraints: op.constraints,
        layout: op.layout,
      });
      if (target) target.el.children = [...(target.el.children || []), el];
      else page.elements.push(el);
      if (type === 'container') state.lastContainerId = el.id;
      return { op: index, kind, pageId: page.id, elementId: el.id, type };
    },
    add_container: (doc, op, index, state) => {
      const kind = 'add_container';
      const page = findPage(doc, op, index);
      const containerId = op.containerId === '@last' ? state.lastContainerId : op.containerId;
      const target = containerId ? findElementEntry(page.elements, containerId) : null;
      if (containerId && (!target || !isContainerType(target.el.type)))
        throw new Error(`op[${index}] add_container: unknown container "${containerId}"`);
      const boundW = target ? target.el.w : page.frame.w;
      const boundH = target ? target.el.h : page.frame.h;
      const n = (target ? target.el.children || [] : page.elements).length;
      const el = ensureElement({
        id: newId('e'),
        type: 'container',
        name: str(op.name, `Container ${n + 1}`),
        x: num(op.x, Math.min(24, Math.max(0, boundW - 40))),
        y: num(op.y, 24 + (n % 8) * 18),
        w: Math.max(12, num(op.w, Math.min(320, boundW))),
        h: Math.max(8, num(op.h, Math.min(240, boundH))),
        hidden: op.hidden === true,
        locked: op.locked === true,
        opacity: num(op.opacity, 1),
        constraints: op.constraints,
        layout: op.layout,
        props: {
          name: str(op.name, `Container ${n + 1}`),
          background: str(op.background, '#ffffff'),
          radius: num(op.radius, 12),
          clipContent: op.clipContent !== false,
        },
      });
      if (target) target.el.children = [...(target.el.children || []), el];
      else page.elements.push(el);
      state.lastContainerId = el.id;
      return { op: index, kind, pageId: page.id, elementId: el.id, type: 'container' };
    },
    update_element: (doc, op, index, state) => {
      const kind = 'update_element';
      const page = findPageForElement(doc, op, index);
      const entry = findElementEntry(page.elements, op.elementId);
      if (!entry) throw new Error(`op[${index}] update_element: unknown element "${op.elementId}"`);
      const el = entry.el;
      if (op.x !== undefined) el.x = num(op.x, el.x);
      if (op.y !== undefined) el.y = num(op.y, el.y);
      if (op.w !== undefined) el.w = Math.max(12, num(op.w, el.w));
      if (op.h !== undefined) el.h = Math.max(8, num(op.h, el.h));
      if (op.name !== undefined) el.name = str(op.name, el.name);
      if (op.hidden !== undefined) el.hidden = op.hidden === true;
      if (op.locked !== undefined) el.locked = op.locked === true;
      if (op.opacity !== undefined) el.opacity = clamp01(num(op.opacity, el.opacity));
      if (op.state !== undefined && (ELEMENT_TYPES[el.type].states || []).includes(op.state))
        el.state = op.state;
      if (op.interactions !== undefined) el.interactions = normalizeInteractions(op.interactions);
      if (op.constraints !== undefined)
        el.constraints = normalizeConstraints(op.constraints, el.type);
      if (op.layout !== undefined) el.layout = normalizeLayout(op.layout);
      if (isObj(op.props)) el.props = { ...el.props, ...clone(op.props) };
      return { op: index, kind, pageId: page.id, elementId: el.id };
    },
    delete_element: (doc, op, index, state) => {
      const kind = 'delete_element';
      const page = findPageForElement(doc, op, index);
      const before = collectElementEntries(page.elements).length;
      page.elements = removeElementById(page.elements, op.elementId);
      if (collectElementEntries(page.elements).length === before)
        throw new Error(`op[${index}] delete_element: unknown element "${op.elementId}"`);
      return { op: index, kind, pageId: page.id, elementId: op.elementId };
    },
  };
}
