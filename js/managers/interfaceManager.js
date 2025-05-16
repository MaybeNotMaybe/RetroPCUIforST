// js/managers/interfaceManager.js - 修改版
class InterfaceManager {
    constructor() {
        // 所有可用界面
        this.interfaces = {
            terminal: {
                element: document.getElementById('terminal'),
                controller: null
            },
            map: {
                element: document.getElementById('mapInterface'),
                controller: null
            },
            identity: {
                element: document.getElementById('statusInterface'),
                controller: null
            }
        };
        
        // 当前活动界面
        this.activeInterface = 'terminal';
        
        // 绑定功能按钮
        this.bindFunctionButtons();
        
        // 绑定键盘快捷键
        this.bindKeyboardShortcuts();
    }
    
    // 注册界面控制器
    registerController(interfaceName, controller) {
        if (this.interfaces[interfaceName]) {
            this.interfaces[interfaceName].controller = controller;
            console.log(`已注册 ${interfaceName} 控制器`);
        }
    }
    
    // 绑定功能按钮
    bindFunctionButtons() {
        const f1Button = document.getElementById('fnButton1');
        const f2Button = document.getElementById('fnButton2');
        const f5Button = document.getElementById('fnButton5');
        
        if (f1Button) {
            f1Button.textContent = '终端';
            f1Button.addEventListener('click', () => {
                if (window.isSystemOperational()) {
                    this.switchTo('terminal');
                }
                // 无论如何播放按钮音效
                if (window.audioManager) window.audioManager.play('functionButton');
            });
        }
        
        if (f2Button) {
            f2Button.textContent = '档案';
            f2Button.addEventListener('click', () => {
                if (window.isSystemOperational()) {
                    this.switchTo('identity');
                }
                // 无论如何播放按钮音效
                if (window.audioManager) window.audioManager.play('functionButton');
            });
        }
        
        if (f5Button) {
            f5Button.textContent = '地图';
            f5Button.addEventListener('click', () => {
                if (window.isSystemOperational()) {
                    this.switchTo('map');
                }
                // 无论如何播放按钮音效
                if (window.audioManager) window.audioManager.play('functionButton');
            });
        }
    }
    
    // 绑定键盘快捷键
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 只有在系统运行时才响应快捷键
            if (!window.isSystemOperational()) return;
            
            switch (e.key) {
                case 'F1':
                    e.preventDefault();
                    this.switchTo('terminal');
                    break;
                case 'F2':
                    e.preventDefault();
                    this.switchTo('identity');
                    break;
                case 'F5':
                    e.preventDefault();
                    this.switchTo('map');
                    break;
            }
        });
    }
    
    // 切换到指定界面
    switchTo(interfaceName) {
        // 确保界面存在
        if (!this.interfaces[interfaceName]) {
            console.error(`界面不存在: ${interfaceName}`);
            return false;
        }
        
        // 如果已经是当前界面，不做任何操作
        if (this.activeInterface === interfaceName) {
            return true;
        }
        
        console.log(`切换界面: ${this.activeInterface} -> ${interfaceName}`);
        
        // 获取当前和目标界面对象
        const currentInterface = this.interfaces[this.activeInterface];
        const targetInterface = this.interfaces[interfaceName];
        
        // 使用闪烁效果(如果不在测试模式)
        const isTestMode = window.gameController && window.gameController.model.isTestMode;
        
        const switchFunction = () => {
            // 1. 先隐藏当前界面元素 (纯DOM操作，不调用控制器)
            if (currentInterface.element) {
                currentInterface.element.style.display = 'none';
            }
            
            // 2. 特殊状态更新 (不调用控制器的hide方法)
            if (this.activeInterface === 'map' && window.mapController) {
                window.mapController.model.setVisibility(false);
            } else if (this.activeInterface === 'identity' && window.identityController) {
                window.identityController.isVisible = false;
            }
            
            // 3. 更新当前活动界面记录
            this.activeInterface = interfaceName;
            
            // 4. 显示目标界面元素
            if (targetInterface.element) {
                targetInterface.element.style.display = 'flex';
            }
            
            // 5. 特殊状态更新和视图刷新
            if (interfaceName === 'map' && window.mapController) {
                // 更新地图状态
                window.mapController.model.setVisibility(true);
                
                // 直接触发地图渲染
                window.mapController.renderMap();
            } else if (interfaceName === 'identity' && window.identityController) {
                // 更新档案界面状态
                window.identityController.isVisible = true;
                
                // 刷新身份显示
                window.identityController.updateIdentityDisplays();
            } else if (interfaceName === 'terminal') {
                // 终端界面特殊处理 - 聚焦到输入框
                setTimeout(() => {
                    const commandInput = document.getElementById('commandInput');
                    if (commandInput && !commandInput.disabled) {
                        commandInput.focus();
                    }
                }, 100);
            }
        };
        
        // 应用切换效果
        if (!isTestMode) {
            this.flickerScreen(switchFunction);
        } else {
            switchFunction();
        }
        
        // 保存设置
        if (window.gameController) {
            window.gameController.saveSettings();
        }
        
        return true;
    }
    
    // 屏幕闪烁效果
    flickerScreen(callback) {
        const screenElement = document.querySelector('.screen');
        if (window.audioManager) window.audioManager.play('screenSwitch');
        screenElement.classList.add('screen-flicker');
        setTimeout(() => {
            screenElement.classList.remove('screen-flicker');
            if (callback) callback();
        }, 75);
    }
    
    // 获取当前活动界面
    getActiveInterface() {
        return this.activeInterface;
    }
}