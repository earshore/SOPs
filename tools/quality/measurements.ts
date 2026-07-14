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
  return typeof value === 'object' && value !== null;
}

function numberField(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function coveragePercentage(
  total: Record<string, unknown> | undefined,
  dimension: keyof CoverageMetrics
): number | null {
  const metric = total?.[dimension];
  return numberField(isRecord(metric) ? metric.pct : undefined);
}

export function parseCoverageSummary(source: string): Measurement<CoverageMetrics> {
  try {
    const parsed: unknown = JSON.parse(source);
    const total = isRecord(parsed) && isRecord(parsed.total) ? parsed.total : undefined;

    const lines = coveragePercentage(total, 'lines');
    if (lines === null) return error('coverage summary is missing lines');

    const statements = coveragePercentage(total, 'statements');
    if (statements === null) return error('coverage summary is missing statements');

    const functions = coveragePercentage(total, 'functions');
    if (functions === null) return error('coverage summary is missing functions');

    const branches = coveragePercentage(total, 'branches');
    if (branches === null) return error('coverage summary is missing branches');

    return {
      status: 'ok',
      value: { lines, statements, functions, branches },
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

    const percentage = numberField(total.percentage);
    const lines = numberField(total.lines);
    const tokens = numberField(total.tokens);
    const files = numberField(total.sources ?? total.files);

    if (percentage === null || lines === null || tokens === null || files === null) {
      return error('jscpd report contains incomplete numeric totals');
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
