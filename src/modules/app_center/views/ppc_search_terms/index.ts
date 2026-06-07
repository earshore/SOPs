import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { showToast } from '@/common/ui/notifications';
import { safeMount } from '@/common/utils/safeMount';
import { loadTemplate } from '@/common/utils/viewLoader';
import { StorageService } from '@/services/storageService';

import './style.css';

export type ActionType =
  | 'negative_exact'
  | 'harvest_exact'
  | 'scale_budget'
  | 'bid_down'
  | 'listing_term'
  | 'observe';

type FilterType = ActionType | 'all';
type RawRecord = Record<string, string>;
type ColumnKey =
  | 'campaign'
  | 'adGroup'
  | 'searchTerm'
  | 'keyword'
  | 'matchType'
  | 'impressions'
  | 'clicks'
  | 'spend'
  | 'sales'
  | 'orders';

export interface Thresholds {
  targetAcos: number;
  highAcos: number;
  minClicksNoOrder: number;
  minSpendNoOrder: number;
  minOrdersHarvest: number;
  minCtr: number;
}

export interface ColumnMapping {
  found: Partial<Record<ColumnKey, string>>;
  missing: ColumnKey[];
}

interface ActionDecision {
  type: ActionType;
  label: string;
  reason: string;
  priority: number;
}

export interface AnalyzedRow {
  id: string;
  campaign: string;
  adGroup: string;
  searchTerm: string;
  keyword: string;
  matchType: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  ctr: number;
  cvr: number;
  cpc: number;
  acos: number;
  action: ActionType;
  actionLabel: string;
  reason: string;
  priority: number;
}

interface AnalysisSummary {
  rowCount: number;
  spend: number;
  sales: number;
  orders: number;
  acos: number;
  actionCount: number;
}

export interface AnalysisResult {
  rows: AnalyzedRow[];
  mapping: ColumnMapping;
  totalRows: number;
  validRows: number;
}

interface ListenerRecord {
  element: EventTarget;
  type: string;
  handler: EventListenerOrEventListenerObject;
}

interface ClassificationRule {
  type: ActionType;
  reason: string;
  priority: number;
  matches: (metrics: RowMetrics, thresholds: Thresholds) => boolean;
}

type RowMetrics = Pick<AnalyzedRow, 'impressions' | 'clicks' | 'spend' | 'sales' | 'orders' | 'ctr' | 'cvr' | 'acos'>;

const STORAGE_KEY = 'ppc_search_terms_thresholds_v1';
const MAX_RENDER_ROWS = 300;
const ACTION_LABELS: Record<ActionType, string> = {
  negative_exact: '否精准',
  harvest_exact: '加精准',
  scale_budget: '加预算',
  bid_down: '降竞价',
  listing_term: '进词池',
  observe: '观察',
};

const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    type: 'negative_exact',
    reason: '无订单且点击/花费已超过阈值',
    priority: 90,
    matches: isWasteWithoutOrders,
  },
  {
    type: 'scale_budget',
    reason: '低 ACOS 且订单稳定，可加预算或单独放量',
    priority: 80,
    matches: isScaleCandidate,
  },
  {
    type: 'harvest_exact',
    reason: 'ACOS 达标且有足够订单，建议加精准',
    priority: 70,
    matches: isHarvestCandidate,
  },
  {
    type: 'bid_down',
    reason: '有订单但 ACOS 偏高，先降竞价再观察',
    priority: 60,
    matches: isBidDownCandidate,
  },
  {
    type: 'listing_term',
    reason: '有相关性信号，可进入 Listing 词池复核',
    priority: 50,
    matches: isListingTermCandidate,
  },
  {
    type: 'observe',
    reason: '曝光高但 CTR 低，优先检查主图、价格和相关性',
    priority: 30,
    matches: isLowCtrCandidate,
  },
];

