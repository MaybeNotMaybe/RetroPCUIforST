// js/views/mapView.js
class MapView {
    constructor() {
        // 获取DOM元素
        this.mapInterface = document.getElementById('mapInterface');
        this.mapContent = document.getElementById('mapContent');
        this.mapCurrentLocation = document.getElementById('mapCurrentLocation');
        this.terminal = document.getElementById('terminal');
        this.screen = document.querySelector('.screen');
        this.cursorElement = null;
        this.isTestMode = false;

        // --- 地图三级缩放状态的配置 ---
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

        // 标记物在CSS中定义的原始缩放（通常是1）
        this.defaultMarkerCssScale = 1.2; 

        // 标记物/光标的目标视窗尺寸调整因子
        this.markerApparentSizeFactor = 1.0;       // 用于 defaultMapZoomScale (默认概览状态)
        this.zoomedMarkerApparentSizeFactor = 2; // 用于 highDetailZoomScale (高倍细节状态)

        // isZoomed 现在表示是否处于 highDetailZoomScale 状态
        this.isZoomed = false; 

        EventBus.on('testModeChanged', (isEnabled) => {
            this.isTestMode = isEnabled;
            console.log(`地图视图测试模式: ${isEnabled ? '已启用' : '已禁用'}`);
        });
    }

    // 应用指定的变换到地图容器和背景
    applyMapTransform(scale, offsetX, offsetY) {
        const locationsContainer = document.getElementById('mapLocationsContainer');
        const mapBackground = document.getElementById('mapBackground');
        if (!locationsContainer) return;

        this.currentMapZoomScale = scale;
        this.currentMapOffsetX = offsetX;
        this.currentMapOffsetY = offsetY;

        const transform = `translate(${offsetX}%, ${offsetY}%) scale(${scale})`;
        locationsContainer.style.transform = transform;
        if (mapBackground) {
            mapBackground.style.transform = transform;
        }
        // 每次地图变换后，都需要重新计算标记物和光标的缩放
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

        const locationsContainer = document.getElementById('mapLocationsContainer');
        if (locationsContainer) {
            this.cursorElement = document.createElement('div');
            this.cursorElement.className = 'map-cursor';
            this.cursorElement.style.transform = 'translate(-50%, -50%)'; // 初始居中
            locationsContainer.appendChild(this.cursorElement);
        }
        this.updateMapBackground(this.screen.classList.contains('amber-mode'));
        
        // 初始化时应用默认的地图缩放和偏移
        this.applyMapTransform(this.defaultMapZoomScale, this.defaultMapOffsetX, this.defaultMapOffsetY);
        this.resetLocationLabelFonts(); // 初始时使用默认概览状态的字体
    }

