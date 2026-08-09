import eventBus from '@/common/EventBus';
import { StorageService } from '@/services/storageService';
import type {
  GeneratedPromptRecord,
  HistoryItem,
  KeywordHunterSnapshot,
} from '@/types/modules-business';
import type { AppCenterWorkspaceContext } from './workspaceContext';
import { createWorkItemIdFromHistoryItem } from './workspaceContext';
import type { AppCenterListingCopy } from './listingCopyService';
import { APP_CENTER_COMPLIANCE_CHECKLIST } from './workflowDefinitions';
import {
  createComplianceReviewStates,
  getComplianceReviewView,
  type ComplianceReviewStates,
} from './complianceReviewState';

export const APP_CENTER_WORK_ITEMS_STORAGE_KEY = 'app_center_work_items_v1';
export const APP_CENTER_ARTIFACTS_STORAGE_KEY = 'app_center_artifact_envelopes_v1';
export const APP_CENTER_ARTIFACTS_CHANGED = 'app-center:artifacts-changed';

export type AppCenterWorkItemType =
  'competitor_listing' | 'keyword_review' | 'ppc_review' | 'npi_reference';
export type AppCenterWorkItemStatus = 'draft' | 'in_progress' | 'review_required' | 'done';
export type AppCenterArtifactType =
  | 'scrape_history'
  | 'analysis_report'
  | 'listing_prompt'
  | 'listing_copy'
  | 'keyword_snapshot'
  | 'listing_review'
  | 'ppc_action_list'
  | 'compliance_check'
  | 'analysis_running';

/** Competitor listing workflow artifact types used for progress (7 steps). */
export const COMPETITOR_LISTING_PROGRESS_TYPES: readonly AppCenterArtifactType[] = [
  'scrape_history',
  'analysis_report',
  'listing_prompt',
  'listing_copy',
  'keyword_snapshot',
  'listing_review',
  'compliance_check',
] as const;

export const KEYWORD_REVIEW_PROGRESS_TYPES: readonly AppCenterArtifactType[] = [
  'keyword_snapshot',
  'listing_review',
  'compliance_check',
] as const;

export interface AppCenterWorkItem {
  /** Unique execution instance; multiple runs may have the same marketplace and ASIN. */
  id: string;
  type: AppCenterWorkItemType;
  title: string;
  status: AppCenterWorkItemStatus;
  marketplace: string;
  asinOrSku: string;
  sourceRoute: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppCenterArtifactEnvelope {
  id: string;
  /** Execution instance that owns this stage artifact. */
  workItemId: string;
  type: AppCenterArtifactType;
  sourceRoute: string;
  title: string;
  summary: string;
  payloadRef: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface ArtifactPayloadResolvers {
  historyExists?: (id: string) => boolean;
  promptExists?: (id: string) => boolean;
  listingCopyExists?: (id: string) => boolean;
  keywordSnapshotExists?: (id: string) => boolean;
  ppcActionListExists?: (id: string) => boolean;
}

export type ArtifactPayloadStatus = 'available' | 'missing' | 'unknown';

export interface AppCenterPpcActionListArtifactInput {
  id: string;
  reportType: string;
  filter: string;
  rowCount: number;
  owner: string;
  requiresHumanConfirmation: boolean;
  reviewStatus?: 'pending' | 'confirmed' | 'skipped';
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AppCenterComplianceCheckArtifactInput {
  id: string;
  checklistIds?: readonly string[];
  completedIds?: readonly string[];
  itemStates?: Readonly<ComplianceReviewStates>;
  createdAt: string;
  updatedAt?: string;
  note?: string;
}

export interface AppCenterWorkItemProgress {
  workItemId: string;
  completedSteps: number;
  totalSteps: number;
  completedTypes: AppCenterArtifactType[];
  label: string;
}

export interface ArtifactsChangedPayload {
  reason: 'upsert' | 'clear' | 'preferences';
  artifactId?: string;
}

interface ArtifactPayloadLookup {
  id: string;
  exists?: (id: string) => boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWorkItem(value: unknown): value is AppCenterWorkItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    typeof value.title === 'string' &&
    typeof value.status === 'string'
  );
}

function normalizeStoredWorkItem(workItem: AppCenterWorkItem): AppCenterWorkItem {
  if (
    workItem.type === 'competitor_listing' &&
    workItem.id.startsWith('competitor_listing:keyword_snapshot:')
  ) {
    return { ...workItem, type: 'keyword_review' };
  }
  return workItem;
}

function isArtifactEnvelope(value: unknown): value is AppCenterArtifactEnvelope {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.workItemId === 'string' &&
    typeof value.type === 'string' &&
    typeof value.payloadRef === 'string'
  );
}

function readWorkItems(): AppCenterWorkItem[] {
  const stored = StorageService.get<unknown>(APP_CENTER_WORK_ITEMS_STORAGE_KEY, []);
  return Array.isArray(stored) ? stored.filter(isWorkItem).map(normalizeStoredWorkItem) : [];
}

function readArtifacts(): AppCenterArtifactEnvelope[] {
  const stored = StorageService.get<unknown>(APP_CENTER_ARTIFACTS_STORAGE_KEY, []);
  return Array.isArray(stored) ? stored.filter(isArtifactEnvelope) : [];
}

function persistWorkItems(workItems: AppCenterWorkItem[]): void {
  StorageService.set(APP_CENTER_WORK_ITEMS_STORAGE_KEY, workItems);
}

function persistArtifacts(artifacts: AppCenterArtifactEnvelope[]): void {
  StorageService.set(APP_CENTER_ARTIFACTS_STORAGE_KEY, artifacts);
}

function emitArtifactsChanged(payload: ArtifactsChangedPayload): void {
  eventBus.emit(APP_CENTER_ARTIFACTS_CHANGED, payload);
}

function getTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortByCreatedAt<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => getTime(right.createdAt) - getTime(left.createdAt));
}

