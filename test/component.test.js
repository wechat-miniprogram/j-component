const jComponent = require('../src/index')
const _ = require('./utils')
const {getId} = require('../src/tool/utils')

beforeAll(() => {
  _.env()
})

test('register behavior', () => {
  const behavior = jComponent.behavior({})

  expect(behavior.length).toBe(13)
})

test('register and create global component', () => {
  const id = jComponent.register({
    id: 'view',
    tagName: 'wx-view',
    template: '<div><slot/></div>'
  })
  const view = jComponent.create(id)

  expect(id).toBe('view')
  expect(view.dom.tagName).toBe('WX-VIEW')
  expect(view.dom.innerHTML).toBe('<div></div>')
})

test('register and create normal component', () => {
  const id = jComponent.register({
    template: '<view wx:for="{{list}}">{{index + \'-\' + item}}</view><span><slot/>{{a}}</span>',
    properties: {
      list: {
        type: Array,
        public: true,
        value: [],
        observer(newVal, oldVal) {
          this.setData({
            observerArr1: [newVal, oldVal],
          })
        },
      },
      a: {
        type: String,
        public: true,
        value: '',
        observer(newVal, oldVal) {
          this.setData({
            observerArr2: [newVal, oldVal],
          })
        },
      },
    },
  })
  const comp = jComponent.create(id, {list: ['a', 'b'], a: 'test'})

  expect(id.length).toBe(13)
  expect(comp.dom.tagName.length).toBe(13)
  expect(comp.dom.innerHTML).toBe('<wx-view><div>0-a</div></wx-view><wx-view><div>1-b</div></wx-view><span>test</span>')
  expect(comp.instance.data.observerArr1).toEqual([['a', 'b'], []])
  expect(comp.instance.data.observerArr2).toEqual(['test', ''])
})

test('register component with default form behavior', () => {
  const id = jComponent.register({
    id: 'wx-input',
    tagName: 'wx-input',
    template: '<input name="{{name}}" value="{{value}}"></input>',
    behaviors: ['wx://form-field'],
    properties: {}
  })
  const comp = jComponent.create(id, {name: 'idcard', value: '123456'})

  expect(id).toBe('wx-input')
  expect(comp.instance.data.name).toEqual('idcard')
  expect(comp.instance.data.value).toEqual('123456')
})

test('instance', () => {
  const data = {
    a: 1,
    c: 3,
  }
  const func = (a, b) => a + b
  let that = null
  const comp = jComponent.create(jComponent.register({
    template: '<view class="a">123</view>',
    data,
    attached() {
      that = this
    },
    methods: {
      sum: func,
    }
  }))

  const parent = document.createElement('div')
  comp.attach(parent)
  expect(comp.instance).toBe(that)
  expect(comp.instance.data).toEqual(data)
  expect(comp.instance.sum(95, 27)).toBe(122)
})

test('querySelector', () => {
  let observerArr = []
  const compaId = jComponent.register({
    template: '<view class="item" wx:for="{{list}}">{{index + \'-\' + item}}</view><span><slot/></span>',
    properties: {
      list: {
        type: Array,
        value: [],
        observer(newVal, oldVal) {
          observerArr = [newVal, oldVal]
        }
      }
    },
  })
  const comp = jComponent.create(jComponent.register({
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
      compa: compaId,
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
  }), {prop: 'prop-value'})

  expect(comp.dom.tagName).toBe('COMPB')
  expect(comp.dom.innerHTML).toBe('<wx-view><div>prop-value</div></wx-view><wx-view class="a" style="color: green;"><div>0</div></wx-view><wx-view><div>elif</div></wx-view><compa class="a"><wx-view class="item"><div>0-1</div></wx-view><wx-view class="item"><div>1-2</div></wx-view><span>0</span></compa>')

  const node1List = comp.querySelectorAll('.a')
  expect(node1List.length).toBe(2)
  const node1 = node1List[0]
  expect(node1.dom.tagName).toBe('WX-VIEW')
  expect(node1.dom.innerHTML).toBe('<div>0</div>')

  const node2 = comp.querySelector('#compa')
  expect(node2.dom.tagName).toBe('COMPA')
  expect(node2.dom.innerHTML).toBe('<wx-view class="item"><div>0-1</div></wx-view><wx-view class="item"><div>1-2</div></wx-view><span>0</span>')

  const firstItem = node2.querySelector('.item')
  const items = node2.querySelectorAll('.item')
  expect(firstItem.dom.innerHTML).toBe(items[0].dom.innerHTML)
  expect(items[0].dom.innerHTML).toBe('<div>0-1</div>')
  expect(items[1].dom.innerHTML).toBe('<div>1-2</div>')

  comp.setData({
    list: [1, 2, 3],
  })
  expect(observerArr).toEqual([[1, 2, 3], [1, 2]])
})

