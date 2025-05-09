// js/managers/audioManager.js
class AudioManager {
    constructor() {

        // 音效库
        this.sounds = {
            // UI音效
            buttonClick: { src: 'https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@main/assets/sounds/crt-button.mp3', volume: 0.7 },
            powerButton: { src: 'https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@main/assets/sounds/crt-button.mp3', volume: 0.4 },
            functionButton: { src: 'https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@main/assets/sounds/crt-button-com.mp3', volume: 0.6 },
            toggleSwitch: { src: 'https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@main/assets/sounds/floppy_button.mp3', volume: 1 },
            
            // 软盘相关音效
            floppyInsert: { src: 'https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@main/assets/sounds/floppy_insert.mp3', volume: 1 },
            floppyEject: { src: 'https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@main/assets/sounds/floppy_eject.mp3', volume: 1 },
            floppyRead: { src: 'https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@main/assets/sounds/ffloppy_read.mp3', volume: 0 },
            floppyButton: { src: 'https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@main/assets/sounds/floppy_button.mp3', volume: 1 },

            // 屏幕相关音效
            screenOn: { src: 'https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@main/assets/sounds/crt-ON.mp3', volume: 0.3 },
            screenOff: { src: 'https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@main/assets/sounds/crt-OFF.mp3', volume: 0.3 },
            screenSwitch: { src: 'https://cdn.example.com/sounds/screen_switch.mp3', volume: 0.6 },
            
            // 硬盘/系统音效
            diskActivity: { src: 'https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@main/assets/sounds/floppy_read.mp3', volume: 0.5 },
            systemBeep: { src: 'https://cdn.example.com/sounds/system_beep.mp3', volume: 0.7 },
            keypress: { src: 'https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@main/assets/sounds/crt-switch.mp3', volume: 0.3 }
            
        };

        // 循环播放的音效对象
        this.loopingSounds = {};
        
        // 添加电脑运行声音
        this.sounds.computerRunning = { 
            src: 'assets/sounds/ffloppy_read.mp3', 
            volume: 0.15, 
            loop: true 
        };

        this.sounds.floppyReading = { 
            src: 'assets/sounds/floppy_read_loop.mp3', 
            volume: 0.3, 
            loop: true 
        };
        
        // 音频对象缓存
        this.audioObjects = {};
        
        // 全局音量设置
        this.masterVolume = 1.0;
        
        // 音效启用状态
        this.soundEnabled = true;
        
        // 预加载所有音效
        this.preloadSounds();
        
        // 读取用户设置
        this.loadSettings();

        // 监听页面可见性变化
        this.setupVisibilityHandler();
    }
    
    // 预加载音效以提高响应速度
    preloadSounds() {
        for (const [key, soundInfo] of Object.entries(this.sounds)) {
            try {
                const audio = new Audio();
                audio.volume = soundInfo.volume * this.masterVolume;
                audio.src = soundInfo.src;
                
                // 在某些浏览器中使音频静音加载可以避免自动播放限制
                audio.muted = true;
                audio.preload = 'auto';
                
                // 创建多个实例以支持同一个音效的重叠播放
                this.audioObjects[key] = [audio];
                
                // 对于常用的短音效，创建额外的实例
                if (['buttonClick', 'keypress', 'diskActivity'].includes(key)) {
                    for (let i = 0; i < 3; i++) {
                        const extraAudio = new Audio();
                        extraAudio.volume = soundInfo.volume * this.masterVolume;
                        extraAudio.src = soundInfo.src;
                        extraAudio.muted = true;
                        extraAudio.preload = 'auto';
                        this.audioObjects[key].push(extraAudio);
                    }
                }
            } catch (error) {
                console.warn(`无法预加载音效 ${key}:`, error);
            }
        }
    }
    
