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
    expect(measured).toEqual({
      lines: 84.23,
      statements: 82.42,
      functions: 84.53,
      branches: 68.64,
    });
    expect(
      compareCoverage(measured, { lines: 82, statements: 80, functions: 82, branches: 65 })
    ).toEqual([]);
  });

  it('returns all coverage deficits in canonical order with their values', () => {
    expect(
      compareCoverage(
        { lines: 81, statements: 72, functions: 63, branches: 54 },
        { lines: 82, statements: 74, functions: 66, branches: 58 }
      )
    ).toEqual([
      { dimension: 'lines', actual: 81, expected: 82 },
      { dimension: 'statements', actual: 72, expected: 74 },
      { dimension: 'functions', actual: 63, expected: 66 },
      { dimension: 'branches', actual: 54, expected: 58 },
    ]);
  });

  it('does not report coverage values equal to their thresholds', () => {
    const metrics = { lines: 82, statements: 80, functions: 82, branches: 65 };
    expect(compareCoverage(metrics, metrics)).toEqual([]);
  });

  it('rejects missing coverage dimensions', () => {
    const result = parseCoverageSummary(JSON.stringify({ total: { lines: { pct: 84 } } }));
    expect(result).toEqual({ status: 'error', message: 'coverage summary is missing statements' });
  });

  it.each([-0.01, 100.01])('rejects out-of-range coverage percentage %s', pct => {
    const result = parseCoverageSummary(
      JSON.stringify({ ...coverage, total: { ...coverage.total, lines: { pct } } })
    );
    expect(result).toEqual({
      status: 'error',
      message: 'total.lines.pct must be a percentage between 0 and 100',
    });
  });

  it.each([0, 100])('accepts coverage percentage boundary %s', pct => {
    const result = parseCoverageSummary(
      JSON.stringify({ ...coverage, total: { ...coverage.total, lines: { pct } } })
    );
    expect(requireMeasurement(result).lines).toBe(pct);
  });

  it.each([
    ['string pct', { pct: '84' }],
    ['null metric', null],
  ] as const)('rejects present coverage values with a %s', (_description, lines) => {
    const result = parseCoverageSummary(
      JSON.stringify({ ...coverage, total: { ...coverage.total, lines } })
    );
    expect(result).toEqual({
      status: 'error',
      message: 'total.lines.pct must be a percentage between 0 and 100',
    });
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

  it.each([-0.01, 100.01])('rejects out-of-range jscpd percentage %s', percentage => {
    const result = parseDuplicationReport(
      JSON.stringify({
        statistics: { total: { percentage, lines: 0, tokens: 0, files: 461 } },
      })
    );
    expect(result).toEqual({
      status: 'error',
      message: 'statistics.total.percentage must be a percentage between 0 and 100',
    });
  });

  it.each([
    ['lines', -1],
    ['lines', 1.5],
    ['lines', Number.MAX_SAFE_INTEGER + 1],
    ['tokens', -1],
    ['tokens', 1.5],
    ['tokens', Number.MAX_SAFE_INTEGER + 1],
    ['files', -1],
    ['files', 1.5],
    ['files', Number.MAX_SAFE_INTEGER + 1],
  ] as const)('rejects invalid jscpd %s count %s', (field, value) => {
    const result = parseDuplicationReport(
      JSON.stringify({
        statistics: {
          total: { percentage: 0, lines: 0, tokens: 0, files: 461, [field]: value },
        },
      })
    );
    expect(result).toEqual({
      status: 'error',
      message: `statistics.total.${field} must be a non-negative safe integer`,
    });
  });

  it('accepts inclusive jscpd percentage and count boundaries', () => {
    const result = parseDuplicationReport(
      JSON.stringify({
        statistics: {
          total: { percentage: 100, lines: 0, tokens: Number.MAX_SAFE_INTEGER, files: 0 },
        },
      })
    );
    expect(requireMeasurement(result)).toEqual({
      percentage: 100,
      lines: 0,
      tokens: Number.MAX_SAFE_INTEGER,
      files: 0,
    });
  });

  it('rejects malformed jscpd JSON', () => {
    expect(parseDuplicationReport('{')).toEqual({
      status: 'error',
      message: expect.stringMatching(/^jscpd report is malformed: /),
    });
  });

  it.each([
    { percentage: 0, lines: 0, files: 1 },
    { percentage: 0, lines: 0, tokens: 0 },
  ])('rejects incomplete jscpd numeric totals', total => {
    expect(parseDuplicationReport(JSON.stringify({ statistics: { total } }))).toEqual({
      status: 'error',
      message: 'jscpd report contains incomplete numeric totals',
    });
  });

  it.each([
    ['percentage', '0', 'percentage between 0 and 100'],
    ['lines', '0', 'non-negative safe integer'],
    ['tokens', null, 'non-negative safe integer'],
    ['files', [], 'non-negative safe integer'],
    ['sources', '461', 'non-negative safe integer'],
  ] as const)('rejects wrong-type jscpd %s values', (field, value, constraint) => {
    const total =
      field === 'sources'
        ? { percentage: 0, lines: 0, tokens: 0, [field]: value }
        : { percentage: 0, lines: 0, tokens: 0, files: 461, [field]: value };

    expect(parseDuplicationReport(JSON.stringify({ statistics: { total } }))).toEqual({
      status: 'error',
      message: `statistics.total.${field} must be a ${constraint}`,
    });
  });

  it.each(['null', '[]'])('fails closed on hostile coverage root %s', source => {
    expect(parseCoverageSummary(source)).toEqual({
      status: 'error',
      message: 'coverage summary is missing lines',
    });
  });

  it.each([
    ['null root', 'null'],
    ['array root', '[]'],
    ['null total', JSON.stringify({ statistics: { total: null } })],
    ['array total', JSON.stringify({ statistics: { total: [] } })],
  ])('fails closed on hostile jscpd %s', (_description, source) => {
    expect(parseDuplicationReport(source)).toEqual({
      status: 'error',
      message: 'jscpd report is missing statistics.total',
    });
  });

  it('throws the original measurement error message', () => {
    expect(() =>
      requireMeasurement<never>({ status: 'error', message: 'measurement failed closed' })
    ).toThrowError('measurement failed closed');
  });

  it('rejects a report without measured duplication totals', () => {
    expect(parseDuplicationReport('{}')).toEqual({
      status: 'error',
      message: 'jscpd report is missing statistics.total',
    });
  });
});
