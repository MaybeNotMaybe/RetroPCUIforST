// js/controllers/floppyController.js
class FloppyController {
    constructor(systemStateProvider) {
        // 使用服务定位器获取依赖
        this.serviceLocator = window.ServiceLocator;
        this.eventBus = this.serviceLocator ? this.serviceLocator.get('eventBus') : EventBus;
        this.audio = this.serviceLocator ? this.serviceLocator.get('audio') : window.audioManager;
        this.domUtils = window.DOMUtils || {
            get: id => document.querySelector(id),
            addClass: (el, cls) => el && el.classList.add(cls),
            removeClass: (el, cls) => el && el.classList.remove(cls)
        };
        this.storage = window.StorageUtils || {
            save: (key, data) => {
                try {
                    localStorage.setItem(key, JSON.stringify(data));
                    return true;
                } catch (e) {
                    console.error("保存失败:", e);
                    return false;
                }
            },
            load: (key, defaultValue = null) => {
                try {
                    const data = localStorage.getItem(key);
                    return data ? JSON.parse(data) : defaultValue;
                } catch (e) {
                    console.error("加载失败:", e);
                    return defaultValue;
                }
            }
        };
        
        // 兼容性处理：确保systemStateProvider有正确的接口
        this.systemStateProvider = systemStateProvider;
        
        // 创建模型和视图
        this.model = new FloppyModel();
        this.view = new FloppyView();
        
        // 加载点指示器引用
        this.loadingLine = null;
        this.loadingAnimationInterval = null;
        
        // 跟踪软盘是否已被读取
        this.diskHasBeenRead = false;
        
        // 跟踪系统是否完全初始化
        this.isInitialized = false;
        
        // 初始化
        this.setupEventListeners();
        this.initializeFloppyState();
        
        // 用于确保在系统恢复后更新驱动器状态
        setTimeout(() => {
            // 发布一次系统状态检查事件，确保在刷新页面后正确应用状态
            const isOn = this.isSystemOn();
            if (isOn) {
                this.updateDriveStateBySysStatus(isOn);
            }
            
            // 标记为已初始化
            this.isInitialized = true;
        }, 500);
        
        console.log("软盘控制器已初始化");
    }
    
    /**
     * 检查系统是否开机
     */
    isSystemOn() {
        // 尝试不同的方法获取系统状态
        try {
            // 1. 首先尝试直接检查GameController
            if (window.gameController && window.gameController.model) {
                return window.gameController.model.isOn;
            }
            
            // 2. 尝试直接调用提供的systemStateProvider
            if (this.systemStateProvider && typeof this.systemStateProvider.isSystemOn === 'function') {
                return this.systemStateProvider.isSystemOn();
            }
            
            // 3. 尝试使用SystemService
            const systemService = this.serviceLocator && this.serviceLocator.get('system');
            if (systemService && typeof systemService.isPowerOn === 'function') {
                return systemService.isPowerOn();
            }
            
            return false;
        } catch (error) {
            console.error("检查系统状态失败:", error);
            return false;
        }
    }
    
    /**
     * 检查系统是否可操作（完全开机）
     */
    isSystemOperational() {
        try {
            // 1. 直接检查GameController
            if (window.gameController && window.gameController.model) {
                const gameModel = window.gameController.model;
                return gameModel.isOn && 
                       gameModel.getSystemState() === gameModel.SystemState.POWERED_ON;
            }
            
            // 2. 尝试使用SystemService
            const systemService = this.serviceLocator && this.serviceLocator.get('system');
            if (systemService && typeof systemService.isOperational === 'function') {
                return systemService.isOperational();
            }
            
            // 3. 尝试使用全局函数
            if (typeof window.isSystemOperational === 'function') {
                return window.isSystemOperational();
            }
            
            return false;
        } catch (error) {
            console.error("检查系统操作状态失败:", error);
            return false;
        }
    }
    
