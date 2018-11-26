const jComponent = require('../src/index');
const _ = require('./utils');

beforeAll(() => {
  _.env();
});

test('register behavior', () => {
  let behavior = jComponent.behavior({});

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
  let id = jComponent.register({
    template: `<view wx:for="{{list}}">{{index + '-' + item}}</view><span><slot/></span>`,
    properties: {
      list: {
        type: Array,
        public: true,
        value: [],
      }
    },
  });
  let comp = jComponent.create(id, { list: ['a', 'b'] });

  expect(id.length).toBe(13);
  expect(comp.dom.tagName.length).toBe(13);
  expect(comp.dom.innerHTML).toBe('<wx-view><div>0-a</div></wx-view><wx-view><div>1-b</div></wx-view><span></span>');
});

test('querySelector', () => {
  let compaId = jComponent.register({
    template: `<view wx:for="{{list}}">{{index + '-' + item}}</view><span><slot/></span>`,
    properties: {
      list: {
        type: Array,
        value: [],
      }
    },
  });
  let comp = jComponent.create(jComponent.register({
    tagName: 'compb',
    template: `
      <view>{{prop}}</view>
      <view class="a" style="{{styleObject.style}}" bindtap="onTap1">{{index}}</view>
      <view wx:if="{{index !== 0}}">if</view>
      <view wx:elif="{{index === 0}}">elif</view>
      <view wx:else>else</view>
      <compa id="compa" class="a" list="{{list}}">{{index}}</compa>
    `,
    usingComponents: {
      'compa': compaId,
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
  }), { prop: 'prop-value' });

  expect(comp.dom.tagName).toBe('COMPB');
  expect(comp.dom.innerHTML).toBe('<wx-view><div>prop-value</div></wx-view><wx-view class="a" style="color: green;"><div>0</div></wx-view><wx-view><div>elif</div></wx-view><compa class="a"><wx-view><div>0-1</div></wx-view><wx-view><div>1-2</div></wx-view><span>0</span></compa>');

  let node1List = comp.querySelectorAll('.a');
  expect(node1List.length).toBe(2);
  let node1 = node1List[0];
  expect(node1.dom.tagName).toBe('WX-VIEW');
  expect(node1.dom.innerHTML).toBe('<div>0</div>')

  let node2 = comp.querySelector('#compa');
  expect(node2.dom.tagName).toBe('COMPA');
  expect(node2.dom.innerHTML).toBe('<wx-view><div>0-1</div></wx-view><wx-view><div>1-2</div></wx-view><span>0</span>');
});

test('dispatchEvent', async () => {
  let eventList = [];
  let blurCount = 0;
  let touchStartCount = 0;
  let touchMoveCount = 0;
  let touchEndCount = 0;
  let touchCancelCount = 0;
  let longPressCount = 0;
  let behavior = jComponent.behavior({
    methods: {
      onTap1(evt) {
        eventList.push(this.data.index);
      },
    }
  });
  let compaId = jComponent.register({
    template: `<view wx:for="{{list}}">{{index + '-' + item}}</view><span><slot/></span>`,
    properties: {
      list: {
        type: Array,
        value: [],
      }
    },
  });
  let comp = jComponent.create(jComponent.register({
    template: `
      <view class="a" style="{{styleObject.style}}" bindblur="onBlur" bindtap="onTap1" bindlongpress="onLongPress" bindtouchstart="onTouchStart" bindtouchmove="onTouchMove" bindtouchend="onTouchEnd" bindtouchcancel="onTouchCancel">{{index}}</view>
      <view wx:if="{{index !== 0}}">if</view>
      <view wx:elif="{{index === 0}}">elif</view>
      <view wx:else>else</view>
      <compa id="compa" bindtap="onTap2" list="{{list}}">{{index}}</compa>
    `,
    usingComponents: {
      'compa': compaId,
    },
    behaviors: [behavior],
    data: {
      index: 0,
      styleObject: {
        style: 'color: green;',
      },
      list: [1, 2],
    },
    methods: {
      onBlur() {
        blurCount++;
      },
      onTap2() {
        this.setData({
          index: ++this.data.index,
          'styleObject.style': 'color: red;',
          list: [2, 3, 4],
        });
      },
      onLongPress() {
        longPressCount++;
      },
      onTouchStart() {
        touchStartCount++;
      },
      onTouchMove() {
        touchMoveCount++;
      },
      onTouchEnd() {
        touchEndCount++;
      },
      onTouchCancel() {
        touchCancelCount++;
      },
    }
  }));

  let node1 = comp.querySelector('.a');
  node1.dispatchEvent('tap');
  expect(eventList).toEqual([0]);

  // 触发 tap
  node1.dispatchEvent('touchstart');
  node1.dispatchEvent('touchend');
  expect(eventList).toEqual([0, 0]);
  expect(touchStartCount).toBe(1);
  expect(touchEndCount).toBe(1);

  // touchmove
  node1.dispatchEvent('touchstart');
  node1.dispatchEvent('touchmove', { touches: [{ x: 5, y: 5 }] });
  node1.dispatchEvent('touchmove', { touches: [{ x: 10, y: 10 }] });
  node1.dispatchEvent('touchend');
  expect(eventList).toEqual([0, 0]);
  expect(touchStartCount).toBe(2);
  expect(touchMoveCount).toBe(2);
  expect(touchEndCount).toBe(2);

  // 滚动后在保护时间内触发 touch 事件不触发 tap
  node1.dispatchEvent('scroll');
  node1.dispatchEvent('touchstart');
  node1.dispatchEvent('touchend');
  expect(eventList).toEqual([0, 0]);
  expect(touchStartCount).toBe(3);
  expect(touchEndCount).toBe(3);

  // 滚动后超过保护时间，触发 tap
  node1.dispatchEvent('scroll');
  await _.sleep(200);
  node1.dispatchEvent('touchstart');
  node1.dispatchEvent('touchend');
  expect(eventList).toEqual([0, 0, 0]);
  expect(touchStartCount).toBe(4);
  expect(touchEndCount).toBe(4);

  // longpress
  node1.dispatchEvent('touchstart');
  await _.sleep(400);
  node1.dispatchEvent('touchend');
  expect(eventList).toEqual([0, 0, 0]);
  expect(touchStartCount).toBe(5);
  expect(touchEndCount).toBe(5);
  expect(longPressCount).toBe(1);

  // touchcancel
  node1.dispatchEvent('touchstart');
  node1.dispatchEvent('touchcancel');
  expect(touchStartCount).toBe(6);
  expect(touchCancelCount).toBe(1);

  // blur
  node1.dispatchEvent('blur');
  expect(blurCount).toBe(1);
  node1.dispatchEvent('touchstart');
  node1.dispatchEvent('blur');
  node1.dispatchEvent('touchcancel');
  expect(touchStartCount).toBe(7);
  expect(touchCancelCount).toBe(2);
  expect(blurCount).toBe(2);

  // touchcancel 后触发其他触摸事件
  node1.dispatchEvent('touchstart');
  node1.dispatchEvent('touchcancel');
  node1.dispatchEvent('touchmove');
  node1.dispatchEvent('touchend');
  node1.dispatchEvent('touchcancel');
  expect(touchStartCount).toBe(8);
  expect(touchMoveCount).toBe(3);
  expect(touchEndCount).toBe(6);
  expect(touchCancelCount).toBe(4);

  // 多指触摸
  node1.dispatchEvent('touchstart', { touches: [{ x: 1, y: 1 }, { x: 2, y: 2 }] });
  node1.dispatchEvent('touchstart', { touches: [{ x: 3, y: 3 }] });
  node1.dispatchEvent('touchmove', { touches: [{ x: 5, y: 5 }, { x: 10, y: 10 }] });
  node1.dispatchEvent('touchend', { touches: [{ x: 5, y: 5 }] });
  expect(eventList).toEqual([0, 0, 0]);
  expect(touchStartCount).toBe(10);
  expect(touchMoveCount).toBe(4);
  expect(touchEndCount).toBe(7);
  expect(touchCancelCount).toBe(4);
  expect(longPressCount).toBe(1);

  let node2 = comp.querySelector('#compa');
  node2.dispatchEvent('tap');
  expect(comp.dom.innerHTML).toBe('<wx-view class="a" style="color: red;"><div>1</div></wx-view><wx-view><div>if</div></wx-view><compa><wx-view><div>0-2</div></wx-view><wx-view><div>1-3</div></wx-view><wx-view><div>2-4</div></wx-view><span>1</span></compa>');
});

test('setData', () => {
  let callbackCheck = [];
  let comp = jComponent.create(jComponent.register({
    template: `<view>{{num}}</view>`,
    data: {
      num: 0,
    },
  }));

  expect(comp.dom.innerHTML).toBe('<wx-view><div>0</div></wx-view>');
  comp.setData({ num: 2 }, () => {
    callbackCheck.push(0);
  });
  expect(comp.dom.innerHTML).toBe('<wx-view><div>2</div></wx-view>');
  expect(callbackCheck.length).toBe(1);
});

test('getData', () => {
  let comp = jComponent.create(jComponent.register({
    template: `<view>123</view>`,
    data: {
      num: 0,
    },
  }));

  expect(comp.data.num).toBe(0);

  comp.setData({ num: 2 });
  expect(comp.data.num).toBe(2);

  comp.setData({ num: 'I am a string' });
  expect(comp.data.num).toBe('I am a string');
});

test('update event', () => {
  let comp = jComponent.create(jComponent.register({
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
  }));

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
  let comp = jComponent.create(jComponent.register({
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
  }));
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

test('error', () => {
  let catchErr = null
  try {
    jComponent.register();
  } catch (err) {
    catchErr = err;
  }
  expect(catchErr.message).toBe('invalid template');

  catchErr = null;
  try {
    jComponent.register({
      template: `<comp>{{num}}</comp>`,
      usingComponents: {
        'comp': 12345,
      },
      data: {
        num: 0,
      },
    });
  } catch (err) {
    catchErr = err;
  }
  expect(catchErr.message).toBe('component comp not found');

  expect(jComponent.create(123456)).toBe(undefined);
});
