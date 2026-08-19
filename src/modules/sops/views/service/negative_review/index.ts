import { createOwnerField } from '../../../utils/ownerField';
import { createSopTemplateModule } from '../../../utils/sopTemplateModule';
import { createTemplateCopyAction } from '../../../utils/templateCopyAction';

const REVIEW_OWNER_STORAGE_KEY = 'negative_review_owner_v1';
const DEFAULT_REVIEW_OWNER = '客服负责人';

const reviewOwnerField = createOwnerField({
  storageKey: REVIEW_OWNER_STORAGE_KEY,
  defaultOwner: DEFAULT_REVIEW_OWNER,
  inputId: 'negative-review-owner',
});

export function buildNegativeReviewTemplate(owner = DEFAULT_REVIEW_OWNER): string {
  const today = new Date().toISOString().split('T')[0];
  const reviewOwner = reviewOwnerField.normalize(owner);

  return [
    `# 差评 VOC 复盘归档 - ${today}`,
    '',
    '## 作业范围',
    `- 作业负责人：${reviewOwner}`,
    '- ASIN/SKU：',
    '- 站点：',
    '- 评论链接：',
    '- 星级/评论时间：',
    '',
    '## 问题分级',
    '- 优先级：P0 / P1 / P2 / P3',
    '- 问题类型：质量 / 物流 / 描述不符 / 使用误解 / 恶意或无关',
    '- 是否带图/视频：是 / 否',
    '- 是否影响主力 ASIN：是 / 否',
    '',
    '## 关键证据',
    '- 评论原文摘录：',
    '- 订单/客服记录：',
    '- 图片或视频证据：',
    '- 同类问题出现次数：',
    '',
    '## 建议动作（人工确认后执行）',
    '- Seller Comment 草稿：',
    '- 是否尝试 Report：',
    '- 是否需要补偿或售后处理：',
    '- 需要反馈 Listing / 包装 / 质检 / 供应商：',
    '',
    '## 人工确认点',
    '- 公开回复内容：已确认 / 待确认',
    '- Report 证据和理由：已确认 / 待确认',
    '- 补偿、换货或退款动作：已确认 / 待确认',
    '- 质量整改或供应商追责：已确认 / 待确认',
    `- 最终确认人：${reviewOwner}`,
    '',
    '## 复盘记录',
    '- 本次处理结论：',
    '- 已同步对象：客服 / 运营 / 质检 / 供应商',
    '- 下次跟进日期：',
    '- 进入 VOC 周报：是 / 否',
    '',
    '> 差评回复、Report、补偿和质量整改均属于高风险动作，必须人工确认后执行；严禁诱导买家修改或删除评价。',
  ].join('\n');
}

const copyNegativeReviewTemplate = createTemplateCopyAction({
  ownerField: reviewOwnerField,
  buildTemplate: buildNegativeReviewTemplate,
  successMessage: '已复制差评 VOC 复盘模板，可粘贴到周报或归档文档。',
  failureMessage: '复制失败，请手动复制 VOC 模板或稍后重试。',
});

declare global {
  interface Window {
    sops_copyNegativeReviewTemplate?: () => Promise<void>;
  }
}

// 差评处理与分析 SOP
const negativeReviewModule = createSopTemplateModule({
  moduleId: 'negative_review',
  templatePath: 'src/modules/sops/views/service/negative_review/template.html',
  ownerFields: [reviewOwnerField],
  actions: {
    sops_copyNegativeReviewTemplate: copyNegativeReviewTemplate,
  },
});

export const mount = (container: HTMLElement): Promise<void> =>
  negativeReviewModule.mount(container);
export const unmount = (): void => {
  negativeReviewModule.unmount();
};
