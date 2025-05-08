// js/controllers/gameController.js
// Controller - 处理用户输入和游戏逻辑流
class GameController {
    constructor(model, view) {
        this.model = model;
        this.view = view;

        // 设置输出回调
        this.view.onOutputAdded = (text) => {
            this.model.addToHistory(text);
            this.saveSettings();
        };

        this.functionButtons = [];
        for (let i = 1; i <= 8; i++) {
            this.functionButtons.push(document.getElementById(`fnButton${i}`));
        }

        // 绑定事件
        document.getElementById('powerButton').addEventListener('click', () => this.togglePower());
        document.getElementById('commandInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.processInput();
        });
        
        // 订阅事件总线
        EventBus.on('diskActivity', () => this.view.flashDiskLight());
        EventBus.on('networkActivity', () => this.view.flashNetworkLight());
        
        // 初始状态
        this.view.input.disabled = true;
        document.querySelector('.prompt').classList.add('hidden'); // 初始状态隐藏命令行

        // 添加软盘读取询问标志
        this.awaitingDiskReadResponse = false;

        // 添加颜色切换功能
        this.setupColorToggle();

        // 从localStorage加载设置
        this.loadSettings();

        // 功能按钮点击事件
        this.functionButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                if (!this.model.isOn) return; // 系统关闭时按钮不响应
                
                // F1 - 切换到主终端
                if (index === 0) {
                    if (window.mapController && window.mapController.model.isVisible) {
                        window.mapController.toggleMapView();
                    }
                }
                
