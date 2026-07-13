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

export interface RecentQueueViewOptions {
  typeFilter?: AppCenterArtifactType | 'all';
  query?: string;
  groupByWorkItem?: boolean;
  includeDismissed?: boolean;
  dismissedOnly?: boolean;
  statusFilter?: 'all' | 'actionable' | 'review' | 'missing';
  payloadStatuses?: Readonly<Record<string, 'available' | 'missing' | 'unknown'>>;
  now?: number;
  limit?: number;
}

export interface RecentQueueItem {
  artifact: AppCenterArtifactEnvelope;
  workItem: AppCenterWorkItem | null;
  pinned: boolean;
  dismissed: boolean;
  needsAttention: boolean;
  payloadStatus: 'available' | 'missing' | 'unknown';
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
  lastOpenedAt: Readonly<Record<string, string>>
): AppCenterArtifactEnvelope[] {
  const getRank = (artifact: AppCenterArtifactEnvelope): number[] => [
    pinnedIds.has(artifact.id) ? 1 : 0,
    artifactNeedsAttention(artifact, workItemById.get(artifact.workItemId) || null) ? 1 : 0,
    getTime(lastOpenedAt[artifact.id] || ''),
    getTime(artifact.createdAt),
  ];
  return [...artifacts].sort((left, right) => compareRanks(getRank(left), getRank(right)));
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
  options?: { isGroupHeader?: boolean; groupTitle?: string }
): RecentQueueItem {
  const progress = workItem ? getWorkItemProgress(workItem.id) : null;
  return {
    artifact,
    workItem,
    pinned: prefs.pinnedIds.includes(artifact.id),
    dismissed: prefs.dismissedIds.includes(artifact.id),
    needsAttention: artifactNeedsAttention(artifact, workItem),
    payloadStatus: 'unknown',
    isGroupHeader: Boolean(options?.isGroupHeader),
    groupTitle: options?.groupTitle,
    progressLabel: progress?.label,
    presentation: buildRecentArtifactPresentation(artifact, workItem, now),
  };
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

  filtered = sortQueueArtifacts(filtered, workItemById, pinnedIds, prefs.lastOpenedAt).slice(
    0,
    limit
  );

  if (!options.groupByWorkItem) {
    return filtered.map(artifact => {
      const item = toQueueItem(artifact, workItemById.get(artifact.workItemId) || null, prefs, now);
      item.payloadStatus = options.payloadStatuses?.[artifact.id] || 'unknown';
      return item;
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
      items.push(item);
    });
  });

  return items;
}

export function getWorkItemArtifactsForProgress(workItemId: string): AppCenterArtifactEnvelope[] {
  return getArtifactsForWorkItem(workItemId);
}
