import { loadTemplate } from '../../../../../common/utils/viewLoader';
import { setSafeHtml } from '../../../../../common/utils/security';
import {
  registerActionsWithLegacy,
  unregisterActions,
} from '../../../../../common/utils/actionRegistry';
import { StorageService } from '../../../../../services/storageService';

const RELEASE_OWNER_STORAGE_KEY = 'fba_shipping_owner_v1';
const DEFAULT_RELEASE_OWNER = '物流/供应链负责人';

let registeredActions: string[] = [];

function normalizeReleaseOwner(owner: unknown): string {
  return typeof owner === 'string' && owner.trim() ? owner.trim() : DEFAULT_RELEASE_OWNER;
}

function restoreReleaseOwner(): void {
  const input = document.getElementById('fba-shipping-owner') as HTMLInputElement | null;
  if (input)
    input.value = normalizeReleaseOwner(
      StorageService.get<string>(RELEASE_OWNER_STORAGE_KEY, DEFAULT_RELEASE_OWNER)
    );
}

function readReleaseOwner(): string {
  const input = document.getElementById('fba-shipping-owner') as HTMLInputElement | null;
  return normalizeReleaseOwner(input?.value);
}

function saveReleaseOwner(owner: string): void {
  StorageService.set(RELEASE_OWNER_STORAGE_KEY, normalizeReleaseOwner(owner));
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

export function buildFbaShippingTemplate(owner = DEFAULT_RELEASE_OWNER): string {
  const today = new Date().toISOString().split('T')[0];
  const releaseOwner = normalizeReleaseOwner(owner);

  return [
    `# FBA 发货放行/异常登记 - ${today}`,
    '',
    '## 作业范围',
    `- 作业负责人：${releaseOwner}`,
    '- 店铺/站点：',
    '- FBA 货件编号：',
    '- SKU/ASIN：',
    '- 发货数量/箱数：',
    '- 承运方式：SPD / LTL / 海外仓调拨 / 其他',
    '',
    '## 发货前核对',
    '- FNSKU 标签完整且可扫描：是 / 否 / 待确认',
    '- 原厂条码是否完全覆盖：是 / 否 / 不适用',
    '- 箱标是否每箱 2 面贴附：是 / 否',
    '- 装箱数是否等于申报数：是 / 否',
    '- 单箱重量和尺寸是否符合站点限制：是 / 否',
    '- 装箱照片、箱规和物流单号是否留档：是 / 否',
    '',
    '## 放行结论',
    '- 结论：允许发货 / 暂停发货 / 整改后发货 / 取消货件',
    '- 核心依据：',
    '- 是否存在超重、错标、货件拆分或异常费用：',
    '- 是否需要重新创建货件或重新贴标：',
    '',
    '## 异常登记',
    '- 异常类型：超重 / 错标 / 数量不符 / 货件拆分 / 承运商异常 / 入库费用 / 其他',
    '- 异常证据路径：',
    '- 影响范围：单箱 / 单 SKU / 整票货件',
    '- 预估费用或延误：',
    '',
    '## 整改动作（人工确认后执行）',
    '- 重新打印或补贴标签：',
    '- 调整箱规、拆箱或重新装箱：',
    '- 重新创建货件或取消旧货件：',
    '- 联系承运商、海外仓或亚马逊 Case：',
    '- 更新装箱单、照片和物流单号：',
    '',
    '## 人工确认点',
    '- 超重、错标或数量不符整改：已确认 / 待确认',
    '- 货件拆分、取消或重建：已确认 / 待确认',
    '- 异常费用、承运商变更或加急发货：已确认 / 待确认',
    '- 最终发货放行：已确认 / 待确认',
    `- 最终确认人：${releaseOwner}`,
    '',
    '## 复盘记录',
    '- 本次异常根因：',
    '- 已同步对象：运营 / 采购 / 物流 / 海外仓',
    '- 下次发货前需额外检查：',
    '- 需要更新的箱规、标签或 SOP：',
    '',
    '> FBA 发货放行、货件取消或重建、异常费用确认、承运方式变更和加急发货均属于高风险动作，必须人工确认后执行。',
  ].join('\n');
}

async function copyFbaShippingTemplate(): Promise<void> {
  const owner = readReleaseOwner();
  saveReleaseOwner(owner);
  const releaseTemplate = buildFbaShippingTemplate(owner);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(releaseTemplate);
    } else if (!fallbackCopyText(releaseTemplate)) {
      throw new Error('clipboard unavailable');
    }

    alert('已复制 FBA 发货放行/异常登记模板，可粘贴到周报或归档文档。');
  } catch {
    alert('复制失败，请手动复制 FBA 发货模板或稍后重试。');
  }
}

declare global {
  interface Window {
    sops_copyFbaShippingTemplate?: () => Promise<void>;
  }
}

// FBA发货与物流跟踪 SOP
export async function mount(container: HTMLElement): Promise<void> {
  const html = await loadTemplate('src/modules/sops/views/backend/fba_shipping/template.html');
  // ✅ 安全: 静态HTML模板，无用户输入
  setSafeHtml(container, html);
  container.classList.add('fade-in');
  restoreReleaseOwner();

  registeredActions = registerActionsWithLegacy({
    sops_copyFbaShippingTemplate: copyFbaShippingTemplate as (...args: unknown[]) => void,
  });
}

export function unmount(): void {
  if (registeredActions.length > 0) {
    unregisterActions(registeredActions);
    registeredActions = [];
  }
}
