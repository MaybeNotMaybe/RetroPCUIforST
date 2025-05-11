// js/models/npcChatModel.js
class NpcChatModel {
    constructor() {
        // NPC状态信息
        this.activeNpc = null;
        this.isGenerating = false;
        this.lorebookReady = false;
        
        // 聊天记录和内部状态
        this.chatLorebook = null;
        this.conversationCounts = {};
        
        // NPC信息条目命名规则
        this.NPC_INFO_PREFIX = "npc_";
        this.NPC_INFO_SUFFIX_A = "_A";
        this.NPC_INFO_SUFFIX_B = "_B";
        
        // 聊天记录条目命名规则
        this.CHAT_HISTORY_PREFIX = "chat_history_";
        this.CHAT_RECENT_PREFIX = "chat_recent_";
        this.CHAT_SUMMARY_PREFIX = "chat_summary_";
        
        // 通用提示词条目名
        this.PROMPT_MESSAGE_KEY = "prompt_message";
    }

    //初始化聊天系统，确保存在聊天世界书
    async initialize() {
        try {
            // 获取或创建聊天世界书
            this.chatLorebook = await getOrCreateChatLorebook();
            console.log("NPC聊天系统初始化完成，使用世界书:", this.chatLorebook);
            this.lorebookReady = true;
            
            // 发布初始化完成事件
            EventBus.emit('npcChatInitialized', true);
            return true;
        } catch (error) {
            console.error("NPC聊天系统初始化失败:", error);
            return false;
        }
    }

    /**
     * 获取NPC信息
     * @param {string} npcId - NPC标识符
     * @returns {Promise<{infoA: object, infoB: object}>} - NPC两个信息条目
     */
    async getNpcInfo(npcId) {
        if (!this.lorebookReady) await this.initialize();
        
        try {
            // 获取当前角色卡的所有lorebook条目
            const charLorebooks = getCharLorebooks();
            const primaryLorebook = charLorebooks.primary;
            
            if (!primaryLorebook) {
                throw new Error("角色卡未绑定主要世界书");
            }
            
            // 获取所有条目
            const entries = await getLorebookEntries(primaryLorebook);
            
            // 查找NPC信息条目
            const commentA = this.NPC_INFO_PREFIX + npcId + this.NPC_INFO_SUFFIX_A;
            const commentB = this.NPC_INFO_PREFIX + npcId + this.NPC_INFO_SUFFIX_B;
            
            const infoA = entries.find(e => e.comment === commentA);
            const infoB = entries.find(e => e.comment === commentB);
            
            if (!infoA || !infoB) {
                throw new Error(`未找到NPC "${npcId}"的信息条目`);
            }
            
            return { infoA, infoB };
        } catch (error) {
            console.error(`获取NPC ${npcId}信息失败:`, error);
            throw error;
        }
    }

    /**
     * 确保NPC的聊天记录条目存在
     * @param {string} npcId - NPC标识符
     */
    async ensureChatRecords(npcId) {
        if (!this.chatLorebook) await this.initialize();
        
        try {
            // 获取当前聊天世界书的所有条目
            const entries = await getLorebookEntries(this.chatLorebook);
            
            // 构建三个聊天记录条目的评论标识符
            const historyComment = this.CHAT_HISTORY_PREFIX + npcId;
            const recentComment = this.CHAT_RECENT_PREFIX + npcId;
            const summaryComment = this.CHAT_SUMMARY_PREFIX + npcId;
            
            // 查找现有条目
            const historyEntry = entries.find(e => e.comment === historyComment);
            const recentEntry = entries.find(e => e.comment === recentComment);
            const summaryEntry = entries.find(e => e.comment === summaryComment);
            
            // 创建需要创建的条目数组
            const entriesToCreate = [];
            
            // 检查并准备创建全部历史记录条目
            if (!historyEntry) {
                entriesToCreate.push({
                    comment: historyComment,
                    enabled: false,
                    type: 'selective',
                    position: 'before_character_definition',
                    keys: [],
                    content: `# 与${npcId}的全部聊天历史\n\n`
                });
            }
            
            // 检查并准备创建最近聊天条目
            if (!recentEntry) {
                entriesToCreate.push({
                    comment: recentComment,
                    enabled: false,
                    type: 'selective',
                    position: 'before_character_definition',
                    keys: [],
                    content: `# 与${npcId}的最近5轮聊天\n\n`
                });
            }
            
            // 检查并准备创建聊天摘要条目
            if (!summaryEntry) {
                entriesToCreate.push({
                    comment: summaryComment,
                    enabled: true,
                    type: 'constant',
                    position: 'after_author_note',
                    keys: [],
                    content: `# 与${npcId}的聊天摘要\n\n尚无聊天记录。`
                });
            }
            
            // 如果有需要创建的条目，批量创建
            if (entriesToCreate.length > 0) {
                await createLorebookEntries(this.chatLorebook, entriesToCreate);
                console.log(`为NPC ${npcId}创建了${entriesToCreate.length}个聊天记录条目`);
            }
            
            // 初始化此NPC的对话计数
            if (!this.conversationCounts[npcId]) {
                this.conversationCounts[npcId] = 0;
            }
            
            return true;
        } catch (error) {
            console.error(`确保NPC ${npcId}聊天记录失败:`, error);
            throw error;
        }
    }

