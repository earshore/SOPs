import { beforeEach, describe, expect, it } from 'vitest';
import type {
  AppCenterArtifactEnvelope,
  AppCenterWorkItem,
} from '@/modules/app_center/artifactEnvelopeService';
import {
  clearArtifactEnvelopeIndex,
  getWorkItemProgress,
  registerComplianceCheckArtifact,
  registerHistoryArtifacts,
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
import { buildResumeClipboardSummary } from '@/modules/app_center/recentArtifactPresenter';
import type { HistoryItem, ScrapedData } from '@/types/modules-business';

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
        metadata: { requiresHumanConfirmation: true, rowCount: 2, owner: '广告小张' },
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
      makeWorkItem({ id: 'competitor_listing:hist-001', status: 'review_required' }),
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
      makeWorkItem({ id: 'competitor_listing:hist-002', asinOrSku: 'B000000002' }),
    ];

    const items = buildRecentQueueItems(envelopes, workItems, {
      groupByWorkItem: true,
      now: Date.parse('2026-01-01T04:00:00.000Z'),
    });

    expect(items.filter(item => item.isGroupHeader)).toHaveLength(2);
    expect(items.some(item => item.artifact.id === 'a' && !item.isGroupHeader)).toBe(true);
  });

  it('computes competitor listing progress from registered artifact types', () => {
    registerHistoryArtifacts(createHistoryItem());
    const progress = getWorkItemProgress('competitor_listing:hist-001');
    expect(progress.completedSteps).toBeGreaterThanOrEqual(2);
    expect(progress.totalSteps).toBe(5);
    expect(progress.label).toMatch(/已完成 \d+\/5 步/);
  });

  it('does not count a pending compliance checklist as a completed step', () => {
    registerHistoryArtifacts(createHistoryItem());
    registerComplianceCheckArtifact(
      {
        id: 'compliance-001',
        checklistIds: ['restricted_words', 'brand_infringement'],
        itemStates: {
          restricted_words: 'pending',
          brand_infringement: 'pending',
        },
        createdAt: '2026-01-01T00:30:00.000Z',
      },
      {
        workItemId: 'competitor_listing:hist-001',
        marketplace: 'DE',
        language: 'German',
        asinOrSku: 'B000000001',
        sourceRoute: 'keyword_hunter_analysis',
        updatedAt: '2026-01-01T00:30:00.000Z',
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
          restricted_words: 'confirmed',
          brand_infringement: 'skipped',
        },
        createdAt: '2026-01-01T00:30:00.000Z',
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
  });

  it('moves a recently opened older artifact ahead of newer items', () => {
    const envelopes = [
      makeEnvelope({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' }),
      makeEnvelope({ id: 'newer', createdAt: '2026-01-02T00:00:00.000Z' }),
    ];
    markRecentArtifactOpened('older', '2026-01-03T00:00:00.000Z');
    const items = buildRecentQueueItems(envelopes, [makeWorkItem()]);
    expect(items[0]?.artifact.id).toBe('older');
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
