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

        // 软盘驱动器UI元素
        this.floppySlotB = document.getElementById('floppySlotB');
        this.floppyDiskB = document.getElementById('floppyDiskB');
        this.ejectButtonB = document.getElementById('ejectButtonB');
        this.driveLightB = document.getElementById('driveLightB');
        this.fullFloppyB = document.getElementById('fullFloppyB');
        
        // 添加屏幕关闭效果的类
        this.screen.classList.add('screen-off');

        // 设置自定义光标
        this.setupCursor();
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
        let delay = 300;
        let index = 0;
        
        // 确保滚动到顶部
        this.output.scrollTop = 0;
        
        if (!skipDisplay) {
            // 清空输出区域，准备显示启动序列
            this.clear();
        }
        
        const displayNext = () => {
            if (index < bootSequence.length) {
                const item = bootSequence[index];
                
                // 根据不同类型的内容创建不同的HTML
                let html = '';
                
                switch(item.type) {
                    case 'svg-logo':
                        if (item.content && typeof item.content === 'string') {
                            html = `<div class="imb-logo"><img src="${item.content}" alt="imb Logo"></div>`;
                        } else {
                            html = `<div class="imb-logo">[IMB LOGO]</div>`;
                        }
                        break;
                    case 'text-center':
                        html = `<div class="boot-container"><div class="text-center">${item.content}</div></div>`;
                        break;
                    case 'box':
                        html = `<div class="boot-container"><div class="bordered-box">${item.content.join('<br>')}</div></div>`;
                        break;
                    default:
                        html = `<div class="boot-container">${item.content}</div>`;
                }
                
                if (!skipDisplay) {
                    this.output.innerHTML += html;
                    this.output.scrollTop = this.output.scrollHeight;
                }
                
                index++;
                
                if (skipDisplay) {
                    // 跳过显示过程，直接处理下一项
                    displayNext();
                } else {
                    setTimeout(displayNext, 200);
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
        setTimeout(displayNext, delay);
    }
    
    powerOff() {
        this.screen.classList.remove('screen-on');
        this.clear();
        
        // 关闭所有驱动器灯
        this.turnOffDriveLights();
    }
    
    displayOutput(text) {
        if (text === "CLEAR_SCREEN") {
            this.clear();
            return;
        }
        
        this.output.innerHTML += text + "\n";
        this.output.scrollTop = this.output.scrollHeight;
    }

    // 恢复完整历史记录
    restoreHistory(history) {
        this.clear();
        
        if (!history || history.length === 0) return;
        
        // 逐行添加历史记录
        for (let line of history) {
            if (typeof line === 'string') {
                // 检查是否包含HTML标签（如启动序列）
                if (line.includes('<div') || line.includes('<img')) {
                    // 直接添加HTML内容
                    this.output.innerHTML += line;
                } else {
                    // 普通文本行，添加换行符
                    this.output.innerHTML += line + "\n";
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

    startFloppyInsertAnimation(isSystemOn, callback) {
        // 首先执行完整软盘的插入动画
        this.fullFloppyB.classList.add('inserting-full');
        
        // 只有在系统开机时才闪烁指示灯
        if (isSystemOn) {
            this.driveLightB.classList.add('blinking');
        }
        
        // 在完整软盘即将完成动画时显示边缘软盘
        setTimeout(() => {
            this.floppyDiskB.style.display = 'block';
            this.floppyDiskB.classList.add('inserting');
            this.floppySlotB.classList.add('disk-inserted');
        }, 1000);
        
        // 插入完成后
        setTimeout(() => {
            // 只有在系统开机时才处理灯光
            if (isSystemOn) {
                // 移除闪烁，保持常亮
                this.driveLightB.classList.remove('blinking');
                this.driveLightB.classList.add('active');
            } else {
                // 关机状态下确保灯光关闭
                this.driveLightB.classList.remove('blinking');
                this.driveLightB.classList.remove('active');
            }
            
            // 启用弹出按钮
            this.ejectButtonB.classList.remove('disabled');
            
            // 隐藏完整软盘
            this.fullFloppyB.classList.add('hide-full-floppy');
            this.fullFloppyB.classList.remove('inserting-full');
            
            // 执行回调
            if (callback) callback();
        }, 1500);
    }
    
    startFloppyEjectAnimation(isSystemOn, callback) {
        this.floppyDiskB.classList.remove('inserting');
        this.floppyDiskB.classList.add('ejecting');
        this.floppySlotB.classList.remove('disk-inserted');
        
        // 显示完整软盘并开始弹出动画
        this.fullFloppyB.classList.remove('hide-full-floppy');
        this.fullFloppyB.classList.add('ejecting-full');
        
        // 只有在系统开机时才闪烁指示灯
        if (isSystemOn) {
            this.driveLightB.classList.remove('active');
            this.driveLightB.classList.add('blinking');
        }
        
        setTimeout(() => {
            // 关闭指示灯
            this.driveLightB.classList.remove('blinking');
            this.driveLightB.classList.remove('active');
            
            // 重置软盘边缘
            this.floppyDiskB.style.display = 'none';
            this.floppyDiskB.classList.remove('ejecting');
            
            // 禁用弹出按钮
            this.ejectButtonB.classList.add('disabled');
            
            // 重置完整软盘状态
            setTimeout(() => {
                this.fullFloppyB.classList.remove('ejecting-full');
            }, 100);
            
            // 执行回调
            if (callback) callback();
        }, 1500);
    }

    turnOffDriveLights() {
        // A驱动器灯光关闭
        const driveLightA = document.querySelector('.drive-a .drive-light');
        if (driveLightA) {
            driveLightA.classList.remove('active');
            driveLightA.classList.remove('blinking');
        }
        
        // B驱动器灯光关闭
        this.driveLightB.classList.remove('active');
        this.driveLightB.classList.remove('blinking');
    }
}