    /**
     * 更新NPC的聊天记录
     * @param {string} npcId - NPC标识符
     * @param {string} userMessage - 用户消息
     * @param {string} npcReply - NPC回复
     */
    async updateChatRecords(npcId, userMessage, npcReply) {
        if (!this.chatLorebook) await this.initialize();
        
        try {
            // 获取当前聊天世界书的所有条目
            const entries = await getLorebookEntries(this.chatLorebook);
            
            // 查找三个聊天记录条目
            const historyComment = this.CHAT_HISTORY_PREFIX + npcId;
            const recentComment = this.CHAT_RECENT_PREFIX + npcId;
            const summaryComment = this.CHAT_SUMMARY_PREFIX + npcId;
            
            const historyEntry = entries.find(e => e.comment === historyComment);
            const recentEntry = entries.find(e => e.comment === recentComment);
            const summaryEntry = entries.find(e => e.comment === summaryComment);
            
            if (!historyEntry || !recentEntry || !summaryEntry) {
                await this.ensureChatRecords(npcId);
                return await this.updateChatRecords(npcId, userMessage, npcReply);
            }
            
            // 获取当前时间
            const now = new Date();
            const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
            
            // 构建新的对话记录
            const newConversation = `## ${timestamp}\n\n**玩家:** ${userMessage}\n\n**${npcId}:** ${npcReply}\n\n`;
            
            // 更新全部历史记录
            const updatedHistoryContent = historyEntry.content + newConversation;
            
            // 更新最近5轮对话
            let recentLines = recentEntry.content.split('\n\n');
            if (recentLines.length > 11) { // 标题 + 5轮对话(每轮2段) = 11行
                recentLines = recentLines.slice(0, 1).concat(recentLines.slice(3)); // 保留标题，移除最旧的一轮
            }
            recentLines.push(newConversation);
            const updatedRecentContent = recentLines.join('\n\n');
            
            // 更新条目
            const updatedEntries = [
                {
                    uid: historyEntry.uid,
                    content: updatedHistoryContent
                },
                {
                    uid: recentEntry.uid,
                    content: updatedRecentContent
                }
            ];
            
            // 增加对话计数
            this.conversationCounts[npcId] = (this.conversationCounts[npcId] || 0) + 1;
            
            // 检查是否需要更新摘要(每5次对话)
            if (this.conversationCounts[npcId] % 5 === 0) {
                await this.generateChatSummary(npcId, recentEntry, summaryEntry);
            }
            
            // 保存更新后的聊天记录
            await setLorebookEntries(this.chatLorebook, updatedEntries);
            
            return true;
        } catch (error) {
            console.error(`更新NPC ${npcId}聊天记录失败:`, error);
            throw error;
        }
    }

    /**
     * 生成聊天摘要
     * @param {string} npcId - NPC标识符 
     * @param {object} recentEntry - 最近聊天条目
     * @param {object} summaryEntry - 摘要条目
     */
    async generateChatSummary(npcId, recentEntry, summaryEntry) {
        try {
            // 构建摘要生成提示词
            const prompt = `我需要你总结以下对话内容，生成一份300-400字的简洁摘要。
摘要应该捕捉对话的关键点、重要信息和情感基调。
请直接开始总结，无需额外说明。

# 现有摘要
${summaryEntry.content}

# 最近对话
${recentEntry.content}

请生成更新后的摘要:`;

            // 生成摘要
            const summary = await generate({
                user_input: prompt,
                should_stream: false
            });

            // 准备更新摘要条目
            const updatedSummaryEntry = {
                uid: summaryEntry.uid,
                content: `# 与${npcId}的聊天摘要\n\n${summary.trim()}`
            };

            // 保存更新后的摘要
            await setLorebookEntries(this.chatLorebook, [updatedSummaryEntry]);
            console.log(`已更新与NPC ${npcId}的聊天摘要`);
            
            return true;
        } catch (error) {
            console.error(`生成NPC ${npcId}聊天摘要失败:`, error);
            return false;
        }
    }

    // 获取通用消息提示词条目
    async getPromptMessageEntry() {
        try {
            // 获取当前角色卡的主要世界书
            const charLorebooks = getCharLorebooks();
            const primaryLorebook = charLorebooks.primary;
            
            if (!primaryLorebook) {
                throw new Error("角色卡未绑定主要世界书");
            }
            
            // 获取所有条目
            const entries = await getLorebookEntries(primaryLorebook);
            
            // 查找通用提示词条目
            const promptEntry = entries.find(e => e.comment === this.PROMPT_MESSAGE_KEY);
            
            if (!promptEntry) {
                throw new Error("未找到通用消息提示词条目");
            }
            
            return promptEntry;
        } catch (error) {
            console.error("获取通用消息提示词失败:", error);
            throw error;
        }
    }

