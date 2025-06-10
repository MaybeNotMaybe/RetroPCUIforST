// js/models/lorebookModel.js
class LorebookModel {
    constructor(serviceLocator) {
        // 服务依赖注入
        this.serviceLocator = serviceLocator;
        this.storage = serviceLocator.get('storage');
        this.eventBus = serviceLocator.get('eventBus');
        
        // 缓存机制，减少API调用
        this.entriesCache = new Map(); // worldbookId -> entries
        this.cacheTimeout = 60000; // 缓存有效期(毫秒)
        this.lastCacheTime = new Map(); // worldbookId -> timestamp

        // 从存储服务加载缓存设置
        this.loadCacheSettings();

        // 常量定义
        this.NPC_INFO_PREFIX = "npc_";
        this.NPC_INFO_SUFFIX_A = "_A";
        this.NPC_INFO_SUFFIX_B = "_B";
        
        this.CHAT_HISTORY_PREFIX = "chat_json_";
        this.CHAT_SUMMARY_PREFIX = "summary_json_";
        
        this.PROMPT_MESSAGE_KEY = "prompt_message";
        this.PROMPT_SUMMARY_KEY = "prompt_summary";

        // 玩家身份相关常量
        this.PLAYER_IDENTITY_PREFIX = "player_identity_";
        this.PLAYER_IDENTITY_SUFFIX_REAL = "real";
        this.PLAYER_IDENTITY_SUFFIX_COVER = "cover";
        this.PLAYER_IDENTITY_SUFFIX_DISGUISE = "disguise";
        this.PLAYER_IDENTITY_ENTRY_CONFIG = {
            enabled: false,
            type: 'constant',
            position: 'after_author_note',
            keys: []
        };

        // 新增：用户数据相关常量
        this.USER_DATA_KEY = "user_data";
        this.USER_DATA_ENTRY_CONFIG = {
            enabled: false,
            type: 'constant',
            position: 'after_author_note',
            keys: []
        };

        // 新增：默认数据配置
        this.DEFAULT_USER_DATA = {
            stats: {
                "调查能力": 50,
                "伪装技巧": 50,
                "情报分析": 50,
                "社交能力": 50,
                "技术能力": 50
            },
            skills: {
                "轻武器使用": { "level": "入门", "experience": 0, "maxExp": 100 },
                "载具驾驶": { "level": "入门", "experience": 0, "maxExp": 100 },
                "飞机驾驶": { "level": "入门", "experience": 0, "maxExp": 100 },
                "格斗": { "level": "入门", "experience": 0, "maxExp": 100 },
                "潜行": { "level": "入门", "experience": 0, "maxExp": 100 },
                "跟踪": { "level": "入门", "experience": 0, "maxExp": 100 },
                "反跟踪": { "level": "入门", "experience": 0, "maxExp": 100 },
                "IT能力": { "level": "入门", "experience": 0, "maxExp": 100 },
                "解锁能力": { "level": "入门", "experience": 0, "maxExp": 100 },
                "重武器使用": { "level": "入门", "experience": 0, "maxExp": 100 }
            },
            metadata: {
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                version: "1.0"
            }
        };

        // 新增：技能等级配置
        this.SKILL_LEVELS = [
            { "level": "入门", "expRequired": 100 },
            { "level": "上手", "expRequired": 200 },
            { "level": "精通", "expRequired": 400 },
            { "level": "大师", "expRequired": null }
        ];

        // 新增：默认伪装扩展数据
        this.DEFAULT_DISGUISE_EXTENSIONS = {
            disguiseStatus: {
                "启用时间": new Date().toISOString(),
                "状态": "有效",
                "风险等级": "中等",
                "持续时间": "无限制",
                "使用次数": 1
            },
            disguiseCapability: {
                "身份可信度": "85%",
                "文件完整性": "完整",
                "背景故事": "已构建",
                "识破风险": "中等",
                "维持难度": "标准",
                "最后验证": new Date().toISOString()
            },
            operationRecord: {
                "创建方式": "手动配置",
                "验证状态": "已验证",
                "有效期限": "无限制",
                "安全级别": "临时",
                "访问权限": "受限",
                "监控状态": "未监控",
                "备份状态": "已备份",
                "加密等级": "标准"
            }
        };
    }

    // 加载缓存设置
    loadCacheSettings() {
        if (!this.storage) return;
        
        const settings = this.storage.load('lorebookCacheSettings', null);
        if (settings) {
            this.cacheTimeout = settings.timeout || this.cacheTimeout;
        }
    }

    // 保存缓存设置
    saveCacheSettings() {
        if (!this.storage) return;
        
        const settings = {
            timeout: this.cacheTimeout
        };
        this.storage.save('lorebookCacheSettings', settings);
    }

    // 获取或创建聊天世界书
    async getOrCreateChatLorebook(lorebookName) {
        try {
            // 直接调用全局函数
            const chatLorebook = await getOrCreateChatLorebook(lorebookName);
            
            // 发布事件
            if (this.eventBus) {
                this.eventBus.emit('lorebookDataChanged', { 
                    type: 'chatLorebook', 
                    data: chatLorebook 
                });
            }
            
            return chatLorebook;
        } catch (error) {
            console.error("获取聊天世界书失败:", error);
            throw error;
        }
    }

    // 获取当前角色卡绑定的世界书
    getCharLorebooks() {
        try {
            // 直接调用全局函数
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
                console.log(`从缓存加载世界书 ${lorebookId} 条目`);
                return this.entriesCache.get(lorebookId);
            }

            // 直接调用全局函数
            console.log(`从API获取世界书 ${lorebookId} 条目, forceRefresh: ${forceRefresh}`);
            const entries = await getLorebookEntries(lorebookId);
            
            // 更新缓存
            this.entriesCache.set(lorebookId, entries);
            this.lastCacheTime.set(lorebookId, now);
            
            // 发布事件
            if (this.eventBus) {
                this.eventBus.emit('lorebookDataChanged', { 
                    type: 'entries', 
                    lorebookId,
                    count: entries ? entries.length : 0
                });
            }
            
            return entries;
        } catch (error) {
            console.error(`获取世界书 ${lorebookId} 条目失败:`, error);
            throw error;
        }
    }

    // 更新世界书条目
    async setLorebookEntries(lorebookId, entries) {
        try {
            // 直接调用全局函数
            const result = await setLorebookEntries(lorebookId, entries);
            
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
            // 直接调用全局函数
            const result = await createLorebookEntries(lorebookId, entries);
            
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
        
        // 发布缓存清除事件
        if (this.eventBus) {
            this.eventBus.emit('lorebookCacheCleared', { lorebookId });
        }
    }
    
    // 设置缓存超时时间
    setCacheTimeout(milliseconds) {
        if (typeof milliseconds === 'number' && milliseconds >= 0) {
            this.cacheTimeout = milliseconds;
            this.saveCacheSettings();
            return true;
        }
        return false;
    }
}