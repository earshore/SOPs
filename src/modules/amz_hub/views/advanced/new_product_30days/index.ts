/**
 * 新品30天极速突围 视图模块
 */

import BaseModule from '../../../../../common/BaseModule';
import templateHTML from './template.html?raw';

// Module class
class NewProduct30DaysModule extends BaseModule {
    /**
     * 挂载模块
     */
    async mount(container: HTMLElement): Promise<void> {
        console.log('🚀 [New Product 30 Days] 模块挂载中...');

        // 渲染模板
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = templateHTML;

        console.log('✅ [New Product 30 Days] 模块挂载完成');
    }

    /**
     * 卸载模块
     */
    unmount(): void {
        console.log('🔌 [New Product 30 Days] 模块卸载');
    }
}

// 导出模块实例
const newProduct30DaysModule = new NewProduct30DaysModule('amz_new_product_30days');

export const mount = (container: HTMLElement) => newProduct30DaysModule.mount(container);
export const unmount = () => newProduct30DaysModule.unmount();
