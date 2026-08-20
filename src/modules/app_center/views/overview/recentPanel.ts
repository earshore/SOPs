import { createSearchBox, type SearchBoxHandle } from '@/common/components/SearchBox';
import eventBus from '@/common/EventBus';
import { navigateToRouteId } from '@/common/router/initRouter';
import { showToast } from '@/common/ui/notifications';
import { copyTextToClipboard } from '@/common/utils/clipboard';
import { StorageService } from '@/services/storageService';

import { createComplianceReviewPanel } from './recentComplianceReview';
import {
  APP_CENTER_ARTIFACTS_CHANGED,
  COMPETITOR_LISTING_PROGRESS_TYPES,
  KEYWORD_REVIEW_PROGRESS_TYPES,
  getAllArtifacts,
  getArtifactsForWorkItem,
  getWorkItemProgress,
  getWorkItemById,
  getWorkItems,
  registerComplianceCheckArtifact,
  type AppCenterArtifactEnvelope,
  type AppCenterArtifactType,
  type ArtifactsChangedPayload,
} from '../../artifactEnvelopeService';
import {
  buildResumePlanAsync,
  executeResumePlan,
  resolveResumePayloadStatusAsync,
  type ResumeMode,
} from '../../artifactResumeService';
import { getComplianceReviewView } from '../../complianceReviewState';
import {
  buildResumeClipboardSummary,
  isGenericArtifactTitle,
  RECENT_ARTIFACT_TYPE_LABELS,
} from '../../recentArtifactPresenter';
import {
  buildRecentQueueItems,
  dismissRecentArtifact,
  markRecentArtifactOpened,
  pinRecentArtifact,
  unpinRecentArtifact,
  undismissRecentArtifact,
  type RecentQueueItem,
  type RecentQueueSortMode,
} from '../../recentQueueService';
import { getAppCenterWorkflowDefinition } from '../../workflowDefinitions';
import { getWorkspaceContext } from '../../workspaceContext';

const RECENT_ARTIFACT_LIMIT = 10;
const PAYLOAD_STATUS_CACHE_TTL = 5_000;
const RECENT_COLUMNS_STORAGE_KEY = 'app_center_overview_recent_columns_v1';
const DEFAULT_RECENT_COLUMNS: RecentColumns = 2;

type RecentColumns = 1 | 2 | 3;

const RECENT_ARTIFACT_ICONS: Record<AppCenterArtifactType, string> = {
  scrape_history: 'fas fa-database',
  analysis_report: 'fas fa-brain',
  listing_prompt: 'fas fa-wand-magic-sparkles',
  listing_copy: 'fas fa-file-pen',
  keyword_snapshot: 'fas fa-key',
  listing_review: 'fas fa-file-circle-check',
  ppc_action_list: 'fas fa-list-check',
  compliance_check: 'fas fa-shield-halved',
  analysis_running: 'fa-solid fa-spinner fa-spin',
};

type RecentJourneyStepState = 'complete' | 'current' | 'upcoming' | 'issue' | 'unavailable';

interface RecentJourneyStep {
  id: string;
  label: string;
  /** Short stage summary shown under the node label in the journey rail. */
  summary: string;
  state: RecentJourneyStepState;
  action:
    | { kind: 'resume'; artifact: AppCenterArtifactEnvelope; mode: ResumeMode }
    | { kind: 'compliance'; artifact: AppCenterArtifactEnvelope | null }
    | null;
}

interface RecentJourney {
  currentLabel: string;
  complete: boolean;
  issueCount: number;
  steps: RecentJourneyStep[];
}

const TYPE_FILTERS: Array<{
  id: AppCenterArtifactType | 'all';
  label: string;
}> = [
  { id: 'all', label: '全部' },
  { id: 'scrape_history', label: '采集' },
  { id: 'analysis_report', label: '分析' },
  { id: 'listing_prompt', label: 'Prompt' },
  { id: 'listing_copy', label: '文案' },
  { id: 'keyword_snapshot', label: '关键词' },
  { id: 'listing_review', label: '文案评审' },
  { id: 'ppc_action_list', label: 'PPC' },
  { id: 'compliance_check', label: '合规' },
];

const STATUS_FILTERS: Array<{
  id: RecentPanelState['statusFilter'];
  label: string;
}> = [
  { id: 'all', label: '全部状态' },
  { id: 'actionable', label: '可查看' },
  { id: 'review', label: '需人工复核' },
  { id: 'missing', label: '数据不可用' },
  { id: 'dismissed', label: '已移除记录' },
];

const SORT_OPTIONS: Array<{ id: RecentQueueSortMode; label: string }> = [
  { id: 'priority', label: '需处理优先' },
  { id: 'activity', label: '最近更新' },
];

interface RecentPanelState {
  typeFilter: AppCenterArtifactType | 'all';
  statusFilter: 'all' | 'actionable' | 'review' | 'missing' | 'dismissed';
  query: string;
  sortMode: RecentQueueSortMode;
  visibleLimit: number;
  columns: RecentColumns;
  showDismissed: boolean;
  lastRemovedQueueId: string;
}

let unsubscribers: Array<() => void> = [];
let renderSequence = 0;
let recentListObserver: IntersectionObserver | null = null;
const openComplianceDialogIds = new Set<string>();
let pendingFocusSelector = '';
let searchDebounceTimer: number | undefined;
const payloadStatusCache = new Map<
  string,
  {
    signature: string;
    checkedAt: number;
    status: RecentQueueItem['payloadStatus'];
  }
>();

function parseRecentColumns(value: string | undefined): RecentColumns | null {
  if (value === '1' || value === '2' || value === '3') {
    return Number(value) as RecentColumns;
  }
  return null;
}

function getStoredRecentColumns(): RecentColumns {
  return (
    parseRecentColumns(StorageService.getRaw(RECENT_COLUMNS_STORAGE_KEY) || undefined) ||
    DEFAULT_RECENT_COLUMNS
  );
}

