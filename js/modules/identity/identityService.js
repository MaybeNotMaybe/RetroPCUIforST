// js/services/identityService.js
/**
 * 身份服务
 * 提供玩家身份管理和状态查询的服务接口
 */
class IdentityService {
    constructor() {
        this.serviceLocator = window.ServiceLocator;
        this.eventBus = this.serviceLocator.get('eventBus');
        this.controller = null;
        this.model = null;
        
        // 初始化标志
        this.initialized = false;
        
        // 初始化服务
        this.initialize();
    }
    
    /**
     * 初始化身份服务
     */
    async initialize() {
        try {
            // 等待身份控制器可用
            this.waitForController();
            
            // 订阅事件
            if (this.eventBus) {
                // 监听GameCore初始化完成事件
                this.eventBus.on('gameCoreInitialized', () => {
                    // 获取已注册的身份控制器
                    const gameCore = window.GameCore;
                    if (gameCore && gameCore.getComponent) {
                        const identityController = gameCore.getComponent('identityController');
                        if (identityController) {
                            this.controller = identityController;
                            this.model = identityController.model;
                            this.initialized = true;
                            console.log("身份服务已连接到身份控制器");
                        }
                    } else if (window.identityController) {
                        // 备用方法：直接从全局获取
                        this.controller = window.identityController;
                        this.model = window.identityController.model;
                        this.initialized = true;
                        console.log("身份服务已连接到全局身份控制器");
                    }
                });
                
                // 监听身份变更事件
                this.eventBus.on('playerIdentityChanged', (eventData) => {
                    // 服务可以在此处进行额外处理
                    console.log("身份服务检测到身份变更:", eventData.type);
                });
                
                // 监听伪装状态变化事件
                this.eventBus.on('disguiseChanged', (eventData) => {
                    console.log("身份服务检测到伪装变更");
                });
                
                // 监听伪装被识破事件
                this.eventBus.on('disguiseBlown', () => {
                    console.log("身份服务检测到伪装被识破");
                });
            }
        } catch (error) {
            console.error("身份服务初始化失败:", error);
        }
    }
    
    /**
     * 等待身份控制器可用
     */
    waitForController() {
        // 检查全局对象是否可用
        if (window.identityController && window.identityController.model) {
            this.controller = window.identityController;
            this.model = window.identityController.model;
            this.initialized = true;
            return;
        }
        
        // 设置轮询检查
        const checkInterval = setInterval(() => {
            if (window.identityController && window.identityController.model) {
                clearInterval(checkInterval);
                this.controller = window.identityController;
                this.model = window.identityController.model;
                this.initialized = this.controller.initialized;
                console.log("身份服务已连接到身份控制器");
            }
        }, 300);
        
        // 设置超时，避免无限等待
        setTimeout(() => clearInterval(checkInterval), 10000);
    }
    
    /**
     * 获取当前活动身份(伪装优先)
     * @returns {Promise<Object|null>} 当前活动身份
     */
    async getCurrentIdentity() {
        if (!this.initialized) {
            console.warn("身份服务尚未初始化，无法获取当前身份");
            return null;
        }
        
        try {
            return await this.model.getCurrentIdentity();
        } catch (error) {
            console.error("获取当前身份失败:", error);
            return null;
        }
    }
    
    /**
     * 获取伪装状态
     * @returns {Promise<Object>} 伪装状态信息
     */
    async getDisguiseStatus() {
        if (!this.initialized) {
            console.warn("身份服务尚未初始化，无法获取伪装状态");
            return { hasDisguise: false };
        }
        
        try {
            const disguise = await this.model.getDisguiseIdentity();
            return {
                hasDisguise: !!disguise,
                disguiseData: disguise
            };
        } catch (error) {
            console.error("获取伪装状态失败:", error);
            return { hasDisguise: false };
        }
    }
    
    /**
     * 设置伪装身份
     * @param {Object} identityData 新的伪装身份数据
     * @returns {Promise<boolean>} 是否成功
     */
    async setDisguise(identityData) {
        if (!this.initialized) {
            console.warn("身份服务尚未初始化，无法设置伪装");
            return false;
        }
        
        try {
            return await this.model.setDisguiseIdentity(
                identityData.nationality,
                identityData.type,
                identityData.function,
                identityData.organization
            );
        } catch (error) {
            console.error("设置伪装失败:", error);
            return false;
        }
    }
    
    /**
     * 清除伪装身份
     * @returns {Promise<boolean>} 是否成功
     */
    async clearDisguise() {
        if (!this.initialized) {
            console.warn("身份服务尚未初始化，无法清除伪装");
            return false;
        }
        
        try {
            return await this.model.clearDisguise();
        } catch (error) {
            console.error("清除伪装失败:", error);
            return false;
        }
    }
    
    /**
     * 检查身份是否被识破
     * @param {number} detectionRate 检测概率(0-1之间)
     * @returns {Promise<boolean>} 是否被识破
     */
    async checkIdentityBlown(detectionRate) {
        if (!this.initialized) {
            console.warn("身份服务尚未初始化，无法检查身份是否被识破");
            return false;
        }
        
        try {
            return await this.controller.checkIdentityBlown(detectionRate);
        } catch (error) {
            console.error("检查身份是否被识破失败:", error);
            return false;
        }
    }
    