    /**
     * 提供获取当前软盘状态的方法（用于保存设置）
     */
    getFloppyState() {
        return {
            diskInserted: this.model.drives.B.diskInserted,
            isProcessing: this.model.drives.B.isProcessing,
            isReading: this.model.drives.B.isReading,
            hasBeenRead: this.diskHasBeenRead
        };
    }
    
    /**
     * 初始化软盘驱动器UI和状态
     */
    initializeFloppyState() {
        try {
            // 使用存储工具加载设置
            const settings = this.storage.load('terminalSettings', null);
            const isSystemOn = this.isSystemOn();
            
            // 初始化视图
            this.view.initializeUI();
            
            // B驱动器初始状态
            let bDriveState = {
                diskInserted: false,
                isProcessing: false,
                isReading: false,
                hasBeenRead: false
            };
            
            if (settings && settings.floppyDriveState) {
                // 从设置中获取状态
                bDriveState.diskInserted = settings.floppyDriveState.diskInserted || false;
                bDriveState.hasBeenRead = settings.floppyDriveState.hasBeenRead || false;
                
                // 更新模型状态和已读标志
                if (bDriveState.diskInserted) {
                    this.model.drives.B.diskInserted = true;
                    this.diskHasBeenRead = bDriveState.hasBeenRead;
                }
            }
            
            // 更新视图 - 确保UI元素正确显示
            if (bDriveState.diskInserted) {
                this.view.updateDriveState('B', this.model.getDriveState('B'), isSystemOn);
                
                // 确保软盘边缘正确显示
                const diskB = this.domUtils.get('#floppyDiskB');
                if (diskB) {
                    diskB.style.display = 'block';
                    this.domUtils.addClass(diskB, 'fully-inserted');
                }
                
                // 确保插槽状态正确
                this.domUtils.addClass('#floppySlotB', 'disk-inserted');
                
                // 启用弹出按钮
                this.domUtils.removeClass('#ejectButtonB', 'disabled');
                
                // 隐藏完整软盘
                this.domUtils.addClass('#fullFloppyB', 'hide-full-floppy');
                this.domUtils.removeClass('#fullFloppyB', 'init-hidden');
            } else {
                // 如果没有软盘，确保显示完整软盘图像
                this.domUtils.removeClass('#fullFloppyB', ['init-hidden', 'hide-full-floppy']);
                this.domUtils.addClass('#fullFloppyB', 'floppy-hoverable');
            }
            
            // 同时更新A驱动器状态
            this.view.updateDriveState('A', this.model.getDriveState('A'), isSystemOn);
        } catch (error) {
            console.error("初始化软盘状态失败:", error);
        }
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // B驱动器插槽点击
        this.domUtils.on('#floppySlotB', 'click', () => {
            if (!this.model.drives.B.diskInserted && !this.model.drives.B.isProcessing) {
                this.insertFloppyDisk();
            }
        });
        
        // 完整软盘点击
        this.domUtils.on('#fullFloppyB', 'click', () => {
            if (!this.model.drives.B.diskInserted && !this.model.drives.B.isProcessing) {
                this.insertFloppyDisk();
            }
        });
        
        // 弹出按钮点击
        this.domUtils.on('#ejectButtonB', 'click', () => {
            const canEject = this.model.validateOperation('B', 'eject') && 
                            !this.domUtils.get('#ejectButtonB').classList.contains('disabled');
            
            if (canEject) {
                this.ejectFloppyDisk();
            } else if (this.model.drives.B.isReading) {
                // 无法弹出时播放按钮声音作为反馈
                this.audio.play('floppyButton');
                this.showReadingErrorMessage();
            }
        });
        
        // 订阅系统事件
        this.eventBus.on('systemBootComplete', this.handleSystemBootComplete.bind(this));
        this.eventBus.on('requestReadDriveB', this.handleReadDriveB.bind(this));
        this.eventBus.on('systemShutdown', this.handleSystemShutdown.bind(this));
        this.eventBus.on('systemStateChange', this.handleSystemStateChange.bind(this));
        this.eventBus.on('systemPowerChange', this.handleSystemPowerChange.bind(this));
    }
    
