// js/identitySystem.js
document.addEventListener('DOMContentLoaded', async function() { // 声明为 async
    console.log('身份系统初始化中...');
    
    // 创建模型和视图
    const identityModel = new IdentityModel();
    const identityView = new IdentityView();
    
    // 创建控制器
    window.identityController = new IdentityController(identityModel, identityView);
    
    // 初始化控制器 (异步)
    // 控制器的 initialize 方法现在是异步的
    try {
        await window.identityController.initialize();
        console.log('IdentityController 初始化完成');
    } catch (error) {
        console.error('IdentityController 初始化失败:', error);
        // 可以在此处添加用户反馈，例如在UI上显示错误消息
    }
    
    // 设置功能按钮 (同步，但其回调可能是异步的)
    setupFunctionButtonsForIdentity();
    
    // 订阅颜色模式变更事件
    EventBus.on('colorModeChanged', (isAmber) => {
        if (window.identityController) {
            window.identityController.updateColorMode(isAmber);
        }
    });
    
    // 订阅系统电源变更事件
    EventBus.on('systemPowerChange', (isOn) => {
        // 如果系统关闭且身份界面可见，隐藏它
        if (!isOn && window.identityController && window.identityController.isVisible) {
            // hide 方法本身是同步的
            window.identityController.hide(); 
        }
    });
    
    console.log('身份系统脚本执行完毕，Controller 初始化已开始。');
});

// 设置身份系统功能按钮
function setupFunctionButtonsForIdentity() {
    // F2按钮用于身份系统
    const f2Button = document.getElementById('fnButton2');
    
    if (f2Button) {
        // 更新按钮标签
        f2Button.textContent = '档案'; // 档案
        
        // 添加点击事件
        f2Button.addEventListener('click', async () => { // 事件处理函数声明为 async
            // 检查系统是否可操作
            if (window.isSystemOperational() && window.identityController) {
                // showHideIdentityView 现在是异步的
                await window.identityController.showHideIdentityView(); 
                
                // 播放按钮音效
                if (window.audioManager) {
                    window.audioManager.play('functionButton');
                }
            } else {
                // 如果系统不可操作，仅播放按钮音效
                if (window.audioManager) {
                    window.audioManager.play('functionButton');
                }
            }
        });
    }
    
    // F1按钮应该也能从身份视图返回终端
    const f1Button = document.getElementById('fnButton1');
    
    if (f1Button) {
        f1Button.addEventListener('click', () => { // 这个可以是同步的，因为它只是隐藏
            // 如果身份界面可见，隐藏它
            if (window.isSystemOperational() && 
                window.identityController && 
                window.identityController.isVisible) {
                
                // window.identityController.hide(); // hide 是同步的
                // 切换回终端应该通过 interfaceManager
                if (window.interfaceManager) {
                    window.interfaceManager.switchTo('terminal');
                    window.identityController.isVisible = false; // 手动更新状态
                } else {
                    window.identityController.hide(); // 后备方案
                }
            }
        });
    }
    
    console.log('身份系统功能按钮已配置');
}
