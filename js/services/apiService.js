// js/services/apiService.js
/**
 * API服务类
 * 封装所有后端全局函数调用，提供统一的错误处理和日志记录
 */
class APIService {
    constructor() {
        console.log("API服务初始化");
        
        // 获取事件总线
        this.eventBus = window.ServiceLocator.get('eventBus') || window.EventBus;
        
        // 请求状态跟踪
        this.pendingRequests = 0;
    }
    
    /**
     * 获取或创建聊天世界书
     * @param {string} [name] - 可选的世界书名称
     * @returns {Promise<string>} 世界书ID
     */
    async getOrCreateChatLorebook(name) {
        return this._wrapApiCall('getOrCreateChatLorebook', () => window.getOrCreateChatLorebook(name));
    }
    
    /**
     * 获取角色卡绑定的世界书
     * @returns {Object} 包含primary和secondary世界书ID的对象
     */
    getCharLorebooks() {
        return this._wrapApiCall('getCharLorebooks', () => window.getCharLorebooks(), false);
    }
    
    /**
     * 获取世界书条目
     * @param {string} lorebookId - 世界书ID
     * @returns {Promise<Array>} 条目数组
     */
    async getLorebookEntries(lorebookId) {
        return this._wrapApiCall('getLorebookEntries', () => window.getLorebookEntries(lorebookId));
    }
    
    /**
     * 更新世界书条目
     * @param {string} lorebookId - 世界书ID
     * @param {Array} entries - 条目数组
     * @returns {Promise<boolean>} 操作是否成功
     */
    async setLorebookEntries(lorebookId, entries) {
        return this._wrapApiCall('setLorebookEntries', () => window.setLorebookEntries(lorebookId, entries));
    }
    
    /**
     * 创建新的世界书条目
     * @param {string} lorebookId - 世界书ID
     * @param {Array} entries - 条目数组
     * @returns {Promise<boolean>} 操作是否成功
     */
    async createLorebookEntries(lorebookId, entries) {
        return this._wrapApiCall('createLorebookEntries', () => window.createLorebookEntries(lorebookId, entries));
    }
    
    /**
     * API调用包装器，提供统一的错误处理和事件发布
     * @param {string} methodName - API方法名
     * @param {Function} apiCall - API调用函数
     * @param {boolean} [isAsync=true] - 是否为异步调用
     * @returns {Promise<*>|*} API调用结果
     * @private
     */
    async _wrapApiCall(methodName, apiCall, isAsync = true) {
        // 开始API调用
        this.pendingRequests++;
        this.eventBus.emit('apiCallStarted', { method: methodName });
        
        try {
            // 执行API调用
            const result = isAsync ? await apiCall() : apiCall();
            
            // 发布成功事件
            this.eventBus.emit('apiCallCompleted', { 
                method: methodName, 
                success: true 
            });
            
            return result;
        } catch (error) {
            // 发布失败事件
            this.eventBus.emit('apiCallCompleted', { 
                method: methodName, 
                success: false, 
                error: error 
            });
            
            console.error(`API调用失败 - ${methodName}:`, error);
            throw error;
        } finally {
            // 完成API调用
            this.pendingRequests--;
        }
    }
    
    /**
     * 检查是否有挂起的API请求
     * @returns {boolean} 是否有挂起的请求
     */
    hasPendingRequests() {
        return this.pendingRequests > 0;
    }
}