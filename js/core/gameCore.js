// js/core/gameCore.js
/**
 * 游戏核心类 - 中央协调器
 * 负责游戏组件的初始化、注册和管理
 */
class GameCore {
    constructor() {
        this.components = {};
        this.initialized = false;
        this.initPromise = null;
    }

    /**
     * 注册组件到游戏核心
     * @param {string} name - 组件名称
     * @param {object} component - 组件实例
     * @returns {object} 返回注册的组件
     */
    registerComponent(name, component) {
        if (this.components[name]) {
            console.warn(`组件 "${name}" 已存在，将被覆盖`);
        }
        this.components[name] = component;
        return component;
    }

    /**
     * 获取已注册的组件
     * @param {string} name - 组件名称
     * @returns {object|null} 组件实例或null
     */
    getComponent(name) {
        return this.components[name] || null;
    }

    /**
     * 初始化游戏核心和所有必要组件
     * @returns {Promise} 初始化完成的Promise
     */
    initialize() {
        if (this.initialized) {
            return Promise.resolve(this);
        }

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise((resolve) => {
            try {
                console.log("初始化游戏核心...");

                // 1. 获取服务定位器
                const serviceLocator = window.ServiceLocator;
                
                // 2. 先注册工具类服务
                const domUtils = window.DOMUtils || new DOMUtils();
                serviceLocator.register('domUtils', domUtils);
                
                const storageUtils = window.StorageUtils || new StorageUtils();
                serviceLocator.register('storage', storageUtils);
                
                // 3. 注册核心服务
                serviceLocator.register('eventBus', EventBus);
                
                // 4. 初始化系统服务
                const systemService = new SystemService();
                serviceLocator.register('system', systemService);
                this.registerComponent('systemService', systemService);

                // 初始化指令行服务
                const commandService = new CommandService(serviceLocator);
                serviceLocator.register('command', commandService);
                this.registerComponent('commandService', commandService);

                // 5. 初始化音频服务
                const audioService = window.audioManager || new AudioService();
                serviceLocator.register('audio', audioService);
                this.registerComponent('audioService', audioService);

                // 6. 初始化接口服务
                const interfaceService = new InterfaceService();
                serviceLocator.register('interface', interfaceService);
                this.registerComponent('interfaceService', interfaceService);

                // 7. 初始化MVC组件
                const gameModel = new GameModel();
                const gameView = new GameView();
                const gameController = new GameController(gameModel, gameView);

                // 注册为组件
                this.registerComponent('gameModel', gameModel);
                this.registerComponent('gameView', gameView);
                this.registerComponent('gameController', gameController);

                // 同时注册为服务
                serviceLocator.register('gameModel', gameModel);
                serviceLocator.register('gameView', gameView);
                serviceLocator.register('gameController', gameController);

                // 为向后兼容保留全局引用
                window.gameController = gameController;

                // 8. 初始化Lorebook系统
                console.log("初始化世界书系统...");
                const lorebookModel = new LorebookModel(serviceLocator);
                const lorebookController = new LorebookController(lorebookModel, serviceLocator);

                this.registerComponent('lorebookModel', lorebookModel);
                this.registerComponent('lorebookController', lorebookController);

                // 初始化Lorebook服务
                const lorebookService = new LorebookService();
                serviceLocator.register('lorebook', lorebookService);
                this.registerComponent('lorebookService', lorebookService)

                // 为向后兼容保留全局引用
                window.lorebookController = lorebookController;

                // 初始化Lorebook控制器
                lorebookController.initialize().catch(error => {
                    console.error("世界书控制器初始化失败:", error);
                });

                // 9. 初始化NPC聊天服务
                const npcChatService = new NpcChatService();
                serviceLocator.register('npcChat', npcChatService);
                this.registerComponent('npcChatService', npcChatService);
                
                // 10. 初始化地图MVC
                const mapModel = new MapModel(serviceLocator);
                const mapView = new MapView(serviceLocator);
                const mapController = new MapController(mapModel, mapView, serviceLocator);
                
                this.registerComponent('mapModel', mapModel);
                this.registerComponent('mapView', mapView);
                this.registerComponent('mapController', mapController);
                
                // 为向后兼容保留全局引用
                window.mapController = mapController;
                
                // 注册到界面服务
                interfaceService.registerController('map', mapController);

                // 11. 初始化身份MVC
                console.log("初始化身份系统...");
                const identityModel = new IdentityModel(serviceLocator);
                const identityView = new IdentityView(serviceLocator);
                const identityController = new IdentityController(identityModel, identityView, serviceLocator);

                // 注册为组件
                this.registerComponent('identityModel', identityModel);
                this.registerComponent('identityView', identityView);
                this.registerComponent('identityController', identityController);

                // 注册为服务 - 注意:不要注册控制器为服务
                // serviceLocator.register('identityController', identityController);

                // 为向后兼容保留全局引用
                window.identityController = identityController;

                // 初始化身份控制器
                identityController.initialize().catch(error => {
                    console.error("身份控制器初始化失败:", error);
                });

                // 初始化并注册身份服务
                const identityService = new IdentityService();
                serviceLocator.register('identity', identityService);
                this.registerComponent('identityService', identityService);

                // 注册到界面服务
                interfaceService.registerController('identity', identityController);

                console.log("游戏核心初始化完成");
                this.initialized = true;

                // 发布初始化完成事件
                const eventBus = serviceLocator.get('eventBus');
                if (eventBus) {
                    eventBus.emit('gameCoreInitialized', this);
                }
                
                resolve(this);
            } catch (error) {
                console.error("游戏核心初始化失败:", error);
                // 即使初始化失败，也解析Promise，但记录错误
                resolve(this);
            }
        });

        return this.initPromise;
    }

    /**
     * 检查系统是否可操作
     * @returns {boolean} 系统是否可操作
     */
    isSystemOperational() {
        const gameModel = this.getComponent('gameModel');
        if (!gameModel) return false;

        return gameModel.isOn && 
               gameModel.getSystemState() === gameModel.SystemState.POWERED_ON;
    }
}

// 创建全局单例
window.GameCore = new GameCore();