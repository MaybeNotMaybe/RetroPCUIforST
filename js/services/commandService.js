// js/services/commandService.js
/**
 * 命令服务
 * 集中管理和处理游戏中的所有命令
 */
class CommandService {
    constructor(serviceLocator) {
        // 服务依赖
        this.serviceLocator = serviceLocator || window.ServiceLocator;
        this.eventBus = this.serviceLocator.get('eventBus');
        this.system = this.serviceLocator.get('system');
        
        // 命令处理器映射
        this.commandHandlers = new Map();
        
        // 命令别名映射 - 允许多个命令名称指向同一处理器
        this.commandAliases = new Map();
        
        // 命令分类
        this.commandCategories = new Map();
        
        // 命令帮助信息
        this.commandHelp = new Map();
        
        // 注册事件
        this.subscribeToEvents();
        
        console.log("命令服务已初始化");
    }
    
    /**
     * 订阅系统事件
     */
    subscribeToEvents() {
        if (this.eventBus) {
            // 命令执行事件
            this.eventBus.on('commandExecute', (data) => {
                this.executeCommand(data.command, data.context);
            });
            
            // 系统初始化完成事件
            this.eventBus.on('gameCoreInitialized', () => {
                // 系统初始化完成后，可以开始注册命令
                this.initializeBuiltinCommands();
            });
        }
    }
    
    /**
     * 初始化内置命令
     */
    initializeBuiltinCommands() {
        // 系统命令
        this.registerCommand('help', this.handleHelpCommand.bind(this), {
            category: 'system',
            description: '显示帮助信息',
            usage: 'help [命令名]',
            examples: ['help', 'help status']
        });
        
        this.registerCommand('clear', this.handleClearCommand.bind(this), {
            category: 'system',
            description: '清除屏幕',
            usage: 'clear',
            examples: ['clear']
        });
        
        this.registerCommand('status', this.handleStatusCommand.bind(this), {
            category: 'system',
            description: '检查系统状态',
            usage: 'status',
            examples: ['status']
        });
        
        // 搜索和连接命令
        this.registerCommand('search', this.handleSearchCommand.bind(this), {
            category: 'database',
            description: '搜索数据库',
            usage: 'search [关键词]',
            examples: ['search 兰德'],
            aliases: ['find']
        });
        
        this.registerCommand('connect', this.handleConnectCommand.bind(this), {
            category: 'network',
            description: '连接到NPC终端',
            usage: 'connect [目标ID]',
            examples: ['connect lab1']
        });
        
        // 文件系统命令
        this.registerCommand('dir', this.handleDirCommand.bind(this), {
            category: 'filesystem',
            description: '显示驱动器内容',
            usage: 'dir [驱动器]',
            examples: ['dir A', 'dir B']
        });
        
        // 程序执行命令
        this.registerCommand('run', this.handleRunCommand.bind(this), {
            category: 'system',
            description: '运行指定的程序',
            usage: 'run [程序]',
            examples: ['run map']
        });
        
        // 音频设置命令
        this.registerCommand('sound', this.handleSoundCommand.bind(this), {
            category: 'settings',
            description: '管理系统音效设置',
            usage: 'sound [参数]',
            examples: ['sound on', 'sound off', 'sound volume 50']
        });
        
        // 测试模式命令
        this.registerCommand('test mode', this.handleTestModeCommand.bind(this), {
            category: 'debug',
            description: '切换测试模式',
            usage: 'test mode',
            examples: ['test mode']
        });
        
        // 发布命令系统就绪事件
        if (this.eventBus) {
            this.eventBus.emit('commandSystemReady', { service: this });
        }
    }

    // 各个命令的处理方法

    // 下面添加各个命令的处理方法
    handleStatusCommand(args, context) {
        const gameModel = this.serviceLocator.get('gameController').model;
        
        return {
            success: true,
            message: gameModel.getStatus()
        };
    }

    handleSearchCommand(args, context) {
        const gameModel = this.serviceLocator.get('gameController').model;
        
        if (!args.trim()) {
            return {
                success: false,
                message: gameModel.getCommandUsage("search")
            };
        }
        
        // 触发磁盘活动指示灯
        if (this.eventBus) {
            this.eventBus.emit('diskActivity');
        }
        
        return {
            success: true,
            message: gameModel.search(args)
        };
    }

    handleConnectCommand(args, context) {
        const gameModel = this.serviceLocator.get('gameController').model;
        
        if (!args.trim()) {
            return {
                success: false,
                message: gameModel.getCommandUsage("connect")
            };
        }
        
        // 触发网络活动指示灯
        if (this.eventBus) {
            this.eventBus.emit('networkActivity');
        }
        
        return {
            success: true,
            message: gameModel.connect(args)
        };
    }

    handleDirCommand(args, context) {
        const gameModel = this.serviceLocator.get('gameController').model;
        
        if (!args.trim()) {
            return {
                success: false,
                message: gameModel.getCommandUsage("dir")
            };
        }
        
        return {
            success: true,
            message: gameModel.readDrive(args)
        };
    }

