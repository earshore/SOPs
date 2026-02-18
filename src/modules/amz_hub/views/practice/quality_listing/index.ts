/**
 * 教你打造优质Listing 视图模块
 */

import BaseModule from '../../../../../common/BaseModule';
import templateHTML from './template.html?raw';

// Module class
class QualityListingModule extends BaseModule {
    /**
     * 挂载模块
     */
    async mount(container: HTMLElement): Promise<void> {
        console.log('📦 [Quality Listing] 模块挂载中...');

        // 渲染模板
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = templateHTML;

        console.log('✅ [Quality Listing] 模块挂载完成');
    }

    /**
     * 卸载模块
     */
    unmount(): void {
        console.log('🔌 [Quality Listing] 模块卸载');
    }
}

// 导出模块实例
const qualityListingModule = new QualityListingModule('amz_quality_listing');

export const mount = (container: HTMLElement) => qualityListingModule.mount(container);
export const unmount = () => qualityListingModule.unmount();
