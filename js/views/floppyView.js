// js/views/floppyView.js
class FloppyView {
    constructor() {
        // 获取DOM元素
        this.drivesContainer = document.querySelector('.floppy-drives-container');
        
        // A驱动器元素
        this.driveA = {
            slot: document.querySelector('.drive-a .floppy-slot'),
            disk: document.querySelector('.drive-a .floppy-disk'),
            ejectButton: document.querySelector('.drive-a .eject-button'),
            light: document.querySelector('.drive-a .drive-light')
        };
        
        // B驱动器元素
        this.driveB = {
            slot: document.getElementById('floppySlotB'),
            disk: document.getElementById('floppyDiskB'),
            ejectButton: document.getElementById('ejectButtonB'),
            light: document.getElementById('driveLightB'),
            fullFloppy: document.getElementById('fullFloppyB')
        };

        // 确保所有驱动器灯初始为关闭状态
        this.driveA.light.classList.remove('active', 'blinking');
        this.driveB.light.classList.remove('active', 'blinking');
    }
    
    // 初始化软盘驱动器UI
    initializeUI() {
        setTimeout(() => {
            this.drivesContainer.classList.add('floppy-initialized');
        }, 100);
    }
    
    // 更新驱动器状态显示
    updateDriveState(drive, state, systemOn) {
        const driveUI = drive === 'A' ? this.driveA : this.driveB;
        
        // 更新灯光状态 - 先移除所有可能的状态类
        driveUI.light.classList.remove('active', 'blinking');
        
        // 只有系统开机且软盘已插入时才点亮指示灯
        if (systemOn && state.diskInserted) {
            driveUI.light.classList.add('active');
        }
        
        // 更新B驱动器的软盘显示状态
        if (drive === 'B') {
            if (state.diskInserted) {
                driveUI.slot.classList.add('disk-inserted');
                driveUI.disk.style.display = 'block';
                driveUI.disk.style.bottom = '2.5px';
                driveUI.ejectButton.classList.remove('disabled');
                driveUI.fullFloppy.classList.add('hide-full-floppy');
            } else {
                driveUI.slot.classList.remove('disk-inserted');
                driveUI.disk.style.display = 'none';
                driveUI.ejectButton.classList.add('disabled');
                driveUI.fullFloppy.classList.remove('hide-full-floppy');
            }
        }
    }
    
    // 闪烁驱动器指示灯
    flashDriveLight(drive) {
        const light = drive === 'A' ? this.driveA.light : this.driveB.light;
        light.classList.add('blinking');
        setTimeout(() => {
            light.classList.remove('blinking');
        }, 1000);
    }
    
    // 软盘插入动画
    startDiskInsertAnimation(drive, systemOn, callback) {
        if (drive === 'B') {
            // 完整软盘插入动画
            this.driveB.fullFloppy.classList.add('inserting-full');
            
            // 系统开机时才闪烁指示灯
            if (systemOn) {
                this.driveB.light.classList.add('blinking');
            }
            
            // 显示边缘软盘
            setTimeout(() => {
                this.driveB.disk.style.display = 'block';
                this.driveB.disk.classList.add('inserting');
                this.driveB.slot.classList.add('disk-inserted');
            }, 1000);
            
            // 插入完成
            setTimeout(() => {
                if (systemOn) {
                    this.driveB.light.classList.remove('blinking');
                    this.driveB.light.classList.add('active');
                }
                
                this.driveB.ejectButton.classList.remove('disabled');
                this.driveB.fullFloppy.classList.add('hide-full-floppy');
                this.driveB.fullFloppy.classList.remove('inserting-full');
                
                if (callback) callback();
            }, 1500);
        }
    }
    
    // 软盘弹出动画
    startDiskEjectAnimation(drive, systemOn, callback) {
        if (drive === 'B') {
            this.driveB.disk.classList.remove('inserting');
            this.driveB.disk.classList.add('ejecting');
            this.driveB.slot.classList.remove('disk-inserted');
            
            this.driveB.fullFloppy.classList.remove('hide-full-floppy');
            this.driveB.fullFloppy.classList.add('ejecting-full');
            
            if (systemOn) {
                this.driveB.light.classList.remove('active');
                this.driveB.light.classList.add('blinking');
            }
            
            setTimeout(() => {
                this.driveB.light.classList.remove('blinking');
                this.driveB.light.classList.remove('active');
                
                this.driveB.disk.style.display = 'none';
                this.driveB.disk.classList.remove('ejecting');
                this.driveB.ejectButton.classList.add('disabled');
                
                setTimeout(() => {
                    this.driveB.fullFloppy.classList.remove('ejecting-full');
                }, 100);
                
                if (callback) callback();
            }, 1500);
        }
    }
    
    // 关闭所有驱动器灯
    turnOffAllDriveLights() {
        this.driveA.light.classList.remove('active', 'blinking');
        this.driveB.light.classList.remove('active', 'blinking');
    }
}