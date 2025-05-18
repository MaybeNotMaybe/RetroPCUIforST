// js/services/lorebookService.js
/**
 * Lorebook服务
 * 为世界书系统提供服务接口
 */
class LorebookService {
    constructor() {
        this.serviceLocator = window.ServiceLocator;
        this.eventBus = this.serviceLocator.get('eventBus');
        this.storage = this.serviceLocator.get('storage');
        
        // 引用Lorebook控制器和模型
        this.controller = null;
        this.model = null;
        
        // 初始化标志
        this.initialized = false;
        
        // 初始化服务
        this.initialize();
    }
    
    /**
     * 初始化Lorebook服务
     */
    async initialize() {
        try {
            // 等待Lorebook控制器和模型可用
            this.waitForLorebookComponents();
            
            // 订阅事件
            if (this.eventBus) {
                this.eventBus.on('lorebookSystemInitialized', () => {
                    this.initialized = true;
                    console.log("Lorebook服务初始化完成");
                });
            }
        } catch (error) {
            console.error("Lorebook服务初始化失败:", error);
        }
    }
    
    /**
     * 等待Lorebook组件可用
     */
    waitForLorebookComponents() {
        // 检查全局对象是否可用
        if (window.lorebookController && window.lorebookController.model) {
            this.controller = window.lorebookController;
            this.model = window.lorebookController.model;
            return;
        }
        
        // 设置轮询检查
        const checkInterval = setInterval(() => {
            if (window.lorebookController && window.lorebookController.model) {
                clearInterval(checkInterval);
                this.controller = window.lorebookController;
                this.model = window.lorebookController.model;
                
                // 更新初始化状态
                if (this.controller.initialized) {
                    this.initialized = true;
                }
            }
        }, 300);
    }
    
    /**
     * 封装Lorebook控制器的方法
     * 以下方法直接转发到Lorebook控制器，保持接口兼容性
     */
    
    getCharLorebooks() {
        return this.controller ? this.controller.getCharLorebooks() : null;
    }
    
    async getOrCreateChatLorebook(name) {
        if (!this.controller) return null;
        return this.controller.getOrCreateChatLorebook(name);
    }
    
    async getNpcInfo(npcId) {
        if (!this.controller) throw new Error("Lorebook控制器未初始化");
        return this.controller.getNpcInfo(npcId);
    }
    
    async ensureChatHistory(npcId) {
        if (!this.controller) throw new Error("Lorebook控制器未初始化");
        return this.controller.ensureChatHistory(npcId);
    }
    
    async ensureSummary(npcId) {
        if (!this.controller) throw new Error("Lorebook控制器未初始化");
        return this.controller.ensureSummary(npcId);
    }
    
    async getSummaryPromptEntry() {
        if (!this.controller) throw new Error("Lorebook控制器未初始化");
        return this.controller.getSummaryPromptEntry();
    }
    
    async getPromptMessageEntry() {
        if (!this.controller) throw new Error("Lorebook控制器未初始化");
        return this.controller.getPromptMessageEntry();
    }
    
    async addDialogue(npcId, userMessage, npcReply) {
        if (!this.controller) throw new Error("Lorebook控制器未初始化");
        return this.controller.addDialogue(npcId, userMessage, npcReply);
    }
    
    findLastSummaryRound(chat_history) {
        if (!this.controller) return null;
        return this.controller.findLastSummaryRound(chat_history);
    }
    
    async checkNpcExists(npcId) {
        if (!this.controller) return false;
        return this.controller.checkNpcExists(npcId);
    }
}