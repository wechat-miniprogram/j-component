const jComponent = require('../src/index');
const _ = require('./utils');

beforeAll(() => {
  _.env();

  jComponent.register({
    id: 'view',
    tagName: 'wx-view',
    template: '<div><slot/></div>'
  });
});

test('this.data/this.properties', () => {
  const comp = jComponent.create(jComponent.register({
    template: `<div>123</div>`,
    properties: {
      aa: {
        type: String,
        value: '321',
      },
    },
    data: {
      bb: 123,
    },
  }));

  expect(comp.instance.data.bb).toBe(123);
  expect(comp.instance.data.aa).toBe('321');
  expect(comp.instance.properties.aa).toBe('321');
});

test('this.dataset', () => {
  const comp = jComponent.create(jComponent.register({
    template: `<div id="abc" data-a="123" data-b="321">123</div>`,
  }));
  const child = comp.querySelector('#abc');

  expect(child.instance.dataset.a).toBe('123');
  expect(child.instance.dataset.b).toBe('321');
});

test('this.id/this.is', () => {
  const comp = jComponent.create(jComponent.register({
    template: `<view id="abc">123</view>`,
  }));
  const child = comp.querySelector('#abc');

  expect(child.instance.id).toBe('abc');
  expect(child.instance.is).toBe('view');
});

test('this.setData/this.hasBehavior/this.triggerEvent', () => {
  const comp = jComponent.create(jComponent.register({
    template: `<div>123</div>`,
  }));

  expect(typeof comp.instance.setData).toBe('function');
  expect(typeof comp.instance.hasBehavior).toBe('function');
  expect(typeof comp.instance.triggerEvent).toBe('function');
});

test('this.selectComponent/this.selectAllComponents', () => {
  const comp = jComponent.create(jComponent.register({
    template: `<div id="abc">123</div>`,
  }));

  expect(comp.instance.selectComponent('#abc').$$.innerHTML).toBe('123');
  expect(comp.instance.selectAllComponents('#abc')[0].$$.innerHTML).toBe('123');
});
