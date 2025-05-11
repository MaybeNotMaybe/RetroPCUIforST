// js/models/npcChatModel.js
class NpcChatModel {
    constructor() {
        // 最小化存储的状态，不预加载任何内容
        this.isGenerating = false;
        this.conversationCounts = {};
        
        // 常量定义
        this.NPC_INFO_PREFIX = "npc_";
        this.NPC_INFO_SUFFIX_A = "_A";
        this.NPC_INFO_SUFFIX_B = "_B";
        
        this.CHAT_HISTORY_PREFIX = "chat_history_";
        this.CHAT_RECENT_PREFIX = "chat_recent_";
        this.CHAT_SUMMARY_PREFIX = "chat_summary_";
        
        this.PROMPT_MESSAGE_KEY = "prompt_message";
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

    // 确保NPC的聊天记录条目存在，每次调用时重新验证
    async ensureChatRecords(npcId) {
        try {
            // 获取当前聊天世界书（即时）
            const chatLorebook = await this.getChatLorebook();
            
            // 获取最新条目列表
            const entries = await getLorebookEntries(chatLorebook);
            
            const historyComment = this.CHAT_HISTORY_PREFIX + npcId;
            const recentComment = this.CHAT_RECENT_PREFIX + npcId;
            const summaryComment = this.CHAT_SUMMARY_PREFIX + npcId;
            
            const historyEntry = entries.find(e => e.comment === historyComment);
            const recentEntry = entries.find(e => e.comment === recentComment);
            const summaryEntry = entries.find(e => e.comment === summaryComment);
            
            const entriesToCreate = [];
            
            // 检查并准备创建缺失的条目
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
            
            if (!recentEntry) {
                entriesToCreate.push({
                    comment: recentComment,
                    enabled: false,
                    type: 'selective',
                    position: 'before_character_definition',
                    keys: [],
                    content: `# 与${npcId}的最近5轮聊天\n<!-- conversation_count: 0 -->\n\n`
                });
            }
            
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
            
            // 创建缺失的条目
            if (entriesToCreate.length > 0) {
                await createLorebookEntries(chatLorebook, entriesToCreate);
                console.log(`为NPC ${npcId}创建了${entriesToCreate.length}个聊天记录条目`);
            }
            
            // 返回聊天世界书和所有最新条目
            return {
                chatLorebook,
                entries: await getLorebookEntries(chatLorebook) // 重新获取包含新创建条目的完整列表
            };
        } catch (error) {
            console.error(`确保NPC ${npcId}聊天记录失败:`, error);
            throw error;
        }
    }

    // 更新NPC的聊天记录
    async updateChatRecords(npcId, userMessage, npcReply) {
        try {
            // 获取所有最新条目
            const { chatLorebook, entries } = await this.ensureChatRecords(npcId);
            
            // 查找聊天记录条目
            const historyComment = this.CHAT_HISTORY_PREFIX + npcId;
            const recentComment = this.CHAT_RECENT_PREFIX + npcId;
            const summaryComment = this.CHAT_SUMMARY_PREFIX + npcId;
            
            const historyEntry = entries.find(e => e.comment === historyComment);
            const recentEntry = entries.find(e => e.comment === recentComment);
            const summaryEntry = entries.find(e => e.comment === summaryComment);
            
            // 安全检查：如果条目不存在，抛出明确错误
            if (!historyEntry || !recentEntry || !summaryEntry) {
                throw new Error(`NPC ${npcId}的聊天记录条目不完整，请检查世界书`);
            }
            
            const now = new Date();
            const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
            
            // 构建新的对话记录
            const newConversation = `## ${timestamp}\n\n**玩家:** ${userMessage}\n\n**${npcId}:** ${npcReply}\n\n`;
            
            // 更新全部历史记录
            const updatedHistoryContent = historyEntry.content + newConversation;
            
            // 从最近聊天记录中提取当前计数器值
            let conversationCount = 0;
            const countMatch = recentEntry.content.match(/<!-- conversation_count: (\d+) -->/);
            if (countMatch && countMatch[1]) {
                conversationCount = parseInt(countMatch[1], 10);
            }
            
            // 增加计数器
            conversationCount += 1;
            
            // 更新最近5轮对话内容
            let recentContent = recentEntry.content;
            
            // 如果没有计数器标记，添加一个
            if (!countMatch) {
                recentContent = `# 与${npcId}的最近5轮聊天\n<!-- conversation_count: 1 -->\n\n${newConversation}`;
            } else {
                // 移除标题和计数器行，处理内容
                let recentLines = recentContent.split('\n\n');
                
                // 保留标题行（可能包含计数器）
                const titleLines = recentLines[0].split('\n');
                
                // 如果对话超过5轮，移除最旧的一轮
                if (recentLines.length > 11) { // 标题 + 5轮对话(每轮2段) = 11行
                    recentLines = recentLines.slice(0, 1).concat(recentLines.slice(3)); // 保留标题，移除最旧的一轮
                }
                
                // 添加新对话
                recentLines.push(newConversation);
                
                // 更新标题中的计数器
                titleLines[1] = `<!-- conversation_count: ${conversationCount} -->`;
                recentLines[0] = titleLines.join('\n');
                
                recentContent = recentLines.join('\n\n');
            }
            
            // 准备更新条目
            const updatedEntries = [
                {
                    uid: historyEntry.uid,
                    content: updatedHistoryContent
                },
                {
                    uid: recentEntry.uid,
                    content: recentContent
                }
            ];
            
            // 检查是否需要更新摘要(每5次对话)
            let summaryUpdated = false;
            if (conversationCount >= 5) {
                // 更新摘要
                await this.generateChatSummary(npcId, chatLorebook, recentEntry, summaryEntry);
                
                // 重置计数器为0（摘要已更新）
                const titleLines = recentContent.split('\n');
                titleLines[1] = `<!-- conversation_count: 0 -->`;
                recentContent = titleLines.join('\n');
                
                // 更新条目以反映重置的计数器
                updatedEntries[1].content = recentContent;
                
                summaryUpdated = true;
            }
            
            // 保存更新后的聊天记录
            await setLorebookEntries(chatLorebook, updatedEntries);
            
            console.log(`已更新NPC ${npcId}的聊天记录，当前对话计数: ${conversationCount}${summaryUpdated ? '，并已更新聊天摘要' : ''}`);
            
            return true;
        } catch (error) {
            console.error(`更新NPC ${npcId}聊天记录失败:`, error);
            throw error;
        }
    }

    // 生成聊天摘要
    async generateChatSummary(npcId, chatLorebook, recentEntry, summaryEntry) {
        try {
            // 构建摘要生成提示词
            const prompt = `我需要你总结以下对话内容，生成一份300-400字的简洁摘要。
摘要应该捕捉对话的关键点、重要信息和情感基调。
请直接开始总结，无需额外说明。

# 现有摘要
${summaryEntry.content}

# 最近对话
${recentEntry.content.replace(/<!-- conversation_count: \d+ -->\n/g, '')}

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
            await setLorebookEntries(chatLorebook, [updatedSummaryEntry]);
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
            const charLorebooks = getCharLorebooks();
            const primaryLorebook = charLorebooks.primary;
            
            if (!primaryLorebook) {
                throw new Error("角色卡未绑定主要世界书");
            }
            
            // 获取所有条目（即时查询）
            const entries = await getLorebookEntries(primaryLorebook);
            
            // 查找通用提示词条目
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
            // 1. 确保聊天记录条目存在（重新验证）
            const { chatLorebook, entries } = await this.ensureChatRecords(npcId);
            
            // 2. 获取NPC信息（即时）
            const { infoA, infoB, primaryLorebook } = await this.getNpcInfo(npcId);
            
            // 3. 获取提示词条目并启用（即时）
            const { promptEntry } = await this.getPromptMessageEntry();
            await setLorebookEntries(primaryLorebook, [{
                uid: promptEntry.uid,
                enabled: true
            }]);
            
            // 4. 获取聊天记录条目（已在步骤1中获取）
            const recentComment = this.CHAT_RECENT_PREFIX + npcId;
            const summaryComment = this.CHAT_SUMMARY_PREFIX + npcId;
            
            const recentEntry = entries.find(e => e.comment === recentComment);
            const summaryEntry = entries.find(e => e.comment === summaryComment);
            
            if (!recentEntry || !summaryEntry) {
                throw new Error(`NPC ${npcId}的聊天记录条目不完整`);
            }
            
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
                    content: summaryEntry.content,
                    position: 'in_chat',
                    depth: 0,
                    should_scan: true
                },
                {
                    role: 'system',
                    content: recentEntry.content,
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
            await setLorebookEntries(primaryLorebook, [{
                uid: promptEntry.uid,
                enabled: false
            }]);
            
            // 处理回复
            const npcReply = this.extractNpcReply(response);
            
            // 更新聊天记录
            await this.updateChatRecords(npcId, message, npcReply);
            
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