const REQUIRED_FIELDS: ColumnKey[] = ['searchTerm', 'clicks', 'spend', 'sales', 'orders'];
const COLUMN_ALIASES: Record<ColumnKey, string[]> = {
  campaign: ['campaign name', 'campaign name informational only', 'campaign', 'campaigns', '广告活动', '广告活动名称'],
  adGroup: ['ad group name', 'ad group name informational only', 'ad group', 'adgroup', '广告组', '广告组名称'],
  searchTerm: [
    'customer search term',
    'customer search term informational only',
    'search term',
    'search terms',
    '用户搜索词',
    '搜索词',
    '搜索词条',
  ],
  keyword: ['keyword', 'targeting', 'targeting informational only', 'targeting expression', '投放词', '关键词', '定向'],
  matchType: ['match type', 'match type informational only', 'match', '匹配类型'],
  impressions: ['impressions', 'impression', '展示量', '曝光量', '曝光'],
  clicks: ['clicks', 'clicks informational only', 'click', '点击量', '点击'],
  spend: ['spend', 'spend informational only', 'cost', 'costs', 'ad spend', '花费', '广告花费', '支出'],
  sales: [
    'sales',
    'total sales',
    'sales 7 day total',
    'sales 14 day total',
    '7 day total sales',
    '7 day total sales total',
    '14 day total sales',
    '14 day total sales total',
    'attributed sales',
    '销售额',
    '广告销售额',
  ],
  orders: [
    'orders',
    'total orders',
    'orders 7 day total',
    'orders 14 day total',
    '7 day total orders (#)',
    '7 day total orders',
    '14 day total orders (#)',
    '14 day total orders',
    'purchases',
    'conversions',
    '订单',
    '订单量',
  ],
};

const SAMPLE_REPORT = `Campaign Name,Ad Group Name,Customer Search Term,Keyword,Match Type,Impressions,Clicks,Spend,7 Day Total Sales,7 Day Total Orders (#)
DE_Auto_Core,Auto Group,winter dog coat,dog coat,broad,6200,31,42.80,0,0
DE_Auto_Core,Auto Group,waterproof dog jacket,dog coat,broad,4100,45,54.20,210.50,6
DE_Manual_Exact,Core Exact,reflective dog coat,reflective dog coat,exact,1800,24,28.30,135.90,4
DE_Manual_Broad,Explore,cheap dog sweater,dog sweater,broad,2600,18,21.40,18.99,1
DE_Manual_Broad,Explore,dog rain jacket,dog coat,broad,5200,37,39.60,156.00,5
DE_Auto_Core,Close Match,cat winter coat,dog coat,broad,1900,14,18.20,0,0
DE_Manual_Phrase,Competitor,brandname dog coat,dog coat,phrase,1200,9,13.40,0,0
DE_Manual_Broad,Explore,small dog warm coat,dog coat,broad,3400,28,31.90,92.00,3
DE_Auto_Core,Substitutes,pet rain poncho,dog coat,broad,900,5,5.80,0,0
DE_Manual_Exact,Core Exact,dog jacket waterproof winter,dog jacket,exact,2100,35,43.50,260.00,8`;

let listeners: ListenerRecord[] = [];
let analyzedRows: AnalyzedRow[] = [];
let sourceText = '';
let activeFilter: FilterType = 'all';

const mountInternal = async (container: HTMLElement): Promise<void> => {
  resetAnalyzerState();
  const html = await loadTemplate('src/modules/app_center/views/ppc_search_terms/template.html');
  const renderer = SafeRenderer.getInstance();
  renderer.renderTemplate(container, html);
  restoreThresholds(container);
  bindEvents(container);
  updateResults(container, []);
};

export const mount = safeMount(mountInternal, { moduleName: 'PPC 搜索词分析器' });

export function unmount(): void {
  listeners.forEach(({ element, type, handler }) => element.removeEventListener(type, handler));
  listeners = [];
}

