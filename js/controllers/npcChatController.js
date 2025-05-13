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

    // 初始化NPC聊天系统
    async initialize() {
        try {
            // 检查系统可用性
            await this.model.initialize();
            console.log("NPC聊天控制器初始化完成");
        } catch (error) {
            console.error("NPC聊天控制器初始化失败:", error);
        }
    }

    // 处理终端命令
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
        } else if (command === 'rerun') {
            await this.rerunLastMessage();
        }
    }

    // 向NPC发送消息
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
            this.showErrorMessage(`向${npcId}发送消息失败: ${error.message}`);
            return false;
        }
    }

    // 重新生成上一条消息
    async rerunLastMessage() {
        try {
            // 显示正在重新生成的状态
            this.view.showGeneratingState(this.model.lastInteraction.npcId || "NPC");
            
            // 调用模型的rerun方法
            const npcReply = await this.model.rerun();
            
            // 将回复添加到显示队列
            if (this.model.lastInteraction.npcId) {
                this.view.queueMessage(this.model.lastInteraction.npcId, npcReply);
            } else {
                // 如果没有NPC ID，直接显示错误信息
                window.gameController.view.displayOutput(npcReply);
                window.gameController.model.addToHistory(npcReply);
            }
            
            return true;
        } catch (error) {
            console.error(`重新生成消息失败:`, error);
            this.showErrorMessage(`重新生成失败: ${error.message}`);
            return false;
        }
    }

    // 显示错误消息
    showErrorMessage(message) {
        const errorMessage = `错误: ${message}`;
        window.gameController.view.displayOutput(errorMessage);
        window.gameController.model.addToHistory(errorMessage);
    }

    // 检查NPC是否存在
    async checkNpcExists(npcId) {
        try {
            await this.model.getNpcInfo(npcId);
            return true;
        } catch (error) {
            return false;
        }
    }
}