function upsertWorkItem(workItem: AppCenterWorkItem): AppCenterWorkItem {
  const workItems = readWorkItems();
  const previous = workItems.find(item => item.id === workItem.id);
  const merged: AppCenterWorkItem = previous
    ? {
        ...previous,
        ...workItem,
        title: previous.title || workItem.title,
        marketplace: workItem.marketplace || previous.marketplace,
        asinOrSku: workItem.asinOrSku || previous.asinOrSku,
        createdAt: previous.createdAt || workItem.createdAt,
      }
    : workItem;
  persistWorkItems([merged, ...workItems.filter(item => item.id !== workItem.id)]);
  return merged;
}

function upsertArtifact(envelope: AppCenterArtifactEnvelope): AppCenterArtifactEnvelope {
  const artifacts = readArtifacts();
  const previous = artifacts.find(item => item.id === envelope.id);
  const merged: AppCenterArtifactEnvelope = {
    ...previous,
    ...envelope,
    createdAt: previous?.createdAt || envelope.createdAt,
    updatedAt: envelope.updatedAt || envelope.createdAt,
  };
  const nextArtifacts = sortByCreatedAt([
    merged,
    ...artifacts.filter(item => item.id !== envelope.id),
  ]);
  persistArtifacts(nextArtifacts);
  syncWorkItemFromArtifacts(envelope.workItemId, nextArtifacts);
  emitArtifactsChanged({ reason: 'upsert', artifactId: envelope.id });
  return merged;
}

function getArtifactActivityTime(artifact: AppCenterArtifactEnvelope): number {
  return Math.max(getTime(artifact.createdAt), getTime(artifact.updatedAt || ''));
}

function syncWorkItemFromArtifacts(
  workItemId: string,
  artifacts: AppCenterArtifactEnvelope[]
): void {
  const workItems = readWorkItems();
  const workItem = workItems.find(item => item.id === workItemId);
  if (!workItem) return;
  const workItemArtifacts = artifacts.filter(artifact => artifact.workItemId === workItemId);
  const latestActivity = Math.max(
    getTime(workItem.updatedAt),
    ...workItemArtifacts.map(getArtifactActivityTime)
  );
  const status = deriveWorkItemStatus(workItem, workItemArtifacts);
  persistWorkItems([
    {
      ...workItem,
      status,
      updatedAt: latestActivity ? new Date(latestActivity).toISOString() : workItem.updatedAt,
    },
    ...workItems.filter(item => item.id !== workItemId),
  ]);
}

function getHistoryFirstAsin(historyItem: HistoryItem): string {
  return historyItem.asins[0] || historyItem.data.products?.[0]?.asin || '';
}

function getHistoryWorkItemStatus(historyItem: HistoryItem): AppCenterWorkItemStatus {
  if (historyItem.promptResults?.listing) return 'review_required';
  if (historyItem.analysisStatus?.isAnalyzed || historyItem.report) return 'in_progress';
  return 'draft';
}

function getHistoryMarketplace(historyItem: HistoryItem): string {
  return historyItem.site || historyItem.data.metadata?.marketplace || '';
}

function getHistoryUpdatedAt(historyItem: HistoryItem): string {
  return historyItem.promptResults?.updatedAt || historyItem.timestamp;
}

function createWorkItemFromHistoryItem(historyItem: HistoryItem): AppCenterWorkItem {
  const workItemId = createWorkItemIdFromHistoryItem(historyItem);
  const firstAsin = getHistoryFirstAsin(historyItem);

  return {
    id: workItemId,
    type: 'competitor_listing',
    title: `${historyItem.site || 'Marketplace'} ${firstAsin || '竞品'} Listing 作业`,
    status: getHistoryWorkItemStatus(historyItem),
    marketplace: getHistoryMarketplace(historyItem),
    asinOrSku: historyItem.asins.join(', '),
    sourceRoute: 'scraper',
    createdAt: historyItem.timestamp,
    updatedAt: getHistoryUpdatedAt(historyItem),
  };
}

