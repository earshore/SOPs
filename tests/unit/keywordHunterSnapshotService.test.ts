import { beforeEach, expect, it, vi } from 'vitest';
import type { KeywordHunterSnapshot } from '@/types/modules-business';
import { KeywordHunterSnapshotService } from '@/modules/app_center/views/keyword_hunter/services/snapshotService';
import { LocalDataStore } from '@/services/localDataStore';

const mocks = vi.hoisted(() => {
  const snapshots: KeywordHunterSnapshot[] = [];
  const state = {
    keywordTracker: {
      keywords: ['wireless earbuds', 'waterproof'],
      processedCopy: 'Wireless earbuds for travel.',
      formattedCopy: '',
      matchedKeywords: [{ keyword: 'wireless earbuds', count: 1 }],
      unmatchedKeywords: ['waterproof'],
      wordFrequency: [
        ['wireless', 1],
        ['earbuds', 1],
      ] as Array<[string, number]>,
      paragraphs: [],
      translationMode: false,
      keywordLocationIndex: {},
      settings: {
        matchPlural: true,
        matchStem: true,
        matchCase: false,
        matchPartial: false,
      },
      isWindowMinimized: false,
      keywordsInputText: 'wireless earbuds\nwaterproof',
      copyInputText: 'Wireless earbuds for travel.',
      llmAnalysisResult: '',
      showTranslation: false,
      currentSnapshotId: null as string | null,
      snapshotSource: {
        type: 'manual' as const,
      },
    },
    updateKeywordTracker: vi.fn((patch: Record<string, unknown>) => {
      Object.assign(state.keywordTracker, patch);
    }),
  };

  return {
    snapshots,
    indexedSnapshots: [] as KeywordHunterSnapshot[],
    setSnapshots: vi.fn((_key: string, next: KeywordHunterSnapshot[]) => {
      mocks.snapshots.splice(0, mocks.snapshots.length, ...next);
      return true;
    }),
    removeStorage: vi.fn(),
    localSet: vi.fn(async (_key: string, next: KeywordHunterSnapshot[]) => {
      mocks.indexedSnapshots = next;
      return true;
    }),
    localRemove: vi.fn(async () => {
      mocks.indexedSnapshots = [];
    }),
    workspaceContext: {
      workItemId: null as string | null,
      marketplace: '',
      language: '',
      asinOrSku: '',
      sourceRoute: '',
      updatedAt: '',
    },
    registerKeywordSnapshotArtifact: vi.fn(),
    state,
  };
});

vi.mock('@/common/config/ConfigCenter', () => ({
  configCenter: {
    get: vi.fn(() => undefined),
  },
}));

vi.mock('@/services/storageService', () => ({
  STORAGE_KEYS: {
    KEYWORD_HUNTER_SNAPSHOTS: 'keyword_hunter_snapshots',
  },
  getRuntimeStorageStrategyOptions: vi.fn(() => ({
    historyMaxItems: 50,
    lruWarningThreshold: 0.8,
    lruCleanupRatio: 0.3,
  })),
  StorageService: {
    get: vi.fn(() => mocks.snapshots),
    set: mocks.setSnapshots,
    remove: mocks.removeStorage,
  },
}));

vi.mock('@/services/localDataStore', () => ({
  LocalDataStore: {
    migrateLocalStorageKey: vi.fn(async () => null),
    get: vi.fn(async () => mocks.indexedSnapshots),
    set: mocks.localSet,
    remove: mocks.localRemove,
  },
}));

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: vi.fn(() => mocks.state),
  },
}));

vi.mock('@/modules/app_center/workspaceContext', () => ({
  getWorkspaceContext: vi.fn(() => mocks.workspaceContext),
}));

vi.mock('@/modules/app_center/artifactEnvelopeService', () => ({
  registerKeywordSnapshotArtifact: mocks.registerKeywordSnapshotArtifact,
}));

const mockedLocalDataStore = vi.mocked(LocalDataStore);

