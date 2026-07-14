# Browser Isolation and Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run release smoke against `dist`, restore normal browser security, make functional E2E complete deterministically, and replace repeated Lighthouse work with an isolated median-based performance gate.

**Architecture:** The general Playwright config remains available for development. Dedicated release/performance configs use fixed built-artifact servers, and the release config selects either smoke or grouped functional specs without rebuilding `dist`. A stable `data-current-route` attribute supplies route identity without coupling smoke tests to incidental page text.

**Tech Stack:** Playwright, Chromium, Vite preview, Lighthouse, TypeScript, Vitest

---

## File map

- Modify `config/playwright.config.ts`: remove unsafe Chromium arguments and correctness retries.
- Create `config/playwright.release.config.ts`: built-artifact config with separate smoke and functional-suite selection.
- Create `config/playwright.performance.config.ts`: one-worker, 10-minute Lighthouse config.
- Modify `src/common/ui/navigation.ts` and its unit test: expose stable current route metadata.
- Modify `tests/e2e/release-smoke.spec.ts`: canonical Hash URLs, exact route IDs, asset response checks.
- Modify `tests/e2e/pages/ScraperPage.ts` and `tests/e2e/npi-tracker.spec.ts`: deterministic defects.
- Create `tests/unit/scraper-page-object.test.ts`: Playwright argument regression.
- Create `scripts/test/run-functional-e2e.ts` and `tests/unit/functional-e2e-groups.test.ts`: complete grouped inventory.
- Create `tests/performance/lighthouse-gate.ts`, `tests/performance/release-performance-gate.test.ts`, and `tests/unit/lighthouse-gate.test.ts`.
- Delete seven redundant Lighthouse test files named in Task 5.
- Modify `package.json`: dedicated smoke, functional, and performance commands.

### Task 1: Restore production-equivalent browser configuration

**Files:**

- Modify: `config/playwright.config.ts`
- Create: `config/playwright.release.config.ts`
- Create: `config/playwright.performance.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Add a configuration contract test**

Create `tests/unit/playwright-config-contract.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Playwright release security contract', () => {
  it('does not disable browser security or site isolation', () => {
    const source = readFileSync('config/playwright.config.ts', 'utf8');
    expect(source).not.toContain('--disable-web-security');
    expect(source).not.toContain('IsolateOrigins');
    expect(source).not.toContain('site-per-process');
  });

  it('defines separate built-artifact release and performance configs', () => {
    const release = readFileSync('config/playwright.release.config.ts', 'utf8');
    const performance = readFileSync('config/playwright.performance.config.ts', 'utf8');
    expect(release).toContain('vite preview');
    expect(release).toContain('PLAYWRIGHT_RELEASE_SUITE');
    expect(release).toContain('5 * 60 * 1000');
    expect(performance).toContain('10 * 60 * 1000');
    expect(performance).toContain('--remote-debugging-port=9222');
  });
});
```

- [ ] **Step 2: Run the test to verify RED**

```powershell
npx vitest run tests/unit/playwright-config-contract.test.ts
```

Expected: FAIL because unsafe arguments remain and dedicated configs do not exist.

- [ ] **Step 3: Remove unsafe global Chromium arguments and retries**

In `config/playwright.config.ts`, make the Chromium project:

```ts
{
  name: 'chromium',
  use: { ...devices['Desktop Chrome'] },
}
```

Set correctness retries to zero:

```ts
retries: 0,
```

Do not change the `workers` or `reporter` properties; this step's diff in `config/playwright.config.ts` is limited to `retries` and the Chromium project shown above.

- [ ] **Step 4: Create the release config**

```ts
import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const functionalSuite = process.env.PLAYWRIGHT_RELEASE_SUITE === 'functional';
const functionalGroup = process.env.PLAYWRIGHT_FUNCTIONAL_GROUP ?? 'unknown';

export default defineConfig({
  testDir: resolve(process.cwd(), 'tests/e2e'),
  testMatch: functionalSuite ? '*.spec.ts' : 'release-smoke.spec.ts',
  testIgnore: functionalSuite ? 'release-smoke.spec.ts' : [],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  globalTimeout: functionalSuite ? 10 * 60 * 1000 : 5 * 60 * 1000,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile: functionalSuite
          ? `tests/playwright-report/functional-${functionalGroup}.json`
          : 'tests/playwright-report/release-smoke.json',
      },
    ],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
