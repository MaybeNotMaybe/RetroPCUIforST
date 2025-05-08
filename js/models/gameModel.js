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
        this.terminalHistory = [];
        this.locations = {
            "开始": {
                description: "请输入'help'查看可用命令。",
                commands: {
                    "help": "显示帮助信息",
                    "search [关键词]": "搜索数据库",
                    "connect [目标ID]": "连接到NPC终端",
                    "status": "检查系统状态",
                    "dir [驱动器]": "显示驱动器内容",
                    "run [程序]": "运行指定的程序",
                    "clear": "清除屏幕"
                }
            }
        };

        // 可用程序列表
        this.availablePrograms = {
            "map": {
                name: "地理信息系统",
                description: "显示区域地图和位置信息"
            }
        };
        
        // IBM SVG Logo路径
        this.ibmLogoPath = 'https://files.catbox.moe/hl0jz8.svg';

        // 启动画面内容
        this.bootSequence = [
            {
                type: "svg-logo",
                content: "https://files.catbox.moe/hl0jz8.svg"
            },
            {
                type: "text-center",
                content: "Personal Computer"
            },
            {
                type: "box",
                content: [
                    "Secure Operating System",
                    "V3.2.1 [1983-10-29]"
                ]
            },
            {
                type: "text-center",
                content: "(C) Copyright IMB Corp 1981"
            },
            {
                type: "text-center",
                content: "Developed by DARPA"
            },
            {
                type: "text-center",
                content: "Restricted Access Terminal"
            },
            {
                type: "text-center",
                content: "Authorized Personnel Only"
            }
        ];

        // 系统状态枚举
        this.SystemState = {
            POWERED_OFF: 'POWERED_OFF',
            POWERING_ON: 'POWERING_ON',
            POWERED_ON: 'POWERED_ON',
            POWERING_OFF: 'POWERING_OFF'
        };
        
        // 初始系统状态
        this.systemState = this.SystemState.POWERED_OFF;
    }

    // 添加输出到历史记录
    addToHistory(content) {
        if (typeof content === 'string') {
            this.terminalHistory.push(content);
        } else {
            console.error("历史记录只能添加字符串", content);
        }
    }

    // 获取系统状态
    getSystemState() {
        return this.systemState;
    }    
    
    // 获取完整的历史记录
    getHistory() {
        return this.terminalHistory;
    }
    
    // 清除历史记录
    clearHistory() {
        this.terminalHistory = [];
    }
    
    powerOn() {
        // 更新系统状态
        this.systemState = this.SystemState.POWERING_ON;
        
        // 广播系统状态变化
        EventBus.emit('systemStateChange', {
            state: this.systemState,
            isOn: false  // 尚未完全开机
        });
        
        this.isOn = true;
        return "";
    }
    
    powerOff() {
        // 更新系统状态
        this.systemState = this.SystemState.POWERING_OFF;
        
        // 广播系统状态变化
        EventBus.emit('systemStateChange', {
            state: this.systemState,
            isOn: true  // 尚未完全关机
        });
        
        this.isOn = false;
        this.clearHistory();
        return "\n\n系统关闭中...\n再见。";
    }

    // 开机完成方法
    completeStartup() {
        this.systemState = this.SystemState.POWERED_ON;
        
        // 广播系统状态变化
        EventBus.emit('systemStateChange', {
            state: this.systemState,
            isOn: true  // 完全开机
        });
    }

    // 关机完成方法
    completeShutdown() {
        this.systemState = this.SystemState.POWERED_OFF;
        
        // 广播系统状态变化
        EventBus.emit('systemStateChange', {
            state: this.systemState,
            isOn: false  // 完全关机
        });
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
            
            // 处理无参数的命令情况
            case "search":
                return this.getCommandUsage("search");
            case "connect":
                return this.getCommandUsage("connect");
            case "dir":
                return this.getCommandUsage("dir");
            case "run":
                return this.getCommandUsage("run");
        }
        
        // 处理带参数的命令
        if (command.startsWith("search ")) {
            return this.search(command.substring(7));
        }
        
        if (command.startsWith("connect ")) {
            return this.connect(command.substring(8));
        }
        
        if (command.startsWith("dir ")) {
            return this.readDrive(command.substring(4));
        }

        if (command.startsWith("run ")) {
            return this.runProgram(command.substring(4).trim());
        }
        
        return `未知命令: "${command}"\n输入 "help" 获取可用命令列表。`;
    }
    
    getHelp() {
        let location = this.locations[this.currentLocation];
        let helpText = "可用命令:\n";
        
        for (let cmd in location.commands) {
            helpText += `  ${cmd} - ${location.commands[cmd]}\n`;
        }
        
        return helpText;
    }
    
    getStatus() {
        return `系统状态: 正常运行
当前位置: ${this.currentLocation}
cpu使用率: 38%
RAM空间: 12.4MB/20MB
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

    // 读取驱动器内容
    readDrive(drive) {
        // 规范化驱动器标识
        drive = drive.trim().toUpperCase();
        
        // 验证驱动器标识
        if (drive !== "A" && drive !== "B") {
            return `错误: 无效的驱动器 "${drive}"\n有效的驱动器为: A, B`;
        }
        
        // 触发磁盘活动指示灯
        EventBus.emit('diskActivity');
        
        // 对于 A 驱动器，显示系统盘信息
        if (drive === "A") {
            return `驱动器 A: 系统盘\n\n` +
                `卷标: SYSTEM\n` +
                `序列号: 1984-03-21\n` +
                `目录: /\n\n` +
                `COMMAND.SYS    12,288 Byte\n` +
                `SYSTEM.INI      4,096 Byte\n` +
                `CONFIG.SYS      2,048 Byte\n` +
                `KERNEL.SYS     65,536 Byte\n\n` +
                `4 个文件      83,968 Byte\n` +
                `剩余空间:   7,864 Byte`;
        }
        
        // 对于 B 驱动器，检查是否有软盘并触发读取
        if (drive === "B") {
            // 通过发布事件来请求读取 B 驱动器
            EventBus.emit('requestReadDriveB');
            return "正在读取驱动器 B...";
        }
    }

    runProgram(programName) {
        // 验证程序名称
        programName = programName.toLowerCase().trim();
        
        if (!programName) {
            return this.getCommandUsage("run");
        }
        
        // 检查是否为已知程序
        if (programName === "map") {
            // 触发硬盘活动指示灯
            EventBus.emit('diskActivity');
            
            // 发布运行地图程序事件
            setTimeout(() => {
                EventBus.emit('runProgram', { program: 'map' });
            }, 800); // 短暂延迟，模拟程序加载
            
            return `正在加载程序: 地理信息系统...\n\n执行中...`;
        }
        
        // 其他程序可以在这里添加处理逻辑
        
        return `错误: 未找到程序 "${programName}"\n\n可用程序:\n- map: 地理信息系统`;
    }

    // 返回命令的使用说明
    getCommandUsage(command) {
        switch(command.toLowerCase()) {
            case "search":
                return `命令: search [关键词]\n`+
                    `功能: 搜索数据库中的信息\n`+
                    `示例: search 兰德\n\n`+
                    `使用方法: 输入"search"后跟随一个空格和您想搜索的关键词。\n`+
                    `系统将返回与关键词相关的所有匹配项。`;
                    
            case "connect":
                return `命令: connect [目标ID]\n`+
                    `功能: 连接到NPC或远程终端\n`+
                    `示例: connect lab1\n\n`+
                    `使用方法: 输入"connect"后跟随一个空格和您想连接的目标ID。\n`+
                    `系统将尝试建立安全连接并启动通信会话。`;
                    
            case "dir":
                return `命令: dir [驱动器]\n`+
                    `功能: 显示指定驱动器的内容\n`+
                    `示例: dir A 或 dir B\n\n`+
                    `使用方法: 输入"dir"后跟随一个空格和驱动器字母(A或B)。\n`+
                    `系统将列出该驱动器中的所有文件和目录。\n`+
                    `- A 驱动器: 系统盘，始终可用\n`+
                    `- B 驱动器: 数据盘，需插入软盘`;

            case "run":
                return `命令: run [程序]\n`+
                    `功能: 运行指定的程序\n`+
                    `示例: run map\n\n`+
                    `使用方法: 输入"run"后跟随一个空格和您想运行的程序名称。\n`+
                    `可用程序:\n`+
                    `- map: 地理信息系统`;
                    
            default:
                return `未知命令: "${command}"\n输入 "help" 获取可用命令列表。`;
        }
    }
    
}