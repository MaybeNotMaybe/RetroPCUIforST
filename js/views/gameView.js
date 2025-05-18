// js/views/gameView.js
class GameView {
    constructor() {
        // DOM元素
        this.domUtils = window.DOMUtils || {
            get: id => document.querySelector(id),
            addClass: (el, cls) => el && el.classList.add(cls),
            removeClass: (el, cls) => el && el.classList.remove(cls)
        };
        
        this.terminal = this.domUtils.get('#terminal');
        this.output = this.domUtils.get('#output');
        this.input = this.domUtils.get('#commandInput');
        this.cursor = this.domUtils.get('#cursor');
        this.screen = this.domUtils.get('.screen');
        this.diskLight = this.domUtils.get('#diskLight');
        this.networkLight = this.domUtils.get('#networkLight');
        this.prompt = this.domUtils.get('.prompt');
        
        // 添加屏幕关闭效果的类
        this.domUtils.addClass(this.screen, 'screen-off');

        // 设置打字速度（毫秒/字符）
        this.bootTypingSpeed = 1;     // 开机序列打字速度
        this.commandTypingSpeed = 10; // 命令行打字速度

        // 音频服务
        this.audio = window.ServiceLocator && window.ServiceLocator.get('audio') || window.audioManager;

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
        
        const typeChar = () => {
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
        };
        
        typeChar();
    }
    
    powerOn() {
        // 屏幕开启效果
        this.domUtils.addClass(this.screen, 'screen-on');
        this.clear();
        this.input.disabled = true;
        
        // 根据当前设置应用正确的颜色模式
        const colorToggle = this.domUtils.get('#colorToggle');
        if (colorToggle.classList.contains('amber')) {
            this.domUtils.removeClass(this.screen, 'green-mode');
            this.domUtils.addClass(this.screen, 'amber-mode');
        } else {
            this.domUtils.removeClass(this.screen, 'amber-mode');
            this.domUtils.addClass(this.screen, 'green-mode');
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
                        }, this.bootTypingSpeed);
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
                                }, this.bootTypingSpeed);
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
                        }, this.bootTypingSpeed);
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
        this.domUtils.removeClass(this.screen, 'screen-on');
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
        }, this.commandTypingSpeed);
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
        this.domUtils.addClass(this.diskLight, 'active');
        setTimeout(() => {
            this.domUtils.removeClass(this.diskLight, 'active');
            
            // 如果系统开机中，则恢复绿色常亮状态
            if (this.domUtils.get('#powerButton').classList.contains('on')) {
                this.domUtils.addClass(this.diskLight, 'active-green');
            }
        }, 1000);
    }
    
    flashNetworkLight() {
        this.domUtils.addClass(this.networkLight, 'active');
        setTimeout(() => {
            this.domUtils.removeClass(this.networkLight, 'active');
        }, 1000);
    }

    // 设置光标跟踪
    setupCursor() {
        const input = this.input;
        const cursor = this.cursor;
        const promptSymbol = this.domUtils.get('.prompt-symbol');
        
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
        
        // 添加焦点事件监听器
        this.domUtils.on(input, 'focus', () => {
            // 输入框获得焦点时，显示光标并添加闪烁动画
            cursor.style.display = 'block';
            this.domUtils.addClass(cursor, 'blink');
            updateCursorPosition();
        });
        
        this.domUtils.on(input, 'blur', () => {
            // 输入框失去焦点时，隐藏光标
            cursor.style.display = 'none';
        });
        
        // 监听各种事件以更新光标位置
        this.domUtils.on(input, 'input', updateCursorPosition);
        this.domUtils.on(input, 'click', updateCursorPosition);
        this.domUtils.on(input, 'keyup', updateCursorPosition);
        this.domUtils.on(input, 'keydown', updateCursorPosition);
        
        // 初始状态下，根据输入框是否有焦点设置光标可见性
        cursor.style.display = document.activeElement === input ? 'block' : 'none';
        
        // 初始更新
        setTimeout(updateCursorPosition, 100);
    }

    // 添加键盘音效
    setupKeyboardSounds() {
        if (!this.audio) return;
        
        this.domUtils.on(this.input, 'keydown', (e) => {
            // 避免特殊键产生声音
            if (!e.ctrlKey && !e.altKey && !e.metaKey && 
                e.key !== 'Shift' && e.key !== 'Control' && 
                e.key !== 'Alt' && e.key !== 'Meta') {
                
                // 播放按键音效
                this.audio.play('keypress');
            }
        });
    }
}