    handleRunCommand(args, context) {
        const gameModel = this.serviceLocator.get('gameController').model;
        
        if (!args.trim()) {
            return {
                success: false,
                message: gameModel.getCommandUsage("run")
            };
        }
        
        return {
            success: true,
            message: gameModel.runProgram(args)
        };
    }

    handleSoundCommand(args, context) {
        const gameModel = this.serviceLocator.get('gameController').model;
        
        if (!args.trim()) {
            return {
                success: false,
                message: gameModel.getCommandUsage("sound")
            };
        }
        
        return {
            success: true,
            message: gameModel.handleSoundCommand(args)
        };
    }

    handleTestModeCommand(args, context) {
        const gameModel = this.serviceLocator.get('gameController').model;
        
        // 切换测试模式
        gameModel.isTestMode = !gameModel.isTestMode;
        
        // 通知其他组件测试模式状态变化
        if (this.eventBus) {
            this.eventBus.emit('testModeChanged', gameModel.isTestMode);
        }
        
        return {
            success: true,
            message: `测试模式已${gameModel.isTestMode ? '启用' : '禁用'}。\n` +
                `- 界面切换闪屏效果: ${gameModel.isTestMode ? '关闭' : '开启'}\n` +
                `- 用于开发和测试用途`
        };
    }

    
    /**
     * 注册命令处理器
     * @param {string} commandName - 命令名称
     * @param {Function} handler - 命令处理函数，接收(command, context)参数
     * @param {Object} options - 命令选项
     * @param {string} options.category - 命令分类
     * @param {string} options.description - 命令描述
     * @param {string} options.usage - 命令用法
     * @param {string[]} options.examples - 命令示例
     * @param {string[]} options.aliases - 命令别名
     * @returns {boolean} 是否注册成功
     */
    registerCommand(commandName, handler, options = {}) {
        if (!commandName || typeof handler !== 'function') {
            console.error("命令注册失败: 无效的命令名或处理器", commandName);
            return false;
        }
        
        // 注册主命令
        this.commandHandlers.set(commandName.toLowerCase(), handler);
        
        // 注册命令分类
        if (options.category) {
            const category = options.category.toLowerCase();
            if (!this.commandCategories.has(category)) {
                this.commandCategories.set(category, []);
            }
            this.commandCategories.get(category).push(commandName.toLowerCase());
        }
        
        // 注册命令帮助信息
        this.commandHelp.set(commandName.toLowerCase(), {
            description: options.description || '无描述',
            usage: options.usage || commandName,
            examples: options.examples || [],
            category: options.category || 'general'
        });
        
        // 注册别名
        if (options.aliases && Array.isArray(options.aliases)) {
            options.aliases.forEach(alias => {
                this.commandAliases.set(alias.toLowerCase(), commandName.toLowerCase());
            });
        }
        
        console.log(`命令 "${commandName}" 已注册到分类 "${options.category || 'general'}"`);
        return true;
    }
    
    /**
     * 取消注册命令
     * @param {string} commandName - 命令名称
     * @returns {boolean} 是否成功取消注册
     */
    unregisterCommand(commandName) {
        const normalizedName = commandName.toLowerCase();
        
        // 检查命令是否存在
        if (!this.commandHandlers.has(normalizedName)) {
            return false;
        }
        
        // 找到并删除别名
        for (const [alias, target] of this.commandAliases.entries()) {
            if (target === normalizedName) {
                this.commandAliases.delete(alias);
            }
        }
        
        // 从分类中移除
        const help = this.commandHelp.get(normalizedName);
        if (help && help.category) {
            const category = this.commandCategories.get(help.category);
            if (category) {
                const index = category.indexOf(normalizedName);
                if (index !== -1) {
                    category.splice(index, 1);
                }
            }
        }
        
        // 删除帮助信息
        this.commandHelp.delete(normalizedName);
        
        // 删除处理器
        this.commandHandlers.delete(normalizedName);
        
        console.log(`命令 "${commandName}" 已取消注册`);
        return true;
    }
    
    /**
     * 检查并获取命令的真实名称（考虑别名）
     * @param {string} input - 输入的命令名
     * @returns {string|null} 真实的命令名或null
     */
    resolveCommandName(input) {
        const parts = input.trim().split(' ');
        if (parts.length === 0) return null;
        
        const commandName = parts[0].toLowerCase();
        
        // 检查是否为主命令
        if (this.commandHandlers.has(commandName)) {
            return commandName;
        }
        
        // 检查是否为别名
        if (this.commandAliases.has(commandName)) {
            return this.commandAliases.get(commandName);
        }
        
        return null;
    }
    
