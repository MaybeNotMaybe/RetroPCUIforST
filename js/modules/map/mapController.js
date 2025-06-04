// js/controllers/mapController.js
class MapController {
    constructor(model, view, serviceLocator = null) {
        this.model = model;
        this.view = view;
        this.serviceLocator = serviceLocator || window.ServiceLocator;
        
        // 获取依赖服务
        this.domUtils = this.serviceLocator?.get('domUtils') || window.DOMUtils;
        this.storage = this.serviceLocator?.get('storage') || window.StorageUtils;
        this.eventBus = this.serviceLocator?.get('eventBus') || window.EventBus || EventBus;
        this.audio = this.serviceLocator?.get('audio') || window.audioManager;
        this.interfaceService = this.serviceLocator?.get('interface');
        this.systemService = this.serviceLocator?.get('system');
        
        // 初始化状态
        this.cursorPosition = { x: 0, y: 0 };
        this.locationPositions = [];
        this.currentLocationIndex = -1;
        this.regionPositions = [];
        this.currentRegionIndex = -1;

        this.selectedListIndex = 0;  // 当前在列表中选中的索引
        this.currentListItems = [];  // 当前列表中的项目数组
        
        // 地点视图的焦点状态管理
        this.locationViewFocusIndex = 0; // 0: 地点详情, 1: 访问状态框
        this.locationViewFocusItems = ['locationInfo', 'locationFooter'];
        
        // 初始化UI
        this.view.initializeUI();
        
        // 绑定事件
        this.bindEvents();

        // 订阅测试模式变化事件
        this.eventBus.on('testModeChanged', (isEnabled) => {
            console.log(`地图控制器测试模式: ${isEnabled ? '已启用' : '已禁用'}`);
        });
        
        console.log("地图控制器已初始化");
    }
    
    // 绑定事件处理程序
    bindEvents() {
        // 监听位置选择事件
        this.eventBus.on('locationSelected', (locationName) => {
            this.handleLocationSelection(locationName);
        });
        
        // 监听区域选择事件
        this.eventBus.on('regionSelected', (regionName) => {
            this.handleRegionSelection(regionName);
        });

        // 地图背景点击事件 - 取消选择
        this.domUtils.on(document, 'click', (e) => {
            if (!this.model.isVisible) return;
            
            // 检查点击的是否是地图单元格
            const clickedElement = e.target;
            
            // 只在默认视图或区域视图中忽略详情区域的点击
            // 在位置视图中不忽略，允许详情区域的点击事件正常执行
            if (this.view.viewState !== 'location') {
                // 忽略列表项和详情区域的点击
                if (clickedElement.closest('.map-location-item') || 
                    clickedElement.closest('.map-details-area') ||
                    clickedElement.closest('.map-location-details')) {
                    console.log("忽略列表或详情区域的点击 (非位置视图)");
                    return;
                }
            }
            
            // 根据当前视图状态处理空白区域点击
            if (this.view.viewState === 'location' && this.model.selectedLocation) {
                // 检查是否点击了详情区域
                if (clickedElement.closest('.map-details-area') || 
                    clickedElement.closest('.map-location-details') ||
                    clickedElement.closest('#locationInfoFrame')) {
                    // 在位置视图中点击详情区域，不做任何处理，让事件继续传播
                    console.log("位置视图中点击了详情区域，允许事件传播");
                    return;
                }

                // 在位置视图中点击空白区域，清除选择回到区域视图
                console.log("从位置视图返回区域视图");
                this.clearSelection();
            } else if (this.view.viewState === 'region') {
                // 在区域视图中点击空白区域，返回默认视图
                console.log("从区域视图返回默认视图");
                this._handleExitRegionView();
            }
        });

        // 地图键盘导航
        this.domUtils.on(document, 'keydown', (e) => {
            if (!this.model.isVisible) return;
            
            // 在地点视图中使用不同的键盘处理逻辑
            if (this.view.viewState === 'location') {
                this.handleLocationViewKeyboard(e);
                return;
            }
            
            switch (e.key) {
                // WASD导航
                case 'w':
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateList(-1); // 向上导航列表
                    break;
                case 's':
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateList(1); // 向下导航列表
                    break;
                case 'a':
                case 'ArrowLeft':
                    e.preventDefault();
                    this.navigateViewBackward(); // 类似ESC，返回上一级视图
                    break;
                case 'd':
                case 'ArrowRight':
                    e.preventDefault();
                    this.navigateViewForward(); // 类似Enter，进入下一级视图
                    break;
                
                // 标签间导航
                case 'q':
                    e.preventDefault();
                    this.navigateLocations(-1);
                    break;
                case 'e':
                    e.preventDefault();
                    this.navigateLocations(1);
                    break;
                
                // 选择/取消选择
                case 'Enter':
                    e.preventDefault();
                    this.selectCurrentListItem(); // 选择当前列表项
                    break;
                case 'Escape':
                    e.preventDefault();
                    // 根据当前视图状态处理ESC
                    if (this.view.viewState === 'location') {
                        // 在位置视图中，返回区域视图
                        this.clearSelection();
                    } else if (this.view.viewState === 'region') {
                        // 在区域视图中，返回默认视图
                        this._handleExitRegionView();
                    }
                    break;
            }
        });
        
        // 监听颜色模式变化
        this.eventBus.on('colorModeChanged', (isAmber) => {
            this.view.updateColorMode(isAmber);
        });

        // 监听 runProgram 事件
        this.eventBus.on('runProgram', (data) => {
            if (data.program === 'map' && !this.model.isVisible) {
                this.toggleMapView();
            }
        });
        
        // 监听系统电源变化事件
        this.eventBus.on('systemPowerChange', (isOn) => {
            if (!isOn && this.model.isVisible) {
                // 系统关机时隐藏地图
                this.model.setVisibility(false);
                this.view.hide();
            }
        });
        
        // 监听功能键
        this.domUtils.on(document, 'keydown', (e) => {
            // F1键 - 切换回终端
            if (e.key === 'F1') {
                e.preventDefault(); // 阻止默认行为
                if (this.model.isVisible) {
                    this.toggleMapView();
                }
            }
            
            // F5键 - 显示地图
            if (e.key === 'F5') {
                e.preventDefault(); // 阻止默认行为
                // 检查系统是否可操作
                const isSystemOperational = this.systemService ? 
                    this.systemService.isOperational() : 
                    window.isSystemOperational();
                    
                if (!this.model.isVisible && isSystemOperational) {
                    this.toggleMapView();
                }
            }
        });
    }
    
