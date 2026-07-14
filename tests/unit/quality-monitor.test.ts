import { describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { QualityMonitor, type MonitorConfig } from '../../tools/quality-monitor';

const config: MonitorConfig = {
  srcDir: 'src',
  testDir: 'tests',
  outputDir: 'tests/quality',
  historyFile: 'tests/quality/history.json',
  thresholds: {
    coverage: { lines: 82, statements: 80, functions: 82, branches: 65 },
    maxCyclomaticComplexity: 10,
    maxCognitiveComplexity: 15,
    maxDuplicationPercentage: 5,
    minTypeCoveragePercentage: 90,
    maxLintErrors: 0,
  },
  enableESLint: true,
  enableDuplication: false,
  enableCoverage: false,
  enableTypeCoverage: false,
  strict: true,
};

const duplicationReport = JSON.stringify({
  statistics: { total: { percentage: 0, lines: 0, tokens: 0, files: 1 } },
});

function readJscpdOutputDirectory(command: string): string {
  const match = command.match(/--output\s+(?:"([^"]+)"|(\S+))/);
  const directory = match?.[1] ?? match?.[2];
  if (!directory) throw new Error(`jscpd command has no output directory: ${command}`);
  return directory;
}

function writeDuplicationReport(directory: string): void {
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'jscpd-report.json'), duplicationReport, 'utf8');
}

function createCoverageMonitor(
  coverage: MonitorConfig['thresholds']['coverage'],
  strict = config.strict
): QualityMonitor {
  return new QualityMonitor(
    { ...config, strict, enableESLint: false, enableCoverage: true },
    {
      exec: vi.fn(() => ''),
      exists: file => file.endsWith('coverage-summary.json'),
      read: () =>
        JSON.stringify({
          total: {
            lines: { pct: coverage.lines },
            statements: { pct: coverage.statements },
            functions: { pct: coverage.functions },
            branches: { pct: coverage.branches },
          },
        }),
    }
  );
}

const belowThresholdCoverage = {
  lines: 81,
  statements: 79,
  functions: 81,
  branches: 64,
};

describe('QualityMonitor collection failures', () => {
  it('rejects an ESLint command failure', async () => {
    const monitor = new QualityMonitor(config, {
      exec: vi.fn(() => {
        throw new Error('eslint unavailable');
      }),
      exists: vi.fn(() => false),
      read: vi.fn(() => ''),
    });

    await expect(monitor.runAll()).rejects.toThrow('eslint unavailable');
  });

  it('rejects a missing generated duplication report', async () => {
    const monitor = new QualityMonitor(
      { ...config, enableESLint: false, enableDuplication: true },
      {
        exec: vi.fn(() => ''),
        exists: vi.fn(() => false),
        read: vi.fn(() => ''),
      }
    );

    await expect(monitor.runAll()).rejects.toThrow('jscpd report is missing');
  });

  it('rejects an ESLint failure during lint collection', async () => {
    let invocation = 0;
    const monitor = new QualityMonitor(config, {
      exec: vi.fn(() => {
        invocation += 1;
        if (invocation === 1) return '[]';
        throw new Error('lint unavailable');
      }),
      exists: vi.fn(() => false),
      read: vi.fn(() => ''),
    });

    await expect(monitor.runAll()).rejects.toThrow('lint unavailable');
  });

  it('rejects an ESLint execution failure even when stdout looks parseable', async () => {
    const executionFailure = { status: 2, stdout: '[]' };
    const monitor = new QualityMonitor(config, {
      exec: vi.fn(() => {
        throw executionFailure;
      }),
      exists: vi.fn(() => false),
      read: vi.fn(() => ''),
    });

    await expect(monitor.runAll()).rejects.toBe(executionFailure);
  });

  it('parses status-one ESLint findings from stdout', async () => {
    const findings = JSON.stringify([
      {
        filePath: 'src/example.ts',
        messages: [
          {
            ruleId: 'complexity',
            message: 'Function has a complexity of 12. Maximum allowed is 10.',
            line: 7,
          },
        ],
        errorCount: 1,
        warningCount: 0,
      },
    ]);
    const monitor = new QualityMonitor(config, {
      exec: vi.fn(() => {
        throw { status: 1, stdout: findings };
      }),
      exists: vi.fn(() => false),
      read: vi.fn(() => ''),
    });

    const report = await monitor.runAll();

    expect(report.metrics.complexity.violations).toHaveLength(1);
    expect(report.metrics.lintErrors).toBe(1);
    expect(report.violations.map(violation => violation.type)).toEqual(['complexity', 'lint']);
  });
});

