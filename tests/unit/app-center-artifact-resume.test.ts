import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AppCenterArtifactEnvelope,
  AppCenterWorkItem,
} from '@/modules/app_center/artifactEnvelopeService';
import {
  clearArtifactEnvelopeIndex,
  getArtifactsForWorkItem,
  getRecentArtifacts,
  registerComplianceCheckArtifact,
  registerHistoryArtifacts,
  registerKeywordSnapshotArtifact,
  registerPpcActionListArtifact,
} from '@/modules/app_center/artifactEnvelopeService';
import {
  APP_CENTER_ARTIFACTS_CHANGED,
  buildResumePlan,
  buildResumePlanAsync,
  executeResumePlan,
  getArtifactResumeActions,
  getArtifactOpenRouteId,
  getArtifactNextRouteId,
  parseArtifactPayloadRef,
  resolveResumePayloadStatus,
  resolveResumePayloadStatusAsync,
} from '@/modules/app_center/artifactResumeService';
import { clearWorkspaceContext, getWorkspaceContext } from '@/modules/app_center/workspaceContext';
import type {
  GeneratedPromptRecord,
  HistoryItem,
  KeywordHunterSnapshot,
  ScrapedData,
} from '@/types/modules-business';
import type { AppCenterWorkspaceContext } from '@/modules/app_center/workspaceContext';
import eventBus from '@/common/EventBus';

const historyMocks = vi.hoisted(() => ({
  getById: vi.fn(),
  getByIdAsync: vi.fn(),
  getAllAsync: vi.fn(),
}));

const snapshotMocks = vi.hoisted(() => ({
  getById: vi.fn(),
  getByIdAsync: vi.fn(),
  restore: vi.fn(),
  restoreAsync: vi.fn(),
}));

const ppcSnapshotMocks = vi.hoisted(() => ({
  getById: vi.fn(),
  queueResume: vi.fn(),
}));

const appStoreMocks = vi.hoisted(() => {
  const state = {
    setCurrentHistoryId: vi.fn(),
    setScrapedData: vi.fn(),
    setAnalysisReport: vi.fn(),
    setSelectedSite: vi.fn(),
    setTranslatedReport: vi.fn(),
    setUserProductProfile: vi.fn(),
    updateKeywordTracker: vi.fn(),
  };
  return {
    state,
    getState: vi.fn(() => state),
  };
});

vi.mock('@/modules/app_center/views/master_analysis/services/historyService', () => ({
  HistoryService: {
    getById: historyMocks.getById,
    getByIdAsync: historyMocks.getByIdAsync,
    getAllAsync: historyMocks.getAllAsync,
  },
}));

vi.mock('@/modules/app_center/views/keyword_hunter/services/snapshotService', () => ({
  KeywordHunterSnapshotService: {
    getById: snapshotMocks.getById,
    getByIdAsync: snapshotMocks.getByIdAsync,
    restore: snapshotMocks.restore,
    restoreAsync: snapshotMocks.restoreAsync,
  },
}));

vi.mock(
  '@/modules/app_center/views/ppc_tools/ppc_search_terms/export/actionListSnapshotService',
  () => ({
    getPpcActionListSnapshotById: ppcSnapshotMocks.getById,
    queuePpcActionListResume: ppcSnapshotMocks.queueResume,
  })
);

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: appStoreMocks.getState,
  },
}));

function createScrapedData(): ScrapedData {
  return {
    metadata: {
      scrape_timestamp: '2026-01-01T00:00:00.000Z',
      marketplace: 'DE',
      domain: 'amazon.de',
      language: 'German',
      total_asins: 1,
    },
    products: [
      {
        asin: 'B000000001',
        url: '',
        language: 'German',
        productTitle: 'Product',
        feature_bullets: [],
        customer_reviews: [],
        scrape_status: 'success',
        error: '',
      },
    ],
  };
}

