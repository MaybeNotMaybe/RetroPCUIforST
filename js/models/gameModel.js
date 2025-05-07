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
        
        // IBM SVG Logo
        this.ibmLogo = `<svg xmlns="http://www.w3.org/2000/svg" width="2500" height="1000" viewBox="0 0 1000 400"><path d="M0 0v27.367h194.648V0H0zm222.226 0v27.367h277.383S471.276 0 433.75 0H222.226zm331.797 0v27.367h167.812L711.875 0H554.023zm288.125 0l-9.961 27.367h166.289V0H842.148zM0 53.222v27.367h194.648V53.222H0zm222.226.039V80.59h309.57s-3.615-21.063-9.922-27.329H222.226zm331.797 0V80.59h186.211l-9.219-27.329H554.023zm268.203 0l-9.219 27.329h185.469V53.261h-176.25zM55.937 106.444v27.406h84.297v-27.406H55.937zm222.227 0v27.406h84.297v-27.406h-84.297zm166.289 0v27.406h84.297s5.352-14.473 5.352-27.406h-89.649zm165.508 0v27.406h149.453l-9.961-27.406H609.961zm193.906 0l-10 27.406h150.195v-27.406H803.867zm-747.93 53.262v27.367h84.297v-27.367H55.937zm222.227 0v27.367h215.312s18.012-14.042 23.75-27.367H278.164zm331.797 0v27.367h84.297v-15.234l5.352 15.234h154.414l5.742-15.234v15.234h84.297v-27.367H785.82l-8.398 23.18-8.438-23.18H609.961zM55.937 212.928v27.367h84.297v-27.367H55.937zm222.227 0v27.367h239.062c-5.739-13.281-23.75-27.367-23.75-27.367H278.164zm331.797 0v27.367h84.297v-27.367h-84.297zm99.609 0l10.195 27.367h115.781l9.688-27.367H709.57zm150.195 0v27.367h84.297v-27.367h-84.297zM55.937 266.15v27.366h84.297V266.15H55.937zm222.227 0v27.366h84.297V266.15h-84.297zm166.289 0v27.366h89.648c0-12.915-5.352-27.366-5.352-27.366h-84.296zm165.508 0v27.366h84.297V266.15h-84.297zm118.75 0l9.883 27.366h77.617l9.961-27.366h-97.461zm131.054 0v27.366h84.297V266.15h-84.297zM1.523 319.372v27.406h194.648v-27.406H1.523zm220.703 0v27.406h299.648c6.307-6.275 9.922-27.406 9.922-27.406h-309.57zm333.321 0v27.406h138.711v-27.406H555.547zm192.343 0l10.156 27.406h39.492l9.531-27.406H747.89zm111.875 0v27.406H1000v-27.406H859.765zM1.523 372.633V400h194.648v-27.367H1.523zm220.703 0v27.328H433.75c37.526 0 65.859-27.328 65.859-27.328H222.226zm333.321 0V400h138.711v-27.367H555.547zm211.601 0l9.766 27.29 1.68.038 9.922-27.328h-21.368zm92.617 0V400H1000v-27.367H859.765z" fill="#1f70c1"/></svg>`;
        
        // 启动画面内容
        this.bootSequence = [
            {
                type: "svg-logo",
                content: this.ibmLogo
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