function applyRecentColumns(
  container: HTMLElement,
  columns: RecentColumns,
  persist: boolean
): void {
  const shell = container.querySelector<HTMLElement>('.app-overview-recent-shell');
  const buttons = container.querySelectorAll<HTMLButtonElement>(
    '.category-filter-btn[data-recent-columns]'
  );

  shell?.setAttribute('data-recent-columns', String(columns));
  buttons.forEach(btn => {
    const isActive = parseRecentColumns(btn.dataset.recentColumns) === columns;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  if (persist) {
    StorageService.setRaw(RECENT_COLUMNS_STORAGE_KEY, String(columns));
  }
}

async function resolveCachedPayloadStatus(
  artifact: AppCenterArtifactEnvelope
): Promise<RecentQueueItem['payloadStatus']> {
  const signature = `${artifact.payloadRef}:${artifact.updatedAt || artifact.createdAt}`;
  const cached = payloadStatusCache.get(artifact.id);
  if (
    cached &&
    cached.signature === signature &&
    Date.now() - cached.checkedAt < PAYLOAD_STATUS_CACHE_TTL
  ) {
    return cached.status;
  }
  const status = await resolveResumePayloadStatusAsync(artifact);
  payloadStatusCache.set(artifact.id, {
    signature,
    checkedAt: Date.now(),
    status,
  });
  return status;
}

async function getQueueItems(
  state: RecentPanelState
): Promise<{ items: RecentQueueItem[]; total: number }> {
  const artifacts = getAllArtifacts();
  const workItems = getWorkItems();
  const payloadStatuses = Object.fromEntries(
    await Promise.all(
      artifacts.map(async artifact => [artifact.id, await resolveCachedPayloadStatus(artifact)])
    )
  );
  const allItems = buildRecentQueueItems(artifacts, workItems, {
    typeFilter: state.typeFilter,
    statusFilter: state.statusFilter,
    payloadStatuses,
    query: state.query,
    collapseStagesByWorkItem: true,
    includeDismissed: state.showDismissed,
    dismissedOnly: state.showDismissed,
    sortMode: state.sortMode,
    limit: Number.MAX_SAFE_INTEGER,
  });
  return {
    items: allItems.slice(0, state.visibleLimit),
    total: allItems.length,
  };
}

async function handleResume(
  item: RecentQueueItem,
  artifact: AppCenterArtifactEnvelope,
  mode: ResumeMode
): Promise<void> {
  const workItem = item.workItem || getWorkItemById(artifact.workItemId);
  const plan = await buildResumePlanAsync(artifact, workItem, mode);

  if (!plan.ok) return showToast(plan.reason, { type: 'warning' });

  const result = await executeResumePlan(plan);
  if (!result.ok) return showToast(result.reason || '恢复作业失败', { type: 'error' });

  const didNavigate = await navigateToRouteId(plan.routeId);
  if (!didNavigate) return showToast('未能进入对应作业阶段，请重试。', { type: 'error' });

  markRecentArtifactOpened(item.queueId);
}

async function handleCopySummary(item: RecentQueueItem): Promise<void> {
  const text = buildResumeClipboardSummary(item.artifact, item.workItem);
  const ok = await copyTextToClipboard(text);
  showToast(ok ? '已复制作业摘要' : '未能复制，请重试。', {
    type: ok ? 'success' : 'error',
  });
}

function createIcon(className: string): HTMLElement {
  const icon = document.createElement('i');
  icon.className = className;
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

function createToolbarButton(options: {
  className: string;
  label: string;
  title: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  ariaControls?: string;
  iconOnly?: boolean;
}): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = options.className;
  button.title = options.title;
  button.setAttribute('aria-label', options.label);
  if (options.ariaPressed !== undefined) {
    button.setAttribute('aria-pressed', String(options.ariaPressed));
  }
  if (options.ariaExpanded !== undefined) {
    button.setAttribute('aria-expanded', String(options.ariaExpanded));
  }
  if (options.ariaControls) button.setAttribute('aria-controls', options.ariaControls);
  if (options.disabled) button.disabled = true;
  button.append(createIcon(options.icon));
  const span = document.createElement('span');
  span.textContent = options.label;
  if (options.iconOnly) span.className = 'sr-only';
  button.append(span);
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    options.onClick();
  });
  return button;
}

function createGroupHeader(item: RecentQueueItem): HTMLElement {
  const header = document.createElement('div');
  header.className = 'app-overview-recent-group-header';
  header.setAttribute('role', 'presentation');

  const title = document.createElement('strong');
  title.textContent = item.groupTitle || item.presentation.primaryTitle;

  header.append(title);
  return header;
}

function createRecentMetaRow(item: RecentQueueItem): HTMLElement {
  const { presentation } = item;
  const metaRow = document.createElement('div');
  metaRow.className = 'app-overview-recent-meta-row';

  const typeChip = document.createElement('span');
  typeChip.className = 'app-overview-recent-type';
  typeChip.textContent = presentation.typeLabel;

  metaRow.append(typeChip);

  if (item.needsAttention) {
    const badge = document.createElement('span');
    badge.className = 'app-overview-recent-attention-badge';
    badge.textContent = '需人工复核';
    metaRow.append(badge);
  }

  if (item.hasMissingPayload) {
    const missingBadge = document.createElement('span');
    missingBadge.className = 'app-overview-recent-missing-badge';
    missingBadge.textContent =
      item.payloadStatus === 'missing' ? '当前阶段数据不可用' : '部分历史数据不可用';
    metaRow.append(missingBadge);
  }

  return metaRow;
}

function createRecentTime(item: RecentQueueItem): HTMLTimeElement {
  const { artifact, presentation } = item;
  const time = document.createElement('time');
  time.className = presentation.isFresh
    ? 'app-overview-recent-time app-overview-recent-time--fresh'
    : 'app-overview-recent-time';
  time.dateTime = artifact.updatedAt || artifact.createdAt;
  time.textContent = presentation.relativeTime || presentation.absoluteTime;
  if (presentation.relativeTime && presentation.absoluteTime) {
    time.setAttribute('title', presentation.absoluteTime);
  }
  if (!presentation.relativeTime && !presentation.absoluteTime) time.classList.add('hidden');
  return time;
}

function clipStageSummary(text: string, max = 64): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function pushMetaString(
  parts: string[],
  value: string | number | boolean | undefined,
  format: (text: string) => string = text => text
): void {
  if (typeof value !== 'string') return;
  const text = value.trim();
  if (text) parts.push(format(text));
}

function pushMetaCount(
  parts: string[],
  value: string | number | boolean | undefined,
  suffix: string
): void {
  if (typeof value === 'number' && value > 0) parts.push(`${value}${suffix}`);
}

function formatScrapeStageSummary(meta: Record<string, string | number | boolean>): string {
  const parts: string[] = [];
  pushMetaString(parts, meta.marketplace);
  pushMetaCount(parts, meta.asinCount, '个ASIN');
  pushMetaString(parts, meta.dataSource);
  return parts.join(' · ');
}

function formatAnalysisStageSummary(meta: Record<string, string | number | boolean>): string {
  const parts: string[] = [];
  pushMetaCount(parts, meta.asinCount, '个ASIN');
  pushMetaCount(parts, meta.dimensionCount, '个分析维度');
  if (
    typeof meta.overallConfidencePercent === 'number' &&
    Number.isFinite(meta.overallConfidencePercent)
  ) {
    parts.push(`${Math.round(meta.overallConfidencePercent)}%置信度`);
  }
  return parts.join(' · ');
}

