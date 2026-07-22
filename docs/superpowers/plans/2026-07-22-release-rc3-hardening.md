# Local RC3 Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Make the current release candidate pass every local release gate, eliminate the Skill Registry oversized-chunk warning without weakening limits, and prepare the RC3 package for an authorized remote release.

**Architecture:** Preserve persisted Deep Chat titles during hydration while keeping the search dialog's longer message-derived display title local to that dialog. Preserve the CI workflow's intentional build-artifact reuse and update its contract tests instead of reintroducing a second build. Split eager raw Skill Markdown by deterministic skill-name buckets in the Vite build graph; this keeps the existing synchronous registry API and avoids a risky UI-wide asynchronous migration.

**Tech Stack:** TypeScript, Vitest, Vite/Rolldown, Playwright, PowerShell, npm.

**Execution constraints:** Complete hardening and validation locally before any remote action. Push, tag, or release requires explicit maintainer authorization. GitHub Actions quota is exhausted, so release evidence must be produced locally rather than relying on remote workflows.

---

## Root-cause record

- Deep Chat title hydration in controller.ts prioritizes getThreadTitle(messages) over a persisted non-default title. Commit 509ab8d introduced that regression while widening search-result labels.
- The performance workflow intentionally downloads the build artifact. Commit 6500ac0 updated the workflow, but two contract tests still require a duplicate npm run build:app in the performance job.
- The technical-debt gate flags only test-file function length: importDeepChat, one large remount-streaming describe callback, and the request-lifecycle describe callback.
- Skill Registry eagerly imports every vendor/amazon-skills/*/SKILL.md file as raw text. The generated shared chunk is 502.61 kB minified. Skill-name buckets are bounded by about 78 kB raw source, so build-time grouping is a low-risk first split.
- The worktree contains an unchanged utils.ts stat entry and one generated .madge-scan-LY5CnM directory. Both must be cleared before release packaging.

## File map

- Modify: src/modules/app_center/views/playground/deep-chat/controller.ts — restore persisted title precedence.
- Verify: src/modules/app_center/views/playground/deep-chat/index.test.ts — retained regression coverage and test-helper extraction.
- Modify: tests/unit/lighthouse-gate.test.ts — assert artifact reuse in the performance job.
- Modify: tests/unit/performance-workflow.test.ts — assert artifact reuse in the performance job.
- Modify: src/modules/app_center/views/playground/deep-chat/requestLifecycle.test.ts — split long test suites without changing assertions.
- Create: tests/unit/vite-chunking.test.ts — unit-test the exported manual-chunk resolver.
- Modify: vite.config.js — deterministically split raw skill Markdown modules by slug initial.
- Modify: package.json and package-lock.json — bump the local candidate from 3.0.11-rc.2 to 3.0.11-rc.3 after all gates pass.
- Modify: docs/CHANGELOG.md — add the RC3 release-note section after all gates pass.

### Task 1: Restore a clean release workspace

**Files:**
- Delete: .madge-scan-LY5CnM/ only after resolving it to the repository-root path.
- Refresh index metadata: src/modules/app_center/views/playground/deep-chat/utils.ts only when git diff --quiet confirms no content difference.

- [ ] **Step 1: Verify the two dirty entries are safe to clear**

Run:

~~~
git diff --quiet -- src/modules/app_center/views/playground/deep-chat/utils.ts
Get-Item -LiteralPath .madge-scan-LY5CnM
Get-ChildItem -LiteralPath .madge-scan-LY5CnM -Force
~~~

Expected: utils.ts has no content diff, and the scan directory contains only generated copied source plus tsconfig.madge.json.

- [ ] **Step 2: Clear only proven-generated metadata**

Run:

~~~
git update-index --refresh -- src/modules/app_center/views/playground/deep-chat/utils.ts
Remove-Item -LiteralPath (Resolve-Path .madge-scan-LY5CnM) -Recurse -Force
git status --short
~~~

Expected: neither entry remains in git status; no tracked source is deleted.

### Task 2: Preserve persisted Deep Chat titles

**Files:**
- Modify: src/modules/app_center/views/playground/deep-chat/controller.ts:4267
- Test: src/modules/app_center/views/playground/deep-chat/index.test.ts:797, 1483, 1651, 2399

- [ ] **Step 1: Run the existing hydration regression tests before changing code**

Run:

~~~
npx vitest run src/modules/app_center/views/playground/deep-chat/index.test.ts --reporter=dot
~~~

Expected: failures mention saved message text such as Saved question or Other question where Existing thread and Other thread are expected.

- [ ] **Step 2: Retain persisted non-default titles during sanitation**

In getSanitizedThreadTitle, keep customTitle as the highest-priority value, then return a non-default persisted title before deriving a fallback from messages:

~~~ts
const persistedTitle = getOptionalString(title);
if (persistedTitle && persistedTitle !== 'New Thread') {
  return persistedTitle;
}

const derived = getThreadTitle(messages);
return derived || persistedTitle || 'New Thread';
~~~

Do not change renderChatSearchResults: its 100-character derived title is intentionally search-dialog-only.

- [ ] **Step 3: Re-run the focused regression tests**

Run:

~~~
npx vitest run src/modules/app_center/views/playground/deep-chat/index.test.ts --reporter=dot
~~~

Expected: all Deep Chat index tests pass; sidebar, search, rename, unread, and remount assertions use the persisted titles.

### Task 3: Align performance-workflow contracts with artifact reuse

**Files:**
- Modify: tests/unit/lighthouse-gate.test.ts:241
- Modify: tests/unit/performance-workflow.test.ts:65
- Reference only: .github/workflows/test.yml:206

- [ ] **Step 1: Change the first contract test to assert the current CI handoff**

Replace the old duplicate-build expectation with:

~~~ts
expect(performanceJob).toContain('uses: actions/download-artifact@');
expect(performanceJob).toContain('name: build-artifact');
expect(performanceJob).toContain('path: dist');
expect(performanceJob).not.toContain('run: npm run build:app');
expect(performanceJob).toContain('run: npm run test:performance:gate');
~~~

- [ ] **Step 2: Make the second contract test assert the same handoff**

Use the same artifact assertions for job, retain the dedicated gate assertion, and remove only the stale build assertion.

- [ ] **Step 3: Run both contract-test files**

Run:

~~~
npx vitest run tests/unit/lighthouse-gate.test.ts tests/unit/performance-workflow.test.ts --reporter=dot
~~~

Expected: both workflow contracts pass without changing .github/workflows/test.yml.

### Task 4: Make test suites pass the technical-debt gate

**Files:**
- Modify: src/modules/app_center/views/playground/deep-chat/index.test.ts:368, 1890
- Modify: src/modules/app_center/views/playground/deep-chat/requestLifecycle.test.ts:17

- [ ] **Step 1: Confirm the exact pre-refactor debt findings**

Run:

~~~
npm run tech-debt:gate
~~~

Expected: exactly the three medium long-function findings already recorded, with no production-file failures.

- [ ] **Step 2: Extract Deep Chat test setup helpers without changing mocks**

Split importDeepChat into focused helpers:

~~~ts
function createDeepChatCallLLM(options: ImportOptions): ReturnType<typeof vi.fn>;
function createPromptHistoryState(options: ImportOptions): PromptHistoryState;
function installDeepChatModuleMocks(deps: {
  localDataStore: ReturnType<typeof createLocalDataStoreMock>;
  storageService: ReturnType<typeof createDeepChatStorageService>;
  callLLM: ReturnType<typeof vi.fn>;
  appStore: { getState: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> };
  eventBus: { emit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> };
  toast: ReturnType<typeof vi.fn>;
  navigateToRouteId: ReturnType<typeof vi.fn>;
  historyService: { deletePromptResultAsync: ReturnType<typeof vi.fn> };
  confirmWithModal: ReturnType<typeof vi.fn>;
  chooseWithModal: ReturnType<typeof vi.fn>;
}): ReturnType<typeof installListingWorkflowMocks>;
~~~

Keep importDeepChat responsible only for composing those helpers, preparing the handoff, importing ./index, and returning the existing mocks object.

- [ ] **Step 3: Split large describe callbacks into semantic suites**

Replace the single remount-streaming describe callback with three separate describe blocks for:

~~~ts
describe('Deep Chat remount streaming display', () => { /* first test */ });
describe('Deep Chat background stream settlement', () => { /* second test */ });
describe('Deep Chat partial stream recovery', () => { /* remaining recovery tests */ });
~~~

