// js/models/mapModel.js
class MapModel {
    constructor() {
        // 地图初始化
        this.currentLocation = "富兰克林公园";
        this.locations = {
            "富兰克林公园": {
                description: "位于白宫东北侧的著名公园，经常有游客和当地居民在此休憩。公园中央有喷泉，树木繁茂。",
                hiddenDescription: "这个公园是情报人员最常用的非正式会面地点，尤其是靠近白宫的长椅和西北角的棋桌。每周二和周五下午4点是最繁忙的交接时间。",
                coordinates: [44.8, 46.7], // 中心点，百分比坐标
                publicAccess: true,    // 公开身份可进入
                covertAccess: true,    // 秘密身份可进入
                isVisible: true,
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            },
            "CIA DC分部": {
                description: "一座看起来毫不起眼的现代化办公楼。员工西装革履，行事低调。",
                hiddenDescription: "CIA在首都地区执行秘密行动、招募和管理本地线人、进行反情报调查的核心部门之一。内部设有审讯室、安全屋、技术支持实验室等。掌握着大量关于外国使馆和可疑人员的监控数据。",
                coordinates: [60, 45], // 百分比坐标
                publicAccess: false,   // 普通人不可进入
                covertAccess: false,   // 特工身份未解锁
                isVisible: true,
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            },
            "NSA DC办公室": {
                description: "国家安全局在华盛顿的联络办公室，位于一栋普通写字楼内。大楼外表平淡无奇，只有小小的标识。",
                hiddenDescription: "办公室内部有专用加密通信设备，连接至马里兰州米德堡的NSA总部，用于传输高度机密数据。地下有秘密服务器群组。",
                coordinates: [85, 10], // 百分比坐标
                publicAccess: false,   // 普通人不可进入
                covertAccess: false,   // 特工身份未解锁
                isVisible: true,
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            },
            "苏联大使馆": {
                description: "位于威斯康星大道上的苏联外交机构，红色国旗明显可见。建筑风格严肃庄重，有高大的围墙。",
                hiddenDescription: "大使馆内部是KGB在美国的重要据点，多名外交官身份的情报人员在此工作。使馆内部布满了监听设备，每周定期排查美方安装的窃听器。三楼西侧是密码通讯室，由专人24小时值守。",
                coordinates: [12, 18], // 百分比坐标
                publicAccess: false,   // 普通人不可进入
                covertAccess: false,   // 特工身份未解锁
                isVisible: true,
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            },
            "英国大使馆": {
                description: "英国在华盛顿的外交代表处，建筑风格典雅庄重。花园中有精心修剪的草坪和传统的英式园艺。",
                hiddenDescription: "MI6在此设有秘密办公室，与CIA保持着特殊的情报共享关系。大使馆东翼三楼是情报人员专用区域，普通使馆工作人员无法进入。地下室有通往其他建筑的隐蔽通道。",
                coordinates: [19, 25], // 百分比坐标
                publicAccess: false,   // 普通人不可进入
                covertAccess: false,   // 特工身份未解锁
                isVisible: true,
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            },
            "地下交易点": {
                description: "位于城市边缘的一个废弃仓库区，看起来杂乱无人。铁丝网围栏上挂着'禁止入内'的标志。",
                hiddenDescription: "这里是情报和武器交易的秘密场所，只有知道'北极熊'暗号的人才能进入。每周五午夜换岗后是最安全的交易时间。仓库内的特定集装箱可以通向地下空间。",
                coordinates: [37, 83], // 百分比坐标
                publicAccess: false,   // 普通人不可进入
                covertAccess: false,   // 特工身份未解锁
                isVisible: true,      // 默认对玩家不可见
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            },
            "柯楠牙医诊所": {
                description: "一家普通的牙科诊所，位于乔治城的一条安静街道上。接待员似乎对普通患者非常友好。诊所内部装修简洁，但设备看起来很新。",
                hiddenDescription: "这是KGB在华盛顿的秘密联络站，伪装成牙医诊所以方便情报传递。地下室设有加密电台，通往后巷的秘密出口可快速撤离。柯楠医生本人是KGB上校，精通信息编码和医疗知识。",
                coordinates: [70, 58], // 百分比坐标
                publicAccess: true,    // 普通人可以进入牙医诊所
                covertAccess: false,   // 秘密空间未解锁
                isVisible: false,
                knowsHidden: false,
                disguisedAs: "柯楠牙医诊所",
                disguiseRevealed: false,
                realName: "KGB华盛顿站点"
            },
            "老鹰书店": {
                description: "二手书店，专门经营历史和政治类书籍，店内常有学者出入。店主是一位戴眼镜的老人，似乎对每本书的内容都了如指掌。",
                hiddenDescription: "CIA的秘密收发点，通过特殊标记的书籍传递编码信息。书店老板是退役CIA特工，只对知道正确暗语的人开放地下室。某些书架可以转动，背后隐藏着监控设备和武器。",
                coordinates: [65, 65], // 百分比坐标
                publicAccess: true,    // 任何人都可以进入书店
                covertAccess: false,   // 特工区域未解锁
                isVisible: true,
                knowsHidden: true,
                disguisedAs: "老鹰书店",
                disguiseRevealed: true,
                realName: "CIA情报收发站"
            },
            "国会山": {
                description: "美国国会大厦所在地，美国立法机构办公场所。宏伟的圆顶建筑是华盛顿最著名的地标之一。",
                hiddenDescription: "国会地下有秘密会议室，用于紧急状态下的国家安全讨论。某些议员办公室是各国情报机构关注的重点渗透目标。存在多条隐蔽通道连接至附近建筑，以便紧急疏散。",
                coordinates: [88.5, 58.2], // 百分比坐标
                publicAccess: true,    // 游客可参观
                covertAccess: false,   // 秘密区域未解锁
                isVisible: true,
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            },
            "国家档案馆": {
                description: "保存美国重要历史文件的机构，包括独立宣言和宪法原件。建筑宏伟，每天都有大量游客参观。",
                hiddenDescription: "档案馆地下深处存有绝密文件区，记录了冷战初期的敏感行动。只有持特殊许可证的人员才能进入。据传某些最敏感的文件并未编入目录，存放在特殊的隔离保险库中。",
                coordinates: [55, 40], // 百分比坐标
                publicAccess: true,    // 开放参观
                covertAccess: false,   // 秘密档案室未解锁
                isVisible: true,
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            },
            "华盛顿纪念碑": {
                description: "为纪念美国首任总统华盛顿而建的高耸方尖碑，是华盛顿市中心的标志性建筑。",
                hiddenDescription: "",
                coordinates: [43.8, 51.35], // 百分比坐标
                publicAccess: true,    // 开放参观
                covertAccess: false,   // 监控设施未解锁
                isVisible: true,
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            },
            "红宝石酒吧": {
                description: "乔治城区的一家高档酒吧，装修典雅，常有政界人士出没。调酒师以能记住每位常客的喜好而闻名。",
                hiddenDescription: "多国情报人员的非正式会面场所，吧台后的酒柜暗藏监听设备。地下室是私人会所，需要会员卡才能进入，实际上是各方情报交易的中立区。",
                coordinates: [75, 45], // 百分比坐标
                publicAccess: true,    // 普通人可进入酒吧
                covertAccess: false,   // 私人会所未解锁
                isVisible: true,
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            },
            "林肯纪念堂": {
                description: "为纪念美国第16任总统林肯而建的希腊神庙式建筑，内有林肯巨型坐像。",
                hiddenDescription: "纪念堂是特定情报小组定期换班的标记地点。每周三日落后，东北角的长椅是重要的死信箱位置，特工们会在这里交换加密信息。",
                coordinates: [15.5, 59.5], // 百分比坐标
                publicAccess: true,    // 开放参观
                covertAccess: true,    // 情报人员可使用
                isVisible: true,
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            },
            "全视眼照相馆": {
                description: "一家专业摄影工作室，提供证件照和艺术肖像服务。装饰复古，设备却相当现代。",
                hiddenDescription: "FBI的秘密监控中心，通过提供照相服务获取各国外交官和可疑人物的最新面部图像。地下室连接着复杂的档案系统和面部识别数据库。",
                coordinates: [55, 65], // 百分比坐标
                publicAccess: true,    // 普通人可进入
                covertAccess: false,   // 监控中心未解锁
                isVisible: true,
                knowsHidden: false,
                disguisedAs: "全视眼照相馆",
                disguiseRevealed: false,
                realName: "FBI监控中心"
            },
            "白宫": {
                description: "美国总统官邸和办公场所，白色新古典主义建筑，有严格的安保措施。",
                hiddenDescription: "白宫地下设有总统紧急行动中心，可在核战争等极端情况下充当指挥所。内部通讯系统采用多重加密，定期更换频率以防窃听。",
                coordinates: [43.446, 48], // 百分比坐标
                publicAccess: false,   // 需预约参观
                covertAccess: false,   // 机密区域未解锁
                isVisible: true,
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            }
        };
        
        // 地图状态
        this.isVisible = false;
        this.selectedLocation = null;
    }
    