function createHistoryItem(): HistoryItem {
  return {
    id: 'hist-001',
    timestamp: '2026-01-01T00:00:00.000Z',
    site: 'DE',
    asins: ['B000000001'],
    data: createScrapedData(),
    analysisStatus: {
      isAnalyzed: true,
      analyzedAt: '2026-01-01T00:10:00.000Z',
      analysisReport: { type: 'analysis', data: 'report' } as never,
    },
  };
}

function createPromptRecord(): GeneratedPromptRecord {
  return {
    id: 'listing-prompt-001',
    type: 'listing',
    prompt: 'Exact listing prompt',
    generatedAt: '2026-01-01T00:20:00.000Z',
    historyId: 'hist-001',
    asins: ['B000000001'],
    marketplace: 'DE',
    profile: {
      targetMarket: 'German',
      keywordsTier1: 'haupt keyword',
      keywordsTier2: 'longtail keyword',
    },
  };
}

function createWorkItem(overrides: Partial<AppCenterWorkItem> = {}): AppCenterWorkItem {
  return {
    id: 'competitor_listing:hist-001',
    type: 'competitor_listing',
    title: 'DE B000000001 Listing 作业',
    status: 'in_progress',
    marketplace: 'DE',
    asinOrSku: 'B000000001',
    sourceRoute: 'scraper',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:10:00.000Z',
    ...overrides,
  };
}

