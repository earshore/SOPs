import BaseModule from '@/common/BaseModule';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { setSafeHtml } from '@/common/utils/security';
import { registerActionsWithLegacy, unregisterActions } from '@/common/utils/actionRegistry';
import { createOwnerField } from '../../../utils/ownerField';
import { createTemplateCopyAction } from '../../../utils/templateCopyAction';

const REVIEW_OWNER_STORAGE_KEY = 'listing_review_owner_v1';
const DEFAULT_REVIEW_OWNER = '内容负责人';

const reviewOwnerField = createOwnerField({
  storageKey: REVIEW_OWNER_STORAGE_KEY,
  defaultOwner: DEFAULT_REVIEW_OWNER,
  inputId: 'listing-review-owner',
});

export function buildListingReviewTemplate(owner = DEFAULT_REVIEW_OWNER): string {
  const today = new Date().toISOString().split('T')[0];
  const reviewOwner = reviewOwnerField.normalize(owner);

  return [
    `# Listing 改稿复盘归档 - ${today}`,
    '',
    '## 作业范围',
    `- 作业负责人：${reviewOwner}`,
    '- 目标 ASIN/SKU：',
    '- 站点：',
    '- 核心竞品 ASIN：',
    '- 输入来源：竞品 Listing / Review / ABA / 高危词库',
    '',
    '## 关键证据',
    '- 需要补强的核心词：',
    '- Review 高频痛点：',
    '- 竞品高频表达：',
    '- 禁用词或高风险词：',
    '',
    '## 建议动作（人工确认后上线）',
    '- Title 改稿：',
    '- Bullet 1-5 改稿：',
    '- Search Terms 调整：',
    '- A+ / QA 补强：',
    '',
    '## 人工确认点',
    '- 高危词 4-5 级风险：已检查 / 待检查',
    '- 合规声明和夸大表达：已复核 / 待复核',
    '- 品牌词、竞品词、侵权风险：已复核 / 待复核',
    `- 上线确认人：${reviewOwner}`,
    '',
    '## 复盘记录',
    '- 上线日期：',
    '- 观察指标：CTR / CVR / 自然排名 / 退货或差评变化',
    '- 下次复盘日期：',
    '- 需要补充的截图或报表路径：',
    '',
    '> AI 输出只作为草稿和检查辅助，最终 Listing 上线必须由人工确认。',
  ].join('\n');
}

const copyListingReviewTemplate = createTemplateCopyAction({
  ownerField: reviewOwnerField,
  buildTemplate: buildListingReviewTemplate,
  successMessage: '已复制 Listing 改稿复盘模板，可粘贴到周报或归档文档。',
  failureMessage: '复制失败，请手动复制提交模板或稍后重试。',
});

declare global {
  interface Window {
    copyListingReviewTemplate?: () => Promise<void>;
  }
}

// Listing SEO优化 SOP
class ListingSeoModule extends BaseModule {
  private registeredActions: string[] = [];

  protected async render(): Promise<void> {
    if (!this.container) return;

    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/sops/views/growth/listing_seo/template.html'
    );
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(this.container, html);
    this.container.classList.add('fade-in');
  }

  protected async init(): Promise<void> {
    reviewOwnerField.restore();

    this.registeredActions = registerActionsWithLegacy({
      copyListingReviewTemplate: copyListingReviewTemplate as (...args: unknown[]) => void,
    });
  }

  protected onUnmount(): void {
    if (this.registeredActions.length > 0) {
      unregisterActions(this.registeredActions);
      this.registeredActions = [];
    }
  }
}

const listingSeoModule = new ListingSeoModule('listing_seo');

export const mount = (container: HTMLElement): Promise<void> => listingSeoModule.mount(container);
export const unmount = (): void => {
  listingSeoModule.unmount();
};
