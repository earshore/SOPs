/**
 * 亚马逊新品生命周期跟踪 SOP - NPI Tracker
 * Amazon New Product Introduction Tracker (EU Focus)
 *
 * 架构说明：
 * - 使用 SafeTemplateLoader 加载模板
 * - 使用 SafeRenderer 进行安全渲染
 * - 使用 registerActionsWithLegacy 注册全局操作
 * - 已迁移到新架构（系统稳定性优化）
 */

import BaseModule from '@/common/BaseModule';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { showToast } from '@/common/ui/notifications';
import '@/components/modal/AppModal';
import { registerActionsWithLegacy, unregisterActions } from '@/common/utils/actionRegistry';
import { formatCsvRows } from '@/common/utils/csv';
import { downloadCsv } from '@/common/utils/download';
import { escapeHtml } from '@/common/utils/security';
import { createOwnerField } from '../../../utils/ownerField';
import { createTemplateCopyAction } from '../../../utils/templateCopyAction';
import type {
  NPIProductRecord,
  StageConfig,
  StageConfigMap,
  SiteFlagsMap,
  SiteDomainsMap,
  ComplianceStatus,
} from '@/types/modules-business';
import {
  MOCK_PRODUCTS as NPI_DEMO_PRODUCTS,
  STAGE_CONFIG,
  SITE_FLAGS,
  SITE_DOMAINS,
} from './data/mockData';

// Demo seed data used until a real NPI data source is wired in.
const SAMPLE_DATA = NPI_DEMO_PRODUCTS as NPIProductRecord[];

// 类型断言常量
const stageConfigMap = STAGE_CONFIG as StageConfigMap;
const siteFlagsMap = SITE_FLAGS as SiteFlagsMap;
const siteDomainsMap = SITE_DOMAINS as SiteDomainsMap;

// Next step options
const NEXT_STEP_OPTIONS: string[] = [
  '加VINE (0评论)',
  '降价/Coupon (CVR低)',
  '否词/关广告 (ACOS高)',
  '清仓 (扶不起)',
];

const EXCEL_COLUMNS = {
  DELIVERY_FEE: 'O',
  SUGGESTED: 'S',
} as const;

const REVIEW_OWNER_STORAGE_KEY = 'npi_review_owner_v1';
const DEFAULT_REVIEW_OWNER = '运营负责人';
const reviewOwnerField = createOwnerField({
  storageKey: REVIEW_OWNER_STORAGE_KEY,
  defaultOwner: DEFAULT_REVIEW_OWNER,
  inputId: 'npi-review-owner',
});

const ADS_STRATEGY_LABELS: Record<NPIProductRecord['ads_strategy'], string> = {
  auto: '自动',
  manual: '手动',
  mixed: '混合',
};

const FIELD_LABELS: Record<string, string> = {
  is_pan_eu: '泛欧状态',
  check_content: '五点 Rufus 加标题',
  check_sensitive: '敏感词规避',
  check_creative: '图片加 QA',
  check_ebc: 'A+ 页面',
  delivery_fee: 'DE 配送费',
  ads_strategy: '广告策略',
};

interface ExportRow {
  阶段: string;
  SKU: string;
  中文名: string;
  店铺: string;
  ASIN: string;
  站点: string;
  发货数量: number;
  库存周转天数: number;
  是否泛欧: string;
  五点Rufus加标题: string;
  敏感词规避: string;
  图片加QA: string;
  A加页面: string;
  SOP合规状态: string;
  DE配送费欧元: number;
  配送占比百分号: string;
  配送费35红线欧元: string;
  配送费30复核价欧元: string;
  配送费25参考价欧元: string;
  盈亏平衡点欧元: string;
  流量: number;
  七天CTR百分号: number;
  七天CVR百分号: number;
  ACOAS百分号: number;
  自然单占比百分号: number;
  Vine进度: string;
  广告策略: string;
  是否保留: string;
  NextStep: string;
}

interface TableRowRenderContext {
  stageConfig: StageConfig;
  clearancePrice: string;
  movingPrice: string;
  suggestedPrice: string;
  deliveryPercent: string;
  compliance: ComplianceStatus;
  domain: string;
  flag: string;
  inventoryClass: string;
  suggestedPriceClass: string;
  ctrClass: string;
  acoasClass: string;
  decisionClass: string;
}

type AppModalElement = HTMLElement & {
  open?: () => void;
  close?: () => void;
};

