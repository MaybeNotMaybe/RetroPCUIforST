// js/managers/NpcChatHistoryManager.js
class NpcChatHistoryManager {
    constructor() {
        // 基本配置
        this.config = {
            recentChatRounds: 8,         // 保留最近的聊天轮数
            summarizeEveryRounds: 8,     // 每多少轮生成一次摘要
            summarizeOnDisconnect: true  // 断开连接时是否生成摘要
        };
        
        // 当前状态
        this.state = {
            initialized: false,           // 是否已初始化
            npcId: null,                  // 当前NPC ID
            roundsSinceLastSummary: 0,    // 自上次摘要后的对话轮数
            lorebookName: null            // 世界书名称
        };
        
        // 条目UID缓存
        this.entryUids = {
            fullHistory: null,
            recentChats: null,
            summary: null
        };
        
        // 重试设置
        this.retryOptions = {
            maxRetries: 3,               // 最大重试次数
            retryDelay: 500,             // 初始重试延迟(ms)
            retryMultiplier: 1.5         // 重试延迟倍增因子
        };
    }
    
    // 设置配置
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    
    // 初始化管理器
    async initialize(npcId) {
        if (!npcId) {
            console.error("初始化失败: 未提供NPC ID");
            return false;
        }
        
        try {
            // 重置状态
            this.state = {
                initialized: false,
                npcId,
                roundsSinceLastSummary: 0,
                lorebookName: null
            };
            
            // 获取或创建聊天世界书
            this.state.lorebookName = await getOrCreateChatLorebook();
            console.log(`已获取聊天世界书: ${this.state.lorebookName}`);
            
            // 确保必要的条目存在
            await this._ensureRequiredEntries();
            
            // 标记为已初始化
            this.state.initialized = true;
            return true;
        } catch (error) {
            console.error(`初始化聊天历史管理器失败 (NPC: ${npcId}):`, error);
            return false;
        }
    }
    
    // 添加聊天记录
    async addChat(userMessage, npcResponse) {
        // 验证状态
        if (!this._validateState()) {
            return false;
        }
        
        try {
            // 格式化聊天记录
            const chatEntry = this._formatChatEntry(userMessage, npcResponse);
            
            // 同时更新两个条目
            const [fullHistoryUpdated, recentChatsUpdated] = await Promise.all([
                this._updateEntry('fullHistory', entry => {
                    // 追加到全部历史
                    return { ...entry, content: entry.content + chatEntry };
                }),
                this._updateEntry('recentChats', entry => {
                    // 更新最近聊天，保留指定轮数
                    return this._updateRecentChatsContent(entry, chatEntry);
                })
            ]);
            
            // 任一更新成功即视为成功
            const updateSuccessful = fullHistoryUpdated || recentChatsUpdated;
            
            // 如果更新成功，增加轮数计数
            if (updateSuccessful) {
                this.state.roundsSinceLastSummary++;
                
                // 检查是否需要生成摘要
                if (this.state.roundsSinceLastSummary >= this.config.summarizeEveryRounds) {
                    await this.generateSummary();
                }
            }
            
            return updateSuccessful;
        } catch (error) {
            console.error(`添加聊天记录失败 (NPC: ${this.state.npcId}):`, error);
            return false;
        }
    }
    
    // 获取聊天上下文
    async getChatContext() {
        // 验证状态
        if (!this._validateState()) {
            return { summary: null, recentChats: null };
        }
        
        try {
            // 获取所有条目
            const entries = await this._getEntries();
            
            // 查找摘要和最近聊天条目
            const summaryEntry = entries.find(e => e.uid === this.entryUids.summary);
            const recentChatsEntry = entries.find(e => e.uid === this.entryUids.recentChats);
            
            return {
                summary: summaryEntry ? summaryEntry.content : null,
                recentChats: recentChatsEntry ? recentChatsEntry.content : null
            };
        } catch (error) {
            console.error(`获取聊天上下文失败 (NPC: ${this.state.npcId}):`, error);
            return { summary: null, recentChats: null };
        }
    }
    
    // 在断开连接时执行清理
    async finalizeOnDisconnect() {
        // 验证状态
        if (!this._validateState()) {
            return false;
        }
        
        try {
            console.log(`执行断开连接清理 (NPC: ${this.state.npcId})...`);
            
            // 如果启用了断开时总结，且有未总结的对话，则生成最终摘要
            if (this.config.summarizeOnDisconnect && this.state.roundsSinceLastSummary > 0) {
                await this.generateSummary();
            }
            
            // 重置状态
            this._resetState();
            return true;
        } catch (error) {
            console.error(`断开连接清理失败 (NPC: ${this.state.npcId}):`, error);
            return false;
        }
    }
    
