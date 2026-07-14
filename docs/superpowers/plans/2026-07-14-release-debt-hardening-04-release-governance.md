# Release Orchestration and Production Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compose the prior plans into one fail-fast release-candidate gate, produce inspectable supply-chain artifacts, harden publication semantics, and add a read-only real-preview production gate.

**Architecture:** `run-release-gate.ts` is the only local release orchestrator and invokes existing package scripts without reimplementing their checks. `prepare-release.ts` owns packaging/SBOM/hashes. A separate `production-gate.ts` consumes a real preview URL and writes `production-readiness.json` without changing the hashed release-candidate evidence.

**Tech Stack:** TypeScript, Node child processes/fetch, npm SBOM, Vitest, Playwright, GitHub Actions YAML, Cloudflare Pages, Sentry API

---

## File map

- Create `scripts/release/run-release-gate.ts` and `tests/unit/release-gate.test.ts`: ordered, injectable stage runner.
- Modify `scripts/release/prepare-release.ts` and `tests/unit/prepare-release.test.ts`: archive inspection, SBOM, readiness, complete hashes.
- Create `scripts/release/production-gate.ts` and `tests/unit/production-gate.test.ts`: real preview and monitoring evidence.
- Modify `config/playwright.release.config.ts`: optional external base URL without local web server.
- Modify `package.json`: `release:gate` and `release:production-gate`.
- Modify all `.github/workflows/*.yml`: pinned actions, Node version file, correct release/dry-run behavior.
- Create `tests/unit/workflow-contract.test.ts`: static workflow semantics.
- Create `.github/CODEOWNERS` and `tests/unit/release-governance-contract.test.ts`.
- Modify `README.md`, `docs/DEPLOYMENT.md`, `docs/CI-QUALITY-GATES.md`, `docs/RELEASE_POLICY.md`, and `docs/TECH_DEBT_AUDIT.md`.

### Task 1: Create the single local release-candidate orchestrator

**Files:**

