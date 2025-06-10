// js/controllers/lorebookController.js
class LorebookController {
    constructor(model, serviceLocator) {
        this.model = model;
        this.serviceLocator = serviceLocator;
        this.eventBus = serviceLocator.get('eventBus');
        this.storage = serviceLocator.get('storage');
        this.initialized = false;
        
        // 绑定事件
        this.bindEvents();
    }
    
    // 绑定事件监听
    bindEvents() {
        if (this.eventBus) {
            // 系统事件
            this.eventBus.on('systemPowerChange', (isOn) => {
                if (!isOn) {
                    // 系统关闭时清除缓存
                    this.model.clearCache();
                }
            });
            
            // 测试模式变更事件
            this.eventBus.on('testModeChanged', (isTestMode) => {
                // 测试模式下可以调整缓存超时
                if (isTestMode) {
                    this.model.setCacheTimeout(5000); // 测试模式下缓存有效期更短
                } else {
                    this.model.setCacheTimeout(60000); // 正常模式下恢复默认缓存时间
                }
            });
        }
    }

    async initialize() {
        try {
            console.log("世界书控制器初始化中...");
            
            // 初始化逻辑，例如预加载常用世界书
            const gameModel = this.serviceLocator.get('gameModel');
            if (gameModel && gameModel.isTestMode) {
                // 如果游戏已处于测试模式，调整缓存设置
                this.model.setCacheTimeout(5000);
            }
            
            // 初始化完成
            this.initialized = true;
            
            // 发布初始化完成事件
            if (this.eventBus) {
                this.eventBus.emit('lorebookSystemInitialized', true);
            }
            
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
        try {
            return await this.model.getOrCreateChatLorebook(name);
        } catch (error) {
            console.error("LorebookController: 获取或创建聊天世界书失败", error);
            throw error;
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

    // 确保NPC的聊天历史条目存在
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

    // 确保NPC的总结条目存在
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

    // 获取聊天历史记录
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

    // 添加新对话到聊天历史
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
            
            console.log(`已添加NPC ${npcId}的新对话记录，ID: ${newId}，是否总结轮次: ${needSummary}`);
            
            // 发布对话添加事件
            if (this.eventBus) {
                this.eventBus.emit('dialogueAdded', {
                    npcId,
                    dialogueId: newId,
                    needSummary
                });
            }
            
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
        for (let i = chat_history.length - 1; i >= 0; i--) {
            if (chat_history[i].is_Summary_Round) {
                return chat_history[i];
            }
        }
        return null;
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
            return false;
        }
    }

    // --- 玩家身份相关方法 ---

    /**
     * 获取指定类型的玩家身份条目。
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
     * 获取指定类型的玩家身份数据。
     */
    async getPlayerIdentity(identityTypeSuffix, defaultIdentityData) {
        try {
            const entry = await this.getPlayerIdentityEntry(identityTypeSuffix);
            if (entry && entry.content) {
                const identityData = this.model.parseJsonContent(entry.content);
                
                // 如果解析成功，直接返回（包括null值）
                if (identityData !== undefined) {
                    return identityData;
                }
                
                console.warn(`玩家身份条目 (${identityTypeSuffix}) 内容为无效JSON`);
            }
            
            // 条目不存在或内容无效时，只有在明确提供默认值时才自动创建
            if (defaultIdentityData !== undefined && arguments.length > 1) {
                console.log(`玩家身份条目 (${identityTypeSuffix}) 未找到，使用提供的默认值创建`);
                await this.setPlayerIdentity(identityTypeSuffix, defaultIdentityData);
                return defaultIdentityData;
            }
            
            // 否则返回 undefined 表示未找到
            return undefined;
        } catch (error) {
            console.error(`获取玩家身份 (${identityTypeSuffix}) 失败:`, error);
            
            // 发生错误时，只有在明确提供默认值时才返回
            if (defaultIdentityData !== undefined && arguments.length > 1) {
                console.warn(`因获取错误，返回玩家身份 (${identityTypeSuffix}) 的默认数据。`);
                return defaultIdentityData;
            }
            
            return undefined;
        }
    }

    /**
     * 设置或创建指定类型的玩家身份数据。
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
            } else {
                jsonString = JSON.stringify(identityData);
            }

            const existingEntry = await this.model.findEntryByComment(chatLorebookId, comment);
            
            // 检查是否真的需要更新
            if (existingEntry && existingEntry.content === jsonString) {
                // console.log(`玩家身份条目 (${identityTypeSuffix}) 内容未变化，跳过更新`);
                return true;
            }

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
                console.log(`已更新玩家身份条目 (${identityTypeSuffix})`);
            } else {
                const newEntry = {
                    ...this.model.PLAYER_IDENTITY_ENTRY_CONFIG,
                    comment: comment,
                    content: jsonString
                };
                await this.model.createLorebookEntries(chatLorebookId, [newEntry]);
                console.log(`已创建新的玩家身份条目 (${identityTypeSuffix})`);
            }
            
            // 只在数据真正变化时才发布事件
            if (this.eventBus) {
                this.eventBus.emit('playerIdentityChanged', { 
                    type: identityTypeSuffix, 
                    data: identityData 
                });
            }
            
            return true;
        } catch (error) {
            console.error(`设置玩家身份 (${identityTypeSuffix}) 失败:`, error);
            return false;
        }
    }

    /**
     * 清除玩家的伪装身份。
     */
    async clearPlayerDisguiseIdentity() {
        console.log("清除玩家伪装身份...");
        return await this.setPlayerIdentity(this.model.PLAYER_IDENTITY_SUFFIX_DISGUISE, null);
    }

    // 新增：用户数据相关方法

    /**
     * 获取用户数据条目
     */
    async getUserDataEntry() {
        try {
            const chatLorebookId = await this.getOrCreateChatLorebook();
            if (!chatLorebookId) {
                console.error("无法获取当前聊天世界书ID，无法获取用户数据条目。");
                return null;
            }
            return await this.model.findEntryByComment(chatLorebookId, this.model.USER_DATA_KEY);
        } catch (error) {
            console.error("获取用户数据条目失败:", error);
            return null;
        }
    }

    /**
     * 获取用户数据
     */
    async getUserData() {
        try {
            const entry = await this.getUserDataEntry();
            if (entry && entry.content) {
                const userData = this.model.parseJsonContent(entry.content);
                if (userData) {
                    return userData;
                }
            }
            
            // 如果没有数据，创建默认数据
            console.log("用户数据条目未找到，创建默认数据");
            const defaultData = { ...this.model.DEFAULT_USER_DATA };
            defaultData.metadata.createdAt = new Date().toISOString();
            defaultData.metadata.lastUpdated = new Date().toISOString();
            
            await this.setUserData(defaultData);
            return defaultData;
        } catch (error) {
            console.error("获取用户数据失败:", error);
            return this.model.DEFAULT_USER_DATA;
        }
    }

    /**
     * 设置用户数据
     */
    async setUserData(userData) {
        try {
            const chatLorebookId = await this.getOrCreateChatLorebook();
            if (!chatLorebookId) {
                console.error("无法获取当前聊天世界书ID，无法设置用户数据。");
                return false;
            }

            // 更新最后修改时间
            if (userData.metadata) {
                userData.metadata.lastUpdated = new Date().toISOString();
            }

            const jsonString = JSON.stringify(userData, null, 2);
            const existingEntry = await this.model.findEntryByComment(chatLorebookId, this.model.USER_DATA_KEY);

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
                console.log("已更新用户数据条目");
            } else {
                const newEntry = {
                    ...this.model.USER_DATA_ENTRY_CONFIG,
                    comment: this.model.USER_DATA_KEY,
                    content: jsonString
                };
                await this.model.createLorebookEntries(chatLorebookId, [newEntry]);
                console.log("已创建新的用户数据条目");
            }
            
            // 发布用户数据变更事件
            if (this.eventBus) {
                this.eventBus.emit('userDataChanged', userData);
            }
            
            return true;
        } catch (error) {
            console.error("设置用户数据失败:", error);
            return false;
        }
    }

