const exparser = require('miniprogram-exparser');
const CONSTANT = require('./constant');
const render = require('./render');

/**
 * diff two sub tree
 */
function diffSubTree(oldVt, newVt) {
  let exparserNode = oldVt.exparserNode;
  let parentExparserNode = exparserNode.parentNode;

  newVt.exparserNode = exparserNode; // update new vt's exparser node

  if (!newVt) {
    // remove
    if (parentExparserNode) parentExparserNode.removeChild(exparserNode);
  } else if (oldVt.type === CONSTANT.TYPE_TEXT) {
    // update for text node
    if (newVt.type !== CONSTANT.TYPE_TEXT || newVt.content !== oldVt.content) {
      if (parentExparserNode) {
        let newExparserNode = render.renderExparserNode(newVt, null, parentExparserNode.ownerShadowRoot);
        parentExparserNode.replaceChild(newExparserNode, exparserNode);
      }
    }
  } else {
    // update for other node
    if (newVt.type === CONSTANT.TYPE_TEXT) {
      // new vt is text
      if (parentExparserNode) {
        let newExparserNode = render.renderExparserNode(newVt, null, parentExparserNode.ownerShadowRoot);
        parentExparserNode.replaceChild(newExparserNode, exparserNode);
      }
    } else if (newVt.type === oldVt.type && newVt.componentId === oldVt.componentId && newVt.key === oldVt.key) {
      // check attrs
      let attrs = diffAttrs(oldVt.attrs, newVt.attrs);
      if (attrs) {
        // update attrs
        newVt.attrs = attrs;
        render.updateAttrs(exparserNode, attrs);
      }

      // check event
      Object.keys(oldVt.event).forEach(key => {
        let { name, isCapture, id } = oldVt.event[key];

        exparser.removeListenerFromElement(exparserNode, name, id, { capture: isCapture });
      });
      render.updateEvent(exparserNode, newVt.event);

      // check children
      let oldChildren = oldVt.children;
      let newChildren = newVt.children;
      let diffs = oldVt.type === CONSTANT.TYPE_IF || oldVt.type === CONSTANT.TYPE_FOR || oldVt.type === CONSTANT.TYPE_FORITEM ? diffList(oldChildren, newChildren) : { children: newChildren, moves: null }; // only statement need diff

      // diff old child's subtree
      for (let i = 0, len = oldChildren.length; i < len; i++) {
        let oldChild = oldChildren[i];
        let newChild = diffs.children[i];

        if (newChild) diffSubTree(oldChild, newChild);
      }
      if (diffs.moves) {
        // children remove\insert\reorder
        let { removes, inserts } = diffs.moves;
        let children = exparserNode.childNodes;
        let newChildren = newVt.children;

        inserts = inserts.map(({ oldIndex, index }) => {
          return { 
            newExparserNode: children[oldIndex] || render.renderExparserNode(newChildren[index], null, exparserNode.ownerShadowRoot),
            index,
          };
        });

        removes.forEach(index => exparserNode.removeChild(children[index]));
        inserts.forEach(({ newExparserNode, index }) => exparserNode.insertBefore(newExparserNode, children[index]));
      }
    } else if (parentExparserNode) {
      let newExparserNode = render.renderExparserNode(newVt, null, parentExparserNode.ownerShadowRoot);
      parentExparserNode.replaceChild(newExparserNode, exparserNode);
    }
  }
}

/**
 * diff attrs
 */
function diffAttrs(oldAttrs, newAttrs) {
  let oldAttrsMap = {};
  let newAttrsMap = {};
  let retAttrs = [];
  let isChange = false;

  oldAttrs.forEach(attr => oldAttrsMap[attr.name] = attr.value);

  for (let attr of newAttrs) {
    // new or update
    newAttrsMap[attr.name] = attr.value;
    retAttrs.push(attr);

    if (oldAttrsMap[attr.name] === undefined || oldAttrsMap[attr.name] !== attr.value) isChange = true;
  }

  for (let attr of oldAttrs) {
    if (newAttrsMap[attr.name] === undefined) {
      // remove
      attr.value = undefined;
      retAttrs.push(attr);

      isChange = true;
    }
  }
  
  return isChange ? retAttrs : false;
}

/**
 * diff list
 */
function diffList(oldList, newList) {
  let oldKeyMap = {}; // key-index map for old list
  let newKeyMap = {}; // key-index map for new list
  let oldFreeList = []; // index list without key for old list
  let newFreeList = []; // index list without key for new list

  oldList.forEach((item, index) => {
    if (item.key) {
      // has key
      if (Object.prototype.hasOwnProperty.call(oldKeyMap, item.key)) item.key = '';
      else oldKeyMap[item.key] = index;
    } else {
      // without key
      oldFreeList.push(index);
    }
  });
  newList.forEach((item, index) => {
    if (item.key) {
      // has key
      if (Object.prototype.hasOwnProperty.call(newKeyMap, item.key)) newFreeList.push(index);
      else newKeyMap[item.key] = index;
    } else {
      // without key
      newFreeList.push(index);
    }
  });

  let children = [];
  let removes = [];
  let inserts = [];

  // check old list
  for (let i = 0, j = 0; i < oldList.length; i++) {
    let item = oldList[i];
    let key = item.key;

    if (key) {
      if (Object.prototype.hasOwnProperty.call(newKeyMap, key)) {
        // exist in new list
        children.push(newList[newKeyMap[key]]);
      } else {
        // remove from new list
        removes.push(i);
        children.push(null);
      }
    } else {
      if (j < newFreeList.length) {
        // exist in new list
        children.push(newList[newFreeList[j++]]);
      } else {
        // remove from new list
        removes.push(i);
        children.push(null);
      }
    }
  }
  removes = removes.reverse(); // delete from end to start

  // check new list
  let hasCheckIndexMap = {};
  for (let i = 0, j = 0, k = 0, len = newList.length; i < len; i++) {
    let item = newList[i];
    let key = item.key;

    while (children[j] === null || hasCheckIndexMap[j]) j++; // skip remove and checked item

    if (key) {
      if (Object.prototype.hasOwnProperty.call(oldKeyMap, key) && children[j]) {
        // exist in old list
        if (children[j].key === key) {
          // with same key
          j++;
        } else {
          // witch different key
          let oldIndex = oldKeyMap[key];
          hasCheckIndexMap[oldIndex] = true;
          if (oldIndex !== i) inserts.push({ oldIndex, index: i });
        }
      } else {
        // insert new item
        inserts.push({ oldIndex: -1, index: i });
      }
    } else {
      if (k < oldFreeList.length) {
        // exist in old list
        let oldIndex = oldFreeList[k++];
        hasCheckIndexMap[oldIndex] = true;
        if (oldIndex !== i) inserts.push({ oldIndex, index: i });
      } else {
        // insert new item
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
  diffSubTree,
  diffAttrs,
  diffList,
};
