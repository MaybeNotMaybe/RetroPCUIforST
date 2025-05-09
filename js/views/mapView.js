// js/views/mapView.js
class MapView {
    constructor() {
        // 获取DOM元素
        this.mapInterface = document.getElementById('mapInterface');
        this.mapContent = document.getElementById('mapContent');
        this.mapCoordinates = document.getElementById('mapCoordinates');
        
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
                <div class="map-grid" id="mapGrid"></div>
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

        // 添加光标元素
        const mapGrid = document.getElementById('mapGrid');
        if (mapGrid) {
            this.cursorElement = document.createElement('div');
            this.cursorElement.className = 'map-cursor';
            mapGrid.appendChild(this.cursorElement);
        }
    }
    
    // 渲染完整地图
    renderMap(locations, currentLocation, onLocationClick = null) {
        // 确保mapGrid元素存在
        const mapGrid = document.getElementById('mapGrid');
        if (!mapGrid) {
            console.error("找不到地图网格元素");
            return;
        }
        
        // 清空现有内容
        mapGrid.innerHTML = '';
        
        // 创建20x14的网格
        for (let y = 0; y < 14; y++) {
            for (let x = 0; x < 20; x++) {
                const cell = document.createElement('div');
                cell.className = 'map-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                mapGrid.appendChild(cell);
            }
        }
        
        // 添加位置标记
        for (const [name, data] of Object.entries(locations)) {
            const [x, y] = data.coordinates;
            const cell = mapGrid.children[y * 20 + x];
            
            // 添加位置类
            cell.classList.add('location');
            cell.dataset.location = name;
            cell.textContent = name.charAt(0); // 显示首字母
            
            // 标记当前位置
            if (name === currentLocation) {
                cell.classList.add('current');
            }
            
            // 为每个位置添加点击事件监听器
            cell.addEventListener('click', (e) => {
                // 阻止事件冒泡，防止触发背景点击取消选择
                e.stopPropagation();
                
                // 发布位置选择事件
                EventBus.emit('locationSelected', name);
                
                // 如果提供了点击回调，则调用并传递位置信息
                if (onLocationClick) {
                    onLocationClick(name, x, y);
                }
            });
        }
        
        // 更新坐标显示
        const currentCoords = locations[currentLocation].coordinates;
        this.mapCoordinates.textContent = `${currentCoords[0]}.0, ${currentCoords[1]}.0`;
        
        // 重新添加光标元素
        this.cursorElement = document.createElement('div');
        this.cursorElement.className = 'map-cursor';
        mapGrid.appendChild(this.cursorElement);
    }

    // 更新光标位置
    updateCursorPosition(position) {
        if (!this.cursorElement) return;
        
        const cellSize = 26; // 单元格尺寸（包括边框）
        this.cursorElement.style.left = `${position.x * cellSize}px`;
        this.cursorElement.style.top = `${position.y * cellSize}px`;
        
        // 高亮当前单元格
        const mapGrid = document.getElementById('mapGrid');
        const cells = mapGrid.querySelectorAll('.map-cell');
        
        // 移除所有cursor-highlight类
        cells.forEach(cell => cell.classList.remove('cursor-highlight'));
        
        // 添加到当前单元格
        const index = position.y * 20 + position.x;
        if (cells[index]) {
            cells[index].classList.add('cursor-highlight');
        }
    }
    
    // 显示位置详情
    showLocationDetails(location) {
        const detailsElement = document.getElementById('locationDetails');
        if (!detailsElement) return;
        
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
    }
    
    // 高亮显示选中的位置
    highlightLocation(locationName) {
        // 移除之前的高亮
        const highlightedCells = document.querySelectorAll('.map-cell.highlighted');
        highlightedCells.forEach(cell => cell.classList.remove('highlighted'));
        
        // 如果提供了位置名，添加高亮
        if (locationName) {
            const cell = document.querySelector(`.map-cell[data-location="${locationName}"]`);
            if (cell) {
                cell.classList.add('highlighted');
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