test('dispatchEvent', async () => {
  const eventList = []
  let blurCount = 0
  let touchStartCount = 0
  let touchMoveCount = 0
  let touchEndCount = 0
  let touchCancelCount = 0
  let longPressCount = 0
  const behavior = jComponent.behavior({
    methods: {
      onTap1() {
        eventList.push(this.data.index)
      },
    }
  })
  const compaId = jComponent.register({
    template: '<view wx:for="{{list}}">{{index + \'-\' + item}}</view><span><slot/></span>',
    properties: {
      list: {
        type: Array,
        value: [],
      }
    },
    methods: {
      triggerCustomA() {
        this.triggerEvent('customa', {
          index: 998,
        })
      }
    },
  })
  const comp = jComponent.create(jComponent.register({
    template: `
      <view class="a" style="{{styleObject.style}}" bindblur="onBlur" bindtap="onTap1" bindlongpress="onLongPress" bindtouchstart="onTouchStart" bindtouchmove="onTouchMove" bindtouchend="onTouchEnd" bindtouchcancel="onTouchCancel">{{index}}</view>
      <view wx:if="{{index !== 0}}">if</view>
      <view wx:elif="{{index === 0}}">elif</view>
      <view wx:else>else</view>
      <compa id="compa" bindtap="onTap2" list="{{list}}" bindcustoma="onCustomA">{{index}}</compa>
    `,
    usingComponents: {
      compa: compaId,
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
        blurCount++
      },
      onTap2(e) {
        expect(e.detail.userInfo.nickName).toBe('hello')
        this.setData({
          index: ++this.data.index,
          'styleObject.style': 'color: red;',
          list: [2, 3, 4],
        })
      },
      onLongPress() {
        longPressCount++
      },
      onTouchStart() {
        touchStartCount++
      },
      onTouchMove() {
        touchMoveCount++
      },
      onTouchEnd() {
        touchEndCount++
      },
      onTouchCancel() {
        touchCancelCount++
      },
      onCustomA(evt) {
        this.setData({
          index: evt.detail.index,
        })
      },
    }
  }))

  const node1 = comp.querySelector('.a')
  node1.dispatchEvent('tap')
  await _.sleep(10)
  expect(eventList).toEqual([0])

  // 触发 tap
  node1.dispatchEvent('touchstart')
  node1.dispatchEvent('touchend')
  await _.sleep(10)
  expect(eventList).toEqual([0, 0])
  expect(touchStartCount).toBe(1)
  expect(touchEndCount).toBe(1)

  // touchmove
  node1.dispatchEvent('touchstart')
  node1.dispatchEvent('touchmove', {touches: [{x: 5, y: 5}]})
  node1.dispatchEvent('touchmove', {touches: [{x: 10, y: 10}]})
  node1.dispatchEvent('touchend')
  await _.sleep(10)
  expect(eventList).toEqual([0, 0])
  expect(touchStartCount).toBe(2)
  expect(touchMoveCount).toBe(2)
  expect(touchEndCount).toBe(2)

  // 滚动后在保护时间内触发 touch 事件不触发 tap
  node1.dispatchEvent('scroll')
  node1.dispatchEvent('touchstart')
  node1.dispatchEvent('touchend')
  await _.sleep(10)
  expect(eventList).toEqual([0, 0])
  expect(touchStartCount).toBe(3)
  expect(touchEndCount).toBe(3)

  // 滚动后超过保护时间，触发 tap
  node1.dispatchEvent('scroll')
  await _.sleep(200)
  node1.dispatchEvent('touchstart')
  node1.dispatchEvent('touchend')
  await _.sleep(10)
  expect(eventList).toEqual([0, 0, 0])
  expect(touchStartCount).toBe(4)
  expect(touchEndCount).toBe(4)

  // longpress
  node1.dispatchEvent('touchstart')
  await _.sleep(400)
  node1.dispatchEvent('touchend')
  await _.sleep(10)
  expect(eventList).toEqual([0, 0, 0])
  expect(touchStartCount).toBe(5)
  expect(touchEndCount).toBe(5)
  expect(longPressCount).toBe(1)

  // touchcancel
  node1.dispatchEvent('touchstart')
  node1.dispatchEvent('touchcancel')
  await _.sleep(10)
  expect(touchStartCount).toBe(6)
  expect(touchCancelCount).toBe(1)

  // blur
  node1.dispatchEvent('blur')
  await _.sleep(10)
  expect(blurCount).toBe(1)
  node1.dispatchEvent('touchstart')
  node1.dispatchEvent('blur')
  node1.dispatchEvent('touchcancel')
  await _.sleep(10)
  expect(touchStartCount).toBe(7)
  expect(touchCancelCount).toBe(2)
  expect(blurCount).toBe(2)

  // touchcancel 后触发其他触摸事件
  node1.dispatchEvent('touchstart')
  node1.dispatchEvent('touchcancel')
  node1.dispatchEvent('touchmove')
  node1.dispatchEvent('touchend')
  node1.dispatchEvent('touchcancel')
  await _.sleep(10)
  expect(touchStartCount).toBe(8)
  expect(touchMoveCount).toBe(3)
  expect(touchEndCount).toBe(6)
  expect(touchCancelCount).toBe(4)

  // 多指触摸
  node1.dispatchEvent('touchstart', {touches: [{x: 1, y: 1}, {x: 2, y: 2}]})
  node1.dispatchEvent('touchstart', {touches: [{x: 3, y: 3}]})
  node1.dispatchEvent('touchmove', {touches: [{x: 5, y: 5}, {x: 10, y: 10}]})
  node1.dispatchEvent('touchend', {touches: [{x: 5, y: 5}]})
  await _.sleep(10)
  expect(eventList).toEqual([0, 0, 0])
  expect(touchStartCount).toBe(10)
  expect(touchMoveCount).toBe(4)
  expect(touchEndCount).toBe(7)
  expect(touchCancelCount).toBe(4)
  expect(longPressCount).toBe(1)

  const node2 = comp.querySelector('#compa')
  node2.dispatchEvent('tap', {detail: {userInfo: {nickName: 'hello'}}})
  await _.sleep(10)
  expect(comp.dom.innerHTML).toBe('<wx-view class="a" style="color: red;"><div>1</div></wx-view><wx-view><div>if</div></wx-view><compa><wx-view><div>0-2</div></wx-view><wx-view><div>1-3</div></wx-view><wx-view><div>2-4</div></wx-view><span>1</span></compa>')

  // 自组件事件
  node2.instance.triggerCustomA()
  await _.sleep(10)
  expect(comp.dom.innerHTML).toBe('<wx-view class="a" style="color: red;"><div>998</div></wx-view><wx-view><div>if</div></wx-view><compa><wx-view><div>0-2</div></wx-view><wx-view><div>1-3</div></wx-view><wx-view><div>2-4</div></wx-view><span>998</span></compa>')

  node2.instance.triggerEvent('customa', {index: 999})
  await _.sleep(10)
  expect(comp.dom.innerHTML).toBe('<wx-view class="a" style="color: red;"><div>999</div></wx-view><wx-view><div>if</div></wx-view><compa><wx-view><div>0-2</div></wx-view><wx-view><div>1-3</div></wx-view><wx-view><div>2-4</div></wx-view><span>999</span></compa>')

  node2.dispatchEvent('customa', {detail: {index: 990}})
  await _.sleep(10)
  expect(comp.dom.innerHTML).toBe('<wx-view class="a" style="color: red;"><div>990</div></wx-view><wx-view><div>if</div></wx-view><compa><wx-view><div>0-2</div></wx-view><wx-view><div>1-3</div></wx-view><wx-view><div>2-4</div></wx-view><span>990</span></compa>')

  // 其他自定义事件
  let event = null
  comp.dom.addEventListener('test', evt => {
    event = evt
  })
  comp.dispatchEvent('test')
  await _.sleep(10)
  expect(event.type).toBe('test')
})

