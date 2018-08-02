// const exparser = require('./lib/exparser.min.js');
const exparser = require('./lib/exparser.debug.js');

class Component {
  constructor(componentManager) {
    this.componentManager = componentManager;
  }

  render() {
    let name = this.componentManager.name;
    let exparserDef = this.componentManager.exparserDef;
    let exparserNode = exparser.createElement(name, exparserDef);

    return exparserNode.$$;
  }
}

module.exports = Component;
