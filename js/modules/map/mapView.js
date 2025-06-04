// js/views/mapView.js
class MapView {
    constructor(serviceLocator = null) {
        // 依赖注入
        this.serviceLocator = serviceLocator;
        this.domUtils = this.serviceLocator?.get('domUtils');
        this.eventBus = this.serviceLocator?.get('eventBus');
        this.audio = this.serviceLocator?.get('audio');
        
        // 获取DOM元素 (使用domUtils)
        this.mapInterface = this.domUtils.get('#mapInterface');
        this.mapContent = this.domUtils.get('#mapContent');
        this.mapCurrentLocation = this.domUtils.get('#mapCurrentLocation');
        this.terminal = this.domUtils.get('#terminal');
        this.screen = this.domUtils.get('.screen');
        this.cursorElement = null;
        this.isTestMode = false;

        // 地图三级缩放状态的配置
        this.defaultMapZoomScale = 1.2;  // 默认概览状态显示区域
        this.defaultMapOffsetX = 5;    
        this.defaultMapOffsetY = 0;
        
        this.midLevelZoomScale = 7.0;   // 中间区域缩放级别，显示区域内地点
        this.midLevelOffsetX = 35;
        this.midLevelOffsetY = 10;
        
        this.highDetailZoomScale = 10.0; // 高倍细节状态，显示地点详情
        
        // 当前视图状态: 'default', 'region', 'location'
        this.viewState = 'default';

        // 当前地图的变换状态
        this.currentMapZoomScale = this.defaultMapZoomScale;
        this.currentMapOffsetX = this.defaultMapOffsetX;
        this.currentMapOffsetY = this.defaultMapOffsetY;

        // 标记物在CSS中定义的原始缩放
        this.defaultMarkerCssScale = 1.2; 

        // 标记物/光标的目标视窗尺寸调整因子
        this.markerApparentSizeFactor = 1.0;
        this.zoomedMarkerApparentSizeFactor = 2; 

        // isZoomed 表示是否处于 highDetailZoomScale 状态
        this.isZoomed = false; 

        // 订阅测试模式变化事件
        this.eventBus.on('testModeChanged', (isEnabled) => {
            this.isTestMode = isEnabled;
            console.log(`地图视图测试模式: ${isEnabled ? '已启用' : '已禁用'}`);
        });
    }

    // 应用指定的变换到地图容器和背景
    applyMapTransform(scale, offsetX, offsetY) {
        const locationsContainer = this.domUtils.get('#mapLocationsContainer');
        const mapBackground = this.domUtils.get('#mapBackground');
        if (!locationsContainer) return;

        this.currentMapZoomScale = scale;
        this.currentMapOffsetX = offsetX;
        this.currentMapOffsetY = offsetY;

        const transform = `translate(${offsetX}%, ${offsetY}%) scale(${scale})`;
        locationsContainer.style.transform = transform;
        if (mapBackground) {
            mapBackground.style.transform = transform;
        }
        // 重新计算标记物和光标的缩放
        this.applyMarkerScaling();
    }

    initializeUI() {
        this.mapContent.innerHTML = `
            <div class="map-area">
                <div class="map-background" id="mapBackground"></div>
                <div class="map-locations-container" id="mapLocationsContainer"></div>
            </div>
            <div class="map-details-area" id="mapDetailsArea">
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
                <div class="map-location-list" id="locationList"></div>
            </div>
        `;

            const locationsContainer = this.domUtils.get('#mapLocationsContainer');
        if (locationsContainer) {
            this.cursorElement = this.domUtils.create('div', {
                className: 'map-cursor',
                style: { transform: 'translate(-50%, -50%)' } // 初始居中
            });
            locationsContainer.appendChild(this.cursorElement);
        }
        
        // 添加：使用事件委托处理详情框的点击
        const detailsArea = this.domUtils.get('#mapDetailsArea');
        if (detailsArea) {
            this.domUtils.on(detailsArea, 'click', (e) => {
                // 检查点击的是否是详情框
                const infoFrame = e.target.closest('#locationInfoFrame');
                if (infoFrame) {
                    this.handleLocationInfoClick(infoFrame);
                }
            });
        }
        
        this.updateMapBackground(this.domUtils.get('.screen').classList.contains('amber-mode'));
        
        // 初始化时应用默认的地图缩放和偏移
        this.applyMapTransform(this.defaultMapZoomScale, this.defaultMapOffsetX, this.defaultMapOffsetY);
        this.resetLocationLabelFonts(); // 初始时使用默认概览状态的字体
    }

