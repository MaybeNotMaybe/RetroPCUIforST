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

                this.registerComponent('gameModel', gameModel);
                this.registerComponent('gameView', gameView);
                this.registerComponent('gameController', gameController);

                // 将gameController绑定到window，保持与现有代码兼容
                window.gameController = gameController;
                
                // 8. 初始化地图MVC
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

                console.log("游戏核心初始化完成");
                this.initialized = true;
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