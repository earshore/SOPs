import { describe, it, expect } from 'vitest';
import {
  buildRecentArtifactPresentation,
  RECENT_ARTIFACT_TYPE_LABELS,
} from '@/modules/app_center/recentArtifactPresenter';
import type {
  AppCenterArtifactEnvelope,
  AppCenterWorkItem,
} from '@/modules/app_center/artifactEnvelopeService';

function makeWorkItem(overrides: Partial<AppCenterWorkItem> = {}): AppCenterWorkItem {
  return {
    id: 'competitor_listing:hist-001',
    type: 'competitor_listing',
    title: 'DE B000000001 Listing 作业',
    status: 'review_required',
    marketplace: 'DE',
    asinOrSku: 'B000000001',
    sourceRoute: 'ppc_search_terms',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:40:00.000Z',
    ...overrides,
  };
}

function makePpcArtifact(
  overrides: Partial<AppCenterArtifactEnvelope> = {}
): AppCenterArtifactEnvelope {
  return {
    id: 'ppc-1',
    workItemId: 'competitor_listing:hist-001',
    type: 'ppc_action_list',
    sourceRoute: 'ppc_search_terms',
    title: 'PPC 动作清单',
    summary: '2 行动作 · Owner 广告小张 · 待人工确认',
    payloadRef: 'ppc_action_list:ppc-export-001',
    createdAt: '2026-01-01T00:40:00.000Z',
    metadata: {
      owner: '广告小张',
      requiresHumanConfirmation: true,
      rowCount: 2,
      reportType: 'search_term',
      filter: 'scale_budget',
    },
    ...overrides,
  };
}

function makeScrapeArtifact(
  overrides: Partial<AppCenterArtifactEnvelope> = {}
): AppCenterArtifactEnvelope {
  return {
    id: 'scrape-1',
    workItemId: 'competitor_listing:hist-001',
    type: 'scrape_history',
    sourceRoute: 'scraper',
    title: '采集历史',
    summary: 'DE · 1 ASIN',
    payloadRef: 'history:hist-001',
    createdAt: '2026-01-01T00:10:00.000Z',
    ...overrides,
  };
}

