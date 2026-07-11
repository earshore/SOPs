/**
 * More 模块 - business scenario page
 */

import { createBusinessScenarioModule } from '../createBusinessScenarioModule';

const scenarioModule = createBusinessScenarioModule({
  moduleId: 'more_amazon_daily_report',
  templatePath: 'src/modules/more/views/business_scenarios/amazon_daily_report/template.html',
  caseId: 'amazon_daily_report',
});

export const mount = (container: HTMLElement) => scenarioModule.mount(container);
export const unmount = () => scenarioModule.unmount();
