import { appCenterManifest } from './module.manifest';
import { sopsManifest } from '../sops/module.manifest';
import type { AppCenterRouteId } from './appCatalog';

type SopsRouteId = (typeof sopsManifest.routes)[number]['routeId'];

export interface AppCenterComplianceChecklistItem {
  id: string;
  label: string;
  routeId: SopsRouteId;
  reviewPoint: string;
}

export interface AppCenterWorkflowStep {
  id: string;
  title: string;
  summary: string;
  routeId: AppCenterRouteId;
  icon: string;
  inputs: readonly string[];
  outputs: readonly string[];
  reviewPoints: readonly string[];
  complianceRouteIds: readonly SopsRouteId[];
}

export interface AppCenterWorkflowDefinition {
  id: 'competitor_listing';
  title: string;
  description: string;
  primaryRouteId: AppCenterRouteId;
  steps: readonly AppCenterWorkflowStep[];
}

const appCenterRouteIds = new Set(appCenterManifest.routes.map(route => route.routeId));
const sopsRouteIds = new Set(sopsManifest.routes.map(route => route.routeId));

export const APP_CENTER_COMPLIANCE_CHECKLIST: readonly AppCenterComplianceChecklistItem[] = [
  {
    id: 'restricted_words',
    label: '高危词复核',
    routeId: 'sops_restricted_words',
    reviewPoint: 'Listing 文案复制或导出前，先检查欧洲本土化高危词。',
  },
  {
    id: 'brand_infringement',
    label: '品牌与侵权审核',
    routeId: 'sops_brand_infringement',
    reviewPoint: '涉及竞品名、兼容性表述和商标词时，保留人工复核。',
  },
  {
    id: 'product_compliance',
    label: '产品合规',
    routeId: 'sops_product_compliance',
    reviewPoint: '敏感品类、功效宣称和认证材料必须人工确认。',
  },
  {
    id: 'eu_gpsr',
    label: 'GPSR 合规',
    routeId: 'sops_eu_gpsr_compliance',
    reviewPoint: '欧洲站 Listing 上线前确认 GPSR 责任人与安全信息。',
  },
] as const;

export const APP_CENTER_WORKFLOW_DEFINITIONS: readonly AppCenterWorkflowDefinition[] = [
  {
    id: 'competitor_listing',
    title: '竞品与 Listing 作业流',
    description: '复用采集、AI 分析、Prompt 生成和 Keyword Hunter，形成可复核的 Listing 优化链路。',
    primaryRouteId: 'scraper',
    steps: [
      {
        id: 'scrape',
        title: '数据采集',
        summary: '输入 ASIN 和站点，保存采集历史。',
        routeId: 'scraper',
        icon: 'fas fa-spider',
        inputs: ['ASIN', 'marketplace'],
        outputs: ['HistoryItem', 'scrape_history artifact'],
        reviewPoints: ['确认站点、ASIN 和抓取成功状态'],
        complianceRouteIds: [],
      },
      {
        id: 'ai_analysis',
        title: 'AI 分析',
        summary: '读取当前历史，生成并绑定分析报告。',
        routeId: 'ai_analysis',
        icon: 'fas fa-brain',
        inputs: ['HistoryItem', 'analysis target'],
        outputs: ['analysis_report artifact'],
        reviewPoints: ['确认报告来源历史与当前 ASIN 一致'],
        complianceRouteIds: [],
      },
      {
        id: 'prompt_generation',
        title: 'Prompt 生成',
        summary: '读取报告和产品 DNA，保存 Listing Prompt。',
        routeId: 'promptlab',
        icon: 'fas fa-wand-magic-sparkles',
        inputs: ['analysis_report', 'product DNA'],
        outputs: ['listing_prompt artifact'],
        reviewPoints: ['确认 Prompt 未绕过人工 Listing 判断'],
        complianceRouteIds: [],
      },
      {
        id: 'keyword_review',
        title: '关键词复核',
        summary: '把 Prompt 或 Listing 文案带入 Keyword Hunter 复核。',
        routeId: 'keyword_hunter_input',
        icon: 'fas fa-search',
        inputs: ['listing_prompt', 'keyword list'],
        outputs: ['keyword_snapshot artifact'],
        reviewPoints: ['确认补词、覆盖率和 Listing 评审结果'],
        complianceRouteIds: [],
      },
      {
        id: 'compliance_review',
        title: '合规复核',
        summary: '复制或导出前完成高危词、侵权、产品合规和 GPSR 复核。',
        routeId: 'keyword_hunter_analysis',
        icon: 'fas fa-shield-halved',
        inputs: ['listing_prompt', 'keyword_snapshot'],
        outputs: ['compliance_check artifact'],
        reviewPoints: ['高危词', '品牌与侵权', '产品合规', 'GPSR'],
        complianceRouteIds: [
          'sops_restricted_words',
          'sops_brand_infringement',
          'sops_product_compliance',
          'sops_eu_gpsr_compliance',
        ],
      },
    ],
  },
] as const;

export function getAppCenterWorkflowDefinition(
  id: AppCenterWorkflowDefinition['id']
): AppCenterWorkflowDefinition {
  const workflow = APP_CENTER_WORKFLOW_DEFINITIONS.find(item => item.id === id);

  if (!workflow) {
    throw new Error(`Unknown App Center workflow "${id}"`);
  }

  return workflow;
}

APP_CENTER_COMPLIANCE_CHECKLIST.forEach(item => {
  if (!sopsRouteIds.has(item.routeId)) {
    throw new Error(
      `App Center compliance checklist references unknown SOPS route "${item.routeId}"`
    );
  }
});

APP_CENTER_WORKFLOW_DEFINITIONS.forEach(workflow => {
  workflow.steps.forEach(step => {
    if (!appCenterRouteIds.has(step.routeId)) {
      throw new Error(`App Center workflow references unknown route "${step.routeId}"`);
    }

    step.complianceRouteIds.forEach(routeId => {
      if (!sopsRouteIds.has(routeId)) {
        throw new Error(`App Center workflow references unknown compliance route "${routeId}"`);
      }
    });
  });
});
