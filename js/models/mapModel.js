// js/models/mapModel.js
class MapModel {
    constructor() {
        // 地图初始化
        this.currentLocation = "办公室";
        this.locations = {
            "办公室": {
                description: "情报分析人员所在的办公区，这里有多台计算机设备和打印机。",
                coordinates: [200, 100], // 像素坐标
                connections: ["走廊", "资料室"]
            },
            "走廊": {
                description: "连接办公区和其他房间的走廊，墙壁上挂着一些安全提醒。",
                coordinates: [288, 364], // 像素坐标
                connections: ["办公室", "档案室", "实验室"]
            },
            "资料室": {
                description: "存放各种纸质文档和资料的房间，有许多书架和文件柜。",
                coordinates: [207, 200], // 像素坐标
                connections: ["办公室", "储藏室"]
            },
            "档案室": {
                description: "存放重要档案的房间，需要特殊权限才能进入。",
                coordinates: [388, 200], // 像素坐标
                connections: ["走廊"]
            },
            "实验室": {
                description: "进行各种实验和测试的地方，有许多精密仪器。",
                coordinates: [569, 264], // 像素坐标
                connections: ["走廊", "服务器室"]
            },
            "储藏室": {
                description: "存放办公用品和设备的小房间。",
                coordinates: [607, 236], // 像素坐标
                connections: ["资料室"]
            },
            "服务器室": {
                description: "放置服务器和网络设备的房间，温度较低，有嗡嗡的噪音。",
                coordinates: [869, 200], // 像素坐标
                connections: ["实验室"]
            }
        };
        
        // 地图状态
        this.isVisible = false;
        this.selectedLocation = null;
    }
    
    // 获取位置信息
    getLocation(name) {
        return this.locations[name] || null;
    }
    
    // 获取所有位置
    getAllLocations() {
        return { ...this.locations };
    }
    
    // 获取当前位置
    getCurrentLocation() {
        return {
            name: this.currentLocation,
            ...this.locations[this.currentLocation]
        };
    }
    
    // 设置当前位置
    setCurrentLocation(name) {
        if (this.locations[name]) {
            this.currentLocation = name;
            return true;
        }
        return false;
    }
    
    // 选择位置以显示详情
    selectLocation(name) {
        if (this.locations[name]) {
            this.selectedLocation = name;
            return true;
        }
        return false;
    }
    
    // 获取所选位置
    getSelectedLocation() {
        if (!this.selectedLocation) return null;
        
        return {
            name: this.selectedLocation,
            ...this.locations[this.selectedLocation]
        };
    }
    
    // 切换地图可见性
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        return this.isVisible;
    }
    
    // 设置地图可见性
    setVisibility(isVisible) {
        this.isVisible = isVisible;
        return this.isVisible;
    }
    
    // 判断两个位置是否相连
    areLocationsConnected(loc1, loc2) {
        if (!this.locations[loc1] || !this.locations[loc2]) {
            return false;
        }
        
        return this.locations[loc1].connections.includes(loc2);
    }
}