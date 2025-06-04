// js/models/npcChatModel.js
/**
 * NPC聊天模型
 * 管理NPC对话数据和业务逻辑
 */
class NpcChatModel {
    constructor(serviceLocator) {
        // 服务依赖
        this.serviceLocator = serviceLocator;
        this.eventBus = serviceLocator.get('eventBus');
        this.storage = serviceLocator.get('storage');
        
        // 最小化存储的状态
        this.isGenerating = false;
        
        // 总结设置
        this.SUMMARY_INTERVAL = 4; 

        // 跟踪最后一次交互
        this.lastInteraction = {
            npcId: null,
            userMessage: null,
            npcReply: null,
            lastDialogueId: null
        };
        
        // 初始化状态
        this.initialized = false;
    }

    /**
     * 初始化聊天模型
     * @returns {Promise<boolean>} 初始化结果
     */
    async initialize() {
        if (this.initialized) {
            return true;
        }
        
        try {
            // 等待Lorebook服务
            let lorebookService = this.serviceLocator.get('lorebook');
            
            if (!lorebookService) {
                console.log("等待Lorebook服务初始化...");
                
                // 等待Lorebook服务可用
                await new Promise(resolve => {
                    const checkInterval = setInterval(() => {
                        lorebookService = this.serviceLocator.get('lorebook');
                        if (lorebookService) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 300);
                });
            }
            
            console.log("NPC聊天模型初始化完成");
            this.initialized = true;
            
            // 发布初始化完成事件
            if (this.eventBus) {
                this.eventBus.emit('npcChatInitialized', true);
            }
            
            return true;
        } catch (error) {
            console.error("NPC聊天模型初始化失败:", error);
            return false;
        }
    }

    /**
     * 格式化聊天历史为发送给AI的格式
     * @param {string} npcId - NPC ID
     * @param {number} maxRounds - 最大对话轮数
     * @returns {Promise<string>} 格式化的历史记录
     */
    async formatChatHistoryForAI(npcId, maxRounds = 10) {
        try {
            const lorebookService = this.serviceLocator.get('lorebook');
            
            // 获取聊天历史
            const { chatHistoryEntry } = await lorebookService.ensureChatHistory(npcId);
            const chatData = JSON.parse(chatHistoryEntry.content);
            const chat_history = chatData.chat_history || [];
            
            // 获取总结
            const { summaryEntry } = await lorebookService.ensureSummary(npcId);
            const summaryData = JSON.parse(summaryEntry.content);
            const summaries = summaryData.summaries || [];
            
            // 查找最后一个总结
            const lastSummary = summaries.length > 0 ? summaries[summaries.length - 1] : null;
            
            // 查找最后一个标记为总结轮次的对话
            const lastSummaryRound = lorebookService.findLastSummaryRound(chat_history);
            const lastSummaryRoundId = lastSummaryRound ? lastSummaryRound.id : 0;
            
            // 只获取最后总结轮次之后的对话
            const relevantHistory = lastSummaryRoundId > 0 
                ? chat_history.filter(e => e.id > lastSummaryRoundId)
                : chat_history;
            
            // 如果对话数量超过maxRounds，则只保留最近的maxRounds轮
            const recentHistory = relevantHistory.slice(-maxRounds);
            
            let formattedHistory = "";
            
            // 先添加最后的总结（如果有）
            if (lastSummary) {
                formattedHistory += "# 对话总结\n";
                formattedHistory += lastSummary.content + "\n\n";
            }
            
            // 添加最近对话历史
            formattedHistory += "# 最近对话\n";
            
            recentHistory.forEach(item => {
                formattedHistory += `第${item.id}轮对话\n`;
                formattedHistory += `用户: ${item.user_content}\n`;
                formattedHistory += `${npcId}: ${item.npc_content}\n\n`;
            });
            
            return formattedHistory.trim();
        } catch (error) {
            console.error(`格式化NPC ${npcId}聊天历史失败:`, error);
            return "# 最近对话\n无法加载对话历史。";
        }
    }

    /**
     * 生成聊天总结
     * @param {string} npcId - NPC ID
     * @param {number} currentDialogueId - 当前对话ID
     * @returns {Promise<boolean>} 生成结果
     */
    async generateChatSummary(npcId, currentDialogueId) {
        try {
            const lorebookService = this.serviceLocator.get('lorebook');
            
            // 确保总结条目存在
            const { summaryEntry } = await lorebookService.ensureSummary(npcId);
            
            // 获取聊天历史数据
            const { chatHistoryEntry } = await lorebookService.ensureChatHistory(npcId);
            const chatData = JSON.parse(chatHistoryEntry.content);
            const chat_history = chatData.chat_history || [];
            
            // 解析当前总结数据
            const summaryData = JSON.parse(summaryEntry.content);
            const summaries = summaryData.summaries || [];
            
            // 查找最后一个总结
            const lastSummary = summaries.length > 0 ? summaries[summaries.length - 1] : null;
            const lastSummaryRoundId = lastSummary ? lastSummary.summary_round_id : 0;
            
            // 查找上一个标记为总结轮次的对话ID
            const previousSummaryRound = this.findPreviousSummaryRound(chat_history, currentDialogueId);
            const previousSummaryRoundId = previousSummaryRound ? previousSummaryRound.id : 0;
            
            // 计算需要总结的对话范围
            const dialoguesToSummarize = chat_history.filter(
                item => item.id > previousSummaryRoundId && item.id <= currentDialogueId
            );
            
            // 获取总结提示词
            const { promptEntry } = await lorebookService.getSummaryPromptEntry();
            const summaryPromptContent = promptEntry.content;
            
            // 格式化需要总结的对话
            let dialoguesText = "";
            dialoguesToSummarize.forEach(item => {
                dialoguesText += `第${item.id}轮对话\n`;
                dialoguesText += `用户: ${item.user_content}\n`;
                dialoguesText += `${npcId}: ${item.npc_content}\n\n`;
            });
            
            // 构建提示词
            const userPrompt = `请根据以下信息为与${npcId}的对话生成一个摘要：
            
    ${lastSummary ? '# 现有摘要\n' + lastSummary.content + '\n\n' : ''}

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

            // 生成总结 - 使用全局的generate函数
            const aiResponse = await generate({
                user_input: userPrompt,
                should_stream: false,
                injects: injects
            });

            // 提取<summary>标签中的内容
            const summaryContent = this.extractSummary(aiResponse);
            
            // 创建新的总结对象
            const newSummary = {
                summary_round_id: currentDialogueId,
                content: summaryContent || aiResponse.trim(),
                previous_summary_round_id: lastSummaryRoundId
            };
            
            // 添加新总结到总结数组
            summaries.push(newSummary);
            
            // 更新总结条目
            const chatLorebook = await lorebookService.getOrCreateChatLorebook();
            await lorebookService.model.setLorebookEntries(chatLorebook, [{
                uid: summaryEntry.uid,
                content: JSON.stringify({summaries: summaries}, null, 2)
            }]);
            
            console.log(`已为NPC ${npcId}生成新的总结，关联对话ID: ${currentDialogueId}`);
            
            // 发布事件
            if (this.eventBus) {
                this.eventBus.emit('chatSummaryGenerated', {
                    npcId,
                    dialogueId: currentDialogueId
                });
            }
            
            return true;
        } catch (error) {
            console.error(`生成NPC ${npcId}聊天总结失败:`, error);
            return false;
        }
    }

    /**
     * 查找当前对话之前的最后一个标记为总结轮次的对话
     * @param {Array} chat_history - 聊天历史记录
     * @param {number} currentDialogueId - 当前对话ID
     * @returns {Object|null} 上一个总结轮次对话
     */
    findPreviousSummaryRound(chat_history, currentDialogueId) {
        // 反向遍历，找到当前ID之前的第一个标记为总结轮次的对话
        for (let i = chat_history.length - 1; i >= 0; i--) {
            if (chat_history[i].is_Summary_Round && chat_history[i].id < currentDialogueId) {
                return chat_history[i];
            }
        }
        return null; // 没有找到之前的总结轮次
    }

    /**
     * 处理用户消息并生成NPC回复
     * @param {string} npcId - NPC ID
     * @param {string} message - 用户消息
     * @returns {Promise<string>} NPC回复
     */
    async processMessage(npcId, message) {
        if (this.isGenerating) {
            return "系统繁忙，正在处理上一条消息，请稍后再试。";
        }
        
        this.isGenerating = true;
        
        try {
            const lorebookService = this.serviceLocator.get('lorebook');
            
            // 1. 确保聊天历史和总结条目存在
            await lorebookService.ensureChatHistory(npcId);
            await lorebookService.ensureSummary(npcId);
            
            // 2. 获取NPC信息
            const { infoA, infoB, primaryLorebook } = await lorebookService.getNpcInfo(npcId);
            
            // 3. 获取提示词条目内容
            const { promptEntry } = await lorebookService.getPromptMessageEntry();
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
            
            // 生成NPC回复 - 使用全局generate函数
            const response = await generate({
                user_input: `用户发送给你的消息: ${message}\n\n请根据角色设定和对话历史，生成一个符合你角色身份的回复。只输出角色回复内容，不要输出思考过程。将最终回复放在<npc_reply></npc_reply>标签中。`,
                should_stream: false,
                injects: injects
            });
            
            // 处理回复
            const npcReply = this.extractNpcReply(response);
            
            // 添加对话到聊天记录，并检查是否需要总结
            const { dialogueId, needSummary } = await lorebookService.addDialogue(npcId, message, npcReply);
            
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
            
            // 发布消息生成完成事件
            if (this.eventBus) {
                this.eventBus.emit('npcMessageGenerated', {
                    npcId,
                    dialogueId,
                    message,
                    reply: npcReply
                });
            }
            
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

    /**
     * 重新生成最后一条回复
     * @returns {Promise<string>} 新的NPC回复
     */
    async rerun() {
        if (!this.lastInteraction.npcId || !this.lastInteraction.userMessage) {
            return "错误：没有找到上一次的交互记录，无法重新生成。";
        }
        
        try {
            const lorebookService = this.serviceLocator.get('lorebook');
            const npcId = this.lastInteraction.npcId;
            const lastDialogueId = this.lastInteraction.lastDialogueId;
            
            // 1. 获取聊天历史数据
            const { chatLorebook, chatHistoryEntry } = await lorebookService.ensureChatHistory(npcId);
            const chatData = JSON.parse(chatHistoryEntry.content);
            const chat_history = chatData.chat_history || [];
            
            // 2. 检查最后一条对话是否存在且是否为总结轮次
            if (chat_history.length > 0 && 
                chat_history[chat_history.length - 1].id === lastDialogueId) {
                
                const lastDialogue = chat_history[chat_history.length - 1];
                const wasSummaryRound = lastDialogue.is_Summary_Round;
                
                console.log(`重新生成对话 ID: ${lastDialogueId}, 原始是否为总结轮次: ${wasSummaryRound}`);
                
                // 3. 如果是总结轮次，需要删除相关总结
                if (wasSummaryRound) {
                    // 获取总结数据
                    const { summaryEntry } = await lorebookService.ensureSummary(npcId);
                    const summaryData = JSON.parse(summaryEntry.content);
                    const summaries = summaryData.summaries || [];
                    
                    // 删除与该对话ID关联的总结
                    const updatedSummaries = summaries.filter(s => s.summary_round_id !== lastDialogueId);
                    
                    // 更新总结条目
                    await lorebookService.model.setLorebookEntries(chatLorebook, [{
                        uid: summaryEntry.uid,
                        content: JSON.stringify({summaries: updatedSummaries}, null, 2)
                    }]);
                    
                    console.log(`已删除NPC ${npcId}对话ID ${lastDialogueId}关联的总结`);
                }
                
                // 4. 删除最后一条对话
                chat_history.pop();
                
                // 保存更新
                await lorebookService.model.setLorebookEntries(chatLorebook, [{
                    uid: chatHistoryEntry.uid,
                    content: JSON.stringify({...chatData, chat_history}, null, 2)
                }]);
                
                console.log(`已删除NPC ${npcId}的最后一条对话记录`);
            }
            
            // 5. 重新生成回复
            const npcReply = await this.processMessage(npcId, this.lastInteraction.userMessage);
            
            // 发布重新生成事件
            if (this.eventBus) {
                this.eventBus.emit('npcMessageRegenerated', {
                    npcId,
                    reply: npcReply
                });
            }
            
            // 完成后返回新的回复
            return npcReply;
        } catch (error) {
            console.error(`重新生成NPC回复失败:`, error);
            return `系统错误：重新生成回复失败 - ${error.message}`;
        }
    }

    /**
     * 从AI回复中提取NPC回复内容
     * @param {string} aiResponse - AI回复
     * @returns {string} 提取的NPC回复
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

    /**
     * 从AI回复中提取摘要内容
     * @param {string} aiResponse - AI回复
     * @returns {string} 提取的摘要内容
     */
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

    /**
     * 强制重置生成状态（用于恢复被卡住的请求）
     * @returns {boolean} 是否重置了状态
     */
    resetGeneratingState() {
        if (this.isGenerating) {
            console.log("手动重置NPC消息生成状态");
            this.isGenerating = false;
            
            // 发布状态重置事件
            if (this.eventBus) {
                this.eventBus.emit('npcGeneratingStateReset', {
                    lastNpcId: this.lastInteraction.npcId
                });
            }
            
            return true;
        }
        return false;
    }
}