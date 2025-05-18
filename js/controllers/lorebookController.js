// js/controllers/lorebookController.js
/**
 * 世界书控制器类
 * 负责协调世界书数据模型和业务逻辑
 */
class LorebookController {
    constructor(model, serviceLocator) {
        this.model = model;
        this.serviceLocator = serviceLocator;
        this.eventBus = serviceLocator.get('eventBus');
        this.storage = serviceLocator.get('storage');
        this.system = serviceLocator.get('system');
        
        this.initialized = false;
        
        // 系统状态追踪
        this.isSystemOn = false;
        
        // 绑定事件
        this.bindEvents();
    }
    
    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 监听系统电源状态变化
        this.eventBus.on('systemPowerChange', this.handleSystemPowerChange.bind(this));
        
        // 监听测试模式变化
        this.eventBus.on('testModeChanged', this.handleTestModeChanged.bind(this));
        
        // 监听玩家身份变化
        this.eventBus.on('identityChanged', this.handleIdentityChanged.bind(this));
    }
    
    /**
     * 处理系统电源状态变化
     * @param {boolean} isOn - 系统是否开启
     */
    handleSystemPowerChange(isOn) {
        this.isSystemOn = isOn;
        
        if (!isOn) {
            // 系统关闭时清除敏感缓存
            this.model.clearCache();
        }
    }
    
    /**
     * 处理测试模式变化
     * @param {boolean} isTestMode - 是否为测试模式
     */
    handleTestModeChanged(isTestMode) {
        console.log(`世界书控制器：测试模式 ${isTestMode ? '启用' : '禁用'}`);
        
        // 测试模式下可以启用额外日志或调整行为
        if (isTestMode) {
            this.enableDebugLogging();
        } else {
            this.disableDebugLogging();
        }
    }
    
    /**
     * 处理身份变化事件
     * @param {Object} identityData - 身份数据
     */
    handleIdentityChanged(identityData) {
        // 检查是否需要更新世界书中的身份信息
        if (identityData.type === 'real' || identityData.type === 'cover') {
            this.updatePlayerIdentity(identityData.type, identityData.data)
                .catch(error => console.error("更新玩家身份失败:", error));
        }
    }
    
    /**
     * 启用调试日志
     */
    enableDebugLogging() {
        // 为事件总线启用调试模式
        if (this.eventBus.enableDebug) {
            this.eventBus.enableDebug(true);
        }
    }
    
    /**
     * 禁用调试日志
     */
    disableDebugLogging() {
        // 为事件总线禁用调试模式
        if (this.eventBus.enableDebug) {
            this.eventBus.enableDebug(false);
        }
    }

    /**
     * 初始化控制器
     * @returns {Promise<boolean>} 是否成功初始化
     */
    async initialize() {
        try {
            console.log("世界书控制器初始化中...");
            
            // 检查系统状态
            const systemService = this.serviceLocator.get('system');
            if (systemService) {
                this.isSystemOn = systemService.isPowerOn();
            }
            
            // 预加载常用世界书信息
            this.preloadCommonLorebooks();
            
            // 标记初始化完成
            this.initialized = true;
            this.eventBus.emit('lorebookSystemInitialized', true);
            console.log("世界书控制器初始化完成");
            
            return true;
        } catch (error) {
            console.error("世界书控制器初始化失败:", error);
            return false;
        }
    }
    
    /**
     * 预加载常用世界书信息
     */
    async preloadCommonLorebooks() {
        try {
            if (!this.isSystemOn) return;
            
            // 获取角色卡世界书
            const charLorebooks = this.getCharLorebooks();
            if (charLorebooks && charLorebooks.primary) {
                // 预加载主要世界书条目
                this.model.getLorebookEntries(charLorebooks.primary)
                    .catch(error => console.warn("预加载主要世界书失败:", error));
            }
        } catch (error) {
            console.warn("预加载常用世界书失败:", error);
        }
    }

    /**
     * 获取角色卡世界书信息
     * @returns {Object} 包含primary和secondary世界书ID的对象
     */
    getCharLorebooks() {
        return this.model.getCharLorebooks();
    }

    /**
     * 获取或创建聊天世界书
     * @param {string} [name] - 可选的世界书名称
     * @returns {Promise<string>} 世界书ID
     */
    async getOrCreateChatLorebook(name) { 
        try {
            return await this.model.getOrCreateChatLorebook(name);
        } catch (error) {
            console.error("获取或创建聊天世界书失败", error);
            throw error;
        }
    }

    /**
     * 获取指定世界书的条目列表
     * @param {string} lorebookId - 世界书ID
     * @param {boolean} [forceRefresh=false] - 是否强制刷新缓存
     * @returns {Promise<Array>} 条目数组
     */
    async getEntries(lorebookId, forceRefresh = false) {
        return await this.model.getLorebookEntries(lorebookId, forceRefresh);
    }

    /**
     * 获取NPC信息条目
     * @param {string} npcId - NPC ID
     * @returns {Promise<Object>} NPC信息对象
     */
    async getNpcInfo(npcId) {
        try {
            const charLorebooks = this.getCharLorebooks();
            if (!charLorebooks || !charLorebooks.primary) {
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

    /**
     * 确保NPC的聊天历史条目存在
     * @param {string} npcId - NPC ID
     * @returns {Promise<Object>} 包含聊天世界书ID、条目列表和聊天历史条目的对象
     */
    async ensureChatHistory(npcId) {
        try {
            // 获取当前聊天世界书
            const chatLorebook = await this.getOrCreateChatLorebook();
            if (!chatLorebook) throw new Error("无法获取当前聊天世界书ID");

            // 获取最新条目列表
            const entries = await this.model.getLorebookEntries(chatLorebook);
            
            const chatHistoryComment = this.model.CHAT_HISTORY_PREFIX + npcId;
            let chatHistoryEntry = entries.find(e => e.comment === chatHistoryComment);
            
            if (!chatHistoryEntry) {
                // 创建新的JSON格式聊天记录条目
                const chatHistoryContent = JSON.stringify({
                    chat_history: []
                }, null, 2);
                
                await this.model.createLorebookEntries(chatLorebook, [{
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
                chatHistoryEntry = updatedEntries.find(e => e.comment === chatHistoryComment);
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

    /**
     * 确保NPC的总结条目存在
     * @param {string} npcId - NPC ID
     * @returns {Promise<Object>} 包含聊天世界书ID、条目列表和总结条目的对象
     */
    async ensureSummary(npcId) {
        try {
            // 获取当前聊天世界书
            const chatLorebook = await this.getOrCreateChatLorebook();
            if (!chatLorebook) throw new Error("无法获取当前聊天世界书ID");
            
            // 获取最新条目列表
            const entries = await this.model.getLorebookEntries(chatLorebook);
            
            const summaryComment = this.model.CHAT_SUMMARY_PREFIX + npcId;
            let summaryEntry = entries.find(e => e.comment === summaryComment);
            
            if (!summaryEntry) {
                // 创建新的JSON格式总结条目
                const summaryContent = JSON.stringify({
                    summaries: []
                }, null, 2);
                
                await this.model.createLorebookEntries(chatLorebook, [{
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
                summaryEntry = updatedEntries.find(e => e.comment === summaryComment);
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

    /**
     * 获取聊天历史记录
     * @param {string} npcId - NPC ID
     * @returns {Promise<Object>} 包含聊天历史的对象
     */
    async getChatHistory(npcId) {
        const { chatHistoryEntry } = await this.ensureChatHistory(npcId);
        
        try {
            const chatData = this.model.parseJsonContent(chatHistoryEntry.content);
            return {
                chat_history: chatData ? chatData.chat_history || [] : []
            };
        } catch (error) {
            console.error(`解析NPC ${npcId}的聊天记录JSON失败:`, error);
            return { chat_history: [] };
        }
    }

    /**
     * 添加新对话到聊天历史
     * @param {string} npcId - NPC ID
     * @param {string} userMessage - 用户消息
     * @param {string} npcReply - NPC回复
     * @returns {Promise<Object>} 包含新对话ID和是否需要总结的对象
     */
    async addDialogue(npcId, userMessage, npcReply) {
        try {
            const { chatLorebook, chatHistoryEntry } = await this.ensureChatHistory(npcId);
            const chatData = this.model.parseJsonContent(chatHistoryEntry.content) || { chat_history: [] };
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
            const SUMMARY_INTERVAL = window.npcChatModel ? window.npcChatModel.SUMMARY_INTERVAL : 4;
            
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
            
            // 发布对话添加事件
            this.eventBus.emit('dialogueAdded', {
                npcId: npcId,
                dialogueId: newId,
                needSummary: needSummary
            });
            
            return {
                dialogueId: newId,
                needSummary: needSummary
            };
        } catch (error) {
            console.error(`添加NPC ${npcId}对话失败:`, error);
            throw error;
        }
    }

    /**
     * 查找最后一个标记为总结轮次的对话
     * @param {Array} chat_history - 聊天历史数组
     * @returns {Object|null} 最后一个总结轮次对话或null
     */
    findLastSummaryRound(chat_history) {
        for (let i = chat_history.length - 1; i >= 0; i--) {
            if (chat_history[i].is_Summary_Round) {
                return chat_history[i];
            }
        }
        return null;
    }

    /**
     * 获取总结提示词条目
     * @returns {Promise<Object>} 包含提示词条目和主要世界书ID的对象
     */
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

    /**
     * 获取通用消息提示词条目
     * @returns {Promise<Object>} 包含提示词条目和主要世界书ID的对象
     */
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

    /**
     * 检查NPC是否存在
     * @param {string} npcId - NPC ID
     * @returns {Promise<boolean>} NPC是否存在
     */
    async checkNpcExists(npcId) {
        try {
            await this.getNpcInfo(npcId);
            return true;
        } catch (error) {
            return false;
        }
    }

    // --- 玩家身份相关方法 ---

    /**
     * 获取指定类型的玩家身份条目
     * @param {string} identityTypeSuffix - 身份类型后缀 (real, cover, disguise)
     * @returns {Promise<Object|null>} 世界书条目对象或null
     */
    async getPlayerIdentityEntry(identityTypeSuffix) {
        try {
            const comment = this.model.PLAYER_IDENTITY_PREFIX + identityTypeSuffix;
            const chatLorebookId = await this.getOrCreateChatLorebook();
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
     * 获取指定类型的玩家身份数据
     * @param {string} identityTypeSuffix - 身份类型后缀
     * @param {Object} [defaultIdentityData] - 默认身份数据
     * @returns {Promise<Object|null>} 玩家身份数据对象或null
     */
    async getPlayerIdentity(identityTypeSuffix, defaultIdentityData) {
        try {
            const entry = await this.getPlayerIdentityEntry(identityTypeSuffix);
            if (entry && entry.content) {
                const identityData = this.model.parseJsonContent(entry.content);
                if (identityData === null && defaultIdentityData !== undefined) {
                     console.warn(`玩家身份条目 (${identityTypeSuffix}) 内容为空或无效JSON，考虑返回默认值。`);
                     if (identityTypeSuffix === this.model.PLAYER_IDENTITY_SUFFIX_DISGUISE && defaultIdentityData === null) {
                         return null;
                     }
                }
                return identityData;
            } else if (defaultIdentityData !== undefined) {
                console.log(`玩家身份条目 (${identityTypeSuffix}) 未找到，使用默认数据创建。`);
                await this.setPlayerIdentity(identityTypeSuffix, defaultIdentityData);
                return defaultIdentityData;
            }
            return null;
        } catch (error) {
            console.error(`获取玩家身份 (${identityTypeSuffix}) 失败:`, error);
            if (defaultIdentityData !== undefined) {
                console.warn(`因获取错误，返回玩家身份 (${identityTypeSuffix}) 的默认数据。`);
                return defaultIdentityData;
            }
            return null;
        }
    }

    /**
     * 设置或创建指定类型的玩家身份数据
     * @param {string} identityTypeSuffix - 身份类型后缀
     * @param {Object|null} identityData - 要存储的身份数据
     * @returns {Promise<boolean>} 操作是否成功
     */
    async setPlayerIdentity(identityTypeSuffix, identityData) {
        try {
            const comment = this.model.PLAYER_IDENTITY_PREFIX + identityTypeSuffix;
            const chatLorebookId = await this.getOrCreateChatLorebook();
            if (!chatLorebookId) {
                console.error("无法获取当前聊天世界书ID，无法设置玩家身份。");
                return false;
            }

            let jsonString;
            if (identityData === null && identityTypeSuffix === this.model.PLAYER_IDENTITY_SUFFIX_DISGUISE) {
                jsonString = JSON.stringify(null);
            } else if (identityData === null) {
                console.error(`尝试为身份 (${identityTypeSuffix}) 设置null值，这可能不是预期的。`);
                jsonString = JSON.stringify({});
            }
            else {
                jsonString = JSON.stringify(identityData);
            }

            const existingEntry = await this.model.findEntryByComment(chatLorebookId, comment);

            if (existingEntry) {
                await this.model.setLorebookEntries(chatLorebookId, [{
                    uid: existingEntry.uid,
                    content: jsonString,
                    enabled: existingEntry.enabled,
                    type: existingEntry.type,
                    position: existingEntry.position,
                    keys: existingEntry.keys,
                    comment: existingEntry.comment
                }]);
                console.log(`已更新玩家身份条目 (${identityTypeSuffix})。`);
            } else {
                const newEntry = {
                    ...this.model.PLAYER_IDENTITY_ENTRY_CONFIG,
                    comment: comment,
                    content: jsonString
                };
                await this.model.createLorebookEntries(chatLorebookId, [newEntry]);
                console.log(`已创建新的玩家身份条目 (${identityTypeSuffix})。`);
            }
            
            // 发布身份变更事件
            this.eventBus.emit('playerIdentityChanged', { 
                type: identityTypeSuffix, 
                data: identityData 
            });
            
            return true;
        } catch (error) {
            console.error(`设置玩家身份 (${identityTypeSuffix}) 失败:`, error);
            return false;
        }
    }

    /**
     * 清除玩家的伪装身份
     * @returns {Promise<boolean>} 操作是否成功
     */
    async clearPlayerDisguiseIdentity() {
        console.log("清除玩家伪装身份...");
        return await this.setPlayerIdentity(this.model.PLAYER_IDENTITY_SUFFIX_DISGUISE, null);
    }

    /**
     * 清除缓存
     * @param {string} [lorebookId] - 世界书ID，不提供则清除所有缓存
     */
    clearCache(lorebookId = null) {
        this.model.clearCache(lorebookId);
    }
    
    /**
     * 获取控制器状态报告（用于调试）
     * @returns {Object} 控制器状态
     */
    getStatus() {
        return {
            initialized: this.initialized,
            isSystemOn: this.isSystemOn,
            cacheInfo: this.model.exportCacheInfo(),
            version: "1.0.0" // 控制器版本号
        };
    }
}