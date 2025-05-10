// js/managers/NpcChatHistoryManager.js
class NpcChatHistoryManager {
    constructor() {
        // 配置参数
        this.recentChatRounds = 8;          // 最近聊天保存的轮数
        this.summarizeOnDisconnect = true;  // 断开时是否进行总结
        this.summarizeEveryRounds = 8;      // 每多少轮进行一次总结
        
        // 当前会话状态
        this.currentNpcId = null;           // 当前连接的NPC ID
        this.chatLorebook = null;           // 当前聊天的世界书
        this.roundsSinceLastSummary = 0;    // 自上次总结后的聊天轮数
        
        // 条目的UID缓存
        this.entryUids = {
            fullHistory: null,
            recentChats: null,
            summary: null
        };
        
        // 总结提示词文件路径
        this.summaryPromptPath = 'data/prompt/chat_summary.json';
    }
    
    // 初始化聊天历史管理
    async initialize(npcId) {
        if (!npcId) return false;
        
        this.currentNpcId = npcId;
        
        try {
            // 1. 获取或创建当前聊天的世界书
            this.chatLorebook = await getOrCreateChatLorebook();
            console.log(`聊天世界书: ${this.chatLorebook}`);
            
            // 2. 检查并创建NPC聊天条目
            await this.ensureChatEntries();
            
            // 3. 重置轮数计数
            this.roundsSinceLastSummary = 0;
            
            return true;
        } catch (error) {
            console.error("初始化聊天历史管理器失败:", error);
            return false;
        }
    }
    
    // 确保NPC聊天的三个条目都存在
    async ensureChatEntries() {
        // 获取当前所有条目
        const entries = await getLorebookEntries(this.chatLorebook);
        
        // 为当前NPC准备条目名称前缀
        const prefix = `NPC_${this.currentNpcId}`;
        
        // 检查是否存在全部历史条目
        const fullHistoryEntry = entries.find(e => e.comment === `${prefix}_FullHistory`);
        if (!fullHistoryEntry) {
            await this.createFullHistoryEntry(prefix);
        } else {
            this.entryUids.fullHistory = fullHistoryEntry.uid;
        }
        
        // 检查是否存在最近聊天条目
        const recentChatsEntry = entries.find(e => e.comment === `${prefix}_RecentChats`);
        if (!recentChatsEntry) {
            await this.createRecentChatsEntry(prefix);
        } else {
            this.entryUids.recentChats = recentChatsEntry.uid;
        }
        
        // 检查是否存在聊天总结条目
        const summaryEntry = entries.find(e => e.comment === `${prefix}_Summary`);
        if (!summaryEntry) {
            await this.createSummaryEntry(prefix);
        } else {
            this.entryUids.summary = summaryEntry.uid;
        }
    }
    
    // 创建全部聊天历史条目
    async createFullHistoryEntry(prefix) {
        const { new_uids } = await createLorebookEntries(this.chatLorebook, [{
            comment: `${prefix}_FullHistory`,
            enabled: false,
            type: 'selective',
            position: 'before_character_definition',
            keys: [this.currentNpcId],
            content: `与${this.currentNpcId}的完整聊天历史：\n\n`,
            logic: 'and_any'
        }]);
        
        this.entryUids.fullHistory = new_uids[0];
        console.log(`创建了全部历史条目，UID: ${this.entryUids.fullHistory}`);
    }
    
    // 创建最近聊天条目
    async createRecentChatsEntry(prefix) {
        const { new_uids } = await createLorebookEntries(this.chatLorebook, [{
            comment: `${prefix}_RecentChats`,
            enabled: false,
            type: 'selective',
            position: 'before_character_definition',
            keys: [this.currentNpcId],
            content: `与${this.currentNpcId}的最近${this.recentChatRounds}轮对话：\n\n`,
            logic: 'and_any'
        }]);
        
        this.entryUids.recentChats = new_uids[0];
        console.log(`创建了最近聊天条目，UID: ${this.entryUids.recentChats}`);
    }
    
