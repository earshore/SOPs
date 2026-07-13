import eventBus from '@/common/EventBus';
import { navigateToRouteId } from '@/common/router/initRouter';
import { showToast } from '@/common/ui/notifications';
import { copyTextToClipboard } from '@/common/utils/clipboard';
import { StorageService } from '@/services/storageService';
import {
  APP_CENTER_ARTIFACTS_CHANGED,
  COMPETITOR_LISTING_PROGRESS_TYPES,
  getAllArtifacts,
  getArtifactsForWorkItem,
  getWorkItemProgress,
  getWorkItemById,
  getWorkItems,
  registerComplianceCheckArtifact,
  type AppCenterArtifactEnvelope,
  type AppCenterArtifactType,
} from '../../artifactEnvelopeService';
import {
  buildResumePlanAsync,
  executeResumePlan,
  getArtifactResumeActions,
  resolveResumePayloadStatusAsync,
  type ResumeMode,
} from '../../artifactResumeService';
import {
  buildResumeClipboardSummary,
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
} from '../../recentQueueService';
import { getWorkspaceContext } from '../../workspaceContext';
import { getComplianceReviewView } from '../../complianceReviewState';
import { getAppCenterWorkflowDefinition } from '../../workflowDefinitions';
import { createComplianceReviewPanel } from './recentComplianceReview';

const RECENT_ARTIFACT_LIMIT = 10;
const RECENT_COLUMNS_STORAGE_KEY = 'app_center_overview_recent_columns_v1';
const RECENT_GROUP_STORAGE_KEY = 'app_center_overview_recent_group_v1';
const DEFAULT_RECENT_COLUMNS: RecentColumns = 2;

type RecentColumns = 1 | 2 | 3;

const RECENT_ARTIFACT_ICONS: Record<AppCenterArtifactType, string> = {
  scrape_history: 'fas fa-database',
  analysis_report: 'fas fa-brain',
  listing_prompt: 'fas fa-wand-magic-sparkles',
  keyword_snapshot: 'fas fa-key',
  ppc_action_list: 'fas fa-list-check',
  compliance_check: 'fas fa-shield-halved',
};

type RecentJourneyStepState = 'complete' | 'current' | 'upcoming';

interface RecentJourneyStep {
  id: string;
  label: string;
  state: RecentJourneyStepState;
}

interface RecentJourney {
  currentLabel: string;
  complete: boolean;
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
  { id: 'keyword_snapshot', label: '关键词' },
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
];

interface RecentPanelState {
  typeFilter: AppCenterArtifactType | 'all';
  statusFilter: 'all' | 'actionable' | 'review' | 'missing';
  query: string;
  groupByWorkItem: boolean;
  columns: RecentColumns;
  showDismissed: boolean;
  lastRemovedArtifactId: string;
}

let unsubscribers: Array<() => void> = [];
let renderSequence = 0;
const expandedComplianceIds = new Set<string>();
let pendingFocusSelector = '';

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

function getStoredGroupMode(): boolean {
  return StorageService.getRaw(RECENT_GROUP_STORAGE_KEY) === '1';
}