    /**
     * 根据系统状态更新驱动器状态
     * @param {boolean} isOn - 系统是否开机
     */
    updateDriveStateBySysStatus(isOn) {
        // 如果系统已开机，更新指示灯
        if (isOn) {
            // A驱动器始终点亮
            this.view.turnOnDriveLight('A');
            
            // 如果B驱动器有软盘，点亮它的指示灯
            if (this.model.drives.B.diskInserted) {
                this.view.turnOnDriveLight('B');
                
                // 如果软盘未被读取过且系统已完全初始化，询问是否读取
                if (!this.diskHasBeenRead && this.isInitialized && this.isSystemOperational()) {
                    // 延迟显示，确保界面已完全加载
                    setTimeout(() => {
                        this.promptForDiskRead();
                    }, 500);
                }
            }
        } else {
            // 系统关机时，关闭所有指示灯
            this.view.turnOffAllDriveLights();
        }
    }
    
    /**
     * 插入软盘到B驱动器
     */
    insertFloppyDisk() {
        // 检查系统是否处于开机/关机过程中
        if (!this.checkSystemTransitionState()) {
            return false;
        }
        
        // 使用模型的验证方法
        if (!this.model.insertDisk('B')) {
            return false;
        }
        
        // 插入新软盘时，重置已读取标志
        this.diskHasBeenRead = false;
        
        // 开始插入动画
        const isSystemOn = this.isSystemOn();
        this.view.startDiskInsertAnimation('B', isSystemOn, () => {
            this.completeFloppyInsertion();
        });
        
        return true;
    }
    
    /**
     * 完成软盘插入
     */
    completeFloppyInsertion() {
        const isSystemOn = this.isSystemOn();
        
        // 更新模型
        this.model.completeInsertion('B', isSystemOn);
        
        // 保存设置
        this.saveSettings();
        
        // 如果系统已开机，询问是否读取软盘
        if (isSystemOn && this.isSystemOperational()) {
            // 延迟显示询问，给动画一点时间
            setTimeout(() => {
                this.promptForDiskRead();
            }, 500);
        }
        
        return true;
    }
    
    /**
     * 弹出B驱动器中的软盘
     */
    ejectFloppyDisk() {
        // 检查系统是否处于开机/关机过程中
        if (!this.checkSystemTransitionState()) {
            return false;
        }
        
        // 检查是否正在等待软盘读取响应
        this.cancelReadingPromptIfNeeded();
        
        // 使用模型的验证方法
        if (!this.model.ejectDisk('B')) {
            return false;
        }
        
        // 确保停止软盘读取音效
        if (this.audio) {
            this.audio.stopFloppyReadingSound();
        }
        
        // 开始弹出动画
        const isSystemOn = this.isSystemOn();
        this.view.startDiskEjectAnimation('B', isSystemOn, () => {
            this.completeFloppyEjection();
        });
        
        return true;
    }
    
    /**
     * 完成软盘弹出
     */
    completeFloppyEjection() {
        const isSystemOn = this.isSystemOn();
        
        // 更新模型
        this.model.completeEjection('B', isSystemOn);
        
        // 保存设置（包括已读标志）
        this.saveSettings();
        
        return true;
    }
    
    /**
     * 显示正在读取错误消息
     */
    showReadingErrorMessage() {
        // 只有在系统已开机才显示消息
        if (this.isSystemOn() && window.gameController && window.gameController.view) {
            window.gameController.view.displayOutput("\n错误: 软盘正在读取中，请等待读取完成后再弹出。\n");
            
            // 将消息添加到历史记录
            if (window.gameController.model) {
                window.gameController.model.addToHistory("\n错误: 软盘正在读取中，请等待读取完成后再弹出。\n");
            }
        }
    }
    