- Create: `scripts/release/run-release-gate.ts`
- Create: `tests/unit/release-gate.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write fail-fast and ordering tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  RELEASE_STAGES,
  runReleaseStages,
  type ReleaseStageRunner,
} from '../../scripts/release/run-release-gate';

describe('release gate orchestration', () => {
  it('keeps the approved stage order', () => {
    expect(RELEASE_STAGES.map(stage => stage.name)).toEqual([
      'security',
      'quality',
      'coverage',
      'quality-monitor',
      'tech-debt',
      'build',
      'artifact-contract',
      'functional-e2e',
      'release-smoke',
      'performance',
      'release-notes',
      'release-package',
    ]);
  });

  it('stops after the first failed stage', () => {
    const runner: ReleaseStageRunner = vi.fn(stage => (stage.name === 'coverage' ? 1 : 0));
    expect(() => runReleaseStages(RELEASE_STAGES, runner)).toThrow(
      'release stage failed: coverage'
    );
    expect(runner).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: Run the test to verify RED**

```powershell
npx vitest run tests/unit/release-gate.test.ts
```

Expected: FAIL because the orchestrator does not exist.

- [ ] **Step 3: Implement the ordered stage runner**

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ReleaseStage {
  name: string;
  script: string;
}

export type ReleaseStageRunner = (stage: ReleaseStage) => number;

export const RELEASE_STAGES: ReleaseStage[] = [
  { name: 'security', script: 'ci:security' },
  { name: 'quality', script: 'ci:quality' },
  { name: 'coverage', script: 'test:coverage' },
  { name: 'quality-monitor', script: 'quality:monitor:ci' },
  { name: 'tech-debt', script: 'tech-debt:gate' },
  { name: 'build', script: 'build:app' },
  { name: 'artifact-contract', script: 'release:artifact-contract' },
  { name: 'functional-e2e', script: 'test:e2e:functional' },
  { name: 'release-smoke', script: 'test:e2e:smoke:release' },
  { name: 'performance', script: 'test:performance:gate' },
  { name: 'release-notes', script: 'release:notes' },
  { name: 'release-package', script: 'release:package' },
];

export function runReleaseStages(stages: ReleaseStage[], runner: ReleaseStageRunner): void {
  for (const stage of stages) {
    if (runner(stage) !== 0) throw new Error(`release stage failed: ${stage.name}`);
  }
}

function npmRunner(stage: ReleaseStage): number {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return spawnSync(npm, ['run', stage.script], { stdio: 'inherit' }).status ?? 1;
}

function writeCandidateReadiness(): void {
  mkdirSync('release-artifacts', { recursive: true });
  writeFileSync(
    'release-artifacts/release-readiness.json',
    `${JSON.stringify(
      {
        schemaVersion: 1,
        releaseCandidate: 'passed',
        production: 'externally_unverified',
        stages: RELEASE_STAGES.slice(0, -1).map(stage => ({ name: stage.name, status: 'passed' })),
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )}\n`
  );
}

export function main(): void {
  const prePackage = RELEASE_STAGES.slice(0, -1);
  runReleaseStages(prePackage, npmRunner);
  writeCandidateReadiness();
  runReleaseStages(RELEASE_STAGES.slice(-1), npmRunner);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
```

- [ ] **Step 4: Add the public gate command**

```json
"release:gate": "tsx scripts/release/run-release-gate.ts"
```

- [ ] **Step 5: Verify GREEN and commit**

```powershell
npx vitest run tests/unit/release-gate.test.ts
git add scripts/release/run-release-gate.ts tests/unit/release-gate.test.ts package.json
git commit -m "build: add single release candidate gate"
```

Expected: ordering/fail-fast tests pass.

### Task 2: Package SBOM, readiness, archive contents, and complete hashes

**Files:**

- Modify: `scripts/release/prepare-release.ts`
- Modify: `tests/unit/prepare-release.test.ts`

- [ ] **Step 1: Add pure packaging contract tests**

Replace the existing `buildReleaseBody` test with:

```ts
describe('buildReleaseBody', () => {
  it('does not preapprove a release candidate and prints the full commit SHA', () => {
    const body = releaseHelpers.buildReleaseBody(
      '3.0.7-rc.2',
      '## [3.0.7-rc.2]\n\n### Fixed\n- item'
    );
    expect(body).toContain('**发布通道：** Release Candidate');
    expect(body).toContain('**环境：** Staging');
    expect(body).toContain('不要默认用于生产');
    expect(body).not.toContain('已批准覆盖生产域');
    expect(body).toMatch(/\*\*Commit：\*\* `(?:[0-9a-f]{40}|[0-9a-f]{64})`/);
  });
});
```

Then append the packaging helper tests:

```ts
const { assertRequiredArchiveEntries, buildSha256Lines } =
  releaseHelpers as typeof releaseHelpers & {
    assertRequiredArchiveEntries(entries: string[]): void;
    buildSha256Lines(entries: Array<{ name: string; digest: string }>): string;
  };

describe('release artifact contract', () => {
  it('requires the static-host deployment files', () => {
    expect(() =>
      assertRequiredArchiveEntries([
        'index.html',
        '404.html',
        '_headers',
        '_redirects',
        'assets/app.js',
      ])
    ).not.toThrow();
    expect(() => assertRequiredArchiveEntries(['index.html'])).toThrow('404.html');
  });

  it('sorts every named release artifact into the checksum manifest', () => {
    expect(
      buildSha256Lines([
        { name: 'sbom.cdx.json', digest: 'bbb' },
        { name: 'build-info.json', digest: 'aaa' },
      ])
    ).toBe('aaa  build-info.json\nbbb  sbom.cdx.json\n');
  });
});
```

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run tests/unit/prepare-release.test.ts
```

Expected: FAIL because the helpers are not exported.

- [ ] **Step 3: Add archive entry and checksum helpers**

```ts
const REQUIRED_ARCHIVE_ENTRIES = ['index.html', '404.html', '_headers', '_redirects'];

export function assertRequiredArchiveEntries(entries: string[]): void {
  const normalized = entries.map(entry => entry.replace(/^\.\//, '').replace(/\\/g, '/'));
  for (const required of REQUIRED_ARCHIVE_ENTRIES) {
    if (!normalized.includes(required)) throw new Error(`archive missing ${required}`);
  }
  if (!normalized.some(entry => entry.startsWith('assets/'))) {
    throw new Error('archive missing assets/');
  }
}

export function buildSha256Lines(entries: Array<{ name: string; digest: string }>): string {
  return `${entries
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(entry => `${entry.digest}  ${entry.name}`)
    .join('\n')}\n`;
}
```

Import `execFileSync` alongside `execSync`. Immediately after `createDistArchive()` returns, inspect the exact archive path before hashing:

```ts
const archiveEntries = execFileSync('tar', ['-tf', archivePath], {
  cwd: ROOT,
  encoding: 'utf8',
})
  .split(/\r?\n/)
  .filter(Boolean);
assertRequiredArchiveEntries(archiveEntries);
```

- [ ] **Step 4: Generate the production dependency SBOM**

Use `execFileSync` with the platform npm executable:

```ts
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const sbomPath = join(ARTIFACTS_DIR, 'sbom.cdx.json');
const sbom = execFileSync(npm, ['sbom', '--omit=dev', '--sbom-format=cyclonedx'], {
  cwd: ROOT,
  encoding: 'utf8',
});
JSON.parse(sbom);
writeFileSync(sbomPath, `${sbom.trim()}\n`, 'utf8');
```

- [ ] **Step 5: Require and hash every release artifact**

Before packaging, require:

```ts
const requiredFiles = [
  join(ARTIFACTS_DIR, 'RELEASE_BODY.md'),
  join(ARTIFACTS_DIR, 'release-readiness.json'),
];
for (const file of requiredFiles) {
  if (!existsSync(file)) throw new Error(`${relative(ROOT, file)} missing`);
}
```

Hash, in addition to the archive and build info:

- `RELEASE_BODY.md`
- `release-readiness.json`
- `sbom.cdx.json`

Use `buildSha256Lines()` to write `SHA256SUMS.txt`.

- [ ] **Step 6: Update release notes evidence and artifact list**

Remove the `productionVerification` special case from `buildReleaseBody()` and use these expressions:

```ts
const environment = isPreRelease(version) ? 'Staging' : 'Production';
const preNote = isPreRelease(version)
  ? '\n> ⚠ 预发布候选，**不要**默认用于生产。GitHub Latest 应仍指向最新 GA。\n'
  : '';
```

Within the returned release-body template, replace the environment and commit lines exactly with:

```text
**环境：** ${environment}${'  '}
**Commit：** `${sha}`
```

Change the artifact bullet in the same template to name the archive, `build-info.json`, `release-readiness.json`, `sbom.cdx.json`, and `SHA256SUMS.txt`. The release-candidate record, not version naming, controls the verdict.

- [ ] **Step 7: Verify unit and real package output**

```powershell
npx vitest run tests/unit/prepare-release.test.ts
npm run build:app
npm run release:artifact-contract
npm run release:notes
New-Item -ItemType Directory -Force release-artifacts | Out-Null
'{"schemaVersion":1,"releaseCandidate":"passed","production":"externally_unverified"}' | Set-Content -Encoding utf8 release-artifacts/release-readiness.json
npm run release:package
Get-Content release-artifacts/SHA256SUMS.txt
```

Expected: package succeeds; checksum file names all five non-checksum artifacts; archive contains `404.html`, `_headers`, `_redirects`, `index.html`, and `assets/`.

- [ ] **Step 8: Commit packaging hardening**

```powershell
git add scripts/release/prepare-release.ts tests/unit/prepare-release.test.ts
git commit -m "build: verify release supply chain artifacts"
```

Do not stage `release-artifacts/`.

### Task 3: Add the read-only production preview gate

**Files:**

- Create: `scripts/release/production-gate.ts`
- Create: `tests/unit/production-gate.test.ts`
- Modify: `config/playwright.release.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Write HTTP and monitoring-mode tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  buildProductionReadiness,
  verifyMonitoringDecision,
  verifyProductionPreview,
} from '../../scripts/release/production-gate';

describe('production preview gate', () => {
  it('requires the clean URL redirect and a real missing-asset 404', async () => {
    const fetch = vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith('/app-center')) {
        return new Response('', { status: 302, headers: { location: '/#/app-center' } });
      }
      return new Response('<h1>404</h1>', {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' },
      });
    });
    const result = await verifyProductionPreview('https://preview.example', fetch);
    expect(result.every(item => item.status === 'passed')).toBe(true);
  });

  it('fails when a missing script is the cached application shell', async () => {
    const fetch = vi.fn(
      async () =>
        new Response('<div id="app"><script src="/assets/app.js"></script></div>', {
          status: 200,
          headers: {
            'content-type': 'text/html',
            'cache-control': 'public, max-age=31536000, immutable',
          },
        })
    );
    const result = await verifyProductionPreview('https://preview.example', fetch);
    expect(result.some(item => item.status === 'failed')).toBe(true);
  });

  it('accepts only a complete monitoring waiver', async () => {
    const complete = await verifyMonitoringDecision({
      MONITORING_MODE: 'waived',
      MONITORING_WAIVER_REASON: 'Approved launch without application monitoring',
      MONITORING_WAIVER_APPROVER: 'earshore',
      MONITORING_WAIVER_APPROVED_AT: '2026-07-14T08:00:00.000Z',
    });
    expect(complete.status).toBe('passed');

    const incomplete = await verifyMonitoringDecision({ MONITORING_MODE: 'waived' });
    expect(incomplete.status).toBe('externally_unverified');
  });

  it('verifies a controlled Sentry event without exposing the token', async () => {
    const request = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer top-secret-token');
      return new Response('{}', { status: 200 });
    });
    const result = await verifyMonitoringDecision(
      {
        MONITORING_MODE: 'verified',
        SENTRY_ORG: 'approved-org',
        SENTRY_PROJECT: 'approved-project',
        SENTRY_EVENT_ID: 'controlled-event',
        SENTRY_AUTH_TOKEN: 'top-secret-token',
      },
      request
    );
    expect(result.status).toBe('passed');
    expect(result.detail).not.toContain('top-secret-token');
  });

  it('never converts externally unverified evidence into production ready', () => {
    const report = buildProductionReadiness([
      { name: 'preview', status: 'passed', detail: 'ok' },
      { name: 'monitoring', status: 'externally_unverified', detail: 'missing' },
    ]);
    expect(report.productionReady).toBe(false);
  });
});
```

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run tests/unit/production-gate.test.ts
```

