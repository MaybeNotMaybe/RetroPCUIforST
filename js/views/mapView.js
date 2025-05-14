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

        // 添加测试模式标志
        this.isTestMode = false;
        
        // 订阅测试模式变化事件
        EventBus.on('testModeChanged', (isEnabled) => {
            this.isTestMode = isEnabled;
            console.log(`地图视图测试模式: ${isEnabled ? '已启用' : '已禁用'}`);
        });
    }
    
    // 初始化地图UI
    initializeUI() {
    // 创建新的布局结构
    this.mapContent.innerHTML = `
            <div class="map-area">
                <!-- 地图背景 -->
                <div class="map-background" id="mapBackground"></div>
                <!-- 位置标记容器 -->
                <div class="map-locations-container" id="mapLocationsContainer"></div>
            </div>
            <div class="map-details-area" id="mapDetailsArea">
                <!-- 详情区域在选择位置时显示 -->
                <div class="map-location-details" id="locationDetails" style="display: none; flex-direction: column;">
                    <div class="map-location-image" id="locationImage">
                        <div class="map-location-placeholder">地点图片</div>
                    </div>
                    <div class="map-location-info" id="locationInfo">
                        <div class="tui-frame">
                            <div class="tui-title">位置详情</div>
                            <p>选择一个位置以查看详情</p>
                        </div>
                    </div>
                    <div class="map-location-footer" id="locationFooter"></div>
                </div>
                
                <!-- 位置列表在未选择位置时显示 -->
                <div class="map-location-list" id="locationList"></div>
            </div>
        `;

        // 添加光标元素
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
        const locationsContainer = document.getElementById('mapLocationsContainer');
        if (!locationsContainer) {
            console.error("找不到地图位置容器元素");
            return;
        }
        
        // 清空现有内容
        locationsContainer.innerHTML = '';
        
        // 添加位置标记
        for (const [name, data] of Object.entries(locations)) {
            const [x, y] = data.coordinates;
            
            // 创建位置标记元素
            const locationMarker = document.createElement('div');
            locationMarker.className = 'location-marker';
            locationMarker.dataset.location = name;
            
            locationMarker.style.left = `${x}%`;
            locationMarker.style.top = `${y}%`;
            
            // 创建标签元素
            const label = document.createElement('span');
            label.className = 'location-label';
            label.textContent = name;
            locationMarker.appendChild(label);
            
            // 标记当前位置
            if (name === currentLocation) {
                locationMarker.classList.add('current');
            }
            
            // 为每个位置添加点击事件
            locationMarker.addEventListener('click', (e) => {
                e.stopPropagation();
                EventBus.emit('locationSelected', name);
                
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
        
        // 渲染位置列表到右侧
        this.renderLocationList(locations, currentLocation);
    }

    // 渲染位置列表
    renderLocationList(locations, currentLocation) {
        const locationList = document.getElementById('locationList');
        if (!locationList) return;
        
        let listHTML = '<div class="tui-frame"><div class="tui-title">可用位置</div>';
        
        for (const [name, data] of Object.entries(locations)) {
            const currentClass = name === currentLocation ? 'current' : '';
            listHTML += `<div class="map-location-item ${currentClass}" data-location="${name}">${name}</div>`;
        }
        
        listHTML += '</div>';
        locationList.innerHTML = listHTML;
        
        // 为每个位置项添加点击事件
        const items = locationList.querySelectorAll('.map-location-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const locationName = item.dataset.location;
                console.log(`列表项点击: ${locationName}`);
                
                // 直接调用控制器的方法
                if (window.mapController) {
                    window.mapController.handleLocationSelection(locationName);
                } else {
                    // 退路 - 使用事件总线
                    EventBus.emit('locationSelected', locationName);
                }
            });
        });
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
            
            // 缩小非选中地点的字体
            this.adjustLocationLabelFonts();
        } else {
            // 移除缩放类
            mapContent.classList.remove('zoomed');
            
            // 重置变换
            locationsContainer.style.transform = '';
            if (mapBackground) {
                mapBackground.style.transform = '';
            }
            
            // 恢复所有地点的字体大小
            this.resetLocationLabelFonts();
        }
    }

    // 缩放并居中到特定单元格
    zoomAndCenterOn(x, y) {
        const locationsContainer = document.getElementById('mapLocationsContainer');
        const mapBackground = document.getElementById('mapBackground');
        
        if (!locationsContainer) return;
        
        // 使用固定缩放比例
        const zoomScale = 1.8;
        
        // 边界限制参数（百分比）
        const boundaryLimits = {
            left: 20,   // 左边界限制
            right: 20,  // 右边界限制
            top: 20,    // 上边界限制
            bottom: 20  // 下边界限制
        };
        
        // 计算要平移的距离，同时考虑边界限制
        let translateX = 50 - x;
        let translateY = 50 - y;
        
        // 应用边界限制
        translateX = Math.max(Math.min(translateX, boundaryLimits.right), -boundaryLimits.left);
        translateY = Math.max(Math.min(translateY, boundaryLimits.bottom), -boundaryLimits.top);
        
        // 构建变换字符串
        const transform = `scale(${zoomScale}) translate(${translateX/zoomScale}%, ${translateY/zoomScale}%)`;
        
        // 应用变换
        locationsContainer.style.transform = transform;
        if (mapBackground) {
            mapBackground.style.transform = transform;
        }
        
        console.log(`缩放到: (${x}%,${y}%), 比例: ${zoomScale}, 平移: (${translateX}%, ${translateY}%)`);
        // 调整字体大小
        this.adjustLocationLabelFonts();
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
        
        // 使用百分比坐标
        this.cursorElement.style.left = `${position.x}%`;
        this.cursorElement.style.top = `${position.y}%`;
        
        // 高亮当前位置点
        const locationsContainer = document.getElementById('mapLocationsContainer');
        const markers = locationsContainer.querySelectorAll('.location-marker');
        
        markers.forEach(marker => marker.classList.remove('cursor-highlight'));
        
        // 添加到当前位置点 - 通过找出最接近光标位置的标记
        let closestMarker = null;
        let minDistance = Infinity;
        
        markers.forEach(marker => {
            const markerX = parseFloat(marker.style.left);
            const markerY = parseFloat(marker.style.top);
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
        if (closestMarker && minDistance < 5) { // 百分比单位下的阈值
            closestMarker.classList.add('cursor-highlight');
        }
    }
    
    // 显示位置详情
    showLocationDetails(location) {
        const detailsContainer = document.getElementById('locationDetails');
        const locationList = document.getElementById('locationList');
        const locationInfo = document.getElementById('locationInfo');
        const locationImage = document.getElementById('locationImage');
        const locationFooter = document.getElementById('locationFooter');
        
        if (!detailsContainer || !locationList) {
            console.error('找不到地图详情容器');
            return;
        }
        
        if (!location) {
            // 没有选择位置，显示列表
            detailsContainer.style.display = 'none';
            locationList.style.display = 'block';
            return;
        }
        
         // 选择了位置，显示详情
        detailsContainer.style.display = 'flex';
        locationList.style.display = 'none';
        
        // 更新图片区域
        locationImage.innerHTML = `<div class="map-location-placeholder">${location.displayName}</div>`;
        
        // 初始显示表面信息
        let infoHTML = `
            <div class="tui-frame location-info-frame" id="locationInfoFrame" data-showing-hidden="false">
                <div class="tui-title">${location.displayName}</div>
                <p class="location-description">${location.description}</p>
            </div>
        `;

        locationInfo.innerHTML = infoHTML;
        
        // 添加点击事件处理
        const infoFrame = document.getElementById('locationInfoFrame');
        if (infoFrame) {
            infoFrame.addEventListener('click', () => {
                // 只有在已知隐藏信息或已识破伪装的情况下才切换显示
                if ((location.knowsHidden || location.disguiseRevealed) && 
                    (location.hiddenDescription || location.isDisguised)) {
                    
                    // 获取当前显示状态
                    const isShowingHidden = infoFrame.dataset.showingHidden === 'true';
                    
                    // 切换显示状态
                    infoFrame.dataset.showingHidden = isShowingHidden ? 'false' : 'true';
                    
                    // 更新标题 - 如果伪装已识破，显示真实名称
                    const titleElement = infoFrame.querySelector('.tui-title');
                    if (titleElement && location.isDisguised && location.disguiseRevealed && !isShowingHidden) {
                        titleElement.textContent = location.realName;
                        
                        // 同时更新图片区域的标题
                        locationImage.innerHTML = `<div class="map-location-placeholder">${location.realName}</div>`;
                    } else if (titleElement && isShowingHidden) {
                        // 切换回表面信息
                        titleElement.textContent = location.displayName;
                        locationImage.innerHTML = `<div class="map-location-placeholder">${location.displayName}</div>`;
                    }
                    
                    // 更新描述 - 如果知道隐藏信息，显示隐藏描述
                    const descElement = infoFrame.querySelector('.location-description');
                    if (descElement && location.knowsHidden) {
                        if (!isShowingHidden && location.hiddenDescription) {
                            descElement.textContent = location.hiddenDescription;
                            descElement.classList.add('revealed');
                            
                            // 播放信息切换音效
                            if (window.audioManager) {
                                window.audioManager.play('dataReveal');
                            }
                        } else {
                            descElement.textContent = location.description;
                            descElement.classList.remove('revealed');
                        }
                    }
                    
                    // 更新访问状态
                    this.updateAccessStatus(location, !isShowingHidden);
                }
            });
        }
        
        // 初始只显示公开访问状态
        this.updateAccessStatus(location, false);
    }

    // 更新当前的访问许可情况
    updateAccessStatus(location, isShowingHidden) {
        const locationFooter = document.getElementById('locationFooter');
        if (!locationFooter) return;
        
        let accessStatusHTML = '';
        
        if (isShowingHidden) {
            // 显示秘密身份访问状态，不显示"秘密身份:"前缀
            if (location.covertAccess) {
                accessStatusHTML = '<p class="access-info covert positive">已获准入</p>';
            } else {
                accessStatusHTML = '<p class="access-info covert negative">未获准入</p>';
            }
        } else {
            // 显示公开身份访问状态，不显示"公开身份:"前缀
            if (location.publicAccess) {
                accessStatusHTML = '<p class="access-info positive">可进入</p>';
            } else {
                accessStatusHTML = '<p class="access-info negative">禁止进入</p>';
            }
        }
        
        locationFooter.innerHTML = `
            <div class="tui-frame">
                ${accessStatusHTML}
            </div>
        `;
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
        if (this.isTestMode) {
            // 测试模式：直接切换，无闪屏效果
            this.terminal.style.display = 'none';
            this.mapInterface.style.display = 'flex';
            
            // 确保地图界面继承当前屏幕的颜色模式
            this.updateColorMode(this.screen.classList.contains('amber-mode'));
        } else {
            // 正常模式：使用闪烁效果
            this.flickerScreen(() => {
                this.terminal.style.display = 'none';
                this.mapInterface.style.display = 'flex';
                
                // 确保地图界面继承当前屏幕的颜色模式
                this.updateColorMode(this.screen.classList.contains('amber-mode'));
            });
        }
    }

    
    // 隐藏地图界面
    hide() {
        if (this.isTestMode) {
            // 测试模式：直接切换，无闪屏效果
            this.terminal.style.display = 'flex';
            this.mapInterface.style.display = 'none';
        } else {
            // 正常模式：使用闪烁效果
            this.flickerScreen(() => {
                this.terminal.style.display = 'flex';
                this.mapInterface.style.display = 'none';
            });
        }
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

    // 调整地点标签字体大小
    adjustLocationLabelFonts() {
        const highlightedMarker = document.querySelector('.location-marker.highlighted');
        if (!highlightedMarker) return;
        
        const selectedLocationName = highlightedMarker.dataset.location;
        const allMarkers = document.querySelectorAll('.location-marker');
        
        allMarkers.forEach(marker => {
            const label = marker.querySelector('.location-label');
            if (label) {
                if (marker.dataset.location !== selectedLocationName) {
                    // 缩小非选中地点的字体到50%
                    label.style.fontSize = '6px'; // 原来是12px的50%
                } else {
                    // 确保选中地点的字体保持正常大小
                    label.style.fontSize = '12px';
                }
            }
        });
    }

    // 重置地点标签字体大小
    resetLocationLabelFonts() {
        const allLabels = document.querySelectorAll('.location-label');
        allLabels.forEach(label => {
            label.style.fontSize = '12px'; // 恢复原始大小
        });
    }
}