    /**
     * 检查系统是否处于开关机过渡状态
     * @returns {boolean} 系统是否处于稳定状态（非开关机过程中）
     */
    checkSystemTransitionState() {
        // 检查系统是否处于开机/关机过程中
        if (window.gameController && window.gameController.model) {
            const currentState = window.gameController.model.getSystemState();
            const SystemState = window.gameController.model.SystemState;
            
            // 如果系统正在开机或关机过程中，禁止操作
            if (currentState === SystemState.POWERING_ON || currentState === SystemState.POWERING_OFF) {
                console.log("系统正在开/关机过程中，无法操作软盘");
                return false;
            }
        }
        return true;
    }
    
    /**
     * 取消等待软盘读取响应（如果存在）
     */
    cancelReadingPromptIfNeeded() {
        const gameController = window.gameController;
        if (gameController && gameController.awaitingDiskReadResponse) {
            // 取消等待响应状态
            gameController.awaitingDiskReadResponse = false;
            
            // 只有在系统实际开机状态下才显示消息
            if (this.isSystemOn() && gameController.view) {
                const cancelMsg = "\n用户已弹出软盘。操作已取消。";
                gameController.view.displayOutput(cancelMsg);
                
                // 将消息添加到历史记录
                if (gameController.model) {
                    gameController.model.addToHistory(cancelMsg);
                }
                
                // 保存当前状态
                gameController.saveSettings();
            }
        }
    }
    
    /**
     * 保存软盘设置
     */
    saveSettings() {
        if (window.gameController) {
            window.gameController.saveSettings();
        }
    }
    
    /**
     * 处理系统启动完成事件
     * @param {boolean} isBooted - 系统是否成功启动
     */
    handleSystemBootComplete(isBooted) {
        if (isBooted) {
            // 更新驱动器状态
            this.updateDriveStateBySysStatus(true);
        }
    }

    /**
     * 处理系统电源状态变化事件
     * @param {boolean} isOn - 系统是否开机
     */
    handleSystemPowerChange(isOn) {
        // 更新驱动器状态
        this.updateDriveStateBySysStatus(isOn);
    }

    /**
     * 处理读取驱动器B请求
     */
    handleReadDriveB() {
        // 检查系统是否开机
        if (!this.isSystemOperational()) {
            const gameController = window.gameController;
            if (gameController && gameController.view) {
                gameController.view.displayOutput("\n系统当前未开机，无法读取驱动器。\n");
            }
            return;
        }
        
        // 检查B驱动器是否有软盘
        if (!this.model.drives.B.diskInserted) {
            const gameController = window.gameController;
            if (gameController && gameController.view) {
                gameController.view.displayOutput("\n错误: 驱动器 B 中没有软盘。\n请插入软盘后重试。\n");
            }
            return;
        }
        
        // 如果有软盘，执行读取流程
        this.displayFloppyContent();
    }

    /**
     * 处理系统关机事件
     */
    handleSystemShutdown() {
        console.log("软盘控制器: 收到系统关机事件");
        
        // 中断所有软盘操作
        this.stopAllDiskOperations();
    }

    /**
     * 处理系统状态变化
     * @param {Object} stateData - 系统状态数据
     */
    handleSystemStateChange(stateData) {
        console.log("软盘控制器: 系统状态变化为", stateData.state);
        
        // 如果系统正在关机，停止所有操作
        if (stateData.state === 'POWERING_OFF') {
            this.stopAllDiskOperations();
        }
    }

    /**
     * 停止所有磁盘操作
     */
    stopAllDiskOperations() {
        // 停止当前加载动画
        this.stopLoadingAnimation();
        
        // 更新模型状态
        this.model.resetAll();
        
        // 重置视图状态
        this.view.turnOffAllDriveLights();
        
        // 停止所有声音
        if (this.audio) {
            this.audio.stopFloppyReadingSound();
        }
    }
    
