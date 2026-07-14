# Quality, Node, and Scanner Debt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the runtime declaration truthful, ratchet all coverage dimensions, make quality collection fail closed, and reduce actionable medium-or-higher scanner debt to zero.

**Architecture:** Keep `quality-monitor.ts` as the report/orchestration entry point, but move report parsing and threshold comparison into small pure modules with direct unit coverage. The scanner keeps its existing sliding-window detection and gains one precise overlap-deduplication stage before findings are emitted.

**Tech Stack:** TypeScript, Vitest, V8 coverage, ESLint, jscpd, npm

---

## File map

- Create `.node-version`: minimum supported Node runtime.
- Create `tests/unit/toolchain-contract.test.ts`: Node and coverage configuration contract.
- Modify `package.json`, `package-lock.json`, `vite.config.js`: engine and coverage ratchet.
- Create `tools/quality/measurements.ts`: typed fail-closed parsers and coverage comparison.
- Create `tests/unit/quality-measurements.test.ts`: parser/error/boundary coverage.
- Modify `tools/quality-monitor.ts`: consume measured results, fail on collection errors, remove duplicate methods.
- Create `tests/unit/quality-monitor.test.ts`: injected command/report failure tests.
- Modify `tools/tech-debt-scanner.ts`: deduplicate overlapping clone windows and add `--fail-on`.
- Create `tests/unit/tech-debt-scanner.test.ts`: real duplicate and overlap regression tests.
- Modify the five scanner-reported source/test files with narrow shared helpers or types.
- Modify `docs/TECH_DEBT_AUDIT.md`: record the ratchet, resolved findings, and deferred major migrations.

### Task 1: Align Node and coverage contracts

**Files:**

- Create: `.node-version`
- Create: `tests/unit/toolchain-contract.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.js`

- [ ] **Step 1: Write the failing toolchain contract**

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import viteConfig from '../../vite.config.js';

