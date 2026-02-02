/**
 * Amazon智库总览 视图模块
 */

import templateHTML from './template.html?raw';

export async function mount(container) {
    console.log('📚 [Hub Overview] 模块挂载中...');
    
    // 渲染模板
    container.innerHTML = templateHTML;
    
    console.log('✅ [Hub Overview] 模块挂载完成');
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