function applyRecentColumns(
  container: HTMLElement,
  columns: RecentColumns,
  persist: boolean
): void {
  const shell = container.querySelector<HTMLElement>('.app-overview-recent-shell');
  const buttons = container.querySelectorAll<HTMLButtonElement>(
    '.app-overview-recent-columns-btn[data-recent-columns]'
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

async function getQueueItems(state: RecentPanelState): Promise<RecentQueueItem[]> {
  const artifacts = getAllArtifacts();
  const workItems = getWorkItems();
  const payloadStatuses = Object.fromEntries(
    await Promise.all(
      artifacts.map(async artifact => [
        artifact.id,
        await resolveResumePayloadStatusAsync(artifact),
      ])
    )
  );
  return buildRecentQueueItems(artifacts, workItems, {
    typeFilter: state.typeFilter,
    statusFilter: state.statusFilter,
    payloadStatuses,
    query: state.query,
    groupByWorkItem: state.groupByWorkItem,
    includeDismissed: state.showDismissed,
    dismissedOnly: state.showDismissed,
    limit: RECENT_ARTIFACT_LIMIT,
  });
}

async function handleResume(artifact: AppCenterArtifactEnvelope, mode: ResumeMode): Promise<void> {
  const workItem = getWorkItemById(artifact.workItemId);
  const plan = await buildResumePlanAsync(artifact, workItem, mode);

  if (!plan.ok) {
    showToast(plan.reason, { type: 'warning' });
    return;
  }

  const result = await executeResumePlan(plan);
  if (!result.ok) {
    showToast(result.reason || '恢复作业失败', { type: 'error' });
    return;
  }

  const didNavigate = await navigateToRouteId(plan.routeId);
  if (!didNavigate) {
    showToast('未能进入下一步，请重试。', { type: 'error' });
    return;
  }

  markRecentArtifactOpened(artifact.id);

  if (mode === 'continue' && artifact.type === 'keyword_snapshot') {
    const currentContext = getWorkspaceContext();
    registerComplianceCheckArtifact(
      {
        id: `review-${artifact.payloadRef.replace('keyword_snapshot:', '')}`,
        createdAt: new Date().toISOString(),
        note: '从关键词结果开始人工合规复核',
      },
      {
        ...currentContext,
        workItemId: artifact.workItemId,
        marketplace: (workItem?.marketplace || currentContext.marketplace || '') as never,
        asinOrSku: workItem?.asinOrSku || currentContext.asinOrSku,
        sourceRoute: plan.routeId,
      }
    );
  }
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

function createRecentMetaRow(item: RecentQueueItem, missing: boolean): HTMLElement {
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

  if (missing) {
    const missingBadge = document.createElement('span');
    missingBadge.className = 'app-overview-recent-missing-badge';
    missingBadge.textContent = '原始数据不可用';
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
  time.dateTime = artifact.createdAt;
  time.textContent = presentation.relativeTime || presentation.absoluteTime;
  if (presentation.relativeTime && presentation.absoluteTime) {
    time.setAttribute('title', presentation.absoluteTime);
  }
  if (!presentation.relativeTime && !presentation.absoluteTime) time.classList.add('hidden');
  return time;
}

function getPpcJourney(item: RecentQueueItem): RecentJourney {
  const progress = getWorkItemProgress(item.artifact.workItemId);
  const complete = progress.completedSteps >= progress.totalSteps;
  return {
    currentLabel: complete ? '全部完成' : '人工复核',
    complete,
    steps: [
      { id: 'suggestions', label: '生成建议', state: 'complete' },
      {
        id: 'manual_review',
        label: '人工复核',
        state: complete ? 'complete' : 'current',
      },
    ],
  };
}

function getCompetitorListingJourney(item: RecentQueueItem): RecentJourney {
  const workflow = getAppCenterWorkflowDefinition('competitor_listing');
  const progress = getWorkItemProgress(item.artifact.workItemId);
  const reachedTypes = new Set(
    getArtifactsForWorkItem(item.artifact.workItemId).map(artifact => artifact.type)
  );
  reachedTypes.add(item.artifact.type);

  const lastType = COMPETITOR_LISTING_PROGRESS_TYPES.at(-1);
  const complete = Boolean(lastType && progress.completedTypes.includes(lastType));
  const highestReachedIndex = COMPETITOR_LISTING_PROGRESS_TYPES.reduce(
    (highest, type, index) => (reachedTypes.has(type) ? index : highest),
    -1
  );
  const currentIndex = complete
    ? -1
    : Math.min(Math.max(highestReachedIndex + 1, 0), workflow.steps.length - 1);
  const reachedCurrentIndex = COMPETITOR_LISTING_PROGRESS_TYPES.reduce(
    (current, type, index) =>
      reachedTypes.has(type) && !progress.completedTypes.includes(type) ? index : current,
    -1
  );
  const resolvedCurrentIndex = reachedCurrentIndex >= 0 ? reachedCurrentIndex : currentIndex;

  return {
    currentLabel: complete
      ? '全部完成'
      : workflow.steps[resolvedCurrentIndex]?.title || workflow.steps[0]?.title || '数据采集',
    complete,
    steps: workflow.steps.map((step, index) => ({
      id: step.id,
      label: step.title,
      state: complete
        ? 'complete'
        : index < resolvedCurrentIndex
          ? 'complete'
          : index === resolvedCurrentIndex
            ? 'current'
            : 'upcoming',
    })),
  };
}

function createRecentJourney(item: RecentQueueItem): HTMLElement | null {
  if (item.workItem?.type === 'npi_reference') return null;
  const journey =
    item.workItem?.type === 'ppc_review' || item.artifact.type === 'ppc_action_list'
      ? getPpcJourney(item)
      : getCompetitorListingJourney(item);

  const container = document.createElement('div');
  container.className = 'app-overview-recent-journey';
  container.setAttribute(
    'aria-label',
    journey.complete ? '作业链路：全部完成' : `作业链路：当前位于${journey.currentLabel}`
  );

  const heading = document.createElement('div');
  heading.className = 'app-overview-recent-journey-heading';
  const title = document.createElement('span');
  title.textContent = '作业链路';
  const current = document.createElement('span');
  current.className = 'app-overview-recent-journey-current';
  current.textContent = journey.complete ? '全部完成' : `当前：${journey.currentLabel}`;
  heading.append(title, current);

  const steps = document.createElement('ol');
  steps.className = 'app-overview-recent-journey-steps';
  steps.style.setProperty('--app-recent-journey-steps', String(journey.steps.length));
  journey.steps.forEach(step => {
    const stepEl = document.createElement('li');
    stepEl.className = `app-overview-recent-journey-step app-overview-recent-journey-step--${step.state}`;
    if (step.state === 'current') stepEl.setAttribute('aria-current', 'step');

    const marker = document.createElement('span');
    marker.className = 'app-overview-recent-journey-marker';
    marker.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'app-overview-recent-journey-label';
    label.textContent = step.label;
    stepEl.append(marker, label);
    steps.append(stepEl);
  });

  container.append(heading, steps);
  return container;
}

function createRecentUtilityActions(
  item: RecentQueueItem,
  onRefresh: () => void,
  onRemoved: (artifactId: string) => void
): HTMLElement[] {
  const { artifact } = item;
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
        if (item.pinned) unpinRecentArtifact(artifact.id);
        else pinRecentArtifact(artifact.id);
        onRefresh();
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
              undismissRecentArtifact(artifact.id);
              showToast('已恢复到最近作业', { type: 'success' });
              onRefresh();
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
              dismissRecentArtifact(artifact.id);
              onRemoved(artifact.id);
            },
          }
    ),
  ];
}

