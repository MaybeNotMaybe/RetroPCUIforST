// js/views/identityView.js
class IdentityView {
    constructor(serviceLocator) {
        // 服务依赖
        this.serviceLocator = serviceLocator;
        this.domUtils = serviceLocator.get('domUtils');
        this.eventBus = serviceLocator.get('eventBus');
        this.audio = serviceLocator.get('audio');
        
        // DOM元素引用
        this.statusInterface = null;
        this.basicInfoPage = null;
        this.disguisePage = null;
        
        // 头像和统计数据区域
        this.playerAvatar = null;
        this.playerStats = null;
        
        // 身份显示区域
        this.realIdentityDisplay = null;
        this.coverIdentityDisplay = null;
        this.disguiseIdentityDisplay = null;
        
        // 伪装表单元素
        this.nationalitySelect = null;
        this.typeSelect = null;
        this.functionSelect = null;
        this.organizationSelect = null;
        this.applyDisguiseButton = null;
        this.clearDisguiseButton = null;
    }
    
    // 初始化视图
    initialize() {
        // 如果界面不存在，创建它
        if (!this.domUtils.get('#statusInterface')) {
            this.createStatusInterface();
        }
        
        // 获取DOM元素引用
        this.statusInterface = this.domUtils.get('#statusInterface');
        this.basicInfoPage = this.domUtils.get('#basicInfoPage');
        this.disguisePage = this.domUtils.get('#disguisePage');
        
        this.playerAvatar = this.domUtils.get('#playerAvatar');
        this.playerStats = this.domUtils.get('#playerStats');
        
        this.realIdentityDisplay = this.domUtils.get('#realIdentityDisplay');
        this.coverIdentityDisplay = this.domUtils.get('#coverIdentityDisplay');
        this.disguiseIdentityDisplay = this.domUtils.get('#currentDisguiseDisplay');
        
        this.nationalitySelect = this.domUtils.get('#nationalitySelect');
        this.typeSelect = this.domUtils.get('#typeSelect');
        this.functionSelect = this.domUtils.get('#functionSelect');
        this.organizationSelect = this.domUtils.get('#organizationSelect');
        this.applyDisguiseButton = this.domUtils.get('#applyDisguiseButton');
        this.clearDisguiseButton = this.domUtils.get('#clearDisguiseButton');
        
        // 初始显示基础信息页
        this.showDisguisePage();
        
        // 设置事件订阅
        this.setupEventSubscriptions();
    }
    
    // 设置事件订阅
    setupEventSubscriptions() {
        if (this.eventBus) {
            // 订阅颜色模式变更事件
            this.eventBus.on('colorModeChanged', (isAmber) => {
                this.updateColorMode(isAmber);
            });
            
            // 订阅身份变更事件
            this.eventBus.on('playerIdentityChanged', (eventData) => {
                console.log("View接收到身份变更事件:", eventData);
            });
            
            // 订阅伪装变更事件
            this.eventBus.on('disguiseChanged', (eventData) => {
                this.updateDisguiseIdentity(eventData.identityData);
            });
            
            // 订阅伪装失败事件
            this.eventBus.on('disguiseBlown', () => {
                // 可以在这里添加一些视觉提示，如屏幕闪烁等
                if (this.audio) {
                    this.audio.play('systemBeep');
                }
            });
        }
    }
    
