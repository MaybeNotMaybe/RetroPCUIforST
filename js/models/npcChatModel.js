// js/models/npcChatModel.js
class NpcChatModel {
    constructor() {
        // 最小化存储的状态，不预加载任何内容
        this.isGenerating = false;
        
        // 常量定义
        this.NPC_INFO_PREFIX = "npc_";
        this.NPC_INFO_SUFFIX_A = "_A";
        this.NPC_INFO_SUFFIX_B = "_B";
        
        // 新的聊天记录存储格式
        this.CHAT_HISTORY_PREFIX = "chat_json_"; // JSON格式聊天记录
        this.CHAT_SUMMARY_PREFIX = "summary_"; // 聊天总结
        this.CHAT_SUMMARY_BACKUP_PREFIX = "summary_backup_"; // 总结备份
        
        this.PROMPT_MESSAGE_KEY = "prompt_message";
        this.PROMPT_SUMMARY_KEY = "prompt_summary";
        
        // 总结设置
        this.SUMMARY_INTERVAL = 4; // 每8轮对话进行一次总结

        // 跟踪最后一次交互
        this.lastInteraction = {
            npcId: null,
            userMessage: null,
            npcReply: null,
            lastDialogueId: null
        };
    }

    // 初始化方法 - 保持API兼容性
    async initialize() {
        try {
            // 检查是否可以获取聊天世界书
            const chatLorebook = await this.getChatLorebook();
            console.log("NPC聊天系统初始化完成，使用世界书:", chatLorebook);
            
            // 发布初始化完成事件
            EventBus.emit('npcChatInitialized', true);
            return true;
        } catch (error) {
            console.error("NPC聊天系统初始化失败:", error);
            return false;
        }
    }

    // 获取当前聊天的世界书，每次调用时重新检查
    async getChatLorebook() {
        try {
            const chatLorebook = await getOrCreateChatLorebook();
            return chatLorebook;
        } catch (error) {
            console.error("获取聊天世界书失败:", error);
            throw error;
        }
    }

