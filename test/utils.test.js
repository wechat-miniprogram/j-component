const _ = require('./utils')
const utils = require('../src/tool/utils')

test('getId', () => {
  expect(typeof utils.getId()).toBe('number')
  expect(utils.getId() + '').toMatch(/\d{13}/)
  expect(utils.getId(true)).toMatch(/[a-j]{13}/)
})

test('copy', () => {
  let src = {a: 123, b: [{c: 321}, 456]}
  let res = utils.copy(src)
  expect(res).not.toBe(src)
  expect(res).toEqual(src)

  src = Symbol('test')
  res = utils.copy(src)
  expect(res).toBe(undefined)
})

test('isHtmlTag', () => {
  expect(utils.isHtmlTag('div')).toBe(true)
  expect(utils.isHtmlTag('span')).toBe(true)
  expect(utils.isHtmlTag('component')).toBe(false)
  expect(utils.isHtmlTag('wxs')).toBe(false)
})

test('transformRpx', () => {
  expect(utils.transformRpx('width: 123rpx;')).toBe('width: 123px;')
  expect(utils.transformRpx('width: aaarpx;')).toBe('width: aaarpx;')
  expect(utils.transformRpx('width: 123px;')).toBe('width: 123px;')
  expect(utils.transformRpx('width: 12.3rpx;')).toBe('width: 12.3px;')
  expect(utils.transformRpx('width: 0.3rpx;')).toBe('width: 0.3px;')
})

test('dashToCamelCase', () => {
  expect(utils.dashToCamelCase('abc-e')).toBe('abcE')
  expect(utils.dashToCamelCase('aBcDE-f')).toBe('aBcDEF')
  expect(utils.dashToCamelCase('a-bC-d-e-Fg')).toBe('aBCDE-Fg')
})

test('camelToDashCase', () => {
  expect(utils.camelToDashCase('abcE')).toBe('abc-e')
  expect(utils.camelToDashCase('aBcDEF')).toBe('a-bc-d-e-f')
  expect(utils.camelToDashCase('aBCDE-Fg')).toBe('a-b-c-d-e--fg')
})

test('animationToStyle', () => {
  let animation = _.createAnimation().rotate(45).scale(2, 2).translate(11)
    .skew(9)
    .step()
    .export()
  expect(utils.animationToStyle(animation.actions[0])).toEqual({
    style: {},
    transform: 'rotate(45deg) scale(2,2) translate(11px,0px) skew(9deg,0deg)',
    transformOrigin: '50% 50% 0',
    transition: '400ms linear 0ms',
    transitionProperty: 'transform',
  })

  animation = _.createAnimation()
    .rotateX(180).rotateY(30).rotateZ(45)
    .scaleX(0.5)
    .scaleY(2)
    .scaleZ(2)
    .translateX(12)
    .translateY(34)
    .translateZ(56)
    .skewX(8)
    .skewY(9)
    .width(20)
    .left('5rpx')
    .step()
    .export()
  expect(utils.animationToStyle(animation.actions[0])).toEqual({
    style: {left: '5rpx', width: '20px'},
    transform: 'rotateX(180deg) rotateY(30deg) rotateZ(45deg) scaleX(0.5) scaleY(2) scaleZ(2) translateX(12px) translateY(34px) translateZ(56px) skewX(8deg) skewY(9deg)',
    transformOrigin: '50% 50% 0',
    transition: '400ms linear 0ms',
    transitionProperty: 'transform,width,left',
  })

  animation = _.createAnimation().rotate3d(20, 30, 40).scale3d(1, 2, 0.5).translate3d(20, 44, 56)
    .step()
    .export()
  expect(utils.animationToStyle(animation.actions[0])).toEqual({
    style: {},
    transform: 'rotate3d(20,30,40,0deg) scale3d(1,2,0.5) translate3d(20px,44px,56px)',
    transformOrigin: '50% 50% 0',
    transition: '400ms linear 0ms',
    transitionProperty: 'transform',
  })

  animation = _.createAnimation().matrix(1, 2, -1, 1, 80, 80).step().export()
  expect(utils.animationToStyle(animation.actions[0])).toEqual({
    style: {},
    transform: 'matrix(1,2,-1,1,80,80)',
    transformOrigin: '50% 50% 0',
    transition: '400ms linear 0ms',
    transitionProperty: 'transform',
  })

  animation = _.createAnimation().matrix3d(0.85, 0.5, 0.15, 0, -0.5, 0.7, 0.5, 0, 0.15, -0.5, 0.85, 0, 22.63, -20.32, 101.37, 1).step().export()
  expect(utils.animationToStyle(animation.actions[0])).toEqual({
    style: {},
    transform: 'matrix3d(0.85,0.5,0.15,0,-0.5,0.7,0.5,0,0.15,-0.5,0.85,0,22.63,-20.32,101.37,1)',
    transformOrigin: '50% 50% 0',
    transition: '400ms linear 0ms',
    transitionProperty: 'transform',
  })

  expect(utils.animationToStyle({})).toEqual({
    transformOrigin: '',
    transform: '',
    transition: '',
  })
})

