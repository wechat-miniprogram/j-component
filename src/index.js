const ComponentManager = require('./componentmanager');
const Component = require('./component');
const _ = require('./utils');

module.exports = {
  register(name, template, definition) {
    if (!name) return;

    if (ComponentManager.get(name)) return;

    new ComponentManager(name, template, definition);
  },

  create(name) {
    let componentManager = ComponentManager.get(name);

    if (!componentManager) return;

    return new Component(componentManager);
  },
};
