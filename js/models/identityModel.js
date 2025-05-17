// js/models/identityModel.js
class IdentityModel {
    constructor() {
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
        
        // 玩家身份不再直接存储在此，将通过 lorebookController 获取
        // this.realIdentity = null;      // 真实身份
        // this.coverIdentity = null;     // 表面身份
        // this.disguiseIdentity = null;  // 伪装身份
        
        // NPC身份列表 (这部分逻辑如果存在，保持不变)
        this.knownIdentities = [];
        
        // 不再调用 this.initializeIdentities(); 身份将在需要时从世界书加载或使用默认值创建
    }
    
    // --- 默认身份获取方法 ---
    getDefaultRealIdentity() {
        return {
            nationality: "苏联", // 默认真实国籍
            type: "情报人员",   // 默认真实身份类型
            function: "间谍",     // 默认真实职能
            organization: "KGB" // 默认真实组织
        };
    }

    getDefaultCoverIdentity() {
        return {
            nationality: "美国", // 默认表面国籍
            type: "情报人员",   // 默认表面身份类型
            function: "外勤特工", // 默认表面职能
            organization: "CIA"  // 默认表面组织
        };
    }

    getDefaultDisguiseIdentity() {
        return null; // 默认没有伪装身份
    }

    // --- 异步身份获取方法 ---
    async getRealIdentity() {
        if (!window.lorebookController) {
            console.error("LorebookController 未初始化，无法获取真实身份。");
            return this.getDefaultRealIdentity(); // Fallback
        }
        try {
            return await window.lorebookController.getPlayerIdentity(
                window.lorebookController.model.PLAYER_IDENTITY_SUFFIX_REAL,
                this.getDefaultRealIdentity()
            );
        } catch (error) {
            console.error("从世界书获取真实身份失败:", error);
            return this.getDefaultRealIdentity(); // 出现错误时返回默认值
        }
    }

    async getCoverIdentity() {
        if (!window.lorebookController) {
            console.error("LorebookController 未初始化，无法获取表面身份。");
            return this.getDefaultCoverIdentity(); // Fallback
        }
        try {
            return await window.lorebookController.getPlayerIdentity(
                window.lorebookController.model.PLAYER_IDENTITY_SUFFIX_COVER,
                this.getDefaultCoverIdentity()
            );
        } catch (error) {
            console.error("从世界书获取表面身份失败:", error);
            return this.getDefaultCoverIdentity(); // 出现错误时返回默认值
        }
    }

    async getDisguiseIdentity() {
        if (!window.lorebookController) {
            console.error("LorebookController 未初始化，无法获取伪装身份。");
            return this.getDefaultDisguiseIdentity(); // Fallback
        }
        try {
            // 对于伪装身份，如果条目不存在，getPlayerIdentity 应该返回 null (defaultDisguiseIdentity)
            return await window.lorebookController.getPlayerIdentity(
                window.lorebookController.model.PLAYER_IDENTITY_SUFFIX_DISGUISE,
                this.getDefaultDisguiseIdentity() 
            );
        } catch (error) {
            console.error("从世界书获取伪装身份失败:", error);
            return this.getDefaultDisguiseIdentity(); // 出现错误时返回默认值 (null)
        }
    }

    // --- 异步身份设置方法 ---
    async setRealIdentity(nationality, type, func, organization = null) {
        const identityData = { nationality, type, function: func, organization };
        this.validateIdentity(identityData); // 本地验证仍然有用
        if (!window.lorebookController) {
            console.error("LorebookController 未初始化，无法设置真实身份。");
            return false; 
        }
        try {
            return await window.lorebookController.setPlayerIdentity(
                window.lorebookController.model.PLAYER_IDENTITY_SUFFIX_REAL,
                identityData
            );
        } catch (error) {
            console.error("向世界书设置真实身份失败:", error);
            return false;
        }
    }

    async setCoverIdentity(nationality, type, func, organization = null) {
        const identityData = { nationality, type, function: func, organization };
        this.validateIdentity(identityData);
        if (!window.lorebookController) {
            console.error("LorebookController 未初始化，无法设置表面身份。");
            return false;
        }
        try {
            return await window.lorebookController.setPlayerIdentity(
                window.lorebookController.model.PLAYER_IDENTITY_SUFFIX_COVER,
                identityData
            );
        } catch (error) {
            console.error("向世界书设置表面身份失败:", error);
            return false;
        }
    }

    async setDisguiseIdentity(nationality, type, func, organization = null) {
        const identityData = { nationality, type, function: func, organization };
        this.validateIdentity(identityData);
        if (!window.lorebookController) {
            console.error("LorebookController 未初始化，无法设置伪装身份。");
            return false;
        }
        try {
            return await window.lorebookController.setPlayerIdentity(
                window.lorebookController.model.PLAYER_IDENTITY_SUFFIX_DISGUISE,
                identityData
            );
        } catch (error) {
            console.error("向世界书设置伪装身份失败:", error);
            return false;
        }
    }
    
    // 清除伪装
    async clearDisguise() {
        if (!window.lorebookController) {
            console.error("LorebookController 未初始化，无法清除伪装身份。");
            return false;
        }
        try {
            // LorebookController 的 clearPlayerDisguiseIdentity 会处理将条目内容设为 null
            return await window.lorebookController.clearPlayerDisguiseIdentity();
        } catch (error) {
            console.error("清除世界书中的伪装身份失败:", error);
            return false;
        }
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
    
    // 验证身份合法性 (保持不变，用于本地验证)
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
            } else {
                // 对于其他国家或其他身份类型，如果指定了机构，可以是一个警告或根据游戏逻辑处理
                // console.warn(`为非美国情报人员或非特定类型指定了机构: ${identity.organization}`);
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
        await this.clearDisguise(); // 清除伪装身份（将其在世界书中设为null）
        // 不需要返回 coverIdentity，因为 getCurrentIdentity 会自动处理
        // UI 更新应该由 controller 在调用此方法后，重新获取当前身份并更新视图
        console.log("伪装已被识破，已清除。");
        EventBus.emit('playerIdentityChanged', { type: window.lorebookController.model.PLAYER_IDENTITY_SUFFIX_DISGUISE, data: null }); // 通知伪装已清除
        return true; // 表示操作完成
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
        // 特殊处理美国情报人员，因为原始逻辑是这样
        if (nationality === "美国" && type === "情报人员" && this.ORGANIZATIONS["美国"] && this.ORGANIZATIONS["美国"]["情报人员"]) {
            return this.ORGANIZATIONS["美国"]["情报人员"];
        }
        return [];
    }
}