function formatListingCopyStageSummary(meta: Record<string, string | number | boolean>): string {
  const parts: string[] = [];
  if (typeof meta.keywordCount === 'number') parts.push(`${meta.keywordCount}个SEO关键词`);
  pushMetaString(parts, meta.model);
  return parts.join(' · ');
}

function formatKeywordStageSummary(meta: Record<string, string | number | boolean>): string {
  const parts: string[] = [];
  if (typeof meta.keywordCount === 'number') parts.push(`${meta.keywordCount}个关键词`);
  if (typeof meta.matchedCount === 'number') parts.push(`${meta.matchedCount}个命中`);
  if (typeof meta.unmatchedCount === 'number') parts.push(`${meta.unmatchedCount}个未命中`);
  return parts.join(' · ');
}

function formatListingReviewStageSummary(meta: Record<string, string | number | boolean>): string {
  const parts: string[] = [];
  pushMetaString(parts, meta.grade);
  if (typeof meta.score === 'number') parts.push(`${meta.score}/100`);
  pushMetaString(parts, meta.model);
  return parts.join(' · ');
}

/** Build a live one-line caption from metadata first, then artifact.summary. */
function formatStageSummaryFromMetadata(stageArtifact: AppCenterArtifactEnvelope): string {
  const meta = stageArtifact.metadata || {};
  const formatters: Partial<
    Record<AppCenterArtifactType, (m: Record<string, string | number | boolean>) => string>
  > = {
    scrape_history: formatScrapeStageSummary,
    analysis_report: formatAnalysisStageSummary,
    listing_prompt: m =>
      typeof m.strategy === 'string' && m.strategy.trim() ? m.strategy.trim() : '默认策略',
    listing_copy: formatListingCopyStageSummary,
    keyword_snapshot: formatKeywordStageSummary,
    listing_review: formatListingReviewStageSummary,
  };
  return formatters[stageArtifact.type]?.(meta) || '';
}

function formatComplianceStageSummary(
  stageArtifact: AppCenterArtifactEnvelope,
  issueCount?: number
): string {
  const review = getComplianceReviewView(stageArtifact);
  if (issueCount && issueCount > 0) {
    return `发现 ${issueCount} 项问题 · 已复核 ${review.reviewedCount}/${review.totalCount}`;
  }
  return stageArtifact.summary?.trim() || `已复核 ${review.reviewedCount}/${review.totalCount} 项`;
}

function formatArtifactFallbackSummary(
  state: RecentJourneyStepState,
  stageArtifact: AppCenterArtifactEnvelope
): string {
  const fromMeta = formatStageSummaryFromMetadata(stageArtifact);
  if (fromMeta) return clipStageSummary(fromMeta);
  if (stageArtifact.summary?.trim()) return clipStageSummary(stageArtifact.summary);
  const typeLabel = RECENT_ARTIFACT_TYPE_LABELS[stageArtifact.type];
  if (stageArtifact.title?.trim() && !isGenericArtifactTitle(stageArtifact.title, typeLabel)) {
    return stageArtifact.title.trim();
  }
  if (state === 'complete') return '已完成';
  if (state === 'current') return '进行中';
  return '';
}

/** Prefer real artifact metrics / summary / title; never invent workflow prose. */
function getLiveStageSummary(
  state: RecentJourneyStepState,
  stageArtifact: AppCenterArtifactEnvelope | null,
  options?: { issueCount?: number }
): string {
  if (state === 'unavailable') return '本地数据不可用';
  if (state === 'upcoming') return '';
  if (stageArtifact?.type === 'compliance_check') {
    return formatComplianceStageSummary(stageArtifact, options?.issueCount);
  }
  if (!stageArtifact) return state === 'current' ? '待开始' : '';
  return formatArtifactFallbackSummary(state, stageArtifact);
}

function resolvePpcReviewState(unavailable: boolean, complete: boolean): RecentJourneyStepState {
  if (unavailable) return 'unavailable';
  return complete ? 'complete' : 'current';
}

function getPpcJourney(item: RecentQueueItem): RecentJourney {
  const progress = getWorkItemProgress(item.artifact.workItemId);
  const complete = progress.completedSteps >= progress.totalSteps;
  const unavailable = item.payloadStatus === 'missing';
  const reviewState = resolvePpcReviewState(unavailable, complete);
  const live = getLiveStageSummary(reviewState, item.artifact);
  const openAction = unavailable
    ? null
    : ({ kind: 'resume', artifact: item.artifact, mode: 'open' } as const);
  const suggestionSummary = live || item.artifact.summary?.trim() || '已生成动作候选';
  const reviewSummary = live || (complete ? '复核完成' : '待确认否词/收割等动作');

  return {
    currentLabel: complete ? '全部完成' : '人工复核',
    complete,
    issueCount: 0,
    steps: [
      {
        id: 'suggestions',
        label: '生成建议',
        summary: unavailable ? '本地数据不可用' : suggestionSummary,
        state: unavailable ? 'unavailable' : 'complete',
        action: openAction,
      },
      {
        id: 'manual_review',
        label: '人工复核',
        summary: unavailable ? '本地数据不可用' : reviewSummary,
        state: reviewState,
        action: openAction,
      },
    ],
  };
}

function getSequentialJourney(
  item: RecentQueueItem,
  workflowId: 'competitor_listing' | 'keyword_review',
  progressTypes: readonly AppCenterArtifactType[]
): RecentJourney {
  const workflow = getAppCenterWorkflowDefinition(workflowId);
  const progress = getWorkItemProgress(item.artifact.workItemId);
  const artifacts = getArtifactsForWorkItem(item.artifact.workItemId);

  const lastType = progressTypes.length > 0 ? progressTypes[progressTypes.length - 1] : undefined;
  const complete = Boolean(lastType && progress.completedTypes.includes(lastType));
  const resolvedCurrentIndex = Math.min(progress.completedTypes.length, workflow.steps.length - 1);
  const complianceArtifact = artifacts.find(artifact => artifact.type === 'compliance_check');
  const complianceReached = resolvedCurrentIndex === workflow.steps.length - 1;
  const issueCount =
    complianceArtifact && complianceReached
      ? getComplianceReviewView(complianceArtifact).issueCount
      : 0;

  return {
    currentLabel:
      issueCount > 0
        ? `合规复核发现 ${issueCount} 项问题`
        : complete
          ? '全部完成'
          : workflow.steps[resolvedCurrentIndex]?.title || workflow.steps[0]?.title || '数据采集',
    complete,
    issueCount,
    steps: workflow.steps.map((step, index) => {
      let state: RecentJourneyStepState = complete
        ? 'complete'
        : index < resolvedCurrentIndex
          ? 'complete'
          : index === resolvedCurrentIndex
            ? 'current'
            : 'upcoming';
      const stageType = progressTypes[index];
      const stageArtifact = artifacts.find(artifact => artifact.type === stageType) || null;
      const previousType = progressTypes[index - 1];
      const previousArtifact = artifacts.find(artifact => artifact.type === previousType);
      const action = getJourneyStepAction(
        stageType,
        state,
        stageArtifact,
        previousArtifact,
        item.stagePayloadStatuses
      );
      if (stageType === 'compliance_check' && issueCount > 0 && complete) state = 'issue';
      else if (state !== 'upcoming' && action === null) state = 'unavailable';
      return {
        id: step.id,
        label: step.title,
        summary: getLiveStageSummary(state, stageArtifact, { issueCount }),
        state,
        action,
      };
    }),
  };
}

