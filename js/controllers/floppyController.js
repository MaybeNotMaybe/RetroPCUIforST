// js/controllers/floppyController.js
class FloppyController {
    constructor(model, view, systemStateProvider) {
        this.model = model;
        this.view = view;
        this.systemStateProvider = systemStateProvider; // 提供系统电源状态
        
        // 初始化视图
        this.view.initializeUI();
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 初始化状态
        this.loadState();
    }
    
    // 设置事件监听
    setupEventListeners() {
        // B驱动器插槽点击
        this.view.driveB.slot.addEventListener('click', () => {
            const state = this.model.getDriveState('B');
            if (!state.diskInserted && !state.isProcessing) {
                this.insertDisk('B');
            }
        });
        
        // 完整软盘点击
        this.view.driveB.fullFloppy.addEventListener('click', () => {
            const state = this.model.getDriveState('B');
            if (!state.diskInserted && !state.isProcessing) {
                this.insertDisk('B');
            }
        });
        
        // 弹出按钮点击
        this.view.driveB.ejectButton.addEventListener('click', () => {
            const state = this.model.getDriveState('B');
            if (state.diskInserted && !state.isProcessing && 
                !this.view.driveB.ejectButton.classList.contains('disabled')) {
                this.ejectDisk('B');
            }
        });
    }
    
    // 插入软盘
    insertDisk(drive, diskData = null) {
        const isSystemOn = this.systemStateProvider.isSystemOn();
        
        if (this.model.insertDisk(drive, diskData)) {
            this.view.startDiskInsertAnimation(drive, isSystemOn, () => {
                this.model.completeInsertion(drive, isSystemOn);
                this.saveState();
            });
        }
    }
    
    // 弹出软盘
    ejectDisk(drive) {
        const isSystemOn = this.systemStateProvider.isSystemOn();
        
        if (this.model.ejectDisk(drive)) {
            this.view.startDiskEjectAnimation(drive, isSystemOn, () => {
                this.model.completeEjection(drive, isSystemOn);
                this.saveState();
            });
        }
    }
    
    // 系统电源状态变化处理
    handleSystemPowerChange(isOn) {
        // 更新A驱动器UI
        this.view.updateDriveState('A', this.model.getDriveState('A'), isOn);
        
        // 更新B驱动器UI
        this.view.updateDriveState('B', this.model.getDriveState('B'), isOn);
    }
    
    // 保存状态到localStorage
    saveState() {
        const state = this.model.saveState();
        try {
            let savedSettings = JSON.parse(localStorage.getItem('terminalSettings') || '{}');
            savedSettings.floppyDriveState = state;
            localStorage.setItem('terminalSettings', JSON.stringify(savedSettings));
        } catch (error) {
            console.error('保存软盘状态失败', error);
        }
    }
    
    // 从localStorage加载状态
    loadState() {
        try {
            const savedSettings = JSON.parse(localStorage.getItem('terminalSettings') || '{}');
            if (savedSettings.floppyDriveState) {
                this.model.loadState(savedSettings.floppyDriveState);
                
                // 更新UI以匹配加载的状态
                const isSystemOn = this.systemStateProvider.isSystemOn();
                this.view.updateDriveState('A', this.model.getDriveState('A'), isSystemOn);
                this.view.updateDriveState('B', this.model.getDriveState('B'), isSystemOn);
            }
        } catch (error) {
            console.error('加载软盘状态失败', error);
        }
    }
}