import { beforeEach, describe, expect, it } from 'vitest';
import type {
  AppCenterArtifactEnvelope,
  AppCenterWorkItem,
} from '@/modules/app_center/artifactEnvelopeService';
import {
  clearArtifactEnvelopeIndex,
  getWorkItems,
  getWorkItemProgress,
  registerComplianceCheckArtifact,
  registerHistoryArtifacts,
  registerKeywordSnapshotArtifact,
  registerListingCopyArtifact,
  registerPpcActionListArtifact,
} from '@/modules/app_center/artifactEnvelopeService';
import {
  buildRecentQueueItems,
  clearRecentQueuePreferences,
  dismissRecentArtifact,
  pinRecentArtifact,
  unpinRecentArtifact,
  undismissRecentArtifact,
  getRecentQueuePreferences,
  markRecentArtifactOpened,
  type RecentQueueViewOptions,
} from '@/modules/app_center/recentQueueService';
import {
  buildRecentArtifactPresentation,
  buildResumeClipboardSummary,
} from '@/modules/app_center/recentArtifactPresenter';
import { getComplianceReviewView } from '@/modules/app_center/complianceReviewState';
import type { HistoryItem, KeywordHunterSnapshot, ScrapedData } from '@/types/modules-business';

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

function createHistoryItemWithPrompt(): HistoryItem {
  const history = createHistoryItem();
  const prompt = {
    id: 'prompt-001',
    type: 'listing' as const,
    prompt: 'Generate product copy',
    generatedAt: '2026-01-01T00:20:00.000Z',
    historyId: history.id,
    asins: history.asins,
    marketplace: history.site,
    profile: { keywordsTier1: 'haupt keyword', keywordsTier2: 'longtail' },
  };
  history.promptResults = {
    listing: prompt,
    history: [prompt],
    updatedAt: prompt.generatedAt,
  };
  return history;
}

function createKeywordSnapshot(): KeywordHunterSnapshot {
  return {
    id: 'keyword-001',
    schemaVersion: 1,
    title: 'First keyword review',
    status: 'matched',
    createdAt: '2026-01-01T00:30:00.000Z',
    updatedAt: '2026-01-01T00:30:00.000Z',
    source: { type: 'manual' },
    input: {
      keywordsInputText: 'haupt keyword\nlongtail',
      copyInputText: 'First product copy',
      settings: {
        matchPlural: true,
        matchStem: true,
        matchCase: false,
        matchPartial: false,
      },
    },
    result: {
      keywords: ['haupt keyword', 'longtail'],
      processedCopy: 'First product copy',
      matchedKeywords: [],
      unmatchedKeywords: [],
      wordFrequency: [],
      paragraphs: [],
      llmAnalysisResult: '',
      coverageRate: 100,
    },
    derived: {
      keywordCount: 2,
      matchedCount: 2,
      unmatchedCount: 0,
      copyHash: 'copy-hash',
      snapshotFingerprint: 'snapshot-fingerprint',
    },
  };
}

function registerWorkflowThroughKeywordReview(): void {
  registerHistoryArtifacts(createHistoryItemWithPrompt());
  registerListingCopyArtifact({
    id: 'copy-001',
    workItemId: 'competitor_listing:hist-001',
    promptId: 'prompt-001',
    threadId: 'thread-1',
    content: 'First product copy',
    seoKeywords: ['haupt keyword', 'longtail'],
    marketplace: 'DE',
    asinOrSku: 'B000000001',
    createdAt: '2026-01-01T00:25:00.000Z',
  });
  registerKeywordSnapshotArtifact(createKeywordSnapshot(), {
    workItemId: 'competitor_listing:hist-001',
    marketplace: 'DE',
    language: 'German',
    asinOrSku: 'B000000001',
    sourceRoute: 'keyword_hunter_analysis',
    updatedAt: '2026-01-01T00:30:00.000Z',
  });
}

function registerWorkflowThroughListingReview(): void {
  registerWorkflowThroughKeywordReview();
  const snapshot = createKeywordSnapshot();
  snapshot.status = 'reported';
  snapshot.updatedAt = '2026-01-01T00:35:00.000Z';
  snapshot.result.llmAnalysisResult = '# Listing review';
  registerKeywordSnapshotArtifact(snapshot, {
    workItemId: 'competitor_listing:hist-001',
    marketplace: 'DE',
    language: 'German',
    asinOrSku: 'B000000001',
    sourceRoute: 'keyword_hunter_analysis',
    updatedAt: snapshot.updatedAt,
  });
}