// 模块状态
let tableData: NPIProductRecord[] = [...SAMPLE_DATA];
let registeredActions: string[] = [];
let removeFilterListener: (() => void) | null = null;
const tableEventHandlers = new WeakMap<HTMLElement, EventListener>();
const nextStepModalCloseHandlers = new WeakSet<HTMLElement>();

function syncNextStepModalClosed(modal: HTMLElement): void {
  modal.classList.add('hidden');
}

function bindNextStepModalCloseSync(modal: HTMLElement): void {
  if (nextStepModalCloseHandlers.has(modal)) return;
  modal.addEventListener('close', () => syncNextStepModalClosed(modal));
  nextStepModalCloseHandlers.add(modal);
}

function moveNextStepModalToBody(container: HTMLElement): void {
  const modal = container.querySelector('#next-step-modal');
  if (!modal) return;

  bindNextStepModalCloseSync(modal as HTMLElement);

  const existingBodyModal = document.body.querySelector('#next-step-modal');
  if (existingBodyModal && existingBodyModal !== modal) {
    existingBodyModal.remove();
  }

  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }
}

function removeNextStepModalFromBody(): void {
  const modal = document.body.querySelector('#next-step-modal');
  modal?.remove();
}

// Pricing guardrails based only on delivery-fee ratio. These are not net-profit prices.
const calcClearancePrice = (deliveryFee: number): string => (deliveryFee / 0.35).toFixed(2);
const calcMovingPrice = (deliveryFee: number): string => (deliveryFee / 0.3).toFixed(2);
const calcCurrentPrice = (deliveryFee: number): string => (deliveryFee / 0.25).toFixed(2);
const calcDeliveryPercent = (deliveryFee: number, currentPrice: number): string =>
  ((deliveryFee / currentPrice) * 100).toFixed(1);

// Check compliance score
const getComplianceStatus = (record: NPIProductRecord): ComplianceStatus => {
  const checks = [
    record.check_content,
    record.check_sensitive,
    record.check_creative,
    record.check_ebc,
  ];
  const completed = checks.filter(Boolean).length;
  return { completed, total: 4, isComplete: completed === 4 };
};

const checkedAttr = (checked: boolean): string => (checked ? 'checked' : '');
const selectedAttr = (current: string, expected: string): string =>
  current === expected ? 'selected' : '';
const yesNo = (value: boolean): string => (value ? '是' : '否');
const checkMark = (value: boolean): string => (value ? '✓' : '');
const safeText = (value: unknown): string => escapeHtml(String(value ?? ''));
const rowFieldLabel = (row: NPIProductRecord, field: keyof typeof FIELD_LABELS): string =>
  safeText(`${row.sku} ${FIELD_LABELS[field]}`);
const rowActionLabel = (row: NPIProductRecord, action: string): string =>
  safeText(`${row.sku} ${action}`);

function renderComplianceStatus(compliance: ComplianceStatus): string {
  return compliance.isComplete
    ? '<span class="npi-status-done"><i class="fas fa-check-circle"></i></span>'
    : `<span class="npi-status-pending text-xs">${compliance.completed}/${compliance.total}</span>`;
}

function renderAdsOptions(strategy: NPIProductRecord['ads_strategy']): string {
  return Object.entries(ADS_STRATEGY_LABELS)
    .map(
      ([value, label]) =>
        `<option value="${value}" ${selectedAttr(strategy, value)}>${label}</option>`
    )
    .join('');
}

function renderNextStepTags(steps: string[]): string {
  return steps
    .map(
      (step: string) =>
        `<span class="px-2 py-0.5 bg-[#eff6ff] text-[var(--module-accent-text)] rounded text-xs">${safeText(step)}</span>`
    )
    .join('');
}

function renderTableRows(tbody: HTMLElement, tableHTML: string): void {
  const scratch = document.createElement('div');
  const renderer = SafeRenderer.getInstance();

  // Parse rows in a table context; body parsing drops orphaned tr/td elements.
  renderer.renderTemplate(scratch, `<table><tbody>${tableHTML}</tbody></table>`);

  const parsedBody = scratch.querySelector('tbody');
  tbody.replaceChildren();

  if (parsedBody) {
    tbody.append(...Array.from(parsedBody.children));
  }
}