    // 播放指定音效
    play(soundId) {
        if (!this.soundEnabled) return false;
        
        try {
            if (!this.audioObjects[soundId] || this.audioObjects[soundId].length === 0) {
                console.warn(`找不到音效: ${soundId}`);
                return false;
            }
            
            // 查找一个当前未播放的音频实例
            let audioToPlay = this.audioObjects[soundId][0];
            for (const audio of this.audioObjects[soundId]) {
                if (audio.paused || audio.ended) {
                    audioToPlay = audio;
                    break;
                }
            }
            
            // 确保音频不是静音的（预加载时可能设为静音）
            audioToPlay.muted = false;
            
            // 重置播放位置并播放
            audioToPlay.currentTime = 0;
            
            // 使用 Promise 来处理可能的播放失败
            return audioToPlay.play()
                .then(() => true)
                .catch(error => {
                    console.warn(`播放音效 ${soundId} 失败:`, error);
                    return false;
                });
        } catch (error) {
            console.error(`播放音效 ${soundId} 时出错:`, error);
            return false;
        }
    }

    // 播放循环音效
    playLoop(soundId) {
        if (!this.soundEnabled || !this.sounds[soundId]) return null;
        
        // 如果已经在播放，返回现有的实例
        if (this.loopingSounds[soundId] && !this.loopingSounds[soundId].paused) {
            return this.loopingSounds[soundId];
        }
        
        try {
            // 创建新的音频对象（或获取现有的）
            if (!this.loopingSounds[soundId]) {
                const audio = new Audio();
                audio.src = this.sounds[soundId].src;
                audio.volume = this.sounds[soundId].volume * this.masterVolume;
                audio.loop = true; // 启用循环播放
                this.loopingSounds[soundId] = audio;
            }
            
            const audio = this.loopingSounds[soundId];
            
            // 确保从头开始播放
            audio.currentTime = 0;
            
            // 开始播放
            audio.play().catch(error => {
                console.warn(`开始循环播放音效 ${soundId} 失败:`, error);
            });
            
            return audio;
        } catch (error) {
            console.error(`播放循环音效 ${soundId} 时出错:`, error);
            return null;
        }
    }

    // 停止循环音效
    stopLoop(soundId, fadeTime = 1000) {
        if (!this.loopingSounds[soundId]) return;
        
        try {
            // 如果 fadeTime 为 0，则立即停止，不使用渐出效果
            if (fadeTime <= 0) {
                this.loopingSounds[soundId].pause();
                this.loopingSounds[soundId].currentTime = 0;
                return;
            }
            
            // 使用指定的渐出时间
            this.fadeOut(this.loopingSounds[soundId], fadeTime).then(() => {
                this.loopingSounds[soundId].pause();
                this.loopingSounds[soundId].currentTime = 0;
            });
        } catch (error) {
            console.error(`停止循环音效 ${soundId} 时出错:`, error);
            
            // 如果渐出失败，直接停止
            if (this.loopingSounds[soundId]) {
                this.loopingSounds[soundId].pause();
                this.loopingSounds[soundId].currentTime = 0;
            }
        }
    }

    // 添加指定音效停止方法
    stopFloppyReadingSound(fadeTime = 0) {  // 默认为0，即无渐出效果
        this.stopLoop('floppyReading', fadeTime);
    }

    // 音量淡出效果
    fadeOut(audioElement, duration = 1000) {
        return new Promise((resolve, reject) => {
            if (!audioElement || audioElement.paused) {
                resolve();
                return;
            }
            
            // 确保时间为正数
            const fadeDuration = Math.max(1, duration);
            const originalVolume = audioElement.volume;
            
            // 如果时间过短，简化处理
            if (fadeDuration < 50) {
                audioElement.volume = 0;
                resolve();
                return;
            }
            
            // 计算步进值 - 每50毫秒更新一次
            const steps = fadeDuration / 50;
            const volumeStep = originalVolume / steps;
            let currentVolume = originalVolume;
            
            const fadeInterval = setInterval(() => {
                currentVolume = Math.max(0, currentVolume - volumeStep);
                
                if (currentVolume <= 0.01) {
                    clearInterval(fadeInterval);
                    audioElement.volume = 0;
                    resolve();
                    return;
                }
                
                audioElement.volume = currentVolume;
            }, 50);
        });
    }
    
    // 更新音效设置
    updateSound(soundId, newSrc, newVolume) {
        if (!this.sounds[soundId]) {
            console.warn(`试图更新不存在的音效: ${soundId}`);
            return;
        }
        
        this.sounds[soundId] = {
            src: newSrc || this.sounds[soundId].src,
            volume: newVolume !== undefined ? newVolume : this.sounds[soundId].volume
        };
        
        // 更新音频对象
        if (this.audioObjects[soundId]) {
            for (const audio of this.audioObjects[soundId]) {
                audio.src = this.sounds[soundId].src;
                audio.volume = this.sounds[soundId].volume * this.masterVolume;
            }
        }
    }

