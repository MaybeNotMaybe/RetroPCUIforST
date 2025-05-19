// js/views/floppyView.js - 重构版本
class FloppyView {
    constructor() {
        // 使用DOM工具类
        this.domUtils = window.DOMUtils || {
            get: id => document.querySelector(id),
            addClass: (el, cls) => el && el.classList.add(cls),
            removeClass: (el, cls) => el && el.classList.remove(cls)
        };
        
        // 获取DOM元素
        this.drivesContainer = this.domUtils.get('.floppy-drives-container');
        
        // A驱动器元素
        this.driveA = {
            slot: this.domUtils.get('.drive-a .floppy-slot'),
            disk: this.domUtils.get('.drive-a .floppy-disk'),
            ejectButton: this.domUtils.get('.drive-a .eject-button'),
            light: this.domUtils.get('.drive-a .drive-light')
        };
        
        // B驱动器元素
        this.driveB = {
            slot: this.domUtils.get('#floppySlotB'),
            disk: this.domUtils.get('#floppyDiskB'),
            ejectButton: this.domUtils.get('#ejectButtonB'),
            light: this.domUtils.get('#driveLightB'),
            fullFloppy: this.domUtils.get('#fullFloppyB')
        };
        
        // 系统硬盘指示灯
        this.diskLight = this.domUtils.get('#diskLight');

        // 确保所有驱动器灯初始为关闭状态
        this.domUtils.removeClass(this.driveA.light, ['active', 'blinking']);
        this.domUtils.removeClass(this.driveB.light, ['active', 'blinking']);
        
        // 音频服务
        this.audio = window.ServiceLocator && window.ServiceLocator.get('audio');
    }
    
    /**
     * 初始化软盘驱动器UI
     */
    initializeUI() {
        setTimeout(() => {
            this.domUtils.addClass(this.drivesContainer, 'floppy-initialized');
        }, 100);
    }
    
    /**
     * 更新驱动器状态显示
     * @param {string} drive - 驱动器标识 ('A' 或 'B')
     * @param {Object} state - 驱动器状态
     * @param {boolean} systemOn - 系统是否开机
     */
    updateDriveState(drive, state, systemOn) {
        const driveUI = drive === 'A' ? this.driveA : this.driveB;
        
        // 更新灯光状态 - 先移除所有可能的状态类
        this.domUtils.removeClass(driveUI.light, ['active', 'blinking']);
        
        // 只有系统开机且软盘已插入时才点亮指示灯
        if (systemOn && state.diskInserted) {
            this.domUtils.addClass(driveUI.light, 'active');
        }
        
        // 更新B驱动器的软盘显示状态
        if (drive === 'B') {
            if (state.diskInserted) {
                this.domUtils.addClass(driveUI.slot, 'disk-inserted');
                driveUI.disk.style.display = 'block';
                driveUI.disk.style.bottom = '2.5px';
                this.domUtils.removeClass(driveUI.ejectButton, 'disabled');
                this.domUtils.addClass(driveUI.fullFloppy, 'hide-full-floppy');
            } else {
                this.domUtils.removeClass(driveUI.slot, 'disk-inserted');
                driveUI.disk.style.display = 'none';
                this.domUtils.addClass(driveUI.ejectButton, 'disabled');
                this.domUtils.removeClass(driveUI.fullFloppy, 'hide-full-floppy');
            }
        }
    }
    
    /**
     * 闪烁驱动器指示灯
     * @param {string} drive - 驱动器标识 ('A' 或 'B')
     * @param {number} duration - 闪烁持续时间（毫秒）
     */
    flashDriveLight(drive, duration = 1000) {
        const light = drive === 'A' ? this.driveA.light : this.driveB.light;
        this.domUtils.addClass(light, 'blinking');
        
        setTimeout(() => {
            this.domUtils.removeClass(light, 'blinking');
        }, duration);
    }
    
    /**
     * 开始软盘插入动画
     * @param {string} drive - 驱动器标识 ('A' 或 'B')
     * @param {boolean} systemOn - 系统是否开机
     * @param {Function} callback - 动画完成后的回调函数
     */
    startDiskInsertAnimation(drive, systemOn, callback) {
        if (drive === 'B') {
            // 播放软盘插入声音
            if (this.audio) {
                this.audio.play('floppyInsert');
            }
            
            // 移除悬停类
            this.domUtils.removeClass(this.driveB.fullFloppy, 'floppy-hoverable');
            
            // 完整软盘插入动画
            this.domUtils.addClass(this.driveB.fullFloppy, 'inserting-full');
            
            // 系统开机时才闪烁指示灯
            if (systemOn) {
                this.domUtils.addClass(this.driveB.light, 'blinking');
            }
            
            // 显示边缘软盘
            setTimeout(() => {
                this.driveB.disk.style.display = 'block';
                this.domUtils.addClass(this.driveB.disk, 'inserting');
                this.domUtils.addClass(this.driveB.slot, 'disk-inserted');
            }, 1000);
            
            // 插入完成
            setTimeout(() => {
                // 从软盘驱动器上移除闪烁效果
                this.domUtils.removeClass(this.driveB.light, 'blinking');
                
                // 重要：移除插入动画类，添加完全插入类
                this.domUtils.removeClass(this.driveB.disk, 'inserting');
                this.domUtils.addClass(this.driveB.disk, 'fully-inserted');
                
                // 启用弹出按钮
                this.domUtils.removeClass(this.driveB.ejectButton, 'disabled');
                
                // 隐藏完整软盘
                this.domUtils.addClass(this.driveB.fullFloppy, 'hide-full-floppy');
                this.domUtils.removeClass(this.driveB.fullFloppy, 'inserting-full');
                
                if (systemOn) {
                    this.domUtils.addClass(this.driveB.light, 'active');
                }
                
                if (callback) callback();
            }, 1500);
        }
    }
    
