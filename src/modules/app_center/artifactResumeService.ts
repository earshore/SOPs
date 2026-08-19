import { appStore } from '@/stores/useAppStore';

import {
  APP_CENTER_ARTIFACTS_CHANGED,
  getArtifactPayloadStatus,
  type AppCenterArtifactEnvelope,
  type AppCenterArtifactType,
  type AppCenterWorkItem,
  type ArtifactPayloadResolvers,
  type ArtifactPayloadStatus,
} from './artifactEnvelopeService';
import { queuePromptResume } from './artifactResumeSelection';
import { getComplianceReviewView } from './complianceReviewState';
import { applyListingCopyToKeywordHunter } from './keywordHunterListingHandoff';
import { getListingCopyById } from './listingCopyService';
import {
  createListingPromptWorkflowContext,
  queueDeepChatThreadResume,
  queueListingPromptForDeepChat,
} from './listingWorkflowHandoff';
import { KeywordHunterSnapshotService } from './views/keyword_hunter/services/snapshotService';
import { HistoryService } from './views/master_analysis/services/historyService';
import {
  getPpcActionListSnapshotById,
  queuePpcActionListResume,
} from './views/ppc_tools/ppc_search_terms/export/actionListSnapshotService';
import { setWorkspaceContext, type AppCenterWorkspaceContext } from './workspaceContext';

import type { AppCenterRouteId } from './appCatalog';
import type { GeneratedPromptRecord, HistoryItem } from '@/types/modules-business';

export { APP_CENTER_ARTIFACTS_CHANGED };

export type ResumeMode = 'open' | 'continue';

export type ParsedPayloadRef =
  | { kind: 'history'; id: string; fragment?: string }
  | { kind: 'prompt'; id: string }
  | { kind: 'listing_copy'; id: string }
  | { kind: 'keyword_snapshot'; id: string }
  | { kind: 'ppc_action_list'; id: string }
  | { kind: 'compliance_check'; id: string }
  | { kind: 'unknown'; id: string };

export interface ResumeRestoreTargets {
  historyId?: string;
  snapshotId?: string;
  ppcActionListId?: string;
  complianceCheckId?: string;
  promptId?: string;
  listingCopyId?: string;
}

export interface ResumePlanOk {
  ok: true;
  mode: ResumeMode;
  routeId: string;
  payloadStatus: ArtifactPayloadStatus;
  workspaceUpdates: Partial<AppCenterWorkspaceContext>;
  restore: ResumeRestoreTargets;
  artifact: AppCenterArtifactEnvelope;
}

export interface ResumePlanFail {
  ok: false;
  mode: ResumeMode;
  payloadStatus: ArtifactPayloadStatus;
  reason: string;
  artifact: AppCenterArtifactEnvelope;
}

export type ResumePlan = ResumePlanOk | ResumePlanFail;

export interface ResumeExecuteResult {
  ok: boolean;
  routeId?: string;
  reason?: string;
}

export interface ArtifactResumeActionSpec {
  mode: ResumeMode;
  label: string;
  title: string;
  icon: string;
  primary: boolean;
}

const OPEN_ROUTE_BY_TYPE: Record<AppCenterArtifactType, string> = {
  scrape_history: 'scraper',
  analysis_report: 'ai_analysis',
  listing_prompt: 'promptlab',
  listing_copy: 'playground_deep_chat',
  keyword_snapshot: 'keyword_hunter_process',
  listing_review: 'keyword_hunter_analysis',
  ppc_action_list: 'ppc_search_terms',
  compliance_check: 'keyword_hunter_analysis',
  analysis_running: 'ai_analysis',
};

const NEXT_ROUTE_BY_TYPE: Record<AppCenterArtifactType, string> = {
  scrape_history: 'ai_analysis',
  analysis_report: 'promptlab',
  listing_prompt: 'playground_deep_chat',
  listing_copy: 'keyword_hunter_input',
  keyword_snapshot: 'keyword_hunter_analysis',
  listing_review: 'keyword_hunter_analysis',
  ppc_action_list: 'ppc_search_terms',
  compliance_check: 'sops_restricted_words',
  analysis_running: 'ai_analysis',
};

