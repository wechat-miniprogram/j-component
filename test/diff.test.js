const jComponent = require('../src/index')
const diff = require('../src/render/diff')

test('diffAttrs', () => {
  expect(diff.diffAttrs([
    {name: 'a', value: '123'},
    {name: 'b', value: '123'},
    {name: 'c', value: '123'}
  ], [
    {name: 'b', value: '321'},
    {name: 'c', value: '123'},
    {name: 'd', value: '123'}
  ])).toEqual([
    {name: 'b', value: '321'},
    {name: 'c', value: '123'},
    {name: 'd', value: '123'},
    {name: 'a', value: undefined}
  ])

  expect(diff.diffAttrs([
    {name: 'a', value: '123'},
    {name: 'b', value: '123'},
    {name: 'c', value: '123'}
  ], [
    {name: 'a', value: '123'},
    {name: 'b', value: '123'},
    {name: 'c', value: '123'}
  ])).toBe(false)
})

test('diffList: test moves', () => {
  let oldList = [{key: 1}, {key: 2}, {}]
  let newList = [{key: 3}, {key: 1}]
  let diffs = diff.diffList(oldList, newList)

  expect(diffs.children).toEqual([{key: 1}, null, null])
  expect(diffs.moves.removes).toEqual([2, 1])
  expect(diffs.moves.inserts).toEqual([{oldIndex: -1, index: 0}])

  oldList = [{key: 1}, {key: 2}, {key: 3}]
  newList = [{key: 3}, {key: 2}, {key: 1}]
  diffs = diff.diffList(oldList, newList)

  expect(diffs.children).toEqual([{key: 1}, {key: 2}, {key: 3}])
  expect(diffs.moves.removes).toEqual([])
  expect(diffs.moves.inserts).toEqual([{oldIndex: 2, index: 0}])
})

test('diffList: empty old list', () => {
  const oldList = []
  const newList = [{key: 1}]
  const diffs = diff.diffList(oldList, newList)

  expect(diffs.children).toEqual([])
  expect((diffs.moves.removes)).toEqual([])
  expect((diffs.moves.inserts)).toEqual([{oldIndex: -1, index: 0}])
})

test('diffList: empty new list', () => {
  const oldList = [{key: 1}]
  const newList = []
  const diffs = diff.diffList(oldList, newList)

  expect(diffs.children).toEqual([null])
  expect((diffs.moves.removes)).toEqual([0])
  expect((diffs.moves.inserts)).toEqual([])
})

test('diffList: removing items', () => {
  const oldList = [{key: 1}, {key: 2}, {key: 3}, {key: 4}, {key: 5}, {key: 6}]
  const newList = [{key: 2}, {key: 3}, {key: 1}]
  const diffs = diff.diffList(oldList, newList)

  expect(diffs.children).toEqual([{key: 1}, {key: 2}, {key: 3}, null, null, null])
  expect((diffs.moves.removes)).toEqual([5, 4, 3])
  expect((diffs.moves.inserts)).toEqual([{oldIndex: 1, index: 0}, {oldIndex: 2, index: 1}])
})

test('diffList: key and free', () => {
  const oldList = [{key: 1}, {}]
  const newList = [{}, {key: 1}]
  const diffs = diff.diffList(oldList, newList)

  expect(diffs.children).toEqual([{key: 1}, {}])
  expect((diffs.moves.removes)).toEqual([])
  expect((diffs.moves.inserts)).toEqual([{oldIndex: 1, index: 0}])
})

test('diffList: inserting items', () => {
  const oldList = [{key: 1}, {key: 2}, {key: 3}, {key: 4}]
  const newList = [{key: 1}, {key: 2}, {key: 5}, {key: 6}, {key: 3}, {key: 4}]
  const diffs = diff.diffList(oldList, newList)

  expect(diffs.children).toEqual([{key: 1}, {key: 2}, {key: 3}, {key: 4}])
  expect((diffs.moves.removes)).toEqual([])
  expect((diffs.moves.inserts)).toEqual([{oldIndex: -1, index: 2}, {oldIndex: -1, index: 3}])
})

test('diffList: moving items from back to front', () => {
  const oldList = [{key: 1}, {key: 2}, {key: 3}, {key: 4}, {key: 5}, {key: 6}]
  const newList = [{key: 1}, {key: 2}, {key: 5}, {key: 6}, {key: 3}, {key: 4}, {key: 7}, {key: 8}]
  const diffs = diff.diffList(oldList, newList)

  expect(diffs.children).toEqual([{key: 1}, {key: 2}, {key: 3}, {key: 4}, {key: 5}, {key: 6}])
  expect((diffs.moves.removes)).toEqual([])
  expect((diffs.moves.inserts)).toEqual([
    {oldIndex: 4, index: 2},
    {oldIndex: 5, index: 3},
    {oldIndex: -1, index: 6},
    {oldIndex: -1, index: 7}
  ])
})

