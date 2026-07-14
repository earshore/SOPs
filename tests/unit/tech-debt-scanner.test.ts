import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import {
  dedupeDuplicateCandidates,
  shouldFailOnSeverity,
  TechDebtScanner,
  type DuplicateCandidate,
  type Severity,
} from '../../tools/tech-debt-scanner';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
  temporaryDirectories.length = 0;
});

describe('dedupeDuplicateCandidates', () => {
  it('collapses shifted windows from one clone group', () => {
    const candidates: DuplicateCandidate[] = [
      { occurrences: [10, 50], blockLines: 10, preview: 'a' },
      { occurrences: [11, 51], blockLines: 10, preview: 'b' },
      { occurrences: [12, 52], blockLines: 10, preview: 'c' },
    ];

    expect(dedupeDuplicateCandidates(candidates)).toEqual([
      { occurrences: [10, 50], blockLines: 12, preview: 'a' },
    ]);
  });

  it('keeps non-overlapping clone groups separate', () => {
    const candidates: DuplicateCandidate[] = [
      { occurrences: [10, 50], blockLines: 10, preview: 'first' },
      { occurrences: [30, 80], blockLines: 10, preview: 'second' },
    ];

    expect(dedupeDuplicateCandidates(candidates)).toEqual(candidates);
  });

  it('requires the same number of corresponding occurrences', () => {
    const candidates: DuplicateCandidate[] = [
      { occurrences: [10, 50], blockLines: 10, preview: 'first' },
      { occurrences: [11, 51, 91], blockLines: 10, preview: 'second' },
    ];

    expect(dedupeDuplicateCandidates(candidates)).toHaveLength(2);
  });

  it('compares occurrences in their existing order', () => {
    const candidates: DuplicateCandidate[] = [
      { occurrences: [10, 50], blockLines: 10, preview: 'first' },
      { occurrences: [51, 11], blockLines: 10, preview: 'second' },
    ];

    expect(dedupeDuplicateCandidates(candidates)).toHaveLength(2);
  });

  it('requires every corresponding window to overlap', () => {
    const candidates: DuplicateCandidate[] = [
      { occurrences: [10, 50], blockLines: 10, preview: 'first' },
      { occurrences: [11, 60], blockLines: 10, preview: 'second' },
    ];

    expect(dedupeDuplicateCandidates(candidates)).toHaveLength(2);
  });

  it('does not merge windows that only touch at the block boundary', () => {
    const candidates: DuplicateCandidate[] = [
      { occurrences: [10, 50], blockLines: 10, preview: 'first' },
      { occurrences: [20, 60], blockLines: 10, preview: 'second' },
    ];

    expect(dedupeDuplicateCandidates(candidates)).toHaveLength(2);
  });

  it('does not mutate caller candidates or occurrence arrays', () => {
    const occurrences = [10, 50];
    const separateOccurrences = [100, 140];
    const candidates: DuplicateCandidate[] = [
      { occurrences, blockLines: 10, preview: 'first' },
      { occurrences: [11, 51], blockLines: 10, preview: 'second' },
      { occurrences: separateOccurrences, blockLines: 10, preview: 'separate' },
    ];
    const originalCandidates = structuredClone(candidates);

    const result = dedupeDuplicateCandidates(candidates);

    expect(candidates).toEqual(originalCandidates);
    expect(result[0]).not.toBe(candidates[0]);
    expect(result[0]?.occurrences).not.toBe(occurrences);
    expect(result[1]?.occurrences).not.toBe(separateOccurrences);
  });
});

describe('TechDebtScanner duplicate emission', () => {
  it('emits one issue for shifted windows from one clone group', () => {
    const directory = mkdtempSync(join(tmpdir(), 'sops-tech-debt-scanner-'));
    temporaryDirectories.push(directory);
    const repeatedLines = Array.from(
      { length: 12 },
      (_, index) => `duplicateStep${String(index + 1).padStart(2, '0')}();`
    );
    writeFileSync(
      join(directory, 'duplicate.ts'),
      [
        "const firstMarker = 'first';",
        ...repeatedLines,
        "const middleMarker = 'middle';",
        ...repeatedLines,
        "const lastMarker = 'last';",
      ].join('\n')
    );

    const scanner = new TechDebtScanner();
    scanner.scan(directory);
    const duplicateIssues = scanner
      .generateReport()
      .issues.filter(issue => issue.ruleId === 'duplicate-code');

    expect(duplicateIssues).toHaveLength(1);
    expect(duplicateIssues[0]).toMatchObject({
      severity: 'medium',
      line: 2,
      column: 1,
      message: '发现重复代码块（共 2 处，行数 ≥ 12）',
    });
  });
});

describe('shouldFailOnSeverity', () => {
  it('fails at the selected severity floor', () => {
    const counts: Record<Severity, number> = {
      low: 3,
      medium: 1,
      high: 0,
      critical: 0,
    };

    expect(shouldFailOnSeverity(counts, 'medium')).toBe(true);
    expect(shouldFailOnSeverity(counts, 'high')).toBe(false);
  });
});

describe('tech debt scanner CLI', () => {
  it.each([
    ['a missing value', ['--fail-on']],
    ['an invalid value', ['--fail-on', 'low']],
    ['an inline value', ['--fail-on=low']],
  ])('rejects %s for --fail-on', (_description, args) => {
    const scannerPath = resolve('tools/tech-debt-scanner.ts');
    const result = spawnSync(process.execPath, ['--import', 'tsx', scannerPath, ...args], {
      encoding: 'utf8',
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('--fail-on must be one of: medium, high, critical');
  });

  it('provides a package gate at the medium severity floor', () => {
    const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['tech-debt:gate']).toBe(
      'tsx tools/tech-debt-scanner.ts --fail-on medium'
    );
  });
});