describe('release toolchain contract', () => {
  it('declares the Vite 8 Node floor consistently', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      engines: { node: string };
    };
    expect(packageJson.engines.node).toBe('^20.19.0 || >=22.12.0');
    expect(readFileSync('.node-version', 'utf8').trim()).toBe('20.19.0');
  });

  it('ratchets all four coverage dimensions', () => {
    const thresholds = viteConfig.test?.coverage?.thresholds;
    expect(thresholds).toEqual({
      lines: 82,
      statements: 80,
      functions: 82,
      branches: 65,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify RED**

```powershell
npx vitest run tests/unit/toolchain-contract.test.ts
```

Expected: FAIL because `.node-version` is missing and the current engine/thresholds are lower.

- [ ] **Step 3: Apply the runtime and threshold values**

Create `.node-version`:

```text
20.19.0
```

Change `package.json`:

```json
"engines": {
  "node": "^20.19.0 || >=22.12.0"
}
```

Change `vite.config.js` coverage thresholds:

```js
thresholds: {
  lines: 82,
  statements: 80,
  functions: 82,
  branches: 65,
},
```

Regenerate lockfile metadata without changing installed versions:

```powershell
npm install --package-lock-only --ignore-scripts
```

- [ ] **Step 4: Verify GREEN**

```powershell
npx vitest run tests/unit/toolchain-contract.test.ts
npm run test:coverage
```

Expected: the contract passes and measured coverage remains at or above 82/80/82/65.

- [ ] **Step 5: Commit the runtime ratchet**

```powershell
git add .node-version package.json package-lock.json vite.config.js tests/unit/toolchain-contract.test.ts
git commit -m "build: align node and coverage floors"
```

### Task 2: Add typed fail-closed measurement parsers

**Files:**

- Create: `tools/quality/measurements.ts`
- Create: `tests/unit/quality-measurements.test.ts`

- [ ] **Step 1: Write success, missing-field, malformed, and zero-value tests**

```ts
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
```

- [ ] **Step 2: Run the test to verify RED**

```powershell
npx vitest run tests/unit/quality-measurements.test.ts
```

Expected: FAIL because `tools/quality/measurements.ts` does not exist.

- [ ] **Step 3: Implement the measurement module**

```ts
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

function error<T>(message: string): Measurement<T> {
  return { status: 'error', message };
}

function numberField(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function parseCoverageSummary(source: string): Measurement<CoverageMetrics> {
  try {
    const parsed = JSON.parse(source) as { total?: Record<string, { pct?: unknown }> };
    for (const key of ['lines', 'statements', 'functions', 'branches'] as const) {
      if (numberField(parsed.total?.[key]?.pct) === null) {
        return error(`coverage summary is missing ${key}`);
      }
    }
    return {
      status: 'ok',
      value: {
        lines: parsed.total!.lines.pct as number,
        statements: parsed.total!.statements.pct as number,
        functions: parsed.total!.functions.pct as number,
        branches: parsed.total!.branches.pct as number,
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
    const parsed = JSON.parse(source) as {
      statistics?: { total?: Record<string, unknown> };
    };
    const total = parsed.statistics?.total;
    if (!total) return error('jscpd report is missing statistics.total');
    const percentage = numberField(total.percentage);
    const lines = numberField(total.lines);
    const tokens = numberField(total.tokens);
    const files = numberField(total.sources ?? total.files);
    if ([percentage, lines, tokens, files].some(value => value === null)) {
      return error('jscpd report contains incomplete numeric totals');
    }
    return {
      status: 'ok',
      value: { percentage: percentage!, lines: lines!, tokens: tokens!, files: files! },
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
  return (Object.keys(expected) as Array<keyof CoverageMetrics>)
    .filter(dimension => actual[dimension] < expected[dimension])
    .map(dimension => ({ dimension, actual: actual[dimension], expected: expected[dimension] }));
}
```

- [ ] **Step 4: Verify GREEN and commit**

```powershell
npx vitest run tests/unit/quality-measurements.test.ts
git add tools/quality/measurements.ts tests/unit/quality-measurements.test.ts
git commit -m "test: add fail-closed quality measurements"
```

Expected: all focused tests pass; commit succeeds.

### Task 3: Make `quality-monitor` fail closed

**Files:**

- Modify: `tools/quality-monitor.ts`
- Create: `tests/unit/quality-monitor.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Add injected failure regression tests**

Export `MonitorConfig` and `QualityMonitorDependencies`, then add tests that inject command and file failures:

```ts
import { describe, expect, it, vi } from 'vitest';
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
});
```

- [ ] **Step 2: Run the test to verify RED**

```powershell
npx vitest run tests/unit/quality-monitor.test.ts
```

Expected: FAIL because the constructor has no dependency argument and collection errors are swallowed.

- [ ] **Step 3: Add the narrow dependency boundary**

Add these types and defaults near `MonitorConfig`:

```ts
export interface QualityMonitorDependencies {
  exec(command: string, options?: Parameters<typeof execSync>[1]): string | Buffer;
  exists(path: string): boolean;
  read(path: string): string;
}

const DEFAULT_DEPENDENCIES: QualityMonitorDependencies = {
  exec: (command, options) => execSync(command, options),
  exists: file => fs.existsSync(file),
  read: file => fs.readFileSync(file, 'utf8'),
};
```

Change the constructor to store `dependencies = DEFAULT_DEPENDENCIES`. Use it in ESLint, jscpd, and coverage collectors. Collector catches may add context, but must rethrow instead of logging and returning.

- [ ] **Step 4: Replace fake complexity numbers**

Change the complexity summary to:

```ts
interface ComplexitySummary {
  threshold: number;
  violations: ComplexityMetrics[];
}
```

After a successful ESLint JSON parse, store only the configured threshold and actual violation records. Update console/HTML/trend output to say `0 violations above 10` when empty; do not serialize or display an average/max of zero.

- [ ] **Step 5: Consume measured duplication and coverage**

Import:

```ts
import {
  compareCoverage,
  parseCoverageSummary,
  parseDuplicationReport,
  requireMeasurement,
  type CoverageMetrics,
  type DuplicationMetrics,
} from './quality/measurements';
```

Read report text only after the producer command succeeds, then assign:

```ts
this.metrics.duplication = requireMeasurement(
  parseDuplicationReport(this.dependencies.read(outputFile))
);

this.metrics.coverage = requireMeasurement(
  parseCoverageSummary(this.dependencies.read(coverageFile))
);
```

Missing files throw named errors before parsing.

- [ ] **Step 6: Enforce all thresholds in strict mode**

Replace the single `minCoveragePercentage` with `coverage: CoverageMetrics`, add `strict: boolean` to `MonitorConfig`, and export both `MonitorConfig` and `QualityMonitor`. Convert every result from `compareCoverage()` into an error violation. In strict mode, duplication and type-coverage threshold breaches are also errors. Keep report-only mode warnings, but collection errors always throw.

Set:

```ts
strict: process.argv.includes('--strict');
```

and change the script:

```json
"quality:monitor:ci": "tsx tools/quality-monitor.ts --strict"
```

- [ ] **Step 7: Remove duplicate class methods**

Delete the second copies of `sendAlerts`, `generateRecommendations`, `saveAlertLog`, and `shouldBlockBuild` currently beginning after the first `saveHistory()` implementation. Keep one implementation of each method and update it for the new complexity/coverage types.

- [ ] **Step 8: Verify focused failure and success paths**

```powershell
npx vitest run tests/unit/quality-measurements.test.ts tests/unit/quality-monitor.test.ts
npm run test:coverage
npm run quality:monitor:ci
```

Expected: unit tests pass; coverage meets all four thresholds; strict monitor exits 0 with generated, parsed ESLint/jscpd/coverage/type data.

- [ ] **Step 9: Commit quality monitor hardening**

```powershell
git add tools/quality-monitor.ts tools/quality/measurements.ts tests/unit/quality-monitor.test.ts package.json
git commit -m "fix: make quality monitoring fail closed"
```

### Task 4: Deduplicate scanner clone findings and add a medium gate

**Files:**

- Modify: `tools/tech-debt-scanner.ts`
- Create: `tests/unit/tech-debt-scanner.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write scanner regression tests**

Export `dedupeDuplicateCandidates` and test overlapping windows separately from distinct clone groups:

```ts
import { describe, expect, it } from 'vitest';
import { dedupeDuplicateCandidates, shouldFailOnSeverity } from '../../tools/tech-debt-scanner';

describe('duplicate clone candidate deduplication', () => {
  it('collapses shifted windows from one clone group', () => {
    const groups = dedupeDuplicateCandidates([
      { occurrences: [10, 50], blockLines: 10, preview: 'a' },
      { occurrences: [11, 51], blockLines: 10, preview: 'b' },
      { occurrences: [12, 52], blockLines: 10, preview: 'c' },
    ]);
    expect(groups).toEqual([{ occurrences: [10, 50], blockLines: 12, preview: 'a' }]);
  });

  it('keeps non-overlapping clone groups', () => {
    const groups = dedupeDuplicateCandidates([
      { occurrences: [10, 50], blockLines: 10, preview: 'a' },
      { occurrences: [30, 90], blockLines: 10, preview: 'b' },
    ]);
    expect(groups).toHaveLength(2);
  });

  it('fails at the selected severity floor', () => {
    const counts = { low: 3, medium: 1, high: 0, critical: 0 };
    expect(shouldFailOnSeverity(counts, 'medium')).toBe(true);
    expect(shouldFailOnSeverity(counts, 'high')).toBe(false);
  });
});
```

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run tests/unit/tech-debt-scanner.test.ts
```

Expected: FAIL because the helper is not exported.

- [ ] **Step 3: Implement overlap deduplication**

Introduce:

```ts
export interface DuplicateCandidate {
  occurrences: number[];
  blockLines: number;
  preview: string;
}

function sameCloneWindow(left: DuplicateCandidate, right: DuplicateCandidate): boolean {
  return (
    left.occurrences.length === right.occurrences.length &&
    left.occurrences.every(
      (line, index) =>
        Math.abs(line - right.occurrences[index]) < Math.min(left.blockLines, right.blockLines)
    )
  );
}

export function dedupeDuplicateCandidates(candidates: DuplicateCandidate[]): DuplicateCandidate[] {
  const groups: DuplicateCandidate[] = [];
  for (const candidate of candidates.sort((a, b) => a.occurrences[0] - b.occurrences[0])) {
    const existing = groups.find(group => sameCloneWindow(group, candidate));
    if (!existing) {
      groups.push({ ...candidate, occurrences: [...candidate.occurrences] });
      continue;
    }
    const extension = candidate.occurrences[0] - existing.occurrences[0];
    existing.blockLines = Math.max(existing.blockLines, extension + candidate.blockLines);
  }
  return groups;
}
```

Have `scanDuplicateCode()` collect candidates, deduplicate them, and emit one issue per returned group.

- [ ] **Step 4: Add an explicit severity gate**

Export `Severity` and add the pure gate helper:

```ts
const SEVERITY_RANK: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export function shouldFailOnSeverity(
  counts: Record<Severity, number>,
  threshold: Severity
): boolean {
  return (Object.keys(counts) as Severity[]).some(
    severity => SEVERITY_RANK[severity] >= SEVERITY_RANK[threshold] && counts[severity] > 0
  );
}
```

Parse `--fail-on medium|high|critical`, default to `high` for the existing scan command, reject any other value, and set a non-zero exit code when `shouldFailOnSeverity(report.summary.bySeverity, threshold)` is true. Add:

```json
"tech-debt:gate": "tsx tools/tech-debt-scanner.ts --fail-on medium"
```

- [ ] **Step 5: Verify GREEN and commit**

```powershell
npx vitest run tests/unit/tech-debt-scanner.test.ts
npm run tech-debt:gate
git add tools/tech-debt-scanner.ts tests/unit/tech-debt-scanner.test.ts package.json
git commit -m "fix: deduplicate scanner clone findings"
```

Expected: helper tests pass; scanner count drops because shifted windows collapse.

### Task 5: Remove the remaining real medium findings

**Files:**

- Modify: `src/modules/app_center/views/playground/deep-chat/renderers.test.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/index.test.ts`
- Modify: `src/modules/app_center/views/keyword_hunter/services/snapshotService.ts`
- Modify: `src/modules/app_center/views/master_analysis/services/historyService.ts`
- Modify: `src/modules/app_center/workflowDefinitions.ts`
- Verify: `tests/unit/keywordHunterSnapshotService.test.ts`
- Verify: `tests/unit/historyService.test.ts`
- Verify: `tests/unit/app-center-workflow-definition.test.ts`
- Verify: `tests/unit/app-center-workspace-context.test.ts`
- Verify: `tests/unit/app-center-artifact-resume.test.ts`

- [ ] **Step 1: Replace the explicit test `any`**

```ts
import type { DeepChatThreadStore } from './types';

function makeStore(): DeepChatThreadStore {
  return {
    activeThreadId: 'thread-1',
    threads: [
      {
        id: 'thread-1',
        title: 'First thread',
        messages: [],
        draftText: '',
        createdAt: 1000,
        updatedAt: 2000,
      },
      {
        id: 'thread-2',
        title: 'Second thread',
        messages: [],
        draftText: '',
        createdAt: 1500,
        updatedAt: 1500,
      },
    ],
  };
}
```

Keep the current assertions; replace the loose return type and its explanatory comment with this typed fixture.

- [ ] **Step 2: Share the two compliance-review constants**

At module scope:

```ts
const COMPLIANCE_REVIEW_POINTS = ['高危词', '品牌与侵权', '产品合规', 'GPSR'] as const;
const COMPLIANCE_REVIEW_ROUTE_IDS = [
  'sops_restricted_words',
  'sops_brand_infringement',
  'sops_product_compliance',
  'sops_eu_gpsr_compliance',
] as const satisfies readonly SopsRouteId[];
```

Use spread copies in both workflow step objects so consumers cannot mutate the constants:

```ts
reviewPoints: [...COMPLIANCE_REVIEW_POINTS],
complianceRouteIds: [...COMPLIANCE_REVIEW_ROUTE_IDS],
```

- [ ] **Step 3: Share snapshot restoration finalization**

Add:

```ts
function restoreResolvedSnapshot(
  snapshot: KeywordHunterSnapshot | null
): KeywordHunterSnapshot | null {
  if (!snapshot) return null;
  restoreSnapshotToState(snapshot);
  return snapshot;
}
```

Make both `restore()` and `restoreAsync()` resolve their sync/async source and delegate to this helper.

- [ ] **Step 4: Share history deletion finalization**

Add a helper that only updates cache/state after persistence succeeds:

```ts
function finishHistoryDeletion(nextHistory: HistoryItem[], id: HistoryItem['id']): true {
  historyCache = nextHistory;
  clearCurrentSnapshotStateIfMatches(id);
  return true;
}

function createHistoryDeleteError(): SystemError {
  return new SystemError(
    '删除历史记录失败：本地存储空间不足，请导出备份后清理缓存',
    'HISTORY_003',
    { module: 'historyService', action: 'delete' }
  );
}
```

In both sync and async delete methods, replace the repeated throw with `throw createHistoryDeleteError();` and replace the final cache/state/return block with `return finishHistoryDeletion(nextHistory, id);`. Keep the sync and async storage calls separate.

- [ ] **Step 5: Share history mutation refresh**

```ts
function refreshHistoryArtifactsAfterUpdate(id: HistoryItem['id'], updated: boolean): boolean {
  if (updated) refreshAppCenterArtifactsForHistoryId(id);
  return updated;
}
```

Use it for sync and async Prompt-result updates.

- [ ] **Step 6: Share repeated Deep Chat expectations**

In `index.test.ts`, define after `importDeepChat`:

```ts
type DeepChatMocks = Awaited<ReturnType<typeof importDeepChat>>['mocks'];

function expectPersistedThread(
  mocks: DeepChatMocks,
  expectedThread: Record<string, unknown>
): void {
  expect(mocks.localDataStore.set).toHaveBeenLastCalledWith(
    'user:playground_deep_chat_threads_v1',
    expect.objectContaining({
      threads: expect.arrayContaining([expect.objectContaining(expectedThread)]),
    }),
    'user-data'
  );
}

function expectSelectedPrompt(container: HTMLElement, text: string, pressed: boolean): void {
  const prompt = [
    ...container.querySelectorAll<HTMLButtonElement>('[data-use-prompt-draft-id]'),
  ].find(item => item.textContent?.includes(text));
  expect(prompt, `Prompt not found: ${text}`).toBeDefined();
  expect(prompt?.getAttribute('aria-pressed')).toBe(String(pressed));
  if (pressed) {
    expect(container.querySelector('.deep-chat-prompt-item.is-selected')?.textContent).toContain(
      text
    );
  }
}
```

Replace only the repeated persistence expectation blocks and selected-prompt assertion pairs with these helpers. Preserve the explicit `is-selected` null assertion when no prompt should be selected; do not combine tests or weaken assertions.

- [ ] **Step 7: Run focused behavior tests**

```powershell
npx vitest run src/modules/app_center/views/playground/deep-chat/renderers.test.ts src/modules/app_center/views/playground/deep-chat/index.test.ts tests/unit/keywordHunterSnapshotService.test.ts tests/unit/historyService.test.ts tests/unit/app-center-workflow-definition.test.ts tests/unit/app-center-workspace-context.test.ts tests/unit/app-center-artifact-resume.test.ts
```

Expected: all selected tests pass with unchanged behavior.

- [ ] **Step 8: Run the debt gate**

```powershell
npm run tech-debt:gate
```

Expected: exit 0 with 0 critical, 0 high, and 0 medium actionable findings.

- [ ] **Step 9: Commit real debt cleanup**

```powershell
git add src/modules/app_center/views/playground/deep-chat/renderers.test.ts src/modules/app_center/views/playground/deep-chat/index.test.ts src/modules/app_center/views/keyword_hunter/services/snapshotService.ts src/modules/app_center/views/master_analysis/services/historyService.ts src/modules/app_center/workflowDefinitions.ts
git commit -m "refactor: close actionable medium debt"
```

### Task 6: Apply safe dependency updates and document major deferrals

**Files:**

- Modify: `package-lock.json`
- Modify only if npm updates declared compatible ranges: `package.json`
- Modify: `docs/TECH_DEBT_AUDIT.md`

- [ ] **Step 1: Capture the pre-update wanted set**

```powershell
npm outdated --json | Set-Content -Encoding utf8 tests/quality/npm-outdated-before.json
```

Expected: ignored evidence file lists current/wanted/latest versions; non-zero npm exit is acceptable for this inventory command only.

- [ ] **Step 2: Update within declared major ranges**

```powershell
npm update
```

Do not use `--force`, do not change major ranges, and keep `flag-icons` pinned unless its declared exact version is intentionally changed in a separate migration.

- [ ] **Step 3: Verify current equals wanted**

```powershell
npm outdated --json | Set-Content -Encoding utf8 tests/quality/npm-outdated-after.json
```

Inspect the ignored JSON: every entry may still have a newer `latest`, but `current` must equal `wanted`.

- [ ] **Step 4: Record deferred breaking migrations**

In `docs/TECH_DEBT_AUDIT.md`, add a release-hardening section listing Sentry 7→10, ESLint 8→10, Tailwind 3→4, TypeScript 5→7, jsdom 23→29, and any other remaining `latest` major gap. State that each needs a separate migration plan and full gate, and that the current audit is zero-vulnerability.

- [ ] **Step 5: Verify dependencies and commit**

```powershell
npm audit --audit-level=high
npm run type-check
npm run test:coverage
npm run build:app
git add package.json package-lock.json docs/TECH_DEBT_AUDIT.md
git commit -m "chore: update compatible dependencies"
```

Expected: audit reports zero vulnerabilities; checks pass; commit contains no generated reports.

### Task 7: Plan-level verification

**Files:**

- No additional files

- [ ] **Step 1: Run strict quality gates**

```powershell
npm run ci:security
npm run ci:quality
npm run test:coverage
npm run quality:monitor:ci
npm run tech-debt:gate
```

Expected: all commands exit 0; coverage meets 82/80/82/65; scanner has no medium-or-higher actionable findings.

- [ ] **Step 2: Check formatting and worktree**

```powershell
npm run format:check
git status --short
```

Expected: formatting passes and the worktree is clean.