    // 获取NPC信息，每次需要时重新从世界书获取最新内容
    async getNpcInfo(npcId) {
        try {
            const charLorebooks = getCharLorebooks();
            const primaryLorebook = charLorebooks.primary;
            
            if (!primaryLorebook) {
                throw new Error("角色卡未绑定主要世界书");
            }
            
            // 每次都重新获取所有条目，确保拿到最新内容
            const entries = await getLorebookEntries(primaryLorebook);
            
            const commentA = this.NPC_INFO_PREFIX + npcId + this.NPC_INFO_SUFFIX_A;
            const commentB = this.NPC_INFO_PREFIX + npcId + this.NPC_INFO_SUFFIX_B;
            
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
            const chatLorebook = await this.getChatLorebook();
            
            // 获取最新条目列表
            const entries = await getLorebookEntries(chatLorebook);
            
            const chatHistoryComment = this.CHAT_HISTORY_PREFIX + npcId;
            const chatHistoryEntry = entries.find(e => e.comment === chatHistoryComment);
            
            if (!chatHistoryEntry) {
                // 创建新的JSON格式聊天记录条目
                const chatHistoryContent = JSON.stringify({
                    chat_history: [],      // 存储实际对话
                    last_summary_id: 0     // 上次进行总结的对话ID
                }, null, 2);
                
                const result = await createLorebookEntries(chatLorebook, [{
                    comment: chatHistoryComment,
                    enabled: false,        // 设置为关闭状态
                    type: 'constant',
                    position: 'before_character_definition',
                    keys: [],
                    content: chatHistoryContent
                }]);
                
                console.log(`为NPC ${npcId}创建了JSON格式聊天历史条目`);
                
                // 重新获取包含新创建条目的完整列表
                const updatedEntries = await getLorebookEntries(chatLorebook);
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
            const chatLorebook = await this.getChatLorebook();
            
            // 获取最新条目列表
            const entries = await getLorebookEntries(chatLorebook);
            
            const summaryComment = this.CHAT_SUMMARY_PREFIX + npcId;
            const summaryEntry = entries.find(e => e.comment === summaryComment);
            
            if (!summaryEntry) {
                // 创建新的总结条目
                const result = await createLorebookEntries(chatLorebook, [{
                    comment: summaryComment,
                    enabled: true,         // 启用总结条目
                    type: 'constant',
                    position: 'after_author_note',
                    keys: [],
                    content: `# 与${npcId}的对话总结\n\n尚无对话总结。`
                }]);
                
                console.log(`为NPC ${npcId}创建了总结条目`);
                
                // 重新获取包含新创建条目的完整列表
                const updatedEntries = await getLorebookEntries(chatLorebook);
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

    // 获取聊天历史记录，从JSON解析
    async getChatHistory(npcId) {
        const { chatDataEntry } = await this.ensureChatData(npcId);
        
        try {
            const chatData = JSON.parse(chatDataEntry.content);
            return {
                chat_history: chatData.chat_history || [],
                last_summary_id: chatData.last_summary_id || 0
            };
        } catch (error) {
            console.error(`解析NPC ${npcId}的聊天记录JSON失败:`, error);
            return { chat_history: [], last_summary_id: 0 };
        }
    }

    // 添加新对话到聊天历史
    async addDialogue(npcId, userMessage, npcReply) {
        try {
            const { chatLorebook, chatHistoryEntry } = await this.ensureChatHistory(npcId);
            const chatData = JSON.parse(chatHistoryEntry.content);
            const chat_history = chatData.chat_history || [];
            const last_summary_id = chatData.last_summary_id || 0;
            
            // 创建新对话记录
            const now = new Date();
            const timestamp = now.toISOString();
            
            // 确定新对话的ID
            const newId = chat_history.length > 0 ? Math.max(...chat_history.map(item => item.id)) + 1 : 1;
            
            // 创建新对话对象
            const newDialogue = {
                id: newId,
                user_id: "{{user}}",
                user_content: userMessage,
                npc_id: npcId,
                npc_content: npcReply,
                timestamp: timestamp
            };
            
            // 添加新对话到历史记录
            chat_history.push(newDialogue);
            
            // 检查是否需要生成总结
            const needSummary = newId - last_summary_id >= this.SUMMARY_INTERVAL;
            
            // 保存更新后的聊天记录
            chatData.chat_history = chat_history;
            
            await setLorebookEntries(chatLorebook, [{
                uid: chatHistoryEntry.uid,
                content: JSON.stringify(chatData, null, 2)
            }]);
            
            console.log(`已添加NPC ${npcId}的新对话记录，ID: ${newId}`);
            
            // 记录最后交互的对话ID
            this.lastInteraction.lastDialogueId = newId;
            
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

    // 格式化聊天记录为发送给AI的格式
    async formatChatHistoryForAI(npcId, maxRounds = 10) {
        try {
            // 获取聊天历史
            const { chatHistoryEntry } = await this.ensureChatHistory(npcId);
            const chatData = JSON.parse(chatHistoryEntry.content);
            const chat_history = chatData.chat_history || [];
            
            // 获取总结
            const { summaryEntry } = await this.ensureSummary(npcId);
            const summary = summaryEntry.content.replace(/^# 与.*?的对话总结\n\n/g, '');
            
            // 只取最近的maxRounds轮对话
            const recentHistory = chat_history.slice(-maxRounds);
            
            let formattedHistory = "";
            
            // 先添加总结（如果有）
            if (summary && summary !== "尚无对话总结。") {
                formattedHistory += "# 对话总结\n";
                formattedHistory += summary + "\n\n";
            }
            
            // 添加最近对话历史
            formattedHistory += "# 最近对话\n";
            
            recentHistory.forEach(item => {
                formattedHistory += `第${item.id}轮对话\n`;
                formattedHistory += `${item.user_id}: ${item.user_content}\n`;
                formattedHistory += `${item.npc_id}: ${item.npc_content}\n\n`;
            });
            
            return formattedHistory.trim();
        } catch (error) {
            console.error(`格式化NPC ${npcId}聊天历史失败:`, error);
            return "# 最近对话\n无法加载对话历史。";
        }
    }

    // 备份总结数据
    async backupSummary(npcId) {
        try {
            const chatLorebook = await this.getChatLorebook();
            const entries = await getLorebookEntries(chatLorebook);
            
            const summaryComment = this.CHAT_SUMMARY_PREFIX + npcId;
            const backupComment = this.CHAT_SUMMARY_BACKUP_PREFIX + npcId;
            
            // 查找当前总结条目
            const summaryEntry = entries.find(e => e.comment === summaryComment);
            if (!summaryEntry) {
                console.warn(`未找到NPC ${npcId}的总结条目，无法备份`);
                return false;
            }
            
            // 查找或创建备份条目
            let backupEntry = entries.find(e => e.comment === backupComment);
            
            if (backupEntry) {
                // 更新现有备份
                await setLorebookEntries(chatLorebook, [{
                    uid: backupEntry.uid,
                    content: summaryEntry.content
                }]);
                console.log(`已更新NPC ${npcId}的总结备份`);
            } else {
                // 创建新备份
                await createLorebookEntries(chatLorebook, [{
                    comment: backupComment,
                    enabled: false,
                    type: 'constant',
                    position: 'before_character_definition',
                    keys: [],
                    content: summaryEntry.content
                }]);
                console.log(`已创建NPC ${npcId}的总结备份`);
            }
            
            return true;
        } catch (error) {
            console.error(`备份NPC ${npcId}总结失败:`, error);
            return false;
        }
    }

    // 从备份恢复总结
    async restoreSummaryFromBackup(npcId) {
        try {
            const chatLorebook = await this.getChatLorebook();
            const entries = await getLorebookEntries(chatLorebook);
            
            const summaryComment = this.CHAT_SUMMARY_PREFIX + npcId;
            const backupComment = this.CHAT_SUMMARY_BACKUP_PREFIX + npcId;
            
            const summaryEntry = entries.find(e => e.comment === summaryComment);
            const backupEntry = entries.find(e => e.comment === backupComment);
            
            if (!summaryEntry || !backupEntry) {
                console.warn(`未找到NPC ${npcId}的总结或备份条目，无法恢复`);
                return false;
            }
            
            // 从备份恢复总结
            await setLorebookEntries(chatLorebook, [{
                uid: summaryEntry.uid,
                content: backupEntry.content
            }]);
            
            console.log(`已从备份恢复NPC ${npcId}的总结`);
            return true;
        } catch (error) {
            console.error(`恢复NPC ${npcId}总结失败:`, error);
            return false;
        }
    }

    // 获取总结提示词条目
    async getSummaryPromptEntry() {
        try {
            const charLorebooks = getCharLorebooks();
            const primaryLorebook = charLorebooks.primary;
            
            if (!primaryLorebook) {
                throw new Error("角色卡未绑定主要世界书");
            }
            
            const entries = await getLorebookEntries(primaryLorebook);
            const promptEntry = entries.find(e => e.comment === this.PROMPT_SUMMARY_KEY);
            
            if (!promptEntry) {
                throw new Error("未找到总结提示词条目");
            }
            
            return { promptEntry, primaryLorebook };
        } catch (error) {
            console.error("获取总结提示词失败:", error);
            throw error;
        }
    }

    // 生成聊天总结
    async generateChatSummary(npcId, currentDialogueId) {
        try {
            // 确保总结条目存在
            const { summaryEntry } = await this.ensureSummary(npcId);
            
            // 获取聊天历史数据
            const { chatHistoryEntry } = await this.ensureChatHistory(npcId);
            const chatData = JSON.parse(chatHistoryEntry.content);
            const chat_history = chatData.chat_history || [];
            const last_summary_id = chatData.last_summary_id || 0;
            
            // 先备份当前总结
            await this.backupSummary(npcId);
            
            // 获取总结提示词
            const { promptEntry } = await this.getSummaryPromptEntry();
            const summaryPromptContent = promptEntry.content;
            
            // 从当前总结条目获取现有总结内容
            const currentSummary = summaryEntry.content.replace(/^# 与.*?的对话总结\n\n/g, '');
            
            // 计算需要总结的对话范围
            const dialoguesToSummarize = chat_history.filter(
                item => item.id > last_summary_id && item.id <= currentDialogueId
            );
            
            // 格式化需要总结的对话
            let dialoguesText = "";
            dialoguesToSummarize.forEach(item => {
                dialoguesText += `第${item.id}轮对话\n`;
                dialoguesText += `用户: ${item.user_content}\n`;
                dialoguesText += `${npcId}: ${item.npc_content}\n\n`;
            });
            
            // 构建提示词
            const userPrompt = `请根据以下信息为与${npcId}的对话生成一个摘要：
        
# 现有摘要
${currentSummary}

# 需要总结的新对话
${dialoguesText}

请将最终摘要放在<summary></summary>标签内。摘要应该简洁明了地概括所有重要信息，包括新的发展和关键点。`;

            // 构建提示词注入
            const injects = [{
                role: 'system',
                content: summaryPromptContent, 
                position: 'in_chat',
                depth: 0,
                should_scan: true
            }];

            // 生成总结
            const aiResponse = await generate({
                user_input: userPrompt,
                should_stream: false,
                injects: injects
            });

            // 提取<summary>标签中的内容
            const summaryContent = this.extractSummary(aiResponse);
            
            // 1. 更新总结条目
            const chatLorebook = await this.getChatLorebook();
            await setLorebookEntries(chatLorebook, [{
                uid: summaryEntry.uid,
                content: `# 与${npcId}的对话总结\n\n${summaryContent || aiResponse.trim()}`
            }]);
            
            // 2. 更新聊天历史中的last_summary_id
            chatData.last_summary_id = currentDialogueId;
            await setLorebookEntries(chatLorebook, [{
                uid: chatHistoryEntry.uid,
                content: JSON.stringify(chatData, null, 2)
            }]);
            
            console.log(`已为NPC ${npcId}生成新的总结，最后总结ID: ${currentDialogueId}`);
            return true;
        } catch (error) {
            console.error(`生成NPC ${npcId}聊天总结失败:`, error);
            return false;
        }
    }

    //从AI回复中提取摘要内容
    extractSummary(aiResponse) {
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
        
        // 提取摘要内容
        const summaryMatch = processedResponse.match(/<summary>([\s\S]*?)<\/summary>/i);
        
        if (summaryMatch && summaryMatch[1]) {
            return summaryMatch[1].trim();
        }
        
        // 如果没有找到标签，返回处理后的整个回复
        return processedResponse.trim();
    }

    // 获取通用消息提示词条目
    async getPromptMessageEntry() {
        try {
            const charLorebooks = getCharLorebooks();
            const primaryLorebook = charLorebooks.primary;
            
            if (!primaryLorebook) {
                throw new Error("角色卡未绑定主要世界书");
            }
            
            const entries = await getLorebookEntries(primaryLorebook);
            const promptEntry = entries.find(e => e.comment === this.PROMPT_MESSAGE_KEY);
            
            if (!promptEntry) {
                throw new Error("未找到通用消息提示词条目");
            }
            
            return { promptEntry, primaryLorebook };
        } catch (error) {
            console.error("获取通用消息提示词失败:", error);
            throw error;
        }
    }

    // 处理用户消息并生成NPC回复
    async processMessage(npcId, message) {
        if (this.isGenerating) {
            return "系统繁忙，正在处理上一条消息，请稍后再试。";
        }
        
        this.isGenerating = true;
        
        try {
            // 1. 确保聊天历史和总结条目存在
            await this.ensureChatHistory(npcId);
            await this.ensureSummary(npcId);
            
            // 2. 获取NPC信息
            const { infoA, infoB, primaryLorebook } = await this.getNpcInfo(npcId);
            
            // 3. 获取提示词条目内容
            const { promptEntry } = await this.getPromptMessageEntry();
            const promptContent = promptEntry.content;
            
            // 4. 格式化聊天历史为AI可理解的格式
            const formattedHistory = await this.formatChatHistoryForAI(npcId);
            
            // 构建提示词注入
            const injects = [
                {
                    role: 'system',
                    content: promptContent, 
                    position: 'in_chat',
                    depth: 0,
                    should_scan: true
                },
                {
                    role: 'system',
                    content: `你正在扮演NPC "${npcId}"。以下是你的角色信息:\n\n${infoB.content}`,
                    position: 'in_chat',
                    depth: 1,
                    should_scan: true
                },
                {
                    role: 'system',
                    content: formattedHistory,
                    position: 'in_chat',
                    depth: 2,
                    should_scan: true
                }
            ];
            
            // 生成NPC回复
            const response = await generate({
                user_input: `用户发送给你的消息: ${message}\n\n请根据角色设定和对话历史，生成一个符合你角色身份的回复。只输出角色回复内容，不要输出思考过程。将最终回复放在<npc_reply></npc_reply>标签中。`,
                should_stream: false,
                injects: injects
            });
            
            // 处理回复
            const npcReply = this.extractNpcReply(response);
            
            // 添加对话到JSON聊天记录，并检查是否需要总结
            const { dialogueId, needSummary } = await this.addDialogue(npcId, message, npcReply);
            
            // 记录最后一次交互
            this.lastInteraction = {
                npcId: npcId,
                userMessage: message,
                npcReply: npcReply,
                lastDialogueId: dialogueId
            };
            
            // 如果需要总结，发出独立的总结请求
            if (needSummary) {
                // 异步执行总结，不阻塞主回复
                this.generateChatSummary(npcId, dialogueId).then(success => {
                    if (success) {
                        console.log(`成功为对话ID ${dialogueId}生成了总结`);
                    } else {
                        console.error(`为对话ID ${dialogueId}生成总结失败`);
                    }
                });
            }

            this.isGenerating = false;
            return npcReply;
        } catch (error) {
            console.error(`处理NPC ${npcId}消息失败:`, error);
            this.isGenerating = false;
            
            // 提供更有用的错误信息
            if (error.message.includes("未找到NPC")) {
                return `系统错误: 找不到ID为"${npcId}"的NPC。请检查NPC ID是否正确。`;
            } else if (error.message.includes("未绑定主要世界书")) {
                return "系统错误: 角色卡未绑定主要世界书。请先设置角色卡世界书。";
            } else {
                return `系统错误: ${error.message}`;
            }
        }
    }

    // 重新生成最后一条回复
    async rerun() {
        if (!this.lastInteraction.npcId || !this.lastInteraction.userMessage) {
            return "错误：没有找到上一次的交互记录，无法重新生成。";
        }
        
        try {
            const npcId = this.lastInteraction.npcId;
            const lastDialogueId = this.lastInteraction.lastDialogueId;
            
            // 1. 获取聊天历史，记录目前的最后总结ID
            const { chatLorebook, chatHistoryEntry } = await this.ensureChatHistory(npcId);
            const chatData = JSON.parse(chatHistoryEntry.content);
            const currentLastSummaryId = chatData.last_summary_id;
            
            // 2. 恢复总结备份
            await this.restoreSummaryFromBackup(npcId);
            
            // 3. 检查最后一条对话是否应该触发总结
            const shouldTriggerSummary = (lastDialogueId - currentLastSummaryId) >= this.SUMMARY_INTERVAL;
            
            // 4. 删除最后一条对话
            if (chatData.chat_history.length > 0 && 
                chatData.chat_history[chatData.chat_history.length - 1].id === lastDialogueId) {
                
                // 删除最后一条对话
                chatData.chat_history.pop();
                
                // 保存更新
                await setLorebookEntries(chatLorebook, [{
                    uid: chatHistoryEntry.uid,
                    content: JSON.stringify(chatData, null, 2)
                }]);
                
                console.log(`已删除NPC ${npcId}的最后一条对话记录`);
            }
            
            // 5. 重新生成回复
            const npcReply = await this.processMessage(npcId, this.lastInteraction.userMessage);
            
            // 6. 如果原来应该触发总结，确保总结也被重新生成
            if (shouldTriggerSummary) {
                // 获取最新的对话ID
                const updatedChatData = JSON.parse((await getLorebookEntries(chatLorebook))
                    .find(e => e.comment === this.CHAT_HISTORY_PREFIX + npcId).content);
                const newLastDialogueId = updatedChatData.chat_history.length > 0 
                    ? updatedChatData.chat_history[updatedChatData.chat_history.length - 1].id 
                    : 0;
                    
                // 强制生成总结，即使可能不满足总结条件
                console.log(`重新生成时检测到原对话需要总结，正在重新生成总结...`);
                await this.generateChatSummary(npcId, newLastDialogueId);
            }
            
            return npcReply;
        } catch (error) {
            console.error(`重新生成NPC回复失败:`, error);
            return `系统错误：重新生成回复失败 - ${error.message}`;
        }
    }

    // 从AI回复中提取NPC回复内容
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

    // 检查NPC是否存在
    async checkNpcExists(npcId) {
        try {
            await this.getNpcInfo(npcId);
            return true;
        } catch (error) {
            return false;
        }
    }

    // 强制重置生成状态（用于恢复被卡住的请求）
    resetGeneratingState() {
        if (this.isGenerating) {
            console.log("手动重置NPC消息生成状态");
            this.isGenerating = false;
            return true;
        }
        return false;
    }
}