const CONSTANT = require('./constant');
const VirtualNode = require('./virtualnode');
const Expression = require('./expression');

class JNode {
  constructor(options = {}) {
    this.type = options.type;
    this.tagName = options.tagName;
    this.root = options.root || this; // root node's root is this
    this.parent = options.parent;
    this.index = options.index || 0;
    this.content = options.content && Expression.getExpression(options.content);
    this.attrs = options.attrs || [];
    this.event = options.event || {};
    this.statement = options.statement || {}; // if/for statement
    this.children = options.children || [];
    this.generics = options.generics;
    this.componentManager = options.componentManager; // owner component manager instance

    // for root
    this.data = {};

    // for wxs
    this.wxsModuleName = '';

    this.checkAttrs();
  }

  /**
   * check attrs
   */
  checkAttrs() {
    let type = this.type
    let attrs = this.attrs

    for (let attr of attrs) {
      let name = attr.name
      let value = attr.value

      if (type === CONSTANT.TYPE_WXS && name === 'module') {
        this.wxsModuleName = value;
      }
    }
  }

  /**
   * set parent and index
   */
  setParent(parent, index = 0) {
    if (!parent) return;

    this.parent = parent;
    this.index = index;
  }

  /**
   * append a child node
   */
  appendChild(node) {
    this.children.push(node);
  }

  /**
   * set wxs content
   */
  setWxsContent(content) {
    if (!this.wxsModuleName) return;

    let func = new Function('require', 'module', content);
    let req = () => {}; // require function
    let mod = { exports: {} }; // modules

    func.call(null, req, mod);

    this.root.data[this.wxsModuleName] = mod.exports; // set in root's data
  }

  /**
   * get next sibling node
   */
  nextSibling() {
    return this.parent && this.parent.children[this.index + 1];
  }

  /**
   * get previous sibling node
   */
  previousSibling() {
    return this.parent && this.parent.children[this.index - 1];
  }

  /**
   * check if condition statement
   */
  checkIf(data) {
    let statement = this.statement;

    if (!statement.if) return true;

    return Expression.calcExpression(statement.if, data);
  }

  /**
   * check elif condition statement
   */
  checkElif(data) {
    let statement = this.statement;

    if (!statement.elif) return true;

    return this.checkPreviousCondition(data) ? false : Expression.calcExpression(statement.elif, data);
  }

  /**
   * check else condition statement
   */
  checkElse(data) { 
    let statement = this.statement;

    if (!statement.else) return true;

    return !this.checkPreviousCondition(data);
  }

  /**
   * check previous condition statement
   */
  checkPreviousCondition(data) {
    let previousSibling = this.previousSibling();

    if (previousSibling) {
      let statement = previousSibling.statement;

      if (previousSibling.type !== CONSTANT.TYPE_IF) return false; // not if node
      if (!statement.if && !statement.elif) return false; // not have condition statement 
      if (statement.if) return previousSibling.checkIf(data);
      if (statement.elif) return previousSibling.checkElif(data);
    }

    return false;
  }

  /**
   * generate to a virtual tree
   */
  generate(options = {}) {
    let data = options.data = options.data || {};
    let statement = this.statement;

    // check wxs
    if (this.type === CONSTANT.TYPE_WXS) {
      return null;
    }

    // check if / elif / else
    if (this.type === CONSTANT.TYPE_IF && (!this.checkIf(data) || !this.checkElif(data) || !this.checkElse(data))) {
      return null;
    }

    let children = [];

    // check has children
    if (this.children && this.children.length) {
      if (this.type === CONSTANT.TYPE_FOR) {
        // check for
        let list = Expression.calcExpression(statement.for, data);
        options.extra = options.extra || {};

        for (let i = 0, len = list.length; i < len; i++) {
          let { forItem: bakItem, forIndex: bakIndex } = options.extra;

          options.extra.forItem = list[i];
          options.extra.forIndex = i;

          this.children.forEach(node => {
            let virtualNode = node.generate(options);
            children.push(virtualNode);
          });

          options.extra.forItem = bakItem;
          options.extra.forIndex = bakIndex;
        }
      } else if (this.type === CONSTANT.TYPE_FORITEM) {
        // check for item
        options.extra = options.extra || {};
        let { forItem, forIndex } = options.extra;
        let { forItem: bakItem, forIndex: bakIndex } = data;
        let bakKey = options.forKey;
        data[statement.forItem] = forItem; // list item
        data[statement.forIndex] = forIndex; // list index
        if (statement.forKey) options.forKey = statement.forKey === '*this' ? forItem : forItem[statement.forKey]; // list key

        children = this.children.map(node => node.generate(options)).filter(virtualNode => !!virtualNode);

        data[statement.forItem] = bakItem;
        data[statement.forIndex] = bakIndex;
        options.forKey = bakKey;
      } else {
        // normal
        children = this.children.map(node => node.generate(options)).filter(virtualNode => !!virtualNode);
      }
    }

    return new VirtualNode({
      type: this.type,
      tagName: this.tagName,
      content: Expression.calcExpression(this.content, data),
      key: options.forKey,
      children,
      generics: options.generics,
    });
  }
}

module.exports = JNode;
