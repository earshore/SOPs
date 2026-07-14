import { StorageService } from '@/services/storageService';
import type {
  AppCenterArtifactEnvelope,
  AppCenterArtifactType,
  AppCenterWorkItem,
} from './artifactEnvelopeService';
import { getArtifactsForWorkItem, getWorkItemProgress } from './artifactEnvelopeService';
import eventBus from '@/common/EventBus';
import { APP_CENTER_ARTIFACTS_CHANGED } from './artifactEnvelopeService';
import { buildRecentArtifactPresentation } from './recentArtifactPresenter';

export const APP_CENTER_RECENT_QUEUE_PREFS_KEY = 'app_center_recent_queue_prefs_v1';

export interface RecentQueuePreferences {
  pinnedIds: string[];
  dismissedIds: string[];
  lastOpenedAt: Record<string, string>;
}

export type RecentQueueSortMode = 'priority' | 'activity';

export interface RecentQueueViewOptions {
  typeFilter?: AppCenterArtifactType | 'all';
  query?: string;
  groupByWorkItem?: boolean;
  /** Merge stage artifacts only when they belong to the same execution work item. */
  collapseStagesByWorkItem?: boolean;
  includeDismissed?: boolean;
  dismissedOnly?: boolean;
  statusFilter?: 'all' | 'actionable' | 'review' | 'missing';
  payloadStatuses?: Readonly<Record<string, 'available' | 'missing' | 'unknown'>>;
  now?: number;
  limit?: number;
  sortMode?: RecentQueueSortMode;
}

export interface RecentQueueItem {
  /** Stable identity of one execution card, independent from its latest stage artifact. */
  queueId: string;
  artifact: AppCenterArtifactEnvelope;
  workItem: AppCenterWorkItem | null;
  pinned: boolean;
  dismissed: boolean;
  needsAttention: boolean;
  payloadStatus: 'available' | 'missing' | 'unknown';
  stagePayloadStatuses: Readonly<Record<string, 'available' | 'missing' | 'unknown'>>;
  hasMissingPayload: boolean;
  isGroupHeader: boolean;
  groupTitle?: string;
  progressLabel?: string;
  presentation: ReturnType<typeof buildRecentArtifactPresentation>;
}

const EMPTY_PREFS: RecentQueuePreferences = {
  pinnedIds: [],
  dismissedIds: [],
  lastOpenedAt: {},
};

function isPrefs(value: unknown): value is RecentQueuePreferences {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as RecentQueuePreferences).pinnedIds) &&
    Array.isArray((value as RecentQueuePreferences).dismissedIds)
  );
}

export function getRecentQueuePreferences(): RecentQueuePreferences {
  const stored = StorageService.get<unknown>(APP_CENTER_RECENT_QUEUE_PREFS_KEY, EMPTY_PREFS);
  if (!isPrefs(stored)) {
    return { ...EMPTY_PREFS, pinnedIds: [], dismissedIds: [], lastOpenedAt: {} };
  }
  return {
    pinnedIds: stored.pinnedIds.filter(id => typeof id === 'string'),
    dismissedIds: stored.dismissedIds.filter(id => typeof id === 'string'),
    lastOpenedAt:
      typeof stored.lastOpenedAt === 'object' && stored.lastOpenedAt !== null
        ? Object.fromEntries(
            Object.entries(stored.lastOpenedAt).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string'
            )
          )
        : {},
  };
}

function persistPreferences(prefs: RecentQueuePreferences): RecentQueuePreferences {
  StorageService.set(APP_CENTER_RECENT_QUEUE_PREFS_KEY, prefs);
  eventBus.emit(APP_CENTER_ARTIFACTS_CHANGED, { reason: 'preferences' });
  return prefs;
}

export function clearRecentQueuePreferences(): void {
  StorageService.remove(APP_CENTER_RECENT_QUEUE_PREFS_KEY);
}

