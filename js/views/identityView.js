// js/views/identityView.js
class IdentityView {
    constructor() {
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
        if (!document.getElementById('statusInterface')) {
            this.createStatusInterface();
        }
        
        // 获取DOM元素引用
        this.statusInterface = document.getElementById('statusInterface');
        this.basicInfoPage = document.getElementById('basicInfoPage');
        this.disguisePage = document.getElementById('disguisePage');
        
        this.playerAvatar = document.getElementById('playerAvatar');
        this.playerStats = document.getElementById('playerStats');
        
        this.realIdentityDisplay = document.getElementById('realIdentityDisplay');
        this.coverIdentityDisplay = document.getElementById('coverIdentityDisplay');
        this.disguiseIdentityDisplay = document.getElementById('currentDisguiseDisplay');
        
        this.nationalitySelect = document.getElementById('nationalitySelect');
        this.typeSelect = document.getElementById('typeSelect');
        this.functionSelect = document.getElementById('functionSelect');
        this.organizationSelect = document.getElementById('organizationSelect');
        this.applyDisguiseButton = document.getElementById('applyDisguiseButton');
        this.clearDisguiseButton = document.getElementById('clearDisguiseButton');
        
        // 初始显示基础信息页
        this.showBasicInfoPage();
    }
    
    // 创建状态界面
    createStatusInterface() {
        const screen = document.querySelector('.screen');
        
        // 创建主容器
        const statusInterface = document.createElement('div');
        statusInterface.id = 'statusInterface';
        statusInterface.className = 'status-interface';
        statusInterface.style.display = 'none';
        
        // 创建页眉
        const header = document.createElement('div');
        header.className = 'status-header';
        header.innerHTML = `
            <div class="status-title">特工档案系统 v1.0</div>
            <div class="status-security">安全级别: 最高机密</div>
        `;
        
        // 创建主内容区
        const content = document.createElement('div');
        content.className = 'status-content';
        
        // 左侧面板 - 基础信息
        const leftPanel = document.createElement('div');
        leftPanel.className = 'status-left-panel';
        leftPanel.innerHTML = `
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
        `;
        
        // 右侧面板 - 身份信息
        const rightPanel = document.createElement('div');
        rightPanel.className = 'status-right-panel';
        
        // 基础信息页面
        const basicInfoPage = document.createElement('div');
        basicInfoPage.id = 'basicInfoPage';
        basicInfoPage.className = 'identity-page';
        basicInfoPage.innerHTML = `
            <div class="identity-section">
                <h3>真实身份</h3>
                <div id="realIdentityDisplay" class="identity-display"></div>
            </div>
            <div class="identity-section">
                <h3>表面身份</h3>
                <div id="coverIdentityDisplay" class="identity-display"></div>
            </div>
        `;
        
        // 伪装页面
        const disguisePage = document.createElement('div');
        disguisePage.id = 'disguisePage';
        disguisePage.className = 'identity-page';
        disguisePage.style.display = 'none';
        disguisePage.innerHTML = `
            <div class="disguise-current">
                <h3>当前伪装</h3>
                <div id="currentDisguiseDisplay" class="identity-display"></div>
            </div>
            <div class="disguise-form">
                <h3>更改伪装</h3>
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
            </div>
        `;
        
        // 将两个页面添加到右侧面板
        rightPanel.appendChild(basicInfoPage);
        rightPanel.appendChild(disguisePage);
        
        // 页脚
        const footer = document.createElement('div');
        footer.className = 'status-footer';
        footer.innerHTML = `
            <div class="status-nav">
                <button id="basicInfoButton" class="terminal-button active">基本档案</button>
                <button id="disguiseButton" class="terminal-button">伪装系统</button>
            </div>
            <div class="status-exit">按 F1 返回终端</div>
        `;
        
        // 组装所有部分
        content.appendChild(leftPanel);
        content.appendChild(rightPanel);
        statusInterface.appendChild(header);
        statusInterface.appendChild(content);
        statusInterface.appendChild(footer);
        
        // 添加到屏幕
        screen.appendChild(statusInterface);
    }
    
