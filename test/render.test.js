const jComponent = require('../src/index')
const _ = require('./utils')

test('normal attr', () => {
  let comp = jComponent.create(jComponent.register({
    template: '<div id="abc" class="abc">123</div>',
  }))
  expect(comp.dom.innerHTML).toBe('<div class="abc">123</div>')

  comp = jComponent.create(jComponent.register({
    template: '<div id="" class=""></div>',
  }))
  expect(comp.dom.innerHTML).toBe('<div></div>')
})

test('slot', () => {
  const inner = jComponent.register({
    template: '<div><slot/></div>',
  })
  const outer = jComponent.create(jComponent.register({
    template: '<inner>123</inner>',
    usingComponents: {inner},
  }))
  expect(outer.dom.innerHTML).toBe('<inner><div>123</div></inner>')
})

test('style', () => {
  const inner = jComponent.register({
    template: '<div style="width: 100rpx;"></div>',
  })
  const outer = jComponent.create(jComponent.register({
    template: '<inner style=""></inner>',
    usingComponents: {inner},
  }))
  expect(outer.dom.innerHTML).toBe('<inner style=""><div style="width: 100px;"></div></inner>')
})

test('properties', () => {
  const inner = jComponent.register({
    properties: {
      a: Number,
    },
    template: '<div></div>',
  })
  const outer = jComponent.create(jComponent.register({
    template: '<inner a="123"></inner>',
    usingComponents: {inner},
  }))
  expect(outer.dom.innerHTML).toBe('<inner><div></div></inner>')
})

test('properties with dash', () => {
  const inner = jComponent.register({
    properties: {
      a: Number,
      bC: String,
    },
    template: '<div>{{a}} {{bC}}</div>',
  })
  const outer = jComponent.create(jComponent.register({
    template: '<inner a="123" b-c="321"></inner>',
    usingComponents: {inner},
  }))
  expect(outer.dom.innerHTML).toBe('<inner><div>123 321</div></inner>')
})

test('dataset', () => {
  const inner = jComponent.register({
    template: '<div></div>',
  })
  const outer = jComponent.create(jComponent.register({
    template: '<inner data-a="123"></inner>',
    usingComponents: {inner},
  }))
  expect(outer.dom.innerHTML).toBe('<inner data-a="123"><div></div></inner>')
})

test('condition statement', () => {
  const comp = jComponent.create(jComponent.register({
    template: `
      <div wx:if="{{flag === 0}}">0</div>
      <div wx:elif="{{flag === 1}}">1</div>
      <div wx:elif="{{flag === 2}}">2</div>
      <div wx:else>3</div>
    `,
    data: {
      flag: 0,
    },
  }))

  expect(comp.dom.innerHTML).toBe('<div>0</div>')
  comp.setData({flag: 2})
  expect(comp.dom.innerHTML).toBe('<div>2</div>')

  comp.setData({flag: 1})
  expect(comp.dom.innerHTML).toBe('<div>1</div>')

  comp.setData({flag: 4})
  expect(comp.dom.innerHTML).toBe('<div>3</div>')

  comp.setData({flag: 0})
  expect(comp.dom.innerHTML).toBe('<div>0</div>')
})

test('for statement', () => {
  const comp = jComponent.create(jComponent.register({
    template: `
      <div wx:for="{{list}}" wx:key="id" wx:for-item="a" wx:for-index="idx">{{idx}}-{{a.value}}</div>
    `,
    data: {
      list: [],
    },
  }))

  expect(comp.dom.innerHTML).toBe('')
  comp.setData({
    list: [
      {id: 1, value: '1'},
      {value: '2'},
      {id: 3, value: '3'},
    ],
  })
  expect(comp.dom.innerHTML).toBe('<div>0-1</div><div>1-2</div><div>2-3</div>')
})

test('externalClasses', () => {
  const comp = jComponent.register({
    template: '<div>123</div>',
  })
  const inner = jComponent.register({
    template: '<comp class="my-class"></comp>',
    externalClasses: ['my-class'],
    usingComponents: {comp},
    options: {
      classPrefix: 'xxx', // 追加私有化前缀方可令 externalClasses 生效
    },
  })
  const outer = jComponent.create(jComponent.register({
    template: '<inner my-class="abc">></inner>',
    usingComponents: {inner},
  }))

  expect(outer.dom.innerHTML).toBe('<inner><comp class="abc"><div>123</div></comp></inner>')
})

test('event', async () => {
  const inner = jComponent.register({
    template: '<div><slot/></div>',
  })
  const outer = jComponent.create(jComponent.register({
    template: '<inner class="inner" binda="onA" catchb="onB" bind:c="onC" bindtouchstart=""><div>{{text}}</div></inner>',
    usingComponents: {inner},
    data: {
      text: '123'
    },
    methods: {
      onA() { this.setData({text: 'a'}) },
      onB() { this.setData({text: 'b'}) },
      onC() { this.setData({text: 'c'}) },
    },
  }))
  expect(outer.dom.innerHTML).toBe('<inner class="inner"><div><div>123</div></div></inner>')
  outer.querySelector('.inner').dispatchEvent('a')
  await _.sleep(0)
  expect(outer.dom.innerHTML).toBe('<inner class="inner"><div><div>a</div></div></inner>')
  outer.querySelector('.inner').dispatchEvent('b')
  await _.sleep(0)
  expect(outer.dom.innerHTML).toBe('<inner class="inner"><div><div>b</div></div></inner>')
  outer.querySelector('.inner').dispatchEvent('c')
  await _.sleep(0)
  expect(outer.dom.innerHTML).toBe('<inner class="inner"><div><div>c</div></div></inner>')
})

