// js/controllers/connectController.js
class ConnectController {
    constructor(connectModel, connectView, gameModel) {
        this.model = connectModel;
        this.view = connectView;
        this.gameModel = gameModel; // 引用主游戏模型，用于添加到历史记录等
    }
    
    // 处理connect命令
    async connect(target) {
        // 如果没有提供目标，返回使用说明
        if (!target) {
            return "请指定连接目标。使用格式: connect [目标ID]";
        }
        
        // 如果已经连接到某个目标，先断开
        if (this.model.isActive()) {
            const disconnectMsg = this.disconnect();
            return disconnectMsg + "\n\n请重新发起连接。";
        }
        
        // 确保target没有包含.json扩展名
        const cleanTarget = target.endsWith('.json') ? target.slice(0, -5) : target;
        
        // 检查目标NPC是否存在
        const targetExists = await this.model.checkNpcExists(cleanTarget);
        if (!targetExists) {
            return `错误: 无法找到ID为"${cleanTarget}"的连接目标。`;
        }
        
        // 连接到目标
        return await this.connectToTarget(cleanTarget);
    }
    
    // 实际连接目标的方法
    async connectToTarget(target) {
        // 触发网络活动指示灯
        EventBus.emit('networkActivity');
        
        try {
            // 确保target没有包含.json扩展名
            const cleanTarget = target.endsWith('.json') ? target.slice(0, -5) : target;
            
            // 加载NPC提示词和通用提示词
            this.model.npcPrompt = await this.model.loadJsonFileWithRetry(`data/prompt/npc/${cleanTarget}.json`);
            this.model.connectPrompt = await this.model.loadJsonFileWithRetry('data/prompt/connect.json');
            
            if (!this.model.npcPrompt || !this.model.connectPrompt) {
                return `错误: 无法加载"${cleanTarget}"的配置信息。请检查网络连接或联系系统管理员。`;
            }
            
            // 初始化聊天历史管理器
            const initialized = await this.model.chatHistoryManager.initialize(cleanTarget);
            if (!initialized) {
                console.warn(`警告: 无法初始化聊天历史管理，将不会保存聊天记录`);
            }
            
            // 设置连接状态
            this.model.isConnected = true;
            this.model.currentTarget = cleanTarget;
            
            // 显示连接成功消息
            return this.view.displayConnectionSuccess(cleanTarget);
        } catch (error) {
            console.error(`连接到目标"${target}"失败:`, error);
            return `错误: 连接到"${target}"时发生问题。请稍后再试。`;
        }
    }
    
    // 断开连接方法
    async disconnect() {
        if (!this.model.isActive()) {
            return "错误: 当前没有活跃的连接。";
        }
        
        const target = this.model.currentTarget;
        
        // 在断开连接前显示清理消息
        if (this.model.chatHistoryManager.summarizeOnDisconnect && 
            this.model.chatHistoryManager.roundsSinceLastSummary > 0) {
            this.view.displayOutput("连接清理中...");
            
            // 执行断开连接时的清理
            await this.model.chatHistoryManager.finalizeOnDisconnect();
        }
        
        // 设置状态
        this.model.isConnected = false;
        this.model.currentTarget = null;
        this.model.isWaitingResponse = false;
        
        // 显示断开连接消息
        return this.view.displayDisconnect(target);
    }
    
    // 判断是否应该处理命令
    shouldHandleCommand(command) {
        command = command.toLowerCase().trim();
        
        // 如果已经处于连接状态，处理所有命令
        if (this.model.isActive()) {
            return true;
        }
        
        // 如果命令以"connect "开头，也处理
        if (command.startsWith("connect ")) {
            return true;
        }
        
        return false;
    }
    
    // 处理命令
    async processCommand(command) {
        command = command.toLowerCase().trim();
        
        // 检查是否处于连接状态
        if (this.model.isActive()) {
            // 只保留disconnect命令的处理
            if (command === "disconnect") {
                return this.disconnect();
            }
            
            // 如果正在等待AI响应，提示用户等待
            if (this.model.isWaitingResponse) {
                return "系统正在处理上一条消息，请稍候...";
            }
            
            // 所有其他输入都视为要发送的消息
            this.model.setMessageToSend(command);
            
            // 返回特殊标记，表示需要发送消息
            return "SEND_MESSAGE";
        }
        
        // 处理connect命令
        if (command.startsWith("connect ")) {
            return await this.connect(command.substring(8));
        }
        
        // 其他命令不处理
        return null;
    }
    
    // 发送单行消息到AI并获取响应
    async sendSingleLineMessage() {
        if (!this.model.isActive() || !this.model.messageToSend) {
            return;
        }
        
        try {
            // 设置等待响应标志
            this.model.isWaitingResponse = true;
            
            // 获取要发送的消息
            const messageToSend = this.model.getAndClearMessageToSend();
            
            // 触发网络活动指示灯
            EventBus.emit('networkActivity');
            
            // 获取聊天上下文
            const chatContext = await this.model.getChatContext();
            
            // 准备提示词
            const npcPromptContent = JSON.stringify(this.model.npcPrompt);
            const connectPromptContent = JSON.stringify(this.model.connectPrompt);
            
            // 构建注入提示词数组
            const injects = [
                { 
                    role: 'system', 
                    content: connectPromptContent, 
                    position: 'in_chat', 
                    depth: 0, 
                    should_scan: true 
                },
                { 
                    role: 'system', 
                    content: npcPromptContent, 
                    position: 'in_chat', 
                    depth: 1, 
                    should_scan: true 
                }
            ];
            
            // 如果有聊天总结，添加到注入提示中
            if (chatContext.summary) {
                injects.push({
                    role: 'system',
                    content: `与${this.model.currentTarget}的对话总结: ${chatContext.summary}`,
                    position: 'in_chat',
                    depth: 2,
                    should_scan: true
                });
            }
            
            // 如果有最近聊天记录，添加到注入提示中
            if (chatContext.recentChats) {
                injects.push({
                    role: 'system',
                    content: `最近的对话历史: ${chatContext.recentChats}`,
                    position: 'in_chat',
                    depth: 3,
                    should_scan: true
                });
            }
            
            // 请求AI生成响应
            const response = await generate({
                user_input: messageToSend,
                injects: injects
            });
            
            // 清除等待标志
            this.model.isWaitingResponse = false;
            
            // 解析响应，提取<npc_reply>标签中的内容
            let parsedResponse = this.model.extractNpcReply(response);
            
            // 触发网络活动指示灯（表示收到响应）
            EventBus.emit('networkActivity');
            
            // 更新聊天记录
            if (parsedResponse) {
                // 更新聊天历史
                await this.model.updateChatHistory(messageToSend, parsedResponse);
                
                // 显示NPC回复
                const npcResponse = this.view.displayNpcResponse(this.model.npcPrompt.name, parsedResponse);
                this.gameModel.addToHistory(npcResponse);
            } else {
                const errorMsg = this.view.displayResponseError();
                this.gameModel.addToHistory(errorMsg);
            }
        } catch (error) {
            console.error("AI响应生成失败:", error);
            this.model.isWaitingResponse = false;
            
            const errorMsg = this.view.displayResponseError();
            this.gameModel.addToHistory(errorMsg);
        }
    }
}