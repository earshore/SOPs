// src/modules/more/views/overview/index.js
// 更多总览页面

import { loadTemplate } from "../../../../common/utils/viewLoader.js";

console.log("🧭 更多总览页面加载...");

export async function mount(container) {
    try {
        // 加载HTML模板
        const html = await loadTemplate('src/modules/more/views/overview/template.html');
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = html;
        container.classList.add('fade-in');
        
        // 初始化事件监听
        initOverviewEvents(container);
        
        console.log("✅ 更多总览页面挂载完成");
    } catch (error) {
        console.error("❌ 更多总览页面挂载失败:", error);
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = `
            <div class="p-10 text-center text-red-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p>页面加载失败</p>
            </div>
        `;
    }
}

/**
 * 初始化事件监听
 */
function initOverviewEvents(container) {
    // 分类筛选按钮事件
    const filterBtns = container.querySelectorAll('.category-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除所有按钮的 active 状态
            filterBtns.forEach(b => {
                b.classList.remove('active', 'bg-green-500', 'text-white');
                b.classList.add('bg-white', 'text-slate-700', 'border-slate-300');
            });
            
            // 添加当前按钮的 active 状态
            btn.classList.add('active', 'bg-green-500', 'text-white');
            btn.classList.remove('bg-white', 'text-slate-700', 'border-slate-300');
            
            // 执行筛选
            const category = btn.dataset.category;
            filterByCategory(container, category);
        });
    });
}

/**
 * 按分类筛选
 */
function filterByCategory(container, category) {
    const sections = container.querySelectorAll('section[data-category]');
    
    sections.forEach(section => {
        if (category === 'all') {
            section.style.display = '';
            section.classList.add('fade-in');
        } else {
            if (section.dataset.category === category) {
                section.style.display = '';
                section.classList.add('fade-in');
            } else {
                section.style.display = 'none';
            }
        }
    });
}

export function unmount() {
    console.log("🧹 更多总览页面卸载");
}

/**
 * 滚动到指定的模块区域
 * @param {string} categoryId - 分类 ID (explore)
 */
export function scrollToModule(categoryId) {
    const moduleId = `more-module-${categoryId}`;
    const moduleElement = document.getElementById(moduleId);
    
    if (moduleElement) {
        // 使用平滑滚动
        moduleElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
        });
        
        // 添加高亮效果
        moduleElement.classList.add('more-module-highlight');
        setTimeout(() => {
            moduleElement.classList.remove('more-module-highlight');
        }, 2000);
        
        console.log(`✅ 滚动到模块: ${categoryId}`);
    } else {
        console.warn(`⚠️ 未找到模块: ${moduleId}`);
    }
}
