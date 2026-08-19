import { createOwnerField } from '../../../utils/ownerField';
import { createSopTemplateModule } from '../../../utils/sopTemplateModule';
import { createTemplateCopyAction } from '../../../utils/templateCopyAction';

const REVIEW_OWNER_STORAGE_KEY = 'gpsr_compliance_owner_v1';
const DEFAULT_REVIEW_OWNER = '合规负责人/运营负责人';

const reviewOwnerField = createOwnerField({
  storageKey: REVIEW_OWNER_STORAGE_KEY,
  defaultOwner: DEFAULT_REVIEW_OWNER,
  inputId: 'gpsr-compliance-owner',
});

export function buildGpsrComplianceTemplate(owner = DEFAULT_REVIEW_OWNER): string {
  const today = new Date().toISOString().split('T')[0];
  const reviewOwner = reviewOwnerField.normalize(owner);

  return [
    `# GPSR 合规交付件复盘/整改归档 - ${today}`,
    '',
    '## 作业范围',
    `- 作业负责人：${reviewOwner}`,
    '- ASIN/SKU：',
    '- EU 站点：DE / FR / IT / ES / NL / SE / PL / BE / 其他',
    '- 品类：',
    '- 变体/子 ASIN 覆盖范围：',
    '- 审核阶段：新品上架 / 已售 ASIN 补齐 / 后台驳回整改 / 包装变更复核',
    '',
    '## 交付件清单',
    '- EU Responsible Person：已确认 / 待确认',
    '- Manufacturer / Importer 信息：已确认 / 待确认',
    '- 安全文件 / 安全图片 / 安全证明：已确认 / 待确认',
    '- 产品可识别标记：型号 / 批次号 / 序列号 / FNSKU / EAN / GTIN',
    '- 包装或随附文件标签：已确认 / 待确认',
    '',
    '## 缺失项',
    '- 缺失文件：',
    '- 缺失语言或站点：',
    '- 缺失后台上传记录：',
    '- 缺失包装标签或实物证明：',
    '- 供应商待补资料：',
    '',
    '## 上传记录',
    '- Seller Central 路径：',
    '- 上传站点和状态：',
    '- 子 ASIN 上传覆盖情况：',
    '- 截图或文件路径：',
    '- 驳回原因或补交通知：',
    '',
    '## 整改动作（人工确认后执行）',
    '- 欧代/厂家信息补齐：',
    '- 安全文件、图片或证明补齐：',
    '- 包装/标签/说明书整改：',
    '- 后台重新上传或补交：',
    '- Listing 前台展示复核：',
    '',
    '## 人工确认点',
    '- 欧代/厂家信息：已确认 / 待确认',
    '- 安全文件、图片或证明：已复核 / 待复核',
    '- 后台上传和子 ASIN 覆盖：已确认 / 待确认',
    '- 多站点语言和前台展示：已确认 / 待确认',
    '- 整改完成：已确认 / 待确认',
    `- 最终确认人：${reviewOwner}`,
    '',
    '## 复盘记录',
    '- 本次缺口根因：',
    '- 已沉淀到供应商/品类资料库：是 / 否',
    '- 需要同步对象：运营 / 采购 / 质检 / 合规 / 设计',
    '- 下次复核日期：',
    '- 后续跟进动作：',
    '',
    '> GPSR 提交、标签变更和产品安全声明均属于高风险动作，必须人工确认后再上传或标记完成。',
  ].join('\n');
}

const copyGpsrComplianceTemplate = createTemplateCopyAction({
  ownerField: reviewOwnerField,
  buildTemplate: buildGpsrComplianceTemplate,
  successMessage: '已复制 GPSR 合规交付件归档模板，可粘贴到周报或归档文档。',
  failureMessage: '复制失败，请手动复制 GPSR 合规模板或稍后重试。',
});

declare global {
  interface Window {
    sops_copyGpsrComplianceTemplate?: () => Promise<void>;
  }
}

// 欧洲GPSR合规 SOP
const euGpsrComplianceModule = createSopTemplateModule({
  moduleId: 'eu_gpsr_compliance',
  templatePath: 'src/modules/sops/views/safety/eu_gpsr_compliance/template.html',
  ownerFields: [reviewOwnerField],
  actions: {
    sops_copyGpsrComplianceTemplate: copyGpsrComplianceTemplate,
  },
});

export const mount = (container: HTMLElement): Promise<void> =>
  euGpsrComplianceModule.mount(container);
export const unmount = (): void => {
  euGpsrComplianceModule.unmount();
};