    // 生成对话摘要
    async generateSummary() {
        // 验证状态
        if (!this._validateState()) {
            return false;
        }
        
        try {
            console.log(`开始生成聊天摘要 (NPC: ${this.state.npcId})...`);
            
            // 获取条目
            const entries = await this._getEntries();
            const summaryEntry = entries.find(e => e.uid === this.entryUids.summary);
            const recentChatsEntry = entries.find(e => e.uid === this.entryUids.recentChats);
            
            if (!summaryEntry || !recentChatsEntry) {
                console.error("生成摘要失败: 未找到必要的条目");
                return false;
            }
            
            // 启用摘要提示词
            await this._toggleSummaryPrompt(true);
            
            try {
                // 构建提示词
                const currentSummary = summaryEntry.content;
                const recentChats = recentChatsEntry.content;
                
                const userInput = 
                    `请根据以下最近的对话和现有总结，生成一份新的300-400字的总结。` +
                    `总结应该捕捉对话的要点和关键信息。\n\n` +
                    `现有总结:\n${currentSummary}\n\n` +
                    `最近对话:\n${recentChats}`;
                
                // 生成摘要
                const response = await generate({
                    user_input: userInput,
                    should_stream: false
                });
                
                // 提取摘要内容
                const newSummary = this._extractSummary(response);
                
                if (newSummary) {
                    // 更新摘要条目
                    await this._updateEntry('summary', entry => {
                        return { ...entry, content: newSummary };
                    });
                    
                    // 重置轮数计数
                    this.state.roundsSinceLastSummary = 0;
                    return true;
                }
                
                return false;
            } finally {
                // 确保总是禁用摘要提示词
                await this._toggleSummaryPrompt(false);
            }
        } catch (error) {
            console.error(`生成摘要失败 (NPC: ${this.state.npcId}):`, error);
            return false;
        }
    }
    
    // ---------- 私有辅助方法 ----------
    
    // 重置状态
    _resetState() {
        this.state = {
            initialized: false,
            npcId: null,
            roundsSinceLastSummary: 0,
            lorebookName: null
        };
        
        this.entryUids = {
            fullHistory: null,
            recentChats: null,
            summary: null
        };
    }
    
    // 验证当前状态
    _validateState() {
        if (!this.state.initialized || !this.state.npcId || !this.state.lorebookName) {
            console.error("操作失败: 聊天历史管理器未正确初始化");
            return false;
        }
        
        return true;
    }
    
    // 确保必要的条目存在
    async _ensureRequiredEntries() {
        try {
            // 获取所有条目
            const entries = await this._getEntries();
            
            // 为当前NPC准备条目名称前缀
            const prefix = `NPC_${this.state.npcId}`;
            
            // 检查并创建条目
            const entriesConfig = [
                {
                    type: 'fullHistory',
                    comment: `${prefix}_FullHistory`,
                    template: {
                        enabled: false,
                        type: 'selective',
                        position: 'before_character_definition',
                        keys: [this.state.npcId],
                        content: `与${this.state.npcId}的完整聊天历史：\n\n`,
                        logic: 'and_any'
                    }
                },
                {
                    type: 'recentChats',
                    comment: `${prefix}_RecentChats`,
                    template: {
                        enabled: false,
                        type: 'selective',
                        position: 'before_character_definition',
                        keys: [this.state.npcId],
                        content: `与${this.state.npcId}的最近${this.config.recentChatRounds}轮对话：\n\n`,
                        logic: 'and_any'
                    }
                },
                {
                    type: 'summary',
                    comment: `${prefix}_Summary`,
                    template: {
                        enabled: true,
                        type: 'constant',
                        position: 'after_author_note',
                        keys: [this.state.npcId],
                        content: `与${this.state.npcId}的对话尚未开始。`,
                        logic: 'and_any'
                    }
                }
            ];
            
            // 检查和创建所有必要条目
            for (const config of entriesConfig) {
                const existingEntry = entries.find(e => e.comment === config.comment);
                
                if (existingEntry) {
                    // 如果条目已存在，记录UID
                    this.entryUids[config.type] = existingEntry.uid;
                    console.log(`找到${config.type}条目，UID: ${existingEntry.uid}`);
                } else {
                    // 如果条目不存在，创建新条目
                    const { new_uids } = await createLorebookEntries(
                        this.state.lorebookName, 
                        [config.template]
                    );
                    
                    this.entryUids[config.type] = new_uids[0];
                    console.log(`创建了${config.type}条目，UID: ${new_uids[0]}`);
                }
            }
            
            return true;
        } catch (error) {
            console.error("确保必要条目存在时出错:", error);
            throw error;
        }
    }
    
