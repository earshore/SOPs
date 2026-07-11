/**
 * More 模块 - business scenario page
 */

import { createBusinessScenarioModule } from '../createBusinessScenarioModule';

const scenarioModule = createBusinessScenarioModule({
  moduleId: 'more_ad_acos_diagnosis',
  templatePath: 'src/modules/more/views/business_scenarios/ad_acos_diagnosis/template.html',
  caseId: 'ad_acos_diagnosis',
});

export const mount = (container: HTMLElement) => scenarioModule.mount(container);
export const unmount = () => scenarioModule.unmount();
