/**
 * More 模块 - 使用须知
 */

import BaseModule from '../../../../../common/BaseModule';
import { setSafeHtml } from '../../../../../common/utils/security';
import { loadTemplate } from '../../../../../common/utils/viewLoader';
import { renderBusinessScenarioPage } from '../casePageRenderer';

class UsageNoticeModule extends BaseModule {
    async mount(container: HTMLElement): Promise<void> {
        const html = await loadTemplate('src/modules/more/views/business_scenarios/usage_notice/template.html');
        // ✅ 安全: 静态HTML模板，无用户输入
        setSafeHtml(container, renderBusinessScenarioPage(html, 'usage_notice'));
        container.classList.add('fade-in');
    }

    unmount(): void {
    }
}

const usageNoticeModule = new UsageNoticeModule('more_ziniao_usage_notice');

export const mount = (container: HTMLElement) => usageNoticeModule.mount(container);
export const unmount = () => usageNoticeModule.unmount();
