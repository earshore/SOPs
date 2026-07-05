import BaseModule from '../../../../../common/BaseModule';
import { SafeTemplateLoader } from '../../../../../common/infrastructure/SafeModuleLoader';
import { setSafeHtml } from '../../../../../common/utils/security';
import {
  registerActionsWithLegacy,
  unregisterActions,
} from '../../../../../common/utils/actionRegistry';
import { StorageService } from '../../../../../services/storageService';
import { copyTextToClipboard } from '../../../utils/clipboard';

const REVIEW_OWNER_STORAGE_KEY = 'product_compliance_owner_v1';
const DEFAULT_REVIEW_OWNER = '合规负责人';

function normalizeReviewOwner(owner: unknown): string {
  return typeof owner === 'string' && owner.trim() ? owner.trim() : DEFAULT_REVIEW_OWNER;
}

function restoreReviewOwner(): void {
  const input = document.getElementById('product-compliance-owner') as HTMLInputElement | null;
  if (input)
    input.value = normalizeReviewOwner(
      StorageService.get<string>(REVIEW_OWNER_STORAGE_KEY, DEFAULT_REVIEW_OWNER)
    );
}

function readReviewOwner(): string {
  const input = document.getElementById('product-compliance-owner') as HTMLInputElement | null;
  return normalizeReviewOwner(input?.value);
}

function saveReviewOwner(owner: string): void {
  StorageService.set(REVIEW_OWNER_STORAGE_KEY, normalizeReviewOwner(owner));
}

export function buildProductComplianceTemplate(owner = DEFAULT_REVIEW_OWNER): string {
  const today = new Date().toISOString().split('T')[0];
  const reviewOwner = normalizeReviewOwner(owner);

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

async function copyProductComplianceTemplate(): Promise<void> {
  const owner = readReviewOwner();
  saveReviewOwner(owner);
  const reviewTemplate = buildProductComplianceTemplate(owner);

  try {
    if (!(await copyTextToClipboard(reviewTemplate))) {
      throw new Error('clipboard unavailable');
    }

    alert('已复制产品合规复盘模板，可粘贴到周报或归档文档。');
  } catch {
    alert('复制失败，请手动复制合规模板或稍后重试。');
  }
}

declare global {
  interface Window {
    sops_copyProductComplianceTemplate?: () => Promise<void>;
  }
}

// 产品Listing合规性 SOP
class ProductComplianceModule extends BaseModule {
  private registeredActions: string[] = [];

  protected async render(): Promise<void> {
    if (!this.container) return;

    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/sops/views/safety/product_compliance/template.html'
    );
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(this.container, html);
    this.container.classList.add('fade-in');
  }

  protected async init(): Promise<void> {
    restoreReviewOwner();

    this.registeredActions = registerActionsWithLegacy({
      sops_copyProductComplianceTemplate: copyProductComplianceTemplate as (
        ...args: unknown[]
      ) => void,
    });
  }

  protected onUnmount(): void {
    if (this.registeredActions.length > 0) {
      unregisterActions(this.registeredActions);
      this.registeredActions = [];
    }
  }
}

const productComplianceModule = new ProductComplianceModule('product_compliance');

export const mount = (container: HTMLElement): Promise<void> =>
  productComplianceModule.mount(container);
export const unmount = (): void => {
  productComplianceModule.unmount();
};
