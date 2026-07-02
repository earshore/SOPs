/**
 * More 模块 - 评论监控 · 全店铺多语种聚合
 */

import BaseModule from '../../../../../common/BaseModule';
import { setSafeHtml } from '../../../../../common/utils/security';
import { loadTemplate } from '../../../../../common/utils/viewLoader';
import { renderBusinessScenarioPage } from '../casePageRenderer';

class ReviewMonitorModule extends BaseModule {
  async mount(container: HTMLElement): Promise<void> {
    const html = await loadTemplate(
      'src/modules/more/views/business_scenarios/review_monitor/template.html'
    );
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, renderBusinessScenarioPage(html, 'review_monitor'));
    container.classList.add('fade-in');
  }

  unmount(): void {}
}

const reviewMonitorModule = new ReviewMonitorModule('more_review_monitor');

export const mount = (container: HTMLElement) => reviewMonitorModule.mount(container);
export const unmount = () => reviewMonitorModule.unmount();