    // 设置页面可见性处理器
    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // 页面不可见时暂停所有循环音效
                this.pauseAllLoops();
            } else {
                // 页面可见时恢复循环音效（如果系统是开机状态）
                this.resumeLoopsIfNeeded();
            }
        });
    }

    // 暂停所有循环音效
    pauseAllLoops() {
        // 保存当前循环音效的播放状态
        this.loopStates = {};
        
        for (const [soundId, audio] of Object.entries(this.loopingSounds)) {
            this.loopStates[soundId] = !audio.paused;
            if (!audio.paused) {
                audio.pause();
            }
        }
    }

    // 恢复循环音效
    resumeLoopsIfNeeded() {
        // 只在音效启用且系统开机状态下恢复
        if (!this.soundEnabled) return;
        
        // 检查系统是否开机
        const isSystemOn = window.gameController && 
                        window.gameController.model && 
                        window.gameController.model.isOn;
        
        if (isSystemOn && this.loopStates && this.loopStates.computerRunning) {
            this.startComputerSound();
        }
    }

    // 播放电脑运行声音
    startComputerSound() {
        this.playLoop('computerRunning');
    }

    // 停止电脑运行声音
    stopComputerSound(fadeTime = 1000) {  // 默认使用1秒渐出
        this.stopLoop('computerRunning', fadeTime);
    }

    // 开始播放软盘读取音效
    startFloppyReadingSound() {
        return this.playLoop('floppyReading');
    }

    // 停止软盘读取音效
    stopFloppyReadingSound(fadeTime = 0) {
        this.stopLoop('floppyReading', fadeTime);
    }
    
    // 设置主音量
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        
        // 更新所有普通音频对象的音量
        for (const [soundId, audioList] of Object.entries(this.audioObjects)) {
            for (const audio of audioList) {
                audio.volume = this.sounds[soundId].volume * this.masterVolume;
            }
        }
        
        // 更新所有循环音效的音量
        for (const [soundId, audio] of Object.entries(this.loopingSounds)) {
            if (this.sounds[soundId]) {
                audio.volume = this.sounds[soundId].volume * this.masterVolume;
            }
        }
        
        // 保存设置
        this.saveSettings();
    }
    
    // 启用/禁用音效
    toggleSound(enabled) {
        const wasEnabled = this.soundEnabled;
        this.soundEnabled = enabled !== undefined ? enabled : !this.soundEnabled;
        
        // 如果从启用变为禁用，停止所有循环音效
        if (wasEnabled && !this.soundEnabled) {
            for (const soundId in this.loopingSounds) {
                if (this.loopingSounds[soundId] && !this.loopingSounds[soundId].paused) {
                    this.loopingSounds[soundId].pause();
                }
            }
        }
        // 如果从禁用变为启用，检查是否需要恢复电脑运行声音
        else if (!wasEnabled && this.soundEnabled) {
            // 检查系统是否开机
            if (window.gameController && window.gameController.model && 
                window.gameController.model.isOn) {
                this.startComputerSound();
            }
        }
        
        this.saveSettings();
        return this.soundEnabled;
    }
    
    // 保存音效设置到localStorage
    saveSettings() {
        try {
            const settings = {
                masterVolume: this.masterVolume,
                soundEnabled: this.soundEnabled
            };
            localStorage.setItem('audioSettings', JSON.stringify(settings));
        } catch (error) {
            console.warn('保存音频设置失败:', error);
        }
    }
    
    // 从localStorage加载音效设置
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('audioSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                this.masterVolume = settings.masterVolume !== undefined ? settings.masterVolume : 1.0;
                this.soundEnabled = settings.soundEnabled !== undefined ? settings.soundEnabled : true;
                
                // 应用加载的设置到所有音频对象
                for (const [soundId, audioList] of Object.entries(this.audioObjects)) {
                    for (const audio of audioList) {
                        audio.volume = this.sounds[soundId].volume * this.masterVolume;
                    }
                }
            }
        } catch (error) {
            console.warn('加载音频设置失败:', error);
        }
    }
}

// 创建全局音效管理器实例
window.audioManager = new AudioManager();