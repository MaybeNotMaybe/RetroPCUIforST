// js/services/systemService.js
/**
 * 系统服务
 * 提供系统状态管理和系统级操作
 */
class SystemService {
    constructor() {
        // 系统状态枚举
        this.SystemState = {
            POWERED_OFF: 'POWERED_OFF',
            POWERING_ON: 'POWERING_ON',
            POWERED_ON: 'POWERED_ON',
            POWERING_OFF: 'POWERING_OFF'
        };
        
        // 当前系统状态
        this.currentState = this.SystemState.POWERED_OFF;
        
        // 系统电源状态
        this.isPowered = false;
        
        // 测试模式标志
        this.isTestMode = false;
        
        // 订阅相关事件
        this.subscribeToEvents();
    }
    
    /**
     * 订阅系统相关事件
     */
    subscribeToEvents() {
        const eventBus = window.ServiceLocator.get('eventBus');
        if (!eventBus) return;
        
        // 监听系统状态变化
        eventBus.on('systemStateChange', (data) => {
            this.currentState = data.state;
            this.isPowered = data.isOn;
        });
        
        // 监听测试模式变化
        eventBus.on('testModeChanged', (isTestMode) => {
            this.isTestMode = isTestMode;
        });
    }
    
    /**
     * 获取当前系统状态
     * @returns {string} 当前系统状态
     */
    getSystemState() {
        return this.currentState;
    }
    
    /**
     * 检查系统是否已开机
     * @returns {boolean} 系统是否已开机
     */
    isPowerOn() {
        return this.isPowered;
    }
    
    /**
     * 检查系统是否处于测试模式
     * @returns {boolean} 是否处于测试模式
     */
    isInTestMode() {
        return this.isTestMode;
    }
    
    /**
     * 检查系统是否可操作（完全开机状态）
     * @returns {boolean} 系统是否可操作
     */
    isOperational() {
        return this.isPowered && this.currentState === this.SystemState.POWERED_ON;
    }
    
    /**
     * 设置测试模式
     * @param {boolean} enabled - 是否启用测试模式
     */
    setTestMode(enabled) {
        if (this.isTestMode !== enabled) {
            this.isTestMode = enabled;
            
            // 发布测试模式变化事件
            const eventBus = window.ServiceLocator.get('eventBus');
            if (eventBus) {
                eventBus.emit('testModeChanged', enabled);
            }
        }
    }
}