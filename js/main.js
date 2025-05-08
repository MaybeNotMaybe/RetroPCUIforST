// js/main.js
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
        
        // 添加颜色切换事件监听
        EventBus.on('colorModeChanged', (isAmber) => {
            if (mapController) {
                mapView.updateColorMode(isAmber);
            }
        });
        
        console.log("游戏初始化完成");
    } catch (error) {
        console.error("游戏初始化失败:", error);
        alert("游戏初始化失败，请查看控制台以获取详细信息。");
    }
};