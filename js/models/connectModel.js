// js/models/connectModel.js
class ConnectModel {
    constructor() {
        // 连接状态相关属性
        this.isConnected = false;        // 是否处于连接状态
        this.currentTarget = null;       // 当前连接的目标
        this.isWaitingResponse = false;  // 是否正在等待AI响应
        this.messageToSend = null;       // 要发送的用户输入
        
        // 提示词对象
        this.npcPrompt = null;
        this.connectPrompt = null;
        
        // CDN基础URL配置
        // this.cdnBaseUrl = "https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@964bff7/";

        // 添加聊天历史管理器
        this.chatHistoryManager = new NpcChatHistoryManager();

    }
    
    // 检查是否当前已连接
    isActive() {
        return this.isConnected;
    }
    
    // 设置要发送的消息
    setMessageToSend(message) {
        this.messageToSend = message;
    }
    
    // 获取要发送的消息并清除
    getAndClearMessageToSend() {
        const message = this.messageToSend;
        this.messageToSend = null;
        return message;
    }
    
    // 辅助函数：提取<npc_reply>标签中的内容
    extractNpcReply(text) {
        try {
            // 克隆原始文本以便调试
            const originalText = text;
            let cleanedText = text;
            
            // 步骤1：移除所有可能的思维链块格式（不区分大小写）
            const thinkingPatterns = [
                /<thinking>[\s\S]*?<\/thinking>/gi,    // 标准格式
                /<think>[\s\S]*?<\/think>/gi,          // 简写格式
                /<cot>[\s\S]*?<\/cot>/gi,              // Chain of Thought格式
                /<reasoning>[\s\S]*?<\/reasoning>/gi,  // 推理格式
                /<thoughts>[\s\S]*?<\/thoughts>/gi,    // 复数形式
                /<thought>[\s\S]*?<\/thought>/gi,      // 单数形式
                /<reflection>[\s\S]*?<\/reflection>/gi // 反思格式
            ];
            
            // 逐个应用清除模式
            thinkingPatterns.forEach(pattern => {
                cleanedText = cleanedText.replace(pattern, '');
            });
            
            // 步骤2：移除所有 HTML 注释内容 <!-- -->
            cleanedText = cleanedText.replace(/<!--[\s\S]*?-->/g, '');
            
            // 步骤3：移除其他可能干扰的标签块
            const tagsToClean = [
                'details', 'summary', 'status', 'abstract',
                'description', 'context', 'background', 'notes'
            ];
            cleanedText = this.cleanTags(cleanedText, tagsToClean);
            
            // 记录清理进度
            if (window.DEBUG_MODE) {
                console.log("原始长度:", originalText.length);
                console.log("清理后长度:", cleanedText.length);
                console.log("移除了字符:", originalText.length - cleanedText.length);
            }
            
            // 步骤4：严格匹配完整的 <npc_reply></npc_reply> 标签（不区分大小写）
            const regex = /<npc_reply>([\s\S]*?)<\/npc_reply>/gi;
            const matches = [...cleanedText.matchAll(regex)];
            
            // 找不到有效的 NPC 回复
            if (!matches || matches.length === 0) {
                console.error("无法从AI回复中提取有效的NPC回复");
                if (window.DEBUG_MODE) {
                    console.log("清理后的文本:", cleanedText);
                }
                return null;
            }
            
            // 如果有多个匹配，取第一个匹配的内容
            const replyContent = matches[0][1].trim();
            
            // 记录提取的回复内容以便调试
            if (window.DEBUG_MODE) {
                console.log("成功提取NPC回复:", replyContent);
                if (matches.length > 1) {
                    console.warn(`发现多个NPC回复(${matches.length}个)，仅使用第一个`);
                }
            }
            
            return replyContent;
        } catch (error) {
            console.error("提取NPC回复时出错:", error);
            return null;
        }
    }

