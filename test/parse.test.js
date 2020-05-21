const parse = require('../src/template/parse')

function getParseResult(content) {
  const startStack = []
  const endStack = []
  const textStack = []

  parse(content, {
    start(tagName, attrs, unary) {
      startStack.push({tagName, attrs, unary})
    },
    end(tagName) {
      endStack.push(tagName)
    },
    text(content) {
      content = content.trim()
      if (content) textStack.push(content)
    },
  })

  return {startStack, endStack, textStack}
}

test('parse template', () => {
  let res = getParseResult('<div><slot/></div>')
  expect(res.startStack).toEqual([{tagName: 'div', attrs: [], unary: false}, {tagName: 'slot', attrs: [], unary: true}])
  expect(res.endStack).toEqual(['div'])
  expect(res.textStack).toEqual([])

  res = getParseResult(`
    <div><slot/></div>
    <div id="a" class="xx">123123</div>
    <input id="b" type="checkbox" checked url=""/>
    <div>
      <ul>
        <li><span>123</span></li>
        <li><span>321</span></li>
        <li><span>567</span></li>
      </ul>
    </div>
  `)
  expect(res.startStack).toEqual([
    {tagName: 'div', attrs: [], unary: false},
    {tagName: 'slot', attrs: [], unary: true},
    {tagName: 'div', attrs: [{name: 'id', value: 'a'}, {name: 'class', value: 'xx'}], unary: false},
    {tagName: 'input', attrs: [{name: 'id', value: 'b'}, {name: 'type', value: 'checkbox'}, {name: 'checked', value: true}, {name: 'url', value: ''}], unary: true},
    {tagName: 'div', attrs: [], unary: false},
    {tagName: 'ul', attrs: [], unary: false},
    {tagName: 'li', attrs: [], unary: false},
    {tagName: 'span', attrs: [], unary: false},
    {tagName: 'li', attrs: [], unary: false},
    {tagName: 'span', attrs: [], unary: false},
    {tagName: 'li', attrs: [], unary: false},
    {tagName: 'span', attrs: [], unary: false}
  ])
  expect(res.endStack).toEqual(['div', 'div', 'span', 'li', 'span', 'li', 'span', 'li', 'ul', 'div'])
  expect(res.textStack).toEqual(['123123', '123', '321', '567'])

  res = getParseResult('<div><span>123</div>')
  expect(res.startStack).toEqual([
    {tagName: 'div', attrs: [], unary: false},
    {tagName: 'span', attrs: [], unary: false}
  ])
  expect(res.endStack).toEqual(['span', 'div'])
  expect(res.textStack).toEqual(['123'])

  res = getParseResult('<div>123</h1>')
  expect(res.startStack).toEqual([
    {tagName: 'div', attrs: [], unary: false}
  ])
  expect(res.endStack).toEqual(['div'])
  expect(res.textStack).toEqual(['123'])
})

test('parse wxs', () => {
  let res = getParseResult(`
    <div>123</div>
    <wxs module="m1">
      var msg = "hello world";
      module.exports.message = msg;
    </wxs>
    <view>{{m1.message}}</view>
    <div>321</div>
  `)
  expect(res.startStack).toEqual([
    {tagName: 'div', attrs: [], unary: false},
    {tagName: 'wxs', attrs: [{name: 'module', value: 'm1'}], unary: false},
    {tagName: 'view', attrs: [], unary: false},
    {tagName: 'div', attrs: [], unary: false}
  ])
  expect(res.endStack).toEqual(['div', 'wxs', 'view', 'div'])
  expect(res.textStack).toEqual(['123', 'var msg = "hello world";\n      module.exports.message = msg;', '{{m1.message}}', '321'])

  res = getParseResult('<wxs></wxs>')
  expect(res.startStack).toEqual([
    {tagName: 'wxs', attrs: [], unary: false}
  ])
  expect(res.endStack).toEqual(['wxs'])
  expect(res.textStack).toEqual([])
})

test('parse comment', () => {
  const res = getParseResult('<!-- 123 -->')
  expect(res.startStack).toEqual([])
  expect(res.startStack).toEqual([])
  expect(res.startStack).toEqual([])
})

test('parse without options', () => {
  let catchErr = null
  try {
    parse('<div>123</div>')
  } catch (err) {
    catchErr = err
  }

  expect(catchErr).toBe(null)
})

test('parse error', () => {
  function getErr(str) {
    let catchErr = null
    try {
      getParseResult(str)
    } catch (err) {
      catchErr = err
    }

    return catchErr && catchErr.message || ''
  }

  expect(getErr('<div')).toBe('parse error: <div')
  expect(getErr('<wxs>123')).toBe('parse error: 123')
  expect(getErr('<!-- 123')).toBe('parse error: <!-- 123')
  expect(getErr('<div>123</%%^6.....>')).toBe('parse error: </%%^6.....>')
})
