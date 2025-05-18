// js/models/lorebookModel.js
/**
 * 世界书数据模型类
 * 负责世界书数据的管理、缓存和业务逻辑
 */
class LorebookModel {
    constructor(serviceLocator) {
        // 服务依赖注入
        this.serviceLocator = serviceLocator;
        this.api = serviceLocator.get('api');
        this.storage = serviceLocator.get('storage');
        this.eventBus = serviceLocator.get('eventBus');
        
        // 缓存机制，减少API调用
        this.entriesCache = new Map(); // worldbookId -> entries
        this.cacheTimeout = 60000; // 缓存有效期(毫秒)
        this.lastCacheTime = new Map(); // worldbookId -> timestamp
        
        // 从存储加载缓存设置
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
        
        // 监听系统事件
        this.setupEventListeners();
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 系统关闭时保存缓存设置
        this.eventBus.on('systemPowerChange', (isOn) => {
            if (!isOn) {
                this.saveCacheSettings();
            }
        });
        
        // 测试模式变化时可以调整缓存行为
        this.eventBus.on('testModeChanged', (isTestMode) => {
            if (isTestMode) {
                // 测试模式下减少缓存时间以便测试
                this.cacheTimeout = 5000; // 测试模式下5秒
            } else {
                this.cacheTimeout = 60000; // 正常模式下60秒
            }
        });
    }
    
    /**
     * 加载缓存设置
     */
    loadCacheSettings() {
        const settings = this.storage.load('lorebookCacheSettings', {
            timeout: 60000
        });
        
        this.cacheTimeout = settings.timeout;
    }
    
    /**
     * 保存缓存设置
     */
    saveCacheSettings() {
        this.storage.save('lorebookCacheSettings', {
            timeout: this.cacheTimeout
        });
    }

    /**
     * 获取或创建聊天世界书
     * @param {string} [lorebookName] - 可选的世界书名称
     * @returns {Promise<string>} 世界书ID
     */
    async getOrCreateChatLorebook(lorebookName) {
        try {
            const chatLorebook = await this.api.getOrCreateChatLorebook(lorebookName);
            this.eventBus.emit('lorebookDataChanged', { 
                type: 'chatLorebook', 
                data: chatLorebook 
            });
            return chatLorebook;
        } catch (error) {
            console.error("获取聊天世界书失败:", error);
            throw error;
        }
    }

    /**
     * 获取当前角色卡绑定的世界书
     * @returns {Object} 包含primary和secondary世界书ID的对象
     */
    getCharLorebooks() {
        try {
            return this.api.getCharLorebooks();
        } catch (error) {
            console.error("获取角色卡世界书失败:", error);
            throw error;
        }
    }

    /**
     * 获取世界书条目
     * @param {string} lorebookId - 世界书ID
     * @param {boolean} [forceRefresh=false] - 是否强制刷新缓存
     * @returns {Promise<Array>} 条目数组
     */
    async getLorebookEntries(lorebookId, forceRefresh = false) {
        try {
            // 检查缓存
            const now = Date.now();
            if (!forceRefresh && 
                this.entriesCache.has(lorebookId) && 
                now - this.lastCacheTime.get(lorebookId) < this.cacheTimeout) {
                this.eventBus.emit('cacheHit', { 
                    type: 'lorebookEntries', 
                    id: lorebookId 
                });
                return this.entriesCache.get(lorebookId);
            }

            // 获取新的条目数据
            this.eventBus.emit('cacheMiss', { 
                type: 'lorebookEntries', 
                id: lorebookId 
            });
            
            const entries = await this.api.getLorebookEntries(lorebookId);
            
            // 更新缓存
            this.entriesCache.set(lorebookId, entries);
            this.lastCacheTime.set(lorebookId, now);
            
            return entries;
        } catch (error) {
            console.error(`获取世界书 ${lorebookId} 条目失败:`, error);
            throw error;
        }
    }

    /**
     * 更新世界书条目
     * @param {string} lorebookId - 世界书ID
     * @param {Array} entries - 条目数组
     * @returns {Promise<boolean>} 操作是否成功
     */
    async setLorebookEntries(lorebookId, entries) {
        try {
            const result = await this.api.setLorebookEntries(lorebookId, entries);
            
            // 更新缓存
            if (this.entriesCache.has(lorebookId)) {
                // 强制刷新缓存
                await this.getLorebookEntries(lorebookId, true);
            }
            
            // 发布事件
            this.eventBus.emit('lorebookDataChanged', {
                type: 'entriesUpdated',
                lorebookId: lorebookId
            });
            
            return result;
        } catch (error) {
            console.error(`更新世界书 ${lorebookId} 条目失败:`, error);
            throw error;
        }
    }

    /**
     * 创建新的世界书条目
     * @param {string} lorebookId - 世界书ID
     * @param {Array} entries - 条目数组
     * @returns {Promise<boolean>} 操作是否成功
     */
    async createLorebookEntries(lorebookId, entries) {
        try {
            const result = await this.api.createLorebookEntries(lorebookId, entries);
            
            // 强制刷新缓存
            if (this.entriesCache.has(lorebookId)) {
                await this.getLorebookEntries(lorebookId, true);
            }
            
            // 发布事件
            this.eventBus.emit('lorebookDataChanged', {
                type: 'entriesCreated',
                lorebookId: lorebookId
            });
            
            return result;
        } catch (error) {
            console.error(`创建世界书 ${lorebookId} 条目失败:`, error);
            throw error;
        }
    }

    /**
     * 查找指定注释的条目
     * @param {string} lorebookId - 世界书ID
     * @param {string} comment - 条目注释
     * @returns {Promise<Object|undefined>} 找到的条目或undefined
     */
    async findEntryByComment(lorebookId, comment) {
        const entries = await this.getLorebookEntries(lorebookId);
        if (entries && Array.isArray(entries)) {
            return entries.find(entry => entry.comment === comment);
        }
        console.warn(`在世界书 ${lorebookId} 中未找到条目或条目格式不正确，comment: ${comment}`);
        return undefined;
    }

    /**
     * 解析JSON格式的条目内容
     * @param {string} content - JSON字符串
     * @returns {Object|null} 解析后的对象或null
     */
    parseJsonContent(content) {
        try {
            return JSON.parse(content);
        } catch (error) {
            console.error("解析JSON内容失败:", error, "内容:", content);
            return null;
        }
    }

    /**
     * 清除特定世界书的缓存
     * @param {string} [lorebookId] - 世界书ID，不提供则清除所有缓存
     */
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
        this.eventBus.emit('cacheCleared', {
            lorebookId: lorebookId || 'all'
        });
    }
    
    /**
     * 导出缓存数据（用于调试）
     * @returns {Object} 缓存数据摘要
     */
    exportCacheInfo() {
        const cacheInfo = {
            timeout: this.cacheTimeout,
            entries: {}
        };
        
        for (const [id, timestamp] of this.lastCacheTime.entries()) {
            const entryCount = this.entriesCache.get(id)?.length || 0;
            const age = Date.now() - timestamp;
            const isExpired = age > this.cacheTimeout;
            
            cacheInfo.entries[id] = {
                entryCount,
                ageMs: age,
                isExpired,
                lastUpdated: new Date(timestamp).toISOString()
            };
        }
        
        return cacheInfo;
    }
}