function bindEvents(container: HTMLElement): void {
  addListener(getElement(container, 'ppc-file-input'), 'change', () => handleFileImport(container));
  addListener(getElement(container, 'ppc-btn-parse'), 'click', () => analyzeTextarea(container));
  addListener(getElement(container, 'ppc-btn-sample'), 'click', () => loadSample(container));
  addListener(getElement(container, 'ppc-btn-clear'), 'click', () => clearAnalyzer(container));
  addListener(getElement(container, 'ppc-export-all'), 'click', () => exportRows('all'));
  addListener(getElement(container, 'ppc-export-current'), 'click', () => exportRows(activeFilter));
  addListener(getElement(container, 'ppc-export-negative'), 'click', () => exportRows('negative_exact'));
  addListener(getElement(container, 'ppc-export-harvest'), 'click', () => exportRows('harvest_exact'));
  addListener(getElement(container, 'ppc-copy-summary'), 'click', () => copySummary());

  container.querySelectorAll<HTMLElement>('.ppc-filter-btn').forEach((button) => {
    addListener(button, 'click', () => setFilter(container, button));
  });

  getThresholdInputs(container).forEach((input) => {
    addListener(input, 'change', () => rerunWithThresholds(container));
  });
}

function addListener(
  element: EventTarget | null,
  type: string,
  handler: EventListenerOrEventListenerObject,
): void {
  if (!element) return;
  element.addEventListener(type, handler);
  listeners.push({ element, type, handler });
}

async function handleFileImport(container: HTMLElement): Promise<void> {
  const input = getInput(container, 'ppc-file-input');
  const file = input?.files?.[0];
  if (!file) return;

  const text = await file.text();
  const textarea = getTextarea(container, 'ppc-paste-input');
  if (textarea) textarea.value = text;
  setText(container, 'ppc-file-name', `已选择：${file.name}`);
  analyzeText(container, text);
}

function analyzeTextarea(container: HTMLElement): void {
  const text = getTextarea(container, 'ppc-paste-input')?.value || '';
  analyzeText(container, text);
}

function loadSample(container: HTMLElement): void {
  const textarea = getTextarea(container, 'ppc-paste-input');
  if (textarea) textarea.value = SAMPLE_REPORT;
  setText(container, 'ppc-file-name', '已加载样例数据');
  analyzeText(container, SAMPLE_REPORT);
}

function clearAnalyzer(container: HTMLElement): void {
  const textarea = getTextarea(container, 'ppc-paste-input');
  if (textarea) textarea.value = '';
  const fileInput = getInput(container, 'ppc-file-input');
  if (fileInput) fileInput.value = '';
  resetAnalyzerState();
  setActiveFilterButton(container, activeFilter);
  setText(container, 'ppc-file-name', '支持 CSV、TSV 或直接粘贴表格内容。');
  setText(container, 'ppc-mapping-status', '');
  updateResults(container, []);
}

function analyzeText(container: HTMLElement, text: string): void {
  const cleanText = text.trim();
  if (!cleanText) {
    showToast('没有可分析的数据', { type: 'warning' });
    return;
  }

  try {
    const thresholds = readThresholds(container);
    const result = analyzeSearchTermReport(cleanText, thresholds);

    sourceText = cleanText;
    analyzedRows = result.rows;
    saveThresholds(thresholds);
    renderMappingStatus(container, result.mapping, result.totalRows, result.validRows);
    updateResults(container, result.rows);
    showToast('PPC 搜索词分析完成', { type: 'success', description: `已识别 ${result.validRows} 行有效数据` });
  } catch (error) {
    const message = error instanceof Error ? error.message : '报表解析失败';
    showToast('分析失败', { type: 'error', description: message });
  }
}