    renderMap(locations, currentLocation, onLocationClick = null) {
        const locationsContainer = document.getElementById('mapLocationsContainer');
        if (!locationsContainer) return;
        
        const currentCursor = this.cursorElement;
        locationsContainer.innerHTML = ''; 
        if (currentCursor) { 
            locationsContainer.appendChild(currentCursor);
        }

        for (const [name, data] of Object.entries(locations)) {
            const [x, y] = data.coordinates;
            const locationMarker = document.createElement('div');
            locationMarker.className = 'location-marker';
            locationMarker.dataset.location = name;
            locationMarker.style.left = `${x}%`;
            locationMarker.style.top = `${y}%`;
            locationMarker.style.transform = 'translate(-50%, -50%)'; // 初始居中

            const label = document.createElement('span');
            label.className = 'location-label';
            label.textContent = name;
            locationMarker.appendChild(label);

            if (name === currentLocation) {
                locationMarker.classList.add('current');
            }

            locationMarker.addEventListener('click', (e) => {
                e.stopPropagation();
                EventBus.emit('locationSelected', name);
                if (onLocationClick) {
                    onLocationClick(name, x, y);
                }
            });
            locationsContainer.appendChild(locationMarker);
        }

        if (locations[currentLocation]) {
            this.mapCurrentLocation.textContent = currentLocation;
        } else {
            this.mapCurrentLocation.textContent = "未知";
        }

        this.renderLocationList(locations, currentLocation);
        this.applyMarkerScaling(); // 应用当前状态的标记物缩放
        
        if (this.isZoomed) { 
            this.adjustLocationLabelFonts();
        } else {
            this.resetLocationLabelFonts();
        }
    }

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
        const items = locationList.querySelectorAll('.map-location-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const locationName = item.dataset.location;
                if (window.mapController) {
                    window.mapController.handleLocationSelection(locationName);
                } else {
                    EventBus.emit('locationSelected', locationName);
                }
            });
        });
    }

    // 渲染区域的方法
    renderRegions(regions, onRegionClick = null) {
        const locationsContainer = document.getElementById('mapLocationsContainer');
        if (!locationsContainer) return;
        
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
            const regionMarker = document.createElement('div');
            regionMarker.className = 'location-marker region-marker';
            regionMarker.dataset.region = name;
            regionMarker.style.left = `${x}%`;
            regionMarker.style.top = `${y}%`;
            regionMarker.style.transform = 'translate(-50%, -50%)'; 
            
            // 如果是当前区域，添加current类
            if (name === currentRegion) {
                regionMarker.classList.add('current');
            }
            
            // 如果当前位置在该区域内，也添加视觉指示
            if (currentLocation && data.locations && data.locations.includes(currentLocation)) {
                regionMarker.classList.add('highlighted');
            }
            
            const label = document.createElement('span');
            label.className = 'location-label';
            label.textContent = name;
            regionMarker.appendChild(label);

            regionMarker.addEventListener('click', (e) => {
                e.stopPropagation();
                // 高亮点击的区域
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
        const locationList = document.getElementById('locationList');
        if (!locationList) return;
        let listHTML = '<div class="tui-frame"><div class="tui-title">可用区域</div>';
        for (const [name, data] of Object.entries(regions)) {
            listHTML += `<div class="map-location-item" data-region="${name}">${name}</div>`;
        }
        listHTML += '</div>';
        locationList.innerHTML = listHTML;
        const items = locationList.querySelectorAll('.map-location-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const regionName = item.dataset.region;
                if (window.mapController) {
                    window.mapController.handleRegionSelection(regionName);
                }
            });
        });
    }

    // 设置视图状态方法
    setViewState(state, centerOn = null) {
        const mapContent = document.querySelector('.map-content');
        if (!mapContent) return;
        
        // 保存当前状态用于检测变化
        const previousState = this.viewState;
        this.viewState = state;
        
        switch(state) {
            case 'default':
                // 默认概览状态 - 显示区域
                mapContent.classList.remove('zoomed', 'region-zoomed');
                this.applyMapTransform(this.defaultMapZoomScale, this.defaultMapOffsetX, this.defaultMapOffsetY);
                this.resetLocationLabelFonts();
                this.isZoomed = false; // 重要：确保isZoomed状态正确
                break;
                
            case 'region':
                // 区域缩放状态 - 显示区域内地点
                mapContent.classList.remove('zoomed');
                mapContent.classList.add('region-zoomed');
                if (centerOn) {
                    const targetScale = this.midLevelZoomScale;
                    const offsetX = (50 - centerOn.x) * targetScale;
                    const offsetY = (50 - centerOn.y) * targetScale;
                    this.applyMapTransform(targetScale, offsetX, offsetY);
                } else {
                    this.applyMapTransform(this.midLevelZoomScale, this.midLevelOffsetX, this.midLevelOffsetY);
                }
                this.resetLocationLabelFonts();
                this.isZoomed = false; // 在区域视图中，isZoomed仍为false
                break;
                
            case 'location':
                // 高倍详情状态 - 显示地点详情
                mapContent.classList.add('zoomed');
                mapContent.classList.remove('region-zoomed');
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
                this.isZoomed = true; // 只有在位置视图中，isZoomed才为true
                break;
        }
        
        // 如果状态发生变化，确保重新应用标记缩放
        if (previousState !== state) {
                this.applyMarkerScaling();
        }
    }

    applyMarkerScaling() {
        const allMarkers = document.querySelectorAll('.location-marker');
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

    // toggleZoom 现在用于在“默认概览”和“高倍细节”之间切换
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

    // zoomAndCenterOn 总是将地图设置为高倍细节状态，并居中于指定点
    zoomAndCenterOn(x, y) {
        const mapContent = document.querySelector('.map-content');
        if (!mapContent) return;

        this.isZoomed = true; // 进入高倍细节状态
        mapContent.classList.add('zoomed');

        const targetScale = this.highDetailZoomScale;
        // 计算使目标点 (x,y) 居中的偏移量
        // (50 - coord)% 意味着将 coord 移动到 50% 的位置
        // 这个偏移量需要乘以目标缩放比例，因为 transform 的百分比是相对于元素自身大小的
        const offsetX = (50 - x) * targetScale; 
        const offsetY = (50 - y) * targetScale;
        
        this.applyMapTransform(targetScale, offsetX, offsetY);
        
        console.log(`Zooming to detail: (${x}%,${y}%), Container Scale: ${targetScale}, Offset: (${offsetX}%, ${offsetY}%)`);
        this.adjustLocationLabelFonts();
    }

    updateMapBackground(isAmber) {
        const mapBackground = document.getElementById('mapBackground');
        if (mapBackground) {
            mapBackground.style.backgroundImage = isAmber ?
                'url("https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@65dac4b/assets/images/map_amber_33.png")' :
                'url("https://cdn.jsdelivr.net/gh/MaybeNotMaybe/RetroPCUIforST@65dac4b/assets/images/map_green_33.png")';
        }
    }

    updateCursorPosition(position) {
        if (!this.cursorElement) return;
        // 光标的位置是相对于 locationsContainer 的，其 transform 已由 applyMapTransform 处理
        // 所以这里直接设置 left/top 即可
        this.cursorElement.style.left = `${position.x}%`;
        this.cursorElement.style.top = `${position.y}%`;
        // 光标的 scale 由 applyMarkerScaling 统一处理
    }

    showLocationDetails(location) {
        const detailsContainer = document.getElementById('locationDetails');
        const locationList = document.getElementById('locationList');
        const locationInfo = document.getElementById('locationInfo');
        const locationImage = document.getElementById('locationImage');

        if (!detailsContainer || !locationList) return;

        if (!location) {
            detailsContainer.style.display = 'none';
            locationList.style.display = 'block'; 
            return;
        }

        detailsContainer.style.display = 'flex';
        locationList.style.display = 'none'; 

        locationImage.innerHTML = `<div class="map-location-placeholder">${location.displayName}</div>`;
        let infoHTML = `
            <div class="tui-frame location-info-frame" id="locationInfoFrame" data-showing-hidden="false">
                <div class="tui-title">${location.displayName}</div>
                <p class="location-description">${location.description}</p>
            </div>
        `;
        locationInfo.innerHTML = infoHTML;

        const infoFrame = document.getElementById('locationInfoFrame');
        if (infoFrame) {
            infoFrame.addEventListener('click', () => {
                if ((location.knowsHidden || location.disguiseRevealed) && (location.hiddenDescription || location.isDisguised)) {
                    const isShowingHidden = infoFrame.dataset.showingHidden === 'true';
                    infoFrame.dataset.showingHidden = isShowingHidden ? 'false' : 'true';
                    const titleElement = infoFrame.querySelector('.tui-title');
                    if (titleElement && location.isDisguised && location.disguiseRevealed && !isShowingHidden) {
                        titleElement.textContent = location.realName;
                        locationImage.innerHTML = `<div class="map-location-placeholder">${location.realName}</div>`;
                    } else if (titleElement && isShowingHidden) {
                        titleElement.textContent = location.displayName;
                        locationImage.innerHTML = `<div class="map-location-placeholder">${location.displayName}</div>`;
                    }
                    const descElement = infoFrame.querySelector('.location-description');
                    if (descElement && location.knowsHidden) {
                        if (!isShowingHidden && location.hiddenDescription) {
                            descElement.textContent = location.hiddenDescription;
                            descElement.classList.add('revealed');
                            if (window.audioManager) window.audioManager.play('dataReveal');
                        } else {
                            descElement.textContent = location.description;
                            descElement.classList.remove('revealed');
                        }
                    }
                    this.updateAccessStatus(location, !isShowingHidden);
                }
            });
        }
        this.updateAccessStatus(location, false);
    }

    updateAccessStatus(location, isShowingHidden) {
        const locationFooter = document.getElementById('locationFooter');
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
        const highlightedMarkers = document.querySelectorAll('.location-marker.highlighted');
        highlightedMarkers.forEach(marker => marker.classList.remove('highlighted'));
        
        if (locationName) {
            const marker = document.querySelector(`.location-marker[data-location="${locationName}"]`);
            if (marker) {
                marker.classList.add('highlighted');
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
        const action = () => {
            this.terminal.style.display = 'none';
            this.mapInterface.style.display = 'flex';
            this.updateColorMode(this.screen.classList.contains('amber-mode'));

            // 重新显示时，恢复当前的地图变换状态
            this.applyMapTransform(this.currentMapZoomScale, this.currentMapOffsetX, this.currentMapOffsetY);

            const mapContent = document.querySelector('.map-content');
            if (this.isZoomed) { // 如果是高倍细节状态
                mapContent?.classList.add('zoomed');
                this.adjustLocationLabelFonts();
            } else { // 默认概览状态
                mapContent?.classList.remove('zoomed');
                this.resetLocationLabelFonts();
            }
        };
        if (this.isTestMode) {
            action();
        } else {
            this.flickerScreen(action);
        }
    }

    hide() {
        const action = () => {
            this.terminal.style.display = 'flex';
            this.mapInterface.style.display = 'none';
        };
        if (this.isTestMode) {
            action();
        } else {
            this.flickerScreen(action);
        }
    }

    updateColorMode(isAmber) {
        this.mapInterface.classList.remove('amber-mode', 'green-mode');
        this.mapInterface.classList.add(isAmber ? 'amber-mode' : 'green-mode');
        this.updateMapBackground(isAmber);
    }

    flickerScreen(callback) {
        const screenElement = document.querySelector('.screen'); // Renamed to avoid conflict
        if (window.audioManager) window.audioManager.play('screenSwitch');
        screenElement.classList.add('screen-flicker');
        setTimeout(() => {
            screenElement.classList.remove('screen-flicker');
            if (callback) callback();
        }, 75); 
    }

    highlightRegion(regionName) {
        const highlightedMarkers = document.querySelectorAll('.region-marker.highlighted');
        highlightedMarkers.forEach(marker => marker.classList.remove('highlighted'));
        
        if (regionName) {
            const marker = document.querySelector(`.region-marker[data-region="${regionName}"]`);
            if (marker) {
                marker.classList.add('highlighted');
            }
        }
    }

    adjustLocationLabelFonts() { // 用于高倍细节状态
        const highlightedMarker = document.querySelector('.location-marker.highlighted');
        const selectedLocationName = highlightedMarker ? highlightedMarker.dataset.location : null;
        const allMarkers = document.querySelectorAll('.location-marker');

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

    resetLocationLabelFonts() { // 用于默认概览状态
        const allLabels = document.querySelectorAll('.location-label');
        allLabels.forEach(label => {
            label.style.fontSize = '12px'; // 所有标签都恢复正常大小
        });
    }
}
