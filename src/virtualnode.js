const exparser = require('miniprogram-exparser');
const CONSTANT = require('./constant');
const _ = require('./utils');

const transitionKeys = ['transition', 'transitionProperty', 'transform', 'transformOrigin', 'webkitTransition', 'webkitTransitionProperty', 'webkitTransform', 'webkitTransformOrigin'];

class VirtualNode {
  constructor(options = {}) {
    this.type = options.type;
    this.tagName = options.tagName || '';
    this.content = options.content !== undefined ? String(options.content) : '';
    this.key = options.key || '';
    this.children = options.children || [];
    this.generics = options.generics;
    this.attrs = options.attrs || [];
    this.event = options.event || {};
    this.slotName = options.slotName || '';
  }

  /**
   * append a child virtual node
   */
  appendChild(virtualNode) {
    this.children.push(virtualNode);
  }

  /**
   * set attrs to exparser node
   */
  setAttrs(exparserNode) {
    let attrs = this.attrs;
    let hasDelayedProps = false;
    let isComponentNode = exparserNode instanceof exparser.Component;
    let dataProxy = exparser.Component.getDataProxy(exparserNode);
    let needDoUpdate = false;

    exparserNode.dataset = exparserNode.dataset || {};

    for (let { name, value } of attrs) {
      if (name === 'id' || name === 'slot' || (isComponentNode && name === 'class')) {
        // common properties
        exparserNode[name] = value || '';
      } else if (isComponentNode && name === 'style') {
        // style
        if (exparserNode.$$) {
          let animationStyle = exparserNode.__animationStyle || {};

          animationStyle = transitionKeys.map(key => {
            let styleValue = animationStyle[key.replace('webkitT', 't')];

            return styleValue !== undefined ? `${key.replace(/([A-Z]{1})/g, char => `-${char.toLowerCase()}`)}:${styleValue}` : '';
          }).filter(item => !!item.trim()).join(';');

          exparserNode.setNodeStyle(_.transformRpx(value, true) + animationStyle);
        }
      } else if (isComponentNode && exparser.Component.hasPublicProperty(exparserNode, name)) {
        // public properties of exparser node, delay it
        dataProxy.scheduleReplace([name], value);
        needDoUpdate = true;
      } else if(/^data-/.test(name)) {
        // dataset
        exparserNode.dataset[_.dashToCamelCase(name.slice(5).toLowerCase())] = value;
        exparserNode.setAttribute(name, value);
      } else if (isComponentNode && name === 'animation') {
        // animation
        if (exparserNode.$$ && value !== null && typeof value === 'object' && value.actions && value.actions.length > 0) {
          let index = 0;
          let actions = value.actions;
          let length = value.actions.length;
          let step = function() {
            if (index < length) {
              let styleObject = _.animationToStyle(actions[index]);
              let extraStyle = styleObject.style;
              
              transitionKeys.forEach(key => {
                exparserNode.$$.style[key] = styleObject[key.replace('webkitT', 't')];
              });

              Object.keys(extraStyle).forEach(key => {
                exparserNode.$$.style[key] = _.transformRpx(extraStyle[key]);
              });

              exparserNode.__animationStyle = styleObject;
            }
          };

          exparserNode.addListener('transitionend', () => {
            index += 1;
            step();
          })
          step();
        }
      } else if (isComponentNode && exparserNode.hasExternalClass(_.camelToDashCase(name))) {
        // external classes
        exparserNode.setExternalClass(_.camelToDashCase(name), value);
      }
    }

    if (needDoUpdate) dataProxy.doUpdates(true);
  }

  /**
   * set event to exparser node
   */
  setEvent(exparserNode) {
    let convertEventTarget = (target, currentTarget) => {
      if (currentTarget && (target instanceof exparser.VirtualNode) && !target.id && !Object.keys(target.dataset).length) {
        // the target is slot without id and dataset
        target = currentTarget;
      }

      return {
        id: target.id,
        offsetLeft: target.$$ && target.$$.offsetLeft || 0,
        offsetTop: target.$$ && target.$$.offsetTop || 0,
        dataset: target.dataset,
      };
    };

    Object.keys(this.event).forEach(key => {
      let { name, isCapture, isCatch, handler } = this.event[key];

      if (!handler) return;

      exparserNode.addListener(name, function(evt) {
        let shadowRoot = exparserNode.ownerShadowRoot;

        if (shadowRoot) {
          let host = shadowRoot.getHostNode();
          let writeOnly = exparser.Component.getComponentOptions(host).writeOnly;

          if (!writeOnly) {
            let caller = exparser.Element.getMethodCaller(host);

            if (typeof caller[handler] !== 'function') {
              console.warn(`Component "${host.is}" does not have a method "${handler}" to handle event "${evt.type}"`);
            } else {
              caller[handler]({
                type: evt.type,
                timeStamp: evt.timeStamp,
                target: convertEventTarget(evt.target, this),
                currentTarget: convertEventTarget(this, null),
                detail: evt.detail,
                touches: evt.touches,
                changedTouches: evt.changedTouches,
              });
            }
          }
        }

        if (isCatch) return false;
      }, { capture: isCapture });
    });
  }