    // 处理退出区域视图的逻辑
    _handleExitRegionView() {
        const exitedRegionName = this.model.getCurrentRegion();
        let newCursorPosX = 50, newCursorPosY = 50; // 默认值

        if (exitedRegionName) {
            const regionsData = this.model.getAllVisibleRegions();
            const exitedRegion = regionsData[exitedRegionName];
            if (exitedRegion && exitedRegion.coordinates) {
                [newCursorPosX, newCursorPosY] = exitedRegion.coordinates;
            }
        }

        // 清除当前区域
        this.model.setCurrentRegion(null);
        
        // 设置视图状态为默认
        this.view.setViewState('default');
        
        // 更新光标位置
        this.cursorPosition = { x: newCursorPosX, y: newCursorPosY };
        
        // 渲染地图
        this.renderMap();
        
        if (exitedRegionName) {
            // 高亮退出的区域
            this.view.highlightRegion(exitedRegionName);
            
            // 更新当前区域索引
            if (this.regionPositions.length === 0) this.initRegionPositions();
            this.currentRegionIndex = this.regionPositions.findIndex(
                pos => pos.name === exitedRegionName
            );
            
            // 同步更新列表选择索引
            this.updateCurrentListItems();
            const exitedRegionListIndex = this.currentListItems.findIndex(
                item => item.name === exitedRegionName
            );
            
            if (exitedRegionListIndex !== -1) {
                this.selectedListIndex = exitedRegionListIndex;
                // 更新列表高亮显示
                this.view.highlightListItem(this.selectedListIndex);
            }
        }

        // 重置地点视图焦点状态
        this.locationViewFocusIndex = 0;
        this.view.updateLocationViewFocus(this.locationViewFocusIndex);
    }
    