    // 带重试的获取世界书条目
    async _getEntries() {
        const { maxRetries, retryDelay, retryMultiplier } = this.retryOptions;
        let delay = retryDelay;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const entries = await getLorebookEntries(this.state.lorebookName);
                
                if (!entries || entries.length === 0) {
                    throw new Error("获取世界书条目返回空结果");
                }
                
                return entries;
            } catch (error) {
                if (attempt < maxRetries) {
                    console.warn(`获取世界书条目尝试 ${attempt}/${maxRetries} 失败，将在 ${delay}ms 后重试:`, error);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= retryMultiplier;
                } else {
                    console.error(`获取世界书条目在 ${maxRetries} 次尝试后仍然失败:`, error);
                    throw error;
                }
            }
        }
    }
    
    // 更新条目
    async _updateEntry(entryType, updater) {
        if (!this.entryUids[entryType]) {
            console.error(`更新条目失败: ${entryType} 的UID未设置`);
            return false;
        }
        
        const { maxRetries, retryDelay, retryMultiplier } = this.retryOptions;
        let delay = retryDelay;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // 获取条目
                const entries = await this._getEntries();
                const entry = entries.find(e => e.uid === this.entryUids[entryType]);
                
                if (!entry) {
                    throw new Error(`未找到${entryType}条目，UID: ${this.entryUids[entryType]}`);
                }
                
                // 使用更新函数更新条目
                const updatedEntry = updater(entry);
                
                // 保存更新后的条目
                await setLorebookEntries(this.state.lorebookName, [updatedEntry]);
                console.log(`${entryType}条目更新成功`);
                
                return true;
            } catch (error) {
                if (attempt < maxRetries) {
                    console.warn(`更新${entryType}条目尝试 ${attempt}/${maxRetries} 失败，将在 ${delay}ms 后重试:`, error);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= retryMultiplier;
                } else {
                    console.error(`更新${entryType}条目在 ${maxRetries} 次尝试后仍然失败:`, error);
                    return false;
                }
            }
        }
    }
    
    // 更新最近聊天内容
    _updateRecentChatsContent(entry, newChat) {
        // 提取基本标题
        const header = `与${this.state.npcId}的最近${this.config.recentChatRounds}轮对话：\n\n`;
        
        // 移除标题获取纯内容
        let content = entry.content.replace(header, '');
        
        // 添加新聊天
        content += newChat;
        
        // 保留最近的N轮对话
        const rounds = content.split('\n\n').filter(r => r.trim() !== '');
        
        if (rounds.length > this.config.recentChatRounds) {
            rounds.splice(0, rounds.length - this.config.recentChatRounds);
            content = rounds.join('\n\n') + (rounds.length > 0 ? '\n\n' : '');
        }
        
        // 重新添加标题
        return { ...entry, content: header + content };
    }
    
    // 格式化聊天条目
    _formatChatEntry(userMessage, npcResponse) {
        const timestamp = new Date().toLocaleString();
        return `[${timestamp}]\n用户: ${userMessage}\n${this.state.npcId}: ${npcResponse}\n\n`;
    }
    
    // 提取摘要内容
    _extractSummary(text) {
        // 首先尝试从<summary>标签中提取
        const regex = /<summary>([\s\S]*?)<\/summary>/;
        const match = text.match(regex);
        
        // 如果有标签匹配，返回标签内容；否则返回整个文本
        return match ? match[1].trim() : text.trim();
    }
    
    // 控制摘要提示词的开关
    async _toggleSummaryPrompt(enable) {
        try {
            // 获取当前角色卡的主要世界书
            const primaryLorebook = getCurrentCharPrimaryLorebook();
            
            if (!primaryLorebook) {
                console.error("切换摘要提示词失败: 未找到主要世界书");
                return false;
            }
            
            // 使用工具类切换条目
            return await LorebookUtils.toggleLorebookEntry(primaryLorebook, "summary_prompt", enable);
        } catch (error) {
            console.error(`${enable ? '启用' : '禁用'}摘要提示词失败:`, error);
            return false;
        }
    }
}