describe('buildRecentArtifactPresentation (shipped presenter)', () => {
  it('uses work-context primary title for PPC and short type label once', () => {
    const presentation = buildRecentArtifactPresentation(makePpcArtifact(), makeWorkItem());

    expect(presentation.typeLabel).toBe(RECENT_ARTIFACT_TYPE_LABELS.ppc_action_list);
    expect(presentation.typeLabel).toBe('PPC');
    expect(presentation.primaryTitle).toBe('DE · B000000001');
    expect(presentation.primaryTitle).not.toBe('PPC 动作清单');
    expect(presentation.primaryTitle).not.toContain('PPC 动作清单');
  });

  it('extracts de-duplicated PPC facts without repeating type or title', () => {
    const presentation = buildRecentArtifactPresentation(makePpcArtifact(), makeWorkItem());

    expect(presentation.facts).toEqual(
      expect.arrayContaining(['2 条建议动作', '负责人：广告小张', '增加预算候选'])
    );
    expect(presentation.facts).not.toContain('PPC');
    expect(presentation.facts).not.toContain('PPC 动作清单');
    expect(presentation.facts).not.toContain('DE');
    expect(presentation.facts).not.toContain('B000000001');
    expect(presentation.facts).not.toContain('DE · B000000001');
  });

  it('uses work context for generic scrape titles and keeps ASIN count as a fact', () => {
    const presentation = buildRecentArtifactPresentation(
      makeScrapeArtifact(),
      makeWorkItem({ asinOrSku: 'B000000001, B000000002' })
    );

    expect(presentation.typeLabel).toBe('采集');
    expect(presentation.primaryTitle).toBe('DE · B000000001 +1 ASIN');
    expect(presentation.primaryTitle).not.toBe('采集历史');
    expect(presentation.facts).toContain('2个ASIN');
    expect(presentation.facts).not.toContain('采集');
    expect(presentation.facts).not.toContain('采集历史');
  });

  it('falls back to type label when no work item or useful title exists', () => {
    const presentation = buildRecentArtifactPresentation(
      makeScrapeArtifact({ title: '采集历史', summary: '绑定当前采集历史的分析报告' }),
      null
    );

    expect(presentation.primaryTitle).toBe('采集');
    expect(presentation.facts).not.toContain('绑定当前采集历史的分析报告');
  });

  it('marks items fresher than one hour', () => {
    const now = Date.parse('2026-01-01T01:00:00.000Z');
    const presentation = buildRecentArtifactPresentation(
      makePpcArtifact({ createdAt: '2026-01-01T00:30:00.000Z' }),
      makeWorkItem(),
      now
    );

    expect(presentation.isFresh).toBe(true);
    expect(presentation.relativeTime).toBe('30 分钟前');
  });

  it('formats analysis / listing / keyword stage facts from metadata', () => {
    const scrape = buildRecentArtifactPresentation(
      {
        id: 'scrape-2',
        workItemId: 'competitor_listing:hist-001',
        type: 'scrape_history',
        sourceRoute: 'scraper',
        title: '采集历史',
        summary: 'DE · 2个ASIN · JSON导入',
        payloadRef: 'history:hist-001',
        createdAt: '2026-01-01T00:10:00.000Z',
        metadata: { asinCount: 2, dataSource: 'JSON导入', marketplace: 'DE' },
      },
      makeWorkItem({ asinOrSku: 'B000000001, B000000002' })
    );
    // Marketplace is already in the card title; body keeps ASIN + source density.
    expect(scrape.facts).toEqual(expect.arrayContaining(['2个ASIN', 'JSON导入']));

    const analysis = buildRecentArtifactPresentation(
      {
        id: 'analysis-1',
        workItemId: 'competitor_listing:hist-001',
        type: 'analysis_report',
        sourceRoute: 'ai_analysis',
        title: 'AI 分析报告',
        summary: '2个ASIN · 3个分析维度 · 82%置信度',
        payloadRef: 'history:hist-001#analysis',
        createdAt: '2026-01-01T00:20:00.000Z',
        metadata: {
          asinCount: 2,
          dimensionCount: 3,
          overallConfidencePercent: 82,
          model: 'grok-4.5',
        },
      },
      makeWorkItem()
    );
    expect(analysis.facts).toEqual(['2个ASIN', '3个分析维度', '82%置信度']);

    const prompt = buildRecentArtifactPresentation(
      {
        id: 'prompt-1',
        workItemId: 'competitor_listing:hist-001',
        type: 'listing_prompt',
        sourceRoute: 'promptlab',
        title: 'Listing Prompt',
        summary: '专业 · COSMO',
        payloadRef: 'prompt:p1',
        createdAt: '2026-01-01T00:22:00.000Z',
        metadata: { strategy: '专业 · COSMO', asinCount: 1, marketplace: 'DE' },
      },
      makeWorkItem()
    );
    expect(prompt.facts).toContain('专业 · COSMO');

    const copy = buildRecentArtifactPresentation(
      {
        id: 'copy-1',
        workItemId: 'competitor_listing:hist-001',
        type: 'listing_copy',
        sourceRoute: 'playground_deep_chat',
        title: '产品文案',
        summary: '2个SEO关键词 · gpt-4.1',
        payloadRef: 'listing_copy:c1',
        createdAt: '2026-01-01T00:25:00.000Z',
        metadata: { keywordCount: 2, model: 'gpt-4.1', promptId: 'p1', threadId: 't1' },
      },
      makeWorkItem()
    );
    expect(copy.facts).toEqual(['2个SEO关键词', 'gpt-4.1']);

    const keywords = buildRecentArtifactPresentation(
      {
        id: 'kw-1',
        workItemId: 'competitor_listing:hist-001',
        type: 'keyword_snapshot',
        sourceRoute: 'keyword_hunter_analysis',
        title: '关键词',
        summary: '4个关键词 · 3个命中 · 1个未命中',
        payloadRef: 'keyword_snapshot:k1',
        createdAt: '2026-01-01T00:30:00.000Z',
        metadata: { keywordCount: 4, matchedCount: 3, unmatchedCount: 1 },
      },
      makeWorkItem()
    );
    expect(keywords.facts).toEqual(['4个关键词', '3个命中', '1个未命中']);

    const review = buildRecentArtifactPresentation(
      {
        id: 'review-1',
        workItemId: 'competitor_listing:hist-001',
        type: 'listing_review',
        sourceRoute: 'keyword_hunter_analysis',
        title: '文案评审',
        summary: '良好 · 78/100 · grok-4.5',
        payloadRef: 'keyword_snapshot:k1',
        createdAt: '2026-01-01T00:35:00.000Z',
        metadata: { grade: '良好', score: 78, model: 'grok-4.5' },
      },
      makeWorkItem()
    );
    expect(review.facts).toEqual(['良好', '78/100', 'grok-4.5']);
  });
});