const RESUME_ACTIONS_BY_TYPE: Record<AppCenterArtifactType, readonly ArtifactResumeActionSpec[]> = {
  scrape_history: [
    {
      mode: 'open',
      label: '查看采集数据',
      title: '恢复并查看这次采集的数据',
      icon: 'fas fa-database',
      primary: false,
    },
    {
      mode: 'continue',
      label: '开始 AI 分析',
      title: '使用这次采集的数据开始 AI 分析',
      icon: 'fas fa-arrow-right',
      primary: true,
    },
  ],
  analysis_report: [
    {
      mode: 'open',
      label: '查看分析报告',
      title: '恢复并查看这份分析报告',
      icon: 'fas fa-chart-line',
      primary: false,
    },
    {
      mode: 'continue',
      label: '生成 Listing Prompt',
      title: '使用这份分析报告生成 Listing Prompt',
      icon: 'fas fa-arrow-right',
      primary: true,
    },
  ],
  listing_prompt: [
    {
      mode: 'open',
      label: '查看此 Prompt',
      title: '恢复并查看这个版本的 Listing Prompt',
      icon: 'fas fa-file-lines',
      primary: false,
    },
    {
      mode: 'continue',
      label: '生成产品文案',
      title: '使用这个 Prompt 在 Deep Chat 生成产品文案',
      icon: 'fas fa-arrow-right',
      primary: true,
    },
  ],
  listing_copy: [
    {
      mode: 'continue',
      label: '复核此产品文案',
      title: '将产品文案与对应 SEO 关键词带入 Keyword Hunter',
      icon: 'fas fa-arrow-right',
      primary: true,
    },
  ],
  keyword_snapshot: [
    {
      mode: 'open',
      label: '查看关键词结果',
      title: '恢复并查看这次关键词复核结果',
      icon: 'fas fa-key',
      primary: false,
    },
    {
      mode: 'continue',
      label: '进行文案评审',
      title: '恢复关键词结果并生成 Listing 文案评审报告',
      icon: 'fas fa-arrow-right',
      primary: true,
    },
  ],
  listing_review: [
    {
      mode: 'open',
      label: '查看文案评审',
      title: '恢复并查看这次 Listing 文案评审报告',
      icon: 'fas fa-file-circle-check',
      primary: false,
    },
    {
      mode: 'continue',
      label: '开始合规复核',
      title: '基于本次文案评审结果开始人工合规复核',
      icon: 'fas fa-arrow-right',
      primary: true,
    },
  ],
  ppc_action_list: [
    {
      mode: 'open',
      label: '查看 PPC 建议',
      title: '恢复本地建议清单并继续人工复核',
      icon: 'fas fa-list-check',
      primary: true,
    },
  ],
  compliance_check: [
    {
      mode: 'open',
      label: '查看合规复核清单',
      title: '查看本地保存的人工合规复核进度',
      icon: 'fas fa-shield-halved',
      primary: false,
    },
    {
      mode: 'continue',
      label: '前往下一项合规检查',
      title: '进入下一项尚未完成的人工合规检查',
      icon: 'fas fa-arrow-right',
      primary: true,
    },
  ],
  analysis_running: [
    {
      mode: 'open',
      label: '查看分析进度',
      title: '回到 AI 分析页查看运行进度与已完成维度',
      icon: 'fas fa-spinner',
      primary: true,
    },
  ],
};

export function getArtifactResumeActions(
  type: AppCenterArtifactType
): readonly ArtifactResumeActionSpec[] {
  return RESUME_ACTIONS_BY_TYPE[type];
}

export function getArtifactOpenRouteId(type: AppCenterArtifactType): string {
  return OPEN_ROUTE_BY_TYPE[type];
}

export function getArtifactNextRouteId(type: AppCenterArtifactType): string {
  return NEXT_ROUTE_BY_TYPE[type];
}

