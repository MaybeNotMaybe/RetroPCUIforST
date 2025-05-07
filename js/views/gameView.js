// js/views/gameView.js
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
    }
    
    powerOn() {
        // 屏幕开启效果
        this.screen.classList.add('screen-on');
        this.clear();
        this.input.disabled = true;
    }
    
    displayBootSequence(bootSequence, callback) {
        let delay = 800; // 初始延迟
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
                setTimeout(displayNext, 550); // 行间显示延迟
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
        }, 1000);
    }
    
    flashNetworkLight() {
        this.networkLight.classList.add('active');
        setTimeout(() => {
            this.networkLight.classList.remove('active');
        }, 1000);
    }
}