    // 处理位置详情点击的方法
    handleLocationInfoClick(infoFrame) {
        // 获取当前选中的位置 - 从模型中获取最新数据
        const locationData = window.mapController.model.getSelectedLocation();
        if (!locationData) return;
        
        // 检查是否有隐藏内容或伪装可以显示
        if ((locationData.knowsHidden || locationData.disguiseRevealed) && 
            (locationData.hiddenDescription || locationData.isDisguised)) {
            
            // 获取当前是否显示隐藏内容
            const isShowingHidden = infoFrame.dataset.showingHidden === 'true';
            infoFrame.dataset.showingHidden = isShowingHidden ? 'false' : 'true';
            
            // 更新标题和位置图片
            const titleElement = infoFrame.querySelector('.tui-title');
            const locationImage = this.domUtils.get('#locationImage');
            
            if (titleElement && locationData.isDisguised && locationData.disguiseRevealed && !isShowingHidden) {
                titleElement.textContent = locationData.realName;
                if (locationImage) {
                    locationImage.innerHTML = `<div class="map-location-placeholder">${locationData.realName}</div>`;
                }
            } else if (titleElement && isShowingHidden) {
                titleElement.textContent = locationData.displayName;
                if (locationImage) {
                    locationImage.innerHTML = `<div class="map-location-placeholder">${locationData.displayName}</div>`;
                }
            }
            
            // 更新描述文本
            const descElement = infoFrame.querySelector('.location-description');
            if (descElement && locationData.knowsHidden) {
                if (!isShowingHidden && locationData.hiddenDescription) {
                    descElement.textContent = locationData.hiddenDescription;
                    this.domUtils.addClass(descElement, 'revealed');
                    if (this.audio) this.audio.play('dataReveal');
                } else {
                    descElement.textContent = locationData.description;
                    this.domUtils.removeClass(descElement, 'revealed');
                }
            }
            
            // 更新访问状态
            this.updateAccessStatus(locationData, !isShowingHidden);
        }
    }

    renderMap(locations, currentLocation, onLocationClick = null) {
        const locationsContainer = this.domUtils.get('#mapLocationsContainer');
        if (!locationsContainer) return;
        
        // 保存当前光标
        const currentCursor = this.cursorElement;
        locationsContainer.innerHTML = ''; 
        if (currentCursor) { 
            locationsContainer.appendChild(currentCursor);
        }

        for (const [name, data] of Object.entries(locations)) {
            const [x, y] = data.coordinates;
            
            // 使用domUtils创建标记元素
            const locationMarker = this.domUtils.create('div', {
                className: 'location-marker',
                dataset: { location: name },
                style: {
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)'
                }
            });

            // 创建标签元素
            const label = this.domUtils.create('span', {
                className: 'location-label',
                textContent: name
            });
            locationMarker.appendChild(label);

            // 标记当前位置
            if (name === currentLocation) {
                this.domUtils.addClass(locationMarker, 'current');
            }

            // 使用domUtils添加事件监听
            this.domUtils.on(locationMarker, 'click', (e) => {
                e.stopPropagation();
                this.eventBus.emit('locationSelected', name);
                if (onLocationClick) {
                    onLocationClick(name, x, y);
                }
            });
            
            locationsContainer.appendChild(locationMarker);
        }

        // 更新当前位置显示
        if (locations[currentLocation]) {
            this.mapCurrentLocation.textContent = currentLocation;
        } else {
            this.mapCurrentLocation.textContent = "未知";
        }

        // 渲染位置列表
        this.renderLocationList(locations, currentLocation);
        
