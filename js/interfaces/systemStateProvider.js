// js/interfaces/systemStateProvider.js
class SystemStateProvider {
    constructor(gameModel) {
        this.gameModel = gameModel;
    }
    
    isSystemOn() {
        return this.gameModel.isOn;
    }
}