    // 创建状态界面
    createStatusInterface() {
        const screen = this.domUtils.get('.screen');
        
        // 创建主容器
        const statusInterface = this.domUtils.create('div', {
            id: 'statusInterface',
            className: 'status-interface',
            style: { display: 'none' }
        });
        
        // 创建页眉
        const header = this.domUtils.create('div', {
            className: 'status-header',
            innerHTML: `
                <div class="status-title">特工档案系统 v1.0</div>
                <div class="status-security">安全级别: 最高机密</div>
            `
        });
        
        // 创建主内容区
        const content = this.domUtils.create('div', {
            className: 'status-content'
        });
        
        // 左侧面板 - 基础信息
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
        
        // 右侧面板 - 身份信息
        const rightPanel = this.domUtils.create('div', {
            className: 'status-right-panel'
        });
        
        // 基础信息页面
        const basicInfoPage = this.domUtils.create('div', {
            id: 'basicInfoPage',
            className: 'identity-page',
            innerHTML: `
                <div class="identity-file-container">
                    <div class="file-tabs">
                        <div class="file-tab active" data-identity-type="cover">表面身份</div>
                        <div class="file-tab" data-identity-type="real">真实身份</div>
                    </div>
                    <div class="file-header-title">
                        <div class="file-header-text">人员档案</div>
                    </div>
                    <div class="identity-file" id="identityFile">
                        <!-- 档案内容将在这里动态生成 -->
                    </div>
                </div>
            `
        });
        
        // 伪装页面
        const disguisePage = this.domUtils.create('div', {
            id: 'disguisePage',
            className: 'identity-page',
            style: { display: 'none' }
        });

        // 创建伪装页面容器
        const disguiseContainer = this.domUtils.create('div', {
            className: 'disguise-page-container'
        });

        // 创建顶部导航
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

        // 当前伪装视图
        const currentView = this.domUtils.create('div', {
            className: 'disguise-current-view',
            id: 'disguiseCurrentView',
            innerHTML: `
                <div class="identity-file-container">
                    <div class="file-header-title">
                        <div class="file-header-text">当前伪装</div>
                    </div>
                    <div class="identity-file" id="currentDisguiseDisplay">
                        <!-- 伪装档案内容将在这里动态生成 -->
                    </div>
                </div>
            `
        });

        // 更改伪装视图
        const editView = this.domUtils.create('div', {
            className: 'disguise-edit-view',
            id: 'disguiseEditView',
            style: { display: 'none' }
        });

        // 伪装表单容器
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

        // 组装伪装页面
        editView.appendChild(formContainer);
        disguiseContainer.appendChild(disguiseNav);
        disguiseContainer.appendChild(currentView);
        disguiseContainer.appendChild(editView);
        disguisePage.appendChild(disguiseContainer);

        // 页脚
        const footer = this.domUtils.create('div', {
            className: 'status-footer',
            innerHTML: `
                <div class="status-nav">
                    <button id="basicInfoButton" class="terminal-button active">基本档案</button>
                    <button id="disguiseButton" class="terminal-button">伪装系统</button>
                </div>
                <div class="status-exit">按 F1 返回终端</div>
            `
        });
        
        // 组装所有部分
        content.appendChild(leftPanel);
        content.appendChild(rightPanel);
        rightPanel.appendChild(basicInfoPage);
        rightPanel.appendChild(disguisePage);
        statusInterface.appendChild(header);
        statusInterface.appendChild(content);
        statusInterface.appendChild(footer);
        
        // 添加到屏幕
        screen.appendChild(statusInterface);
    }
    
    // 显示界面
    show() {
        if (this.statusInterface) {
            this.domUtils.toggle(this.statusInterface, true, 'flex');
        }
    }
    
    // 隐藏界面
    hide() {
        if (this.statusInterface) {
            this.domUtils.toggle(this.statusInterface, false);
        }
    }
    
    // 切换页面
    showBasicInfoPage() {
        this.domUtils.toggle(this.basicInfoPage, true, 'flex');
        this.domUtils.toggle(this.disguisePage, false);
        
        // 更新按钮状态
        this.domUtils.addClass('#basicInfoButton', 'active');
        this.domUtils.removeClass('#disguiseButton', 'active');
    }
    
    showDisguisePage() {
        this.domUtils.toggle(this.basicInfoPage, false);
        this.domUtils.toggle(this.disguisePage, true, 'flex');
        
        // 更新按钮状态
        this.domUtils.removeClass('#basicInfoButton', 'active');
        this.domUtils.addClass('#disguiseButton', 'active');
    }
    
    // 显示当前伪装视图
    showCurrentDisguiseView() {
        this.domUtils.toggle('#disguiseCurrentView', true, 'flex');
        this.domUtils.toggle('#disguiseEditView', false);
        this.domUtils.toggle('#editDisguiseButton', true, 'block');
        this.domUtils.toggle('#quickClearDisguiseButton', true, 'block');
        this.domUtils.toggle('#backToCurrentButton', false);
    }

    // 显示更改伪装视图
    showEditDisguiseView() {
        this.domUtils.toggle('#disguiseCurrentView', false);
        this.domUtils.toggle('#disguiseEditView', true, 'flex');
        this.domUtils.toggle('#editDisguiseButton', false);
        this.domUtils.toggle('#quickClearDisguiseButton', false);
        this.domUtils.toggle('#backToCurrentButton', true, 'block');
    }
    
    // 更新身份显示
    updateRealIdentity(identity) {
        if (this.realIdentityDisplay) {
            this.realIdentityDisplay.innerHTML = this.formatIdentityDisplay(identity);
        }
    }
    