describe('QualityMonitor report identity', () => {
  it('runs jscpd from the project root with a relative source path', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'quality-monitor-jscpd-path-'));
    const exec = vi.fn((command: string, _options?: unknown) => {
      writeDuplicationReport(readJscpdOutputDirectory(command));
      return '';
    });
    const monitor = new QualityMonitor(
      {
        ...config,
        srcDir: join(process.cwd(), 'src'),
        outputDir,
        enableESLint: false,
        enableDuplication: true,
      },
      {
        exec,
        exists: existsSync,
        read: file => readFileSync(file, 'utf8'),
      }
    );

    try {
      await monitor.runAll();

      const [command, options] = exec.mock.calls[0];
      expect(command).toMatch(/^npx jscpd "src" /);
      expect(options).toMatchObject({ cwd: process.cwd() });
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('normalizes a nested jscpd source path to forward slashes', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'quality-monitor-jscpd-path-'));
    const exec = vi.fn((command: string, _options?: unknown) => {
      writeDuplicationReport(readJscpdOutputDirectory(command));
      return '';
    });
    const monitor = new QualityMonitor(
      {
        ...config,
        srcDir: join(process.cwd(), 'src', 'common'),
        outputDir,
        enableESLint: false,
        enableDuplication: true,
      },
      {
        exec,
        exists: existsSync,
        read: file => readFileSync(file, 'utf8'),
      }
    );

    try {
      await monitor.runAll();

      const [command, options] = exec.mock.calls[0];
      expect(command).toMatch(/^npx jscpd "src\/common" /);
      expect(options).toMatchObject({ cwd: process.cwd() });
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('rejects a stale legacy duplication report after a no-op producer', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'quality-monitor-stale-'));
    writeDuplicationReport(outputDir);

    try {
      const monitor = new QualityMonitor(
        { ...config, enableESLint: false, enableDuplication: true, outputDir },
        {
          exec: vi.fn(() => ''),
          exists: existsSync,
          read: file => readFileSync(file, 'utf8'),
        }
      );

      await expect(monitor.runAll()).rejects.toThrow('jscpd report is missing');
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('rejects a stale deterministic coverage report after a no-op producer', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'quality-monitor-stale-'));
    const legacyCoverageFile = join(process.cwd(), 'coverage', 'coverage-summary.json');
    const coverageReport = JSON.stringify({
      total: {
        lines: { pct: 84 },
        statements: { pct: 82 },
        functions: { pct: 84 },
        branches: { pct: 68 },
      },
    });

    try {
      const monitor = new QualityMonitor(
        { ...config, enableESLint: false, enableCoverage: true, outputDir },
        {
          exec: vi.fn(() => ''),
          exists: file => file === legacyCoverageFile,
          read: () => coverageReport,
        }
      );

      await expect(monitor.runAll()).rejects.toThrow('coverage summary is missing');
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('does not let one monitor consume another monitor instance report', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'quality-monitor-concurrent-'));
    let firstReportDirectory = '';
    const fileDependencies = {
      exists: existsSync,
      read: (file: string) => readFileSync(file, 'utf8'),
    };
    const firstMonitor = new QualityMonitor(
      { ...config, enableESLint: false, enableDuplication: true, outputDir },
      {
        exec: vi.fn(command => {
          firstReportDirectory = readJscpdOutputDirectory(command);
          writeDuplicationReport(firstReportDirectory);
          return '';
        }),
        ...fileDependencies,
      }
    );
    const secondMonitor = new QualityMonitor(
      { ...config, enableESLint: false, enableDuplication: true, outputDir },
      {
        exec: vi.fn(() => {
          writeDuplicationReport(firstReportDirectory);
          return '';
        }),
        ...fileDependencies,
      }
    );

    try {
      const [firstResult, secondResult] = await Promise.allSettled([
        firstMonitor.runAll(),
        secondMonitor.runAll(),
      ]);

      expect(firstResult.status).toBe('fulfilled');
      expect(secondResult).toMatchObject({
        status: 'rejected',
        reason: expect.objectContaining({
          message: expect.stringContaining('jscpd report is missing'),
        }),
      });
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });
});

