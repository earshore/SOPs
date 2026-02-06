// src/common/utils/xssFixer.js
// ================================================================
// 🔒 P0修复: XSS防护增强工具
// 提供安全的DOM操作包装函数
// ================================================================

import { escapeHtml, setSafeHtml, createSafeFragment } from './security.js';

/**
 * 安全的innerHTML设置 (自动转义)
 * 用于替换所有 element.innerHTML = xxx 的场景
 * 
 * @param {HTMLElement} element - 目标元素
 * @param {string} html - HTML字符串
 * @param {boolean} [trusted=false] - 是否信任内容(静态模板可设为true)
 * 
 * @example
 * // ❌ 危险
 * container.innerHTML = `<div>${userInput}</div>`;
 * 
 * // ✅ 安全
 * setInnerHTML(container, `<div>${userInput}</div>`);
 */
export function setInnerHTML(element, html, trusted = false) {
    if (!element) {
        console.warn('[XSSFixer] Element is null or undefined');
        return;
    }
    
    if (trusted) {
        // 信任的内容(如静态模板),直接设置
        element.innerHTML = html;
    } else {
        // 不信任的内容,使用安全方法
        setSafeHtml(element, html);
    }
}

/**
 * 安全的模板渲染 (自动转义变量)
 * 
 * @param {HTMLElement} element - 目标元素
 * @param {string} template - 模板字符串 (使用 ${var} 占位符)
 * @param {Object} data - 数据对象
 * @param {string[]} [trustedKeys=[]] - 信任的键名列表(不转义)
 * 
 * @example
 * setTemplate(container, '<div class="title">${title}</div>', { title: userInput });
 */
export function setTemplate(element, template, data, trustedKeys = []) {
    if (!element) return;
    
    const html = template.replace(/\$\{(\w+)\}/g, (match, key) => {
        const value = data[key];
        if (value === undefined || value === null) return '';
        
        // 检查是否为信任的键
        if (trustedKeys.includes(key)) {
            return String(value);
        }
        
        return escapeHtml(String(value));
    });
    
    element.innerHTML = html;
}

/**
 * 安全的列表渲染
 * 
 * @param {HTMLElement} element - 目标元素
 * @param {Array} items - 数据数组
 * @param {Function} renderItem - 渲染函数 (item, index) => html
 * @param {boolean} [trusted=false] - 渲染函数返回的HTML是否可信
 * 
 * @example
 * renderList(container, products, (product) => `
 *   <div class="product">
 *     <h3>${product.title}</h3>
 *     <p>${product.price}</p>
 *   </div>
 * `);
 */
export function renderList(element, items, renderItem, trusted = false) {
    if (!element || !Array.isArray(items)) return;
    
    if (items.length === 0) {
        element.innerHTML = '';
        return;
    }
    
    if (trusted) {
        // 信任的渲染函数,直接拼接
        element.innerHTML = items.map((item, index) => renderItem(item, index)).join('');
    } else {
        // 不信任的渲染函数,逐个安全插入
        element.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        items.forEach((item, index) => {
            const html = renderItem(item, index);
            const safeFragment = createSafeFragment(html);
            fragment.appendChild(safeFragment);
        });
        
        element.appendChild(fragment);
    }
}

/**
 * 安全的文本设置 (纯文本,无HTML)
 * 
 * @param {HTMLElement} element - 目标元素
 * @param {string} text - 文本内容
 * 
 * @example
 * setText(titleElement, userInput); // 永远安全
 */
export function setText(element, text) {
    if (!element) return;
    element.textContent = text;
}

/**
 * 安全的属性设置
 * 
 * @param {HTMLElement} element - 目标元素
 * @param {string} attr - 属性名
 * @param {string} value - 属性值
 * 
 * @example
 * setAttr(link, 'href', userUrl); // 自动验证URL安全性
 */
export function setAttr(element, attr, value) {
    if (!element) return;
    
    // 特殊处理危险属性
    if (attr === 'href' || attr === 'src') {
        // 验证URL安全性
        if (value && !isSafeUrl(value)) {
            console.warn(`[XSSFixer] Unsafe URL blocked: ${value}`);
            return;
        }
    }
    
    // 禁止设置事件处理器属性
    if (attr.startsWith('on')) {
        console.warn(`[XSSFixer] Event handler attribute blocked: ${attr}`);
        return;
    }
    
    element.setAttribute(attr, value);
}

/**
 * URL安全检查
 * @private
 */
function isSafeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const normalized = url.trim().toLowerCase();
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
    return !dangerousProtocols.some(protocol => normalized.startsWith(protocol));
}

/**
 * 批量替换工具 - 用于代码迁移
 * 扫描元素树,找出所有可能的XSS风险点
 * 
 * @param {HTMLElement} root - 根元素
 * @returns {Array} 风险点列表
 */
export function scanXSSRisks(root = document.body) {
    const risks = [];
    
    // 扫描所有元素
    const allElements = root.querySelectorAll('*');
    
    allElements.forEach((element, index) => {
        // 检查危险属性
        const dangerousAttrs = ['onclick', 'onerror', 'onload', 'onmouseover'];
        dangerousAttrs.forEach(attr => {
            if (element.hasAttribute(attr)) {
                risks.push({
                    type: 'dangerous-attribute',
                    element,
                    attribute: attr,
                    value: element.getAttribute(attr),
                    severity: 'high'
                });
            }
        });
        
        // 检查危险URL
        if (element.href && element.href.startsWith('javascript:')) {
            risks.push({
                type: 'dangerous-url',
                element,
                attribute: 'href',
                value: element.href,
                severity: 'high'
            });
        }
    });
    
    return risks;
}

// 默认导出
export default {
    setInnerHTML,
    setTemplate,
    renderList,
    setText,
    setAttr,
    scanXSSRisks
};
