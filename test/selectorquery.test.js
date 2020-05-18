const _ = require('./utils')
const jComponent = require('../src/index')
const SelectorQuery = require('../src/tool/selectorquery')

beforeAll(() => {
  _.env()

  jComponent.register({
    id: 'view',
    tagName: 'wx-view',
    template: '<div><slot/></div>',
    properties: {
      hidden: {
        type: Boolean,
        value: false,
      },
    }
  })
})


test('SelectorQuery', async () => {
  const comp = jComponent.create(jComponent.register({
    template: '<view id="abc" data-a="1" data-b="2" style="position: absolute; top: 20px; left: 30px; width: 100px; height: 200px;" hidden="{{false}}">123</view>',
  }))

  // boundingClientRect
  let selectorQuery = new SelectorQuery()
  selectorQuery.in(comp)
  let res = await new Promise(resolve => {
    selectorQuery.select('#abc').boundingClientRect(res => {
      resolve(res)
    }).exec()
  })
  expect(res).toEqual({
    id: 'abc',
    dataset: {
      a: '1',
      b: '2',
    },
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: 0,
    height: 0,
  })

  // scrollOffset
  selectorQuery = new SelectorQuery()
  selectorQuery.in(comp)
  res = await new Promise(resolve => {
    selectorQuery.selectAll('#abc').scrollOffset(res => {
      resolve(res)
    }).exec()
  })
  expect(res).toEqual([{
    id: 'abc',
    dataset: {
      a: '1',
      b: '2',
    },
    scrollLeft: 0,
    scrollTop: 0,
  }])

  // context
  selectorQuery = new SelectorQuery()
  selectorQuery.in(comp)
  res = await new Promise(resolve => {
    selectorQuery.select('#abc').context(res => {
      resolve(res)
    }).exec()
  })
  expect(res).toEqual({
    context: {},
  })

  // fields
  selectorQuery = new SelectorQuery()
  selectorQuery.in(comp)
  res = await new Promise(resolve => {
    selectorQuery.select('#abc').fields({
      id: true,
      dataset: true,
      rect: true,
      size: true,
      scrollOffset: true,
      properties: ['hidden'],
      computedStyle: ['position', 'top', 'left', 'width', 'height'],
      context: true,
    }, res => {
      resolve(res)
    }).exec()
  })
  expect(res).toEqual({
    id: 'abc',
    dataset: {
      a: '1',
      b: '2',
    },
    scrollLeft: 0,
    scrollTop: 0,
    left: '30px',
    right: 0,
    top: '20px',
    bottom: 0,
    width: '100px',
    height: '200px',
    hidden: false,
    position: 'absolute',
    context: {},
  })

  // exec
  selectorQuery = new SelectorQuery()
  selectorQuery.in(comp)
  res = await new Promise(resolve => {
    selectorQuery.select('#abc').boundingClientRect().selectAll('#abc').scrollOffset()
      .exec(res => {
        resolve(res)
      })
  })
  expect(res).toEqual([{
    id: 'abc',
    dataset: {
      a: '1',
      b: '2',
    },
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: 0,
    height: 0,
  }, [{
    id: 'abc',
    dataset: {
      a: '1',
      b: '2',
    },
    scrollLeft: 0,
    scrollTop: 0,
  }]])

  // selectViewport
  selectorQuery = new SelectorQuery()
  selectorQuery.in(comp)
  res = await new Promise(resolve => {
    selectorQuery.selectViewport().fields({
      id: true,
      dataset: true,
      rect: true,
      size: true,
      scrollOffset: true,
    }).exec(res => {
      resolve(res)
    })
  })
  expect(res).toEqual([{
    id: '',
    dataset: {},
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: 0,
    height: 0,
    scrollLeft: 0,
    scrollTop: 0,
  }])

  selectorQuery = new SelectorQuery()
  selectorQuery.in(comp)
  res = await new Promise(resolve => {
    selectorQuery.selectViewport().fields({}).exec(res => {
      resolve(res)
    })
  })
  expect(res).toEqual([{}])
})

test('createSelectorQuery', () => {
  const comp = jComponent.create(jComponent.register({
    template: '<view>123</view>',
    methods: {
      getSelectorQuery() {
        return this.createSelectorQuery()
      },
    },
  }))

  expect(comp.instance.getSelectorQuery()._exparserNode).toBe(comp.instance._exparserNode)
})

test('error', () => {
  const selectorQuery = new SelectorQuery()
  let catchErr = null
  try {
    selectorQuery.in()
  } catch (err) {
    catchErr = err
  }
  expect(catchErr.message).toBe('invalid params')
})
