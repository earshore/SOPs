import { loadTemplate } from '../../../../../common/utils/viewLoader';
import { setSafeHtml } from '../../../../../common/utils/security';
import {
  registerActionsWithLegacy,
  unregisterActions,
} from '../../../../../common/utils/actionRegistry';
import { StorageService } from '../../../../../services/storageService';

const REVIEW_OWNER_STORAGE_KEY = 'brand_infringement_owner_v1';
const DEFAULT_REVIEW_OWNER = '品牌/合规负责人';

let registeredActions: string[] = [];

function normalizeReviewOwner(owner: unknown): string {
  return typeof owner === 'string' && owner.trim() ? owner.trim() : DEFAULT_REVIEW_OWNER;
}

function restoreReviewOwner(): void {
  const input = document.getElementById('brand-infringement-owner') as HTMLInputElement | null;
  if (input)
    input.value = normalizeReviewOwner(
      StorageService.get<string>(REVIEW_OWNER_STORAGE_KEY, DEFAULT_REVIEW_OWNER)
    );
}

function readReviewOwner(): string {
  const input = document.getElementById('brand-infringement-owner') as HTMLInputElement | null;
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

export function buildBrandInfringementTemplate(owner = DEFAULT_REVIEW_OWNER): string {
  const today = new Date().toISOString().split('T')[0];
  const reviewOwner = normalizeReviewOwner(owner);

  return [
    `# 品牌/侵权审核复盘归档 - ${today}`,
    '',
    '## 作业范围',
    `- 作业负责人：${reviewOwner}`,
    '- 店铺/站点：',
    '- SKU/ASIN：',
    '- Listing 标题/链接：',
    '- 审核对象：标题 / 五点 / 描述 / A+ / 图片 / 视频 / 关键词',
    '- 审核阶段：新品上架 / Listing 改稿 / 竞品参考 / 投诉后复核',
    '',
    '## 关键证据',
    '- EUIPO/UKIPO/WIPO 查询结果（必要时补充全球品牌历史商标核查）：',
    '- 命中商标或近似词：',
    '- 图片/素材来源和授权文件：',
    '- 高危词库命中项：',
    '- 竞品参考链接或截图：',
    '',
    '## 风险判断',
    '- 风险等级：P0 禁止上架 / P1 高风险需替换 / P2 需人工复核 / P3 可通过',
    '- 风险类型：商标 / 专利 / 版权 / 虚假宣传 / 合规声明 / 其他',
    '- 审核结论：通过 / 替换后通过 / 驳回 / 暂缓',
    '- 核心依据：',
    '',
    '## 替换建议（人工确认后执行）',
    '- 需删除词或素材：',
    '- 建议替换表达：',
    '- 需补充授权或证明：',
    '- 需同步 Listing/图片/广告词：',
    '',
    '## 人工确认点',
    '- 疑似侵权词是否替换：已确认 / 待确认',
    '- 图片、视频或素材授权：已确认 / 待确认',
    '- 授权文件、证书或查询截图：已确认 / 待确认',
    '- 最终上架或改稿提交：已确认 / 待确认',
    `- 最终确认人：${reviewOwner}`,
    '',
    '## 复盘记录',
    '- 本次问题根因：',
    '- 已沉淀到高危词库或素材库：是 / 否',
    '- 需要同步对象：运营 / 设计 / 合规 / 客服',
    '- 下次复核日期：',
    '- 可复用经验：',
    '',
    '> 疑似侵权词、图片版权、授权文件和最终上架均属于高风险动作，必须人工确认后执行；未确认前不得提交 Listing 或广告素材。',
  ].join('\n');
}

async function copyBrandInfringementTemplate(): Promise<void> {
  const owner = readReviewOwner();
  saveReviewOwner(owner);
  const reviewTemplate = buildBrandInfringementTemplate(owner);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(reviewTemplate);
    } else if (!fallbackCopyText(reviewTemplate)) {
      throw new Error('clipboard unavailable');
    }

    alert('已复制品牌/侵权审核复盘模板，可粘贴到周报或归档文档。');
  } catch {
    alert('复制失败，请手动复制品牌/侵权模板或稍后重试。');
  }
}

declare global {
  interface Window {
    sops_copyBrandInfringementTemplate?: () => Promise<void>;
  }
}

// 品牌与侵权审核 SOP
export async function mount(container: HTMLElement): Promise<void> {
  const html = await loadTemplate('src/modules/sops/views/safety/brand_infringement/template.html');
  // ✅ 安全: 静态HTML模板，无用户输入
  setSafeHtml(container, html);
  container.classList.add('fade-in');
  restoreReviewOwner();

  registeredActions = registerActionsWithLegacy({
    sops_copyBrandInfringementTemplate: copyBrandInfringementTemplate as (
      ...args: unknown[]
    ) => void,
  });
}

export function unmount(): void {
  if (registeredActions.length > 0) {
    unregisterActions(registeredActions);
    registeredActions = [];
  }
}
