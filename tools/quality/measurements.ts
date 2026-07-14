export type Measurement<T> = { status: 'ok'; value: T } | { status: 'error'; message: string };

export interface CoverageMetrics {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
}

export interface DuplicationMetrics {
  percentage: number;
  lines: number;
  tokens: number;
  files: number;
}

export interface CoverageDeficit {
  dimension: keyof CoverageMetrics;
  actual: number;
  expected: number;
}

const COVERAGE_DIMENSIONS = ['lines', 'statements', 'functions', 'branches'] as const;

function error<T>(message: string): Measurement<T> {
  return { status: 'error', message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(record: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, field);
}

function isPercentage(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function coveragePercentage(
  total: Record<string, unknown> | undefined,
  dimension: keyof CoverageMetrics
): Measurement<number> {
  if (!total || !hasOwn(total, dimension)) {
    return error(`coverage summary is missing ${dimension}`);
  }

  const metric = total[dimension];
  if (!isRecord(metric)) {
    return error(`total.${dimension}.pct must be a percentage between 0 and 100`);
  }
  if (!hasOwn(metric, 'pct')) {
    return error(`coverage summary is missing ${dimension}`);
  }
  if (!isPercentage(metric.pct)) {
    return error(`total.${dimension}.pct must be a percentage between 0 and 100`);
  }

  return { status: 'ok', value: metric.pct };
}

export function parseCoverageSummary(source: string): Measurement<CoverageMetrics> {
  try {
    const parsed: unknown = JSON.parse(source);
    const total = isRecord(parsed) && isRecord(parsed.total) ? parsed.total : undefined;

    const lines = coveragePercentage(total, 'lines');
    if (lines.status === 'error') return lines;

    const statements = coveragePercentage(total, 'statements');
    if (statements.status === 'error') return statements;

    const functions = coveragePercentage(total, 'functions');
    if (functions.status === 'error') return functions;

    const branches = coveragePercentage(total, 'branches');
    if (branches.status === 'error') return branches;

    return {
      status: 'ok',
      value: {
        lines: lines.value,
        statements: statements.value,
        functions: functions.value,
        branches: branches.value,
      },
    };
  } catch (cause) {
    return error(
      `coverage summary is malformed: ${cause instanceof Error ? cause.message : String(cause)}`
    );
  }
}

export function parseDuplicationReport(source: string): Measurement<DuplicationMetrics> {
  try {
    const parsed: unknown = JSON.parse(source);
    const statistics = isRecord(parsed) && isRecord(parsed.statistics) ? parsed.statistics : null;
    const total = statistics && isRecord(statistics.total) ? statistics.total : null;

    if (!total) return error('jscpd report is missing statistics.total');

    if (!hasOwn(total, 'percentage') || !hasOwn(total, 'lines') || !hasOwn(total, 'tokens')) {
      return error('jscpd report contains incomplete numeric totals');
    }

    const fileField = hasOwn(total, 'sources')
      ? 'sources'
      : hasOwn(total, 'files')
        ? 'files'
        : null;
    if (!fileField) {
      return error('jscpd report contains incomplete numeric totals');
    }

    const percentage = total.percentage;
    if (!isPercentage(percentage)) {
      return error('statistics.total.percentage must be a percentage between 0 and 100');
    }

    const lines = total.lines;
    if (!isCount(lines)) {
      return error('statistics.total.lines must be a non-negative safe integer');
    }

    const tokens = total.tokens;
    if (!isCount(tokens)) {
      return error('statistics.total.tokens must be a non-negative safe integer');
    }

    const files = total[fileField];
    if (!isCount(files)) {
      return error(`statistics.total.${fileField} must be a non-negative safe integer`);
    }

    return {
      status: 'ok',
      value: { percentage, lines, tokens, files },
    };
  } catch (cause) {
    return error(
      `jscpd report is malformed: ${cause instanceof Error ? cause.message : String(cause)}`
    );
  }
}

export function requireMeasurement<T>(measurement: Measurement<T>): T {
  if (measurement.status === 'error') throw new Error(measurement.message);
  return measurement.value;
}

export function compareCoverage(
  actual: CoverageMetrics,
  expected: CoverageMetrics
): CoverageDeficit[] {
  return COVERAGE_DIMENSIONS.filter(dimension => actual[dimension] < expected[dimension]).map(
    dimension => ({ dimension, actual: actual[dimension], expected: expected[dimension] })
  );
}