test('mut event', async () => {
  let eventList = []
  const view = jComponent.register({
    template: '<div><slot/></div>',
  })
  const comp = jComponent.create(jComponent.register({
    usingComponents: {view},
    template: `
      <view id="outer" mut-bind:tap="handleTap1">
        outer view
        <view id="middle" bindtap="handleTap2">
          middle view
          <view id="inner" mut-bind:tap="handleTap3">
            inner view
          </view>
        </view>
      </view>
    `,
    methods: {
      handleTap1() {
        eventList.push('tap1')
      },
      handleTap2() {
        eventList.push('tap2')
      },
      handleTap3() {
        eventList.push('tap3')
      },
    }
  }))

  comp.querySelector('#inner').dispatchEvent('tap')
  await _.sleep(10)
  expect(eventList).toEqual(['tap3', 'tap2'])
  eventList = []
  comp.querySelector('#middle').dispatchEvent('tap')
  await _.sleep(0)
  expect(eventList).toEqual(['tap2', 'tap1'])
})

test('wxs', () => {
  const comp = jComponent.create(jComponent.register({
    template: `
      <wxs module="m1">
        var msg = 'hello';
        module.exports.message = msg;
      </wxs>
      <div>{{m1.message}} june</div>
    `
  }))
  expect(comp.dom.innerHTML).toBe('<div>hello june</div>')
})

test('classPrefix', () => {
  const comp = jComponent.create(jComponent.register({
    template: `
      <div class="abc">123</div>
      <div class="cba">321</div>
      <div class="abc">456</div>
    `,
    options: {
      classPrefix: 'haha',
    },
  }))
  expect(comp.dom.innerHTML).toBe('<div class="haha--abc">123</div><div class="haha--cba">321</div><div class="haha--abc">456</div>')
})

test('block', () => {
  const comp = jComponent.create(jComponent.register({
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
  }))

  expect(comp.dom.innerHTML).toBe('<div>123</div>456<div>101112</div><div>0</div><div>a</div><div>1</div><div>b</div>')
})

test('animation', async () => {
  const comp = jComponent.create(jComponent.register({
    template: '<div id="a" animation="{{animationData}}" style="background: red; height: 100rpx; width: 100rpx;"></div>',
    data: {
      animationData: {},
    },
    methods: {
      animate() {
        const animation = _.createAnimation({
          duration: 200,
          timingFunction: 'ease',
        })

        animation.scale(2, 2).rotate(45).step()
        animation.translate(30).step()
        animation.width(50).step()

        this.setData({
          animationData: animation.export(),
        })
      },
    }
  }))

  comp.instance.animate()
  const a = comp.querySelector('#a')

  await _.sleep(10)

  expect(a.dom.style.cssText).toBe('background: red; height: 100px; width: 100px; transition: 200ms ease 0ms; transition-property: transform; transform: scale(2,2) rotate(45deg); transform-origin: 50% 50% 0; webkit-transition: 200ms ease 0ms; webkit-transition-property: transform; webkit-transform: scale(2,2) rotate(45deg); webkit-transform-origin: 50% 50% 0;')

  a.dispatchEvent('transitionend')
  await _.sleep(10)
  expect(a.dom.style.cssText).toBe('background: red; height: 100px; width: 100px; transition: 200ms ease 0ms; transition-property: transform; transform: scale(2,2) rotate(45deg) translate(30px,0px); transform-origin: 50% 50% 0; webkit-transition: 200ms ease 0ms; webkit-transition-property: transform; webkit-transform: scale(2,2) rotate(45deg) translate(30px,0px); webkit-transform-origin: 50% 50% 0;')

  a.dispatchEvent('transitionend')
  await _.sleep(10)
  expect(a.dom.style.cssText).toBe('background: red; height: 100px; width: 50px; transition: 200ms ease 0ms; transition-property: transform,width; transform: scale(2,2) rotate(45deg) translate(30px,0px); transform-origin: 50% 50% 0; webkit-transition: 200ms ease 0ms; webkit-transition-property: transform,width; webkit-transform: scale(2,2) rotate(45deg) translate(30px,0px); webkit-transform-origin: 50% 50% 0;')

  // 动画已结束，不再作任何变化
  a.dispatchEvent('transitionend')
  await _.sleep(10)
  expect(a.dom.style.cssText).toBe('background: red; height: 100px; width: 50px; transition: 200ms ease 0ms; transition-property: transform,width; transform: scale(2,2) rotate(45deg) translate(30px,0px); transform-origin: 50% 50% 0; webkit-transition: 200ms ease 0ms; webkit-transition-property: transform,width; webkit-transform: scale(2,2) rotate(45deg) translate(30px,0px); webkit-transform-origin: 50% 50% 0;')
})
