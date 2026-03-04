/**
 * More 模块 - 工作流页面
 * 展示可用的工作流模板和配置
 */

import BaseModule from '../../../../../common/BaseModule';
import { loadTemplate } from '../../../../../common/utils/viewLoader';

import { Logger } from '../../../../../services/loggerService';
// Module class
class WorkflowsModule extends BaseModule {
    /**
     * 挂载模块
     */
    async mount(container: HTMLElement): Promise<void> {
        const html = await loadTemplate('src/modules/more/views/explore/workflows/template.html');
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = html;
        container.classList.add('fade-in');

        Logger.debug('✅ 工作流模块已挂载');
    }

    /**
     * 卸载模块
     */
    unmount(): void {
        Logger.debug('❌ 工作流模块已卸载');
    }
}

// 导出模块实例
const workflowsModule = new WorkflowsModule('more_workflows');

export const mount = (container: HTMLElement) => workflowsModule.mount(container);
export const unmount = () => workflowsModule.unmount();