function createRecentCardCorner(
  item: RecentQueueItem,
  onRefresh: () => void,
  onRemoved: (artifactId: string) => void
): HTMLElement {
  const corner = document.createElement('div');
  corner.className = 'app-overview-recent-card-corner';
  const tools = document.createElement('div');
  tools.className = 'app-overview-recent-card-tools';
  const buttons = createRecentUtilityActions(item, onRefresh, onRemoved);
  buttons.forEach(button => {
    button.dataset.tooltip = button.getAttribute('aria-label') || '';
  });
  tools.append(...buttons);
  corner.append(tools, createRecentTime(item));
  return corner;
}

function createRecentActions(
  item: RecentQueueItem,
  missing: boolean,
  callbacks: {
    compliancePanelId?: string;
    onToggleCompliance?: () => void;
  }
): HTMLElement {
  const { artifact } = item;
  const { compliancePanelId, onToggleCompliance } = callbacks;
  const actions = document.createElement('div');
  actions.className = 'app-overview-recent-actions';
  const primaryActions = document.createElement('div');
  primaryActions.className =
    'app-overview-recent-action-group app-overview-recent-action-group--primary';

  const complianceView =
    artifact.type === 'compliance_check' ? getComplianceReviewView(artifact) : null;
  const resumeActions = getArtifactResumeActions(artifact.type)
    .filter(action => !(complianceView?.complete && action.mode === 'continue'))
    .map(action => ({
      ...action,
      label:
        action.mode === 'continue' && complianceView?.nextItem
          ? `继续复核：${complianceView.nextItem.label}`
          : action.label,
    }));

  primaryActions.append(
    ...resumeActions.map(action =>
      createToolbarButton({
        className: action.primary
          ? 'app-overview-recent-action app-card-primary-link'
          : 'app-overview-recent-action app-overview-recent-action--secondary',
        label: action.label,
        title: action.title,
        icon: action.icon,
        disabled: missing,
        ariaExpanded:
          artifact.type === 'compliance_check' && action.mode === 'open'
            ? expandedComplianceIds.has(artifact.id)
            : undefined,
        ariaControls:
          artifact.type === 'compliance_check' && action.mode === 'open'
            ? compliancePanelId
            : undefined,
        onClick: () => {
          if (artifact.type === 'compliance_check' && action.mode === 'open') {
            onToggleCompliance?.();
            return;
          }
          void handleResume(artifact, action.mode);
        },
      })
    )
  );
  actions.append(primaryActions);

  return actions;
}

