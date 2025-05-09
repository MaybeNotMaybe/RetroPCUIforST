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
        
        // 初始化UI
        this.view.initializeUI();
        
        // 绑定事件
        this.bindEvents();
        
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
            
            // 检查点击的是否是地图单元格，如果不是或是空白单元格则取消选择
            const clickedElement = e.target;
            if (!clickedElement.classList.contains('location') && 
                this.model.isVisible && this.model.selectedLocation) {
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
        // 选择位置并显示详情
        if (this.model.selectLocation(locationName)) {
            const location = this.model.getSelectedLocation();
            this.view.showLocationDetails(location);
            this.view.highlightLocation(locationName);
            
            // 如果尚未缩放，启用缩放
            if (!this.view.isZoomed) {
                this.view.toggleZoom({
                    x: location.coordinates[0],
                    y: location.coordinates[1]
                });
            }
        }
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
            // 显示地图并渲染数据
            this.view.show();
            
            // 同步游戏控制器中的当前位置（如果存在）
            if (window.gameController && window.gameController.model) {
                const gameLocation = window.gameController.model.currentLocation;
                if (gameLocation && this.model.locations[gameLocation]) {
                    this.model.setCurrentLocation(gameLocation);
                }
            }
            
            // 渲染地图
            this.renderMap();
            
            // 默认选中当前位置
            this.handleLocationSelection(this.model.currentLocation);
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
        
        return true;
    }

    // 清除当前选择
    clearSelection() {
        if (this.model.selectedLocation) {
            this.model.selectLocation(null);
            this.view.highlightLocation(null);
            this.view.showLocationDetails(null);
            
            // 如果处于缩放状态，取消缩放
            if (this.view.isZoomed) {
                this.view.toggleZoom();
            }
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
            
            // 确保水平或垂直方向上足够接近
            if (direction === 'right' || direction === 'left') {
                // 垂直偏差不应太大
                if (Math.abs(location.y - currentY) > 2) continue;
            } else {
                // 水平偏差不应太大
                if (Math.abs(location.x - currentX) > 2) continue;
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
        } else {
            // 如果没有找到，尝试当前方向上的任何地点（放宽约束）
            for (const location of this.locationPositions) {
                if ((direction === 'right' && location.x > currentX) ||
                    (direction === 'left' && location.x < currentX) ||
                    (direction === 'down' && location.y > currentY) ||
                    (direction === 'up' && location.y < currentY)) {
                    
                    const distance = Math.sqrt(
                        Math.pow(location.x - currentX, 2) + 
                        Math.pow(location.y - currentY, 2)
                    );
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestLocation = location;
                    }
                }
            }
            
            // 如果找到了，移动光标
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
        const locations = this.model.getAllLocations();
        
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
        const locations = this.model.getAllLocations();
        const currentLocation = this.model.getCurrentLocation().name;
        
        // 传递事件处理器引用给视图，让视图可以调用控制器的方法
        this.view.renderMap(locations, currentLocation, (name, x, y) => {
            // 位置被点击的回调
            this.handleLocationClick(name, x, y);
        });
        
        // 初始化位置导航数组
        this.initLocationPositions();
        
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
    }
}