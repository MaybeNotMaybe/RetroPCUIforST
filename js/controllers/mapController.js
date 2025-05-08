// js/controllers/mapController.js
class MapController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        
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
        
        // 监听颜色模式变化
        EventBus.on('colorModeChanged', (isAmber) => {
            this.view.updateColorMode(isAmber);
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
        }
        
        return true;
    }
    
    // 渲染地图
    renderMap() {
        const locations = this.model.getAllLocations();
        const currentLocation = this.model.getCurrentLocation().name;
        this.view.renderMap(locations, currentLocation);
    }
    
    // 更新当前位置
    updateCurrentLocation(locationName) {
        if (this.model.setCurrentLocation(locationName)) {
            // 如果地图可见，重新渲染
            if (this.model.isVisible) {
                this.renderMap();
            }
            return true;
        }
        return false;
    }
}