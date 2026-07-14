import { describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
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
  it('shows each complexity point as its violation count above its stored threshold', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'quality-monitor-trend-'));
    const historyFile = join(tempDir, 'history.json');
    const outputFile = join(tempDir, 'trend.html');
    const baseMetrics = {
      timestamp: '2026-07-14T00:00:00.000Z',
      duplication: { percentage: 0, lines: 0, tokens: 0, files: 1 },
      coverage: { lines: 84, statements: 82, functions: 84, branches: 68 },
      typeCoverage: { percentage: 99, total: 100, covered: 99, uncovered: 1 },
      lintErrors: 0,
      lintWarnings: 0,
    };

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
});