    // 处理位置选择
    handleLocationSelection(locationName) {
        console.log(`处理位置选择: ${locationName}`);
        
        if (this.model.selectLocation(locationName)) {
            const location = this.model.getSelectedLocation();
            
            // 高亮选中的位置
            this.view.highlightLocation(locationName);
            
            // 显示位置详情
            this.view.showLocationDetails(location);
            
            // 更新光标位置
            if (location && location.coordinates) {
                const [x, y] = location.coordinates;
                this.cursorPosition = { x, y };
                this.view.updateCursorPosition(this.cursorPosition);
            }
            
            // 切换到位置详情视图
            if (this.view.viewState !== 'location') {
                this.view.setViewState('location', {
                    x: location.coordinates[0],
                    y: location.coordinates[1]
                });
            } else {
                // 已经是位置详情视图，则重新缩放到新位置
                this.view.zoomAndCenterOn(location.coordinates[0], location.coordinates[1]);
            }
            
            // 重置地点视图焦点状态
            this.locationViewFocusIndex = 0;
            this.view.updateLocationViewFocus(this.locationViewFocusIndex);
            
            return true;
        }
        
        return false;
    }

    // 处理区域选择
    handleRegionSelection(regionName) {
        console.log(`处理区域选择: ${regionName}`);
        
        if (this.model.setCurrentRegion(regionName)) {
            const regions = this.model.getAllVisibleRegions();
            const region = regions[regionName];
            
            if (region) {
                // 更新视图状态为区域缩放
                this.view.setViewState('region', {
                    x: region.coordinates[0],
                    y: region.coordinates[1]
                });
                
                // 获取区域内的位置
                const regionLocations = this.model.getLocationsByRegion(regionName);
                
                // 渲染区域内的位置
                this.view.renderMap(regionLocations, this.model.getCurrentLocation().name, (name, x, y) => {
                    this.handleLocationClick(name, x, y);
                }, this.selectedListIndex);
                
                // 清除选中的位置
                this.model.selectLocation(null);
                this.view.highlightLocation(null);
                this.view.showLocationDetails(null);

                // 初始化位置导航列表
                this.initLocationPositions();
                
                // 更新当前列表项
                this.updateCurrentListItems();
                
                // 查找光标应该移动到的位置
                const currentLocation = this.model.getCurrentLocation().name;
                let targetLocation = null;
                let targetLocationIndex = -1;
                
                // 优先检查当前位置是否在区域内
                if (regionLocations[currentLocation]) {
                    targetLocation = currentLocation;
                    targetLocationIndex = this.currentListItems.findIndex(
                        item => item.name === currentLocation
                    );
                } else {
                    // 否则使用第一个位置
                    targetLocation = Object.keys(regionLocations)[0];
                    targetLocationIndex = 0;
                }
                
                // 设置选择索引
                if (targetLocationIndex !== -1) {
                    this.selectedListIndex = targetLocationIndex;
                    this.view.highlightListItem(this.selectedListIndex);
                }
                
                // 如果找到目标位置，移动光标（但不选择）
                if (targetLocation && regionLocations[targetLocation]) {
                    const [x, y] = regionLocations[targetLocation].coordinates;
                    
                    // 更新光标位置
                    this.cursorPosition = { x, y };
                    this.view.updateCursorPosition(this.cursorPosition);
                    
                    // 更新当前位置索引
                    this.currentLocationIndex = this.locationPositions.findIndex(
                        pos => pos.name === targetLocation
                    );
                    
                    // 仅高亮但不选择
                    this.view.highlightLocation(targetLocation);
                    
                    console.log(`区域视图: 光标移动到位置 ${targetLocation} (${x}, ${y})`);
                }
                
                return true;
            }
        }
        
        return false;
    }

    // 初始化区域位置
    initRegionPositions() {
        this.regionPositions = [];
        const regions = this.model.getAllVisibleRegions();
        
        for (const [name, data] of Object.entries(regions)) {
            const [x, y] = data.coordinates;
            this.regionPositions.push({ 
                x: x, 
                y: y, 
                name: name 
            });
        }
        
        // 对区域位置进行排序
        this.regionPositions.sort((a, b) => {
            const yTolerance = 3;
            if (Math.abs(a.y - b.y) <= yTolerance) {
                return a.x - b.x;
            }
            return a.y - b.y;
        });
    }

    // 处理区域点击
    handleRegionClick(name, x, y) {
        // 更新光标位置
        this.cursorPosition = { x, y };
        this.view.updateCursorPosition(this.cursorPosition);
        
        // 处理区域选择
        this.handleRegionSelection(name);
    }
    
