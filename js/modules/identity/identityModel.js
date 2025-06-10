// js/models/identityModel.js
class IdentityModel {
    constructor(serviceLocator) {
        // 服务依赖
        this.serviceLocator = serviceLocator;
        this.storage = serviceLocator.get('storage');
        this.eventBus = serviceLocator.get('eventBus');
        this.lorebookService = serviceLocator.get('lorebook');
        
        // 身份属性常量
        this.NATIONALITIES = [
            "美国", "苏联", "英国", "法国", "西德", "东德"
        ];
        
        this.IDENTITY_TYPES = [
            "平民", "政府雇员", "外交人员", "情报人员", "军人", "警察", "非法者"
        ];
        
        this.FUNCTIONS = {
            "平民": ["记者", "科研人员", "政客", "商人"],
            "政府雇员": ["高级文官", "普通职员", "档案管理员"],
            "外交人员": ["外交官", "使馆雇员", "武官"],
            "情报人员": ["间谍", "外勤特工", "反情报官", "情报分析师", "深眠特工", "技术专家"],
            "军人": ["军官", "士兵", "宪兵"],
            "警察": ["巡警", "警探", "联邦探员"],
            "非法者": ["情报掮客", "走私者", "伪造专家", "黑客", "黑帮成员"]
        };
        
        this.ORGANIZATIONS = {
            "美国": {
                "情报人员": ["CIA", "NSA", "FBI"]
            }
            // 其他国家默认单一机构，无需指定
        };
        
        // NPC身份列表
        this.knownIdentities = [];
        
        // 单一存储键名
        this.STORAGE_KEY = 'player_identities';
        
        // 身份类型
        this.IDENTITY_TYPES_KEY = {
            REAL: 'real',
            COVER: 'cover',
            DISGUISE: 'disguise'
        };
        
        // 只有在storage存在时才初始化本地身份
        if (this.storage) {
            this.initLocalIdentities();
        }
    }
    
    // 默认身份获取方法
    getDefaultRealIdentity() {
        return {
            nationality: "苏联", 
            type: "情报人员",  
            function: "间谍",    
            organization: "KGB" 
        };
    }

    getDefaultCoverIdentity() {
        return {
            nationality: "美国", 
            type: "情报人员",  
            function: "外勤特工", 
            organization: "CIA"  
        };
    }

    getDefaultDisguiseIdentity() {
        return null; // 默认没有伪装身份
    }
    
    // 从Lorebook控制器获取的安全方法
    _getLorebookController() {
        // 首先尝试从全局变量获取
        if (window.lorebookController) {
            return window.lorebookController;
        }
        
        // 如果没有，尝试从serviceLocator获取组件
        if (this.serviceLocator) {
            return this.serviceLocator.getComponent 
                ? this.serviceLocator.getComponent('lorebookController') 
                : null;
        }
        
        return null;
    }
    
    // 获取本地存储的所有身份数据
    _getLocalIdentities() {
        if (!this.storage) return null;
        
        const identities = this.storage.load(this.STORAGE_KEY, null);
        if (!identities) {
            return {
                [this.IDENTITY_TYPES_KEY.REAL]: null,
                [this.IDENTITY_TYPES_KEY.COVER]: null,
                [this.IDENTITY_TYPES_KEY.DISGUISE]: null
            };
        }
        return identities;
    }
    
    // 保存单个身份到本地存储
    _saveLocalIdentity(type, identityData) {
        if (!this.storage) return false;
        
        // 获取当前存储的身份
        const currentIdentity = this._getLocalIdentity(type);
        
        // 检查是否真的需要更新（避免频繁保存相同数据）
        if (JSON.stringify(currentIdentity) === JSON.stringify(identityData)) {
            // console.log(`身份系统: ${type}身份数据未变化，跳过保存`);
            return true;
        }
        
        // 获取当前存储的所有身份
        const identities = this._getLocalIdentities();
        
        // 更新指定类型的身份
        identities[type] = identityData;
        
        // 保存回存储
        this.storage.save(this.STORAGE_KEY, identities);
        console.log(`身份系统: 已将${type}身份保存到本地存储`);
        return true;
    }
    
