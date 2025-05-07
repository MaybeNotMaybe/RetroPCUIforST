// js/models/floppyModel.js
class FloppyModel {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.drives = {
            A: {
                diskInserted: true,  // A驱动器始终插入软盘
                isProcessing: false,
                readonly: true       // A驱动器不可弹出
            },
            B: {
                diskInserted: false,
                isProcessing: false,
                readonly: false
            }
        };
        this.floppyData = {
            // 存储软盘内容数据
            diskA: { files: [], label: '系统盘' },
            diskB: { files: [], label: '新消息' }
        };
    }
    
    getDriveState(drive) {
        return { ...this.drives[drive] };
    }
    
    insertDisk(drive, diskData = null) {
        if (this.drives[drive].readonly || 
            this.drives[drive].diskInserted || 
            this.drives[drive].isProcessing) {
            return false;
        }
        
        this.drives[drive].isProcessing = true;
        
        // 如果提供了磁盘数据，保存它
        if (diskData) {
            this.floppyData[`disk${drive}`] = diskData;
        }
        
        return true;
    }
    
    completeInsertion(drive, systemOn) {
        if (!this.drives[drive].isProcessing) return false;
        
        this.drives[drive].isProcessing = false;
        this.drives[drive].diskInserted = true;
        
        // 触发磁盘活动事件
        if (systemOn) {
            this.eventBus.emit('diskActivity', { drive });
        }
        
        return true;
    }
    
    ejectDisk(drive) {
        if (this.drives[drive].readonly || 
            !this.drives[drive].diskInserted || 
            this.drives[drive].isProcessing) {
            return false;
        }
        
        this.drives[drive].isProcessing = true;
        return true;
    }
    
    completeEjection(drive, systemOn) {
        if (!this.drives[drive].isProcessing) return false;
        
        this.drives[drive].isProcessing = false;
        this.drives[drive].diskInserted = false;
        
        // 触发磁盘活动事件
        if (systemOn) {
            this.eventBus.emit('diskActivity', { drive });
        }
        
        return true;
    }
    
    // 读取软盘数据
    readDiskData(drive) {
        if (!this.drives[drive].diskInserted) {
            return { success: false, error: "无磁盘" };
        }
        
        return { 
            success: true, 
            data: this.floppyData[`disk${drive}`] || { files: [], label: '未命名' } 
        };
    }
    
    // 保存/恢复状态
    saveState() {
        return {
            drives: this.drives,
            floppyData: this.floppyData
        };
    }
    
    loadState(state) {
        if (state && state.drives) {
            this.drives = state.drives;
        }
        
        if (state && state.floppyData) {
            this.floppyData = state.floppyData;
        }
    }
}