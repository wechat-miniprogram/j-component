const exparser = require('miniprogram-exparser');
const parse = require('./parse');
const CONSTANT = require('./constant');
const JNode = require('./jnode');
const Expression = require('./expression');
const _ = require('./utils');

const CACHE = {};

/**
 * check if/for statement
 */
function filterAttrs(attrs = []) {
  let statement = {};
  let event = {};
  let normalAttrs = [];

  for (let attr of attrs) {
    let name = attr.name;
    let value = attr.value || '';

    if (name === 'wx:if') {
      statement.if = Expression.getExpression(value);
    } else if (name === 'wx:elif') {
      statement.elif = Expression.getExpression(value);
    } else if (name === 'wx:else') {
      statement.else = true;
    } else if (name === 'wx:for') {
      statement.for = Expression.getExpression(value);
    } else if (name === 'wx:for-item') {
      statement.forItem = value;
    } else if (name === 'wx:for-index') {
      statement.forIndex = value;
    } else if (name === 'wx:key') {
      statement.forKey = value;
    } else {
      let res = /^(capture-)?(bind|catch|)(?:\:)?(.*)$/ig.exec(name);

      if (res[2] && res[3]) {
        // event binding
        let isCapture = !!res[1];
        let isCatch = res[2] === 'catch';
        let eventName = res[3];

        event[eventName] = {
          name: eventName,
          isCapture,
          isCatch,
          handler: value,
        };
      } else {
        // normal attr
        normalAttrs.push(attr);
      }
    }
  }

  return {
    statement,
    event,
    normalAttrs,
  };
}

class ComponentManager {
  constructor(name, template, definition = {}) {
    this.name = name;
    this.definition = definition;
    this.using = [];
    this.root = new JNode({
      type: CONSTANT.TYPE_ROOT,
      componentManager: this,
    });

    if (typeof template === 'string') {
      template = template.trim();
      if (template) this.parse(template);
    }

    this.exparserDef = this.registerToExparser();

    CACHE[name] = this;
  }

  /**
   * get component with name
   */
  static get(name) {
    return CACHE[name];
  }

  /**
   * parse the template
   */
  parse(template) {
    let stack = [this.root];

    stack.last = function() {
      return this[this.length - 1];
    };

    parse(template, {
      start: (tagName, attrs, unary) => {
        let type;
        let componentManager;

        if (tagName === 'slot') {
          type = CONSTANT.TYPE_SLOT;
        } else if (tagName === 'template') {
          type = CONSTANT.TYPE_TEMPLATE;
          tagName = 'virtual';
        } else if (tagName === 'block') {
          type = CONSTANT.TYPE_BLOCK;
        } else if (tagName === 'import') {
          type = CONSTANT.TYPE_IMPORT;
        } else if (tagName === 'include') {
          type = CONSTANT.TYPE_INCLUDE;
        } else if (tagName === 'wxs') {
          type = CONSTANT.TYPE_WXS;
        } else if (_.isHtmlTag(tagName)) {
          type = CONSTANT.TYPE_NATIVE;
        } else {
          type = CONSTANT.TYPE_COMPONENT;
          componentManager = ComponentManager.get(tagName);

          if (!componentManager) throw new Error(`component ${tagName} not found`);
          if (this.using.indexOf(tagName) === -1) this.using.push(tagName);
        }

        let { statement, event, normalAttrs } = filterAttrs(attrs);

        let parent = stack.last();
        let node = new JNode({
          type,
          tagName,
          attrs: normalAttrs,
          event,
          generics: {}, // TODO
          componentManager,
          root: this.root,
        });
        let appendNode = node;

        // for statement
        if (statement.for) {
          let itemNode = new JNode({
            type: CONSTANT.TYPE_FORITEM,
            tagName: 'virtual',
            statement: {
              forItem: statement.forItem || 'item',
              forIndex: statement.forIndex || 'index',
              forKey: statement.forKey,
            },
            children: [node],
            root: this.root,
          });
          node.setParent(itemNode, 0); // update parent

          let forNode = new JNode({
            type: CONSTANT.TYPE_FOR,
            tagName: 'wx:for',
            statement: {
              for: statement.for,
            },
            children: [itemNode],
            root: this.root,
          });
          itemNode.setParent(forNode, 0); // update parent

          appendNode = forNode;
        }

        // condition statement
        if (statement.if || statement.elif || statement.else) {
          let ifNode = new JNode({
            type: CONSTANT.TYPE_IF,
            tagName: 'wx:if',
            statement: {
              if: statement.if,
              elif: statement.elif,
              else: statement.else,
            },
            children: [node],
            root: this.root,
          });
          node.setParent(ifNode, 0); // update parent

          appendNode = ifNode;
        }

        if (!unary) {
          stack.push(node);
        }

        appendNode.setParent(parent, parent.children.length); // update parent
        parent.appendChild(appendNode);
      },
      end: tagName => {
        stack.pop();
      },
      text: content => {
        content = content.trim();
        if (!content) return;

        let parent = stack.last();
        if (parent.type === CONSTANT.TYPE_WXS) {
          // wxs, transform content to a function
          parent.setWxsContent(content);
        } else {
          parent.appendChild(new JNode({
            type: CONSTANT.TYPE_TEXT,
            content: content.replace(/[\n\r\t\s]+/g, ' '),
            parent,
            index: parent.children.length,
            componentManager: this,
            root: this.root,
          }));
        }
      }
    });

    if (stack.length !== 1) throw new Error(`build ast error: ${template}`);
  }

