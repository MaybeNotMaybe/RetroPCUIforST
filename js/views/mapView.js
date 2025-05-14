// js/views/mapView.js
class MapView {
    constructor() {
        // 获取DOM元素
        this.mapInterface = document.getElementById('mapInterface');
        this.mapContent = document.getElementById('mapContent');
        // this.mapCoordinates = document.getElementById('mapCoordinates');

        // 修改：获取显示当前位置的元素，而不是坐标
       this.mapCurrentLocation = document.getElementById('mapCurrentLocation');
        
        // 缓存终端引用
        this.terminal = document.getElementById('terminal');
        
        // 获取屏幕元素，用于确定颜色模式
        this.screen = document.querySelector('.screen');

        // 当前光标元素引用
        this.cursorElement = null;
    }
    
    // 初始化地图UI
    initializeUI() {
        // 创建基本地图结构
        this.mapContent.innerHTML = `
            <div class="map-fade-in">
                <!-- 地图背景 -->
                <div class="map-background" id="mapBackground"></div>
                <!-- 替换网格为自由布局容器 -->
                <div class="map-locations-container" id="mapLocationsContainer"></div>
                <div class="map-legend">
                    <h3>图例</h3>
                    <div class="legend-item">
                        <div class="legend-icon legend-current"></div>
                        <div>当前位置</div>
                    </div>
                    <div class="legend-item">
                        <div class="legend-icon legend-location"></div>
                        <div>已知位置</div>
                    </div>
                </div>
                <div class="location-details" id="locationDetails">
                    <h3>位置详情</h3>
                    <p>选择一个位置以查看详情</p>
                </div>
            </div>
        `;

        // 添加光标元素，但现在放在locations容器中
        const locationsContainer = document.getElementById('mapLocationsContainer');
        if (locationsContainer) {
            this.cursorElement = document.createElement('div');
            this.cursorElement.className = 'map-cursor';
            locationsContainer.appendChild(this.cursorElement);
        }

        // 加载初始背景图片
        this.updateMapBackground(this.screen.classList.contains('amber-mode'));

        // 添加缩放状态标记
        this.isZoomed = false;
    }
    
    // 渲染完整地图
    renderMap(locations, currentLocation, onLocationClick = null) {
        // 确保地图容器元素存在
        const locationsContainer = document.getElementById('mapLocationsContainer');
        if (!locationsContainer) {
            console.error("找不到地图位置容器元素");
            return;
        }
        
        // 清空现有内容
        locationsContainer.innerHTML = '';
        
        // 获取地图容器的尺寸，用于坐标计算
        const containerWidth = 1814; // 与背景图片宽度相匹配
        const containerHeight = 1729; // 与背景图片高度相匹配
        
        // 添加位置标记
        for (const [name, data] of Object.entries(locations)) {
            const [x, y] = data.coordinates;
            
            // 创建位置标记元素
            const locationMarker = document.createElement('div');
            locationMarker.className = 'location-marker';
            locationMarker.dataset.location = name;
            
            // 使用data.coordinates直接作为像素坐标
            // 注意：位置坐标现在应该是像素坐标而不是网格索引
            locationMarker.style.left = `${x}px`;
            locationMarker.style.top = `${y}px`;
            
            // 创建标签元素
            const label = document.createElement('span');
            label.className = 'location-label';
            label.textContent = name;
            locationMarker.appendChild(label);
            
            // 标记当前位置
            if (name === currentLocation) {
                locationMarker.classList.add('current');
            }
            
            // 为每个位置添加点击事件监听器
            locationMarker.addEventListener('click', (e) => {
                // 阻止事件冒泡，防止触发背景点击取消选择
                e.stopPropagation();
                
                // 发布位置选择事件
                EventBus.emit('locationSelected', name);
                
                // 如果提供了点击回调，则调用并传递位置信息
                if (onLocationClick) {
                    onLocationClick(name, x, y);
                }
            });
            
            // 添加到容器
            locationsContainer.appendChild(locationMarker);
        }
        
        // 更新当前位置显示
        if (locations[currentLocation]) {
            this.mapCurrentLocation.textContent = currentLocation;
        } else {
            this.mapCurrentLocation.textContent = "未知";
        }
        
        // 重新添加光标元素
        if (this.cursorElement && !locationsContainer.contains(this.cursorElement)) {
            this.cursorElement = document.createElement('div');
            this.cursorElement.className = 'map-cursor';
            locationsContainer.appendChild(this.cursorElement);
        }
    }

