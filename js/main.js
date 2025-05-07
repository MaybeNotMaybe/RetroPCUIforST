// js/main.js
// 初始化游戏
window.onload = function() {
    try {
        console.log("初始化游戏...");
        
        // 创建游戏核心MVC
        const gameModel = new GameModel();
        const gameView = new GameView();
        const gameController = new GameController(gameModel, gameView);
        
        // 确保先完成GameController的初始化和设置加载
        setTimeout(() => {
            // 创建系统状态提供者，此时gameModel的状态已确定
            const systemStateProvider = new SystemStateProvider(gameModel);
            
            // 创建软盘MVC
            const floppyModel = new FloppyModel(EventBus);
            const floppyView = new FloppyView();
            const floppyController = new FloppyController(
                floppyModel, 
                floppyView, 
                systemStateProvider
            );
            
            // 订阅系统电源变化事件
            EventBus.on('systemPowerChange', (isOn) => {
                console.log("系统电源状态变化:", isOn);
                floppyController.handleSystemPowerChange(isOn);
            });
            
            // 将软盘控制器引用附加到游戏控制器
            gameController.floppyController = floppyController;
        }, 100);
        
        console.log("游戏初始化完成");
    } catch (error) {
        console.error("游戏初始化失败:", error);
        alert("游戏初始化失败，请查看控制台以获取详细信息。");
    }
};