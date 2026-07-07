/**
 * More 模块 - 差评 24 小时闪电响应
 */

import BaseModule from '@/common/BaseModule';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { setSafeHtml } from '@/common/utils/security';
import { renderBusinessScenarioPage } from '../casePageRenderer';

class BadReviewResponseModule extends BaseModule {
  async mount(container: HTMLElement): Promise<void> {
    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/more/views/business_scenarios/bad_review_response/template.html'
    );
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, renderBusinessScenarioPage(html, 'bad_review_response'));
    container.classList.add('fade-in');
  }

  unmount(): void {}
}

const badReviewResponseModule = new BadReviewResponseModule('more_bad_review_response');

export const mount = (container: HTMLElement) => badReviewResponseModule.mount(container);
export const unmount = () => badReviewResponseModule.unmount();
