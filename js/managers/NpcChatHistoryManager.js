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
        if (!this.chatLorebook || !this.currentNpcId) {
            console.error("添加聊天失败: 世界书或NPC ID未设置");
            return false;
        }
        
        try {
            // 格式化聊天记录
            const timestamp = new Date().toLocaleString();
            const chatEntry = `[${timestamp}]\n用户: ${userMessage}\n${this.currentNpcId}: ${npcResponse}\n\n`;
            
            console.log(`正在添加聊天记录, NPC: ${this.currentNpcId}, 长度: ${chatEntry.length}字符`);
            
            // 1. 更新完整历史记录
            const fullHistoryUpdated = await this.updateFullHistory(chatEntry);
            if (!fullHistoryUpdated) {
                console.warn("完整历史记录更新失败");
            }
            
            // 2. 更新最近聊天记录
            const recentChatsUpdated = await this.updateRecentChats(chatEntry);
            if (!recentChatsUpdated) {
                console.warn("最近聊天记录更新失败");
            }
            
            // 3. 增加轮数计数
            this.roundsSinceLastSummary++;
            console.log(`自上次摘要后的对话轮数: ${this.roundsSinceLastSummary}`);
            
            // 4. 检查是否需要进行总结
            if (this.roundsSinceLastSummary >= this.summarizeEveryRounds) {
                await this.generateSummary();
            }
            
            return fullHistoryUpdated || recentChatsUpdated;
        } catch (error) {
            console.error("添加聊天记录失败:", error);
            return false;
        }
    }
    
    // 更新完整历史记录
    async updateFullHistory(chatEntry) {
        if (!this.entryUids.fullHistory) {
            console.error("更新完整历史失败: 未找到条目UID");
            return false;
        }
        
        try {
            // 获取当前条目
            console.log(`获取世界书条目: ${this.chatLorebook}`);
            const entries = await getLorebookEntries(this.chatLorebook);
            
            if (!entries || entries.length === 0) {
                console.error("获取世界书条目失败或返回空");
                return false;
            }
            
            const entry = entries.find(e => e.uid === this.entryUids.fullHistory);
            
            if (!entry) {
                console.error(`未找到完整历史条目, UID: ${this.entryUids.fullHistory}`);
                // 尝试重新初始化
                await this.ensureChatEntries();
                return false;
            }
            
            console.log(`找到完整历史条目, 当前长度: ${entry.content.length}字符`);
            
            // 添加新聊天到历史记录末尾
            entry.content += chatEntry;
            
            // 更新条目
            console.log(`正在更新完整历史条目...`);
            await setLorebookEntries(this.chatLorebook, [entry]);
            console.log(`完整历史条目更新成功`);
            
            return true;
        } catch (error) {
            console.error("更新完整历史记录失败:", error);
            return false;
        }
    }
    
    // 更新最近聊天记录
    async updateRecentChats(chatEntry) {
        if (!this.entryUids.recentChats) {
            console.error("更新最近聊天失败: 未找到条目UID");
            return false;
        }
        
        try {
            // 获取当前条目
            console.log(`获取世界书条目: ${this.chatLorebook}, 用于最近聊天记录`);
            const entries = await getLorebookEntries(this.chatLorebook);
            
            if (!entries || entries.length === 0) {
                console.error("获取世界书条目失败或返回空");
                return false;
            }
            
            const entry = entries.find(e => e.uid === this.entryUids.recentChats);
            
            if (!entry) {
                console.error(`未找到最近聊天条目, UID: ${this.entryUids.recentChats}`);
                // 尝试重新初始化
                await this.ensureChatEntries();
                return false;
            }
            
            console.log(`找到最近聊天条目, 当前长度: ${entry.content.length}字符`);
            
            // 分割聊天记录
            const header = `与${this.currentNpcId}的最近${this.recentChatRounds}轮对话：\n\n`;
            let content = entry.content.replace(header, '');
            
            // 添加新聊天
            content += chatEntry;
            
            // 保留最近的N轮对话
            const rounds = content.split('\n\n').filter(r => r.trim() !== '');
            console.log(`当前对话轮数: ${rounds.length}, 最大保留轮数: ${this.recentChatRounds}`);
            
            if (rounds.length > this.recentChatRounds) {
                console.log(`超出最大轮数，正在裁剪最早的 ${rounds.length - this.recentChatRounds} 轮对话`);
                rounds.splice(0, rounds.length - this.recentChatRounds);
                content = rounds.join('\n\n') + (rounds.length > 0 ? '\n\n' : '');
            }
            
            // 更新条目
            entry.content = header + content;
            console.log(`正在更新最近聊天条目，更新后长度: ${entry.content.length}字符`);
            
            // 先检查条目是否有效
            if (!entry.uid || typeof entry.uid !== 'number') {
                console.error("最近聊天条目UID无效，无法更新");
                return false;
            }
            
            await setLorebookEntries(this.chatLorebook, [entry]);
            console.log(`最近聊天条目更新成功`);
            
            return true;
        } catch (error) {
            console.error("更新最近聊天记录失败:", error);
            console.error("错误详情:", error.stack || "无堆栈信息");
            return false;
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
            
            // 2. 启用总结提示词条目
            await this.toggleSummaryPrompt(true);
            
            try {
                // 3. 构建提示词并生成总结
                const currentSummary = summaryEntry.content;
                const recentChats = recentChatsEntry.content;
                
                const userInput = 
                    `请根据以下最近的对话和现有总结，生成一份新的300-400字的总结。` +
                    `总结应该捕捉对话的要点和关键信息。\n\n` +
                    `现有总结:\n${currentSummary}\n\n` +
                    `最近对话:\n${recentChats}`;
                
                // 4. 调用AI生成总结
                const newSummary = await generate({
                    user_input: userInput,
                    should_stream: false
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
            } finally {
                // 6. 禁用总结提示词条目 - 确保即使发生错误也会执行
                await this.toggleSummaryPrompt(false);
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

    // 控制总结提示词的开关
    async toggleSummaryPrompt(enable) {
        try {
            // 获取当前角色卡的主要世界书
            const primaryLorebook = getCurrentCharPrimaryLorebook();
            
            if (!primaryLorebook) {
                console.error("当前角色卡没有绑定主要世界书");
                return false;
            }
            
            return await LorebookUtils.toggleLorebookEntry(primaryLorebook, "summary_prompt", enable);
        } catch (error) {
            console.error(`${enable ? '启用' : '禁用'}总结提示词时出错`, error);
            return false;
        }
    }
}