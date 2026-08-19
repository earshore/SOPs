import { createOwnerField } from '../../../utils/ownerField';
import { createSopTemplateModule } from '../../../utils/sopTemplateModule';
import { createTemplateCopyAction } from '../../../utils/templateCopyAction';

const REVIEW_OWNER_STORAGE_KEY = 'competitor_review_owner_v1';
const DEFAULT_REVIEW_OWNER = '运营负责人';

const reviewOwnerField = createOwnerField({
  storageKey: REVIEW_OWNER_STORAGE_KEY,
  defaultOwner: DEFAULT_REVIEW_OWNER,
  inputId: 'competitor-review-owner',
});

export function buildCompetitorReviewTemplate(owner = DEFAULT_REVIEW_OWNER): string {
  const today = new Date().toISOString().split('T')[0];
  const reviewOwner = reviewOwnerField.normalize(owner);

  return [
    `# 竞品监控周复盘归档 - ${today}`,
    '',
    '## 作业范围',
    `- 作业负责人：${reviewOwner}`,
    '- 自家 ASIN/SKU：',
    '- 站点：',
    '- 核心竞品 ASIN：',
    '- 监控周期：',
    '',
    '## 关键变化',
    '- 价格/Coupon 变化：',
    '- BSR/类目排名变化：',
    '- Review/评分变化：',
    '- 库存/配送变化：',
    '',
    '## 判断结论',
    '- 本周市场动态一句话：',
    '- 机会点：',
    '- 威胁点：',
    '- 需要继续观察：',
    '',
    '## 建议动作（人工确认后执行）',
    '- 调价/优惠：',
    '- 广告预算/出价：',
    '- Listing 改稿：',
    '- 竞品监控名单调整：',
    '',
    '## 人工确认点',
    '- 调价和 Coupon：已确认 / 待确认',
    '- 广告预算/出价调整：已确认 / 待确认',
    '- Listing 改稿和合规风险：已复核 / 待复核',
    `- 跟进负责人：${reviewOwner}`,
    '',
    '## 复盘记录',
    '- 本周已执行动作：',
    '- 关键截图或报表路径：',
    '- 下次复盘日期：',
    '- 下周跟进动作：',
    '',
    '> 竞品监控只生成响应建议，调价、加预算、Listing 改稿和投诉跟进必须由人工确认后执行。',
  ].join('\n');
}

const copyCompetitorReviewTemplate = createTemplateCopyAction({
  ownerField: reviewOwnerField,
  buildTemplate: buildCompetitorReviewTemplate,
  successMessage: '已复制竞品周复盘模板，可粘贴到周报或归档文档。',
  failureMessage: '复制失败，请手动复制周报模板或稍后重试。',
});

declare global {
  interface Window {
    sops_copyCompetitorReviewTemplate?: () => Promise<void>;
  }
}

// 竞品监控与分析 SOP
const competitorMonitoringModule = createSopTemplateModule({
  moduleId: 'competitor_monitoring',
  templatePath: 'src/modules/sops/views/growth/competitor_monitoring/template.html',
  ownerFields: [reviewOwnerField],
  actions: {
    sops_copyCompetitorReviewTemplate: copyCompetitorReviewTemplate,
  },
});

export const mount = (container: HTMLElement): Promise<void> =>
  competitorMonitoringModule.mount(container);
export const unmount = (): void => {
  competitorMonitoringModule.unmount();
};