Expected: FAIL because the production gate does not exist.

- [ ] **Step 3: Implement HTTP probes**

Export:

```ts
export interface ProductionCheck {
  name: string;
  status: 'passed' | 'failed' | 'externally_unverified';
  detail: string;
}

export async function verifyProductionPreview(
  baseUrl: string,
  request: typeof fetch = fetch
): Promise<ProductionCheck[]> {
  const redirect = await request(new URL('/app-center', baseUrl), { redirect: 'manual' });
  const missing = await request(new URL('/assets/release-gate-missing.js', baseUrl), {
    redirect: 'manual',
  });
  const location = redirect.headers.get('location') ?? '';
  const contentType = missing.headers.get('content-type') ?? '';
  const cacheControl = missing.headers.get('cache-control') ?? '';
  const body = await missing.text();
  return [
    {
      name: 'clean-route-redirect',
      status: redirect.status === 302 && location.endsWith('/#/app-center') ? 'passed' : 'failed',
      detail: `${redirect.status} ${location}`,
    },
    {
      name: 'missing-asset-404',
      status:
        missing.status === 404 &&
        contentType.includes('text/html') &&
        !cacheControl.includes('immutable') &&
        !body.includes('id="app"')
          ? 'passed'
          : 'failed',
      detail: `${missing.status} ${contentType} ${cacheControl}`,
    },
  ];
}
```

