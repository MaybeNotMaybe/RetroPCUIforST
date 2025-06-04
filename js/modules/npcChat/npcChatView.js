// js/views/npcChatView.js
/**
 * NPC聊天视图
 * 负责聊天界面的显示和交互
 */
class NpcChatView {
    constructor(serviceLocator) {
        this.serviceLocator = serviceLocator;
        this.domUtils = serviceLocator.get('domUtils');
        this.audio = serviceLocator.get('audio');
        
        // 获取游戏控制器 - 临时解决方案，后续将通过服务定位器获取
        this.gameController = serviceLocator.get('gameController');
        
        // 消息队列管理
        this.messageQueue = [];
        this.isDisplaying = false;
    }

    /**
     * 显示正在生成消息的状态
     * @param {string} npcId - NPC的ID
     */
    showGeneratingState(npcId) {
        // 显示生成中的状态，但不影响用户操作
        const gameController = this.gameController || window.gameController;
        if (!gameController) return;
        
        const generateMessage = `正在连接到 ${npcId}，请等待响应...`;
        
        gameController.view.displayOutput(generateMessage);
        gameController.model.addToHistory(generateMessage);
        
        // 触发指示灯闪烁效果
        const eventBus = this.serviceLocator.get('eventBus');
        if (eventBus) {
            eventBus.emit('networkActivity');
        }
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
        const gameController = this.gameController || window.gameController;
        if (!gameController) return;
        
        // 创建特殊格式的消息显示
        const header = `\n正在传入消息...`;
        const separator = `\n---------------`;
        const footer = `\n---------------\n消息接收结束\n`;
        
        // 获取消息部分，包括分隔线和页脚
        const completeMessage = `${header}${separator}\n${message}${separator}${footer}`;
        
        // 触发磁盘和网络活动指示灯
        const eventBus = this.serviceLocator.get('eventBus');
        if (eventBus) {
            eventBus.emit('diskActivity');
            eventBus.emit('networkActivity');
        }
        
        // 播放消息提示音
        if (this.audio) {
            this.audio.play('systemBeep');
        }
        
        // 显示消息
        gameController.view.displayOutput(completeMessage);
        
        // 添加到历史记录
        gameController.model.addToHistory(completeMessage);
        
        // 添加一个短延迟，确保消息完全显示后，才处理队列中的下一条
        setTimeout(() => {
            this.processMessageQueue();
        }, 1000);
    }
    
    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     */
    showErrorMessage(message) {
        const gameController = this.gameController || window.gameController;
        if (!gameController) return;
        
        const errorMessage = `\n错误: ${message}\n`;
        gameController.view.displayOutput(errorMessage);
        gameController.model.addToHistory(errorMessage);
        
        // 播放错误提示音
        if (this.audio) {
            this.audio.play('systemBeep');
        }
    }
}