function makeEnvelope(
  overrides: Partial<AppCenterArtifactEnvelope> = {}
): AppCenterArtifactEnvelope {
  return {
    id: 'a1',
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

function makeWorkItem(overrides: Partial<AppCenterWorkItem> = {}): AppCenterWorkItem {
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

describe('App Center recent queue service', () => {
  beforeEach(() => {
    localStorage.clear();
    clearArtifactEnvelopeIndex();
    clearRecentQueuePreferences();
  });

  it('pins artifacts to the top and dismisses them from the active queue', () => {
    const envelopes = [
      makeEnvelope({ id: 'old', createdAt: '2026-01-01T00:00:00.000Z' }),
      makeEnvelope({
        id: 'fresh',
        type: 'ppc_action_list',
        payloadRef: 'ppc_action_list:p1',
        createdAt: '2026-01-01T02:00:00.000Z',
        metadata: {
          requiresHumanConfirmation: true,
          rowCount: 2,
          owner: '广告小张',
        },
      }),
    ];
    const workItems = [makeWorkItem()];

    pinRecentArtifact('old');
    let items = buildRecentQueueItems(envelopes, workItems, {
      now: Date.parse('2026-01-01T03:00:00.000Z'),
    });
    expect(items[0]?.artifact.id).toBe('old');
    expect(items[0]?.pinned).toBe(true);

    dismissRecentArtifact('old');
    items = buildRecentQueueItems(envelopes, workItems, {
      now: Date.parse('2026-01-01T03:00:00.000Z'),
    });
    expect(items.map(item => item.artifact.id)).toEqual(['fresh']);
    expect(getRecentQueuePreferences().dismissedIds).toContain('old');

    undismissRecentArtifact('old');
    unpinRecentArtifact('old');
    items = buildRecentQueueItems(envelopes, workItems, {
      now: Date.parse('2026-01-01T03:00:00.000Z'),
    });
    expect(items[0]?.artifact.id).toBe('fresh');
  });

  it('prioritizes review-required work items after pins', () => {
    const envelopes = [
      makeEnvelope({
        id: 'normal',
        workItemId: 'competitor_listing:hist-002',
        createdAt: '2026-01-01T03:00:00.000Z',
      }),
      makeEnvelope({
        id: 'review',
        workItemId: 'competitor_listing:hist-001',
        type: 'ppc_action_list',
        payloadRef: 'ppc_action_list:p1',
        createdAt: '2026-01-01T01:00:00.000Z',
        metadata: { requiresHumanConfirmation: true },
      }),
    ];
    const workItems = [
      makeWorkItem({
        id: 'competitor_listing:hist-001',
        status: 'review_required',
      }),
      makeWorkItem({
        id: 'competitor_listing:hist-002',
        status: 'in_progress',
        asinOrSku: 'B000000002',
      }),
    ];

    const items = buildRecentQueueItems(envelopes, workItems, {
      now: Date.parse('2026-01-01T04:00:00.000Z'),
    });
    expect(items[0]?.artifact.id).toBe('review');
    expect(items[0]?.needsAttention).toBe(true);

    const activityItems = buildRecentQueueItems(envelopes, workItems, {
      now: Date.parse('2026-01-01T04:00:00.000Z'),
      sortMode: 'activity',
    });
    expect(activityItems[0]?.artifact.id).toBe('normal');
  });

  it('filters by type and search query', () => {
    const envelopes = [
      makeEnvelope({ id: 'scrape', type: 'scrape_history' }),
      makeEnvelope({
        id: 'ppc',
        type: 'ppc_action_list',
        payloadRef: 'ppc_action_list:p1',
        title: 'PPC 动作清单',
        summary: 'Owner 广告小张',
        metadata: { owner: '广告小张', rowCount: 2 },
      }),
    ];
    const workItems = [makeWorkItem()];
    const options: RecentQueueViewOptions = {
      typeFilter: 'ppc_action_list',
      query: '广告小张',
      now: Date.parse('2026-01-01T04:00:00.000Z'),
    };

    const items = buildRecentQueueItems(envelopes, workItems, options);
    expect(items).toHaveLength(1);
    expect(items[0]?.artifact.id).toBe('ppc');
  });

  it('groups artifacts by work item when group mode is enabled', () => {
    const envelopes = [
      makeEnvelope({
        id: 'a',
        workItemId: 'competitor_listing:hist-001',
        createdAt: '2026-01-01T00:10:00.000Z',
      }),
      makeEnvelope({
        id: 'b',
        workItemId: 'competitor_listing:hist-001',
        type: 'analysis_report',
        payloadRef: 'history:hist-001#analysis',
        createdAt: '2026-01-01T00:20:00.000Z',
      }),
      makeEnvelope({
        id: 'c',
        workItemId: 'competitor_listing:hist-002',
        createdAt: '2026-01-01T00:30:00.000Z',
      }),
    ];
    const workItems = [
      makeWorkItem({ id: 'competitor_listing:hist-001' }),
      makeWorkItem({
        id: 'competitor_listing:hist-002',
        asinOrSku: 'B000000002',
      }),
    ];

    const items = buildRecentQueueItems(envelopes, workItems, {
      groupByWorkItem: true,
      now: Date.parse('2026-01-01T04:00:00.000Z'),
    });

    expect(items.filter(item => item.isGroupHeader)).toHaveLength(2);
    expect(items.some(item => item.artifact.id === 'a' && !item.isGroupHeader)).toBe(true);
  });

  it('collapses each work item to one card represented by its latest stage', () => {
    const envelopes = [
      makeEnvelope({
        id: 'scrape-stage',
        workItemId: 'competitor_listing:hist-001',
        title: '采集历史',
        createdAt: '2026-01-01T00:10:00.000Z',
      }),
      makeEnvelope({
        id: 'analysis-stage',
        workItemId: 'competitor_listing:hist-001',
        type: 'analysis_report',
        title: 'AI 分析报告',
        payloadRef: 'history:hist-001#analysis',
        createdAt: '2026-01-01T00:20:00.000Z',
      }),
      makeEnvelope({
        id: 'another-job',
        workItemId: 'competitor_listing:hist-002',
        title: '其他作业结果',
        createdAt: '2026-01-01T00:30:00.000Z',
      }),
    ];
    const workItems = [
      makeWorkItem({ id: 'competitor_listing:hist-001' }),
      makeWorkItem({
        id: 'competitor_listing:hist-002',
        asinOrSku: 'B000000002',
      }),
    ];

    const items = buildRecentQueueItems(envelopes, workItems, {
      collapseStagesByWorkItem: true,
      query: '采集历史',
      now: Date.parse('2026-01-01T04:00:00.000Z'),
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.queueId).toBe('competitor_listing:hist-001');
    expect(items[0]?.artifact.id).toBe('analysis-stage');
    expect(items[0]?.isGroupHeader).toBe(false);
  });

  it('keeps repeated executions separate when marketplace and ASIN are identical', () => {
    const firstRun = createHistoryItem();
    const secondRun = createHistoryItem();
    secondRun.id = 'hist-002';
    secondRun.timestamp = '2026-01-01T01:00:00.000Z';
    if (secondRun.analysisStatus) {
      secondRun.analysisStatus.analyzedAt = '2026-01-01T01:10:00.000Z';
    }

    const artifacts = [
      ...registerHistoryArtifacts(firstRun),
      ...registerHistoryArtifacts(secondRun),
    ];
    const workItems = getWorkItems();
    const items = buildRecentQueueItems(artifacts, workItems, {
      collapseStagesByWorkItem: true,
      now: Date.parse('2026-01-01T02:00:00.000Z'),
    });

    expect(workItems.map(item => item.marketplace)).toEqual(['DE', 'DE']);
    expect(workItems.map(item => item.asinOrSku)).toEqual(['B000000001', 'B000000001']);
    expect(items).toHaveLength(2);
    expect(items.map(item => item.queueId)).toEqual([
      'competitor_listing:hist-002',
      'competitor_listing:hist-001',
    ]);
    expect(items.every(item => item.artifact.type === 'analysis_report')).toBe(true);
  });

  it('keeps work-item preferences when the representative stage advances', () => {
    const workItemId = 'competitor_listing:hist-001';
    const scrape = makeEnvelope({ id: 'scrape-stage', workItemId });
    const workItems = [makeWorkItem({ id: workItemId })];

    pinRecentArtifact(workItemId);
    let items = buildRecentQueueItems([scrape], workItems, {
      collapseStagesByWorkItem: true,
    });
    expect(items[0]?.pinned).toBe(true);

    const analysis = makeEnvelope({
      id: 'analysis-stage',
      workItemId,
      type: 'analysis_report',
      payloadRef: 'history:hist-001#analysis',
      createdAt: '2026-01-01T00:20:00.000Z',
    });
    items = buildRecentQueueItems([scrape, analysis], workItems, {
      collapseStagesByWorkItem: true,
    });
    expect(items[0]?.artifact.id).toBe('analysis-stage');
    expect(items[0]?.pinned).toBe(true);

    dismissRecentArtifact(workItemId);
    expect(
      buildRecentQueueItems([scrape, analysis], workItems, {
        collapseStagesByWorkItem: true,
      })
    ).toHaveLength(0);
    expect(
      buildRecentQueueItems([scrape, analysis], workItems, {
        collapseStagesByWorkItem: true,
        dismissedOnly: true,
      })[0]?.artifact.id
    ).toBe('analysis-stage');
  });

  it('computes competitor listing progress from registered artifact types', () => {
    registerHistoryArtifacts(createHistoryItem());
    const progress = getWorkItemProgress('competitor_listing:hist-001');
    expect(progress.completedSteps).toBeGreaterThanOrEqual(2);
    expect(progress.totalSteps).toBe(7);
    expect(progress.label).toMatch(/已完成 \d+\/7 步/);
  });

  it('requires a new keyword review after a newer product copy is selected', () => {
    registerWorkflowThroughKeywordReview();
    expect(getWorkItemProgress('competitor_listing:hist-001').completedTypes).toContain(
      'keyword_snapshot'
    );

    registerListingCopyArtifact({
      id: 'copy-002',
      workItemId: 'competitor_listing:hist-001',
      promptId: 'prompt-001',
      threadId: 'thread-1',
      content: 'Revised product copy',
      seoKeywords: ['haupt keyword', 'longtail'],
      marketplace: 'DE',
      asinOrSku: 'B000000001',
      createdAt: '2026-01-01T00:35:00.000Z',
    });

    expect(getWorkItemProgress('competitor_listing:hist-001').completedTypes).toEqual([
      'scrape_history',
      'analysis_report',
      'listing_prompt',
      'listing_copy',
    ]);
  });

  it('does not count a pending compliance checklist as a completed step', () => {
    registerWorkflowThroughListingReview();
    registerComplianceCheckArtifact(
      {
        id: 'compliance-001',
        checklistIds: ['restricted_words', 'brand_infringement'],
        itemStates: {
          restricted_words: 'pending',
          brand_infringement: 'pending',
        },
        createdAt: '2026-01-01T00:40:00.000Z',
      },
      {
        workItemId: 'competitor_listing:hist-001',
        marketplace: 'DE',
        language: 'German',
        asinOrSku: 'B000000001',
        sourceRoute: 'keyword_hunter_analysis',
        updatedAt: '2026-01-01T00:40:00.000Z',
      }
    );
    expect(getWorkItemProgress('competitor_listing:hist-001').completedTypes).not.toContain(
      'compliance_check'
    );

    registerComplianceCheckArtifact(
      {
        id: 'compliance-001',
        checklistIds: ['restricted_words', 'brand_infringement'],
        itemStates: {
          restricted_words: 'passed',
          brand_infringement: 'not_applicable',
        },
        createdAt: '2026-01-01T00:40:00.000Z',
      },
      {
        workItemId: 'competitor_listing:hist-001',
        marketplace: 'DE',
        language: 'German',
        asinOrSku: 'B000000001',
        sourceRoute: 'keyword_hunter_analysis',
        updatedAt: '2026-01-01T00:40:00.000Z',
      }
    );
    expect(getWorkItemProgress('competitor_listing:hist-001').completedTypes).toContain(
      'compliance_check'
    );
    expect(getWorkItems().find(item => item.id === 'competitor_listing:hist-001')?.status).toBe(
      'done'
    );

    registerComplianceCheckArtifact(
      {
        id: 'compliance-001',
        checklistIds: ['restricted_words', 'brand_infringement'],
        itemStates: {
          restricted_words: 'passed',
          brand_infringement: 'issue_found',
        },
        createdAt: '2026-01-01T00:40:00.000Z',
        updatedAt: '2026-01-01T00:45:00.000Z',
      },
      {
        workItemId: 'competitor_listing:hist-001',
        marketplace: 'DE',
        language: 'German',
        asinOrSku: 'B000000001',
        sourceRoute: 'keyword_hunter_analysis',
        updatedAt: '2026-01-01T00:45:00.000Z',
      }
    );
    expect(getWorkItemProgress('competitor_listing:hist-001').completedTypes).toContain(
      'compliance_check'
    );
    expect(getWorkItems().find(item => item.id === 'competitor_listing:hist-001')?.status).toBe(
      'review_required'
    );
  });

  it('migrates legacy compliance statuses when reading saved review metadata', () => {
    const view = getComplianceReviewView({
      metadata: {
        checklistIds: 'restricted_words,brand_infringement',
        reviewStates: JSON.stringify({
          restricted_words: 'confirmed',
          brand_infringement: 'skipped',
        }),
      },
    });

    expect(view.items.map(item => item.status)).toEqual(['passed', 'not_applicable']);
    expect(view.complete).toBe(true);
    expect(view.notApplicableCount).toBe(1);
  });

  it('keeps newer business activity ahead of an older artifact that was only opened', () => {
    const envelopes = [
      makeEnvelope({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' }),
      makeEnvelope({ id: 'newer', createdAt: '2026-01-02T00:00:00.000Z' }),
    ];
    markRecentArtifactOpened('older', '2026-01-03T00:00:00.000Z');
    const items = buildRecentQueueItems(envelopes, [makeWorkItem()]);
    expect(items[0]?.artifact.id).toBe('newer');
  });

  it('uses artifact updates as business activity for ordering', () => {
    const envelopes = [
      makeEnvelope({
        id: 'updated',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
      }),
      makeEnvelope({ id: 'newer-created', createdAt: '2026-01-02T00:00:00.000Z' }),
    ];
    const items = buildRecentQueueItems(envelopes, [makeWorkItem()]);
    expect(items[0]?.artifact.id).toBe('updated');
  });

  it('retains missing payload state for every stage in a collapsed card', () => {
    const workItemId = 'competitor_listing:hist-001';
    const scrape = makeEnvelope({ id: 'scrape', workItemId });
    const analysis = makeEnvelope({
      id: 'analysis',
      workItemId,
      type: 'analysis_report',
      payloadRef: 'history:hist-001#analysis',
      createdAt: '2026-01-01T00:10:00.000Z',
    });
    const options = {
      collapseStagesByWorkItem: true,
      payloadStatuses: { scrape: 'missing', analysis: 'available' },
    } as const;
    const [item] = buildRecentQueueItems([scrape, analysis], [makeWorkItem()], options);
    expect(item?.payloadStatus).toBe('available');
    expect(item?.hasMissingPayload).toBe(true);
    expect(item?.stagePayloadStatuses.scrape).toBe('missing');
    expect(
      buildRecentQueueItems([scrape, analysis], [makeWorkItem()], {
        ...options,
        statusFilter: 'missing',
      })
    ).toHaveLength(1);
  });

  it('keeps multi-ASIN scope compact while retaining activity time separately', () => {
    const presentation = buildRecentArtifactPresentation(
      makeEnvelope({ title: '春季关键词复核' }),
      makeWorkItem({ asinOrSku: 'B000000001, B000000002' }),
      Date.parse('2026-01-01T04:00:00.000Z')
    );
    expect(presentation.primaryTitle).toBe('DE · B000000001 +1 ASIN');
    expect(presentation.facts).toEqual(['2个ASIN']);
    expect(presentation.absoluteTime).not.toBe('');
  });

  it('builds a clipboard summary for resume context', () => {
    const summary = buildResumeClipboardSummary(
      makeEnvelope({
        type: 'ppc_action_list',
        payloadRef: 'ppc_action_list:p1',
        metadata: {
          owner: '广告小张',
          rowCount: 2,
          requiresHumanConfirmation: true,
        },
      }),
      makeWorkItem({ status: 'review_required' })
    );

    expect(summary).toContain('DE');
    expect(summary).toContain('B000000001');
    expect(summary).toContain('PPC');
    expect(summary).toContain('需人工复核');
    expect(summary).not.toContain('review_required');
    expect(summary).not.toContain('ppc_action_list:p1');
  });

  it('keeps ppc confirmation items marked for attention', () => {
    registerPpcActionListArtifact(
      {
        id: 'ppc-export-001',
        reportType: 'search_term',
        filter: 'all',
        rowCount: 1,
        owner: '广告负责人',
        requiresHumanConfirmation: true,
        createdAt: '2026-01-01T00:40:00.000Z',
      },
      {
        workItemId: 'competitor_listing:hist-001',
        marketplace: 'DE',
        language: 'German',
        asinOrSku: 'B000000001',
        sourceRoute: 'ppc_search_terms',
        updatedAt: '2026-01-01T00:40:00.000Z',
      }
    );

    const items = buildRecentQueueItems(
      [
        makeEnvelope({
          id: 'ppc',
          type: 'ppc_action_list',
          payloadRef: 'ppc_action_list:ppc-export-001',
          metadata: { requiresHumanConfirmation: true },
        }),
      ],
      [makeWorkItem({ status: 'done' })],
      { now: Date.parse('2026-01-01T04:00:00.000Z') }
    );

    expect(items[0]?.needsAttention).toBe(true);
  });
});
