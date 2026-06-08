import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { showToast } from '@/common/ui/notifications';
import { safeMount } from '@/common/utils/safeMount';
import { loadTemplate } from '@/common/utils/viewLoader';
import { StorageService } from '@/services/storageService';
import {
  analyzePpcSearchTermsWithAgent,
  type PpcAnalysisContext,
  type PpcAgentAnalysisResult,
  type PpcLlmDecision,
} from './services/llmAnalysisService';
import type { ActionType, AnalyzedRow, ReportSelection, ReportType, Thresholds } from './types';

import './style.css';

export type { ActionType, AnalyzedRow, Thresholds } from './types';

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
type CampaignOnlyColumnKey =
  | 'shop'
  | 'status'
  | 'serviceStatus'
  | 'bidStrategy'
  | 'dailyBudget'
  | 'adType'
  | 'targetingType'
  | 'topPlacement'
  | 'productPlacement'
  | 'restPlacement'
  | 'ctr'
  | 'cvr'
  | 'cpc'
  | 'costPerOrder'
  | 'acos'
  | 'roas'
  | 'acots'
  | 'asots'
  | 'ownOrders'
  | 'otherOrders'
  | 'ownSales'
  | 'otherSales';
type MappedColumnKey = ColumnKey | CampaignOnlyColumnKey;

export interface ColumnMapping {
  reportType: ReportType;
  found: Partial<Record<MappedColumnKey, string>>;
  missing: MappedColumnKey[];
}

interface ActionDecision {
  type: ActionType;
  label: string;
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
  reportType: ReportType;
  totalRows: number;
  validRows: number;
}

