/**
 * More 模块 - business scenario page
 */

import { createBusinessScenarioModule } from '../createBusinessScenarioModule';

const scenarioModule = createBusinessScenarioModule({
  moduleId: 'more_ziniao_usage_notice',
  templatePath: 'src/modules/more/views/business_scenarios/usage_notice/template.html',
  caseId: 'usage_notice',
});

export const mount = (container: HTMLElement) => scenarioModule.mount(container);
export const unmount = () => scenarioModule.unmount();
