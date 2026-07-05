import BaseModule from '../../../../../common/BaseModule';
import { SafeTemplateLoader } from '../../../../../common/infrastructure/SafeModuleLoader';
import { setSafeHtml } from '../../../../../common/utils/security';
import {
  registerActionsWithLegacy,
  unregisterActions,
} from '../../../../../common/utils/actionRegistry';
import { StorageService } from '../../../../../services/storageService';
import { copyTextToClipboard } from '../../../utils/clipboard';

const REVIEW_OWNER_STORAGE_KEY = 'qa_maintenance_owner_v1';
const DEFAULT_REVIEW_OWNER = '客服负责人/运营负责人';

function normalizeReviewOwner(owner: unknown): string {
  return typeof owner === 'string' && owner.trim() ? owner.trim() : DEFAULT_REVIEW_OWNER;
}

function restoreReviewOwner(): void {
  const input = document.getElementById('qa-maintenance-owner') as HTMLInputElement | null;
  if (input)
    input.value = normalizeReviewOwner(
      StorageService.get<string>(REVIEW_OWNER_STORAGE_KEY, DEFAULT_REVIEW_OWNER)
    );
}

function readReviewOwner(): string {
  const input = document.getElementById('qa-maintenance-owner') as HTMLInputElement | null;
  return normalizeReviewOwner(input?.value);
}

function saveReviewOwner(owner: string): void {
  StorageService.set(REVIEW_OWNER_STORAGE_KEY, normalizeReviewOwner(owner));
}

export function buildQaMaintenanceTemplate(owner = DEFAULT_REVIEW_OWNER): string {
  const today = new Date().toISOString().split('T')[0];
  const reviewOwner = normalizeReviewOwner(owner);

  return [
    `# QA 问答维护归档 - ${today}`,
    '',
    '## 作业范围',
    `- 作业负责人：${reviewOwner}`,
    '- ASIN/SKU：',
    '- 店铺/站点/语言：',
    '- QA 来源：前台新问题 / 历史 QA 复核 / 竞品 QA / 差评 VOC / 客服邮件',
    '- 问题类型：参数规格 / 使用方法 / 配件兼容 / 售后保修 / 安全合规 / 竞品对比 / 其他',
    '',
    '## 未回复或需更新问题',
    '- 问题原文：',
    '- 当前状态：未回复 / 已有买家回复 / 旧答案需更新 / 需举报',
    '- 影响判断：高票 / 负面倾向 / 高频咨询 / SEO 关键词机会 / 安全敏感',
    '- Listing 是否已覆盖：是 / 否 / 需更新',
    '',
    '## 标准答案草稿',
    '- 官方回答语言：',
    '- 答案草稿：',
    '- 自然植入关键词：',
    '- 需要同步到 Listing/A+/说明书/FAQ 的内容：',
    '',
    '## 前台可见性与合规红线',
    '- 不承诺未验证功能、医疗/安全效果或绝对化结果：已确认 / 待确认',
    '- 不引导评价、好评、删改差评或站外沟通：已确认 / 待确认',
    '- 不攻击竞品、不泄露内部信息、不使用促销话术：已确认 / 待确认',
    '- 保修、退款、补发等承诺与店铺政策一致：已确认 / 待确认 / 不涉及',
    '',
    '## 人工确认点',
    '- 医疗、安全、儿童用品、电器等敏感声明：已确认 / 待确认 / 不涉及',
    '- 竞品对比、兼容性、认证参数：已复核 / 待复核 / 不涉及',
    '- 公开发布前最终内容检查：已确认 / 待确认',
    '- 是否需要主管或产品负责人复核：是 / 否',
    `- 最终确认人：${reviewOwner}`,
    '',
    '## 复盘记录',
    '- 本次问题反映的产品/Listing 缺口：',
    '- 已更新的 FAQ、客服模板或说明书：',
    '- 已同步 VOC 或产品改进项：',
    '- 下次复查时间：',
    '- 可复用答案或新人训练要点：',
    '',
    '> QA 是公开可见内容，涉及安全、医疗、保修承诺、竞品对比、评价引导或前台发布的动作必须人工确认后执行并留痕。',
  ].join('\n');
}

async function copyQaMaintenanceTemplate(): Promise<void> {
  const owner = readReviewOwner();
  saveReviewOwner(owner);
  const reviewTemplate = buildQaMaintenanceTemplate(owner);

  try {
    if (!(await copyTextToClipboard(reviewTemplate))) {
      throw new Error('clipboard unavailable');
    }

    alert('已复制 QA 维护归档模板，可粘贴到周报或归档文档。');
  } catch {
    alert('复制失败，请手动复制 QA 维护模板或稍后重试。');
  }
}

declare global {
  interface Window {
    sops_copyQaMaintenanceTemplate?: () => Promise<void>;
  }
}

// QA 问答维护 SOP
class QaMaintenanceModule extends BaseModule {
  private registeredActions: string[] = [];

  protected async render(): Promise<void> {
    if (!this.container) return;

    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/sops/views/service/qa_maintenance/template.html'
    );
    // ✅ 安全: html来自静态模板文件，无用户输入
    setSafeHtml(this.container, html);
    this.container.classList.add('fade-in');
  }

  protected async init(): Promise<void> {
    restoreReviewOwner();

    this.registeredActions = registerActionsWithLegacy({
      sops_copyQaMaintenanceTemplate: copyQaMaintenanceTemplate as (...args: unknown[]) => void,
    });
  }

  protected onUnmount(): void {
    if (this.registeredActions.length > 0) {
      unregisterActions(this.registeredActions);
      this.registeredActions = [];
    }
  }
}

const qaMaintenanceModule = new QaMaintenanceModule('qa_maintenance');

export const mount = (container: HTMLElement): Promise<void> =>
  qaMaintenanceModule.mount(container);
export const unmount = (): void => {
  qaMaintenanceModule.unmount();
};