```

- [ ] **Step 5: Create the performance config**

```ts
import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: resolve(process.cwd(), 'tests/performance'),
  testMatch: 'release-performance-gate.test.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 210_000,
  globalTimeout: 10 * 60 * 1000,
  reporter: [['list'], ['json', { outputFile: 'tests/playwright-report/performance-gate.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-performance',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--remote-debugging-port=9222'] },
      },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
```

- [ ] **Step 6: Add dedicated scripts**

```json
"test:e2e:smoke:release": "playwright test --config=config/playwright.release.config.ts",
"test:performance:gate": "playwright test --config=config/playwright.performance.config.ts"
```

- [ ] **Step 7: Verify GREEN and commit**

```powershell
npx vitest run tests/unit/playwright-config-contract.test.ts
npx playwright test --list --config=config/playwright.release.config.ts
git add config/playwright.config.ts config/playwright.release.config.ts config/playwright.performance.config.ts tests/unit/playwright-config-contract.test.ts package.json
git commit -m "test: isolate release browser configs"
```

Expected: contract passes; with no suite environment variable, the release config lists only `release-smoke.spec.ts`.

### Task 2: Give release smoke exact route and asset evidence

**Files:**

- Modify: `tests/unit/navigationPageEnterAnimation.test.ts`
- Modify: `src/common/ui/navigation.ts`
- Modify: `tests/e2e/release-smoke.spec.ts`

- [ ] **Step 1: Add route metadata regression assertions**

After existing `updateUIForRoute()` calls, assert:

```ts
expect(document.getElementById('main-content')?.dataset.currentRoute).toBe('home');
```

and in the SOPS test:

```ts
expect(document.getElementById('main-content')?.dataset.currentRoute).toBe('sops_overview');
```

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run tests/unit/navigationPageEnterAnimation.test.ts
```

Expected: FAIL because `data-current-route` is absent.

- [ ] **Step 3: Set route metadata only after panel selection**

In `updateUIForRoute()`, immediately after `showRoutePanel(targetPanelId)`:

```ts
const mainContent = getEl('main-content');
if (mainContent) {
  mainContent.dataset.currentRoute = cleanTab;
}
```

- [ ] **Step 4: Replace the smoke route table**

Use:

```ts
const CORE_ROUTES = [
  { label: 'Home', path: '/#/home', routeId: 'home' },
  { label: 'SOPs', path: '/#/sops', routeId: 'sops_overview' },
  { label: 'App Center', path: '/#/app-center', routeId: 'app_center_overview' },
  { label: 'Scraper', path: '/#/app-center/master-analysis/scraper', routeId: 'scraper' },
  {
    label: 'AI Analysis',
    path: '/#/app-center/master-analysis/ai-analysis',
    routeId: 'ai_analysis',
  },
  { label: 'Promptlab', path: '/#/app-center/master-analysis/promptlab', routeId: 'promptlab' },
  {
    label: 'Deep Chat',
    path: '/#/app-center/playground/deep-chat',
    routeId: 'playground_deep_chat',
  },
  {
    label: 'Keyword Hunter Input',
    path: '/#/app-center/keyword-hunter/input',
    routeId: 'keyword_hunter_input',
  },
  {
    label: 'PPC Search Terms',
    path: '/#/app-center/ppc-tools/ppc-search-terms',
    routeId: 'ppc_search_terms',
  },
  { label: 'AMZ Hub', path: '/#/amz-hub', routeId: 'amz_hub_overview' },
  { label: 'More', path: '/#/more', routeId: 'more_overview' },
] as const;
```

Use the same objects for overflow tests instead of maintaining a duplicate table.

- [ ] **Step 5: Add exact route and asset checks**

Before navigation, collect JS/CSS responses:

```ts
const assetResponses: Array<{ url: string; status: number; contentType: string }> = [];
page.on('response', response => {
  const pathname = new URL(response.url()).pathname;
  if (/\.(?:js|mjs|css)$/.test(pathname)) {
    assetResponses.push({
      url: response.url(),
      status: response.status(),
      contentType: response.headers()['content-type'] ?? '',
    });
  }
});
```

After navigation:

```ts
expect(new URL(page.url()).hash).toBe(route.path.slice(1));
await expect(page.locator('#main-content')).toHaveAttribute('data-current-route', route.routeId);
expect(assetResponses.length).toBeGreaterThan(0);
for (const asset of assetResponses) {
  expect(asset.status, asset.url).toBeLessThan(400);
  if (/\.css(?:$|\?)/.test(asset.url)) expect(asset.contentType).toContain('text/css');
  else expect(asset.contentType).toMatch(/javascript/);
}
```

Remove the swallowed `networkidle` timeout in `openRoute`; route mocks must allow it to complete or the test fails.

- [ ] **Step 6: Verify unit and built-artifact smoke**

```powershell
npx vitest run tests/unit/navigationPageEnterAnimation.test.ts
npm run build:app
npm run test:e2e:smoke:release
```

Expected: unit test and all release-smoke tests pass against port 4173.

- [ ] **Step 7: Commit route-specific smoke**

```powershell
git add src/common/ui/navigation.ts tests/unit/navigationPageEnterAnimation.test.ts tests/e2e/release-smoke.spec.ts
git commit -m "test: verify exact release routes"
```

### Task 3: Fix the two deterministic E2E defects

**Files:**

- Create: `tests/unit/scraper-page-object.test.ts`
- Modify: `tests/e2e/pages/ScraperPage.ts`
- Modify: `tests/e2e/npi-tracker.spec.ts`

- [ ] **Step 1: Add the `waitForFunction` argument regression test**

```ts
import type { Page } from '@playwright/test';
import { describe, expect, it, vi } from 'vitest';
import { ScraperPage } from '../e2e/pages/ScraperPage';

describe('ScraperPage wait contract', () => {
  it('passes timeout as the third waitForFunction argument', async () => {
    const waitForFunction = vi.fn().mockResolvedValue(undefined);
    const waitForTimeout = vi.fn().mockResolvedValue(undefined);
    const page = { waitForFunction, waitForTimeout } as unknown as Page;
    await new ScraperPage(page).waitForScrapeComplete(12_345);
    expect(waitForFunction).toHaveBeenCalledWith(expect.any(Function), undefined, {
      timeout: 12_345,
    });
  });
});
```

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run tests/unit/scraper-page-object.test.ts
```

Expected: FAIL because `{ timeout }` is currently the second argument.

- [ ] **Step 3: Fix the Playwright call**

```ts
await this.page.waitForFunction(
  () => {
    const element = document.querySelector('[x-data="scraperPanel"]') as any;
    const data = (window as any).Alpine?.$data?.(element) ?? element?.__x?.$data;
    if (!data) return false;

    const tasks = data.tasks || [];
    if (tasks.length === 0) return false;

    return tasks.every((task: any) => task.status === 'success' || task.status === 'failed');
  },
  undefined,
  { timeout }
);
```

- [ ] **Step 4: Make the NPI panel locator unique**

Replace `page.locator('#next-step-modal > div')` with:

```ts
const dialogPanel = page.locator('#next-step-modal [slot="body"]');
await expect(dialogPanel).toHaveCount(1);
const dialogBox = await dialogPanel.boundingBox();
```

- [ ] **Step 5: Verify focused tests**

```powershell
npx vitest run tests/unit/scraper-page-object.test.ts
npx playwright test tests/e2e/npi-tracker.spec.ts --project=chromium --grep="滚动表格后"
npx playwright test tests/e2e/scraper.spec.ts --project=chromium --grep="开始采集并显示进度"
```

Expected: all selected tests pass without retry.

- [ ] **Step 6: Commit deterministic fixes**

```powershell
git add tests/unit/scraper-page-object.test.ts tests/e2e/pages/ScraperPage.ts tests/e2e/npi-tracker.spec.ts
git commit -m "fix: correct deterministic e2e waits"
```

### Task 4: Run every functional E2E group independently

**Files:**

- Create: `scripts/test/run-functional-e2e.ts`
- Create: `tests/unit/functional-e2e-groups.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the complete-inventory test**

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FUNCTIONAL_E2E_GROUPS,
  isFunctionalReportComplete,
} from '../../scripts/test/run-functional-e2e';

describe('functional E2E groups', () => {
  it('lists every non-release, non-performance spec exactly once', () => {
    const discovered = readdirSync('tests/e2e')
      .filter(name => name.endsWith('.spec.ts'))
      .filter(name => name !== 'release-smoke.spec.ts')
      .filter(name => !name.endsWith('-performance.spec.ts'))
      .map(name => `tests/e2e/${name}`)
      .sort();
    const listed = FUNCTIONAL_E2E_GROUPS.flatMap(group => group.files).sort();
    expect(listed).toEqual(discovered);
    expect(new Set(listed).size).toBe(listed.length);
  });

  it('runs every functional group through the built-artifact config', () => {
    const source = readFileSync('scripts/test/run-functional-e2e.ts', 'utf8');
    expect(source).toContain('--config=config/playwright.release.config.ts');
    expect(source).toContain("PLAYWRIGHT_RELEASE_SUITE: 'functional'");
  });

  it('rejects zero-test, unexpected, and skipped reports', () => {
    expect(
      isFunctionalReportComplete({
        stats: { expected: 12, unexpected: 0, skipped: 0 },
      })
    ).toBe(true);
    expect(
      isFunctionalReportComplete({
        stats: { expected: 0, unexpected: 0, skipped: 0 },
      })
    ).toBe(false);
    expect(
      isFunctionalReportComplete({
        stats: { expected: 11, unexpected: 1, skipped: 0 },
      })
    ).toBe(false);
    expect(
      isFunctionalReportComplete({
        stats: { expected: 11, unexpected: 0, skipped: 1 },
      })
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run tests/unit/functional-e2e-groups.test.ts
```

Expected: FAIL because the grouped runner does not exist.

- [ ] **Step 3: Create explicit groups and a continue-after-failure runner**

```ts
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface FunctionalJsonReport {
  stats?: {
    expected?: number;
    unexpected?: number;
    skipped?: number;
  };
}

export function isFunctionalReportComplete(report: FunctionalJsonReport): boolean {
  return (
    typeof report.stats?.expected === 'number' &&
    report.stats.expected > 0 &&
    report.stats.unexpected === 0 &&
    report.stats.skipped === 0
  );
}

export const FUNCTIONAL_E2E_GROUPS = [
  {
    name: 'analysis',
    files: [
      'tests/e2e/ai-analysis-confidence.spec.ts',
      'tests/e2e/ai-analysis.spec.ts',
      'tests/e2e/promptlab-dna-extraction.spec.ts',
      'tests/e2e/promptlab.spec.ts',
      'tests/e2e/scraper.spec.ts',
    ],
  },
  {
    name: 'deep-chat',
    files: ['tests/e2e/deep-chat-prompt-preview.spec.ts', 'tests/e2e/deep-chat-send.spec.ts'],
  },
  {
    name: 'keyword-hunter',
    files: [
      'tests/e2e/keyword-hunter-analysis.spec.ts',
      'tests/e2e/keyword-hunter-input.spec.ts',
      'tests/e2e/keyword-hunter-process.spec.ts',
    ],
  },
  {
    name: 'operations',
    files: ['tests/e2e/npi-tracker.spec.ts', 'tests/e2e/restricted-words.spec.ts'],
  },
] as const;

export function runFunctionalGroups(): number {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const failed: string[] = [];
  for (const group of FUNCTIONAL_E2E_GROUPS) {
    const result = spawnSync(
      command,
      [
        'playwright',
        'test',
        ...group.files,
        '--config=config/playwright.release.config.ts',
        '--project=chromium',
        '--workers=1',
      ],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          PLAYWRIGHT_RELEASE_SUITE: 'functional',
          PLAYWRIGHT_FUNCTIONAL_GROUP: group.name,
        },
      }
    );
    let complete = false;
    try {
      const report = JSON.parse(
        readFileSync(`tests/playwright-report/functional-${group.name}.json`, 'utf8')
      ) as FunctionalJsonReport;
      complete = isFunctionalReportComplete(report);
    } catch {
      complete = false;
    }
    if (result.status !== 0 || !complete) failed.push(group.name);
  }
  if (failed.length > 0) {
    console.error(`Functional E2E groups failed: ${failed.join(', ')}`);
    return 1;
  }
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exit(runFunctionalGroups());
}
```

- [ ] **Step 4: Add the script and verify inventory GREEN**

```json
"test:e2e:functional": "tsx scripts/test/run-functional-e2e.ts"
```

Run:

```powershell
npx vitest run tests/unit/functional-e2e-groups.test.ts
```

Expected: inventory passes with every selected functional spec listed once.

- [ ] **Step 5: Run all functional groups**

```powershell
npm run test:e2e:functional
```

Expected: every group runs against the existing `dist` even if an earlier group fails, each group writes a separate JSON report, and final exit is 0 only when all groups have zero failures, interruptions, and unexpected skips.

- [ ] **Step 6: Commit the functional runner**

```powershell
git add scripts/test/run-functional-e2e.ts tests/unit/functional-e2e-groups.test.ts package.json
git commit -m "test: isolate functional e2e groups"
```

### Task 5: Consolidate Lighthouse into one median-based gate

**Files:**

- Create: `tests/performance/lighthouse-gate.ts`
- Create: `tests/unit/lighthouse-gate.test.ts`
- Create: `tests/performance/release-performance-gate.test.ts`
- Delete: `tests/performance/ai-analysis-performance.test.ts`
- Delete: `tests/performance/promptlab-performance.test.ts`
- Delete: `tests/performance/scraper-performance.test.ts`
- Delete: `tests/performance/home-performance.test.ts`
- Delete: `tests/performance/lighthouse.test.ts`
- Delete: `tests/performance/verify-cls-all-pages.test.ts`
- Delete: `tests/performance/verify-performance-score-90.test.ts`

- [ ] **Step 1: Write median and required-metric tests**

```ts
import { describe, expect, it } from 'vitest';
import { extractMetrics, median } from '../performance/lighthouse-gate';

describe('Lighthouse gate helpers', () => {
  it('uses the sorted middle value', () => {
    expect(median([300, 100, 200])).toBe(200);
  });

  it('rejects a missing required audit instead of reading zero', () => {
    expect(() => extractMetrics({ categories: {}, audits: {} })).toThrow(
      'missing Lighthouse category: performance'
    );
  });
});
```

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run tests/unit/lighthouse-gate.test.ts
```

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement typed extraction and thresholds**

```ts
export interface LighthouseMetrics {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  fcp: number;
  lcp: number;
  cls: number;
  tbt: number;
}

export interface LighthouseReport {
  categories?: Record<string, { score?: unknown }>;
  audits?: Record<string, { numericValue?: unknown }>;
}

export function median(values: number[]): number {
  if (values.length === 0) throw new Error('median requires at least one value');
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function category(report: LighthouseReport, name: string): number {
  const score = report.categories?.[name]?.score;
  if (typeof score !== 'number') throw new Error(`missing Lighthouse category: ${name}`);
  return score * 100;
}

function audit(report: LighthouseReport, name: string): number {
  const value = report.audits?.[name]?.numericValue;
  if (typeof value !== 'number') throw new Error(`missing Lighthouse audit: ${name}`);
  return value;
}

export function extractMetrics(report: LighthouseReport): LighthouseMetrics {
  return {
    performance: category(report, 'performance'),
    accessibility: category(report, 'accessibility'),
    bestPractices: category(report, 'best-practices'),
    seo: category(report, 'seo'),
    fcp: audit(report, 'first-contentful-paint'),
    lcp: audit(report, 'largest-contentful-paint'),
    cls: audit(report, 'cumulative-layout-shift'),
    tbt: audit(report, 'total-blocking-time'),
  };
}
```

- [ ] **Step 4: Create the four-route Playwright gate**

Use these exact canonical routes and current thresholds:

```ts
const PAGES = [
  { name: 'home', path: '/#/home', performance: 90, fcp: 1500, lcp: 2500, cls: 0.1, tbt: 300 },
  {
    name: 'scraper',
    path: '/#/app-center/master-analysis/scraper',
    performance: 85,
    fcp: 1800,
    lcp: 2800,
    cls: 0.1,
    tbt: 500,
  },
  {
    name: 'ai-analysis',
    path: '/#/app-center/master-analysis/ai-analysis',
    performance: 85,
    fcp: 1800,
    lcp: 2800,
    cls: 0.1,
    tbt: 500,
  },
  {
    name: 'promptlab',
    path: '/#/app-center/master-analysis/promptlab',
    performance: 85,
    fcp: 1800,
    lcp: 2800,
    cls: 0.1,
    tbt: 500,
  },
] as const;
```

In `beforeAll`, open `/#/home` once to warm the preview server. For each page, register one test that:

1. installs console, page-error, and failed-response collectors;
2. runs exactly three sequential `playAudit({ page, port: 9222, config: LIGHTHOUSE_CONFIG })` calls;
3. saves the three raw reports under `tests/performance/lighthouse-reports/`;
4. extracts metrics with `extractMetrics()`;
5. asserts accessibility, best-practices, and SEO medians are at least 90;
6. asserts performance median and FCP/LCP/CLS/TBT medians against the route thresholds;
7. asserts all error collectors are empty.

The core assertion block is:

```ts
const metrics = reports.map(extractMetrics);
expect(median(metrics.map(item => item.performance))).toBeGreaterThanOrEqual(
  pageConfig.performance
);
expect(median(metrics.map(item => item.accessibility))).toBeGreaterThanOrEqual(90);
expect(median(metrics.map(item => item.bestPractices))).toBeGreaterThanOrEqual(90);
expect(median(metrics.map(item => item.seo))).toBeGreaterThanOrEqual(90);
expect(median(metrics.map(item => item.fcp))).toBeLessThan(pageConfig.fcp);
expect(median(metrics.map(item => item.lcp))).toBeLessThan(pageConfig.lcp);
expect(median(metrics.map(item => item.cls))).toBeLessThan(pageConfig.cls);
expect(median(metrics.map(item => item.tbt))).toBeLessThan(pageConfig.tbt);
expect(runtimeErrors).toEqual([]);
```

- [ ] **Step 5: Delete duplicate audit files**

Delete all seven files listed in this task. Do not delete `tests/performance/SafeRenderer.perf.test.ts`, `generate-performance-report.ts`, or `tests/config/lighthouserc.js`.

- [ ] **Step 6: Verify unit and performance GREEN**

```powershell
npx vitest run tests/unit/lighthouse-gate.test.ts
npm run build:app
npm run test:performance:gate
```

Expected: helper tests pass; four performance tests each produce three reports and finish within 10 minutes.

- [ ] **Step 7: Run isolated Playwright performance specs**

```powershell
npx playwright test tests/e2e/ai-analysis-performance.spec.ts --project=chromium --workers=1
npx playwright test tests/e2e/promptlab-performance.spec.ts --project=chromium --workers=1
npx playwright test tests/e2e/scraper-performance.spec.ts --project=chromium --workers=1
```

Expected: each file passes alone. Keep these functional-performance specs outside `test:e2e:functional` and outside the Lighthouse process.

- [ ] **Step 8: Commit performance consolidation**

```powershell
git add tests/performance tests/unit/lighthouse-gate.test.ts
git commit -m "test: consolidate performance gate"
```

### Task 6: Plan-level browser verification

**Files:**

- No additional files

- [ ] **Step 1: Run built release smoke**

```powershell
npm run build:app
npm run test:e2e:smoke:release
```

Expected: all release routes have exact Hash and `data-current-route` evidence; no asset, console, or page errors.

- [ ] **Step 2: Run all functional groups**

```powershell
npm run test:e2e:functional
```

Expected: all 12 functional specs execute with zero failures, zero interruptions, and zero unexpected skipped/not-run tests.

- [ ] **Step 3: Run performance gate**

```powershell
npm run test:performance:gate
```

Expected: all four route medians pass within the 10-minute global budget.

- [ ] **Step 4: Run static/type gates and confirm clean scope**

```powershell
npm run type-check:tests
npm run lint:tests
npm run format:check
git status --short
```

Expected: all commands pass and the worktree is clean.