    /**
     * 触发硬盘读取活动
     * @param {boolean} showReadingPrompt - 是否显示读取提示
     */
    triggerDiskReadActivity(showReadingPrompt = false) {
        // 保存当前系统硬盘灯状态
        const wasActiveGreen = this.view.triggerDiskReadActivity();
        
        // 如果需要显示读取提示，立即开始显示读取信息和加载动画
        if (showReadingPrompt) {
            this.startFloppyContentReading();
        }
        
        // 2秒后结束硬盘活动
        setTimeout(() => {
            // 恢复硬盘指示灯状态
            this.view.restoreDiskLight(wasActiveGreen);
            
            // 重要：读取完成后，才点亮驱动器B的指示灯
            if (this.isSystemOn() && this.model.drives.B.diskInserted) {
                this.view.turnOnDriveLight('B');
            }
            
            // 如果启动了读取提示，完成后显示内容
            if (showReadingPrompt) {
                this.displayFloppyContentAfterLoading();
            }
        }, 2000);
    }
    
    /**
     * 读取软盘内容
     * @returns {string|null} 软盘内容或null
     */
    readFloppyContent() {
        if (!this.model.drives.B.diskInserted) {
            return null;
        }
        
        try {
            // 从 gameDataString 提取内容
            return window.extractTagContent(window.gameDataString, 'drive_B');
        } catch (error) {
            console.error("读取软盘内容失败:", error);
            return null;
        }
    }

    /**
     * 显示软盘内容（带加载动画）
     */
    displayFloppyContent() {
        if (!this.isSystemOn() || !this.model.drives.B.diskInserted) {
            return;
        }
        
        // 开始读取
        this.model.startReading('B');
        
        // 开始硬盘读取活动和显示读取提示
        this.triggerDiskReadActivity(true);
    }

    /**
     * 启动软盘内容读取提示和加载动画
     */
    startFloppyContentReading() {
        // 禁用弹出按钮的视觉效果
        this.domUtils.addClass('#ejectButtonB', 'disabled');
        
        const gameController = window.gameController;

        if (!gameController || !gameController.view || !gameController.model) {
            console.error("无法获取游戏视图对象");
            return;
        }
        
        // 读取消息
        const readingMessage = "\n正在读取软盘B内容...\n";
        
        // 显示加载消息
        gameController.view.displayOutput(readingMessage);
        
        // 将读取消息添加到历史记录，带上特殊标记
        gameController.model.addToHistory(readingMessage + "<!-- loading_indicator -->");
        
        // 创建加载动画
        this.startLoadingAnimation();
        
        // 开始播放软盘读取循环音效
        if (this.audio) {
            this.audio.startFloppyReadingSound();
        }
    }