  /**
   * render to a exparser node
   */
  render(shadowRootHost, shadowRoot) {
    let type = this.type;
    let tagName = this.tagName;

    if (type === CONSTANT.TYPE_TEXT) {
      this.exparserNode = exparser.createTextNode(this.content);
      return this.exparserNode;
    }

    let exparserNode;

    if (type === CONSTANT.TYPE_ROOT) {
      exparserNode = shadowRoot = exparser.ShadowRoot.create(shadowRootHost);
    } else if (type === CONSTANT.TYPE_SLOT) {
      exparserNode = exparser.VirtualNode.create(tagName);
      exparser.Element.setSlotName(exparserNode, this.slotName);
    } else if (type === CONSTANT.TYPE_TEMPLATE || type === CONSTANT.TYPE_IF || type === CONSTANT.TYPE_FOR || type === CONSTANT.TYPE_FORITEM) {
      exparserNode = exparser.VirtualNode.create(tagName);
      exparser.Element.setInheritSlots(exparserNode);
    } else {
      exparserNode = shadowRoot.createComponent(this.tagName, undefined, this.generics);
    }

    this.setAttrs(exparserNode);
    this.setEvent(exparserNode);

    // children
    this.children.forEach(virtualNode => {
      let childExparserNode = virtualNode.render(null, shadowRoot);
      exparserNode.appendChild(childExparserNode);
    });

    this.exparserNode = exparserNode;

    return exparserNode;
  }

  /**
   * diff two tree
   */
  diff(newVirtualTree) {
    VirtualNode.diffSubTree(this, newVirtualTree);
  }

  /**
   * diff two sub tree
   */
  static diffSubTree(oldT, newT) {
    let exparserNode = oldT.exparserNode;
    let parentExparserNode = exparserNode.parentNode;

    newT.exparserNode = exparserNode; // update new virtual tree exparser node

    if (!newT) {
      // remove
      if (parentExparserNode) parentExparserNode.removeChild(exparserNode);
    } else if (oldT.type === CONSTANT.TYPE_TEXT) {
      // update text virtual node
      if (newT.type !== CONSTANT.TYPE_TEXT || newT.content !== oldT.content) {
        if (parentExparserNode) {
          let newExparserNode = newT.render(null, parentExparserNode.ownerShadowRoot);
          parentExparserNode.replaceChild(newExparserNode, exparserNode);
        }
      }
    } else {
      // update other virtual node
      if (newT.type === CONSTANT.TYPE_TEXT) {
        // new virtual node is text
        if (parentExparserNode) {
          let newExparserNode = newT.render(null, parentExparserNode.ownerShadowRoot);
          parentExparserNode.replaceChild(newExparserNode, exparserNode);
        }
      } else if (newT.type === oldT.type && newT.tagName === oldT.tagName && newT.key === oldT.key) {
        // check attrs
        let attrs = VirtualNode.diffAttrs(oldT.attrs, newT.attrs);
        if (attrs) {
          // update attrs
          newT.attrs = attrs;
          newT.setAttrs(exparserNode);
        }

        // check children
        let oldChildren = oldT.children;
        let newChildren = newT.children;
        let diffs = oldT.type === CONSTANT.TYPE_IF || oldT.type === CONSTANT.TYPE_FOR || oldT.type === CONSTANT.TYPE_FORITEM ? VirtualNode.diffList(oldChildren, newChildren) : { children: newChildren, moves: null }; // only statement need diff

        // diff old child's subtree
        for (let i = 0, len = oldChildren.length; i < len; i++) {
          let oldChild = oldChildren[i];
          let newChild = diffs.children[i];

          if (newChild) VirtualNode.diffSubTree(oldChild, newChild);
        }
        if (diffs.moves) {
          // children remove\insert\reorder
          let { removes, inserts } = diffs.moves;
          let children = exparserNode.childNodes;
          let newChildren = newT.children;

          inserts = inserts.map(({ oldIndex, index }) => {
            return { 
              newExparserNode: children[oldIndex] || newChildren[index].render(null, exparserNode.ownerShadowRoot),
              index,
            };
          });

          removes.forEach(index => exparserNode.removeChild(children[index]));
          inserts.forEach(({ newExparserNode, index }) => exparserNode.insertBefore(newExparserNode, children[index]));
        }
      } else if (parentExparserNode) {
        let newExparserNode = newT.render(null, parentExparserNode.ownerShadowRoot);
        parentExparserNode.replaceChild(newExparserNode, exparserNode);
      }
    }
  }

  /**
   * diff attrs
   */
  static diffAttrs(oldAttrs, newAttrs) {
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
  static diffList(oldList, newList) {
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
}

module.exports = VirtualNode;