    // 切换地图视图
    toggleMapView(targetVisible = null) {
        // 检查系统是否可操作
        const isSystemOperational = this.systemService ? 
            this.systemService.isOperational() : 
            window.isSystemOperational();
                
        if (!isSystemOperational) {
            console.log("系统未开机，无法切换到地图视图");
            return false;
        }
        
        // 如果没有指定目标状态，则执行反向切换
        const desiredVisible = targetVisible !== null ? targetVisible : !this.model.isVisible;
        
        // 优先使用界面服务
        if (this.interfaceService) {
            // 直接根据目标状态决定切换到哪个界面
            this.interfaceService.switchTo(desiredVisible ? 'map' : 'terminal');
            
            // 确保模型状态与界面状态同步
            if (this.model.isVisible !== desiredVisible) {
                this.model.setVisibility(desiredVisible);
            }
            
            return true;
        }
        
        // 如果界面服务不可用，使用传统方法（保留原有逻辑）
        this.model.setVisibility(desiredVisible);
        const isVisible = this.model.isVisible;
        
        if (isVisible) {
            // 显示地图
            this.view.show();
            
            // 同步当前位置
            // 使用GameCore获取数据，而不是直接引用全局对象
            const gameCore = this.serviceLocator.get('gameCore') || window.GameCore;
            const gameModel = gameCore?.getComponent('gameModel') || (window.gameController?.model);
            
            if (gameModel && gameModel.currentLocation) {
                const gameLocation = gameModel.currentLocation;
                if (gameLocation && this.model.locations[gameLocation]) {
                    this.model.setCurrentLocation(gameLocation);
                }
            }
            
            // 重置到默认视图状态
            this.view.setViewState('default');
            this.model.setCurrentRegion(null);
            
            // 重置选择索引
            this.selectedListIndex = 0;
            
            // 渲染地图
            this.renderMap();
            
            // 初始化列表项并更新高亮
            this.updateCurrentListItems();
            if (this.currentListItems.length > 0) {
                this.view.highlightListItem(this.selectedListIndex);
            }
            
            this.view.showLocationDetails(null);
        } else {
            // 隐藏地图
            this.view.hide();

            // 切换回终端时，自动将焦点设置到命令行输入框
            setTimeout(() => {
                const commandInput = this.domUtils.get('#commandInput');
                if (commandInput && !commandInput.disabled) {
                    commandInput.focus();
                }
            }, 100);
        }

        // 保存当前状态
        this.model.saveState();
        
        // 触发事件通知其他组件
        this.eventBus.emit('mapVisibilityToggled', isVisible);

        return true;
    }

    // 清除当前选择
    clearSelection() {
        const currentViewState = this.view.viewState;
        
        if (this.model.selectedLocation && currentViewState === 'location') {
            // 记录当前选中的地点名称
            const previousSelectedLocation = this.model.selectedLocation;
            
            // 在位置视图中：清除选择并返回区域视图
            this.model.selectLocation(null);
            this.view.highlightLocation(null);
            this.view.showLocationDetails(null);
            
            // 如果有当前区域，返回到区域视图
            const currentRegion = this.model.getCurrentRegion();
            if (currentRegion) {
                const regions = this.model.getAllVisibleRegions();
                const region = regions[currentRegion];
                if (region) {
                    this.view.setViewState('region', {
                        x: region.coordinates[0],
                        y: region.coordinates[1]
                    });
                    
                    // 重新渲染当前区域内的地点
                    const regionLocations = this.model.getLocationsByRegion(currentRegion);
                    this.view.renderMap(regionLocations, this.model.getCurrentLocation().name, (name, x, y) => {
                        this.handleLocationClick(name, x, y);
                    }, this.selectedListIndex);
                    
                    // 更新当前列表项并找到之前选中地点的索引
                    this.updateCurrentListItems();
                    
                    // 找到之前选中的地点在新列表中的索引
                    const previousLocationIndex = this.currentListItems.findIndex(
                        item => item.name === previousSelectedLocation
                    );
                    
                    if (previousLocationIndex !== -1) {
                        this.selectedListIndex = previousLocationIndex;
                        // 更新列表高亮显示
                        this.view.highlightListItem(this.selectedListIndex);
                        
                        // 将光标移动到之前选中的地点位置
                        const selectedItem = this.currentListItems[this.selectedListIndex];
                        if (selectedItem && selectedItem.coordinates) {
                            this.cursorPosition = { 
                                x: selectedItem.coordinates[0], 
                                y: selectedItem.coordinates[1] 
                            };
                            this.view.updateCursorPosition(this.cursorPosition);
                            
                            // 高亮该地点但不选择
                            this.view.highlightLocation(previousSelectedLocation);
                        }
                    }
                }
            }
        } else if (currentViewState === 'region') {
            // 在区域视图中：清除当前区域并返回默认视图
            this._handleExitRegionView();
        }
    }
    
