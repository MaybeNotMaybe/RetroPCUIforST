// js/services/interfaceService.js
/**
 * 界面服务
 * 管理不同界面之间的切换和交互
 */
class InterfaceService {
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
        
        // 订阅事件
        this.subscribeToEvents();
    }
    
    /**
     * 注册界面控制器
     * @param {string} interfaceName - 界面名称
     * @param {object} controller - 控制器实例
     */
    registerController(interfaceName, controller) {
        if (this.interfaces[interfaceName]) {
            this.interfaces[interfaceName].controller = controller;
            console.log(`已注册 ${interfaceName} 控制器`);
        } else {
            console.warn(`未知界面: ${interfaceName}`);
        }
    }
    
    /**
     * 绑定功能按钮
     */
    bindFunctionButtons() {
        // 获取DOM元素
        const dom = window.DOMUtils;
        const f1Button = dom.get('#fnButton1');
        const f2Button = dom.get('#fnButton2');
        const f5Button = dom.get('#fnButton5');
        
        // 终端按钮
        if (f1Button) {
            f1Button.textContent = '终端';
            dom.on(f1Button, 'click', () => {
                this.handleButtonClick('terminal');
            });
        }
        
        // 档案按钮
        if (f2Button) {
            f2Button.textContent = '档案';
            dom.on(f2Button, 'click', () => {
                this.handleButtonClick('identity');
            });
        }
        
        // 地图按钮
        if (f5Button) {
            f5Button.textContent = '地图';
            dom.on(f5Button, 'click', () => {
                this.handleButtonClick('map');
            });
        }
    }
    
    /**
     * 处理按钮点击
     * @param {string} interfaceName - 界面名称
     */
    handleButtonClick(interfaceName) {
        // 播放按钮音效
        const audio = window.ServiceLocator.get('audio');
        if (audio) {
            audio.play('functionButton');
        }
        
        // 检查系统是否可操作
        const gameCore = window.GameCore;
        if (gameCore && gameCore.isSystemOperational()) {
            this.switchTo(interfaceName);
        }
    }
    
    /**
     * 绑定键盘快捷键
     */
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 只有在系统运行时才响应快捷键
            const gameCore = window.GameCore;
            if (!gameCore || !gameCore.isSystemOperational()) return;
            
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
    
    /**
     * 订阅事件
     */
    subscribeToEvents() {
        const eventBus = window.ServiceLocator.get('eventBus');
        if (eventBus) {
            eventBus.on('runProgram', (data) => {
                if (data && data.program === 'map') {
                    this.switchTo('map');
                }
            });
            
            eventBus.on('testModeChanged', (isTestMode) => {
                this.isTestMode = isTestMode;
            });
        }
    }
    
    /**
     * 切换到指定界面
     * @param {string} interfaceName - 界面名称
     * @returns {boolean} 是否成功切换
     */
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
        
        // 获取DOM工具
        const dom = window.DOMUtils;
        
        // 使用闪烁效果(如果不在测试模式)
        const switchFunction = () => {
            // 1. 先隐藏当前界面元素
            if (currentInterface.element) {
                dom.toggle(currentInterface.element, false);
            }
            
            // 2. 特殊状态更新
            if (this.activeInterface === 'map' && currentInterface.controller) {
                // 使用控制器的模型设置可见性
                if (currentInterface.controller.model) {
                    currentInterface.controller.model.setVisibility(false);
                }
            } else if (this.activeInterface === 'identity' && window.identityController) {
                window.identityController.isVisible = false;
            }
            
            // 3. 更新当前活动界面记录
            this.activeInterface = interfaceName;
            
            // 4. 显示目标界面元素
            if (targetInterface.element) {
                dom.toggle(targetInterface.element, true, 'flex');
            }
            
            // 5. 特殊状态更新和视图刷新
            if (interfaceName === 'map' && targetInterface.controller) {
                // 更新地图状态 - 使用控制器的模型设置可见性
                if (targetInterface.controller.model) {
                    targetInterface.controller.model.setVisibility(true);
                }
                
                // 触发地图渲染
                targetInterface.controller.renderMap();
            } else if (interfaceName === 'identity' && window.identityController) {
                // 更新档案界面状态
                window.identityController.isVisible = true;
                
                // 刷新身份显示
                window.identityController.updateIdentityDisplays();
            } else if (interfaceName === 'terminal') {
                // 终端界面特殊处理 - 聚焦到输入框
                setTimeout(() => {
                    const commandInput = dom.get('#commandInput');
                    if (commandInput && !commandInput.disabled) {
                        commandInput.focus();
                    }
                }, 100);
            }
        };
        
        // 应用切换效果
        if (!this.isTestMode) {
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
    
    /**
     * 屏幕闪烁效果
     * @param {Function} callback - 回调函数
     */
    flickerScreen(callback) {
        const dom = window.DOMUtils;
        const screenElement = dom.get('.screen');
        
        // 播放切换音效
        const audio = window.ServiceLocator.get('audio');
        if (audio) {
            audio.play('screenSwitch');
        }
        
        dom.addClass(screenElement, 'screen-flicker');
        
        setTimeout(() => {
            dom.removeClass(screenElement, 'screen-flicker');
            if (callback) callback();
        }, 75);
    }
    
    /**
     * 获取当前活动界面
     * @returns {string} 当前界面名称
     */
    getActiveInterface() {
        return this.activeInterface;
    }
}