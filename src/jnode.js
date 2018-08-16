const CONSTANT = require('./constant');
const Expression = require('./expression');

class JNode {
  constructor(options = {}) {
    this.type = options.type;
    this.tagName = options.tagName || '';
    this.componentId = options.componentId;
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

    // for slot
    this.slotName = '';

    this.checkAttrs();
  }

  /**
   * check attrs
   */
  checkAttrs() {
    let type = this.type
    let attrs = this.attrs
    let filterAttrs = []

    for (let attr of attrs) {
      let name = attr.name
      let value = attr.value

      if (type === CONSTANT.TYPE_WXS && name === 'module') {
        // wxs module
        this.wxsModuleName = value || '';
      } else if (type === CONSTANT.TYPE_SLOT && name === 'name') {
        // slot name
        this.slotName = value || '';
      } else {
        if (value) attr.value = Expression.getExpression(value);
        filterAttrs.push(attr);
      }
    }

    this.attrs = filterAttrs;
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

    while (previousSibling) {
      let statement = previousSibling.statement;

      if (previousSibling.type !== CONSTANT.TYPE_IF) return false; // not if node
      if (!statement.if && !statement.elif) return false; // not have condition statement 
      if (statement.if) return previousSibling.checkIf(data);

      if (statement.elif) {
        if (!previousSibling.checkElif(data)) {
          previousSibling = previousSibling.previousSibling();
        } else {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * generate to a vt
   */
  generate(options = {}) {
    let data = options.data = options.data || {};
    let statement = this.statement;
    let key = options.key || '';

    delete options.key; // not cross passing

    // check include
    if (this.type === CONSTANT.TYPE_INCLUDE) {
      return null;
    }

    // check import
    if (this.type === CONSTANT.TYPE_IMPORT) {
      return null;
    }
    
    // check template
    if (this.type === CONSTANT.TYPE_TEMPLATE) {
      return null;
    }

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
            let vt = node.generate(options);
            children.push(vt);
          });

          options.extra.forItem = bakItem;
          options.extra.forIndex = bakIndex;
        }
      } else if (this.type === CONSTANT.TYPE_FORITEM) {
        // check for item
        options.extra = options.extra || {};
        let { forItem, forIndex } = options.extra;
        let { forItem: bakItem, forIndex: bakIndex } = data;
        data[statement.forItem] = forItem; // list item
        data[statement.forIndex] = forIndex; // list index
        if (statement.forKey) options.key = statement.forKey === '*this' ? forItem : forItem[statement.forKey]; // list key

        children = this.children.map(node => node.generate(options));

        data[statement.forItem] = bakItem;
        data[statement.forIndex] = bakIndex;
      } else {
        // normal
        children = this.children.map(node => node.generate(options));
      }
    }

    // filter children
    let filterChildren = [];
    for (let child of children) {
      if (!child) continue;

      if (child.type === CONSTANT.TYPE_BLOCK) {
        // block
        let grandChildren = child.children;
        for (let grandChild of grandChildren) {
          filterChildren.push(grandChild);
        }
      } else {
        filterChildren.push(child);
      }
    }

    // check attrs
    let attrs = [];
    for (let { name, value } of this.attrs) {
      attrs.push({
        name,
        value: value ? Expression.calcExpression(value, data) : value,
      });
    }

    // calc content
    let content = Expression.calcExpression(this.content, data);
    content = content !== undefined ? String(content) : '';

    return {
      type: this.type,
      tagName: this.tagName,
      componentId: this.componentId,
      content,
      key,
      children: filterChildren,
      generics: this.generics,
      attrs,
      event: this.event,
      slotName: this.slotName,
    };
  }
}

module.exports = JNode;
