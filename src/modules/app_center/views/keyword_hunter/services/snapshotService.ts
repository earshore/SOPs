import { appStore } from '@/stores/useAppStore';
import { LocalDataStore } from '@/services/localDataStore';
import {
  getRuntimeStorageStrategyOptions,
  StorageService,
  STORAGE_KEYS,
} from '@/services/storageService';
import type {
  KeywordHunterSnapshotSource,
  KeywordHunterSnapshot,
  KeywordHunterSnapshotDiff,
  KeywordHunterSnapshotResult,
  KeywordHunterSnapshotStatus,
} from '@/types/modules-business';
import type { KeywordTrackerState } from '@/types/state';
import { SystemError } from '@/common/errors/AppError';
import { registerKeywordSnapshotArtifact } from '../../../artifactEnvelopeService';
import { getWorkspaceContext } from '../../../workspaceContext';

const SNAPSHOT_STORAGE_KEY = STORAGE_KEYS.KEYWORD_HUNTER_SNAPSHOTS;
const INDEXED_SNAPSHOT_STORAGE_KEY = `user:${SNAPSHOT_STORAGE_KEY}`;
const MANUAL_SOURCE = { type: 'manual' as const };

interface SaveSnapshotOptions {
  title?: string;
  status?: KeywordHunterSnapshotStatus;
  updateCurrent?: boolean;
}

