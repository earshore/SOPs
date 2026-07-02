/**
 * More 模块 - 广告优化 · 高 ACOS 关键词诊断
 */

import BaseModule from '../../../../../common/BaseModule';
import { setSafeHtml } from '../../../../../common/utils/security';
import { loadTemplate } from '../../../../../common/utils/viewLoader';
import { renderBusinessScenarioPage } from '../casePageRenderer';

class AdAcosDiagnosisModule extends BaseModule {
  async mount(container: HTMLElement): Promise<void> {
    const html = await loadTemplate(
      'src/modules/more/views/business_scenarios/ad_acos_diagnosis/template.html'
    );
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, renderBusinessScenarioPage(html, 'ad_acos_diagnosis'));
    container.classList.add('fade-in');
  }

  unmount(): void {}
}

const adAcosDiagnosisModule = new AdAcosDiagnosisModule('more_ad_acos_diagnosis');

export const mount = (container: HTMLElement) => adAcosDiagnosisModule.mount(container);
export const unmount = () => adAcosDiagnosisModule.unmount();
