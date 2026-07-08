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
  getWorkItems,
  registerHistoryArtifacts,
  registerKeywordSnapshotArtifact,
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
      }),
      expect.objectContaining({
        type: 'analysis_report',
        payloadRef: 'history:hist-001#analysis',
      }),
      expect.objectContaining({
        type: 'scrape_history',
        payloadRef: 'history:hist-001',
      }),
    ]);
  });

  it('registers keyword snapshots against the active work item only when context is available', () => {
    expect(
      registerKeywordSnapshotArtifact(createKeywordSnapshot(), {
        ...createWorkspaceContext(),
        workItemId: null,
      })
    ).toBeNull();

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
      workItemId: 'competitor_listing:hist-001',
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