export function parseArtifactPayloadRef(payloadRef: string): ParsedPayloadRef {
  const trimmed = payloadRef.trim();
  if (trimmed.startsWith('history:')) {
    const rest = trimmed.slice('history:'.length);
    const [id, fragment] = rest.split('#');
    return { kind: 'history', id: id || '', fragment: fragment || undefined };
  }
  if (trimmed.startsWith('prompt:')) {
    return { kind: 'prompt', id: trimmed.slice('prompt:'.length) };
  }
  if (trimmed.startsWith('listing_copy:')) {
    return { kind: 'listing_copy', id: trimmed.slice('listing_copy:'.length) };
  }
  if (trimmed.startsWith('keyword_snapshot:')) {
    return {
      kind: 'keyword_snapshot',
      id: trimmed.slice('keyword_snapshot:'.length),
    };
  }
  if (trimmed.startsWith('ppc_action_list:')) {
    return {
      kind: 'ppc_action_list',
      id: trimmed.slice('ppc_action_list:'.length),
    };
  }
  if (trimmed.startsWith('compliance_check:')) {
    return {
      kind: 'compliance_check',
      id: trimmed.slice('compliance_check:'.length),
    };
  }
  return { kind: 'unknown', id: trimmed };
}

function buildRestoreTargets(parsed: ParsedPayloadRef): ResumeRestoreTargets {
  switch (parsed.kind) {
    case 'history':
      return { historyId: parsed.id };
    case 'prompt':
      // Listing prompts live on history items; resume via work item history id when possible.
      return { promptId: parsed.id };
    case 'listing_copy':
      return { listingCopyId: parsed.id };
    case 'keyword_snapshot':
      return { snapshotId: parsed.id };
    case 'ppc_action_list':
      return { ppcActionListId: parsed.id };
    case 'compliance_check':
      return { complianceCheckId: parsed.id };
    default:
      return {};
  }
}

function extractHistoryIdFromWorkItem(workItem: AppCenterWorkItem | null | undefined): string {
  if (!workItem?.id) return '';
  const match = /^competitor_listing:(.+)$/.exec(workItem.id);
  return match?.[1] || '';
}

function createDefaultPayloadResolvers(): ArtifactPayloadResolvers {
  return {
    historyExists: id => Boolean(HistoryService.getById(id)),
    keywordSnapshotExists: id => Boolean(KeywordHunterSnapshotService.getById(id)),
    // Prompt / PPC / compliance envelopes are index-only; treat present envelope as available
    // unless a caller supplies a stricter resolver.
    promptExists: () => true,
    listingCopyExists: id => Boolean(getListingCopyById(id)),
    ppcActionListExists: () => true,
  };
}

function findPromptInHistory(
  history: readonly HistoryItem[],
  promptId: string
): { historyItem: HistoryItem; prompt: GeneratedPromptRecord } | null {
  for (const historyItem of history) {
    const candidates = [
      historyItem.promptResults?.listing,
      historyItem.promptResults?.visual,
      ...(historyItem.promptResults?.history || []),
    ].filter((prompt): prompt is GeneratedPromptRecord => Boolean(prompt));
    const prompt = candidates.find(item => item.id === promptId);
    if (prompt) return { historyItem, prompt };
  }
  return null;
}

const ASYNC_PAYLOAD_STATUS_RESOLVERS: Partial<
  Record<ParsedPayloadRef['kind'], (id: string) => Promise<ArtifactPayloadStatus>>
> = {
  history: async id => ((await HistoryService.getByIdAsync(id)) ? 'available' : 'missing'),
  prompt: async id =>
    findPromptInHistory(await HistoryService.getAllAsync(), id) ? 'available' : 'missing',
  listing_copy: async id => (getListingCopyById(id) ? 'available' : 'missing'),
  keyword_snapshot: async id =>
    (await KeywordHunterSnapshotService.getByIdAsync(id)) ? 'available' : 'missing',
  ppc_action_list: async id => ((await getPpcActionListSnapshotById(id)) ? 'available' : 'missing'),
  compliance_check: async id => (id ? 'available' : 'missing'),
};

export async function resolveResumePayloadStatusAsync(
  artifact: AppCenterArtifactEnvelope
): Promise<ArtifactPayloadStatus> {
  const parsed = parseArtifactPayloadRef(artifact.payloadRef);
  const resolver = ASYNC_PAYLOAD_STATUS_RESOLVERS[parsed.kind];
  return resolver ? resolver(parsed.id) : 'unknown';
}

