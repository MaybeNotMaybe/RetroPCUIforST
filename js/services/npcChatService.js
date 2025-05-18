// js/services/npcChatService.js
/**
 * NPC聊天服务
 * 管理NPC对话系统，提供聊天功能接口
 */
class NpcChatService {
    constructor() {
        // 获取依赖服务
        this.serviceLocator = window.ServiceLocator;
        this.eventBus = this.serviceLocator.get('eventBus');
        this.storage = this.serviceLocator.get('storage');
        this.system = this.serviceLocator.get('system');
        
        // 创建MVC组件
        this.model = new NpcChatModel(this.serviceLocator);
        this.view = new NpcChatView(this.serviceLocator);
        this.controller = new NpcChatController(this.model, this.view, this.serviceLocator);
        
        // 注册命令预处理器
        this.registerCommandPreprocessor();
        
        // 订阅事件
        this.subscribeToEvents();
        
        console.log("NPC聊天服务已初始化");
    }
    
    /**
     * 订阅系统事件
     */
    subscribeToEvents() {
        if (this.eventBus) {
            // 系统电源事件
            this.eventBus.on('systemPowerChange', (isOn) => {
                if (!isOn) {
                    // 系统关闭时重置生成状态
                    this.model.resetGeneratingState();
                }
            });
            
            // Lorebook系统初始化完成事件
            this.eventBus.on('lorebookSystemInitialized', () => {
                // 初始化NPC聊天模型
                this.model.initialize();
            });
        }
    }
    
    /**
     * 注册命令预处理器
     */
    registerCommandPreprocessor() {
        // 创建命令处理函数
        const commandHandler = (input) => {
            // 处理message命令和rerun命令
            if (input.startsWith('message ') || input.startsWith('msg ') || input === 'rerun') {
                // 仅当系统处于可操作状态时处理命令
                if (this.system && this.system.isOperational()) {
                    this.eventBus.emit('terminalCommand', { command: input });
                    return true; // 命令已处理
                }
            }
            return false; // 命令未处理
        };
        
        // 添加到全局命令预处理器链
        if (!window.commandPreprocessors) {
            window.commandPreprocessors = [];
        }
        
        window.commandPreprocessors.push(commandHandler);
    }
    
    /**
     * 向NPC发送消息
     * @param {string} npcId - NPC ID
     * @param {string} message - 用户消息
     * @returns {Promise<boolean>} 发送结果
     */
    async sendMessage(npcId, message) {
        return this.controller.sendMessageToNpc(npcId, message);
    }
    
    /**
     * 重新生成上一条消息
     * @returns {Promise<boolean>} 重新生成结果
     */
    async rerunLastMessage() {
        return this.controller.rerunLastMessage();
    }
    
    /**
     * 检查NPC是否存在
     * @param {string} npcId - NPC ID
     * @returns {Promise<boolean>} NPC是否存在
     */
    async checkNpcExists(npcId) {
        const lorebookService = this.serviceLocator.get('lorebook');
        if (lorebookService) {
            return lorebookService.checkNpcExists(npcId);
        }
        
        return false;
    }
}