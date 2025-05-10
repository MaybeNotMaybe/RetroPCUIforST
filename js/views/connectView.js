// js/views/connectView.js
class ConnectView {
    constructor(gameView) {
        // 存储对主游戏视图的引用，用于显示输出
        this.gameView = gameView;
    }
    
    // 显示连接输出消息
    displayOutput(text) {
        this.gameView.displayOutput(text);
    }
    
    // 显示连接成功消息
    displayConnectionSuccess(target) {
        const successMessage = 
            `尝试连接到 "${target}"...\n\n` +
            `建立加密通道...\n` +
            `验证身份...\n` +
            `连接成功!\n\n` +
            `输入消息内容并按下Enter发送。\n` +
            `输入 "disconnect" 断开连接。`;
        
        this.displayOutput(successMessage);
        return successMessage;
    }
    
    // 显示断开连接消息
    displayDisconnect(target) {
        const disconnectMessage = `已断开与 "${target}" 的连接。`;
        this.displayOutput(disconnectMessage);
        return disconnectMessage;
    }
    
    // 显示等待响应消息
    displayWaitingResponse() {
        const waitingMsg = "等待回复中...";
        this.displayOutput(waitingMsg);
        return waitingMsg;
    }
    
    // 显示NPC回复
    displayNpcResponse(npcName, response) {
        const npcResponse = `${npcName}: ${response}`;
        this.displayOutput(npcResponse);
        return npcResponse;
    }
    
    // 显示错误响应
    displayResponseError() {
        const errorMsg = "错误: 无法获取响应。连接可能已中断。";
        this.displayOutput(errorMsg);
        return errorMsg;
    }
}