function getJourneyStepAction(
  stageType: AppCenterArtifactType | undefined,
  state: RecentJourneyStepState,
  stageArtifact: AppCenterArtifactEnvelope | null,
  previousArtifact: AppCenterArtifactEnvelope | undefined,
  payloadStatuses: Readonly<Record<string, 'available' | 'missing' | 'unknown'>>
): RecentJourneyStep['action'] {
  if (stageType === 'compliance_check' && state !== 'upcoming') {
    return { kind: 'compliance', artifact: stageArtifact };
  }
  if (state === 'complete' && stageArtifact) {
    if (payloadStatuses[stageArtifact.id] === 'missing') return null;
    return { kind: 'resume', artifact: stageArtifact, mode: 'open' };
  }
  if (state === 'current' && previousArtifact) {
    if (payloadStatuses[previousArtifact.id] === 'missing') return null;
    return { kind: 'resume', artifact: previousArtifact, mode: 'continue' };
  }
  return null;
}

function getJourneyStepAriaLabel(step: RecentJourneyStep): string {
  if (step.state === 'unavailable') return `${step.label}，本地数据不可用`;
  if (step.state === 'issue') return `${step.label}，发现待处理问题`;
  if (step.action?.kind === 'compliance') {
    return `${step.action.artifact ? '查看' : '开始'}合规复核，${step.state === 'complete' ? '已完成' : '当前阶段'}`;
  }
  if (step.state === 'complete') return `查看本次${step.label}阶段结果，已完成`;
  if (step.state === 'current') return `开始${step.label}，当前阶段`;
  return `${step.label}，尚未到达`;
}

function createJourneyStepButton(
  step: RecentJourneyStep,
  item: RecentQueueItem,
  compliancePanelId: string,
  onCompliance: (artifact: AppCenterArtifactEnvelope | null) => void
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'app-overview-recent-journey-button';
  button.disabled = step.action === null;
  button.title = getJourneyStepAriaLabel(step);
  button.setAttribute('aria-label', button.title);
  if (step.action?.kind === 'compliance') {
    button.setAttribute('aria-controls', compliancePanelId);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute(
      'aria-expanded',
      String(Boolean(step.action.artifact && openComplianceDialogIds.has(step.action.artifact.id)))
    );
  }
  button.addEventListener('click', () => {
    if (step.action?.kind === 'compliance') {
      onCompliance(step.action.artifact);
    } else if (step.action?.kind === 'resume') {
      button.disabled = true;
      void handleResume(item, step.action.artifact, step.action.mode).finally(() => {
        if (button.isConnected) button.disabled = false;
      });
    }
  });

  const marker = document.createElement('span');
  marker.className = 'app-overview-recent-journey-marker';
  marker.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.className = 'app-overview-recent-journey-text';

  const label = document.createElement('span');
  label.className = 'app-overview-recent-journey-label';
  label.textContent = step.label;
  text.append(label);

  if (step.summary.trim()) {
    const summary = document.createElement('span');
    summary.className = 'app-overview-recent-journey-summary';
    summary.textContent = step.summary.trim();
    text.append(summary);
  }

  button.append(marker, text);
  return button;
}

function getRecentJourney(item: RecentQueueItem): RecentJourney {
  if (item.workItem?.type === 'ppc_review' || item.artifact.type === 'ppc_action_list') {
    return getPpcJourney(item);
  }
  if (item.workItem?.type === 'keyword_review') {
    return getSequentialJourney(item, 'keyword_review', KEYWORD_REVIEW_PROGRESS_TYPES);
  }
  return getSequentialJourney(item, 'competitor_listing', COMPETITOR_LISTING_PROGRESS_TYPES);
}

function createRecentJourney(
  item: RecentQueueItem,
  compliancePanelId: string,
  onCompliance: (artifact: AppCenterArtifactEnvelope | null) => void
): HTMLElement | null {
  if (item.workItem?.type === 'npi_reference') return null;
  const journey = getRecentJourney(item);

  const container = document.createElement('div');
  container.className = 'app-overview-recent-journey';
  if (journey.issueCount > 0) container.classList.add('app-overview-recent-journey--issue');
  if (journey.steps.length <= 2) {
    container.classList.add('app-overview-recent-journey--short');
  }
  container.setAttribute(
    'aria-label',
    journey.issueCount > 0
      ? `作业链路：${journey.currentLabel}`
      : journey.complete
        ? '作业链路：全部完成'
        : `作业链路：当前位于${journey.currentLabel}`
  );

  const heading = document.createElement('div');
  heading.className = 'app-overview-recent-journey-heading';
  const title = document.createElement('span');
  title.textContent = '作业链路';
  const current = document.createElement('span');
  current.className = 'app-overview-recent-journey-current';
  current.textContent =
    journey.issueCount > 0
      ? journey.currentLabel
      : journey.complete
        ? '全部完成'
        : `当前：${journey.currentLabel}`;
  heading.append(title, current);

  const steps = document.createElement('ol');
  steps.className = 'app-overview-recent-journey-steps';
  steps.style.setProperty('--app-recent-journey-steps', String(journey.steps.length));
  journey.steps.forEach(step => {
    const stepEl = document.createElement('li');
    stepEl.className = `app-overview-recent-journey-step app-overview-recent-journey-step--${step.state}`;
    if (step.state === 'current') stepEl.setAttribute('aria-current', 'step');

    stepEl.append(createJourneyStepButton(step, item, compliancePanelId, onCompliance));
    steps.append(stepEl);
  });

  container.append(heading, steps);
  return container;
}

