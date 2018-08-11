const exparser = require('miniprogram-exparser');

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