    // 移动光标
    moveCursor(deltaX, deltaY) {
        // 根据当前视图状态选择要导航的位置集合
        if (this.view.viewState === 'default') {
            // 如果区域位置数组为空，初始化它
            if (this.regionPositions.length === 0) {
                this.initRegionPositions();
            }
            
            if (this.regionPositions.length === 0) return;
            
            // 使用区域位置数组进行导航
            this._navigateBetweenPositions(this.regionPositions, this.currentRegionIndex, deltaX, deltaY, (newPos) => {
                // 更新当前区域索引
                this.currentRegionIndex = this.regionPositions.findIndex(
                    pos => pos.x === newPos.x && pos.y === newPos.y
                );
                // 不自动选择区域，只移动光标
                this.cursorPosition = { x: newPos.x, y: newPos.y };
                this.view.updateCursorPosition(this.cursorPosition);
            });
        } else {
            // 在区域视图或位置视图中导航地点
            if (this.locationPositions.length === 0) {
                this.initLocationPositions();
            }
            
            if (this.locationPositions.length === 0) return;
            
            this._navigateBetweenPositions(this.locationPositions, this.currentLocationIndex, deltaX, deltaY, (newPos) => {
                // 更新当前位置索引
                this.currentLocationIndex = this.locationPositions.findIndex(
                    pos => pos.x === newPos.x && pos.y === newPos.y
                );
                // 不自动选择位置，只移动光标
                this.cursorPosition = { x: newPos.x, y: newPos.y };
                this.view.updateCursorPosition(this.cursorPosition);
                
                // 如果是在地点详情视图中，自动选择当前光标下的地点
                if (this.view.viewState === 'location') {
                    // 查找光标所在的地点
                    const locationFound = this.locationPositions[this.currentLocationIndex];
                    if (locationFound && locationFound.name) {
                        this.handleLocationSelection(locationFound.name);
                    }
                }
            });
        }
    }

    _navigateBetweenPositions(positions, currentIndex, deltaX, deltaY, callback) {
        const currentX = this.cursorPosition.x;
        const currentY = this.cursorPosition.y;
        
        // 定义移动速度
        const moveSpeed = 50;
        deltaX *= moveSpeed;
        deltaY *= moveSpeed;
        
        // 确定移动方向
        let direction = '';
        if (deltaX > 0) direction = 'right';
        else if (deltaX < 0) direction = 'left';
        else if (deltaY > 0) direction = 'down';
        else if (deltaY < 0) direction = 'up';
        
        // 设置权重系数
        const primaryAxisWeight = 1.0;   // 主轴权重
        const secondaryAxisWeight = 1.5; // 次轴权重
        
        // 查找最佳位置
        let bestPos = null;
        let lowestScore = Infinity;
        
        for (const pos of positions) {
            // 根据方向过滤
            if ((direction === 'right' && pos.x <= currentX) ||
                (direction === 'left' && pos.x >= currentX) ||
                (direction === 'down' && pos.y <= currentY) ||
                (direction === 'up' && pos.y >= currentY)) {
                continue; // 忽略不在目标方向的位置
            }
            
            // 计算X和Y轴上的距离
            const xDistance = Math.abs(pos.x - currentX);
            const yDistance = Math.abs(pos.y - currentY);
            
            // 根据移动方向计算加权分数
            let score;
            if (direction === 'left' || direction === 'right') {
                // 对于左右移动，X是主轴，Y是次轴
                score = (xDistance * primaryAxisWeight) + (yDistance * secondaryAxisWeight);
            } else {
                // 对于上下移动，Y是主轴，X是次轴
                score = (yDistance * primaryAxisWeight) + (xDistance * secondaryAxisWeight);
            }
            
            // 更新最佳位置
            if (score < lowestScore) {
                lowestScore = score;
                bestPos = pos;
            }
        }
        
        // 如果找到了最佳位置，处理它
        if (bestPos && callback) {
            callback(bestPos);
        }
    }
    