    // 切换缩放效果
    toggleZoom(centerOn = null) {
        const mapContent = document.querySelector('.map-content');
        const locationsContainer = document.getElementById('mapLocationsContainer');
        const mapBackground = document.getElementById('mapBackground');
        
        if (!mapContent || !locationsContainer) return;
        
        // 切换缩放状态
        this.isZoomed = !this.isZoomed;
        
        if (this.isZoomed) {
            // 添加缩放类到内容区
            mapContent.classList.add('zoomed');
            
            // 如果提供了中心点，应用缩放和居中
            if (centerOn) {
                this.zoomAndCenterOn(centerOn.x, centerOn.y);
            }
        } else {
            // 移除缩放类
            mapContent.classList.remove('zoomed');
            
            // 重置变换 - 同时应用到背景和位置容器
            locationsContainer.style.transform = '';
            if (mapBackground) {
                mapBackground.style.transform = '';
            }
        }
    }

    // 缩放并居中到特定单元格
    zoomAndCenterOn(x, y) {
        const locationsContainer = document.getElementById('mapLocationsContainer');
        const mapBackground = document.getElementById('mapBackground');
        const mapContent = document.querySelector('.map-content');
        
        if (!locationsContainer || !mapContent) return;
        
        // 缩放比例
        const zoomScale = 1.5;
        
        // 获取地图内容区域的尺寸
        const contentRect = mapContent.getBoundingClientRect();
        const contentWidth = contentRect.width;
        const contentHeight = contentRect.height;
        
        // 计算目标中心点 - 垂直居中
        const targetCenterX = contentWidth * 0.5;
        const targetCenterY = contentHeight / 2;
        
        // 计算缩放后，位置点到原点的距离
        const scaledPointX = x * zoomScale;
        const scaledPointY = y * zoomScale;
        
        // 计算需要的平移量，使位置点位于目标中心点
        const translateX = targetCenterX - scaledPointX;
        const translateY = targetCenterY - scaledPointY;
        
        // 构建变换字符串
        const transform = `scale(${zoomScale}) translate(${translateX/zoomScale}px, ${translateY/zoomScale}px)`;
        
        // 同时应用变换到位置容器和背景 - 确保同步
        locationsContainer.style.transform = transform;
        if (mapBackground) {
            mapBackground.style.transform = transform;
        }
        
        console.log(`缩放到: (${x},${y}), 平移: (${translateX}px, ${translateY}px)`);
    }

    // 更新地图背景
    updateMapBackground(isAmber) {
        const mapBackground = document.getElementById('mapBackground');
        if (mapBackground) {
            mapBackground.style.backgroundImage = isAmber ? 
                'url("assets/images/map_amber.png")' : 
                'url("assets/images/map_green.png")';
        }
    }


    // 更新光标位置
    updateCursorPosition(position) {
        if (!this.cursorElement) return;
        
        // 直接使用像素坐标
        this.cursorElement.style.left = `${position.x}px`;
        this.cursorElement.style.top = `${position.y}px`;
        
        // 高亮当前位置点
        const locationsContainer = document.getElementById('mapLocationsContainer');
        const markers = locationsContainer.querySelectorAll('.location-marker');
        
        // 移除所有cursor-highlight类
        markers.forEach(marker => marker.classList.remove('cursor-highlight'));
        
        // 添加到当前位置点 - 通过找出最接近光标位置的标记
        let closestMarker = null;
        let minDistance = Infinity;
        
        markers.forEach(marker => {
            const markerX = parseInt(marker.style.left);
            const markerY = parseInt(marker.style.top);
            const distance = Math.sqrt(
                Math.pow(markerX - position.x, 2) + 
                Math.pow(markerY - position.y, 2)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                closestMarker = marker;
            }
        });
        
        // 如果找到最接近的标记，并且距离足够近，高亮它
        if (closestMarker && minDistance < 30) {
            closestMarker.classList.add('cursor-highlight');
        }
    }
    
