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
            
            // 等待命令服务就绪，注册NPC聊天命令
            this.eventBus.on('commandSystemReady', (data) => {
                this.registerCommands(data.service);
            });
        }
    }

    
    // 添加注册命令的方法
    registerCommands(commandService) {
        if (!commandService) return;
        
        // 注册message命令
        commandService.registerCommand('message', (args, context) => {
            const parts = args.split(' ');
            
            // 至少需要NPC ID和消息内容
            if (parts.length < 2) {
                return {
                    success: false, 
                    message: "命令格式错误。正确格式: message [目标ID] [消息内容]"
                };
            }
            
            // 提取NPC ID和消息内容
            const npcId = parts[0];
            const message = parts.slice(1).join(' ');
            
            // 通过控制器处理消息
            this.controller.sendMessageToNpc(npcId, message);
            
            // 不返回消息，由控制器处理显示
            return { success: true, message: null };
        }, {
            category: 'communication',
            description: '向NPC发送消息',
            usage: 'message [目标ID] [消息内容]',
            examples: ['message lab1 你好'],
            aliases: ['msg']
        });
        
        // 注册rerun命令
        commandService.registerCommand('rerun', (args, context) => {
            
            // 重新生成上一条消息
            this.controller.rerunLastMessage();
            
            // 不返回消息，由控制器处理显示
            return { success: true, message: null };
        }, {
            category: 'communication',
            description: '重新生成上一条NPC回复',
            usage: 'rerun',
            examples: ['rerun']
        });
        
        console.log("NPC聊天命令已注册");
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

    /**
     * 清理服务资源
     */
    dispose() {
        // 解除事件绑定
        if (this.eventBus) {
            this.eventBus.off('systemPowerChange');
            this.eventBus.off('lorebookSystemInitialized');
            this.eventBus.off('commandSystemReady');
            this.eventBus.off('systemBootComplete');
        }
        
        console.log("NPC聊天服务已清理");
    }
}