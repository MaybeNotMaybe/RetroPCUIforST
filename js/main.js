// js/main.js
// 初始化游戏
window.onload = function() {
    try {
        console.log("初始化游戏...");
        const model = new GameModel();
        const view = new GameView();
        const controller = new GameController(model, view);
        console.log("游戏初始化完成");
    } catch (error) {
        console.error("游戏初始化失败:", error);
        alert("游戏初始化失败，请查看控制台以获取详细信息。");
    }
};