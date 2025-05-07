// js/models/floppyModel.js
class FloppyModel {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.drives = {
            A: {
                diskInserted: true,  // A驱动器始终插入软盘
                isProcessing: false,
                readonly: true
            },
            B: {
                diskInserted: false,
                isProcessing: false,
                readonly: false
            }
        };
    }
    
    getDriveState(drive) {
        return { ...this.drives[drive] };
    }
    
    insertDisk(drive) {
        if (this.drives[drive].readonly || 
            this.drives[drive].diskInserted || 
            this.drives[drive].isProcessing) {
            return false;
        }
        
        this.drives[drive].isProcessing = true;
        return true;
    }
    
    completeInsertion(drive, systemOn) {
        this.drives[drive].isProcessing = false;
        this.drives[drive].diskInserted = true;
        
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
        this.drives[drive].isProcessing = false;
        this.drives[drive].diskInserted = false;
        
        if (systemOn) {
            this.eventBus.emit('diskActivity', { drive });
        }
        
        return true;
    }
}