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
    }
    
    powerOn() {
        // 屏幕开启效果
        this.screen.classList.add('screen-on');
        this.clear();
        this.input.disabled = true;
    }
    
    displayBootSequence(bootSequence, callback) {
        let delay = 600; // 减少初始延迟 (原来800ms，减少25%)
        let index = 0;
        
        // 确保滚动到顶部
        this.output.scrollTop = 0;
        
        const displayNext = () => {
            if (index < bootSequence.length) {
                const item = bootSequence[index];
                
                // 根据不同类型的内容创建不同的HTML
                let html = '';
                
                switch(item.type) {
                    case 'svg-logo':
                        html = `<div class="ibm-logo">${item.content}</div>`;
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
                
                this.output.innerHTML += html;
                // 不要滚动，让内容保持在顶部
                
                index++;
                setTimeout(displayNext, 400); // 减少行间显示延迟 (原来550ms，减少~25%)
            } else {
                // 启动序列完成后增加一个空行
                this.output.innerHTML += '<div class="boot-container">&nbsp;</div>';
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
    }
    
    displayOutput(text) {
        if (text === "CLEAR_SCREEN") {
            this.clear();
            return;
        }
        
        this.output.innerHTML += text + "\n";
        this.output.scrollTop = this.output.scrollHeight; // 只滚动输出区域
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
}