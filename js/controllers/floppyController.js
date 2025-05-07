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
        if (this.floppyState.diskInserted || this.floppyState.isProcessing) {
            return false;
        }
        
        this.floppyState.isProcessing = true;
        
        // 开始插入动画
        const isSystemOn = this.systemStateProvider.isSystemOn();
        this.startFloppyInsertAnimation(isSystemOn);
        
        return true;
    }
    
    completeFloppyInsertion() {
        this.floppyState.isProcessing = false;
        this.floppyState.diskInserted = true;
        
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
    
    ejectFloppyDisk() {
        if (!this.floppyState.diskInserted || this.floppyState.isProcessing) {
            return false;
        }
        
        this.floppyState.isProcessing = true;
        
        // 开始弹出动画
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
            // 系统启动完成后，A驱动器灯亮起
            this.driveLightA.classList.add('active');
            
            // 如果B驱动器已插入软盘，B驱动器灯也亮起
            if (this.floppyState.diskInserted) {
                this.driveLightB.classList.add('active');
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
            
            // 关键：如果系统已开机，触发一次硬盘读取活动
            if (isSystemOn) {
                // 先让系统硬盘指示灯闪烁，表示读取软盘数据
                this.triggerDiskReadActivity();
            }
            
            // 完成插入
            this.completeFloppyInsertion();
        }, 1500);
    }

    // 触发硬盘读取活动
    triggerDiskReadActivity() {
        // 保存当前系统硬盘灯状态
        const wasActiveGreen = this.diskLight.classList.contains('active-green');
        
        // 先移除常亮状态
        this.diskLight.classList.remove('active-green');
        
        // 添加闪烁状态
        this.diskLight.classList.add('disk-flashing');
        
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
}