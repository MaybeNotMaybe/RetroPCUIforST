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
        
        // 默认显示基本档案页面
        this.view.showBasicInfoPage();
        
        // 初始化档案视图 - 默认显示表面身份
        this.currentIdentityType = 'cover';
    
        // 直接设置档案显示为表面身份
        // 这里强制使用 coverIdentity 而不是通过类型判断
        const identityFile = document.getElementById('identityFile');
        if (identityFile) {
            // 更新档案内容为表面身份
            identityFile.innerHTML = this.view.formatFileDisplay(this.model.coverIdentity, false);
            
            // 设置表面身份对应的国籍样式
            identityFile.className = 'identity-file';
            const nationality = this.model.coverIdentity.nationality;
            if (nationality === "美国") identityFile.classList.add('nationality-usa');
            else if (nationality === "英国") identityFile.classList.add('nationality-uk');
            else if (nationality === "法国") identityFile.classList.add('nationality-france');
            else if (nationality === "苏联") identityFile.classList.add('nationality-soviet');
        }
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

        // 添加更改伪装按钮事件
        const editDisguiseButton = document.getElementById('editDisguiseButton');
        if (editDisguiseButton) {
            editDisguiseButton.addEventListener('click', () => {
                window.audioManager.play('functionButton');
                this.view.showEditDisguiseView();
            });
        }

        // 添加快捷清除伪装按钮事件
        const quickClearDisguiseButton = document.getElementById('quickClearDisguiseButton');
        if (quickClearDisguiseButton) {
            quickClearDisguiseButton.addEventListener('click', () => {
                window.audioManager.play('systemBeep');
                this.clearDisguise();
            });
        }
        
        // 添加返回当前伪装按钮事件
        const backToCurrentButton = document.getElementById('backToCurrentButton');
        if (backToCurrentButton) {
            backToCurrentButton.addEventListener('click', () => {
                window.audioManager.play('functionButton');
                this.view.showCurrentDisguiseView();
            });
        }
        
        // 应用伪装后应该返回到当前伪装视图
        if (this.view.applyDisguiseButton) {
            this.view.applyDisguiseButton.addEventListener('click', () => {
                this.applyDisguise();
                this.view.showCurrentDisguiseView(); // 应用后返回当前视图
            });
        }
        
        // 清除伪装后也应该返回到当前伪装视图
        if (this.view.clearDisguiseButton) {
            this.view.clearDisguiseButton.addEventListener('click', () => {
                this.clearDisguise();
                this.view.showCurrentDisguiseView(); // 清除后返回当前视图
            });
        }

        document.querySelectorAll('.file-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const identityType = e.target.getAttribute('data-identity-type');
                this.switchIdentityView(identityType);
                
                // 更新标签状态
                document.querySelectorAll('.file-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                // 播放切换音效
                window.audioManager.play('functionButton');
            });
        });

        const identityFile = document.getElementById('identityFile');
        if (identityFile) {
            identityFile.addEventListener('click', () => {
                // 切换身份视图
                this.toggleIdentityView();
                
                // 播放切换音效
                if (window.audioManager) {
                    window.audioManager.play('functionButton');
                }
            });
        }

        const currentDisguiseDisplay = document.getElementById('currentDisguiseDisplay');
        if (currentDisguiseDisplay) {
            currentDisguiseDisplay.addEventListener('click', () => {
                // 对伪装身份执行适当的操作
                // 例如：切换到编辑视图
                this.view.showEditDisguiseView();
                
                // 播放切换音效
                if (window.audioManager) {
                    window.audioManager.play('functionButton');
                }
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

    switchIdentityView(identityType) {
        const identityFile = document.getElementById('identityFile');
        if (!identityFile) return;
        
        let identity = null;
        let isSecret = false;
        
        // 确定要显示的身份
        if (identityType === 'real') {
            identity = this.model.realIdentity;
            isSecret = true;
        } else {
            identity = this.model.coverIdentity;
        }
        
        // 更新档案内容
        identityFile.innerHTML = this.view.formatFileDisplay(identity, isSecret);
        
        // 设置国籍特定样式
        identityFile.className = 'identity-file';
        if (identity) {
            // 移除所有国籍类
            identityFile.classList.remove(
                'nationality-usa',
                'nationality-uk', 
                'nationality-france', 
                'nationality-soviet'
            );
            
            // 添加对应国籍类
            switch(identity.nationality) {
                case "美国":
                    identityFile.classList.add('nationality-usa');
                    break;
                case "英国":
                    identityFile.classList.add('nationality-uk');
                    break;
                case "法国":
                    identityFile.classList.add('nationality-france');
                    break;
                case "苏联":
                    identityFile.classList.add('nationality-soviet');
                    break;
                // 其他国籍不添加特殊类，使用默认样式
            }
        }
    }

    toggleIdentityView() {
        // 获取当前显示的身份类型
        const currentType = this.currentIdentityType || 'cover';
        // 切换类型
        const newType = (currentType === 'cover') ? 'real' : 'cover';
        // 保存当前类型
        this.currentIdentityType = newType;
        // 更新显示
        this.switchIdentityView(newType);
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

    showHideIdentityView() {
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
                // 否则切到档案，并确保显示表面身份
                window.interfaceManager.switchTo('identity');
                
                // 确保显示表面身份，不管当前状态如何
                this.currentIdentityType = 'cover';
                this.switchIdentityView('cover');
            }
            return true;
        }
        
        // 以下是旧的逻辑，作为后备方案
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
            // 确保显示表面身份
            this.currentIdentityType = 'cover';
            this.switchIdentityView('cover');
        }
        
        return this.isVisible;
    }
}