test('setData', async () => {
  const callbackCheck = []
  const childId = jComponent.register({
    tagName: 'child',
    template: '<view><slot/>-{{show}}</view>',
    data: {
      show: 1,
    },
  })
  const comp = jComponent.create(jComponent.register({
    template: '<child id="a">{{num}}</child>',
    data: {
      num: 0,
    },
    usingComponents: {
      child: childId
    },
  }))

  expect(comp.dom.innerHTML).toBe('<child><wx-view><div>0-1</div></wx-view></child>')
  comp.setData({num: 2}, () => {
    callbackCheck.push(0)
  })
  await _.sleep(10)
  expect(callbackCheck.length).toBe(1)
  comp.querySelector('#a').setData({show: 14}, () => {
    callbackCheck.push(0)
  })
  await _.sleep(10)
  expect(callbackCheck.length).toBe(2)
  expect(comp.dom.innerHTML).toBe('<child><wx-view><div>2-14</div></wx-view></child>')
})

test('getData', () => {
  const childId = jComponent.register({
    template: '<view><slot/></view>',
    data: {
      show: 1,
    },
  })
  const comp = jComponent.create(jComponent.register({
    template: '<child id="a">123</child>',
    data: {
      num: 0,
    },
    usingComponents: {
      child: childId
    },
  }))

  const child = comp.querySelector('#a')
  expect(comp.data.num).toBe(0)
  expect(child.data.show).toBe(1)

  comp.setData({num: 2})
  expect(comp.data.num).toBe(2)
  expect(child.data.show).toBe(1)

  comp.setData({num: 'I am a string'})
  child.setData({show: 'do something'})
  expect(comp.data.num).toBe('I am a string')
  expect(child.data.show).toBe('do something')
})