function createRecentUtilityActions(
  item: RecentQueueItem,
  onRemoved: (queueId: string) => void
): HTMLElement[] {
  const { queueId } = item;
  return [
    createToolbarButton({
      className: `app-overview-recent-icon-btn app-overview-recent-card-tool${
        item.pinned ? ' active' : ''
      }`,
      label: item.pinned ? '取消置顶' : '置顶',
      title: item.pinned ? '取消置顶' : '置顶到最近作业顶部',
      icon: 'fa-solid fa-thumb-tack',
      iconOnly: true,
      ariaPressed: item.pinned,
      onClick: () => {
        if (item.pinned) unpinRecentArtifact(queueId);
        else pinRecentArtifact(queueId);
      },
    }),
    createToolbarButton({
      className: 'app-overview-recent-icon-btn app-overview-recent-card-tool',
      label: '复制摘要',
      title: '复制作业摘要到剪贴板',
      icon: 'fas fa-copy',
      iconOnly: true,
      onClick: () => {
        void handleCopySummary(item);
      },
    }),
    createToolbarButton(
      item.dismissed
        ? {
            className: 'app-overview-recent-icon-btn app-overview-recent-card-tool',
            label: '恢复到列表',
            title: '恢复到最近作业列表',
            icon: 'fas fa-rotate-left',
            iconOnly: true,
            onClick: () => {
              undismissRecentArtifact(queueId);
              showToast('已恢复到最近作业', { type: 'success' });
            },
          }
        : {
            className:
              'app-overview-recent-icon-btn app-overview-recent-card-tool app-overview-recent-icon-btn--danger',
            label: '从列表移除',
            title: '从最近作业列表移除，可立即撤销',
            icon: 'fas fa-eye-slash',
            iconOnly: true,
            onClick: () => {
              onRemoved(queueId);
              dismissRecentArtifact(queueId);
            },
          }
    ),
  ];
}

const recentToolsAutoCloseTimers = new WeakMap<HTMLElement, number>();
const recentToolsHoverOpenTimers = new WeakMap<HTMLElement, number>();
/** Match native tooltip-ish feel; don't flash tray on accidental hover. */
const RECENT_TOOLS_HOVER_OPEN_DELAY_MS = 320;
const RECENT_TOOLS_AUTO_CLOSE_MS = 1500;

function clearRecentCardToolsTimer(tools: HTMLElement): void {
  const timer = recentToolsAutoCloseTimers.get(tools);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    recentToolsAutoCloseTimers.delete(tools);
  }
}

function clearRecentCardToolsHoverOpenTimer(tools: HTMLElement): void {
  const timer = recentToolsHoverOpenTimers.get(tools);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    recentToolsHoverOpenTimers.delete(tools);
  }
}

function closeRecentCardTools(tools: HTMLElement, moreBtn: HTMLButtonElement): void {
  clearRecentCardToolsTimer(tools);
  clearRecentCardToolsHoverOpenTimer(tools);
  tools.classList.remove('is-open');
  moreBtn.setAttribute('aria-expanded', 'false');
}

function scheduleRecentCardToolsAutoClose(tools: HTMLElement, moreBtn: HTMLButtonElement): void {
  clearRecentCardToolsTimer(tools);
  const timer = window.setTimeout(() => {
    closeRecentCardTools(tools, moreBtn);
  }, RECENT_TOOLS_AUTO_CLOSE_MS);
  recentToolsAutoCloseTimers.set(tools, timer);
}

function scheduleRecentCardToolsHoverOpen(tools: HTMLElement, moreBtn: HTMLButtonElement): void {
  clearRecentCardToolsHoverOpenTimer(tools);
  if (tools.classList.contains('is-open')) {
    clearRecentCardToolsTimer(tools);
    return;
  }
  const timer = window.setTimeout(() => {
    recentToolsHoverOpenTimers.delete(tools);
    // Still hovering when delay elapses.
    if (!tools.matches(':hover')) return;
    openRecentCardTools(tools, moreBtn);
  }, RECENT_TOOLS_HOVER_OPEN_DELAY_MS);
  recentToolsHoverOpenTimers.set(tools, timer);
}

function openRecentCardTools(
  tools: HTMLElement,
  moreBtn: HTMLButtonElement,
  options?: { scheduleClose?: boolean }
): void {
  clearRecentCardToolsHoverOpenTimer(tools);
  // Close other open trays so only one reveals at a time.
  document
    .querySelectorAll<HTMLElement>('.app-overview-recent-card-tools.is-open')
    .forEach(open => {
      if (open === tools) return;
      const otherMore = open.querySelector<HTMLButtonElement>(
        '.app-overview-recent-card-tools-more'
      );
      if (otherMore) closeRecentCardTools(open, otherMore);
    });

  tools.classList.add('is-open');
  moreBtn.setAttribute('aria-expanded', 'true');
  // Stay open while pointer is over the icon area; only leave starts the timer.
  clearRecentCardToolsTimer(tools);
  if (options?.scheduleClose) {
    scheduleRecentCardToolsAutoClose(tools, moreBtn);
  }
}

function createRecentCardCorner(
  item: RecentQueueItem,
  onRemoved: (queueId: string) => void
): HTMLElement {
  const corner = document.createElement('div');
  corner.className = 'app-overview-recent-card-corner';

  const tools = document.createElement('div');
  tools.className = 'app-overview-recent-card-tools';

  const tray = document.createElement('div');
  tray.className = 'app-overview-recent-card-tools-tray';
  tray.setAttribute('role', 'group');
  tray.setAttribute('aria-label', '作业快捷操作');

  const buttons = createRecentUtilityActions(item, onRemoved);
  buttons.forEach(button => {
    button.dataset.tooltip = button.getAttribute('aria-label') || '';
  });
  tray.append(...buttons);

  const moreBtn = document.createElement('button');
  moreBtn.type = 'button';
  moreBtn.className = 'app-overview-recent-icon-btn app-overview-recent-card-tools-more';
  moreBtn.setAttribute('aria-label', '展开快捷操作');
  moreBtn.setAttribute('aria-expanded', 'false');
  moreBtn.setAttribute('aria-haspopup', 'true');
  moreBtn.title = '快捷操作';
  moreBtn.dataset.tooltip = '快捷操作';
  const moreIcon = document.createElement('i');
  moreIcon.className = 'fas fa-ellipsis';
  moreIcon.setAttribute('aria-hidden', 'true');
  moreBtn.append(moreIcon);

  moreBtn.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (tools.classList.contains('is-open')) {
      closeRecentCardTools(tools, moreBtn);
      return;
    }
    openRecentCardTools(tools, moreBtn);
  });

  // Hover: delayed open (like native tooltips). Click on ··· stays instant.
  tools.addEventListener('pointerenter', () => {
    scheduleRecentCardToolsHoverOpen(tools, moreBtn);
  });
  tools.addEventListener('pointerleave', () => {
    clearRecentCardToolsHoverOpenTimer(tools);
    if (!tools.classList.contains('is-open')) return;
    scheduleRecentCardToolsAutoClose(tools, moreBtn);
  });
  tools.addEventListener(
    'focusout',
    () => {
      window.requestAnimationFrame(() => {
        if (!tools.classList.contains('is-open')) return;
        // Keep open while focus remains inside the tools cluster.
        if (tools.contains(document.activeElement)) {
          clearRecentCardToolsTimer(tools);
          return;
        }
        scheduleRecentCardToolsAutoClose(tools, moreBtn);
      });
    },
    true
  );

  tools.append(tray, moreBtn);
  corner.append(tools, createRecentTime(item));
  return corner;
}

