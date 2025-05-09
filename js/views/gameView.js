// js/views/gameView.js
// View - 处理界面显示
class GameView {
    constructor() {
        this.terminal = document.getElementById('terminal');
        this.output = document.getElementById('output');
        this.input = document.getElementById('commandInput');
        this.cursor = document.getElementById('cursor');
        this.screen = document.querySelector('.screen');
        this.diskLight = document.getElementById('diskLight');
        this.networkLight = document.getElementById('networkLight');
        this.prompt = document.querySelector('.prompt');
        
        // 添加屏幕关闭效果的类
        this.screen.classList.add('screen-off');

        // 设置打字速度（毫秒/字符）
        this.bootTypingSpeed = 1;     // 开机序列打字速度
        this.commandTypingSpeed = 10; // 命令行打字速度

        // 添加键盘音效
        this.setupKeyboardSounds();

        // 设置自定义光标
        this.setupCursor();
    }

    // 逐字显示效果函数
    typeWriterEffect(text, element, callback, speed) {
        if (!text || text.length === 0) {
            if (callback) callback();
            return;
        }
        
        // 如果是HTML内容，直接添加不做处理
        if (text.includes('<') && text.includes('>')) {
            element.innerHTML += text;
            if (callback) callback();
            return;
        }
        
        let i = 0;
        const chars = text.split('');
        
        // 创建一个新的元素来存放打字内容
        const lineElement = document.createElement('div');
        lineElement.className = 'typed-line';
        element.appendChild(lineElement);
        
        function typeChar() {
            if (i < chars.length) {
                lineElement.textContent += chars[i];
                i++;
                
                // 滚动到底部
                element.scrollTop = element.scrollHeight;
                
                setTimeout(typeChar, speed);
            } else {
                // 完成后调用回调
                if (callback) callback();
            }
        }
        
        typeChar();
    }
    
    powerOn() {
        // 屏幕开启效果
        this.screen.classList.add('screen-on');
        this.clear();
        this.input.disabled = true;
        
        // 根据当前设置应用正确的颜色模式
        const colorToggle = document.getElementById('colorToggle');
        if (colorToggle.classList.contains('amber')) {
            this.screen.classList.remove('green-mode');
            this.screen.classList.add('amber-mode');
        } else {
            this.screen.classList.remove('amber-mode');
            this.screen.classList.add('green-mode');
        }
    }
    
    displayBootSequence(bootSequence, callback, skipDisplay = false) {
        let index = 0;
        
        // 确保滚动到顶部
        this.output.scrollTop = 0;
        
        if (!skipDisplay) {
            // 清空输出区域，准备显示启动序列
            this.clear();
        }
        
        const displayNext = () => {
            // 检查系统状态，如果已经进入关机状态，中断启动序列
            const systemModel = window.gameController && window.gameController.model;
            if (systemModel && systemModel.getSystemState() === systemModel.SystemState.POWERING_OFF) {
                console.log("启动序列中断: 系统正在关闭");
                return;
            }
            
            if (index < bootSequence.length) {
                // 原有的启动序列显示代码...
                const item = bootSequence[index];
                
                switch(item.type) {
                    case 'svg-logo':
                        // Logo 直接添加
                        const logoHtml = `<div class="imb-logo"><img src="${item.content}" alt="IMB Logo"></div>`;
                        this.output.innerHTML += logoHtml;
                        this.output.scrollTop = this.output.scrollHeight;
                        
                        setTimeout(() => {
                            index++;
                            displayNext();
                        }, 500);
                        break;
                    
                    case 'text-center':
                        // 创建中心文本容器
                        const centerContainer = document.createElement('div');
                        centerContainer.className = 'boot-container';
                        const centerTextDiv = document.createElement('div');
                        centerTextDiv.className = 'text-center';
                        centerContainer.appendChild(centerTextDiv);
                        this.output.appendChild(centerContainer);
                        
                        // 使用开机序列打字速度
                        this.typeWriterEffect(item.content, centerTextDiv, () => {
                            index++;
                            setTimeout(displayNext, 300);
                        }, this.bootTypingSpeed); // 使用开机序列速度
                        break;
                    
                    case 'box':
                        // 创建框容器
                        const boxContainer = document.createElement('div');
                        boxContainer.className = 'boot-container';
                        const boxDiv = document.createElement('div');
                        boxDiv.className = 'bordered-box';
                        boxContainer.appendChild(boxDiv);
                        this.output.appendChild(boxContainer);
                        
                        // 逐行处理框内容
                        let lineIndex = 0;
                        
                        const processBoxLine = () => {
                            if (lineIndex < item.content.length) {
                                // 为每行创建一个span元素
                                const lineSpan = document.createElement('span');
                                boxDiv.appendChild(lineSpan);
                                
                                // 使用开机序列打字速度
                                this.typeWriterEffect(item.content[lineIndex], lineSpan, () => {
                                    lineIndex++;
                                    
                                    // 如果不是最后一行，添加换行
                                    if (lineIndex < item.content.length) {
                                        boxDiv.appendChild(document.createElement('br'));
                                        setTimeout(processBoxLine, 200);
                                    } else {
                                        // 所有行处理完毕
                                        index++;
                                        setTimeout(displayNext, 300);
                                    }
                                }, this.bootTypingSpeed); // 使用开机序列速度
                            }
                        };
                        
                        // 开始处理第一行
                        processBoxLine();
                        break;
                    
                    default:
                        // 创建默认容器
                        const defaultContainer = document.createElement('div');
                        defaultContainer.className = 'boot-container';
                        this.output.appendChild(defaultContainer);
                        
                        // 使用开机序列打字速度
                        this.typeWriterEffect(item.content, defaultContainer, () => {
                            index++;
                            setTimeout(displayNext, 300);
                        }, this.bootTypingSpeed); // 使用开机序列速度
                }
            } else {
                // 启动序列完成后增加一个空行
                if (!skipDisplay) {
                    this.output.innerHTML += '<div class="boot-container">&nbsp;</div>';
                    this.output.scrollTop = this.output.scrollHeight;
                }
                
                // 启动序列完成
                if (callback) callback();
            }
        };
        
        // 开始显示
        setTimeout(displayNext, 500);
    }
    