export function resolveResumePayloadStatus(
  artifact: AppCenterArtifactEnvelope,
  resolvers?: ArtifactPayloadResolvers
): ArtifactPayloadStatus {
  if (artifact.type === 'compliance_check' || artifact.type === 'ppc_action_list') {
    // Index-only artifacts: envelope presence is enough for resume navigation.
    return 'available';
  }

  const merged: ArtifactPayloadResolvers = {
    ...createDefaultPayloadResolvers(),
    ...resolvers,
  };

  // listing_prompt is stored on history; prefer history availability when work item encodes it.
  if (artifact.type === 'listing_prompt') {
    const historyId = artifact.payloadRef.startsWith('prompt:')
      ? ''
      : parseArtifactPayloadRef(artifact.payloadRef).kind === 'history'
        ? (parseArtifactPayloadRef(artifact.payloadRef) as { id: string }).id
        : '';
    if (historyId && merged.historyExists) {
      return merged.historyExists(historyId) ? 'available' : 'missing';
    }
    // Without a history resolver path, prompt envelopes are still navigable via work context.
    return 'available';
  }

  return getArtifactPayloadStatus(artifact, merged);
}

function buildWorkspaceUpdates(
  artifact: AppCenterArtifactEnvelope,
  workItem: AppCenterWorkItem | null | undefined,
  routeId: string
): Partial<AppCenterWorkspaceContext> {
  return {
    workItemId: workItem?.id || artifact.workItemId || null,
    marketplace: (workItem?.marketplace as AppCenterWorkspaceContext['marketplace']) || '',
    asinOrSku: workItem?.asinOrSku || '',
    sourceRoute: routeId,
    language: '',
  };
}

export function buildResumePlan(
  artifact: AppCenterArtifactEnvelope,
  workItem: AppCenterWorkItem | null | undefined,
  mode: ResumeMode,
  resolvers?: ArtifactPayloadResolvers
): ResumePlan {
  const payloadStatus = resolveResumePayloadStatus(artifact, resolvers);
  return createResumePlan(artifact, workItem, mode, payloadStatus);
}

function createResumePlan(
  artifact: AppCenterArtifactEnvelope,
  workItem: AppCenterWorkItem | null | undefined,
  mode: ResumeMode,
  payloadStatus: ArtifactPayloadStatus
): ResumePlan {
  if (payloadStatus === 'missing') {
    return {
      ok: false,
      mode,
      payloadStatus,
      reason: '找不到这项作业的原始数据。请重新生成，或从最近作业中移除该记录。',
      artifact,
    };
  }

  const routeId = resolveResumeRouteId(artifact, mode);
  const restore = resolveRestoreTargets(artifact, workItem);

  return {
    ok: true,
    mode,
    routeId,
    payloadStatus,
    workspaceUpdates: buildWorkspaceUpdates(artifact, workItem, routeId),
    restore,
    artifact,
  };
}

function resolveResumeRouteId(artifact: AppCenterArtifactEnvelope, mode: ResumeMode): string {
  if (mode === 'open') return getArtifactOpenRouteId(artifact.type);
  if (artifact.type === 'compliance_check') {
    return (
      getComplianceReviewView(artifact).nextItem?.routeId || getArtifactNextRouteId(artifact.type)
    );
  }
  return getArtifactNextRouteId(artifact.type);
}

function resolveRestoreTargets(
  artifact: AppCenterArtifactEnvelope,
  workItem: AppCenterWorkItem | null | undefined
): ResumeRestoreTargets {
  const parsed = parseArtifactPayloadRef(artifact.payloadRef);
  const restore = buildRestoreTargets(parsed);
  const historyBound = artifact.type === 'listing_prompt' || artifact.type === 'analysis_report';
  const historyId = extractHistoryIdFromWorkItem(workItem);
  if (!restore.historyId && historyId && historyBound) restore.historyId = historyId;
  if (parsed.kind === 'history') restore.historyId = parsed.id;
  return restore;
}

export async function buildResumePlanAsync(
  artifact: AppCenterArtifactEnvelope,
  workItem: AppCenterWorkItem | null | undefined,
  mode: ResumeMode
): Promise<ResumePlan> {
  const payloadStatus = await resolveResumePayloadStatusAsync(artifact);
  return createResumePlan(artifact, workItem, mode, payloadStatus);
}

