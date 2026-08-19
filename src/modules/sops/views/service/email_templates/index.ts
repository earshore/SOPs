import { createOwnerField } from '../../../utils/ownerField';
import {
  createSopTemplateModule,
  type SopTemplateModuleContext,
} from '../../../utils/sopTemplateModule';
/**
 * 邮件回复模板 SOP - 静态版
 * Email Reply Templates SOP - Static Version
 */
import { createTemplateCopyAction } from '../../../utils/templateCopyAction';

const REVIEW_OWNER_STORAGE_KEY = 'email_templates_owner_v1';
const DEFAULT_REVIEW_OWNER = '客服负责人';

const reviewOwnerField = createOwnerField({
  storageKey: REVIEW_OWNER_STORAGE_KEY,
  defaultOwner: DEFAULT_REVIEW_OWNER,
  inputId: 'email-templates-owner',
});

export function buildEmailTemplatesReviewTemplate(owner = DEFAULT_REVIEW_OWNER): string {
  const today = new Date().toISOString().split('T')[0];
  const reviewOwner = reviewOwnerField.normalize(owner);

  return [
    `# 客服邮件处理复盘归档 - ${today}`,
    '',
    '## 作业范围',
    `- 作业负责人：${reviewOwner}`,
    '- 店铺/站点/语言：',
    '- 订单号或内部编号：',
    '- 场景类型：物流 / 产品损坏 / 退货退款 / 缺件 / 使用咨询 / A-to-Z / 安全投诉 / GDPR / 其他',
    '- 优先级：P0 / P1 / P2 / P3',
    '- SLA：4h / 12h / 24h / 30天',
    '',
    '## 消息摘要',
    '- 买家诉求摘要：',
    '- 订单/物流/售后状态：',
    '- 历史沟通要点：',
    '- 是否存在升级风险：A-to-Z / 差评威胁 / 安全投诉 / 退款争议 / 无',
    '',
    '## 回复草稿与动作',
    '- 使用模板编号：',
    '- 回复语言：',
    '- 回复草稿摘要：',
    '- 提供方案：退款 / 补发 / 退货 / 使用指导 / 发票 / 平台客服引导 / 其他',
    '- 内部动作：查订单 / 查物流 / 查库存 / 同步质检 / 同步主管 / 留截图',
    '',
    '## 人工确认点',
    '- A-to-Z、Chargeback 或法律/安全投诉：已确认 / 待确认 / 不涉及',
    '- 退款、补偿或补发承诺：已确认 / 待确认 / 不涉及',
    '- 是否避免提及 Review/评价/星级：已确认 / 待确认',
    '- 站外链接、营销内容和敏感承诺：已复核 / 待复核',
    '- 公开发送前最终检查：已确认 / 待确认',
    `- 最终确认人：${reviewOwner}`,
    '',
    '## 复盘记录',
    '- 本次问题根因：产品 / 物流 / 描述不符 / 买家误解 / 其他',
    '- 是否需要同步 VOC：是 / 否',
    '- 是否需要更新模板或 FAQ：是 / 否',
    '- 后续跟进时间：',
    '- 可复用表达或处理经验：',
    '',
    '> 客服模板只用于生成和沉淀回复草稿；A-to-Z、退款补偿、差评相关场景、合规敏感回复和公开发送必须人工确认后执行。',
  ].join('\n');
}

const copyEmailTemplatesReviewTemplate = createTemplateCopyAction({
  ownerField: reviewOwnerField,
  buildTemplate: buildEmailTemplatesReviewTemplate,
  successMessage: '已复制客服邮件处理复盘模板，可粘贴到周报或归档文档。',
  failureMessage: '复制失败，请手动复制邮件处理模板或稍后重试。',
});

declare global {
  interface Window {
    sops_copyEmailTemplatesReviewTemplate?: () => Promise<void>;
  }
}

function bindTemplateToggles(container: HTMLElement, context: SopTemplateModuleContext): void {
  const handleToggleClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const toggle = target?.closest<HTMLElement>('[data-email-template-toggle]');
    if (!toggle || !container.contains(toggle)) return;

    toggle.nextElementSibling?.classList.toggle('hidden');
  };

  context.addEventListener(container, 'click', handleToggleClick);
}

const emailTemplatesModule = createSopTemplateModule({
  moduleId: 'email_templates',
  templatePath: 'src/modules/sops/views/service/email_templates/template.html',
  ownerFields: [reviewOwnerField],
  actions: {
    sops_copyEmailTemplatesReviewTemplate: copyEmailTemplatesReviewTemplate,
  },
  onInit: bindTemplateToggles,
});

export const mount = (container: HTMLElement): Promise<void> =>
  emailTemplatesModule.mount(container);
export const unmount = (): void => {
  emailTemplatesModule.unmount();
};
