/** arrange op handlers (split out of host/model.js#applyOne). */
import {
  buildGroupFromEntries,
  descendantIds,
  findElementEntry,
  isContainerType,
  reorderInTree,
  ungroupChildren,
} from '../../../shared/elements.js';
import { newId } from '../../../shared/id.js';

export function createArrangeHandlers(deps) {
  const { findPageForElement, str, removeElementById } = deps;
  return {
    move_element: (doc, op, index, state) => {
      const kind = 'move_element';
      const page = findPageForElement(doc, op, index);
      const entry = findElementEntry(page.elements, op.elementId);
      if (!entry) throw new Error(`op[${index}] move_element: unknown element "${op.elementId}"`);
      const containerId = op.containerId === undefined ? null : op.containerId;
      if (containerId && containerId === op.elementId)
        throw new Error(`op[${index}] move_element: cannot move an element into itself`);
      if (containerId && descendantIds(entry.el).includes(containerId))
        throw new Error(`op[${index}] move_element: cannot move into a descendant`);
      const absX = entry.absX;
      const absY = entry.absY;
      const removed = removeElementById(page.elements, op.elementId);
      const moved = { ...entry.el, x: 0, y: 0 };
      if (containerId) {
        const target = findElementEntry(removed, containerId);
        if (!target || !isContainerType(target.el.type))
          throw new Error(`op[${index}] move_element: unknown container "${containerId}"`);
        moved.x = Math.round(absX - target.absX);
        moved.y = Math.round(absY - target.absY);
        const kids = (target.el.children || []).slice();
        const at = Number.isFinite(op.index)
          ? Math.max(0, Math.min(kids.length, Number(op.index)))
          : kids.length;
        kids.splice(at, 0, moved);
        target.el.children = kids;
      } else {
        moved.x = Math.round(absX);
        moved.y = Math.round(absY);
        const at = Number.isFinite(op.index)
          ? Math.max(0, Math.min(removed.length, Number(op.index)))
          : removed.length;
        removed.splice(at, 0, moved);
      }
      page.elements = removed;
      return { op: index, kind, pageId: page.id, elementId: moved.id };
    },
    reorder_element: (doc, op, index, state) => {
      const kind = 'reorder_element';
      const page = findPageForElement(doc, op, index);
      const position = ['front', 'back', 'forward', 'backward'].includes(op.position)
        ? op.position
        : 'front';
      if (!findElementEntry(page.elements, op.elementId))
        throw new Error(`op[${index}] reorder_element: unknown element "${op.elementId}"`);
      page.elements = reorderInTree(page.elements, op.elementId, position);
      return { op: index, kind, pageId: page.id, elementId: op.elementId, position };
    },
    group_elements: (doc, op, index, state) => {
      const kind = 'group_elements';
      const page = findPageForElement(doc, op, index);
      const ids = Array.isArray(op.elementIds) ? op.elementIds : [];
      if (ids.length < 2) throw new Error(`op[${index}] group_elements: need at least two ids`);
      const entries = ids.map((id) => findElementEntry(page.elements, id));
      if (entries.some((entry) => !entry))
        throw new Error(`op[${index}] group_elements: unknown element id`);
      const list = entries[0].list;
      if (!entries.every((entry) => entry.list === list))
        throw new Error(`op[${index}] group_elements: elements must share a parent`);
      const group = buildGroupFromEntries(entries, { id: newId('e'), name: str(op.name, 'Group') });
      const idSet = new Set(ids);
      const insertAt = Math.min(...entries.map((entry) => entry.index));
      const remaining = list.filter((el) => !idSet.has(el.id));
      remaining.splice(insertAt, 0, group);
      if (entries[0].parent) entries[0].parent.children = remaining;
      else page.elements = remaining;
      return { op: index, kind, pageId: page.id, groupId: group.id };
    },
    ungroup_elements: (doc, op, index, state) => {
      const kind = 'ungroup_elements';
      const page = findPageForElement(doc, op, index);
      const entry = findElementEntry(page.elements, op.elementId);
      if (!entry)
        throw new Error(`op[${index}] ungroup_elements: unknown element "${op.elementId}"`);
      if (entry.el.type !== 'group')
        throw new Error(`op[${index}] ungroup_elements: element is not a group`);
      const group = entry.el;
      const kids = ungroupChildren(group);
      const next = entry.list.slice();
      next.splice(entry.index, 1, ...kids);
      if (entry.parent) entry.parent.children = next;
      else page.elements = next;
      return { op: index, kind, pageId: page.id, elementIds: kids.map((kid) => kid.id) };
    },
  };
}
