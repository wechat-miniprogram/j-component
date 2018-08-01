// const exparser = require('./lib/exparser.min.js');
const exparser = require('./lib/exparser.debug.js');
const CONSTANT = require('./constant');

class VirtualNode {
  constructor(options = {}) {
    this.type = options.type;
    this.tagName = options.tagName;
    this.content = String(options.content || '');
    this.key = options.key;
    this.children = options.children || [];
    this.generics = options.generics;
  }

  /**
   * append a child virtual node
   */
  appendChild(VirtualNode) {
    this.children.push(VirtualNode);
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
