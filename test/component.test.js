const jComponent = require('../src/index');
const _ = require('./utils');

beforeAll(() => {
  _.env();
});

test('create component successfully', () => {
  let eventList = [];

  let behavior = jComponent.behavior({
    methods: {
      onTap1(evt) {
        eventList.push(this.data.index);
      },
    }
  });
  debugger;
  jComponent.register({
    id: 'view',
    tagName: 'wx-view',
    template: '<div><slot/></div>'
  });
  let id1 = jComponent.register({
    template: `
      <view wx:for="{{list}}">{{index + '-' + item}}</view><span><slot/></span>
    `,
    properties: {
      list: {
        type: Array,
        public: true,
        value: [],
      }
    },
    usingComponents: {},
  });
  let id2 = jComponent.register({
    tagName: 'compa',
    template: `
      <wxs module="m1">
        var msg = 'hello world';
        module.exports.message = msg;
      </wxs>
      <view>{{prop}}</view>
      <view class="wxs" style="{{styleObject.style}}" bindtap="onTap1">{{m1.message}}+{{index}}</view>
      <view wx:if="{{index !== 0}}">if</view>
      <view wx:elif="{{index === 0}}">elif</view>
      <view wx:else>else</view>
      <compb id="compb" bindtap="onTap2" list="{{list}}">{{index}}</compb>
    `,
    usingComponents: {
      'compb': id1,
    },
    options: {
      classPrefix: 'compa',
    },
    properties: {
      prop: {
        type: String,
        value: '',
      }
    },
    data: {
      index: 0,
      styleObject: {
        style: 'color: green;',
      },
      list: [1, 2],
    },
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
          list: [2, 3, 4],
        });
      }
    }
  });

  let compa = jComponent.create(id2, { prop: 'prop-value' });
  expect(compa.dom.tagName).toBe('COMPA');
  expect(compa.dom.innerHTML).toBe('<wx-view><div>prop-value</div></wx-view><wx-view class="compa--wxs" style="color: green;"><div>hello world+0</div></wx-view><wx-view><div>elif</div></wx-view><compb><wx-view><div>0-1</div></wx-view><wx-view><div>1-2</div></wx-view><span>0</span></compb>');

  let compb = jComponent.create(id1);
  expect(compb.dom.tagName.length).toBe(13);

  let node1 = compa.querySelector('.wxs');
  node1.dispatchEvent('tap');
  node1.dispatchEvent('touchstart');
  node1.dispatchEvent('touchend');
  expect(eventList.length).toBe(2);
  expect(eventList[0]).toBe(0);
  expect(eventList[1]).toBe(0);

  let node2 = compa.querySelector('#compb');
  node2.dispatchEvent('tap');
  expect(compa.dom.innerHTML).toBe('<wx-view><div>prop-value</div></wx-view><wx-view class="compa--wxs" style="color: red;"><div>hello world+1</div></wx-view><wx-view><div>if</div></wx-view><compb><wx-view><div>0-2</div></wx-view><wx-view><div>1-3</div></wx-view><wx-view><div>2-4</div></wx-view><span>1</span></compb>');
});