    // 显示界面
    show() {
        // 不再处理其他界面的显示/隐藏
        // 只处理自己的状态
        if (this.statusInterface) {
            this.statusInterface.style.display = 'flex';
        }
    }

    
    // 隐藏界面
    hide() {
        // 只处理自己的隐藏，不切换到其他界面
        if (this.statusInterface) {
            this.statusInterface.style.display = 'none';
        }
    }
    
    // 切换页面
    showBasicInfoPage() {
        this.basicInfoPage.style.display = 'flex';
        this.disguisePage.style.display = 'none';
        
        // 更新按钮状态
        document.getElementById('basicInfoButton').classList.add('active');
        document.getElementById('disguiseButton').classList.remove('active');
    }
    
    showDisguisePage() {
        this.basicInfoPage.style.display = 'none';
        this.disguisePage.style.display = 'flex';
        
        // 更新按钮状态
        document.getElementById('basicInfoButton').classList.remove('active');
        document.getElementById('disguiseButton').classList.add('active');
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
        if (this.disguiseIdentityDisplay) {
            this.disguiseIdentityDisplay.innerHTML = identity ? 
                this.formatIdentityDisplay(identity) : 
                '<p class="no-disguise">无伪装</p>';
        }
    }
    
    // 格式化身份显示
    formatIdentityDisplay(identity) {
        if (!identity) return '<p class="no-identity">身份不明</p>';
        
        let html = '<div class="identity-card">';
        
        html += `<div class="identity-item nationality">${identity.nationality}</div>`;
        html += `<div class="identity-item type">${identity.type}</div>`;
        
        if (identity.function) {
            html += `<div class="identity-item function">${identity.function}</div>`;
        }
        
        if (identity.organization) {
            html += `<div class="identity-item organization">${identity.organization}</div>`;
        }
        
        html += '</div>';
        return html;
    }
    
    // 填充下拉选择框
    populateNationalitySelect(nationalities) {
        if (this.nationalitySelect) {
            this.nationalitySelect.innerHTML = '';
            nationalities.forEach(nationality => {
                const option = document.createElement('option');
                option.value = nationality;
                option.textContent = nationality;
                this.nationalitySelect.appendChild(option);
            });
        }
    }
    
    populateTypeSelect(types) {
        if (this.typeSelect) {
            this.typeSelect.innerHTML = '';
            types.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                this.typeSelect.appendChild(option);
            });
        }
    }
    
    populateFunctionSelect(functions) {
        if (this.functionSelect) {
            this.functionSelect.innerHTML = '';
            
            // 添加空选项
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '-- 选择职能 --';
            this.functionSelect.appendChild(emptyOption);
            
            // 添加可用职能
            functions.forEach(func => {
                const option = document.createElement('option');
                option.value = func;
                option.textContent = func;
                this.functionSelect.appendChild(option);
            });
        }
    }
    
    populateOrganizationSelect(organizations) {
        if (this.organizationSelect) {
            this.organizationSelect.innerHTML = '';
            
            // 添加空选项
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '-- 选择机构 --';
            this.organizationSelect.appendChild(emptyOption);
            
            // 添加可用机构
            organizations.forEach(org => {
                const option = document.createElement('option');
                option.value = org;
                option.textContent = org;
                this.organizationSelect.appendChild(option);
            });
        }
    }
    
    // 更新颜色模式
    updateColorMode(isAmber) {
        if (this.statusInterface) {
            if (isAmber) {
                this.statusInterface.classList.remove('green-mode');
                this.statusInterface.classList.add('amber-mode');
            } else {
                this.statusInterface.classList.remove('amber-mode');
                this.statusInterface.classList.add('green-mode');
            }
        }
    }
}