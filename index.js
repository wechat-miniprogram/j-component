const { JSDOM } = require('jsdom');

let { window } = new JSDOM(`
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
});
global.window = window;
global.document = window.document;

const JComponent = module.exports = require('./src/index');
const Expression = require('./src/expression');

JComponent.register('view', '<div><slot/></div>');
JComponent.register('compb', `
  <view wx:for="{{[1,2]}}">{{index + '-' + item}}</view><slot/>
`, {
  using: ['view'],
});
JComponent.register('compa', `
  <wxs module="m1">
    var msg = 'hello world';
    module.exports.message = msg;
  </wxs>
  <view class="wxs" style="{{styleObject.style}}">{{m1.message}}</view>
  <view wx:if="{{index !== 0}}">if</view>
  <view wx:elif="{{index === 0}}">elif</view>
  <view wx:else>else</view>
  <compb bindtap="onTap">{{index}}</compb>
`, {
  properties: {

  },
  data: {
    index: 0,
    styleObject: {
      style: 'color: green;',
    },
  },
  using: ['view', 'compb'],
  options: {},
  behaviors: [],
  relations: {},
  externalClasses: [],
  created() {},
  attached() {},
  ready() {},
  moved() {},
  detached() {},
  methods: {
    onTap() {
      this.setData({ index: ++this.data.index });
    }
  }
});

let compa = JComponent.create('compa');
let compaDom = compa.render({ index: 0 });
console.log(compaDom.innerHTML);
