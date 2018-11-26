const jComponent = require('../src/index');
const _ = require('./utils');

test('normal attr', () => {
  let comp = jComponent.create(jComponent.register({
    template: '<div id="abc" class="abc">123</div>',
  }));
  expect(comp.dom.innerHTML).toBe('<div class="abc">123</div>');

  comp = jComponent.create(jComponent.register({
    template: '<div id="" class=""></div>',
  }));
  expect(comp.dom.innerHTML).toBe('<div></div>');
});

test('slot', () => {
  let inner = jComponent.register({
    template: '<div><slot/></div>',
  });
  let outer = jComponent.create(jComponent.register({
    template: '<inner>123</inner>',
    usingComponents: { inner },
  }));
  expect(outer.dom.innerHTML).toBe('<inner><div>123</div></inner>');
});

test('style', () => {
  let inner = jComponent.register({
    template: '<div style="width: 100rpx;"></div>',
  });
  let outer = jComponent.create(jComponent.register({
    template: '<inner style=""></inner>',
    usingComponents: { inner },
  }));
  expect(outer.dom.innerHTML).toBe('<inner style=""><div style="width: 100px;"></div></inner>');
});

test('properties', () => {
  let inner = jComponent.register({
    properties: {
      a: Number,
    },
    template: '<div></div>',
  });
  let outer = jComponent.create(jComponent.register({
    template: '<inner a="123"></inner>',
    usingComponents: { inner },
  }));
  expect(outer.dom.innerHTML).toBe('<inner><div></div></inner>');
});

test('dataset', () => {
  let inner = jComponent.register({
    template: '<div></div>',
  });
  let outer = jComponent.create(jComponent.register({
    template: '<inner data-a="123"></inner>',
    usingComponents: { inner },
  }));
  expect(outer.dom.innerHTML).toBe('<inner data-a="123"><div></div></inner>');
});

test('condition statement', () => {
  let comp = jComponent.create(jComponent.register({
    template: `
      <div wx:if="{{flag === 0}}">0</div>
      <div wx:elif="{{flag === 1}}">1</div>
      <div wx:elif="{{flag === 2}}">2</div>
      <div wx:else>3</div>
    `,
    data: {
      flag: 0,
    },
  }));

  expect(comp.dom.innerHTML).toBe('<div>0</div>');
  comp.setData({ flag: 2 });
  expect(comp.dom.innerHTML).toBe('<div>2</div>');

  comp.setData({ flag: 1 });
  expect(comp.dom.innerHTML).toBe('<div>1</div>');

  comp.setData({ flag: 4 });
  expect(comp.dom.innerHTML).toBe('<div>3</div>');

  comp.setData({ flag: 0 });
  expect(comp.dom.innerHTML).toBe('<div>0</div>');
});

test('for statement', () => {
  let comp = jComponent.create(jComponent.register({
    template: `
      <div wx:for="{{list}}" wx:key="id" wx:for-item="a" wx:for-index="idx">{{idx}}-{{a.value}}</div>
    `,
    data: {
      list: [],
    },
  }));

  expect(comp.dom.innerHTML).toBe('');
  comp.setData({
    list: [
      { id: 1, value:'1' },
      { value: '2' },
      { id: 3, value: '3' },
    ],
  });
  expect(comp.dom.innerHTML).toBe('<div>0-1</div><div>1-2</div><div>2-3</div>');
});

test('externalClasses', () => {
  let comp = jComponent.register({
    template: '<div>123</div>',
  });
  let inner = jComponent.register({
    template: '<comp class="my-class"></comp>',
    externalClasses: ['my-class'],
    usingComponents: { comp },
    options: {
      classPrefix: 'xxx', // 追加私有化前缀方可令 externalClasses 生效
    },
  });
  let outer = jComponent.create(jComponent.register({
    template: '<inner my-class="abc">></inner>',
    usingComponents: { inner },
  }));

  expect(outer.dom.innerHTML).toBe('<inner><comp class="abc"><div>123</div></comp></inner>');
});

test('event', () => {
  let inner = jComponent.register({
    template: '<div><slot/></div>',
  });
  let outer = jComponent.create(jComponent.register({
    template: '<inner class="inner" binda="onA" catchb="onB" bindc="onC" bindtouchstart=""><div>123</div></inner>',
    usingComponents: { inner },
    methods: {
      onA() {},
      onB() {},
    },
  }));
  outer.querySelector('.inner').dispatchEvent('a');
  outer.querySelector('.inner').dispatchEvent('b');
  outer.querySelector('.inner').dispatchEvent('c');
  expect(outer.dom.innerHTML).toBe('<inner class="inner"><div><div>123</div></div></inner>');
});

test('wxs', () => {
  let comp = jComponent.create(jComponent.register({
    template: `
      <wxs module="m1">
        var msg = 'hello';
        module.exports.message = msg;
      </wxs>
      <div>{{m1.message}} june</div>
    `
  }));
  expect(comp.dom.innerHTML).toBe('<div>hello june</div>');
});

test('classPrefix', () => {
  let comp = jComponent.create(jComponent.register({
    template: `
      <div class="abc">123</div>
      <div class="cba">321</div>
      <div class="abc">456</div>
    `,
    options: {
      classPrefix: 'haha',
    },
  }));
  expect(comp.dom.innerHTML).toBe('<div class="haha--abc">123</div><div class="haha--cba">321</div><div class="haha--abc">456</div>');
});

test('block', () => {
  let comp = jComponent.create(jComponent.register({
    template: `
      <block><div>123</div></block>
      <block>456</block>
      <block wx:if="{{flag}}"><div>789</div></block>
      <block wx:else><div>101112</div></block>
      <block wx:for="{{list}}">
        <div>{{index}}</div>
        <div>{{item}}</div>
      </block>
    `,
    data: {
      flag: false,
      list: ['a', 'b']
    },
  }));

  expect(comp.dom.innerHTML).toBe('<div>123</div>456<div>101112</div><div>0</div><div>a</div><div>1</div><div>b</div>');
});