  /**
   * get ast
   */
  getAst() {
    return this.root;
  }

  /**
   * register to exparser
   */
  registerToExparser() {
    let definition = this.definition;
    let options = definition.options || {};

    // adjust properties
    let properties = definition.properties || {};
    Object.keys(properties).forEach(key => {
      let value = properties[key];
      if (value === null) {
        properties[key] = { type: null };
      } else if (value === Number || value === String || value === Boolean || value === Object || value === Array) {
        properties[key] = { type: value.name };
      } else if (value.public === undefined || value.public) {
        properties[key] = {
          type: value.type === null ? null : value.type.name,
          value: value.value,
        };
      }
    });

    // let definitionFilter = exparser.Behavior.callDefinitionFilter(definition);
    let exparserDef = {
      is: this.name,
      using: this.using,
      generics: [], // TODO
      template: {
        func: this.root.generate.bind(this.root),
        data: this.root.data || {},
      },
      properties: definition.properties,
      data: definition.data,
      methods: definition.methods,
      behaviors: definition.behaviors,
      created: definition.created,
      attached: definition.attached,
      ready: definition.ready,
      moved: definition.moved,
      detached: definition.detached,
      saved: definition.saved,
      restored: definition.restored,
      relations: definition.relations,
      externalClasses: definition.externalClasses,
      options: {
        domain: `${options.writeOnly ? 'wo://' : ''}/`,
        writeOnly: options.writeOnly || false,
        allowInWriteOnly: false,
        lazyRegistration: true,
        classPrefix: '',
        addGlobalClass: false,
        templateEngine: TemplateEngine,
        renderingMode: 'full',
        multipleSlots: options.multipleSlots || false,
        publicProperties: true,
        reflectToAttributes: false,
        writeFieldsToNode: false,
        writeIdToDOM: false,
      },
      // lifetimes: definition.lifetimes,
      // pageLifetimes: definition.pageLifetimes,
      // definitionFilter,
      initiator() {
        let methods = definition.methods || {};
        let caller = Object.create(this);

        Object.keys(methods).forEach(name => caller[name] = methods[name]);
        exparser.Element.setMethodCaller(this, caller);
      }
    };

    return exparser.registerElement(exparserDef);
  }
}

/**
 * template engine for exparser
 */
class TemplateEngine {
  static create(behavior, initValues, componentOptions) {
    let templateEngine = new TemplateEngine();
    let data = Object.assign({}, initValues, behavior.template.data);

    templateEngine._data = data;
    templateEngine._generateFunc = behavior.template.func;
    templateEngine._virtualTree = templateEngine._generateFunc({
      data
    }); // generate a virtual tree

    return templateEngine;
  }

  static collectIdMapAndSlots(exparserNode, idMap, slots) {
    let children = exparserNode.childNodes;

    for (let child of children) {
      if (child instanceof exparser.TextNode) continue;
      if (child.__id) idMap[child.__id] = child;
      if (child.__slotName !== undefined) slots[child.__slotName] = child;

      TemplateEngine.collectIdMapAndSlots(child, idMap, slots);
    }
  }

  createInstance(exparserNode, customArgs) {
    let instance = new TemplateEngineInstance();
    instance._generateFunc = this._generateFunc;
    instance._virtualTree = this._virtualTree;
    instance.originData = 

    instance.data = _.copy(this._data);
    instance.idMap = {};
    instance.slots = {};
    instance.shadowRoot = instance._virtualTree.render(exparserNode, null, customArgs); // render to exparser tree
    instance.listeners = [];

    TemplateEngine.collectIdMapAndSlots(instance.shadowRoot, instance.idMap, instance.slots);

    return instance;
  }
}

/**
 * template engine instance for exparser
 */
class TemplateEngineInstance {
  /**
   * it will be called when need to rerender
   */
  updateValues(exparserNode, data, changedPaths, changedValues, changes) {
    // prepare data
    let newVirtualTree = this._generateFunc({ data }); // generate a new virtual tree

    // apply changes
    let apply = this._virtualTree.diff(newVirtualTree);
    apply(this.shadowRoot);
    this._virtualTree = newVirtualTree;
  }
}

module.exports = ComponentManager;