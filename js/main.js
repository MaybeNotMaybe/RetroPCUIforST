// js/main.js

function setupFunctionButtonsForMap() {
    const f1Button = document.getElementById('fnButton1');
    const f5Button = document.getElementById('fnButton5');
    
    if (f1Button) {
        f1Button.addEventListener('click', () => {
            if (window.isSystemOperational() && 
                window.mapController && 
                window.mapController.model.isVisible) {
                window.mapController.toggleMapView();
            }
        });
    }
    
    if (f5Button) {
        f5Button.addEventListener('click', () => {
            if (window.isSystemOperational() && 
                window.mapController && 
                !window.mapController.model.isVisible) {
                window.mapController.toggleMapView();
            }
        });
    }
    
    console.log("地图功能按钮事件已设置");
}

window.onload = function() {
    try {
        console.log("初始化游戏...");
        
        // 创建游戏核心MVC
        const gameModel = new GameModel();
        const gameView = new GameView();
        const gameController = new GameController(gameModel, gameView);

        // 为了让FloppyController能访问到gameController进行保存
        window.gameController = gameController;
        
        // 创建系统状态提供者
        const systemStateProvider = new SystemStateProvider(gameModel);
        
        // 创建软盘控制器
        const floppyController = new FloppyController(systemStateProvider);
        
        // 将软盘控制器引用附加到游戏控制器
        gameController.floppyController = floppyController;
        
        // 初始化地图MVC
        const mapModel = new MapModel();
        const mapView = new MapView();
        const mapController = new MapController(mapModel, mapView);
        
        // 为了方便访问，也将mapController添加到window对象
        window.mapController = mapController;

        // 初始化身份MVC
        const identityModel = new IdentityModel();
        const identityView = new IdentityView();
        const identityController = new IdentityController(identityModel, identityView);
        window.identityController = identityController;
        identityController.initialize();

        // // 程序运行事件监听
        // EventBus.on('runProgram', (data) => {
        //     console.log(`正在运行程序: ${data.program}`);
            
        //     // 根据程序类型切换界面
        //     if (data.program === 'map' && mapController) {
        //         if (!mapController.model.isVisible) {
        //             mapController.toggleMapView();
        //         }
        //     }
        // });

        // 创建界面管理器
        window.interfaceManager = new InterfaceManager();

        // 注册控制器
        window.interfaceManager.registerController('terminal', gameController);
        window.interfaceManager.registerController('map', mapController);
        window.interfaceManager.registerController('identity', identityController);
        
        // 订阅系统电源变化事件
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

        EventBus.on('runProgram', (data) => {
            if (data.program === 'map') {
                window.interfaceManager.switchTo('map');
            }
        });
        
        // 添加颜色切换事件监听
        EventBus.on('colorModeChanged', (isAmber) => {
            if (mapController) {
                mapView.updateColorMode(isAmber);
            }
            if (identityController) {
                identityController.updateColorMode(isAmber);
            }
        });

        // 添加按钮事件设置
        setTimeout(setupFunctionButtonsForMap, 1000);
        
        console.log("游戏初始化完成");
    } catch (error) {
        console.error("游戏初始化失败:", error);
        alert("游戏初始化失败，请查看控制台以获取详细信息。");
    }
};