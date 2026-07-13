import eventBus from '@/common/EventBus';
import { StorageService } from '@/services/storageService';
import type {
  GeneratedPromptRecord,
  HistoryItem,
  KeywordHunterSnapshot,
} from '@/types/modules-business';
import type { AppCenterWorkspaceContext } from './workspaceContext';
import { createWorkItemIdFromHistoryItem } from './workspaceContext';
import { APP_CENTER_COMPLIANCE_CHECKLIST } from './workflowDefinitions';
import {
  createComplianceReviewStates,
  getComplianceReviewView,
  type ComplianceReviewStates,
} from './complianceReviewState';

export const APP_CENTER_WORK_ITEMS_STORAGE_KEY = 'app_center_work_items_v1';
export const APP_CENTER_ARTIFACTS_STORAGE_KEY = 'app_center_artifact_envelopes_v1';
export const APP_CENTER_ARTIFACTS_CHANGED = 'app-center:artifacts-changed';

export type AppCenterWorkItemType = 'competitor_listing' | 'ppc_review' | 'npi_reference';
export type AppCenterWorkItemStatus = 'draft' | 'in_progress' | 'review_required' | 'done';
export type AppCenterArtifactType =
  | 'scrape_history'
  | 'analysis_report'
  | 'listing_prompt'
  | 'keyword_snapshot'
  | 'ppc_action_list'
  | 'compliance_check';

/** Competitor listing workflow artifact types used for progress (5 steps). */
export const COMPETITOR_LISTING_PROGRESS_TYPES: readonly AppCenterArtifactType[] = [
  'scrape_history',
  'analysis_report',
  'listing_prompt',
  'keyword_snapshot',
  'compliance_check',
] as const;