function resetTracker(): void {
  mocks.snapshots.splice(0, mocks.snapshots.length);
  mocks.indexedSnapshots = [];
  mocks.state.keywordTracker = {
    keywords: ['wireless earbuds', 'waterproof'],
    processedCopy: 'Wireless earbuds for travel.',
    formattedCopy: '',
    matchedKeywords: [{ keyword: 'wireless earbuds', count: 1 }],
    unmatchedKeywords: ['waterproof'],
    wordFrequency: [
      ['wireless', 1],
      ['earbuds', 1],
    ],
    paragraphs: [],
    translationMode: false,
    keywordLocationIndex: {},
    settings: {
      matchPlural: true,
      matchStem: true,
      matchCase: false,
      matchPartial: false,
    },
    isWindowMinimized: false,
    keywordsInputText: 'wireless earbuds\nwaterproof',
    copyInputText: 'Wireless earbuds for travel.',
    llmAnalysisResult: '',
    showTranslation: false,
    currentSnapshotId: null,
    snapshotSource: {
      type: 'manual',
    },
  };
  mocks.workspaceContext = {
    workItemId: null,
    marketplace: '',
    language: '',
    asinOrSku: '',
    sourceRoute: '',
    updatedAt: '',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetTracker();
});

it('saves the current Keyword Hunter state as a snapshot', () => {
  mocks.state.keywordTracker.snapshotSource = {
    type: 'legacy-external',
    externalId: 'legacy-001',
  } as never;

  const snapshot = KeywordHunterSnapshotService.saveCurrent({
    title: 'Travel earbuds coverage',
  });

  expect(snapshot.title).toBe('Travel earbuds coverage');
  expect(snapshot.status).toBe('matched');
  expect(snapshot.source).toEqual({ type: 'manual' });
  expect(snapshot.result.coverageRate).toBe(50);
  expect(snapshot.derived.keywordCount).toBe(2);
  expect(mocks.snapshots).toEqual([snapshot]);
  expect(mocks.state.keywordTracker.currentSnapshotId).toBe(snapshot.id);
  expect(mocks.state.keywordTracker.snapshotSource).toEqual({ type: 'manual' });
});

it('records the active App Center work item on Keyword Hunter snapshots', () => {
  mocks.workspaceContext = {
    workItemId: 'competitor_listing:hist-001',
    marketplace: 'DE',
    language: 'German',
    asinOrSku: 'B000000001',
    sourceRoute: 'keyword_hunter_analysis',
    updatedAt: '2026-01-01T00:30:00.000Z',
  };

  const snapshot = KeywordHunterSnapshotService.saveCurrent({
    title: 'Workflow keyword review',
  });

  expect(snapshot.source).toEqual({
    type: 'manual',
    workItemId: 'competitor_listing:hist-001',
    sourceRoute: 'keyword_hunter_analysis',
    sourceAsinOrSku: 'B000000001',
  });
  expect(mocks.registerKeywordSnapshotArtifact).toHaveBeenCalledWith(
    snapshot,
    mocks.workspaceContext
  );
});

it('updates the loaded snapshot instead of creating duplicates', () => {
  const first = KeywordHunterSnapshotService.saveCurrent({ title: 'Initial' });
  mocks.state.keywordTracker.llmAnalysisResult = '# Report';

  const updated = KeywordHunterSnapshotService.saveCurrent();

  expect(updated.id).toBe(first.id);
  expect(updated.createdAt).toBe(first.createdAt);
  expect(updated.status).toBe('reported');
  expect(mocks.snapshots).toHaveLength(1);
});

it('upgrades the matching draft snapshot when the current snapshot pointer is missing', async () => {
  const draft = await KeywordHunterSnapshotService.saveCurrentAsync({
    title: 'Draft before report',
  });

  mocks.state.keywordTracker.currentSnapshotId = null;
  mocks.state.keywordTracker.llmAnalysisResult = '# Report';

  const reported = await KeywordHunterSnapshotService.saveCurrentAsync({ status: 'reported' });

  expect(reported.id).toBe(draft.id);
  expect(reported.createdAt).toBe(draft.createdAt);
  expect(reported.title).toBe('Draft before report');
  expect(reported.status).toBe('reported');
  expect(reported.result.llmAnalysisResult).toBe('# Report');
  expect(mocks.indexedSnapshots).toHaveLength(1);
  expect(mocks.state.keywordTracker.currentSnapshotId).toBe(draft.id);
});