    /**
     * 更新玩家统计数据
     */
    async updateUserStats(stats) {
        try {
            const userData = await this.getUserData();
            userData.stats = { ...userData.stats, ...stats };
            return await this.setUserData(userData);
        } catch (error) {
            console.error("更新玩家统计数据失败:", error);
            return false;
        }
    }

    /**
     * 更新技能数据
     */
    async updateUserSkills(skills) {
        try {
            const userData = await this.getUserData();
            userData.skills = { ...userData.skills, ...skills };
            return await this.setUserData(userData);
        } catch (error) {
            console.error("更新技能数据失败:", error);
            return false;
        }
    }

    /**
     * 增加技能经验
     */
    async addSkillExperience(skillName, exp) {
        try {
            const userData = await this.getUserData();
            if (!userData.skills[skillName]) {
                console.warn(`技能 ${skillName} 不存在`);
                return false;
            }

            const skill = userData.skills[skillName];
            skill.experience += exp;

            // 检查升级
            const upgradResult = this.checkSkillUpgrade(skill);
            if (upgradResult.upgraded) {
                skill.level = upgradResult.newLevel;
                skill.maxExp = upgradResult.newMaxExp;
                
                // 发布技能升级事件
                if (this.eventBus) {
                    this.eventBus.emit('skillUpgraded', {
                        skillName,
                        newLevel: skill.level,
                        experience: skill.experience
                    });
                }
            }

            return await this.setUserData(userData);
        } catch (error) {
            console.error(`增加技能经验失败 (${skillName}):`, error);
            return false;
        }
    }