    // 通用标签清理方法
    cleanTags(text, tagsList) {
        let result = text;
        tagsList.forEach(tag => {
            const pattern = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'gi');
            result = result.replace(pattern, '');
        });
        return result;
    }
    
    // 带重试的加载JSON文件
    async loadJsonFileWithRetry(path, maxRetries = 3, delay = 1000) {
        let lastError;
        
        // 确保path不会有双重扩展名问题
        const cleanPath = path.replace(/\.json\.json$/, '.json');
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // 使用全局CDN URL
                const fullUrl = window.cdnBaseUrl + cleanPath;
                console.log(`尝试加载 (${attempt}/${maxRetries}): ${fullUrl}`);
                
                const response = await fetch(fullUrl);
                if (!response.ok) {
                    throw new Error(`HTTP错误: ${response.status}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error(`加载失败 (尝试 ${attempt}/${maxRetries}):`, error);
                lastError = error;
                
                if (attempt < maxRetries) {
                    // 等待一段时间后重试
                    await new Promise(resolve => setTimeout(resolve, delay));
                    // 每次重试增加延迟时间
                    delay *= 1.5;
                }
            }
        }
        
        console.error(`所有重试都失败:`, lastError);
        return null;
    }
    
    // 检查NPC是否存在
    async checkNpcExists(npcId) {
        // 首先检查世界书中是否存在该NPC
        const existsInLorebook = await this.checkNpcExistsInLorebook(npcId);
        if (existsInLorebook) {
            return true;
        }
        
        // 如果世界书中未找到，则检查JSON文件（传统方式）
        try {
            // 确保npcId没有.json扩展名
            const cleanId = npcId.endsWith('.json') ? npcId.slice(0, -5) : npcId;
            
            // 构建完整的CDN URL
            const fullUrl = window.cdnBaseUrl + `data/prompt/npc/${cleanId}.json`;
            console.log(`检查NPC文件是否存在: ${fullUrl}`);
            
            const response = await fetch(fullUrl);
            return response.ok;
        } catch (error) {
            console.error(`检查NPC文件存在性失败: ${npcId}`, error);
            return false;
        }
    }
    
    // 获取当前聊天上下文
    async getChatContext() {
        if (this.isConnected && this.currentTarget) {
            return await this.chatHistoryManager.getChatContext();
        }
        return { summary: null, recentChats: null };
    }
    
    // 更新聊天历史
    async updateChatHistory(userMessage, npcResponse) {
        if (this.isConnected && this.currentTarget) {
            return await this.chatHistoryManager.addChat(userMessage, npcResponse);
        }
        return false;
    }
    
    // 配置聊天历史管理器
    setChatHistoryConfig(config) {
        this.chatHistoryManager.setConfig(config);
    }

    // 检查世界书中是否存在NPC
    async checkNpcExistsInLorebook(npcId) {
        try {
            // 获取当前角色卡的主要世界书
            const primaryLorebook = getCurrentCharPrimaryLorebook();
            
            if (!primaryLorebook) {
                console.error("当前角色卡没有绑定主要世界书");
                return false;
            }
            
            // 获取世界书中的所有条目
            const entries = await getLorebookEntries(primaryLorebook);
            
            // 检查是否有comment为"npc_[npcId]"的条目
            const npcEntry = entries.find(entry => entry.comment.toLowerCase() === `npc_${npcId.toLowerCase()}`);
            
            return !!npcEntry;
        } catch (error) {
            console.error(`检查世界书中NPC时出错: ${npcId}`, error);
            return false;
        }
    }

    // 从世界书中获取NPC提示词
    async getNpcPromptFromLorebook(npcId) {
        try {
            // 获取当前角色卡的主要世界书
            const primaryLorebook = getCurrentCharPrimaryLorebook();
            
            if (!primaryLorebook) {
                console.error("当前角色卡没有绑定主要世界书");
                return null;
            }
            
            // 获取世界书中的所有条目
            const entries = await getLorebookEntries(primaryLorebook);
            
            // 查找comment为"npc_[npcId]"的条目
            const npcEntry = entries.find(entry => entry.comment.toLowerCase() === `npc_${npcId.toLowerCase()}`);
            
            if (!npcEntry) {
                console.error(`未找到NPC条目: ${npcId}`);
                return null;
            }
            
            // 解析内容为JSON
            try {
                const promptData = JSON.parse(npcEntry.content);
                return promptData;
            } catch (jsonError) {
                console.error(`解析NPC提示词JSON失败: ${npcId}`, jsonError);
                return null;
            }
        } catch (error) {
            console.error(`从世界书获取NPC提示词时出错: ${npcId}`, error);
            return null;
        }
    }

    // 从世界书中获取通用连接提示词
    async getConnectPromptFromLorebook() {
        try {
            // 获取当前角色卡的主要世界书
            const primaryLorebook = getCurrentCharPrimaryLorebook();
            
            if (!primaryLorebook) {
                console.error("当前角色卡没有绑定主要世界书");
                return null;
            }
            
            // 获取世界书中的所有条目
            const entries = await getLorebookEntries(primaryLorebook);
            
            // 查找comment为"connect_prompt"的条目
            const connectEntry = entries.find(entry => 
                entry.comment.toLowerCase() === "connect_prompt" && entry.enabled);
            
            if (!connectEntry) {
                console.error("未找到通用连接提示词条目或条目未启用");
                return null;
            }
            
            // 解析内容为JSON
            try {
                const promptData = JSON.parse(connectEntry.content);
                return promptData;
            } catch (jsonError) {
                console.error("解析通用连接提示词JSON失败", jsonError);
                return null;
            }
        } catch (error) {
            console.error("从世界书获取通用连接提示词时出错", error);
            return null;
        }
    }
}