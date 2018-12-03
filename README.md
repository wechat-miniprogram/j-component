# j-component

[![](https://img.shields.io/npm/v/j-component.svg?style=flat)](https://www.npmjs.org/package/j-component)
[![](https://img.shields.io/travis/JuneAndGreen/j-component.svg)](https://github.com/JuneAndGreen/j-component)
[![](https://img.shields.io/npm/l/j-component.svg)](https://github.com/JuneAndGreen/j-component)
[![](https://img.shields.io/coveralls/github/JuneAndGreen/j-component.svg)](https://github.com/JuneAndGreen/j-component)

## 简介

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
```

### behavior(definition)

注册 behavior。

```js
let behavior = jComponent.behavior({
    /* 小程序 behavior 支持的定义段 */
});
```

### register(definition)

注册自定义组件，返回自定组件 id。

#### definition

| 属性名 | 类型 | 描述 |
|---|---|---|
| id | String | 可选字段，如果传了此字段，则表明注册为全局组件，其他组件可直接在 template 中使用而无需在 usingComponents 里引入 |
| tagName | String | 可选字段，指定组件对应的 dom 节点的 tagName，默认取 usingComponents 里的定义或组件自身的 id |
| template | String | 组件模板，即组件对应的 wxml 内容 |
| usingComponents | Object | 使用到的自定义组件映射表 |
| behaviors | Array<Behavior> | behavior 的用法和小程序类似 |
| options | Object | 配置对象，支持小程序自定义组件 options 定义段支持的所有字段 |
| options.classPrefix | String | 组件样式的私有化前缀，默认是空串，即没有前缀 |

``` js
jComponent.register({
    id: 'view',
    tagName: 'wx-view',
    template: '<div><slot/></div>'
}); 

let childId = jComponent.register({
    tagName: 'xxx',
    template: '<view><slot/></view>', // 直接使用全局组件
});

let id = jComponent.register({
    template: '<child>123</child>',
    usingComponents: {
        'child': childId, // 声明要使用的组件，传入组件 id
    },
    behaviors: [behavior],
    options: {
        classPrefix: 'xxx',

        /* 其他小程序自定义组件支持的 option，比如 addGlobalClass 等 */
    },

    /* 其他小程序自定义组件支持的定义段，比如 methods 定义段等 */
});
```

### create(componentId, properties)

创建自定义组件实例，返回 [RootComponent](#rootcomponent)。

#### componentId

调用 [register](#registerdefinition) 接口返回的 id。

#### properties

创建组件实例时，由组件接收的初始 properties 对象。

### Component

组件。

#### 属性

| 属性名 | 类型 | 描述 |
|---|---|---|
| dom | Object | 组件实例对应的 dom 节点 |
| data | Object | 组件实例对应的 data 对象 |

#### 方法

##### querySelector(selector)

获取符合给定匹配串的第一个节点，返回 [Component](#component) 实例。

> PS：支持 selector 同小程序自定义组件的 selectComponent 接口

```js
let childComp = comp.querySelector('#a'); // 选取组件树中的节点
```

##### querySelectorAll(selector)

获取符合给定匹配串的所有节点，返回 [Component](#component) 实例列表

> PS：支持 selector 同小程序自定义组件的 selectAllComponents 接口

```js
let childComps = comp.querySelectorAll('.a'); // 选取组件树中的节点
```

##### setData(data, callback)

调用组件实例的 setData 方法.

```js
comp.setData({ text: 'a' }, () => {}); // 相当于组件内部的 this.setData 接口
```

##### dispatchEvent(eventName, options)

用于模拟触发该组件实例节点上的事件。

```js
// 触发组件树中的节点事件
comp.dispatchEvent('touchstart', {
  touches: [{ x: 0, y: 0 }],
  changedTouches: [{ x: 0, y: 0 }],
});

// 触发组件树中的节点自定义事件
comp.dispatchEvent('customevent', {
  touches: [{ x: 0, y: 0 }],
  changedTouches: [{ x: 0, y: 0 }],
  /* 其他 CustomEvent 构造器支持的 option */
});
```

##### triggerLifeTime(lifeTime)

触发组件实例的生命周期钩子。

```js
comp.triggerLifeTime('moved');
```

### RootComponent

根组件，继承自 [Component](#component)。

#### 方法

##### attach

将根组件实例挂载在传入的 dom 节点上。

```js
const parent = document.createElement('div')
rootComp.attach(parent)
```

##### detach

将根组件实例从父亲 dom 节点上移除。

```js
rootComp.detach()
```

## TODO

* template 支持
* include 支持
* import 支持
* 动画支持
* generics 支持
* relations 和 moved 生命周期
* 外部 wxs
* ......
