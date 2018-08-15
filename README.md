# j-component

仿小程序组件系统，可以让小程序自定义组件跑在 web 端。

## 注意

* 此框架的性能比不上小程序的实现。
* 此框架的功能会比小程序略微弱一点。
* 此框架不是小程序的子集，是完全独立的实现，请勿将此等价于小程序内的实现，若出现问题概不负责。

## 安装

```
npm install --save j-component
```

## 使用

```js
const jComponent = require('j-component');

/**
 * 注册 behavior
 */
let behavior = jComponent.behavior({
    /* 小程序 behavior 支持的定义段 */
});

/**
 * 注册组件
 */
let componentId = jComponent.register({
    id: 'xxx', // 可选字段，如果传了此字段，则表明注册为全局组件，其他组件可直接在 template 中使用而无需在 usingComponents 里引入
    template: '<view id="a">xxx</view>', // 组件模板，即组件对应的 wxml 内容
    usingComponents: { // 使用到的自定义组件
        'view': 'xxx', // xxx 为组件 id，调 register 方法时会返回
    },
    options: {
        classPrefix: 'xxx', // 组件样式的私有化前缀，默认是空串，即没有前缀
        /* 其他小程序自定义组件支持的 option */
    },
    /* 其他小程序自定义组件支持的定义段 */
    behaviors: [behavior], // behavior 的用法和小程序类似
});

/**
 * 创建组件实例
 */
let comp = jComponentManager.create(componentId, properties); // properties 是创建组件实例时，由组件接收的 properties 对象

comp.dom; // 组件实例对应的 dom 节点
let compNode = comp.querySelector('#a'); // 选取组件树中的节点
let compNodes = comp.querySelectorAll('.a'); // 选取组件树中的节点

compNode.dom; // 组件树中的节点对应的 dom 节点
compNode.dispatchEvent('touchstart', { // 触发组件树中的节点事件
    touches: [{ x: 0, y: 0 }],
    changedTouches: [{ x: 0, y: 0 }],
});
compNode.dispatchEvent('customevent', {  // 触发组件树中的节点自定义事件
    touches: [{ x: 0, y: 0 }],
    changedTouches: [{ x: 0, y: 0 }],
    /* 其他 CustomEvent 构造器支持的 option */
});
```

## TODO

* template 支持
* include 支持
* import 支持
* 动画支持
* generics 支持
* ......
