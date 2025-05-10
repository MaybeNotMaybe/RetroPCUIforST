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
        if (!npcId) {
            console.error("初始化失败: NPC ID为空");
            return false;
        }
        
        this.currentNpcId = npcId;
        console.log(`初始化聊天历史管理器: NPC=${npcId}`);
        
        try {
            // 1. 获取或创建当前聊天的世界书
            this.chatLorebook = await getOrCreateChatLorebook();
            console.log(`聊天世界书创建/获取成功: ${this.chatLorebook}`);
            
            // 2. 确保世界书条目创建完成并获取到UID
            const entriesCreated = await this.ensureChatEntries();
            console.log(`条目初始化结果: ${entriesCreated ? "成功" : "失败"}`);
            console.log(`条目UID: 完整历史=${this.entryUids.fullHistory}, 最近聊天=${this.entryUids.recentChats}, 总结=${this.entryUids.summary}`);
            
            // 3. 验证所有必要的UID都已设置
            if (!this.entryUids.fullHistory || !this.entryUids.recentChats || !this.entryUids.summary) {
                console.error("初始化失败: 部分条目UID未设置");
                return false;
            }
            
            // 4. 重置轮数计数
            this.roundsSinceLastSummary = 0;
            
            return true;
        } catch (error) {
            console.error("初始化聊天历史管理器失败:", error);
            console.error("错误详情:", error.stack || "无堆栈信息");
            return false;
        }
    }
    
    // 确保NPC聊天的三个条目都存在
    async ensureChatEntries() {
        try {
            // 获取当前所有条目
            console.log(`获取世界书条目: ${this.chatLorebook}`);
            const entries = await getLorebookEntries(this.chatLorebook);
            
            if (!entries || entries.length === 0) {
                console.log("世界书为空或获取失败，将创建新条目");
            } else {
                console.log(`获取到${entries.length}个条目`);
            }
            
            // 为当前NPC准备条目名称前缀
            const prefix = `NPC_${this.currentNpcId}`;
            
            // 创建或查找所有必要条目
            await Promise.all([
                this.ensureFullHistoryEntry(entries, prefix),
                this.ensureRecentChatsEntry(entries, prefix),
                this.ensureSummaryEntry(entries, prefix)
            ]);
            
            // 检查是否所有UID都已设置
            const allUidsSet = 
                this.entryUids.fullHistory !== null && 
                this.entryUids.recentChats !== null && 
                this.entryUids.summary !== null;
                
            console.log(`所有条目UID设置状态: ${allUidsSet ? "完成" : "未完成"}`);
            return allUidsSet;
        } catch (error) {
            console.error("确保条目存在时出错:", error);
            return false;
        }
    }
    
    // 确保完整历史条目存在
    async ensureFullHistoryEntry(entries, prefix) {
        try {
            const fullHistoryEntry = entries.find(e => e.comment === `${prefix}_FullHistory`);
            if (fullHistoryEntry) {
                console.log(`找到完整历史条目: UID=${fullHistoryEntry.uid}`);
                this.entryUids.fullHistory = fullHistoryEntry.uid;
                return true;
            } else {
                console.log("未找到完整历史条目，创建新条目");
                const created = await this.createFullHistoryEntry(prefix);
                return created;
            }
        } catch (error) {
            console.error("确保完整历史条目存在时出错:", error);
            return false;
        }
    }
    
    // 确保最近聊天条目存在
    async ensureRecentChatsEntry(entries, prefix) {
        try {
            const recentChatsEntry = entries.find(e => e.comment === `${prefix}_RecentChats`);
            if (recentChatsEntry) {
                console.log(`找到最近聊天条目: UID=${recentChatsEntry.uid}`);
                this.entryUids.recentChats = recentChatsEntry.uid;
                return true;
            } else {
                console.log("未找到最近聊天条目，创建新条目");
                const created = await this.createRecentChatsEntry(prefix);
                return created;
            }
        } catch (error) {
            console.error("确保最近聊天条目存在时出错:", error);
            return false;
        }
    }
    
    // 确保聊天总结条目存在
    async ensureSummaryEntry(entries, prefix) {
        try {
            const summaryEntry = entries.find(e => e.comment === `${prefix}_Summary`);
            if (summaryEntry) {
                console.log(`找到聊天总结条目: UID=${summaryEntry.uid}`);
                this.entryUids.summary = summaryEntry.uid;
                return true;
            } else {
                console.log("未找到聊天总结条目，创建新条目");
                const created = await this.createSummaryEntry(prefix);
                return created;
            }
        } catch (error) {
            console.error("确保聊天总结条目存在时出错:", error);
            return false;
        }
    }
    
    // 创建全部聊天历史条目
    async createFullHistoryEntry(prefix) {
        try {
            console.log(`开始创建完整历史条目: ${prefix}_FullHistory`);
            const { new_uids } = await createLorebookEntries(this.chatLorebook, [{
                comment: `${prefix}_FullHistory`,
                enabled: false,
                type: 'selective',
                position: 'before_character_definition',
                keys: [this.currentNpcId],
                content: `与${this.currentNpcId}的完整聊天历史：\n\n`,
                logic: 'and_any'
            }]);
            
            if (!new_uids || new_uids.length === 0) {
                throw new Error("创建条目失败: 没有返回UID");
            }
            
            this.entryUids.fullHistory = new_uids[0];
            console.log(`创建了完整历史条目，UID: ${this.entryUids.fullHistory}`);
            
            // 验证条目确实被创建了
            const entries = await getLorebookEntries(this.chatLorebook);
            const entry = entries.find(e => e.uid === this.entryUids.fullHistory);
            if (!entry) {
                throw new Error("条目验证失败: 创建的条目未找到");
            }
            
            console.log(`完整历史条目创建并验证成功`);
            return true;
        } catch (error) {
            console.error("创建完整历史条目失败:", error);
            return false;
        }
    }
    
    // 创建最近聊天条目
    async createRecentChatsEntry(prefix) {
        try {
            console.log(`开始创建最近聊天条目: ${prefix}_RecentChats`);
            const { new_uids } = await createLorebookEntries(this.chatLorebook, [{
                comment: `${prefix}_RecentChats`,
                enabled: false,
                type: 'selective',
                position: 'before_character_definition',
                keys: [this.currentNpcId],
                content: `与${this.currentNpcId}的最近${this.recentChatRounds}轮对话：\n\n`,
                logic: 'and_any'
            }]);
            
            if (!new_uids || new_uids.length === 0) {
                throw new Error("创建条目失败: 没有返回UID");
            }
            
            this.entryUids.recentChats = new_uids[0];
            console.log(`创建了最近聊天条目，UID: ${this.entryUids.recentChats}`);
            
            // 验证条目确实被创建了
            const entries = await getLorebookEntries(this.chatLorebook);
            const entry = entries.find(e => e.uid === this.entryUids.recentChats);
            if (!entry) {
                throw new Error("条目验证失败: 创建的条目未找到");
            }
            
            console.log(`最近聊天条目创建并验证成功`);
            return true;
        } catch (error) {
            console.error("创建最近聊天条目失败:", error);
            return false;
        }
    }
    
    // 创建聊天总结条目
    async createSummaryEntry(prefix) {
        try {
            console.log(`开始创建聊天总结条目: ${prefix}_Summary`);
            const { new_uids } = await createLorebookEntries(this.chatLorebook, [{
                comment: `${prefix}_Summary`,
                enabled: true,
                type: 'constant',
                position: 'after_author_note',
                keys: [this.currentNpcId],
                content: `与${this.currentNpcId}的对话尚未开始。`,
                logic: 'and_any'
            }]);
            
            if (!new_uids || new_uids.length === 0) {
                throw new Error("创建条目失败: 没有返回UID");
            }
            
            this.entryUids.summary = new_uids[0];
            console.log(`创建了聊天总结条目，UID: ${this.entryUids.summary}`);
            
            // 验证条目确实被创建了
            const entries = await getLorebookEntries(this.chatLorebook);
            const entry = entries.find(e => e.uid === this.entryUids.summary);
            if (!entry) {
                throw new Error("条目验证失败: 创建的条目未找到");
            }
            
            console.log(`聊天总结条目创建并验证成功`);
            return true;
        } catch (error) {
            console.error("创建聊天总结条目失败:", error);
            return false;
        }
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
            console.error("错误详情:", error.stack || "无堆栈信息");
            return false;
        }
    }
    
    // 更新完整历史记录
    async updateFullHistory(chatEntry) {
        if (!this.entryUids.fullHistory) {
            console.error("更新完整历史失败: 未找到条目UID");
            // 尝试重新初始化条目
            await this.ensureChatEntries();
            // 如果初始化后依然没有UID，则返回失败
            if (!this.entryUids.fullHistory) {
                return false;
            }
        }
        
        try {
            // 获取当前条目
            console.log(`获取世界书条目，用于更新完整历史: ${this.chatLorebook}`);
            const entries = await getLorebookEntries(this.chatLorebook);
            
            if (!entries || entries.length === 0) {
                console.error("获取世界书条目失败或返回空");
                return false;
            }
            
            const entry = entries.find(e => e.uid === this.entryUids.fullHistory);
            
            if (!entry) {
                console.error(`未找到完整历史条目, UID: ${this.entryUids.fullHistory}`);
                // 尝试重新创建条目
                const prefix = `NPC_${this.currentNpcId}`;
                await this.createFullHistoryEntry(prefix);
                // 获取新创建的条目
                const newEntries = await getLorebookEntries(this.chatLorebook);
                const newEntry = newEntries.find(e => e.uid === this.entryUids.fullHistory);
                if (!newEntry) {
                    return false;
                }
                return await this.updateEntryContent(newEntry, newEntry.content + chatEntry);
            }
            
            console.log(`找到完整历史条目, 当前长度: ${entry.content.length}字符`);
            
            // 添加新聊天到历史记录末尾
            return await this.updateEntryContent(entry, entry.content + chatEntry);
        } catch (error) {
            console.error("更新完整历史记录失败:", error);
            console.error("错误详情:", error.stack || "无堆栈信息");
            return false;
        }
    }
    
    // 更新最近聊天记录
    async updateRecentChats(chatEntry) {
        if (!this.entryUids.recentChats) {
            console.error("更新最近聊天失败: 未找到条目UID");
            // 尝试重新初始化条目
            await this.ensureChatEntries();
            // 如果初始化后依然没有UID，则返回失败
            if (!this.entryUids.recentChats) {
                return false;
            }
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
                // 尝试重新创建条目
                const prefix = `NPC_${this.currentNpcId}`;
                await this.createRecentChatsEntry(prefix);
                // 获取新创建的条目
                const newEntries = await getLorebookEntries(this.chatLorebook);
                const newEntry = newEntries.find(e => e.uid === this.entryUids.recentChats);
                if (!newEntry) {
                    return false;
                }
                
                // 准备新条目内容
                const header = `与${this.currentNpcId}的最近${this.recentChatRounds}轮对话：\n\n`;
                return await this.updateEntryContent(newEntry, header + chatEntry);
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
            const newContent = header + content;
            return await this.updateEntryContent(entry, newContent);
        } catch (error) {
            console.error("更新最近聊天记录失败:", error);
            console.error("错误详情:", error.stack || "无堆栈信息");
            return false;
        }
    }
    
    // 通用条目内容更新方法
    async updateEntryContent(entry, newContent) {
        try {
            if (!entry || !entry.uid || typeof entry.uid !== 'number') {
                console.error("条目无效或UID类型错误:", entry);
                return false;
            }
            
            console.log(`准备更新条目, UID=${entry.uid}, 内容长度=${newContent.length}字符`);
            
            // 创建一个只包含必要字段的更新对象
            const updateEntry = {
                uid: entry.uid,
                content: newContent
            };
            
            await setLorebookEntries(this.chatLorebook, [updateEntry]);
            
            // 验证更新是否成功
            const verifyEntries = await getLorebookEntries(this.chatLorebook);
            const verifyEntry = verifyEntries.find(e => e.uid === entry.uid);
            
            if (!verifyEntry) {
                console.error("条目验证失败: 条目不存在");
                return false;
            }
            
            if (verifyEntry.content !== newContent) {
                console.error("条目验证失败: 内容未正确更新");
                console.log("期望内容长度:", newContent.length);
                console.log("实际内容长度:", verifyEntry.content.length);
                return false;
            }
            
            console.log(`条目更新成功并已验证`);
            return true;
        } catch (error) {
            console.error("更新条目内容失败:", error);
            return false;
        }
    }
    
    // 生成对话总结
    async generateSummary() {
        if (!this.entryUids.summary || !this.entryUids.recentChats) {
            console.error("生成总结失败: 缺少必要的条目UID");
            return false;
        }
        
        try {
            console.log("开始生成聊天总结...");
            
            // 1. 获取当前条目
            const entries = await getLorebookEntries(this.chatLorebook);
            const summaryEntry = entries.find(e => e.uid === this.entryUids.summary);
            const recentChatsEntry = entries.find(e => e.uid === this.entryUids.recentChats);
            
            if (!summaryEntry || !recentChatsEntry) {
                console.error("找不到总结或最近聊天条目");
                return false;
            }
            
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
                
                console.log("正在生成聊天总结...");
                
                // 4. 调用AI生成总结
                const newSummary = await generate({
                    user_input: userInput,
                    should_stream: false
                });
                
                console.log("总结生成完毕，准备提取内容");
                
                // 5. 提取总结内容
                const extractedSummary = this.extractSummary(newSummary);
                if (extractedSummary) {
                    console.log(`提取的总结内容长度: ${extractedSummary.length}字符`);
                    
                    // 更新总结条目
                    const updated = await this.updateEntryContent(summaryEntry, extractedSummary);
                    if (updated) {
                        console.log("聊天总结已成功更新");
                        // 重置轮数计数
                        this.roundsSinceLastSummary = 0;
                        return true;
                    } else {
                        console.error("聊天总结更新失败");
                        return false;
                    }
                } else {
                    console.error("无法从AI响应中提取有效的总结内容");
                    return false;
                }
            } finally {
                // 6. 禁用总结提示词条目 - 确保即使发生错误也会执行
                await this.toggleSummaryPrompt(false);
            }
        } catch (error) {
            console.error("生成聊天总结失败:", error);
            return false;
        }
    }
    
    // 提取总结内容
    extractSummary(text) {
        try {
            // 首先尝试使用<summary>标签提取
            const regex = /<summary>([\s\S]*?)<\/summary>/;
            const match = text.match(regex);
            
            if (match && match[1]) {
                console.log("使用<summary>标签提取成功");
                return match[1].trim();
            }
            
            // 如果没有找到标签，则返回整个文本
            console.log("未找到<summary>标签，使用整个响应文本");
            return text.trim();
        } catch (error) {
            console.error("提取总结内容时出错:", error);
            return text.trim(); // 出错时返回原始文本
        }
    }
    
    // 断开连接时的清理
    async finalizeOnDisconnect() {
        if (!this.chatLorebook || !this.currentNpcId) {
            console.log("无需清理: 没有活动的聊天会话");
            return;
        }
        
        console.log("连接清理中...");
        
        try {
            // 如果启用了断开时总结功能，且有未总结的对话，进行最终总结
            if (this.summarizeOnDisconnect && this.roundsSinceLastSummary > 0) {
                console.log(`断开连接前进行最终总结，未总结的对话轮数: ${this.roundsSinceLastSummary}`);
                await this.generateSummary();
            }
        } catch (error) {
            console.error("断开连接时的清理操作失败:", error);
        } finally {
            // 重置状态（无论是否出错都要执行）
            console.log("重置聊天会话状态");
            this.currentNpcId = null;
            this.chatLorebook = null;
            this.roundsSinceLastSummary = 0;
            this.entryUids = {
                fullHistory: null,
                recentChats: null,
                summary: null
            };
        }
    }
    
    // 获取聊天总结和最近聊天内容（用于注入到AI提示中）
    async getChatContext() {
        if (!this.chatLorebook || !this.currentNpcId) {
            console.log("获取聊天上下文失败: 没有活动的聊天会话");
            return { summary: null, recentChats: null };
        }
        
        try {
            console.log("正在获取聊天上下文...");
            
            // 验证UID是否存在
            if (!this.entryUids.summary || !this.entryUids.recentChats) {
                console.error("获取聊天上下文失败: 条目UID未设置");
                return { summary: null, recentChats: null };
            }
            
            const entries = await getLorebookEntries(this.chatLorebook);
            
            if (!entries || entries.length === 0) {
                console.error("获取世界书条目失败或返回空");
                return { summary: null, recentChats: null };
            }
            
            const summaryEntry = entries.find(e => e.uid === this.entryUids.summary);
            const recentChatsEntry = entries.find(e => e.uid === this.entryUids.recentChats);
            
            if (!summaryEntry) {
                console.error(`未找到聊天总结条目, UID: ${this.entryUids.summary}`);
            }
            
            if (!recentChatsEntry) {
                console.error(`未找到最近聊天条目, UID: ${this.entryUids.recentChats}`);
            }
            
            const context = {
                summary: summaryEntry ? summaryEntry.content : null,
                recentChats: recentChatsEntry ? recentChatsEntry.content : null
            };
            
            console.log("聊天上下文获取成功");
            
            // 记录内容长度（不打印完整内容以避免日志过长）
            if (context.summary) {
                console.log(`聊天总结长度: ${context.summary.length}字符`);
            }
            if (context.recentChats) {
                console.log(`最近聊天长度: ${context.recentChats.length}字符`);
            }
            
            return context;
        } catch (error) {
            console.error("获取聊天上下文失败:", error);
            return { summary: null, recentChats: null };
        }
    }
    
    // 设置配置参数
    setConfig(config) {
        if (!config) return;
        
        if (config.recentChatRounds !== undefined) {
            this.recentChatRounds = config.recentChatRounds;
            console.log(`设置最近聊天轮数: ${this.recentChatRounds}`);
        }
        if (config.summarizeOnDisconnect !== undefined) {
            this.summarizeOnDisconnect = config.summarizeOnDisconnect;
            console.log(`设置断开连接时总结: ${this.summarizeOnDisconnect}`);
        }
        if (config.summarizeEveryRounds !== undefined) {
            this.summarizeEveryRounds = config.summarizeEveryRounds;
            console.log(`设置总结间隔轮数: ${this.summarizeEveryRounds}`);
        }
    }

    // 控制总结提示词的开关
    async toggleSummaryPrompt(enable) {
        try {
            console.log(`${enable ? '启用' : '禁用'}总结提示词条目`);
            
            // 获取当前角色卡的主要世界书
            const primaryLorebook = getCurrentCharPrimaryLorebook();
            
            if (!primaryLorebook) {
                console.error("当前角色卡没有绑定主要世界书");
                return false;
            }
            
            const result = await LorebookUtils.toggleLorebookEntry(primaryLorebook, "summary_prompt", enable);
            console.log(`总结提示词条目${enable ? '启用' : '禁用'}结果: ${result ? "成功" : "失败"}`);
            return result;
        } catch (error) {
            console.error(`${enable ? '启用' : '禁用'}总结提示词时出错`, error);
            return false;
        }
    }
}