function getSnapshotTime(snapshot: KeywordHunterSnapshot): number {
  const time = new Date(snapshot.updatedAt || snapshot.createdAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortSnapshots(snapshots: KeywordHunterSnapshot[]): KeywordHunterSnapshot[] {
  return [...snapshots].sort((a, b) => getSnapshotTime(b) - getSnapshotTime(a));
}

function trimSnapshots(snapshots: KeywordHunterSnapshot[]): KeywordHunterSnapshot[] {
  const maxItems = getRuntimeStorageStrategyOptions().historyMaxItems;
  return sortSnapshots(snapshots).slice(0, maxItems);
}

function createSnapshotId(existing: KeywordHunterSnapshot[]): string {
  let id = `kh-${Date.now().toString(36)}`;
  let suffix = 1;
  while (existing.some(snapshot => snapshot.id === id)) {
    suffix += 1;
    id = `kh-${Date.now().toString(36)}-${suffix}`;
  }
  return id;
}

function hashText(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase();
}

function getMatchedCountMap(snapshot: KeywordHunterSnapshot): Map<string, number> {
  return new Map(
    snapshot.result.matchedKeywords.map(item => [normalizeKeyword(item.keyword), item.count])
  );
}

function getKeywordSet(keywords: string[]): Set<string> {
  return new Set(keywords.map(normalizeKeyword).filter(Boolean));
}

function getCoverageRate(tracker: KeywordTrackerState): number {
  const total = tracker.keywords.length;
  if (total === 0) return 0;
  return Math.round((tracker.matchedKeywords.length / total) * 100);
}

function getSnapshotStatus(
  tracker: KeywordTrackerState,
  explicitStatus?: KeywordHunterSnapshotStatus
): KeywordHunterSnapshotStatus {
  if (explicitStatus) return explicitStatus;
  if (tracker.llmAnalysisResult?.trim()) return 'reported';
  if (tracker.keywords.length > 0 || tracker.matchedKeywords.length > 0) return 'matched';
  return 'draft';
}

function getDefaultTitle(tracker: KeywordTrackerState): string {
  const firstKeyword =
    tracker.keywords[0] || tracker.keywordsInputText?.split(/\n|,|;/).find(Boolean);
  if (firstKeyword?.trim()) {
    return `${firstKeyword.trim()} · Keyword Snapshot`;
  }

  return `Keyword Snapshot ${new Date().toLocaleString()}`;
}

function createResult(tracker: KeywordTrackerState): KeywordHunterSnapshotResult {
  return {
    keywords: [...tracker.keywords],
    processedCopy: tracker.processedCopy || tracker.copyInputText || '',
    matchedKeywords: tracker.matchedKeywords.map(item => ({ ...item })),
    unmatchedKeywords: [...tracker.unmatchedKeywords],
    wordFrequency: tracker.wordFrequency.map(([word, count]) => [word, count]),
    paragraphs: tracker.paragraphs.map(paragraph =>
      typeof paragraph === 'string' ? paragraph : { ...paragraph }
    ),
    llmAnalysisResult: tracker.llmAnalysisResult || '',
    showTranslation: tracker.showTranslation,
    translationMode: tracker.translationMode,
    coverageRate: getCoverageRate(tracker),
  };
}

function createSnapshotFingerprint(tracker: KeywordTrackerState): string {
  return hashText(
    JSON.stringify({
      keywords: tracker.keywords,
      copy: tracker.processedCopy || tracker.copyInputText || '',
      matched: tracker.matchedKeywords,
      unmatched: tracker.unmatchedKeywords,
      report: tracker.llmAnalysisResult || '',
      settings: tracker.settings,
    })
  );
}

function createSnapshotSource(): KeywordHunterSnapshotSource {
  const context = getWorkspaceContext();
  if (!context.workItemId) {
    return { ...MANUAL_SOURCE };
  }

  return {
    type: 'manual',
    workItemId: context.workItemId,
    sourceRoute: context.sourceRoute || undefined,
    sourceAsinOrSku: context.asinOrSku || undefined,
  };
}

function createWorkflowFingerprintFromKeywordHunterState(tracker: KeywordTrackerState): string {
  return hashText(
    JSON.stringify({
      keywordsInputText: tracker.keywordsInputText || tracker.keywords.join('\n'),
      copyInputText: getSnapshotCopyText(tracker),
      processedCopy: tracker.processedCopy || tracker.copyInputText || '',
      keywords: tracker.keywords,
      settings: tracker.settings,
    })
  );
}

function createWorkflowFingerprintFromSnapshot(snapshot: KeywordHunterSnapshot): string {
  return hashText(
    JSON.stringify({
      keywordsInputText: snapshot.input.keywordsInputText,
      copyInputText: snapshot.input.copyInputText,
      processedCopy: snapshot.result.processedCopy || snapshot.input.copyInputText || '',
      keywords: snapshot.result.keywords,
      settings: snapshot.input.settings,
    })
  );
}

function getMatchingWorkflowSnapshot(
  tracker: KeywordTrackerState,
  existing: KeywordHunterSnapshot[],
  options: SaveSnapshotOptions
): KeywordHunterSnapshot | undefined {
  if (options.updateCurrent === false || options.title?.trim()) return undefined;

  const trackerFingerprint = createWorkflowFingerprintFromKeywordHunterState(tracker);
  return existing.find(
    snapshot => createWorkflowFingerprintFromSnapshot(snapshot) === trackerFingerprint
  );
}

function getCurrentSnapshot(
  tracker: KeywordTrackerState,
  existing: KeywordHunterSnapshot[],
  options: SaveSnapshotOptions
): KeywordHunterSnapshot | undefined {
  if (options.updateCurrent === false) return undefined;
  if (tracker.currentSnapshotId) {
    const currentSnapshot = existing.find(snapshot => snapshot.id === tracker.currentSnapshotId);
    if (currentSnapshot) return currentSnapshot;
  }

  return getMatchingWorkflowSnapshot(tracker, existing, options);
}

function getSnapshotTitle(
  tracker: KeywordTrackerState,
  currentSnapshot: KeywordHunterSnapshot | undefined,
  options: SaveSnapshotOptions
): string {
  const title = options.title?.trim();
  if (title) return title;
  if (currentSnapshot?.title) return currentSnapshot.title;
  return getDefaultTitle(tracker);
}

function getSnapshotCopyText(tracker: KeywordTrackerState): string {
  return tracker.copyInputText || tracker.processedCopy || '';
}

function createSnapshotFromKeywordHunterState(
  tracker: KeywordTrackerState,
  existing: KeywordHunterSnapshot[],
  options: SaveSnapshotOptions = {}
): KeywordHunterSnapshot {
  const now = new Date().toISOString();
  const currentSnapshot = getCurrentSnapshot(tracker, existing, options);
  const id = currentSnapshot?.id || createSnapshotId(existing);
  const result = createResult(tracker);
  const copyText = getSnapshotCopyText(tracker);

  return {
    id,
    schemaVersion: 1,
    title: getSnapshotTitle(tracker, currentSnapshot, options),
    status: getSnapshotStatus(tracker, options.status),
    createdAt: currentSnapshot?.createdAt || now,
    updatedAt: now,
    source: createSnapshotSource(),
    input: {
      keywordsInputText: tracker.keywordsInputText || tracker.keywords.join('\n'),
      copyInputText: copyText,
      settings: { ...tracker.settings },
    },
    result,
    derived: {
      keywordCount: result.keywords.length,
      matchedCount: result.matchedKeywords.length,
      unmatchedCount: result.unmatchedKeywords.length,
      copyHash: hashText(copyText),
      snapshotFingerprint: createSnapshotFingerprint(tracker),
    },
  };
}

function upsertSnapshot(
  snapshots: KeywordHunterSnapshot[],
  snapshot: KeywordHunterSnapshot
): KeywordHunterSnapshot[] {
  const next = snapshots.filter(item => item.id !== snapshot.id);
  next.unshift(snapshot);
  return trimSnapshots(next);
}

function normalizeSnapshotSource(
  source: KeywordHunterSnapshot['source']
): KeywordHunterSnapshotSource {
  return source?.type === 'manual' ? { ...source } : { ...MANUAL_SOURCE };
}

function normalizeSnapshot(snapshot: KeywordHunterSnapshot): KeywordHunterSnapshot {
  return {
    ...snapshot,
    source: normalizeSnapshotSource(snapshot.source),
  };
}

function normalizeSnapshots(snapshots: KeywordHunterSnapshot[]): KeywordHunterSnapshot[] {
  return snapshots.map(normalizeSnapshot);
}

function restoreSnapshotToState(snapshot: KeywordHunterSnapshot): void {
  appStore.getState().updateKeywordTracker({
    keywordsInputText: snapshot.input.keywordsInputText,
    copyInputText: snapshot.input.copyInputText,
    keywords: [...snapshot.result.keywords],
    processedCopy: snapshot.result.processedCopy || snapshot.input.copyInputText,
    matchedKeywords: snapshot.result.matchedKeywords.map(item => ({ ...item })),
    unmatchedKeywords: [...snapshot.result.unmatchedKeywords],
    wordFrequency: snapshot.result.wordFrequency.map(([word, count]) => [word, count]),
    paragraphs: snapshot.result.paragraphs.map(paragraph =>
      typeof paragraph === 'string' ? paragraph : { ...paragraph }
    ),
    translationMode: !!snapshot.result.translationMode,
    showTranslation: !!snapshot.result.showTranslation,
    llmAnalysisResult: snapshot.result.llmAnalysisResult || '',
    settings: { ...snapshot.input.settings },
    currentSnapshotId: snapshot.id,
    snapshotSource: { ...MANUAL_SOURCE },
    keywordLocationIndex: {},
    isWindowMinimized: false,
  });
}

function clearCurrentSnapshotIfMatches(id: string): void {
  if (appStore.getState().keywordTracker.currentSnapshotId !== id) {
    return;
  }

  appStore.getState().updateKeywordTracker({
    currentSnapshotId: null,
    snapshotSource: { ...MANUAL_SOURCE },
  });
}

function compareKeywordSets(after: Set<string>, before: Set<string>): string[] {
  return [...after].filter(keyword => !before.has(keyword)).sort();
}

export const KeywordHunterSnapshotService = {
  getAll(): KeywordHunterSnapshot[] {
    try {
      return sortSnapshots(
        normalizeSnapshots(
          StorageService.get<KeywordHunterSnapshot[]>(SNAPSHOT_STORAGE_KEY, []) || []
        )
      );
    } catch (error) {
      console.error('[KeywordHunterSnapshotService] 读取历史快照失败:', error);
      return [];
    }
  },

  async getAllAsync(): Promise<KeywordHunterSnapshot[]> {
    try {
      const migrated = await LocalDataStore.migrateLocalStorageKey<KeywordHunterSnapshot[]>(
        SNAPSHOT_STORAGE_KEY,
        INDEXED_SNAPSHOT_STORAGE_KEY,
        'user-data'
      );

      if (migrated) {
        StorageService.remove(SNAPSHOT_STORAGE_KEY);
        return sortSnapshots(normalizeSnapshots(migrated));
      }

      return sortSnapshots(
        normalizeSnapshots(
          (await LocalDataStore.get<KeywordHunterSnapshot[]>(INDEXED_SNAPSHOT_STORAGE_KEY, [])) ||
            []
        )
      );
    } catch (error) {
      console.error('[KeywordHunterSnapshotService] 读取 IndexedDB 历史快照失败:', error);
      return this.getAll();
    }
  },

  getById(id: string): KeywordHunterSnapshot | undefined {
    return this.getAll().find(snapshot => snapshot.id === id);
  },

  saveCurrent(options: SaveSnapshotOptions = {}): KeywordHunterSnapshot {
    const snapshots = this.getAll();
    const snapshot = createSnapshotFromKeywordHunterState(
      appStore.getState().keywordTracker,
      snapshots,
      {
        updateCurrent: true,
        ...options,
      }
    );
    const next = upsertSnapshot(snapshots, snapshot);

    if (!StorageService.set(SNAPSHOT_STORAGE_KEY, next)) {
      throw new SystemError(
        '保存 Keyword Hunter 历史快照失败：本地存储空间不足',
        'KH_SNAPSHOT_001',
        { module: 'snapshotService', action: 'saveCurrent' }
      );
    }

    appStore.getState().updateKeywordTracker({
      currentSnapshotId: snapshot.id,
      snapshotSource: { ...snapshot.source },
    });
    registerKeywordSnapshotArtifact(snapshot, getWorkspaceContext());

    return snapshot;
  },

  async saveCurrentAsync(options: SaveSnapshotOptions = {}): Promise<KeywordHunterSnapshot> {
    const snapshots = await this.getAllAsync();
    const snapshot = createSnapshotFromKeywordHunterState(
      appStore.getState().keywordTracker,
      snapshots,
      {
        updateCurrent: true,
        ...options,
      }
    );
    const next = upsertSnapshot(snapshots, snapshot);
    const saved = await LocalDataStore.set(INDEXED_SNAPSHOT_STORAGE_KEY, next, 'user-data');

    if (!saved) {
      throw new SystemError(
        '保存 Keyword Hunter 历史快照失败：IndexedDB 不可写',
        'KH_SNAPSHOT_002',
        { module: 'snapshotService', action: 'saveCurrentAsync' }
      );
    }

    StorageService.remove(SNAPSHOT_STORAGE_KEY);
    appStore.getState().updateKeywordTracker({
      currentSnapshotId: snapshot.id,
      snapshotSource: { ...snapshot.source },
    });
    registerKeywordSnapshotArtifact(snapshot, getWorkspaceContext());

    return snapshot;
  },

  restore(snapshotOrId: KeywordHunterSnapshot | string): KeywordHunterSnapshot | null {
    const snapshot =
      typeof snapshotOrId === 'string'
        ? this.getById(snapshotOrId)
        : normalizeSnapshot(snapshotOrId);

    if (!snapshot) {
      return null;
    }

    restoreSnapshotToState(snapshot);
    return snapshot;
  },

  deleteById(id: string): boolean {
    const snapshots = this.getAll();
    const next = snapshots.filter(snapshot => snapshot.id !== id);
    if (next.length === snapshots.length) {
      return false;
    }

    if (!StorageService.set(SNAPSHOT_STORAGE_KEY, next)) {
      throw new SystemError(
        '删除 Keyword Hunter 历史快照失败：本地存储空间不足',
        'KH_SNAPSHOT_003',
        { module: 'snapshotService', action: 'deleteById' }
      );
    }

    clearCurrentSnapshotIfMatches(id);

    return true;
  },

  async deleteByIdAsync(id: string): Promise<boolean> {
    const snapshots = await this.getAllAsync();
    const next = snapshots.filter(snapshot => snapshot.id !== id);
    if (next.length === snapshots.length) {
      return false;
    }

    const saved = await LocalDataStore.set(INDEXED_SNAPSHOT_STORAGE_KEY, next, 'user-data');
    if (!saved) {
      throw new SystemError(
        '删除 Keyword Hunter 历史快照失败：IndexedDB 不可写',
        'KH_SNAPSHOT_004',
        { module: 'snapshotService', action: 'deleteByIdAsync' }
      );
    }

    StorageService.remove(SNAPSHOT_STORAGE_KEY);

    clearCurrentSnapshotIfMatches(id);

    return true;
  },

  async clearAsync(): Promise<void> {
    await LocalDataStore.remove(INDEXED_SNAPSHOT_STORAGE_KEY);
    StorageService.remove(SNAPSHOT_STORAGE_KEY);
    appStore.getState().updateKeywordTracker({
      currentSnapshotId: null,
      snapshotSource: { type: 'manual' },
    });
  },

  compare(before: KeywordHunterSnapshot, after: KeywordHunterSnapshot): KeywordHunterSnapshotDiff {
    const beforeKeywords = getKeywordSet(before.result.keywords);
    const afterKeywords = getKeywordSet(after.result.keywords);
    const beforeMatched = getMatchedCountMap(before);
    const afterMatched = getMatchedCountMap(after);
    const beforeMatchedSet = new Set(beforeMatched.keys());
    const afterMatchedSet = new Set(afterMatched.keys());

    const improvedKeywords: KeywordHunterSnapshotDiff['improvedKeywords'] = [];
    const declinedKeywords: KeywordHunterSnapshotDiff['declinedKeywords'] = [];

    afterMatched.forEach((afterCount, keyword) => {
      const beforeCount = beforeMatched.get(keyword) || 0;
      if (afterCount > beforeCount) {
        improvedKeywords.push({ keyword, before: beforeCount, after: afterCount });
      } else if (afterCount < beforeCount) {
        declinedKeywords.push({ keyword, before: beforeCount, after: afterCount });
      }
    });

    beforeMatched.forEach((beforeCount, keyword) => {
      if (!afterMatched.has(keyword)) {
        declinedKeywords.push({ keyword, before: beforeCount, after: 0 });
      }
    });

    return {
      addedKeywords: compareKeywordSets(afterKeywords, beforeKeywords),
      removedKeywords: compareKeywordSets(beforeKeywords, afterKeywords),
      newlyMatchedKeywords: compareKeywordSets(afterMatchedSet, beforeMatchedSet),
      newlyUnmatchedKeywords: compareKeywordSets(beforeMatchedSet, afterMatchedSet),
      improvedKeywords: improvedKeywords.sort((a, b) => a.keyword.localeCompare(b.keyword)),
      declinedKeywords: declinedKeywords.sort((a, b) => a.keyword.localeCompare(b.keyword)),
      coverageDelta: after.result.coverageRate - before.result.coverageRate,
    };
  },
};

export type { SaveSnapshotOptions };
