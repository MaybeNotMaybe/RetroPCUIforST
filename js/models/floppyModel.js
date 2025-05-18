// js/models/floppyModel.js - 重构版本
class FloppyModel {
    constructor() {
        // 使用服务定位器获取事件总线
        this.eventBus = window.ServiceLocator && window.ServiceLocator.get('eventBus') || EventBus;
        
        // 软盘驱动器状态
        this.drives = {
            A: {
                diskInserted: true,  // A驱动器始终插入软盘
                isProcessing: false,
                isReading: false,
                readonly: true
            },
            B: {
                diskInserted: false,
                isProcessing: false,
                isReading: false,
                readonly: false
            }
        };
    }
    
    /**
     * 获取驱动器状态
     * @param {string} drive - 驱动器标识 ('A' 或 'B')
     * @returns {Object} 驱动器状态的副本
     */
    getDriveState(drive) {
        if (!this.drives[drive]) {
            console.error(`获取未知驱动器状态: ${drive}`);
            return null;
        }
        return { ...this.drives[drive] };
    }
    
    /**
     * 获取所有驱动器状态
     * @returns {Object} 所有驱动器状态的副本
     */
    getAllDriveStates() {
        return {
            A: { ...this.drives.A },
            B: { ...this.drives.B }
        };
    }
    
    /**
     * 验证驱动器操作是否可行
     * @param {string} drive - 驱动器标识
     * @param {string} operation - 操作类型 ('insert', 'eject', 'read')
     * @returns {boolean} 操作是否可行
     */
    validateOperation(drive, operation) {
        const driveState = this.drives[drive];
        if (!driveState) return false;
        
        // 验证操作可行性
        switch (operation) {
            case 'insert':
                return !driveState.readonly && !driveState.diskInserted && !driveState.isProcessing;
                
            case 'eject':
                return !driveState.readonly && driveState.diskInserted && !driveState.isProcessing && !driveState.isReading;
                
            case 'read':
                return driveState.diskInserted && !driveState.isProcessing;
                
            default:
                console.error(`未知的驱动器操作: ${operation}`);
                return false;
        }
    }
    
    /**
     * 开始插入软盘
     * @param {string} drive - 驱动器标识
     * @returns {boolean} 操作是否成功
     */
    insertDisk(drive) {
        if (!this.validateOperation(drive, 'insert')) {
            return false;
        }
        
        this.drives[drive].isProcessing = true;
        
        // 触发软盘操作事件
        this.eventBus.emit('floppyOperation', { 
            drive, 
            operation: 'insert', 
            stage: 'start' 
        });
        
        return true;
    }
    
    /**
     * 完成软盘插入
     * @param {string} drive - 驱动器标识
     * @param {boolean} systemOn - 系统是否开机
     * @returns {boolean} 操作是否成功
     */
    completeInsertion(drive, systemOn) {
        if (!this.drives[drive] || !this.drives[drive].isProcessing) {
            return false;
        }
        
        this.drives[drive].isProcessing = false;
        this.drives[drive].diskInserted = true;
        
        // 触发软盘操作事件
        this.eventBus.emit('floppyOperation', { 
            drive, 
            operation: 'insert', 
            stage: 'complete',
            systemOn
        });
        
        // 系统开机时触发磁盘活动事件
        if (systemOn) {
            this.eventBus.emit('diskActivity', { drive });
        }
        
        return true;
    }
    
    /**
     * 开始弹出软盘
     * @param {string} drive - 驱动器标识
     * @returns {boolean} 操作是否成功
     */
    ejectDisk(drive) {
        if (!this.validateOperation(drive, 'eject')) {
            return false;
        }
        
        this.drives[drive].isProcessing = true;
        
        // 触发软盘操作事件
        this.eventBus.emit('floppyOperation', { 
            drive, 
            operation: 'eject', 
            stage: 'start' 
        });
        
        return true;
    }
    
    /**
     * 完成软盘弹出
     * @param {string} drive - 驱动器标识
     * @param {boolean} systemOn - 系统是否开机
     * @returns {boolean} 操作是否成功
     */
    completeEjection(drive, systemOn) {
        if (!this.drives[drive] || !this.drives[drive].isProcessing) {
            return false;
        }
        
        this.drives[drive].isProcessing = false;
        this.drives[drive].diskInserted = false;
        this.drives[drive].isReading = false;
        
        // 触发软盘操作事件
        this.eventBus.emit('floppyOperation', { 
            drive, 
            operation: 'eject', 
            stage: 'complete',
            systemOn
        });
        
        // 系统开机时触发磁盘活动事件
        if (systemOn) {
            this.eventBus.emit('diskActivity', { drive });
        }
        
        return true;
    }
    
    /**
     * 开始读取软盘
     * @param {string} drive - 驱动器标识
     * @returns {boolean} 操作是否成功
     */
    startReading(drive) {
        if (!this.validateOperation(drive, 'read')) {
            return false;
        }
        
        this.drives[drive].isReading = true;
        
        // 触发软盘操作事件
        this.eventBus.emit('floppyOperation', { 
            drive, 
            operation: 'read', 
            stage: 'start' 
        });
        
        return true;
    }
    
    /**
     * 完成软盘读取
     * @param {string} drive - 驱动器标识
     * @returns {boolean} 操作是否成功
     */
    completeReading(drive) {
        if (!this.drives[drive] || !this.drives[drive].isReading) {
            return false;
        }
        
        this.drives[drive].isReading = false;
        
        // 触发软盘操作事件
        this.eventBus.emit('floppyOperation', { 
            drive, 
            operation: 'read', 
            stage: 'complete' 
        });
        
        return true;
    }
    
    /**
     * 重置所有驱动器状态
     */
    resetAll() {
        // 重置B驱动器（A驱动器保持原状）
        this.drives.B.isProcessing = false;
        this.drives.B.isReading = false;
        
        // 触发事件
        this.eventBus.emit('floppyOperation', { 
            drive: 'all', 
            operation: 'reset' 
        });
    }
}