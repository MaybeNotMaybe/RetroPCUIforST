// js/interfaces/systemStateProvider.js
class SystemStateProvider {
    constructor(gameModel) {
        this.gameModel = gameModel;

        // 添加调试日志以确认初始状态
        console.log("SystemStateProvider 初始化, 系统状态:", this.gameModel.isOn);
    }
    
    isSystemOn() {
        return this.gameModel.isOn;
    }
}