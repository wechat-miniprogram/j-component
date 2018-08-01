const parse = require('../src/parse');

test('parse successfully', () => {
  let startStack = [];
  let endStack = [];
  let textStack = [];

  parse('<div><slot/></div>', {
    start(tagName, attrs, unary) {
      console.log(tagName, attrs, unary);
    },
    end(tagName) {

    },
    text(content) {

    },
  });
});