test('update event', async () => {
  const comp = jComponent.create(jComponent.register({
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
        this.setData({num: 1})
      },
      onTap2() {
        this.setData({num: 2})
      },
    },
  }))

  expect(comp.dom.innerHTML).toBe('<wx-view class="a"><div>if-0</div></wx-view>')
  comp.querySelector('.a').dispatchEvent('tap')
  await _.sleep(10)
  expect(comp.dom.innerHTML).toBe('<wx-view class="a"><div>if-1</div></wx-view>')
  comp.setData({flag: false})
  expect(comp.dom.innerHTML).toBe('<wx-view class="a"><div>else-1</div></wx-view>')
  comp.querySelector('.a').dispatchEvent('tap')
  await _.sleep(10)
  expect(comp.dom.innerHTML).toBe('<wx-view class="a"><div>else-2</div></wx-view>')
})

test('attached and detached', () => {
  const comp = jComponent.create(jComponent.register({
    tagName: 'test',
    template: '<div>123</div>',
  }))

  const parent = document.createElement('div')

  comp.detach() // 未 attach，作 detach 则不作任何处理
  expect(parent.innerHTML).toBe('')

  comp.attach(parent)
  expect(parent.innerHTML).toBe('<test><div>123</div></test>')

  comp.detach()
  expect(parent.innerHTML).toBe('')
})

test('life time', () => {
  const callbackCheck = []
  const grandChildId = jComponent.register({
    template: '<view>123</view>',
    created() {
      callbackCheck.push('grand-child-created')
    },
    attached() {
      callbackCheck.push('grand-child-attached')
    },
    ready() {
      callbackCheck.push('grand-child-ready')
    },
    moved() {
      callbackCheck.push('grand-child-moved')
    },
    detached() {
      callbackCheck.push('grand-child-detached')
    },
  })
  const childId = jComponent.register({
    template: '<grand-child/>',
    usingComponents: {
      'grand-child': grandChildId
    },
    created() {
      callbackCheck.push('child-created')
    },
    attached() {
      callbackCheck.push('child-attached')
    },
    ready() {
      callbackCheck.push('child-ready')
    },
    moved() {
      callbackCheck.push('child-moved')
    },
    detached() {
      callbackCheck.push('child-detached')
    },
  })
  const comp = jComponent.create(jComponent.register({
    tagName: 'lift-time-comp',
    template: '<child/>',
    usingComponents: {
      child: childId
    },
    created() {
      callbackCheck.push('created')
    },
    attached() {
      callbackCheck.push('attached')
    },
    ready() {
      callbackCheck.push('ready')
    },
    moved() {
      callbackCheck.push('moved')
    },
    detached() {
      callbackCheck.push('detached')
    },
  }))
  const parent = document.createElement('div')

  expect(parent.innerHTML).toBe('')
  comp.attach(parent)
  comp.triggerLifeTime('moved')
  expect(parent.innerHTML).toBe('<lift-time-comp><child><grand-child><wx-view><div>123</div></wx-view></grand-child></child></lift-time-comp>')
  comp.detach()
  expect(parent.innerHTML).toBe('')
  expect(callbackCheck).toEqual([
    'grand-child-created', 'child-created', 'created',
    'attached', 'child-attached', 'grand-child-attached',
    'grand-child-ready', 'child-ready', 'ready', 'moved',
    'grand-child-detached', 'child-detached', 'detached'
  ])
})

