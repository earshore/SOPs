/**
 * 链接转化率低自查优化的五大方面 视图模块
 */

import BaseModule from '../../../../../common/BaseModule';
import templateHTML from './template.html?raw';

import { Logger } from '../../../../../services/loggerService';
// Module class
class ConversionOptimizationModule extends BaseModule {
    /**
     * 挂载模块
     */
    async mount(container: HTMLElement): Promise<void> {
        Logger.debug('📈 [Conversion Optimization] 模块挂载中...');

        // 渲染模板
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = templateHTML;

        Logger.debug('✅ [Conversion Optimization] 模块挂载完成');
    }

    /**
     * 卸载模块
     */
    unmount(): void {
        Logger.debug('🔌 [Conversion Optimization] 模块卸载');
    }
}

// 导出模块实例
const conversionOptimizationModule = new ConversionOptimizationModule('amz_conversion_optimization');

export const mount = (container: HTMLElement) => conversionOptimizationModule.mount(container);
export const unmount = () => conversionOptimizationModule.unmount();
