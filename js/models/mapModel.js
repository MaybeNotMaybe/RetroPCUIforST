// js/models/mapModel.js
class MapModel {
    constructor(serviceLocator = null) {
        // 依赖注入
        this.serviceLocator = serviceLocator || window.ServiceLocator;
        this.eventBus = this.serviceLocator?.get('eventBus') || window.EventBus || EventBus;
        this.storage = this.serviceLocator?.get('storage') || window.StorageUtils;
        
        // 地图数据结构
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
            "国家安全局总部": {
                 description: "建于1961年的中央情报局总部大楼，坐落在波托马克河岸边的树林中。建筑外观庄严，安保措施极其严格。",
                hiddenDescription: "总部内设有多个绝密设施，包括技术服务部门、特殊行动中心和全球监控中心。地下三层是档案室，存放着冷战以来收集的大量情报。总部与白宫、五角大楼有专用加密通信线路。",
                coordinates: [86, 16], // 百分比坐标
                publicAccess: false,   // 普通人不可进入
                covertAccess: false,   // 特工身份未解锁
                isVisible: true,
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            },
            "中央情报局总部": {
                 description: "建于1961年的中央情报局总部大楼，坐落在波托马克河岸边的树林中。建筑外观庄严，安保措施极其严格。",
                hiddenDescription: "总部内设有多个绝密设施，包括技术服务部门、特殊行动中心和全球监控中心。地下三层是档案室，存放着冷战以来收集的大量情报。总部与白宫、五角大楼有专用加密通信线路。",
                coordinates: [14, 26.9], // 百分比坐标
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
                coordinates: [33.3, 38.3], // 百分比坐标
                publicAccess: false,   // 普通人不可进入
                covertAccess: false,   // 特工身份未解锁
                isVisible: true,
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            },
            "法国大使馆": {
                description: "法国在华盛顿的外交代表处，建筑风格典雅庄重。花园中有精心修剪的草坪和传统的英式园艺。",
                hiddenDescription: "MI6在此设有秘密办公室，与CIA保持着特殊的情报共享关系。大使馆东翼三楼是情报人员专用区域，普通使馆工作人员无法进入。地下室有通往其他建筑的隐蔽通道。",
                coordinates: [32.8, 41.2], // 百分比坐标
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
                coordinates: [36.5, 40.3], // 百分比坐标
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
                coordinates: [59.665, 65.929], // 百分比坐标
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
                coordinates: [35.251, 43.758], // 百分比坐标
                publicAccess: true,    // 任何人都可以进入书店
                covertAccess: false,   // 特工区域未解锁
                isVisible: true,
                knowsHidden: true,
                disguisedAs: "老鹰书店",
                disguiseRevealed: true,
                realName: "CIA情报收发站"
            },
            "国会大厦": {
                description: "美国国会大厦所在地，美国立法机构办公场所。宏伟的圆顶建筑是华盛顿最著名的地标之一。",
                hiddenDescription: "国会地下有秘密会议室，用于紧急状态下的国家安全讨论。某些议员办公室是各国情报机构关注的重点渗透目标。存在多条隐蔽通道连接至附近建筑，以便紧急疏散。",
                coordinates: [50.7, 51.3], // 百分比坐标
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
                coordinates: [46.9, 50.1], // 百分比坐标
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
                description: "乔治城区河对面的一家高档酒吧，装修典雅，常有政界人士出没。调酒师以能记住每位常客的喜好而闻名。",
                hiddenDescription: "多国情报人员的非正式会面场所，吧台后的酒柜暗藏监听设备。地下室是私人会所，需要会员卡才能进入，实际上是各方情报交易的中立区。",
                coordinates: [33, 49], // 百分比坐标
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
                coordinates: [39.8, 51.6], // 百分比坐标
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
                coordinates: [37.121, 45.210], // 百分比坐标
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
            },
            "阿灵顿国家公墓": {
                description: "美国最著名的军人公墓，无数美国军人和政要长眠于此。安静肃穆的气氛中，游客们前来凭吊肯尼迪总统墓地和无名战士墓。",
                hiddenDescription: "公墓的特定区域是情报人员秘密会面的场所。每周四下午，靠近无名战士墓的一处偏僻墓碑下有一个隐蔽的死信箱，用于存放敏感文件交接。",
                coordinates: [35.064, 55.488], // 百分比坐标
                publicAccess: true,    // 公开场所
                covertAccess: true,    // 特工可使用秘密设施
                isVisible: true,
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            },
            "五角大楼": {
                description: "美国国防部总部，世界上最大的办公楼之一。五边形的建筑结构给人以威严感，戒备森严的入口有军人把守。",
                hiddenDescription: "五角大楼地下E环有一个代号为'黑匣子'的绝密通讯中心，负责处理全球军事情报。某些走廊需要最高安全许可才能进入，传闻第三层西南区域存有UFO研究档案。",
                coordinates: [38.341, 58.3], // 百分比坐标
                publicAccess: false,   // 普通人需要特别许可
                covertAccess: false,   // 特工身份未解锁
                isVisible: true,
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            },
            "华盛顿国家机场": {
                description: "首都地区主要的民用机场，客流量大，安保措施严格。候机大厅内人来人往，行色匆匆。",
                hiddenDescription: "机场西南角的维修区域有一个不起眼的仓库，实际是CIA的秘密行动基地，用于接收和派遣海外特工。机场还设有专用的外交通道，可绕过常规安检。",
                coordinates: [42.939, 64.244], // 百分比坐标
                publicAccess: true,    // 公共场所
                covertAccess: false,   // 特殊区域未解锁
                isVisible: true,
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            },
            "陆军海军乡村俱乐部": {
                description: "一座优雅的会员制俱乐部，提供高尔夫、网球等设施。多位军方高官和政要是这里的常客，场所氛围轻松却不失严肃。",
                hiddenDescription: "俱乐部是高级军官和情报官员非正式交流的场所。地下酒窖有一个秘密会议室，传言国防部与CIA的某些最敏感决策在此达成。高尔夫球场的第七洞附近有一个隐蔽的通讯设备。",
                coordinates: [33.8, 63], // 百分比坐标
                publicAccess: false,   // 会员制
                covertAccess: false,   // 特殊区域未解锁
                isVisible: true,
                knowsHidden: false,
                disguisedAs: null,
                disguiseRevealed: null
            }
        };

