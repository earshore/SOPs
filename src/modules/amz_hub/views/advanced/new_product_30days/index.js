/**
 * 新品30天极速突围 视图模块
 */

import templateHTML from './template.html?raw';

export async function mount(container) {
    console.log('🚀 [New Product 30 Days] 模块挂载中...');
    
    // 渲染模板
    container.innerHTML = templateHTML;
    
    console.log('✅ [New Product 30 Days] 模块挂载完成');
}

export function unmount() {
    console.log('🔌 [New Product 30 Days] 模块卸载');
}
