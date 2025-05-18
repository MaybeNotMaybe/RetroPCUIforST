// js/core/serviceLocator.js
/**
 * 服务定位器
 * 提供依赖注入和服务管理功能
 */
class ServiceLocator {
    constructor() {
        this.services = {};
        this.loading = {};
    }

    /**
     * 注册服务
     * @param {string} name - 服务名称
     * @param {object|function} provider - 服务实例或工厂函数
     */
    register(name, provider) {
        if (typeof provider === 'function' && !this._isClass(provider)) {
            // 如果提供者是工厂函数，则延迟初始化
            this.services[name] = {
                instance: null,
                factory: provider
            };
        } else {
            // 如果提供者是实例或类，则直接使用
            this.services[name] = {
                instance: provider,
                factory: null
            };
        }
    }

    /**
     * 获取服务
     * @param {string} name - 服务名称
     * @returns {object|null} 服务实例或null
     */
    get(name) {
        const service = this.services[name];
        
        if (!service) {
            console.warn(`服务 "${name}" 未注册`);
            return null;
        }

        // 如果服务正在加载中，返回null以避免循环依赖
        if (this.loading[name]) {
            console.warn(`检测到循环依赖: 服务 "${name}" 正在加载中`);
            return null;
        }

        // 如果服务还未实例化，使用工厂函数创建实例
        if (!service.instance && service.factory) {
            try {
                this.loading[name] = true;
                service.instance = service.factory(this);
                delete this.loading[name];
            } catch (error) {
                delete this.loading[name];
                console.error(`初始化服务 "${name}" 失败:`, error);
                return null;
            }
        }

        return service.instance;
    }

    /**
     * 检查是否已注册服务
     * @param {string} name - 服务名称
     * @returns {boolean} 是否已注册
     */
    has(name) {
        return !!this.services[name];
    }

    /**
     * 检查参数是否为类（构造函数）
     * @private
     * @param {function} func - 要检查的函数
     * @returns {boolean} 是否为类
     */
    _isClass(func) {
        return typeof func === 'function' 
               && /^\s*class\s+/.test(func.toString());
    }
}

// 创建全局单例
window.ServiceLocator = new ServiceLocator();