                // F5 - 显示地图
                if (index === 4) {
                    if (window.mapController && !window.mapController.model.isVisible) {
                        window.mapController.toggleMapView();
                    }
                }
            });
        });
        
        // 添加调试日志
        console.log("游戏控制器已初始化");
    }

    // 保存设置到localStorage
    saveSettings() {
        // 获取软盘状态（如果软盘控制器存在）
        const floppyDriveState = this.floppyController ? this.floppyController.getFloppyState() : null;
        
        const settings = {
            isPowerOn: this.model.isOn,
            colorMode: document.getElementById('colorToggle').classList.contains('amber') ? 'amber' : 'green',
            floppyDriveState: floppyDriveState
        };
        
        // 只有开机状态才保存历史记录
        if (this.model.isOn) {
            settings.terminalHistory = this.model.getHistory();
        } else {
            // 关机状态不保存历史记录
            settings.terminalHistory = [];
        }
        
        try {
            localStorage.setItem('terminalSettings', JSON.stringify(settings));
            console.log("设置已保存");
        } catch (e) {
            console.error("保存设置失败:", e);
        }
    }
    
    // 从localStorage加载设置
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('terminalSettings');
            
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                
                // 设置颜色模式
                const colorToggle = document.getElementById('colorToggle');
                const toggleSlider = colorToggle.querySelector('.toggle-slider');
                
                if (settings.colorMode === 'amber') {
                    colorToggle.classList.add('amber');
                    
                    // 如果是开机状态，将滑块变为琥珀色
                    if (settings.isPowerOn) {
                        toggleSlider.style.backgroundColor = '#ffb000';
                        toggleSlider.style.left = 'calc(100% - 16px)';
                    } else {
                        toggleSlider.style.backgroundColor = '#666';
                        toggleSlider.style.left = 'calc(100% - 16px)';
                    }
                } else {
                    colorToggle.classList.remove('amber');
                    
                    // 如果是开机状态，将滑块变为绿色
                    if (settings.isPowerOn) {
                        toggleSlider.style.backgroundColor = '#33ff33';
                        toggleSlider.style.left = '2px';
                    } else {
                        toggleSlider.style.backgroundColor = '#666';
                        toggleSlider.style.left = '2px';
                    }
                }
                
                // 设置初始电源状态
                if (settings.isPowerOn && settings.terminalHistory && settings.terminalHistory.length > 0) {
                    // 恢复开机状态
                    this.model.isOn = true;
                    this.model.systemState = this.model.SystemState.POWERED_ON;
                    this.model.terminalHistory = settings.terminalHistory;
                    
                    document.getElementById('powerButton').classList.add('on');
                    document.querySelector('.screen').classList.remove('screen-off');
                    document.querySelector('.screen').classList.add('screen-on');
                    document.getElementById('diskLight').classList.add('active-green');
                    
                    // 开启功能按钮指示灯
                    this.functionButtons.forEach(button => {
                        button.classList.add('powered');
                    });
                    
                    // 应用颜色模式
                    const screen = document.querySelector('.screen');
                    if (settings.colorMode === 'amber') {
                        screen.classList.remove('green-mode');
                        screen.classList.add('amber-mode');
                    } else {
                        screen.classList.remove('amber-mode');
                        screen.classList.add('green-mode');
                    }
                    
                    // 显示命令行并启用输入
                    document.querySelector('.prompt').classList.remove('hidden');
                    this.view.input.disabled = false;
                    
                    // 恢复终端历史内容
                    this.view.restoreHistory(settings.terminalHistory);
                    
                    setTimeout(() => {
                        this.view.input.focus();
                    }, 100);
                    
                    // 发布系统电源状态事件
                    EventBus.emit('systemPowerChange', true);
                } else {
                    // 确保关机状态
                    this.model.isOn = false;
                    this.model.systemState = this.model.SystemState.POWERED_OFF;
                    this.model.clearHistory(); // 确保历史被清除

                    // 确保功能按钮指示灯熄灭
                    this.functionButtons.forEach(button => {
                        button.classList.remove('powered');
                    });
                    
                    document.getElementById('powerButton').classList.remove('on');
                    document.querySelector('.screen').classList.add('screen-off');
                    document.querySelector('.screen').classList.remove('screen-on');
                    document.querySelector('.prompt').classList.add('hidden');
                    this.view.input.disabled = true;
                    
                    // 清空显示
                    this.view.clear();
                    
                    // 发布系统电源状态事件
                    EventBus.emit('systemPowerChange', false);
                }
            }
        } catch (error) {
            console.error("加载设置失败:", error);
        }
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
        
        const colorToggle = document.getElementById('colorToggle');
        const toggleSlider = colorToggle.querySelector('.toggle-slider');
        
        if (currentState === SystemState.POWERED_OFF) {
            // 开机流程
            // 确保开机前清除历史记录
            this.model.clearHistory();
            
            // 改变电源按钮样式
            document.getElementById('powerButton').classList.add('on');
            
            // 开始硬盘闪烁
            document.getElementById('diskLight').classList.add('disk-flashing');
            
            // 移除屏幕关闭效果
            document.querySelector('.screen').classList.remove('screen-off');
            
            this.view.powerOn();
            this.view.clear(); // 确保屏幕是空的
            
            // 调用模型的开机方法，更新状态
            this.model.powerOn();
            
            // 发布系统电源状态事件 - 开机中
            EventBus.emit('systemPowerChange', true);
            
            // 显示启动序列
            this.view.displayBootSequence(this.model.bootSequence, () => {
                setTimeout(() => {
                    // 硬盘指示灯从闪烁变为常亮绿色
                    document.getElementById('diskLight').classList.remove('disk-flashing');
                    document.getElementById('diskLight').classList.add('active-green');
                    
                    // 标记系统启动完成
                    this.model.completeStartup();
                    
                    // 重要：发布系统启动完成事件，让驱动器指示灯亮起
                    EventBus.emit('systemBootComplete', true);

                    // 开启功能按钮指示灯
                    this.functionButtons.forEach(button => {
                        button.classList.add('powered');
                    });
                    
                    // 重要：将完整的启动序列HTML添加到历史记录
                    // 创建一个字符串变量，包含所有启动序列的HTML
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
                    
                    // 将整个启动序列添加为一个历史条目
                    this.model.addToHistory(bootHTML);
                    
                    // 显示当前位置描述
                    const locationText = this.model.locations[this.model.currentLocation].description;
                    this.view.displayOutput(locationText);
                    this.model.addToHistory(locationText);
                    
                    // 显示命令行
                    document.querySelector('.prompt').classList.remove('hidden');
                    
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
        } else if (currentState === SystemState.POWERED_ON) {
            // 关机流程
            // 调用模型的关机方法，更新状态
            const shutdownMessage = this.model.powerOff();
            
            // 显示关机消息
            this.view.displayOutput(shutdownMessage);
            
            // 改变电源按钮样式
            document.getElementById('powerButton').classList.remove('on');
            
            // 关闭所有指示灯
            document.getElementById('diskLight').classList.remove('disk-flashing', 'active-green', 'active-blue', 'blue-flashing');
            
            // 关闭软盘相关的指示灯和动画
            EventBus.emit('systemShutdown');
            
            // 隐藏命令行
            document.querySelector('.prompt').classList.add('hidden');
            
            // 更新颜色切换按钮状态 - 将滑块颜色改为灰色
            toggleSlider.style.backgroundColor = '#666';
            
            // 发布系统电源状态事件 - 关机
            EventBus.emit('systemPowerChange', false);
            
            this.view.input.disabled = true;
            
            // 关键修复：立即关闭所有功能按钮指示灯
            this.functionButtons.forEach(button => {
                button.classList.remove('powered');
            });
            
            // 屏幕变暗效果
            setTimeout(() => {
                document.querySelector('.screen').classList.add('screen-off');
                this.view.powerOff();
                
                // 完成关机过程
                this.model.completeShutdown();
                
                // 保存关机状态
                this.saveSettings();
            }, 1000);
            
            console.log("系统正在关闭...");
            return true;
        }
        
        return false;
    }
    
    processInput() {
        const command = this.view.input.value;
        this.view.input.value = '';
        
        if (command.trim() !== '') {
            // 显示用户输入
            const inputText = `> ${command}`;
            this.view.displayOutput(inputText);
            
            // 检查是否正在等待软盘读取响应
            if (this.awaitingDiskReadResponse) {
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
                    
                    // 保存当前状态
                    this.saveSettings();
                    return;
                } else if (response === 'n' || response === 'no') {
                    const cancelMsg = "\n已取消读取驱动器B中的软盘。";
                    this.view.displayOutput(cancelMsg);
                    this.model.addToHistory(cancelMsg);
                    
                    // 保存当前状态
                    this.saveSettings();
                    return;
                } else {
                    // 无效输入，重新提示
                    const invalidMsg = "\n无效输入。请输入Y或N：";
                    this.view.displayOutput(invalidMsg);
                    this.model.addToHistory(invalidMsg);
                    this.awaitingDiskReadResponse = true; // 继续等待有效响应
                    
                    // 保存当前状态
                    this.saveSettings();
                    return;
                }
            }
            
            try {
                const response = this.model.processCommand(command);
                
                // 检查是否为清屏命令
                if (response === "CLEAR_SCREEN") {
                    // 清除屏幕
                    this.view.displayOutput(response);
                    // 完全清除历史记录
                    this.model.clearHistory();
                    // 添加一个空字符串或特殊标记作为历史记录占位符
                    // 这确保terminalHistory.length > 0，系统状态保持为开机
                    this.model.addToHistory('');  // 添加空字符串作为占位符
                } else {
                    // 处理普通命令
                    this.view.displayOutput(response);
                    this.model.addToHistory(inputText);
                    this.model.addToHistory(response);
                }
                
                // 保存当前状态
                this.saveSettings();
            } catch (error) {
                console.error("命令处理错误:", error);
                const errorText = "错误: 命令处理失败。系统故障。";
                this.view.displayOutput(errorText);
                this.model.addToHistory(inputText);
                this.model.addToHistory(errorText);
            }
        }
    }

    // 颜色切换功能
    setupColorToggle() {
        const colorToggle = document.getElementById('colorToggle');
        const toggleSlider = colorToggle.querySelector('.toggle-slider');
        const screen = document.querySelector('.screen');
        
        // 默认设置为绿色模式
        screen.classList.add('green-mode');
        
        colorToggle.addEventListener('click', () => {
            // 切换开关样式
            colorToggle.classList.toggle('amber');
            
            // 更新滑块位置和颜色
            if (colorToggle.classList.contains('amber')) {
                toggleSlider.style.left = 'calc(100% - 16px)';
                
                // 如果系统开启，更新为琥珀色
                if (this.model.isOn) {
                    toggleSlider.style.backgroundColor = '#ffb000';
                    screen.classList.remove('green-mode');
                    screen.classList.add('amber-mode');
                    
                    // 发布颜色模式变化事件
                    EventBus.emit('colorModeChanged', true);
                } else {
                    toggleSlider.style.backgroundColor = '#666';
                }
            } else {
                toggleSlider.style.left = '2px';
                
                // 如果系统开启，更新为绿色
                if (this.model.isOn) {
                    toggleSlider.style.backgroundColor = '#33ff33';
                    screen.classList.remove('amber-mode');
                    screen.classList.add('green-mode');
                    
                    // 发布颜色模式变化事件
                    EventBus.emit('colorModeChanged', false);
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