// js/identitySystem.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('身份系统初始化中...');
    
    // 创建模型和视图
    const identityModel = new IdentityModel();
    const identityView = new IdentityView();
    
    // 创建控制器
    window.identityController = new IdentityController(identityModel, identityView);
    
    // 初始化控制器
    window.identityController.initialize();
    
    // 设置功能按钮
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
            window.identityController.hide();
        }
    });
    
    console.log('身份系统初始化完成');
});

// 设置身份系统功能按钮
function setupFunctionButtonsForIdentity() {
    // F2按钮用于身份系统
    const f2Button = document.getElementById('fnButton2');
    
    if (f2Button) {
        // 更新按钮标签
        f2Button.textContent = '档案';
        
        // 添加点击事件
        f2Button.addEventListener('click', () => {
            // 检查系统是否可操作
            if (window.isSystemOperational() && window.identityController) {
                // 仅切换显示/隐藏，不触发身份类型切换
                window.identityController.showHideIdentityView();
                
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
        f1Button.addEventListener('click', () => {
            // 如果身份界面可见，隐藏它
            if (window.isSystemOperational() && 
                window.identityController && 
                window.identityController.isVisible) {
                
                window.identityController.hide();
            }
        });
    }
    
    console.log('身份系统功能按钮已配置');
}