function getComplianceArtifact(item: RecentQueueItem): AppCenterArtifactEnvelope | null {
  return (
    getArtifactsForWorkItem(item.artifact.workItemId).find(
      artifact => artifact.type === 'compliance_check'
    ) || null
  );
}

function getComplianceDialogId(workItemId: string): string {
  return `app-overview-compliance-dialog-${workItemId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function showComplianceDialogElement(dialog: HTMLDialogElement): void {
  if (dialog.open) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeComplianceDialogElement(dialog: HTMLDialogElement): void {
  if (typeof dialog.close === 'function') dialog.close();
  else {
    dialog.removeAttribute('open');
    dialog.dispatchEvent(new Event('close'));
  }
}

function openComplianceDialog(
  el: HTMLElement,
  artifact: AppCenterArtifactEnvelope,
  dialogId: string
): void {
  const dialog = el.querySelector<HTMLDialogElement>(`#${dialogId}`);
  if (!dialog) return;
  openComplianceDialogIds.add(artifact.id);
  el.querySelector<HTMLButtonElement>(`[aria-controls="${dialogId}"]`)?.setAttribute(
    'aria-expanded',
    'true'
  );
  showComplianceDialogElement(dialog);
}

function createComplianceArtifact(item: RecentQueueItem): AppCenterArtifactEnvelope | null {
  const currentContext = getWorkspaceContext();
  const sourceArtifact =
    getArtifactsForWorkItem(item.artifact.workItemId).find(
      artifact => artifact.type === 'listing_review'
    ) || item.artifact;
  const snapshotId = sourceArtifact.payloadRef.replace(/^keyword_snapshot:/, '');
  const createdAt = new Date().toISOString();
  return registerComplianceCheckArtifact(
    {
      id: `review-${snapshotId}`,
      createdAt,
      updatedAt: createdAt,
      note: '基于已完成的文案评审进行人工合规复核',
    },
    {
      ...currentContext,
      workItemId: item.artifact.workItemId,
      marketplace: (item.workItem?.marketplace || currentContext.marketplace || '') as never,
      asinOrSku: item.workItem?.asinOrSku || currentContext.asinOrSku,
      sourceRoute: 'keyword_hunter_analysis',
    }
  );
}

function handleComplianceNode(
  item: RecentQueueItem,
  artifact: AppCenterArtifactEnvelope | null,
  el: HTMLElement,
  panelId: string,
  onRefresh: () => void
): void {
  if (artifact) {
    openComplianceDialog(el, artifact, panelId);
    return;
  }

  const created = createComplianceArtifact(item);
  if (!created) {
    showToast('未能创建本地合规复核清单，请重试。', { type: 'error' });
    return;
  }
  openComplianceDialogIds.add(created.id);
  onRefresh();
}

/** Keep card body dense but light — detail lives in the journey rail. */
const RECENT_BODY_FACT_LIMIT = 2;

function createRecentCardBody(item: RecentQueueItem): HTMLElement {
  const { presentation } = item;
  const body = document.createElement('div');
  body.className = 'app-overview-recent-body';
  body.append(createRecentMetaRow(item));

  const denseFacts = presentation.facts.slice(0, RECENT_BODY_FACT_LIMIT);
  const workContext = presentation.primaryTitle.trim();

  // Primary line: live metrics. Secondary line: marketplace / ASIN work context.
  const title = document.createElement('strong');
  title.className = 'app-overview-recent-title';
  title.textContent =
    denseFacts.length > 0 ? denseFacts.join(' · ') : workContext || presentation.typeLabel;
  body.append(title);

  if (denseFacts.length === 0 || !workContext) return body;

  const facts = document.createElement('div');
  facts.className = 'app-overview-recent-facts';
  facts.setAttribute('aria-label', '作业上下文');
  const fact = document.createElement('span');
  fact.className = 'app-overview-recent-fact';
  fact.textContent = workContext;
  facts.append(fact);
  body.append(facts);
  return body;
}

function createComplianceDialog(
  el: HTMLElement,
  item: RecentQueueItem,
  artifact: AppCenterArtifactEnvelope,
  dialogId: string
): HTMLDialogElement {
  const dialog = document.createElement('dialog');
  dialog.id = dialogId;
  dialog.className = 'app-overview-compliance-dialog';
  dialog.setAttribute('aria-labelledby', `${dialogId}-title`);
  if (openComplianceDialogIds.has(artifact.id)) dialog.dataset.autoOpen = 'true';

  const surface = document.createElement('div');
  surface.className = 'app-overview-compliance-dialog-surface';
  const header = document.createElement('header');
  header.className = 'app-overview-compliance-dialog-header';
  const heading = document.createElement('div');
  const title = document.createElement('h3');
  title.id = `${dialogId}-title`;
  title.textContent = '合规复核';
  const context = document.createElement('p');
  context.textContent = item.presentation.primaryTitle;
  heading.append(title, context);
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'app-overview-compliance-dialog-close';
  closeButton.setAttribute('aria-label', '关闭合规复核窗口');
  closeButton.title = '关闭合规复核窗口';
  closeButton.append(createIcon('fas fa-xmark'));
  closeButton.addEventListener('click', () => closeComplianceDialogElement(dialog));
  header.append(heading, closeButton);

  const panel = createComplianceReviewPanel(artifact, item.workItem, true, itemId => {
    pendingFocusSelector = itemId ? `#${dialogId} [data-compliance-item-id="${itemId}"]` : '';
  });
  panel.id = `${dialogId}-panel`;
  surface.append(header, panel);
  dialog.append(surface);
  dialog.addEventListener('close', () => {
    openComplianceDialogIds.delete(artifact.id);
    el.querySelector<HTMLButtonElement>(`[aria-controls="${dialogId}"]`)?.setAttribute(
      'aria-expanded',
      'false'
    );
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeComplianceDialogElement(dialog);
  });
  return dialog;
}

function appendComplianceDialog(
  el: HTMLElement,
  item: RecentQueueItem,
  artifact: AppCenterArtifactEnvelope | null,
  dialogId: string
): void {
  if (!artifact) return;
  el.append(createComplianceDialog(el, item, artifact, dialogId));
}

