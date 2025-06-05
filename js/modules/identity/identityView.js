// js/views/identityView.js
class IdentityView {
    constructor(serviceLocator) {
        // 服务依赖
        this.serviceLocator = serviceLocator;
        this.domUtils = serviceLocator.get('domUtils');
        this.eventBus = serviceLocator.get('eventBus');
        this.audio = serviceLocator.get('audio');
        
        // DOM元素引用 - 主容器现在从HTML静态获取
        this.statusInterface = this.domUtils.get('#statusInterface'); 

        // 子元素的引用将在 initializeInternalUI 中获取或创建并附加
        this.statusHeader = null;
        this.statusContent = null;
        this.statusFooter = null;

        this.basicInfoPage = null;
        this.disguisePage = null;
        
        // 头像和统计数据区域
        this.playerAvatar = null;
        this.playerStats = null;
        
        // 身份显示区域 (这些将在子页面创建后获取)
        // this.realIdentityDisplay = null; // 将在 basicInfoPage 内部创建和获取
        // this.coverIdentityDisplay = null; // 将在 basicInfoPage 内部创建和获取
        this.disguiseIdentityDisplay = null; // 将在 disguisePage 内部创建和获取
        
        // 伪装表单元素 (这些将在 disguisePage 创建后获取)
        this.nationalitySelect = null;
        this.typeSelect = null;
        this.functionSelect = null;
        this.organizationSelect = null;
        this.applyDisguiseButton = null;
        this.clearDisguiseButton = null;
    }
    
    // 初始化视图
    initialize() {
        if (!this.statusInterface) {
            console.error("档案界面 (#statusInterface) 未在HTML中找到! 请确保已在index.html中定义。");
            return; 
        }
        
        // 构建或获取 statusInterface 内部的UI元素
        this.initializeInternalUI(); 
        
        // 在内部UI构建完毕后，获取对关键子元素的引用
        // 注意：这些选择器现在是相对于已经存在的 #statusInterface
        this.basicInfoPage = this.domUtils.get('#statusInterface #basicInfoPage');
        this.disguisePage = this.domUtils.get('#statusInterface #disguisePage');
        
        this.playerAvatar = this.domUtils.get('#statusInterface #playerAvatar');
        this.playerStats = this.domUtils.get('#statusInterface #playerStats');
        
        // 伪装表单相关的元素获取也需要确保在它们被创建之后
        this.nationalitySelect = this.domUtils.get('#statusInterface #nationalitySelect');
        this.typeSelect = this.domUtils.get('#statusInterface #typeSelect');
        this.functionSelect = this.domUtils.get('#statusInterface #functionSelect');
        this.organizationSelect = this.domUtils.get('#statusInterface #organizationSelect');
        this.applyDisguiseButton = this.domUtils.get('#statusInterface #applyDisguiseButton');
        this.clearDisguiseButton = this.domUtils.get('#statusInterface #clearDisguiseButton');
        this.disguiseIdentityDisplay = this.domUtils.get('#statusInterface #currentDisguiseDisplay');


        // 初始显示基础信息页 (如果元素都已正确获取)
        if (this.basicInfoPage && this.disguisePage) {
             // 默认显示伪装页面，因为基础信息页依赖于伪装页的点击事件来切换
            this.showDisguisePage();
        } else {
            console.warn("IdentityView: basicInfoPage 或 disguisePage 未能正确初始化。");
        }
        
        this.setupEventSubscriptions();
    }

