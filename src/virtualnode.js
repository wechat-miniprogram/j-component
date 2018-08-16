const exparser = require('miniprogram-exparser');
const CONSTANT = require('./constant');
const _ = require('./utils');
const diff =require('./diff');

const transitionKeys = ['transition', 'transitionProperty', 'transform', 'transformOrigin', 'webkitTransition', 'webkitTransitionProperty', 'webkitTransform', 'webkitTransformOrigin'];

class VirtualNode {
  constructor(options = {}) {
    this.type = options.type;
    this.tagName = options.tagName || '';
    this.componentId = options.componentId || '';
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
    let componentId = this.componentId || undefined;

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
      let componentTagName = _.getTagName(componentId || tagName) || tagName;
      let componentName = componentId || tagName;
      exparserNode = shadowRoot.createComponent(componentTagName, componentName, this.generics);
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
    diff.diffSubTree(this, newVirtualTree);
  }

  
}

module.exports = VirtualNode;