    /**
     * 检查技能升级
     */
    checkSkillUpgrade(skill) {
        const levels = this.model.SKILL_LEVELS;
        const currentLevelIndex = levels.findIndex(l => l.level === skill.level);
        
        if (currentLevelIndex === -1 || currentLevelIndex >= levels.length - 1) {
            return { upgraded: false };
        }

        const currentLevel = levels[currentLevelIndex];
        
        // 检查是否达到升级要求
        if (skill.experience >= currentLevel.expRequired) {
            const nextLevel = levels[currentLevelIndex + 1];
            return {
                upgraded: true,
                newLevel: nextLevel.level,
                newMaxExp: nextLevel.expRequired
            };
        }

        return { upgraded: false };
    }

    /**
     * 设置扩展伪装身份数据
     */
    async setPlayerIdentityExtended(identityTypeSuffix, basicData, extensions = null) {
        try {
            let identityData = { ...basicData };
            
            // 如果是伪装身份且提供了扩展数据，合并扩展数据
            if (identityTypeSuffix === this.model.PLAYER_IDENTITY_SUFFIX_DISGUISE && extensions) {
                identityData = { ...identityData, ...extensions };
            } else if (identityTypeSuffix === this.model.PLAYER_IDENTITY_SUFFIX_DISGUISE) {
                // 使用默认扩展数据
                const defaultExtensions = { ...this.model.DEFAULT_DISGUISE_EXTENSIONS };
                // 更新时间戳
                defaultExtensions.disguiseStatus["启用时间"] = new Date().toISOString();
                defaultExtensions.disguiseCapability["最后验证"] = new Date().toISOString();
                
                identityData = { ...identityData, ...defaultExtensions };
            }
            
            return await this.setPlayerIdentity(identityTypeSuffix, identityData);
        } catch (error) {
            console.error(`设置扩展玩家身份失败 (${identityTypeSuffix}):`, error);
            return false;
        }
    }

    // 清除缓存
    clearCache(lorebookId = null) {
        this.model.clearCache(lorebookId);
    }
    
    // 设置缓存超时时间
    setCacheTimeout(milliseconds) {
        return this.model.setCacheTimeout(milliseconds);
    }
}