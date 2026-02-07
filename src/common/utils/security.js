// src/common/utils/security.js
// ================================================================
// 🎯 P0-2: XSS 安全防护工具
// 提供安全的 HTML 渲染方法
// ================================================================

/**
 * HTML 实体转义
 * 将特殊字符转换为 HTML 实体，防止 XSS 注入
 * 
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的安全字符串
 * 
 * @example
 * escapeHtml('<script>alert("XSS")</script>')
 * // 返回: '&lt;script&gt;alert("XSS")&lt;/script&gt;'
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') return '';

    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    return str.replace(/[&<>"'`=/]/g, char => escapeMap[char]);
}

/**
 * 批量转义对象中的字符串值
 * 
 * @param {Object} obj - 包含字符串值的对象
 * @returns {Object} 转义后的对象
 */
export function escapeObject(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;

    const result = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (typeof value === 'string') {
                result[key] = escapeHtml(value);
            } else if (typeof value === 'object') {
                result[key] = escapeObject(value);
            } else {
                result[key] = value;
            }
        }
    }

    return result;
}

/**
 * 安全的 innerHTML 设置
 * 使用文本节点替代直接 innerHTML 赋值
 * 
 * @param {HTMLElement} element - 目标元素
 * @param {string} text - 纯文本内容
 */
export function setTextContent(element, text) {
    if (!element) return;
    element.textContent = text;
}

/**
 * 安全的模板渲染
 * 转义所有变量后再插入 HTML
 * 
 * @param {string} template - HTML 模板字符串
 * @param {Object} data - 变量数据
 * @returns {string} 渲染后的安全 HTML
 * 
 * @example
 * safeTemplate('<div class="item">${title}</div>', { title: '<script>bad</script>' })
 * // 返回: '<div class="item">&lt;script&gt;bad&lt;/script&gt;</div>'
 */
export function safeTemplate(template, data) {
    return template.replace(/\$\{(\w+)\}/g, (match, key) => {
        const value = data[key];
        if (value === undefined || value === null) return '';
        return escapeHtml(String(value));
    });
}

/**
 * 安全的 HTML 片段创建
 * 使用 DOMParser 解析 HTML，自动移除危险元素
 * 
 * @param {string} html - HTML 字符串
 * @returns {DocumentFragment} 安全的文档片段
 */
export function createSafeFragment(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 移除危险元素
    const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form'];
    dangerousTags.forEach(tag => {
        doc.querySelectorAll(tag).forEach(el => el.remove());
    });

    // 移除危险属性
    const dangerousAttrs = ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur'];
    doc.querySelectorAll('*').forEach(el => {
        dangerousAttrs.forEach(attr => el.removeAttribute(attr));
        // 移除 javascript: 伪协议
        if (el.href && el.href.startsWith('javascript:')) {
            el.removeAttribute('href');
        }
    });

    const fragment = document.createDocumentFragment();
    while (doc.body.firstChild) {
        fragment.appendChild(doc.body.firstChild);
    }

    return fragment;
}

/**
 * 安全地设置元素 innerHTML
 * 先清理危险内容再设置
 * 
 * @param {HTMLElement} element - 目标元素
 * @param {string} html - HTML 字符串
 */
export function setSafeHtml(element, html) {
    if (!element) return;
    // ✅ 安全: 静态HTML模板，无用户输入
    element.innerHTML = '';
    element.appendChild(createSafeFragment(html));
}

/**
 * Markdown 安全渲染
 * 配合 marked.js 使用，清理输出
 * 
 * @param {string} markdown - Markdown 字符串
 * @param {Function} markdownParser - marked.parse 或类似函数
 * @returns {string} 安全的 HTML 字符串
 */
export function safeMarkdown(markdown, markdownParser) {
    if (!markdownParser) {
        console.warn('[Security] markdownParser not provided, returning escaped text');
        return escapeHtml(markdown);
    }

    // 先转换 Markdown
    const html = markdownParser(markdown);

    // 创建临时元素清理
    const temp = document.createElement('div');
    temp.appendChild(createSafeFragment(html));

    return temp.innerHTML;
}

/**
 * URL 安全检查
 * 验证 URL 是否安全（非 javascript: 等伪协议）
 * 
 * @param {string} url - URL 字符串
 * @returns {boolean} 是否安全
 */
export function isSafeUrl(url) {
    if (!url || typeof url !== 'string') return false;

    const normalized = url.trim().toLowerCase();
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];

    return !dangerousProtocols.some(protocol => normalized.startsWith(protocol));
}

/**
 * 安全的链接创建
 * 
 * @param {string} url - 链接地址
 * @param {string} text - 链接文本
 * @returns {string} 安全的 <a> 标签 HTML
 */
export function safeLink(url, text) {
    if (!isSafeUrl(url)) {
        return escapeHtml(text);
    }
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
}

// ================================================================
// 🔄 向后兼容：暴露到 window
// ================================================================
if (typeof window !== 'undefined') {
    window.SecurityUtils = {
        escapeHtml,
        escapeObject,
        setTextContent,
        safeTemplate,
        createSafeFragment,
        setSafeHtml,
        safeMarkdown,
        isSafeUrl,
        safeLink
    };
}

// 默认导出
export default {
    escapeHtml,
    escapeObject,
    setTextContent,
    safeTemplate,
    createSafeFragment,
    setSafeHtml,
    safeMarkdown,
    isSafeUrl,
    safeLink
};
