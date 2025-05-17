// js/lorebookSystem.js
function initializeLorebookSystem() {
    try {
        // 实例化MVC组件
        const lorebookModel = new LorebookModel();
        const lorebookController = new LorebookController(lorebookModel);
        
        // 将控制器附加到window对象以便全局访问
        window.lorebookController = lorebookController;
        
        // 异步初始化
        lorebookController.initialize().then(success => {
            if (success) {
                console.log("世界书系统初始化完成");
            } else {
                console.error("世界书系统初始化失败");
            }
        });
        
        return true;
    } catch (error) {
        console.error("世界书系统初始化失败:", error);
        return false;
    }
}

// 等待DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 确保在游戏控制器初始化后再初始化世界书系统
    if (window.gameController) {
        initializeLorebookSystem();
    } else {
        // 如果游戏控制器尚未初始化，等待其初始化完成
        const checkInterval = setInterval(function() {
            if (window.gameController) {
                clearInterval(checkInterval);
                initializeLorebookSystem();
            }
        }, 500);
    }
});