// js/controllers/identityController.js
class IdentityController {
    constructor(model, view, serviceLocator) {
        this.model = model;
        this.view = view;
        this.serviceLocator = serviceLocator;
        
        // 获取服务
        this.eventBus = serviceLocator.get('eventBus');
        this.interfaceService = serviceLocator.get('interface');
        this.audio = serviceLocator.get('audio');
        this.domUtils = serviceLocator.get('domUtils');
        
        // 追踪可见性状态
        this.isVisible = false;
        this.currentIdentityType = 'cover'; // 用于档案文件区域的默认显示类型 (真实/表面)
        
        // 初始化标记
        this.initialized = false;
    }
    
    // 初始化控制器
    async initialize() {
        try {
            console.log("初始化身份控制器...");
            
            // 初始化视图
            this.view.initialize();
            
            // 设置事件监听器
            this.setupEventListeners();
            
            // 订阅系统事件
            this.subscribeToEvents();
            
            // 填充表单选择框
            this.populateFormSelects();
            
            // 检查lorebook是否准备好 
            const lorebookController = window.lorebookController;
            if (!lorebookController || !lorebookController.initialized) {
                console.log("lorebookController尚未准备好，将在稍后更新身份显示");
                
                // 添加事件监听，当lorebook初始化完成后更新身份
                if (this.eventBus) {
                    this.eventBus.once('lorebookSystemInitialized', async () => {
                        await this.updateIdentityDisplays();
                    });
                }
            } else {
                // 尝试更新身份显示
                await this.updateIdentityDisplays();
            }
            
            // 默认显示基本档案页面
            this.view.showBasicInfoPage();
            
            // 更新档案显示
            await this.switchIdentityView('cover');
            
            this.initialized = true;
            console.log("身份控制器初始化完成");
            return true;
        } catch (error) {
            console.error("身份控制器初始化失败:", error);
            return false;
        }
    }
    
    // 订阅系统事件
    subscribeToEvents() {
        if (this.eventBus) {
            // 监听系统状态变化事件
            this.eventBus.on('systemStateChange', (data) => {
                // 如果系统关闭且身份界面可见，隐藏它
                if (!data.isOn && this.isVisible) {
                    this.hide();
                    
                    // 如果使用interfaceService，更新界面状态
                    if (this.interfaceService) {
                        this.interfaceService.switchTo('terminal');
                    }
                }
            });
            
            // 监听颜色模式变化事件
            this.eventBus.on('colorModeChanged', (isAmber) => {
                this.view.updateColorMode(isAmber);
            });
            
            // 监听身份变更事件
            this.eventBus.on('playerIdentityChanged', async (eventData) => {
                console.log(`捕获到 playerIdentityChanged 事件:`, eventData);
                await this.updateIdentityDisplays();
                
                // 如果当前显示的档案文件是变更的类型，也需要特别更新它
                if (eventData.type === this.currentIdentityType || 
                    (eventData.type === 'disguise' && this.view.disguisePage.style.display !== 'none')) {
                    await this.switchIdentityView(this.currentIdentityType);
                }
            });
        }
    }
    