Split the request-lifecycle outer suite into construction/abort, display, and persistence suites. Keep every existing it body and assertion unchanged.

- [ ] **Step 4: Verify behavior and debt gate**

Run:

~~~
npx vitest run src/modules/app_center/views/playground/deep-chat/index.test.ts src/modules/app_center/views/playground/deep-chat/requestLifecycle.test.ts --reporter=dot
npm run tech-debt:gate
~~~

Expected: focused tests pass and the gate reports zero medium-or-higher findings.

### Task 5: Split raw Skill Registry content at the Vite build boundary

**Files:**
- Create: tests/unit/vite-chunking.test.ts
- Modify: vite.config.js:304
- Verify: src/services/skillRegistry/loadSkillModules.ts

- [ ] **Step 1: Add a failing unit test for the chunk resolver**

Create tests that import resolveManualChunkName from ../../vite.config.js and require:

~~~ts
expect(
  resolveManualChunkName('D:/repo/vendor/amazon-skills/amazon-ppc-campaign/SKILL.md?raw')
).toBe('skill-content-p');
expect(
  resolveManualChunkName('D:/repo/vendor/amazon-skills/amazon-listing-optimization/SKILL.md?raw')
).toBe('skill-content-l');
expect(resolveManualChunkName('D:/repo/src/modules/home/index.ts')).toBeUndefined();
expect(
  resolveManualChunkName('D:/repo/node_modules/@alpinejs/csp/dist/module.esm.js')
).toBe('vendor-core');
~~~

