import { createSopTemplateModule } from '../../../utils/sopTemplateModule';
import { createOwnerField } from '../../../utils/ownerField';
import { createTemplateCopyAction } from '../../../utils/templateCopyAction';

const REVIEW_OWNER_STORAGE_KEY = 'product_compliance_owner_v1';
const DEFAULT_REVIEW_OWNER = '合规负责人';

const reviewOwnerField = createOwnerField({
  storageKey: REVIEW_OWNER_STORAGE_KEY,
  defaultOwner: DEFAULT_REVIEW_OWNER,
  inputId: 'product-compliance-owner',
});

export function buildProductComplianceTemplate(owner = DEFAULT_REVIEW_OWNER): string {
  const today = new Date().toISOString().split('T')[0];
  const reviewOwner = reviewOwnerField.normalize(owner);

  return [
    `# 产品合规准入复盘归档 - ${today}`,
    '',
    '## 作业范围',
    `- 作业负责人：${reviewOwner}`,
    '- 产品/ASIN/SKU：',
    '- 目标站点：EU / GB / 其他',
    '- 品类：生物杀虫剂 / 电子 3C / 儿童玩具 / 化妆品 / 纺织品 / 其他',
    '- 上架阶段：选品 / 打样 / 采购 / 上架前 / 已上架复核',
    '',
    '## 准入结论',
    '- 结论：可准入 / 条件准入 / 暂缓 / 禁止',
    '- 关键依据：',
    '- 主要风险：',
    '- 是否需要外部检测或合规服务商：是 / 否',
    '',
    '## 缺失文件',
    '- 测试报告或证书：',
    '- EPR/WEEE/包装法/电池法注册：',
    '- 欧代/厂家/进口商信息：',
    '- 包装标签和说明书：',
    '- Listing 合规属性或安全图片：',
    '',
    '## 整改动作（人工确认后执行）',
    '- Listing 文案/图片整改：',
    '- 包装/标签整改：',
    '- 供应商补件或重测：',
    '- 后台文件上传或重新提交：',
    '',
    '## 人工确认点',
    '- 敏感品是否准入：已确认 / 待确认',
    '- 证书有效性和适用范围：已复核 / 待复核',
    '- 上架提交或重新提交：已确认 / 待确认',
    '- 整改完成和复核结论：已确认 / 待确认',
    `- 最终确认人：${reviewOwner}`,
    '',
    '## 复盘记录',
    '- 已沉淀到供应商/品类资料库：是 / 否',
    '- 下次复核日期：',
    '- 需要同步的团队：运营 / 采购 / 质检 / 客服',
    '- 后续跟进动作：',
    '',
    '> 合规模板只用于内部准入和整改归档；敏感品准入、证书有效性、上架提交和整改完成必须由人工确认。',
  ].join('\n');
}

const copyProductComplianceTemplate = createTemplateCopyAction({
  ownerField: reviewOwnerField,
  buildTemplate: buildProductComplianceTemplate,
  successMessage: '已复制产品合规复盘模板，可粘贴到周报或归档文档。',
  failureMessage: '复制失败，请手动复制合规模板或稍后重试。',
});

declare global {
  interface Window {
    sops_copyProductComplianceTemplate?: () => Promise<void>;
  }
}

// 产品Listing合规性 SOP
const productComplianceModule = createSopTemplateModule({
  moduleId: 'product_compliance',
  templatePath: 'src/modules/sops/views/safety/product_compliance/template.html',
  ownerFields: [reviewOwnerField],
  actions: {
    sops_copyProductComplianceTemplate: copyProductComplianceTemplate,
  },
});

export const mount = (container: HTMLElement): Promise<void> =>
  productComplianceModule.mount(container);
export const unmount = (): void => {
  productComplianceModule.unmount();
};
