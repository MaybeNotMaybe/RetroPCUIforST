// js/controllers/identityController.js
class IdentityController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        
        // 初始化视图
        this.view.initialize();
        
        // 追踪可见性状态
        this.isVisible = false;
    }
    
    // 初始化控制器
    initialize() {
        // 设置事件监听器
        this.setupEventListeners();
        
        // 填充表单选择框
        this.populateFormSelects();
        
        // 更新身份显示
        this.updateIdentityDisplays();
    }
    
    // 设置事件监听
    setupEventListeners() {
        // 基础/伪装页面切换按钮
        const basicInfoButton = document.getElementById('basicInfoButton');
        const disguiseButton = document.getElementById('disguiseButton');
        
        if (basicInfoButton) {
            basicInfoButton.addEventListener('click', () => {
                window.audioManager.play('functionButton');
                this.view.showBasicInfoPage();
            });
        }
        
        if (disguiseButton) {
            disguiseButton.addEventListener('click', () => {
                window.audioManager.play('functionButton');
                this.view.showDisguisePage();
            });
        }
        
        // 身份类型变更事件
        if (this.view.typeSelect) {
            this.view.typeSelect.addEventListener('change', () => {
                this.handleTypeChange();
            });
        }
        
        // 国籍变更事件
        if (this.view.nationalitySelect) {
            this.view.nationalitySelect.addEventListener('change', () => {
                this.handleNationalityChange();
            });
        }
        
        // 应用伪装按钮
        if (this.view.applyDisguiseButton) {
            this.view.applyDisguiseButton.addEventListener('click', () => {
                this.applyDisguise();
            });
        }
        
        // 清除伪装按钮
        if (this.view.clearDisguiseButton) {
            this.view.clearDisguiseButton.addEventListener('click', () => {
                this.clearDisguise();
            });
        }
    }
    
    // 填充表单选择框
    populateFormSelects() {
        // 填充国籍选择框
        this.view.populateNationalitySelect(this.model.NATIONALITIES);
        
        // 填充类型选择框
        this.view.populateTypeSelect(this.model.IDENTITY_TYPES);
        
        // 初始填充职能选择框
        const initialType = this.model.IDENTITY_TYPES[0];
        this.view.populateFunctionSelect(this.model.getFunctionsForType(initialType));
        
        // 初始填充机构选择框
        const initialNationality = this.model.NATIONALITIES[0];
        this.view.populateOrganizationSelect(
            this.model.getOrganizationsForIdentity(initialNationality, initialType)
        );
    }
    
    // 处理类型变更
    handleTypeChange() {
        const selectedType = this.view.typeSelect.value;
        
        // 根据选择的类型更新职能选项
        const functions = this.model.getFunctionsForType(selectedType);
        this.view.populateFunctionSelect(functions);
        
        // 根据选择的国籍和类型更新机构选项
        const selectedNationality = this.view.nationalitySelect.value;
        const organizations = this.model.getOrganizationsForIdentity(selectedNationality, selectedType);
        this.view.populateOrganizationSelect(organizations);
    }
    
    // 处理国籍变更
    handleNationalityChange() {
        const selectedNationality = this.view.nationalitySelect.value;
        const selectedType = this.view.typeSelect.value;
        
        // 更新机构选项
        const organizations = this.model.getOrganizationsForIdentity(selectedNationality, selectedType);
        this.view.populateOrganizationSelect(organizations);
    }
    
    // 应用伪装
    applyDisguise() {
        const nationality = this.view.nationalitySelect.value;
        const type = this.view.typeSelect.value;
        const func = this.view.functionSelect.value || null;
        const organization = this.view.organizationSelect.value || null;
        
        // 设置伪装身份
        this.model.setDisguiseIdentity(nationality, type, func, organization);
        
        // 更新伪装显示
        this.view.updateDisguiseIdentity(this.model.disguiseIdentity);
        
        // 播放音效
        if (window.audioManager) {
            window.audioManager.play('systemBeep');
        }
    }
    
    // 清除伪装
    clearDisguise() {
        this.model.clearDisguise();
        this.view.updateDisguiseIdentity(null);
        
        // 播放音效
        if (window.audioManager) {
            window.audioManager.play('systemBeep');
        }
    }
    
    // 更新所有身份显示
    updateIdentityDisplays() {
        this.view.updateRealIdentity(this.model.realIdentity);
        this.view.updateCoverIdentity(this.model.coverIdentity);
        this.view.updateDisguiseIdentity(this.model.disguiseIdentity);
    }
    
    // 切换身份视图可见性
    toggleIdentityView() {
        // 检查系统是否开机
        if (!window.isSystemOperational()) {
            console.log("系统未开机，无法切换到档案视图");
            return false;
        }
        
        // 使用界面管理器切换
        if (window.interfaceManager) {
            if (this.isVisible) {
                // 如果当前已经显示档案，则切回终端
                window.interfaceManager.switchTo('terminal');
            } else {
                // 否则切到档案
                window.interfaceManager.switchTo('identity');
            }
            return true;
        }
        
        // 以下是旧的逻辑，作为后备方案
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
        
        return this.isVisible;
    }
    
    // 显示身份界面
    show() {
        // 更新显示内容
        this.updateIdentityDisplays();
        
        // 更新状态
        this.isVisible = true;
    }
    
    // 隐藏身份界面
    hide() {
        // 更新状态
        this.isVisible = false;
    }
    
    // 检查身份是否被识破
    checkIdentityBlown(detectionRate) {
        const isBlown = this.model.checkDisguiseDetection(detectionRate);
        
        if (isBlown) {
            // 伪装被识破，恢复表面身份
            this.model.blowDisguise();
            this.view.updateDisguiseIdentity(null);
            return true;
        }
        
        return false;
    }
    
    // 设置颜色模式
    updateColorMode(isAmber) {
        this.view.updateColorMode(isAmber);
    }
}