    /**
     * 设置提示词条目的启用状态
     * @param {object} entry - 条目对象 
     * @param {boolean} enabled - 是否启用
     */
    async setPromptEntryEnabled(entry, enabled) {
        try {
            // 获取当前角色卡的主要世界书
            const charLorebooks = getCharLorebooks();
            const primaryLorebook = charLorebooks.primary;
            
            if (!primaryLorebook) {
                throw new Error("角色卡未绑定主要世界书");
            }
            
            // 更新条目启用状态
            const updatedEntry = {
                uid: entry.uid,
                enabled: enabled
            };
            
            await setLorebookEntries(primaryLorebook, [updatedEntry]);
            return true;
        } catch (error) {
            console.error(`设置提示词条目启用状态失败:`, error);
            return false;
        }
    }

    /**
     * 处理用户消息并生成NPC回复
     * @param {string} npcId - NPC标识符
     * @param {string} message - 用户消息
     * @returns {Promise<string>} - NPC回复
     */
    async processMessage(npcId, message) {
        if (this.isGenerating) {
            return "系统繁忙，正在处理上一条消息，请稍后再试。";
        }
        
        this.isGenerating = true;
        this.activeNpc = npcId;
        
        try {
            // 确保聊天记录条目存在
            await this.ensureChatRecords(npcId);
            
            // 获取NPC信息
            const { infoA, infoB } = await this.getNpcInfo(npcId);
            
            // 获取提示词条目并启用
            const promptEntry = await this.getPromptMessageEntry();
            await this.setPromptEntryEnabled(promptEntry, true);
            
            // 获取聊天记录条目
            const entries = await getLorebookEntries(this.chatLorebook);
            const recentComment = this.CHAT_RECENT_PREFIX + npcId;
            const summaryComment = this.CHAT_SUMMARY_PREFIX + npcId;
            
            const recentEntry = entries.find(e => e.comment === recentComment);
            const summaryEntry = entries.find(e => e.comment === summaryComment);
            
            // 构建提示词注入
            const injects = [
                {
                    role: 'system',
                    content: `你正在扮演NPC "${npcId}"。以下是你的角色信息:\n\n${infoB.content}`,
                    position: 'before_prompt',
                    depth: 0,
                    should_scan: true
                },
                {
                    role: 'system',
                    content: `# 与${npcId}的聊天摘要\n\n${summaryEntry.content}`,
                    position: 'in_chat',
                    depth: 0,
                    should_scan: true
                },
                {
                    role: 'system',
                    content: `# 最近对话\n\n${recentEntry.content}`,
                    position: 'in_chat',
                    depth: 0,
                    should_scan: true
                }
            ];
            
            // 生成NPC回复
            const response = await generate({
                user_input: `用户发送给你的消息: ${message}\n\n请根据角色设定和对话历史，生成一个符合你角色身份的回复。只输出角色回复内容，不要输出思考过程。将最终回复放在<npc_reply></npc_reply>标签中。`,
                should_stream: false,
                injects: injects
            });
            
            // 关闭提示词条目
            await this.setPromptEntryEnabled(promptEntry, false);
            
            // 处理回复，提取<npc_reply>标签中的内容
            const npcReply = this.extractNpcReply(response);
            
            // 更新聊天记录
            await this.updateChatRecords(npcId, message, npcReply);
            
            this.isGenerating = false;
            return npcReply;
        } catch (error) {
            console.error(`处理NPC ${npcId}消息失败:`, error);
            this.isGenerating = false;
            return "系统错误，无法处理消息。";
        }
    }

    /**
     * 从AI回复中提取NPC回复内容
     * @param {string} aiResponse - AI生成的完整回复
     * @returns {string} - 提取的NPC回复
     */
    extractNpcReply(aiResponse) {
        // 移除思维链
        let processedResponse = aiResponse;
        const thinkingPatterns = [
            /<thinking>[\s\S]*?<\/thinking>/gi,
            /<think>[\s\S]*?<\/think>/gi,
            /<reasoning>[\s\S]*?<\/reasoning>/gi
        ];
        
        // 移除所有思维链内容
        thinkingPatterns.forEach(pattern => {
            processedResponse = processedResponse.replace(pattern, '');
        });
        
        // 提取NPC回复
        const npcReplyMatch = processedResponse.match(/<npc_reply>([\s\S]*?)<\/npc_reply>/i);
        
        if (npcReplyMatch && npcReplyMatch[1]) {
            return npcReplyMatch[1].trim();
        }
        
        // 如果没有找到标签，返回处理后的整个回复
        return processedResponse.trim();
    }
}