- [ ] **Step 4: Support external smoke in the release config**

At config load:

```ts
const externalBaseUrl = process.env.PAGES_PREVIEW_URL;
```

Set `use.baseURL` to `externalBaseUrl ?? 'http://127.0.0.1:4173'`, and set `webServer` to `undefined` when `externalBaseUrl` exists. Local release smoke behavior remains unchanged.

- [ ] **Step 5: Add monitoring verification and waiver contracts**

Add:

```ts
type MonitoringEnvironment = Record<string, string | undefined>;

function requiredValues(env: MonitoringEnvironment, names: string[]): string[] | null {
  const values = names.map(name => env[name]?.trim() ?? '');
  return values.every(Boolean) ? values : null;
}

export async function verifyMonitoringDecision(
  env: MonitoringEnvironment,
  request: typeof fetch = fetch
): Promise<ProductionCheck> {
  if (env.MONITORING_MODE === 'waived') {
    const values = requiredValues(env, [
      'MONITORING_WAIVER_REASON',
      'MONITORING_WAIVER_APPROVER',
      'MONITORING_WAIVER_APPROVED_AT',
    ]);
    const approvedAt = values?.[2] ?? '';
    const approvedAtTime = Date.parse(approvedAt);
    if (
      !values ||
      Number.isNaN(approvedAtTime) ||
      new Date(approvedAtTime).toISOString() !== approvedAt
    ) {
      return {
        name: 'monitoring',
        status: 'externally_unverified',
        detail: 'monitoring waiver is incomplete',
      };
    }
    return {
      name: 'monitoring',
      status: 'passed',
      detail: `waived by ${values[1]} at ${approvedAt}: ${values[0]}`,
    };
  }

  if (env.MONITORING_MODE === 'verified') {
    const values = requiredValues(env, [
      'SENTRY_ORG',
      'SENTRY_PROJECT',
      'SENTRY_EVENT_ID',
      'SENTRY_AUTH_TOKEN',
    ]);
    if (!values) {
      return {
        name: 'monitoring',
        status: 'externally_unverified',
        detail: 'Sentry verification inputs are incomplete',
      };
    }
    const [org = '', project = '', eventId = '', token = ''] = values;
    const url = `https://sentry.io/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/events/${encodeURIComponent(eventId)}/`;
    const response = await request(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      name: 'monitoring',
      status: response.status === 200 ? 'passed' : 'failed',
      detail: `Sentry event ${eventId}: HTTP ${response.status}`,
    };
  }

  return {
    name: 'monitoring',
    status: 'externally_unverified',
    detail: 'MONITORING_MODE must be verified or waived',
  };
}
```

The `verified` branch queries:

```text
https://sentry.io/api/0/projects/{org}/{project}/events/{eventId}/
```

with `Authorization: Bearer $SENTRY_AUTH_TOKEN` and requires HTTP 200. No returned detail contains the token or DSN. Any incomplete or unknown mode is `externally_unverified` and makes the production verdict false.

- [ ] **Step 6: Run external Release Smoke and write a separate report**

Add the report builder:

```ts
export interface ProductionReadiness {
  schemaVersion: 1;
  checks: ProductionCheck[];
  productionReady: boolean;
  generatedAt: string;
}

