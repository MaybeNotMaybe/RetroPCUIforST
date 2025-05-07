# 复古终端冒险游戏

一款复古风格的文字冒险游戏，模拟IBM 5155个人电脑的终端界面，允许玩家通过命令行界面进行信息搜索和NPC交流。

## 文件架构

```
/
├── index.html            // 主HTML文件
├── css/
│   └── styles.css        // 所有样式
├── js/
│   ├── main.js           // 主入口文件
│   ├── eventBus.js       // 事件总线
│   ├── models/
│   │   └── gameModel.js  // 游戏数据模型
│   ├── views/
│   │   └── gameView.js   // 游戏视图
│   └── controllers/
│       └── gameController.js // 游戏控制器
├── assets/
│   ├── fonts/
│   │   └── zpix.ttf   // 本地字体文件
│   └── images/
│       └── ibm-logo.svg        // IBM Logo文件
```

## 技术堆栈

HTML5 - 提供页面结构
CSS3 - 实现复古CRT显示效果和UI样式
原生JavaScript - 实现游戏逻辑和交互
MVC架构 - 分离数据、视图和控制逻辑
发布-订阅模式 - 通过EventBus实现组件间解耦通信
无外部依赖 - 所有功能通过原生实现，无第三方库

## 文件详细说明
### HTML

```
index.html

功能：提供游戏界面的基本结构
依赖：styles.css和所有JavaScript文件
关键元素：

计算机外壳与屏幕
功能按钮面板
终端输出区域
命令输入区域
控制面板（电源按钮和状态指示灯）
```

### CSS

```
styles.css

功能：实现所有视觉样式和动画效果
依赖：VT323-Regular.ttf字体文件
关键样式：

CRT屏幕效果（扫描线、光晕）
终端文本样式（绿色文字、光标闪烁）
状态指示灯效果（闪烁、常亮）
功能按钮样式与交互效果
屏幕开关动画效果
响应式布局适配
```

### JavaScript

```
eventBus.js

功能：提供简单的事件总线实现，用于组件间通信
依赖：无
公开方法：

on(eventName, fn) - 订阅事件
off(eventName, fn) - 取消订阅
emit(eventName, data) - 发布事件


发布事件：无（仅提供事件总线功能）
订阅事件：无（仅提供事件总线功能）
```

```
models/gameModel.js

功能：管理游戏状态、数据和游戏逻辑
依赖：eventBus.js
公开方法：

powerOn() - 系统开机
powerOff() - 系统关机
processCommand(command) - 处理用户输入的命令
getHelp() - 获取帮助信息
getStatus() - 获取系统状态
search(query) - 搜索功能
connect(target) - 连接NPC功能


发布事件：

diskActivity - 当有磁盘活动时触发
networkActivity - 当有网络活动时触发


关键数据：

bootSequence - 系统启动序列内容
locations - 游戏位置和可用命令
gameState - 游戏状态（物品栏、标记等）
```

```
views/gameView.js

功能：处理UI显示和界面更新
依赖：无直接代码依赖
公开方法：

powerOn() - 显示开机效果
powerOff() - 显示关机效果
displayBootSequence(sequence, callback) - 显示启动序列
displayOutput(text) - 在终端显示输出
clear() - 清除屏幕
flashDiskLight() - 闪烁磁盘指示灯
flashNetworkLight() - 闪烁网络指示灯


订阅事件：无直接订阅
```

```
controllers/gameController.js

功能：处理用户输入和协调Model与View
依赖：gameModel.js、gameView.js、eventBus.js
公开方法：

togglePower() - 处理电源开关
processInput() - 处理用户输入


订阅事件：

diskActivity - 触发视图中的磁盘指示灯闪烁
networkActivity - 触发视图中的网络指示灯闪烁


DOM事件监听：

电源按钮点击事件
命令输入回车事件
```

```
main.js

功能：应用入口点，初始化MVC组件
依赖：gameModel.js、gameView.js、gameController.js
主要工作：

创建Model、View和Controller实例
连接三个组件，启动应用
提供基本的错误处理
```

### 资源文件

```
assets/fonts/VT323-Regular.ttf

功能：提供复古计算机终端字体
使用范围：仅用于终端显示区域内的文本
```

```
assets/images/ibm-logo.svg

功能：提供IBM Logo图像
使用范围：系统启动序列中显示
```


## 事件流程说明

### 用户点击电源按钮：

gameController.togglePower() 调用 gameModel.powerOn()
gameController 在屏幕上显示启动序列
硬盘指示灯开始闪烁
启动序列完成后，显示初始位置描述
硬盘指示灯切换为绿色常亮


### 用户输入命令：

gameController.processInput() 获取输入内容
调用 gameModel.processCommand(command)
根据命令类型可能触发 diskActivity 或 networkActivity 事件
控制器接收事件并调用相应的视图方法闪烁指示灯
返回的响应通过 gameView.displayOutput() 显示在屏幕上


### 用户关闭系统：

gameController.togglePower() 调用 gameModel.powerOff()
显示关机消息
隐藏命令提示符
关闭指示灯
屏幕变暗



## 开发扩展指南
### 添加新命令

在 gameModel.js 的 processCommand 方法中添加新的命令处理逻辑
如需添加到帮助菜单，更新相应位置的 commands 对象

### 添加新位置

在 gameModel.js 的 locations 对象中添加新的位置定义
包含位置描述和可用命令

### 添加新功能按钮

在 index.html 中的 .buttons-panel 中添加新的按钮元素
在 gameController.js 中添加相应的事件监听和处理逻辑

### 部署说明
由于服务器限制，所有JS文件应通过CDN进行云端推送。确保在部署时调整index.html中的文件引用路径。