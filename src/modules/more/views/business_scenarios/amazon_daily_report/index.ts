/**
 * More 模块 - 亚马逊基础报告 · 一键日报
 */

import BaseModule from '@/common/BaseModule';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { setSafeHtml } from '@/common/utils/security';
import { renderBusinessScenarioPage } from '../casePageRenderer';

class AmazonDailyReportModule extends BaseModule {
  async mount(container: HTMLElement): Promise<void> {
    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/more/views/business_scenarios/amazon_daily_report/template.html'
    );
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, renderBusinessScenarioPage(html, 'amazon_daily_report'));
    container.classList.add('fade-in');
  }

  unmount(): void {}
}

const amazonDailyReportModule = new AmazonDailyReportModule('more_amazon_daily_report');

export const mount = (container: HTMLElement) => amazonDailyReportModule.mount(container);
export const unmount = () => amazonDailyReportModule.unmount();