function buildTableRowContext(row: NPIProductRecord): TableRowRenderContext {
  const stageConfig: StageConfig = stageConfigMap[row.stage] || stageConfigMap['new-test'];
  const clearancePrice = calcClearancePrice(row.delivery_fee);
  const movingPrice = calcMovingPrice(row.delivery_fee);
  const suggestedPrice = calcCurrentPrice(row.delivery_fee);
  const deliveryPercent = calcDeliveryPercent(row.delivery_fee, parseFloat(suggestedPrice));
  const compliance = getComplianceStatus(row);
  const domain = siteDomainsMap[row.site] || siteDomainsMap.DE || 'amazon.de';
  const flag = siteFlagsMap[row.site] || row.site;
  const inventoryClass = row.inventory_days > 60 ? 'npi-status-fail font-bold' : '';
  const suggestedPriceClass =
    parseFloat(suggestedPrice) < parseFloat(clearancePrice)
      ? 'npi-status-fail font-bold npi-status-fail-soft'
      : 'npi-status-done font-bold';
  const ctrClass = row.ctr_7d < 0.5 ? 'npi-status-pending npi-status-pending-soft' : '';
  const acoasClass = row.acoas > 50 ? 'npi-status-fail' : '';
  const decisionClass =
    row.decision === 'keep'
      ? 'npi-status-done npi-status-done-soft'
      : 'npi-status-fail npi-status-fail-soft';

  return {
    stageConfig,
    clearancePrice,
    movingPrice,
    suggestedPrice,
    deliveryPercent,
    compliance,
    domain,
    flag,
    inventoryClass,
    suggestedPriceClass,
    ctrClass,
    acoasClass,
    decisionClass,
  };
}

function renderProfileCells(row: NPIProductRecord, context: TableRowRenderContext): string {
  return `
            <!-- 基础档案 (8列) -->
            <td class="px-3 py-3 sticky left-0 bg-white z-10 border-r">
                <span class="px-2 py-1 rounded text-xs font-medium ${safeText(context.stageConfig.color)}">${safeText(context.stageConfig.label)}</span>
            </td>
            <td class="px-3 py-3 text-sm font-mono text-primary-600 cursor-pointer hover:underline" data-action="open-product" data-domain="${safeText(context.domain)}" data-asin="${safeText(row.asin)}">
                ${safeText(row.sku)}
            </td>
            <td class="px-3 py-3 text-sm">${safeText(row.cn_name)}</td>
            <td class="px-3 py-3 text-sm">${safeText(row.store)}</td>
            <td class="px-3 py-3 text-sm font-mono">
                <a href="https://www.${safeText(context.domain)}/dp/${safeText(row.asin)}" target="_blank" class="text-primary-600 hover:underline">${safeText(row.asin)}</a>
            </td>
            <td class="px-3 py-3 text-sm text-center">
                <span class="inline-flex items-center gap-1" title="${safeText(row.site)}">
                    ${safeText(context.flag)}
                </span>
            </td>
            <td class="px-3 py-3 text-sm text-center">${row.qty_shipped}</td>
            <td class="px-3 py-3 text-sm text-center ${context.inventoryClass}">${row.inventory_days}天</td>`;
}

function renderComplianceCells(row: NPIProductRecord, compliance: ComplianceStatus): string {
  return `
            <!-- SOP合规 (6列: 泛欧 + 4项检查 + 状态) -->
            <td class="px-3 py-3 text-center border-l">
                <label class="npi-checkbox-hit" title="${rowFieldLabel(row, 'is_pan_eu')}">
                    <input type="checkbox" ${checkedAttr(row.is_pan_eu)} class="w-4 h-4 rounded" data-action="update-field" data-field="is_pan_eu" aria-label="${rowFieldLabel(row, 'is_pan_eu')}">
                </label>
            </td>
            <td class="px-3 py-3 text-center">
                <label class="npi-checkbox-hit" title="${rowFieldLabel(row, 'check_content')}">
                    <input type="checkbox" ${checkedAttr(row.check_content)} class="w-4 h-4 rounded npi-status-done" data-action="update-field" data-field="check_content" aria-label="${rowFieldLabel(row, 'check_content')}">
                </label>
            </td>
            <td class="px-3 py-3 text-center">
                <label class="npi-checkbox-hit" title="${rowFieldLabel(row, 'check_sensitive')}">
                    <input type="checkbox" ${checkedAttr(row.check_sensitive)} class="w-4 h-4 rounded npi-status-done" data-action="update-field" data-field="check_sensitive" aria-label="${rowFieldLabel(row, 'check_sensitive')}">
                </label>
            </td>
            <td class="px-3 py-3 text-center">
                <label class="npi-checkbox-hit" title="${rowFieldLabel(row, 'check_creative')}">
                    <input type="checkbox" ${checkedAttr(row.check_creative)} class="w-4 h-4 rounded npi-status-done" data-action="update-field" data-field="check_creative" aria-label="${rowFieldLabel(row, 'check_creative')}">
                </label>
            </td>
            <td class="px-3 py-3 text-center">
                <label class="npi-checkbox-hit" title="${rowFieldLabel(row, 'check_ebc')}">
                    <input type="checkbox" ${checkedAttr(row.check_ebc)} class="w-4 h-4 rounded npi-status-done" data-action="update-field" data-field="check_ebc" aria-label="${rowFieldLabel(row, 'check_ebc')}">
                </label>
            </td>
            <td class="px-3 py-3 text-center">
                ${renderComplianceStatus(compliance)}
            </td>`;
}