export function analyzeSearchTermReport(text: string, thresholds: Thresholds): AnalysisResult {
  const report = parseReport(text.trim());
  const mapping = mapColumns(report.headers);
  const rows = report.records
    .map((record, index) => analyzeRecord(record, mapping, thresholds, index))
    .filter((row): row is AnalyzedRow => row !== null)
    .sort((a, b) => b.priority - a.priority || b.spend - a.spend);

  return {
    rows,
    mapping,
    totalRows: report.records.length,
    validRows: rows.length,
  };
}

export function parseReport(text: string): { headers: string[]; records: RawRecord[] } {
  const delimiter = detectDelimiter(text);
  const rows = parseDelimited(text, delimiter).filter((row) => row.some((cell) => cell.trim()));
  const headerRow = rows[0];
  if (!headerRow || headerRow.length < 2) {
    throw new Error('未识别到表头，请确认首行包含列名');
  }

  const headers = headerRow.map((header, index) => header.trim() || `column_${index + 1}`);
  const records = rows.slice(1).map((row) => rowToRecord(headers, row));
  return { headers, records };
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || '';
  const candidates = [',', '\t', ';'];
  return candidates
    .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ',';
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] || '';
    const next = text[index + 1] || '';

    if (isEscapedQuote(char, next, inQuotes)) {
      cell += '"';
      index += 1;
    } else if (isQuote(char)) {
      inQuotes = !inQuotes;
    } else if (isDelimiter(char, delimiter, inQuotes)) {
      row.push(cell);
      cell = '';
    } else if (isRowBreak(char, next, inQuotes)) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      if (char === '\r' && next === '\n') index += 1;
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function isEscapedQuote(char: string, next: string, inQuotes: boolean): boolean {
  return char === '"' && inQuotes && next === '"';
}

function isQuote(char: string): boolean {
  return char === '"';
}

function isDelimiter(char: string, delimiter: string, inQuotes: boolean): boolean {
  return char === delimiter && !inQuotes;
}

function isRowBreak(char: string, next: string, inQuotes: boolean): boolean {
  return isLineBreak(char, next) && !inQuotes;
}

function isLineBreak(char: string, next: string): boolean {
  return char === '\n' || (char === '\r' && next === '\n') || char === '\r';
}

function rowToRecord(headers: string[], row: string[]): RawRecord {
  return headers.reduce<RawRecord>((record, header, index) => {
    record[header] = row[index]?.trim() || '';
    return record;
  }, {});
}

