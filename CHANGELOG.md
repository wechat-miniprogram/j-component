# 更新日志

## 1.3.1

* 随机 id 生成使用 Math.random

## 1.3.0

* 更新基础库 exparser 到 2.11.2
* 支持 virtual host 特性

## 1.2.3

* toJSON 方法将会在 root 组件上返回 `<main/>`
* 修复 wxml 属性简写导致 diff 后属性重复的问题
* 修复部分场景 diff 失败问题

## 1.2.2

* 支持 relations
* 支持了 mutated 事件监听
* 修复无法传递驼峰参数
* 异步事件处理改为微任务

## 1.2.1

* 支持 Component.prototype.toJSON
* 添加 typescript 类型声明

## 1.2.0

* 支持内置 behavior wx://component-export
* 更新 exparser 版本为 2.10.4

## 1.1.11

* 支持内置 behavior wx://form-field-button

## 1.1.10

* 修复节点属性值为 falsely 值被强制转为空字符串的问题

## 1.1.9

* dispatchEvent 接口支持触发自定义事件

## 1.1.8

* 修复 diff 时没有处理父节点为根节点的情况

## 1.1.7

* 废弃注册组件时对初始 data 进行深拷贝的逻辑。
* 修复组件 dispatchEvent 方法中自定义事件传入 detail，组件函数接收不到 detail 的问题（#7）。