function renderPricingCells(row: NPIProductRecord, context: TableRowRenderContext): string {
  return `
            <!-- 财务模型 (6列) -->
            <td class="px-3 py-3 border-l">
                <input type="number" step="0.1" value="${row.delivery_fee}"
                    class="w-16 px-2 py-1 border rounded text-sm text-center"
                    data-action="update-delivery-fee" aria-label="${rowFieldLabel(row, 'delivery_fee')}">
            </td>
            <td class="px-3 py-3 text-center text-sm sops-neutral-text-muted">${context.deliveryPercent}%</td>
            <td class="px-3 py-3 text-center npi-status-fail font-bold">€${context.clearancePrice}</td>
            <td class="px-3 py-3 text-center npi-status-pending font-medium">€${context.movingPrice}</td>
            <td class="px-3 py-3 text-center ${context.suggestedPriceClass}">€${context.suggestedPrice}</td>
            <td class="px-3 py-3 text-center text-sm">€${safeText(row.break_even)}</td>`;
}

function renderTrafficCells(row: NPIProductRecord, context: TableRowRenderContext): string {
  return `
            <!-- 流量转化 (5列) -->
            <td class="px-3 py-3 text-center border-l text-sm">${row.sessions.toLocaleString()}</td>
            <td class="px-3 py-3 text-center text-sm ${context.ctrClass}">${row.ctr_7d}%</td>
            <td class="px-3 py-3 text-center text-sm">${row.cvr_7d}%</td>
            <td class="px-3 py-3 text-center text-sm ${context.acoasClass}">${row.acoas}%</td>
            <td class="px-3 py-3 text-center text-sm">${row.organic_ratio}%</td>`;
}

function renderDecisionCells(row: NPIProductRecord, context: TableRowRenderContext): string {
  return `
            <!-- 决策 (4列: Vine进度 + 广告 + 保留 + Next Step) -->
            <td class="px-3 py-3 text-center text-sm border-l">${safeText(row.vine_status)}</td>
            <td class="px-3 py-3">
                <select class="px-2 py-1 border rounded text-xs" data-action="update-field" data-field="ads_strategy" aria-label="${rowFieldLabel(row, 'ads_strategy')}">
                    ${renderAdsOptions(row.ads_strategy)}
                </select>
            </td>
            <td class="px-3 py-3 text-center">
                <button type="button" data-action="toggle-decision" class="px-2 py-1 rounded text-xs font-medium ${context.decisionClass}">
                    ${row.decision === 'keep' ? '保留' : '放弃'}
                </button>
            </td>
            <td class="px-3 py-3">
                <div class="flex flex-wrap gap-1">
                    ${renderNextStepTags(row.next_step)}
                    <button type="button" data-action="open-next-step-editor" class="px-2 py-0.5 border border-dashed border-slate-300 rounded text-xs sops-neutral-text-faint hover:border-primary-400 hover:text-primary-500" aria-label="${rowActionLabel(row, '添加 Next Step')}" title="${rowActionLabel(row, '添加 Next Step')}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </td>`;
}

