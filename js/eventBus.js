// js/eventBus.js

const EventBus = {
    events: {},
    debugMode: false,
    
    /**
     * 启用或禁用调试模式
     * @param {boolean} [enabled=true] - 是否启用调试模式
     */
    enableDebug: function(enabled = true) {
        this.debugMode = enabled;
    },
    
    /**
     * 订阅事件
     * @param {string} eventName - 事件名，可包含命名空间(如 'click.button')
     * @param {Function} fn - 事件处理函数
     * @param {Object} [context=null] - 函数执行上下文
     */
    on: function(eventName, fn, context = null) {
        // 解析事件名和命名空间
        const parts = eventName.split('.');
        const event = parts[0];
        const namespace = parts.length > 1 ? parts[1] : null;
        
        // 初始化事件数组
        this.events[event] = this.events[event] || [];
        
        // 添加处理器
        this.events[event].push({
            fn: fn,
            context: context,
            namespace: namespace
        });
        
        // 调试日志
        if (this.debugMode) {
            console.log(`[EventBus] 订阅事件: ${eventName}`);
        }
        
        return this; // 支持链式调用
    },
    
    /**
     * 取消订阅事件
     * @param {string} eventName - 事件名，可包含命名空间(如 'click.button')
     * @param {Function} [fn] - 可选，特定的事件处理函数
     */
    off: function(eventName, fn) {
        // 解析事件名和命名空间
        const parts = eventName.split('.');
        const event = parts[0];
        const namespace = parts.length > 1 ? parts[1] : null;
        
        // 检查事件是否存在
        if (!this.events[event]) return this;
        
        // 根据不同情况过滤处理器
        if (namespace && fn) {
            // 移除特定命名空间和函数的处理器
            this.events[event] = this.events[event].filter(handler => 
                !(handler.namespace === namespace && handler.fn === fn));
        } else if (namespace) {
            // 移除特定命名空间的所有处理器
            this.events[event] = this.events[event].filter(handler => 
                handler.namespace !== namespace);
        } else if (fn) {
            // 移除特定函数的所有处理器
            this.events[event] = this.events[event].filter(handler => 
                handler.fn !== fn);
        } else {
            // 移除该事件的所有处理器
            delete this.events[event];
        }
        
        // 调试日志
        if (this.debugMode) {
            console.log(`[EventBus] 取消订阅事件: ${eventName}`);
        }
        
        return this; // 支持链式调用
    },
    
    /**
     * 触发事件
     * @param {string} eventName - 事件名
     * @param {*} data - 传递给处理函数的数据
     */
    emit: function(eventName, data) {
        // 检查事件是否存在
        if (!this.events[eventName]) {
            if (this.debugMode) {
                console.log(`[EventBus] 无处理器的事件: ${eventName}`);
            }
            return this;
        }
        
        // 调试日志
        if (this.debugMode) {
            console.log(`[EventBus] 触发事件: ${eventName}`, data);
        }
        
        // 触发所有处理器
        const handlers = [...this.events[eventName]]; // 创建副本，防止处理过程中修改
        handlers.forEach(handler => {
            try {
                handler.fn.call(handler.context || this, data);
            } catch (error) {
                console.error(`[EventBus] 事件处理器错误: ${eventName}`, error);
            }
        });
        
        return this; // 支持链式调用
    },
    
    /**
     * 只订阅一次事件
     * @param {string} eventName - 事件名
     * @param {Function} fn - 事件处理函数
     * @param {Object} [context=null] - 函数执行上下文
     */
    once: function(eventName, fn, context = null) {
        const self = this;
        
        // 创建只执行一次的包装函数
        function onceHandler() {
            self.off(eventName, onceHandler);
            fn.apply(context || self, arguments);
        }
        
        // 保存原始函数引用，方便后续移除
        onceHandler.originalFn = fn;
        
        // 订阅包装函数
        return this.on(eventName, onceHandler, context);
    },
    
    /**
     * 获取事件处理器数量
     * @param {string} [eventName] - 可选，特定事件名
     * @returns {number} 处理器数量
     */
    listenerCount: function(eventName) {
        if (eventName) {
            return this.events[eventName] ? this.events[eventName].length : 0;
        }
        
        // 所有事件的处理器总数
        let count = 0;
        for (const event in this.events) {
            count += this.events[event].length;
        }
        return count;
    },
    
    /**
     * 获取所有已注册的事件名
     * @returns {string[]} 事件名数组
     */
    eventNames: function() {
        return Object.keys(this.events);
    },
    
    /**
     * 清除所有事件订阅
     */
    clear: function() {
        this.events = {};
        if (this.debugMode) {
            console.log('[EventBus] 已清除所有事件订阅');
        }
        return this;
    }
};