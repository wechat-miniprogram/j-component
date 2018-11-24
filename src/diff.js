const exparser = require('miniprogram-exparser');
const CONSTANT = require('./constant');
const render = require('./render');

/**
 * diff 两棵虚拟树
 */
function diffVt(oldVt, newVt) {
  let node = oldVt.exparserNode;
  let parent = node.parentNode;

  newVt.exparserNode = node; // 更新新虚拟树的 exparser 节点

  if (!newVt) {
    // 删除
    if (parent) parent.removeChild(node);
  } else if (oldVt.type === CONSTANT.TYPE_TEXT) {
    // 更新文本节点
    if (newVt.type !== CONSTANT.TYPE_TEXT || newVt.content !== oldVt.content) {
      if (parent) {
        let newNode = render.renderExparserNode(newVt, null, parent.ownerShadowRoot);
        parent.replaceChild(newNode, node);
      }
    }
  } else {
    // 更新其他节点
    if (newVt.type === CONSTANT.TYPE_TEXT) {
      // 新节点是文本节点
      if (parent) {
        let newNode = render.renderExparserNode(newVt, null, parent.ownerShadowRoot);
        parent.replaceChild(newNode, node);
      }
    } else if (newVt.type === oldVt.type && newVt.componentId === oldVt.componentId && newVt.key === oldVt.key) {
      // 检查属性
      let attrs = diffAttrs(oldVt.attrs, newVt.attrs);
      if (attrs) {
        // 更新属性
        newVt.attrs = attrs;
        render.updateAttrs(node, attrs);
      }

      // 检查事件
      Object.keys(oldVt.event).forEach(key => {
        let { name, isCapture, id } = oldVt.event[key];

        exparser.removeListenerFromElement(node, name, id, { capture: isCapture });
      });
      render.updateEvent(node, newVt.event);

      // 检查子节点
      let oldChildren = oldVt.children;
      let newChildren = newVt.children;
      let diffs = oldVt.type === CONSTANT.TYPE_IF || oldVt.type === CONSTANT.TYPE_FOR || oldVt.type === CONSTANT.TYPE_FORITEM ? diffList(oldChildren, newChildren) : { children: newChildren, moves: null }; // only statement need diff

      // diff 子节点树
      for (let i = 0, len = oldChildren.length; i < len; i++) {
        let oldChild = oldChildren[i];
        let newChild = diffs.children[i];

        if (newChild) diffVt(oldChild, newChild);
      }
      if (diffs.moves) {
        // 子节点的删除/插入/重排
        let { removes, inserts } = diffs.moves;
        let children = node.childNodes;
        let newChildren = newVt.children;

        inserts = inserts.map(({ oldIndex, index }) => {
          return { 
            newNode: children[oldIndex] || render.renderExparserNode(newChildren[index], null, node.ownerShadowRoot),
            index,
          };
        });

        removes.forEach(index => node.removeChild(children[index]));
        inserts.forEach(({ newNode, index }) => node.insertBefore(newNode, children[index]));
      }
    } else if (parent) {
      let newNode = render.renderExparserNode(newVt, null, parent.ownerShadowRoot);
      parent.replaceChild(newNode, node);
    }
  }
}

/**
 * diff 属性
 */
function diffAttrs(oldAttrs, newAttrs) {
  let oldAttrsMap = {};
  let newAttrsMap = {};
  let retAttrs = [];
  let isChange = false;

  oldAttrs.forEach(attr => oldAttrsMap[attr.name] = attr.value);

  for (let attr of newAttrs) {
    // 添加/更新
    newAttrsMap[attr.name] = attr.value;
    retAttrs.push(attr);

    if (oldAttrsMap[attr.name] === undefined || oldAttrsMap[attr.name] !== attr.value) isChange = true;
  }

  for (let attr of oldAttrs) {
    if (newAttrsMap[attr.name] === undefined) {
      // 删除
      attr.value = undefined;
      retAttrs.push(attr);

      isChange = true;
    }
  }
  
  return isChange ? retAttrs : false;
}

/**
 * diff 列表
 */
function diffList(oldList, newList) {
  let oldKeyMap = {}; // 旧列表的 key-index 映射表
  let newKeyMap = {}; // 新列表的 key-index 映射表
  let oldFreeList = []; // 旧列表中没有 key 的项的 index 列表
  let newFreeList = []; // 新列表中没有 key 的项的 index 列表

  oldList.forEach((item, index) => {
    if (item.key) {
      // 拥有 key
      if (Object.prototype.hasOwnProperty.call(oldKeyMap, item.key)) item.key = '';
      else oldKeyMap[item.key] = index;
    } else {
      // 没有 key
      oldFreeList.push(index);
    }
  });
  newList.forEach((item, index) => {
    if (item.key) {
      // 拥有 key
      if (Object.prototype.hasOwnProperty.call(newKeyMap, item.key)) newFreeList.push(index);
      else newKeyMap[item.key] = index;
    } else {
      // 没有 key
      newFreeList.push(index);
    }
  });

  let children = [];
  let removes = [];
  let inserts = [];

  // 检查旧列表
  for (let i = 0, j = 0; i < oldList.length; i++) {
    let item = oldList[i];
    let key = item.key;

    if (key) {
      if (Object.prototype.hasOwnProperty.call(newKeyMap, key)) {
        // 在新列表中存在
        children.push(newList[newKeyMap[key]]);
      } else {
        // 需要从新列表中删除
        removes.push(i);
        children.push(null);
      }
    } else {
      if (j < newFreeList.length) {
        // 在新列表中存在
        children.push(newList[newFreeList[j++]]);
      } else {
        // 需要从新列表中删除
        removes.push(i);
        children.push(null);
      }
    }
  }
  removes = removes.reverse(); // 从尾往头进行删除

  // 检查新列表
  let hasCheckIndexMap = {};
  for (let i = 0, j = 0, k = 0, len = newList.length; i < len; i++) {
    let item = newList[i];
    let key = item.key;

    while (children[j] === null || hasCheckIndexMap[j]) j++; // 跳过已被删除/检查的项

    if (key) {
      if (Object.prototype.hasOwnProperty.call(oldKeyMap, key) && children[j]) {
        // 在旧列表中存在
        if (children[j].key === key) {
          // 拥有同样的 key
          j++;
        } else {
          // 拥有不同的 key
          let oldIndex = oldKeyMap[key];
          hasCheckIndexMap[oldIndex] = true;
          if (oldIndex !== i) inserts.push({ oldIndex, index: i });
        }
      } else {
        // 插入新项
        inserts.push({ oldIndex: -1, index: i });
      }
    } else {
      if (k < oldFreeList.length) {
        // 在旧列表中存在
        let oldIndex = oldFreeList[k++];
        hasCheckIndexMap[oldIndex] = true;
        if (oldIndex !== i) inserts.push({ oldIndex, index: i });
      } else {
        // 插入新项
        inserts.push({ oldIndex: -1, index: i });
      }
    }
  }

  return {
    children,
    moves: { removes, inserts },
  };
}

module.exports = {
  diffVt,
  diffAttrs,
  diffList,
};
