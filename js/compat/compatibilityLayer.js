// js/compat/compatibilityLayer.js
/**
 * 兼容性适配层
 * 提供旧接口到新接口的适配，以便在重构过程中保持功能完整性
 * 本文件是临时性的，在完成所有组件重构后将被废弃
 */
(function() {
    console.log("加载兼容性适配层...");
    
    // ===== 系统状态提供者兼容适配器 =====
    class SystemStateProviderAdapter {
        constructor(originalProvider) {
            this.originalProvider = originalProvider;
            
            // 检查原始提供者的类型
            if (originalProvider && typeof originalProvider.getSystemState === 'function') {
                // 原始的SystemStateProvider
                this.type = 'original';
            } else if (originalProvider && typeof originalProvider.isOperational === 'function') {
                // 新的SystemService
                this.type = 'service';
            } else {
                // 未知类型，使用游戏控制器作为回退
                this.type = 'fallback';
                console.warn("不兼容的系统状态提供者，使用回退机制");
            }
        }
        
        /**
         * 兼容 isSystemOn 方法
         * @returns {boolean} 系统是否开机
         */
        isSystemOn() {
            try {
                if (this.type === 'original' && this.originalProvider) {
                    // 直接使用原始方法
                    return this.originalProvider.isSystemOn();
                } else if (this.type === 'service' && this.originalProvider) {
                    // 转接到新的SystemService的isPowerOn方法
                    return this.originalProvider.isPowerOn();
                } else {
                    // 回退：使用全局游戏控制器的状态
                    const gameController = window.gameController;
                    return gameController && gameController.model && gameController.model.isOn;
                }
            } catch (error) {
                console.error("兼容层错误 (isSystemOn):", error);
                return false;
            }
        }
        
        /**
         * 检查系统是否可操作
         * @returns {boolean} 系统是否完全开机且可操作
         */
        isSystemOperational() {
            try {
                if (this.type === 'service' && this.originalProvider) {
                    // 使用新的SystemService的isOperational方法
                    return this.originalProvider.isOperational();
                } else {
                    // 回退：检查全局函数
                    if (typeof window.isSystemOperational === 'function') {
                        return window.isSystemOperational();
                    }
                    
                    // 最后回退：检查游戏控制器状态
                    const gameController = window.gameController;
                    if (gameController && gameController.model) {
                        return gameController.model.isOn && 
                               gameController.model.getSystemState() === gameController.model.SystemState.POWERED_ON;
                    }
                    
                    return false;
                }
            } catch (error) {
                console.error("兼容层错误 (isSystemOperational):", error);
                return false;
            }
        }
    }

    // ===== FloppyController 兼容适配器 =====
    // 用于在创建FloppyController实例时自动应用适配
    const originalFloppyController = window.FloppyController;
    if (originalFloppyController) {
        window.FloppyController = function(systemStateProvider) {
            // 应用适配器
            const adaptedProvider = new SystemStateProviderAdapter(systemStateProvider);
            
            // 使用适配后的提供者创建原始控制器
            return new originalFloppyController(adaptedProvider);
        };
        
        // 保留原始构造函数的原型
        window.FloppyController.prototype = originalFloppyController.prototype;
    }

    // ===== 全局函数兼容性 =====
    // 确保 isSystemOperational 全局函数可用
    if (!window.isSystemOperational) {
        window.isSystemOperational = function() {
            // 首先尝试GameCore
            if (window.GameCore) {
                return window.GameCore.isSystemOperational();
            }
            
            // 回退到游戏控制器
            const gameController = window.gameController;
            if (gameController && gameController.model) {
                return gameController.model.isOn && 
                       gameController.model.getSystemState() === gameController.model.SystemState.POWERED_ON;
            }
            
            return false;
        };
    }

    // ===== 服务定位器兼容性 =====
    // 确保所有必需的服务在ServiceLocator中可用
    if (window.ServiceLocator) {
        // 确保 eventBus 服务可用
        if (!window.ServiceLocator.has('eventBus') && window.EventBus) {
            window.ServiceLocator.register('eventBus', window.EventBus);
        }
        
        // 确保 audio 服务可用
        if (!window.ServiceLocator.has('audio') && window.audioManager) {
            window.ServiceLocator.register('audio', window.audioManager);
        }
        
        // 确保 system 服务可用
        if (!window.ServiceLocator.has('system')) {
            // 如果SystemService不可用，创建一个基于GameController的适配器
            const systemAdapter = new SystemStateProviderAdapter(window.gameController && window.gameController.model);
            window.ServiceLocator.register('system', systemAdapter);
        }
    }

    // ===== 事件总线兼容扩展 =====
    // 确保EventBus包含新的方法，即使使用原始实现
    if (window.EventBus) {
        // 添加 once 方法，如果不存在
        if (!window.EventBus.once) {
            window.EventBus.once = function(eventName, fn) {
                const self = this;
                const onceWrapper = function() {
                    self.off(eventName, onceWrapper);
                    fn.apply(self, arguments);
                };
                this.on(eventName, onceWrapper);
            };
        }
        
        // 添加链式调用支持
        ['on', 'off', 'emit'].forEach(method => {
            const original = window.EventBus[method];
            if (original && typeof original === 'function') {
                window.EventBus[method] = function() {
                    original.apply(this, arguments);
                    return this; // 支持链式调用
                };
            }
        });
    }

    console.log("兼容性适配层已加载");
})();