export function buildProductionReadiness(checks: ProductionCheck[]): ProductionReadiness {
  return {
    schemaVersion: 1,
    checks,
    productionReady: checks.every(check => check.status === 'passed'),
    generatedAt: new Date().toISOString(),
  };
}
```

The CLI entry point must:

1. require `PAGES_PREVIEW_URL`;
2. parse `release-artifacts/release-readiness.json` and require `releaseCandidate === 'passed'` before making network requests;
3. collect `verifyProductionPreview()` and `verifyMonitoringDecision()` results;
4. spawn the external Release Smoke with the preview URL preserved:

```powershell
npm run test:e2e:smoke:release
```

5. append this check:

```ts
{
  name: 'external-release-smoke',
  status: smoke.status === 0 ? 'passed' : 'failed',
  detail: `exit ${smoke.status ?? 'interrupted'}`,
}
```

6. call `buildProductionReadiness()`, write the result only to `release-artifacts/production-readiness.json`, and exit non-zero unless `productionReady` is true.

Use `spawnSync()` with the platform npm executable and `{ stdio: 'inherit', env: { ...process.env, PAGES_PREVIEW_URL: previewUrl } }`. Do not modify `release-readiness.json` or `SHA256SUMS.txt`, and never serialize environment variables wholesale.

- [ ] **Step 7: Add the public production-gate command**

```json
"release:production-gate": "tsx scripts/release/production-gate.ts"
```

- [ ] **Step 8: Verify GREEN and commit**

```powershell
npx vitest run tests/unit/production-gate.test.ts
npx playwright test --list --config=config/playwright.release.config.ts
git add scripts/release/production-gate.ts tests/unit/production-gate.test.ts config/playwright.release.config.ts package.json
git commit -m "build: add read-only production readiness gate"
```

Expected: unit checks pass; local release config still lists smoke tests; no network mutation occurs.

### Task 4: Harden workflow semantics without running Actions

**Files:**

- Modify: `.github/workflows/release.yml`
- Modify: `.github/workflows/test.yml`
- Modify: `.github/workflows/code-review.yml`
- Modify: `.github/workflows/dependency-update.yml`
- Create: `tests/unit/workflow-contract.test.ts`

- [ ] **Step 1: Add static workflow regression tests**

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflows = [
  '.github/workflows/release.yml',
  '.github/workflows/test.yml',
  '.github/workflows/code-review.yml',
  '.github/workflows/dependency-update.yml',
];

describe('workflow release contract', () => {
  it('pins every action to a commit SHA', () => {
    for (const file of workflows) {
      const source = readFileSync(file, 'utf8');
      for (const line of source.split(/\r?\n/).filter(line => line.includes('uses:'))) {
        expect(line).toMatch(/uses:\s+[\w./-]+@[0-9a-f]{40}(?:\s+#.*)?$/);
      }
    }
  });

  it('uses the local release gate and prevents tagless manual publication', () => {
    const source = readFileSync('.github/workflows/release.yml', 'utf8');
    expect(source).toContain('run: npm run release:gate');
    expect(source).toContain("github.ref_type == 'tag' || github.event.inputs.tag != ''");
    expect(source).toContain('node-version-file: .node-version');
  });

  it('runs actual built-artifact smoke in the quality workflow', () => {
    const source = readFileSync('.github/workflows/test.yml', 'utf8');
    expect(source).toContain('npm run test:e2e:smoke:release');
    expect(source).not.toContain('npx playwright test tests/startup --project=chromium');
  });
});
```

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run tests/unit/workflow-contract.test.ts
```

Expected: FAIL for mutable tags, missing Node version file usage, old smoke command, and release publication semantics.

- [ ] **Step 3: Pin exact reviewed action SHAs**

Use these resolved tag commits with an explanatory version comment:

```text
actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4
actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
actions/github-script@f28e40c7f34bde8b3046d885e986cb6290c5673b # v7
peter-evans/create-pull-request@4e1beaa7521e8b457b572c090b25bd3db56bf1c5 # v5
```

- [ ] **Step 4: Use `.node-version` in every setup-node step**

Replace every `node-version: '20.x'` with:

```yaml
node-version-file: .node-version
```

- [ ] **Step 5: Make the release workflow use one gate**

Checkout uses the requested tag when supplied:

```yaml
with:
  fetch-depth: 0
  ref: ${{ github.event.inputs.tag || github.ref }}
