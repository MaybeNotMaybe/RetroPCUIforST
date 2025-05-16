// js/controllers/mapController.js
class MapController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        
        // 当前光标位置
        this.cursorPosition = { x: 0, y: 0 };
        // 存储所有位置坐标的缓存，用于导航
        this.locationPositions = [];
        // 当前在locationPositions中的索引
        this.currentLocationIndex = -1;

        this.regionPositions = [];
        this.currentRegionIndex = -1;
        
        // 初始化UI
        this.view.initializeUI();
        
        // 绑定事件
        this.bindEvents();

        // 订阅测试模式变化事件
        EventBus.on('testModeChanged', (isEnabled) => {
            console.log(`地图控制器测试模式: ${isEnabled ? '已启用' : '已禁用'}`);
        });
        
        console.log("地图控制器已初始化");
    }
    
    // 绑定事件处理程序
    bindEvents() {
        // 监听位置选择事件
        EventBus.on('locationSelected', (locationName) => {
            this.handleLocationSelection(locationName);
        });

        // 地图背景点击事件 - 取消选择
        document.addEventListener('click', (e) => {
            if (!this.model.isVisible) return;
            
            // 检查点击的是否是地图单元格
            const clickedElement = e.target;
            
            // 忽略列表项和详情区域的点击
            if (clickedElement.closest('.map-location-item') || 
                clickedElement.closest('.map-details-area') ||
                clickedElement.closest('.map-location-details')) {
                console.log("忽略列表或详情区域的点击");
                return;
            }
            
            // 忽略位置标记的点击
            if (clickedElement.classList.contains('location-marker') ||
                clickedElement.closest('.location-marker')) {
                console.log("忽略位置标记的点击");
                return;
            }
            
            // 如果点击的是空白区域，根据当前视图状态处理
            if (this.model.isVisible) {
                if (this.view.viewState === 'location' && this.model.selectedLocation) {
                    // 在位置视图中点击空白区域，清除选择回到区域视图
                    console.log("从位置视图返回区域视图");
                    this.clearSelection();
                } else if (this.view.viewState === 'region') {
                    // 在区域视图中点击空白区域，返回默认视图
                    console.log("从区域视图返回默认视图");
                    const exitedRegionName = this.model.getCurrentRegion(); // 1. 获取当前区域名称
                    let newCursorPosX = 50, newCursorPosY = 50; // 如果区域信息丢失，则为默认值

                    if (exitedRegionName) {
                        const regionsData = this.model.getAllVisibleRegions();
                        const exitedRegion = regionsData[exitedRegionName];
                        if (exitedRegion && exitedRegion.coordinates) {
                            [newCursorPosX, newCursorPosY] = exitedRegion.coordinates; // 2. 获取其坐标
                        }
                    }

                    this.model.setCurrentRegion(null);                 // 3. 清除模型中的当前区域
                    this.view.setViewState('default');                 // 4. 设置视图状态为默认

                    this.cursorPosition = { x: newCursorPosX, y: newCursorPosY }; // 5. 更新光标位置

                    this.renderMap();                                  // 6. 渲染地图（将使用新的光标位置）

                    if (exitedRegionName) {
                        this.view.highlightRegion(exitedRegionName);   // 7. 高亮退出的区域
                        // 为Q/E导航一致性更新 currentRegionIndex
                        if (this.regionPositions.length === 0) this.initRegionPositions(); // 确保 regionPositions 已填充
                        this.currentRegionIndex = this.regionPositions.findIndex(
                            pos => pos.name === exitedRegionName
                        );
                    }
                }
            }
        });

        // 地图键盘导航
        document.addEventListener('keydown', (e) => {
            if (!this.model.isVisible) return;
            
            switch (e.key) {
                // WASD导航
                case 'w':
                case 'ArrowUp':
                    e.preventDefault();
                    this.moveCursor(0, -1);
                    break;
                case 's':
                case 'ArrowDown':
                    e.preventDefault();
                    this.moveCursor(0, 1);
                    break;
                case 'a':
                case 'ArrowLeft':
                    e.preventDefault();
                    this.moveCursor(-1, 0);
                    break;
                case 'd':
                case 'ArrowRight':
                    e.preventDefault();
                    this.moveCursor(1, 0);
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
                    this.selectAtCursor();
                    break;
                case 'Escape':
                    e.preventDefault();
                    // 根据当前视图状态处理ESC
                    if (this.view.viewState === 'location') {
                        // 在位置视图中，返回区域视图
                        this.clearSelection();
                    } else if (this.view.viewState === 'region') {
                        // 在区域视图中，返回默认视图
                        const exitedRegionName = this.model.getCurrentRegion(); // 1. 获取当前区域名称
                        let newCursorPosX = 50, newCursorPosY = 50; // 如果区域信息丢失，则为默认值

                        if (exitedRegionName) {
                            const regionsData = this.model.getAllVisibleRegions();
                            const exitedRegion = regionsData[exitedRegionName];
                            if (exitedRegion && exitedRegion.coordinates) {
                                [newCursorPosX, newCursorPosY] = exitedRegion.coordinates; // 2. 获取其坐标
                            }
                        }

                        this.model.setCurrentRegion(null);                 // 3. 清除模型中的当前区域
                        this.view.setViewState('default');                 // 4. 设置视图状态为默认

                        this.cursorPosition = { x: newCursorPosX, y: newCursorPosY }; // 5. 更新光标位置

                        this.renderMap();                                  // 6. 渲染地图（将使用新的光标位置）

                        if (exitedRegionName) {
                            this.view.highlightRegion(exitedRegionName);   // 7. 高亮退出的区域
                             // 为Q/E导航一致性更新 currentRegionIndex
                            if (this.regionPositions.length === 0) this.initRegionPositions(); // 确保 regionPositions 已填充
                            this.currentRegionIndex = this.regionPositions.findIndex(
                                pos => pos.name === exitedRegionName
                            );
                        }
                    }
                    break;
            }
        });
        
        // 监听颜色模式变化
        EventBus.on('colorModeChanged', (isAmber) => {
            this.view.updateColorMode(isAmber);
        });

        // 监听 runProgram 事件
        EventBus.on('runProgram', (data) => {
            if (data.program === 'map' && !this.model.isVisible) {
                this.toggleMapView();
            }
        });
        
        // 监听功能键
        document.addEventListener('keydown', (e) => {
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
                if (!this.model.isVisible && window.isSystemOperational()) {
                    this.toggleMapView();
                }
            }
        });
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
            const [x, y] = location.coordinates;
            this.cursorPosition = { x, y };
            this.view.updateCursorPosition(this.cursorPosition);
            
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
                });
                
                // 清除选中的位置
                this.model.selectLocation(null);
                this.view.highlightLocation(null);
                this.view.showLocationDetails(null);

                this.initLocationPositions();
                
                // 查找光标应该移动到的位置
                const currentLocation = this.model.getCurrentLocation().name;
                let targetLocation = null;
                
                // 优先检查当前位置是否在区域内
                if (regionLocations[currentLocation]) {
                    targetLocation = currentLocation;
                } else {
                    // 否则使用第一个位置
                    targetLocation = Object.keys(regionLocations)[0];
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
        
        // 对区域位置进行同样的排序
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
    toggleMapView() {
        // 检查系统是否开机
        if (!window.isSystemOperational()) {
            console.log("系统未开机，无法切换到地图视图");
            return false;
        }
        
        // 切换可见性模型状态
        const isVisible = this.model.toggleVisibility();
        
        if (isVisible) {
            // 显示地图
            this.view.show();
            
            // 同步当前位置
            if (window.gameController && window.gameController.model) {
                const gameLocation = window.gameController.model.currentLocation;
                if (gameLocation && this.model.locations[gameLocation]) {
                    this.model.setCurrentLocation(gameLocation);
                }
            }
            
            // 重置到默认视图状态
            this.view.setViewState('default');
            this.model.setCurrentRegion(null);
            
            // 渲染地图
            this.renderMap();
            
            this.view.showLocationDetails(null);
        } else {
            // 隐藏地图
            this.view.hide();

            // 切换回终端时，自动将焦点设置到命令行输入框
            setTimeout(() => {
                const commandInput = document.getElementById('commandInput');
                if (commandInput && !commandInput.disabled) {
                    commandInput.focus();
                }
            }, 100);
        }

        // 保存当前状态
        if (window.gameController) {
            window.gameController.saveSettings();
        }

        return true;
    }

    // 清除当前选择
    clearSelection() {
        const currentViewState = this.view.viewState;
        
        if (this.model.selectedLocation && currentViewState === 'location') {
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
                    });
                }
            }
        } else if (currentViewState === 'region') {
            // 在区域视图中：清除当前区域并返回默认视图
            const currentRegion = this.model.getCurrentRegion();
            
            // 重要：在更改视图前保存当前区域信息
            let regionX = 50, regionY = 50;
            if (currentRegion) {
                const regions = this.model.getAllVisibleRegions();
                const region = regions[currentRegion];
                if (region && region.coordinates) {
                    [regionX, regionY] = region.coordinates;
                }
            }
            
            // 清除当前区域并切换视图
            this.model.setCurrentRegion(null);
            this.view.setViewState('default');
            
            // 渲染区域
            const regions = this.model.getAllVisibleRegions();
            this.view.renderRegions(regions, (name, x, y) => {
                this.handleRegionClick(name, x, y);
            });
            
            // 如果有当前区域，移动光标到该区域位置并高亮
            if (currentRegion) {
                // 设置光标位置
                this.cursorPosition = { x: regionX, y: regionY };
                this.view.updateCursorPosition(this.cursorPosition);
                
                // 更新当前区域索引
                this.currentRegionIndex = this.regionPositions.findIndex(
                    pos => pos.name === currentRegion
                );
                
                // 高亮区域标记
                const regionMarker = document.querySelector(`.location-marker[data-region="${currentRegion}"]`);
                if (regionMarker) {
                    // 先移除其他高亮
                    const highlightedMarkers = document.querySelectorAll('.location-marker.highlighted');
                    highlightedMarkers.forEach(marker => marker.classList.remove('highlighted'));
                    
                    // 添加高亮
                    regionMarker.classList.add('highlighted');
                }
            }
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
                
                // 新增：如果是在地点详情视图中，自动选择当前光标下的地点
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
        
        // 按照Y轴优先，X轴次要的顺序排序（从上到下，从左到右）
        this.locationPositions.sort((a, b) => {
            // 允许一定的Y轴容差，将Y轴距离相近的点视为同一行
            const yTolerance = 3; // 可以根据需要调整这个容差值
            
            if (Math.abs(a.y - b.y) <= yTolerance) {
                // Y轴接近，按X轴从左到右排序
                return a.x - b.x;
            }
            // 否则按Y轴从上到下排序
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
        // 获取当前位置信息以便在任何视图中使用
        const currentLocationData = this.model.getCurrentLocation();
        const currentLocationName = currentLocationData.name;
        
        // 始终更新位置显示
        this.view.updateCurrentLocation(currentLocationName);
        
        // 根据当前视图状态决定显示什么
        if (this.view.viewState === 'default') {
            // 显示区域标记
            const regions = this.model.getAllVisibleRegions();
            this.view.renderRegions(regions, (name, x, y) => {
                this.handleRegionClick(name, x, y);
            });
            
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
            
            // 确保传递当前位置
            this.view.renderMap(locations, currentLocationName, (name, x, y) => {
                this.handleLocationClick(name, x, y);
            });
            
            // 初始化位置导航数组
            this.initLocationPositions();
        }
        
        // 设置初始光标位置
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
        // 1. 更新光标位置
        this.cursorPosition = { x, y };
        this.view.updateCursorPosition(this.cursorPosition);
        
        // 2. 更新当前索引
        this.currentLocationIndex = this.locationPositions.findIndex(
            pos => pos.x === x && pos.y === y
        );
        
        // 3. 选中该地点
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
}