function buildRecentCardAriaLabel(item: RecentQueueItem, missing: boolean): string {
  const { presentation } = item;
  return [
    presentation.typeLabel,
    presentation.primaryTitle,
    ...presentation.facts,
    presentation.relativeTime || presentation.absoluteTime,
    missing ? '部分作业数据不可用' : '',
    item.needsAttention ? '需人工复核' : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

function createRecentArtifactItem(
  item: RecentQueueItem,
  onRefresh: () => void,
  onRemoved: (queueId: string) => void
): HTMLElement {
  const { artifact } = item;
  const missing = item.hasMissingPayload;

  const el = document.createElement('article');
  el.className = `app-overview-recent-item app-overview-recent-item--${artifact.type}`;
  if (item.pinned) el.classList.add('app-overview-recent-item--pinned');
  if (item.needsAttention) el.classList.add('app-overview-recent-item--attention');
  if (missing) el.classList.add('app-overview-recent-item--missing');
  el.dataset.workItemId = artifact.workItemId;
  el.dataset.artifactType = artifact.type;
  el.dataset.artifactId = artifact.id;
  el.setAttribute('role', 'listitem');
  const complianceArtifact = getComplianceArtifact(item);
  const complianceDialogId = getComplianceDialogId(artifact.workItemId);

  const iconBox = document.createElement('span');
  iconBox.className = 'app-overview-recent-icon';
  iconBox.setAttribute('aria-hidden', 'true');
  iconBox.append(createIcon(RECENT_ARTIFACT_ICONS[artifact.type]));

  el.append(iconBox, createRecentCardBody(item), createRecentCardCorner(item, onRemoved));
  const journey = createRecentJourney(item, complianceDialogId, complianceArtifact => {
    handleComplianceNode(item, complianceArtifact, el, complianceDialogId, onRefresh);
  });
  if (journey) el.append(journey);
  appendComplianceDialog(el, item, complianceArtifact, complianceDialogId);
  el.setAttribute('aria-label', buildRecentCardAriaLabel(item, missing));
  return el;
}

function createRecentFilterDirectory<T extends string>(options: {
  label: string;
  ariaLabel: string;
  filters: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'app-overview-recent-filter-directory';
  const caption = document.createElement('span');
  caption.textContent = options.label;
  const select = document.createElement('select');
  select.className = 'app-overview-recent-filter-select';
  select.setAttribute('aria-label', options.ariaLabel);
  select.append(
    ...options.filters.map(filter => {
      const option = document.createElement('option');
      option.value = filter.id;
      option.textContent = filter.label;
      return option;
    })
  );
  select.value = options.value;
  select.addEventListener('change', () => options.onChange(select.value as T));
  label.append(caption, select);
  return label;
}

function renderTypeFilters(
  container: HTMLElement,
  state: RecentPanelState,
  onChange: () => void
): void {
  const row = container.querySelector<HTMLElement>('.app-overview-recent-type-filters');
  if (!row) return;

  row.replaceChildren(
    createRecentFilterDirectory({
      label: '当前阶段',
      ariaLabel: '按当前阶段筛选',
      filters: TYPE_FILTERS,
      value: state.typeFilter,
      onChange: value => {
        state.typeFilter = value;
        state.visibleLimit = RECENT_ARTIFACT_LIMIT;
        onChange();
      },
    })
  );
}

function renderStatusFilters(
  container: HTMLElement,
  state: RecentPanelState,
  onChange: () => void
): void {
  const row = container.querySelector<HTMLElement>('.app-overview-recent-status-filters');
  if (!row) return;
  row.replaceChildren(
    createRecentFilterDirectory({
      label: '作业状态',
      ariaLabel: '按作业状态筛选',
      filters: STATUS_FILTERS,
      value: state.statusFilter,
      onChange: value => {
        state.statusFilter = value;
        state.showDismissed = value === 'dismissed';
        state.visibleLimit = RECENT_ARTIFACT_LIMIT;
        onChange();
      },
    })
  );
}

function renderSortControl(
  container: HTMLElement,
  state: RecentPanelState,
  onChange: () => void
): void {
  const row = container.querySelector<HTMLElement>('.app-overview-recent-sort');
  if (!row) return;
  row.replaceChildren(
    createRecentFilterDirectory({
      label: '排序',
      ariaLabel: '最近作业排序',
      filters: SORT_OPTIONS,
      value: state.sortMode,
      onChange: value => {
        state.sortMode = value;
        state.visibleLimit = RECENT_ARTIFACT_LIMIT;
        onChange();
      },
    })
  );
}

function getRecentEmptyCopy(state: RecentPanelState): {
  title: string;
  description: string;
  clearLabel: string;
  showClear: boolean;
} {
  const filtered =
    Boolean(state.query) || state.typeFilter !== 'all' || state.statusFilter !== 'all';
  if (state.showDismissed) {
    return {
      title: '没有已移除记录',
      description: '从最近作业移除的记录会保存在这里，可随时恢复。',
      clearLabel: '返回最近作业',
      showClear: true,
    };
  }
  if (filtered) {
    return {
      title: '没有符合条件的作业',
      description: '请调整搜索内容或结果类型，也可以清除筛选。',
      clearLabel: '清除搜索和筛选',
      showClear: true,
    };
  }
  return {
    title: '暂无最近作业',
    description: '完成采集、AI 分析、关键词处理或 PPC 导出后，可从这里查看结果或进入下一步。',
    clearLabel: '清除搜索和筛选',
    showClear: false,
  };
}

function updateRecentEmptyState(
  container: HTMLElement,
  state: RecentPanelState,
  hasItems: boolean
): void {
  if (hasItems) return;
  const copy = getRecentEmptyCopy(state);
  const title = container.querySelector<HTMLElement>('[data-recent-empty-title]');
  const description = container.querySelector<HTMLElement>('[data-recent-empty-description]');
  const clearButton = container.querySelector<HTMLButtonElement>('[data-recent-empty-clear]');
  const startButtons = container.querySelectorAll<HTMLElement>('[data-recent-empty-start]');
  if (title) title.textContent = copy.title;
  if (description) description.textContent = copy.description;
  clearButton?.classList.toggle('hidden', !copy.showClear);
  const clearLabel = clearButton?.querySelector('span');
  if (clearLabel) clearLabel.textContent = copy.clearLabel;
  startButtons.forEach(button => button.classList.toggle('hidden', copy.showClear));
}

async function renderRecentList(container: HTMLElement, state: RecentPanelState): Promise<void> {
  const list = container.querySelector<HTMLElement>('.app-overview-recent-list');
  if (!list) return;

  const currentRender = ++renderSequence;
  const empty = container.querySelector<HTMLElement>('.app-overview-recent-empty');
  const { items, total } = await getQueueItems(state);
  if (currentRender !== renderSequence) return;
  const fragment = document.createDocumentFragment();

  items.forEach(item => {
    if (item.isGroupHeader) {
      fragment.append(createGroupHeader(item));
      return;
    }
    fragment.append(
      createRecentArtifactItem(
        item,
        () => {
          void renderRecentList(container, state);
        },
        queueId => {
          state.lastRemovedQueueId = queueId;
          showToast('已从最近作业移除，可使用“撤销”恢复。', {
            type: 'success',
          });
        }
      )
    );
  });

  list.replaceChildren(fragment);
  list.querySelectorAll<HTMLDialogElement>('dialog[data-auto-open="true"]').forEach(dialog => {
    delete dialog.dataset.autoOpen;
    showComplianceDialogElement(dialog);
  });
  if (pendingFocusSelector) {
    list.querySelector<HTMLElement>(pendingFocusSelector)?.focus();
    pendingFocusSelector = '';
  }
  list.classList.toggle('hidden', items.length === 0);
  empty?.classList.toggle('hidden', items.length > 0);
  updateRecentEmptyState(container, state, items.length > 0);

  const badge = container.querySelector<HTMLElement>('.app-overview-recent-count-badge');
  if (badge) {
    const visibleCount = items.filter(item => !item.isGroupHeader).length;
    badge.textContent =
      total > visibleCount ? `显示 ${visibleCount} / 共 ${total} 项` : `显示 ${visibleCount} 项`;
  }
  // 触底增量加载：未展示完时在列表末尾挂哨兵，滚动接近底部自动追加一页
  recentListObserver?.disconnect();
  recentListObserver = null;
  if (state.visibleLimit < total && items.length > 0) {
    const sentinel = document.createElement('div');
    sentinel.className = 'app-overview-recent-sentinel';
    list.append(sentinel);
    recentListObserver = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        if (state.visibleLimit >= total) return;
        state.visibleLimit += RECENT_ARTIFACT_LIMIT;
        void renderRecentList(container, state);
      },
      { root: list, rootMargin: '200px 0px' }
    );
    recentListObserver.observe(sentinel);
  }
  container
    .querySelector<HTMLButtonElement>('[data-recent-undo-remove]')
    ?.classList.toggle('hidden', !state.lastRemovedQueueId);
}

function updateRecentPanelControls(container: HTMLElement, state: RecentPanelState): void {
  applyRecentColumns(container, state.columns, false);
  container
    .querySelector<HTMLButtonElement>('[data-recent-undo-remove]')
    ?.classList.toggle('hidden', !state.lastRemovedQueueId);
}

export async function renderRecentPanel(
  container: HTMLElement,
  isCurrent: () => boolean = () => true
): Promise<void> {
  const state: RecentPanelState = {
    typeFilter: 'all',
    statusFilter: 'all',
    query: '',
    sortMode: 'activity',
    visibleLimit: RECENT_ARTIFACT_LIMIT,
    columns: getStoredRecentColumns(),
    showDismissed: false,
    lastRemovedQueueId: '',
  };

  const refresh = async (): Promise<void> => {
    renderTypeFilters(container, state, () => {
      void refresh();
    });
    renderStatusFilters(container, state, () => {
      void refresh();
    });
    renderSortControl(container, state, () => {
      void refresh();
    });
    await renderRecentList(container, state);
    if (!isCurrent()) return;
    updateRecentPanelControls(container, state);
  };

  container
    .querySelectorAll<HTMLButtonElement>('.category-filter-btn[data-recent-columns]')
    .forEach(btn => {
      btn.addEventListener('click', () => {
        const columns = parseRecentColumns(btn.dataset.recentColumns);
        if (!columns) return;
        state.columns = columns;
        applyRecentColumns(container, columns, true);
      });
    });

  const searchContainer = container.querySelector<HTMLElement>(
    '[data-sops-searchbox="app-recent"]'
  );
  let searchHandle: SearchBoxHandle | null = null;
  if (searchContainer) {
    // P1-2 二期：统一搜索框（SearchBox 组件），防抖与渲染由 onFilter 承接
    searchHandle = createSearchBox({
      placeholder: '搜索站点、ASIN 或负责人',
      ariaLabel: '搜索最近作业',
      inputId: 'app-overview-recent-search',
      onFilter: (query: string) => {
        state.query = query.trim();
        state.visibleLimit = RECENT_ARTIFACT_LIMIT;
        if (searchDebounceTimer !== undefined) window.clearTimeout(searchDebounceTimer);
        searchDebounceTimer = window.setTimeout(() => {
          searchDebounceTimer = undefined;
          void renderRecentList(container, state);
        }, 160);
      },
    });
    searchHandle.mount(searchContainer);
    unsubscribers.push(() => {
      searchHandle?.destroy();
    });
  }

  const undoButton = container.querySelector<HTMLButtonElement>('[data-recent-undo-remove]');
  undoButton?.addEventListener('click', () => {
    if (!state.lastRemovedQueueId) return;
    const queueId = state.lastRemovedQueueId;
    state.lastRemovedQueueId = '';
    undismissRecentArtifact(queueId);
    showToast('已恢复到最近作业', { type: 'success' });
  });

  const clearRecentFilters = container.querySelector<HTMLButtonElement>(
    '[data-recent-empty-clear]'
  );
  clearRecentFilters?.addEventListener('click', () => {
    state.query = '';
    state.typeFilter = 'all';
    state.statusFilter = 'all';
    state.sortMode = 'activity';
    state.visibleLimit = RECENT_ARTIFACT_LIMIT;
    state.showDismissed = false;
    searchHandle?.clear();
    void refresh();
  });

  const unsubscribe = eventBus.on(APP_CENTER_ARTIFACTS_CHANGED, payload => {
    const change = payload as ArtifactsChangedPayload;
    if (change.reason === 'clear') payloadStatusCache.clear();
    else if (change.reason === 'upsert' && change.artifactId) {
      payloadStatusCache.delete(change.artifactId);
    }
    void renderRecentList(container, state);
  });
  unsubscribers.push(unsubscribe);

  await refresh();
}

export function cleanupRecentPanel(): void {
  renderSequence += 1;
  recentListObserver?.disconnect();
  recentListObserver = null;
  if (searchDebounceTimer !== undefined) window.clearTimeout(searchDebounceTimer);
  searchDebounceTimer = undefined;
  openComplianceDialogIds.clear();
  pendingFocusSelector = '';
  payloadStatusCache.clear();
  unsubscribers.forEach(unsub => unsub());
  unsubscribers = [];
}

export function getRecentTypeLabel(type: AppCenterArtifactType): string {
  return RECENT_ARTIFACT_TYPE_LABELS[type];
}