```

Install Chromium before the gate, then run only:

```yaml
- name: Install Playwright Chromium
  run: npx playwright install chromium

- name: Release candidate gate
  run: npm run release:gate
```

The GitHub Release mutation step has:

```yaml
if: github.ref_type == 'tag' || github.event.inputs.tag != ''
```

Tagless dispatch still uploads dry-run artifacts but cannot reach `gh release create`, `upload`, or `edit`.

- [ ] **Step 6: Correct Quality Gate smoke/performance commands**

Smoke job builds once and runs `npm run test:e2e:smoke:release`. Performance job builds once and runs `npm run test:performance:gate`. Startup remains available through `npm run test:startup` but is not labeled release smoke.

- [ ] **Step 7: Verify workflow files statically**

```powershell
npx vitest run tests/unit/workflow-contract.test.ts
npx prettier --config config/.prettierrc.json --check ".github/workflows/*.yml"
```

Expected: unit contracts and YAML parsing/formatting pass. Do not trigger Actions.

- [ ] **Step 8: Commit workflow hardening**

```powershell
git add .github/workflows tests/unit/workflow-contract.test.ts
git commit -m "ci: align workflows with release gate"
```

### Task 5: Add ownership and truthful operations documentation

**Files:**

- Create: `.github/CODEOWNERS`
- Create: `tests/unit/release-governance-contract.test.ts`
- Modify: `README.md`
- Modify: `docs/DEPLOYMENT.md`
- Modify: `docs/CI-QUALITY-GATES.md`
- Modify: `docs/RELEASE_POLICY.md`
- Modify: `docs/TECH_DEBT_AUDIT.md`

- [ ] **Step 1: Write the documentation contract**

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('release governance documentation', () => {
  it('assigns repository ownership', () => {
    expect(readFileSync('.github/CODEOWNERS', 'utf8').trim()).toBe('* @earshore');
  });

  it('states the public static single-user BYOK boundary', () => {
    const readme = readFileSync('README.md', 'utf8');
    const deployment = readFileSync('docs/DEPLOYMENT.md', 'utf8');
    expect(`${readme}\n${deployment}`).toContain('单用户 BYOK');
    expect(deployment).toContain('不是认证/授权边界');
    expect(deployment).toContain('release:production-gate');
  });

  it('distinguishes release-candidate and production-ready evidence', () => {
    const policy = readFileSync('docs/RELEASE_POLICY.md', 'utf8');
    expect(policy).toContain('release-readiness.json');
    expect(policy).toContain('production-readiness.json');
    expect(policy).toContain('externally_unverified');
  });
});
```

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run tests/unit/release-governance-contract.test.ts
```

Expected: FAIL because CODEOWNERS and required wording do not exist.

- [ ] **Step 3: Add CODEOWNERS**

```text
* @earshore
```

- [ ] **Step 4: Update product and deployment boundaries**

Document in README and `docs/DEPLOYMENT.md`:

- public static, single-user BYOK scope;
- browser storage and route guards are not authentication/authorization;
- multi-user/private/shared-secret use requires a server-side identity project;
- `release:gate` proves a candidate and never deploys;
- `release:production-gate` requires a real preview plus verified Sentry evidence or a named waiver;
- redirect, missing asset, MIME/cache, route, monitoring, cutover, rollback, and post-deploy checks;
- production credentials must never be committed or printed.

- [ ] **Step 5: Update quality and release policy docs**

Record:

- Node `^20.19.0 || >=22.12.0` and `.node-version` 20.19.0;
- coverage 82/80/82/65;
- strict quality/technical-debt gates;
- Release Smoke and performance commands;
- candidate artifact names including SBOM/readiness;
- `externally_unverified` cannot be called production-ready;
- Actions quota is infrastructure-unavailable evidence, not a product pass or failure.

- [ ] **Step 6: Record remaining external settings**

In `docs/TECH_DEBT_AUDIT.md`, list Branch Protection, required reviews/checks, Cloudflare target/deployment history, and Sentry event receipt as external verification items. Do not mark them complete from repository files.

- [ ] **Step 7: Verify docs and commit**

```powershell
npx vitest run tests/unit/release-governance-contract.test.ts
npx prettier --config config/.prettierrc.json --check README.md docs/DEPLOYMENT.md docs/CI-QUALITY-GATES.md docs/RELEASE_POLICY.md docs/TECH_DEBT_AUDIT.md
git add .github/CODEOWNERS README.md docs/DEPLOYMENT.md docs/CI-QUALITY-GATES.md docs/RELEASE_POLICY.md docs/TECH_DEBT_AUDIT.md tests/unit/release-governance-contract.test.ts
git commit -m "docs: define production readiness controls"
```

Expected: contract and formatting pass; commit contains only governance files/tests.

### Task 6: Final release-candidate verification

**Files:**

- No additional source files

- [ ] **Step 1: Start from a clean worktree**

```powershell
git status --short
```

Expected: no output.

- [ ] **Step 2: Run the single release gate**

```powershell
npm run release:gate
```

Expected: every named stage passes, one `dist` is reused, and packaging finishes.

- [ ] **Step 3: Verify checksums from disk**

```powershell
$lines = Get-Content release-artifacts/SHA256SUMS.txt
foreach ($line in $lines) {
  $parts = $line -split '\s+', 2
  $actual = (Get-FileHash -Algorithm SHA256 (Join-Path release-artifacts $parts[1])).Hash.ToLowerInvariant()
  if ($actual -ne $parts[0]) { throw "SHA256 mismatch: $($parts[1])" }
}
```

Expected: no mismatch.

- [ ] **Step 4: Inspect readiness without overstating production**

```powershell
Get-Content -Raw release-artifacts/release-readiness.json
```

Expected: `releaseCandidate` is `passed`; `production` is `externally_unverified`.

- [ ] **Step 5: Re-run security and debt summaries**

```powershell
npm audit --audit-level=high
npm run secret:scan
npm run xss:gate
npm run tech-debt:gate
```

Expected: zero vulnerabilities, zero secret/XSS blockers, and zero medium-or-higher actionable debt findings.

- [ ] **Step 6: Confirm repository state and commit final integration fixes only if needed**

```powershell
git status --short
git log --oneline -12
```

Expected: generated release artifacts remain ignored and no source/doc changes are uncommitted. If verification exposed a defect, return to the task that owns it, add a failing regression test, fix it, rerun `release:gate`, and make a narrowly scoped commit before repeating this step.

### Task 7: External production verification handoff

**Files:**

- Generated ignored evidence only: `release-artifacts/production-readiness.json`

- [ ] **Step 1: Do not run without authority and inputs**

Required inputs are a real `PAGES_PREVIEW_URL` and either complete Sentry verification variables or complete waiver variables. Deployment itself requires separate user authorization.

- [ ] **Step 2: When authorized, run the read-only gate**

Verified monitoring example:

```powershell
$env:PAGES_PREVIEW_URL='https://preview.example'
$env:MONITORING_MODE='verified'
$env:SENTRY_ORG='approved-org'
$env:SENTRY_PROJECT='approved-project'
$env:SENTRY_EVENT_ID='controlled-preview-event-id'
# SENTRY_AUTH_TOKEN must already be present in the trusted process environment.
npm run release:production-gate
```

Waiver mode requires `MONITORING_WAIVER_REASON`, `MONITORING_WAIVER_APPROVER`, and `MONITORING_WAIVER_APPROVED_AT` instead of Sentry API inputs.

- [ ] **Step 3: Interpret the result**

Only `productionReady: true` with every required check `passed` supports “可以上线”. Missing credentials, missing preview, `externally_unverified`, or any failed check supports only “发布候选已就绪，生产条件未验证”.