        // 区域数据结构
        this.regions = {
           "市中心": {
                description: "华盛顿的主要政府区域，包含白宫、国会大厦等重要建筑。",
                coordinates: [45, 50],
                isVisible: true,
                // 该区域包含的地点名称数组
                locations: ["富兰克林公园", "白宫", "国会大厦", "国家档案馆", "华盛顿纪念碑","林肯纪念堂"]
            },
            "阿灵顿": {
                description: "位于波托马克河西岸的弗吉尼亚州区域，包含五角大楼和阿灵顿国家公墓等重要地标。",
                coordinates: [38.2, 60.1],
                isVisible: true,
                locations: ["阿灵顿国家公墓", "五角大楼", "华盛顿国家机场","陆军海军乡村俱乐部"]
            },
            "乔治城": {
                description: "外国使馆聚集的区域。",
                coordinates: [35.4, 43],
                isVisible: true,
                locations: ["苏联大使馆", "英国大使馆", "法国大使馆", "全视眼照相馆", "老鹰书店", "红宝石酒吧"]
            },
            "东南区": {
                description: "包含多个政府办公机构和情报单位的区域。",
                coordinates: [58, 62],
                isVisible: true,
                locations: [ "地下交易点"]
            },
            "兰利": {
                description: "CIA总部所在地，位于弗吉尼亚州，华盛顿特区西南约13公里处，是美国情报系统的核心区域。",
                coordinates: [14, 26.9],
                isVisible: true,
                locations: ["中央情报局总部",]
            },
            "米德堡": {
                description: "CIA总部所在地，位于弗吉尼亚州，华盛顿特区西南约13公里处，是美国情报系统的核心区域。",
                coordinates: [81, 16],
                isVisible: true,
                locations: ["国家安全局总部",]
            }
        };
        
        // 当前选中区域
        this.currentRegion = null;
        
        // 地图状态
        this.isVisible = false;
        this.selectedLocation = null;
        
        // 加载保存的状态
        this.loadState();
        
