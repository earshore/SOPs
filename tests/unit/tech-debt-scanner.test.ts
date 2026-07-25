import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
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
const temporaryLinks: string[] = [];

function createScannerCliProject(): { projectRoot: string; scannerPath: string } {
  const projectRoot = mkdtempSync(join(resolve('.'), '.tech-debt-scanner-cli-'));
  temporaryDirectories.push(projectRoot);
  const toolsDirectory = join(projectRoot, 'tools');
  const sourceDirectory = join(projectRoot, 'src');
  mkdirSync(toolsDirectory);
  mkdirSync(sourceDirectory);

  const scannerPath = join(toolsDirectory, 'tech-debt-scanner.ts');
  copyFileSync(resolve('tools/tech-debt-scanner.ts'), scannerPath);
  const repeatedLines = Array.from(
    { length: 20 },
    (_, index) => `duplicateCall${String(index + 1).padStart(2, '0')}();`
  );
  writeFileSync(
    join(sourceDirectory, 'medium-duplicate.ts'),
    [
      "const firstMarker = 'first';",
      ...repeatedLines,
      "const middleMarker = 'middle';",
      ...repeatedLines,
      "const lastMarker = 'last';",
    ].join('\n')
  );

  return { projectRoot, scannerPath };
}

function runScannerCli(projectRoot: string, scannerPath: string, args: string[] = []) {
  return spawnSync(process.execPath, ['--import', 'tsx', scannerPath, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const link of temporaryLinks) {
    if (existsSync(link)) unlinkSync(link);
  }
  temporaryLinks.length = 0;
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

  it('orders a copied candidate list by the first occurrence before deduping', () => {
    const occurrencesC = [12, 52];
    const occurrencesA = [10, 50];
    const occurrencesB = [11, 51];
    const candidates: DuplicateCandidate[] = [
      { occurrences: occurrencesC, blockLines: 10, preview: 'c' },
      { occurrences: occurrencesA, blockLines: 10, preview: 'a' },
      { occurrences: occurrencesB, blockLines: 10, preview: 'b' },
    ];
    const originalCandidates = structuredClone(candidates);

    expect(dedupeDuplicateCandidates(candidates)).toEqual([
      { occurrences: [10, 50], blockLines: 12, preview: 'a' },
    ]);
    expect(candidates).toEqual(originalCandidates);
    expect(candidates[0]?.occurrences).toBe(occurrencesC);
    expect(candidates[1]?.occurrences).toBe(occurrencesA);
    expect(candidates[2]?.occurrences).toBe(occurrencesB);
  });

  it('keeps candidates with uneven corresponding shifts separate', () => {
    const candidates: DuplicateCandidate[] = [
      { occurrences: [10, 100], blockLines: 10, preview: 'first' },
      { occurrences: [11, 109], blockLines: 10, preview: 'second' },
    ];

    expect(dedupeDuplicateCandidates(candidates)).toEqual(candidates);
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

  it('merges consistently shifted windows at the block boundary', () => {
    const candidates: DuplicateCandidate[] = [
      { occurrences: [10, 50], blockLines: 10, preview: 'first' },
      { occurrences: [20, 60], blockLines: 10, preview: 'second' },
    ];

    expect(dedupeDuplicateCandidates(candidates)).toEqual([
      { occurrences: [10, 50], blockLines: 20, preview: 'first' },
    ]);
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

  it.each([{ occurrences: [] }, { occurrences: [10] }])(
    'rejects a candidate with fewer than two occurrences: $occurrences',
    ({ occurrences }) => {
      const candidate: DuplicateCandidate = {
        occurrences,
        blockLines: 10,
        preview: 'invalid',
      };

      expect(() => dedupeDuplicateCandidates([candidate])).toThrow(
        'Duplicate candidates must contain at least two occurrences'
      );
    }
  );
});

describe('TechDebtScanner duplicate emission', () => {
  it('emits one issue for shifted windows from one clone group', () => {
    const directory = mkdtempSync(join(tmpdir(), 'sops-tech-debt-scanner-'));
    temporaryDirectories.push(directory);
    const repeatedLines = Array.from(
      { length: 22 },
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
      message: '发现重复代码块（共 2 处，行数 ≥ 22）',
    });
  });

  it('emits one issue covering an entire 25-line clone group', () => {
    const directory = mkdtempSync(join(tmpdir(), 'sops-tech-debt-scanner-long-clone-'));
    temporaryDirectories.push(directory);
    const repeatedLines = Array.from(
      { length: 25 },
      (_, index) => `longCloneStep${String(index + 1).padStart(2, '0')}();`
    );
    writeFileSync(
      join(directory, 'long-clone.ts'),
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

    expect(duplicateIssues.map(issue => ({ line: issue.line, message: issue.message }))).toEqual([
      { line: 2, message: '发现重复代码块（共 2 处，行数 ≥ 25）' },
    ]);
  });

  it('keeps real clone windows with uneven occurrence shifts separate', () => {
    const directory = mkdtempSync(join(tmpdir(), 'sops-tech-debt-scanner-uneven-'));
    temporaryDirectories.push(directory);
    const lines = Array.from(
      { length: 160 },
      (_, index) => `uniqueLine${String(index + 1).padStart(3, '0')}();`
    );
    // Shared 21-line core appears twice with uneven neighboring unique lines so
    // sliding windows at offset 0 and 1 are real separate clone groups.
    const sharedCore = Array.from(
      { length: 21 },
      (_, index) => `sharedCore${String(index + 1).padStart(2, '0')}();`
    );
    lines.splice(9, sharedCore.length, ...sharedCore);
    lines.splice(99, sharedCore.length, ...sharedCore);
    writeFileSync(join(directory, 'uneven-shifts.ts'), lines.join('\n'));

    const scanner = new TechDebtScanner();
    scanner.scan(directory);
    const duplicateIssues = scanner
      .generateReport()
      .issues.filter(issue => issue.ruleId === 'duplicate-code');

    expect(duplicateIssues.map(issue => ({ line: issue.line, message: issue.message }))).toEqual([
      { line: 10, message: '发现重复代码块（共 2 处，行数 ≥ 21）' },
    ]);
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
    ['an empty inline value', ['--fail-on=']],
  ])('rejects %s for --fail-on', (_description, args) => {
    const scannerPath = resolve('tools/tech-debt-scanner.ts');
    const result = spawnSync(process.execPath, ['--import', 'tsx', scannerPath, ...args], {
      encoding: 'utf8',
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Invalid --fail-on value: expected medium, high, or critical');
  });

  it('uses high by default and fails at an explicit medium floor', () => {
    const { projectRoot, scannerPath } = createScannerCliProject();
    const defaultResult = runScannerCli(projectRoot, scannerPath);
    const mediumResult = runScannerCli(projectRoot, scannerPath, ['--fail-on', 'medium']);

    expect(defaultResult.status).toBe(0);
    expect(defaultResult.stdout).toContain('🟠 高: 0');
    expect(defaultResult.stdout).toContain('🟡 中: 1');
    expect(mediumResult.status).toBe(1);
  });

  it('supports the inline --fail-on syntax', () => {
    const { projectRoot, scannerPath } = createScannerCliProject();

    const result = runScannerCli(projectRoot, scannerPath, ['--fail-on=medium']);

    expect(result.status).toBe(1);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('🟡 中: 1');
  });

  it('runs main when invoked through a directory alias', () => {
    const { projectRoot } = createScannerCliProject();
    const aliasRoot = `${projectRoot}-alias`;
    symlinkSync(projectRoot, aliasRoot, process.platform === 'win32' ? 'junction' : 'dir');
    temporaryLinks.push(aliasRoot);
    const aliasScannerPath = join(aliasRoot, 'tools', 'tech-debt-scanner.ts');

    const result = runScannerCli(aliasRoot, aliasScannerPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('🔍 开始扫描技术债务');
    expect(result.stdout).toContain('🟡 中: 1');
  });

  it.each(['--fail-on-medium', '--unknown'])('rejects unknown argument %s', argument => {
    const { projectRoot, scannerPath } = createScannerCliProject();

    const result = runScannerCli(projectRoot, scannerPath, [argument]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`Unknown argument: ${argument}`);
  });

  it.each([
    ['split arguments', ['--fail-on', 'medium', '--fail-on', 'high']],
    ['inline then split', ['--fail-on=medium', '--fail-on', 'high']],
    ['split then inline', ['--fail-on', 'medium', '--fail-on=high']],
  ])('rejects duplicate --fail-on using %s', (_description, args) => {
    const { projectRoot, scannerPath } = createScannerCliProject();

    const result = runScannerCli(projectRoot, scannerPath, args);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--fail-on may only be specified once');
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
