/**
 * 欧洲本土化高危词库 (Restricted Words) SOP
 * EU Localized Restricted Words Database SOP
 */

import BaseModule from '../../../../../common/BaseModule';
import { setSafeHtml } from '../../../../../common/utils/security';
import { loadTemplate } from '../../../../../common/utils/viewLoader';
import {
  registerActionsWithLegacy,
  unregisterActions,
} from '../../../../../common/utils/actionRegistry';
import { StorageService } from '../../../../../services/storageService';
import { copyTextToClipboard } from '../../../utils/clipboard';
import { cleanupRestrictedWordsPanel, initRestrictedWordsPanel } from './restrictedWordsHandler';

const REVIEW_OWNER_STORAGE_KEY = 'restricted_words_owner_v1';
const DEFAULT_REVIEW_OWNER = '合规负责人/运营负责人';

function normalizeReviewOwner(owner: unknown): string {
  return typeof owner === 'string' && owner.trim() ? owner.trim() : DEFAULT_REVIEW_OWNER;
}

function restoreReviewOwner(): void {
  const input = document.getElementById('restricted-words-owner') as HTMLInputElement | null;
  if (input)
    input.value = normalizeReviewOwner(
      StorageService.get<string>(REVIEW_OWNER_STORAGE_KEY, DEFAULT_REVIEW_OWNER)
    );
}

function readReviewOwner(): string {
  const input = document.getElementById('restricted-words-owner') as HTMLInputElement | null;
  return normalizeReviewOwner(input?.value);
}

function saveReviewOwner(owner: string): void {
  StorageService.set(REVIEW_OWNER_STORAGE_KEY, normalizeReviewOwner(owner));
}

export function buildRestrictedWordsTemplate(owner = DEFAULT_REVIEW_OWNER): string {
  const today = new Date().toISOString().split('T')[0];
  const reviewOwner = normalizeReviewOwner(owner);

  return [
    `# 高危词检查复盘归档 - ${today}`,
    '',
    '## 作业范围',
    `- 作业负责人：${reviewOwner}`,
    '- ASIN/SKU：',
    '- 店铺/站点/语言：',
    '- 检查对象：Title / Bullets / Description / A+ / Search Terms / 图片文案 / 广告词',
    '- 检查阶段：新品上架 / Listing 改稿 / 站点翻译 / 投诉后复核',
    '',
    '## 命中词记录',
    '- 命中词：',
    '- 原句或位置：',
    '- 风险等级：1 / 2 / 3 / 4 / 5',
    '- 风险类型：医疗 / 安全认证 / 环保 / 材质 / 儿童用品 / 功效声明 / 其他',
    '- 涉及站点语言：',
    '',
    '## 处理动作',
    '- 处理结论：删除 / 替换 / 保留并附证书 / 暂缓上架',
    '- 替换表达：',
    '- 证书或合规依据：',
    '- 需同步位置：Listing / A+ / 图片 / 广告 / 后台关键词',
    '- 复查结果：通过 / 仍需替换 / 待主管复核',
    '',
    '## 人工确认点',
    '- 5 级风险词是否全部删除：已确认 / 待确认',
    '- 4 级风险词证书或依据：已复核 / 待复核',
    '- 本地语言替换表达：已确认 / 待确认',
    '- 上架或改稿提交：已确认 / 待确认',
    `- 最终确认人：${reviewOwner}`,
    '',
    '## 复盘记录',
    '- 本次问题根因：',
    '- 已沉淀到高危词库或翻译规范：是 / 否',
    '- 需要同步对象：运营 / 设计 / 合规 / 广告 / 客服',
    '- 下次复核日期：',
    '- 可复用替代表达：',
    '',
    '> 高危词检查只给出风险记录和替换建议；4/5 级风险词、证书依据和最终上架提交必须人工确认后执行。',
  ].join('\n');
}

async function copyRestrictedWordsTemplate(): Promise<void> {
  const owner = readReviewOwner();
  saveReviewOwner(owner);
  const reviewTemplate = buildRestrictedWordsTemplate(owner);

  try {
    if (!(await copyTextToClipboard(reviewTemplate))) {
      throw new Error('clipboard unavailable');
    }

    alert('已复制高危词检查复盘模板，可粘贴到周报或归档文档。');
  } catch {
    alert('复制失败，请手动复制高危词检查模板或稍后重试。');
  }
}

declare global {
  interface Window {
    sops_copyRestrictedWordsTemplate?: () => Promise<void>;
  }
}

class RestrictedWordsModule extends BaseModule {
  private registeredActions: string[] = [];

  /**
   * 挂载模块
   */
  async mount(container: HTMLElement): Promise<void> {
    const html = await loadTemplate('src/modules/sops/views/growth/restricted_words/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, html);
    container.classList.add('fade-in');

    // 初始化词库面板功能
    initRestrictedWordsPanel();
    restoreReviewOwner();

    this.registeredActions = registerActionsWithLegacy({
      sops_copyRestrictedWordsTemplate: copyRestrictedWordsTemplate as (...args: unknown[]) => void,
    });
  }

  /**
   * 卸载模块
   */
  unmount(): void {
    cleanupRestrictedWordsPanel();
    if (this.registeredActions.length > 0) {
      unregisterActions(this.registeredActions);
      this.registeredActions = [];
    }
  }
}

// 导出模块实例
const restrictedWordsModule = new RestrictedWordsModule('restricted_words');

export const mount = (container: HTMLElement) => restrictedWordsModule.mount(container);
export const unmount = () => restrictedWordsModule.unmount();
