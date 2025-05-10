// js/models/connectModel.js
class ConnectModel {
    constructor() {
        // 连接状态相关属性
        this.isConnected = false;        // 是否处于连接状态
        this.currentTarget = null;       // 当前连接的目标
        this.isWaitingResponse = false;  // 是否正在等待AI响应
        this.messageToSend = null;       // 要发送的用户输入
        
        // 提示词对象
        this.npcPrompt = null;
        this.connectPrompt = null;
        
        // CDN基础URL配置
        this.cdnBaseUrl = "https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@964bff7/";
    }
    
    // 检查是否当前已连接
    isActive() {
        return this.isConnected;
    }
    
    // 设置要发送的消息
    setMessageToSend(message) {
        this.messageToSend = message;
    }
    
    // 获取要发送的消息并清除
    getAndClearMessageToSend() {
        const message = this.messageToSend;
        this.messageToSend = null;
        return message;
    }
    
    // 辅助函数：提取<npc_reply>标签中的内容
    extractNpcReply(text) {
        const regex = /<npc_reply>([\s\S]*?)<\/npc_reply>/;
        const match = text.match(regex);
        return match ? match[1].trim() : null;
    }
    
    // 带重试的加载JSON文件
    async loadJsonFileWithRetry(path, maxRetries = 3, delay = 1000) {
        let lastError;
        
        // 确保path不会有双重扩展名问题
        const cleanPath = path.replace(/\.json\.json$/, '.json');
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const fullUrl = this.cdnBaseUrl + cleanPath;
                console.log(`尝试加载 (${attempt}/${maxRetries}): ${fullUrl}`);
                
                const response = await fetch(fullUrl);
                if (!response.ok) {
                    throw new Error(`HTTP错误: ${response.status}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error(`加载失败 (尝试 ${attempt}/${maxRetries}):`, error);
                lastError = error;
                
                if (attempt < maxRetries) {
                    // 等待一段时间后重试
                    await new Promise(resolve => setTimeout(resolve, delay));
                    // 每次重试增加延迟时间
                    delay *= 1.5;
                }
            }
        }
        
        console.error(`所有重试都失败:`, lastError);
        return null;
    }
    
    // 检查NPC是否存在
    async checkNpcExists(npcId) {
        try {
            // 确保npcId没有包含.json扩展名
            const cleanId = npcId.endsWith('.json') ? npcId.slice(0, -5) : npcId;
            
            // 构建完整的CDN URL
            const fullUrl = this.cdnBaseUrl + `data/prompt/npc/${cleanId}.json`;
            console.log(`检查NPC文件是否存在: ${fullUrl}`);
            
            const response = await fetch(fullUrl);
            return response.ok;
        } catch (error) {
            console.error(`检查NPC文件存在性失败: ${npcId}`, error);
            return false;
        }
    }
}