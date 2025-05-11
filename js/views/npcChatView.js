// js/views/npcChatView.js
class NpcChatView {
    constructor() {
        this.messageQueue = [];
        this.isDisplaying = false;
    }

    /**
     * 显示正在生成消息的状态
     * @param {string} npcId - NPC的ID
     */
    showGeneratingState(npcId) {
        // 显示生成中的状态，但不影响用户操作
        const gameView = window.gameController.view;
        const generateMessage = `正在连接到 ${npcId}，请等待响应...`;
        
        gameView.displayOutput(generateMessage);
        window.gameController.model.addToHistory(generateMessage);
    }

    /**
     * 将NPC消息添加到显示队列
     * @param {string} npcId - NPC的ID
     * @param {string} message - NPC的回复消息
     */
    queueMessage(npcId, message) {
        this.messageQueue.push({
            npcId: npcId,
            message: message
        });
        
        // 如果当前没有在显示消息，开始显示
        if (!this.isDisplaying) {
            this.processMessageQueue();
        }
    }

    /**
     * 处理消息队列，显示下一条消息
     */
    processMessageQueue() {
        if (this.messageQueue.length === 0) {
            this.isDisplaying = false;
            return;
        }
        
        this.isDisplaying = true;
        const nextMessage = this.messageQueue.shift();
        this.displayNpcMessage(nextMessage.npcId, nextMessage.message);
    }

    /**
     * 显示NPC消息
     * @param {string} npcId - NPC的ID
     * @param {string} message - NPC的回复消息
     */
    displayNpcMessage(npcId, message) {
        const gameView = window.gameController.view;
        const gameModel = window.gameController.model;
        
        // 创建特殊格式的消息显示
        const header = `\n正在传入消息...`;
        const separator = `\n---------------`;
        const footer = `\n---------------\n消息接收结束\n`;
        
        // 获取消息部分，包括分隔线和页脚
        const completeMessage = `${header}${separator}\n${message}${separator}${footer}`;
        
        // 触发磁盘和网络活动指示灯
        EventBus.emit('diskActivity');
        EventBus.emit('networkActivity');
        
        // 显示消息
        gameView.displayOutput(completeMessage);
        
        // 添加到历史记录
        gameModel.addToHistory(completeMessage);
        
        // 添加一个短延迟，确保消息完全显示后，才处理队列中的下一条
        setTimeout(() => {
            this.processMessageQueue();
        }, 1000);
    }
}