function createRecentArtifactItem(
  item: RecentQueueItem,
  onRefresh: () => void,
  onRemoved: (artifactId: string) => void
): HTMLElement {
  const { artifact, presentation } = item;
  const missing = item.payloadStatus === 'missing';

  const el = document.createElement('article');
  el.className = `app-overview-recent-item app-overview-recent-item--${artifact.type}`;
  if (item.pinned) el.classList.add('app-overview-recent-item--pinned');
  if (item.needsAttention) el.classList.add('app-overview-recent-item--attention');
  if (missing) el.classList.add('app-overview-recent-item--missing');
  el.dataset.workItemId = artifact.workItemId;
  el.dataset.artifactType = artifact.type;
  el.dataset.artifactId = artifact.id;
  el.setAttribute('role', 'listitem');
  const compliancePanelId = `app-overview-compliance-${artifact.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const toggleCompliance = (): void => {
    if (expandedComplianceIds.has(artifact.id)) expandedComplianceIds.delete(artifact.id);
    else expandedComplianceIds.add(artifact.id);
    const expanded = expandedComplianceIds.has(artifact.id);
    el.querySelector<HTMLElement>(`#${compliancePanelId}`)?.classList.toggle('hidden', !expanded);
    el.querySelector<HTMLButtonElement>(`[aria-controls="${compliancePanelId}"]`)?.setAttribute(
      'aria-expanded',
      String(expanded)
    );
  };

  const iconBox = document.createElement('span');
  iconBox.className = 'app-overview-recent-icon';
  iconBox.setAttribute('aria-hidden', 'true');
  iconBox.append(createIcon(RECENT_ARTIFACT_ICONS[artifact.type]));

  const body = document.createElement('div');
  body.className = 'app-overview-recent-body';

  const title = document.createElement('strong');
  title.className = 'app-overview-recent-title';
  title.textContent = presentation.primaryTitle;
  body.append(createRecentMetaRow(item, missing), title);

  if (presentation.facts.length > 0) {
    const facts = document.createElement('div');
    facts.className = 'app-overview-recent-facts';
    facts.setAttribute('aria-label', '关键信息');
    presentation.facts.forEach(factText => {
      const fact = document.createElement('span');
      fact.className = 'app-overview-recent-fact';
      fact.textContent = factText;
      facts.append(fact);
    });
    body.append(facts);
  }

  el.append(iconBox, body, createRecentCardCorner(item, onRefresh, onRemoved));
  const journey = createRecentJourney(item);
  if (journey) el.append(journey);
  el.append(
    createRecentActions(item, missing, {
      compliancePanelId,
      onToggleCompliance: toggleCompliance,
    })
  );
  if (artifact.type === 'compliance_check') {
    const panel = createComplianceReviewPanel(
      artifact,
      item.workItem,
      expandedComplianceIds.has(artifact.id),
      itemId => {
        pendingFocusSelector = itemId
          ? `[data-artifact-id="${artifact.id}"] [data-compliance-item-id="${itemId}"]`
          : '';
        onRefresh();
      }
    );
    panel.id = compliancePanelId;
    el.append(panel);
  }
  el.setAttribute(
    'aria-label',
    [
      presentation.typeLabel,
      presentation.primaryTitle,
      ...presentation.facts,
      presentation.relativeTime || presentation.absoluteTime,
      missing ? '原始数据不可用' : '',
      item.needsAttention ? '需人工复核' : '',
    ]
      .filter(Boolean)
      .join(' · ')
  );
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
      label: '结果类型',
      ariaLabel: '按作业结果类型筛选',
      filters: TYPE_FILTERS,
      value: state.typeFilter,
      onChange: value => {
        state.typeFilter = value;
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
  const items = await getQueueItems(state);
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
        artifactId => {
          state.lastRemovedArtifactId = artifactId;
          showToast('已从最近作业移除，可使用“撤销”恢复。', {
            type: 'success',
          });
          void renderRecentList(container, state);
        }
      )
    );
  });

  list.replaceChildren(fragment);
  if (pendingFocusSelector) {
    list.querySelector<HTMLElement>(pendingFocusSelector)?.focus();
    pendingFocusSelector = '';
  }
  list.classList.toggle('hidden', items.length === 0);
  empty?.classList.toggle('hidden', items.length > 0);
  updateRecentEmptyState(container, state, items.length > 0);

  const badge = container.querySelector<HTMLElement>('.app-overview-recent-count-badge');
  if (badge) {
    badge.textContent = `显示 ${items.filter(item => !item.isGroupHeader).length} 项`;
  }
  container
    .querySelector<HTMLButtonElement>('[data-recent-undo-remove]')
    ?.classList.toggle('hidden', !state.lastRemovedArtifactId);
}

