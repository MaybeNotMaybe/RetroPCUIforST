// js/controllers/floppyController.js
class FloppyController {
    constructor(systemStateProvider) {
        this.systemStateProvider = systemStateProvider;
        
        // 软盘B驱动器状态
        this.floppyState = {
            diskInserted: false,
            isProcessing: false
        };
        
        // 获取DOM元素
        this.floppySlotB = document.getElementById('floppySlotB');
        this.floppyDiskB = document.getElementById('floppyDiskB');
        this.ejectButtonB = document.getElementById('ejectButtonB');
        this.driveLightB = document.getElementById('driveLightB');
        this.fullFloppyB = document.getElementById('fullFloppyB');
        
        // A驱动器指示灯
        this.driveLightA = document.querySelector('.drive-a .drive-light');
        
        // 主界面硬盘指示灯
        this.diskLight = document.getElementById('diskLight');
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 初始状态
        this.initializeFloppyState();
        
        // 订阅系统启动完成事件
        EventBus.on('systemBootComplete', this.handleSystemBootComplete.bind(this));

        // 订阅读取驱动器B请求事件
        EventBus.on('requestReadDriveB', this.handleReadDriveB.bind(this));

        // 订阅系统关机事件
        EventBus.on('systemShutdown', this.handleSystemShutdown.bind(this));
        
        // 系统状态变化事件
        EventBus.on('systemStateChange', this.handleSystemStateChange.bind(this));
        
        console.log("软盘控制器已初始化");
    }

    
    
    // 提供获取当前软盘状态的方法
    getFloppyState() {
        return { ...this.floppyState };
    }
    
