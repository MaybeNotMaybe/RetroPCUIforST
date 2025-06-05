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
        
        // 键盘导航相关属性
        this.keyboardNavigationEnabled = false;
        this.currentPage = 'basic'; // 'basic' 或 'disguise'
        this.focusedElementIndex = 0;
        this.focusableElements = [];
        this.keyboardEventListener = null;
        
        // 档案分页相关属性
        this.currentFilePage = 1; // 当前档案页面
        this.totalFilePages = 3; // 总页数（动态更新）
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

        // 设置键盘导航
        this.setupKeyboardNavigation();
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
            } else {
                // 否则切到档案
                this.interfaceService.switchTo('identity');
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
        
        // 启用键盘导航
        this.enableKeyboardNavigation();
    }
    
    // 隐藏身份界面
    hide() {
        this.view.hide();
        this.isVisible = false;
        
        // 禁用键盘导航
        this.disableKeyboardNavigation();
    }

    // 切换档案文件区域显示的身份 (真实身份 vs 表面身份)
    async switchIdentityView(identityTypeSuffix) {
        const identityFile = this.domUtils.get('#identityFile');
        if (!identityFile) return;
        
        this.currentIdentityType = identityTypeSuffix;
        this.currentFilePage = 1; // 切换身份时重置到第一页

        let identityData = null;
        let isSecret = false;
        
        try {
            if (identityTypeSuffix === 'real') {
                identityData = await this.model.getRealIdentity();
                isSecret = true;
            } else {
                identityData = await this.model.getCoverIdentity();
                isSecret = false;
            }
            
            // 使用新的分页显示方法
            this.view.updateFilePageDisplay(identityData, this.currentFilePage, this.totalFilePages, isSecret, identityTypeSuffix);
            
            // 设置国籍特定样式
            identityFile.className = 'identity-file';
            if (identityData) {
                this.domUtils.removeClass(identityFile, 'nationality-usa', 'nationality-uk', 'nationality-france', 'nationality-soviet');
                
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

    // 设置键盘导航系统
    setupKeyboardNavigation() {
        // 移除之前的事件监听器（如果存在）
        if (this.keyboardEventListener) {
            document.removeEventListener('keydown', this.keyboardEventListener, true);
        }

        // 创建键盘事件处理器
        this.keyboardEventListener = (e) => {
            this.handleKeyboardNavigation(e);
        };

        // 使用捕获阶段绑定键盘事件，确保优先级
        document.addEventListener('keydown', this.keyboardEventListener, true);
    }

    // 处理键盘导航
    handleKeyboardNavigation(e) {
        // 如果不是身份界面，不处理
        if (!this.isVisible || !this.keyboardNavigationEnabled) return;
        
        // 阻止事件冒泡和默认行为，防止其他系统处理
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        switch (e.key) {
            // F1 键：返回终端（但不阻止，让InterfaceService处理）
            case 'F1':
                return;
                
            // Q/E 键：页面间切换
            case 'q':
            case 'Q':
                e.preventDefault();
                this.navigateToPage('basic');
                break;
            case 'e':
            case 'E':
                e.preventDefault();
                this.navigateToPage('disguise');
                break;
            
            // A/D 或 ←/→：档案分页导航（仅在基本档案页面且焦点在档案文件上时）
            case 'a':
            case 'A':
            case 'ArrowLeft':
                if (this.currentPage === 'basic' && this.isFocusOnFile()) {
                    e.preventDefault();
                    this.navigateFilePage(-1);
                } else {
                    e.preventDefault();
                    this.navigateFocus(-1);
                }
                break;
            case 'd':
            case 'D':
            case 'ArrowRight':
                if (this.currentPage === 'basic' && this.isFocusOnFile()) {
                    e.preventDefault();
                    this.navigateFilePage(1);
                } else {
                    e.preventDefault();
                    this.navigateFocus(1);
                }
                break;
            
            // W/S 或 ↑/↓：元素间导航
            case 'w':
            case 'W':
            case 'ArrowUp':
                e.preventDefault();
                this.navigateFocus(-1);
                break;
            case 's':
            case 'S':
            case 'ArrowDown':
                e.preventDefault();
                this.navigateFocus(1);
                break;
            
            // Space：激活/切换
            case ' ':
                e.preventDefault();
                this.activateCurrentElement();
                break;
            
            // Enter：确认选择
            case 'Enter':
                e.preventDefault();
                this.confirmCurrentElement();
                break;
            
            // Escape：返回/取消
            case 'Escape':
                e.preventDefault();
                this.handleEscape();
                break;
                
            default:
                return;
        }
    }

    // 检查当前焦点是否在档案文件上
    isFocusOnFile() {
        if (this.focusedElementIndex < 0 || this.focusedElementIndex >= this.focusableElements.length) {
            return false;
        }
        const currentElement = this.focusableElements[this.focusedElementIndex];
        return currentElement.type === 'identity-file';
    }

    // 导航档案分页
    async navigateFilePage(direction) {
        const newPage = this.currentFilePage + direction;
        
        if (newPage >= 1 && newPage <= this.totalFilePages) {
            const currentIndex = this.focusedElementIndex; // 保存当前焦点
            this.currentFilePage = newPage;
            await this.updateFilePageDisplay();
            
            // 保持焦点在档案文件上
            setTimeout(() => {
                this.setFocus(currentIndex);
            }, 50);
            
            // 播放翻页音效
            if (this.audio) this.audio.play('functionButton');
        }
    }

    // 更新档案页面显示
    async updateFilePageDisplay() {
        if (this.currentPage !== 'basic') return;
        
        // 获取当前身份数据
        let identityData = null;
        let isSecret = false;
        
        try {
            if (this.currentIdentityType === 'real') {
                identityData = await this.model.getRealIdentity();
                isSecret = true;
            } else {
                identityData = await this.model.getCoverIdentity();
                isSecret = false;
            }
            
            // 更新档案显示（view会自动更新totalFilePages）
            this.view.updateFilePageDisplay(identityData, this.currentFilePage, this.totalFilePages, isSecret, this.currentIdentityType);
            
        } catch (error) {
            console.error(`更新档案页面显示失败:`, error);
        }
    }

    // 导航到指定页面
    async navigateToPage(page) {
        if (this.currentPage === page) return;
        
        this.currentPage = page;
        
        if (page === 'basic') {
            this.view.showBasicInfoPage();
            this.currentIdentityType = 'cover';
            this.currentFilePage = 1; // 重置到第一页
            await this.switchIdentityView('cover');
        } else if (page === 'disguise') {
            this.view.showDisguisePage();
        }
        
        // 重新初始化可聚焦元素并重置焦点
        this.initializeFocusableElements();
        this.setFocus(0);
        
        // 播放音效
        if (this.audio) this.audio.play('functionButton');
    }

    // 初始化可聚焦元素
    initializeFocusableElements() {
        this.focusableElements = [];
        
        if (this.currentPage === 'basic') {
            // 基本档案页面的可聚焦元素
            const identityFile = this.domUtils.get('#identityFile');
            const basicInfoButton = this.domUtils.get('#basicInfoButton');
            const disguiseButton = this.domUtils.get('#disguiseButton');
            
            if (identityFile) this.focusableElements.push({ element: identityFile, type: 'identity-file' });
            if (basicInfoButton) this.focusableElements.push({ element: basicInfoButton, type: 'nav-button' });
            if (disguiseButton) this.focusableElements.push({ element: disguiseButton, type: 'nav-button' });
            
        } else if (this.currentPage === 'disguise') {
            // 伪装页面的可聚焦元素
            const currentDisguiseDisplay = this.domUtils.get('#currentDisguiseDisplay');
            const editDisguiseButton = this.domUtils.get('#editDisguiseButton');
            const quickClearButton = this.domUtils.get('#quickClearDisguiseButton');
            const backButton = this.domUtils.get('#backToCurrentButton');
            const basicInfoButton = this.domUtils.get('#basicInfoButton');
            const disguiseButton = this.domUtils.get('#disguiseButton');
            
            if (currentDisguiseDisplay) this.focusableElements.push({ element: currentDisguiseDisplay, type: 'disguise-display' });
            if (editDisguiseButton && editDisguiseButton.style.display !== 'none') {
                this.focusableElements.push({ element: editDisguiseButton, type: 'action-button' });
            }
            if (quickClearButton && quickClearButton.style.display !== 'none') {
                this.focusableElements.push({ element: quickClearButton, type: 'action-button' });
            }
            if (backButton && backButton.style.display !== 'none') {
                this.focusableElements.push({ element: backButton, type: 'action-button' });
            }
            if (basicInfoButton) this.focusableElements.push({ element: basicInfoButton, type: 'nav-button' });
            if (disguiseButton) this.focusableElements.push({ element: disguiseButton, type: 'nav-button' });
        }
    }

    // 导航焦点
    navigateFocus(direction) {
        if (this.focusableElements.length === 0) return;
        
        const newIndex = this.focusedElementIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.focusableElements.length) {
            this.setFocus(newIndex);
        }
    }

    // 设置焦点
    setFocus(index) {
        // 移除之前的焦点
        if (this.focusedElementIndex >= 0 && this.focusedElementIndex < this.focusableElements.length) {
            const prevElement = this.focusableElements[this.focusedElementIndex];
            this.view.removeFocus(prevElement.element);
        }
        
        // 设置新焦点
        this.focusedElementIndex = index;
        if (index >= 0 && index < this.focusableElements.length) {
            const currentElement = this.focusableElements[index];
            this.view.setFocus(currentElement.element, currentElement.type);
        }
    }

    // 激活当前元素（Space键）
    async activateCurrentElement() {
        if (this.focusedElementIndex < 0 || this.focusedElementIndex >= this.focusableElements.length) return;
        
        const currentElement = this.focusableElements[this.focusedElementIndex];
        const currentIndex = this.focusedElementIndex; // 保存当前焦点索引
        
        switch (currentElement.type) {
            case 'identity-file':
                // 在真实身份和表面身份间切换
                await this.toggleIdentityFileView();
                if (this.audio) this.audio.play('functionButton');
                break;
            case 'disguise-display':
                // 切换到编辑伪装视图
                this.view.showEditDisguiseView();
                this.initializeFocusableElements(); // 重新初始化焦点元素
                this.setFocus(0); // 重置焦点到第一个元素
                if (this.audio) this.audio.play('functionButton');
                return; // 早期返回，不重新设置焦点
        }
        
        // 对于其他操作，保持原有焦点
        setTimeout(() => {
            this.setFocus(currentIndex);
        }, 50);
    }

    // 确认当前元素（Enter键）
    async confirmCurrentElement() {
        if (this.focusedElementIndex < 0 || this.focusedElementIndex >= this.focusableElements.length) return;
        
        const currentElement = this.focusableElements[this.focusedElementIndex];
        const currentIndex = this.focusedElementIndex; // 保存当前焦点索引
        
        switch (currentElement.type) {
            case 'nav-button':
            case 'action-button':
                // 触发按钮点击事件
                currentElement.element.click();
                // 延迟重新设置焦点，等待界面更新完成
                setTimeout(() => {
                    this.initializeFocusableElements();
                    // 尝试保持在相同位置，如果超出范围则设置为第一个
                    const newIndex = currentIndex < this.focusableElements.length ? currentIndex : 0;
                    this.setFocus(newIndex);
                }, 100);
                break;
            default:
                // 对于其他类型的元素，Enter和Space执行相同操作
                await this.activateCurrentElement();
                break;
        }
    }

    // 处理Escape键
    handleEscape() {
        // 如果当前在编辑伪装视图，返回到当前伪装视图
        const editView = this.domUtils.get('#disguiseEditView');
        if (editView && editView.style.display !== 'none') {
            this.view.showCurrentDisguiseView();
            this.initializeFocusableElements();
            this.setFocus(0);
            if (this.audio) this.audio.play('functionButton');
        }
    }

    // 启用键盘导航
    enableKeyboardNavigation() {
        this.keyboardNavigationEnabled = true;
        this.initializeFocusableElements();
        this.setFocus(0);
        console.log("身份系统: 键盘导航已启用");
    }

    // 禁用键盘导航
    disableKeyboardNavigation() {
        this.keyboardNavigationEnabled = false;
        // 移除所有焦点
        if (this.focusedElementIndex >= 0 && this.focusedElementIndex < this.focusableElements.length) {
            const currentElement = this.focusableElements[this.focusedElementIndex];
            this.view.removeFocus(currentElement.element);
        }
        console.log("身份系统: 键盘导航已禁用");
    }

    // 添加interface service的回调方法
    onInterfaceShown() {
        // 当通过interface service显示身份界面时调用
        this.isVisible = true;
        this.enableKeyboardNavigation();
        console.log("身份界面已显示，键盘导航已启用");
    }

    onInterfaceHidden() {
        // 当通过interface service隐藏身份界面时调用
        this.isVisible = false;
        this.disableKeyboardNavigation();
        console.log("身份界面已隐藏，键盘导航已禁用");
    }
}