function mapColumns(headers: string[]): ColumnMapping {
  const found: Partial<Record<ColumnKey, string>> = {};

  Object.entries(COLUMN_ALIASES).forEach(([key, aliases]) => {
    const normalizedAliases = aliases.map(normalizeHeader);
    const match = headers.find((header) => normalizedAliases.includes(normalizeHeader(header)));
    if (match) found[key as ColumnKey] = match;
  });

  const missing = REQUIRED_FIELDS.filter((key) => !found[key]);
  if (missing.length > 0) {
    throw new Error(`缺少必要列：${missing.map((key) => labelColumn(key)).join('、')}`);
  }

  return { found, missing };
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[#()]/g, '').replace(/\s+/g, ' ').trim();
}

function analyzeRecord(
  record: RawRecord,
  mapping: ColumnMapping,
  thresholds: Thresholds,
  index: number,
): AnalyzedRow | null {
  const searchTerm = readField(record, mapping, 'searchTerm') || readField(record, mapping, 'keyword');
  if (!searchTerm) return null;

  const impressions = parseMetric(readField(record, mapping, 'impressions'));
  const clicks = parseMetric(readField(record, mapping, 'clicks'));
  const spend = parseMetric(readField(record, mapping, 'spend'));
  const sales = parseMetric(readField(record, mapping, 'sales'));
  const orders = parseMetric(readField(record, mapping, 'orders'));
  const ctr = percentage(clicks, impressions);
  const cvr = percentage(orders, clicks);
  const cpc = ratio(spend, clicks);
  const acos = percentage(spend, sales);
  const decision = classifyRow({ impressions, clicks, spend, sales, orders, ctr, cvr, acos }, thresholds);

  return {
    id: `${index}-${searchTerm}`,
    campaign: readField(record, mapping, 'campaign'),
    adGroup: readField(record, mapping, 'adGroup'),
    searchTerm,
    keyword: readField(record, mapping, 'keyword'),
    matchType: readField(record, mapping, 'matchType'),
    impressions,
    clicks,
    spend,
    sales,
    orders,
    ctr,
    cvr,
    cpc,
    acos,
    action: decision.type,
    actionLabel: decision.label,
    reason: decision.reason,
    priority: decision.priority,
  };
}

function classifyRow(metrics: RowMetrics, thresholds: Thresholds): ActionDecision {
  const matchedRule = CLASSIFICATION_RULES.find((rule) => rule.matches(metrics, thresholds));
  if (!matchedRule) return decision('observe', '样本不足，继续观察', 10);
  return decision(matchedRule.type, matchedRule.reason, matchedRule.priority);
}

function isWasteWithoutOrders(metrics: RowMetrics, thresholds: Thresholds): boolean {
  const exceedsClicks = metrics.clicks >= thresholds.minClicksNoOrder;
  const exceedsSpend = metrics.spend >= thresholds.minSpendNoOrder;
  return metrics.orders === 0 && (exceedsClicks || exceedsSpend);
}

function isScaleCandidate(metrics: RowMetrics, thresholds: Thresholds): boolean {
  return metrics.orders >= thresholds.minOrdersHarvest && metrics.acos <= thresholds.targetAcos * 0.65;
}

function isHarvestCandidate(metrics: RowMetrics, thresholds: Thresholds): boolean {
  return metrics.orders >= thresholds.minOrdersHarvest && metrics.acos <= thresholds.targetAcos;
}

function isBidDownCandidate(metrics: RowMetrics, thresholds: Thresholds): boolean {
  return metrics.orders > 0 && metrics.acos >= thresholds.highAcos;
}

function isListingTermCandidate(metrics: RowMetrics, thresholds: Thresholds): boolean {
  const hasOrders = metrics.orders > 0;
  const hasRelevantClicks = metrics.clicks >= 3 && metrics.ctr >= thresholds.minCtr;
  return hasOrders || hasRelevantClicks;
}

function isLowCtrCandidate(metrics: RowMetrics, thresholds: Thresholds): boolean {
  return metrics.impressions >= 1000 && metrics.ctr < thresholds.minCtr;
}

function decision(type: ActionType, reason: string, priority: number): ActionDecision {
  return {
    type,
    reason,
    priority,
    label: ACTION_LABELS[type],
  };
}

function readField(record: RawRecord, mapping: ColumnMapping, key: ColumnKey): string {
  const column = mapping.found[key];
  return column ? record[column] || '' : '';
}

function parseMetric(value: string): number {
  const cleaned = value.trim().replace(/[%€$£¥\s]/g, '');
  if (!cleaned) return 0;

  const normalized = normalizeNumberString(cleaned);
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeNumberString(value: string): string {
  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    return value.split(thousandsSeparator).join('').replace(decimalSeparator, '.');
  }

  if (value.includes(',') && !value.includes('.')) {
    return normalizeSingleSeparatorNumber(value, ',');
  }

  if (value.includes('.') && !value.includes(',')) {
    return normalizeSingleSeparatorNumber(value, '.');
  }

  return value;
}

function normalizeSingleSeparatorNumber(value: string, separator: ',' | '.'): string {
  const parts = value.split(separator);
  if (parts.length > 2) return parts.join('');

  const integer = parts[0] || '';
  const fraction = parts[1] || '';
  if (fraction.length === 3 && integer.length <= 3) return parts.join('');
  if (separator === ',') return value.replace(',', '.');
  return value;
}

function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function updateResults(container: HTMLElement, rows: AnalyzedRow[]): void {
  const visibleRows = filterRows(rows);
  const summary = summarize(rows);
  updateStats(container, summary);
  updateResultCount(container, rows, visibleRows);
  renderRows(container, visibleRows);
}

function filterRows(rows: AnalyzedRow[]): AnalyzedRow[] {
  if (activeFilter === 'all') return rows;
  return rows.filter((row) => row.action === activeFilter);
}

function summarize(rows: AnalyzedRow[]): AnalysisSummary {
  const totals = rows.reduce(
    (summary, row) => ({
      rowCount: summary.rowCount + 1,
      spend: summary.spend + row.spend,
      sales: summary.sales + row.sales,
      orders: summary.orders + row.orders,
      actionCount: summary.actionCount + (row.action === 'observe' ? 0 : 1),
    }),
    { rowCount: 0, spend: 0, sales: 0, orders: 0, actionCount: 0 },
  );

  return {
    ...totals,
    acos: percentage(totals.spend, totals.sales),
  };
}

function updateStats(container: HTMLElement, summary: AnalysisSummary): void {
  setText(container, 'ppc-stat-rows', String(summary.rowCount));
  setText(container, 'ppc-stat-spend', formatCurrency(summary.spend));
  setText(container, 'ppc-stat-acos', summary.sales > 0 ? formatPercent(summary.acos) : '-');
  setText(container, 'ppc-stat-actions', String(summary.actionCount));
}

function updateResultCount(container: HTMLElement, rows: AnalyzedRow[], visibleRows: AnalyzedRow[]): void {
  if (rows.length === 0) {
    setText(container, 'ppc-result-count', '等待导入数据。');
    return;
  }
  const extra = visibleRows.length > MAX_RENDER_ROWS ? `，当前展示前 ${MAX_RENDER_ROWS} 行` : '';
  setText(container, 'ppc-result-count', `共 ${rows.length} 行，当前筛选 ${visibleRows.length} 行${extra}。`);
}

function renderRows(container: HTMLElement, rows: AnalyzedRow[]): void {
  const body = getElement(container, 'ppc-results-body');
  const empty = getElement(container, 'ppc-empty-state');
  const wrapper = getElement(container, 'ppc-table-wrapper');
  if (!body || !empty || !wrapper) return;

  body.replaceChildren();
  if (rows.length === 0) {
    empty.classList.remove('hidden');
    wrapper.classList.add('hidden');
    return;
  }

  rows.slice(0, MAX_RENDER_ROWS).forEach((row) => body.appendChild(createRow(row)));
  empty.classList.add('hidden');
  wrapper.classList.remove('hidden');
}

function createRow(row: AnalyzedRow): HTMLTableRowElement {
  const tr = document.createElement('tr');
  tr.className = 'ppc-results-row';
  tr.appendChild(createSearchTermCell(row));
  tr.appendChild(createActionCell(row));
  tr.appendChild(createCell(formatCurrency(row.spend), 'right'));
  tr.appendChild(createCell(formatCurrency(row.sales), 'right'));
  tr.appendChild(createCell(String(row.orders), 'right'));
  tr.appendChild(createCell(row.sales > 0 ? formatPercent(row.acos) : '-', 'right'));
  tr.appendChild(createCell(formatPercent(row.ctr), 'right'));
  tr.appendChild(createCell(formatPercent(row.cvr), 'right'));
  tr.appendChild(createCell(row.reason, 'left'));
  return tr;
}

function createSearchTermCell(row: AnalyzedRow): HTMLTableCellElement {
  const cell = createCell('', 'left');
  const term = document.createElement('div');
  term.className = 'font-bold text-slate-900';
  term.textContent = row.searchTerm;
  const meta = document.createElement('div');
  meta.className = 'text-xs text-slate-500 mt-1';
  meta.textContent = [row.campaign, row.adGroup, row.keyword].filter(Boolean).join(' / ') || '-';
  cell.append(term, meta);
  return cell;
}

function createActionCell(row: AnalyzedRow): HTMLTableCellElement {
  const cell = createCell('', 'left');
  const badge = document.createElement('span');
  badge.className = `ppc-action-badge ppc-action-${row.action}`;
  badge.textContent = row.actionLabel;
  cell.appendChild(badge);
  return cell;
}

function createCell(text: string, align: 'left' | 'right'): HTMLTableCellElement {
  const cell = document.createElement('td');
  cell.className = align === 'right' ? 'text-right tabular-nums' : 'text-left';
  cell.textContent = text;
  return cell;
}

function setFilter(container: HTMLElement, button: HTMLElement): void {
  const filter = button.dataset.filter;
  if (!isFilterType(filter)) return;

  activeFilter = filter;
  setActiveFilterButton(container, filter);
  updateResults(container, analyzedRows);
}

function setActiveFilterButton(container: HTMLElement, filter: FilterType): void {
  container.querySelectorAll<HTMLElement>('.ppc-filter-btn').forEach((item) => {
    item.classList.toggle('active', item.dataset.filter === filter);
  });
}

function isFilterType(value: string | undefined): value is FilterType {
  if (!value) return false;
  return value === 'all' || Object.prototype.hasOwnProperty.call(ACTION_LABELS, value);
}

function exportRows(filter: FilterType): void {
  const rows = filter === 'all' ? analyzedRows : analyzedRows.filter((row) => row.action === filter);
  if (rows.length === 0) {
    showToast('没有可导出的数据', { type: 'warning' });
    return;
  }

  const csv = buildActionCsv(rows);
  downloadText(`ppc-search-actions-${filter}-${today()}.csv`, csv);
  showToast('导出完成', { type: 'success', description: `${rows.length} 行动作已导出` });
}

export function buildActionCsv(rows: AnalyzedRow[]): string {
  const headers = ['Action', 'Search Term', 'Campaign', 'Ad Group', 'Keyword', 'Spend', 'Sales', 'Orders', 'ACOS', 'Reason'];
  const lines = rows.map((row) => [
    row.actionLabel,
    row.searchTerm,
    row.campaign,
    row.adGroup,
    row.keyword,
    row.spend.toFixed(2),
    row.sales.toFixed(2),
    String(row.orders),
    row.sales > 0 ? row.acos.toFixed(2) : '',
    row.reason,
  ]);
  return [headers, ...lines].map((line) => line.map(escapeCsv).join(',')).join('\n');
}

function escapeCsv(value: string): string {
  if (!/[",\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadText(filename: string, content: string): void {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copySummary(): Promise<void> {
  if (analyzedRows.length === 0) {
    showToast('没有可复制的摘要', { type: 'warning' });
    return;
  }

  const summary = buildSummaryText(analyzedRows);
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('Clipboard API unavailable');
    }
    await navigator.clipboard.writeText(summary);
    showToast('周报摘要已复制', { type: 'success' });
  } catch {
    showToast('复制失败', { type: 'error', description: '当前浏览器没有开放剪贴板写入权限' });
  }
}

export function buildSummaryText(rows: AnalyzedRow[]): string {
  const summary = summarize(rows);
  const count = (type: ActionType) => rows.filter((row) => row.action === type).length;
  return [
    `PPC 搜索词周报摘要 ${today()}`,
    `搜索词行数：${summary.rowCount}`,
    `花费：${formatCurrency(summary.spend)}，销售额：${formatCurrency(summary.sales)}，ACOS：${summary.sales > 0 ? formatPercent(summary.acos) : '-'}`,
    `否精准：${count('negative_exact')}，加精准：${count('harvest_exact')}，加预算：${count('scale_budget')}，降竞价：${count('bid_down')}，进词池：${count('listing_term')}`,
    `本周优先处理：${rows.filter((row) => row.action !== 'observe').slice(0, 5).map((row) => `${row.searchTerm}(${row.actionLabel})`).join('、') || '无'}`,
  ].join('\n');
}

function rerunWithThresholds(container: HTMLElement): void {
  const thresholds = readThresholds(container);
  saveThresholds(thresholds);
  if (sourceText) analyzeText(container, sourceText);
}

function readThresholds(container: HTMLElement): Thresholds {
  return {
    targetAcos: readNumber(container, 'ppc-target-acos', 35),
    highAcos: readNumber(container, 'ppc-high-acos', 55),
    minClicksNoOrder: readNumber(container, 'ppc-min-clicks', 12),
    minSpendNoOrder: readNumber(container, 'ppc-min-spend', 15),
    minOrdersHarvest: readNumber(container, 'ppc-min-orders', 2),
    minCtr: readNumber(container, 'ppc-min-ctr', 0.35),
  };
}

function restoreThresholds(container: HTMLElement): void {
  const saved = StorageService.get<Partial<Thresholds>>(STORAGE_KEY, {}) || {};
  setInputValue(container, 'ppc-target-acos', saved.targetAcos, 35);
  setInputValue(container, 'ppc-high-acos', saved.highAcos, 55);
  setInputValue(container, 'ppc-min-clicks', saved.minClicksNoOrder, 12);
  setInputValue(container, 'ppc-min-spend', saved.minSpendNoOrder, 15);
  setInputValue(container, 'ppc-min-orders', saved.minOrdersHarvest, 2);
  setInputValue(container, 'ppc-min-ctr', saved.minCtr, 0.35);
}

function saveThresholds(thresholds: Thresholds): void {
  StorageService.set(STORAGE_KEY, thresholds);
}

function readNumber(container: HTMLElement, id: string, fallback: number): number {
  const value = Number.parseFloat(getInput(container, id)?.value || '');
  return Number.isFinite(value) ? value : fallback;
}

function setInputValue(container: HTMLElement, id: string, value: number | undefined, fallback: number): void {
  const input = getInput(container, id);
  if (input) input.value = String(value ?? fallback);
}

function renderMappingStatus(container: HTMLElement, mapping: ColumnMapping, totalRows: number, validRows: number): void {
  const fields = Object.values(mapping.found).filter(Boolean);
  setText(container, 'ppc-mapping-status', `已识别 ${fields.length} 个字段，原始 ${totalRows} 行，有效 ${validRows} 行。`);
}

function labelColumn(key: ColumnKey): string {
  const labels: Record<ColumnKey, string> = {
    campaign: '广告活动',
    adGroup: '广告组',
    searchTerm: '搜索词',
    keyword: '关键词',
    matchType: '匹配类型',
    impressions: '曝光',
    clicks: '点击',
    spend: '花费',
    sales: '销售额',
    orders: '订单',
  };
  return labels[key];
}

function getThresholdInputs(container: HTMLElement): HTMLInputElement[] {
  const ids = ['ppc-target-acos', 'ppc-high-acos', 'ppc-min-clicks', 'ppc-min-spend', 'ppc-min-orders', 'ppc-min-ctr'];
  return ids.map((id) => getInput(container, id)).filter((input): input is HTMLInputElement => input !== null);
}

function getElement(container: HTMLElement, id: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`#${id}`);
}

function getInput(container: HTMLElement, id: string): HTMLInputElement | null {
  return container.querySelector<HTMLInputElement>(`#${id}`);
}

function getTextarea(container: HTMLElement, id: string): HTMLTextAreaElement | null {
  return container.querySelector<HTMLTextAreaElement>(`#${id}`);
}

function setText(container: HTMLElement, id: string, text: string): void {
  const element = getElement(container, id);
  if (element) element.textContent = text;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function resetAnalyzerState(): void {
  sourceText = '';
  analyzedRows = [];
  activeFilter = 'all';
}
