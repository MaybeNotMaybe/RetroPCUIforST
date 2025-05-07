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

## 功能特性

- 真实的复古CRT终端界面，具有逼真的扫描线和光晕效果
- 可交互的命令行界面，支持基本系统命令
- 模拟的系统启动序列，模拟IBM 5155个人电脑的开机过程 
- 物理控制面板，包含电源按钮和状态指示灯
- 双色模式切换：支持经典绿色磷光屏或琥珀色显示模式
- 状态保存：使用localStorage自动保存系统状态和用户偏好设置
- 真实的硬盘和网络活动指示灯：在操作期间闪烁以提供视觉反馈
- 自定义复古光标：完美模拟老式计算机的闪烁光标效果
- 命令历史记录，在系统开机期间保存用户交互

## 用户界面组件

### 控制面板
- **电源按钮**：点击开启或关闭系统
- **颜色切换开关**：切换终端显示颜色（绿色/琥珀色）
- **硬盘指示灯**：系统运行时常亮绿色，数据访问时闪烁黄色
- **网络指示灯**：网络通信时闪烁黄色

### 命令行界面
系统支持以下基本命令：
- `help` - 显示可用命令列表
- `search [关键词]` - 搜索数据库信息
- `connect [目标ID]` - 连接到NPC终端
- `status` - 显示系统状态信息
- `clear` - 清除屏幕

## 技术实现

### 核心技术
- HTML5 - 提供页面结构
- CSS3 - 实现复古CRT显示效果和UI样式
- 原生JavaScript - 实现游戏逻辑和交互
- localStorage API - 保存用户设置和系统状态
- MVC架构 - 分离数据、视图和控制逻辑
- 发布-订阅模式 - 通过EventBus实现组件间解耦通信

### 数据持久化
- 使用浏览器localStorage API存储：
  - 系统电源状态
  - 显示颜色偏好（绿色/琥珀色）
  - 终端历史记录（关机时自动清除）

## 文件详细说明
### HTML

```
index.html

功能：提供游戏界面的基本结构
依赖：styles.css和所有JavaScript文件
关键元素：
- 计算机外壳与屏幕
- 功能按钮面板
- 终端输出区域
- 命令输入区域与自定义光标
- 控制面板（电源按钮、颜色切换开关和状态指示灯）

新增功能：
- 颜色切换开关组件，允许用户切换绿色/琥珀色显示模式
- 自定义文本光标元素，模拟复古计算机的闪烁光标
```

### CSS

```
功能：实现所有视觉样式、动画效果和颜色模式
依赖：zpix.ttf字体文件
关键样式：
- CRT屏幕效果（扫描线、光晕）
- 双色模式支持（绿色与琥珀色）
- 终端文本样式（光标闪烁）
- 状态指示灯效果（闪烁、常亮）
- 功能按钮样式与交互效果
- 屏幕开关动画效果
- 颜色切换开关样式与状态
- 自定义光标样式与闪烁动画
- 响应式布局适配

新增样式：
- .amber-mode 相关样式，提供琥珀色显示模式
- .color-toggle 相关样式，实现颜色切换开关
- .cursor 相关样式，实现自定义文本光标
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
- powerOn() - 系统开机
- powerOff() - 系统关机（同时清除历史记录）
- processCommand(command) - 处理用户输入的命令
- getHelp() - 获取帮助信息
- getStatus() - 获取系统状态
- search(query) - 搜索功能
- connect(target) - 连接NPC功能
- addToHistory(content) - 添加内容到终端历史
- getHistory() - 获取完整历史记录
- clearHistory() - 清除历史记录

发布事件：
- diskActivity - 当有磁盘活动时触发
- networkActivity - 当有网络活动时触发

关键数据：
- bootSequence - 系统启动序列内容（已更新为安全操作系统）
- locations - 游戏位置和可用命令
- gameState - 游戏状态（物品栏、标记等）
- terminalHistory - 存储终端历史记录

新增功能：
- 终端历史记录管理
- 定制的启动序列内容
- 移除了power off命令（改为只通过物理按钮控制）
```

```
views/gameView.js


功能：处理UI显示和界面更新
依赖：无直接代码依赖
公开方法：
- powerOn() - 显示开机效果并应用当前颜色模式
- powerOff() - 显示关机效果
- displayBootSequence(sequence, callback) - 显示启动序列
- displayOutput(text) - 在终端显示输出
- clear() - 清除屏幕
- flashDiskLight() - 闪烁磁盘指示灯
- flashNetworkLight() - 闪烁网络指示灯
- restoreHistory(history) - 恢复终端历史记录
- setupCursor() - 设置自定义光标跟踪逻辑

新增功能：
- 自定义文本光标实现，支持正确处理空格和光标位置
- 支持绿色/琥珀色双色模式切换
- 终端历史记录恢复机制
- 开机序列自动滚动功能
```

```
controllers/gameController.js

功能：处理用户输入和协调Model与View
依赖：gameModel.js、gameView.js、eventBus.js
公开方法：
- togglePower() - 处理电源开关
- processInput() - 处理用户输入
- saveSettings() - 保存用户设置到localStorage
- loadSettings() - 从localStorage加载用户设置
- setupColorToggle() - 设置颜色切换功能

订阅事件：
- diskActivity - 触发视图中的磁盘指示灯闪烁
- networkActivity - 触发视图中的网络指示灯闪烁

DOM事件监听：
- 电源按钮点击事件
- 命令输入回车事件
- 颜色切换开关点击事件

新增功能：
- 颜色模式切换实现（绿色/琥珀色）
- 使用localStorage保存和恢复用户设置
- 保存系统状态（电源状态、颜色模式和终端历史）
- 自动恢复上次会话状态
```

```
main.js

功能：应用入口点，初始化MVC组件
依赖：gameModel.js、gameView.js、gameController.js
主要工作：
- 创建Model、View和Controller实例
- 连接三个组件，启动应用
- 提供基本的错误处理

注意：此文件基本无需更新，保持原有初始化逻辑
```

### 资源文件

```
assets/fonts/zpix.ttf

功能：提供复古计算机终端字体
使用范围：仅用于终端显示区域内的文本
```

```
assets/images/ibm-logo.svg

功能：提供IBM Logo图像
使用范围：系统启动序列中显示
```


## 事件流程说明

### 初始加载：
- 检查localStorage中的保存设置
- 应用保存的颜色模式偏好
- 如果之前处于开机状态，恢复终端历史内容

### 用户点击电源按钮：
- 如果系统关闭，开始启动序列：
  - gameController 调用 gameModel.powerOn()
  - 硬盘指示灯开始闪烁
  - 显示启动序列
  - 启动序列完成后，硬盘指示灯变为绿色常亮
  - 显示初始位置描述
- 如果系统开启，执行关机流程：
  - gameController 调用 gameModel.powerOff()
  - 显示关机消息
  - 清除终端历史记录
  - 关闭指示灯和屏幕

### 用户点击颜色切换开关：
- 切换屏幕显示颜色（绿色/琥珀色）
- 更新滑块位置和颜色状态
- 将颜色偏好保存到localStorage



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