// js/utils/storageUtils.js
/**
 * 存储工具类
 * 提供本地存储的读写操作，包括JSON序列化和错误处理
 */
class StorageUtils {
    /**
     * 将数据保存到localStorage
     * @param {string} key - 存储键
     * @param {*} data - 要存储的数据
     * @param {boolean} [stringify=true] - 是否序列化数据
     * @returns {boolean} 是否成功
     */
    save(key, data, stringify = true) {
        try {
            const valueToStore = stringify ? JSON.stringify(data) : data;
            localStorage.setItem(key, valueToStore);
            return true;
        } catch (error) {
            console.error(`保存数据到 "${key}" 失败:`, error);
            return false;
        }
    }

    /**
     * 从localStorage加载数据
     * @param {string} key - 存储键
     * @param {*} [defaultValue=null] - 默认值
     * @param {boolean} [parse=true] - 是否解析数据
     * @returns {*} 加载的数据或默认值
     */
    load(key, defaultValue = null, parse = true) {
        try {
            const data = localStorage.getItem(key);
            
            if (data === null) {
                return defaultValue;
            }
            
            return parse ? JSON.parse(data) : data;
        } catch (error) {
            console.error(`从 "${key}" 加载数据失败:`, error);
            return defaultValue;
        }
    }

    /**
     * 从localStorage删除数据
     * @param {string} key - 存储键
     * @returns {boolean} 是否成功
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`删除 "${key}" 数据失败:`, error);
            return false;
        }
    }

    /**
     * 清除所有localStorage数据
     * @returns {boolean} 是否成功
     */
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('清除所有存储数据失败:', error);
            return false;
        }
    }

    /**
     * 检查键是否存在
     * @param {string} key - 存储键
     * @returns {boolean} 是否存在
     */
    has(key) {
        return localStorage.getItem(key) !== null;
    }

    /**
     * 获取所有存储的键
     * @returns {Array<string>} 键数组
     */
    keys() {
        return Object.keys(localStorage);
    }

    /**
     * 获取存储的项目数量
     * @returns {number} 项目数量
     */
    size() {
        return localStorage.length;
    }
}

// 创建全局实例
window.StorageUtils = new StorageUtils();