    updateCoverIdentity(identity) {
        if (this.coverIdentityDisplay) {
            this.coverIdentityDisplay.innerHTML = this.formatIdentityDisplay(identity);
        }
    }
    
    updateDisguiseIdentity(identity) {
        const disguiseDisplay = this.domUtils.get('#currentDisguiseDisplay');
        if (disguiseDisplay) {
            // 使用与基本档案相同的格式化方法，但适当调整
            disguiseDisplay.innerHTML = identity ? 
                this.formatDisguiseFileDisplay(identity) : 
                '<p class="no-disguise">无伪装</p>';
                
            // 设置国籍特定样式
            disguiseDisplay.className = 'identity-file';
            if (identity) {
                // 移除所有国籍类
                this.domUtils.removeClass(disguiseDisplay, 
                    'nationality-usa', 'nationality-uk', 
                    'nationality-france', 'nationality-soviet'
                );
                
                // 添加对应国籍类
                switch(identity.nationality) {
                    case "美国": this.domUtils.addClass(disguiseDisplay, 'nationality-usa'); break;
                    case "英国": this.domUtils.addClass(disguiseDisplay, 'nationality-uk'); break;
                    case "法国": this.domUtils.addClass(disguiseDisplay, 'nationality-france'); break;
                    case "苏联": this.domUtils.addClass(disguiseDisplay, 'nationality-soviet'); break;
                }
            }
        }
    }
    
    // 格式化身份显示
    formatIdentityDisplay(identity) {
        if (!identity) return '<p class="no-identity">身份不明</p>';
        
        let html = '<div class="identity-card">';
        
        html += `<div class="identity-item">
            <span class="item-label">国籍:</span>
            <span class="item-value">${identity.nationality}</span>
        </div>`;
        
        html += `<div class="identity-item">
            <span class="item-label">身份类型:</span>
            <span class="item-value">${identity.type}</span>
        </div>`;
        
        if (identity.function) {
            html += `<div class="identity-item">
                <span class="item-label">职能:</span>
                <span class="item-value">${identity.function}</span>
            </div>`;
        }
        
        if (identity.organization) {
            html += `<div class="identity-item">
                <span class="item-label">机构:</span>
                <span class="item-value">${identity.organization}</span>
            </div>`;
        }
        
        html += '</div>';
        return html;
    }

