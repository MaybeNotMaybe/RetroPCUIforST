// js/controllers/identityController.js
class IdentityController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        
        // 初始化视图
        this.view.initialize(); // 视图的初始化通常是同步的DOM操作
        
        // 追踪可见性状态
        this.isVisible = false;
        this.currentIdentityType = 'cover'; // 用于档案文件区域的默认显示类型 (真实/表面)
    }
    
    // 初始化控制器
    async initialize() {
        // 设置事件监听器
        this.setupEventListeners(); // 事件监听器设置通常是同步的
        
        // 填充表单选择框
        this.populateFormSelects();
        
        // 更新身份显示
        await this.updateIdentityDisplays();
        
        // 默认显示基本档案页面
        this.view.showBasicInfoPage(); // 或者伪装页面，根据产品需求
        // this.view.showDisguisePage(); // 如果默认显示伪装页

        // 初始化档案视图 - 默认显示表面身份
        // this.currentIdentityType 已在构造函数中设置
    
        // 直接设置档案显示为表面身份
        const identityFile = document.getElementById('identityFile');
        if (identityFile) {
            try {
                const coverId = await this.model.getCoverIdentity();
                if (coverId) {
                    // 更新档案内容为表面身份
                    identityFile.innerHTML = this.view.formatFileDisplay(coverId, false);
                    
                    // 设置表面身份对应的国籍样式
                    identityFile.className = 'identity-file'; // 重置类名
                    const nationality = coverId.nationality;
                    if (nationality === "美国") identityFile.classList.add('nationality-usa');
                    else if (nationality === "英国") identityFile.classList.add('nationality-uk');
                    else if (nationality === "法国") identityFile.classList.add('nationality-france');
                    else if (nationality === "苏联") identityFile.classList.add('nationality-soviet');
                } else {
                    identityFile.innerHTML = this.view.formatFileDisplay(null, false); // 处理身份为空的情况
                }
            } catch (error) {
                console.error("初始化时设置表面身份显示失败:", error);
                identityFile.innerHTML = "<p>加载身份信息失败...</p>";
            }
        }

        // 监听身份变更事件，以便在其他地方修改身份后更新视图
        EventBus.on('playerIdentityChanged', async (eventData) => {
            console.log(`捕获到 playerIdentityChanged 事件:`, eventData);
            await this.updateIdentityDisplays(); // 更新所有相关的身份显示
            // 如果当前显示的档案文件是变更的类型，也需要特别更新它
            if (eventData.type === this.currentIdentityType || 
                (eventData.type === window.lorebookController.model.PLAYER_IDENTITY_SUFFIX_DISGUISE && this.view.disguisePage.style.display !== 'none')) {
                await this.switchIdentityView(this.currentIdentityType); // 重新加载当前显示的身份类型
            }
        });
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
                // 切换到基础信息页时，默认显示表面身份
                this.currentIdentityType = 'cover';
                this.switchIdentityView('cover'); // 确保档案文件区域更新
            });
        }
        
        if (disguiseButton) {
            disguiseButton.addEventListener('click', () => {
                window.audioManager.play('functionButton');
                this.view.showDisguisePage();
                // 伪装页面有自己的显示逻辑，不需要在这里切换 identityFile
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
            this.view.applyDisguiseButton.addEventListener('click', async () => { // 声明为 async
                await this.applyDisguise(); // 调用异步方法
                this.view.showCurrentDisguiseView(); // 应用后返回当前伪装视图
            });
        }
        
        // 清除伪装按钮
        if (this.view.clearDisguiseButton) {
            this.view.clearDisguiseButton.addEventListener('click', async () => { // 声明为 async
                await this.clearDisguise(); // 调用异步方法
                this.view.showCurrentDisguiseView(); // 清除后返回当前伪装视图
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
            quickClearDisguiseButton.addEventListener('click', async () => { // 声明为 async
                window.audioManager.play('systemBeep');
                await this.clearDisguise(); // 调用异步方法
                // 清除伪装后，伪装视图会自动更新，因为 updateDisguiseIdentity 会被调用
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
        
        // 档案文件区域的标签页切换
        document.querySelectorAll('.file-tab').forEach(tab => {
            tab.addEventListener('click', async (e) => { // 声明为 async
                const identityType = e.target.getAttribute('data-identity-type'); // 'real' 或 'cover'
                await this.switchIdentityView(identityType); // 调用异步方法
                
                // 更新标签状态
                document.querySelectorAll('.file-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                // 播放切换音效
                window.audioManager.play('functionButton');
            });
        });

        // 档案文件区域点击事件 - 用于在真实身份和表面身份间切换
        const identityFile = document.getElementById('identityFile');
        if (identityFile) {
            identityFile.addEventListener('click', async () => { // 声明为 async
                // 切换身份视图 (真实/表面)
                await this.toggleIdentityFileView(); // 调用新的异步方法
                
                // 播放切换音效
                if (window.audioManager) {
                    window.audioManager.play('functionButton');
                }
            });
        }

        // 当前伪装显示区域点击事件 - 用于切换到编辑伪装视图
        const currentDisguiseDisplay = document.getElementById('currentDisguiseDisplay');
        if (currentDisguiseDisplay) {
            currentDisguiseDisplay.addEventListener('click', () => {
                this.view.showEditDisguiseView();
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
        const nationality = this.view.nationalitySelect.value;
        const type = this.view.typeSelect.value;
        const func = this.view.functionSelect.value || null; // 如果未选择则为null
        const organization = this.view.organizationSelect.value || null; // 如果未选择则为null
        
        // 设置伪装身份
        await this.model.setDisguiseIdentity(nationality, type, func, organization);
        
        // 更新伪装显示
        // setDisguiseIdentity 内部会触发 'playerIdentityChanged' 事件，
        // EventBus 监听器会自动调用 updateIdentityDisplays，其中包含对伪装身份的更新。
        // 因此，这里可能不需要显式调用 this.view.updateDisguiseIdentity
        // 但为了确保即时性，可以保留，或者依赖事件总线。
        // 为确保视图立即响应，可以这样做：
        const newDisguise = await this.model.getDisguiseIdentity();
        this.view.updateDisguiseIdentity(newDisguise); // 直接更新伪装视图部分
        
        // 播放音效
        if (window.audioManager) {
            window.audioManager.play('systemBeep');
        }
    }
    
    // 清除伪装
    async clearDisguise() {
        await this.model.clearDisguise(); // 异步清除模型中的伪装
        
        // clearDisguise 内部会触发 'playerIdentityChanged' 事件，
        // EventBus 监听器会自动调用 updateIdentityDisplays。
        // this.view.updateDisguiseIdentity(null); // 可以显式更新，或依赖事件总线
        // 为确保视图立即响应：
        this.view.updateDisguiseIdentity(null); // 直接更新伪装视图部分为无伪装

        // 播放音效
        if (window.audioManager) {
            window.audioManager.play('systemBeep');
        }
    }
    
    // 更新所有身份显示
    async updateIdentityDisplays() {
        try {
            // 这些方法现在是异步的，因为它们从模型获取数据
            // 视图的更新方法本身是同步的，但它们依赖异步获取的数据
            const realId = await this.model.getRealIdentity();
            this.view.updateRealIdentity(realId); // 这个方法在 identityView 中可能不存在，需要确认

            const coverId = await this.model.getCoverIdentity();
            // this.view.updateCoverIdentity(coverId); // 这个方法在 identityView 中可能不存在

            // 更新档案文件区域（如果当前显示的是表面或真实身份）
            if (this.view.basicInfoPage.style.display !== 'none') {
                 await this.switchIdentityView(this.currentIdentityType);
            }

            const disguiseId = await this.model.getDisguiseIdentity();
            this.view.updateDisguiseIdentity(disguiseId); // 这个是明确存在的，用于伪装系统页面

        } catch (error) {
            console.error("更新身份显示失败:", error);
        }
    }
        
    // 切换身份界面可见性 (异步，因为它可能调用异步的 switchIdentityView)
    async toggleOverallIdentityView() { // 重命名以区别于 toggleIdentityFileView
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
                this.isVisible = false; // 更新状态
            } else {
                // 否则切到档案
                window.interfaceManager.switchTo('identity');
                this.isVisible = true; // 更新状态
                // 确保显示表面身份，不管当前状态如何
                this.currentIdentityType = 'cover'; // 默认显示表面身份
                await this.switchIdentityView('cover'); // 更新档案文件区域
                this.view.showBasicInfoPage(); // 确保显示的是基础信息页
                // 激活对应的标签页
                document.querySelectorAll('.file-tab').forEach(t => t.classList.remove('active'));
                document.querySelector('.file-tab[data-identity-type="cover"]')?.classList.add('active');

            }
            return true;
        }
        
        // 旧的逻辑 (如果 interfaceManager 不存在)
        if (this.isVisible) {
            this.hide(); // 假设 hide 是同步的
        } else {
            await this.show(); // show 现在可能是异步的，因为它更新显示
        }
        return this.isVisible;
    }
    
    // 显示身份界面
    async show() {
        // 更新显示内容
        await this.updateIdentityDisplays();
        this.view.show(); // View 的 show 方法本身是同步的 (显示DOM)
        this.isVisible = true;
    }
    
    // 隐藏身份界面
    hide() {
        this.view.hide(); // View 的 hide 方法本身是同步的 (隐藏DOM)
        this.isVisible = false;
    }

    // 切换档案文件区域显示的身份 (真实身份 vs 表面身份)
    async switchIdentityView(identityTypeSuffix) { // 'real' or 'cover'
        const identityFile = document.getElementById('identityFile');
        if (!identityFile) return;
        
        this.currentIdentityType = identityTypeSuffix; // 更新当前显示的类型

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
                identityFile.classList.remove(
                    'nationality-usa', 'nationality-uk', 
                    'nationality-france', 'nationality-soviet'
                );
                // 添加对应国籍类
                switch(identityData.nationality) {
                    case "美国": identityFile.classList.add('nationality-usa'); break;
                    case "英国": identityFile.classList.add('nationality-uk'); break;
                    case "法国": identityFile.classList.add('nationality-france'); break;
                    case "苏联": identityFile.classList.add('nationality-soviet'); break;
                }
            }
        } catch (error) {
            console.error(`切换身份视图到 ${identityTypeSuffix} 失败:`, error);
            identityFile.innerHTML = "<p>加载身份信息失败...</p>";
        }
    }

    // 点击档案文件时，在真实身份和表面身份之间切换
    async toggleIdentityFileView() {
        const newType = (this.currentIdentityType === 'cover') ? 'real' : 'cover';
        await this.switchIdentityView(newType); // 更新显示

        // 更新标签页的激活状态
        document.querySelectorAll('.file-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.file-tab[data-identity-type="${newType}"]`)?.classList.add('active');
    }
    
    // 检查身份是否被识破
    async checkIdentityBlown(detectionRate) {
        // 这个方法现在需要是异步的，因为它依赖异步的 getDisguiseIdentity
        const isBlown = await this.model.checkDisguiseDetection(detectionRate);
        
        if (isBlown) {
            // 伪装被识破，恢复表面身份
            await this.model.blowDisguise(); // blowDisguise 内部会清除伪装并触发事件
            // 事件监听器会调用 updateIdentityDisplays，从而更新伪装视图
            // this.view.updateDisguiseIdentity(null); // 可以显式调用，或依赖事件
            return true;
        }
        return false;
    }
    
    // 设置颜色模式
    updateColorMode(isAmber) {
        this.view.updateColorMode(isAmber);
    }

    // F2按钮调用的方法
    async showHideIdentityView() {
        await this.toggleOverallIdentityView(); // 调用重命名后的方法
    }
}
