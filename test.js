const { JSDOM } = require('jsdom');

/**
 * Touch polyfill
 */
class Touch {
  constructor(options = {}) {
    this.clientX = 0;
    this.clientY = 0;
    this.identifier = 0;
    this.pageX = 0;
    this.pageY = 0;
    this.screenX = 0;
    this.screenY = 0;
    this.target = null;

    Object.keys(options).forEach(key => {
      this[key] = options[key];
    });
  }
}

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
global.TouchEvent = window.TouchEvent;
global.Touch = Touch;
global.CustomEvent = window.CustomEvent;

const JComponent = module.exports = require('./src/index');
const Expression = require('./src/expression');

JComponent.register('view', '<div><slot/></div>');
JComponent.register('compb', `
  <view wx:for="{{list}}">{{index + '-' + item}}</view><span><slot/></span>
`, {
  properties: {
    list: {
      type: Array,
      public: true,
      value: [],
    }
  },
  using: ['view'],
});
JComponent.register('compa', `
  <wxs module="m1">
    var msg = 'hello world';
    module.exports.message = msg;
  </wxs>
  <view class="wxs" style="{{styleObject.style}}" bindtap="onTap1">{{m1.message}}+{{index}}</view>
  <view wx:if="{{index !== 0}}">if</view>
  <view wx:elif="{{index === 0}}">elif</view>
  <view wx:else>else</view>
  <compb id="compb" bindtap="onTap2" list="{{list}}">{{index}}</compb>
`, {
  properties: {},
  data: {
    index: 0,
    styleObject: {
      style: 'color: green;',
    },
    list: [1, 2],
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
    onTap1(evt) {
      console.log('onTap --> wxs', typeof evt, this.data.index);
    },
    onTap2() {
      console.log('onTap --> compb');
      this.setData({
        index: ++this.data.index,
        'styleObject.style': 'color: red;',
      });
    }
  }
});

let compa = JComponent.create('compa');
console.log(compa.dom.innerHTML);

let node1 = compa.querySelector('.wxs');
node1.dispatchEvent('tap');
node1.dispatchEvent('touchstart');
node1.dispatchEvent('touchend');

let node2 = compa.querySelector('#compb');
node2.dispatchEvent('tap');
console.log(compa.dom.innerHTML);

/*
<view class="wxs" style="color: green;"><div>hello world+0</div></view><view><div>elif</div></view><compb><view><div>0-1</div></view><view><div>1-2</div></view><span>0</span></compb>

<view class="wxs" style="color: red;"><div>hello world+1</div></view><view><div>if</div></view><compb><view><div>0-1</div></view><view><div>1-2</div></view><span>1</span></compb>
 */
