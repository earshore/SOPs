import { describe, expect, it } from 'vitest';
import { detectReportType, getReportMetadata, isSupportedReport } from './reportTypeDetector';
import { ReportType } from '../types/downloadsReportTypes';

describe('reportTypeDetector', () => {
  it('detects full analysis reports before downloads formats', () => {
    expect(
      detectReportType({
        'buyer-profile': { demographics: {} },
        _metadata: { targetIds: ['buyer-profile'] },
      })
    ).toBe(ReportType.FULL_ANALYSIS);

    expect(
      detectReportType({
        'selling-points': {},
        competitor_insights: {},
      })
    ).toBe(ReportType.UNKNOWN);
  });

  it('detects supported downloads report families', () => {
    expect(
      detectReportType({
        competitor_insights: { strengths: [] },
        feature_points: ['compact'],
        keyword_clusters: { core: ['organizer'] },
      })
    ).toBe(ReportType.COMPETITOR);

    expect(
      detectReportType({
        productOverview: { summary: 'Overview' },
        user_profile: { goals: [] },
        coreFeatures: { material: 'steel' },
      })
    ).toBe(ReportType.PRODUCT_OVERVIEW);

    expect(
      detectReportType({
        pain_point_gaps: { top_quality_issues: [] },
        native_voice: { native_phrasing: [] },
        high_frequency_phrases: { attribute: [] },
        meta: { templateUsed: '语义分析模板' },
      })
    ).toBe(ReportType.SEMANTIC_ANALYSIS);
  });

  it('returns unknown for invalid or incomplete reports', () => {
    expect(detectReportType(null)).toBe(ReportType.UNKNOWN);
    expect(detectReportType('raw report')).toBe(ReportType.UNKNOWN);
    expect(detectReportType({ competitor_insights: {}, feature_points: 'invalid' })).toBe(
      ReportType.UNKNOWN
    );
    expect(isSupportedReport({ product_overview: {}, userProfile: {}, core_features: {} })).toBe(
      true
    );
    expect(isSupportedReport({ product_overview: {}, userProfile: {} })).toBe(false);
  });

  it('extracts metadata from report meta fields with safe defaults', () => {
    expect(
      getReportMetadata({
        productOverview: { summary: 'Overview' },
        user_profile: {},
        coreFeatures: {},
        meta: {
          asins: ['B001', 42, 'B002'],
          market: 'US',
          generatedAt: '2026-07-02T10:00:00Z',
        },
      })
    ).toEqual({
      type: ReportType.PRODUCT_OVERVIEW,
      asins: ['B001', 'B002'],
      market: 'US',
      generatedAt: '2026-07-02T10:00:00Z',
    });

    expect(getReportMetadata({ meta: 'invalid' })).toEqual({
      type: ReportType.UNKNOWN,
      asins: [],
      market: 'unknown',
      generatedAt: '',
    });
  });
});
