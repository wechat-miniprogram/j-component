const exparser = require('miniprogram-exparser');
const ComponentManager = require('./componentmanager');
const RootComponent = require('./component');
const _ = require('./utils');

module.exports = {
  /**
   * 注册组件
   */
  register(definition = {}) {
    const componentManager = new ComponentManager(definition);

    return componentManager.id;
  },

  /**
   * 注册 behavior
   */
  behavior(definition) {
    definition.is = _.getId(true);
    definition.options = {
      lazyRegistration: true,
      publicProperties: true,
    };

    _.adjustExparserDefinition(definition);
    exparser.registerBehavior(definition);

    return definition.is;
  },

  /**
   * 创建组件实例
   */
  create(id, properties) {
    const componentManager = ComponentManager.get(id);

    if (!componentManager) return;

    return new RootComponent(componentManager, properties);
  },
};