interface AnalysisSettings {
  allowLocalFallback: boolean;
  useContext: boolean;
  context: PpcAnalysisContext;
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
type ParsedReport = ReturnType<typeof parseReport>;

const STORAGE_KEY = 'ppc_search_terms_thresholds_v1';
const ANALYSIS_SETTINGS_STORAGE_KEY = 'ppc_search_terms_analysis_settings_v1';
const REPORT_SELECTION_STORAGE_KEY = 'ppc_report_selection_v1';
const MAX_RENDER_ROWS = 300;
const ACTION_LABELS: Record<ActionType, string> = {
  negative_exact: '否精准',
  harvest_exact: '加精准',
  scale_budget: '加预算',
  bid_down: '降竞价',
  listing_term: '进词池',
  campaign_fix_status: '处理状态',
  campaign_pause: '暂停/降预算',
  campaign_scale: '活动加预算',
  campaign_bid_down: '控价降竞价',
  campaign_structure: '结构复盘',
  observe: '观察',
};
const REPORT_LABELS: Record<ReportType, string> = {
  search_term: '店铺搜索广告 / 商品推广搜索词报告',
  erp_campaign: 'ERP 广告活动报表',
};
const REPORT_FILTERS: Record<ReportType, ActionType[]> = {
  search_term: ['negative_exact', 'harvest_exact', 'scale_budget', 'bid_down', 'listing_term', 'observe'],
  erp_campaign: ['campaign_fix_status', 'campaign_pause', 'campaign_scale', 'campaign_bid_down', 'campaign_structure', 'observe'],
};
const ACTION_ICONS: Record<ActionType, string> = {
  negative_exact: 'fas fa-ban',
  harvest_exact: 'fas fa-bullseye',
  scale_budget: 'fas fa-arrow-trend-up',
  bid_down: 'fas fa-arrow-down-short-wide',
  listing_term: 'fas fa-bookmark',
  campaign_fix_status: 'fas fa-triangle-exclamation',
  campaign_pause: 'fas fa-pause',
  campaign_scale: 'fas fa-arrow-trend-up',
  campaign_bid_down: 'fas fa-gauge-high',
  campaign_structure: 'fas fa-diagram-project',
  observe: 'fas fa-eye',
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

const REQUIRED_FIELDS: MappedColumnKey[] = ['searchTerm', 'clicks', 'spend', 'sales', 'orders'];
const ERP_CAMPAIGN_REQUIRED_FIELDS: MappedColumnKey[] = ['shop', 'campaign', 'clicks', 'spend', 'sales', 'orders'];
const COLUMN_ALIASES: Record<MappedColumnKey, string[]> = {
  shop: ['店铺名称', '店铺', 'store', 'shop', 'account', 'account name'],
  status: ['有效状态', '状态', 'enabled status'],
  serviceStatus: ['服务状态', '投放状态', 'serving status', 'delivery status'],
  campaign: ['campaign name', 'campaign name informational only', 'campaign', 'campaigns', '广告活动', '广告活动名称'],
  adGroup: ['ad group name', 'ad group name informational only', 'ad group', 'adgroup', '广告组', '广告组名称'],
  bidStrategy: ['广告活动竞价策略', '竞价策略', 'bidding strategy'],
  dailyBudget: ['每日预算', '日预算', 'daily budget', 'budget'],
  adType: ['广告类型', 'ad type', 'campaign type'],
  targetingType: ['投放类型', 'targeting type', 'targeting mode'],
  topPlacement: ['搜索结果顶部(首页)广告位', '搜索结果顶部首页广告位', 'top of search placement'],
  productPlacement: ['产品页面广告位', 'product pages placement'],
  restPlacement: ['搜索结果的其余位置', 'rest of search placement'],
  searchTerm: [
    'customer search term',
    'customer search term informational only',
    'search term',
    'search terms',
    '用户搜索词',
    '搜索词',
    '客户搜索词',
    '搜索词条',
  ],
  keyword: ['keyword', 'targeting', 'targeting informational only', 'targeting expression', '投放', '投放词', '关键词', '定向'],
  matchType: ['match type', 'match type informational only', 'match', '匹配类型'],
  impressions: ['impressions', 'impression', '展示量', '曝光量', '广告曝光量', '曝光'],
  ctr: ['广告点击率', '点击率(CTR)', 'click-through rate', 'ctr'],
  clicks: ['clicks', 'clicks informational only', 'click', '点击量', '广告点击量', '点击'],
  cvr: ['广告转化率', '7天的转化率', 'conversion rate', 'cvr'],
  spend: ['spend', 'spend informational only', 'cost', 'costs', 'ad spend', '花费', '广告花费', '支出'],
  costPerOrder: ['每笔订单花费', 'cost per order'],
  cpc: ['平均点击费用', '每次点击成本(CPC)', 'cpc', 'average cpc', 'cost per click'],
  acos: ['acos', 'ACoS', '广告成本销售比(ACOS)'],
  roas: ['roas', 'ROAS', '投入产出比(ROAS)'],
  acots: ['acots', 'ACoTS'],
  asots: ['asots', 'ASoTS'],
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
    '7天总销售额',
    '14天总销售额',
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
    '7天总订单数(#)',
    '7天总订单数',
    '14天总订单数(#)',
    '14天总订单数',
    '广告订单量',
  ],
  ownOrders: ['本广告产品订单量', '7天内广告SKU销售量(#)'],
  otherOrders: ['其他产品广告订单量', '7天内其他SKU销售量(#)'],
  ownSales: ['本广告产品销售额', '7天内广告SKU销售额'],
  otherSales: ['其他产品广告销售额', '7天内其他SKU销售额'],
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
let activeReportType: ReportType = 'search_term';
let activeSearchQuery = '';

const mountInternal = async (container: HTMLElement): Promise<void> => {
  resetAnalyzerState();
  const html = await loadTemplate('src/modules/app_center/views/ppc_search_terms/template.html');
  const renderer = SafeRenderer.getInstance();
  renderer.renderTemplate(container, html);
  restoreThresholds(container);
  restoreReportSelection(container);
  restoreAnalysisSettings(container);
  bindEvents(container);
  renderFilterButtons(container, activeReportType);
  updateResults(container, []);
};

export const mount = safeMount(mountInternal, { moduleName: 'PPC 搜索词分析器' });

export function unmount(): void {
  listeners.forEach(({ element, type, handler }) => element.removeEventListener(type, handler));
  listeners = [];
}

function bindEvents(container: HTMLElement): void {
  addListener(getElement(container, 'ppc-file-input'), 'change', () => handleFileImport(container));
  addListener(getElement(container, 'ppc-btn-parse'), 'click', () => {
    void analyzeTextarea(container);
  });
  addListener(getElement(container, 'ppc-btn-sample'), 'click', () => loadSample(container));
  addListener(getElement(container, 'ppc-btn-clear'), 'click', () => clearAnalyzer(container));
  addListener(getElement(container, 'ppc-analysis-settings-toggle'), 'click', () => toggleAnalysisSettings(container));
  addListener(getElement(container, 'ppc-report-type'), 'change', () => handleReportSelectionChange(container));
  addListener(getElement(container, 'ppc-export-all'), 'click', () => exportRows('all'));
  addListener(getElement(container, 'ppc-export-current'), 'click', () => exportRows(activeFilter, true));
  addListener(getElement(container, 'ppc-export-negative'), 'click', () => exportRows(getWasteExportFilter()));
  addListener(getElement(container, 'ppc-export-harvest'), 'click', () => exportRows(getGrowthExportFilter()));
  addListener(getElement(container, 'ppc-copy-summary'), 'click', () => copySummary());
  addListener(getInput(container, 'ppc-action-search'), 'input', () => handleActionSearch(container));
  addListener(getInput(container, 'ppc-action-search'), 'keydown', (event) => handleActionSearchKeydown(container, event));
  addListener(getElement(container, 'ppc-action-search-clear'), 'click', () => clearActionSearch(container));
  addListener(getElement(container, 'ppc-filter-buttons'), 'click', (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('.ppc-filter-btn') : null;
    if (target) setFilter(container, target);
  });

  getThresholdInputs(container).forEach((input) => {
    addListener(input, 'change', () => handleThresholdChange(container));
  });

  getAnalysisSettingInputs(container).forEach((input) => {
    addListener(input, 'change', () => handleAnalysisSettingsChange(container));
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

  try {
    const text = await readReportFile(file);
    const textarea = getTextarea(container, 'ppc-paste-input');
    if (textarea) textarea.value = text;
    setText(container, 'ppc-file-name', `已选择：${file.name}`);
    await analyzeText(container, text);
  } catch (error) {
    const message = error instanceof Error ? error.message : '文件读取失败';
    showToast('文件读取失败', { type: 'error', description: message });
  }
}

async function readReportFile(file: File): Promise<string> {
  if (isXlsxFile(file)) {
    return xlsxArrayBufferToDelimitedText(await file.arrayBuffer());
  }

  return file.text();
}

function isXlsxFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.xlsx')
    || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

export async function xlsxArrayBufferToDelimitedText(buffer: ArrayBuffer): Promise<string> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('XLSX 文件没有可读取的工作表');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    throw new Error('XLSX 工作表读取失败');
  }

  const text = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t', blankrows: false });
  if (!text.trim()) {
    throw new Error('XLSX 工作表为空');
  }

  return text;
}

async function analyzeTextarea(container: HTMLElement): Promise<void> {
  const text = getTextarea(container, 'ppc-paste-input')?.value || '';
  await analyzeText(container, text);
}

function loadSample(container: HTMLElement): void {
  const textarea = getTextarea(container, 'ppc-paste-input');
  if (textarea) textarea.value = SAMPLE_REPORT;
  setText(container, 'ppc-file-name', '已加载样例数据');
  void analyzeText(container, SAMPLE_REPORT);
}

function clearAnalyzer(container: HTMLElement): void {
  const textarea = getTextarea(container, 'ppc-paste-input');
  if (textarea) textarea.value = '';
  const fileInput = getInput(container, 'ppc-file-input');
  if (fileInput) fileInput.value = '';
  resetAnalyzerState();
  setActionSearchQuery(container, '');
  setActiveFilterButton(container, activeFilter);
  setText(container, 'ppc-file-name', '支持 CSV、TSV、XLSX 或直接粘贴表格内容。');
  setText(container, 'ppc-mapping-status', '');
  updateResults(container, []);
}

async function analyzeText(container: HTMLElement, text: string): Promise<void> {
  const cleanText = text.trim();
  if (!cleanText) {
    getTextarea(container, 'ppc-paste-input')?.focus();
    showToast('没有可分析的数据', { type: 'warning' });
    return;
  }

  let localResult: AnalysisResult | null = null;
  setAnalyzeButtonState(container, true);

  try {
    const thresholds = readThresholds(container);
    const settings = readAnalysisSettings(container);
    const reportSelection = readReportSelection(container);
    localResult = analyzeReport(cleanText, thresholds, reportSelection);

    sourceText = cleanText;
    analyzedRows = localResult.rows;
    activeReportType = localResult.reportType;
    activeFilter = 'all';
    setActionSearchQuery(container, '');
    updateReportControls(container, activeReportType);
    saveThresholds(thresholds);
    saveAnalysisSettings(settings);
    saveReportSelection(reportSelection);
    renderMappingStatus(
      container,
      localResult.mapping,
      localResult.totalRows,
      localResult.validRows,
      localResult.reportType === 'search_term' ? '本地工具已生成初判，PPC Agent 正在复核候选...' : '活动级规则分析完成',
    );
    updateResults(container, analyzedRows);

    if (localResult.reportType === 'erp_campaign') {
      showToast('ERP 广告活动分析完成', { type: 'success', description: `已识别 ${localResult.validRows} 个广告活动` });
      return;
    }

    const agentResult = await analyzePpcSearchTermsWithAgent({
      rows: localResult.rows,
      thresholds,
      context: settings.useContext ? settings.context : undefined,
      onProgress: (progress) => {
        if (progress.decisions?.length && localResult) {
          analyzedRows = applyPartialModelDecisions(localResult.rows, progress.decisions);
          updateResults(container, analyzedRows);
        }

        renderMappingStatus(
          container,
          localResult?.mapping || { reportType: activeReportType, found: {}, missing: [] },
          localResult?.totalRows || 0,
          localResult?.validRows || 0,
          `Agent 语义工具复核中 ${progress.completedBatches}/${progress.totalBatches}`,
        );
      },
    });

    analyzedRows = applyModelDecisions(localResult.rows, agentResult.decisions, new Set(agentResult.modelDecisionIds));
    renderMappingStatus(container, localResult.mapping, localResult.totalRows, localResult.validRows, formatAgentStatus(agentResult));
    updateResults(container, analyzedRows);
    showToast('PPC Agent 分析完成', { type: 'success', description: formatAgentToast(agentResult) });
  } catch (error) {
    const message = error instanceof Error ? error.message : '报表解析失败';
    const settings = readAnalysisSettings(container);

    if (settings.allowLocalFallback && localResult) {
      analyzedRows = localResult.rows;
      renderMappingStatus(container, localResult.mapping, localResult.totalRows, localResult.validRows, '已使用本地规则降级');
      updateResults(container, analyzedRows);
      showToast('模型分析失败，已使用本地规则', { type: 'warning', description: message });
      return;
    }

    if (localResult?.reportType === 'search_term' && analyzedRows.length > 0) {
      renderMappingStatus(container, localResult.mapping, localResult.totalRows, localResult.validRows, 'Agent 复核失败，当前展示本地初判结果');
    } else {
      analyzedRows = [];
      updateResults(container, []);
    }
    showToast('分析失败', { type: 'error', description: message });
  } finally {
    setAnalyzeButtonState(container, false);
  }
}

function applyModelDecisions(rows: AnalyzedRow[], decisions: PpcLlmDecision[], reviewedIds = new Set<string>()): AnalyzedRow[] {
  const byId = new Map(decisions.map((decisionItem) => [decisionItem.id, decisionItem]));
  const missingCount = rows.filter((row) => !byId.has(row.id)).length;

  if (missingCount > 0) {
    throw new Error(`模型返回结果不完整，缺少 ${missingCount} 行动作`);
  }

  return rows
    .map((row) => {
      const modelDecision = byId.get(row.id);
      if (!modelDecision) return row;
      return mergeDecisionIntoRow(row, modelDecision, reviewedIds.has(row.id));
    })
    .sort((a, b) => b.priority - a.priority || b.spend - a.spend);
}

function applyPartialModelDecisions(rows: AnalyzedRow[], decisions: PpcLlmDecision[]): AnalyzedRow[] {
  const byId = new Map(decisions.map((decisionItem) => [decisionItem.id, decisionItem]));

  return rows
    .map((row) => {
      const modelDecision = byId.get(row.id);
      if (!modelDecision) return row;
      return mergeDecisionIntoRow(row, modelDecision, true);
    })
    .sort((a, b) => b.priority - a.priority || b.spend - a.spend);
}

function mergeDecisionIntoRow(row: AnalyzedRow, modelDecision: PpcLlmDecision, isReviewed: boolean): AnalyzedRow {
  const nextRow: AnalyzedRow = {
    ...row,
    action: modelDecision.action,
    actionLabel: ACTION_LABELS[modelDecision.action],
    reason: modelDecision.reason,
    priority: modelDecision.priority,
  };

  if (isReviewed) {
    nextRow.reviewStatus = 'model_reviewed';
  } else {
    delete nextRow.reviewStatus;
  }

  return nextRow;
}

function formatAgentStatus(result: PpcAgentAnalysisResult): string {
  const modelText = result.summary.modelRows > 0
    ? `模型语义复核 ${result.summary.modelRows} 行`
    : '无需模型复核';
  const skippedText = result.summary.skippedModelRows > 0 ? `，已按优先级跳过 ${result.summary.skippedModelRows} 行低影响候选` : '';
  return `PPC Agent 完成：本地工具全量处理 ${result.summary.totalRows} 行，${modelText}${skippedText}`;
}

function formatAgentToast(result: PpcAgentAnalysisResult): string {
  if (result.summary.modelRows === 0) {
    return `本地工具已完成 ${result.summary.totalRows} 行分析`;
  }

  return `本地全量 ${result.summary.totalRows} 行，模型复核 ${result.summary.modelRows} 行`;
}

export function analyzeReport(text: string, thresholds: Thresholds, selection: ReportSelection = 'auto'): AnalysisResult {
  const report = parseReport(text.trim());
  const reportType = resolveReportType(report.headers, selection);

  if (reportType === 'erp_campaign') {
    return analyzeErpCampaignReport(report, thresholds);
  }

  return analyzeSearchTermParsedReport(report, thresholds);
}

export function analyzeSearchTermReport(text: string, thresholds: Thresholds): AnalysisResult {
  return analyzeSearchTermParsedReport(parseReport(text.trim()), thresholds);
}

function analyzeSearchTermParsedReport(report: ParsedReport, thresholds: Thresholds): AnalysisResult {
  const mapping = mapColumns(report.headers, 'search_term');
  const rows = report.records
    .map((record, index) => analyzeRecord(record, mapping, thresholds, index))
    .filter((row): row is AnalyzedRow => row !== null)
    .sort((a, b) => b.priority - a.priority || b.spend - a.spend);

  return {
    rows,
    mapping,
    reportType: 'search_term',
    totalRows: report.records.length,
    validRows: rows.length,
  };
}

function analyzeErpCampaignReport(report: ParsedReport, thresholds: Thresholds): AnalysisResult {
  const mapping = mapColumns(report.headers, 'erp_campaign');
  const rows = report.records
    .map((record, index) => analyzeCampaignRecord(record, mapping, thresholds, index))
    .filter((row): row is AnalyzedRow => row !== null)
    .sort((a, b) => b.priority - a.priority || b.spend - a.spend || b.orders - a.orders);

  return {
    rows,
    mapping,
    reportType: 'erp_campaign',
    totalRows: report.records.length,
    validRows: rows.length,
  };
}

function resolveReportType(headers: string[], selection: ReportSelection): ReportType {
  if (selection !== 'auto') return selection;

  const normalizedHeaders = headers.map(normalizeHeader);
  const hasErpCampaignShape = hasAnyHeader(normalizedHeaders, COLUMN_ALIASES.shop)
    && hasAnyHeader(normalizedHeaders, COLUMN_ALIASES.serviceStatus)
    && hasAnyHeader(normalizedHeaders, COLUMN_ALIASES.acos)
    && hasAnyHeader(normalizedHeaders, COLUMN_ALIASES.dailyBudget);

  if (hasErpCampaignShape) return 'erp_campaign';
  return 'search_term';
}

function hasAnyHeader(normalizedHeaders: string[], aliases: string[]): boolean {
  const normalizedAliases = aliases.map(normalizeHeader);
  return normalizedHeaders.some((header) => normalizedAliases.includes(header));
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

function mapColumns(headers: string[], reportType: ReportType): ColumnMapping {
  const found: Partial<Record<MappedColumnKey, string>> = {};

  Object.entries(COLUMN_ALIASES).forEach(([key, aliases]) => {
    const normalizedAliases = aliases.map(normalizeHeader);
    const match = headers.find((header) => normalizedAliases.includes(normalizeHeader(header)));
    if (match) found[key as MappedColumnKey] = match;
  });

  const requiredFields = reportType === 'erp_campaign' ? ERP_CAMPAIGN_REQUIRED_FIELDS : REQUIRED_FIELDS;
  const missing = requiredFields.filter((key) => !found[key]);
  if (missing.length > 0) {
    throw new Error(`缺少必要列：${missing.map((key) => labelColumn(key)).join('、')}`);
  }

  return { reportType, found, missing };
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
    reportType: 'search_term',
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

function analyzeCampaignRecord(
  record: RawRecord,
  mapping: ColumnMapping,
  thresholds: Thresholds,
  index: number,
): AnalyzedRow | null {
  const campaign = readField(record, mapping, 'campaign');
  if (!campaign) return null;

  const shop = readField(record, mapping, 'shop');
  const status = readField(record, mapping, 'status');
  const serviceStatus = readField(record, mapping, 'serviceStatus');
  const targetingType = readField(record, mapping, 'targetingType');
  const adType = readField(record, mapping, 'adType');
  const bidStrategy = readField(record, mapping, 'bidStrategy');
  const dailyBudget = parseMetric(readField(record, mapping, 'dailyBudget'));
  const impressions = parseMetric(readField(record, mapping, 'impressions'));
  const clicks = parseMetric(readField(record, mapping, 'clicks'));
  const spend = parseMetric(readField(record, mapping, 'spend'));
  const sales = parseMetric(readField(record, mapping, 'sales'));
  const orders = parseMetric(readField(record, mapping, 'orders'));
  const ctr = readOrCalculatePercentage(record, mapping, 'ctr', clicks, impressions);
  const cvr = readOrCalculatePercentage(record, mapping, 'cvr', orders, clicks);
  const cpc = parseMetric(readField(record, mapping, 'cpc')) || ratio(spend, clicks);
  const acos = parseMetric(readField(record, mapping, 'acos')) || percentage(spend, sales);
  const roas = parseMetric(readField(record, mapping, 'roas')) || ratio(sales, spend);
  const ownSales = parseMetric(readField(record, mapping, 'ownSales'));
  const otherSales = parseMetric(readField(record, mapping, 'otherSales'));
  const decision = classifyCampaign({
    status,
    serviceStatus,
    impressions,
    clicks,
    spend,
    sales,
    orders,
    ctr,
    cvr,
    acos,
    roas,
    ownSales,
    otherSales,
    dailyBudget,
  }, thresholds);

  return {
    id: `${index}-${shop}-${campaign}`,
    reportType: 'erp_campaign',
    campaign: shop,
    adGroup: targetingType,
    searchTerm: campaign,
    keyword: [adType, serviceStatus, bidStrategy].filter(Boolean).join(' / '),
    matchType: targetingType,
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
    store: shop,
    serviceStatus,
    targetingType,
    dailyBudget,
    roas,
    ownSales,
    otherSales,
  };
}

interface CampaignMetrics extends RowMetrics {
  status: string;
  serviceStatus: string;
  roas: number;
  ownSales: number;
  otherSales: number;
  dailyBudget: number;
}

function classifyCampaign(metrics: CampaignMetrics, thresholds: Thresholds): ActionDecision {
  if (metrics.serviceStatus && metrics.serviceStatus !== '正在投放') {
    return decision('campaign_fix_status', `服务状态为“${metrics.serviceStatus}”，先处理账号/活动状态`, 95);
  }

  if (metrics.impressions === 0 && metrics.dailyBudget > 0) {
    return decision('campaign_fix_status', '有日预算但 7 天无曝光，检查活动状态、竞价和投放资格', 82);
  }

  if (metrics.orders === 0 && (metrics.clicks >= thresholds.minClicksNoOrder || metrics.spend >= thresholds.minSpendNoOrder)) {
    return decision('campaign_pause', `无订单且点击 ${metrics.clicks} / 花费 ${formatMetric(metrics.spend)} 已超过阈值，建议暂停或降预算并下钻搜索词`, 90);
  }

  if (metrics.orders > 0 && metrics.acos >= thresholds.highAcos) {
    return decision('campaign_bid_down', `有 ${metrics.orders} 单但 ACOS ${formatPercent(metrics.acos)} 偏高，先降竞价或控预算`, 78);
  }

  if (metrics.orders >= thresholds.minOrdersHarvest && metrics.acos > 0 && metrics.acos <= thresholds.targetAcos * 0.65) {
    return decision('campaign_scale', `${metrics.orders} 单且 ACOS ${formatPercent(metrics.acos)} 明显优于目标，可提高预算或复制放量`, 82);
  }

  if (metrics.ownSales > 0 && metrics.otherSales > metrics.ownSales * 1.5) {
    return decision('campaign_structure', '其他产品销售额明显高于本广告产品，建议复盘广告结构和承接 ASIN', 66);
  }

  if (metrics.impressions >= 1000 && metrics.ctr < thresholds.minCtr) {
    return decision('campaign_structure', `曝光 ${metrics.impressions} 但 CTR ${formatPercent(metrics.ctr)} 偏低，检查主图、标题和投放相关性`, 55);
  }

  if (metrics.orders >= thresholds.minOrdersHarvest && metrics.acos <= thresholds.targetAcos) {
    return decision('campaign_scale', `${metrics.orders} 单且 ACOS ${formatPercent(metrics.acos)} 达标，可小幅加预算观察`, 62);
  }

  return decision('observe', '样本或效率未触发明确动作，继续观察', 10);
}

function readOrCalculatePercentage(
  record: RawRecord,
  mapping: ColumnMapping,
  key: MappedColumnKey,
  numerator: number,
  denominator: number,
): number {
  const parsed = parseMetric(readField(record, mapping, key));
  return parsed > 0 ? parsed : percentage(numerator, denominator);
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

function readField(record: RawRecord, mapping: ColumnMapping, key: MappedColumnKey): string {
  const column = mapping.found[key];
  return column ? record[column] || '' : '';
}

function parseMetric(value: string): number {
  const cleaned = value.trim().replace(/["'%€$£¥\s]/g, '');
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
  const searchedRows = searchRows(rows);
  const visibleRows = filterRows(searchedRows);
  const summary = summarize(rows);
  updateStats(container, summary);
  updateFilterCounts(container, searchedRows);
  updateExportAvailability(container, rows, visibleRows);
  updateResultCount(container, rows, searchedRows, visibleRows);
  updateSearchControls(container);
  renderRows(container, visibleRows, rows.length > 0);
}

function filterRows(rows: AnalyzedRow[], filter: FilterType = activeFilter): AnalyzedRow[] {
  if (filter === 'all') return rows;
  return rows.filter((row) => row.action === filter);
}

function searchRows(rows: AnalyzedRow[]): AnalyzedRow[] {
  const query = normalizeSearchText(activeSearchQuery);
  if (!query) return rows;
  return rows.filter((row) => buildSearchText(row).includes(query));
}

function buildSearchText(row: AnalyzedRow): string {
  return normalizeSearchText([
    row.searchTerm,
    row.campaign,
    row.adGroup,
    row.keyword,
    row.matchType,
    row.actionLabel,
    row.reason,
    row.store,
    row.serviceStatus,
    row.targetingType,
  ].filter(Boolean).join(' '));
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
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

function updateResultCount(
  container: HTMLElement,
  rows: AnalyzedRow[],
  searchedRows: AnalyzedRow[],
  visibleRows: AnalyzedRow[],
): void {
  if (rows.length === 0) {
    setText(container, 'ppc-result-count', '等待导入数据。');
    return;
  }
  const extra = visibleRows.length > MAX_RENDER_ROWS ? `，当前展示前 ${MAX_RENDER_ROWS} 行` : '';
  const searchText = activeSearchQuery ? `，匹配 ${searchedRows.length} 行` : '';
  setText(container, 'ppc-result-count', `共 ${rows.length} 行${searchText}，当前筛选 ${visibleRows.length} 行${extra}。`);
}

function updateFilterCounts(container: HTMLElement, rows: AnalyzedRow[]): void {
  const counts = new Map<FilterType, number>([['all', rows.length]]);
  (Object.keys(ACTION_LABELS) as ActionType[]).forEach((action) => counts.set(action, 0));

  rows.forEach((row) => {
    counts.set(row.action, (counts.get(row.action) || 0) + 1);
  });

  container.querySelectorAll<HTMLElement>('.ppc-filter-btn').forEach((button) => {
    const filter = button.dataset.filter;
    if (!isFilterType(filter)) return;

    const count = button.querySelector<HTMLElement>('.ppc-filter-count');
    if (count) count.textContent = String(counts.get(filter) || 0);
  });
}

function updateExportAvailability(container: HTMLElement, rows: AnalyzedRow[], visibleRows: AnalyzedRow[]): void {
  const hasRows = rows.length > 0;
  const wasteFilter = getWasteExportFilter();
  const growthFilter = getGrowthExportFilter();
  const hasWasteRows = rows.some((row) => row.action === wasteFilter);
  const hasGrowthRows = rows.some((row) => row.action === growthFilter);

  setButtonDisabled(container, 'ppc-export-all', !hasRows);
  setButtonDisabled(container, 'ppc-export-current', visibleRows.length === 0);
  setButtonDisabled(container, 'ppc-export-negative', !hasWasteRows);
  setButtonDisabled(container, 'ppc-export-harvest', !hasGrowthRows);
  setButtonDisabled(container, 'ppc-copy-summary', !hasRows);
}

function renderRows(container: HTMLElement, rows: AnalyzedRow[], hasAnalyzedRows: boolean): void {
  const body = getElement(container, 'ppc-results-body');
  const empty = getElement(container, 'ppc-empty-state');
  const wrapper = getElement(container, 'ppc-table-wrapper');
  if (!body || !empty || !wrapper) return;

  body.replaceChildren();
  if (rows.length === 0) {
    updateEmptyState(container, hasAnalyzedRows);
    empty.classList.remove('hidden');
    wrapper.classList.add('hidden');
    return;
  }

  rows.slice(0, MAX_RENDER_ROWS).forEach((row) => body.appendChild(createRow(row)));
  empty.classList.add('hidden');
  wrapper.classList.remove('hidden');
}

function updateEmptyState(container: HTMLElement, hasAnalyzedRows: boolean): void {
  if (!hasAnalyzedRows) {
    setText(container, 'ppc-empty-title', '还没有分析结果');
    setText(container, 'ppc-empty-description', '导入报表或加载样例数据后，会在这里生成可执行动作。');
    return;
  }

  setText(container, 'ppc-empty-title', '没有匹配的动作');
  setText(container, 'ppc-empty-description', activeSearchQuery ? '调整搜索词或切换动作筛选。' : '切换动作筛选后再查看。');
}

function createRow(row: AnalyzedRow): HTMLTableRowElement {
  const tr = document.createElement('tr');
  tr.className = row.reviewStatus === 'model_reviewed' ? 'ppc-results-row ppc-results-row-reviewed' : 'ppc-results-row';
  tr.appendChild(createSearchTermCell(row));
  tr.appendChild(createActionCell(row));
  tr.appendChild(createCell(formatCurrency(row.spend), 'right'));
  tr.appendChild(createCell(formatCurrency(row.sales), 'right'));
  tr.appendChild(createCell(String(row.orders), 'right'));
  tr.appendChild(createCell(row.sales > 0 ? formatPercent(row.acos) : '-', 'right'));
  tr.appendChild(createCell(formatPercent(row.ctr), 'right'));
  tr.appendChild(createCell(formatPercent(row.cvr), 'right'));
  tr.appendChild(createReasonCell(row));
  return tr;
}

function createSearchTermCell(row: AnalyzedRow): HTMLTableCellElement {
  const cell = createCell('', 'left');
  const term = document.createElement('div');
  term.className = 'font-bold text-slate-900';
  term.textContent = row.searchTerm;
  const meta = document.createElement('div');
  meta.className = 'text-xs text-slate-500 mt-1';
  meta.textContent = getObjectMeta(row);
  cell.append(term, meta);
  return cell;
}

function getObjectMeta(row: AnalyzedRow): string {
  if (row.reportType === 'erp_campaign') {
    return [row.store, row.targetingType, row.serviceStatus].filter(Boolean).join(' / ') || '-';
  }

  return [row.campaign, row.adGroup, row.keyword].filter(Boolean).join(' / ') || '-';
}

function createActionCell(row: AnalyzedRow): HTMLTableCellElement {
  const cell = createCell('', 'left');
  const badge = document.createElement('span');
  badge.className = `ppc-action-badge ppc-action-${row.action}`;
  badge.textContent = row.actionLabel;
  cell.appendChild(badge);

  if (row.reviewStatus === 'model_reviewed') {
    const reviewBadge = document.createElement('span');
    reviewBadge.className = 'ppc-review-chip';
    reviewBadge.textContent = 'Agent 复核';
    cell.appendChild(reviewBadge);
  }

  return cell;
}

function createReasonCell(row: AnalyzedRow): HTMLTableCellElement {
  const cell = createCell('', 'left');

  if (row.reviewStatus !== 'model_reviewed') {
    cell.textContent = row.reason;
    return cell;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'ppc-review-reason';
  const label = document.createElement('div');
  label.className = 'ppc-review-reason-label';
  label.textContent = '语义复核结论';
  const text = document.createElement('div');
  text.className = 'ppc-review-reason-text';
  text.textContent = row.reason;
  wrapper.append(label, text);
  cell.appendChild(wrapper);
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

function handleActionSearch(container: HTMLElement): void {
  activeSearchQuery = getInput(container, 'ppc-action-search')?.value.trim() || '';
  updateResults(container, analyzedRows);
}

function handleActionSearchKeydown(container: HTMLElement, event: Event): void {
  if (!(event instanceof KeyboardEvent) || event.key !== 'Escape') return;
  clearActionSearch(container);
}

function clearActionSearch(container: HTMLElement): void {
  setActionSearchQuery(container, '');
  updateResults(container, analyzedRows);
  getInput(container, 'ppc-action-search')?.focus();
}

function setActionSearchQuery(container: HTMLElement, query: string): void {
  activeSearchQuery = query.trim();
  const input = getInput(container, 'ppc-action-search');
  if (input && input.value !== activeSearchQuery) input.value = activeSearchQuery;
  updateSearchControls(container);
}

function updateSearchControls(container: HTMLElement): void {
  const hasQuery = activeSearchQuery.length > 0;
  setButtonDisabled(container, 'ppc-action-search-clear', !hasQuery);
  getElement(container, 'ppc-action-search')?.classList.toggle('has-value', hasQuery);
}

function setActiveFilterButton(container: HTMLElement, filter: FilterType): void {
  container.querySelectorAll<HTMLElement>('.ppc-filter-btn').forEach((item) => {
    const isActive = item.dataset.filter === filter;
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-pressed', String(isActive));
  });
}

function isFilterType(value: string | undefined): value is FilterType {
  if (!value) return false;
  return value === 'all' || Object.prototype.hasOwnProperty.call(ACTION_LABELS, value);
}

function exportRows(filter: FilterType, includeSearch = false): void {
  const baseRows = includeSearch ? searchRows(analyzedRows) : analyzedRows;
  const rows = filterRows(baseRows, filter);
  if (rows.length === 0) {
    showToast('没有可导出的数据', { type: 'warning' });
    return;
  }

  const csv = buildActionCsv(rows);
  downloadText(`ppc-${activeReportType}-actions-${filter}-${today()}.csv`, csv);
  showToast('导出完成', { type: 'success', description: `${rows.length} 行动作已导出` });
}

export function buildActionCsv(rows: AnalyzedRow[]): string {
  if (rows[0]?.reportType === 'erp_campaign') {
    return buildCampaignActionCsv(rows);
  }

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

function buildCampaignActionCsv(rows: AnalyzedRow[]): string {
  const headers = ['Action', 'Campaign', 'Store', 'Targeting Type', 'Service Status', 'Daily Budget', 'Spend', 'Sales', 'Orders', 'ACOS', 'ROAS', 'Reason'];
  const lines = rows.map((row) => [
    row.actionLabel,
    row.searchTerm,
    row.store || '',
    row.targetingType || '',
    row.serviceStatus || '',
    formatOptionalNumber(row.dailyBudget),
    row.spend.toFixed(2),
    row.sales.toFixed(2),
    String(row.orders),
    row.sales > 0 ? row.acos.toFixed(2) : '',
    typeof row.roas === 'number' && row.roas > 0 ? row.roas.toFixed(2) : '',
    row.reason,
  ]);
  return [headers, ...lines].map((line) => line.map(escapeCsv).join(',')).join('\n');
}

function formatOptionalNumber(value: number | undefined): string {
  return typeof value === 'number' && value > 0 ? value.toFixed(2) : '';
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
  if (rows[0]?.reportType === 'erp_campaign') {
    return buildCampaignSummaryText(rows);
  }

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

function buildCampaignSummaryText(rows: AnalyzedRow[]): string {
  const summary = summarize(rows);
  const count = (type: ActionType) => rows.filter((row) => row.action === type).length;
  return [
    `PPC 广告活动周报摘要 ${today()}`,
    `广告活动数：${summary.rowCount}`,
    `花费：${formatCurrency(summary.spend)}，销售额：${formatCurrency(summary.sales)}，ACOS：${summary.sales > 0 ? formatPercent(summary.acos) : '-'}`,
    `处理状态：${count('campaign_fix_status')}，暂停/降预算：${count('campaign_pause')}，活动加预算：${count('campaign_scale')}，控价降竞价：${count('campaign_bid_down')}，结构复盘：${count('campaign_structure')}`,
    `本周优先处理：${rows.filter((row) => row.action !== 'observe').slice(0, 5).map((row) => `${row.searchTerm}(${row.actionLabel})`).join('、') || '无'}`,
  ].join('\n');
}

function handleThresholdChange(container: HTMLElement): void {
  const thresholds = readThresholds(container);
  saveThresholds(thresholds);
  if (sourceText) {
    setText(container, 'ppc-mapping-status', '阈值已更新，请点击“分析当前数据”重新分析。');
  }
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

function readAnalysisSettings(container: HTMLElement): AnalysisSettings {
  const useContext = getInput(container, 'ppc-use-context')?.checked || false;

  return {
    allowLocalFallback: getInput(container, 'ppc-allow-local-fallback')?.checked || false,
    useContext,
    context: {
      asin: getInput(container, 'ppc-context-asin')?.value || '',
      category: getInput(container, 'ppc-context-category')?.value || '',
      listing: getTextarea(container, 'ppc-context-listing')?.value || '',
    },
  };
}

function restoreAnalysisSettings(container: HTMLElement): void {
  const saved = StorageService.get<Partial<AnalysisSettings>>(ANALYSIS_SETTINGS_STORAGE_KEY, {}) || {};
  setChecked(container, 'ppc-allow-local-fallback', saved.allowLocalFallback || false);
  setChecked(container, 'ppc-use-context', saved.useContext || false);
  updateContextFieldsVisibility(container);
}

function saveAnalysisSettings(settings: AnalysisSettings): void {
  StorageService.set(ANALYSIS_SETTINGS_STORAGE_KEY, {
    allowLocalFallback: settings.allowLocalFallback,
    useContext: settings.useContext,
  });
}

function restoreReportSelection(container: HTMLElement): void {
  const saved = StorageService.get<ReportSelection>(REPORT_SELECTION_STORAGE_KEY, 'auto');
  const selection = isReportSelection(saved) ? saved : 'auto';
  const select = getSelect(container, 'ppc-report-type');
  if (select) select.value = selection;
  activeReportType = selection === 'auto' ? 'search_term' : selection;
}

function readReportSelection(container: HTMLElement): ReportSelection {
  const value = getSelect(container, 'ppc-report-type')?.value;
  return isReportSelection(value) ? value : 'auto';
}

function saveReportSelection(selection: ReportSelection): void {
  StorageService.set(REPORT_SELECTION_STORAGE_KEY, selection);
}

function handleReportSelectionChange(container: HTMLElement): void {
  const selection = readReportSelection(container);
  saveReportSelection(selection);
  activeReportType = selection === 'auto' ? inferCurrentReportType() : selection;
  activeFilter = 'all';
  analyzedRows = [];
  setActionSearchQuery(container, '');
  updateReportControls(container, activeReportType);
  updateResults(container, []);

  if (sourceText) {
    setText(container, 'ppc-mapping-status', '报表类型已更新，请点击“分析当前数据”重新分析。');
  }
}

function inferCurrentReportType(): ReportType {
  if (!sourceText) return 'search_term';

  try {
    return resolveReportType(parseReport(sourceText).headers, 'auto');
  } catch {
    return activeReportType;
  }
}

function updateReportControls(container: HTMLElement, reportType: ReportType): void {
  renderFilterButtons(container, reportType);
  setText(container, 'ppc-object-header', reportType === 'erp_campaign' ? '广告活动' : '搜索词');
  setText(container, 'ppc-stat-rows-label', reportType === 'erp_campaign' ? '广告活动' : '搜索词行');

  const textarea = getTextarea(container, 'ppc-paste-input');
  if (textarea) {
    textarea.placeholder = reportType === 'erp_campaign'
      ? '也可以直接粘贴 ERP 广告活动报表内容，首行需要包含列名。'
      : '也可以直接粘贴 Search Term 报表内容，首行需要包含列名。';
  }

  if (reportType === 'erp_campaign') {
    setButtonContent(container, 'ppc-export-negative', 'fas fa-pause', '导出停投/降预算');
    setButtonContent(container, 'ppc-export-harvest', 'fas fa-arrow-trend-up', '导出加预算');
    return;
  }

  setButtonContent(container, 'ppc-export-negative', 'fas fa-ban', '导出否词');
  setButtonContent(container, 'ppc-export-harvest', 'fas fa-bullseye', '导出加词');
}

function renderFilterButtons(container: HTMLElement, reportType: ReportType): void {
  const wrapper = getElement(container, 'ppc-filter-buttons');
  if (!wrapper) return;

  const filters: FilterType[] = ['all', ...REPORT_FILTERS[reportType]];
  if (!filters.includes(activeFilter)) activeFilter = 'all';

  wrapper.replaceChildren(...filters.map((filter) => createFilterButton(filter, filter === activeFilter)));
}

function createFilterButton(filter: FilterType, isActive: boolean): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = `ppc-filter-btn${isActive ? ' active' : ''}`;
  button.type = 'button';
  button.dataset.filter = filter;
  button.setAttribute('aria-pressed', String(isActive));

  const icon = createIcon(filter === 'all' ? 'fas fa-layer-group' : ACTION_ICONS[filter]);
  const label = document.createElement('span');
  label.textContent = filter === 'all' ? '全部' : ACTION_LABELS[filter];
  const count = document.createElement('span');
  count.className = 'ppc-filter-count';
  count.textContent = '0';
  button.append(icon, label, count);
  return button;
}

function getWasteExportFilter(): FilterType {
  return activeReportType === 'erp_campaign' ? 'campaign_pause' : 'negative_exact';
}

function getGrowthExportFilter(): FilterType {
  return activeReportType === 'erp_campaign' ? 'campaign_scale' : 'harvest_exact';
}

function isReportSelection(value: unknown): value is ReportSelection {
  return value === 'auto' || value === 'search_term' || value === 'erp_campaign';
}

function handleAnalysisSettingsChange(container: HTMLElement): void {
  updateContextFieldsVisibility(container);
  saveAnalysisSettings(readAnalysisSettings(container));
}

function toggleAnalysisSettings(container: HTMLElement): void {
  const toggle = getButton(container, 'ppc-analysis-settings-toggle');
  const body = getElement(container, 'ppc-analysis-settings-body');
  if (!toggle || !body) return;

  const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!isExpanded));
  body.classList.toggle('hidden', isExpanded);
}

function updateContextFieldsVisibility(container: HTMLElement): void {
  const useContext = getInput(container, 'ppc-use-context')?.checked || false;
  const fields = getElement(container, 'ppc-context-fields');
  if (!fields) return;

  fields.classList.toggle('hidden', !useContext);
  fields.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach((field) => {
    field.disabled = !useContext;
  });
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

function setChecked(container: HTMLElement, id: string, value: boolean): void {
  const input = getInput(container, id);
  if (input) input.checked = value;
}

function renderMappingStatus(container: HTMLElement, mapping: ColumnMapping, totalRows: number, validRows: number, status = ''): void {
  const fields = Object.values(mapping.found).filter(Boolean);
  const statusText = status ? ` ${status}` : '';
  setText(container, 'ppc-mapping-status', `已识别为${REPORT_LABELS[mapping.reportType]}，匹配 ${fields.length} 个字段，原始 ${totalRows} 行，有效 ${validRows} 行。${statusText}`);
}

function labelColumn(key: MappedColumnKey): string {
  const labels: Record<MappedColumnKey, string> = {
    shop: '店铺名称',
    status: '有效状态',
    serviceStatus: '服务状态',
    campaign: '广告活动',
    adGroup: '广告组',
    bidStrategy: '广告活动竞价策略',
    dailyBudget: '每日预算',
    adType: '广告类型',
    targetingType: '投放类型',
    topPlacement: '搜索结果顶部广告位',
    productPlacement: '产品页面广告位',
    restPlacement: '搜索结果其余位置',
    searchTerm: '搜索词',
    keyword: '关键词',
    matchType: '匹配类型',
    impressions: '曝光',
    ctr: 'CTR',
    clicks: '点击',
    cvr: 'CVR',
    spend: '花费',
    cpc: 'CPC',
    costPerOrder: '每笔订单花费',
    acos: 'ACOS',
    roas: 'ROAS',
    acots: 'ACoTS',
    asots: 'ASoTS',
    sales: '销售额',
    orders: '订单',
    ownOrders: '本广告产品订单',
    otherOrders: '其他产品广告订单',
    ownSales: '本广告产品销售额',
    otherSales: '其他产品广告销售额',
  };
  return labels[key];
}

function getThresholdInputs(container: HTMLElement): HTMLInputElement[] {
  const ids = ['ppc-target-acos', 'ppc-high-acos', 'ppc-min-clicks', 'ppc-min-spend', 'ppc-min-orders', 'ppc-min-ctr'];
  return ids.map((id) => getInput(container, id)).filter((input): input is HTMLInputElement => input !== null);
}

function getAnalysisSettingInputs(container: HTMLElement): HTMLInputElement[] {
  const ids = ['ppc-allow-local-fallback', 'ppc-use-context'];
  return ids.map((id) => getInput(container, id)).filter((input): input is HTMLInputElement => input !== null);
}

function setAnalyzeButtonState(container: HTMLElement, isAnalyzing: boolean): void {
  const button = getButton(container, 'ppc-btn-parse');
  if (!button) return;

  button.disabled = isAnalyzing;
  button.replaceChildren(createIcon(isAnalyzing ? 'fas fa-circle-notch fa-spin' : 'fas fa-chart-line'), document.createTextNode(isAnalyzing ? '分析中' : '分析当前数据'));
}

function setButtonDisabled(container: HTMLElement, id: string, disabled: boolean): void {
  const button = getButton(container, id);
  if (button) button.disabled = disabled;
}

function setButtonContent(container: HTMLElement, id: string, iconClass: string, label: string): void {
  const button = getButton(container, id);
  if (!button) return;
  button.replaceChildren(createIcon(iconClass), document.createTextNode(label));
}

function createIcon(className: string): HTMLElement {
  const icon = document.createElement('i');
  icon.className = className;
  return icon;
}

function getElement(container: HTMLElement, id: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`#${id}`);
}

function getInput(container: HTMLElement, id: string): HTMLInputElement | null {
  return container.querySelector<HTMLInputElement>(`#${id}`);
}

function getButton(container: HTMLElement, id: string): HTMLButtonElement | null {
  return container.querySelector<HTMLButtonElement>(`#${id}`);
}

function getSelect(container: HTMLElement, id: string): HTMLSelectElement | null {
  return container.querySelector<HTMLSelectElement>(`#${id}`);
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

function formatMetric(value: number): string {
  return formatCurrency(value);
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
  activeSearchQuery = '';
}