    /**
     * 读取完成后显示软盘内容
     */
    displayFloppyContentAfterLoading() {
        // 停止加载动画
        this.stopLoadingAnimation();
        
        // 获取软盘内容
        const content = this.readFloppyContent();
        
        const gameController = window.gameController;
        if (!gameController || !gameController.view || !gameController.model) {
            console.error("无法获取游戏控制器对象");
            return;
        }
        
        // 分隔线
        const separatorLine = "\n------------------------------------\n";
        
        // 显示内容前给出分隔线
        gameController.view.displayOutput(separatorLine);
        
        // 将分隔线添加到历史记录
        gameController.model.addToHistory(separatorLine);
        
        // 在显示内容时将硬盘指示灯切换为蓝色闪烁
        this.view.setReadingVisualState(true);
        
        if (content) {
            // 标记软盘已被读取
            this.diskHasBeenRead = true;
            
            // 启动打字机效果，结束后恢复绿色指示灯
            gameController.view.typeWriterEffect(content, document.getElementById('output'), () => {
                // 关键：将完整的软盘内容添加到历史记录中
                gameController.model.addToHistory(content);
                
                // 打字效果结束后，恢复绿色指示灯
                this.view.setReadingVisualState(false);
                
                // 显示结束分隔线
                gameController.view.displayOutput(separatorLine);
                
                // 将结束分隔线添加到历史记录
                gameController.model.addToHistory(separatorLine);

                // 打字机效果完成后停止软盘读取循环音效
                if (this.audio) {
                    this.audio.stopFloppyReadingSound();
                }

                // 完成读取
                this.model.completeReading('B');
                
                // 恢复弹出按钮
                if (this.model.drives.B.diskInserted) {
                    this.domUtils.removeClass('#ejectButtonB', 'disabled');
                }
                
                // 保存设置（包括已读标志）
                this.saveSettings();
            }, 10); // 打字机效果速度
        } else {
            const errorMessage = "错误: 无法读取软盘内容或内容为空。";
            gameController.view.displayOutput(errorMessage);
            gameController.model.addToHistory(errorMessage);
            
            gameController.view.displayOutput(separatorLine);
            gameController.model.addToHistory(separatorLine);

            // 错误情况下也要停止软盘读取循环音效
            if (this.audio) {
                this.audio.stopFloppyReadingSound();
            }
            
            // 恢复绿色指示灯
            this.view.setReadingVisualState(false);
            
            // 完成读取
            this.model.completeReading('B');
            
            // 保存设置
            this.saveSettings();
        }
    }

    /**
     * 启动加载动画
     */
    startLoadingAnimation() {
        if (this.loadingAnimationInterval) {
            clearInterval(this.loadingAnimationInterval);
        }
        
        const loadingChars = ['\\', '|', '/', '-'];
        let i = 0;
        
        // 创建专用于加载的行元素
        const outputElement = this.domUtils.get('#output');
        const loadingLine = document.createElement('div');
        loadingLine.className = 'typed-line loading-animation';
        loadingLine.textContent = `读取中 ${loadingChars[i]}`;
        outputElement.appendChild(loadingLine);
        
        // 存储引用以便稍后更新
        this.loadingLine = loadingLine;
        
        // 滚动到底部
        outputElement.scrollTop = outputElement.scrollHeight;
        
        // 开始动画
        this.loadingAnimationInterval = setInterval(() => {
            if (this.loadingLine) {
                i = (i + 1) % loadingChars.length;
                this.loadingLine.textContent = `读取中 ${loadingChars[i]}`;
                outputElement.scrollTop = outputElement.scrollHeight;
            }
        }, 250);
    }

    /**
     * 停止加载动画
     */
    stopLoadingAnimation() {
        if (this.loadingAnimationInterval) {
            clearInterval(this.loadingAnimationInterval);
            this.loadingAnimationInterval = null;
            
            // 移除加载行
            if (this.loadingLine) {
                this.loadingLine.textContent = "读取完成";
                
                // 将加载完成信息添加到历史
                const gameController = window.gameController;
                if (gameController && gameController.model) {
                    gameController.model.addToHistory("读取完成");
                }
                
                setTimeout(() => {
                    if (this.loadingLine && this.loadingLine.parentNode) {
                        this.loadingLine.parentNode.removeChild(this.loadingLine);
                    }
                    this.loadingLine = null;
                }, 500);
            }
        }
    }

    /**
     * 询问用户是否读取软盘
     */
    promptForDiskRead() {
        // 如果软盘已经被读取过，不再询问
        if (this.diskHasBeenRead) {
            return;
        }
        
        const gameController = window.gameController;
        if (gameController && gameController.view) {
            // 显示询问信息
            gameController.view.displayOutput("\n检测到驱动器B:中已存在软盘，是否读取？Y/N");
            
            // 设置标志，表示等待用户回应
            gameController.awaitingDiskReadResponse = true;
            
            // 将询问添加到历史记录
            if (gameController.model) {
                gameController.model.addToHistory("\n检测到驱动器B:中已存在软盘，是否读取？Y/N");
            }
        }
    }
}