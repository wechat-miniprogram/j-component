const JComponent = require('../src/index');
const _ = require('./utils');

beforeAll(() => {
  _.env();
});

test('create component successfully', () => {
  let eventList = [];

  let behavior = JComponent.behavior({
    methods: {
      onTap1(evt) {
        eventList.push(this.data.index);
      },
    }
  });

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
    behaviors: [behavior],
    relations: {},
    externalClasses: [],
    created() {},
    attached() {},
    ready() {},
    moved() {},
    detached() {},
    methods: {
      onTap2() {
        this.setData({
          index: ++this.data.index,
          'styleObject.style': 'color: red;',
        });
      }
    }
  });

  let compa = JComponent.create('compa');
  expect(compa.dom.innerHTML).toBe('<view class="wxs" style="color: green;"><div>hello world+0</div></view><view><div>elif</div></view><compb><view><div>0-1</div></view><view><div>1-2</div></view><span>0</span></compb>');

  let node1 = compa.querySelector('.wxs');
  node1.dispatchEvent('tap');
  node1.dispatchEvent('touchstart');
  node1.dispatchEvent('touchend');
  expect(eventList.length).toBe(2);
  expect(eventList[0]).toBe(0);
  expect(eventList[1]).toBe(0);

  let node2 = compa.querySelector('#compb');
  node2.dispatchEvent('tap');
  expect(compa.dom.innerHTML).toBe('<view class="wxs" style="color: red;"><div>hello world+1</div></view><view><div>if</div></view><compb><view><div>0-1</div></view><view><div>1-2</div></view><span>1</span></compb>');
});
