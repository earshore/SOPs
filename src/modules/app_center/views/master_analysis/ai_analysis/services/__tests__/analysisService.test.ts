import { afterEach, describe, expect, it, vi } from 'vitest';
import { SAMPLE_ANALYSIS_REPORT } from '../../config/analysisReportData';
import { parseAnalysisReport } from '../analysisService';
import type { FullAnalysisReport } from '../../config/analysisReportData';

const ALL_TARGETS = [
  'title-keywords',
  'selling-points',
  'fatal-flaws',
  'wow-moments',
  'hesitation-points',
  'buyer-profile',
  'vocab-gap',
  'promise-reality',
];

describe('analysisService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses requested targets in the requested order', () => {
    const results = parseAnalysisReport(SAMPLE_ANALYSIS_REPORT, ['fatal-flaws', 'title-keywords']);

    expect(results.map(result => result.targetId)).toEqual(['fatal-flaws', 'title-keywords']);
  });

  it('skips missing target sections', () => {
    const report = {
      'title-keywords': SAMPLE_ANALYSIS_REPORT['title-keywords'],
    } as FullAnalysisReport;

    const results = parseAnalysisReport(report, ['selling-points']);

    expect(results).toEqual([]);
  });

  it('parses all supported report sections into display results', () => {
    const results = parseAnalysisReport(SAMPLE_ANALYSIS_REPORT, ALL_TARGETS);

    expect(results.map(result => result.targetId)).toEqual(ALL_TARGETS);
    expect(results).toHaveLength(8);

    expect(results.find(result => result.targetId === 'selling-points')?.stats).toEqual([
      { label: '功能卖点', value: '5个' },
      { label: '场景覆盖', value: '5个' },
      { label: '痛点解决', value: '5个' },
    ]);
    expect(results.find(result => result.targetId === 'wow-moments')?.source).toBe('Reviews');
    expect(results.find(result => result.targetId === 'vocab-gap')?.details[3]?.category).toBe(
      '标题优化建议'
    );
    expect(results.find(result => result.targetId === 'promise-reality')?.highlights[0]?.type).toBe(
      'danger'
    );
  });

  it('uses defensive defaults for sparse report sections', () => {
    const report = {
      'selling-points': {},
      'fatal-flaws': {
        critical_issues: [{ issue: 'fragile cap', severity: 'minor' }],
      },
      'buyer-profile': {
        demographics: {},
        geographic_insights: {},
      },
    } as FullAnalysisReport;

    const results = parseAnalysisReport(report, ['selling-points', 'fatal-flaws', 'buyer-profile']);

    expect(results[0]?.stats).toEqual([
      { label: '功能卖点', value: '0个' },
      { label: '场景覆盖', value: '0个' },
      { label: '痛点解决', value: '0个' },
    ]);
    expect(results[1]?.stats[2]).toEqual({ label: '风险等级', value: 'UNKNOWN' });
    expect(results[2]?.highlights[0]?.text).toBe('核心用户：未知');
  });

  it('continues parsing other targets when one section is malformed', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const report = {
      'title-keywords': {
        primary_keywords: [null],
      },
      'wow-moments': SAMPLE_ANALYSIS_REPORT['wow-moments'],
    } as unknown as FullAnalysisReport;

    const results = parseAnalysisReport(report, ['title-keywords', 'wow-moments']);

    expect(results.map(result => result.targetId)).toEqual(['wow-moments']);
    expect(errorSpy).toHaveBeenCalledWith(
      '[AI分析] 解析 title-keywords 时出错:',
      expect.any(TypeError)
    );
  });
});