function renderTableRow(row: NPIProductRecord, index: number): string {
  const context = buildTableRowContext(row);

  return `
        <tr class="hover:sops-neutral-surface border-b sops-neutral-divider-soft" data-index="${index}">
            ${renderProfileCells(row, context)}
            ${renderComplianceCells(row, context.compliance)}
            ${renderPricingCells(row, context)}
            ${renderTrafficCells(row, context)}
            ${renderDecisionCells(row, context)}
        </tr>
        `;
}

// Render the table
function renderTable(): void {
  const tbody = document.getElementById('npi-table-body');
  if (!tbody) return;

  const tableHTML = tableData.map(renderTableRow).join('');
  renderTableRows(tbody, tableHTML);

  // 使用事件委托绑定所有事件
  setupTableEventDelegation(tbody);
}

// Update field
function updateField(index: number, field: keyof NPIProductRecord, value: unknown): void {
  if (index >= 0 && index < tableData.length) {
    const row = tableData[index];
    if (row) {
      // 类型安全的字段更新
      (row[field] as typeof value) = value as never;
      renderTable();
    }
  }
}

// 设置表格事件委托
function setupTableEventDelegation(tbody: HTMLElement): void {
  // 移除旧的事件监听器（如果存在）
  const oldHandler = tableEventHandlers.get(tbody);
  if (oldHandler) {
    tbody.removeEventListener('click', oldHandler);
    tbody.removeEventListener('change', oldHandler);
  }

  // 创建新的事件处理器
  const eventHandler: EventListener = e => {
    const rawTarget = e.target as HTMLElement;
    const target = rawTarget.closest('[data-action]') as HTMLElement | null;
    if (!target) return;

    const row = target.closest('tr[data-index]') as HTMLElement;
    if (!row) return;

    const index = parseInt(row.dataset.index || '-1');
    if (index < 0) return;

    const action = target.getAttribute('data-action');
    if (!action) return;

    const handler = TABLE_ACTION_HANDLERS[action];
    if (!handler) return;

    e.stopPropagation();
    handler(target, index);
  };

  // 保存处理器引用以便后续移除
  tableEventHandlers.set(tbody, eventHandler);

  // 绑定事件
  tbody.addEventListener('click', eventHandler);
  tbody.addEventListener('change', eventHandler);
}

// Update delivery fee and recalculate prices
function updateDeliveryFee(index: number, value: string): void {
  const row = tableData[index];
  if (row) {
    row.delivery_fee = parseFloat(value) || 0;
    renderTable();
  }
}

// Toggle decision
function toggleDecision(index: number): void {
  const row = tableData[index];
  if (row) {
    row.decision = row.decision === 'keep' ? 'kill' : 'keep';
    renderTable();
  }
}

// Open Next Step Editor
function openNextStepEditor(index: number): void {
  const modal = document.getElementById('next-step-modal') as HTMLElement & {
    dataset: { index: string };
  };
  const checkboxes = document.getElementById('next-step-checkboxes');
  const row = tableData[index];
  if (!modal || !checkboxes || !row) return;

  modal.dataset.index = index.toString();

  const currentSteps = row.next_step;
  checkboxes.textContent = '';
  NEXT_STEP_OPTIONS.forEach(option => {
    const label = document.createElement('label');
    label.className =
      'flex items-center gap-2 p-2 hover:sops-neutral-surface rounded cursor-pointer';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = option;
    input.checked = currentSteps.includes(option);
    input.className = 'w-4 h-4 rounded';

    const span = document.createElement('span');
    span.className = 'text-sm';
    span.textContent = option;

    label.appendChild(input);
    label.appendChild(span);
    checkboxes.appendChild(label);
  });

  modal.classList.remove('hidden');
  (modal as AppModalElement).open?.();
}

// Save Next Steps
function saveNextSteps(): void {
  const modal = document.getElementById('next-step-modal') as HTMLElement & {
    dataset: { index: string };
  };
  if (!modal) return;

  const index = parseInt(modal.dataset.index);
  const row = tableData[index];
  if (isNaN(index) || !row) return;

  const checkboxes = document.querySelectorAll('#next-step-checkboxes input:checked');

  row.next_step = Array.from(checkboxes).map(cb => (cb as HTMLInputElement).value);
  modal.classList.add('hidden');
  (modal as AppModalElement).close?.();
  renderTable();
}

type TableActionHandler = (target: HTMLElement, index: number) => void;

function handleOpenProduct(target: HTMLElement): void {
  const domain = target.getAttribute('data-domain');
  const asin = target.getAttribute('data-asin');
  if (domain && asin) {
    window.open(`https://www.${domain}/dp/${asin}`, '_blank');
  }
}