    // 创建聊天总结条目
    async createSummaryEntry(prefix) {
        const { new_uids } = await createLorebookEntries(this.chatLorebook, [{
            comment: `${prefix}_Summary`,
            enabled: true,
            type: 'constant',
            position: 'after_author_note',
            keys: [this.currentNpcId],
            content: `与${this.currentNpcId}的对话尚未开始。`,
            logic: 'and_any'
        }]);
        
        this.entryUids.summary = new_uids[0];
        console.log(`创建了聊天总结条目，UID: ${this.entryUids.summary}`);
    }
    
    // 添加新的对话到历史记录
    async addChat(userMessage, npcResponse) {
        if (!this.chatLorebook || !this.currentNpcId) return false;
        
        try {
            // 格式化聊天记录
            const timestamp = new Date().toLocaleString();
            const chatEntry = `[${timestamp}]\n用户: ${userMessage}\n${this.currentNpcId}: ${npcResponse}\n\n`;
            
            // 1. 更新完整历史记录
            await this.updateFullHistory(chatEntry);
            
            // 2. 更新最近聊天记录
            await this.updateRecentChats(chatEntry);
            
            // 3. 增加轮数计数
            this.roundsSinceLastSummary++;
            
            // 4. 检查是否需要进行总结
            if (this.roundsSinceLastSummary >= this.summarizeEveryRounds) {
                await this.generateSummary();
            }
            
            return true;
        } catch (error) {
            console.error("添加聊天记录失败:", error);
            return false;
        }
    }
    
    // 更新完整历史记录
    async updateFullHistory(chatEntry) {
        if (!this.entryUids.fullHistory) return;
        
        // 获取当前条目
        const entries = await getLorebookEntries(this.chatLorebook);
        const entry = entries.find(e => e.uid === this.entryUids.fullHistory);
        
        if (entry) {
            // 添加新聊天到历史记录末尾
            entry.content += chatEntry;
            
            // 更新条目
            await setLorebookEntries(this.chatLorebook, [entry]);
        }
    }
    
    // 更新最近聊天记录
    async updateRecentChats(chatEntry) {
        if (!this.entryUids.recentChats) return;
        
        // 获取当前条目
        const entries = await getLorebookEntries(this.chatLorebook);
        const entry = entries.find(e => e.uid === this.entryUids.recentChats);
        
        if (entry) {
            // 分割聊天记录
            const header = `与${this.currentNpcId}的最近${this.recentChatRounds}轮对话：\n\n`;
            let content = entry.content.replace(header, '');
            
            // 添加新聊天
            content += chatEntry;
            
            // 保留最近的N轮对话
            const rounds = content.split('\n\n').filter(r => r.trim() !== '');
            if (rounds.length > this.recentChatRounds) {
                rounds.splice(0, rounds.length - this.recentChatRounds);
                content = rounds.join('\n\n') + (rounds.length > 0 ? '\n\n' : '');
            }
            
            // 更新条目
            entry.content = header + content;
            await setLorebookEntries(this.chatLorebook, [entry]);
        }
    }
    
