import BaseModule from '../../../../../common/BaseModule';
import { SafeTemplateLoader } from '../../../../../common/infrastructure/SafeModuleLoader';
import { setSafeHtml } from '../../../../../common/utils/security';
import {
  registerActionsWithLegacy,
  unregisterActions,
} from '../../../../../common/utils/actionRegistry';
import { StorageService } from '../../../../../services/storageService';
import { copyTextToClipboard } from '../../../utils/clipboard';

const REVIEW_OWNER_STORAGE_KEY = 'procurement_qc_owner_v1';
const DEFAULT_REVIEW_OWNER = '采购/质检负责人';

function normalizeReviewOwner(owner: unknown): string {
  return typeof owner === 'string' && owner.trim() ? owner.trim() : DEFAULT_REVIEW_OWNER;
}

function restoreReviewOwner(): void {
  const input = document.getElementById('procurement-qc-owner') as HTMLInputElement | null;
  if (input)
    input.value = normalizeReviewOwner(
      StorageService.get<string>(REVIEW_OWNER_STORAGE_KEY, DEFAULT_REVIEW_OWNER)
    );
}

function readReviewOwner(): string {
  const input = document.getElementById('procurement-qc-owner') as HTMLInputElement | null;
  return normalizeReviewOwner(input?.value);
}

function saveReviewOwner(owner: string): void {
  StorageService.set(REVIEW_OWNER_STORAGE_KEY, normalizeReviewOwner(owner));
}

export function buildProcurementQcTemplate(owner = DEFAULT_REVIEW_OWNER): string {
  const today = new Date().toISOString().split('T')[0];
  const reviewOwner = normalizeReviewOwner(owner);

  return [
    `# 采购/QC 放行复盘归档 - ${today}`,
    '',
    '## 作业范围',
    `- 作业负责人：${reviewOwner}`,
    '- SKU/ASIN：',
    '- 产品名称：',
    '- 供应商：',
    '- 批次/订单号：',
    '- 采购阶段：样品 / 首单 / 返单 / 质量异常',
    '',
    '## 供应商与下单依据',
    '- 供应商筛选结论：通过 / 条件通过 / 淘汰',
    '- 对比供应商数量：',
    '- 报价、交期、MOQ：',
    '- 样品结果和关键问题：',
    '- 备选供应商：',
    '',
    '## QC 证据',
    '- 检验方式：全检 / 抽检 / 远程视频 / 第三方验货',
    '- 抽检数量和比例：',
    '- 次品数量和次品率：',
    '- 图片/视频/录屏路径：',
    '- 留样编号：',
    '- 标签、包装、配件和说明书检查：',
    '',
    '## 放行结论',
    '- 结论：放行 / 返工后放行 / 让步接收 / 拒收 / 暂停合作',
    '- 核心依据：',
    '- 是否影响上架或补货计划：',
    '- 是否需要供应商赔偿或补发：',
    '',
    '## 整改动作（人工确认后执行）',
    '- 供应商返工或补发：',
    '- 折价、赔偿或扣款：',
    '- 升级下次验货比例：',
    '- 更换供应商或启用备选：',
    '- 同步 Listing/客服/质检资料：',
    '',
    '## 人工确认点',
    '- 首单下单或返单数量：已确认 / 待确认',
    '- QC 放行、让步接收或拒收结论：已确认 / 待确认',
    '- 赔偿、扣款、补发或返工方案：已确认 / 待确认',
    '- 更换供应商或暂停合作：已确认 / 待确认',
    `- 最终确认人：${reviewOwner}`,
    '',
    '## 复盘记录',
    '- 本次质量问题根因：',
    '- 已沉淀到供应商档案：是 / 否',
    '- 下次复核或验货要求：',
    '- 需要同步对象：运营 / 采购 / 质检 / 供应商',
    '- 可复用经验：',
    '',
    '> 首单下单、QC 放行、让步接收、返工、拒收、赔偿扣款和供应商切换均属于高风险动作，必须人工确认后执行。',
  ].join('\n');
}

async function copyProcurementQcTemplate(): Promise<void> {
  const owner = readReviewOwner();
  saveReviewOwner(owner);
  const reviewTemplate = buildProcurementQcTemplate(owner);

  try {
    if (!(await copyTextToClipboard(reviewTemplate))) {
      throw new Error('clipboard unavailable');
    }

    alert('已复制采购/QC 放行复盘模板，可粘贴到周报或归档文档。');
  } catch {
    alert('复制失败，请手动复制采购/QC 模板或稍后重试。');
  }
}

declare global {
  interface Window {
    sops_copyProcurementQcTemplate?: () => Promise<void>;
  }
}

// 采购与质检 SOP
class ProcurementQcModule extends BaseModule {
  private registeredActions: string[] = [];

  protected async render(): Promise<void> {
    if (!this.container) return;

    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/sops/views/backend/procurement_qc/template.html'
    );
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(this.container, html);
    this.container.classList.add('fade-in');
  }

  protected async init(): Promise<void> {
    restoreReviewOwner();

    this.registeredActions = registerActionsWithLegacy({
      sops_copyProcurementQcTemplate: copyProcurementQcTemplate as (...args: unknown[]) => void,
    });
  }

  protected onUnmount(): void {
    if (this.registeredActions.length > 0) {
      unregisterActions(this.registeredActions);
      this.registeredActions = [];
    }
  }
}

const procurementQcModule = new ProcurementQcModule('procurement_qc');

export const mount = (container: HTMLElement): Promise<void> =>
  procurementQcModule.mount(container);
export const unmount = (): void => {
  procurementQcModule.unmount();
};