        // 应用当前状态的标记物缩放
        this.applyMarkerScaling();
        
        // 根据缩放状态调整字体
        if (this.isZoomed) { 
            this.adjustLocationLabelFonts();
        } else {
            this.resetLocationLabelFonts();
        }
    }

    renderLocationList(locations, currentLocation) {
        const locationList = this.domUtils.get('#locationList');
        if (!locationList) return;
        
        let listHTML = '<div class="tui-frame"><div class="tui-title">可用位置</div>';
        
        let index = 0;
        for (const [name, data] of Object.entries(locations)) {
            const currentClass = name === currentLocation ? 'current' : '';
            const selectedClass = index === 0 ? 'selected' : ''; // 默认选中第一项
            listHTML += `<div class="map-location-item ${currentClass} ${selectedClass}" data-location="${name}" data-index="${index}">${name}</div>`;
            index++;
        }
        
        listHTML += '</div>';
        locationList.innerHTML = listHTML;
        
        // 事件监听保持不变
        const items = locationList.querySelectorAll('.map-location-item');
        items.forEach(item => {
            this.domUtils.on(item, 'click', () => {
                const locationName = item.dataset.location;
                this.eventBus.emit('locationSelected', locationName);
            });
        });
    }

    // 渲染区域的方法
    renderRegions(regions, onRegionClick = null) {
        const locationsContainer = this.domUtils.get('#mapLocationsContainer');
        if (!locationsContainer) return;
        
        // 保存当前光标
        const currentCursor = this.cursorElement;
        locationsContainer.innerHTML = ''; 
        if (currentCursor) { 
            locationsContainer.appendChild(currentCursor);
        }

        // 获取当前区域和当前位置
        const currentRegion = window.mapController?.model.getCurrentRegion();
        const currentLocation = window.mapController?.model.getCurrentLocation()?.name;
        
        for (const [name, data] of Object.entries(regions)) {
            const [x, y] = data.coordinates;
            
            // 使用domUtils创建区域标记
            const regionMarker = this.domUtils.create('div', {
                className: 'location-marker region-marker',
                dataset: { region: name },
                style: {
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)'
                }
            });
            
            // 如果是当前区域，添加current类
            if (name === currentRegion) {
                this.domUtils.addClass(regionMarker, 'current');
            }
            
            // 如果当前位置在该区域内，也添加视觉指示
            if (currentLocation && data.locations && data.locations.includes(currentLocation)) {
                this.domUtils.addClass(regionMarker, 'highlighted');
            }
            
            // 创建标签
            const label = this.domUtils.create('span', {
                className: 'location-label',
                textContent: name
            });
            regionMarker.appendChild(label);

            // 使用domUtils添加事件监听
            this.domUtils.on(regionMarker, 'click', (e) => {
                e.stopPropagation();
                this.highlightRegion(name);
                if (onRegionClick) {
                    onRegionClick(name, x, y);
                }
            });
            
            locationsContainer.appendChild(regionMarker);
        }
        
        this.renderRegionList(regions);
        this.applyMarkerScaling();
        this.resetLocationLabelFonts();
    }

    // 渲染区域列表
    renderRegionList(regions) {
        const locationList = this.domUtils.get('#locationList');
        if (!locationList) return;
        
        let listHTML = '<div class="tui-frame"><div class="tui-title">可用区域</div>';
        
        let index = 0;
        for (const [name, data] of Object.entries(regions)) {
            const selectedClass = index === 0 ? 'selected' : ''; // 默认选中第一项
            listHTML += `<div class="map-location-item ${selectedClass}" data-region="${name}" data-index="${index}">${name}</div>`;
            index++;
        }
        
        listHTML += '</div>';
        locationList.innerHTML = listHTML;
        
        // 事件监听保持不变
        const items = locationList.querySelectorAll('.map-location-item');
        items.forEach(item => {
            this.domUtils.on(item, 'click', () => {
                const regionName = item.dataset.region;
                this.eventBus.emit('regionSelected', regionName);
            });
        });
    }

    // 设置视图状态方法
    setViewState(state, centerOn = null) {
        const mapContent = this.domUtils.get('.map-content');
        if (!mapContent) return;
        
        // 保存当前状态用于检测变化
        const previousState = this.viewState;
        this.viewState = state;
        
        switch(state) {
            case 'default':
                // 默认概览状态 - 显示区域
                this.domUtils.removeClass(mapContent, 'zoomed', 'region-zoomed');
                this.applyMapTransform(this.defaultMapZoomScale, this.defaultMapOffsetX, this.defaultMapOffsetY);
                this.resetLocationLabelFonts();
                this.isZoomed = false;
                break;
                
            case 'region':
                // 区域缩放状态 - 显示区域内地点
                this.domUtils.removeClass(mapContent, 'zoomed');
                this.domUtils.addClass(mapContent, 'region-zoomed');
                
                if (centerOn) {
                    const targetScale = this.midLevelZoomScale;
                    const offsetX = (50 - centerOn.x) * targetScale;
                    const offsetY = (50 - centerOn.y) * targetScale;
                    this.applyMapTransform(targetScale, offsetX, offsetY);
                } else {
                    this.applyMapTransform(this.midLevelZoomScale, this.midLevelOffsetX, this.midLevelOffsetY);
                }
                
                this.resetLocationLabelFonts();
                this.isZoomed = false;
                break;
                
            case 'location':
                // 高倍详情状态 - 显示地点详情
                this.domUtils.addClass(mapContent, 'zoomed');
                this.domUtils.removeClass(mapContent, 'region-zoomed');
                
                if (centerOn) {
                    this.zoomAndCenterOn(centerOn.x, centerOn.y);
                } else {
                    const targetX = this.cursorPosition ? this.cursorPosition.x : 50;
                    const targetY = this.cursorPosition ? this.cursorPosition.y : 50;
                    const targetScale = this.highDetailZoomScale;
                    const offsetX = (50 - targetX) * targetScale;
                    const offsetY = (50 - targetY) * targetScale;
                    this.applyMapTransform(targetScale, offsetX, offsetY);
                }
                
                this.adjustLocationLabelFonts();
                this.isZoomed = true;
                break;
        }
        
        // 如果状态发生变化，确保重新应用标记缩放
        if (previousState !== state) {
            this.applyMarkerScaling();
        }
        
        // 触发视图状态变更事件
        this.eventBus.emit('mapViewStateChanged', {
            oldState: previousState,
            newState: state
        });
    }

    applyMarkerScaling() {
        const allMarkers = this.domUtils.getAll('.location-marker');
        let effectiveApparentSizeFactor;

        // 根据视图状态确定缩放因子
        if (this.viewState === 'location') {
            effectiveApparentSizeFactor = this.zoomedMarkerApparentSizeFactor;
        } else if (this.viewState === 'region') {
            effectiveApparentSizeFactor = this.markerApparentSizeFactor * 1.2; // 区域视图稍大一点
        } else {
            effectiveApparentSizeFactor = this.markerApparentSizeFactor;
        }
        
        // 获取当前地图缩放比例
        let currentScale;
        if (this.viewState === 'location') {
            currentScale = this.highDetailZoomScale;
        } else if (this.viewState === 'region') {
            currentScale = this.midLevelZoomScale;
        } else {
            currentScale = this.defaultMapZoomScale;
        }
        
        const safeMapZoomScale = currentScale === 0 ? 1.0 : currentScale;
        const newMarkerCssScale = (this.defaultMarkerCssScale / safeMapZoomScale) * effectiveApparentSizeFactor;

        allMarkers.forEach(marker => {
            // 区域标记和位置标记有不同的基础大小
            if (marker.classList.contains('region-marker') && this.viewState === 'default') {
                // 区域标记在默认视图下更大
                marker.style.transform = `translate(-50%, -50%) scale(${newMarkerCssScale * 1.5})`;
            } else {
                marker.style.transform = `translate(-50%, -50%) scale(${newMarkerCssScale})`;
            }
        });

        if (this.cursorElement) {
            this.cursorElement.style.transform = `translate(-50%, -50%) scale(${newMarkerCssScale})`;
        }
    }

    // 在"默认概览"和"高倍细节"之间切换
    toggleZoom(centerOn = null) {
        switch(this.viewState) {
            case 'default':
                this.setViewState('region', centerOn);
                break;
            case 'region':
                this.setViewState('location', centerOn);
                break;
            case 'location':
                this.setViewState('default');
                break;
        }
    }

    // 放大并居中到指定坐标
    zoomAndCenterOn(x, y) {
        const mapContent = this.domUtils.get('.map-content');
        if (!mapContent) return;

        this.isZoomed = true; // 进入高倍细节状态
        this.domUtils.addClass(mapContent, 'zoomed');

        const targetScale = this.highDetailZoomScale;
        const offsetX = (50 - x) * targetScale; 
        const offsetY = (50 - y) * targetScale;
        
        this.applyMapTransform(targetScale, offsetX, offsetY);
        
        console.log(`Zooming to detail: (${x}%,${y}%), Container Scale: ${targetScale}, Offset: (${offsetX}%, ${offsetY}%)`);
        this.adjustLocationLabelFonts();
    }

    updateMapBackground(isAmber) {
        const mapBackground = this.domUtils.get('#mapBackground');
        if (mapBackground) {
            const backgroundUrl = isAmber ?
                'url("https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@65dac4b/assets/images/map_amber_33.png")' :
                'url("https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@65dac4b/assets/images/map_green_33.png")';
            
            mapBackground.style.backgroundImage = backgroundUrl;
        }
    }

    updateCursorPosition(position) {
        if (!this.cursorElement) return;
        
        // 更新光标位置
        this.cursorElement.style.left = `${position.x}%`;
        this.cursorElement.style.top = `${position.y}%`;
        
        // 保存位置供其他方法使用
        this.cursorPosition = position;
    }

    showLocationDetails(location) {
        const detailsContainer = this.domUtils.get('#locationDetails');
        const locationList = this.domUtils.get('#locationList');
        const locationInfo = this.domUtils.get('#locationInfo');
        const locationImage = this.domUtils.get('#locationImage');

        if (!detailsContainer || !locationList) return;

        if (!location) {
            this.domUtils.toggle(detailsContainer, false);
            this.domUtils.toggle(locationList, true);
            return;
        }

        this.domUtils.toggle(detailsContainer, true, 'flex');
        this.domUtils.toggle(locationList, false);

        locationImage.innerHTML = `<div class="map-location-placeholder">${location.displayName}</div>`;
        let infoHTML = `
            <div class="tui-frame location-info-frame" id="locationInfoFrame" data-showing-hidden="false">
                <div class="tui-title">${location.displayName}</div>
                <p class="location-description">${location.description}</p>
            </div>
        `;
        locationInfo.innerHTML = infoHTML;
        
        this.updateAccessStatus(location, false);
    }

    updateAccessStatus(location, isShowingHidden) {
        const locationFooter = this.domUtils.get('#locationFooter');
        if (!locationFooter) return;
        
        let accessStatusHTML = '';
        if (isShowingHidden) {
            if (location.covertAccess) {
                accessStatusHTML = '<p class="access-info covert positive">已获准入</p>';
            } else {
                accessStatusHTML = '<p class="access-info covert negative">未获准入</p>';
            }
        } else {
            if (location.publicAccess) {
                accessStatusHTML = '<p class="access-info positive">可进入</p>';
            } else {
                accessStatusHTML = '<p class="access-info negative">禁止进入</p>';
            }
        }
        
        locationFooter.innerHTML = `<div class="tui-frame">${accessStatusHTML}</div>`;
    }

    updateCurrentLocation(locationName) {
        if (this.mapCurrentLocation) {
            this.mapCurrentLocation.textContent = locationName || "未知";
        }
    }

    highlightLocation(locationName) {
        const highlightedMarkers = this.domUtils.getAll('.location-marker.highlighted');
        highlightedMarkers.forEach(marker => {
            this.domUtils.removeClass(marker, 'highlighted');
        });
        
        if (locationName) {
            const marker = this.domUtils.get(`.location-marker[data-location="${locationName}"]`);
            if (marker) {
                this.domUtils.addClass(marker, 'highlighted');
            }
        }
        
        // 根据当前是否高倍缩放来调整字体
        if (this.isZoomed) {
            this.adjustLocationLabelFonts();
        } else {
            this.resetLocationLabelFonts();
        }
    }

    show() {
        // 显示地图界面
        this.domUtils.toggle(this.mapInterface, true, 'flex');
        
        // 更新颜色模式
        this.updateColorMode(this.domUtils.get('.screen').classList.contains('amber-mode'));
        
        // 维持地图状态和缩放
        this.applyMapTransform(this.currentMapZoomScale, this.currentMapOffsetX, this.currentMapOffsetY);
        
        // 更新视图状态相关样式
        const mapContent = this.domUtils.get('.map-content');
        if (this.isZoomed) {
            this.domUtils.addClass(mapContent, 'zoomed');
            this.adjustLocationLabelFonts();
        } else {
            this.domUtils.removeClass(mapContent, 'zoomed');
            this.resetLocationLabelFonts();
        }
        
        // 发布显示事件
        this.eventBus.emit('mapViewShown');
    }

    hide() {
        // 隐藏地图界面
        this.domUtils.toggle(this.mapInterface, false);
        
        // 发布隐藏事件
        this.eventBus.emit('mapViewHidden');
    }

    updateColorMode(isAmber) {
        this.domUtils.removeClass(this.mapInterface, 'amber-mode', 'green-mode');
        this.domUtils.addClass(this.mapInterface, isAmber ? 'amber-mode' : 'green-mode');
        this.updateMapBackground(isAmber);
    }

    flickerScreen(callback) {
        const screenElement = this.domUtils.get('.screen');
        if (this.audio) this.audio.play('screenSwitch');
        
        this.domUtils.addClass(screenElement, 'screen-flicker');
        setTimeout(() => {
            this.domUtils.removeClass(screenElement, 'screen-flicker');
            if (callback) callback();
        }, 75); 
    }

    highlightRegion(regionName) {
        const highlightedMarkers = this.domUtils.getAll('.region-marker.highlighted');
        highlightedMarkers.forEach(marker => {
            this.domUtils.removeClass(marker, 'highlighted');
        });
        
        if (regionName) {
            const marker = this.domUtils.get(`.region-marker[data-region="${regionName}"]`);
            if (marker) {
                this.domUtils.addClass(marker, 'highlighted');
            }
        }
    }

    adjustLocationLabelFonts() {
        const highlightedMarker = this.domUtils.get('.location-marker.highlighted');
        const selectedLocationName = highlightedMarker ? highlightedMarker.dataset.location : null;
        const allMarkers = this.domUtils.getAll('.location-marker');

        allMarkers.forEach(marker => {
            const label = marker.querySelector('.location-label');
            if (label) {
                // 在高倍细节状态下，只有选中的标记标签是正常大小，其他缩小
                if (selectedLocationName && marker.dataset.location !== selectedLocationName) {
                    label.style.fontSize = '6px'; 
                } else {
                    label.style.fontSize = '12px'; 
                }
            }
        });
    }

    resetLocationLabelFonts() {
        const allLabels = this.domUtils.getAll('.location-label');
        allLabels.forEach(label => {
            label.style.fontSize = '12px'; // 所有标签都恢复正常大小
        });
    }

    // 高亮指定列表项
    highlightListItem(index) {
        const locationList = this.domUtils.get('#locationList');
        if (!locationList) return;
        
        // 移除所有现有高亮
        const allItems = locationList.querySelectorAll('.map-location-item');
        allItems.forEach(item => this.domUtils.removeClass(item, 'selected'));
        
        // 高亮当前选中项
        if (allItems[index]) {
            this.domUtils.addClass(allItems[index], 'selected');
            
            // 确保选中项可见（滚动到视图中）
            allItems[index].scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }
    }
}