export interface AppCenterWorkItem {
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
  workItemId: string;
  type: AppCenterArtifactType;
  sourceRoute: string;
  title: string;
  summary: string;
  payloadRef: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface ArtifactPayloadResolvers {
  historyExists?: (id: string) => boolean;
  promptExists?: (id: string) => boolean;
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
}

export interface AppCenterComplianceCheckArtifactInput {
  id: string;
  checklistIds?: readonly string[];
  completedIds?: readonly string[];
  itemStates?: Readonly<ComplianceReviewStates>;
  createdAt: string;
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
  return Array.isArray(stored) ? stored.filter(isWorkItem) : [];
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
  persistArtifacts(
    sortByCreatedAt([envelope, ...readArtifacts().filter(item => item.id !== envelope.id)])
  );
  emitArtifactsChanged({ reason: 'upsert', artifactId: envelope.id });
  return envelope;
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

function createHistoryArtifact(historyItem: HistoryItem): AppCenterArtifactEnvelope {
  const workItemId = createWorkItemIdFromHistoryItem(historyItem);

  return {
    id: `${workItemId}:scrape_history`,
    workItemId,
    type: 'scrape_history',
    sourceRoute: 'scraper',
    title: '采集历史',
    summary: `${historyItem.site || '站点'} · ${historyItem.asins.length} ASIN`,
    payloadRef: `history:${String(historyItem.id)}`,
    createdAt: historyItem.timestamp,
  };
}

function createAnalysisArtifact(historyItem: HistoryItem): AppCenterArtifactEnvelope | null {
  if (!historyItem.analysisStatus?.analysisReport && !historyItem.report) {
    return null;
  }

  const workItemId = createWorkItemIdFromHistoryItem(historyItem);

  return {
    id: `${workItemId}:analysis_report`,
    workItemId,
    type: 'analysis_report',
    sourceRoute: 'ai_analysis',
    title: 'AI 分析报告',
    summary: '绑定当前采集历史的分析报告',
    payloadRef: `history:${String(historyItem.id)}#analysis`,
    createdAt: historyItem.analysisStatus?.analyzedAt || historyItem.timestamp,
  };
}

function createPromptArtifact(
  historyItem: HistoryItem,
  prompt: GeneratedPromptRecord
): AppCenterArtifactEnvelope {
  const workItemId = createWorkItemIdFromHistoryItem(historyItem);

  return {
    id: `${workItemId}:listing_prompt:${prompt.id}`,
    workItemId,
    type: 'listing_prompt',
    sourceRoute: 'promptlab',
    title: 'Listing Prompt',
    summary: `${prompt.asins.length || historyItem.asins.length} ASIN · ${prompt.marketplace || historyItem.site}`,
    payloadRef: `prompt:${prompt.id}`,
    createdAt: prompt.generatedAt,
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
  return {
    id: context.workItemId || '',
    type: 'competitor_listing',
    title: `${context.marketplace || 'Marketplace'} ${context.asinOrSku || '关键词'} Listing 作业`,
    status: 'review_required',
    marketplace: context.marketplace,
    asinOrSku: context.asinOrSku,
    sourceRoute: context.sourceRoute || 'keyword_hunter_analysis',
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  };
}

function getPpcActionListWorkItemId(
  actionList: AppCenterPpcActionListArtifactInput,
  context: AppCenterWorkspaceContext
): string {
  return context.workItemId || `ppc_review:${actionList.id}`;
}

function getPpcActionListWorkItemType(workItemId: string): AppCenterWorkItemType {
  return workItemId.startsWith('competitor_listing:') ? 'competitor_listing' : 'ppc_review';
}

function createPpcActionListWorkItem(
  actionList: AppCenterPpcActionListArtifactInput,
  context: AppCenterWorkspaceContext
): AppCenterWorkItem {
  const workItemId = getPpcActionListWorkItemId(actionList, context);
  const existing = readWorkItems().find(item => item.id === workItemId);
  const isListingWorkItem = getPpcActionListWorkItemType(workItemId) === 'competitor_listing';

  return {
    id: workItemId,
    type: getPpcActionListWorkItemType(workItemId),
    title: `${context.marketplace || 'PPC'} ${context.asinOrSku || '搜索词'} 动作复核`,
    status:
      isListingWorkItem && existing
        ? existing.status
        : actionList.requiresHumanConfirmation
          ? 'review_required'
          : 'done',
    marketplace: context.marketplace,
    asinOrSku: context.asinOrSku,
    sourceRoute: 'ppc_search_terms',
    createdAt: actionList.createdAt,
    updatedAt: actionList.createdAt,
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

export function registerKeywordSnapshotArtifact(
  snapshot: KeywordHunterSnapshot,
  context: AppCenterWorkspaceContext
): AppCenterArtifactEnvelope | null {
  // Prefer active workspace work item; otherwise bind a local-only work item to the snapshot
  // so pure Keyword Hunter usage still appears in 最近继续 (no cloud / multi-user identity).
  const workItemId =
    context.workItemId ||
    (snapshot.source && 'workItemId' in snapshot.source && snapshot.source.workItemId) ||
    `competitor_listing:keyword_snapshot:${snapshot.id}`;

  const boundContext: AppCenterWorkspaceContext = {
    ...context,
    workItemId,
  };

  upsertWorkItem(createKeywordSnapshotWorkItem(snapshot, boundContext));

  return upsertArtifact({
    id: `${workItemId}:keyword_snapshot:${snapshot.id}`,
    workItemId,
    type: 'keyword_snapshot',
    sourceRoute: context.sourceRoute || 'keyword_hunter_analysis',
    title: snapshot.title,
    summary: `${snapshot.result.keywords.length} 关键词 · 覆盖率 ${snapshot.result.coverageRate}%`,
    payloadRef: `keyword_snapshot:${snapshot.id}`,
    createdAt: snapshot.updatedAt,
  });
}

export function registerPpcActionListArtifact(
  actionList: AppCenterPpcActionListArtifactInput,
  context: AppCenterWorkspaceContext
): AppCenterArtifactEnvelope {
  const workItemId = getPpcActionListWorkItemId(actionList, context);

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

function createComplianceCheckWorkItem(
  input: AppCenterComplianceCheckArtifactInput,
  context: AppCenterWorkspaceContext
): AppCenterWorkItem {
  const workItemId = context.workItemId || `competitor_listing:compliance:${input.id}`;
  const checklistIds = input.checklistIds?.length
    ? input.checklistIds
    : APP_CENTER_COMPLIANCE_CHECKLIST.map(item => item.id);
  const states = createComplianceReviewStates(checklistIds, input.itemStates, input.completedIds);
  const completedCount = Object.values(states).filter(status => status !== 'pending').length;
  const total = checklistIds.length;
  const done = total > 0 && completedCount >= total;

  return {
    id: workItemId,
    type: workItemId.startsWith('ppc_review:') ? 'ppc_review' : 'competitor_listing',
    title: `${context.marketplace || 'Marketplace'} ${context.asinOrSku || '作业'} 合规复核`,
    status: done ? 'done' : 'review_required',
    marketplace: context.marketplace,
    asinOrSku: context.asinOrSku,
    sourceRoute: context.sourceRoute || 'keyword_hunter_analysis',
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
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

  const checklistIds = input.checklistIds?.length
    ? [...input.checklistIds]
    : APP_CENTER_COMPLIANCE_CHECKLIST.map(item => item.id);
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

  return upsertArtifact({
    id: `${workItem.id}:compliance_check:${input.id}`,
    workItemId: workItem.id,
    type: 'compliance_check',
    sourceRoute: context.sourceRoute || 'keyword_hunter_analysis',
    title: '合规复核',
    summary: `${completedCount}/${total} 项已复核${pending > 0 ? ' · 待人工确认' : ' · 已完成'}`,
    payloadRef: `compliance_check:${input.id}`,
    createdAt: input.createdAt,
    metadata: {
      checklistCount: total,
      completedCount,
      requiresHumanConfirmation: pending > 0,
      checklistIds: checklistIds.join(','),
      completedIds: reviewedIds.join(','),
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

  const completedTypes = COMPETITOR_LISTING_PROGRESS_TYPES.filter(type => {
    const artifact = artifacts.find(item => item.type === type);
    if (!artifact) return false;
    if (type !== 'compliance_check') return true;
    return getComplianceReviewView(artifact).complete;
  });
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
  keyword_snapshot: createKeywordSnapshotPayloadLookup,
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