    // 在标签间导航
    navigateLocations(delta) {
        if (this.view.viewState === 'default') {
            // 在默认视图中，在区域之间导航
            if (this.regionPositions.length === 0) {
                this.initRegionPositions();
            }
            
            if (this.regionPositions.length === 0) return;
            
            if (delta > 0) { // E键 - 正向遍历
                this.currentRegionIndex = (this.currentRegionIndex + 1) % this.regionPositions.length;
            } else { // Q键 - 反向遍历
                this.currentRegionIndex = (this.currentRegionIndex - 1 + this.regionPositions.length) % this.regionPositions.length;
            }
            
            // 获取新位置
            const newPos = this.regionPositions[this.currentRegionIndex];
            this.cursorPosition = { x: newPos.x, y: newPos.y };
            
            // 更新视图
            this.view.updateCursorPosition(this.cursorPosition);
            
            // 同步更新列表选择索引
            this.updateCurrentListItems();
            const regionIndex = this.currentListItems.findIndex(
                item => item.name === newPos.name
            );
            if (regionIndex !== -1) {
                this.selectedListIndex = regionIndex;
                this.view.highlightListItem(this.selectedListIndex);
            }
        } else {
            // 在区域视图或位置视图中，在位置之间导航
            if (this.locationPositions.length === 0) {
                this.initLocationPositions();
            }
            
            if (this.locationPositions.length === 0) return;
            
            if (delta > 0) { // E键 - 正向遍历
                this.currentLocationIndex = (this.currentLocationIndex + 1) % this.locationPositions.length;
            } else { // Q键 - 反向遍历
                this.currentLocationIndex = (this.currentLocationIndex - 1 + this.locationPositions.length) % this.locationPositions.length;
            }
            
            // 获取新位置
            const newPos = this.locationPositions[this.currentLocationIndex];
            this.cursorPosition = { x: newPos.x, y: newPos.y };
            
            // 更新视图
            this.view.updateCursorPosition(this.cursorPosition);
            
            // 同步更新列表选择索引
            this.updateCurrentListItems();
            const locationIndex = this.currentListItems.findIndex(
                item => item.name === newPos.name
            );
            if (locationIndex !== -1) {
                this.selectedListIndex = locationIndex;
                this.view.highlightListItem(this.selectedListIndex);
            }

            if (this.view.viewState === 'location' && newPos.name) {
                this.handleLocationSelection(newPos.name);
            }
        }
    }
    
    // 初始化位置数组
    initLocationPositions() {
        this.locationPositions = [];
        
        // 根据当前视图状态选择位置集合
        let locations;
        if (this.view.viewState === 'region') {
            // 区域视图只使用当前区域内的位置
            const currentRegion = this.model.getCurrentRegion();
            locations = currentRegion ? this.model.getLocationsByRegion(currentRegion) : {};
        } else {
            // 位置视图使用所有可见位置
            locations = this.model.getAllVisibleLocations();
        }
        
        for (const [name, data] of Object.entries(locations)) {
            const [x, y] = data.coordinates;
            this.locationPositions.push({ 
                x: x, 
                y: y, 
                name: name 
            });
        }
        
        // 按照Y轴优先，X轴次要的顺序排序
        this.locationPositions.sort((a, b) => {
            const yTolerance = 3;
            
            if (Math.abs(a.y - b.y) <= yTolerance) {
                return a.x - b.x;
            }
            return a.y - b.y;
        });
    }
    
    // 选择光标位置的单元格
    selectAtCursor() {
        if (this.view.viewState === 'default') {
            // 在默认视图中，查找光标下的区域
            for (const [name, data] of Object.entries(this.model.getAllVisibleRegions())) {
                const [x, y] = data.coordinates;
                if (Math.abs(x - this.cursorPosition.x) < 5 && Math.abs(y - this.cursorPosition.y) < 5) {
                    // 找到区域，选中它
                    this.handleRegionSelection(name);
                    return;
                }
            }
        } else {
            // 在区域视图或位置视图中
            if (this.locationPositions.length > 0 && this.currentLocationIndex >= 0) {
                // 直接使用当前选中的地点
                const selectedPosition = this.locationPositions[this.currentLocationIndex];
                if (selectedPosition && selectedPosition.name) {
                    // 选择当前索引对应的地点
                    this.handleLocationSelection(selectedPosition.name);
                    return;
                }
            }
            
            // 如果没有当前索引或索引无效，回退到原来的坐标查找方法
            let locations;
            if (this.view.viewState === 'region') {
                const currentRegion = this.model.getCurrentRegion();
                locations = currentRegion ? this.model.getLocationsByRegion(currentRegion) : {};
            } else {
                locations = this.model.getAllVisibleLocations();
            }

            for (const [name, data] of Object.entries(locations)) {
                const [x, y] = data.coordinates;
                if (Math.abs(x - this.cursorPosition.x) < 5 && Math.abs(y - this.cursorPosition.y) < 5) {
                    this.handleLocationSelection(name);
                    return;
                }
            }
        }
    }
    