    initializeInternalUI() {
        // 获取HTML中定义的骨架
        this.statusHeader = this.domUtils.get('#statusInterface .status-header');
        this.statusContent = this.domUtils.get('#statusInterface .status-content');
        this.statusFooter = this.domUtils.get('#statusInterface .status-footer');

        if (!this.statusHeader || !this.statusContent || !this.statusFooter) {
            console.error("档案界面的主要子容器 (.status-header, .status-content, .status-footer) 未在HTML中找到!");
            // 可以选择在这里创建它们，如果HTML中没有定义
            // 例如:
            // if (!this.statusHeader) {
            //     this.statusHeader = this.domUtils.create('div', { className: 'status-header' });
            //     this.statusInterface.appendChild(this.statusHeader);
            // }
            // (类似地处理 statusContent 和 statusFooter)
            // 但推荐的方式是在HTML中定义好这些骨架
            return;
        }

        // 填充 Header 内容 (如果HTML中只是空壳)
        this.statusHeader.innerHTML = `
            <div class="status-title">特工档案系统 v1.0</div>
            <div class="status-security">安全级别: 最高机密</div>
        `;

        // 清空并填充 Content 内容
        this.statusContent.innerHTML = ''; // 清空，确保由JS完全控制内部

        const leftPanel = this.domUtils.create('div', {
            className: 'status-left-panel',
            innerHTML: `
                <div id="playerAvatar" class="player-avatar">
                    <div class="avatar-placeholder">档案照片</div>
                </div>
                <div id="playerStats" class="player-stats">
                    <div class="stat-item">调查能力: <span class="stat-value">78</span></div>
                    <div class="stat-item">伪装技巧: <span class="stat-value">65</span></div>
                    <div class="stat-item">情报分析: <span class="stat-value">72</span></div>
                    <div class="stat-item">社交能力: <span class="stat-value">81</span></div>
                    <div class="stat-item">技术能力: <span class="stat-value">59</span></div>
                </div>
            `
        });
        
        const rightPanel = this.domUtils.create('div', {
            className: 'status-right-panel'
        });
        
        // 基础信息页面 (仍然动态创建其内部，但附加到 rightPanel)
        const basicInfoPageElement = this.domUtils.create('div', {
            id: 'basicInfoPage',
            className: 'identity-page',
            innerHTML: `
                <div class="identity-file-container">
                    <div class="file-header-title">
                        <div class="file-header-text">人员档案</div>
                    </div>
                    <div class="identity-file" id="identityFile">
                        </div>
                </div>
            `
        });
        
        // 伪装页面 (仍然动态创建其内部，但附加到 rightPanel)
        const disguisePageElement = this.domUtils.create('div', {
            id: 'disguisePage',
            className: 'identity-page',
            // style: { display: 'none' } // 初始显示由 showBasicInfoPage/showDisguisePage 控制
        });

        const disguiseContainer = this.domUtils.create('div', {
            className: 'disguise-page-container'
        });

        const disguiseNav = this.domUtils.create('div', {
            className: 'disguise-nav',
            innerHTML: `
                <h3>伪装系统</h3>
                <div class="disguise-control-buttons">
                    <button id="quickClearDisguiseButton" class="terminal-button">清除伪装</button>
                    <button id="editDisguiseButton" class="edit-disguise-button">更改伪装</button>
                    <button id="backToCurrentButton" class="back-button" style="display: none;">返回</button>
                </div>
            `
        });

        const currentView = this.domUtils.create('div', {
            className: 'disguise-current-view',
            id: 'disguiseCurrentView',
            innerHTML: `
                <div class="identity-file-container">
                    <div class="file-header-title">
                        <div class="file-header-text">当前伪装</div>
                    </div>
                    <div class="identity-file" id="currentDisguiseDisplay">
                        </div>
                </div>
            `
        });

        const editView = this.domUtils.create('div', {
            className: 'disguise-edit-view',
            id: 'disguiseEditView',
            style: { display: 'none' }
        });

        const formContainer = this.domUtils.create('div', {
            className: 'disguise-form-container',
            innerHTML: `
                <div class="form-group">
                    <label for="nationalitySelect">国籍:</label>
                    <select id="nationalitySelect"></select>
                </div>
                <div class="form-group">
                    <label for="typeSelect">身份类型:</label>
                    <select id="typeSelect"></select>
                </div>
                <div class="form-group">
                    <label for="functionSelect">职能:</label>
                    <select id="functionSelect"></select>
                </div>
                <div class="form-group">
                    <label for="organizationSelect">机构:</label>
                    <select id="organizationSelect"></select>
                </div>
                <div class="disguise-buttons">
                    <button id="applyDisguiseButton" class="terminal-button">应用伪装</button>
                    <button id="clearDisguiseButton" class="terminal-button">清除伪装</button>
                </div>
            `
        });

        editView.appendChild(formContainer);
        disguiseContainer.appendChild(disguiseNav);
        disguiseContainer.appendChild(currentView);
        disguiseContainer.appendChild(editView);
        disguisePageElement.appendChild(disguiseContainer);
        
        this.statusContent.appendChild(leftPanel);
        this.statusContent.appendChild(rightPanel);
        rightPanel.appendChild(basicInfoPageElement);
        rightPanel.appendChild(disguisePageElement);
        
        // 填充 Footer 内容 (简化键盘提示)
        this.statusFooter.innerHTML = `
            <div class="status-nav">
                <button id="basicInfoButton" class="terminal-button active">基本档案</button>
                <button id="disguiseButton" class="terminal-button">伪装系统</button>
            </div>
            <div class="keyboard-hints">Q/E:切换页面 ↑/↓:导航 回车:确认 F1:终端</div>
        `;
    }
    