    // 获取位置信息
    getLocation(name) {
        return this.locations[name] || null;
    }
    
    // 获取所有可见位置
    getAllVisibleLocations() {
        const visibleLocations = {};
        
        for (const [name, data] of Object.entries(this.locations)) {
            if (data.isVisible) {
                visibleLocations[name] = { ...data };
            }
        }
        
        return visibleLocations;
    }
    
    // 获取所有位置(包括不可见的)
    getAllLocations() {
        return { ...this.locations };
    }
    
    // 获取当前位置
    getCurrentLocation() {
        // 如果当前位置不可见，且玩家在观看地图，应该返回一个可见的备选位置
        if (this.isVisible && this.locations[this.currentLocation] && 
            !this.locations[this.currentLocation].isVisible) {
            
            // 查找第一个可见位置作为备选
            for (const [name, data] of Object.entries(this.locations)) {
                if (data.isVisible) {
                    // 临时返回这个可见位置，但不改变实际的当前位置
                    return {
                        name: name,
                        ...data
                    };
                }
            }
        }
        
        // 正常情况，返回当前位置
        return {
            name: this.currentLocation,
            ...this.locations[this.currentLocation]
        };
    }
    
    // 设置当前位置
    setCurrentLocation(name) {
        if (this.locations[name]) {
            this.currentLocation = name;
            return true;
        }
        return false;
    }
    
