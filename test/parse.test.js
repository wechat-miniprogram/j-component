const parse = require('../src/parse');

function getParseResult(content) {
  let startStack = [];
  let endStack = [];
  let textStack = [];

  parse(content, {
    start(tagName, attrs, unary) {
      startStack.push({ tagName, attrs, unary });
    },
    end(tagName) {
      endStack.push(tagName);
    },
    text(content) {
      content = content.trim();
      if (content) textStack.push(content);
    },
  });

  return { startStack, endStack, textStack };
}

test('parse template', () => {
  let res1 = getParseResult('<div><slot/></div>');
  expect(res1.startStack.length).toBe(2);
  expect(res1.endStack.length).toBe(1);
  expect(res1.textStack.length).toBe(0);
  expect(res1.startStack).toEqual([{ tagName: 'div', attrs: [], unary: false }, { tagName: 'slot', attrs: [], unary: true }]);
  expect(res1.endStack).toEqual(['div']);

  let res2 = getParseResult(`
    <div><slot/></div>
    <div id="a" class="xx">123123</div>
    <input id="b" type="checkbox" checked/>
    <div>
      <ul>
        <li><span>123</span></li>
        <li><span>321</span></li>
        <li><span>567</span></li>
      </ul>
    </div>
  `);
  expect(res2.startStack.length).toBe(12);
  expect(res2.endStack.length).toBe(10);
  expect(res2.textStack.length).toBe(4);
  expect(res2.startStack).toEqual([
    { tagName: 'div', attrs: [], unary: false },
    { tagName: 'slot', attrs: [], unary: true },
    { tagName: 'div', attrs: [{ name: 'id', value: 'a' }, { name: 'class', value: 'xx' }], unary: false },
    { tagName: 'input', attrs: [{ name: 'id', value: 'b' }, { name: 'type', value: 'checkbox' }, { name: 'checked', value: undefined }], unary: true },
    { tagName: 'div', attrs: [], unary: false },
    { tagName: 'ul', attrs: [], unary: false },
    { tagName: 'li', attrs: [], unary: false },
    { tagName: 'span', attrs: [], unary: false },
    { tagName: 'li', attrs: [], unary: false },
    { tagName: 'span', attrs: [], unary: false },
    { tagName: 'li', attrs: [], unary: false },
    { tagName: 'span', attrs: [], unary: false }
  ]);
  expect(res2.endStack).toEqual(['div', 'div', 'span', 'li', 'span', 'li', 'span', 'li', 'ul', 'div']);
  expect(res2.textStack).toEqual(['123123', '123', '321', '567']);
});

test('parse wxs', () => {
  let res1 = getParseResult(`
    <div>123</div>
    <wxs module="m1">
      var msg = "hello world";
      module.exports.message = msg;
    </wxs>
    <view>{{m1.message}}</view>
    <div>321</div>
  `);
  expect(res1.startStack.length).toBe(4);
  expect(res1.endStack.length).toBe(4);
  expect(res1.textStack.length).toBe(4);
  expect(res1.startStack).toEqual([
    { tagName: 'div', attrs: [], unary: false },
    { tagName: 'wxs', attrs: [{ name: 'module', value: 'm1' }], unary: false },
    { tagName: 'view', attrs: [], unary: false },
    { tagName: 'div', attrs: [], unary: false }
  ]);
  expect(res1.endStack).toEqual(['div', 'wxs', 'view', 'div']);
  expect(res1.textStack).toEqual(['123', 'var msg = "hello world";\n      module.exports.message = msg;', '{{m1.message}}', '321']);
});