    // 设置事件订阅
    setupEventSubscriptions() {
        if (this.eventBus) {
            this.eventBus.on('colorModeChanged', (isAmber) => {
                this.updateColorMode(isAmber);
            });
            this.eventBus.on('playerIdentityChanged', (eventData) => {
                console.log("View接收到身份变更事件:", eventData);
            });
            this.eventBus.on('disguiseChanged', (eventData) => {
                this.updateDisguiseIdentity(eventData.identityData);
            });
            this.eventBus.on('disguiseBlown', () => {
                if (this.audio) {
                    this.audio.play('systemBeep');
                }
            });
        }
    }
    
    show() {
        if (this.statusInterface) {
            this.domUtils.toggle(this.statusInterface, true, 'flex');
        }
    }
    
    hide() {
        if (this.statusInterface) {
            this.domUtils.toggle(this.statusInterface, false);
        }
    }
    
    showBasicInfoPage() {
        if(this.basicInfoPage && this.disguisePage) {
            this.domUtils.toggle(this.basicInfoPage, true, 'flex');
            this.domUtils.toggle(this.disguisePage, false);
            this.domUtils.addClass('#statusInterface #basicInfoButton', 'active');
            this.domUtils.removeClass('#statusInterface #disguiseButton', 'active');
            
            // 清除所有焦点状态
            this.clearAllFocus();
        }
    }
    
    showDisguisePage() {
        if(this.basicInfoPage && this.disguisePage) {
            this.domUtils.toggle(this.basicInfoPage, false);
            this.domUtils.toggle(this.disguisePage, true, 'flex');
            this.domUtils.removeClass('#statusInterface #basicInfoButton', 'active');
            this.domUtils.addClass('#statusInterface #disguiseButton', 'active');
            
            // 清除所有焦点状态
            this.clearAllFocus();
        }
    }
    
    showCurrentDisguiseView() {
        this.domUtils.toggle('#statusInterface #disguiseCurrentView', true, 'flex');
        this.domUtils.toggle('#statusInterface #disguiseEditView', false);
        this.domUtils.toggle('#statusInterface #editDisguiseButton', true, 'block');
        this.domUtils.toggle('#statusInterface #quickClearDisguiseButton', true, 'block');
        this.domUtils.toggle('#statusInterface #backToCurrentButton', false);
        
        // 清除所有焦点状态
        this.clearAllFocus();
    }

    showEditDisguiseView() {
        this.domUtils.toggle('#statusInterface #disguiseCurrentView', false);
        this.domUtils.toggle('#statusInterface #disguiseEditView', true, 'flex');
        this.domUtils.toggle('#statusInterface #editDisguiseButton', false);
        this.domUtils.toggle('#statusInterface #quickClearDisguiseButton', false);
        this.domUtils.toggle('#statusInterface #backToCurrentButton', true, 'block');
        
        // 清除所有焦点状态
        this.clearAllFocus();
    }
    
    updateRealIdentity(identity) {
        // 如果当前在基本档案页面且显示真实身份，更新分页显示
        if (this.domUtils.get('#statusInterface #basicInfoPage').style.display !== 'none') {
            const identityController = window.identityController;
            if (identityController && identityController.currentIdentityType === 'real') {
                this.updateFilePageDisplay(identity, identityController.currentFilePage, identityController.totalFilePages, true, 'real');
            }
        }
    }
    