test('adjustExparserDefinition', () => {
  expect(utils.adjustExparserDefinition({})).toEqual({})
  expect(utils.adjustExparserDefinition({
    properties: {
      a: null,
      b: Number,
      c: String,
      d: Boolean,
      e: Array,
      f: Object,
      g: {
        type: Number,
        value: 123,
      },
      h: {
        public: true,
        type: Number,
        value: 123,
      },
      i: {
        public: false,
        type: Number,
        value: 123,
      },
      j: {
        type: null,
        value: 123,
      },
    },
  })).toEqual({
    properties: {
      a: {type: null},
      b: {type: Number},
      c: {type: String},
      d: {type: Boolean},
      e: {type: Array},
      f: {type: Object},
      g: {
        type: Number,
        value: 123,
      },
      h: {
        type: Number,
        value: 123,
      },
      i: {
        public: false,
        type: Number,
        value: 123,
      },
      j: {
        type: null,
        value: 123,
      },
    },
  })
})

test('setTagName/getTagName', () => {
  utils.setTagName(1, 'abc')
  expect(utils.getTagName(1)).toBe('abc')
})

test('normalizeAbsolute', () => {
  expect(utils.normalizeAbsolute('E:\\abc\\edf.xxx')).toBe('E:/abc/edf.xxx')
  expect(utils.normalizeAbsolute('E:\\\\abc\\edf.xxx')).toBe('E:/abc/edf.xxx')
  expect(utils.normalizeAbsolute('E:\\abc\\edf.xxx\\')).toBe('E:/abc/edf.xxx')
  expect(utils.normalizeAbsolute('E:/abc/edf.xxx')).toBe('E:/abc/edf.xxx')
  expect(utils.normalizeAbsolute('E:/abc/edf.xxx/')).toBe('E:/abc/edf.xxx')
  expect(utils.normalizeAbsolute('E://abc//edf.xxx')).toBe('E:/abc/edf.xxx')
  expect(utils.normalizeAbsolute('E:/\\/abc//edf.xxx/\\as/df\\/d\\')).toBe('E:/abc/edf.xxx/as/df/d')
})

test('relativeToAbsolute', () => {
  expect(utils.relativeToAbsolute('E:/abc/edf.xxx/as/df/d', '/abc/dd.haha')).toBe('E:/abc/edf.xxx/as/df/abc/dd.haha')
  expect(utils.relativeToAbsolute('E:/abc/edf.xxx/as/df/d', 'abc/dd.haha')).toBe('E:/abc/edf.xxx/as/df/abc/dd.haha')
  expect(utils.relativeToAbsolute('E:/abc/edf.xxx/as/df/d', './abc/dd.haha')).toBe('E:/abc/edf.xxx/as/df/abc/dd.haha')
  expect(utils.relativeToAbsolute('E:/abc/edf.xxx/as/df/d', '../abc/dd.haha')).toBe('E:/abc/edf.xxx/as/abc/dd.haha')
  expect(utils.relativeToAbsolute('E:/abc/edf.xxx/as/df/d', '../abc/./dd.haha')).toBe('E:/abc/edf.xxx/as/abc/dd.haha')
  expect(utils.relativeToAbsolute('E:/abc/edf.xxx/as/df/d', '../abc/../dd.haha')).toBe('E:/abc/edf.xxx/as/dd.haha')
})
