import { loadTemplate } from "../../../../../common/utils/viewLoader";
import { setSafeHtml } from "../../../../../common/utils/security";
import { registerActionsWithLegacy, unregisterActions } from "../../../../../common/utils/actionRegistry";
import { recordOpsMetric } from "../../../../../common/utils/opsMetrics";
import { StorageService } from "../../../../../services/storageService";

const REVIEW_OWNER_STORAGE_KEY = 'listing_review_owner_v1';
const DEFAULT_REVIEW_OWNER = '内容负责人';

let registeredActions: string[] = [];

function normalizeReviewOwner(owner: unknown): string {
    return typeof owner === 'string' && owner.trim() ? owner.trim() : DEFAULT_REVIEW_OWNER;
}

function restoreReviewOwner(): void {
    const input = document.getElementById('listing-review-owner') as HTMLInputElement | null;
    if (input) input.value = normalizeReviewOwner(StorageService.get<string>(REVIEW_OWNER_STORAGE_KEY, DEFAULT_REVIEW_OWNER));
}

function readReviewOwner(): string {
    const input = document.getElementById('listing-review-owner') as HTMLInputElement | null;
    return normalizeReviewOwner(input?.value);
}

function saveReviewOwner(owner: string): void {
    StorageService.set(REVIEW_OWNER_STORAGE_KEY, normalizeReviewOwner(owner));
}

function fallbackCopyText(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        return document.execCommand('copy');
    } finally {
        textarea.remove();
    }
}

export function buildListingReviewTemplate(owner = DEFAULT_REVIEW_OWNER): string {
    const today = new Date().toISOString().split('T')[0];
    const reviewOwner = normalizeReviewOwner(owner);

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

async function copyListingReviewTemplate(): Promise<void> {
    const owner = readReviewOwner();
    saveReviewOwner(owner);
    const reviewTemplate = buildListingReviewTemplate(owner);

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(reviewTemplate);
        } else if (!fallbackCopyText(reviewTemplate)) {
            throw new Error('clipboard unavailable');
        }

        recordOpsMetric('listing.review_template_copy');
        alert('已复制 Listing 改稿复盘模板，可粘贴到周报或归档文档。');
    } catch {
        alert('复制失败，请手动复制提交模板或稍后重试。');
    }
}

declare global {
    interface Window {
        copyListingReviewTemplate?: () => Promise<void>;
    }
}

// Listing SEO优化 SOP
export async function mount(container: HTMLElement): Promise<void> {
    const html = await loadTemplate('src/modules/sops/views/growth/listing_seo/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, html);
    container.classList.add('fade-in');
    restoreReviewOwner();

    registeredActions = registerActionsWithLegacy({
        copyListingReviewTemplate: copyListingReviewTemplate as (...args: unknown[]) => void,
    });
}

export function unmount(): void {
    if (registeredActions.length > 0) {
        unregisterActions(registeredActions);
        registeredActions = [];
    }
}