    updateCoverIdentity(identity) {
        // 如果当前在基本档案页面且显示表面身份，更新分页显示
        if (this.domUtils.get('#statusInterface #basicInfoPage').style.display !== 'none') {
            const identityController = window.identityController;
            if (identityController && identityController.currentIdentityType === 'cover') {
                this.updateFilePageDisplay(identity, identityController.currentFilePage, identityController.totalFilePages, false, 'cover');
            }
        }
    }

    updateIdentityFileNationalityClass(element, identity) {
        if (!element || !identity) return;
        // 移除所有国籍类
        this.domUtils.removeClass(element, 
            'nationality-usa', 'nationality-uk', 
            'nationality-france', 'nationality-soviet',
            'nationality-西德', 'nationality-东德' // 假设有这些CSS类
        );
        
        // 添加对应国籍类 (需要确保CSS中有这些类名)
        let nationalityClass = '';
        switch(identity.nationality) {
            case "美国": nationalityClass = 'nationality-usa'; break;
            case "英国": nationalityClass = 'nationality-uk'; break;
            case "法国": nationalityClass = 'nationality-france'; break;
            case "苏联": nationalityClass = 'nationality-soviet'; break;
            case "西德": nationalityClass = 'nationality-西德'; break;
            case "东德": nationalityClass = 'nationality-东德'; break;
        }
        if (nationalityClass) {
            this.domUtils.addClass(element, nationalityClass);
        }
    }
    
    updateDisguiseIdentity(identity) {
        // disguiseIdentityDisplay 现在是 #currentDisguiseDisplay
        if (this.disguiseIdentityDisplay) {
            this.disguiseIdentityDisplay.innerHTML = identity ? 
                this.formatDisguiseFileDisplay(identity) : 
                '<p class="no-disguise">无伪装</p>';
            this.updateIdentityFileNationalityClass(this.disguiseIdentityDisplay, identity);
        }
    }
    
    formatIdentityDisplay(identity) { // 这个方法可能不再直接用于渲染整个文件，而是作为 formatFileDisplay 的一部分
        if (!identity) return '<p class="no-identity">身份不明</p>';
        let html = '<div class="identity-card">';
        html += `<div class="identity-item"><span class="item-label">国籍:</span><span class="item-value">${identity.nationality}</span></div>`;
        html += `<div class="identity-item"><span class="item-label">身份类型:</span><span class="item-value">${identity.type}</span></div>`;
        if (identity.function) html += `<div class="identity-item"><span class="item-label">职能:</span><span class="item-value">${identity.function}</span></div>`;
        if (identity.organization) html += `<div class="identity-item"><span class="item-label">机构:</span><span class="item-value">${identity.organization}</span></div>`;
        html += '</div>';
        return html;
    }

    formatDisguiseFileDisplay(identity) {
        if (!identity) return '<p class="no-disguise">无伪装</p>';
        const headerTitle = '临时伪装档案';
        const headerSubtitle = '使用中';
        const stampText = '伪装身份';
        
        let html = `
        <div class="file-header">
            <div class="file-title">${headerTitle}</div>
            <div class="file-subtitle">${headerSubtitle}</div>
        </div>
        <div class="file-content">
            <div class="file-section">
                <div class="section-title">基本信息</div>
                <div class="file-row"><div class="file-label">国籍:</div><div class="file-value">${identity.nationality}</div></div>
                <div class="file-row"><div class="file-label">身份类型:</div><div class="file-value">${identity.type}</div></div>`;
        if (identity.function) html += `<div class="file-row"><div class="file-label">职能:</div><div class="file-value">${identity.function}</div></div>`;
        if (identity.organization) html += `<div class="file-row"><div class="file-label">隶属机构:</div><div class="file-value">${identity.organization}</div></div>`;
        html += `
            </div>
            <div class="file-section">
                <div class="section-title">伪装信息</div>
                <div class="file-row"><div class="file-label">启用时间:</div><div class="file-value">${this.getCurrentTimeString()}</div></div>
                <div class="file-row"><div class="file-label">状态:</div><div class="file-value">有效</div></div>
            </div>
        </div>
        <div class="file-stamp">${stampText}</div>`;
        return html;
    }

