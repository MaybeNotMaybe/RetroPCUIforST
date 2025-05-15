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

        // 地图缩放和标记物缩放相关的属性
        this.currentMapZoomScale = 1.0; // 当前地图容器的缩放级别
        this.defaultMarkerCssScale = 1.0; // 标记物在CSS中定义的原始缩放（通常是1）

        // 用户可调参数：
        // 1. 地图未放大时，标记物目标视窗尺寸调整因子
        //    1.0 表示标记物在屏幕上看起来与其CSS定义的原始尺寸一致
        this.markerApparentSizeFactor = 1.0; // <<<< 你可以在这里调整地图未放大时的标记物大小

        // 2. 地图放大后，标记物目标视窗尺寸调整因子
        //    例如，如果地图放大了5倍 (currentMapZoomScale = 5)，
        //    zoomedMarkerApparentSizeFactor = 1.0 会让标记物尝试保持其原始CSS大小 (实际scale = 1/5 * 1.0 = 0.2)
        //    zoomedMarkerApparentSizeFactor = 0.5 会让标记物看起来是原始CSS大小的一半 (实际scale = 1/5 * 0.5 = 0.1)
        this.zoomedMarkerApparentSizeFactor = 2; // <<<< 你可以在这里调整地图放大后的标记物缩小程度

        // 添加缩放状态标记
        this.isZoomed = false; // mapView 内部的缩放状态跟踪

        EventBus.on('testModeChanged', (isEnabled) => {
            this.isTestMode = isEnabled;
            console.log(`地图视图测试模式: ${isEnabled ? '已启用' : '已禁用'}`);
        });
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
            // 光标的初始 transform 仅用于居中，缩放将在 applyMarkerScaling 中应用
            this.cursorElement.style.transform = 'translate(-50%, -50%)';
            locationsContainer.appendChild(this.cursorElement);
        }
        this.updateMapBackground(this.screen.classList.contains('amber-mode'));
    }

    renderMap(locations, currentLocation, onLocationClick = null) {
        const locationsContainer = document.getElementById('mapLocationsContainer');
        if (!locationsContainer) {
            console.error("找不到地图位置容器元素");
            return;
        }
        // 清空时，保留光标元素
        const currentCursor = this.cursorElement;
        locationsContainer.innerHTML = ''; 
        if (currentCursor) { // 如果光标存在，重新附加
            locationsContainer.appendChild(currentCursor);
        }


        for (const [name, data] of Object.entries(locations)) {
            const [x, y] = data.coordinates;
            const locationMarker = document.createElement('div');
            locationMarker.className = 'location-marker';
            locationMarker.dataset.location = name;
            locationMarker.style.left = `${x}%`;
            locationMarker.style.top = `${y}%`;
            // 初始 transform 仅用于居中，缩放将在 applyMarkerScaling 中应用
            locationMarker.style.transform = 'translate(-50%, -50%)';


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
        this.applyMarkerScaling(); 
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

    applyMarkerScaling() {
        const allMarkers = document.querySelectorAll('.location-marker');
        let effectiveApparentSizeFactor;

        if (this.currentMapZoomScale > 1.0) { // 地图已放大
            effectiveApparentSizeFactor = this.zoomedMarkerApparentSizeFactor;
        } else { // 地图未放大
            effectiveApparentSizeFactor = this.markerApparentSizeFactor;
        }
        
        const safeMapZoomScale = this.currentMapZoomScale === 0 ? 1.0 : this.currentMapZoomScale;
        const newMarkerCssScale = (this.defaultMarkerCssScale / safeMapZoomScale) * effectiveApparentSizeFactor;

        allMarkers.forEach(marker => {
            // 确保 translate(-50%, -50%) 始终存在，并与 scale 结合
            marker.style.transform = `translate(-50%, -50%) scale(${newMarkerCssScale})`;
        });

        // 对光标应用同样的缩放逻辑
        if (this.cursorElement) {
            this.cursorElement.style.transform = `translate(-50%, -50%) scale(${newMarkerCssScale})`;
        }
    }

    toggleZoom(centerOn = null) {
        const mapContent = document.querySelector('.map-content');
        const locationsContainer = document.getElementById('mapLocationsContainer');
        const mapBackground = document.getElementById('mapBackground');
        if (!mapContent || !locationsContainer) return;

        this.isZoomed = !this.isZoomed; 

        if (this.isZoomed) {
            mapContent.classList.add('zoomed');
            if (centerOn) {
                this.zoomAndCenterOn(centerOn.x, centerOn.y);
            } else {
                if (this.currentMapZoomScale <= 1.0) { 
                    this.currentMapZoomScale = 5.0; 
                }
                 const transform = `scale(${this.currentMapZoomScale})`;
                 locationsContainer.style.transform = transform;
                 if (mapBackground) {
                     mapBackground.style.transform = transform;
                 }
                this.applyMarkerScaling(); // 需要在容器缩放后应用标记和光标的缩放
            }
            this.adjustLocationLabelFonts();
        } else { 
            mapContent.classList.remove('zoomed');
            locationsContainer.style.transform = ''; 
            if (mapBackground) {
                mapBackground.style.transform = '';
            }
            this.currentMapZoomScale = 1.0; 
            this.applyMarkerScaling(); 
            this.resetLocationLabelFonts();
        }
    }

    zoomAndCenterOn(x, y) {
        const locationsContainer = document.getElementById('mapLocationsContainer');
        const mapBackground = document.getElementById('mapBackground');
        if (!locationsContainer) return;

        const targetMapZoomScale = 5; 
        this.currentMapZoomScale = targetMapZoomScale; 

        const finalTranslateX = (50 - x) * targetMapZoomScale;
        const finalTranslateY = (50 - y) * targetMapZoomScale;
        const transform = `translate(${finalTranslateX}%, ${finalTranslateY}%) scale(${targetMapZoomScale})`;
        
        locationsContainer.style.transform = transform;
        if (mapBackground) {
            mapBackground.style.transform = transform;
        }
        
        console.log(`Zooming to: (${x}%,${y}%), Container Scale: ${targetMapZoomScale}, Effective Translation: (${finalTranslateX}%, ${finalTranslateY}%)`);
        this.applyMarkerScaling(); // 应用标记物和光标缩放
    }

    updateMapBackground(isAmber) {
        const mapBackground = document.getElementById('mapBackground');
        if (mapBackground) {
            mapBackground.style.backgroundImage = isAmber ?
                'url("assets/images/map_amber_33.png")' :
                'url("assets/images/map_green_33.png")';
        }
    }

    updateCursorPosition(position) {
        if (!this.cursorElement) return;
        this.cursorElement.style.left = `${position.x}%`;
        this.cursorElement.style.top = `${position.y}%`;
        // 光标的高亮逻辑（如果需要）可以放在这里，或者通过CSS类控制
        // 例如，如果光标本身有高亮状态，确保它不受其他标记高亮的影响
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
        
        // 移除光标可能有的高亮类（如果光标自身也实现了高亮）
        // if (this.cursorElement) {
        //     this.cursorElement.classList.remove('cursor-highlight'); // 假设有这个类
        // }

        if (locationName) {
            const marker = document.querySelector(`.location-marker[data-location="${locationName}"]`);
            if (marker) {
                marker.classList.add('highlighted');
            }
        }
        // 字体调整现在应该在 applyMarkerScaling 后，或者在 zoom/unzoom 时统一处理
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
            this.applyMarkerScaling(); 
             if (this.isZoomed) {
                this.adjustLocationLabelFonts();
            } else {
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
        const screen = document.querySelector('.screen');
        if (window.audioManager) window.audioManager.play('screenSwitch');
        screen.classList.add('screen-flicker');
        setTimeout(() => {
            screen.classList.remove('screen-flicker');
            if (callback) callback();
        }, 75); 
    }

    adjustLocationLabelFonts() {
        const highlightedMarker = document.querySelector('.location-marker.highlighted');
        const selectedLocationName = highlightedMarker ? highlightedMarker.dataset.location : null;
        const allMarkers = document.querySelectorAll('.location-marker');

        allMarkers.forEach(marker => {
            const label = marker.querySelector('.location-label');
            if (label) {
                if (this.isZoomed && selectedLocationName && marker.dataset.location !== selectedLocationName) {
                    label.style.fontSize = '6px'; 
                } else {
                    label.style.fontSize = '12px'; 
                }
            }
        });
    }

    resetLocationLabelFonts() {
        const allLabels = document.querySelectorAll('.location-label');
        allLabels.forEach(label => {
            label.style.fontSize = '12px';
        });
    }
}
