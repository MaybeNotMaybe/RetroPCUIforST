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
    // 如果不提供name，则应获取当前聊天绑定的世界书
    async getOrCreateChatLorebook(name) { 
        try {
            return await this.model.getOrCreateChatLorebook(name);
        } catch (error) {
            console.error("LorebookController: 获取或创建聊天世界书失败", error);
            throw error; // 将错误继续抛出，以便调用者处理
        }
    }

    // 获取指定世界书的条目列表
    async getEntries(lorebookId, forceRefresh = false) {
        return await this.model.getLorebookEntries(lorebookId, forceRefresh);
    }

    // 获取NPC信息条目
    async getNpcInfo(npcId) {
        try {
            const charLorebooks = this.getCharLorebooks();
            if (!charLorebooks || !charLorebooks.primary) { // 确保 charLorebooks 和 primary 都存在
                throw new Error("角色卡未绑定主要世界书或无法获取角色世界书信息");
            }
            const primaryLorebook = charLorebooks.primary;
            
            // 获取世界书条目
            const entries = await this.model.getLorebookEntries(primaryLorebook);
            
            const commentA = this.model.NPC_INFO_PREFIX + npcId + this.model.NPC_INFO_SUFFIX_A;
            const commentB = this.model.NPC_INFO_PREFIX + npcId + this.model.NPC_INFO_SUFFIX_B;
            
            const infoA = entries.find(e => e.comment === commentA);
            const infoB = entries.find(e => e.comment === commentB);
            
            if (!infoA || !infoB) {
                throw new Error(`未找到NPC "${npcId}"的信息条目 (A或B)`);
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
            const chatLorebook = await this.getOrCreateChatLorebook(); // 假设无参数获取当前聊天世界书
            if (!chatLorebook) throw new Error("无法获取当前聊天世界书ID");

            // 获取最新条目列表
            const entries = await this.model.getLorebookEntries(chatLorebook);
            
            const chatHistoryComment = this.model.CHAT_HISTORY_PREFIX + npcId;
            let chatHistoryEntry = entries.find(e => e.comment === chatHistoryComment); // 使用 let 允许重新赋值
            
            if (!chatHistoryEntry) {
                // 创建新的JSON格式聊天记录条目
                const chatHistoryContent = JSON.stringify({
                    chat_history: []
                }, null, 2);
                
                await this.model.createLorebookEntries(chatLorebook, [{
                    comment: chatHistoryComment,
                    enabled: false, // 通常聊天记录不直接注入
                    type: 'constant',
                    position: 'before_character_definition', // 或其他合适的位置
                    keys: [],
                    content: chatHistoryContent
                }]);
                
                console.log(`为NPC ${npcId}创建了JSON格式聊天历史条目`);
                
                // 重新获取包含新创建条目的完整列表
                const updatedEntries = await this.model.getLorebookEntries(chatLorebook, true); // 强制刷新
                chatHistoryEntry = updatedEntries.find(e => e.comment === chatHistoryComment); // 更新 chatHistoryEntry 的引用
                 return {
                    chatLorebook,
                    entries: updatedEntries,
                    chatHistoryEntry
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
            if (!chatLorebook) throw new Error("无法获取当前聊天世界书ID");
            
            // 获取最新条目列表
            const entries = await this.model.getLorebookEntries(chatLorebook);
            
            const summaryComment = this.model.CHAT_SUMMARY_PREFIX + npcId;
            let summaryEntry = entries.find(e => e.comment === summaryComment); // 使用 let
            
            if (!summaryEntry) {
                // 创建新的JSON格式总结条目
                const summaryContent = JSON.stringify({
                    summaries: []
                }, null, 2);
                
                await this.model.createLorebookEntries(chatLorebook, [{
                    comment: summaryComment,
                    enabled: true, // 总结通常需要注入
                    type: 'constant',
                    position: 'after_author_note',
                    keys: [],
                    content: summaryContent
                }]);
                
                console.log(`为NPC ${npcId}创建了JSON格式总结条目`);
                
                // 重新获取包含新创建条目的完整列表
                const updatedEntries = await this.model.getLorebookEntries(chatLorebook, true); // 强制刷新
                summaryEntry = updatedEntries.find(e => e.comment === summaryComment); // 更新引用
                return {
                    chatLorebook,
                    entries: updatedEntries,
                    summaryEntry
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
                chat_history: chatData ? chatData.chat_history || [] : [] // 增加对 chatData 为 null 的检查
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
            const chatData = this.model.parseJsonContent(chatHistoryEntry.content) || { chat_history: [] }; // 提供默认值
            const chat_history = chatData.chat_history || [];
            
            // 创建新对话记录
            const now = new Date();
            const timestamp = now.toISOString();
            
            // 确定新对话的ID
            const newId = chat_history.length > 0 ? Math.max(...chat_history.map(item => item.id)) + 1 : 1;
            
            // 查找最后一个标记为总结轮次的对话
            const lastSummaryRound = this.findLastSummaryRound(chat_history);
            const lastSummaryRoundId = lastSummaryRound ? lastSummaryRound.id : 0;
            
            // 使用固定的总结间隔 (从 NpcChatModel 引用或在此处定义)
            const SUMMARY_INTERVAL = window.npcChatModel ? window.npcChatModel.SUMMARY_INTERVAL : 4; // 尝试从 npcChatModel 获取
            
            // 检查是否需要生成总结
            const needSummary = lastSummaryRoundId === 0 
                ? newId >= SUMMARY_INTERVAL 
                : (newId - lastSummaryRoundId) >= SUMMARY_INTERVAL;
            
            // 创建新对话对象
            const newDialogue = {
                id: newId,
                user_id: "{{user}}", // 通常是占位符
                user_content: userMessage,
                npc_id: npcId,
                npc_content: npcReply,
                timestamp: timestamp,
                is_Summary_Round: needSummary // 标记是否为总结轮次
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
            if (!charLorebooks || !charLorebooks.primary) {
                 throw new Error("角色卡未绑定主要世界书或无法获取角色世界书信息");
            }
            const primaryLorebook = charLorebooks.primary;
            
            const entries = await this.model.getLorebookEntries(primaryLorebook);
            const promptEntry = entries.find(e => e.comment === this.model.PROMPT_SUMMARY_KEY);
            
            if (!promptEntry) {
                throw new Error("未找到总结提示词条目 (comment: " + this.model.PROMPT_SUMMARY_KEY + ")");
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
             if (!charLorebooks || !charLorebooks.primary) {
                 throw new Error("角色卡未绑定主要世界书或无法获取角色世界书信息");
            }
            const primaryLorebook = charLorebooks.primary;
            
            const entries = await this.model.getLorebookEntries(primaryLorebook);
            const promptEntry = entries.find(e => e.comment === this.model.PROMPT_MESSAGE_KEY);
            
            if (!promptEntry) {
                throw new Error("未找到通用消息提示词条目 (comment: " + this.model.PROMPT_MESSAGE_KEY + ")");
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
            // 如果 getNpcInfo 抛出错误（例如找不到条目），则NPC不存在
            return false;
        }
    }

    // --- 新增玩家身份相关方法 ---

    /**
     * 获取指定类型的玩家身份条目。
     * @param {string} identityTypeSuffix - 身份类型后缀 (e.g., "real", "cover", "disguise")
     * @returns {Promise<Object|null>} 世界书条目对象或null。
     */
    async getPlayerIdentityEntry(identityTypeSuffix) {
        try {
            const comment = this.model.PLAYER_IDENTITY_PREFIX + identityTypeSuffix;
            const chatLorebookId = await this.getOrCreateChatLorebook(); // 获取当前聊天世界书ID
            if (!chatLorebookId) {
                console.error("无法获取当前聊天世界书ID，无法获取玩家身份条目。");
                return null;
            }
            return await this.model.findEntryByComment(chatLorebookId, comment);
        } catch (error) {
            console.error(`获取玩家身份条目 (${identityTypeSuffix}) 失败:`, error);
            return null;
        }
    }

    /**
     * 获取指定类型的玩家身份数据。如果条目不存在，则使用默认数据创建条目并返回默认数据。
     * @param {string} identityTypeSuffix - 身份类型后缀。
     * @param {Object} defaultIdentityData - 如果条目不存在时使用的默认身份数据。
     * @returns {Promise<Object|null>} 玩家身份数据对象或null。
     */
    async getPlayerIdentity(identityTypeSuffix, defaultIdentityData) {
        try {
            const entry = await this.getPlayerIdentityEntry(identityTypeSuffix);
            if (entry && entry.content) {
                const identityData = this.model.parseJsonContent(entry.content);
                // 如果解析JSON返回null（例如空内容或无效JSON），并且存在默认数据，则可能需要重置或返回默认
                if (identityData === null && defaultIdentityData !== undefined) {
                     console.warn(`玩家身份条目 (${identityTypeSuffix}) 内容为空或无效JSON，考虑返回默认值。`);
                     // 决定是返回null还是尝试修复/返回默认值
                     // 为安全起见，如果条目存在但内容无效，可以返回null或尝试使用默认值重新设置
                     if (identityTypeSuffix === this.model.PLAYER_IDENTITY_SUFFIX_DISGUISE && defaultIdentityData === null) {
                         return null; // 对于伪装身份，null是有效值
                     }
                     // 对于真实和表面身份，如果内容无效，可能需要修复
                     // 此处简单返回解析结果，如果为null则上层逻辑可能需要处理
                }
                return identityData;
            } else if (defaultIdentityData !== undefined) { // 仅当 defaultIdentityData 有定义时才创建
                console.log(`玩家身份条目 (${identityTypeSuffix}) 未找到，使用默认数据创建。`);
                await this.setPlayerIdentity(identityTypeSuffix, defaultIdentityData);
                return defaultIdentityData;
            }
            return null; // 如果条目不存在且没有默认数据，或条目内容为空
        } catch (error) {
            console.error(`获取玩家身份 (${identityTypeSuffix}) 失败:`, error);
            // 如果获取失败，并且有默认值，可以考虑返回默认值
            if (defaultIdentityData !== undefined) {
                console.warn(`因获取错误，返回玩家身份 (${identityTypeSuffix}) 的默认数据。`);
                return defaultIdentityData;
            }
            return null;
        }
    }

    /**
     * 设置或创建指定类型的玩家身份数据。
     * @param {string} identityTypeSuffix - 身份类型后缀。
     * @param {Object|null} identityData - 要存储的身份数据，或null来清除（特别是伪装身份）。
     * @returns {Promise<boolean>} 操作是否成功。
     */
    async setPlayerIdentity(identityTypeSuffix, identityData) {
        try {
            const comment = this.model.PLAYER_IDENTITY_PREFIX + identityTypeSuffix;
            const chatLorebookId = await this.getOrCreateChatLorebook();
            if (!chatLorebookId) {
                console.error("无法获取当前聊天世界书ID，无法设置玩家身份。");
                return false;
            }

            // 对于伪装身份，如果 identityData 为 null，则存储 'null' 字符串或空JSON对象
            // 其他身份类型不应该为 null，除非逻辑允许
            let jsonString;
            if (identityData === null && identityTypeSuffix === this.model.PLAYER_IDENTITY_SUFFIX_DISGUISE) {
                jsonString = JSON.stringify(null); // 或者 JSON.stringify({})，取决于希望如何表示“无伪装”
            } else if (identityData === null) {
                console.error(`尝试为身份 (${identityTypeSuffix}) 设置null值，这可能不是预期的。`);
                // 可以选择抛出错误，或存储一个表示空状态的JSON
                jsonString = JSON.stringify({}); // 或者根据业务逻辑处理
            }
            else {
                jsonString = JSON.stringify(identityData);
            }

            const existingEntry = await this.model.findEntryByComment(chatLorebookId, comment);

            if (existingEntry) {
                await this.model.setLorebookEntries(chatLorebookId, [{
                    uid: existingEntry.uid,
                    content: jsonString,
                    // 保留其他属性如 enabled, type, position, keys，除非需要修改
                    enabled: existingEntry.enabled,
                    type: existingEntry.type,
                    position: existingEntry.position,
                    keys: existingEntry.keys,
                    comment: existingEntry.comment // 确保comment不被意外修改
                }]);
                console.log(`已更新玩家身份条目 (${identityTypeSuffix})。`);
            } else {
                const newEntry = {
                    ...this.model.PLAYER_IDENTITY_ENTRY_CONFIG, // 使用模型中定义的默认配置
                    comment: comment,
                    content: jsonString
                };
                await this.model.createLorebookEntries(chatLorebookId, [newEntry]);
                console.log(`已创建新的玩家身份条目 (${identityTypeSuffix})。`);
            }
            EventBus.emit('playerIdentityChanged', { type: identityTypeSuffix, data: identityData });
            return true;
        } catch (error) {
            console.error(`设置玩家身份 (${identityTypeSuffix}) 失败:`, error);
            return false;
        }
    }

    /**
     * 清除玩家的伪装身份（通过将其设置为空）。
     * @returns {Promise<boolean>} 操作是否成功。
     */
    async clearPlayerDisguiseIdentity() {
        console.log("清除玩家伪装身份...");
        // 将伪装身份设置回 null 或一个表示“无伪装”的空对象
        return await this.setPlayerIdentity(this.model.PLAYER_IDENTITY_SUFFIX_DISGUISE, null);
    }


    // 清除缓存
    clearCache(lorebookId = null) {
        this.model.clearCache(lorebookId);
    }
}
