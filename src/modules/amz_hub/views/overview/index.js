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

export function unmount() {
    console.log('🔌 [Hub Overview] 模块卸载');
}
