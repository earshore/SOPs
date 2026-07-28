import { beforeEach, describe, expect, it } from 'vitest';
import type {
  GeneratedPromptRecord,
  HistoryItem,
  KeywordHunterSnapshot,
  ScrapedData,
} from '@/types/modules-business';
import type { AppCenterWorkspaceContext } from '@/modules/app_center/workspaceContext';
import {
  clearArtifactEnvelopeIndex,
  getArtifactPayloadStatus,
  getArtifactsForWorkItem,
  getRecentArtifacts,
  getWorkItemProgress,
  getWorkItems,
  registerHistoryArtifacts,
  registerKeywordSnapshotArtifact,
  registerListingCopyArtifact,
  registerPpcActionListArtifact,
} from '@/modules/app_center/artifactEnvelopeService';

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

function createPromptRecord(): GeneratedPromptRecord {
  return {
    id: 'listing-prompt-001',
    type: 'listing',
    prompt: 'Listing prompt body',
    generatedAt: '2026-01-01T00:20:00.000Z',
    historyId: 'hist-001',
    sourceHistoryId: 'hist-001',
    asins: ['B000000001'],
    marketplace: 'DE',
    profile: {
      targetMarket: 'German',
      keywordsTier1: 'haupt keyword',
      keywordsTier2: 'longtail',
    },
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
    promptResults: {
      listing: createPromptRecord(),
      history: [createPromptRecord()],
      updatedAt: '2026-01-01T00:20:00.000Z',
    },
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
    status: 'matched',
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
      llmAnalysisResult: '',
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

describe('App Center artifact envelope service', () => {
  beforeEach(() => {
    localStorage.clear();
    clearArtifactEnvelopeIndex();
  });

  it('registers history, analysis, and listing prompt envelopes without copying payloads', () => {
    registerHistoryArtifacts(createHistoryItem());

    expect(getWorkItems()).toEqual([
      expect.objectContaining({
        id: 'competitor_listing:hist-001',
        type: 'competitor_listing',
        status: 'review_required',
        marketplace: 'DE',
        asinOrSku: 'B000000001',
      }),
    ]);
    expect(getArtifactsForWorkItem('competitor_listing:hist-001')).toEqual([
      expect.objectContaining({
        type: 'listing_prompt',
        payloadRef: 'prompt:listing-prompt-001',
        summary: expect.not.stringContaining('生成策略'),
      }),
      expect.objectContaining({
        type: 'analysis_report',
        payloadRef: 'history:hist-001#analysis',
      }),
      expect.objectContaining({
        type: 'scrape_history',
        payloadRef: 'history:hist-001',
        summary: expect.stringContaining('采集'),
        metadata: expect.objectContaining({
          asinCount: 1,
          dataSource: '采集',
        }),
      }),
    ]);
  });

  it('registers keyword snapshots against the active work item, or a local snapshot work item', () => {
    const standalone = registerKeywordSnapshotArtifact(createKeywordSnapshot(), {
      ...createWorkspaceContext(),
      workItemId: null,
    });
    expect(standalone).toMatchObject({
      type: 'keyword_snapshot',
      workItemId: 'keyword_review:kh-001',
      payloadRef: 'keyword_snapshot:kh-001',
    });
    expect(getWorkItems().find(item => item.id === 'keyword_review:kh-001')?.type).toBe(
      'keyword_review'
    );
    expect(getWorkItemProgress('keyword_review:kh-001')).toMatchObject({
      completedSteps: 1,
      totalSteps: 3,
      completedTypes: ['keyword_snapshot'],
    });

    const envelope = registerKeywordSnapshotArtifact(
      createKeywordSnapshot(),
      createWorkspaceContext()
    );

    expect(envelope).toMatchObject({
      workItemId: 'competitor_listing:hist-001',
      type: 'keyword_snapshot',
      sourceRoute: 'keyword_hunter_analysis',
      payloadRef: 'keyword_snapshot:kh-001',
    });
    expect(getRecentArtifacts(1)).toEqual([expect.objectContaining({ id: envelope?.id })]);
  });

  it('registers a distinct listing review artifact for a reported Keyword Hunter snapshot', () => {
    const snapshot = createKeywordSnapshot();
    snapshot.status = 'reported';
    snapshot.result.llmAnalysisResult = '# Listing review\n\n综合得分 82/100';

    registerKeywordSnapshotArtifact(snapshot, createWorkspaceContext());

    expect(getArtifactsForWorkItem('competitor_listing:hist-001')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'keyword_snapshot',
          payloadRef: 'keyword_snapshot:kh-001',
          summary: '1个关键词 · 1个命中 · 0个未命中',
        }),
        expect.objectContaining({
          type: 'listing_review',
          payloadRef: 'keyword_snapshot:kh-001',
          summary: '良好 · 82/100',
          metadata: {
            keywordSnapshotId: 'kh-001',
            score: 82,
            grade: '良好',
          },
        }),
      ])
    );
  });

  it('registers a Deep Chat product copy as the stage before keyword review', () => {
    registerHistoryArtifacts(createHistoryItem());

    const envelope = registerListingCopyArtifact({
      id: 'thread-1:2000',
      workItemId: 'competitor_listing:hist-001',
      promptId: 'listing-prompt-001',
      threadId: 'thread-1',
      content: 'Generated product copy',
      seoKeywords: ['haupt keyword', 'longtail'],
      marketplace: 'DE',
      asinOrSku: 'B000000001',
      createdAt: '2026-01-01T00:25:00.000Z',
      model: 'gpt-4.1',
    });

    expect(envelope).toMatchObject({
      type: 'listing_copy',
      sourceRoute: 'playground_deep_chat',
      payloadRef: 'listing_copy:thread-1:2000',
      summary: '2个SEO关键词 · gpt-4.1',
      metadata: {
        promptId: 'listing-prompt-001',
        keywordCount: 2,
        model: 'gpt-4.1',
      },
    });
    expect(getRecentArtifacts(1)[0]?.type).toBe('listing_copy');
  });

  it('registers PPC action lists with owner and manual confirmation metadata', () => {
    const envelope = registerPpcActionListArtifact(
      {
        id: 'ppc-export-001',
        reportType: 'search_term',
        filter: 'scale_budget',
        rowCount: 2,
        owner: '广告小张',
        requiresHumanConfirmation: true,
        createdAt: '2026-01-01T00:40:00.000Z',
      },
      createWorkspaceContext()
    );

    expect(envelope).toMatchObject({
      workItemId: 'ppc_review:ppc-export-001',
      type: 'ppc_action_list',
      sourceRoute: 'ppc_search_terms',
      payloadRef: 'ppc_action_list:ppc-export-001',
      metadata: {
        owner: '广告小张',
        requiresHumanConfirmation: true,
        rowCount: 2,
        reportType: 'search_term',
        filter: 'scale_budget',
      },
    });
    expect(getWorkItems().find(item => item.id === envelope.workItemId)?.type).toBe('ppc_review');
    expect(getRecentArtifacts(1)).toEqual([expect.objectContaining({ id: envelope.id })]);
  });

  it('reports missing payloads through explicit artifact resolvers', () => {
    registerHistoryArtifacts(createHistoryItem());
    const [listingPrompt] = getArtifactsForWorkItem('competitor_listing:hist-001');
    const ppcActionList = registerPpcActionListArtifact(
      {
        id: 'ppc-export-001',
        reportType: 'search_term',
        filter: 'all',
        rowCount: 1,
        owner: '广告负责人',
        requiresHumanConfirmation: false,
        createdAt: '2026-01-01T00:40:00.000Z',
      },
      createWorkspaceContext()
    );

    expect(
      getArtifactPayloadStatus(listingPrompt!, {
        historyExists: () => true,
        promptExists: () => false,
        keywordSnapshotExists: () => true,
      })
    ).toBe('missing');
    expect(
      getArtifactPayloadStatus(ppcActionList, {
        ppcActionListExists: () => false,
      })
    ).toBe('missing');
  });
});