    // 设置事件监听
    setupEventListeners() {
        // 基础/伪装页面切换按钮
        const basicInfoButton = this.domUtils.get('#basicInfoButton');
        const disguiseButton = this.domUtils.get('#disguiseButton');
        
        if (basicInfoButton) {
            this.domUtils.on(basicInfoButton, 'click', () => {
                if (this.audio) this.audio.play('functionButton');
                this.view.showBasicInfoPage();
                // 切换到基础信息页时，默认显示表面身份
                this.currentIdentityType = 'cover';
                this.switchIdentityView('cover');
            });
        }
        
        if (disguiseButton) {
            this.domUtils.on(disguiseButton, 'click', () => {
                if (this.audio) this.audio.play('functionButton');
                this.view.showDisguisePage();
            });
        }
        
        // 身份类型变更事件
        if (this.view.typeSelect) {
            this.domUtils.on(this.view.typeSelect, 'change', () => {
                this.handleTypeChange();
            });
        }
        
        // 国籍变更事件
        if (this.view.nationalitySelect) {
            this.domUtils.on(this.view.nationalitySelect, 'change', () => {
                this.handleNationalityChange();
            });
        }
        
        // 应用伪装按钮
        if (this.view.applyDisguiseButton) {
            this.domUtils.on(this.view.applyDisguiseButton, 'click', async () => {
                await this.applyDisguise();
                this.view.showCurrentDisguiseView();
            });
        }
        
        // 清除伪装按钮
        if (this.view.clearDisguiseButton) {
            this.domUtils.on(this.view.clearDisguiseButton, 'click', async () => {
                await this.clearDisguise();
                this.view.showCurrentDisguiseView();
            });
        }

        // 添加更改伪装按钮事件
        const editDisguiseButton = this.domUtils.get('#editDisguiseButton');
        if (editDisguiseButton) {
            this.domUtils.on(editDisguiseButton, 'click', () => {
                if (this.audio) this.audio.play('functionButton');
                this.view.showEditDisguiseView();
            });
        }

        // 添加快捷清除伪装按钮事件
        const quickClearDisguiseButton = this.domUtils.get('#quickClearDisguiseButton');
        if (quickClearDisguiseButton) {
            this.domUtils.on(quickClearDisguiseButton, 'click', async () => {
                if (this.audio) this.audio.play('systemBeep');
                await this.clearDisguise();
            });
        }
        
        // 添加返回当前伪装按钮事件
        const backToCurrentButton = this.domUtils.get('#backToCurrentButton');
        if (backToCurrentButton) {
            this.domUtils.on(backToCurrentButton, 'click', () => {
                if (this.audio) this.audio.play('functionButton');
                this.view.showCurrentDisguiseView();
            });
        }
        
        // 档案文件区域的标签页切换
        this.domUtils.getAll('.file-tab').forEach(tab => {
            this.domUtils.on(tab, 'click', async (e) => {
                const identityType = e.target.getAttribute('data-identity-type');
                await this.switchIdentityView(identityType);
                
                // 更新标签状态
                this.domUtils.getAll('.file-tab').forEach(t => {
                    this.domUtils.removeClass(t, 'active');
                });
                this.domUtils.addClass(e.target, 'active');
                
                // 播放切换音效
                if (this.audio) this.audio.play('functionButton');
            });
        });

        // 档案文件区域点击事件 - 用于在真实身份和表面身份间切换
        const identityFile = this.domUtils.get('#identityFile');
        if (identityFile) {
            this.domUtils.on(identityFile, 'click', async () => {
                await this.toggleIdentityFileView();
                
                // 播放切换音效
                if (this.audio) this.audio.play('functionButton');
            });
        }

        // 当前伪装显示区域点击事件 - 用于切换到编辑伪装视图
        const currentDisguiseDisplay = this.domUtils.get('#currentDisguiseDisplay');
        if (currentDisguiseDisplay) {
            this.domUtils.on(currentDisguiseDisplay, 'click', () => {
                this.view.showEditDisguiseView();
                if (this.audio) this.audio.play('functionButton');
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
        const initialType = this.model.IDENTITY_TYPES[0]; // 获取第一个类型作为默认
        this.view.populateFunctionSelect(this.model.getFunctionsForType(initialType));
        
        // 初始填充机构选择框
        const initialNationality = this.model.NATIONALITIES[0]; // 获取第一个国籍作为默认
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
    async applyDisguise() {
        try {
            const nationality = this.view.nationalitySelect.value;
            const type = this.view.typeSelect.value;
            const func = this.view.functionSelect.value || null;
            const organization = this.view.organizationSelect.value || null;
            
            // 设置伪装身份
            const result = await this.model.setDisguiseIdentity(nationality, type, func, organization);
            
            if (result) {
                // 更新伪装显示
                const newDisguise = await this.model.getDisguiseIdentity();
                this.view.updateDisguiseIdentity(newDisguise);
                
                // 播放音效
                if (this.audio) this.audio.play('systemBeep');
                
                return true;
            }
            return false;
        } catch (error) {
            console.error("应用伪装失败:", error);
            return false;
        }
    }
    
    // 清除伪装
    async clearDisguise() {
        try {
            const result = await this.model.clearDisguise();
            
            if (result) {
                // 更新伪装显示
                this.view.updateDisguiseIdentity(null);
                
                // 播放音效
                if (this.audio) this.audio.play('systemBeep');
                
                return true;
            }
            return false;
        } catch (error) {
            console.error("清除伪装失败:", error);
            return false;
        }
    }
    
    // 更新所有身份显示
    async updateIdentityDisplays() {
        try {
            // 获取身份信息
            const realId = await this.model.getRealIdentity();
            const coverId = await this.model.getCoverIdentity();
            const disguiseId = await this.model.getDisguiseIdentity();
            
            // 更新显示
            this.view.updateRealIdentity(realId);
            this.view.updateCoverIdentity(coverId);
            this.view.updateDisguiseIdentity(disguiseId);
            
            // 更新档案文件区域
            if (this.view.basicInfoPage.style.display !== 'none') {
                await this.switchIdentityView(this.currentIdentityType);
            }
            
            return true;
        } catch (error) {
            console.error("更新身份显示失败:", error);
            return false;
        }
    }
        
    // 切换身份界面可见性
    async toggleIdentityView() {
        // 检查系统是否开机
        const systemService = this.serviceLocator.get('system');
        if (!systemService || !systemService.isOperational()) {
            console.log("系统未开机，无法切换到档案视图");
            return false;
        }
        
        // 使用界面服务切换
        if (this.interfaceService) {
            if (this.isVisible) {
                // 如果当前已经显示档案，则切回终端
                this.interfaceService.switchTo('terminal');
                this.isVisible = false;
            } else {
                // 否则切到档案
                this.interfaceService.switchTo('identity');
                this.isVisible = true;
                
                // 确保显示表面身份
                this.currentIdentityType = 'cover';
                await this.switchIdentityView('cover');
                this.view.showBasicInfoPage();
                
                // 激活对应的标签页
                this.domUtils.getAll('.file-tab').forEach(t => {
                    this.domUtils.removeClass(t, 'active');
                });
                
                const coverTab = this.domUtils.get('.file-tab[data-identity-type="cover"]');
                if (coverTab) {
                    this.domUtils.addClass(coverTab, 'active');
                }
            }
            return true;
        }
        
        // 旧的逻辑 (如果 interfaceService 不存在)
        if (this.isVisible) {
            this.hide();
        } else {
            await this.show();
        }
        return this.isVisible;
    }
    
    // 显示身份界面
    async show() {
        // 更新显示内容
        await this.updateIdentityDisplays();
        this.view.show();
        this.isVisible = true;
    }
    
    // 隐藏身份界面
    hide() {
        this.view.hide();
        this.isVisible = false;
    }

    // 切换档案文件区域显示的身份 (真实身份 vs 表面身份)
    async switchIdentityView(identityTypeSuffix) {
        const identityFile = this.domUtils.get('#identityFile');
        if (!identityFile) return;
        
        this.currentIdentityType = identityTypeSuffix;

        let identityData = null;
        let isSecret = false;
        
        try {
            if (identityTypeSuffix === 'real') {
                identityData = await this.model.getRealIdentity();
                isSecret = true;
            } else { // 'cover'
                identityData = await this.model.getCoverIdentity();
                isSecret = false; // 表面身份不是机密
            }
            
            // 更新档案内容
            identityFile.innerHTML = this.view.formatFileDisplay(identityData, isSecret);
            
            // 设置国籍特定样式
            identityFile.className = 'identity-file'; // 重置类名
            if (identityData) {
                // 移除所有国籍类
                this.domUtils.removeClass(identityFile, 'nationality-usa');
                this.domUtils.removeClass(identityFile, 'nationality-uk');
                this.domUtils.removeClass(identityFile, 'nationality-france');
                this.domUtils.removeClass(identityFile, 'nationality-soviet');
                
                // 添加对应国籍类
                switch(identityData.nationality) {
                    case "美国": this.domUtils.addClass(identityFile, 'nationality-usa'); break;
                    case "英国": this.domUtils.addClass(identityFile, 'nationality-uk'); break;
                    case "法国": this.domUtils.addClass(identityFile, 'nationality-france'); break;
                    case "苏联": this.domUtils.addClass(identityFile, 'nationality-soviet'); break;
                }
            }
            
            return true;
        } catch (error) {
            console.error(`切换身份视图到 ${identityTypeSuffix} 失败:`, error);
            identityFile.innerHTML = "<p>加载身份信息失败...</p>";
            return false;
        }
    }

    // 点击档案文件时，在真实身份和表面身份之间切换
    async toggleIdentityFileView() {
        const newType = (this.currentIdentityType === 'cover') ? 'real' : 'cover';
        await this.switchIdentityView(newType);

        // 更新标签页的激活状态
        this.domUtils.getAll('.file-tab').forEach(t => {
            this.domUtils.removeClass(t, 'active');
        });
        
        const activeTab = this.domUtils.get(`.file-tab[data-identity-type="${newType}"]`);
        if (activeTab) {
            this.domUtils.addClass(activeTab, 'active');
        }
    }
    
    // 检查身份是否被识破
    async checkIdentityBlown(detectionRate) {
        try {
            const isBlown = await this.model.checkDisguiseDetection(detectionRate);
            
            if (isBlown) {
                // 伪装被识破，恢复表面身份
                await this.model.blowDisguise();
                return true;
            }
            return false;
        } catch (error) {
            console.error("检查身份是否被识破失败:", error);
            return false;
        }
    }
    
    // 设置颜色模式
    updateColorMode(isAmber) {
        this.view.updateColorMode(isAmber);
    }

    // F2按钮调用的方法
    async showHideIdentityView() {
        return await this.toggleIdentityView();
    }
}