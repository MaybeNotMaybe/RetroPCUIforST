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
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 初始状态
        this.initializeFloppyState();
        
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
                
                // 如果系统开机，A驱动器灯常亮
                if (isSystemOn) {
                    this.driveLightA.classList.add('active');
                }
                
                // 处理B驱动器状态
                if (settings.floppyDriveState && settings.floppyDriveState.diskInserted) {
                    // 保存状态
                    this.floppyState.diskInserted = true;
                    
                    // 立即设置UI状态
                    this.floppyDiskB.style.display = 'block';
                    this.floppyDiskB.classList.remove('inserting', 'ejecting');
                    // 关键：添加完全插入类
                    this.floppyDiskB.classList.add('fully-inserted');
                    this.floppySlotB.classList.add('disk-inserted');
                    this.ejectButtonB.classList.remove('disabled');
                    this.fullFloppyB.classList.add('hide-full-floppy');
                    this.fullFloppyB.classList.remove('floppy-hoverable');
                    
                    // 如果系统开机则点亮指示灯
                    if (isSystemOn) {
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
    
    // 系统电源状态变化处理
    handleSystemPowerChange(isOn) {
        // A驱动器始终有软盘
        if (isOn) {
            this.driveLightA.classList.add('active');
        } else {
            this.driveLightA.classList.remove('active', 'blinking');
        }
        
        // B驱动器根据是否有软盘决定
        if (isOn && this.floppyState.diskInserted) {
            this.driveLightB.classList.add('active');
            this.driveLightB.classList.remove('blinking');
        } else {
            this.driveLightB.classList.remove('active', 'blinking');
        }
    }
    
    startFloppyInsertAnimation(isSystemOn) {
        // 移除悬停类
        this.fullFloppyB.classList.remove('floppy-hoverable');
        
        // 首先执行完整软盘的插入动画
        this.fullFloppyB.classList.add('inserting-full');
        
        // 只有在系统开机时才闪烁指示灯
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
            // 只有在系统开机时才处理灯光
            if (isSystemOn) {
                this.driveLightB.classList.remove('blinking');
                this.driveLightB.classList.add('active');
            } else {
                this.driveLightB.classList.remove('blinking');
                this.driveLightB.classList.remove('active');
            }
            
            // 重要：移除插入动画类，添加完全插入类
            this.floppyDiskB.classList.remove('inserting');
            this.floppyDiskB.classList.add('fully-inserted');
            
            // 启用弹出按钮
            this.ejectButtonB.classList.remove('disabled');
            
            // 隐藏完整软盘
            this.fullFloppyB.classList.add('hide-full-floppy');
            this.fullFloppyB.classList.remove('inserting-full');
            
            // 完成插入
            this.completeFloppyInsertion();
        }, 1500);
    }
    
    startFloppyEjectAnimation(isSystemOn) {
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
            this.driveLightB.classList.remove('active');
            this.driveLightB.classList.add('blinking');
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
            
            // 移除弹出动画类，但保持软盘可见
            this.fullFloppyB.classList.remove('ejecting-full');
            // 添加悬停类
            this.fullFloppyB.classList.add('floppy-hoverable');
            
            // 完成弹出
            this.completeFloppyEjection();
        }, 1500);
    }
}