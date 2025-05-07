// js/models/gameModel.js
// Model - 处理游戏状态和数据
class GameModel {
    constructor() {
        this.isOn = false;
        this.currentLocation = "开始";
        this.gameState = {
            inventory: [],
            flags: {},
            npcRelations: {}
        };
        this.locations = {
            "开始": {
                description: "请输入'help'查看可用命令。",
                commands: {
                    "help": "显示帮助信息",
                    "search": "搜索数据库",
                    "connect": "连接到NPC终端",
                    "status": "检查系统状态"
                }
            }
        };
        
        // IBM SVG Logo路径
        this.ibmLogoPath = '/assets/images/ibm-logo.svg';

        // 启动画面内容
        this.bootSequence = [
            {
                type: "svg-logo",
                // 直接使用字符串而不是对象属性
                content: "/assets/images/ibm-logo.svg"
            },
            {
                type: "text-center",
                content: "Personal Computer"
            },
            {
                type: "box",
                content: [
                    "Microsoft Adventure",
                    "Version 1.00"
                ]
            },
            {
                type: "text-center",
                content: "(C) Copyright IBM Corp 1981"
            },
            {
                type: "text-center",
                content: "(C) Copyright Softwin Assoc. 1979"
            },
            {
                type: "text-center",
                content: "Implemented by Gordon Letwin"
            },
            {
                type: "text-center",
                content: "Produced by Microsoft"
            }
        ];
    }
    
    powerOn() {
        this.isOn = true;
        return "";  // 启动内容由bootSequence决定
    }
    
    powerOff() {
        this.isOn = false;
        return "系统关闭中...\n再见。";
    }
    
    processCommand(command) {
        if (!this.isOn) return "系统当前已关闭。请按下电源按钮启动系统。";
        
        command = command.toLowerCase().trim();
        
        if (command === "") return "";
        
        // 基本命令处理
        switch(command) {
            case "help":
                return this.getHelp();
            case "clear":
                return "CLEAR_SCREEN";
            case "status":
                return this.getStatus();
            case "power off":
                return this.powerOff();
        }
        
        // 处理带参数的命令
        if (command.startsWith("search ")) {
            return this.search(command.substring(7));
        }
        
        if (command.startsWith("connect ")) {
            return this.connect(command.substring(8));
        }
        
        return `未知命令: "${command}"\n输入 "help" 获取可用命令列表。`;
    }
    
    getHelp() {
        let location = this.locations[this.currentLocation];
        let helpText = "可用命令:\n";
        
        for (let cmd in location.commands) {
            helpText += `  ${cmd} - ${location.commands[cmd]}\n`;
        }
        
        helpText += "  clear - 清除屏幕\n";
        helpText += "  power off - 关闭系统\n";
        
        return helpText;
    }
    
    getStatus() {
        return `系统状态: 正常运行
当前位置: ${this.currentLocation}
内存使用率: 38%
磁盘空间: 12.4MB/20MB
网络状态: 已连接
`;
    }
    
    search(query) {
        // 模拟搜索功能
        if (!query) return "请指定搜索关键词。使用格式: search [关键词]";
        
        // 触发磁盘活动指示灯
        EventBus.emit('diskActivity');
        
        return `正在搜索 "${query}"...\n\n` +
            `搜索结果:\n` +
            `1. ${query}相关文件 - 上次访问: 1984/03/21\n` +
            `2. ${query}数据库记录 - 机密等级: 中\n` +
            `3. ${query}系统日志 - 记录项: 27\n\n` +
            `输入 "open [编号]" 打开对应结果`;
    }
    
    connect(target) {
        // 模拟NPC连接功能
        if (!target) return "请指定连接目标。使用格式: connect [目标ID]";
        
        // 触发网络活动指示灯
        EventBus.emit('networkActivity');
        
        return `尝试连接到 "${target}"...\n\n` +
            `建立加密通道...\n` +
            `验证身份...\n` +
            `连接成功!\n\n` +
            `${target}: "你好，有什么我可以帮助你的吗？"\n\n` +
            `输入消息直接回复。输入 "disconnect" 断开连接。`;
    }
}