    // 渲染地图
    renderMap() {
        // 获取当前位置信息
        const currentLocationData = this.model.getCurrentLocation();
        const currentLocationName = currentLocationData.name;
        
        // 更新位置显示
        this.view.updateCurrentLocation(currentLocationName);
        
        // 根据当前视图状态决定显示什么
        if (this.view.viewState === 'default') {
            // 显示区域标记
            const regions = this.model.getAllVisibleRegions();
            this.view.renderRegions(regions, (name, x, y) => {
                this.handleRegionClick(name, x, y);
            }, this.selectedListIndex);
            
            // 初始化区域导航数组
            this.initRegionPositions();
        } else {
            // 显示位置标记
            const currentRegion = this.model.getCurrentRegion();
            let locations;
            
            if (currentRegion && this.view.viewState === 'region') {
                // 在区域视图中只显示该区域的位置
                locations = this.model.getLocationsByRegion(currentRegion);
            } else {
                // 在位置详情视图中显示所有可见位置
                locations = this.model.getAllVisibleLocations();
            }
            
            // 传递当前位置和点击处理函数以及selectedIndex
            this.view.renderMap(locations, currentLocationName, (name, x, y) => {
                this.handleLocationClick(name, x, y);
            }, this.selectedListIndex);
            
            // 初始化位置导航数组
            this.initLocationPositions();
        }
        
        // 设置光标位置
        this.view.updateCursorPosition(this.cursorPosition);
    }
    
    // 更新当前位置
    updateCurrentLocation(locationName) {
        if (this.model.setCurrentLocation(locationName)) {
            // 如果地图可见，更新显示
            if (this.model.isVisible) {
                // 更新当前位置显示
                this.view.updateCurrentLocation(locationName);
                
                // 重新渲染地图
                this.renderMap();
            }
            return true;
        }
        return false;
    }

    // 处理地点点击
    handleLocationClick(name, x, y) {
        // 更新光标位置
        this.cursorPosition = { x, y };
        this.view.updateCursorPosition(this.cursorPosition);
        
        // 更新当前索引
        this.currentLocationIndex = this.locationPositions.findIndex(
            pos => pos.x === x && pos.y === y
        );
        
        // 选中该地点
        this.handleLocationSelection(name);
        
        console.log(`位置点击: ${name}, 坐标: (${x}, ${y})`);
    }

    // 设置地点可见性并更新地图
    setLocationVisibility(locationName, isVisible) {
        // 调用模型方法设置可见性
        const success = this.model.setLocationVisibility(locationName, isVisible);
        
        if (success && this.model.isVisible) {
            // 如果地图当前显示，则重新渲染
            this.renderMap();
        }
        
        return success;
    }

    // 显示一个隐藏的地点
    revealLocation(locationName) {
        return this.setLocationVisibility(locationName, true);
    }

    // 隐藏一个地点
    hideLocation(locationName) {
        return this.setLocationVisibility(locationName, false);
    }

    // 解锁位置的隐藏描述
    unlockLocationHiddenInfo(locationName) {
        const success = this.model.unlockHiddenDescription(locationName, true);
        
        // 如果当前正在显示该位置的详情，则刷新显示
        if (success && this.model.selectedLocation === locationName) {
            const location = this.model.getSelectedLocation();
            this.view.showLocationDetails(location);
        }
        
        return success;
    }

    // 揭露伪装地点的真实身份
    revealLocationDisguise(locationName) {
        const success = this.model.revealDisguise(locationName, true);
        
        // 如果当前正在显示该位置的详情，则刷新显示
        if (success && this.model.selectedLocation === locationName) {
            const location = this.model.getSelectedLocation();
            this.view.showLocationDetails(location);
        }
        
        return success;
    }

