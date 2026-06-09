/**
 * More 模块 - Agent Center 页面
 * 管理 Agent 产品应用、能力编排与接入状态
 */

import BaseModule from '../../../../../common/BaseModule';
import { setSafeHtml } from '../../../../../common/utils/security';
import { loadTemplate } from '../../../../../common/utils/viewLoader';

// Module class
class AgentsModule extends BaseModule {
    /**
     * 挂载模块
     */
    async mount(container: HTMLElement): Promise<void> {
        const html = await loadTemplate('src/modules/more/views/explore/agents/template.html');
        // ✅ 安全: 静态HTML模板，无用户输入
        setSafeHtml(container, html);
        container.classList.add('fade-in');

    }

    /**
     * 卸载模块
     */
    unmount(): void {
    }
}

// 导出模块实例
const agentsModule = new AgentsModule('more_agents');

export const mount = (container: HTMLElement) => agentsModule.mount(container);
export const unmount = () => agentsModule.unmount();
