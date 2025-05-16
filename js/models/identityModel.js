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
        
        // 玩家身份
        this.realIdentity = null;      // 真实身份
        this.coverIdentity = null;     // 表面身份
        this.disguiseIdentity = null;  // 伪装身份
        
        // NPC身份列表
        this.knownIdentities = [];
        
        // 初始化默认身份
        this.initializeIdentities();
    }
    
    initializeIdentities() {
        // 默认起始身份
        this.realIdentity = {
            nationality: "美国",
            type: "情报人员",
            function: "外勤特工",
            organization: "CIA"
        };
        
        // 初始表面身份等同于真实身份
        this.coverIdentity = {...this.realIdentity};
        
        // 初始无伪装
        this.disguiseIdentity = null;
    }
    
    // 设置真实身份
    setRealIdentity(nationality, type, func, organization = null) {
        this.realIdentity = {
            nationality: nationality,
            type: type,
            function: func,
            organization: organization
        };
        
        this.validateIdentity(this.realIdentity);
        return this.realIdentity;
    }
    
    // 设置表面身份
    setCoverIdentity(nationality, type, func, organization = null) {
        this.coverIdentity = {
            nationality: nationality,
            type: type,
            function: func,
            organization: organization
        };
        
        this.validateIdentity(this.coverIdentity);
        return this.coverIdentity;
    }
    
    // 设置伪装身份
    setDisguiseIdentity(nationality, type, func, organization = null) {
        this.disguiseIdentity = {
            nationality: nationality,
            type: type,
            function: func,
            organization: organization
        };
        
        this.validateIdentity(this.disguiseIdentity);
        return this.disguiseIdentity;
    }
    
    // 清除伪装
    clearDisguise() {
        this.disguiseIdentity = null;
    }
    
    // 获取当前有效身份(有伪装则为伪装，否则为表面身份)
    getCurrentIdentity() {
        return this.disguiseIdentity || this.coverIdentity;
    }
    
    // 验证身份合法性
    validateIdentity(identity) {
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
        }
        
        // 验证机构(仅美国情报人员需要)
        if (identity.organization) {
            if (identity.nationality === "美国" && identity.type === "情报人员") {
                if (!this.ORGANIZATIONS["美国"]["情报人员"].includes(identity.organization)) {
                    console.error(`无效的机构: ${identity.organization}`);
                }
            } else {
                console.warn(`为非美国情报人员指定了机构: ${identity.organization}`);
            }
        }
    }
    
    // 格式化身份字符串
    formatIdentity(identity) {
        if (!identity) return "无";
        
        let result = `[${identity.nationality}]`;
        result += ` [${identity.type}]`;
        if (identity.function) {
            result += ` [${identity.function}]`;
        }
        if (identity.organization) {
            result += ` [${identity.organization}]`;
        }
        return result;
    }
    
    // 检查伪装是否被识破(根据给定概率)
    checkDisguiseDetection(detectionRate) {
        if (!this.disguiseIdentity) return false;
        return Math.random() < detectionRate;
    }
    
    // 伪装被识破，恢复为表面身份
    blowDisguise() {
        this.disguiseIdentity = null;
        return this.coverIdentity;
    }
    
    // 获取指定类型可用的职能列表
    getFunctionsForType(type) {
        return this.FUNCTIONS[type] || [];
    }
    
    // 获取指定国籍和类型可用的机构列表
    getOrganizationsForIdentity(nationality, type) {
        if (nationality === "美国" && type === "情报人员") {
            return this.ORGANIZATIONS["美国"]["情报人员"];
        }
        return [];
    }
}