function updateRecentPanelControls(container: HTMLElement, state: RecentPanelState): void {
  applyRecentColumns(container, state.columns, false);
  const groupBtn = container.querySelector<HTMLButtonElement>('[data-recent-group-toggle]');
  groupBtn?.classList.toggle('active', state.groupByWorkItem);
  groupBtn?.setAttribute('aria-pressed', String(state.groupByWorkItem));

  const removedBtn = container.querySelector<HTMLButtonElement>('[data-recent-removed-toggle]');
  removedBtn?.classList.toggle('active', state.showDismissed);
  removedBtn?.setAttribute('aria-pressed', String(state.showDismissed));
  container
    .querySelector<HTMLButtonElement>('[data-recent-undo-remove]')
    ?.classList.toggle('hidden', !state.lastRemovedArtifactId);
}

export async function renderRecentPanel(container: HTMLElement): Promise<void> {
  const state: RecentPanelState = {
    typeFilter: 'all',
    statusFilter: 'all',
    query: '',
    groupByWorkItem: getStoredGroupMode(),
    columns: getStoredRecentColumns(),
    showDismissed: false,
    lastRemovedArtifactId: '',
  };

  const refresh = async (): Promise<void> => {
    renderTypeFilters(container, state, () => {
      void refresh();
    });
    renderStatusFilters(container, state, () => {
      void refresh();
    });
    await renderRecentList(container, state);
    updateRecentPanelControls(container, state);
  };

  container
    .querySelectorAll<HTMLButtonElement>('.app-overview-recent-columns-btn[data-recent-columns]')
    .forEach(btn => {
      btn.addEventListener('click', () => {
        const columns = parseRecentColumns(btn.dataset.recentColumns);
        if (!columns) return;
        state.columns = columns;
        applyRecentColumns(container, columns, true);
      });
    });

  const searchInput = container.querySelector<HTMLInputElement>('#app-overview-recent-search');
  searchInput?.addEventListener('input', () => {
    state.query = searchInput.value.trim();
    void renderRecentList(container, state);
  });

  const groupBtn = container.querySelector<HTMLButtonElement>('[data-recent-group-toggle]');
  groupBtn?.addEventListener('click', () => {
    state.groupByWorkItem = !state.groupByWorkItem;
    StorageService.setRaw(RECENT_GROUP_STORAGE_KEY, state.groupByWorkItem ? '1' : '0');
    void refresh();
  });

  const removedBtn = container.querySelector<HTMLButtonElement>('[data-recent-removed-toggle]');
  removedBtn?.addEventListener('click', () => {
    state.showDismissed = !state.showDismissed;
    void refresh();
  });

  const undoButton = container.querySelector<HTMLButtonElement>('[data-recent-undo-remove]');
  undoButton?.addEventListener('click', () => {
    if (!state.lastRemovedArtifactId) return;
    undismissRecentArtifact(state.lastRemovedArtifactId);
    state.lastRemovedArtifactId = '';
    showToast('已恢复到最近作业', { type: 'success' });
    void refresh();
  });

  const clearRecentFilters = container.querySelector<HTMLButtonElement>(
    '[data-recent-empty-clear]'
  );
  clearRecentFilters?.addEventListener('click', () => {
    state.query = '';
    state.typeFilter = 'all';
    state.statusFilter = 'all';
    state.showDismissed = false;
    if (searchInput) searchInput.value = '';
    void refresh();
  });

  const unsubscribe = eventBus.on(APP_CENTER_ARTIFACTS_CHANGED, () => {
    if (!container.isConnected) return;
    void renderRecentList(container, state);
  });
  unsubscribers.push(unsubscribe);

  await refresh();
}

export function cleanupRecentPanel(): void {
  renderSequence += 1;
  expandedComplianceIds.clear();
  pendingFocusSelector = '';
  unsubscribers.forEach(unsub => unsub());
  unsubscribers = [];
}

export function getRecentTypeLabel(type: AppCenterArtifactType): string {
  return RECENT_ARTIFACT_TYPE_LABELS[type];
}