    /**
     * 执行命令
     * @param {string} commandInput - 完整的命令输入
     * @param {Object} context - 命令执行上下文
     * @returns {Object} 执行结果
     */
    executeCommand(commandInput, context = {}) {
        const input = commandInput.trim();
        if (!input) {
            return { success: false, message: "没有输入命令" };
        }
        
        // 分析命令和参数
        const parts = input.split(' ');
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');
        
        // 解析真实命令名（处理别名）
        const resolvedName = this.resolveCommandName(commandName);
        
        if (!resolvedName) {
            return { 
                success: false, 
                message: `未知命令: "${commandName}"。输入 "help" 获取可用命令列表。`
            };
        }
        
        // 获取命令处理器
        const handler = this.commandHandlers.get(resolvedName);
        
        if (!handler) {
            return { 
                success: false, 
                message: `命令 "${commandName}" 的处理器不可用`
            };
        }
        
        // 检查系统状态
        if (this.system && !this.system.isOperational() && resolvedName !== 'help') {
            return { 
                success: false, 
                message: "系统当前不可操作。请确保系统已开机。"
            };
        }
        
        // 执行命令
        try {
            const result = handler(args, {
                ...context,
                fullCommand: input,
                commandName: resolvedName,
                service: this
            });
            
            // 发布命令执行完成事件
            if (this.eventBus) {
                this.eventBus.emit('commandExecuted', {
                    command: input,
                    success: true,
                    result: result
                });
            }
            
            return result;
        } catch (error) {
            console.error(`执行命令 "${commandName}" 失败:`, error);
            
            // 发布命令执行失败事件
            if (this.eventBus) {
                this.eventBus.emit('commandExecuted', {
                    command: input,
                    success: false,
                    error: error
                });
            }
            
            return { 
                success: false, 
                message: `命令执行失败: ${error.message}`
            };
        }
    }
    
    /**
     * 处理help命令
     * @param {string} args - 命令参数
     * @param {Object} context - 命令执行上下文
     * @returns {Object} 命令执行结果
     */
    handleHelpCommand(args, context) {
        const targetCommand = args.trim().toLowerCase();
        
        if (targetCommand) {
            // 显示特定命令的帮助
            return this.getCommandHelp(targetCommand);
        } else {
            // 显示所有命令列表
            return this.getAllCommandsHelp();
        }
    }
    
    /**
     * 获取特定命令的帮助信息
     * @param {string} commandName - 命令名称
     * @returns {Object} 帮助信息结果
     */
    getCommandHelp(commandName) {
        // 解析真实命令名（处理别名）
        const resolvedName = this.resolveCommandName(commandName);
        
        if (!resolvedName) {
            return { 
                success: false, 
                message: `未知命令: "${commandName}"`
            };
        }
        
        const help = this.commandHelp.get(resolvedName);
        if (!help) {
            return { 
                success: false, 
                message: `没有 "${commandName}" 的帮助信息`
            };
        }
        
        // 查找所有指向该命令的别名
        const aliases = [];
        for (const [alias, target] of this.commandAliases.entries()) {
            if (target === resolvedName) {
                aliases.push(alias);
            }
        }
        
        // 构建帮助信息
        let message = `命令: ${resolvedName}\n`;
        message += `分类: ${help.category}\n`;
        message += `描述: ${help.description}\n`;
        message += `用法: ${help.usage}\n`;
        
        if (aliases.length > 0) {
            message += `别名: ${aliases.join(', ')}\n`;
        }
        
        if (help.examples && help.examples.length > 0) {
            message += `\n示例:`;
            help.examples.forEach(example => {
                message += `\n> ${example}`;
            });
        }
        
        return { 
            success: true, 
            message: message
        };
    }
    
    /**
     * 获取所有命令的帮助列表
     * @returns {Object} 命令列表结果
     */
    getAllCommandsHelp() {
        let message = "可用命令列表:\n\n";
        
        // 按分类组织命令
        const categories = new Map([...this.commandCategories].sort());
        
        for (const [category, commands] of categories) {
            if (commands.length === 0) continue;
            
            message += `[${category}]\n`;
            
            // 按字母顺序排序命令
            commands.sort().forEach(cmd => {
                const help = this.commandHelp.get(cmd);
                if (help) {
                    message += `  ${cmd.padEnd(10)} - ${help.description}\n`;
                }
            });
            
            message += '\n';
        }
        
        message += "输入 'help [命令名]' 获取特定命令的详细信息\n";
        
        return { 
            success: true, 
            message: message
        };
    }
    
    /**
     * 处理clear命令
     * @returns {Object} 命令执行结果
     */
    handleClearCommand() {
        return { 
            success: true, 
            message: "CLEAR_SCREEN"
        };
    }
    
    /**
     * 获取指定分类下的所有命令
     * @param {string} category - 分类名称
     * @returns {string[]} 命令列表
     */
    getCommandsByCategory(category) {
        const normalizedCategory = category.toLowerCase();
        return this.commandCategories.get(normalizedCategory) || [];
    }
    
    /**
     * 获取所有命令分类
     * @returns {string[]} 分类列表
     */
    getAllCategories() {
        return [...this.commandCategories.keys()];
    }
}