    powerOff() {
        this.screen.classList.remove('screen-on');
        this.clear();
    }
    
    displayOutput(text) {
        if (text === "CLEAR_SCREEN") {
            this.clear();
            return;
        }
        
        // 使用命令行打字速度
        this.typeWriterEffect(text, this.output, () => {
            // 完成后确保滚动到底部
            this.output.scrollTop = this.output.scrollHeight;
        }, this.commandTypingSpeed); // 使用命令行速度
    }

    // 恢复完整历史记录
    restoreHistory(history) {
        this.clear();
        
        if (!history || history.length === 0) return;
        
        // 逐行添加历史记录
        for (let line of history) {
            if (typeof line === 'string') {
                // 过滤掉加载指示器标记
                if (line.includes('<!-- loading_indicator -->')) {
                    line = line.replace('<!-- loading_indicator -->', '');
                }
                
                // 检查是否包含HTML标签（如启动序列）
                if (line.includes('<div') || line.includes('<img')) {
                    // 直接添加HTML内容
                    this.output.innerHTML += line;
                } else if (line.trim() !== '') {
                    // 普通文本行，创建新的行元素
                    const lineElement = document.createElement('div');
                    lineElement.className = 'typed-line';
                    lineElement.textContent = line;
                    this.output.appendChild(lineElement);
                }
            }
        }
        
        // 滚动到底部
        this.output.scrollTop = this.output.scrollHeight;
    }
    
    clear() {
        this.output.innerHTML = '';
        this.output.scrollTop = 0;
    }
    
    flashDiskLight() {
        this.diskLight.classList.add('active');
        setTimeout(() => {
            this.diskLight.classList.remove('active');
            
            // 如果系统开机中，则恢复绿色常亮状态
            if (document.getElementById('powerButton').classList.contains('on')) {
                this.diskLight.classList.add('active-green');
            }
        }, 1000);
    }
    
    flashNetworkLight() {
        this.networkLight.classList.add('active');
        setTimeout(() => {
            this.networkLight.classList.remove('active');
        }, 1000);
    }

    // 设置光标跟踪
    setupCursor() {
        const input = this.input;
        const cursor = this.cursor;
        const promptSymbol = document.querySelector('.prompt-symbol');
        
        // 计算并更新光标位置的函数
        const updateCursorPosition = () => {
            // 获取光标在输入文本中的位置
            const cursorPosition = input.selectionStart;
            
            // 创建一个临时span来测量文本宽度，确保空格被正确处理
            const tempSpan = document.createElement('span');
            tempSpan.style.font = window.getComputedStyle(input).font;
            tempSpan.style.position = 'absolute';
            tempSpan.style.visibility = 'hidden';
            tempSpan.style.whiteSpace = 'pre'; // 关键：确保空格被保留
            
            // 获取光标前的文本并替换空格为特殊HTML空格
            const textBeforeCursor = input.value.substring(0, cursorPosition);
            tempSpan.innerHTML = textBeforeCursor.replace(/ /g, '&nbsp;');
            
            document.body.appendChild(tempSpan);
            
            // 计算光标位置，考虑提示符的宽度
            const symbolWidth = promptSymbol.offsetWidth;
            const textWidth = tempSpan.offsetWidth;
            
            // 设置光标位置
            cursor.style.left = `${symbolWidth + textWidth}px`;
            cursor.style.top = '0px';
            
            // 移除临时span
            document.body.removeChild(tempSpan);
        };
        
        // 监听各种事件以更新光标位置
        input.addEventListener('input', updateCursorPosition);
        input.addEventListener('click', updateCursorPosition);
        input.addEventListener('keyup', updateCursorPosition);
        input.addEventListener('keydown', updateCursorPosition);
        input.addEventListener('focus', updateCursorPosition);
        
        // 初始更新
        setTimeout(updateCursorPosition, 100);
    }

    setupKeyboardSounds() {
    const input = this.input;
    
    // 添加键盘按键音效
    input.addEventListener('keydown', (e) => {
        // 避免特殊键产生声音
        if (!e.ctrlKey && !e.altKey && !e.metaKey && 
            e.key !== 'Shift' && e.key !== 'Control' && 
            e.key !== 'Alt' && e.key !== 'Meta') {
            
            // 对 Enter 键使用不同的音效
            if (e.key === 'Enter') {
                window.audioManager.play('keypress');
            } else {
                window.audioManager.play('keypress');
            }
        }
    });
}
}