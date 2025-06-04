// js/controllers/npcChatController.js
/**
 * NPC聊天控制器
 * 协调NPC聊天模型和视图
 */
class NpcChatController {
    constructor(model, view, serviceLocator) {
        this.model = model;
        this.view = view;
        this.serviceLocator = serviceLocator;
        this.eventBus = serviceLocator.get('eventBus');
        
        // 初始化NPC聊天系统
        this.initialize();
    }

    /**
     * 初始化NPC聊天控制器
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // 检查系统可用性
            await this.model.initialize();
            console.log("NPC聊天控制器初始化完成");
        } catch (error) {
            console.error("NPC聊天控制器初始化失败:", error);
        }
    }

    /**
     * 处理终端命令
     * @param {Object} commandData - 命令数据
     */
    async handleCommand(commandData) {
        const { command } = commandData;
        
        // 检查是否为消息命令
        if (command.startsWith('message ') || command.startsWith('msg ')) {
            const parts = command.split(' ');
            
            // 至少需要命令名、NPC ID和消息内容
            if (parts.length < 3) {
                this.view.showErrorMessage("命令格式错误。正确格式: message [目标ID] [消息内容]");
                return;
            }
            
            // 提取NPC ID和消息内容
            const npcId = parts[1];
            const message = parts.slice(2).join(' ');
            
            // 处理消息
            await this.sendMessageToNpc(npcId, message);
        } else if (command === 'rerun') {
            await this.rerunLastMessage();
        }
    }

    /**
     * 向NPC发送消息
     * @param {string} npcId - NPC ID
     * @param {string} message - 用户消息
     * @returns {Promise<boolean>} 是否成功发送
     */
    async sendMessageToNpc(npcId, message) {
        try {      
            // 显示正在生成状态
            this.view.showGeneratingState(npcId);
            
            // 处理消息并生成回复
            const npcReply = await this.model.processMessage(npcId, message);
            
            // 将回复添加到显示队列
            this.view.queueMessage(npcId, npcReply);
            
            return true;
        } catch (error) {
            console.error(`向NPC ${npcId}发送消息失败:`, error);
            this.view.showErrorMessage(`向${npcId}发送消息失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 重新生成上一条消息
     * @returns {Promise<boolean>} 是否成功重新生成
     */
    async rerunLastMessage() {
        try {
            // 获取最后一次交互的NPC ID
            const lastNpcId = this.model.lastInteraction.npcId;
            
            // 显示正在重新生成的状态
            this.view.showGeneratingState(lastNpcId || "NPC");
            
            // 调用模型的rerun方法
            const npcReply = await this.model.rerun();
            
            // 将回复添加到显示队列
            if (lastNpcId) {
                this.view.queueMessage(lastNpcId, npcReply);
            } else {
                // 如果没有NPC ID，直接显示错误信息
                this.view.showErrorMessage(npcReply.replace('错误：', ''));
            }
            
            return true;
        } catch (error) {
            console.error(`重新生成消息失败:`, error);
            this.view.showErrorMessage(`重新生成失败: ${error.message}`);
            return false;
        }
    }


    /**
     * 直接处理命令字符串
     * 此方法可供CommandService调用，替代原来的handleCommand方法
     * @param {string} commandString - 命令字符串
     * @returns {Promise<boolean>} 处理结果
     */
    async processCommandString(commandString) {
        if (commandString.startsWith('message ') || commandString.startsWith('msg ')) {
            const parts = commandString.split(' ');
            
            // 至少需要命令名、NPC ID和消息内容
            if (parts.length < 3) {
                this.view.showErrorMessage("命令格式错误。正确格式: message [目标ID] [消息内容]");
                return false;
            }
            
            // 提取NPC ID和消息内容
            const npcId = parts[1];
            const message = parts.slice(2).join(' ');
            
            // 处理消息
            return await this.sendMessageToNpc(npcId, message);
        } else if (commandString === 'rerun') {
            return await this.rerunLastMessage();
        }
        
        return false;
    }
}