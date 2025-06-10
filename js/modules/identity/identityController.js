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
        
        // 键盘导航相关属性 - 新的行列导航系统
        this.keyboardNavigationEnabled = false;
        this.currentPage = 'basic'; // 'basic' 或 'disguise'
        this.focusableElements = []; // 保留兼容性
        this.keyboardEventListener = null;
        
        // 新增：行列导航系统
        this.focusRows = []; // 按行分组的焦点元素 [{row: 0, elements: [...]}]
        this.currentRow = 0; // 当前行
        this.currentCol = 0; // 当前列
        
        // 档案分页相关属性
        this.currentFilePage = 1;
        this.totalFilePages = 3;
        this.currentDisguiseFilePage = 1;
        this.totalDisguiseFilePages = 3;
        
        // 新增：页面状态记忆
        this.lastPageState = {
            page: 'basic', // 最后访问的页面
            focusMemory: null // 最后的焦点状态
        };
    }
    
    // 初始化控制器
    async initialize() {
        try {
            console.log("初始化身份控制器...");
            
            // 初始化视图
            this.view.initialize();
            
            // 主动获取当前颜色模式并应用
            this.applyCurrentColorMode();
            
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
    
    // 新增：主动获取并应用当前颜色模式
    applyCurrentColorMode() {
        // 检查屏幕元素的颜色模式类
        const screen = this.domUtils.get('.screen');
        if (screen) {
            const isAmber = screen.classList.contains('amber-mode');
            this.view.updateColorMode(isAmber);
            console.log(`身份界面应用初始颜色模式: ${isAmber ? '琥珀色' : '绿色'}`);
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
            this.domUtils.on(basicInfoButton, 'click', async () => {
                if (this.audio) this.audio.play('functionButton');
                // 统一使用 navigateToPage 方法
                await this.navigateToPage('basic');
            });
        }
        
        if (disguiseButton) {
            this.domUtils.on(disguiseButton, 'click', async () => {
                if (this.audio) this.audio.play('functionButton');
                // 统一使用 navigateToPage 方法
                await this.navigateToPage('disguise');
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

        // 档案文件区域点击事件 - 修改为支持鼠标翻页
        const identityFile = this.domUtils.get('#identityFile');
        if (identityFile) {
            this.domUtils.on(identityFile, 'click', async (e) => {
                // 检查是否为翻页点击
                if (this.handleFileAreaClick(e, 'identity')) {
                    return; // 如果是翻页操作，直接返回
                }
                
                // 否则执行原有的身份切换功能
                await this.toggleIdentityFileView();
                
                // 播放切换音效
                if (this.audio) this.audio.play('functionButton');
            });
        }

        // 当前伪装显示区域点击事件 - 修改为支持鼠标翻页
        const currentDisguiseDisplay = this.domUtils.get('#currentDisguiseDisplay');
        if (currentDisguiseDisplay) {
            this.domUtils.on(currentDisguiseDisplay, 'click', (e) => {
                // 检查是否为翻页点击
                if (this.handleFileAreaClick(e, 'disguise')) {
                    return; // 如果是翻页操作，直接返回
                }
                
                // 否则执行原有的编辑切换功能
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
            const realId = await this.model.getRealIdentity();
            const coverId = await this.model.getCoverIdentity();
            const disguiseId = await this.model.getDisguiseIdentity();
            
            this.view.updateRealIdentity(realId);
            this.view.updateCoverIdentity(coverId);
            this.view.updateDisguiseIdentity(disguiseId);
            
            if (this.view.basicInfoPage.style.display !== 'none') {
                await this.switchIdentityView(this.currentIdentityType);
            }
            
            // 更新完成后保存状态
            if (this.isVisible) {
                this.saveCurrentState();
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
        
        // 启用键盘导航并恢复状态
        this.enableKeyboardNavigationWithStateRestore();
    }
    
    // 隐藏身份界面
    hide() {
        // 保存当前状态
        this.saveCurrentState();
        
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
            if (identityData) {
                // 移除所有国籍类
                this.domUtils.removeClass(identityFile, 'nationality-usa', 'nationality-uk', 'nationality-france', 'nationality-soviet');
                
                // 添加对应国籍类（让CSS处理颜色）
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

    // 处理键盘导航 - 重构为行列导航
    handleKeyboardNavigation(e) {
        if (!this.isVisible || !this.keyboardNavigationEnabled) return;
        
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        switch (e.key) {
            case 'F1':
                return;
                
            case 'q':
            case 'Q':
                e.preventDefault();
                // 使用快速切换方法
                this.quickNavigateToPage('basic');
                break;
            case 'e':
            case 'E':
                e.preventDefault();
                // 使用快速切换方法
                this.quickNavigateToPage('disguise');
                break;
            
            // 上下键：行间导航
            case 'w':
            case 'W':
            case 'ArrowUp':
                e.preventDefault();
                this.navigateRow(-1);
                break;
            case 's':
            case 'S':
            case 'ArrowDown':
                e.preventDefault();
                this.navigateRow(1);
                break;
            
            // 左右键：列内导航或翻页
            case 'a':
            case 'A':
            case 'ArrowLeft':
                e.preventDefault();
                this.navigateLeftRight(-1);
                break;
            case 'd':
            case 'D':
            case 'ArrowRight':
                e.preventDefault();
                this.navigateLeftRight(1);
                break;
            
            case ' ':
                e.preventDefault();
                this.activateCurrentElement();
                break;
            case 'Enter':
                e.preventDefault();
                this.confirmCurrentElement();
                break;
            case 'Escape':
                e.preventDefault();
                this.handleEscape();
                break;
                
            default:
                return;
        }
    }

    // 行间导航（上下键）
    navigateRow(direction) {
        if (this.focusRows.length === 0) return;
        
        const newRow = this.currentRow + direction;
        
        if (newRow >= 0 && newRow < this.focusRows.length) {
            this.currentRow = newRow;
            
            // 调整列位置，确保不超出当前行的元素数量
            const currentRowElements = this.focusRows[this.currentRow].elements;
            if (this.currentCol >= currentRowElements.length) {
                this.currentCol = Math.max(0, currentRowElements.length - 1);
            }
            
            this.updateFocus();
        }
    }

    // 左右导航（左右键）
    navigateLeftRight(direction) {
        if (this.focusRows.length === 0) return;
        
        const currentRowData = this.focusRows[this.currentRow];
        if (!currentRowData) return;
        
        // 检查当前行是否支持翻页
        if (currentRowData.pageNavigation) {
            // 档案区域翻页
            if (currentRowData.pageNavigation === 'identity') {
                this.navigateFilePage(direction);
            } else if (currentRowData.pageNavigation === 'disguise') {
                this.navigateDisguiseFilePage(direction);
            }
        } else {
            // 普通的列间导航
            const newCol = this.currentCol + direction;
            const elements = currentRowData.elements;
            
            if (newCol >= 0 && newCol < elements.length) {
                this.currentCol = newCol;
                this.updateFocus();
            }
        }
    }

    // 更新焦点显示
    updateFocus() {
        // 清除所有焦点
        this.view.clearAllFocus();
        
        // 设置新焦点
        if (this.currentRow >= 0 && this.currentRow < this.focusRows.length) {
            const currentRowData = this.focusRows[this.currentRow];
            const elements = currentRowData.elements;
            
            if (this.currentCol >= 0 && this.currentCol < elements.length) {
                const currentElement = elements[this.currentCol];
                this.view.setFocus(currentElement.element, currentElement.type);
                
                console.log(`焦点: 行${this.currentRow} 列${this.currentCol} ${currentElement.type}`);
            }
        }
    }

    // 获取当前焦点元素
    getCurrentFocusElement() {
        if (this.currentRow >= 0 && this.currentRow < this.focusRows.length) {
            const currentRowData = this.focusRows[this.currentRow];
            const elements = currentRowData.elements;
            
            if (this.currentCol >= 0 && this.currentCol < elements.length) {
                return elements[this.currentCol];
            }
        }
        return null;
    }

    // 初始化行列焦点结构
    initializeFocusableElements() {
        this.focusRows = [];
        
        console.log(`初始化行列焦点，当前页面: ${this.currentPage}`);
        
        if (this.currentPage === 'basic') {
            this.initializeBasicPageFocus();
        } else if (this.currentPage === 'disguise') {
            this.initializeDisguisePageFocus();
        }
        
        // 重置焦点位置
        this.currentRow = 0;
        this.currentCol = 0;
        
        console.log(`焦点行初始化完成: ${this.focusRows.length} 行`);
    }

    // 初始化基本档案页面焦点
    initializeBasicPageFocus() {
        // 第1行：档案文件区域
        const identityFile = this.domUtils.get('#identityFile');
        if (identityFile) {
            this.focusRows.push({
                row: 0,
                pageNavigation: 'identity', // 标记支持翻页
                elements: [{ element: identityFile, type: 'identity-file' }]
            });
        }
        
        // 第2行：导航按钮
        const basicInfoButton = this.domUtils.get('#basicInfoButton');
        const disguiseButton = this.domUtils.get('#disguiseButton');
        const navButtons = [];
        
        if (basicInfoButton) navButtons.push({ element: basicInfoButton, type: 'nav-button' });
        if (disguiseButton) navButtons.push({ element: disguiseButton, type: 'nav-button' });
        
        if (navButtons.length > 0) {
            this.focusRows.push({
                row: 1,
                pageNavigation: null,
                elements: navButtons
            });
        }
    }

    // 初始化伪装页面焦点
    initializeDisguisePageFocus() {
        let rowIndex = 0;
        
        // 第1行：操作按钮（清除伪装、更改伪装）
        const editDisguiseButton = this.domUtils.get('#editDisguiseButton');
        const quickClearButton = this.domUtils.get('#quickClearDisguiseButton');
        const backButton = this.domUtils.get('#backToCurrentButton');
        
        const actionButtons = [];
        if (quickClearButton && quickClearButton.style.display !== 'none') {
            actionButtons.push({ element: quickClearButton, type: 'action-button' });
        }
        if (editDisguiseButton && editDisguiseButton.style.display !== 'none') {
            actionButtons.push({ element: editDisguiseButton, type: 'action-button' });
        }
        if (backButton && backButton.style.display !== 'none') {
            actionButtons.push({ element: backButton, type: 'action-button' });
        }
        
        if (actionButtons.length > 0) {
            this.focusRows.push({
                row: rowIndex++,
                pageNavigation: null,
                elements: actionButtons
            });
        }
        
        // 第2行：伪装档案区域
        const currentDisguiseDisplay = this.domUtils.get('#currentDisguiseDisplay');
        if (currentDisguiseDisplay) {
            this.focusRows.push({
                row: rowIndex++,
                pageNavigation: 'disguise', // 标记支持翻页
                elements: [{ element: currentDisguiseDisplay, type: 'disguise-display' }]
            });
        }
        
        // 第3行：导航按钮
        const basicInfoButton = this.domUtils.get('#basicInfoButton');
        const disguiseButton = this.domUtils.get('#disguiseButton');
        const navButtons = [];
        
        if (basicInfoButton) navButtons.push({ element: basicInfoButton, type: 'nav-button' });
        if (disguiseButton) navButtons.push({ element: disguiseButton, type: 'nav-button' });
        
        if (navButtons.length > 0) {
            this.focusRows.push({
                row: rowIndex++,
                pageNavigation: null,
                elements: navButtons
            });
        }
    }

    // 修改激活元素方法
    async activateCurrentElement() {
        const currentElement = this.getCurrentFocusElement();
        if (!currentElement) return;
        
        // 保存当前焦点信息
        const focusMemory = this.saveFocusMemory();
        
        switch (currentElement.type) {
            case 'identity-file':
                await this.toggleIdentityFileView();
                // 操作后恢复焦点到相同位置
                setTimeout(() => {
                    this.restoreFocusFromMemory(focusMemory, this.currentPage);
                }, 50);
                if (this.audio) this.audio.play('functionButton');
                break;
            case 'disguise-display':
                this.view.showEditDisguiseView();
                // 重新初始化焦点（因为界面发生了变化）
                setTimeout(() => {
                    this.initializeFocusableElements();
                    // 对于进入编辑模式，焦点可以移到第一个操作按钮
                    this.currentRow = 0;
                    this.currentCol = 0;
                    this.updateFocus();
                }, 50);
                if (this.audio) this.audio.play('functionButton');
                break;
        }
    }

    // 修改确认元素方法
    async confirmCurrentElement() {
        const currentElement = this.getCurrentFocusElement();
        if (!currentElement) return;
        
        // 保存当前焦点信息
        const focusMemory = this.saveFocusMemory();
        
        switch (currentElement.type) {
            case 'nav-button':
                const buttonId = currentElement.element.id;
                if (buttonId === 'basicInfoButton') {
                    await this.navigateToPage('basic');
                } else if (buttonId === 'disguiseButton') {
                    await this.navigateToPage('disguise');
                } else {
                    currentElement.element.click();
                    // 对于其他导航按钮，延迟重新初始化并恢复焦点
                    setTimeout(() => {
                        this.initializeFocusableElements();
                        this.restoreFocusFromMemory(focusMemory, this.currentPage);
                    }, 100);
                }
                break;
            case 'action-button':
                currentElement.element.click();
                // 延迟重新初始化焦点，尝试保持在相同位置
                setTimeout(() => {
                    this.initializeFocusableElements();
                    this.restoreFocusFromMemory(focusMemory, this.currentPage);
                }, 100);
                break;
            default:
                await this.activateCurrentElement();
                break;
        }
    }

    // 修改页面导航方法，实现焦点停留
    async navigateToPage(page) {
        if (this.currentPage === page) return;
        
        const previousPage = this.currentPage;
        
        // 记录当前焦点元素的信息，用于页面切换后恢复
        const focusMemory = this.saveFocusMemory();
        
        this.currentPage = page;
        
        if (page === 'basic') {
            this.view.showBasicInfoPage();
            this.currentIdentityType = 'cover';
            this.currentFilePage = 1;
            await this.switchIdentityView('cover');
        } else if (page === 'disguise') {
            this.view.showDisguisePage();
            this.currentDisguiseFilePage = 1;
            this.view.showCurrentDisguiseView();
            await this.updateDisguiseFilePageDisplay();
        }
        
        // 延迟初始化行列焦点并恢复焦点位置
        setTimeout(() => {
            this.initializeFocusableElements();
            this.restoreFocusFromMemory(focusMemory, page);
            console.log(`页面切换: ${previousPage} -> ${page}, 焦点已恢复`);
        }, 50);
        
        if (this.audio) this.audio.play('functionButton');
    }

    // 保存当前焦点信息
    saveFocusMemory() {
        const currentElement = this.getCurrentFocusElement();
        if (!currentElement) {
            return {
                type: null,
                elementId: null,
                row: this.currentRow,
                col: this.currentCol
            };
        }
        
        const elementId = currentElement.element.id || null;
        
        return {
            type: currentElement.type,
            elementId: elementId,
            row: this.currentRow,
            col: this.currentCol
        };
    }

    // 从焦点记忆中恢复焦点位置
    restoreFocusFromMemory(focusMemory, targetPage) {
        if (!focusMemory) {
            // 如果没有焦点记忆，默认设置到第一个元素
            this.currentRow = 0;
            this.currentCol = 0;
            this.updateFocus();
            return;
        }
        
        // 优先级1: 如果有具体的元素ID（通常是按钮），尝试找到它
        if (focusMemory.elementId) {
            const targetPosition = this.findElementInFocusRows(focusMemory.elementId);
            if (targetPosition) {
                this.currentRow = targetPosition.row;
                this.currentCol = targetPosition.col;
                this.updateFocus();
                console.log(`焦点恢复到元素: ${focusMemory.elementId} (行${this.currentRow} 列${this.currentCol})`);
                return;
            }
        }
        
        // 优先级2: 根据元素类型找到合适的位置
        const targetPosition = this.findSimilarElementPosition(focusMemory.type, targetPage);
        if (targetPosition) {
            this.currentRow = targetPosition.row;
            this.currentCol = targetPosition.col;
            this.updateFocus();
            console.log(`焦点恢复到类似元素: ${focusMemory.type} (行${this.currentRow} 列${this.currentCol})`);
            return;
        }
        
        // 优先级3: 尝试保持在相同的行列位置
        if (focusMemory.row < this.focusRows.length) {
            const targetRow = Math.min(focusMemory.row, this.focusRows.length - 1);
            const targetCol = Math.min(focusMemory.col, this.focusRows[targetRow].elements.length - 1);
            
            this.currentRow = targetRow;
            this.currentCol = Math.max(0, targetCol);
            this.updateFocus();
            console.log(`焦点恢复到位置: 行${this.currentRow} 列${this.currentCol}`);
            return;
        }
        
        // 最后的默认选项：设置到第一个元素
        this.currentRow = 0;
        this.currentCol = 0;
        this.updateFocus();
        console.log(`焦点恢复到默认位置: 行${this.currentRow} 列${this.currentCol}`);
    }

    // 在焦点行中查找指定ID的元素
    findElementInFocusRows(elementId) {
        for (let row = 0; row < this.focusRows.length; row++) {
            const elements = this.focusRows[row].elements;
            for (let col = 0; col < elements.length; col++) {
                if (elements[col].element.id === elementId) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    // 根据元素类型找到合适的位置
    findSimilarElementPosition(elementType, targetPage) {
        if (!elementType) return null;
        
        // 特殊处理：导航按钮类型
        if (elementType === 'nav-button') {
            // 在新页面中，尝试找到对应的按钮
            if (targetPage === 'basic') {
                // 切换到基本档案页，尝试找到基本档案按钮
                return this.findElementInFocusRows('basicInfoButton');
            } else if (targetPage === 'disguise') {
                // 切换到伪装系统页，尝试找到伪装系统按钮
                return this.findElementInFocusRows('disguiseButton');
            }
        }
        
        // 其他类型：找到第一个相同类型的元素
        for (let row = 0; row < this.focusRows.length; row++) {
            const elements = this.focusRows[row].elements;
            for (let col = 0; col < elements.length; col++) {
                if (elements[col].type === elementType) {
                    return { row, col };
                }
            }
        }
        
        return null;
    }

    // 档案翻页方法保持不变，但去掉焦点重新设置
    async navigateFilePage(direction) {
        const newPage = this.currentFilePage + direction;
        
        if (newPage >= 1 && newPage <= this.totalFilePages) {
            this.currentFilePage = newPage;
            await this.updateFilePageDisplay();
            if (this.audio) this.audio.play('functionButton');
        }
    }

    async navigateDisguiseFilePage(direction) {
        const newPage = this.currentDisguiseFilePage + direction;
        
        if (newPage >= 1 && newPage <= this.totalDisguiseFilePages) {
            this.currentDisguiseFilePage = newPage;
            await this.updateDisguiseFilePageDisplay();
            if (this.audio) this.audio.play('functionButton');
        }
    }

    // 启用键盘导航
    enableKeyboardNavigation() {
        this.keyboardNavigationEnabled = true;
        this.initializeFocusableElements();
        this.updateFocus();
        console.log("身份系统: 行列键盘导航已启用");
    }

    // 禁用键盘导航
    disableKeyboardNavigation() {
        this.keyboardNavigationEnabled = false;
        this.view.clearAllFocus();
        console.log("身份系统: 键盘导航已禁用");
    }

    // 处理Escape键
    handleEscape() {
        // 如果当前在编辑伪装视图，返回到当前伪装视图
        const editView = this.domUtils.get('#disguiseEditView');
        if (editView && editView.style.display !== 'none') {
            this.view.showCurrentDisguiseView();
            this.initializeFocusableElements();
            this.updateFocus();
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

    // 更新伪装档案页面显示
    async updateDisguiseFilePageDisplay() {
        if (this.currentPage !== 'disguise') return;
        
        try {
            const disguiseData = await this.model.getDisguiseIdentity();
            
            // 使用与基本档案相同的分页显示逻辑
            this.view.updateDisguiseFilePageDisplay(disguiseData, this.currentDisguiseFilePage, this.totalDisguiseFilePages);
            
        } catch (error) {
            console.error(`更新伪装档案页面显示失败:`, error);
        }
    }

    // 修改界面显示回调，实现智能焦点恢复
    onInterfaceShown() {
        // 当通过interface service显示身份界面时调用
        this.isVisible = true;
        
        // 延迟启用键盘导航，确保界面完全显示
        setTimeout(() => {
            this.enableKeyboardNavigationWithStateRestore();
        }, 100);
        
        console.log("身份界面已显示，键盘导航已启用");
    }

    // 修改界面隐藏回调，保存当前状态
    onInterfaceHidden() {
        // 保存当前页面状态和焦点信息
        this.saveCurrentState();
        
        // 当通过interface service隐藏身份界面时调用
        this.isVisible = false;
        this.disableKeyboardNavigation();
        console.log("身份界面已隐藏，状态已保存，键盘导航已禁用");
    }

    // 保存当前页面状态
    saveCurrentState() {
        this.lastPageState = {
            page: this.currentPage,
            focusMemory: this.saveFocusMemory(),
            filePage: this.currentFilePage,
            disguiseFilePage: this.currentDisguiseFilePage,
            identityType: this.currentIdentityType
        };
        
        console.log(`保存页面状态: ${this.lastPageState.page}, 焦点: 行${this.currentRow} 列${this.currentCol}`);
    }

    // 启用键盘导航并恢复状态
    enableKeyboardNavigationWithStateRestore() {
        this.keyboardNavigationEnabled = true;
        
        // 恢复到上次的页面状态
        this.restoreLastPageState();
        
        console.log("身份系统: 键盘导航已启用，页面状态已恢复");
    }

    // 恢复上次的页面状态
    async restoreLastPageState() {
        const targetPage = this.lastPageState.page || 'basic';
        
        // 如果当前页面与目标页面不同，先切换页面
        if (this.currentPage !== targetPage) {
            this.currentPage = targetPage;
            
            if (targetPage === 'basic') {
                this.view.showBasicInfoPage();
                // 恢复档案页面和身份类型
                this.currentIdentityType = this.lastPageState.identityType || 'cover';
                this.currentFilePage = this.lastPageState.filePage || 1;
                await this.switchIdentityView(this.currentIdentityType);
            } else if (targetPage === 'disguise') {
                this.view.showDisguisePage();
                this.view.showCurrentDisguiseView();
                // 恢复伪装档案页面
                this.currentDisguiseFilePage = this.lastPageState.disguiseFilePage || 1;
                await this.updateDisguiseFilePageDisplay();
            }
        }
        
        // 初始化焦点结构
        this.initializeFocusableElements();
        
        // 根据页面类型设置焦点到档案区域
        this.setFocusToFileArea(targetPage);
    }

    // 设置焦点到档案区域
    setFocusToFileArea(page) {
        if (this.focusRows.length === 0) {
            console.log("没有可聚焦元素，跳过焦点设置");
            return;
        }
        
        if (page === 'basic') {
            // 基本档案页：焦点设置到档案文件区域（通常是第一行）
            const fileRowIndex = this.findFileRowIndex('identity');
            if (fileRowIndex !== -1) {
                this.currentRow = fileRowIndex;
                this.currentCol = 0;
                this.updateFocus();
                console.log(`焦点设置到基本档案区域: 行${this.currentRow}`);
                return;
            }
        } else if (page === 'disguise') {
            // 伪装系统页：焦点设置到伪装档案区域
            const disguiseRowIndex = this.findFileRowIndex('disguise');
            if (disguiseRowIndex !== -1) {
                this.currentRow = disguiseRowIndex;
                this.currentCol = 0;
                this.updateFocus();
                console.log(`焦点设置到伪装档案区域: 行${this.currentRow}`);
                return;
            }
        }
        
        // 如果找不到档案区域，设置到第一个元素
        this.currentRow = 0;
        this.currentCol = 0;
        this.updateFocus();
        console.log(`焦点设置到默认位置: 行${this.currentRow} 列${this.currentCol}`);
    }

    // 查找档案行的索引
    findFileRowIndex(fileType) {
        for (let i = 0; i < this.focusRows.length; i++) {
            const rowData = this.focusRows[i];
            if (rowData.pageNavigation === fileType) {
                return i;
            }
        }
        return -1;
    }

    // 修改原有的启用键盘导航方法（用于内部页面切换）
    enableKeyboardNavigation() {
        this.keyboardNavigationEnabled = true;
        this.initializeFocusableElements();
        this.updateFocus();
        console.log("身份系统: 键盘导航已启用（内部切换）");
    }

    // 修改显示身份界面方法（用于旧的显示逻辑）
    async show() {
        // 更新显示内容
        await this.updateIdentityDisplays();
        this.view.show();
        this.isVisible = true;
        
        // 启用键盘导航并恢复状态
        this.enableKeyboardNavigationWithStateRestore();
    }

    // 修改隐藏身份界面方法
    hide() {
        // 保存当前状态
        this.saveCurrentState();
        
        this.view.hide();
        this.isVisible = false;
        
        // 禁用键盘导航
        this.disableKeyboardNavigation();
    }

    // 修改快速切换方法，更新页面状态记忆
    async quickNavigateToPage(page) {
        const previousPage = this.currentPage;
        this.currentPage = page;
        
        if (page === 'basic') {
            this.view.showBasicInfoPage();
            this.currentIdentityType = 'cover';
            this.currentFilePage = 1;
            await this.switchIdentityView('cover');
        } else if (page === 'disguise') {
            this.view.showDisguisePage();
            this.currentDisguiseFilePage = 1;
            this.view.showCurrentDisguiseView();
            await this.updateDisguiseFilePageDisplay();
        }
        
        setTimeout(() => {
            this.initializeFocusableElements();
            // Q/E键切换：焦点到档案区域
            this.setFocusToFileArea(page);
            console.log(`快速切换: ${previousPage} -> ${page}, 焦点设置到档案区域`);
        }, 50);
        
        if (this.audio) this.audio.play('functionButton');
    }

    // 修改普通页面切换方法
    async navigateToPage(page) {
        if (this.currentPage === page) return;
        
        const previousPage = this.currentPage;
        const focusMemory = this.saveFocusMemory();
        
        this.currentPage = page;
        
        if (page === 'basic') {
            this.view.showBasicInfoPage();
            this.currentIdentityType = 'cover';
            this.currentFilePage = 1;
            await this.switchIdentityView('cover');
        } else if (page === 'disguise') {
            this.view.showDisguisePage();
            this.currentDisguiseFilePage = 1;
            this.view.showCurrentDisguiseView();
            await this.updateDisguiseFilePageDisplay();
        }
        
        setTimeout(() => {
            this.initializeFocusableElements();
            this.restoreFocusFromMemory(focusMemory, page);
            console.log(`页面切换: ${previousPage} -> ${page}, 焦点已恢复`);
        }, 50);
        
        if (this.audio) this.audio.play('functionButton');
    }

    // 在更新显示时也保存状态
    async updateIdentityDisplays() {
        try {
            const realId = await this.model.getRealIdentity();
            const coverId = await this.model.getCoverIdentity();
            const disguiseId = await this.model.getDisguiseIdentity();
            
            this.view.updateRealIdentity(realId);
            this.view.updateCoverIdentity(coverId);
            this.view.updateDisguiseIdentity(disguiseId);
            
            if (this.view.basicInfoPage.style.display !== 'none') {
                await this.switchIdentityView(this.currentIdentityType);
            }
            
            // 更新完成后保存状态
            if (this.isVisible) {
                this.saveCurrentState();
            }
            
            return true;
        } catch (error) {
            console.error("更新身份显示失败:", error);
            return false;
        }
    }

    // 新增：处理档案区域点击事件
    handleFileAreaClick(event, fileType) {
        const element = event.currentTarget;
        const rect = element.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const elementWidth = rect.width;
        
        // 计算点击位置的比例
        const clickRatio = clickX / elementWidth;
        
        // 左四分之一区域：向左翻页
        if (clickRatio <= 0.25) {
            this.handleMousePageNavigation(fileType, -1);
            return true; // 返回true表示已处理翻页
        }
        // 右四分之一区域：向右翻页
        else if (clickRatio >= 0.75) {
            this.handleMousePageNavigation(fileType, 1);
            return true; // 返回true表示已处理翻页
        }
        
        // 中间区域：不处理，让原有功能执行
        return false;
    }

    // 新增：处理鼠标翻页导航
    async handleMousePageNavigation(fileType, direction) {
        // 确保在正确的页面上
        if (fileType === 'identity' && this.currentPage !== 'basic') {
            return;
        }
        if (fileType === 'disguise' && this.currentPage !== 'disguise') {
            return;
        }
        
        // 执行对应的翻页操作
        if (fileType === 'identity') {
            await this.navigateFilePage(direction);
        } else if (fileType === 'disguise') {
            await this.navigateDisguiseFilePage(direction);
        }
        
        console.log(`鼠标翻页: ${fileType} ${direction > 0 ? '下一页' : '上一页'}`);
    }
}