// js/services/audioService.js
/**
 * 音频服务
 * 作为游戏音频的统一管理接口，并兼容旧的audioManager API
 * 注意：此文件未重写完整的audioManager，而是作为包装器，兼容现有调用
 */
class AudioService {
    constructor() {
        // 检查全局audioManager是否已存在
        this.audioManager = window.audioManager;
        
        // 如果不存在，在这里可以创建一个最小实现
        if (!this.audioManager) {
            console.warn('AudioManager不存在，创建最小音频服务实现');
            this.createMinimalImplementation();
        }
    }
    
    /**
     * 创建最小音频服务实现
     * 仅在原AudioManager不可用时使用
     */
    createMinimalImplementation() {
        this.sounds = {};
        this.loopingSounds = {};
        this.masterVolume = 1.0;
        this.soundEnabled = true;
    }
    
    /**
     * 播放音效
     * @param {string} soundId - 音效ID
     * @returns {Promise<boolean>} 是否成功播放
     */
    play(soundId) {
        if (this.audioManager) {
            return this.audioManager.play(soundId);
        }
        
        // 最小实现
        console.log(`[AudioService] 播放音效: ${soundId}`);
        return Promise.resolve(false);
    }
    
    /**
     * 播放循环音效
     * @param {string} soundId - 音效ID
     * @returns {HTMLAudioElement|null} 音频元素或null
     */
    playLoop(soundId) {
        if (this.audioManager) {
            return this.audioManager.playLoop(soundId);
        }
        
        // 最小实现
        console.log(`[AudioService] 开始循环播放: ${soundId}`);
        return null;
    }
    
    /**
     * 停止循环音效
     * @param {string} soundId - 音效ID
     * @param {number} [fadeTime=1000] - 淡出时间(毫秒)
     */
    stopLoop(soundId, fadeTime = 1000) {
        if (this.audioManager) {
            this.audioManager.stopLoop(soundId, fadeTime);
        } else {
            console.log(`[AudioService] 停止循环播放: ${soundId}`);
        }
    }
    
    /**
     * 开始电脑运行声音
     */
    startComputerSound() {
        if (this.audioManager) {
            this.audioManager.startComputerSound();
        } else {
            console.log('[AudioService] 开始电脑运行声音');
        }
    }
    
    /**
     * 停止电脑运行声音
     * @param {number} [fadeTime=1000] - 淡出时间(毫秒)
     */
    stopComputerSound(fadeTime = 1000) {
        if (this.audioManager) {
            this.audioManager.stopComputerSound(fadeTime);
        } else {
            console.log('[AudioService] 停止电脑运行声音');
        }
    }
    
    /**
     * 开始软盘读取音效
     * @returns {HTMLAudioElement|null} 音频元素或null
     */
    startFloppyReadingSound() {
        if (this.audioManager) {
            return this.audioManager.startFloppyReadingSound();
        }
        console.log('[AudioService] 开始软盘读取音效');
        return null;
    }
    
    /**
     * 停止软盘读取音效
     * @param {number} [fadeTime=0] - 淡出时间(毫秒)
     */
    stopFloppyReadingSound(fadeTime = 0) {
        if (this.audioManager) {
            this.audioManager.stopFloppyReadingSound(fadeTime);
        } else {
            console.log('[AudioService] 停止软盘读取音效');
        }
    }
    
    /**
     * 设置主音量
     * @param {number} volume - 音量值(0-1)
     */
    setMasterVolume(volume) {
        if (this.audioManager) {
            this.audioManager.setMasterVolume(volume);
        } else {
            this.masterVolume = Math.max(0, Math.min(1, volume));
            console.log(`[AudioService] 设置主音量: ${volume}`);
        }
    }
    
    /**
     * 启用/禁用音效
     * @param {boolean} [enabled] - 是否启用，不提供则切换
     * @returns {boolean} 当前音效状态
     */
    toggleSound(enabled) {
        if (this.audioManager) {
            return this.audioManager.toggleSound(enabled);
        }
        
        this.soundEnabled = enabled !== undefined ? enabled : !this.soundEnabled;
        console.log(`[AudioService] 音效状态: ${this.soundEnabled ? '启用' : '禁用'}`);
        return this.soundEnabled;
    }
    
    /**
     * 代理其他方法到audioManager
     * @param {string} methodName - 方法名
     * @param {Array} args - 参数数组
     * @returns {*} 方法返回值
     */
    _proxyMethod(methodName, ...args) {
        if (this.audioManager && typeof this.audioManager[methodName] === 'function') {
            return this.audioManager[methodName](...args);
        }
        console.warn(`[AudioService] 尝试调用未实现的方法: ${methodName}`);
        return null;
    }
    
    // 代理其他可能的方法
    fadeOut(...args) { return this._proxyMethod('fadeOut', ...args); }
    pauseAllLoops(...args) { return this._proxyMethod('pauseAllLoops', ...args); }
    resumeLoopsIfNeeded(...args) { return this._proxyMethod('resumeLoopsIfNeeded', ...args); }
    saveSettings(...args) { return this._proxyMethod('saveSettings', ...args); }
    loadSettings(...args) { return this._proxyMethod('loadSettings', ...args); }
}