function handleUpdateField(target: HTMLElement, index: number): void {
  const field = target.getAttribute('data-field') as keyof NPIProductRecord;
  if (!field) return;

  const input = target as HTMLInputElement;
  const value = input.type === 'checkbox' ? input.checked : input.value;
  updateField(index, field, value);
}

const TABLE_ACTION_HANDLERS: Record<string, TableActionHandler> = {
  'open-product': handleOpenProduct,
  'update-field': handleUpdateField,
  'update-delivery-fee': (target, index) =>
    updateDeliveryFee(index, (target as HTMLInputElement).value),
  'toggle-decision': (_target, index) => toggleDecision(index),
  'open-next-step-editor': (_target, index) => openNextStepEditor(index),
};

// Close modal
function closeNextStepModal(): void {
  const modal = document.getElementById('next-step-modal');
  if (!modal) return;

  modal.classList.add('hidden');
  (modal as AppModalElement).close?.();
}

function getComplianceLabel(record: NPIProductRecord): string {
  const compliance = getComplianceStatus(record);
  return compliance.isComplete ? '完成' : `${compliance.completed}/4`;
}

function getDecisionLabel(decision: NPIProductRecord['decision']): string {
  return decision === 'keep' ? '保留' : '放弃';
}

function getStageLabel(stage: NPIProductRecord['stage']): string {
  return stageConfigMap[stage]?.label || stage;
}

function formatReviewLine(row: NPIProductRecord): string {
  return [
    `- ${row.sku} / ${row.asin} / ${row.site}`,
    `阶段：${getStageLabel(row.stage)}`,
    `库存：${row.inventory_days}天`,
    `合规：${getComplianceLabel(row)}`,
    `配送费35%红线：€${calcClearancePrice(row.delivery_fee)}`,
    `配送费30%复核价：€${calcMovingPrice(row.delivery_fee)}`,
    `配送费25%参考价：€${calcCurrentPrice(row.delivery_fee)}`,
    `ACOS：${row.acoas}%`,
    `自然单：${row.organic_ratio}%`,
    `结论：${getDecisionLabel(row.decision)}`,
    `下一步：${row.next_step.join('；') || '待补充'}`,
  ].join(' | ');
}

function buildStageSummary(rows: NPIProductRecord[]): string {
  const counts = rows.reduce<Record<string, number>>((summary, row) => {
    const label = getStageLabel(row.stage);
    summary[label] = (summary[label] || 0) + 1;
    return summary;
  }, {});

  return (
    Object.entries(counts)
      .map(([label, count]) => `${label} ${count}`)
      .join('，') || '无'
  );
}

function buildManualReviewItems(rows: NPIProductRecord[], owner = DEFAULT_REVIEW_OWNER): string[] {
  return rows
    .filter(row => {
      const compliance = getComplianceStatus(row);
      return (
        !compliance.isComplete ||
        row.inventory_days > 60 ||
        row.acoas > 60 ||
        row.decision === 'kill'
      );
    })
    .map(row => {
      const reasons = [
        !getComplianceStatus(row).isComplete ? `合规未完成(${getComplianceLabel(row)})` : '',
        row.inventory_days > 60 ? `库存${row.inventory_days}天` : '',
        row.acoas > 60 ? `ACOS ${row.acoas}%` : '',
        row.decision === 'kill' ? '当前结论为放弃' : '',
      ].filter(Boolean);

      return `- ${row.sku}：${reasons.join('；')}，需 ${owner} 确认下一步动作。`;
    });
}

export function buildNpiReviewTemplate(
  rows: NPIProductRecord[],
  owner = DEFAULT_REVIEW_OWNER
): string {
  const today = new Date().toISOString().split('T')[0];
  const reviewOwner = reviewOwnerField.normalize(owner);
  const keepCount = rows.filter(row => row.decision === 'keep').length;
  const killCount = rows.length - keepCount;
  const reviewItems = buildManualReviewItems(rows, reviewOwner);

  return [
    `# NPI 周复盘归档 - ${today}`,
    '',
    '## 复盘范围',
    `- 作业负责人：${reviewOwner}`,
    `- SKU 数：${rows.length}`,
    `- 阶段分布：${buildStageSummary(rows)}`,
    `- 当前结论：保留 ${keepCount}，放弃/清仓 ${killCount}`,
    '',
    '## SKU 复盘明细',
    ...(rows.length > 0 ? rows.map(formatReviewLine) : ['- 无当前看板数据']),
    '',
    '## 人工确认点',
    ...(reviewItems.length > 0
      ? reviewItems
      : [`- 暂无高风险项，仍需 ${reviewOwner} 确认价格、广告和库存动作。`]),
    '',
    '## 本周动作',
    '- 已执行：',
    '- 待执行：',
    '- 需要升级：',
    '',
    '## 下次复盘',
    '- 复盘日期：',
    `- 负责人：${reviewOwner}`,
    '- 需要补充的数据截图或报表路径：',
  ].join('\n');
}

