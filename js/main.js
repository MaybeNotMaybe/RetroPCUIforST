// js/main.js - 重构版本

// 初始化游戏
function initializeGame() {
    try {
        console.log("初始化游戏...");
        
        // 1. 初始化游戏核心
        window.GameCore.initialize().then(() => {
            // 2. 获取服务和组件
            const gameController = window.GameCore.getComponent('gameController');
            const interfaceService = window.ServiceLocator.get('interface');
            
            // 3. 创建软盘控制器
            const systemStateProvider = window.ServiceLocator.get('system') || new SystemStateProvider(gameController.model);
            const floppyController = new FloppyController(systemStateProvider);
            
            // 4. 将软盘控制器引用附加到游戏控制器
            gameController.floppyController = floppyController;
            
            // 5. 初始化地图MVC
            const mapModel = new MapModel();
            const mapView = new MapView();
            const mapController = new MapController(mapModel, mapView);
            
            // 6. 为了向后兼容，也将mapController添加到window对象
            window.mapController = mapController;

            // 7. 初始化身份MVC
            const identityModel = new IdentityModel();
            const identityView = new IdentityView();
            const identityController = new IdentityController(identityModel, identityView);
            window.identityController = identityController;
            identityController.initialize();

            // 8. 注册控制器到界面服务
            if (interfaceService) {
                interfaceService.registerController('terminal', gameController);
                interfaceService.registerController('map', mapController);
                interfaceService.registerController('identity', identityController);
            }
            
            // 9. 订阅系统电源变化事件
            EventBus.on('systemPowerChange', (isOn) => {
                floppyController.handleSystemPowerChange(isOn);
                
                // 每次电源状态变化时保存设置
                gameController.saveSettings();
                
                // 如果系统关闭，确保地图也隐藏
                if (!isOn && mapController.model.isVisible) {
                    mapController.model.setVisibility(false);
                    mapView.hide();
                }
            });

            // 10. 添加颜色切换事件监听
            EventBus.on('colorModeChanged', (isAmber) => {
                if (mapController) {
                    mapView.updateColorMode(isAmber);
                }
                if (identityController) {
                    identityController.updateColorMode(isAmber);
                }
            });

            // 11. 初始化世界书系统
            if (typeof initializeLorebookSystem === 'function') {
                initializeLorebookSystem();
            }
            
            console.log("游戏初始化完成");
        });
    } catch (error) {
        console.error("游戏初始化失败:", error);
        alert("游戏初始化失败，请查看控制台以获取详细信息。");
    }
}

// 确保所有依赖文件已加载后再初始化游戏
window.onload = function() {
    // 检查必要组件是否存在
    if (!window.GameCore) {
        console.error("GameCore 未加载。请确保 gameCore.js 文件已正确引入。");
        return;
    }
    
    if (!window.ServiceLocator) {
        console.error("ServiceLocator 未加载。请确保 serviceLocator.js 文件已正确引入。");
        return;
    }
    
    if (!window.DOMUtils) {
        console.warn("DOMUtils 未加载。某些 DOM 操作可能不可用。");
    }
    
    if (!window.StorageUtils) {
        console.warn("StorageUtils 未加载。本地存储功能可能受限。");
    }
    
    // 所有必要组件都已加载，初始化游戏
    initializeGame();
};