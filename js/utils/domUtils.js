// js/utils/domUtils.js
/**
 * DOM操作工具类
 * 提供DOM元素的创建、查询、修改等常用功能
 */
class DOMUtils {
    constructor() {
        this.cache = {};
    }

    /**
     * 获取DOM元素
     * @param {string} selector - CSS选择器
     * @param {boolean} [useCache=true] - 是否使用缓存
     * @returns {Element|null} DOM元素或null
     */
    get(selector, useCache = true) {
        if (useCache && this.cache[selector]) {
            return this.cache[selector];
        }
        
        const element = document.querySelector(selector);
        
        if (useCache && element) {
            this.cache[selector] = element;
        }
        
        return element;
    }

    /**
     * 获取多个DOM元素
     * @param {string} selector - CSS选择器
     * @returns {NodeList} 匹配的DOM元素列表
     */
    getAll(selector) {
        return document.querySelectorAll(selector);
    }

    /**
     * 创建DOM元素
     * @param {string} tag - 标签名
     * @param {Object} [attributes={}] - 属性对象
     * @param {Array} [children=[]] - 子元素数组
     * @returns {Element} 新创建的DOM元素
     */
    create(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        // 设置属性
        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                // 事件监听器
                const eventName = key.substring(2).toLowerCase();
                element.addEventListener(eventName, value);
            } else {
                element.setAttribute(key, value);
            }
        }
        
        // 添加子元素
        for (const child of children) {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        }
        
        return element;
    }

    /**
     * 显示/隐藏元素
     * @param {string|Element} selectorOrElement - CSS选择器或DOM元素
     * @param {boolean} [visible=true] - 是否可见
     * @param {string} [displayValue='block'] - 显示时的display值
     */
    toggle(selectorOrElement, visible = true, displayValue = 'block') {
        const element = typeof selectorOrElement === 'string' 
            ? this.get(selectorOrElement) 
            : selectorOrElement;
            
        if (element) {
            element.style.display = visible ? displayValue : 'none';
        }
    }

    /**
     * 添加/移除类
     * @param {string|Element} selectorOrElement - CSS选择器或DOM元素
     * @param {string} className - 类名
     * @param {boolean} [force] - 强制添加或移除
     */
    toggleClass(selectorOrElement, className, force) {
        const element = typeof selectorOrElement === 'string' 
            ? this.get(selectorOrElement) 
            : selectorOrElement;
            
        if (element) {
            element.classList.toggle(className, force);
        }
    }

    /**
     * 添加类
     * @param {string|Element} selectorOrElement - CSS选择器或DOM元素
     * @param {string|Array} classNames - 类名或类名数组
     */
    addClass(selectorOrElement, classNames) {
        const element = typeof selectorOrElement === 'string' 
            ? this.get(selectorOrElement) 
            : selectorOrElement;
            
        if (!element) return;
        
        if (Array.isArray(classNames)) {
            element.classList.add(...classNames);
        } else {
            element.classList.add(classNames);
        }
    }

    /**
     * 移除类
     * @param {string|Element} selectorOrElement - CSS选择器或DOM元素
     * @param {string|Array} classNames - 类名或类名数组
     */
    removeClass(selectorOrElement, classNames) {
        const element = typeof selectorOrElement === 'string' 
            ? this.get(selectorOrElement) 
            : selectorOrElement;
            
        if (!element) return;
        
        if (Array.isArray(classNames)) {
            element.classList.remove(...classNames);
        } else {
            element.classList.remove(classNames);
        }
    }

    /**
     * 设置元素属性
     * @param {string|Element} selectorOrElement - CSS选择器或DOM元素
     * @param {string} attribute - 属性名
     * @param {string} value - 属性值
     */
    setAttribute(selectorOrElement, attribute, value) {
        const element = typeof selectorOrElement === 'string' 
            ? this.get(selectorOrElement) 
            : selectorOrElement;
            
        if (element) {
            element.setAttribute(attribute, value);
        }
    }

    /**
     * 添加事件监听器
     * @param {string|Element} selectorOrElement - CSS选择器或DOM元素
     * @param {string} eventType - 事件类型
     * @param {Function} handler - 事件处理函数
     * @param {Object} [options] - 事件选项
     */
    on(selectorOrElement, eventType, handler, options) {
        const element = typeof selectorOrElement === 'string' 
            ? this.get(selectorOrElement) 
            : selectorOrElement;
            
        if (element) {
            element.addEventListener(eventType, handler, options);
        }
    }

    /**
     * 移除事件监听器
     * @param {string|Element} selectorOrElement - CSS选择器或DOM元素
     * @param {string} eventType - 事件类型
     * @param {Function} handler - 事件处理函数
     * @param {Object} [options] - 事件选项
     */
    off(selectorOrElement, eventType, handler, options) {
        const element = typeof selectorOrElement === 'string' 
            ? this.get(selectorOrElement) 
            : selectorOrElement;
            
        if (element) {
            element.removeEventListener(eventType, handler, options);
        }
    }

    /**
     * 清除缓存
     * @param {string} [selector] - 特定选择器，如果未提供则清除所有缓存
     */
    clearCache(selector) {
        if (selector) {
            delete this.cache[selector];
        } else {
            this.cache = {};
        }
    }
}

// 创建全局实例
window.DOMUtils = new DOMUtils();