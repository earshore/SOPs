import { afterEach, describe, expect, it, vi } from 'vitest';
import { SAMPLE_ANALYSIS_REPORT } from '../../config/analysisReportData';
import { parseAnalysisReport } from '../analysisService';
import type { FullAnalysisReport } from '../../config/analysisReportData';

describe('analysisService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses requested targets in the requested order', () => {
    const results = parseAnalysisReport(SAMPLE_ANALYSIS_REPORT, ['fatal-flaws', 'title-keywords']);

    expect(results.map((result) => result.targetId)).toEqual(['fatal-flaws', 'title-keywords']);
  });

  it('skips missing target sections', () => {
    const report = {
      'title-keywords': SAMPLE_ANALYSIS_REPORT['title-keywords']
    } as FullAnalysisReport;

    const results = parseAnalysisReport(report, ['selling-points']);

    expect(results).toEqual([]);
  });
});