    // 伪装档案格式化方法
    formatDisguiseFileDisplay(identity) {
        if (!identity) return '<p class="no-disguise">无伪装</p>';
        
        // 为伪装档案选择格式
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
                <div class="file-row">
                    <div class="file-label">国籍:</div>
                    <div class="file-value">${identity.nationality}</div>
                </div>
                <div class="file-row">
                    <div class="file-label">身份类型:</div>
                    <div class="file-value">${identity.type}</div>
                </div>`;
        
        if (identity.function) {
            html += `
                <div class="file-row">
                    <div class="file-label">职能:</div>
                    <div class="file-value">${identity.function}</div>
                </div>`;
        }
        
        if (identity.organization) {
            html += `
                <div class="file-row">
                    <div class="file-label">隶属机构:</div>
                    <div class="file-value">${identity.organization}</div>
                </div>`;
        }
        
        // 伪装特有信息
        html += `
            </div>
            <div class="file-section">
                <div class="section-title">伪装信息</div>
                <div class="file-row">
                    <div class="file-label">启用时间:</div>
                    <div class="file-value">${this.getCurrentTimeString()}</div>
                </div>
                <div class="file-row">
                    <div class="file-label">状态:</div>
                    <div class="file-value">有效</div>
                </div>
            </div>
        </div>
        <div class="file-stamp">${stampText}</div>`;
        
        return html;
    }

    // 获取当前时间字符串的辅助方法
    getCurrentTimeString() {
        // 使用固定的1983年，但保留当前的月份、日期和时间
        const now = new Date();
        const year = 1983; // 固定为1983年
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
    
    // 填充下拉选择框
    populateNationalitySelect(nationalities) {
        if (this.nationalitySelect) {
            this.nationalitySelect.innerHTML = '';
            nationalities.forEach(nationality => {
                const option = this.domUtils.create('option', {
                    value: nationality,
                    textContent: nationality
                });
                this.nationalitySelect.appendChild(option);
            });
        }
    }
    
    populateTypeSelect(types) {
        if (this.typeSelect) {
            this.typeSelect.innerHTML = '';
            types.forEach(type => {
                const option = this.domUtils.create('option', {
                    value: type,
                    textContent: type
                });
                this.typeSelect.appendChild(option);
            });
        }
    }
    
    populateFunctionSelect(functions) {
        if (this.functionSelect) {
            this.functionSelect.innerHTML = '';
            
            // 添加空选项
            const emptyOption = this.domUtils.create('option', {
                value: '',
                textContent: '-- 选择职能 --'
            });
            this.functionSelect.appendChild(emptyOption);
            
            // 添加可用职能
            functions.forEach(func => {
                const option = this.domUtils.create('option', {
                    value: func,
                    textContent: func
                });
                this.functionSelect.appendChild(option);
            });
        }
    }
    
    populateOrganizationSelect(organizations) {
        if (this.organizationSelect) {
            this.organizationSelect.innerHTML = '';
            
            // 检查是否有可用机构
            if (organizations.length === 0) {
                // 没有可用机构时，显示"无机构"选项
                const noOrgOption = this.domUtils.create('option', {
                    value: '',
                    textContent: '-- 无机构 --',
                    disabled: true,
                    selected: true
                });
                this.organizationSelect.appendChild(noOrgOption);
                
                // 可以选择禁用整个选择框
                this.organizationSelect.disabled = true;
            } else {
                // 有可用机构时，启用选择框
                this.organizationSelect.disabled = false;
                
                // 添加空选项
                const emptyOption = this.domUtils.create('option', {
                    value: '',
                    textContent: '-- 选择机构 --'
                });
                this.organizationSelect.appendChild(emptyOption);
                
                // 添加可用机构
                organizations.forEach(org => {
                    const option = this.domUtils.create('option', {
                        value: org,
                        textContent: org
                    });
                    this.organizationSelect.appendChild(option);
                });
            }
        }
    }
    
    // 更新颜色模式
    updateColorMode(isAmber) {
        if (this.statusInterface) {
            if (isAmber) {
                this.domUtils.removeClass(this.statusInterface, 'green-mode');
                this.domUtils.addClass(this.statusInterface, 'amber-mode');
            } else {
                this.domUtils.removeClass(this.statusInterface, 'amber-mode');
                this.domUtils.addClass(this.statusInterface, 'green-mode');
            }
        }
    }

    formatFileDisplay(identity, isSecret = false) {
        if (!identity) return '<p class="no-identity">身份不明</p>';
        
        // 根据国籍选择不同的文档格式和文本
        let headerTitle = '';
        let headerSubtitle = '';
        let stampText = '';
        
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
                <div class="file-row">
                    <div class="file-label">国籍:</div>
                    <div class="file-value">${identity.nationality}</div>
                </div>
                <div class="file-row">
                    <div class="file-label">身份类型:</div>
                    <div class="file-value">${identity.type}</div>
                </div>`;
        
        if (identity.function) {
            html += `
                <div class="file-row">
                    <div class="file-label">职能:</div>
                    <div class="file-value">${identity.function}</div>
                </div>`;
        }
        
        if (identity.organization) {
            html += `
                <div class="file-row">
                    <div class="file-label">隶属机构:</div>
                    <div class="file-value">${identity.organization}</div>
                </div>`;
        }
        
        // 根据身份类型添加额外信息
        html += `
            </div>
            <div class="file-section">
                <div class="section-title">附加信息</div>`;
        
        // 根据身份类型生成不同的附加信息
        if (identity.type === "情报人员") {
            html += `
                <div class="file-row">
                    <div class="file-label">安全级别:</div>
                    <div class="file-value">${isSecret ? "α" : "β"}</div>
                </div>
                <div class="file-row">
                    <div class="file-label">行动许可:</div>
                    <div class="file-value">${isSecret ? "无限制" : "有限"}</div>
                </div>`;
        } else if (identity.type === "外交人员") {
            html += `
                <div class="file-row">
                    <div class="file-label">外交级别:</div>
                    <div class="file-value">${isSecret ? "特级" : "普通"}</div>
                </div>
                <div class="file-row">
                    <div class="file-label">外交豁免:</div>
                    <div class="file-value">是</div>
                </div>`;
        } else {
            html += `
                <div class="file-row">
                    <div class="file-label">备注:</div>
                    <div class="file-value">${isSecret ? "此档案包含敏感信息" : "标准档案"}</div>
                </div>`;
        }
        
        html += `
            </div>
        </div>
        <div class="file-stamp">${stampText}</div>`;
        
        return html;
    }

    // 辅助方法 - 生成随机代码
    generateRandomCode(length) {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}