    // 从本地存储获取指定类型的身份
    _getLocalIdentity(type) {
        if (!this.storage) return null;
        
        const identities = this._getLocalIdentities();
        return identities ? identities[type] : null;
    }
    
    // 初始化本地存储中的身份信息
    initLocalIdentities() {
        if (!this.storage) return;
        
        try {
            // 获取当前存储
            let identities = this._getLocalIdentities();
            let needsUpdate = false;
            
            // 如果本地没有真实身份，初始化
            if (!identities[this.IDENTITY_TYPES_KEY.REAL]) {
                identities[this.IDENTITY_TYPES_KEY.REAL] = this.getDefaultRealIdentity();
                needsUpdate = true;
            }
            
            // 如果本地没有表面身份，初始化
            if (!identities[this.IDENTITY_TYPES_KEY.COVER]) {
                identities[this.IDENTITY_TYPES_KEY.COVER] = this.getDefaultCoverIdentity();
                needsUpdate = true;
            }
            
            // 如果需要更新，保存回存储
            if (needsUpdate) {
                this.storage.save(this.STORAGE_KEY, identities);
            }
            
            console.log("身份系统: 本地存储身份数据初始化完成");
        } catch (error) {
            console.error("身份系统: 初始化本地身份数据时出错:", error);
        }
    }
    
    // 异步身份获取方法
    async getRealIdentity() {
        try {
            const controller = this._getLorebookController();
            
            if (controller && controller.getPlayerIdentity) {
                const suffix = controller.model 
                    ? controller.model.PLAYER_IDENTITY_SUFFIX_REAL 
                    : 'real';
                
                // 尝试从世界书获取身份，不提供默认值
                const identity = await controller.getPlayerIdentity(suffix);
                
                // 如果成功获取且不为null，同步到本地存储
                if (identity && identity !== null) {
                    this._saveLocalIdentity(this.IDENTITY_TYPES_KEY.REAL, identity);
                    return identity;
                }
            }
        } catch (error) {
            console.warn("从世界书获取真实身份失败，尝试从本地存储获取:", error);
        }
        
        // 从本地存储获取
        const localIdentity = this._getLocalIdentity(this.IDENTITY_TYPES_KEY.REAL);
        if (localIdentity) {
            console.log("身份系统: 从本地存储获取真实身份");
            return localIdentity;
        }
        
        // 都失败时才使用默认值，并自动保存到世界书
        console.log("身份系统: 使用默认真实身份并初始化到世界书");
        const defaultIdentity = this.getDefaultRealIdentity();
        
        // 异步保存默认身份到世界书，不等待结果
        this._saveDefaultIdentityToWorldbook('real', defaultIdentity);
        
        return defaultIdentity;
    }

    async getCoverIdentity() {
        try {
            const controller = this._getLorebookController();
            
            if (controller && controller.getPlayerIdentity) {
                const suffix = controller.model 
                    ? controller.model.PLAYER_IDENTITY_SUFFIX_COVER 
                    : 'cover';
                
                // 尝试从世界书获取身份，不提供默认值
                const identity = await controller.getPlayerIdentity(suffix);
                
                // 如果成功获取且不为null，同步到本地存储
                if (identity && identity !== null) {
                    this._saveLocalIdentity(this.IDENTITY_TYPES_KEY.COVER, identity);
                    return identity;
                }
            }
        } catch (error) {
            console.warn("从世界书获取表面身份失败，尝试从本地存储获取:", error);
        }
        
        // 从本地存储获取
        const localIdentity = this._getLocalIdentity(this.IDENTITY_TYPES_KEY.COVER);
        if (localIdentity) {
            console.log("身份系统: 从本地存储获取表面身份");
            return localIdentity;
        }
        
        // 都失败时才使用默认值，并自动保存到世界书
        console.log("身份系统: 使用默认表面身份并初始化到世界书");
        const defaultIdentity = this.getDefaultCoverIdentity();
        
        // 异步保存默认身份到世界书，不等待结果
        this._saveDefaultIdentityToWorldbook('cover', defaultIdentity);
        
        return defaultIdentity;
    }

