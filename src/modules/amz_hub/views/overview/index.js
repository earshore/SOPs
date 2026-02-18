/**
 * Amazon智库总览 视图模块
 */

import { loadTemplate } from "../../../../common/utils/viewLoader";

export async function mount(container) {
    console.log('📚 [Hub Overview] 模块挂载中...');
    
    // 渲染模板
    const html = await loadTemplate('src/modules/amz_hub/views/overview/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');

    // 初始化事件监听
    initOverviewEvents(container);
    
    console.log('✅ [Hub Overview] 模块挂载完成');
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
                b.classList.remove('active', 'bg-blue-500', 'text-white');
                b.classList.add('bg-white', 'text-slate-700', 'border-slate-300');
            });
            
            // 添加当前按钮的 active 状态
            btn.classList.add('active', 'bg-blue-500', 'text-white');
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

/**
 * 滚动到指定模块
 * @param {string} categoryId - 分类 ID (knowledge, practice, advanced)
 */
export function scrollToModule(categoryId) {
    if (!categoryId) {
        console.warn('⚠️ scrollToModule: categoryId 为空');
        return;
    }
    
    const moduleId = `hub-module-${categoryId}`;
    const moduleElement = document.getElementById(moduleId);
    
    if (moduleElement) {
        // 使用平滑滚动
        moduleElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
        });
        
        // 添加高亮效果
        moduleElement.classList.add('hub-module-highlight');
        setTimeout(() => {
            moduleElement.classList.remove('hub-module-highlight');
        }, 2000);
        
        console.log(`✅ 滚动到模块: ${categoryId}`);
    } else {
        console.warn(`⚠️ 未找到模块元素: ${moduleId}`);
    }
}

export function unmount() {
    console.log('🔌 [Hub Overview] 模块卸载');
}
