// js/npcChatSystem.js
// NPC聊天系统主入口文件

/**
 * 初始化NPC聊天系统
 */
function initializeNpcChatSystem() {
    try {
        // 实例化MVC组件
        const npcChatModel = new NpcChatModel();
        const npcChatView = new NpcChatView();
        const npcChatController = new NpcChatController(npcChatModel, npcChatView);
        
        // 将控制器附加到window对象以便全局访问
        window.npcChatController = npcChatController;
        
        console.log("NPC聊天系统已初始化");
        
        // 添加命令监听：将终端命令转发到聊天系统
        setupCommandListener();
        
        return true;
    } catch (error) {
        console.error("NPC聊天系统初始化失败:", error);
        return false;
    }
}

/**
 * 设置命令监听器
 */
function setupCommandListener() {
    // 创建命令处理器
    const commandHandler = function(input) {
        // 处理message命令和rerun命令
        if (input.startsWith('message ') || input.startsWith('msg ') || input === 'rerun') {
            // 发布命令事件
            EventBus.emit('terminalCommand', { command: input });
            
            // 返回true表示命令已被处理
            return true;
        }
        
        // 返回false表示命令未被处理，应交由游戏核心继续处理
        return false;
    };
    
    // 添加到全局命令预处理链
    if (!window.commandPreprocessors) {
        window.commandPreprocessors = [];
    }
    
    window.commandPreprocessors.push(commandHandler);
    console.log("NPC聊天系统命令监听器已设置");
}

// 等待DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 确保在游戏控制器初始化后再初始化NPC聊天系统
    if (window.gameController) {
        initializeNpcChatSystem();
    } else {
        // 如果游戏控制器尚未初始化，等待其初始化完成
        const checkInterval = setInterval(function() {
            if (window.gameController) {
                clearInterval(checkInterval);
                initializeNpcChatSystem();
            }
        }, 500);
    }
});