    async getDisguiseIdentity() {
        try {
            const controller = this._getLorebookController();
            
            if (controller && controller.getPlayerIdentity) {
                const suffix = controller.model 
                    ? controller.model.PLAYER_IDENTITY_SUFFIX_DISGUISE 
                    : 'disguise';
                
                // 尝试从世界书获取身份，不提供默认值
                const identity = await controller.getPlayerIdentity(suffix);
                
                // 如果成功获取，同步到本地存储（伪装可以为null）
                if (identity !== undefined) {
                    this._saveLocalIdentity(this.IDENTITY_TYPES_KEY.DISGUISE, identity);
                    return identity;
                }
            }
        } catch (error) {
            console.warn("从世界书获取伪装身份失败，尝试从本地存储获取:", error);
        }
        
        // 从本地存储获取
        const localIdentity = this._getLocalIdentity(this.IDENTITY_TYPES_KEY.DISGUISE);
        if (localIdentity !== undefined) {
            console.log("身份系统: 从本地存储获取伪装身份");
            return localIdentity;
        }
        
        // 都失败时返回null（伪装默认为空）
        return this.getDefaultDisguiseIdentity();
    }

    // 新增：异步保存默认身份到世界书的方法
    async _saveDefaultIdentityToWorldbook(identityType, identityData) {
        try {
            const controller = this._getLorebookController();
            if (controller && controller.setPlayerIdentity) {
                const suffix = identityType;
                const success = await controller.setPlayerIdentity(suffix, identityData);
                if (success) {
                    console.log(`身份系统: 成功初始化${identityType}身份到世界书`);
                    // 同步到本地存储
                    this._saveLocalIdentity(
                        identityType === 'real' ? this.IDENTITY_TYPES_KEY.REAL : this.IDENTITY_TYPES_KEY.COVER, 
                        identityData
                    );
                }
            }
        } catch (error) {
            console.warn(`初始化${identityType}身份到世界书失败:`, error);
        }
    }

    // 异步身份设置方法
    async setRealIdentity(nationality, type, func, organization = null) {
        const identityData = { nationality, type, function: func, organization };
        this.validateIdentity(identityData);
        
        let success = false;
        
        // 1. 尝试保存到世界书
        try {
            const controller = this._getLorebookController();
            
            if (controller && controller.setPlayerIdentity) {
                const suffix = controller.model 
                    ? controller.model.PLAYER_IDENTITY_SUFFIX_REAL 
                    : 'real';
                
                success = await controller.setPlayerIdentity(suffix, identityData);
                if (success) {
                    console.log("身份系统: 成功保存真实身份到世界书");
                }
            }
        } catch (error) {
            console.warn("向世界书保存真实身份失败，将仅使用本地存储:", error);
        }
        
        // 2. 无论世界书成功与否，都保存到本地存储
        const localSuccess = this._saveLocalIdentity(this.IDENTITY_TYPES_KEY.REAL, identityData);
        success = success || localSuccess;
        
        // 3. 如果任一保存成功，触发事件
        if (success && this.eventBus) {
            this.eventBus.emit('playerIdentityChanged', {
                type: 'real',
                identityData
            });
        }
        
        return success;
    }

    async setCoverIdentity(nationality, type, func, organization = null) {
        const identityData = { nationality, type, function: func, organization };
        this.validateIdentity(identityData);
        
        let success = false;
        
        // 1. 尝试保存到世界书
        try {
            const controller = this._getLorebookController();
            
            if (controller && controller.setPlayerIdentity) {
                const suffix = controller.model 
                    ? controller.model.PLAYER_IDENTITY_SUFFIX_COVER 
                    : 'cover';
                
                success = await controller.setPlayerIdentity(suffix, identityData);
                if (success) {
                    console.log("身份系统: 成功保存表面身份到世界书");
                }
            }
        } catch (error) {
            console.warn("向世界书保存表面身份失败，将仅使用本地存储:", error);
        }
        
        // 2. 无论世界书成功与否，都保存到本地存储
        const localSuccess = this._saveLocalIdentity(this.IDENTITY_TYPES_KEY.COVER, identityData);
        success = success || localSuccess;
        
        // 3. 如果任一保存成功，触发事件
        if (success && this.eventBus) {
            this.eventBus.emit('playerIdentityChanged', {
                type: 'cover',
                identityData
            });
        }
        
        return success;
    }

