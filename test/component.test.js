const jComponent = require('../src/index');
const _ = require('./utils');

let behavior;
let compaId;
let compbId;
let compcId;
let eventList = [];

beforeAll(() => {
  _.env();
});

test('register behavior', () => {
  behavior = jComponent.behavior({
    methods: {
      onTap1(evt) {
        eventList.push(this.data.index);
      },
    }
  });

  expect(behavior.length).toBe(13);
});

test('register and create global component', () => {
  let id = jComponent.register({
    id: 'view',
    tagName: 'wx-view',
    template: '<div><slot/></div>'
  });
  let view = jComponent.create(id);

  expect(id).toBe('view');
  expect(view.dom.tagName).toBe('WX-VIEW');
  expect(view.dom.innerHTML).toBe('<div></div>');
});

test('register and create normal component', () => {
  compaId = jComponent.register({
    template: `<view wx:for="{{list}}">{{index + '-' + item}}</view><span><slot/></span>`,
    properties: {
      list: {
        type: Array,
        public: true,
        value: [],
      }
    },
  });
  let compa = jComponent.create(compaId, { list: ['a', 'b'] });

  expect(compaId.length).toBe(13);
  expect(compa.dom.tagName.length).toBe(13);
  expect(compa.dom.innerHTML).toBe('<wx-view><div>0-a</div></wx-view><wx-view><div>1-b</div></wx-view><span></span>');
});

