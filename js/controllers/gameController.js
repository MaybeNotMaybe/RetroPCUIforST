// js/controllers/gameController.js
// Controller - 处理用户输入和游戏逻辑流
class GameController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        
        // 绑定事件
        document.getElementById('powerButton').addEventListener('click', () => this.togglePower());
        document.getElementById('commandInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.processInput();
        });
        
        // 订阅事件总线
        EventBus.on('diskActivity', () => this.view.flashDiskLight());
        EventBus.on('networkActivity', () => this.view.flashNetworkLight());
        
        // 初始状态
        this.view.input.disabled = true;
        document.querySelector('.prompt').classList.add('hidden'); // 初始状态隐藏命令行

        // 添加颜色切换功能
        this.setupColorToggle();
        
        // 添加调试日志
        console.log("游戏控制器已初始化");
    }
    
    togglePower() {
        if (!this.model.isOn) {
            this.model.isOn = true;

            // 添加电源开启类，用于控制颜色滑块状态
            document.body.classList.add('power-on');
            
            // 改变电源按钮样式
            document.getElementById('powerButton').classList.add('on');

            // 根据滑块位置应用正确的颜色模式
            const colorToggle = document.getElementById('colorToggle');
            const screen = document.querySelector('.screen');
            
            // 开始硬盘闪烁
            document.getElementById('diskLight').classList.add('disk-flashing');
            
            // 移除屏幕关闭效果
            document.querySelector('.screen').classList.remove('screen-off');
            
            this.view.powerOn();
            
            // 显示启动序列
            this.view.displayBootSequence(this.model.bootSequence, () => {
                // 启动序列完成后，显示系统准备就绪的提示
                setTimeout(() => {
                    // 停止硬盘闪烁并设置为绿色常亮
                    document.getElementById('diskLight').classList.remove('disk-flashing');
                    document.getElementById('diskLight').classList.add('active-green');
                    
                    this.view.displayOutput(this.model.locations[this.model.currentLocation].description);
                    
                    // 显示命令行
                    document.querySelector('.prompt').classList.remove('hidden');
                    
                    // 启用输入
                    this.view.input.disabled = false;
                    this.view.input.focus();
                }, 500); // 短暂延迟后显示提示
            });
            
            console.log("系统已开启");
        } else {
            // 移除电源开启类
            document.body.classList.remove('power-on');

            this.view.displayOutput(this.model.powerOff());
            
            // 改变电源按钮样式
            document.getElementById('powerButton').classList.remove('on');
            
            // 关闭硬盘指示灯
            document.getElementById('diskLight').classList.remove('disk-flashing');
            document.getElementById('diskLight').classList.remove('active-green');
            
            // 隐藏命令行
            document.querySelector('.prompt').classList.add('hidden');
            
            this.model.isOn = false;
            this.view.input.disabled = true;
            
            // 屏幕变暗效果
            setTimeout(() => {
                document.querySelector('.screen').classList.add('screen-off');
                this.view.powerOff();
            }, 1000);
            
            console.log("系统已关闭");
        }
    }
    
    processInput() {
        const command = this.view.input.value;
        this.view.input.value = '';
        
        if (command.trim() !== '') {
            console.log("处理命令:", command);
            this.view.displayOutput(`> ${command}`);
            try {
                const response = this.model.processCommand(command);
                console.log("命令响应:", response);
                this.view.displayOutput(response);
                
                // 再次确保滚动到底部（在命令处理完成后）
                setTimeout(() => {
                    this.view.output.scrollTop = this.view.output.scrollHeight;
                }, 10);
            } catch (error) {
                console.error("命令处理错误:", error);
                this.view.displayOutput("错误: 命令处理失败。系统故障。");
            }
        }
    }

    // 颜色切换功能
    setupColorToggle() {
        const colorToggle = document.getElementById('colorToggle');
        const screen = document.querySelector('.screen');
        
        // 默认设置为绿色模式
        screen.classList.add('green-mode');
        
        colorToggle.addEventListener('click', () => {
            // 切换开关样式
            colorToggle.classList.toggle('amber');
            
            // 如果系统开启，则应用颜色样式
            if (this.model.isOn) {
                if (colorToggle.classList.contains('amber')) {
                    screen.classList.remove('green-mode');
                    screen.classList.add('amber-mode');
                } else {
                    screen.classList.remove('amber-mode');
                    screen.classList.add('green-mode');
                }
                // 保持焦点在输入框
                this.view.input.focus();
            }
            
            // 保存当前模式状态供系统开机时使用
            this.colorMode = colorToggle.classList.contains('amber') ? 'amber' : 'green';
        });
    }
}