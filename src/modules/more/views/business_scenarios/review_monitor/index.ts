/**
 * More 模块 - business scenario page
 */

import { createBusinessScenarioModule } from '../createBusinessScenarioModule';

const scenarioModule = createBusinessScenarioModule({
  moduleId: 'more_review_monitor',
  templatePath: 'src/modules/more/views/business_scenarios/review_monitor/template.html',
  caseId: 'review_monitor',
});

export const mount = (container: HTMLElement) => scenarioModule.mount(container);
export const unmount = () => scenarioModule.unmount();