    /**
     * 显示或隐藏身份视图
     * @returns {Promise<boolean>} 操作是否成功
     */
    async toggleIdentityView() {
        if (!this.initialized) {
            console.warn("身份服务尚未初始化，无法切换身份视图");
            return false;
        }
        
        try {
            return await this.controller.toggleIdentityView();
        } catch (error) {
            console.error("切换身份视图失败:", error);
            return false;
        }
    }
    
    /**
     * 获取表面身份
     * @returns {Promise<Object|null>} 表面身份数据
     */
    async getCoverIdentity() {
        if (!this.initialized) {
            console.warn("身份服务尚未初始化，无法获取表面身份");
            return null;
        }
        
        try {
            return await this.model.getCoverIdentity();
        } catch (error) {
            console.error("获取表面身份失败:", error);
            return null;
        }
    }
    /**
     * 获取真实身份
     * @returns {Promise<Object|null>} 真实身份数据
     */
    async getRealIdentity() {
        if (!this.initialized) {
            console.warn("身份服务尚未初始化，无法获取真实身份");
            return null;
        }
        
        try {
            return await this.model.getRealIdentity();
        } catch (error) {
            console.error("获取真实身份失败:", error);
            return null;
        }
    }

    /**
     * 获取伪装身份数据
     * @returns {Promise<Object|null>} 伪装身份数据
     */
    async getDisguiseIdentity() {
        if (!this.initialized) {
            console.warn("身份服务尚未初始化，无法获取伪装身份");
            return null;
        }
        
        try {
            return await this.model.getDisguiseIdentity();
        } catch (error) {
            console.error("获取伪装身份失败:", error);
            return null;
        }
    }

    /**
     * 获取所有身份信息
     * @returns {Promise<Object>} 包含所有身份的对象
     */
    async getAllIdentities() {
        if (!this.initialized) {
            console.warn("身份服务尚未初始化，无法获取所有身份");
            return { real: null, cover: null, disguise: null };
        }
        
        try {
            const [real, cover, disguise] = await Promise.all([
                this.model.getRealIdentity(),
                this.model.getCoverIdentity(), 
                this.model.getDisguiseIdentity()
            ]);
            
            return { real, cover, disguise };
        } catch (error) {
            console.error("获取所有身份失败:", error);
            return { real: null, cover: null, disguise: null };
        }
    }

    /**
     * 获取伪装扩展数据
     * @returns {Promise<Object|null>} 伪装扩展数据
     */
    async getDisguiseExtendedData() {
        if (!this.initialized) {
            console.warn("身份服务尚未初始化，无法获取伪装扩展数据");
            return null;
        }
        
        try {
            return await this.model.getDisguiseExtendedData();
        } catch (error) {
            console.error("获取伪装扩展数据失败:", error);
            return null;
        }
    }

    // 新增：用户数据相关服务接口

    /**
     * 获取用户统计数据
     * @returns {Promise<Object|null>} 用户统计数据
     */
    async getUserStats() {
        if (!this.initialized) {
            console.warn("身份服务尚未初始化，无法获取用户统计数据");
            return null;
        }
        
        try {
            // 通过世界书控制器获取用户数据
            const controller = this._getLorebookController();
            if (controller && controller.getUserData) {
                const userData = await controller.getUserData();
                return userData ? userData.stats : null;
            }
            return null;
        } catch (error) {
            console.error("获取用户统计数据失败:", error);
            return null;
        }
    }

    /**
     * 更新用户统计数据
     * @param {Object} stats 新的统计数据
     * @returns {Promise<boolean>} 是否成功
     */
    async updateUserStats(stats) {
        if (!this.initialized) {
            console.warn("身份服务尚未初始化，无法更新用户统计数据");
            return false;
        }
        
        try {
            const controller = this._getLorebookController();
            if (controller && controller.updateUserStats) {
                return await controller.updateUserStats(stats);
            }
            return false;
        } catch (error) {
            console.error("更新用户统计数据失败:", error);
            return false;
        }
    }

    /**
     * 获取用户技能数据
     * @returns {Promise<Object|null>} 用户技能数据
     */
    async getUserSkills() {
        if (!this.initialized) {
            console.warn("身份服务尚未初始化，无法获取用户技能数据");
            return null;
        }
        
        try {
            const controller = this._getLorebookController();
            if (controller && controller.getUserData) {
                const userData = await controller.getUserData();
                return userData ? userData.skills : null;
            }
            return null;
        } catch (error) {
            console.error("获取用户技能数据失败:", error);
            return null;
        }
    }

    /**
     * 增加技能经验
     * @param {string} skillName 技能名称
     * @param {number} exp 经验值
     * @returns {Promise<boolean>} 是否成功
     */
    async addSkillExp(skillName, exp) {
        if (!this.initialized) {
            console.warn("身份服务尚未初始化，无法增加技能经验");
            return false;
        }
        
        try {
            const controller = this._getLorebookController();
            if (controller && controller.addSkillExperience) {
                return await controller.addSkillExperience(skillName, exp);
            }
            return false;
        } catch (error) {
            console.error("增加技能经验失败:", error);
            return false;
        }
    }

    /**
     * 获取完整用户数据
     * @returns {Promise<Object|null>} 完整用户数据
     */
    async getUserData() {
        if (!this.initialized) {
            console.warn("身份服务尚未初始化，无法获取用户数据");
            return null;
        }
        
        try {
            const controller = this._getLorebookController();
            if (controller && controller.getUserData) {
                return await controller.getUserData();
            }
            return null;
        } catch (error) {
            console.error("获取用户数据失败:", error);
            return null;
        }
    }

    /**
     * 私有方法：获取世界书控制器
     */
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
}