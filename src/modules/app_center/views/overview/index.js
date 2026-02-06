// src/modules/app_center/views/overview/index.js
// 应用中心总览页面

import { loadTemplate } from "../../../../common/utils/viewLoader.js";

console.log("🧭 应用中心总览页面加载...");

/**
 * 挂载overview页面
 * @param {HTMLElement} container - 容器DOM元素
 * @returns {Promise<void>}
 */
export async function mount(container) {
    // 验证容器元素
    if (!container || !(container instanceof HTMLElement)) {
        console.error("❌ 无效的容器元素:", container);
        throw new Error("mount函数需要有效的HTMLElement作为参数");
    }

    try {
        // 加载HTML模板
        const html = await loadTemplate('src/modules/app_center/views/overview/template.html');
        container.innerHTML = html;
        container.classList.add('fade-in');
        
        // 初始化事件监听
        initOverviewEvents(container);
        
        console.log("✅ App Center 总览模块已挂载");
    } catch (error) {
        console.error("❌ App Center 总览页面加载失败:", error);
        container.innerHTML = `
            <div class="p-10 text-center text-red-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p>页面加载失败，请刷新重试</p>
            </div>
        `;
    }
}

/**
 * 卸载overview页面
 * @returns {void}
 */
export function unmount() {
    console.log("🧹 App Center 总览模块已卸载");
}

/**
 * 滚动到指定分类区域
 * @param {string} categoryId - 分类ID (如'apps')
 * @returns {void}
 */
export function scrollToModule(categoryId) {
    if (!categoryId) {
        console.warn('⚠️ scrollToModule: categoryId为空');
        return;
    }
    
    const moduleId = `app-module-${categoryId}`;
    const moduleElement = document.getElementById(moduleId);
    
    if (moduleElement) {
        // 使用平滑滚动
        moduleElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
        });
        
        // 添加高亮效果
        moduleElement.classList.add('app-module-highlight');
        setTimeout(() => {
            moduleElement.classList.remove('app-module-highlight');
        }, 2000);
        
        console.log(`✅ 滚动到模块: ${categoryId}`);
    } else {
        console.warn(`⚠️ 未找到模块元素: ${moduleId}`);
    }
}

/**
 * 初始化overview页面事件监听
 * @param {HTMLElement} container - 容器元素
 */
function initOverviewEvents(container) {
    // 1. 子应用卡片点击事件
    const appCards = container.querySelectorAll('[data-action="switch-tab"]');
    
    if (appCards.length === 0) {
        console.warn('⚠️ 未找到任何可点击的应用卡片');
    }
    
    appCards.forEach(card => {
        try {
            card.addEventListener('click', () => {
                const targetTab = card.dataset.tab;
                if (!targetTab) {
                    console.error('❌ 卡片缺少data-tab属性:', card);
                    return;
                }
                // 触发路由切换（由全局路由系统处理）
                window.dispatchEvent(new CustomEvent('route-change', {
                    detail: { routeId: targetTab }
                }));
            });
        } catch (error) {
            console.error('❌ 添加事件监听器失败:', error);
        }
    });

    // 2. 快速入口按钮点击事件
    const quickLinks = container.querySelectorAll('[data-quick-link]');
    quickLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetRoute = link.dataset.quickLink;
            if (targetRoute) {
                window.dispatchEvent(new CustomEvent('route-change', {
                    detail: { routeId: targetRoute }
                }));
            }
        });
    });
}