    // 列表导航方法
    navigateList(delta) {
        this.updateCurrentListItems();
        
        if (this.currentListItems.length === 0) return;
        
        // 计算新的索引
        this.selectedListIndex = (this.selectedListIndex + delta + this.currentListItems.length) % this.currentListItems.length;
        
        // 更新UI高亮
        this.view.highlightListItem(this.selectedListIndex);
        
        // 更新光标位置跟随选中项
        const selectedItem = this.currentListItems[this.selectedListIndex];
        if (selectedItem && selectedItem.coordinates) {
            this.cursorPosition = { 
                x: selectedItem.coordinates[0], 
                y: selectedItem.coordinates[1] 
            };
            this.view.updateCursorPosition(this.cursorPosition);
        }
    }

    // 更新当前列表项目
    updateCurrentListItems() {
        this.currentListItems = [];
        
        if (this.view.viewState === 'default') {
            // 默认视图显示区域列表
            const regions = this.model.getAllVisibleRegions();
            for (const [name, data] of Object.entries(regions)) {
                this.currentListItems.push({ name, coordinates: data.coordinates, type: 'region' });
            }
        } else if (this.view.viewState === 'region') {
            // 区域视图显示地点列表
            const currentRegion = this.model.getCurrentRegion();
            const locations = currentRegion ? this.model.getLocationsByRegion(currentRegion) : {};
            for (const [name, data] of Object.entries(locations)) {
                this.currentListItems.push({ name, coordinates: data.coordinates, type: 'location' });
            }
        } else if (this.view.viewState === 'location') {
            // 位置视图显示当前区域的所有地点
            const currentRegion = this.model.getCurrentRegion();
            const locations = currentRegion ? this.model.getLocationsByRegion(currentRegion) : {};
            for (const [name, data] of Object.entries(locations)) {
                this.currentListItems.push({ name, coordinates: data.coordinates, type: 'location' });
            }
        }
        
        // 确保索引在有效范围内
        if (this.selectedListIndex >= this.currentListItems.length) {
            this.selectedListIndex = 0;
        }
    }

    // 视图向前导航 (相当于Enter)
    navigateViewForward() {
        const selectedItem = this.currentListItems[this.selectedListIndex];
        if (!selectedItem) return;
        
        if (selectedItem.type === 'region') {
            this.handleRegionSelection(selectedItem.name);
        } else if (selectedItem.type === 'location') {
            this.handleLocationSelection(selectedItem.name);
        }
    }

    // 视图向后导航 (相当于ESC)
    navigateViewBackward() {
        if (this.view.viewState === 'location') {
            this.clearSelection();
        } else if (this.view.viewState === 'region') {
            this._handleExitRegionView();
        }
    }

    // 选择当前列表项
    selectCurrentListItem() {
        this.navigateViewForward(); // Enter键等同于D键/右方向键
    }

    // 处理地点视图中的键盘事件
    handleLocationViewKeyboard(e) {
        switch (e.key) {
            case 'w':
            case 'ArrowUp':
                e.preventDefault();
                this.navigateLocationViewFocus(-1);
                break;
            case 's':
            case 'ArrowDown':
                e.preventDefault();
                this.navigateLocationViewFocus(1);
                break;
            case 'a':
            case 'ArrowLeft':
                e.preventDefault();
                this.clearSelection(); // 返回区域视图
                break;
            case 'd':
            case 'ArrowRight':
                e.preventDefault();
                // 在地点视图中右键暂时无操作
                break;
            case 'q':
                e.preventDefault();
                this.navigateLocations(-1);
                break;
            case 'e':
                e.preventDefault();
                this.navigateLocations(1);
                break;
            case 'Enter':
                e.preventDefault();
                this.handleLocationViewEnter();
                break;
            case 'Escape':
                e.preventDefault();
                this.clearSelection();
                break;
        }
    }
    
    // 在地点视图的焦点元素之间导航
    navigateLocationViewFocus(delta) {
        const maxIndex = this.locationViewFocusItems.length - 1;
        this.locationViewFocusIndex = (this.locationViewFocusIndex + delta + this.locationViewFocusItems.length) % this.locationViewFocusItems.length;
        
        // 更新视觉焦点
        this.view.updateLocationViewFocus(this.locationViewFocusIndex);
    }
    
    // 处理地点视图中的Enter键
    handleLocationViewEnter() {
        if (this.locationViewFocusIndex === 0) {
            // 在地点详情上按Enter，切换表面/内部详情
            console.log("切换地点详情内容");
            this.view.toggleLocationDetailsContent();
        }
        // 如果焦点在访问状态框上（index === 1），暂时不做操作
    }
}