export function pinRecentArtifact(artifactId: string): RecentQueuePreferences {
  const prefs = getRecentQueuePreferences();
  const pinnedIds = [artifactId, ...prefs.pinnedIds.filter(id => id !== artifactId)];
  const dismissedIds = prefs.dismissedIds.filter(id => id !== artifactId);
  return persistPreferences({ ...prefs, pinnedIds, dismissedIds });
}

export function unpinRecentArtifact(artifactId: string): RecentQueuePreferences {
  const prefs = getRecentQueuePreferences();
  return persistPreferences({
    pinnedIds: prefs.pinnedIds.filter(id => id !== artifactId),
    dismissedIds: prefs.dismissedIds,
    lastOpenedAt: prefs.lastOpenedAt,
  });
}

export function dismissRecentArtifact(artifactId: string): RecentQueuePreferences {
  const prefs = getRecentQueuePreferences();
  const dismissedIds = [artifactId, ...prefs.dismissedIds.filter(id => id !== artifactId)];
  const pinnedIds = prefs.pinnedIds.filter(id => id !== artifactId);
  return persistPreferences({ ...prefs, pinnedIds, dismissedIds });
}

export function undismissRecentArtifact(artifactId: string): RecentQueuePreferences {
  const prefs = getRecentQueuePreferences();
  return persistPreferences({
    pinnedIds: prefs.pinnedIds,
    dismissedIds: prefs.dismissedIds.filter(id => id !== artifactId),
    lastOpenedAt: prefs.lastOpenedAt,
  });
}

export function markRecentArtifactOpened(
  artifactId: string,
  openedAt = new Date().toISOString()
): RecentQueuePreferences {
  const prefs = getRecentQueuePreferences();
  return persistPreferences({
    ...prefs,
    lastOpenedAt: {
      ...prefs.lastOpenedAt,
      [artifactId]: openedAt,
    },
  });
}

function getTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getArtifactActivityTime(artifact: AppCenterArtifactEnvelope): number {
  return Math.max(getTime(artifact.createdAt), getTime(artifact.updatedAt || ''));
}

function artifactNeedsAttention(
  artifact: AppCenterArtifactEnvelope,
  workItem: AppCenterWorkItem | null
): boolean {
  if (workItem?.status === 'review_required') return true;
  if (artifact.metadata?.requiresHumanConfirmation === true) return true;
  return false;
}