function buildExportRow(row: NPIProductRecord, idx: number): ExportRow {
  const excelRow = idx + 2;

  return {
    阶段: getStageLabel(row.stage),
    SKU: row.sku,
    中文名: row.cn_name,
    店铺: row.store,
    ASIN: row.asin,
    站点: row.site,
    发货数量: row.qty_shipped,
    库存周转天数: row.inventory_days,
    是否泛欧: yesNo(row.is_pan_eu),
    五点Rufus加标题: checkMark(row.check_content),
    敏感词规避: checkMark(row.check_sensitive),
    图片加QA: checkMark(row.check_creative),
    A加页面: checkMark(row.check_ebc),
    SOP合规状态: getComplianceLabel(row),
    DE配送费欧元: row.delivery_fee,
    配送占比百分号: `=${EXCEL_COLUMNS.DELIVERY_FEE}${excelRow}/${EXCEL_COLUMNS.SUGGESTED}${excelRow}*100`,
    配送费35红线欧元: `=${EXCEL_COLUMNS.DELIVERY_FEE}${excelRow}/0.35`,
    配送费30复核价欧元: `=${EXCEL_COLUMNS.DELIVERY_FEE}${excelRow}/0.3`,
    配送费25参考价欧元: `=${EXCEL_COLUMNS.DELIVERY_FEE}${excelRow}/0.25`,
    盈亏平衡点欧元: row.break_even,
    流量: row.sessions,
    七天CTR百分号: row.ctr_7d,
    七天CVR百分号: row.cvr_7d,
    ACOAS百分号: row.acoas,
    自然单占比百分号: row.organic_ratio,
    Vine进度: row.vine_status,
    广告策略: ADS_STRATEGY_LABELS[row.ads_strategy],
    是否保留: getDecisionLabel(row.decision),
    NextStep: row.next_step.join('; '),
  };
}

function buildCsvContent(exportData: ExportRow[]): string | null {
  const firstRow = exportData[0];
  if (!firstRow) return null;

  const headers = Object.keys(firstRow) as Array<keyof ExportRow>;
  return formatCsvRows(
    [
      headers as string[],
      ...exportData.map(row => headers.map(header => row[header] as string | number)),
    ],
    { allowFormula: true }
  );
}

// Export to Excel with formulas
function exportToExcel(): void {
  const exportData = tableData.map(buildExportRow);
  if (exportData.length === 0) {
    showToast('没有数据可导出', { type: 'warning' });
    return;
  }

  const csvContent = buildCsvContent(exportData);
  if (!csvContent) {
    showToast('数据格式错误', { type: 'error' });
    return;
  }

  downloadCsv(`NPI_Tracker_${new Date().toISOString().split('T')[0]}.csv`, csvContent);

  showToast('导出成功！CSV文件包含Excel兼容公式，使用Excel打开后公式会自动计算。', {
    type: 'success',
    description:
      '提示：价格列仅为配送费占比预警，不代表净利润；正式定价必须进入欧洲站SKU利润表复核。',
  });
}

const copyNpiReviewTemplate = createTemplateCopyAction({
  ownerField: reviewOwnerField,
  buildTemplate: owner => buildNpiReviewTemplate(tableData, owner),
  successMessage: '已复制 NPI 复盘模板，可粘贴到周报或归档文档。',
  failureMessage: '复制失败，请使用导出 CSV 或手动复制复盘模板。',
});

// Filter by store
function filterByStore(store: string): void {
  if (store === 'all') {
    removeFilterListener?.();
    tableData = [...SAMPLE_DATA];
  } else {
    tableData = SAMPLE_DATA.filter((row: NPIProductRecord) => row.store === store);
  }
  renderTable();
}