    async setDisguiseIdentity(nationality, type, func, organization = null) {
        const basicData = { nationality, type, function: func, organization };
        this.validateIdentity(basicData);
        
        let success = false;
        
        // 1. 尝试保存到世界书（使用扩展方法）
        try {
            const controller = this._getLorebookController();
            
            if (controller && controller.setPlayerIdentityExtended) {
                // 使用扩展方法保存伪装身份，包含默认扩展数据
                success = await controller.setPlayerIdentityExtended(
                    controller.model.PLAYER_IDENTITY_SUFFIX_DISGUISE, 
                    basicData
                );
                if (success) {
                    console.log("身份系统: 成功保存扩展伪装身份到世界书");
                }
            } else if (controller && controller.setPlayerIdentity) {
                // 回退到原有方法
                success = await controller.setPlayerIdentity(
                    controller.model.PLAYER_IDENTITY_SUFFIX_DISGUISE, 
                    basicData
                );
            }
        } catch (error) {
            console.warn("向世界书保存伪装身份失败，将仅使用本地存储:", error);
        }
        
        // 2. 无论世界书成功与否，都保存到本地存储（仅基础数据）
        const localSuccess = this._saveLocalIdentity(this.IDENTITY_TYPES_KEY.DISGUISE, basicData);
        success = success || localSuccess;
        
        // 3. 如果任一保存成功，触发事件
        if (success && this.eventBus) {
            this.eventBus.emit('disguiseChanged', {
                identityData: basicData
            });
            
            this.eventBus.emit('playerIdentityChanged', {
                type: 'disguise',
                identityData: basicData
            });
        }
        
        return success;
    }
    
    // 清除伪装
    async clearDisguise() {
        let success = false;
        
        // 1. 尝试在世界书中清除
        try {
            const controller = this._getLorebookController();
            
            if (controller && controller.clearPlayerDisguiseIdentity) {
                success = await controller.clearPlayerDisguiseIdentity();
                if (success) {
                    console.log("身份系统: 成功在世界书中清除伪装身份");
                }
            }
        } catch (error) {
            console.warn("在世界书中清除伪装身份失败，将仅在本地存储中清除:", error);
        }
        
        // 2. 无论世界书成功与否，都在本地存储中清除
        const localSuccess = this._saveLocalIdentity(this.IDENTITY_TYPES_KEY.DISGUISE, null);
        success = success || localSuccess;
        
        // 3. 如果任一操作成功，触发事件
        if (success && this.eventBus) {
            this.eventBus.emit('disguiseChanged', {
                identityData: null
            });
            
            this.eventBus.emit('playerIdentityChanged', {
                type: 'disguise',
                identityData: null
            });
        }
        
        return success;
    }
    
    // 获取当前有效身份(有伪装则为伪装，否则为表面身份)
    async getCurrentIdentity() {
        try {
            const disguise = await this.getDisguiseIdentity();
            if (disguise) { // 如果伪装身份存在且不为null
                return disguise;
            }
            return await this.getCoverIdentity();
        } catch (error) {
            console.error("获取当前身份失败:", error);
            return await this.getCoverIdentity(); // 出错时尝试返回表面身份
        }
    }
    
