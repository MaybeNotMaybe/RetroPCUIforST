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
            
            // 如果点击的是空白区域，并且有选中位置，才清除选择
            if (this.model.isVisible && this.model.selectedLocation) {
                console.log("点击空白区域，清除选择");
                this.clearSelection();
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
                    this.clearSelection();
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
        if (this.model.selectedLocation) {
            this.model.selectLocation(null);
            this.view.highlightLocation(null);
            this.view.showLocationDetails(null);
            
            // 如果在位置详情视图，返回到区域视图
            if (this.view.viewState === 'location') {
                const currentRegion = this.model.getCurrentRegion();
                if (currentRegion) {
                    const regions = this.model.getAllVisibleRegions();
                    const region = regions[currentRegion];
                    if (region) {
                        this.view.setViewState('region', {
                            x: region.coordinates[0],
                            y: region.coordinates[1]
                        });
                        this.renderMap();
                    }
                } else {
                    // 如果没有当前区域，回到默认视图
                    this.view.setViewState('default');
                    this.renderMap();
                }
            }
        } else if (this.model.getCurrentRegion() && this.view.viewState !== 'default') {
            // 如果在区域视图但没有选中位置，返回到默认视图
            this.model.setCurrentRegion(null);
            this.view.setViewState('default');
            this.renderMap();
        }
    }
    
    // 移动光标
    moveCursor(deltaX, deltaY) {
        // 如果位置数组为空，初始化它
        if (this.locationPositions.length === 0) {
            this.initLocationPositions();
        }
        
        if (this.locationPositions.length === 0) return;
        
        const currentX = this.cursorPosition.x;
        const currentY = this.cursorPosition.y;
        
        // 定义移动速度（像素单位）
        const moveSpeed = 50;
        deltaX *= moveSpeed;
        deltaY *= moveSpeed;
        
        // 确定移动方向
        let direction = '';
        if (deltaX > 0) direction = 'right';
        else if (deltaX < 0) direction = 'left';
        else if (deltaY > 0) direction = 'down';
        else if (deltaY < 0) direction = 'up';
        
        // 查找该方向上最近的地点
        let closestLocation = null;
        let closestDistance = Infinity;
        
        for (const location of this.locationPositions) {
            // 根据方向过滤
            if ((direction === 'right' && location.x <= currentX) ||
                (direction === 'left' && location.x >= currentX) ||
                (direction === 'down' && location.y <= currentY) ||
                (direction === 'up' && location.y >= currentY)) {
                continue; // 忽略不在目标方向的地点
            }
            
            // 计算距离
            const distance = Math.sqrt(
                Math.pow(location.x - currentX, 2) + 
                Math.pow(location.y - currentY, 2)
            );
            
            // 更新最近地点
            if (distance < closestDistance) {
                closestDistance = distance;
                closestLocation = location;
            }
        }
        
        // 如果找到了最近地点，移动光标
        if (closestLocation) {
            this.cursorPosition = { x: closestLocation.x, y: closestLocation.y };
            this.view.updateCursorPosition(this.cursorPosition);
            
            // 更新当前索引
            this.currentLocationIndex = this.locationPositions.findIndex(
                pos => pos.x === closestLocation.x && pos.y === closestLocation.y
            );

            // 自动选中新位置
            this.handleLocationSelection(closestLocation.name);
        }
    }
    
    // 在标签间导航
    navigateLocations(delta) {
        // 如果位置数组为空，初始化它
        if (this.locationPositions.length === 0) {
            this.initLocationPositions();
        }
        
        if (this.locationPositions.length === 0) return;
        
        /// 更新索引
        this.currentLocationIndex = (this.currentLocationIndex + delta + this.locationPositions.length) % this.locationPositions.length;
        
        // 获取新位置
        const newPos = this.locationPositions[this.currentLocationIndex];
        this.cursorPosition = { x: newPos.x, y: newPos.y };
        
        // 更新视图
        this.view.updateCursorPosition(this.cursorPosition);
        
        // 自动选中新位置
        this.handleLocationSelection(newPos.name);
    }
    
    // 初始化位置数组
    initLocationPositions() {
        this.locationPositions = [];
        // 只使用可见位置
        const locations = this.model.getAllVisibleLocations();
        
        for (const [name, data] of Object.entries(locations)) {
            const [x, y] = data.coordinates;
            this.locationPositions.push({ 
                x: x, 
                y: y, 
                name: name 
            });
        }
        
        // 初始位置设为当前位置
        const currentLocation = this.model.getCurrentLocation();
        if (currentLocation) {
            const [x, y] = currentLocation.coordinates;
            this.cursorPosition = { x: x, y: y };
            
            // 找到当前位置在数组中的索引
            this.currentLocationIndex = this.locationPositions.findIndex(
                pos => pos.x === x && pos.y === y
            );
        }
    }
    
    // 选择光标位置的单元格
    selectAtCursor() {
        // 查找光标位置是否有位置
        const locations = this.model.getAllLocations();
        for (const [name, data] of Object.entries(locations)) {
            const [x, y] = data.coordinates;
            if (x === this.cursorPosition.x && y === this.cursorPosition.y) {
                // 找到位置，选中它
                this.handleLocationSelection(name);
                return;
            }
        }
    }
    
    // 渲染地图
    renderMap() {
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
            
            const currentLocation = this.model.getCurrentLocation().name;
            
            this.view.renderMap(locations, currentLocation, (name, x, y) => {
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