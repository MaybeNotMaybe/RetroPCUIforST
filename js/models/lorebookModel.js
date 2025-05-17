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

        // 玩家身份相关常量 (新增)
        this.PLAYER_IDENTITY_PREFIX = "player_identity_";
        this.PLAYER_IDENTITY_SUFFIX_REAL = "real";
        this.PLAYER_IDENTITY_SUFFIX_COVER = "cover";
        this.PLAYER_IDENTITY_SUFFIX_DISGUISE = "disguise";
        this.PLAYER_IDENTITY_ENTRY_CONFIG = { // 玩家身份条目的默认配置 (新增)
            enabled: false, // 默认关闭，不直接注入AI上下文，由代码逻辑读取
            type: 'constant', // 类型为常量
            position: 'after_author_note', // 位置（可根据实际需求调整，此处为示例）
            keys: [] // 关键字（如果需要的话）
        };
    }

    // 获取或创建聊天世界书
    async getOrCreateChatLorebook(lorebookName) {
        try {
            // 如果 lorebookName 未提供，则假定API能够处理获取当前聊天绑定的世界书
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
            return getCharLorebooks(); // 这是全局函数
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
                console.log(`从缓存加载世界书 ${lorebookId} 条目`);
                return this.entriesCache.get(lorebookId);
            }

            // 获取新的条目数据
            console.log(`从API获取世界书 ${lorebookId} 条目, forceRefresh: ${forceRefresh}`);
            const entries = await getLorebookEntries(lorebookId); // 这是全局函数
            
            // 更新缓存
            this.entriesCache.set(lorebookId, entries);
            this.lastCacheTime.set(lorebookId, now);
            
            return entries;
        } catch (error) {
            console.error(`获取世界书 ${lorebookId} 条目失败:`, error);
            throw error;
        }
    }

    // 更新世界书条目
    async setLorebookEntries(lorebookId, entries) {
        try {
            const result = await setLorebookEntries(lorebookId, entries); // 这是全局函数
            
            // 更新缓存
            if (this.entriesCache.has(lorebookId)) {
                // 强制刷新缓存
                console.log(`更新世界书 ${lorebookId} 条目后，强制刷新缓存`);
                await this.getLorebookEntries(lorebookId, true);
            }
            
            return result;
        } catch (error) {
            console.error(`更新世界书 ${lorebookId} 条目失败:`, error);
            throw error;
        }
    }

    // 创建新的世界书条目
    async createLorebookEntries(lorebookId, entries) {
        try {
            const result = await createLorebookEntries(lorebookId, entries); // 这是全局函数
            
            // 强制刷新缓存
            if (this.entriesCache.has(lorebookId)) {
                console.log(`创建世界书 ${lorebookId} 条目后，强制刷新缓存`);
                await this.getLorebookEntries(lorebookId, true);
            }
            
            return result;
        } catch (error) {
            console.error(`创建世界书 ${lorebookId} 条目失败:`, error);
            throw error;
        }
    }

    // 查找指定注释的条目
    async findEntryByComment(lorebookId, comment) {
        const entries = await this.getLorebookEntries(lorebookId);
        if (entries && Array.isArray(entries)) {
            return entries.find(entry => entry.comment === comment);
        }
        console.warn(`在世界书 ${lorebookId} 中未找到条目或条目格式不正确，comment: ${comment}`);
        return undefined;
    }

    // 解析JSON格式的条目内容
    parseJsonContent(content) {
        try {
            return JSON.parse(content);
        } catch (error) {
            console.error("解析JSON内容失败:", error, "内容:", content);
            return null; // 返回null表示解析失败
        }
    }

    // 清除特定世界书的缓存
    clearCache(lorebookId) {
        if (lorebookId) {
            this.entriesCache.delete(lorebookId);
            this.lastCacheTime.delete(lorebookId);
            console.log(`已清除世界书 ${lorebookId} 的缓存`);
        } else {
            // 清除所有缓存
            this.entriesCache.clear();
            this.lastCacheTime.clear();
            console.log("已清除所有世界书缓存");
        }
    }
}
