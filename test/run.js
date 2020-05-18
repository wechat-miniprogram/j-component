const {JSDOM} = require('jsdom')

global.beforeAll = cb => cb()
global.test = (desc, cb) => cb()
global.expect = a => ({
  toBe(b) {
    console.log('expect --> ', a, b)
  },
  toEqual(b) {
    console.log('expect --> ', a, b)
  },
})

const {window} = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <head>
      <title>test</title>
      <meta name="viewport" content="initial-scale=1, maximum-scale=1 minimum-scale=1, user-scalable=no">
    </head>
    <body>
      <div id="container"></div>
    </body>
  </html>
`, {
  runScripts: 'dangerously',
  userAgent: 'miniprogram test',
})
global.window = window
global.document = window.document
global.TouchEvent = window.TouchEvent
global.CustomEvent = window.CustomEvent

require('./render.test.js')