    getCurrentTimeString() {
        const now = new Date();
        const year = 1983; 
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
    
    populateNationalitySelect(nationalities) {
        if (this.nationalitySelect) {
            this.nationalitySelect.innerHTML = '';
            nationalities.forEach(nationality => {
                const option = this.domUtils.create('option', { value: nationality, textContent: nationality });
                this.nationalitySelect.appendChild(option);
            });
        }
    }
    
    populateTypeSelect(types) {
        if (this.typeSelect) {
            this.typeSelect.innerHTML = '';
            types.forEach(type => {
                const option = this.domUtils.create('option', { value: type, textContent: type });
                this.typeSelect.appendChild(option);
            });
        }
    }
    
    populateFunctionSelect(functions) {
        if (this.functionSelect) {
            this.functionSelect.innerHTML = '';
            const emptyOption = this.domUtils.create('option', { value: '', textContent: '-- 选择职能 --' });
            this.functionSelect.appendChild(emptyOption);
            functions.forEach(func => {
                const option = this.domUtils.create('option', { value: func, textContent: func });
                this.functionSelect.appendChild(option);
            });
        }
    }
    
    populateOrganizationSelect(organizations) {
        if (this.organizationSelect) {
            this.organizationSelect.innerHTML = '';
            if (organizations.length === 0) {
                const noOrgOption = this.domUtils.create('option', { value: '', textContent: '-- 无机构 --', disabled: true, selected: true });
                this.organizationSelect.appendChild(noOrgOption);
                this.organizationSelect.disabled = true;
            } else {
                this.organizationSelect.disabled = false;
                const emptyOption = this.domUtils.create('option', { value: '', textContent: '-- 选择机构 --' });
                this.organizationSelect.appendChild(emptyOption);
                organizations.forEach(org => {
                    const option = this.domUtils.create('option', { value: org, textContent: org });
                    this.organizationSelect.appendChild(option);
                });
            }
        }
    }
    
    updateColorMode(isAmber) {
        if (this.statusInterface) {
            this.domUtils.removeClass(this.statusInterface, 'green-mode', 'amber-mode');
            this.domUtils.addClass(this.statusInterface, isAmber ? 'amber-mode' : 'green-mode');
        }
    }

    formatFileDisplay(identity, isSecret = false) {
        if (!identity) return '<p class="no-identity">身份不明</p>';
        let headerTitle = '', headerSubtitle = '', stampText = '';
        switch(identity.nationality) {
            case "美国": headerTitle = "联邦调查局"; headerSubtitle = "人员档案"; stampText = isSecret ? "最高机密" : "官方档案"; break;
            case "英国": headerTitle = "秘密情报局"; headerSubtitle = "档案编号: " + this.generateRandomCode(8); stampText = isSecret ? "绝密" : "机密"; break;
            case "法国": headerTitle = "对外安全总局"; headerSubtitle = "特工档案"; stampText = isSecret ? "国家机密" : "限制传阅"; break;
            case "苏联": headerTitle = "国家安全委员会"; headerSubtitle = "人员档案 " + this.generateRandomCode(5); stampText = isSecret ? "绝密档案" : "登记档案"; break;
            default: headerTitle = "档案记录"; headerSubtitle = "身份信息"; stampText = isSecret ? "机密" : "已登记";
        }
        
        let html = `
        <div class="file-header">
            <div class="file-title">${headerTitle}</div>
            <div class="file-subtitle">${headerSubtitle}</div>
        </div>
        <div class="file-content">
            <div class="file-section">
                <div class="section-title">基本信息</div>
                <div class="file-row"><div class="file-label">国籍:</div><div class="file-value">${identity.nationality}</div></div>
                <div class="file-row"><div class="file-label">身份类型:</div><div class="file-value">${identity.type}</div></div>`;
        if (identity.function) html += `<div class="file-row"><div class="file-label">职能:</div><div class="file-value">${identity.function}</div></div>`;
        if (identity.organization) html += `<div class="file-row"><div class="file-label">隶属机构:</div><div class="file-value">${identity.organization}</div></div>`;
        html += `</div><div class="file-section"><div class="section-title">附加信息</div>`;
        if (identity.type === "情报人员") {
            html += `<div class="file-row"><div class="file-label">安全级别:</div><div class="file-value">${isSecret ? "α" : "β"}</div></div>
                     <div class="file-row"><div class="file-label">行动许可:</div><div class="file-value">${isSecret ? "无限制" : "有限"}</div></div>`;
        } else if (identity.type === "外交人员") {
            html += `<div class="file-row"><div class="file-label">外交级别:</div><div class="file-value">${isSecret ? "特级" : "普通"}</div></div>
                     <div class="file-row"><div class="file-label">外交豁免:</div><div class="file-value">是</div></div>`;
        } else {
            html += `<div class="file-row"><div class="file-label">备注:</div><div class="file-value">${isSecret ? "此档案包含敏感信息" : "标准档案"}</div></div>`;
        }
        html += `</div></div><div class="file-stamp">${stampText}</div>`;
        return html;
    }

    generateRandomCode(length) {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let result = "";
        for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        return result;
    }

    // 设置焦点
    setFocus(element, type) {
        if (!element) return;
        
        // 移除所有现有的焦点
        this.domUtils.getAll('.keyboard-focus').forEach(el => {
            this.domUtils.removeClass(el, 'keyboard-focus');
        });
        
        // 添加焦点样式
        this.domUtils.addClass(element, 'keyboard-focus');
        
        // 根据元素类型添加特定的焦点样式
        switch (type) {
            case 'identity-file':
                this.domUtils.addClass(element, 'keyboard-focus-file');
                break;
            case 'disguise-display':
                this.domUtils.addClass(element, 'keyboard-focus-display');
                break;
            case 'nav-button':
                this.domUtils.addClass(element, 'keyboard-focus-button');
                break;
            case 'action-button':
                this.domUtils.addClass(element, 'keyboard-focus-action');
                break;
        }
        
        // 确保元素在视口内可见
        this.scrollIntoViewIfNeeded(element);
    }

    // 移除焦点
    removeFocus(element) {
        if (!element) return;
        
        this.domUtils.removeClass(element, 'keyboard-focus');
        this.domUtils.removeClass(element, 'keyboard-focus-file');
        this.domUtils.removeClass(element, 'keyboard-focus-display');
        this.domUtils.removeClass(element, 'keyboard-focus-button');
        this.domUtils.removeClass(element, 'keyboard-focus-action');
    }

    // 确保元素在视口内可见
    scrollIntoViewIfNeeded(element) {
        if (!element) return;
        
        const rect = element.getBoundingClientRect();
        const container = this.statusInterface;
        
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        
        // 检查元素是否在容器的可视区域内
        if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
            element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }

    // 清除所有焦点状态
    clearAllFocus() {
        this.domUtils.getAll('.keyboard-focus').forEach(el => {
            this.removeFocus(el);
        });
    }

    // 更新档案分页显示 - 改为动态分页
    updateFilePageDisplay(identity, currentPage, totalPages, isSecret = false, identityType = 'cover') {
        const identityFile = this.domUtils.get('#identityFile');
        if (!identityFile) return;

        // 生成所有页面内容
        const allPages = this.generateAllPages(identity, isSecret, identityType);
        
        // 更新总页数
        if (window.identityController) {
            window.identityController.totalFilePages = allPages.length;
        }

        // 确保当前页面在有效范围内
        if (currentPage > allPages.length) {
            currentPage = 1;
            if (window.identityController) {
                window.identityController.currentFilePage = 1;
            }
        }

        // 显示当前页内容
        const pageContent = allPages[currentPage - 1] || allPages[0];
        const pageIndicator = this.generatePageIndicator(currentPage, allPages.length);
        
        identityFile.innerHTML = pageContent + pageIndicator;
    }

    // 生成所有页面内容
    generateAllPages(identity, isSecret, identityType) {
        if (!identity) {
            return ['<p class="no-identity">身份不明</p>'];
        }

        const pages = [];
        
        // 第1页：基本信息
        pages.push(this.generateBasicInfoPage(identity, isSecret, identityType));
        
        // 第2页：技能档案
        pages.push(this.generateSkillsPage(identity, isSecret, identityType));
        
        // 第3页开始：附加信息（根据内容自动分页）
        const additionalInfoPages = this.generateAdditionalInfoPages(identity, isSecret, identityType);
        pages.push(...additionalInfoPages);

        return pages;
    }

    // 生成附加信息页面（支持自动分页）
    generateAdditionalInfoPages(identity, isSecret, identityType) {
        const pages = [];
        const maxRowsPerPage = 6; // 每页最大行数
        
        let headerTitle = "附加档案信息";
        let headerSubtitle = `档案级别: ${isSecret ? "绝密" : "普通"}`;
        let stampText = isSecret ? "限制访问" : "标准档案";

        // 准备所有要显示的数据行
        const allRows = [];
        
        // 安全信息部分
        const securityRows = this.generateSecurityInfoRows(identity, isSecret);
        allRows.push({
            sectionTitle: "安全信息",
            rows: securityRows
        });

        // 档案信息部分
        const archiveRows = [
            { label: "创建时间", value: this.getCurrentTimeString() },
            { label: "最后更新", value: this.getCurrentTimeString() },
            { label: "档案状态", value: "有效" },
            { label: "访问级别", value: isSecret ? "限制访问" : "标准访问" },
            { label: "备份状态", value: "已备份" }
        ];
        allRows.push({
            sectionTitle: "档案信息",
            rows: archiveRows
        });

        // 根据内容长度分页
        let currentPageRows = [];
        let currentRowCount = 0;

        for (const section of allRows) {
            // 检查是否需要新页面（标题 + 至少一行内容）
            if (currentRowCount > 0 && currentRowCount + section.rows.length + 1 > maxRowsPerPage) {
                // 创建当前页面
                pages.push(this.buildAdditionalInfoPage(headerTitle, headerSubtitle, stampText, currentPageRows));
                currentPageRows = [];
                currentRowCount = 0;
            }

            // 添加当前部分
            currentPageRows.push(section);
            currentRowCount += section.rows.length + 1; // +1 for section title
        }

        // 添加最后一页
        if (currentPageRows.length > 0) {
            pages.push(this.buildAdditionalInfoPage(headerTitle, headerSubtitle, stampText, currentPageRows));
        }

        return pages.length > 0 ? pages : [this.buildAdditionalInfoPage(headerTitle, headerSubtitle, stampText, [])];
    }

    // 生成安全信息行
    generateSecurityInfoRows(identity, isSecret) {
        const rows = [];
        
        if (identity.type === "情报人员") {
            rows.push(
                { label: "安全级别", value: isSecret ? "α级" : "β级" },
                { label: "行动许可", value: isSecret ? "无限制" : "有限制" },
                { label: "接触级别", value: isSecret ? "最高机密" : "机密" },
                { label: "武器许可", value: isSecret ? "完全授权" : "有限授权" }
            );
        } else if (identity.type === "外交人员") {
            rows.push(
                { label: "外交级别", value: isSecret ? "特级" : "普通" },
                { label: "外交豁免", value: "是" },
                { label: "特权范围", value: isSecret ? "完全豁免" : "基本豁免" },
                { label: "领事权限", value: isSecret ? "全权代表" : "一般权限" }
            );
        } else if (identity.type === "军人") {
            rows.push(
                { label: "军衔等级", value: isSecret ? "高级军官" : "普通军官" },
                { label: "作战权限", value: isSecret ? "指挥权限" : "执行权限" },
                { label: "机密等级", value: isSecret ? "绝密" : "机密" }
            );
        } else {
            rows.push(
                { label: "背景检查", value: isSecret ? "深度调查" : "标准调查" },
                { label: "信任等级", value: isSecret ? "完全信任" : "一般信任" },
                { label: "权限级别", value: isSecret ? "高级权限" : "标准权限" }
            );
        }
        
        return rows;
    }

    // 构建附加信息页面
    buildAdditionalInfoPage(headerTitle, headerSubtitle, stampText, sections) {
        let html = `
        <div class="file-header">
            <div class="file-title">${headerTitle}</div>
            <div class="file-subtitle">${headerSubtitle}</div>
        </div>
        <div class="file-content">`;

        for (const section of sections) {
            html += `
            <div class="file-section">
                <div class="section-title">${section.sectionTitle}</div>`;
            
            for (const row of section.rows) {
                html += `<div class="file-row"><div class="file-label">${row.label}:</div><div class="file-value">${row.value}</div></div>`;
            }
            
            html += `</div>`;
        }

        html += `
        </div>
        <div class="file-stamp">${stampText}</div>`;
        
        return html;
    }

    // 生成分页指示器（更新以支持动态页数）
    generatePageIndicator(currentPage, totalPages) {
        return `
        <div class="page-indicator">
            <div class="page-info">第 ${currentPage} 页 / 共 ${totalPages} 页</div>
            <div class="page-controls">←/→ 翻页 | 空格 切换身份</div>
        </div>`;
    }

    // 生成第1页：基本信息
    generateBasicInfoPage(identity, isSecret, identityType) {
        if (!identity) return '<p class="no-identity">身份不明</p>';
        
        let headerTitle = '', headerSubtitle = '', stampText = '';
        switch(identity.nationality) {
            case "美国": 
                headerTitle = "联邦调查局"; 
                headerSubtitle = "人员档案"; 
                stampText = isSecret ? "最高机密" : "官方档案"; 
                break;
            case "英国": 
                headerTitle = "秘密情报局"; 
                headerSubtitle = "档案编号: " + this.generateRandomCode(8); 
                stampText = isSecret ? "绝密" : "机密"; 
                break;
            case "法国": 
                headerTitle = "对外安全总局"; 
                headerSubtitle = "特工档案"; 
                stampText = isSecret ? "国家机密" : "限制传阅"; 
                break;
            case "苏联": 
                headerTitle = "国家安全委员会"; 
                headerSubtitle = "人员档案 " + this.generateRandomCode(5); 
                stampText = isSecret ? "绝密档案" : "登记档案"; 
                break;
            default: 
                headerTitle = "档案记录"; 
                headerSubtitle = "身份信息"; 
                stampText = isSecret ? "机密" : "已登记";
        }
        
        let html = `
        <div class="file-header">
            <div class="file-title">${headerTitle}</div>
            <div class="file-subtitle">${headerSubtitle}</div>
        </div>
        <div class="file-content">
            <div class="file-section">
                <div class="section-title">基本信息</div>
                <div class="file-row"><div class="file-label">国籍:</div><div class="file-value">${identity.nationality}</div></div>
                <div class="file-row"><div class="file-label">身份类型:</div><div class="file-value">${identity.type}</div></div>`;
        
        if (identity.function) {
            html += `<div class="file-row"><div class="file-label">职能:</div><div class="file-value">${identity.function}</div></div>`;
        }
        if (identity.organization) {
            html += `<div class="file-row"><div class="file-label">隶属机构:</div><div class="file-value">${identity.organization}</div></div>`;
        }
        
        html += `
            </div>
        </div>
        <div class="file-stamp">${stampText}</div>`;
        
        return html;
    }

    // 生成第2页：技能档案（暂时留空）
    generateSkillsPage(identity, isSecret, identityType) {
        if (!identity) return '<p class="no-identity">身份不明</p>';
        
        let headerTitle = "技能评估档案";
        let headerSubtitle = `评估日期: ${this.getCurrentTimeString()}`;
        let stampText = isSecret ? "内部资料" : "标准评估";
        
        let html = `
        <div class="file-header">
            <div class="file-title">${headerTitle}</div>
            <div class="file-subtitle">${headerSubtitle}</div>
        </div>
        <div class="file-content">
            <div class="file-section">
                <div class="section-title">专业技能</div>
                <div class="file-row"><div class="file-label">状态:</div><div class="file-value">评估中...</div></div>
                <div class="file-row"><div class="file-label">备注:</div><div class="file-value">技能档案尚未完成</div></div>
            </div>
            <div class="file-section">
                <div class="section-title">系统提示</div>
                <div class="file-row"><div class="file-label">信息:</div><div class="file-value">此功能正在开发中</div></div>
            </div>
        </div>
        <div class="file-stamp">${stampText}</div>`;
        
        return html;
    }
}