import { describe, expect, it } from 'vitest';
import {
  compareCoverage,
  parseCoverageSummary,
  parseDuplicationReport,
  requireMeasurement,
} from '../../tools/quality/measurements';

const coverage = {
  total: {
    lines: { pct: 84.23 },
    statements: { pct: 82.42 },
    functions: { pct: 84.53 },
    branches: { pct: 68.64 },
  },
};

describe('quality measurements', () => {
  it('parses complete coverage and compares every dimension', () => {
    const measured = requireMeasurement(parseCoverageSummary(JSON.stringify(coverage)));
    expect(
      compareCoverage(measured, { lines: 82, statements: 80, functions: 82, branches: 65 })
    ).toEqual([]);
  });

  it('rejects missing coverage dimensions', () => {
    const result = parseCoverageSummary(JSON.stringify({ total: { lines: { pct: 84 } } }));
    expect(result).toEqual({ status: 'error', message: 'coverage summary is missing statements' });
  });

  it('rejects malformed JSON instead of returning zero', () => {
    expect(parseCoverageSummary('{')).toMatchObject({ status: 'error' });
  });

  it('accepts a generated duplication report whose measured value is zero', () => {
    const result = parseDuplicationReport(
      JSON.stringify({
        statistics: { total: { percentage: 0, lines: 0, tokens: 0, sources: 461 } },
      })
    );
    expect(requireMeasurement(result).percentage).toBe(0);
  });

  it('rejects a report without measured duplication totals', () => {
    expect(parseDuplicationReport('{}')).toEqual({
      status: 'error',
      message: 'jscpd report is missing statistics.total',
    });
  });
});
