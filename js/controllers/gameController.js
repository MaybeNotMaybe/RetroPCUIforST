// js/controllers/gameController.js
class GameController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.domUtils = window.DOMUtils;
        this.storage = window.StorageUtils;
        this.serviceLocator = window.ServiceLocator;
        
        // 获取服务
        this.eventBus = this.serviceLocator.get('eventBus') || EventBus;
        this.audio = this.serviceLocator.get('audio') || window.audioManager;
        
        // 设置输出回调
        this.view.onOutputAdded = (text) => {
            this.model.addToHistory(text);
            this.saveSettings();
        };

        // 初始化功能按钮
        this.initFunctionButtons();

        // 绑定事件
        this.bindEvents();
        
        // 添加软盘读取询问标志
        this.awaitingDiskReadResponse = false;

        // 添加颜色切换功能
        this.setupColorToggle();

        // 从localStorage加载设置
        this.loadSettings();

        // 设置键盘焦点事件
        this.setupKeyboardFocus();
        
        // 添加调试日志
        console.log("游戏控制器已初始化");
    }

    // 初始化功能按钮
    initFunctionButtons() {
        this.functionButtons = [];
        for (let i = 1; i <= 8; i++) {
            const button = this.domUtils.get(`#fnButton${i}`);
            if (button) {
                this.functionButtons.push(button);
            }
        }
    }

    // 绑定事件
    bindEvents() {
        // 电源按钮事件
        this.domUtils.on('#powerButton', 'click', () => {
            // 播放音效
            this.audio.play('powerButton');
            this.togglePower();
        });

        // 命令输入事件
        this.domUtils.on('#commandInput', 'keydown', (e) => {
            if (e.key === 'Enter') this.processInput();
        });
        
        // 订阅事件总线
        this.eventBus.on('diskActivity', () => this.view.flashDiskLight());
        this.eventBus.on('networkActivity', () => this.view.flashNetworkLight());
    }

    // 设置键盘焦点
    setupKeyboardFocus() {
        document.addEventListener('keydown', (e) => {
            // 如果按下的是 Enter 键
            if (e.key === 'Enter') {
                // 检查当前是否在地图界面
                const isMapVisible = window.mapController && 
                                    window.mapController.model.isVisible;
                
                // 获取命令输入框和其焦点状态
                const commandInput = this.domUtils.get('#commandInput');
                const hasFocus = document.activeElement === commandInput;
                
                // 如果系统已开机，不在地图界面，输入框未禁用，且输入框未获得焦点
                if (this.model.isOn && 
                    !isMapVisible && 
                    commandInput && 
                    !commandInput.disabled && 
                    !hasFocus) {
                    
                    // 阻止事件默认行为
                    e.preventDefault();
                    
                    // 让输入框获得焦点
                    commandInput.focus();
                }
            }
        });
    }

    // 保存设置到localStorage
    saveSettings() {
        // 获取软盘状态（如果软盘控制器存在）
        const floppyDriveState = this.floppyController ? this.floppyController.getFloppyState() : null;
        
        // 获取当前地图状态（如果地图控制器存在）
        const mapVisible = window.mapController ? window.mapController.model.isVisible : false;

        const settings = {
            isPowerOn: this.model.isOn,
            colorMode: this.domUtils.get('#colorToggle').classList.contains('amber') ? 'amber' : 'green',
            floppyDriveState: floppyDriveState,
            mapVisible: mapVisible,
            isTestMode: this.model.isTestMode 
        };
        
        // 只有开机状态才保存历史记录
        if (this.model.isOn) {
            settings.terminalHistory = this.model.getHistory();
        } else {
            // 关机状态不保存历史记录
            settings.terminalHistory = [];
        }
        
        // 使用存储工具保存
        this.storage.save('terminalSettings', settings);
        console.log("设置已保存");
    }
    
    // 从localStorage加载设置
    loadSettings() {
        // 使用存储工具加载
        const settings = this.storage.load('terminalSettings', null);
        
        if (settings) {
            // 设置颜色模式
            const colorToggle = this.domUtils.get('#colorToggle');
            const toggleSlider = colorToggle.querySelector('.toggle-slider');
            const screen = this.domUtils.get('.screen');
            const computerCase = this.domUtils.get('.computer-case');
            
            if (settings.colorMode === 'amber') {
                this.domUtils.addClass(colorToggle, 'amber');
                
                // 如果是开机状态，将滑块变为琥珀色并应用琥珀色模式到计算机外壳
                if (settings.isPowerOn) {
                    toggleSlider.style.backgroundColor = '#ffb000';
                    toggleSlider.style.left = 'calc(100% - 16px)';
                    
                    // 为屏幕和计算机外壳添加琥珀色模式
                    this.domUtils.removeClass(screen, 'green-mode');
                    this.domUtils.addClass(screen, 'amber-mode');
                    this.domUtils.removeClass(computerCase, 'green-mode');
                    this.domUtils.addClass(computerCase, 'amber-mode');
                } else {
                    toggleSlider.style.backgroundColor = '#666';
                    toggleSlider.style.left = 'calc(100% - 16px)';
                }
            } else {
                this.domUtils.removeClass(colorToggle, 'amber');
                
                // 如果是开机状态，将滑块变为绿色
                if (settings.isPowerOn) {
                    toggleSlider.style.backgroundColor = '#33ff33';
                    toggleSlider.style.left = '2px';
                    
                    // 为屏幕和计算机外壳添加绿色模式
                    this.domUtils.removeClass(screen, 'amber-mode');
                    this.domUtils.addClass(screen, 'green-mode');
                    this.domUtils.removeClass(computerCase, 'amber-mode');
                    this.domUtils.addClass(computerCase, 'green-mode');
                } else {
                    toggleSlider.style.backgroundColor = '#666';
                    toggleSlider.style.left = '2px';
                }
            }

            // 恢复测试模式状态
            if (settings.isTestMode !== undefined) {
                this.model.isTestMode = settings.isTestMode;
                // 广播测试模式状态，让其他组件知道
                this.eventBus.emit('testModeChanged', this.model.isTestMode);
            }
            
            // 设置初始电源状态
            if (settings.isPowerOn && settings.terminalHistory && settings.terminalHistory.length > 0) {
                this.restoreSystemState(settings);
            } else {
                this.ensureSystemOff();
            }
        }
    }
    
    // 恢复系统开机状态
    restoreSystemState(settings) {
        // 恢复开机状态
        this.model.isOn = true;
        this.model.systemState = this.model.SystemState.POWERED_ON;
        this.model.terminalHistory = settings.terminalHistory;
        
        // 更新UI
        this.domUtils.addClass('#powerButton', 'on');
        this.domUtils.removeClass('.screen', 'screen-off');
        this.domUtils.addClass('.screen', 'screen-on');
        this.domUtils.addClass('#diskLight', 'active-green');
        
        // 启用功能按钮
        setTimeout(() => {
            this.functionButtons.forEach(button => {
                this.domUtils.addClass(button, 'powered');
            });
        }, 100);
        
        // 应用颜色模式
        const screen = this.domUtils.get('.screen');
        if (settings.colorMode === 'amber') {
            this.domUtils.removeClass(screen, 'green-mode');
            this.domUtils.addClass(screen, 'amber-mode');
        } else {
            this.domUtils.removeClass(screen, 'amber-mode');
            this.domUtils.addClass(screen, 'green-mode');
        }
        
        // 显示命令行并启用输入
        this.domUtils.removeClass('.prompt', 'hidden');
        this.view.input.disabled = false;
        
        // 恢复终端历史内容
        this.view.restoreHistory(settings.terminalHistory);
        
        // 聚焦到输入框
        setTimeout(() => {
            this.view.input.focus();
        }, 50);
        
        // 发布系统状态变化事件
        this.eventBus.emit('systemStateChange', {
            state: this.model.SystemState.POWERED_ON,
            isOn: true
        });
        
        // 发布系统电源状态事件
        this.eventBus.emit('systemPowerChange', true);
        
        // 发布系统启动完成事件 - 这是关键修复
        this.eventBus.emit('systemBootComplete', true);

        // 启动计算机音效
        setTimeout(() => {
            this.audio.startComputerSound();
        }, 300);

        // 恢复地图可见性状态
        setTimeout(() => {
            // 确保地图控制器已初始化
            if (window.mapController && settings.mapVisible) {
                // 如果地图应该可见，切换到地图视图
                window.mapController.toggleMapView();
            }
        }, 50);
    }
    
    // 确保系统关机状态
    ensureSystemOff() {
        // 确保关机状态
        this.model.isOn = false;
        this.model.systemState = this.model.SystemState.POWERED_OFF;
        this.model.clearHistory(); // 确保历史被清除

        // 确保功能按钮指示灯熄灭
        this.functionButtons.forEach(button => {
            this.domUtils.removeClass(button, 'powered');
        });
        
        // 更新UI
        this.domUtils.removeClass('#powerButton', 'on');
        this.domUtils.addClass('.screen', 'screen-off');
        this.domUtils.removeClass('.screen', 'screen-on');
        this.domUtils.addClass('.prompt', 'hidden');
        this.view.input.disabled = true;
        
        // 清空显示
        this.view.clear();
        
        // 发布系统电源状态事件
        this.eventBus.emit('systemPowerChange', false);
    }
    
    togglePower() {
        // 获取当前系统状态
        const currentState = this.model.getSystemState();
        const SystemState = this.model.SystemState;
        
        // 检查当前状态，防止在转换过程中触发电源按钮
        switch (currentState) {
            case SystemState.POWERING_ON:
                console.log("系统正在启动中，请等待...");
                return false;
                
            case SystemState.POWERING_OFF:
                console.log("系统正在关闭中，请等待...");
                return false;
        }
        
        const colorToggle = this.domUtils.get('#colorToggle');
        const toggleSlider = colorToggle.querySelector('.toggle-slider');
        
        if (currentState === SystemState.POWERED_OFF) {
            return this.powerOn(toggleSlider);
        } else if (currentState === SystemState.POWERED_ON) {
            return this.powerOff(toggleSlider);
        }
        
        return false;
    }
    
    // 开机逻辑
    powerOn(toggleSlider) {
        // 播放开机音效
        this.audio.play('screenOn');
        
        // 启动电脑运行背景音效（短暂延迟，先让开机声完成一部分）
        setTimeout(() => {
            this.audio.startComputerSound();
        }, 500);

        // 确保开机前清除历史记录
        this.model.clearHistory();
        
        // 改变电源按钮样式
        this.domUtils.addClass('#powerButton', 'on');
        
        // 开始硬盘闪烁
        this.domUtils.addClass('#diskLight', 'disk-flashing');
        
        // 移除屏幕关闭效果
        this.domUtils.removeClass('.screen', 'screen-off');
        
        // 开始视图开机流程
        this.view.powerOn();
        this.view.clear(); // 确保屏幕是空的
        
        // 调用模型的开机方法，更新状态
        this.model.powerOn();
        
        // 发布系统电源状态事件 - 开机中
        this.eventBus.emit('systemPowerChange', true);
        
        // 显示启动序列
        this.view.displayBootSequence(this.model.bootSequence, () => {
            setTimeout(() => {
                // 硬盘指示灯从闪烁变为常亮绿色
                this.domUtils.removeClass('#diskLight', 'disk-flashing');
                this.domUtils.addClass('#diskLight', 'active-green');
                
                // 标记系统启动完成
                this.model.completeStartup();
                
                // 重要：发布系统启动完成事件，让驱动器指示灯亮起
                this.eventBus.emit('systemBootComplete', true);

                // 开启功能按钮指示灯
                this.functionButtons.forEach(button => {
                    this.domUtils.addClass(button, 'powered');
                });
                
                // 重要：将完整的启动序列HTML添加到历史记录
                // 创建一个字符串变量，包含所有启动序列的HTML
                let bootHTML = this.createBootSequenceHTML();
                
                // 将整个启动序列添加为一个历史条目
                this.model.addToHistory(bootHTML);
                
                // 显示当前位置描述
                const locationText = this.model.locations[this.model.currentLocation].description;
                this.view.displayOutput(locationText);
                this.model.addToHistory(locationText);
                
                // 显示命令行
                this.domUtils.removeClass('.prompt', 'hidden');
                
                // 启用输入
                this.view.input.disabled = false;
                this.view.input.focus();
                
                // 更新滑块颜色
                if (colorToggle.classList.contains('amber')) {
                    toggleSlider.style.backgroundColor = '#ffb000';
                } else {
                    toggleSlider.style.backgroundColor = '#33ff33';
                }
                
                // 保存设置
                this.saveSettings();
            }, 500);
        });
        
        console.log("系统正在启动...");
        return true;
    }
    
    // 创建启动序列HTML
    createBootSequenceHTML() {
        let bootHTML = '';
        
        // 添加imb Logo
        bootHTML += `<div class="imb-logo"><img src="${this.model.bootSequence[0].content}" alt="imb Logo"></div>`;
        
        // 添加Personal Computer
        bootHTML += `<div class="boot-container"><div class="text-center">${this.model.bootSequence[1].content}</div></div>`;
        
        // 添加安全操作系统框
        bootHTML += `<div class="boot-container"><div class="bordered-box">${this.model.bootSequence[2].content.join('<br>')}</div></div>`;
        
        // 添加其他文本行
        for (let i = 3; i < this.model.bootSequence.length; i++) {
            bootHTML += `<div class="boot-container"><div class="text-center">${this.model.bootSequence[i].content}</div></div>`;
        }
        
        // 添加空行
        bootHTML += '<div class="boot-container">&nbsp;</div>';
        
        return bootHTML;
    }
    
    // 关机逻辑
    powerOff(toggleSlider) {
        // 播放关机音效
        this.audio.play('screenOff');

        // 停止电脑运行背景音效
        this.audio.stopComputerSound();

        // 调用模型的关机方法，更新状态
        const shutdownMessage = this.model.powerOff();
        
        // 显示关机消息
        this.view.displayOutput(shutdownMessage);
        
        // 改变电源按钮样式
        this.domUtils.removeClass('#powerButton', 'on');
        
        // 关闭所有指示灯
        this.domUtils.removeClass('#diskLight', 'disk-flashing', 'active-green', 'active-blue', 'blue-flashing');
        
        // 关闭软盘相关的指示灯和动画
        this.eventBus.emit('systemShutdown');

        // 重置软盘读取响应等待标志
        this.awaitingDiskReadResponse = false;
        
        // 隐藏命令行
        this.domUtils.addClass('.prompt', 'hidden');
        
        // 更新颜色切换按钮状态 - 将滑块颜色改为灰色
        toggleSlider.style.backgroundColor = '#666';
        
        // 发布系统电源状态事件 - 关机
        this.eventBus.emit('systemPowerChange', false);
        
        // 禁用输入
        this.view.input.disabled = true;
        
        // 关键修复：立即关闭所有功能按钮指示灯
        this.functionButtons.forEach(button => {
            this.domUtils.removeClass(button, 'powered');
        });
        
        // 屏幕变暗效果
        setTimeout(() => {
            this.domUtils.addClass('.screen', 'screen-off');
            this.view.powerOff();
            
            // 完成关机过程
            this.model.completeShutdown();
            
            // 保存关机状态
            this.saveSettings();
        }, 1000);
        
        console.log("系统正在关闭...");
        return true;
    }
    
    processInput() {
        const command = this.view.input.value.trim();
        this.view.input.value = '';
        
        if (command === "") return;
        
        // 显示用户输入
        const inputText = `> ${command}`;
        this.view.displayOutput(inputText);
        
        // 记录命令到历史
        this.model.addToHistory(inputText);
        
        // 获取命令服务
        const commandService = this.serviceLocator.get('command');
        
        if (commandService) {
            // 使用命令服务执行命令
            const result = commandService.executeCommand(command, {
                controller: this,
                model: this.model,
                view: this.view
            });
            
            // 处理命令执行结果
            if (result) {
                // 特殊处理清屏命令
                if (result.message === "CLEAR_SCREEN") {
                    this.view.displayOutput(result.message);
                    // 清除历史记录
                    this.model.clearHistory();
                    // 添加空字符串作为历史记录占位符
                    this.model.addToHistory('');
                } else if (result.message) {
                    // 显示命令输出
                    this.view.displayOutput(result.message);
                    // 添加到历史
                    this.model.addToHistory(result.message);
                }
            }
        } else {
            // 命令服务不可用，回退到旧的处理方式
            try {
                const response = this.model.processCommand(command);
                
                // 检查是否为清屏命令
                if (response === "CLEAR_SCREEN") {
                    // 清除屏幕
                    this.view.displayOutput(response);
                    // 完全清除历史记录
                    this.model.clearHistory();
                    // 添加一个空字符串作为历史记录占位符
                    this.model.addToHistory('');
                } else {
                    // 处理普通命令
                    this.view.displayOutput(response);
                    this.model.addToHistory(response);
                }
            } catch (error) {
                console.error("命令处理错误:", error);
                const errorText = "错误: 命令处理失败。系统故障。";
                this.view.displayOutput(errorText);
                this.model.addToHistory(errorText);
            }
        }
        
        // 保存当前状态
        this.saveSettings();
    }
    
    // 处理等待软盘读取响应
    handleDiskReadResponse(command, inputText) {
        this.awaitingDiskReadResponse = false; // 重置标志
        
        // 处理Y/N响应
        const response = command.trim().toLowerCase();
        
        // 添加输入到历史记录
        this.model.addToHistory(inputText);
        
        // 检查是Y还是N (支持多种形式)
        if (response === 'y' || response === 'yes') {
            const confirmMsg = "\n开始读取驱动器B中的软盘...";
            this.view.displayOutput(confirmMsg);
            this.model.addToHistory(confirmMsg);
            
            // 触发软盘读取
            if (this.floppyController) {
                this.floppyController.triggerDiskReadActivity(true);
            }
        } else if (response === 'n' || response === 'no') {
            const cancelMsg = "\n已取消读取驱动器B中的软盘。";
            this.view.displayOutput(cancelMsg);
            this.model.addToHistory(cancelMsg);
        } else {
            // 无效输入，重新提示
            const invalidMsg = "\n无效输入。请输入Y或N：";
            this.view.displayOutput(invalidMsg);
            this.model.addToHistory(invalidMsg);
            this.awaitingDiskReadResponse = true; // 继续等待有效响应
        }
        
        // 保存当前状态
        this.saveSettings();
    }

    // 颜色切换功能
    setupColorToggle() {
        const colorToggle = this.domUtils.get('#colorToggle');
        const toggleSlider = colorToggle.querySelector('.toggle-slider');
        const screen = this.domUtils.get('.screen');
        
        // 获取计算机外壳元素
        const computerCase = this.domUtils.get('.computer-case');
        
        // 默认设置为绿色模式
        this.domUtils.addClass(screen, 'green-mode');
        
        // 添加点击事件
        this.domUtils.on(colorToggle, 'click', () => {
            // 切换开关样式
            this.domUtils.toggleClass(colorToggle, 'amber');
            
            // 更新滑块位置和颜色
            if (colorToggle.classList.contains('amber')) {
                toggleSlider.style.left = 'calc(100% - 16px)';
                
                // 如果系统开启，更新为琥珀色
                if (this.model.isOn) {
                    toggleSlider.style.backgroundColor = '#ffb000';
                    
                    // 更新屏幕和计算机外壳颜色模式
                    this.domUtils.removeClass(screen, 'green-mode');
                    this.domUtils.addClass(screen, 'amber-mode');
                    this.domUtils.removeClass(computerCase, 'green-mode');
                    this.domUtils.addClass(computerCase, 'amber-mode');
                    
                    // 发布颜色模式变化事件
                    this.eventBus.emit('colorModeChanged', true);
                } else {
                    toggleSlider.style.backgroundColor = '#666';
                }
            } else {
                toggleSlider.style.left = '2px';
                
                // 如果系统开启，更新为绿色
                if (this.model.isOn) {
                    toggleSlider.style.backgroundColor = '#33ff33';
                    
                    // 更新屏幕和计算机外壳颜色模式
                    this.domUtils.removeClass(screen, 'amber-mode');
                    this.domUtils.addClass(screen, 'green-mode');
                    this.domUtils.removeClass(computerCase, 'amber-mode');
                    this.domUtils.addClass(computerCase, 'green-mode');
                    
                    // 发布颜色模式变化事件
                    this.eventBus.emit('colorModeChanged', false);
                } else {
                    toggleSlider.style.backgroundColor = '#666';
                }
            }
            
            // 如果系统开启，保持焦点在输入框
            if (this.model.isOn) {
                this.view.input.focus();
            }
            
            // 保存颜色模式设置
            this.saveSettings();
        });
    }
}