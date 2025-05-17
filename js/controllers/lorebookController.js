// js/controllers/lorebookController.js
class LorebookController {
    constructor(model) {
        this.model = model;
        this.initialized = false;
    }

    async initialize() {
        try {
            // 初始化工作，例如预加载常用世界书
            console.log("世界书控制器初始化中...");
            
            // 初始化完成
            this.initialized = true;
            EventBus.emit('lorebookSystemInitialized', true);
            console.log("世界书控制器初始化完成");
            
            return true;
        } catch (error) {
            console.error("世界书控制器初始化失败:", error);
            return false;
        }
    }

    // 获取角色卡世界书信息
    getCharLorebooks() {
        return this.model.getCharLorebooks();
    }

    // 获取或创建聊天世界书
    async getOrCreateChatLorebook(name) {
        return await this.model.getOrCreateChatLorebook(name);
    }

    // 获取指定世界书的条目列表
    async getEntries(lorebookId, forceRefresh = false) {
        return await this.model.getLorebookEntries(lorebookId, forceRefresh);
    }

    // 获取NPC信息条目
    async getNpcInfo(npcId) {
        try {
            const charLorebooks = this.getCharLorebooks();
            const primaryLorebook = charLorebooks.primary;
            
            if (!primaryLorebook) {
                throw new Error("角色卡未绑定主要世界书");
            }
            
            // 获取世界书条目
            const entries = await this.model.getLorebookEntries(primaryLorebook);
            
            const commentA = this.model.NPC_INFO_PREFIX + npcId + this.model.NPC_INFO_SUFFIX_A;
            const commentB = this.model.NPC_INFO_PREFIX + npcId + this.model.NPC_INFO_SUFFIX_B;
            
            const infoA = entries.find(e => e.comment === commentA);
            const infoB = entries.find(e => e.comment === commentB);
            
            if (!infoA || !infoB) {
                throw new Error(`未找到NPC "${npcId}"的信息条目`);
            }
            
            return { infoA, infoB, primaryLorebook };
        } catch (error) {
            console.error(`获取NPC ${npcId}信息失败:`, error);
            throw error;
        }
    }

    // 确保NPC的聊天历史条目存在
    async ensureChatHistory(npcId) {
        try {
            // 获取当前聊天世界书
            const chatLorebook = await this.getOrCreateChatLorebook();
            
            // 获取最新条目列表
            const entries = await this.model.getLorebookEntries(chatLorebook);
            
            const chatHistoryComment = this.model.CHAT_HISTORY_PREFIX + npcId;
            const chatHistoryEntry = entries.find(e => e.comment === chatHistoryComment);
            
            if (!chatHistoryEntry) {
                // 创建新的JSON格式聊天记录条目
                const chatHistoryContent = JSON.stringify({
                    chat_history: []
                }, null, 2);
                
                const result = await this.model.createLorebookEntries(chatLorebook, [{
                    comment: chatHistoryComment,
                    enabled: false,
                    type: 'constant',
                    position: 'before_character_definition',
                    keys: [],
                    content: chatHistoryContent
                }]);
                
                console.log(`为NPC ${npcId}创建了JSON格式聊天历史条目`);
                
                // 重新获取包含新创建条目的完整列表
                const updatedEntries = await this.model.getLorebookEntries(chatLorebook, true);
                return {
                    chatLorebook,
                    entries: updatedEntries,
                    chatHistoryEntry: updatedEntries.find(e => e.comment === chatHistoryComment)
                };
            }
            
            return {
                chatLorebook,
                entries,
                chatHistoryEntry
            };
        } catch (error) {
            console.error(`确保NPC ${npcId}聊天历史条目失败:`, error);
            throw error;
        }
    }

    // 确保NPC的总结条目存在
    async ensureSummary(npcId) {
        try {
            // 获取当前聊天世界书
            const chatLorebook = await this.getOrCreateChatLorebook();
            
            // 获取最新条目列表
            const entries = await this.model.getLorebookEntries(chatLorebook);
            
            const summaryComment = this.model.CHAT_SUMMARY_PREFIX + npcId;
            const summaryEntry = entries.find(e => e.comment === summaryComment);
            
            if (!summaryEntry) {
                // 创建新的JSON格式总结条目
                const summaryContent = JSON.stringify({
                    summaries: []
                }, null, 2);
                
                const result = await this.model.createLorebookEntries(chatLorebook, [{
                    comment: summaryComment,
                    enabled: true,
                    type: 'constant',
                    position: 'after_author_note',
                    keys: [],
                    content: summaryContent
                }]);
                
                console.log(`为NPC ${npcId}创建了JSON格式总结条目`);
                
                // 重新获取包含新创建条目的完整列表
                const updatedEntries = await this.model.getLorebookEntries(chatLorebook, true);
                return {
                    chatLorebook,
                    entries: updatedEntries,
                    summaryEntry: updatedEntries.find(e => e.comment === summaryComment)
                };
            }
            
            return {
                chatLorebook,
                entries,
                summaryEntry
            };
        } catch (error) {
            console.error(`确保NPC ${npcId}总结条目失败:`, error);
            throw error;
        }
    }

