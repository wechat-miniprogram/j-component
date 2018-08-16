const exparser = require('miniprogram-exparser');
const CONSTANT = require('./constant');
const _ = require('./utils');

const transitionKeys = ['transition', 'transitionProperty', 'transform', 'transformOrigin', 'webkitTransition', 'webkitTransitionProperty', 'webkitTransform', 'webkitTransformOrigin'];

/**
 * update attrs for exparser node
 */
function updateAttrs(exparserNode, attrs = []) {
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
      if (exparserNode.$$ && value && value.actions && value.actions.length > 0) {
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
 * update event for exparser node
 */
function updateEvent(exparserNode, event = {}) {
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

  Object.keys(event).forEach(key => {
    let { name, isCapture, isCatch, handler } = event[key];

    if (!handler) return;

    event[key].id = exparser.addListenerToElement(exparserNode, name, function(evt) {
      let shadowRoot = exparserNode.ownerShadowRoot;

      if (shadowRoot) {
        let host = shadowRoot.getHostNode();
        let writeOnly = exparser.Component.getComponentOptions(host).writeOnly;

        if (!writeOnly) {
          let caller = exparser.Element.getMethodCaller(host);

          if (typeof caller[handler] === 'function') {
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
function renderExparserNode(options, shadowRootHost, shadowRoot) {
  let type = options.type;
  let tagName = options.tagName;
  let componentId = options.componentId;
  let exparserNode;

  if (type === CONSTANT.TYPE_TEXT) {
    exparserNode = exparser.createTextNode(options.content); // save exparser node
  } else {
    if (type === CONSTANT.TYPE_ROOT) {
      exparserNode = shadowRoot = exparser.ShadowRoot.create(shadowRootHost);
    } else if (type === CONSTANT.TYPE_SLOT) {
      exparserNode = exparser.VirtualNode.create(tagName);
      exparser.Element.setSlotName(exparserNode, options.slotName);
    } else if (type === CONSTANT.TYPE_TEMPLATE || type === CONSTANT.TYPE_IF || type === CONSTANT.TYPE_FOR || type === CONSTANT.TYPE_FORITEM) {
      exparserNode = exparser.VirtualNode.create(tagName);
      exparser.Element.setInheritSlots(exparserNode);
    } else {
      let componentTagName = _.getTagName(componentId || tagName) || tagName;
      let componentName = componentId || tagName;
      exparserNode = shadowRoot.createComponent(componentTagName, componentName, options.generics);
    }

    updateAttrs(exparserNode, options.attrs);
    updateEvent(exparserNode, options.event);

    // children
    options.children.forEach(vt => {
      let childExparserNode = renderExparserNode(vt, null, shadowRoot);
      exparserNode.appendChild(childExparserNode);
    });

  }

  options.exparserNode = exparserNode; // save exparser node

  return exparserNode;
}

module.exports = {
  updateAttrs,
  updateEvent,
  renderExparserNode,
};