describe('QualityMonitor coverage collection', () => {
  it('disables all child coverage thresholds so the monitor owns threshold evaluation', async () => {
    const exec = vi.fn(() => '');
    const monitor = new QualityMonitor(
      { ...config, enableESLint: false, enableCoverage: true },
      {
        exec,
        exists: file => file.endsWith('coverage-summary.json'),
        read: () =>
          JSON.stringify({
            total: {
              lines: { pct: config.thresholds.coverage.lines },
              statements: { pct: config.thresholds.coverage.statements },
              functions: { pct: config.thresholds.coverage.functions },
              branches: { pct: config.thresholds.coverage.branches },
            },
          }),
      }
    );

    await monitor.runAll();

    const command = exec.mock.calls[0][0];
    expect(command).toContain('--coverage.thresholds.lines=0');
    expect(command).toContain('--coverage.thresholds.statements=0');
    expect(command).toContain('--coverage.thresholds.functions=0');
    expect(command).toContain('--coverage.thresholds.branches=0');
  });

  it('allows the coverage collector up to five minutes to finish', async () => {
    const exec = vi.fn(() => '');
    const monitor = new QualityMonitor(
      { ...config, enableESLint: false, enableCoverage: true },
      {
        exec,
        exists: file => file.endsWith('coverage-summary.json'),
        read: () =>
          JSON.stringify({
            total: {
              lines: { pct: config.thresholds.coverage.lines },
              statements: { pct: config.thresholds.coverage.statements },
              functions: { pct: config.thresholds.coverage.functions },
              branches: { pct: config.thresholds.coverage.branches },
            },
          }),
      }
    );

    await monitor.runAll();

    expect(exec.mock.calls[0][1]).toMatchObject({ timeout: 300000 });
  });

  it('reports fresh below-threshold coverage as strict blocking errors', async () => {
    const monitor = createCoverageMonitor(belowThresholdCoverage);

    const report = await monitor.runAll();
    const coverageViolations = report.violations.filter(violation => violation.type === 'coverage');

    expect(coverageViolations).toHaveLength(4);
    expect(coverageViolations.every(violation => violation.severity === 'error')).toBe(true);
    expect(report.passed).toBe(false);
    expect(monitor.shouldBlockBuild(report)).toBe(true);
    expect(report.score).toBeLessThan(100);
  });

  it('reports fresh below-threshold coverage as non-strict warnings', async () => {
    const monitor = createCoverageMonitor(belowThresholdCoverage, false);

    const report = await monitor.runAll();
    const coverageViolations = report.violations.filter(violation => violation.type === 'coverage');

    expect(coverageViolations).toHaveLength(4);
    expect(coverageViolations.every(violation => violation.severity === 'warning')).toBe(true);
    expect(report.passed).toBe(true);
    expect(monitor.shouldBlockBuild(report)).toBe(false);
    expect(report.score).toBeLessThan(100);
  });

  it('rejects a genuine coverage producer failure even when a summary looks available', async () => {
    const producerFailure = new Error('coverage tests failed');
    const read = vi.fn(() =>
      JSON.stringify({
        total: {
          lines: { pct: 100 },
          statements: { pct: 100 },
          functions: { pct: 100 },
          branches: { pct: 100 },
        },
      })
    );
    const monitor = new QualityMonitor(
      { ...config, enableESLint: false, enableCoverage: true },
      {
        exec: vi.fn(() => {
          throw producerFailure;
        }),
        exists: vi.fn(() => true),
        read,
      }
    );

    await expect(monitor.runAll()).rejects.toBe(producerFailure);
    expect(read).not.toHaveBeenCalled();
  });
});

