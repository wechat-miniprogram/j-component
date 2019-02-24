const path = require('path');
const compiler = require('miniprogram-compiler');
const jComponent = require('../src/index');
const _ = require('./utils');

beforeAll(() => {
  _.env();
});

test('support wcc compiler', () => {
  window.__webview_engine_version__ = 0.02;
  const compileString = compiler.wxmlToJs(path.join(__dirname, 'wxml'));
  const compileFunc = new Function(compileString);
  const gwx = compileFunc();

  const compId = jComponent.register({
    properties: {
      aa: {
        type: String,
        value: '',
      },
    },
    template: gwx('comp.wxml'),
  });
  const id = jComponent.register({
    data: {
      tmplData: {
        index: 7,
        msg: 'I am msg',
        time: '12345'
      },
      flag: true,
      elseData: 'else content',
      attrValue: 'I am attr value',
      content: 'node content',
      aa: 'haha',
      list: [
        { id: 1, name: 1 },
        { id: 2, name: 2 },
        { id: 3, name: 3 }
      ],
    },
    template: gwx('index.wxml'),
    usingComponents: {
      'comp': compId,
    },
  });
  const comp = jComponent.create(id);

  expect(comp.dom.innerHTML).toBe('<view>head</view><text>tmpl</text><view><text>7: I am msg</text><text>Time: 12345</text></view><view>hello june</view><view><view>if</view><view>node content</view><comp><view><text> I am comp</text><view>I am slot</view></view></comp><view>1-item</view><view>2-item</view><view>3-item</view><view>in block1</view><text>in block2</text></view><view>foot</view>');
});