    // 显示位置详情
    showLocationDetails(location) {
        const detailsElement = document.getElementById('locationDetails');
        if (!detailsElement) return;
        
        // 原有的位置详情代码保持不变
        if (!location) {
            detailsElement.innerHTML = `
                <h3>位置详情</h3>
                <p>选择一个位置以查看详情</p>
            `;
            return;
        }
        
        // 生成连接列表
        let connectionsHTML = '';
        if (location.connections && location.connections.length > 0) {
            connectionsHTML = `
                <h4>通往:</h4>
                <ul>
                    ${location.connections.map(loc => `<li>${loc}</li>`).join('')}
                </ul>
            `;
        }
        
        detailsElement.innerHTML = `
            <h3>${location.name}</h3>
            <p>${location.description}</p>
            <p>坐标: [${location.coordinates[0]}, ${location.coordinates[1]}]</p>
            ${connectionsHTML}
        `;
        
        // 如果处于缩放状态且位置改变，重新缩放和居中
        if (this.isZoomed && location) {
            // 使用短延迟确保DOM已更新
            setTimeout(() => {
                this.zoomAndCenterOn(location.coordinates[0], location.coordinates[1]);
            }, 50);
        }
    }

    // 更新当前位置显示
    updateCurrentLocation(locationName) {
        if (this.mapCurrentLocation) {
            this.mapCurrentLocation.textContent = locationName || "未知";
        }
    }
    
    // 高亮显示选中的位置
    highlightLocation(locationName) {
        // 移除之前的高亮
        const highlightedMarkers = document.querySelectorAll('.location-marker.highlighted');
        highlightedMarkers.forEach(marker => marker.classList.remove('highlighted'));
        
        // 如果提供了位置名，添加高亮
        if (locationName) {
            const marker = document.querySelector(`.location-marker[data-location="${locationName}"]`);
            if (marker) {
                marker.classList.add('highlighted');
            }
        }
    }
    
    // 显示地图界面
    show() {
        // 先添加闪烁效果
        this.flickerScreen(() => {
            // 闪烁结束后，显示地图界面
            this.terminal.style.display = 'none';
            this.mapInterface.style.display = 'flex';
            
            // 确保地图界面继承当前屏幕的颜色模式
            this.updateColorMode(this.screen.classList.contains('amber-mode'));
        });
    }
    
    // 隐藏地图界面
    hide() {
        // 先添加闪烁效果
        this.flickerScreen(() => {
            // 闪烁结束后，显示终端界面
            this.terminal.style.display = 'flex';
            this.mapInterface.style.display = 'none';
        });
    }
    
    // 更新颜色模式
    updateColorMode(isAmber) {
        // 移除现有颜色类
        this.mapInterface.classList.remove('amber-mode', 'green-mode');
        
        // 添加正确的颜色类
        if (isAmber) {
            this.mapInterface.classList.add('amber-mode');
        } else {
            this.mapInterface.classList.add('green-mode');
        }
        
        // 更新地图背景
        this.updateMapBackground(isAmber);
    }

    // 屏幕闪烁效果
    flickerScreen(callback) {
        // 获取当前屏幕
        const screen = document.querySelector('.screen');

        // 播放屏幕切换音效
        window.audioManager.play('screenSwitch');
        
        // 保存当前的类，以便稍后恢复
        const currentClasses = [...screen.classList];
        
        // 添加闪烁效果类
        screen.classList.add('screen-flicker');
        
        // 闪烁持续时间 (75ms)
        setTimeout(() => {
            // 移除闪烁效果类
            screen.classList.remove('screen-flicker');
            
            // 执行回调函数，继续切换流程
            if (callback) callback();
        }, 35);
    }
}