    // 初始化软盘驱动器UI
    initializeFloppyState() {
        try {
            const savedSettings = localStorage.getItem('terminalSettings');
            
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                const isSystemOn = this.systemStateProvider.isSystemOn();
                
                // 确保所有驱动器灯最初都是关闭的
                this.driveLightA.classList.remove('active', 'blinking');
                this.driveLightB.classList.remove('active', 'blinking');
                
                // 处理B驱动器状态
                if (settings.floppyDriveState && settings.floppyDriveState.diskInserted) {
                    // 保存状态
                    this.floppyState.diskInserted = true;
                    
                    // 立即设置UI状态
                    this.floppyDiskB.style.display = 'block';
                    this.floppyDiskB.classList.remove('inserting', 'ejecting');
                    this.floppyDiskB.classList.add('fully-inserted');
                    this.floppySlotB.classList.add('disk-inserted');
                    this.ejectButtonB.classList.remove('disabled');
                    this.fullFloppyB.classList.add('hide-full-floppy');
                    this.fullFloppyB.classList.remove('floppy-hoverable');
                    
                    // 关键：只有在系统开机且硬盘指示灯为绿色常亮（表示启动完成）时才点亮驱动器灯
                    if (isSystemOn && this.diskLight.classList.contains('active-green')) {
                        this.driveLightA.classList.add('active');
                        this.driveLightB.classList.add('active');
                    }
                } else {
                    // 保存状态
                    this.floppyState.diskInserted = false;
                    
                    // 设置UI为无软盘状态
                    this.floppyDiskB.style.display = 'none';
                    this.floppyDiskB.classList.remove('inserting', 'ejecting', 'fully-inserted');
                    this.floppySlotB.classList.remove('disk-inserted');
                    this.ejectButtonB.classList.add('disabled');
                    this.fullFloppyB.classList.remove('hide-full-floppy', 'init-hidden');
                    this.fullFloppyB.classList.add('floppy-hoverable');
                    
                    // 关键：只有在系统开机且硬盘指示灯为绿色常亮（表示启动完成）时才点亮A驱动器灯
                    if (isSystemOn && this.diskLight.classList.contains('active-green')) {
                        this.driveLightA.classList.add('active');
                    }
                }
            } else {
                // 无保存设置，使用默认状态
                this.floppyState.diskInserted = false;
                // 确保软盘可见且可悬停
                this.fullFloppyB.classList.remove('hide-full-floppy', 'init-hidden');
                this.fullFloppyB.classList.add('floppy-hoverable');
            }
            
            // 确保软盘驱动器容器初始化
            setTimeout(() => {
                document.querySelector('.floppy-drives-container').classList.add('floppy-initialized');
            }, 100);
        } catch (error) {
            console.error("初始化软盘状态失败:", error);
        }
    }
    
    setupEventListeners() {
        // B驱动器插槽点击
        this.floppySlotB.addEventListener('click', () => {
            if (!this.floppyState.diskInserted && !this.floppyState.isProcessing) {
                this.insertFloppyDisk();
            }
        });
        
        // 完整软盘点击
        this.fullFloppyB.addEventListener('click', () => {
            if (!this.floppyState.diskInserted && !this.floppyState.isProcessing) {
                this.insertFloppyDisk();
            }
        });
        
        // 弹出按钮点击
        this.ejectButtonB.addEventListener('click', () => {
            if (this.floppyState.diskInserted && !this.floppyState.isProcessing && 
                !this.ejectButtonB.classList.contains('disabled')) {
                this.ejectFloppyDisk();
            }
        });
    }
    
    insertFloppyDisk() {
        // 检查系统是否处于开机/关机过程中
        if (this.systemStateProvider && window.gameController && window.gameController.model) {
            const currentState = window.gameController.model.getSystemState();
            const SystemState = window.gameController.model.SystemState;
            
            // 如果系统正在开机或关机过程中，禁止操作
            if (currentState === SystemState.POWERING_ON || currentState === SystemState.POWERING_OFF) {
                console.log("系统正在开/关机过程中，无法操作软盘");
                return false;
            }
        }
        
        if (this.floppyState.diskInserted || this.floppyState.isProcessing) {
            return false;
        }
        
        this.floppyState.isProcessing = true;
      
        // 开始插入动画
        const isSystemOn = this.systemStateProvider.isSystemOn();
        this.startFloppyInsertAnimation(isSystemOn);

        // 播放软盘插入声音
        window.audioManager.play('floppyInsert');
        
        return true;
    }
    
    completeFloppyInsertion() {
        this.floppyState.isProcessing = false;
        this.floppyState.diskInserted = true;
        
        // 触发保存
        if (window.gameController) {
            window.gameController.saveSettings();
        }
        
        // // 触发磁盘活动事件
        // if (this.systemStateProvider.isSystemOn()) {
        //     EventBus.emit('diskActivity', { drive: 'B' });
            
        //     // 磁盘活动结束后显示内容
        //     setTimeout(() => {
        //         this.displayFloppyContent();
        //     }, 2000);
        // }
        
        return true;
    }
    
    ejectFloppyDisk() {
        // 检查系统是否处于开机/关机过程中
        if (this.systemStateProvider && window.gameController && window.gameController.model) {
            const currentState = window.gameController.model.getSystemState();
            const SystemState = window.gameController.model.SystemState;
            
            // 如果系统正在开机或关机过程中，禁止操作
            if (currentState === SystemState.POWERING_ON || currentState === SystemState.POWERING_OFF) {
                console.log("系统正在开/关机过程中，无法操作软盘");
                return false;
            }
        }
        
        if (!this.floppyState.diskInserted || this.floppyState.isProcessing) {
            return false;
        }
        
        // 检查是否正在等待软盘读取响应
        const gameController = window.gameController;
        if (gameController && gameController.awaitingDiskReadResponse) {
            // 取消等待响应状态
            gameController.awaitingDiskReadResponse = false;
            
            // 只有在系统实际开机状态下才显示消息
            if (this.systemStateProvider.isSystemOn() && gameController.view) {
                const cancelMsg = "\n用户已弹出软盘。操作已取消。";
                gameController.view.displayOutput(cancelMsg);
                
                // 将消息添加到历史记录
                if (gameController.model) {
                    gameController.model.addToHistory(cancelMsg);
                }

                // 确保停止正在播放的软盘读取音效
                if (window.audioManager) {
                    window.audioManager.stopFloppyReadingSound();
                }
                
                // 保存当前状态
                gameController.saveSettings();
            }
        }

        // 无论是否允许操作，总是播放点击声音
        // window.audioManager.play('floppyButton');
                
        // 继续正常的弹出流程
        this.floppyState.isProcessing = true;

        // 播放软盘弹出声音
        window.audioManager.play('floppyEject');

        const isSystemOn = this.systemStateProvider.isSystemOn();
        this.startFloppyEjectAnimation(isSystemOn);
        
        return true;
    }
    
    completeFloppyEjection() {
        this.floppyState.isProcessing = false;
        this.floppyState.diskInserted = false;
        
        // 触发保存
        if (window.gameController) {
            window.gameController.saveSettings();
        }
        
        // 触发磁盘活动事件
        if (this.systemStateProvider.isSystemOn()) {
            EventBus.emit('diskActivity', { drive: 'B' });
        }
        
        return true;
    }
    
    // 处理系统启动完成事件
    handleSystemBootComplete(isBooted) {
        if (isBooted) {
            // 系统启动完成，打开A驱动器灯
            this.driveLightA.classList.add('active');
            
            // 如果B驱动器已插入软盘，打开B驱动器灯并询问用户
            if (this.floppyState.diskInserted) {
                this.driveLightB.classList.add('active');
                
                // 短暂延迟后显示询问提示
                setTimeout(() => {
                    this.promptForDiskRead();
                }, 1000);
            }
        }
    }

    // 处理系统电源状态变化事件
    handleSystemPowerChange(isOn) {
        // 关键：电源关闭时，所有指示灯立即熄灭
        if (!isOn) {
            this.driveLightA.classList.remove('active', 'blinking');
            this.driveLightB.classList.remove('active', 'blinking');
        }
        
        // 注意：电源打开时，不立即亮灯，等待启动完成事件
    }

    // 处理读取驱动器B请求
    handleReadDriveB() {
        // 检查系统是否开机
        if (!this.systemStateProvider.isSystemOn()) {
            const gameController = window.gameController;
            if (gameController && gameController.view) {
                gameController.view.displayOutput("\n系统当前未开机，无法读取驱动器。\n");
            }
            return;
        }
        
        // 检查B驱动器是否有软盘
        if (!this.floppyState.diskInserted) {
            const gameController = window.gameController;
            if (gameController && gameController.view) {
                gameController.view.displayOutput("\n错误: 驱动器 B 中没有软盘。\n请插入软盘后重试。\n");
            }
            return;
        }
        
        // 如果有软盘，执行读取流程
        this.displayFloppyContent();
    }

    // 处理系统关机事件
    handleSystemShutdown() {
        console.log("软盘控制器: 收到系统关机事件");
        
        // 中断所有软盘操作
        this.stopAllDiskOperations();
    }

    // 处理系统状态变化
    handleSystemStateChange(stateData) {
        console.log("软盘控制器: 系统状态变化为", stateData.state);
        
        // 如果系统正在关机，停止所有操作
        if (stateData.state === 'POWERING_OFF') {
            this.stopAllDiskOperations();
        }
    }

    // 停止所有磁盘操作
    stopAllDiskOperations() {
        // 停止当前加载动画
        if (this.loadingAnimationInterval) {
            this.stopLoadingAnimation();
        }
        
        // 停止硬盘指示灯闪烁
        const diskLight = document.getElementById('diskLight');
        diskLight.classList.remove('disk-flashing', 'blue-flashing');
        
        // 移除软盘驱动器指示灯状态
        this.driveLightA.classList.remove('active', 'blinking');
        this.driveLightB.classList.remove('active', 'blinking');

        // 确保停止软盘读取音效
        if (window.audioManager) {
            window.audioManager.stopFloppyReadingSound();
        }
        
        // 重置正在处理标记
        this.floppyState.isProcessing = false;
    }
    
    startFloppyInsertAnimation(isSystemOn) {
        // 移除悬停类
        this.fullFloppyB.classList.remove('floppy-hoverable');
        
        // 首先执行完整软盘的插入动画
        this.fullFloppyB.classList.add('inserting-full');
        
        // 只有在系统开机时才闪烁驱动器指示灯
        if (isSystemOn) {
            this.driveLightB.classList.add('blinking');
        }
        
        // 在完整软盘即将完成动画时显示边缘软盘
        setTimeout(() => {
            this.floppyDiskB.style.display = 'block';
            this.floppyDiskB.classList.add('inserting');
            this.floppySlotB.classList.add('disk-inserted');
        }, 1000);
        
        // 插入完成后
        setTimeout(() => {
            // 从软盘驱动器上移除闪烁效果
            this.driveLightB.classList.remove('blinking');
            
            // 重要：移除插入动画类，添加完全插入类
            this.floppyDiskB.classList.remove('inserting');
            this.floppyDiskB.classList.add('fully-inserted');
            
            // 启用弹出按钮
            this.ejectButtonB.classList.remove('disabled');
            
            // 隐藏完整软盘
            this.fullFloppyB.classList.add('hide-full-floppy');
            this.fullFloppyB.classList.remove('inserting-full');
            
            // 关键：如果系统已开机，立即开始硬盘读取活动和显示读取提示
            if (isSystemOn) {
                // 开始硬盘读取活动和显示读取提示（同步进行）
                // this.promptForDiskRead();
                this.triggerDiskReadActivity(true);
            }
            
            // 完成插入
            this.completeFloppyInsertion();
        }, 1500);
    }

    // 触发硬盘读取活动
    triggerDiskReadActivity(showReadingPrompt = false) {
        // 保存当前系统硬盘灯状态
        const wasActiveGreen = this.diskLight.classList.contains('active-green');

        // 播放硬盘活动声音
        window.audioManager.play('diskActivity');
        
        // 先移除常亮状态
        this.diskLight.classList.remove('active-green', 'active-blue');
        
        // 添加闪烁状态
        this.diskLight.classList.add('disk-flashing');
        
        // 如果需要显示读取提示，立即开始显示读取信息和加载动画
        if (showReadingPrompt) {
            this.startFloppyContentReading();
        }
        
        // 2秒后结束硬盘活动
        setTimeout(() => {
            // 移除闪烁
            this.diskLight.classList.remove('disk-flashing');
            
            // 恢复常亮状态
            if (wasActiveGreen) {
                this.diskLight.classList.add('active-green');
            }
            
            // 重要：读取完成后，才点亮驱动器B的指示灯
            if (this.systemStateProvider.isSystemOn() && this.floppyState.diskInserted) {
                this.driveLightB.classList.add('active');
            }
            
            // 如果启动了读取提示，完成后显示内容
            if (showReadingPrompt) {
                this.displayFloppyContentAfterLoading();
            }
        }, 2000);
    }
    
    startFloppyEjectAnimation(isSystemOn) {
        // 立即关闭B驱动器灯
        this.driveLightB.classList.remove('active');
        
        // 移除完全插入类
        this.floppyDiskB.classList.remove('fully-inserted');
        
        this.floppyDiskB.classList.remove('inserting');
        this.floppyDiskB.classList.add('ejecting');
        this.floppySlotB.classList.remove('disk-inserted');
        
        // 显示完整软盘并开始弹出动画
        this.fullFloppyB.classList.remove('hide-full-floppy');
        this.fullFloppyB.classList.add('ejecting-full');
        
        // 只有在系统开机时才闪烁指示灯
        if (isSystemOn) {
            this.driveLightB.classList.add('blinking');
            
            // 让系统硬盘指示灯也闪烁一下
            this.triggerDiskEjectActivity();
        }
        
        setTimeout(() => {
            // 关闭指示灯
            this.driveLightB.classList.remove('blinking');
            this.driveLightB.classList.remove('active');
            
            // 重置软盘边缘
            this.floppyDiskB.style.display = 'none';
            this.floppyDiskB.classList.remove('ejecting');
            
            // 禁用弹出按钮
            this.ejectButtonB.classList.add('disabled');
            
            // 重置完整软盘状态
            setTimeout(() => {
                this.fullFloppyB.classList.remove('ejecting-full');
                this.fullFloppyB.classList.add('floppy-hoverable');
            }, 100);
            
            // 完成弹出
            this.completeFloppyEjection();
        }, 1500);
    }
    
    // 触发弹出时的硬盘活动
    triggerDiskEjectActivity() {
        // 保存当前系统硬盘灯状态
        const wasActiveGreen = this.diskLight.classList.contains('active-green');
        
        // 让系统指示灯短暂闪烁
        if (wasActiveGreen) {
            this.diskLight.classList.remove('active-green');
            this.diskLight.classList.add('active');
            
            setTimeout(() => {
                this.diskLight.classList.remove('active');
                this.diskLight.classList.add('active-green');
            }, 500);
        }
    }

    // 读取软盘内容
    readFloppyContent() {
        if (!this.floppyState.diskInserted) {
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

    // 显示软盘内容（带加载动画）
    displayFloppyContent() {
        if (!this.systemStateProvider.isSystemOn() || !this.floppyState.diskInserted) {
            return;
        }
        
        // 开始硬盘读取活动和显示读取提示
        this.triggerDiskReadActivity(true);
    }

    // 启动软盘内容读取提示和加载动画
    startFloppyContentReading() {
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
        if (window.audioManager) {
            window.audioManager.startFloppyReadingSound();
        }
    }

    // 读取完成后显示软盘内容
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
        this.diskLight.classList.remove('active-green', 'disk-flashing', 'active-blue');
        this.diskLight.classList.add('blue-flashing');
        
        if (content) {
            // 启动打字机效果，结束后恢复绿色指示灯
            gameController.view.typeWriterEffect(content, document.getElementById('output'), () => {
                // 关键：将完整的软盘内容添加到历史记录中
                gameController.model.addToHistory(content);
                
                // 打字效果结束后，移除蓝色闪烁，恢复绿色指示灯
                this.diskLight.classList.remove('blue-flashing');
                this.diskLight.classList.add('active-green');
                
                // 显示结束分隔线
                gameController.view.displayOutput(separatorLine);
                
                // 将结束分隔线添加到历史记录
                gameController.model.addToHistory(separatorLine);

                // 打字机效果完成后停止软盘读取循环音效
                if (window.audioManager) {
                    window.audioManager.stopFloppyReadingSound();
                }
                
                // 保存设置
                gameController.saveSettings();
            }, 10); // 打字机效果速度
        } else {
            const errorMessage = "错误: 无法读取软盘内容或内容为空。";
            gameController.view.displayOutput(errorMessage);
            gameController.model.addToHistory(errorMessage);
            
            gameController.view.displayOutput(separatorLine);
            gameController.model.addToHistory(separatorLine);

            // 错误情况下也要停止软盘读取循环音效
            if (window.audioManager) {
                window.audioManager.stopFloppyReadingSound();
            }
            
            // 恢复绿色指示灯
            this.diskLight.classList.remove('blue-flashing');
            this.diskLight.classList.add('active-green');
            
            // 保存设置
            gameController.saveSettings();
        }
    }

    // 启动加载动画
    startLoadingAnimation() {
        if (this.loadingAnimationInterval) {
            clearInterval(this.loadingAnimationInterval);
        }
        
        const loadingChars = ['\\', '|', '/', '-'];
        let i = 0;
        
        // 创建专用于加载的行元素
        const outputElement = document.getElementById('output');
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

    // 停止加载动画
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

    // 询问用户是否读取软盘
    promptForDiskRead() {
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