describe('QualityMonitor measured results', () => {
  it('records actual ESLint complexity violations and lint totals', async () => {
    const eslintResults = JSON.stringify([
      {
        filePath: 'src/example.ts',
        messages: [
          {
            ruleId: 'complexity',
            message: 'Function has a complexity of 12. Maximum allowed is 10.',
            line: 7,
          },
        ],
        errorCount: 1,
        warningCount: 2,
      },
    ]);
    const monitor = new QualityMonitor(config, {
      exec: vi.fn(() => eslintResults),
      exists: vi.fn(() => false),
      read: vi.fn(() => ''),
    });

    const report = await monitor.runAll();

    expect(report.metrics.complexity).toEqual({
      threshold: 10,
      violations: [
        {
          cyclomatic: 12,
          cognitive: 0,
          file: 'src/example.ts',
          function: 'Function has a complexity of 12. Maximum allowed is 10.',
          line: 7,
        },
      ],
    });
    expect(report.metrics.lintErrors).toBe(1);
    expect(report.metrics.lintWarnings).toBe(2);
    expect(report.violations.map(violation => violation.type)).toEqual(['complexity', 'lint']);
  });

  it('uses measured reports and makes every strict threshold deficit blocking', async () => {
    const monitor = new QualityMonitor(
      {
        ...config,
        enableESLint: false,
        enableDuplication: true,
        enableCoverage: true,
      },
      {
        exec: vi.fn(() => ''),
        exists: vi.fn(() => true),
        read: vi.fn(file => {
          if (file.endsWith('jscpd-report.json')) {
            return JSON.stringify({
              statistics: {
                total: { percentage: 6, lines: 12, tokens: 120, files: 3 },
              },
            });
          }

          return JSON.stringify({
            total: {
              lines: { pct: 81 },
              statements: { pct: 79 },
              functions: { pct: 81 },
              branches: { pct: 64 },
            },
          });
        }),
      }
    );

    const report = await monitor.runAll();

    expect(report.metrics.duplication).toEqual({
      percentage: 6,
      lines: 12,
      tokens: 120,
      files: 3,
    });
    expect(report.metrics.coverage).toEqual({
      lines: 81,
      statements: 79,
      functions: 81,
      branches: 64,
    });
    expect(
      report.violations.map(({ type, severity, actual, expected }) => ({
        type,
        severity,
        actual,
        expected,
      }))
    ).toEqual([
      { type: 'duplication', severity: 'error', actual: 6, expected: 5 },
      { type: 'coverage', severity: 'error', actual: 81, expected: 82 },
      { type: 'coverage', severity: 'error', actual: 79, expected: 80 },
      { type: 'coverage', severity: 'error', actual: 81, expected: 82 },
      { type: 'coverage', severity: 'error', actual: 64, expected: 65 },
    ]);
    expect(monitor.shouldBlockBuild(report)).toBe(true);
  });

  it.each(['statements', 'functions', 'branches'] as const)(
    'penalizes a %s coverage deficit when line coverage meets its threshold',
    async dimension => {
      const coverage = {
        ...config.thresholds.coverage,
        [dimension]: config.thresholds.coverage[dimension] - 1,
      };
      const monitor = createCoverageMonitor(coverage);

      const report = await monitor.runAll();

      expect(report.metrics.coverage.lines).toBe(config.thresholds.coverage.lines);
      expect(report.passed).toBe(false);
      expect(monitor.shouldBlockBuild(report)).toBe(true);
      expect(report.score).toBeLessThan(100);
    }
  );

  it('keeps the score at 100 when every enabled coverage dimension passes', async () => {
    const monitor = createCoverageMonitor(config.thresholds.coverage);

    const report = await monitor.runAll();

    expect(report.passed).toBe(true);
    expect(report.score).toBe(100);
  });

  it('keeps non-strict monitoring report-only', async () => {
    const eslintResults = JSON.stringify([
      {
        filePath: 'src/example.ts',
        messages: [
          {
            ruleId: 'complexity',
            message: 'Function has a complexity of 12. Maximum allowed is 10.',
            line: 7,
          },
        ],
        errorCount: 1,
        warningCount: 0,
      },
    ]);
    const monitor = new QualityMonitor(
      { ...config, strict: false },
      {
        exec: vi.fn(() => eslintResults),
        exists: vi.fn(() => false),
        read: vi.fn(() => ''),
      }
    );

    const report = await monitor.runAll();

    expect(report.passed).toBe(false);
    expect(monitor.shouldBlockBuild(report)).toBe(false);
  });
});

