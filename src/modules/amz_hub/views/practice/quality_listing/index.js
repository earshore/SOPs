/**
 * 教你打造优质Listing 视图模块
 */

import templateHTML from './template.html?raw';

export async function mount(container) {
    console.log('📦 [Quality Listing] 模块挂载中...');
    
    // 渲染模板
    container.innerHTML = templateHTML;
    
    console.log('✅ [Quality Listing] 模块挂载完成');
}

export function unmount() {
    console.log('🔌 [Quality Listing] 模块卸载');
}