test('diffList: moving items from front to back', () => {
  const oldList = [{key: 1}, {key: 2}, {key: 3}, {key: 4}, {key: 5}, {key: 6}]
  const newList = [{key: 1}, {key: 3}, {key: 5}, {key: 6}, {key: 2}, {key: 4}]
  const diffs = diff.diffList(oldList, newList)

  expect(diffs.children).toEqual([{key: 1}, {key: 2}, {key: 3}, {key: 4}, {key: 5}, {key: 6}])
  expect((diffs.moves.removes)).toEqual([])
  expect((diffs.moves.inserts)).toEqual([
    {oldIndex: 2, index: 1},
    {oldIndex: 4, index: 2},
    {oldIndex: 5, index: 3}
  ])
})

test('diffList: miscellaneous actions', () => {
  const oldList = [{key: 1}, {key: 2}, {key: 3}, {key: 4}, {key: 5}, {key: 6}]
  const newList = [{key: 3}, {key: 6}, {key: 7}, {key: 2}, {key: 8}, {key: 9}, {key: 4}, {key: 1}, {key: 11}]
  const diffs = diff.diffList(oldList, newList)

  expect(diffs.children).toEqual([{key: 1}, {key: 2}, {key: 3}, {key: 4}, null, {key: 6}])
  expect((diffs.moves.removes)).toEqual([4])
  expect((diffs.moves.inserts)).toEqual([
    {oldIndex: 2, index: 0},
    {oldIndex: 5, index: 1},
    {oldIndex: -1, index: 2},
    {oldIndex: 1, index: 3},
    {oldIndex: -1, index: 4},
    {oldIndex: -1, index: 5},
    {oldIndex: 3, index: 6},
    {oldIndex: -1, index: 8}
  ])
})

test('diffList: without key', () => {
  const oldList = [{a: 1}, {a: 2}]
  const newList = [{a: 2}, {a: 3}, {a: 4}]
  const diffs = diff.diffList(oldList, newList)

  expect(diffs.children).toEqual([{a: 2}, {a: 3}])
  expect((diffs.moves.removes)).toEqual([])
  expect((diffs.moves.inserts)).toEqual([{oldIndex: -1, index: 2}])
})

test('diffList: same key', () => {
  const oldList = [{key: 1}, {key: 1}, {}]
  const newList = [{key: 3}, {key: 3}, {key: 1}]
  const diffs = diff.diffList(oldList, newList)

  expect(diffs.children).toEqual([{key: 1}, {key: 3}, null])
  expect(diffs.moves.removes).toEqual([2])
  expect(diffs.moves.inserts).toEqual([{oldIndex: -1, index: 0}, {oldIndex: -1, index: 1}])
})

test('diffList: mixed', () => {
  const oldList = [{key: 1}, {key: 2}, {key: 3}, {key: 4}, {name: 'a'}, {key: 5}, {name: 'b'}, {key: 6}]
  const newList = [{name: 'c'}, {key: 6}, {key: 7}, {key: 2}, {key: 1}, {key: 9}, {key: 5}]
  const diffs = diff.diffList(oldList, newList)

  expect(diffs.children).toEqual([{key: 1}, {key: 2}, null, null, {name: 'c'}, {key: 5}, null, {key: 6}])
  expect((diffs.moves.removes)).toEqual([6, 3, 2])
  expect((diffs.moves.inserts)).toEqual([
    {oldIndex: 4, index: 0},
    {oldIndex: 7, index: 1},
    {oldIndex: -1, index: 2},
    {oldIndex: 1, index: 3},
    {oldIndex: -1, index: 5}
  ])
})

test('diff children', async () => {
  const view = jComponent.register({
    tagName: 'wx-view',
    template: '<slot />'
  })
  const text = jComponent.register({
    tagName: 'wx-text',
    template: '<slot />'
  })
  const comp = jComponent.create(jComponent.register({
    usingComponents: {view, text},
    template: `
      <text wx:if="{{condition}}" class="parent" data-tag="text"></text>
      <view wx:else class="parent" data-tag="view">
        <view class="child">{{text}}</view>
        <view />
      </view>
    `,
    data: {
      condition: true,
      text: '123'
    }
  }))
  comp.attach(document.createElement('parent-wrapper'))

  let parent = comp.querySelectorAll('.parent')
  let child = comp.querySelector('.child')
  expect(parent).toHaveLength(1)
  expect(parent[0].dom.tagName).toBe('WX-TEXT')
  expect(parent[0].dom.dataset.tag).toBe('text')
  expect(child).toBe(undefined)

  comp.setData({condition: false})
  comp.setData({text: '233'})

  parent = comp.querySelectorAll('.parent')
  child = comp.querySelector('.child')
  expect(parent).toHaveLength(1)
  expect(parent[0].dom.tagName).toBe('WX-VIEW')
  expect(parent[0].dom.dataset.tag).toBe('view')
  expect(child).not.toBe(undefined)
  expect(child.dom.innerHTML).toBe('233')
})