test('wx://component-export', () => {
  const compaId = jComponent.register({
    template: '<view>123</view>',
    behaviors: ['wx://component-export'],
    export() {
      return {myField: 'myValue'}
    },
  })
  const comp = jComponent.create(jComponent.register({
    tagName: 'compb',
    template: `
      <view>header</view>
      <compa id="compa"></compa>
      <view>footer</view>
    `,
    usingComponents: {
      compa: compaId,
    },
  }))
  expect(comp.instance.selectComponent('#compa')).toEqual({myField: 'myValue'})
})

test('error', () => {
  let catchErr = null
  try {
    jComponent.register()
  } catch (err) {
    catchErr = err
  }
  expect(catchErr.message).toBe('invalid template')

  catchErr = null
  try {
    jComponent.register({
      template: '<comp>{{num}}</comp>',
      usingComponents: {
        comp: 12345,
      },
      data: {
        num: 0,
      },
    })
  } catch (err) {
    catchErr = err
  }
  expect(catchErr.message).toBe('component comp not found')

  expect(jComponent.create(123456)).toBe(undefined)
})

test('toJSON', () => {
  const view = jComponent.register({
    template: '<slot />',
  })

  const child = jComponent.register({
    template: '<view class="child"><slot /></view>',
    usingComponents: {view}
  })

  const comp = jComponent.create(jComponent.register({
    usingComponents: {view, child},
    template: `
      <wxs module="test">
        module.exports.hasLength = function (arr) { return arr.length > 0; }
      </wxs>
      <view wx:if="{{condition}}" data-index="{{true}}" />
      <view wx:else data-index="{{false}}" />
      <child wx:for="{{items}}" wx:key="index" wx:for-item="item" wx:for-index="index">{{item}}</child>
      <child
        wx:if={{test.hasLength(items)}}
        bindtap="onTap"
        catchtouchstart="onCatchTouchStart"
        capture-bind:touchmove="onCaptureTouchMove"
        mut-catch:touchend="onMutatedtouchend"
        capture-mut-bind:longtap="onCaptureMutatedLongTap"
      />
    `,
    data: {
      condition: false,
      items: [1, 2, 3]
    },
    methods: {
      onTap() {},
      onCatchTouchStart() {},
      onCaptureTouchMove() {},
      onMutatedtouchend() {},
      onCaptureMutatedLongTap() {},
    },
  }))
  expect(comp.toJSON()).toMatchSnapshot()
  comp.setData({condition: true, items: []})
  expect(comp.toJSON()).toMatchSnapshot()
})