it('restores a saved snapshot into Keyword Hunter state', () => {
  const snapshot = KeywordHunterSnapshotService.saveCurrent();

  mocks.state.keywordTracker.keywords = [];
  mocks.state.keywordTracker.matchedKeywords = [];
  mocks.state.keywordTracker.currentSnapshotId = null;

  const restored = KeywordHunterSnapshotService.restore(snapshot.id);

  expect(restored?.id).toBe(snapshot.id);
  expect(mocks.state.keywordTracker.keywords).toEqual(['wireless earbuds', 'waterproof']);
  expect(mocks.state.keywordTracker.matchedKeywords).toEqual([
    { keyword: 'wireless earbuds', count: 1 },
  ]);
  expect(mocks.state.keywordTracker.snapshotSource).toEqual({ type: 'manual' });
});

it('saves and restores input, process, and analysis state in one snapshot', () => {
  Object.assign(mocks.state.keywordTracker, {
    keywordsInputText: 'wireless earbuds\ncharging case',
    copyInputText: 'Wireless earbuds copy',
    keywords: ['wireless earbuds', 'charging case'],
    processedCopy: 'Wireless earbuds processed copy',
    matchedKeywords: [{ keyword: 'wireless earbuds', count: 2 }],
    unmatchedKeywords: ['charging case'],
    wordFrequency: [['wireless', 2]],
    paragraphs: [
      {
        original: 'Wireless earbuds processed copy',
        translation: '无线耳机处理后文案',
      },
    ],
    translationMode: true,
    showTranslation: true,
    llmAnalysisResult: '## 88/100',
  });

  const snapshot = KeywordHunterSnapshotService.saveCurrent();

  expect(snapshot.status).toBe('reported');
  expect(snapshot.input).toMatchObject({
    keywordsInputText: 'wireless earbuds\ncharging case',
    copyInputText: 'Wireless earbuds copy',
  });
  expect(snapshot.result).toMatchObject({
    processedCopy: 'Wireless earbuds processed copy',
    matchedKeywords: [{ keyword: 'wireless earbuds', count: 2 }],
    unmatchedKeywords: ['charging case'],
    wordFrequency: [['wireless', 2]],
    llmAnalysisResult: '## 88/100',
    showTranslation: true,
    translationMode: true,
  });
  expect(snapshot.result.paragraphs).toEqual([
    {
      original: 'Wireless earbuds processed copy',
      translation: '无线耳机处理后文案',
    },
  ]);

  Object.assign(mocks.state.keywordTracker, {
    keywordsInputText: '',
    copyInputText: '',
    keywords: [],
    processedCopy: '',
    matchedKeywords: [],
    unmatchedKeywords: [],
    wordFrequency: [],
    paragraphs: [],
    translationMode: false,
    showTranslation: false,
    llmAnalysisResult: '',
  });

  KeywordHunterSnapshotService.restore(snapshot.id);

  expect(mocks.state.keywordTracker.keywordsInputText).toBe('wireless earbuds\ncharging case');
  expect(mocks.state.keywordTracker.copyInputText).toBe('Wireless earbuds copy');
  expect(mocks.state.keywordTracker.processedCopy).toBe('Wireless earbuds processed copy');
  expect(mocks.state.keywordTracker.matchedKeywords).toEqual([
    { keyword: 'wireless earbuds', count: 2 },
  ]);
  expect(mocks.state.keywordTracker.paragraphs).toEqual([
    {
      original: 'Wireless earbuds processed copy',
      translation: '无线耳机处理后文案',
    },
  ]);
  expect(mocks.state.keywordTracker.llmAnalysisResult).toBe('## 88/100');
});

