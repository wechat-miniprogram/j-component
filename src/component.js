// const exparser = require('./lib/exparser.min.js');
const exparser = require('./lib/exparser.debug.js');

class Component {
  constructor(name) {
    this.name = name;
  }

  render() {
    let exparserNode = exparser.createElement(this.name);
    debugger;
    return exparserNode.$$;
  }
}

module.exports = Component;