test('relations', () => {
  const customUlId = getId()
  const customLiId = getId()
  let ulLink = 0
  const ulLinkTargetList = []
  let ulUnlink = 0
  const ulUnlinkTargetList = []
  let liLink = 0
  const liLinkTargetList = []
  let liUnlink = 0
  const liUnlinkTargetList = []

  jComponent.register({
    id: customUlId,
    template: '<view><slot></slot></view>',
    path: '/mp/component/ul',
    relations: {
      [customLiId]: {
        target: customLiId,
        type: 'child',
        linked(target) {
          ulLink++
          ulLinkTargetList.push(target)
        },
        unlinked(target) {
          ulUnlink++
          ulUnlinkTargetList.push(target)
        },
      },
    },
  })
  jComponent.register({
    id: customLiId,
    template: '<view>li-<slot></slot></view>',
    path: '/mp/component/li',
    relations: {
      [customUlId]: {
        target: customUlId,
        type: 'parent',
        linked(target) {
          liLink++
          liLinkTargetList.push(target)
        },
        unlinked(target) {
          liUnlink++
          liUnlinkTargetList.push(target)
        },
      },
    },
  })
  const comp = jComponent.create(jComponent.register({
    tagName: 'comp',
    template: `
      <custom-ul class="ul">
        <custom-li class="li" wx:for="{{list}}" wx:key="*this">{{item}}</custom-li>
      </custom-ul>
    `,
    usingComponents: {
      'custom-ul': customUlId,
      'custom-li': customLiId,
    },
    data: {
      list: [1, 2],
    },
  }))
  const parent = document.createElement('parent-wrapper')
  comp.attach(parent)

  const ul = comp.querySelectorAll('.ul')[0].instance

  // link
  expect(ulLink).toBe(2)
  expect(ulLinkTargetList.length).toBe(2)
  expect(ulLinkTargetList[0]).toBe(comp.querySelectorAll('.li')[0].instance)
  expect(ulLinkTargetList[1]).toBe(comp.querySelectorAll('.li')[1].instance)
  expect(liLink).toBe(2)
  expect(liLinkTargetList.length).toBe(2)
  expect(liLinkTargetList[0]).toBe(ul)
  expect(liLinkTargetList[1]).toBe(ul)

  let relationNodes = ul.getRelationNodes('./li')
  expect(relationNodes.length).toBe(2)
  expect(relationNodes[0]).toBe(ulLinkTargetList[0])
  expect(relationNodes[1]).toBe(ulLinkTargetList[1])

  let relationNodes2 = relationNodes[0].getRelationNodes('./ul')
  expect(relationNodes2.length).toBe(1)
  expect(relationNodes2[0]).toBe(ul)
  relationNodes2 = relationNodes[1].getRelationNodes('./ul')
  expect(relationNodes2.length).toBe(1)
  expect(relationNodes2[0]).toBe(ul)

  // unlink
  ulLinkTargetList.length = 0
  liLinkTargetList.length = 0
  comp.setData({list: [2, 3, 4]})
  expect(ulLink).toBe(4)
  expect(ulLinkTargetList.length).toBe(2)
  expect(ulLinkTargetList[0]).toBe(comp.querySelectorAll('.li')[1].instance)
  expect(ulLinkTargetList[1]).toBe(comp.querySelectorAll('.li')[2].instance)
  expect(ulUnlink).toBe(1)
  expect(ulUnlinkTargetList.length).toBe(1)
  expect(ulUnlinkTargetList[0]).toBe(relationNodes[0])
  expect(liLink).toBe(4)
  expect(liLinkTargetList.length).toBe(2)
  expect(liLinkTargetList[0]).toBe(ul)
  expect(liLinkTargetList[1]).toBe(ul)
  expect(liUnlink).toBe(1)
  expect(liUnlinkTargetList.length).toBe(1)
  expect(liUnlinkTargetList[0]).toBe(ul)

  relationNodes = ul.getRelationNodes('./li')
  expect(relationNodes.length).toBe(3)
  expect(relationNodes[0]).toBe(comp.querySelectorAll('.li')[0].instance)
  expect(relationNodes[1]).toBe(ulLinkTargetList[0])
  expect(relationNodes[2]).toBe(ulLinkTargetList[1])

  relationNodes2 = relationNodes[0].getRelationNodes('./ul')
  expect(relationNodes2.length).toBe(1)
  expect(relationNodes2[0]).toBe(ul)
  relationNodes2 = relationNodes[1].getRelationNodes('./ul')
  expect(relationNodes2.length).toBe(1)
  expect(relationNodes2[0]).toBe(ul)
  relationNodes2 = relationNodes[2].getRelationNodes('./ul')
  expect(relationNodes2.length).toBe(1)
  expect(relationNodes2[0]).toBe(ul)

  // detach
  ulLinkTargetList.length = 0
  ulUnlinkTargetList.length = 0
  liLinkTargetList.length = 0
  liUnlinkTargetList.length = 0
  comp.detach()
  expect(ulLink).toBe(4)
  expect(ulLinkTargetList.length).toBe(0)
  expect(ulUnlink).toBe(4)
  expect(ulUnlinkTargetList.length).toBe(3)
  expect(ulUnlinkTargetList[0]).toBe(relationNodes[0])
  expect(ulUnlinkTargetList[1]).toBe(relationNodes[1])
  expect(ulUnlinkTargetList[2]).toBe(relationNodes[2])
  expect(liLink).toBe(4)
  expect(liLinkTargetList.length).toBe(0)
  expect(liUnlink).toBe(4)
  expect(liUnlinkTargetList.length).toBe(3)
  expect(liUnlinkTargetList[0]).toBe(ul)
  expect(liUnlinkTargetList[1]).toBe(ul)
  expect(liUnlinkTargetList[2]).toBe(ul)

  relationNodes = ul.getRelationNodes('./li')
  expect(relationNodes.length).toBe(0)
})