it('normalizes legacy external source metadata to manual input', () => {
  const snapshot = KeywordHunterSnapshotService.saveCurrent({ title: 'Legacy' });
  mocks.snapshots[0] = {
    ...snapshot,
    source: {
      type: 'legacy-external',
      externalId: 'legacy-001',
    } as never,
  };

  const restored = KeywordHunterSnapshotService.restore(snapshot.id);

  expect(KeywordHunterSnapshotService.getAll()[0]?.source).toEqual({ type: 'manual' });
  expect(restored?.source).toEqual({ type: 'manual' });
  expect(mocks.state.keywordTracker.snapshotSource).toEqual({ type: 'manual' });
});

it('deletes a snapshot and clears the current snapshot pointer when needed', () => {
  const snapshot = KeywordHunterSnapshotService.saveCurrent();

  const deleted = KeywordHunterSnapshotService.deleteById(snapshot.id);

  expect(deleted).toBe(true);
  expect(mocks.snapshots).toEqual([]);
  expect(mocks.state.keywordTracker.currentSnapshotId).toBeNull();
});

it('compares keyword coverage between two snapshots', () => {
  const before = KeywordHunterSnapshotService.saveCurrent({
    title: 'Before',
    updateCurrent: false,
  });

  mocks.state.keywordTracker.keywords = ['wireless earbuds', 'waterproof', 'charging case'];
  mocks.state.keywordTracker.matchedKeywords = [
    { keyword: 'wireless earbuds', count: 2 },
    { keyword: 'waterproof', count: 1 },
  ];
  mocks.state.keywordTracker.unmatchedKeywords = ['charging case'];

  const after = KeywordHunterSnapshotService.saveCurrent({
    title: 'After',
    updateCurrent: false,
  });

  const diff = KeywordHunterSnapshotService.compare(before, after);

  expect(diff.addedKeywords).toEqual(['charging case']);
  expect(diff.newlyMatchedKeywords).toEqual(['waterproof']);
  expect(diff.improvedKeywords).toContainEqual({
    keyword: 'wireless earbuds',
    before: 1,
    after: 2,
  });
  expect(diff.coverageDelta).toBe(17);
});

it('saves async snapshots in IndexedDB and removes the localStorage mirror', async () => {
  const snapshot = await KeywordHunterSnapshotService.saveCurrentAsync({
    title: 'Indexed snapshot',
  });

  expect(mocks.indexedSnapshots).toEqual([snapshot]);
  expect(mocks.removeStorage).toHaveBeenCalledWith('keyword_hunter_snapshots');
  expect(mocks.state.keywordTracker.currentSnapshotId).toBe(snapshot.id);
});

it('finds and restores an IndexedDB snapshot by ID after localStorage is empty', async () => {
  const snapshot = await KeywordHunterSnapshotService.saveCurrentAsync({
    title: 'Cold-start snapshot',
  });
  mocks.snapshots.splice(0, mocks.snapshots.length);
  mocks.state.keywordTracker.copyInputText = '';

  await expect(KeywordHunterSnapshotService.getByIdAsync(snapshot.id)).resolves.toEqual(snapshot);
  await expect(KeywordHunterSnapshotService.restoreAsync(snapshot.id)).resolves.toEqual(snapshot);
  expect(mocks.state.keywordTracker.copyInputText).toBe('Wireless earbuds for travel.');
});

it('removes legacy localStorage snapshots after a successful migration', async () => {
  const snapshot = KeywordHunterSnapshotService.saveCurrent({
    title: 'Legacy snapshot',
    updateCurrent: false,
  });
  mocks.removeStorage.mockClear();
  mockedLocalDataStore.migrateLocalStorageKey.mockResolvedValueOnce([snapshot]);

  await expect(KeywordHunterSnapshotService.getAllAsync()).resolves.toEqual([snapshot]);

  expect(mocks.removeStorage).toHaveBeenCalledWith('keyword_hunter_snapshots');
});