describe('QualityMonitor trend output', () => {
  const baseMetrics = {
    timestamp: '2026-07-14T00:00:00.000Z',
    duplication: { percentage: 0, lines: 0, tokens: 0, files: 1 },
    coverage: { lines: 84, statements: 82, functions: 84, branches: 68 },
    typeCoverage: { percentage: 99, total: 100, covered: 99, uncovered: 1 },
    lintErrors: 0,
    lintWarnings: 0,
  };

  it('shows each complexity point as its violation count above its stored threshold', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'quality-monitor-trend-'));
    const historyFile = join(tempDir, 'history.json');
    const outputFile = join(tempDir, 'trend.html');

    try {
      writeFileSync(
        historyFile,
        JSON.stringify([
          {
            date: '2026-07-13',
            metrics: { ...baseMetrics, complexity: { threshold: 10, violations: [] } },
          },
          {
            date: '2026-07-14',
            metrics: {
              ...baseMetrics,
              complexity: {
                threshold: 12,
                violations: [
                  {
                    cyclomatic: 13,
                    cognitive: 0,
                    file: 'src/example.ts',
                    function: 'example',
                    line: 1,
                  },
                ],
              },
            },
          },
        ]),
        'utf8'
      );
      const monitor = new QualityMonitor({ ...config, historyFile });

      monitor.generateTrendChart(outputFile);

      const html = readFileSync(outputFile, 'utf8');
      expect(html).toContain('0 violations above 10');
      expect(html).toContain('1 violations above 12');
      expect(html).toContain('complexityLabels[context.dataIndex]');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('marks a missing legacy complexity threshold as unavailable', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'quality-monitor-trend-'));
    const historyFile = join(tempDir, 'history.json');
    const outputFile = join(tempDir, 'trend.html');

    try {
      writeFileSync(
        historyFile,
        JSON.stringify([
          {
            date: '2026-07-13',
            metrics: {
              ...baseMetrics,
              complexity: { average: 0, max: 0, violations: [] },
            },
          },
          {
            date: '2026-07-14',
            metrics: { ...baseMetrics, complexity: { threshold: 10, violations: [] } },
          },
        ]),
        'utf8'
      );
      const monitor = new QualityMonitor({ ...config, historyFile });

      monitor.generateTrendChart(outputFile);

      const html = readFileSync(outputFile, 'utf8');
      expect(html).toContain('0 violations above threshold unavailable');
      expect(html).toContain('0 violations above 10');
      expect(html).not.toContain('undefined');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
