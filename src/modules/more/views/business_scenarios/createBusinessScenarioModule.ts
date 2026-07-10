/**
 * Factory for business scenario case pages backed by casePageRenderer.
 */

import {
  createStaticTemplateModule,
  type StaticTemplateModule,
} from '@/common/utils/createStaticTemplateModule';
import { renderBusinessScenarioPage } from './casePageRenderer';

type CaseId =
  | 'usage_notice'
  | 'bad_review_response'
  | 'ad_acos_diagnosis'
  | 'review_monitor'
  | 'amazon_daily_report';

export interface BusinessScenarioModuleConfig {
  moduleId: string;
  templatePath: string;
  caseId: CaseId;
}

export type BusinessScenarioModule = StaticTemplateModule;

export function createBusinessScenarioModule(
  config: BusinessScenarioModuleConfig
): BusinessScenarioModule {
  return createStaticTemplateModule({
    moduleId: config.moduleId,
    templatePath: config.templatePath,
    transformHtml: html => renderBusinessScenarioPage(html, config.caseId),
  });
}
