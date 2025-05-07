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

        // 添加颜色切换功能
        this.setupColorToggle();

        // 立即初始化软盘状态
        this.initializeFloppyState();

        // 设置软盘驱动器控制
        this.setupFloppyDriveControls();

        // 从localStorage加载设置
        this.loadSettings();
        
        // 添加调试日志
        console.log("游戏控制器已初始化");

        // 从localStorage加载设置
        this.loadSettings();

        setTimeout(() => {
            document.querySelector('.floppy-drives-container').classList.add('floppy-initialized');
        }, 100);
    }

    // 保存设置到localStorage
    saveSettings() {
        const settings = {
            isPowerOn: this.model.isOn,
            colorMode: document.getElementById('colorToggle').classList.contains('amber') ? 'amber' : 'green',
            terminalHistory: this.model.isOn ? this.model.getHistory() : [],
            // 添加软盘状态
            floppyDriveState: this.model.getFloppyDriveState()
        };
        
        // 只有开机状态才保存历史记录
        if (this.model.isOn) {
            settings.terminalHistory = this.model.getHistory();
        } else {
            // 关机状态不保存历史记录
            settings.terminalHistory = [];
        }
        
        localStorage.setItem('terminalSettings', JSON.stringify(settings));
        console.log("设置已保存:", settings);
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
                    this.model.terminalHistory = settings.terminalHistory;
                    
                    document.getElementById('powerButton').classList.add('on');
                    document.querySelector('.screen').classList.remove('screen-off');
                    document.querySelector('.screen').classList.add('screen-on');
                    document.getElementById('diskLight').classList.add('active-green');
                    
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
                } else {
                    // 确保关机状态
                    this.model.isOn = false;
                    this.model.clearHistory(); // 确保历史被清除
                    
                    document.getElementById('powerButton').classList.remove('on');
                    document.querySelector('.screen').classList.add('screen-off');
                    document.querySelector('.screen').classList.remove('screen-on');
                    document.querySelector('.prompt').classList.add('hidden');
                    this.view.input.disabled = true;
                    
                    // 清空显示
                    this.view.clear();
                }

                // 恢复软盘状态
                if (settings.floppyDriveState) {
                    // 更新模型状态
                    this.model.floppyDriveState = settings.floppyDriveState;
                    
                    // 如果软盘已插入，更新UI状态
                    if (settings.floppyDriveState.diskInserted) {
                        // 确保软盘显示并且位置正确
                        this.view.floppyDiskB.style.display = 'block';
                        
                        // 关键：不要加动画类，而是直接设置正确的样式位置
                        // 移除所有可能的动画类
                        this.view.floppyDiskB.classList.remove('inserting', 'ejecting');
                        
                        // 通过内联样式确保软盘位于正确位置
                        this.view.floppyDiskB.style.bottom = '2.5px'; // 完全插入的位置
                        
                        this.view.floppySlotB.classList.add('disk-inserted');
                        this.view.ejectButtonB.classList.remove('disabled');
                        
                        // 确保完整软盘隐藏
                        this.view.fullFloppyB.classList.add('hide-full-floppy');
                        this.view.fullFloppyB.classList.remove('inserting-full', 'ejecting-full');
                        
                        // 只有在系统开机时才点亮指示灯
                        if (settings.isPowerOn) {
                            this.view.driveLightB.classList.add('active');
                        } else {
                            this.view.driveLightB.classList.remove('active');
                        }
                    }else {
                        // 如果没有插入软盘，确保完整软盘正确显示
                        this.view.fullFloppyB.classList.remove('hide-full-floppy');
                    }
                }
                
                // 处理A驱动器的灯光状态
                const driveLightA = document.querySelector('.drive-a .drive-light');
                if (driveLightA) {
                    if (settings.isPowerOn) {
                        driveLightA.classList.add('active');
                    } else {
                        driveLightA.classList.remove('active');
                    }
                }
            }
        } catch (error) {
            console.error("加载设置失败:", error);
        }
    }
    
    togglePower() {
        const colorToggle = document.getElementById('colorToggle');
        const toggleSlider = colorToggle.querySelector('.toggle-slider');
        
        if (!this.model.isOn) {
            // 确保开机前清除历史记录
            this.model.clearHistory();
            
            this.model.isOn = true;
            
            // 改变电源按钮样式
            document.getElementById('powerButton').classList.add('on');
            
            // 开始硬盘闪烁
            document.getElementById('diskLight').classList.add('disk-flashing');
            
            // 移除屏幕关闭效果
            document.querySelector('.screen').classList.remove('screen-off');
            
            this.view.powerOn();
            this.view.clear(); // 确保屏幕是空的
            
            // 显示启动序列
            this.view.displayBootSequence(this.model.bootSequence, () => {
                setTimeout(() => {
                    document.getElementById('diskLight').classList.remove('disk-flashing');
                    document.getElementById('diskLight').classList.add('active-green');
                    
                    // 重要：将完整的启动序列HTML添加到历史记录
                    // 创建一个字符串变量，包含所有启动序列的HTML
                    let bootHTML = '';
                    
                    // 添加imb Logo
                    bootHTML += `<div class="imb-logo"><img src="${this.model.bootSequence[0].content}" alt="IMB Logo"></div>`;
                    
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

                    // A驱动器灯常亮（A盘总是插入）
                    document.querySelector('.drive-a .drive-light').classList.add('active');
                    
                    // 如果B驱动器有软盘，让B驱动器灯也常亮
                    if (this.model.floppyDriveState.diskInserted) {
                        this.view.driveLightB.classList.add('active');
                    }
                    
                    // 保存设置
                    this.saveSettings();
                }, 500);
            });
            
            console.log("系统已开启");
        } else {
            // 显示关机消息
            this.view.displayOutput(this.model.powerOff());
            
            // 改变电源按钮样式
            document.getElementById('powerButton').classList.remove('on');
            
            // 关闭硬盘指示灯
            document.getElementById('diskLight').classList.remove('disk-flashing');
            document.getElementById('diskLight').classList.remove('active-green');
            
            // 隐藏命令行
            document.querySelector('.prompt').classList.add('hidden');
            
            this.model.isOn = false;
            this.view.input.disabled = true;
            
            // 屏幕变暗效果
            setTimeout(() => {
                document.querySelector('.screen').classList.add('screen-off');
                this.view.powerOff();
                
                // 保存关机状态
                this.saveSettings();
            }, 1000);

            // 关闭所有驱动器指示灯
            this.view.turnOffDriveLights();
            
            console.log("系统已关闭");
        }
    }
    
    processInput() {
        const command = this.view.input.value;
        this.view.input.value = '';
        
        if (command.trim() !== '') {
            // 显示用户输入
            const inputText = `> ${command}`;
            this.view.displayOutput(inputText);
            this.model.addToHistory(inputText);
            
            try {
                const response = this.model.processCommand(command);
                this.view.displayOutput(response);
                this.model.addToHistory(response);
                
                // 保存当前状态
                this.saveSettings();
            } catch (error) {
                console.error("命令处理错误:", error);
                const errorText = "错误: 命令处理失败。系统故障。";
                this.view.displayOutput(errorText);
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

    initializeFloppyState() {
        try {
            const savedSettings = localStorage.getItem('terminalSettings');
            
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                
                // 仅处理软盘状态
                if (settings.floppyDriveState && settings.floppyDriveState.diskInserted) {
                    // 立即隐藏完整软盘
                    this.view.fullFloppyB.classList.add('hide-full-floppy');
                    
                    // 立即设置软盘位置
                    this.view.floppyDiskB.style.display = 'block';
                    this.view.floppyDiskB.style.bottom = '2.5px';
                    this.view.floppySlotB.classList.add('disk-inserted');
                } else {
                    // 如果没有插入软盘，确保完整软盘可见
                    this.view.fullFloppyB.classList.remove('init-hidden');
                }
            }
        } catch (error) {
            console.error("初始化软盘状态失败:", error);
        }
    }

    setupFloppyDriveControls() {
        // B驱动器的事件监听
        this.view.floppySlotB.addEventListener('click', () => {
            const floppyState = this.model.getFloppyDriveState();
            if (!floppyState.diskInserted && !floppyState.isProcessing) {
                this.insertFloppyDisk();
            }
        });
        
        this.view.fullFloppyB.addEventListener('click', () => {
            const floppyState = this.model.getFloppyDriveState();
            if (!floppyState.diskInserted && !floppyState.isProcessing) {
                this.insertFloppyDisk();
            }
        });
        
        this.view.ejectButtonB.addEventListener('click', () => {
            const floppyState = this.model.getFloppyDriveState();
            if (floppyState.diskInserted && !floppyState.isProcessing && 
                !this.view.ejectButtonB.classList.contains('disabled')) {
                this.ejectFloppyDisk();
            }
        });
    }
    
    insertFloppyDisk() {
        const result = this.model.insertFloppyDisk();
        if (result && result.success) {
            this.view.startFloppyInsertAnimation(result.isSystemOn, () => {
                this.model.completeFloppyInsertion();
                this.saveSettings(); // 保存软盘状态
            });
        }
    }
    
    ejectFloppyDisk() {
        const result = this.model.ejectFloppyDisk();
        if (result && result.success) {
            this.view.startFloppyEjectAnimation(result.isSystemOn, () => {
                this.model.completeFloppyEjection();
                this.saveSettings(); // 保存软盘状态
            });
        }
    }
}