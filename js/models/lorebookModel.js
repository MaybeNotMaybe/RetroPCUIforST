// js/models/lorebookModel.js
class LorebookModel {
    constructor() {
        // 缓存机制，减少API调用
        this.entriesCache = new Map(); // worldbookId -> entries
        this.cacheTimeout = 60000; // 缓存有效期(毫秒)
        this.lastCacheTime = new Map(); // worldbookId -> timestamp

        // 常量定义
        this.NPC_INFO_PREFIX = "npc_";
        this.NPC_INFO_SUFFIX_A = "_A";
        this.NPC_INFO_SUFFIX_B = "_B";
        
        this.CHAT_HISTORY_PREFIX = "chat_json_";
        this.CHAT_SUMMARY_PREFIX = "summary_json_";
        
        this.PROMPT_MESSAGE_KEY = "prompt_message";
        this.PROMPT_SUMMARY_KEY = "prompt_summary";
    }

    // 获取或创建聊天世界书
    async getOrCreateChatLorebook(lorebookName) {
        try {
            const chatLorebook = await getOrCreateChatLorebook(lorebookName);
            console.log("获取聊天世界书成功:", chatLorebook);
            return chatLorebook;
        } catch (error) {
            console.error("获取聊天世界书失败:", error);
            throw error;
        }
    }

    // 获取当前角色卡绑定的世界书
    getCharLorebooks() {
        try {
            return getCharLorebooks();
        } catch (error) {
            console.error("获取角色卡世界书失败:", error);
            throw error;
        }
    }

    // 获取世界书条目
    async getLorebookEntries(lorebookId, forceRefresh = false) {
        try {
            // 检查缓存
            const now = Date.now();
            if (!forceRefresh && 
                this.entriesCache.has(lorebookId) && 
                now - this.lastCacheTime.get(lorebookId) < this.cacheTimeout) {
                return this.entriesCache.get(lorebookId);
            }

            // 获取新的条目数据
            const entries = await getLorebookEntries(lorebookId);
            
            // 更新缓存
            this.entriesCache.set(lorebookId, entries);
            this.lastCacheTime.set(lorebookId, now);
            
            return entries;
        } catch (error) {
            console.error(`获取世界书${lorebookId}条目失败:`, error);
            throw error;
        }
    }

    // 更新世界书条目
    async setLorebookEntries(lorebookId, entries) {
        try {
            const result = await setLorebookEntries(lorebookId, entries);
            
            // 更新缓存
            if (this.entriesCache.has(lorebookId)) {
                // 强制刷新缓存
                await this.getLorebookEntries(lorebookId, true);
            }
            
            return result;
        } catch (error) {
            console.error(`更新世界书${lorebookId}条目失败:`, error);
            throw error;
        }
    }

    // 创建新的世界书条目
    async createLorebookEntries(lorebookId, entries) {
        try {
            const result = await createLorebookEntries(lorebookId, entries);
            
            // 强制刷新缓存
            if (this.entriesCache.has(lorebookId)) {
                await this.getLorebookEntries(lorebookId, true);
            }
            
            return result;
        } catch (error) {
            console.error(`创建世界书${lorebookId}条目失败:`, error);
            throw error;
        }
    }

    // 查找指定注释的条目
    async findEntryByComment(lorebookId, comment) {
        const entries = await this.getLorebookEntries(lorebookId);
        return entries.find(entry => entry.comment === comment);
    }

    // 解析JSON格式的条目内容
    parseJsonContent(content) {
        try {
            return JSON.parse(content);
        } catch (error) {
            console.error("解析JSON内容失败:", error);
            return null;
        }
    }

    // 清除特定世界书的缓存
    clearCache(lorebookId) {
        if (lorebookId) {
            this.entriesCache.delete(lorebookId);
            this.lastCacheTime.delete(lorebookId);
        } else {
            // 清除所有缓存
            this.entriesCache.clear();
            this.lastCacheTime.clear();
        }
    }
}