// Filter by stage
function filterByStage(stage: string): void {
  if (stage === 'all') {
    tableData = [...SAMPLE_DATA];
  } else {
    tableData = SAMPLE_DATA.filter((row: NPIProductRecord) => row.stage === stage);
  }
  renderTable();
}

// 扩展 Window 接口以支持全局函数（兼容性）
function setupFilterEventDelegation(container: HTMLElement): void {
  removeFilterListener?.();

  const handleFilterChange = (event: Event): void => {
    const target = event.target as HTMLSelectElement | null;
    const filterType = target?.dataset?.npiFilter;
    if (!filterType) return;

    if (filterType === 'store') {
      filterByStore(target.value);
    } else if (filterType === 'stage') {
      filterByStage(target.value);
    }
  };

  const handleOwnerInput = (event: Event): void => {
    const target = event.target as HTMLInputElement | null;
    if (target?.id === 'npi-review-owner') {
      reviewOwnerField.save(target.value);
    }
  };

  container.addEventListener('change', handleFilterChange);
  container.addEventListener('input', handleOwnerInput);
  removeFilterListener = () => {
    container.removeEventListener('change', handleFilterChange);
    container.removeEventListener('input', handleOwnerInput);
    removeFilterListener = null;
  };
}

declare global {
  interface Window {
    updateField?: (index: number, field: keyof NPIProductRecord, value: unknown) => void;
    updateDeliveryFee?: (index: number, value: string) => void;
    toggleDecision?: (index: number) => void;
    openNextStepEditor?: (index: number) => void;
    saveNextSteps?: () => void;
    closeNextStepModal?: () => void;
    exportToExcel?: () => void;
    copyNpiReviewTemplate?: () => Promise<void>;
  }
}

class NpiTrackerModule extends BaseModule {
  constructor() {
    super('sops_npi_tracker');
  }

  protected async render(): Promise<void> {
    const container = this.container;
    if (!container) return;

    // 1. 使用 SafeTemplateLoader 加载模板
    const loader = SafeTemplateLoader.getInstance();
    const renderer = SafeRenderer.getInstance();

    const html = await loader.loadTemplate(
      'src/modules/sops/views/growth/npi_tracker/template.html',
      {
        retryCount: 3,
        timeout: 5000,
        onError: error => {
          console.error('[NPITracker] 模板加载失败:', error);
        },
      }
    );

    // 2. 使用 SafeRenderer 渲染模板（静态模板，已审计）
    renderer.renderTemplate(container, html);
    container.classList.add('fade-in');
    moveNextStepModalToBody(container);
    reviewOwnerField.restore();
  }

  protected async init(): Promise<void> {
    const container = this.container;
    if (!container) return;

    // 3. 注册全局操作
    const npiTrackerActions: Record<string, (...args: unknown[]) => void> = {
      updateField: updateField as (...args: unknown[]) => void,
      updateDeliveryFee: updateDeliveryFee as (...args: unknown[]) => void,
      toggleDecision: toggleDecision as (...args: unknown[]) => void,
      openNextStepEditor: openNextStepEditor as (...args: unknown[]) => void,
      saveNextSteps: saveNextSteps as (...args: unknown[]) => void,
      closeNextStepModal: closeNextStepModal as (...args: unknown[]) => void,
      exportToExcel: exportToExcel as (...args: unknown[]) => void,
      copyNpiReviewTemplate: copyNpiReviewTemplate as (...args: unknown[]) => void,
    };

    registeredActions = registerActionsWithLegacy(npiTrackerActions);
    setupFilterEventDelegation(container);

    // 4. 初始化表格（延迟渲染，确保 DOM 就绪）
    this.setTimeout(() => {
      renderTable();
    }, 100);
  }

  protected onUnmount(): void {
    try {
      // 1. 清理注册的动作
      if (registeredActions.length > 0) {
        unregisterActions(registeredActions);
        registeredActions = [];
      }

      removeFilterListener?.();

      // 2. 重置表格数据
      tableData = [...SAMPLE_DATA];
      removeNextStepModalFromBody();
    } catch (error) {
      console.error('[NPITracker] ❌ 模块卸载失败:', error);
    }
  }
}

const npiTrackerModule = new NpiTrackerModule();

export const mount = (container: HTMLElement): Promise<void> => npiTrackerModule.mount(container);
export const unmount = (): void => {
  npiTrackerModule.unmount();
};
