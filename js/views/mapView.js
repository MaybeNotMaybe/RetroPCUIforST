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
    }
    
    // 渲染完整地图
    renderMap(locations, currentLocation) {
        // 确保mapGrid元素存在
        const mapGrid = document.getElementById('mapGrid');
        if (!mapGrid) {
            console.error("找不到地图网格元素");
            return;
        }
        
        // 清空现有内容
        mapGrid.innerHTML = '';
        
        // 创建20x20的网格
        for (let y = 0; y < 20; y++) {
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
            cell.addEventListener('click', () => {
                // 发布位置选择事件
                EventBus.emit('locationSelected', name);
            });
        }
        
        // 绘制连接线
        this.drawConnections(locations);
        
        // 更新坐标显示
        const currentCoords = locations[currentLocation].coordinates;
        this.mapCoordinates.textContent = `${currentCoords[0]}.0, ${currentCoords[1]}.0`;
    }
    
    // 绘制位置之间的连接线
    drawConnections(locations) {
        const mapGrid = document.getElementById('mapGrid');
        
        // 移除现有的连接线
        const existingConnections = document.querySelectorAll('.map-connection');
        existingConnections.forEach(conn => conn.remove());
        
        // 遍历所有位置
        for (const [name, data] of Object.entries(locations)) {
            const [x1, y1] = data.coordinates;
            
            // 遍历该位置的所有连接
            for (const connectedName of data.connections) {
                // 防止重复绘制连接线（只绘制字母顺序较小的一方到另一方）
                if (name < connectedName) {
                    const [x2, y2] = locations[connectedName].coordinates;
                    
                    // 创建连接线元素
                    const connection = document.createElement('div');
                    connection.className = 'map-connection';
                    
                    // 计算线的位置和尺寸
                    const cellSize = 26; // 单元格尺寸（包括边框）
                    const startX = x1 * cellSize + cellSize / 2;
                    const startY = y1 * cellSize + cellSize / 2;
                    const endX = x2 * cellSize + cellSize / 2;
                    const endY = y2 * cellSize + cellSize / 2;
                    
                    // 计算连线长度和角度
                    const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                    const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
                    
                    // 设置连线样式
                    connection.style.width = `${length}px`;
                    connection.style.height = '1px';
                    connection.style.left = `${startX}px`;
                    connection.style.top = `${startY}px`;
                    connection.style.transformOrigin = '0 0';
                    connection.style.transform = `rotate(${angle}deg)`;
                    
                    // 添加到地图网格
                    mapGrid.appendChild(connection);
                }
            }
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
        // 隐藏终端，显示地图
        this.terminal.style.display = 'none';
        this.mapInterface.style.display = 'flex';
        
        // 确保地图界面继承当前屏幕的颜色模式
        this.updateColorMode(this.screen.classList.contains('amber-mode'));
    }
    
    // 隐藏地图界面
    hide() {
        // 显示终端，隐藏地图
        this.terminal.style.display = 'flex';
        this.mapInterface.style.display = 'none';
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
}