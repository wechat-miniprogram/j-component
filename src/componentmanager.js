const exparser = require('miniprogram-exparser');
const parse = require('./parse');
const CONSTANT = require('./constant');
const JNode = require('./jnode');
const expr = require('./expr');
const _ = require('./utils');
const diff = require('./diff');
const render = require('./render');
const SelectorQuery = require('./selectorquery');
const IntersectionObserver = require('./intersectionobserver');

const CACHE = {}; // componentManager 实例缓存

/**
 * 检查 if/for 语句
 */
function filterAttrs(attrs) {
  const statement = {};
  const event = {};
  const normalAttrs = [];

  for (const attr of attrs) {
    const name = attr.name;
    const value = attr.value || '';

    if (name === 'wx:if') {
      statement.if = expr.getExpression(value);
    } else if (name === 'wx:elif') {
      statement.elif = expr.getExpression(value);
    } else if (name === 'wx:else') {
      statement.else = true;
    } else if (name === 'wx:for') {
      statement.for = expr.getExpression(value);
    } else if (name === 'wx:for-item') {
      statement.forItem = value;
    } else if (name === 'wx:for-index') {
      statement.forIndex = value;
    } else if (name === 'wx:key') {
      statement.forKey = value;
    } else {
      const res = /^(capture-)?(bind|catch|)(?::)?(.*)$/ig.exec(name);

      if (res[2] && res[3]) {
        // 事件绑定
        const isCapture = !!res[1];
        const isCatch = res[2] === 'catch';
        const eventName = res[3];

        event[eventName] = {
          name: eventName,
          isCapture,
          isCatch,
          handler: value,
        };
      } else {
        // 普通属性
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
  constructor(definition) {
    this.id = definition.id || _.getId(true);
    this.isGlobal = !!definition.id; // 是否全局组件
    this.definition = definition;
    this.root = new JNode({
      type: CONSTANT.TYPE_ROOT,
      componentManager: this,
    });

    if (definition.tagName) _.setTagName(this.id, definition.tagName); // 保存标签名

    let template = definition.template;
    if (!template || typeof template !== 'string' || !template.trim()) throw new Error('invalid template');

    template = template.trim();
    this.parse(template);

    this.exparserDef = this.registerToExparser();

    CACHE[this.id] = this;
  }

  /**
   * 根据 id 获取组件
   */
  static get(id) {
    return CACHE[id];
  }

  /**
   * 解析模板
   */
  parse(template) {
    const stack = [this.root];
    const usingComponents = this.definition.usingComponents || {};

    stack.last = function () {
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
          componentManager = id ? ComponentManager.get(id) : ComponentManager.get(tagName);

          if (!componentManager) throw new Error(`component ${tagName} not found`);
        }

        const { statement, event, normalAttrs } = filterAttrs(attrs);

        const parent = stack.last();
        const node = new JNode({
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
          const itemNode = new JNode({
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
          node.setParent(itemNode, 0); // 更新父节点

          const forNode = new JNode({
            type: CONSTANT.TYPE_FOR,
            tagName: 'wx:for',
            statement: {
              for: statement.for,
            },
            children: [itemNode],
            root: this.root,
          });
          itemNode.setParent(forNode, 0); // 更新父节点

          appendNode = forNode;
        }

        // 条件语句
        if (statement.if || statement.elif || statement.else) {
          const ifNode = new JNode({
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
          node.setParent(ifNode, 0); // 更新父节点

          appendNode = ifNode;
        }

        if (!unary) {
          stack.push(node);
        }

        appendNode.setParent(parent, parent.children.length); // 更新父节点
        parent.appendChild(appendNode);
      },
      // eslint-disable-next-line no-unused-vars
      end: (tagName) => {
        stack.pop();
      },
      text: content => {
        content = content.trim();
        if (!content) return;

        const parent = stack.last();
        if (parent.type === CONSTANT.TYPE_WXS) {
          // wxs 节点
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
      },
    });

    if (stack.length !== 1) throw new Error(`build ast error: ${template}`);
  }

  /**
   * 注册 exparser 组件
   */
  registerToExparser() {
    const definition = this.definition;
    const options = definition.options || {};
    const usingComponents = definition.usingComponents || {};
    const using = Object.keys(usingComponents).map(key => usingComponents[key]);
    let methods = {};

    _.adjustExparserDefinition(definition);

    const definitionFilter = exparser.Behavior.callDefinitionFilter(definition);
    const exparserDef = {
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
      lifetimes: definition.lifetimes,
      pageLifetimes: definition.pageLifetimes,
      definitionFilter,
      initiator() {
        // 更新方法调用者，即自定义组件中的 this
        const caller = Object.create(this);
        const originalSetData = caller.setData;

        caller._exparserNode = this; // 存入原本对应的 exparserNode 实例
        caller.data = _.copy(this.data);
        caller.properties = caller.data;
        caller.selectComponent = selector => {
          const exparserNode = this.shadowRoot.querySelector(selector);
          return exparser.Element.getMethodCaller(exparserNode);
        };
        caller.selectAllComponents = selector => {
          const exparserNodes = this.shadowRoot.querySelectorAll(selector);
          return exparserNodes.map(item => exparser.Element.getMethodCaller(item));
        };
        caller.createSelectorQuery = () => {
          return new SelectorQuery(caller);
        };
        caller.createIntersectionObserver = (options) => {
          return new IntersectionObserver(caller, options);
        };
        caller.setData = (data, callback) => {
          if (!originalSetData || typeof originalSetData !== 'function') return;

          originalSetData.call(this, data);

          if (typeof callback === 'function') {
            // 模拟异步情况
            setTimeout(() => {
              callback();
            }, 0);
          }
        }

        Object.keys(methods).forEach(name => caller[name] = methods[name]);
        exparser.Element.setMethodCaller(this, caller);
      },
    };

    const exparserReg = exparser.registerElement(exparserDef);
    exparser.Behavior.prepare(exparserReg.behavior);
    methods = exparserReg.behavior.methods;

    return exparserReg;
  }
}

/**
 * exparser 的模板引擎封装
 */
class TemplateEngine {
  static create(behavior, initValues) {
    const templateEngine = new TemplateEngine();
    const data = Object.assign({}, initValues, behavior.template.data);

    templateEngine._data = data;
    templateEngine._generateFunc = behavior.template.func;

    return templateEngine;
  }

  static collectIdMapAndSlots(exparserNode, idMap, slots) {
    const children = exparserNode.childNodes;

    for (const child of children) {
      if (child instanceof exparser.TextNode) continue;
      if (child.__id) idMap[child.__id] = child;
      if (child.__slotName !== undefined) slots[child.__slotName] = child;

      TemplateEngine.collectIdMapAndSlots(child, idMap, slots);
    }
  }

  createInstance(exparserNode, properties = {}) {
    this._data = Object.assign(this._data, properties);
    this._vt = this._generateFunc({ data: this._data }); // 生成虚拟树

    const instance = new TemplateEngineInstance();
    instance._generateFunc = this._generateFunc;
    instance._vt = this._vt;

    instance.data = _.copy(this._data);
    instance.idMap = {};
    instance.slots = {};
    instance.shadowRoot = render.renderExparserNode(instance._vt, exparserNode, null); // 渲染成 exparser 树
    instance.listeners = [];

    TemplateEngine.collectIdMapAndSlots(instance.shadowRoot, instance.idMap, instance.slots);

    return instance;
  }
}

/**
 * exparser 的模板引擎实例
 */
class TemplateEngineInstance {
  /**
   * 当遇到组件更新时，会触发此方法
   */
  updateValues(exparserNode, data, changedPaths, changedValues, changes) {
    const newVt = this._generateFunc({ data }); // 生成新虚拟树

    // 合并到方法调用者的 data 中
    const callerData = exparser.Element.getMethodCaller(exparserNode).data;
    const hasOwnProperty = Object.prototype.hasOwnProperty;
    for (const changeInfo of changes) {
      if (!changeInfo) continue;

      const path = changeInfo[1];
      const newData = changeInfo[2];
      let currentData = callerData;
      let currentPath = path[0];

      // 检查更新路径
      for (let i = 1, len = path.length; i < len; i++) {
        const nextPath = path[i];
        const currentValue = currentData[currentPath];

        if (!hasOwnProperty.call(currentData, currentPath)) {
          // 不存在，则进行初始化
          if (typeof nextPath === 'number' && isFinite(nextPath)) {
            // 数组
            if (!Array.isArray(currentValue)) currentData[currentPath] = [];
          } else if (currentValue === null || typeof currentValue !== 'object' || Array.isArray(currentValue)) {
            // 对象
            currentData[currentPath] = {};
          }
        }

        currentData = currentData[currentPath];
        currentPath = nextPath;
      }

      const oldData = currentData[currentPath];
      currentData[currentPath] = _.copy(newData);
      changedValues = [currentData[currentPath], oldData];
    }

    // 应用更新
    diff.diffVt(this._vt, newVt);
    this._vt = newVt;
  }
}

module.exports = ComponentManager;
