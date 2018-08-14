const exparser = require('miniprogram-exparser');
const parse = require('./parse');
const CONSTANT = require('./constant');
const JNode = require('./jnode');
const Expression = require('./expression');
const _ = require('./utils');

const CACHE = {}; // cache component manager instance

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
  constructor(definition = {}) {
    this.id = _.getId(true);
    this.definition = definition;
    this.root = new JNode({
      type: CONSTANT.TYPE_ROOT,
      componentManager: this,
    });

    if (typeof definition.template === 'string') {
      let template = definition.template.trim();
      if (template) this.parse(template);
    }

    this.exparserDef = this.registerToExparser();

    CACHE[this.id] = this;
  }

  /**
   * get component with id
   */
  static get(id) {
    return CACHE[id];
  }

  /**
   * parse the template
   */
  parse(template) {
    let stack = [this.root];
    let usingComponents = this.definition.usingComponents || {};

    stack.last = function() {
      return this[this.length - 1];
    };

    parse(template, {
      start: (tagName, attrs, unary) => {
        let type;
        let componentManager;
        let id = '';

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
          id = usingComponents[tagName];
          componentManager = ComponentManager.get(id);

          if (!componentManager) throw new Error(`component ${tagName} not found`);
        }

        let { statement, event, normalAttrs } = filterAttrs(attrs);

        let parent = stack.last();
        let node = new JNode({
          type,
          tagName,
          componentId: id,
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
    let usingComponents = definition.usingComponents || {};
    let using = Object.keys(usingComponents).map(key => usingComponents[key]);
    let methods = {};

    _.adjustExparserDefinition(definition);

    // let definitionFilter = exparser.Behavior.callDefinitionFilter(definition);
    let exparserDef = {
      is: this.id,
      using,
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
        classPrefix: options.classPrefix || '',
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
        let caller = Object.create(this);

        Object.keys(methods).forEach(name => caller[name] = methods[name]);
        exparser.Element.setMethodCaller(this, caller);
      }
    };

    let exparserReg = exparser.registerElement(exparserDef);
    exparser.Behavior.prepare(exparserReg.behavior);
    methods = exparserReg.behavior.methods;

    return exparserReg;
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
    templateEngine._virtualTree = templateEngine._generateFunc({ data }); // generate a virtual tree

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
  updateValues(exparserNode, data) {
    let newVirtualTree = this._generateFunc({ data }); // generate a new virtual tree

    // apply changes
    this._virtualTree.diff(newVirtualTree);
    this._virtualTree = newVirtualTree;
  }
}

module.exports = ComponentManager;