function resolveHistoryDataSourceLabel(historyItem: HistoryItem): 'JSON导入' | '采集' {
  const meta = asRecord(historyItem.data?.metadata);
  const source = meta?.data_source ?? meta?.dataSource ?? meta?.last_action;
  if (typeof source !== 'string') return '采集';
  const normalized = source.trim().toLowerCase();
  return normalized.includes('import') ? 'JSON导入' : '采集';
}

function createHistoryArtifact(historyItem: HistoryItem): AppCenterArtifactEnvelope {
  const workItemId = createWorkItemIdFromHistoryItem(historyItem);
  const dataSource = resolveHistoryDataSourceLabel(historyItem);
  const asinCount = historyItem.asins.length;

  return {
    id: `${workItemId}:scrape_history`,
    workItemId,
    type: 'scrape_history',
    sourceRoute: 'scraper',
    title: '采集历史',
    summary: `${historyItem.site || '站点'} · ${asinCount}个ASIN · ${dataSource}`,
    payloadRef: `history:${String(historyItem.id)}`,
    createdAt: historyItem.timestamp,
    metadata: {
      asinCount,
      marketplace: historyItem.site || historyItem.data?.metadata?.marketplace || '',
      dataSource,
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function getAnalysisReportRecord(historyItem: HistoryItem): Record<string, unknown> | null {
  const report = historyItem.analysisStatus?.analysisReport || historyItem.report;
  if (!report) return null;
  if (typeof report === 'string') {
    try {
      return asRecord(JSON.parse(report));
    } catch {
      return null;
    }
  }
  return asRecord(report);
}

function getAnalysisDimensionCount(report: Record<string, unknown>): number {
  const meta = asRecord(report._metadata);
  const targetIds = meta?.targetIds;
  if (Array.isArray(targetIds) && targetIds.length > 0) return targetIds.length;
  const confidence = asRecord(meta?.confidence);
  if (confidence && Object.keys(confidence).length > 0) return Object.keys(confidence).length;
  // Count non-meta report sections with object payloads.
  return Object.entries(report).filter(([key, value]) => {
    if (
      key.startsWith('_') ||
      key === 'parse_error' ||
      key === 'raw_response' ||
      key === 'error_detail'
    ) {
      return false;
    }
    return value !== null && typeof value === 'object';
  }).length;
}

function getAnalysisOverallConfidencePercent(report: Record<string, unknown>): number | null {
  const meta = asRecord(report._metadata);
  const overall = meta?.overallConfidence;
  if (typeof overall !== 'number' || !Number.isFinite(overall)) return null;
  // Stored as 0–1; tolerate already-percent values.
  const percent = overall <= 1 ? Math.round(overall * 100) : Math.round(overall);
  return Math.max(0, Math.min(100, percent));
}

function getAnalysisModelLabel(report: Record<string, unknown>): string {
  const meta = asRecord(report._metadata);
  const model = meta?.model;
  return typeof model === 'string' ? model.trim() : '';
}

function getAnalysisAsinCount(historyItem: HistoryItem, report: Record<string, unknown>): number {
  const meta = asRecord(report._metadata);
  const sourceAsins = meta?.sourceAsins;
  if (Array.isArray(sourceAsins) && sourceAsins.length > 0) {
    return sourceAsins.filter(asin => typeof asin === 'string' && asin.trim()).length;
  }
  const statusAsins = historyItem.analysisStatus?.sourceAsins;
  if (Array.isArray(statusAsins) && statusAsins.length > 0) {
    return statusAsins.filter(asin => typeof asin === 'string' && asin.trim()).length;
  }
  return historyItem.asins.length;
}

function buildAnalysisArtifactSummary(historyItem: HistoryItem): {
  summary: string;
  metadata: Record<string, string | number | boolean>;
} {
  const report = getAnalysisReportRecord(historyItem);
  if (!report) {
    return { summary: '绑定当前采集历史的分析报告', metadata: {} };
  }

  const dimensionCount = getAnalysisDimensionCount(report);
  const confidencePercent = getAnalysisOverallConfidencePercent(report);
  const model = getAnalysisModelLabel(report);
  const analysisAsinCount = getAnalysisAsinCount(historyItem, report);
  const parts: string[] = [];
  if (analysisAsinCount > 0) parts.push(`${analysisAsinCount}个ASIN`);
  if (dimensionCount > 0) parts.push(`${dimensionCount}个分析维度`);
  if (confidencePercent !== null) parts.push(`${confidencePercent}%置信度`);

  return {
    summary: parts.length > 0 ? parts.join(' · ') : '绑定当前采集历史的分析报告',
    metadata: {
      ...(analysisAsinCount > 0 ? { asinCount: analysisAsinCount } : {}),
      ...(dimensionCount > 0 ? { dimensionCount } : {}),
      ...(confidencePercent !== null ? { overallConfidencePercent: confidencePercent } : {}),
      ...(model ? { model } : {}),
    },
  };
}

function buildPromptStrategyLabel(profile: GeneratedPromptRecord['profile'] | undefined): string {
  if (!profile) return '默认策略';
  const bits: string[] = [];
  if (profile.tone?.trim()) bits.push(profile.tone.trim());
  if (profile.useCosmo) bits.push('COSMO');
  if (profile.useRufus) bits.push('Rufus');
  if (profile.useEmoji) bits.push('Emoji');
  if (profile.customStrategy?.trim()) bits.push('自定义策略');
  if (Array.isArray(profile.selectedReportSections) && profile.selectedReportSections.length > 0) {
    bits.push(`${profile.selectedReportSections.length} 报告模块`);
  }
  return bits.length > 0 ? bits.join(' · ') : '默认策略';
}

function parseListingReviewScore(markdown: string): { score: number; grade: string } | null {
  if (!markdown.trim()) return null;
  const match = markdown.match(/(\d{1,3})\s*\/\s*100/);
  const scoreText = match?.[1];
  if (!scoreText) return null;
  const score = Number.parseInt(scoreText, 10);
  if (!Number.isFinite(score)) return null;
  const clamped = Math.max(0, Math.min(100, score));
  const grade =
    clamped >= 85 ? '优秀' : clamped >= 75 ? '良好' : clamped >= 70 ? '待优化' : '高风险';
  return { score: clamped, grade };
}

function createAnalysisArtifact(historyItem: HistoryItem): AppCenterArtifactEnvelope | null {
  if (!historyItem.analysisStatus?.analysisReport && !historyItem.report) {
    return null;
  }

  const workItemId = createWorkItemIdFromHistoryItem(historyItem);
  const { summary, metadata } = buildAnalysisArtifactSummary(historyItem);

  return {
    id: `${workItemId}:analysis_report`,
    workItemId,
    type: 'analysis_report',
    sourceRoute: 'ai_analysis',
    title: 'AI 分析报告',
    summary,
    payloadRef: `history:${String(historyItem.id)}#analysis`,
    createdAt: historyItem.analysisStatus?.analyzedAt || historyItem.timestamp,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
}

function createPromptArtifact(
  historyItem: HistoryItem,
  prompt: GeneratedPromptRecord
): AppCenterArtifactEnvelope {
  const workItemId = createWorkItemIdFromHistoryItem(historyItem);

  const strategy = buildPromptStrategyLabel(prompt.profile);
  return {
    id: `${workItemId}:listing_prompt:${prompt.id}`,
    workItemId,
    type: 'listing_prompt',
    sourceRoute: 'promptlab',
    title: 'Listing Prompt',
    summary: strategy || '默认策略',
    payloadRef: `prompt:${prompt.id}`,
    createdAt: prompt.generatedAt,
    metadata: {
      strategy,
      asinCount: prompt.asins.length || historyItem.asins.length,
      marketplace: prompt.marketplace || historyItem.site || '',
    },
  };
}

function getListingPrompts(historyItem: HistoryItem): GeneratedPromptRecord[] {
  const prompts =
    historyItem.promptResults?.history.filter(prompt => prompt.type === 'listing') || [];
  const listing = historyItem.promptResults?.listing;

  if (!listing || prompts.some(prompt => prompt.id === listing.id)) {
    return prompts;
  }

  return [listing, ...prompts];
}

function createKeywordSnapshotWorkItem(
  snapshot: KeywordHunterSnapshot,
  context: AppCenterWorkspaceContext
): AppCenterWorkItem {
  const existing = context.workItemId
    ? readWorkItems().find(item => item.id === context.workItemId)
    : null;
  return {
    id: context.workItemId || '',
    type: existing?.type || 'keyword_review',
    title: `${context.marketplace || 'Marketplace'} ${context.asinOrSku || '关键词'} Listing 作业`,
    status: 'review_required',
    marketplace: context.marketplace,
    asinOrSku: context.asinOrSku,
    sourceRoute: context.sourceRoute || 'keyword_hunter_analysis',
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  };
}

function getPpcActionListWorkItemId(actionList: AppCenterPpcActionListArtifactInput): string {
  return `ppc_review:${actionList.id}`;
}

function createPpcActionListWorkItem(
  actionList: AppCenterPpcActionListArtifactInput,
  context: AppCenterWorkspaceContext
): AppCenterWorkItem {
  const workItemId = getPpcActionListWorkItemId(actionList);

  return {
    id: workItemId,
    type: 'ppc_review',
    title: `${context.marketplace || 'PPC'} ${context.asinOrSku || '搜索词'} 动作复核`,
    status: actionList.requiresHumanConfirmation ? 'review_required' : 'done',
    marketplace: context.marketplace,
    asinOrSku: context.asinOrSku,
    sourceRoute: 'ppc_search_terms',
    createdAt: actionList.createdAt,
    updatedAt: actionList.updatedAt || actionList.createdAt,
  };
}

export function getWorkItems(): AppCenterWorkItem[] {
  return sortByCreatedAt(readWorkItems());
}

export function getWorkItemById(workItemId: string): AppCenterWorkItem | null {
  return readWorkItems().find(item => item.id === workItemId) || null;
}

export function getArtifactsForWorkItem(workItemId: string): AppCenterArtifactEnvelope[] {
  return sortByCreatedAt(readArtifacts().filter(artifact => artifact.workItemId === workItemId));
}

export function getRecentArtifacts(limit = 10): AppCenterArtifactEnvelope[] {
  return sortByCreatedAt(readArtifacts()).slice(0, limit);
}

export function getAllArtifacts(): AppCenterArtifactEnvelope[] {
  return sortByCreatedAt(readArtifacts());
}

/**
 * 分析运行中进度工件：deep 档运行期间总览「最近作业」可见「分析中 a/b」。
 * 完成后由 complete/cancel 路径移除，正式 analysis_report 工件照常由 history 落库。
 */
const ANALYSIS_RUNNING_ID_PREFIX = 'analysis_running:';

export function registerAnalysisRunningArtifact(input: {
  historyId: number | string;
  done: number;
  total: number;
}): void {
  const id = `${ANALYSIS_RUNNING_ID_PREFIX}${input.historyId}`;
  upsertWorkItem({
    id,
    type: 'competitor_listing',
    title: 'AI 分析',
    status: 'in_progress',
    marketplace: '',
    asinOrSku: '',
    sourceRoute: 'ai_analysis',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  upsertArtifact({
    id,
    workItemId: id,
    type: 'analysis_running',
    sourceRoute: 'ai_analysis',
    title: 'AI 分析',
    summary: `分析进行中 ${input.done}/${input.total}`,
    payloadRef: `history:${String(input.historyId)}#running`,
    createdAt: new Date().toISOString(),
  });
}

/** 移除运行中进度工件（分析完成/取消时，幂等）。 */
export function removeAnalysisRunningArtifact(historyId: number | string): void {
  const id = `${ANALYSIS_RUNNING_ID_PREFIX}${historyId}`;
  persistArtifacts(readArtifacts().filter(a => a.id !== id));
  persistWorkItems(readWorkItems().filter(w => w.id !== id));
  emitArtifactsChanged({ reason: 'upsert' });
}

export function registerHistoryArtifacts(historyItem: HistoryItem): AppCenterArtifactEnvelope[] {
  upsertWorkItem(createWorkItemFromHistoryItem(historyItem));

  const artifacts = [
    createHistoryArtifact(historyItem),
    createAnalysisArtifact(historyItem),
    ...getListingPrompts(historyItem).map(prompt => createPromptArtifact(historyItem, prompt)),
  ].filter((artifact): artifact is AppCenterArtifactEnvelope => artifact !== null);

  artifacts.forEach(upsertArtifact);
  return getArtifactsForWorkItem(createWorkItemIdFromHistoryItem(historyItem));
}

function resolveKeywordSnapshotWorkItemId(
  snapshot: KeywordHunterSnapshot,
  context: AppCenterWorkspaceContext
): string {
  const sourceWorkItemId =
    snapshot.source && 'workItemId' in snapshot.source ? snapshot.source.workItemId : undefined;
  return context.workItemId || sourceWorkItemId || `keyword_review:${snapshot.id}`;
}

function registerListingReviewFromSnapshot(
  snapshot: KeywordHunterSnapshot,
  workItemId: string,
  sourceRoute: string
): void {
  if (snapshot.status !== 'reported' || !snapshot.result.llmAnalysisResult?.trim()) return;

  const reviewScore = parseListingReviewScore(snapshot.result.llmAnalysisResult);
  const reviewModel =
    typeof snapshot.result.llmAnalysisModel === 'string'
      ? snapshot.result.llmAnalysisModel.trim()
      : '';
  const reviewParts: string[] = [];
  if (reviewScore) reviewParts.push(reviewScore.grade, `${reviewScore.score}/100`);
  if (reviewModel) reviewParts.push(reviewModel);
  const reviewSummary = reviewParts.length > 0 ? reviewParts.join(' · ') : 'Listing 评审报告已生成';

  upsertArtifact({
    id: `${workItemId}:listing_review:${snapshot.id}`,
    workItemId,
    type: 'listing_review',
    sourceRoute,
    title: '文案评审',
    summary: `${reviewSummary} · 人工复核：SOP › Listing 极致优化`,
    payloadRef: `keyword_snapshot:${snapshot.id}`,
    createdAt: snapshot.updatedAt,
    metadata: {
      keywordSnapshotId: snapshot.id,
      ...(reviewScore ? { score: reviewScore.score, grade: reviewScore.grade } : {}),
      ...(reviewModel ? { model: reviewModel } : {}),
    },
  });
}

export function registerKeywordSnapshotArtifact(
  snapshot: KeywordHunterSnapshot,
  context: AppCenterWorkspaceContext
): AppCenterArtifactEnvelope | null {
  // Prefer active workspace work item; otherwise bind a local-only work item to the snapshot
  // so pure Keyword Hunter usage still appears in 最近继续 (no cloud / multi-user identity).
  const workItemId = resolveKeywordSnapshotWorkItemId(snapshot, context);
  const boundContext: AppCenterWorkspaceContext = { ...context, workItemId };
  upsertWorkItem(createKeywordSnapshotWorkItem(snapshot, boundContext));

  const keywordCount = Array.isArray(snapshot.result.keywords)
    ? snapshot.result.keywords.length
    : 0;
  const matchedCount =
    snapshot.derived?.matchedCount ??
    (Array.isArray(snapshot.result.matchedKeywords) ? snapshot.result.matchedKeywords.length : 0);
  const unmatchedCount =
    snapshot.derived?.unmatchedCount ??
    (Array.isArray(snapshot.result.unmatchedKeywords)
      ? snapshot.result.unmatchedKeywords.length
      : 0);
  const sourceRoute = context.sourceRoute || 'keyword_hunter_analysis';
  const keywordArtifact = upsertArtifact({
    id: `${workItemId}:keyword_snapshot:${snapshot.id}`,
    workItemId,
    type: 'keyword_snapshot',
    sourceRoute,
    title: snapshot.title,
    summary: `${keywordCount}个关键词 · ${matchedCount}个命中 · ${unmatchedCount}个未命中`,
    payloadRef: `keyword_snapshot:${snapshot.id}`,
    createdAt: snapshot.updatedAt,
    metadata: {
      keywordCount,
      matchedCount,
      unmatchedCount,
      coverageRate: snapshot.result.coverageRate,
    },
  });

  registerListingReviewFromSnapshot(snapshot, workItemId, sourceRoute);
  return keywordArtifact;
}

function createListingCopyWorkItem(copy: AppCenterListingCopy): AppCenterWorkItem {
  return {
    id: copy.workItemId,
    type: 'competitor_listing',
    title: `${copy.marketplace || 'Marketplace'} ${copy.asinOrSku || 'Listing'} 文案作业`,
    status: 'review_required',
    marketplace: copy.marketplace,
    asinOrSku: copy.asinOrSku,
    sourceRoute: 'playground_deep_chat',
    createdAt: copy.createdAt,
    updatedAt: copy.createdAt,
  };
}

export function registerListingCopyArtifact(copy: AppCenterListingCopy): AppCenterArtifactEnvelope {
  upsertWorkItem(createListingCopyWorkItem(copy));

  const model = typeof copy.model === 'string' ? copy.model.trim() : '';
  return upsertArtifact({
    id: `${copy.workItemId}:listing_copy:${copy.id}`,
    workItemId: copy.workItemId,
    type: 'listing_copy',
    sourceRoute: 'playground_deep_chat',
    title: '产品文案',
    summary: model
      ? `${copy.seoKeywords.length}个SEO关键词 · ${model}`
      : `${copy.seoKeywords.length}个SEO关键词`,
    payloadRef: `listing_copy:${copy.id}`,
    createdAt: copy.createdAt,
    metadata: {
      promptId: copy.promptId,
      threadId: copy.threadId,
      keywordCount: copy.seoKeywords.length,
      ...(model ? { model } : {}),
    },
  });
}

export function registerPpcActionListArtifact(
  actionList: AppCenterPpcActionListArtifactInput,
  context: AppCenterWorkspaceContext
): AppCenterArtifactEnvelope {
  const workItemId = getPpcActionListWorkItemId(actionList);

  upsertWorkItem(createPpcActionListWorkItem(actionList, context));

  return upsertArtifact({
    id: `${workItemId}:ppc_action_list:${actionList.id}`,
    workItemId,
    type: 'ppc_action_list',
    sourceRoute: 'ppc_search_terms',
    title: 'PPC 动作清单',
    summary: `${actionList.rowCount} 条建议动作 · 负责人：${actionList.owner} · ${
      actionList.requiresHumanConfirmation ? '需人工复核' : '已人工复核'
    }`,
    payloadRef: `ppc_action_list:${actionList.id}`,
    createdAt: actionList.createdAt,
    updatedAt: actionList.updatedAt || actionList.createdAt,
    metadata: {
      owner: actionList.owner,
      requiresHumanConfirmation: actionList.requiresHumanConfirmation,
      rowCount: actionList.rowCount,
      reportType: actionList.reportType,
      filter: actionList.filter,
      reviewStatus:
        actionList.reviewStatus || (actionList.requiresHumanConfirmation ? 'pending' : 'confirmed'),
      note: actionList.note || '',
    },
  });
}

function getComplianceChecklistIds(
  input: AppCenterComplianceCheckArtifactInput
): readonly string[] {
  return input.checklistIds?.length
    ? input.checklistIds
    : APP_CENTER_COMPLIANCE_CHECKLIST.map(item => item.id);
}

function createComplianceCheckWorkItem(
  input: AppCenterComplianceCheckArtifactInput,
  context: AppCenterWorkspaceContext
): AppCenterWorkItem {
  const workItemId = context.workItemId || `competitor_listing:compliance:${input.id}`;
  const existing = readWorkItems().find(item => item.id === workItemId);
  const checklistIds = getComplianceChecklistIds(input);
  const states = createComplianceReviewStates(checklistIds, input.itemStates, input.completedIds);
  const completedCount = Object.values(states).filter(status => status !== 'pending').length;
  const total = checklistIds.length;
  const complete = total > 0 && completedCount >= total;
  const hasIssues = Object.values(states).some(status => status === 'issue_found');

  return {
    id: workItemId,
    type: existing?.type || 'competitor_listing',
    title: `${context.marketplace || 'Marketplace'} ${context.asinOrSku || '作业'} 合规复核`,
    status: complete && !hasIssues ? 'done' : 'review_required',
    marketplace: context.marketplace,
    asinOrSku: context.asinOrSku,
    sourceRoute: context.sourceRoute || 'keyword_hunter_analysis',
    createdAt: input.createdAt,
    updatedAt: input.updatedAt || input.createdAt,
  };
}

/**
 * Registers a compliance_check artifact for the active work item.
 * Checklist IDs default to APP_CENTER_COMPLIANCE_CHECKLIST when omitted.
 * Does not auto-execute any compliance action — only records human review progress.
 */
export function registerComplianceCheckArtifact(
  input: AppCenterComplianceCheckArtifactInput,
  context: AppCenterWorkspaceContext
): AppCenterArtifactEnvelope | null {
  if (!context.workItemId && !input.id) {
    return null;
  }

  const checklistIds = [...getComplianceChecklistIds(input)];
  const completedIds = (input.completedIds || []).filter(id => checklistIds.includes(id));
  const itemStates = createComplianceReviewStates(checklistIds, input.itemStates, completedIds);
  const reviewedIds = Object.entries(itemStates)
    .filter(([, status]) => status !== 'pending')
    .map(([id]) => id);
  const workItem = createComplianceCheckWorkItem(
    { ...input, checklistIds, completedIds: reviewedIds, itemStates },
    context
  );
  upsertWorkItem(workItem);

  const completedCount = reviewedIds.length;
  const total = checklistIds.length;
  const pending = total - completedCount;
  const issueCount = Object.values(itemStates).filter(status => status === 'issue_found').length;
  const notApplicableCount = Object.values(itemStates).filter(
    status => status === 'not_applicable'
  ).length;

  return upsertArtifact({
    id: `${workItem.id}:compliance_check:${input.id}`,
    workItemId: workItem.id,
    type: 'compliance_check',
    sourceRoute: context.sourceRoute || 'keyword_hunter_analysis',
    title: '合规复核',
    summary: `${completedCount}/${total} 项已复核${pending > 0 ? ' · 待人工确认' : ' · 已完成'}`,
    payloadRef: `compliance_check:${input.id}`,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt || input.createdAt,
    metadata: {
      checklistCount: total,
      completedCount,
      requiresHumanConfirmation: pending > 0,
      checklistIds: checklistIds.join(','),
      completedIds: reviewedIds.join(','),
      issueCount,
      notApplicableCount,
      reviewStates: JSON.stringify(itemStates),
      note: input.note || '',
    },
  });
}

export function getWorkItemProgress(workItemId: string): AppCenterWorkItemProgress {
  const artifacts = getArtifactsForWorkItem(workItemId);
  const workItem = getWorkItemById(workItemId);
  if (workItem?.type === 'ppc_review') {
    const ppcArtifact = artifacts.find(artifact => artifact.type === 'ppc_action_list');
    const complete = ppcArtifact?.metadata?.requiresHumanConfirmation === false;
    return {
      workItemId,
      completedSteps: complete ? 1 : 0,
      totalSteps: 1,
      completedTypes: complete ? ['ppc_action_list'] : [],
      label: `已完成 ${complete ? 1 : 0}/1 步`,
    };
  }

  if (workItem?.type === 'keyword_review') {
    const completedTypes = getCompletedSequentialTypes(artifacts, KEYWORD_REVIEW_PROGRESS_TYPES);
    return {
      workItemId,
      completedSteps: completedTypes.length,
      totalSteps: KEYWORD_REVIEW_PROGRESS_TYPES.length,
      completedTypes,
      label: `已完成 ${completedTypes.length}/${KEYWORD_REVIEW_PROGRESS_TYPES.length} 步`,
    };
  }

  const completedTypes = getCompletedCompetitorListingTypes(artifacts);
  const completedSteps = completedTypes.length;
  const totalSteps = COMPETITOR_LISTING_PROGRESS_TYPES.length;

  return {
    workItemId,
    completedSteps,
    totalSteps,
    completedTypes: [...completedTypes],
    label: `已完成 ${completedSteps}/${totalSteps} 步`,
  };
}

function getCompletedCompetitorListingTypes(
  artifacts: AppCenterArtifactEnvelope[]
): AppCenterArtifactType[] {
  return getCompletedSequentialTypes(artifacts, COMPETITOR_LISTING_PROGRESS_TYPES);
}

function getCompletedSequentialTypes(
  artifacts: AppCenterArtifactEnvelope[],
  progressTypes: readonly AppCenterArtifactType[]
): AppCenterArtifactType[] {
  const completedTypes: AppCenterArtifactType[] = [];
  let previousStageTime = 0;
  for (const type of progressTypes) {
    const artifact = artifacts.find(
      item => item.type === type && getTime(item.createdAt) >= previousStageTime
    );
    if (!artifact) break;
    if (type === 'compliance_check' && !getComplianceReviewView(artifact).complete) break;
    completedTypes.push(type);
    previousStageTime = getTime(artifact.createdAt);
  }
  return completedTypes;
}

function deriveWorkItemStatus(
  workItem: AppCenterWorkItem,
  artifacts: AppCenterArtifactEnvelope[]
): AppCenterWorkItemStatus {
  if (workItem.type === 'ppc_review') {
    const latestPpc = [...artifacts]
      .filter(artifact => artifact.type === 'ppc_action_list')
      .sort((left, right) => getArtifactActivityTime(right) - getArtifactActivityTime(left))[0];
    return latestPpc?.metadata?.requiresHumanConfirmation === false ? 'done' : 'review_required';
  }

  const progressTypes =
    workItem.type === 'keyword_review'
      ? KEYWORD_REVIEW_PROGRESS_TYPES
      : COMPETITOR_LISTING_PROGRESS_TYPES;
  const completedTypes = getCompletedSequentialTypes(artifacts, progressTypes);
  const complianceComplete = completedTypes.includes('compliance_check');
  if (complianceComplete) {
    const compliance = artifacts.find(artifact => artifact.type === 'compliance_check');
    return compliance && !getComplianceReviewView(compliance).hasIssues
      ? 'done'
      : 'review_required';
  }
  if (completedTypes.length === 0) return 'draft';
  return completedTypes.includes('listing_prompt') || workItem.type === 'keyword_review'
    ? 'review_required'
    : 'in_progress';
}

function createHistoryPayloadLookup(
  artifact: AppCenterArtifactEnvelope,
  resolvers: ArtifactPayloadResolvers
): ArtifactPayloadLookup {
  return {
    id: artifact.payloadRef.replace(/^history:/, '').split('#')[0] || '',
    exists: resolvers.historyExists,
  };
}

function createPromptPayloadLookup(
  artifact: AppCenterArtifactEnvelope,
  resolvers: ArtifactPayloadResolvers
): ArtifactPayloadLookup {
  return {
    id: artifact.payloadRef.replace(/^prompt:/, ''),
    exists: resolvers.promptExists,
  };
}

function createKeywordSnapshotPayloadLookup(
  artifact: AppCenterArtifactEnvelope,
  resolvers: ArtifactPayloadResolvers
): ArtifactPayloadLookup {
  return {
    id: artifact.payloadRef.replace(/^keyword_snapshot:/, ''),
    exists: resolvers.keywordSnapshotExists,
  };
}

function createListingCopyPayloadLookup(
  artifact: AppCenterArtifactEnvelope,
  resolvers: ArtifactPayloadResolvers
): ArtifactPayloadLookup {
  return {
    id: artifact.payloadRef.replace(/^listing_copy:/, ''),
    exists: resolvers.listingCopyExists,
  };
}

function createPpcActionListPayloadLookup(
  artifact: AppCenterArtifactEnvelope,
  resolvers: ArtifactPayloadResolvers
): ArtifactPayloadLookup {
  return {
    id: artifact.payloadRef.replace(/^ppc_action_list:/, ''),
    exists: resolvers.ppcActionListExists,
  };
}

const ARTIFACT_PAYLOAD_LOOKUP_FACTORIES: Partial<
  Record<
    AppCenterArtifactType,
    (
      artifact: AppCenterArtifactEnvelope,
      resolvers: ArtifactPayloadResolvers
    ) => ArtifactPayloadLookup
  >
> = {
  scrape_history: createHistoryPayloadLookup,
  analysis_report: createHistoryPayloadLookup,
  listing_prompt: createPromptPayloadLookup,
  listing_copy: createListingCopyPayloadLookup,
  keyword_snapshot: createKeywordSnapshotPayloadLookup,
  listing_review: createKeywordSnapshotPayloadLookup,
  ppc_action_list: createPpcActionListPayloadLookup,
};

export function getArtifactPayloadStatus(
  artifact: AppCenterArtifactEnvelope,
  resolvers: ArtifactPayloadResolvers
): ArtifactPayloadStatus {
  const lookup = ARTIFACT_PAYLOAD_LOOKUP_FACTORIES[artifact.type]?.(artifact, resolvers);
  if (!lookup?.exists) return 'unknown';
  return lookup.exists(lookup.id) ? 'available' : 'missing';
}

export function clearArtifactEnvelopeIndex(): void {
  StorageService.remove(APP_CENTER_WORK_ITEMS_STORAGE_KEY);
  StorageService.remove(APP_CENTER_ARTIFACTS_STORAGE_KEY);
  emitArtifactsChanged({ reason: 'clear' });
}