function matchesQuery(
  artifact: AppCenterArtifactEnvelope,
  workItem: AppCenterWorkItem | null,
  query: string
): boolean {
  if (!query) return true;
  const haystack = [
    artifact.title,
    artifact.summary,
    artifact.type,
    workItem?.title,
    workItem?.marketplace,
    workItem?.asinOrSku,
    workItem?.status,
    ...Object.values(artifact.metadata || {}).map(String),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function sortQueueArtifacts(
  artifacts: AppCenterArtifactEnvelope[],
  workItemById: Map<string, AppCenterWorkItem>,
  pinnedIds: Set<string>,
  lastOpenedAt: Readonly<Record<string, string>>,
  sortMode: RecentQueueSortMode
): AppCenterArtifactEnvelope[] {
  const getRank = (artifact: AppCenterArtifactEnvelope): number[] =>
    getQueueRank(
      pinnedIds.has(artifact.id),
      artifactNeedsAttention(artifact, workItemById.get(artifact.workItemId) || null),
      getArtifactActivityTime(artifact),
      getTime(lastOpenedAt[artifact.id] || ''),
      sortMode
    );
  return [...artifacts].sort((left, right) => compareRanks(getRank(left), getRank(right)));
}

function getQueueRank(
  pinned: boolean,
  needsAttention: boolean,
  activityAt: number,
  lastOpenedAt: number,
  sortMode: RecentQueueSortMode
): number[] {
  return sortMode === 'activity'
    ? [pinned ? 1 : 0, activityAt, needsAttention ? 1 : 0, lastOpenedAt]
    : [pinned ? 1 : 0, needsAttention ? 1 : 0, activityAt, lastOpenedAt];
}

function compareRanks(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < left.length; index += 1) {
    const difference = (right[index] || 0) - (left[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

interface QueueFilterContext {
  dismissedIds: ReadonlySet<string>;
  options: RecentQueueViewOptions;
  typeFilter: AppCenterArtifactType | 'all';
  statusFilter: NonNullable<RecentQueueViewOptions['statusFilter']>;
  query: string;
}

function matchesQueueFilters(
  artifact: AppCenterArtifactEnvelope,
  workItem: AppCenterWorkItem | null,
  context: QueueFilterContext
): boolean {
  const { dismissedIds, options, typeFilter, statusFilter, query } = context;
  const dismissed = dismissedIds.has(artifact.id);
  if (!isDismissedStateVisible(dismissed, options)) return false;
  if (typeFilter !== 'all' && artifact.type !== typeFilter) return false;
  if (!matchesQuery(artifact, workItem, query)) return false;

  const payloadStatus = options.payloadStatuses?.[artifact.id] || 'unknown';
  return matchesStatusFilter(statusFilter, payloadStatus, artifact, workItem);
}

function isDismissedStateVisible(dismissed: boolean, options: RecentQueueViewOptions): boolean {
  if (options.dismissedOnly) return dismissed;
  if (options.includeDismissed) return true;
  return !dismissed;
}

function matchesStatusFilter(
  statusFilter: NonNullable<RecentQueueViewOptions['statusFilter']>,
  payloadStatus: RecentQueueItem['payloadStatus'],
  artifact: AppCenterArtifactEnvelope,
  workItem: AppCenterWorkItem | null
): boolean {
  if (statusFilter === 'missing') return payloadStatus === 'missing';
  if (statusFilter === 'actionable') return payloadStatus !== 'missing';
  if (statusFilter === 'review') return artifactNeedsAttention(artifact, workItem);
  return true;
}

function toQueueItem(
  artifact: AppCenterArtifactEnvelope,
  workItem: AppCenterWorkItem | null,
  prefs: RecentQueuePreferences,
  now: number,
  options?: {
    isGroupHeader?: boolean;
    groupTitle?: string;
    queueId?: string;
    preferenceIds?: readonly string[];
    stagePayloadStatuses?: Readonly<Record<string, RecentQueueItem['payloadStatus']>>;
  }
): RecentQueueItem {
  const progress = workItem ? getWorkItemProgress(workItem.id) : null;
  const queueId = options?.queueId || artifact.id;
  const preferenceIds = options?.preferenceIds || [queueId];
  return {
    queueId,
    artifact,
    workItem,
    pinned: preferenceIds.some(id => prefs.pinnedIds.includes(id)),
    dismissed: preferenceIds.some(id => prefs.dismissedIds.includes(id)),
    needsAttention: artifactNeedsAttention(artifact, workItem),
    payloadStatus: options?.stagePayloadStatuses?.[artifact.id] || 'unknown',
    stagePayloadStatuses: options?.stagePayloadStatuses || {},
    hasMissingPayload: Object.values(options?.stagePayloadStatuses || {}).includes('missing'),
    isGroupHeader: Boolean(options?.isGroupHeader),
    groupTitle: options?.groupTitle,
    progressLabel: progress?.label,
    presentation: buildRecentArtifactPresentation(artifact, workItem, now),
  };
}

interface CollapsedQueueGroup {
  queueId: string;
  artifacts: AppCenterArtifactEnvelope[];
  representative: AppCenterArtifactEnvelope;
  workItem: AppCenterWorkItem | null;
  preferenceIds: string[];
  pinned: boolean;
  dismissed: boolean;
  needsAttention: boolean;
  payloadStatus: RecentQueueItem['payloadStatus'];
  stagePayloadStatuses: Record<string, RecentQueueItem['payloadStatus']>;
  hasMissingPayload: boolean;
  activityAt: number;
  lastOpenedAt: number;
}

function createCollapsedQueueGroups(
  artifacts: AppCenterArtifactEnvelope[],
  workItemById: Map<string, AppCenterWorkItem>,
  prefs: RecentQueuePreferences,
  payloadStatuses: RecentQueueViewOptions['payloadStatuses']
): CollapsedQueueGroup[] {
  const artifactsByWorkItem = new Map<string, AppCenterArtifactEnvelope[]>();
  artifacts.forEach(artifact => {
    const queueId = artifact.workItemId || artifact.id;
    const group = artifactsByWorkItem.get(queueId) || [];
    group.push(artifact);
    artifactsByWorkItem.set(queueId, group);
  });

  return [...artifactsByWorkItem.entries()].flatMap(([queueId, groupArtifacts]) => {
    const sortedArtifacts = [...groupArtifacts].sort(
      (left, right) => getArtifactActivityTime(right) - getArtifactActivityTime(left)
    );
    const representative = sortedArtifacts[0];
    if (!representative) return [];

    const preferenceIds = [queueId, ...sortedArtifacts.map(artifact => artifact.id)];
    const workItem = workItemById.get(queueId) || null;
    const stagePayloadStatuses = Object.fromEntries(
      sortedArtifacts.map(artifact => [artifact.id, payloadStatuses?.[artifact.id] || 'unknown'])
    );
    return [
      {
        queueId,
        artifacts: sortedArtifacts,
        representative,
        workItem,
        preferenceIds,
        pinned: preferenceIds.some(id => prefs.pinnedIds.includes(id)),
        dismissed: preferenceIds.some(id => prefs.dismissedIds.includes(id)),
        needsAttention: sortedArtifacts.some(artifact =>
          artifactNeedsAttention(artifact, workItem)
        ),
        payloadStatus: payloadStatuses?.[representative.id] || 'unknown',
        stagePayloadStatuses,
        hasMissingPayload: Object.values(stagePayloadStatuses).includes('missing'),
        activityAt: Math.max(
          getTime(workItem?.updatedAt || ''),
          ...sortedArtifacts.map(getArtifactActivityTime)
        ),
        lastOpenedAt: Math.max(...preferenceIds.map(id => getTime(prefs.lastOpenedAt[id] || ''))),
      },
    ];
  });
}

function matchesCollapsedQueueFilters(
  group: CollapsedQueueGroup,
  options: RecentQueueViewOptions,
  typeFilter: AppCenterArtifactType | 'all',
  statusFilter: NonNullable<RecentQueueViewOptions['statusFilter']>,
  query: string
): boolean {
  if (!isDismissedStateVisible(group.dismissed, options)) return false;
  if (typeFilter !== 'all' && group.representative.type !== typeFilter) return false;
  if (query && !group.artifacts.some(artifact => matchesQuery(artifact, group.workItem, query))) {
    return false;
  }
  if (statusFilter === 'missing') return group.hasMissingPayload;
  if (statusFilter === 'actionable') return group.payloadStatus !== 'missing';
  if (statusFilter === 'review') return group.needsAttention;
  return true;
}

function buildCollapsedRecentQueueItems(
  artifacts: AppCenterArtifactEnvelope[],
  workItemById: Map<string, AppCenterWorkItem>,
  prefs: RecentQueuePreferences,
  options: RecentQueueViewOptions
): RecentQueueItem[] {
  const now = options.now ?? Date.now();
  const limit = options.limit ?? 10;
  const typeFilter = options.typeFilter || 'all';
  const statusFilter = options.statusFilter || 'all';
  const query = (options.query || '').trim().toLowerCase();
  const sortMode = options.sortMode || 'priority';
  const groups = createCollapsedQueueGroups(
    artifacts,
    workItemById,
    prefs,
    options.payloadStatuses
  );

  return groups
    .filter(group => matchesCollapsedQueueFilters(group, options, typeFilter, statusFilter, query))
    .sort((left, right) =>
      compareRanks(
        getQueueRank(
          left.pinned,
          left.needsAttention,
          left.activityAt,
          left.lastOpenedAt,
          sortMode
        ),
        getQueueRank(
          right.pinned,
          right.needsAttention,
          right.activityAt,
          right.lastOpenedAt,
          sortMode
        )
      )
    )
    .slice(0, limit)
    .map(group => {
      const item = toQueueItem(group.representative, group.workItem, prefs, now, {
        queueId: group.queueId,
        preferenceIds: group.preferenceIds,
        stagePayloadStatuses: group.stagePayloadStatuses,
      });
      item.needsAttention = group.needsAttention;
      item.payloadStatus = group.payloadStatus;
      item.hasMissingPayload = group.hasMissingPayload;
      return item;
    });
}

/**
 * Pure-ish queue builder (preferences come from storage).
 * payloadStatus is left as unknown here; UI can enrich via resume resolvers.
 */
export function buildRecentQueueItems(
  artifacts: AppCenterArtifactEnvelope[],
  workItems: AppCenterWorkItem[],
  options: RecentQueueViewOptions = {}
): RecentQueueItem[] {
  const prefs = getRecentQueuePreferences();
  const pinnedIds = new Set(prefs.pinnedIds);
  const dismissedIds = new Set(prefs.dismissedIds);
  const typeFilter = options.typeFilter || 'all';
  const statusFilter = options.statusFilter || 'all';
  const query = (options.query || '').trim().toLowerCase();
  const now = options.now ?? Date.now();
  const limit = options.limit ?? 10;
  const workItemById = new Map(workItems.map(item => [item.id, item]));
  const sortMode = options.sortMode || 'priority';

  if (options.collapseStagesByWorkItem) {
    return buildCollapsedRecentQueueItems(artifacts, workItemById, prefs, options);
  }

  const filterContext: QueueFilterContext = {
    dismissedIds,
    options,
    typeFilter,
    statusFilter,
    query,
  };

  let filtered = artifacts.filter(artifact => {
    const workItem = workItemById.get(artifact.workItemId) || null;
    return matchesQueueFilters(artifact, workItem, filterContext);
  });

  filtered = sortQueueArtifacts(
    filtered,
    workItemById,
    pinnedIds,
    prefs.lastOpenedAt,
    sortMode
  ).slice(0, limit);

  if (!options.groupByWorkItem) {
    return filtered.map(artifact => {
      const stagePayloadStatuses = {
        [artifact.id]: options.payloadStatuses?.[artifact.id] || 'unknown',
      };
      return toQueueItem(artifact, workItemById.get(artifact.workItemId) || null, prefs, now, {
        stagePayloadStatuses,
      });
    });
  }

  const groups = new Map<string, AppCenterArtifactEnvelope[]>();
  filtered.forEach(artifact => {
    const key = artifact.workItemId || artifact.id;
    const list = groups.get(key) || [];
    list.push(artifact);
    groups.set(key, list);
  });

  const items: RecentQueueItem[] = [];
  groups.forEach((groupArtifacts, workItemId) => {
    const workItem = workItemById.get(workItemId) || null;
    const progress = workItem ? getWorkItemProgress(workItem.id) : null;
    const headerArtifact = groupArtifacts[0];
    if (!headerArtifact) return;

    items.push(
      toQueueItem(headerArtifact, workItem, prefs, now, {
        isGroupHeader: true,
        groupTitle:
          workItem?.title ||
          `${workItem?.marketplace || ''} ${workItem?.asinOrSku || workItemId}`.trim(),
      })
    );
    // Attach progress on header
    const header = items[items.length - 1];
    if (header) header.progressLabel = progress?.label;

    groupArtifacts.forEach(artifact => {
      const item = toQueueItem(artifact, workItem, prefs, now);
      item.payloadStatus = options.payloadStatuses?.[artifact.id] || 'unknown';
      item.stagePayloadStatuses = { [artifact.id]: item.payloadStatus };
      item.hasMissingPayload = item.payloadStatus === 'missing';
      items.push(item);
    });
  });

  return items;
}

export function getWorkItemArtifactsForProgress(workItemId: string): AppCenterArtifactEnvelope[] {
  return getArtifactsForWorkItem(workItemId);
}