    // 生成对话总结
    async generateSummary() {
        if (!this.entryUids.summary || !this.entryUids.recentChats) return;
        
        try {
            console.log("开始生成聊天总结...");
            
            // 1. 获取当前条目
            const entries = await getLorebookEntries(this.chatLorebook);
            const summaryEntry = entries.find(e => e.uid === this.entryUids.summary);
            const recentChatsEntry = entries.find(e => e.uid === this.entryUids.recentChats);
            
            if (!summaryEntry || !recentChatsEntry) return;
            
            // 2. 加载总结提示词
            const summaryPrompt = await this.loadSummaryPrompt();
            if (!summaryPrompt) {
                console.error("无法加载总结提示词");
                return;
            }
            
            // 3. 构建提示词
            const currentSummary = summaryEntry.content;
            const recentChats = recentChatsEntry.content;
            
            // 将当前总结和最近聊天作为提示
            const userInput = 
                `请根据以下最近的对话和现有总结，生成一份新的300-400字的总结。` +
                `总结应该捕捉对话的要点和关键信息。\n\n` +
                `现有总结:\n${currentSummary}\n\n` +
                `最近对话:\n${recentChats}`;
            
            // 4. 调用AI生成总结
            const newSummary = await generate({
                user_input: userInput,
                injects: [
                    { 
                        role: 'system', 
                        content: JSON.stringify(summaryPrompt), 
                        position: 'in_chat', 
                        depth: 0, 
                        should_scan: true 
                    }
                ]
            });
            
            // 5. 提取总结内容
            const extractedSummary = this.extractSummary(newSummary);
            if (extractedSummary) {
                // 更新总结条目
                summaryEntry.content = extractedSummary;
                await setLorebookEntries(this.chatLorebook, [summaryEntry]);
                console.log("聊天总结已更新");
                
                // 重置轮数计数
                this.roundsSinceLastSummary = 0;
            }
        } catch (error) {
            console.error("生成聊天总结失败:", error);
        }
    }
    
    // 提取总结内容
    extractSummary(text) {
        const regex = /<summary>([\s\S]*?)<\/summary>/;
        const match = text.match(regex);
        return match ? match[1].trim() : text.trim();
    }
    
    // 断开连接时的清理
    async finalizeOnDisconnect() {
        if (!this.chatLorebook || !this.currentNpcId) return;
        
        console.log("连接清理中...");
        
        // 如果启用了断开时总结功能，且有未总结的对话，进行最终总结
        if (this.summarizeOnDisconnect && this.roundsSinceLastSummary > 0) {
            await this.generateSummary();
        }
        
        // 重置状态
        this.currentNpcId = null;
        this.chatLorebook = null;
        this.roundsSinceLastSummary = 0;
        this.entryUids = {
            fullHistory: null,
            recentChats: null,
            summary: null
        };
    }
    
    // 加载总结提示词
    async loadJsonFileWithRetry(path, maxRetries = 3, delay = 1000) {
        let lastError;
        // 删除本地硬编码的CDN URL
        
        // 确保path不会有双重扩展名问题
        const cleanPath = path.replace(/\.json\.json$/, '.json');
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // 使用全局CDN URL
                const fullUrl = window.cdnBaseUrl + cleanPath;
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
    
    // 加载总结提示词
    async loadSummaryPrompt() {
        return await this.loadJsonFileWithRetry(this.summaryPromptPath);
    }
    
    // 获取聊天总结和最近聊天内容（用于注入到AI提示中）
    async getChatContext() {
        if (!this.chatLorebook || !this.currentNpcId) {
            return { summary: null, recentChats: null };
        }
        
        try {
            const entries = await getLorebookEntries(this.chatLorebook);
            
            const summaryEntry = entries.find(e => e.uid === this.entryUids.summary);
            const recentChatsEntry = entries.find(e => e.uid === this.entryUids.recentChats);
            
            return {
                summary: summaryEntry ? summaryEntry.content : null,
                recentChats: recentChatsEntry ? recentChatsEntry.content : null
            };
        } catch (error) {
            console.error("获取聊天上下文失败:", error);
            return { summary: null, recentChats: null };
        }
    }
    
    // 设置配置参数
    setConfig(config) {
        if (config.recentChatRounds !== undefined) {
            this.recentChatRounds = config.recentChatRounds;
        }
        if (config.summarizeOnDisconnect !== undefined) {
            this.summarizeOnDisconnect = config.summarizeOnDisconnect;
        }
        if (config.summarizeEveryRounds !== undefined) {
            this.summarizeEveryRounds = config.summarizeEveryRounds;
        }
    }
}