Run:

~~~
npx vitest run tests/unit/vite-chunking.test.ts --reporter=dot
~~~

Expected: fail because resolveManualChunkName is not exported yet.

- [ ] **Step 2: Extract and export the resolver from Vite config**

Move the current manualChunks branching into:

~~~js
export function resolveManualChunkName(id) {
  const normalizedId = id.replace(/\\/g, '/');
  const skillMatch = normalizedId.match(
    /\/vendor\/amazon-skills\/amazon-([^/]+)\/SKILL\.md(?:\?.*)?$/i
  );
  if (skillMatch?.[1]) {
    return 'skill-content-' + skillMatch[1].charAt(0).toLowerCase();
  }

  if (!normalizedId.includes('/node_modules/')) {
    return undefined;
  }

  // Preserve the existing vendor-core, Font Awesome, chart, markdown, and utility branches.
}
~~~

Then wire output.manualChunks to resolveManualChunkName. Do not raise chunkSizeWarningLimit and do not alter loadSkillModules.ts eager runtime semantics.

- [ ] **Step 3: Verify resolver behavior and actual emitted assets**

Run:

~~~
npx vitest run tests/unit/vite-chunking.test.ts --reporter=dot
npm run build:app
Get-ChildItem dist/assets/js/skill-content-*.js | Sort-Object Length -Descending |
  Select-Object Name, Length
~~~

Expected: resolver tests pass, several skill-content-* chunks are emitted, and no skillRegistry or skill-content chunk exceeds the configured 450 kB limit.

- [ ] **Step 4: Re-check feature-level registry behavior**

Run:

~~~
npx vitest run src/services/skillRegistry/skillRegistryService.test.ts src/services/skillRegistry/skillRegistry.production.test.ts src/modules/app_center/views/playground/deep-chat/index.test.ts --reporter=dot
~~~

Expected: registry indexing, context loading, Skills page handoff, and Deep Chat library mocking remain compatible.

### Task 6: Run the complete local release evidence set

**Files:**
- Generated only: dist/, coverage/, tests/playwright-report/, tests/performance/lighthouse-reports/

- [ ] **Step 1: Run coverage and build-quality gates**

Run:

~~~
npx vitest run --coverage --reporter=dot
npm run build
npm run release:artifact-contract
npm run test:e2e:smoke
~~~

Expected: all commands exit zero; build emits no Skill Registry oversized-chunk warning.

- [ ] **Step 2: Run the performance gate with its full allowance**

Before running, inspect only ports 4174 and 9222 and terminate a process only when its command line proves it is an orphaned test preview or Playwright Chromium process. Then run:

~~~powershell
npm run test:performance:gate
~~~

Expected: command exits zero and writes tests/playwright-report/performance-gate.json. The prior 12 raw reports show all medians within threshold, but a complete process exit is required.

### Task 7: Prepare local RC3 release material after all gates are green

**Files:**
- Modify: package.json
- Modify: package-lock.json
- Modify: docs/CHANGELOG.md

- [ ] **Step 1: Bump the candidate version locally**

Run:

~~~
npm version 3.0.11-rc.3 --no-git-tag-version
~~~

Expected: package.json and package-lock.json both contain 3.0.11-rc.3 and no Git tag is created.

- [ ] **Step 2: Add a focused RC3 changelog section**

Add 3.0.11-rc.3 above the existing 3.0.11-rc.2 section. Include only: persisted Deep Chat title regression fix, artifact-reuse contract alignment, and Skill Markdown chunk splitting.

- [ ] **Step 3: Produce local release artifacts**

Run:

~~~
npm run release:validate
npm run release:notes
npm run release:package
npm run release:gate
git status --short
~~~

Expected: all gates pass, local notes/package artifacts are generated, and only intentional version/changelog/release artifacts remain. Do not commit, push, tag, or publish unless the user explicitly requests it after reviewing the local evidence.

## Plan self-review

- Persisted titles are restored without reverting the requested long search-result labels.
- CI artifact reuse is tested, not undone, so remote Actions consumption stays minimized.
- Test-only debt changes preserve existing assertions and are independently gated.
- Bundling changes retain the synchronous registry interface and enforce the current 450 kB guard rather than hiding the warning.
- Every release check is local and no task requires GitHub Actions.
