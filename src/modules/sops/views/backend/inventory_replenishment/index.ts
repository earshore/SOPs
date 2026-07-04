import { loadTemplate } from '../../../../../common/utils/viewLoader';
import { setSafeHtml } from '../../../../../common/utils/security';
import {
  registerActionsWithLegacy,
  unregisterActions,
} from '../../../../../common/utils/actionRegistry';
import { StorageService } from '../../../../../services/storageService';
import { copyTextToClipboard } from '../../../utils/clipboard';

const REPORT_OWNER_STORAGE_KEY = 'inventory_replenishment_owner_v1';
const DEFAULT_REPORT_OWNER = '供应链/运营负责人';

let registeredActions: string[] = [];

function normalizeReportOwner(owner: unknown): string {
  return typeof owner === 'string' && owner.trim() ? owner.trim() : DEFAULT_REPORT_OWNER;
}

function restoreReportOwner(): void {
  const input = document.getElementById('inventory-replenishment-owner') as HTMLInputElement | null;
  if (input)
    input.value = normalizeReportOwner(
      StorageService.get<string>(REPORT_OWNER_STORAGE_KEY, DEFAULT_REPORT_OWNER)
    );
}

function readReportOwner(): string {
  const input = document.getElementById('inventory-replenishment-owner') as HTMLInputElement | null;
  return normalizeReportOwner(input?.value);
}

function saveReportOwner(owner: string): void {
  StorageService.set(REPORT_OWNER_STORAGE_KEY, normalizeReportOwner(owner));
}

export function buildInventoryReplenishmentTemplate(owner = DEFAULT_REPORT_OWNER): string {
  const today = new Date().toISOString().split('T')[0];
  const reportOwner = normalizeReportOwner(owner);

  return [
    `# 库存补货周报复盘 - ${today}`,
    '',
    '## 作业范围',
    `- 作业负责人：${reportOwner}`,
    '- 站点/店铺：',
    '- SKU/ASIN：',
    '- 产品名称：',
    '- 数据周期：近 30 天 / 近 7 天 / 其他',
    '',
    '## 关键输入',
    '- 可售库存：',
    '- 在途库存：',
    '- 近 30 天销量：',
    '- 日均销量：',
    '- 供应商生产周期：',
    '- 物流方式与预计入仓天数：海运 / 空运 / 快递 / 海外仓调拨',
    '- MOQ/箱规限制：',
    '',
    '## 风险判断',
    '- 可售天数：',
    '- 风险等级：紧急（≤14 天）/ 警告（15-30 天）/ 健康（>30 天）/ 滞销（>90 天）',
    '- 安全库存：',
    '- 建议补货量：',
    '- 最晚下单日：',
    '- 本周最危险 SKU 排名：',
    '',
    '## 建议动作（人工确认后执行）',
    '- 补货数量：',
    '- 推荐物流方式：海运 / 空运 / 快递 / 暂停补货',
    '- 供应商跟进人：',
    '- 是否需要加急生产或拆批发货：',
    '- 是否进入清仓或暂停补货观察：',
    '',
    '## 人工确认点',
    '- 补货下单数量和金额：已确认 / 待确认',
    '- 空运、快递或拆批等高成本物流：已确认 / 待确认',
    '- 滞销 SKU 暂停补货或清仓处理：已确认 / 待确认',
    '- 供应商交期和最晚下单日：已确认 / 待确认',
    `- 最终确认人：${reportOwner}`,
    '',
    '## 复盘记录',
    '- 本周断货风险变化：',
    '- 已下单或已调整动作：',
    '- 需要同步对象：运营 / 采购 / 物流 / 负责人',
    '- 下次复核日期：',
    '- 需要更新的补货规则或安全系数：',
    '',
    '> 补货下单、物流方式选择、加急费用、暂停补货和清仓动作均影响现金流和断货风险，必须人工确认后执行。',
  ].join('\n');
}

async function copyInventoryReplenishmentTemplate(): Promise<void> {
  const owner = readReportOwner();
  saveReportOwner(owner);
  const reportTemplate = buildInventoryReplenishmentTemplate(owner);

  try {
    if (!(await copyTextToClipboard(reportTemplate))) {
      throw new Error('clipboard unavailable');
    }

    alert('已复制库存补货周报复盘模板，可粘贴到周报或归档文档。');
  } catch {
    alert('复制失败，请手动复制库存补货模板或稍后重试。');
  }
}

declare global {
  interface Window {
    sops_copyInventoryReplenishmentTemplate?: () => Promise<void>;
  }
}

// 库存补货与预测 SOP
export async function mount(container: HTMLElement): Promise<void> {
  const html = await loadTemplate(
    'src/modules/sops/views/backend/inventory_replenishment/template.html'
  );
  // ✅ 安全: 静态HTML模板，无用户输入
  setSafeHtml(container, html);
  container.classList.add('fade-in');
  restoreReportOwner();

  registeredActions = registerActionsWithLegacy({
    sops_copyInventoryReplenishmentTemplate: copyInventoryReplenishmentTemplate as (
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