function createEnvelope(
  overrides: Partial<AppCenterArtifactEnvelope> = {}
): AppCenterArtifactEnvelope {
  return {
    id: 'competitor_listing:hist-001:scrape_history',
    workItemId: 'competitor_listing:hist-001',
    type: 'scrape_history',
    sourceRoute: 'scraper',
    title: '采集历史',
    summary: 'DE · 1 ASIN',
    payloadRef: 'history:hist-001',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createWorkspaceContext(): AppCenterWorkspaceContext {
  return {
    workItemId: 'competitor_listing:hist-001',
    marketplace: 'DE',
    language: 'German',
    asinOrSku: 'B000000001',
    sourceRoute: 'keyword_hunter_analysis',
    updatedAt: '2026-01-01T00:30:00.000Z',
  };
}

function createKeywordSnapshot(): KeywordHunterSnapshot {
  return {
    id: 'kh-001',
    schemaVersion: 1,
    title: 'Keyword review',
    status: 'reported',
    createdAt: '2026-01-01T00:30:00.000Z',
    updatedAt: '2026-01-01T00:30:00.000Z',
    source: { type: 'manual' },
    input: {
      keywordsInputText: 'haupt keyword',
      copyInputText: 'Listing copy',
      settings: {
        matchPlural: true,
        matchStem: true,
        matchCase: false,
        matchPartial: false,
      },
    },
    result: {
      keywords: ['haupt keyword'],
      processedCopy: 'Listing copy',
      matchedKeywords: [{ keyword: 'haupt keyword', count: 1 }],
      unmatchedKeywords: [],
      wordFrequency: [['haupt', 1]],
      paragraphs: [],
      llmAnalysisResult: 'Looks good',
      coverageRate: 100,
    },
    derived: {
      keywordCount: 1,
      matchedCount: 1,
      unmatchedCount: 0,
      copyHash: 'copy-hash',
      snapshotFingerprint: 'fingerprint',
    },
  };
}

describe('App Center artifact resume protocol', () => {
  beforeEach(() => {
    localStorage.clear();
    clearArtifactEnvelopeIndex();
    clearWorkspaceContext();
    historyMocks.getById.mockReset();
    historyMocks.getByIdAsync.mockReset();
    historyMocks.getAllAsync.mockReset();
    snapshotMocks.getById.mockReset();
    snapshotMocks.getByIdAsync.mockReset();
    snapshotMocks.restore.mockReset();
    snapshotMocks.restoreAsync.mockReset();
    ppcSnapshotMocks.getById.mockReset();
    ppcSnapshotMocks.queueResume.mockReset();
    Object.values(appStoreMocks.state).forEach(fn => fn.mockReset());
    vi.restoreAllMocks();
  });

  it('parses payload refs for history, prompt, snapshot, ppc, and compliance', () => {
    expect(parseArtifactPayloadRef('history:hist-001#analysis')).toEqual({
      kind: 'history',
      id: 'hist-001',
      fragment: 'analysis',
    });
    expect(parseArtifactPayloadRef('prompt:listing-prompt-001')).toEqual({
      kind: 'prompt',
      id: 'listing-prompt-001',
    });
    expect(parseArtifactPayloadRef('keyword_snapshot:kh-001')).toEqual({
      kind: 'keyword_snapshot',
      id: 'kh-001',
    });
    expect(parseArtifactPayloadRef('ppc_action_list:ppc-export-001')).toEqual({
      kind: 'ppc_action_list',
      id: 'ppc-export-001',
    });
    expect(parseArtifactPayloadRef('compliance_check:comp-001')).toEqual({
      kind: 'compliance_check',
      id: 'comp-001',
    });
  });

  it('maps open vs next routes by artifact type', () => {
    expect(getArtifactOpenRouteId('scrape_history')).toBe('scraper');
    expect(getArtifactNextRouteId('scrape_history')).toBe('ai_analysis');
    expect(getArtifactOpenRouteId('analysis_report')).toBe('ai_analysis');
    expect(getArtifactNextRouteId('analysis_report')).toBe('promptlab');
    expect(getArtifactOpenRouteId('listing_prompt')).toBe('promptlab');
    expect(getArtifactNextRouteId('listing_prompt')).toBe('keyword_hunter_input');
    expect(getArtifactOpenRouteId('keyword_snapshot')).toBe('keyword_hunter_analysis');
    expect(getArtifactNextRouteId('keyword_snapshot')).toBe('keyword_hunter_analysis');
    expect(getArtifactOpenRouteId('ppc_action_list')).toBe('ppc_search_terms');
    expect(getArtifactNextRouteId('ppc_action_list')).toBe('ppc_search_terms');
    expect(getArtifactOpenRouteId('compliance_check')).toBe('keyword_hunter_analysis');
    expect(getArtifactNextRouteId('compliance_check')).toBe('sops_restricted_words');
  });

  it('uses result-specific action labels and removes duplicate PPC actions', () => {
    expect(getArtifactResumeActions('scrape_history').map(action => action.label)).toEqual([
      '查看采集数据',
      '开始 AI 分析',
    ]);
    expect(getArtifactResumeActions('listing_prompt').map(action => action.label)).toEqual([
      '查看此 Prompt',
      '进入关键词复核',
    ]);
    expect(getArtifactResumeActions('ppc_action_list').map(action => action.label)).toEqual([
      '查看 PPC 建议',
    ]);
  });

  it('checks IndexedDB-backed history during cold-start resume', async () => {
    historyMocks.getById.mockReturnValue(undefined);
    historyMocks.getByIdAsync.mockResolvedValue(createHistoryItem());

    await expect(resolveResumePayloadStatusAsync(createEnvelope())).resolves.toBe('available');
    const plan = await buildResumePlanAsync(createEnvelope(), createWorkItem(), 'open');
    expect(plan.ok).toBe(true);
  });

  it('builds an open plan that restores workspace context and history payload', () => {
    historyMocks.getById.mockReturnValue(createHistoryItem());

    const plan = buildResumePlan(createEnvelope(), createWorkItem(), 'open', {
      historyExists: id => id === 'hist-001',
    });

    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.routeId).toBe('scraper');
    expect(plan.mode).toBe('open');
    expect(plan.payloadStatus).toBe('available');
    expect(plan.workspaceUpdates.workItemId).toBe('competitor_listing:hist-001');
    expect(plan.workspaceUpdates.marketplace).toBe('DE');
    expect(plan.workspaceUpdates.asinOrSku).toBe('B000000001');
    expect(plan.restore.historyId).toBe('hist-001');
  });

  it('builds a continue plan that targets the next step route', () => {
    historyMocks.getById.mockReturnValue(createHistoryItem());

    const plan = buildResumePlan(createEnvelope(), createWorkItem(), 'continue', {
      historyExists: id => id === 'hist-001',
    });

    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.routeId).toBe('ai_analysis');
    expect(plan.mode).toBe('continue');
    expect(plan.restore.historyId).toBe('hist-001');
  });

  it('rejects missing payloads instead of navigating to a dead entry', () => {
    historyMocks.getById.mockReturnValue(undefined);

    const plan = buildResumePlan(createEnvelope(), createWorkItem(), 'continue', {
      historyExists: () => false,
    });

    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.payloadStatus).toBe('missing');
    expect(plan.reason).toMatch(/找不到|不存在|缺失|已删除/);
  });

  it('executes a plan by restoring store state and workspace context', async () => {
    const historyItem = createHistoryItem();
    historyMocks.getById.mockReturnValue(historyItem);
    historyMocks.getByIdAsync.mockResolvedValue(historyItem);

    const plan = buildResumePlan(createEnvelope(), createWorkItem(), 'open', {
      historyExists: id => id === 'hist-001',
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;

    const result = await executeResumePlan(plan);

    expect(result.ok).toBe(true);
    expect(appStoreMocks.state.setCurrentHistoryId).toHaveBeenCalledWith('hist-001');
    expect(appStoreMocks.state.setScrapedData).toHaveBeenCalledWith(historyItem.data);
    expect(appStoreMocks.state.setAnalysisReport).toHaveBeenCalled();
    expect(getWorkspaceContext().workItemId).toBe('competitor_listing:hist-001');
    expect(getWorkspaceContext().sourceRoute).toBe('scraper');
  });

  it('restores keyword snapshots through the IndexedDB snapshot service', async () => {
    const snapshot = createKeywordSnapshot();
    snapshotMocks.getById.mockReturnValue(snapshot);
    snapshotMocks.restore.mockReturnValue(snapshot);
    snapshotMocks.restoreAsync.mockResolvedValue(snapshot);

    const plan = buildResumePlan(
      createEnvelope({
        id: 'competitor_listing:hist-001:keyword_snapshot:kh-001',
        type: 'keyword_snapshot',
        sourceRoute: 'keyword_hunter_analysis',
        title: 'Keyword review',
        summary: '1 关键词 · 覆盖率 100%',
        payloadRef: 'keyword_snapshot:kh-001',
      }),
      createWorkItem(),
      'open',
      {
        keywordSnapshotExists: id => id === 'kh-001',
      }
    );

    expect(plan.ok).toBe(true);
    if (!plan.ok) return;

    const result = await executeResumePlan(plan);
    expect(result.ok).toBe(true);
    expect(snapshotMocks.restoreAsync).toHaveBeenCalledWith('kh-001');
  });

  it('restores the selected Prompt version and carries it into keyword review', async () => {
    const prompt = createPromptRecord();
    const historyItem = {
      ...createHistoryItem(),
      promptResults: {
        listing: prompt,
        history: [prompt],
        updatedAt: prompt.generatedAt,
      },
    };
    historyMocks.getAllAsync.mockResolvedValue([historyItem]);

    const plan = buildResumePlan(
      createEnvelope({
        id: 'competitor_listing:hist-001:listing_prompt:listing-prompt-001',
        type: 'listing_prompt',
        payloadRef: 'prompt:listing-prompt-001',
      }),
      createWorkItem(),
      'continue',
      { promptExists: () => true }
    );
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;

    await expect(executeResumePlan(plan)).resolves.toMatchObject({ ok: true });
    expect(appStoreMocks.state.updateKeywordTracker).toHaveBeenCalledWith({
      copyInputText: 'Exact listing prompt',
      keywordsInputText: 'haupt keyword\nlongtail keyword',
      currentSnapshotId: null,
    });
  });

  it('restores the saved PPC suggestion snapshot before navigation', async () => {
    const snapshot = {
      schemaVersion: 1,
      id: 'ppc-export-001',
      reportType: 'search_term',
      filter: 'all',
      owner: '广告小张',
      rows: [],
      reviewStatus: 'pending',
      note: '',
      createdAt: '2026-01-01T00:40:00.000Z',
      updatedAt: '2026-01-01T00:40:00.000Z',
    };
    ppcSnapshotMocks.getById.mockResolvedValue(snapshot);
    const plan = buildResumePlan(
      createEnvelope({
        type: 'ppc_action_list',
        payloadRef: 'ppc_action_list:ppc-export-001',
      }),
      createWorkItem(),
      'open'
    );
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;

    await expect(executeResumePlan(plan)).resolves.toMatchObject({ ok: true });
    expect(ppcSnapshotMocks.queueResume).toHaveBeenCalledWith(snapshot);
  });

  it('resolves payload status with default resolvers for history and snapshots', () => {
    historyMocks.getById.mockReturnValue(createHistoryItem());
    snapshotMocks.getById.mockReturnValue(createKeywordSnapshot());

    expect(
      resolveResumePayloadStatus(
        createEnvelope({ payloadRef: 'history:hist-001', type: 'scrape_history' })
      )
    ).toBe('available');
    expect(
      resolveResumePayloadStatus(
        createEnvelope({
          payloadRef: 'keyword_snapshot:kh-001',
          type: 'keyword_snapshot',
        })
      )
    ).toBe('available');
    historyMocks.getById.mockReturnValue(undefined);
    expect(
      resolveResumePayloadStatus(
        createEnvelope({ payloadRef: 'history:missing', type: 'scrape_history' })
      )
    ).toBe('missing');
  });

  it('registers compliance check artifacts against the active work item', () => {
    const envelope = registerComplianceCheckArtifact(
      {
        id: 'comp-001',
        checklistIds: ['restricted_words', 'brand_infringement'],
        completedIds: ['restricted_words'],
        createdAt: '2026-01-01T01:00:00.000Z',
      },
      createWorkspaceContext()
    );

    expect(envelope).toMatchObject({
      workItemId: 'competitor_listing:hist-001',
      type: 'compliance_check',
      payloadRef: 'compliance_check:comp-001',
      metadata: {
        checklistCount: 2,
        completedCount: 1,
        requiresHumanConfirmation: true,
      },
    });
    expect(getRecentArtifacts(1)[0]?.type).toBe('compliance_check');
  });

  it('emits artifacts-changed when envelopes are registered', () => {
    const emit = vi.spyOn(eventBus, 'emit');
    registerHistoryArtifacts(createHistoryItem());

    expect(emit).toHaveBeenCalledWith(
      APP_CENTER_ARTIFACTS_CHANGED,
      expect.objectContaining({ reason: 'upsert' })
    );
  });

  it('keeps keyword snapshot registration when context has workItemId', () => {
    const envelope = registerKeywordSnapshotArtifact(
      createKeywordSnapshot(),
      createWorkspaceContext()
    );
    expect(envelope?.type).toBe('keyword_snapshot');
    expect(
      getArtifactsForWorkItem('competitor_listing:hist-001').some(
        a => a.type === 'keyword_snapshot'
      )
    ).toBe(true);
  });

  it('registers ppc action lists for resume open route', () => {
    const envelope = registerPpcActionListArtifact(
      {
        id: 'ppc-export-001',
        reportType: 'search_term',
        filter: 'all',
        rowCount: 3,
        owner: '广告小张',
        requiresHumanConfirmation: true,
        createdAt: '2026-01-01T00:40:00.000Z',
      },
      createWorkspaceContext()
    );

    const plan = buildResumePlan(envelope, createWorkItem({ status: 'review_required' }), 'open');
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.routeId).toBe('ppc_search_terms');
    expect(plan.payloadStatus).toBe('available');
  });
});