    // 选择位置以显示详情
    selectLocation(name) {
        if (this.locations[name]) {
            this.selectedLocation = name;
            return true;
        }
        return false;
    }
    
    // 获取所选位置的显示信息
    getSelectedLocation() {
        if (!this.selectedLocation) return null;
        
        const location = { ...this.locations[this.selectedLocation] };
        const name = this.selectedLocation;
        
        // 创建返回对象，包含所有必要的信息以供视图层处理点击交互
        const returnObj = {
            // 基本信息
            coordinates: location.coordinates,
            publicAccess: location.publicAccess,
            covertAccess: location.covertAccess,
            isVisible: location.isVisible,
            
            // 描述信息 - 分开返回，不自动合并
            description: location.description,
            hiddenDescription: location.hiddenDescription,
            knowsHidden: location.knowsHidden,
            
            // 伪装信息
            isDisguised: !!location.disguisedAs,
            disguiseRevealed: !!location.disguiseRevealed
        };
        
        // 处理名称显示逻辑
        if (location.disguisedAs) {
            // 有伪装的情况
            returnObj.displayName = location.disguisedAs; // 默认显示伪装名称
            returnObj.realName = location.realName; // 存储真实名称以备点击后显示
        } else {
            // 没有伪装的情况
            returnObj.displayName = name;
            returnObj.realName = name;
        }
        
        // 将原始名称也传递以便追踪
        returnObj.originalName = name;
        
        return returnObj;
    }

    // 设置公开访问权限
    setPublicAccess(locationName, hasAccess) {
        if (this.locations[locationName]) {
            this.locations[locationName].publicAccess = hasAccess;
            return true;
        }
        return false;
    }

    // 设置秘密访问权限
    setCovertAccess(locationName, hasAccess) {
        if (this.locations[locationName]) {
            this.locations[locationName].covertAccess = hasAccess;
            return true;
        }
        return false;
    }
    
    // 检查是否有公开访问权限
    hasPublicAccess(locationName) {
        if (this.locations[locationName]) {
            return this.locations[locationName].publicAccess;
        }
        return false;
    }
    
    // 检查是否有秘密访问权限
    hasCovertAccess(locationName) {
        if (this.locations[locationName]) {
            return this.locations[locationName].covertAccess;
        }
        return false;
    }
    
    // 切换地图可见性
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        return this.isVisible;
    }
    
    // 设置地图可见性
    setVisibility(isVisible) {
        this.isVisible = isVisible;
        return this.isVisible;
    }
    
    // 设置位置可见性
    setLocationVisibility(locationName, isVisible) {
        if (this.locations[locationName]) {
            this.locations[locationName].isVisible = isVisible;
            return true;
        }
        return false;
    }
    
    // 设置位置访问权限
    setLocationAccess(locationName, hasAccess) {
        if (this.locations[locationName]) {
            this.locations[locationName].hasAccess = hasAccess;
            return true;
        }
        return false;
    }
    
    // 揭露伪装
    revealDisguise(locationName, revealed = true) {
        if (this.locations[locationName] && this.locations[locationName].disguisedAs) {
            this.locations[locationName].disguiseRevealed = revealed;
            return true;
        }
        return false;
    }
    
    // 解锁隐藏描述
    unlockHiddenDescription(locationName, unlocked = true) {
        if (this.locations[locationName]) {
            this.locations[locationName].knowsHidden = unlocked;
            return true;
        }
        return false;
    }
    
    // 检查是否有权限访问位置
    hasAccessTo(locationName) {
        if (this.locations[locationName]) {
            return this.locations[locationName].hasAccess;
        }
        return false;
    }
    
    // 检查位置是否可见
    isLocationVisible(locationName) {
        if (this.locations[locationName]) {
            return this.locations[locationName].isVisible;
        }
        return false;
    }
    
    // 获取位置真实名称（如果有）
    getRealLocationName(locationName) {
        if (this.locations[locationName] && this.locations[locationName].realName) {
            return this.locations[locationName].realName;
        }
        return locationName;
    }
}