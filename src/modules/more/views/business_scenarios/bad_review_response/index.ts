/**
 * More 模块 - business scenario page
 */

import { createBusinessScenarioModule } from '../createBusinessScenarioModule';

const scenarioModule = createBusinessScenarioModule({
  moduleId: 'more_bad_review_response',
  templatePath: 'src/modules/more/views/business_scenarios/bad_review_response/template.html',
  caseId: 'bad_review_response',
});

export const mount = (container: HTMLElement) => scenarioModule.mount(container);
export const unmount = () => scenarioModule.unmount();