    /**
     * 开始软盘弹出动画
     * @param {string} drive - 驱动器标识 ('A' 或 'B')
     * @param {boolean} systemOn - 系统是否开机
     * @param {Function} callback - 动画完成后的回调函数
     */
    startDiskEjectAnimation(drive, systemOn, callback) {
        if (drive === 'B') {
            // 播放软盘弹出声音
            if (this.audio) {
                this.audio.play('floppyEject');
            }
            
            // 立即关闭B驱动器灯
            this.domUtils.removeClass(this.driveB.light, 'active');
            
            this.domUtils.removeClass(this.driveB.disk, ['inserting', 'fully-inserted']);
            this.domUtils.addClass(this.driveB.disk, 'ejecting');
            this.domUtils.removeClass(this.driveB.slot, 'disk-inserted');
            
            // 显示完整软盘并开始弹出动画
            this.domUtils.removeClass(this.driveB.fullFloppy, 'hide-full-floppy');
            this.domUtils.addClass(this.driveB.fullFloppy, 'ejecting-full');
            
            // 只有在系统开机时才闪烁指示灯
            if (systemOn) {
                this.domUtils.addClass(this.driveB.light, 'blinking');
                
                // 让系统硬盘指示灯也闪烁一下
                this.triggerDiskEjectActivity();
            }
            
            setTimeout(() => {
                // 关闭指示灯
                this.domUtils.removeClass(this.driveB.light, ['blinking', 'active']);
                
                // 重置软盘边缘
                this.driveB.disk.style.display = 'none';
                this.domUtils.removeClass(this.driveB.disk, 'ejecting');
                
                // 禁用弹出按钮
                this.domUtils.addClass(this.driveB.ejectButton, 'disabled');
                
                // 重置完整软盘状态
                setTimeout(() => {
                    this.domUtils.removeClass(this.driveB.fullFloppy, 'ejecting-full');
                    this.domUtils.addClass(this.driveB.fullFloppy, 'floppy-hoverable');
                }, 100);
                
                if (callback) callback();
            }, 1500);
        }
    }
    
    /**
     * 触发弹出时的硬盘活动视觉效果
     */
    triggerDiskEjectActivity() {
        // 保存当前系统硬盘灯状态
        const wasActiveGreen = this.diskLight.classList.contains('active-green');
        
        // 让系统指示灯短暂闪烁
        if (wasActiveGreen) {
            this.domUtils.removeClass(this.diskLight, 'active-green');
            this.domUtils.addClass(this.diskLight, 'active');
            
            setTimeout(() => {
                this.domUtils.removeClass(this.diskLight, 'active');
                this.domUtils.addClass(this.diskLight, 'active-green');
            }, 500);
        }
    }
    
    /**
     * 触发硬盘读取活动视觉效果
     * @param {boolean} wasActiveGreen - 之前是否为绿色常亮
     * @returns {boolean} 之前是否为绿色常亮
     */
    triggerDiskReadActivity() {
        // 保存当前系统硬盘灯状态
        const wasActiveGreen = this.diskLight.classList.contains('active-green');

        // 播放硬盘活动声音
        if (this.audio) {
            this.audio.play('diskActivity');
        }
        
        // 先移除常亮状态
        this.domUtils.removeClass(this.diskLight, ['active-green', 'active-blue']);
        
        // 添加闪烁状态
        this.domUtils.addClass(this.diskLight, 'disk-flashing');
        
        return wasActiveGreen;
    }
    
    /**
     * 恢复硬盘状态
     * @param {boolean} wasActiveGreen - 是否恢复为绿色常亮
     */
    restoreDiskLight(wasActiveGreen) {
        // 移除闪烁
        this.domUtils.removeClass(this.diskLight, ['disk-flashing', 'blue-flashing']);
        
        // 恢复常亮状态
        if (wasActiveGreen) {
            this.domUtils.addClass(this.diskLight, 'active-green');
        }
    }
    
    /**
     * 设置读取状态的视觉效果
     * @param {boolean} isReading - 是否正在读取
     */
    setReadingVisualState(isReading) {
        if (isReading) {
            // 切换到蓝色闪烁
            this.domUtils.removeClass(this.diskLight, ['active-green', 'disk-flashing', 'active-blue']);
            this.domUtils.addClass(this.diskLight, 'blue-flashing');
        } else {
            // 恢复绿色常亮
            this.domUtils.removeClass(this.diskLight, ['blue-flashing', 'disk-flashing']);
            this.domUtils.addClass(this.diskLight, 'active-green');
        }
    }
    
    /**
     * 关闭所有驱动器灯
     */
    turnOffAllDriveLights() {
        this.domUtils.removeClass(this.driveA.light, ['active', 'blinking']);
        this.domUtils.removeClass(this.driveB.light, ['active', 'blinking']);
    }
    
    /**
     * 开启驱动器灯
     * @param {string} drive - 驱动器标识 ('A' 或 'B')
     */
    turnOnDriveLight(drive) {
        const light = drive === 'A' ? this.driveA.light : this.driveB.light;
        this.domUtils.removeClass(light, 'blinking');
        this.domUtils.addClass(light, 'active');
    }
}