        console.log("地图模型已初始化");
    }
    
    // 新增: 保存地图状态
    saveState() {
        if (this.storage) {
            this.storage.save('mapState', {
                currentLocation: this.currentLocation,
                currentRegion: this.currentRegion,
                isVisible: this.isVisible,
                selectedLocation: this.selectedLocation
            });
        }
    }
    
    // 新增: 加载地图状态
    loadState() {
        if (this.storage) {
            const state = this.storage.load('mapState');
            if (state) {
                this.currentLocation = state.currentLocation || this.currentLocation;
                this.currentRegion = state.currentRegion || null;
                this.isVisible = state.isVisible || false;
                this.selectedLocation = state.selectedLocation || null;
            }
        }
    }
    
    // 保留原有功能，但修改为在状态变更时发布事件
    setCurrentLocation(name) {
        if (this.locations[name]) {
            const oldLocation = this.currentLocation;
            this.currentLocation = name;
            
            // 发布位置变更事件
            if (oldLocation !== name) {
                this.eventBus.emit('locationChanged', {
                    oldLocation: oldLocation,
                    newLocation: name
                });
                
                // 保存状态
                this.saveState();
            }
            
            return true;
        }
        return false;
    }
    
    selectLocation(name) {
        const oldSelection = this.selectedLocation;
        
        if (name === null || this.locations[name]) {
            this.selectedLocation = name;
            
            // 发布选择变更事件
            if (oldSelection !== name) {
                this.eventBus.emit('locationSelectionChanged', {
                    oldSelection: oldSelection,
                    newSelection: name
                });
                
                // 保存状态
                this.saveState();
            }
            
            return true;
        }
        return false;
    }
    
    // 修改切换可见性方法，添加事件发布
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        
        // 发布可见性变更事件
        this.eventBus.emit('mapVisibilityChanged', this.isVisible);
        
        // 保存状态
        this.saveState();
        
        return this.isVisible;
    }
    
    // 修改设置可见性方法，添加事件发布
    setVisibility(isVisible) {
        if (this.isVisible !== isVisible) {
            this.isVisible = isVisible;
            
            // 发布可见性变更事件
            this.eventBus.emit('mapVisibilityChanged', this.isVisible);
            
            // 保存状态
            this.saveState();
        }
        
        return this.isVisible;
    }
    
    // 修改区域选择方法，添加事件发布
    setCurrentRegion(regionId) {
        const oldRegion = this.currentRegion;
        
        if (regionId === null || this.regions[regionId]) {
            this.currentRegion = regionId;
            
            // 发布区域变更事件
            if (oldRegion !== regionId) {
                this.eventBus.emit('regionChanged', {
                    oldRegion: oldRegion,
                    newRegion: regionId
                });
                
                // 保存状态
                this.saveState();
            }
            
            return true;
        }
        return false;
    }
    
    // 修改位置可见性设置方法，添加事件发布
    setLocationVisibility(locationName, isVisible) {
        if (this.locations[locationName]) {
            const oldVisibility = this.locations[locationName].isVisible;
            this.locations[locationName].isVisible = isVisible;
            
            // 发布位置可见性变更事件
            if (oldVisibility !== isVisible) {
                this.eventBus.emit('locationVisibilityChanged', {
                    location: locationName,
                    isVisible: isVisible
                });
            }
            
            return true;
        }
        return false;
    }
    
    // 修改解锁隐藏描述方法，添加事件发布
    unlockHiddenDescription(locationName, unlocked = true) {
        if (this.locations[locationName]) {
            const oldValue = this.locations[locationName].knowsHidden;
            this.locations[locationName].knowsHidden = unlocked;
            
            // 发布隐藏信息解锁事件
            if (oldValue !== unlocked) {
                this.eventBus.emit('hiddenInfoUnlocked', {
                    location: locationName,
                    unlocked: unlocked
                });
            }
            
            return true;
        }
        return false;
    }
    
    // 修改揭露伪装方法，添加事件发布
    revealDisguise(locationName, revealed = true) {
        if (this.locations[locationName] && this.locations[locationName].disguisedAs) {
            const oldValue = this.locations[locationName].disguiseRevealed;
            this.locations[locationName].disguiseRevealed = revealed;
            
            // 发布伪装揭露事件
            if (oldValue !== revealed) {
                this.eventBus.emit('disguiseRevealed', {
                    location: locationName,
                    revealed: revealed
                });
            }
            
            return true;
        }
        return false;
    }
    
    // 保留所有原有的getter方法，无需修改
    getLocation(name) {
        return this.locations[name] || null;
    }
    
    getAllVisibleLocations() {
        const visibleLocations = {};
        
        for (const [name, data] of Object.entries(this.locations)) {
            if (data.isVisible) {
                visibleLocations[name] = { ...data };
            }
        }
        
        return visibleLocations;
    }
    
    getAllLocations() {
        return { ...this.locations };
    }
    
    getCurrentLocation() {
        if (this.isVisible && this.locations[this.currentLocation] && 
            !this.locations[this.currentLocation].isVisible) {
            
            for (const [name, data] of Object.entries(this.locations)) {
                if (data.isVisible) {
                    return {
                        name: name,
                        ...data
                    };
                }
            }
        }
        
        return {
            name: this.currentLocation,
            ...this.locations[this.currentLocation]
        };
    }
    
    getSelectedLocation() {
        if (!this.selectedLocation) return null;
        
        const location = { ...this.locations[this.selectedLocation] };
        const name = this.selectedLocation;
        
        const returnObj = {
            coordinates: location.coordinates,
            publicAccess: location.publicAccess,
            covertAccess: location.covertAccess,
            isVisible: location.isVisible,
            description: location.description,
            hiddenDescription: location.hiddenDescription,
            knowsHidden: location.knowsHidden,
            isDisguised: !!location.disguisedAs,
            disguiseRevealed: !!location.disguiseRevealed
        };
        
        if (location.disguisedAs) {
            returnObj.displayName = location.disguisedAs;
            returnObj.realName = location.realName;
        } else {
            returnObj.displayName = name;
            returnObj.realName = name;
        }
        
        returnObj.originalName = name;
        
        return returnObj;
    }
    
    getAllVisibleRegions() {
        const visibleRegions = {};
        
        for (const [name, data] of Object.entries(this.regions)) {
            if (data.isVisible) {
                visibleRegions[name] = { ...data };
            }
        }
        
        return visibleRegions;
    }
    
    getLocationsByRegion(regionId) {
        if (!this.regions[regionId]) return {};
        
        const regionLocations = {};
        const locationNames = this.regions[regionId].locations || [];
        
        for (const name of locationNames) {
            if (this.locations[name] && this.locations[name].isVisible) {
                regionLocations[name] = { ...this.locations[name] };
            }
        }
        
        return regionLocations;
    }
    
    getCurrentRegion() {
        return this.currentRegion;
    }
    
    hasPublicAccess(locationName) {
        if (this.locations[locationName]) {
            return this.locations[locationName].publicAccess;
        }
        return false;
    }
    
    hasCovertAccess(locationName) {
        if (this.locations[locationName]) {
            return this.locations[locationName].covertAccess;
        }
        return false;
    }
    
    // 修改访问权限设置方法，添加事件发布
    setPublicAccess(locationName, hasAccess) {
        if (this.locations[locationName]) {
            const oldValue = this.locations[locationName].publicAccess;
            this.locations[locationName].publicAccess = hasAccess;
            
            // 发布访问权限变更事件
            if (oldValue !== hasAccess) {
                this.eventBus.emit('accessRightsChanged', {
                    location: locationName,
                    accessType: 'public',
                    hasAccess: hasAccess
                });
            }
            
            return true;
        }
        return false;
    }
    
    setCovertAccess(locationName, hasAccess) {
        if (this.locations[locationName]) {
            const oldValue = this.locations[locationName].covertAccess;
            this.locations[locationName].covertAccess = hasAccess;
            
            // 发布访问权限变更事件
            if (oldValue !== hasAccess) {
                this.eventBus.emit('accessRightsChanged', {
                    location: locationName,
                    accessType: 'covert',
                    hasAccess: hasAccess
                });
            }
            
            return true;
        }
        return false;
    }
    
    isLocationVisible(locationName) {
        if (this.locations[locationName]) {
            return this.locations[locationName].isVisible;
        }
        return false;
    }
    
    getRealLocationName(locationName) {
        if (this.locations[locationName] && this.locations[locationName].realName) {
            return this.locations[locationName].realName;
        }
        return locationName;
    }
}