    // 获取聊天历史记录
    async getChatHistory(npcId) {
        const { chatHistoryEntry } = await this.ensureChatHistory(npcId);
        
        try {
            const chatData = this.model.parseJsonContent(chatHistoryEntry.content);
            return {
                chat_history: chatData.chat_history || []
            };
        } catch (error) {
            console.error(`解析NPC ${npcId}的聊天记录JSON失败:`, error);
            return { chat_history: [] };
        }
    }

    // 添加新对话到聊天历史
    async addDialogue(npcId, userMessage, npcReply) {
        try {
            const { chatLorebook, chatHistoryEntry } = await this.ensureChatHistory(npcId);
            const chatData = this.model.parseJsonContent(chatHistoryEntry.content);
            const chat_history = chatData.chat_history || [];
            
            // 创建新对话记录
            const now = new Date();
            const timestamp = now.toISOString();
            
            // 确定新对话的ID
            const newId = chat_history.length > 0 ? Math.max(...chat_history.map(item => item.id)) + 1 : 1;
            
            // 查找最后一个标记为总结轮次的对话
            const lastSummaryRound = this.findLastSummaryRound(chat_history);
            const lastSummaryRoundId = lastSummaryRound ? lastSummaryRound.id : 0;
            
            // 使用固定的总结间隔
            const SUMMARY_INTERVAL = 4;
            
            // 检查是否需要生成总结
            const needSummary = lastSummaryRoundId === 0 
                ? newId >= SUMMARY_INTERVAL 
                : (newId - lastSummaryRoundId) >= SUMMARY_INTERVAL;
            
            // 创建新对话对象
            const newDialogue = {
                id: newId,
                user_id: "{{user}}",
                user_content: userMessage,
                npc_id: npcId,
                npc_content: npcReply,
                timestamp: timestamp,
                is_Summary_Round: needSummary
            };
            
            // 添加新对话到历史记录
            chat_history.push(newDialogue);
            
            // 保存更新后的聊天记录
            chatData.chat_history = chat_history;
            
            await this.model.setLorebookEntries(chatLorebook, [{
                uid: chatHistoryEntry.uid,
                content: JSON.stringify(chatData, null, 2)
            }]);
            
            console.log(`已添加NPC ${npcId}的新对话记录，ID: ${newId}，是否总结轮次: ${needSummary}`);
            
            // 返回新对话ID和是否需要总结
            return {
                dialogueId: newId,
                needSummary: needSummary
            };
        } catch (error) {
            console.error(`添加NPC ${npcId}对话失败:`, error);
            throw error;
        }
    }

    // 查找最后一个标记为总结轮次的对话
    findLastSummaryRound(chat_history) {
        // 反向遍历，找到第一个标记为总结轮次的对话
        for (let i = chat_history.length - 1; i >= 0; i--) {
            if (chat_history[i].is_Summary_Round) {
                return chat_history[i];
            }
        }
        return null; // 没有找到总结轮次
    }

    // 获取总结提示词条目
    async getSummaryPromptEntry() {
        try {
            const charLorebooks = this.getCharLorebooks();
            const primaryLorebook = charLorebooks.primary;
            
            if (!primaryLorebook) {
                throw new Error("角色卡未绑定主要世界书");
            }
            
            const entries = await this.model.getLorebookEntries(primaryLorebook);
            const promptEntry = entries.find(e => e.comment === this.model.PROMPT_SUMMARY_KEY);
            
            if (!promptEntry) {
                throw new Error("未找到总结提示词条目");
            }
            
            return { promptEntry, primaryLorebook };
        } catch (error) {
            console.error("获取总结提示词失败:", error);
            throw error;
        }
    }

    // 获取通用消息提示词条目
    async getPromptMessageEntry() {
        try {
            const charLorebooks = this.getCharLorebooks();
            const primaryLorebook = charLorebooks.primary;
            
            if (!primaryLorebook) {
                throw new Error("角色卡未绑定主要世界书");
            }
            
            const entries = await this.model.getLorebookEntries(primaryLorebook);
            const promptEntry = entries.find(e => e.comment === this.model.PROMPT_MESSAGE_KEY);
            
            if (!promptEntry) {
                throw new Error("未找到通用消息提示词条目");
            }
            
            return { promptEntry, primaryLorebook };
        } catch (error) {
            console.error("获取通用消息提示词失败:", error);
            throw error;
        }
    }

    // 检查NPC是否存在
    async checkNpcExists(npcId) {
        try {
            await this.getNpcInfo(npcId);
            return true;
        } catch (error) {
            return false;
        }
    }

    // 清除缓存
    clearCache(lorebookId = null) {
        this.model.clearCache(lorebookId);
    }
}