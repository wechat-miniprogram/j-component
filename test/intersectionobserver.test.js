const _ = require('./utils');
const jComponent = require('../src/index');
const IntersectionObserver = require('../src/tool/intersectionobserver');

function simulateScroll(comp, scrollTop, times = 50) {
  const dom = comp.dom;
  const delta = scrollTop - dom.scrollTop;
  const unit = delta / times;

  for (let i = 0; i < times; i++) {
    if (i === times - 1) dom.scrollTop = scrollTop;
    else dom.scrollTop += unit;

    dom.dispatchEvent(new Event('scroll', { bubbles: true, cancelable: false }));
  }
}

beforeAll(() => {
  _.env();
});

test('IntersectionObserver', async () => {
  const comp = jComponent.create(jComponent.register({
    template: `<div id="outer" style="width: 100px; height: 100px; overflow: scroll;">
      <div id="inner" style="position: relative; width: 100px; height: 500px;">
        <div id="block" style="position: absolute; top: 300px; left: 0; width: 100%; height: 40px;"></div>
      </div>
    </div>`,
  }));
  const outer = comp.querySelector('#outer');
  comp.attach(document.body);

  let intersectionObserver = new IntersectionObserver(comp);
  let resList = [];
  intersectionObserver.relativeTo('#outer').observe('#block', res => resList.push(res));
  simulateScroll(outer, 320);
  await _.sleep(10);
  expect(resList).toEqual([]); // jsdom 没有实现布局引擎，getBoundingClientRect 返回各字段永远为 0，所以这个 intersesionObserver 无法很好的模拟
  intersectionObserver.disconnect();
  comp.detach();

  intersectionObserver = new IntersectionObserver(comp, {
    thresholds: [10, 30],
    initialRatio: 20,
    observeAll: true,
  });
  resList = [];
  intersectionObserver.relativeTo('#outer').observe('#block', res => resList.push(res));
  comp.attach(document.body); // 先创建 intersectionObserver 再 attached
  simulateScroll(outer, 320);
  await _.sleep(10);
  expect(resList).toMatchObject([{
    boundingClientRect: { bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 },
    dataset: {},
    id: 'block',
    intersectionRatio: 0,
    intersectionRect: { bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 },
    relativeRect: { bottom: 0, left: 0, right: 0, top: 0 },
  }]); // 同上
  comp.detach();
  intersectionObserver.disconnect(); // detach 之后再 disconnect

  intersectionObserver = new IntersectionObserver(comp);
  resList = [];
  intersectionObserver.relativeToViewport().observe('#block', res => resList.push(res));
  simulateScroll(outer, 320);
  await _.sleep(10);
  expect(resList).toEqual([]);
  intersectionObserver.disconnect();
});

test('createIntersectionObserver', () => {
  const comp = jComponent.create(jComponent.register({
    template: `<div id="outer" style="width: 100px; height: 100px; overflow: scroll;">
      <div id="inner" style="position: relative; width: 100px; height: 500px;">
        <div id="block" style="position: absolute; top: 300px; left: 0; width: 100%; height: 40px;"></div>
      </div>
    </div>`,
    methods: {
      getIntersectionObserver() {
        return this.createIntersectionObserver();
      },
    },
  }));

  expect(comp.instance.getIntersectionObserver()._exparserNode).toBe(comp.instance._exparserNode);
});
