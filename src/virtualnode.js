const exparser = require('miniprogram-exparser');
const CONSTANT = require('./constant');
const _ = require('./utils');

const transitionKeys = ['transition', 'transitionProperty', 'transform', 'transformOrigin', 'webkitTransition', 'webkitTransitionProperty', 'webkitTransform', 'webkitTransformOrigin'];

class VirtualNode {
  constructor(options = {}) {
    this.type = options.type;
    this.tagName = options.tagName;
    this.content = String(options.content || '');
    this.key = options.key;
    this.children = options.children || [];
    this.generics = options.generics;
    this.attrs = options.attrs || [];
    this.event = options.event || [];
  }

  /**
   * append a child virtual node
   */
  appendChild(VirtualNode) {
    this.children.push(VirtualNode);
  }

  /**
   * set attrs to exparser node
   */
  setAttrs(exparserNode, data = {}) {
    let attrs = this.attrs;
    let hasDelayedProps = false;
    let isComponentNode = exparserNode instanceof exparser.Component;
    let dataProxy = exparser.Component.getDataProxy(exparserNode);
    let needDoUpdate = false;

    exparserNode.dataset = exparserNode.dataset || {};

    for (let attr of attrs) {
      let name = attr.name;
      let value = attr.value;
      let matches = null;

      if (exparserNode.is === 'slot' && exparserNode instanceof exparser.VirtualNode && name === 'name') {
        // slot name
        exparser.Element.setSlotName(exparserNode, value);
      } else if (name === 'id' || name === 'slot' || (isComponentNode && name === 'class')) {
        // common properties
        exparserNode[name] = value || '';
      } else if (isComponentNode && name === 'style') {
        // style
        if (exparserNode.$$) {
          let animationStyle = exparserNode.__animationStyle || {};

          animationStyle = transitionKeys.map(key => {
            let styleValue = animationStyle[key.replace('webkitT', 't')];

            return styleValue ||styleValue === 0 ? `${key.replace(/([A-Z]{1})/g, char => `-${char.toLowerCase()}`)}:${styleValue}` : '';
          }).filter(item => !!item.trim()).join(';');

          exparserNode.setNodeStyle(_.transformRpx(value, true) + animationStyle);
        }
      } else if (isComponentNode && exparser.Component.hasPublicProperty(node, name)) {
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
    // if (matches = propName.match(/^(capture-)?(bind|catch):?(.+)$/)) {
    //   bindEvent(tm, node, matches[3], propValue, matches[2] === 'catch', matches[1])
    //   if(inDevtoolsWebview() && !isDataThread()) node.setAttribute('exparser:info-attr-' + propName, propValue)
    //   continue
    // }
    // if (propName.slice(0, 2) === 'on') {
    //   bindEvent(tm, node, propName.slice(2), propValue, false, false)
    //   continue
    // }
  }

  /**
   * render to a exparser node
   */
  render(shadowRootHost, shadowRoot) {
    let type = this.type;
    let tagName = this.tagName;

    if (type === CONSTANT.TYPE_TEXT) {
      return exparser.createTextNode(this.content);
    }

    let exparserNode;

    if (type === CONSTANT.TYPE_ROOT) {
      exparserNode = shadowRoot = exparser.ShadowRoot.create(shadowRootHost);
    } else if (type === CONSTANT.TYPE_SLOT) {
      exparserNode = exparser.VirtualNode.create(tagName);
      exparser.Element.setSlotName(exparserNode, '');
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

    return exparserNode;
  }

  /**
   * diff
   */
  diff() {
    
  }
}

module.exports = VirtualNode;