function applyHistoryPayload(item: HistoryItem): void {
  const state = appStore.getState();
  state.setCurrentHistoryId(item.id);
  state.setScrapedData(item.data as never);
  state.setSelectedSite(item.site as never);
  state.setTranslatedReport(null);

  if (item.userProductProfile) {
    state.setUserProductProfile(JSON.parse(JSON.stringify(item.userProductProfile)) as never);
  }

  if (item.analysisStatus?.isAnalyzed && item.analysisStatus.analysisReport) {
    state.setAnalysisReport(item.analysisStatus.analysisReport as never);
  } else if (item.report) {
    state.setAnalysisReport(item.report as never);
  } else {
    state.setAnalysisReport(null);
  }
}

async function restoreHistoryPayload(historyId: string): Promise<HistoryItem | null> {
  const item = await HistoryService.getByIdAsync(historyId);
  if (!item) return null;
  applyHistoryPayload(item);
  return item;
}

async function restorePromptPayload(
  promptId: string,
  mode: ResumeMode
): Promise<{ historyItem: HistoryItem; prompt: GeneratedPromptRecord } | null> {
  const selection = findPromptInHistory(await HistoryService.getAllAsync(), promptId);
  if (!selection) return null;

  applyHistoryPayload(selection.historyItem);
  if (mode === 'open') {
    queuePromptResume({
      historyId: selection.historyItem.id,
      prompt: selection.prompt,
    });
  } else {
    queueListingPromptForDeepChat(createListingPromptWorkflowContext(selection.prompt));
  }
  return selection;
}

function restoreListingCopyPayload(listingCopyId: string, mode: ResumeMode): boolean {
  const copy = getListingCopyById(listingCopyId);
  if (!copy) return false;
  if (mode === 'open') queueDeepChatThreadResume(copy.threadId);
  else applyListingCopyToKeywordHunter(copy);
  return true;
}

async function restorePpcActionListPayload(actionListId: string): Promise<boolean> {
  const snapshot = await getPpcActionListSnapshotById(actionListId);
  if (!snapshot) return false;
  queuePpcActionListResume(snapshot);
  return true;
}

async function restoreHistoryTarget(plan: ResumePlanOk): Promise<string> {
  if (plan.restore.promptId) {
    return (await restorePromptPayload(plan.restore.promptId, plan.mode))
      ? ''
      : '找不到这个版本的 Prompt，请从最近作业中移除该记录。';
  }
  if (!plan.restore.historyId) return '';
  return (await restoreHistoryPayload(plan.restore.historyId))
    ? ''
    : '找不到这项作业的原始数据，请重新采集。';
}

async function restoreKeywordTarget(plan: ResumePlanOk): Promise<string> {
  if (!plan.restore.snapshotId) return '';
  return (await KeywordHunterSnapshotService.restoreAsync(plan.restore.snapshotId))
    ? ''
    : '找不到这次关键词结果，请从最近作业中移除该记录。';
}

function restoreListingCopyTarget(plan: ResumePlanOk): string {
  if (!plan.restore.listingCopyId) return '';
  return restoreListingCopyPayload(plan.restore.listingCopyId, plan.mode)
    ? ''
    : '找不到这份产品文案，请从 Deep Chat 重新生成。';
}

async function restorePpcTarget(plan: ResumePlanOk): Promise<string> {
  if (!plan.restore.ppcActionListId) return '';
  return (await restorePpcActionListPayload(plan.restore.ppcActionListId))
    ? ''
    : '找不到这份 PPC 建议清单，请重新导出。';
}

export async function executeResumePlan(plan: ResumePlanOk): Promise<ResumeExecuteResult> {
  try {
    const failureReason =
      (await restoreHistoryTarget(plan)) ||
      restoreListingCopyTarget(plan) ||
      (await restoreKeywordTarget(plan)) ||
      (await restorePpcTarget(plan));
    if (failureReason) return { ok: false, reason: failureReason };

    setWorkspaceContext(plan.workspaceUpdates);

    return { ok: true, routeId: plan.routeId };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : '未能恢复上次内容，请重试。',
    };
  }
}

/** Route ids used by resume that may live outside App Center catalog (SOPS). */
export type ResumeRouteId = AppCenterRouteId | 'sops_restricted_words';
