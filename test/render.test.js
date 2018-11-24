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

test('condition', () => {
  let inner = jComponent.register({
    template: '<div wx:if="{{true}}">123</div><span wx:else>321</span>',
  });
  let outer = jComponent.create(jComponent.register({
    template: '<inner></inner>',
    usingComponents: { inner },
  }));
  expect(outer.dom.innerHTML).toBe('<inner><div>123</div></inner>');
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
      classPrefix: 'xxx', // 私有化前缀方可令 externalClasses 生效
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
