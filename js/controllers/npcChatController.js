// js/controllers/npcChatController.js
class NpcChatController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        
        // 初始化NPC聊天系统
        this.initialize();
        
        // 收到命令响应事件
        EventBus.on('terminalCommand', this.handleCommand.bind(this));
    }

    /**
     * 初始化NPC聊天系统
     */
    async initialize() {
        try {
            await this.model.initialize();
            console.log("NPC聊天控制器初始化完成");
        } catch (error) {
            console.error("NPC聊天控制器初始化失败:", error);
        }
    }

    /**
     * 处理终端命令
     * @param {object} commandData - 命令数据
     */
    async handleCommand(commandData) {
        const { command } = commandData;
        
        // 检查是否为消息命令
        if (command.startsWith('message ') || command.startsWith('msg ')) {
            const parts = command.split(' ');
            
            // 至少需要命令名、NPC ID和消息内容
            if (parts.length < 3) {
                this.showErrorMessage("命令格式错误。正确格式: message [目标ID] [消息内容]");
                return;
            }
            
            // 提取NPC ID和消息内容
            const npcId = parts[1];
            const message = parts.slice(2).join(' ');
            
            // 处理消息
            await this.sendMessageToNpc(npcId, message);
        }
    }

    /**
     * 向NPC发送消息
     * @param {string} npcId - NPC的ID
     * @param {string} message - 用户消息
     */
    async sendMessageToNpc(npcId, message) {
        try {
            // 检查系统是否已初始化
            if (!this.model.lorebookReady) {
                await this.model.initialize();
            }
            
            // 显示正在生成状态
            this.view.showGeneratingState(npcId);
            
            // 处理消息并生成回复
            const npcReply = await this.model.processMessage(npcId, message);
            
            // 将回复添加到显示队列
            this.view.queueMessage(npcId, npcReply);
            
            return true;
        } catch (error) {
            console.error(`向NPC ${npcId}发送消息失败:`, error);
            this.showErrorMessage(`向${npcId}发送消息失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     */
    showErrorMessage(message) {
        const errorMessage = `错误: ${message}`;
        window.gameController.view.displayOutput(errorMessage);
        window.gameController.model.addToHistory(errorMessage);
    }

    /**
     * 检查NPC是否存在
     * @param {string} npcId - NPC的ID
     * @returns {Promise<boolean>} - NPC是否存在
     */
    async checkNpcExists(npcId) {
        try {
            await this.model.getNpcInfo(npcId);
            return true;
        } catch (error) {
            return false;
        }
    }
}