test('querySelector', () => {
  compbId = jComponent.register({
    tagName: 'compb',
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
      <compa id="compa" bindtap="onTap2" list="{{list}}">{{index}}</compa>
    `,
    usingComponents: {
      'compa': compaId,
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

  let compb = jComponent.create(compbId, { prop: 'prop-value' });
  expect(compb.dom.tagName).toBe('COMPB');
  expect(compb.dom.innerHTML).toBe('<wx-view><div>prop-value</div></wx-view><wx-view class="compa--wxs" style="color: green;"><div>hello world+0</div></wx-view><wx-view><div>elif</div></wx-view><compa><wx-view><div>0-1</div></wx-view><wx-view><div>1-2</div></wx-view><span>0</span></compa>');

  let node1 = compb.querySelector('.wxs');
  expect(node1.dom.tagName).toBe('WX-VIEW');
  expect(node1.dom.innerHTML).toBe('<div>hello world+0</div>')

  let node2 = compb.querySelector('#compa');
  expect(node2.dom.tagName).toBe('COMPA');
  expect(node2.dom.innerHTML).toBe('<wx-view><div>0-1</div></wx-view><wx-view><div>1-2</div></wx-view><span>0</span>');
});

test('dispatchEvent', () => {
  let compb = jComponent.create(compbId, { prop: 'prop-value' });

  let node1 = compb.querySelector('.wxs');
  node1.dispatchEvent('tap');
  node1.dispatchEvent('touchstart');
  node1.dispatchEvent('touchend');
  expect(eventList.length).toBe(2);
  expect(eventList[0]).toBe(0);
  expect(eventList[1]).toBe(0);

  let node2 = compb.querySelector('#compa');
  node2.dispatchEvent('tap');
  expect(compb.dom.innerHTML).toBe('<wx-view><div>prop-value</div></wx-view><wx-view class="compa--wxs" style="color: red;"><div>hello world+1</div></wx-view><wx-view><div>if</div></wx-view><compa><wx-view><div>0-2</div></wx-view><wx-view><div>1-3</div></wx-view><wx-view><div>2-4</div></wx-view><span>1</span></compa>');
});

test('block', () => {
  let compId = jComponent.register({
    template: `
      <block><view>123</view></block>
      <block>456</block>
      <block wx:if="{{flag}}"><view>789</view></block>
      <block wx:else><view>101112</view></block>
      <block wx:for="{{list}}">
        <view>{{index}}</view>
        <view>{{item}}</view>
      </block>
    `,
    data: {
      flag: false,
      list: ['a', 'b']
    },
  });
  let comp = jComponent.create(compId);

  expect(comp.dom.innerHTML).toBe('<wx-view><div>123</div></wx-view>456<wx-view><div>101112</div></wx-view><wx-view><div>0</div></wx-view><wx-view><div>a</div></wx-view><wx-view><div>1</div></wx-view><wx-view><div>b</div></wx-view>');
});

test('setData', () => {
  let callbackCheck = [];
  let compId = jComponent.register({
    template: `<view>{{num}}</view>`,
    data: {
      num: 0,
    },
  });
  let comp = jComponent.create(compId);

  expect(comp.dom.innerHTML).toBe('<wx-view><div>0</div></wx-view>');
  comp.setData({ num: 2 }, () => {
    callbackCheck.push(0);
  });
  expect(comp.dom.innerHTML).toBe('<wx-view><div>2</div></wx-view>');
  expect(callbackCheck.length).toBe(1);
});

test('getData', () => {
  let compId = jComponent.register({
    template: `<view>123</view>`,
    data: {
      num: 0,
    },
  });
  let comp = jComponent.create(compId);

  expect(comp.data.num).toBe(0);

  comp.setData({ num: 2 });
  expect(comp.data.num).toBe(2);

  comp.setData({ num: 'I am a string' });
  expect(comp.data.num).toBe('I am a string');
});

test('update event', () => {
  let compId = jComponent.register({
    template: `
      <view class="a" wx:if="{{flag}}" bindtap="onTap">if-{{num}}</view>
      <view class="a" wx:else bindtap="onTap2">else-{{num}}</view>
    `,
    data: {
      num: 0,
      flag: true,
    },
    methods: {
      onTap() {
        this.setData({ num: 1 });
      },
      onTap2() {
        this.setData({ num: 2 });
      },
    },
  });
  let comp = jComponent.create(compId);

  expect(comp.dom.innerHTML).toBe('<wx-view class="a"><div>if-0</div></wx-view>');
  comp.querySelector('.a').dispatchEvent('tap');
  expect(comp.dom.innerHTML).toBe('<wx-view class="a"><div>if-1</div></wx-view>');
  comp.setData({ flag: false });
  expect(comp.dom.innerHTML).toBe('<wx-view class="a"><div>else-1</div></wx-view>');
  comp.querySelector('.a').dispatchEvent('tap');
  expect(comp.dom.innerHTML).toBe('<wx-view class="a"><div>else-2</div></wx-view>');
});

test('life time', () => {
  let callbackCheck = [];
  let grandChildId = jComponent.register({
    template: `<view>123</view>`,
    created() {
      callbackCheck.push('grand-child-created');
    },
    attached() {
      callbackCheck.push('grand-child-attached');
    },
    ready() {
      callbackCheck.push('grand-child-ready');
    },
    moved() {
      callbackCheck.push('grand-child-moved');
    },
    detached() {
      callbackCheck.push('grand-child-detached');
    },
  });
  let childId = jComponent.register({
    template: `<grand-child/>`,
    usingComponents: {
      'grand-child': grandChildId
    },
    created() {
      callbackCheck.push('child-created');
    },
    attached() {
      callbackCheck.push('child-attached');
    },
    ready() {
      callbackCheck.push('child-ready');
    },
    moved() {
      callbackCheck.push('child-moved');
    },
    detached() {
      callbackCheck.push('child-detached');
    },
  });
  let compId = jComponent.register({
    tagName: 'lift-time-comp',
    template: `<child/>`,
    usingComponents: {
      'child': childId
    },
    created() {
      callbackCheck.push('created');
    },
    attached() {
      callbackCheck.push('attached');
    },
    ready() {
      callbackCheck.push('ready');
    },
    moved() {
      callbackCheck.push('moved');
    },
    detached() {
      callbackCheck.push('detached');
    },
  });
  let comp = jComponent.create(compId);
  let parent = document.createElement('div');

  expect(parent.innerHTML).toBe('');
  comp.attach(parent);
  expect(parent.innerHTML).toBe('<lift-time-comp><child><grand-child><wx-view><div>123</div></wx-view></grand-child></child></lift-time-comp>');
  comp.detach();
  expect(parent.innerHTML).toBe('');
  expect(callbackCheck).toEqual([
    'grand-child-created', 'child-created', 'created',
    'attached', 'child-attached', 'grand-child-attached',
    'grand-child-ready', 'child-ready', 'ready',
    'grand-child-detached', 'child-detached', 'detached'
  ]);
});