    // 验证身份合法性
    validateIdentity(identity) {
        if (!identity) {
            console.warn("尝试验证一个空的身份对象。");
            return;
        }
        
        // 验证国籍
        if (!this.NATIONALITIES.includes(identity.nationality)) {
            console.error(`无效的国籍: ${identity.nationality}`);
        }
        
        // 验证身份类型
        if (!this.IDENTITY_TYPES.includes(identity.type)) {
            console.error(`无效的身份类型: ${identity.type}`);
        }
        
        // 验证职能
        if (identity.function && this.FUNCTIONS[identity.type]) {
            if (!this.FUNCTIONS[identity.type].includes(identity.function)) {
                console.error(`无效的职能 ${identity.function} (类型 ${identity.type})`);
            }
        } else if (identity.function && !this.FUNCTIONS[identity.type]) {
            console.error(`类型 ${identity.type} 没有预定义的职能列表，但提供了职能 ${identity.function}`);
        }
        
        // 验证机构(仅美国情报人员需要)
        if (identity.organization) {
            if (identity.nationality === "美国" && identity.type === "情报人员") {
                if (!this.ORGANIZATIONS["美国"]["情报人员"].includes(identity.organization)) {
                    console.error(`无效的机构: ${identity.organization} 对于美国情报人员`);
                }
            }
        }
    }
    
    // 格式化身份字符串
    formatIdentity(identity) {
        if (!identity) return "无"; // 如果身份对象为null或undefined
        
        let result = `[${identity.nationality || '未知国籍'}]`; // 处理属性可能不存在的情况
        result += ` [${identity.type || '未知类型'}]`;
        if (identity.function) {
            result += ` [${identity.function}]`;
        }
        if (identity.organization) {
            result += ` [${identity.organization}]`;
        }
        return result;
    }
    
    // 检查伪装是否被识破(根据给定概率)
    async checkDisguiseDetection(detectionRate) {
        const disguiseIdentity = await this.getDisguiseIdentity();
        if (!disguiseIdentity) return false; // 如果没有伪装身份，则不会被识破
        return Math.random() < detectionRate;
    }
    
    // 伪装被识破，恢复为表面身份
    async blowDisguise() {
        const result = await this.clearDisguise(); // 清除伪装身份
        
        // 发布伪装被识破事件
        if (this.eventBus && result) {
            this.eventBus.emit('disguiseBlown', {
                timestamp: new Date().toISOString()
            });
        }
        
        return result;
    }
    
    // 获取指定类型可用的职能列表
    getFunctionsForType(type) {
        return this.FUNCTIONS[type] || [];
    }
    
    // 获取指定国籍和类型可用的机构列表
    getOrganizationsForIdentity(nationality, type) {
        if (this.ORGANIZATIONS[nationality] && this.ORGANIZATIONS[nationality][type]) {
            return this.ORGANIZATIONS[nationality][type];
        }
        // 特殊处理美国情报人员
        if (nationality === "美国" && type === "情报人员" && 
            this.ORGANIZATIONS["美国"] && this.ORGANIZATIONS["美国"]["情报人员"]) {
            return this.ORGANIZATIONS["美国"]["情报人员"];
        }
        return [];
    }

    // 新增：获取伪装扩展数据
    async getDisguiseExtendedData() {
        try {
            const controller = this._getLorebookController();
            
            if (controller && controller.getPlayerIdentity) {
                const suffix = controller.model 
                    ? controller.model.PLAYER_IDENTITY_SUFFIX_DISGUISE 
                    : 'disguise';
                
                // 从世界书获取完整的伪装数据（包含扩展信息）
                const fullDisguiseData = await controller.getPlayerIdentity(suffix, null);
                
                if (fullDisguiseData) {
                    return {
                        basic: {
                            nationality: fullDisguiseData.nationality,
                            type: fullDisguiseData.type,
                            function: fullDisguiseData.function,
                            organization: fullDisguiseData.organization
                        },
                        extensions: {
                            disguiseStatus: fullDisguiseData.disguiseStatus,
                            disguiseCapability: fullDisguiseData.disguiseCapability,
                            operationRecord: fullDisguiseData.operationRecord
                        }
                    };
                }
            }
        } catch (error) {
            console.warn("从世界书获取伪装扩展数据失败:", error);
        }
        
        return null;
    }
}