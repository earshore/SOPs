# System Settings Enterprise Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden 系统设置 for browser-local reliability, single write entry, anti-island visual baseline, and a closed-loop regression suite per approved Spec.

**Architecture:** Keep the Alpine right-drawer `settingsPanel`. Add a small domain layer under `src/components/settings/domain/` for dirty/diff, health, deep-link, and presets. Runtime/tool strategy remain SSOT via `runtimeStrategyService` / `toolStrategyService`. Every Spec requirement maps to UT/CT/E2E IDs; no feature PR merges without its tests green.

**Tech Stack:** TypeScript, Alpine.js, Vitest, Playwright, StorageService, EventBus, existing `confirmWithModal` / `chooseWithModal`.

**Spec:** `docs/superpowers/specs/2026-07-25-system-settings-enterprise-hardening-design.md` (**Status: approved**)

## Global Constraints

- Data boundary: **browser-local only** (no cloud sync).
- Settings is the **only write entry** for global strategy fields (P1); modules deep-link.
- Runtime save model: **full-package** `RuntimeStrategySettings` on `saveToolStrategy` / `saveRuntimeStrategy` (Spec §4.1).
- Visual: anti-island; tokens first; no new hex; follow Spec §14.
- Testing: Spec §7 mandatory; each task ends with green tests; DoD §7.6.
- Reuse `confirmWithModal` for dirty discard and destructive actions; no third modal stack.
- Do not weaken BASE unit tests or release-smoke settings open path.

---

## File Map

| Path | Responsibility |
| --- | --- |
| `src/components/settings/domain/settingsDirty.ts` | Snapshot / diff / dirty partitions |
| `src/components/settings/domain/settingsHealth.ts` | Open-time health check messages |
| `src/components/settings/domain/settingsDeepLink.ts` | Parse/apply `SettingsOpenOptions` |
| `src/components/settings/domain/settingsPresets.ts` | Stable / speed / cost runtime overlays |
| `src/components/settings/domain/settingsUiPreferences.ts` | density simple/advanced persistence |
| `src/components/settings/systemSettings.ts` | Wire domain into panel; dirty close; health; proxy test; open options |
| `src/components/settings/systemSettings.html` | Copy, testids, appearance, density, search, badges, presets |
| `src/components/settings/systemSettings.css` | Token mapping + component family |
| `src/common/constants/eventConstants.ts` | Typed SETTINGS_OPEN payload if needed |
| `src/common/config/ConfigCenter.ts` | fallback-only comments / guardrails |
| `src/modules/.../thresholdSettings.ts` / `analysisSettings.ts` | Stop legacy dual-write |
| `src/modules/.../PerformanceSettings.ts` + templates | Read-only summary + deep link |
| `package.json` | `test:unit:settings`, `test:e2e:settings`, `test:settings` |
| `tests/unit/systemSettingsDirty.test.ts` | UT-P0-04..06 |
| `tests/unit/systemSettingsHealth.test.ts` | UT-P0-09 |
| `tests/unit/systemSettingsDeepLink.test.ts` | UT-P1 deep link |
| `tests/unit/systemSettingsPresets.test.ts` | UT-P1-07..08 |
| `tests/unit/systemSettingsCurrent.test.ts` | Extend contracts BASE + P0-1 |
| `tests/e2e/system-settings.spec.ts` | E2E-P0 / E2E-P1 |
| `tests/e2e/pages/SystemSettingsPage.ts` | Page object |

---

### Task 1: npm scripts + E2E skeleton + testids (test harness)

**Files:**
- Modify: `package.json`
- Create: `tests/e2e/pages/SystemSettingsPage.ts`
- Create: `tests/e2e/system-settings.spec.ts`
- Modify: `src/components/settings/systemSettings.html` (data-testid only)
- Test: harness self-check via smoke + new file empty-pass then real asserts in later tasks

**Interfaces:**
- Consumes: existing open flow in release-smoke
- Produces: npm scripts; `SystemSettingsPage.open()`; testids on save buttons

- [ ] **Step 1: Add package.json scripts**

Add next to existing e2e scripts:

```json
"test:unit:settings": "vitest run tests/unit/systemSettings*.test.ts",
"test:e2e:settings": "playwright test tests/e2e/system-settings.spec.ts --project=chromium",
"test:settings": "npm run type-check && npm run test:unit:settings && npm run test:e2e:smoke && npm run test:e2e:settings"
```

- [ ] **Step 2: Add testids to HTML save actions**

On tool strategy primary save button add `data-testid="settings-save-tool-strategy"`.  
On LLM save button add `data-testid="settings-save-provider"`.  
On panel root (outer `settings-panel-root` div) add `data-testid="settings-panel"`.

- [ ] **Step 3: Create Page Object**

```typescript
// tests/e2e/pages/SystemSettingsPage.ts
import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class SystemSettingsPage {
  constructor(private readonly page: Page) {}

  root(): Locator {
    return this.page.getByTestId('settings-panel');
  }

  async openFromNav(): Promise<void> {
    await this.page.goto('/#/home');
    await this.page.locator('#nav-more').click();
    await this.page.getByRole('button', { name: '全局设置' }).click();
    await expect(this.page.getByRole('heading', { name: '系统设置' })).toBeVisible();
  }

  async expectOpen(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: '系统设置' })).toBeVisible();
    await expect(this.page.locator('#settings-section-llm')).toBeVisible();
  }

  saveToolStrategy(): Locator {
    return this.page.getByTestId('settings-save-tool-strategy');
  }
}
```

- [ ] **Step 4: Create E2E skeleton that opens settings**

```typescript
// tests/e2e/system-settings.spec.ts
import { test, expect } from '@playwright/test';
import { SystemSettingsPage } from './pages/SystemSettingsPage';

test.describe('system settings', () => {
  test('E2E-SMOKE-OPEN opens panel from global settings', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();
    await settings.expectOpen();
  });
});
```

- [ ] **Step 5: Run harness**

```bash
npm run type-check
npx vitest run tests/unit/systemSettingsCurrent.test.ts
npx playwright test tests/e2e/system-settings.spec.ts --project=chromium
```

Expected: PASS (or fix selectors to match real nav).

- [ ] **Step 6: Commit**

```bash
git add package.json src/components/settings/systemSettings.html tests/e2e/pages/SystemSettingsPage.ts tests/e2e/system-settings.spec.ts
git commit -m "test(settings): add settings unit/e2e scripts and panel harness"
```

---

### Task 2: Save contract unit tests + copy lock (P0-1)

**Files:**
- Modify: `tests/unit/systemSettingsCurrent.test.ts`
- Modify: `src/components/settings/systemSettings.html` (copy for whole-runtime save hints)
- Modify: `src/components/settings/systemSettings.ts` only if save methods need explicit spy points

**Interfaces:**
- Consumes: `saveToolStrategy`, `saveProviderConfig`, `saveProxyConfig`, `saveRuntimeStrategy`
- Produces: UT-P0-01..03, CT-P0-01 locked

- [ ] **Step 1: Write failing/locking contract tests**

In `systemSettingsCurrent.test.ts` (reuse `createPanel` + mocks), add:

```typescript
it('UT-P0-01 saveProviderConfig does not persist runtime strategy', async () => {
  const saveRuntime = vi.spyOn(
    await import('@/services/runtimeStrategyService'),
    'saveRuntimeStrategySettings'
  );
  const panel = createPanel();
  panel.llm.apiKey = 'sk-test';
  panel.llm.endpoint = 'https://example.com/v1';
  // ensure provider config save path runs without requiring network
  await panel.saveProviderConfig();
  expect(saveRuntime).not.toHaveBeenCalled();
});

it('UT-P0-02 saveToolStrategy persists tool strategy and runtime', async () => {
  const runtime = await import('@/services/runtimeStrategyService');
  const tool = await import('@/services/toolStrategyService');
  const saveRuntime = vi.spyOn(runtime, 'saveRuntimeStrategySettings');
  const saveTool = vi.spyOn(tool, 'saveToolStrategySettings'); // use actual export name from toolStrategyService
  const panel = createPanel();
  panel.runtimeStrategy.settings.llm.maxRetries = 4;
  await panel.saveToolStrategy();
  expect(saveTool).toHaveBeenCalled();
  expect(saveRuntime).toHaveBeenCalled();
});
```

**Note:** Resolve actual export names from `toolStrategyService.ts` (`saveToolStrategySettings` or equivalent) before writing the spy — match real API.

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/unit/systemSettingsCurrent.test.ts
```

Expected: FAIL if saveTool does not call runtime, or PASS if already correct — keep tests either way.

- [ ] **Step 3: Align HTML copy**

Tool strategy footer already mentions full runtime — ensure network/data secondary save buttons include note:

`将保存当前面板中的全部运行时策略（含工具策略区未点保存的已编辑字段）。`

CT assert:

```typescript
it('CT-P0-01 tool strategy save copy mentions runtime strategy', () => {
  const template = readFileSync(resolve(process.cwd(), 'src/components/settings/systemSettings.html'), 'utf8');
  expect(template).toMatch(/运行时策略|运行策略/);
  expect(template).toContain('settings-save-tool-strategy');
});
```

- [ ] **Step 4: Re-run unit + commit**

```bash
npx vitest run tests/unit/systemSettingsCurrent.test.ts
git add tests/unit/systemSettingsCurrent.test.ts src/components/settings/systemSettings.html
git commit -m "test(settings): lock save contracts for provider tool and runtime"
```

---

### Task 3: Dirty domain + close confirmation (P0-2)

**Files:**
- Create: `src/components/settings/domain/settingsDirty.ts`
- Create: `tests/unit/systemSettingsDirty.test.ts`
- Modify: `src/components/settings/systemSettings.ts` (`open`/`close`/`save*` capture baseline)
- Modify: `src/components/settings/systemSettings.html` optional dirty status bar later; min: close path

**Interfaces:**
- Produces:

```typescript
export type SettingsDirtyPartition = 'llm' | 'toolStrategy' | 'runtime' | 'proxy' | 'appearance';

export interface SettingsDirtySnapshot {
  llm: string;
  toolStrategy: string;
  runtime: string;
  proxy: string;
  appearance: string;
}

export function snapshotSettingsPartitions(input: {
  llm: unknown;
  toolStrategy: unknown;
  runtime: unknown;
  proxy: unknown;
  appearance: unknown;
}): SettingsDirtySnapshot;

export function diffSettingsPartitions(
  baseline: SettingsDirtySnapshot,
  current: SettingsDirtySnapshot
): SettingsDirtyPartition[];
```

Serialize with stable `JSON.stringify` of plain data (not UI-only flags).

- [ ] **Step 1: Write failing domain tests**

```typescript
// tests/unit/systemSettingsDirty.test.ts
import { describe, it, expect } from 'vitest';
import {
  snapshotSettingsPartitions,
  diffSettingsPartitions,
} from '@/components/settings/domain/settingsDirty';

describe('settingsDirty', () => {
  it('UT-P0-04 detects runtime partition dirty', () => {
    const baseline = snapshotSettingsPartitions({
      llm: { a: 1 },
      toolStrategy: {},
      runtime: { llm: { maxRetries: 2 } },
      proxy: {},
      appearance: {},
    });
    const current = snapshotSettingsPartitions({
      llm: { a: 1 },
      toolStrategy: {},
      runtime: { llm: { maxRetries: 4 } },
      proxy: {},
      appearance: {},
    });
    expect(diffSettingsPartitions(baseline, current)).toEqual(['runtime']);
  });

  it('UT-P0-05 ignores identical payloads', () => {
    const snap = snapshotSettingsPartitions({
      llm: { a: 1 },
      toolStrategy: { t: 1 },
      runtime: { r: 1 },
      proxy: { p: 1 },
      appearance: { d: 'simple' },
    });
    expect(diffSettingsPartitions(snap, snap)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL (module missing)**

```bash
npx vitest run tests/unit/systemSettingsDirty.test.ts
```

- [ ] **Step 3: Implement `settingsDirty.ts`**

```typescript
export type SettingsDirtyPartition = 'llm' | 'toolStrategy' | 'runtime' | 'proxy' | 'appearance';

export interface SettingsDirtySnapshot {
  llm: string;
  toolStrategy: string;
  runtime: string;
  proxy: string;
  appearance: string;
}

function stable(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function snapshotSettingsPartitions(input: {
  llm: unknown;
  toolStrategy: unknown;
  runtime: unknown;
  proxy: unknown;
  appearance: unknown;
}): SettingsDirtySnapshot {
  return {
    llm: stable(input.llm),
    toolStrategy: stable(input.toolStrategy),
    runtime: stable(input.runtime),
    proxy: stable(input.proxy),
    appearance: stable(input.appearance),
  };
}

export function diffSettingsPartitions(
  baseline: SettingsDirtySnapshot,
  current: SettingsDirtySnapshot
): SettingsDirtyPartition[] {
  const keys: SettingsDirtyPartition[] = [
    'llm',
    'toolStrategy',
    'runtime',
    'proxy',
    'appearance',
  ];
  return keys.filter(key => baseline[key] !== current[key]);
}
```

- [ ] **Step 4: Panel integration tests (UT-P0-06)**

```typescript
it('UT-P0-06 close confirms when runtime dirty and stays open on cancel', async () => {
  deps.confirmWithModal.mockResolvedValueOnce(false);
  const panel = createPanel();
  panel.open();
  panel.captureSettingsBaseline(); // method to add
  panel.runtimeStrategy.settings.llm.maxRetries = 9;
  await panel.close();
  expect(deps.confirmWithModal).toHaveBeenCalled();
  expect(panel.isOpen).toBe(true);
});

it('UT-P0-06b close discards when confirmed', async () => {
  deps.confirmWithModal.mockResolvedValueOnce(true);
  const panel = createPanel();
  panel.open();
  panel.captureSettingsBaseline();
  panel.runtimeStrategy.settings.llm.maxRetries = 9;
  await panel.close();
  expect(panel.isOpen).toBe(false);
});
```

- [ ] **Step 5: Implement panel wiring**

On `open()` after loads: `this.captureSettingsBaseline()`.

```typescript
captureSettingsBaseline(): void {
  this._settingsBaseline = snapshotSettingsPartitions({
    llm: { provider: this.llm.provider, endpoint: this.llm.endpoint, model: this.llm.model /* + fields needed */ },
    toolStrategy: this.toolStrategy.targetModels,
    runtime: this.runtimeStrategy.settings,
    proxy: { type: this.proxy.type, customUrl: this.proxy.customUrl },
    appearance: this.appearance ?? {},
  });
},

get dirtyPartitions(): SettingsDirtyPartition[] {
  if (!this._settingsBaseline) return [];
  return diffSettingsPartitions(this._settingsBaseline, snapshotSettingsPartitions({ /* same shape */ }));
},

async close(): Promise<void> {
  const dirty = this.dirtyPartitions;
  if (dirty.length > 0) {
    const ok = await confirmSettingsAction(
      '放弃未保存的更改？',
      `以下分区有未保存修改：${dirty.join('、')}。关闭将丢失这些更改。`,
      '放弃更改'
    );
    if (!ok) return;
  }
  this.isOpen = false;
},
```

After successful `saveToolStrategy` / `saveProviderConfig` / `saveProxyConfig` / `saveRuntimeStrategy`: call `captureSettingsBaseline()` again.

Make `close` async; ensure EventBus close handler `void this.close()`.

- [ ] **Step 6: E2E dirty path**

Extend `system-settings.spec.ts`:

```typescript
test('E2E-P0-01 dirty close shows confirmation', async ({ page }) => {
  const settings = new SystemSettingsPage(page);
  await settings.openFromNav();
  // change a visible number input in tool strategy / general AI timeouts
  const timeoutInput = page.locator('#settings-section-tool-strategy input[type="number"]').first();
  await timeoutInput.fill('180');
  await page.keyboard.press('Escape');
  await expect(page.getByText(/未保存|放弃/)).toBeVisible();
});
```

Adjust selectors to real DOM after implementation.

- [ ] **Step 7: Run full P0-2 gate**

```bash
npx vitest run tests/unit/systemSettingsDirty.test.ts tests/unit/systemSettingsCurrent.test.ts
npx playwright test tests/e2e/system-settings.spec.ts --project=chromium
npm run type-check
```

- [ ] **Step 8: Commit**

```bash
git add src/components/settings/domain/settingsDirty.ts src/components/settings/systemSettings.ts tests/unit/systemSettingsDirty.test.ts tests/e2e/system-settings.spec.ts
git commit -m "feat(settings): dirty detection and unsaved close confirmation"
```

---

### Task 4: ConfigCenter fallback-only + health check (P0-3, P0-4)

**Files:**
- Modify: `src/common/config/ConfigCenter.ts` (comments + JSDoc on llm/scraper/storage numeric defaults)
- Create: `src/components/settings/domain/settingsHealth.ts`
- Create: `tests/unit/systemSettingsHealth.test.ts`
- Modify: `systemSettings.ts` open() to set `healthMessages: string[]`
- Modify: HTML coach or status to show health when non-empty

**Interfaces:**

```typescript
export interface SettingsHealthResult {
  ok: boolean;
  messages: string[];
}

export function evaluateSettingsHealth(input: {
  runtimeNormalized: boolean;
  hasLlmEndpoint: boolean;
  hasLlmKey: boolean;
  storageUsageRatio?: number;
}): SettingsHealthResult;
```

- [ ] **Step 1: Failing health tests**

```typescript
it('UT-P0-09 reports safe defaults when runtime was repaired', () => {
  const result = evaluateSettingsHealth({
    runtimeNormalized: true,
    hasLlmEndpoint: false,
    hasLlmKey: false,
  });
  expect(result.ok).toBe(false);
  expect(result.messages.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Implement health helper + open() integration**

On open: always `normalize` via existing `getRuntimeStrategySettings()`; if storage raw parse failed path exists, surface message. Minimum: missing endpoint/key readiness already partially in `llmSetupReadinessText` — merge into `healthMessages`.

- [ ] **Step 3: ConfigCenter**

Add block comment above scraper/llm/storage defaults:

```typescript
/**
 * FALLBACK-ONLY for runtime-overlapping numerics.
 * User-facing runtime values: runtimeStrategyService (SSOT).
 * Do not re-read these to override user runtime after load.
 */
```

Grep call sites that still prefer ConfigCenter over runtime for scraper timeout/concurrency; if found in `scraperService`, switch to `getRuntimeScraperOptions()` (or existing helper). Add UT-P0-07 if a pure function can assert.

- [ ] **Step 4: Run + commit**

```bash
npx vitest run tests/unit/systemSettingsHealth.test.ts tests/unit/systemSettingsCurrent.test.ts
npm run type-check
git commit -m "feat(settings): open health checks and ConfigCenter fallback-only docs"
```

---

### Task 5: Proxy connectivity test (P0-5)

**Files:**
- Modify: `systemSettings.ts` + `systemSettings.html` network section
- Modify: `tests/unit/systemSettingsCurrent.test.ts`

- [ ] **Step 1: Test**

```typescript
it('UT-P0-10 proxy test failure sets error without closing panel', async () => {
  const panel = createPanel();
  panel.isOpen = true;
  // mock fetch/proxy probe to reject
  await panel.testProxyConnection();
  expect(panel.isOpen).toBe(true);
  expect(panel.proxy.testError || panel.proxy.status).toBeTruthy();
});
```

- [ ] **Step 2: Implement minimal probe**

Prefer existing scraper proxy validation helpers if any; else `fetch` to a configured probe URL with timeout, catch errors into `proxy.testMessage`. Button: `data-testid="settings-test-proxy"`.

- [ ] **Step 3: Run + commit**

```bash
npx vitest run tests/unit/systemSettingsCurrent.test.ts
git commit -m "feat(settings): minimal proxy connectivity test in network section"
```

**P0 exit gate:**

```bash
npm run test:unit:settings
npx playwright test tests/e2e/system-settings.spec.ts --project=chromium
npm run test:e2e:smoke
npm run type-check
```

All §7.3.1 cases for implemented scope must pass before starting P1.

---

### Task 6: Visual baseline tokens (P1-0)

**Files:**
- Modify: `systemSettings.css` (root variables §14.2)
- Modify: `systemSettings.html` (reduce new decorative gradients on secondary buttons where easy)
- Modify: `tests/unit/systemSettingsCurrent.test.ts` CT-P1-00

- [ ] **Step 1: CT**

```typescript
it('CT-P1-00 settings css defines surface token mapping', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/components/settings/systemSettings.css'), 'utf8');
  expect(css).toMatch(/--settings-surface/);
  expect(css).toMatch(/--settings-accent/);
});
```

- [ ] **Step 2: Add token block at top of CSS per Spec §14.2; replace a few critical hex in `.settings-control:focus` with `var(--settings-focus-ring)`.

- [ ] **Step 3: Run + commit**

```bash
npx vitest run tests/unit/systemSettingsCurrent.test.ts
git commit -m "style(settings): map settings component tokens for anti-island baseline"
```

MAN-P1-00: record in PR description (screenshot checklist).

---

### Task 7: Deep link + remove module dual-write (P1-1, P1-1b)

**Files:**
- Create: `src/components/settings/domain/settingsDeepLink.ts`
- Modify: `eventConstants` / EventBus payload typing for SETTINGS_OPEN
- Modify: `openSettings(options?: SettingsOpenOptions)`
- Modify: `systemSettings.ts` open handler
- Modify: `thresholdSettings.ts`, `analysisSettings.ts` — stop legacy StorageService.set for strategy keys
- Modify: PerformanceSettings UI → summary + openSettings
- Tests: `systemSettingsDeepLink.test.ts`, threshold/analysis tests, E2E-P1-01

**Interfaces:**

```typescript
export interface SettingsOpenOptions {
  sectionId?:
    | 'settings-section-llm'
    | 'settings-section-tool-strategy'
    | 'settings-section-network'
    | 'settings-section-data'
    | 'settings-section-appearance'
    | 'settings-section-performance';
  focus?: string;
  density?: 'simple' | 'advanced';
}

export function openSettings(options?: SettingsOpenOptions): void;
// emit APP_EVENTS.SETTINGS_OPEN with options payload
```

- [ ] **Step 1: UT deep link**

```typescript
it('applies sectionId after open', () => {
  const panel = createPanel();
  const scroll = vi.spyOn(panel, 'scrollToSection');
  panel.open({ sectionId: 'settings-section-tool-strategy', focus: 'ppc-thresholds' });
  expect(scroll).toHaveBeenCalledWith('settings-section-tool-strategy');
});
```

- [ ] **Step 2: UT stop dual write**

```typescript
it('UT-P1-01 saveThresholds does not write legacy storage key', () => {
  const setSpy = vi.spyOn(StorageService, 'set');
  saveThresholds({ /* valid thresholds */ });
  expect(setSpy).not.toHaveBeenCalledWith('ppc_search_terms_thresholds_v1', expect.anything());
});
```

Same for analysis settings key.

- [ ] **Step 3: Implement emit payload; panel `open(options?)`; remove StorageService.set from saveThresholds/saveAnalysisSettings; migrate read-once from legacy keys into runtime if present.

- [ ] **Step 4: Module UI summary card with `settings-card` + button calling `openSettings({ sectionId: 'settings-section-tool-strategy', focus: '...' , density: 'advanced' })`.

- [ ] **Step 5: Gate**

```bash
npx vitest run tests/unit/systemSettings*.test.ts
# plus performance / ppc settings tests
npx playwright test tests/e2e/system-settings.spec.ts --project=chromium
npm run type-check
git commit -m "feat(settings): deep link open options and single write entry for strategies"
```

---

### Task 8: Density + search + badges (P1-2, P1-3, P1-4)

**Files:**
- Create: `settingsUiPreferences.ts` (`settings_ui_preferences_v1`)
- Modify: HTML toolbar: segmented control + search input
- Modify: TS filter/scroll
- Tests: UT-P1-04, UT-P1-05, CT, E2E-P1-02/03

**Interfaces:**

```typescript
export type SettingsDensity = 'simple' | 'advanced';
export function getSettingsUiPreferences(): { density: SettingsDensity };
export function saveSettingsUiPreferences(prefs: { density: SettingsDensity }): void;
```

- [ ] Simple mode: hide elements with `data-settings-density="advanced"` via Alpine `:hidden="density === 'simple'"`.
- [ ] Search: maintain index array `{ id, sectionId, labels: string[] }`; on input set `searchQuery` and scroll first match.
- [ ] Badges: use Spec §14.5 text on key cards.

- [ ] Commit: `feat(settings): simple/advanced density, in-panel search, scope badges`

---

### Task 9: Appearance section + presets (P1-5, P1-6)

**Files:**
- Create: `settingsPresets.ts` with Spec §5.2 table values
- Create: `tests/unit/systemSettingsPresets.test.ts`
- Modify: HTML section `settings-section-appearance` + nav item
- Wire theme + animation stores (instant apply; not in discard dirty — Spec §5.5)
- Presets apply overlay to `runtimeStrategy.settings` in memory only → dirty

```typescript
export type RuntimePresetId = 'reliability' | 'speed' | 'cost';
export function applyRuntimePreset(
  base: RuntimeStrategySettings,
  id: RuntimePresetId
): RuntimeStrategySettings;
```

UT-P1-07/08 assert exact fields from Spec table.

- [ ] Commit: `feat(settings): appearance section and runtime presets`

**P1 exit:** all §7.3.2 automated IDs green + MAN-P1-00 noted.

---

### Task 10: Backup HA — export buckets + import precheck (P2-1, P2-2)

**Files:** LocalDataStore / export helpers; systemSettings data section; UT-P2-01..03

- Extend export payload: `{ schemaVersion, buckets?: string[], ... }`
- Import: reject non-JSON / missing version before `importAll`
- UI: multi-select buckets optional (advanced density)

- [ ] Commit: `feat(settings): bucketed export and stronger import precheck`

---

### Task 11: Rollback snapshots + multi-tab + quota bar (P2-3..P2-5)

**Files:** domain `settingsRollback.ts`; storage event listener; status bar UI; UT-P2-04..06

- On successful save of runtime/tool/llm: push snapshot ring buffer N=5 in sessionStorage or local key `settings_rollback_v1`
- `undoLastSettingsSave(partition)` restores
- `window.addEventListener('storage', ...)` sets `externalChangeNotice`
- Quota: if usage ratio ≥ warning threshold show status bar

- [ ] Commit: `feat(settings): save rollback, multi-tab notice, quota warning`

**P2 exit:** §7.3.3 green.

---

### Task 12: Extract domain already started; optional section split (P3)

**Files:** Move large HTML/TS sections only if needed; keep Alpine `settingsPanel` API stable.

- UT-P3-01: full `npm run test:settings` green after move
- Prefer extracting pure functions first (already in domain/) before HTML split
- Commit: `refactor(settings): extract settings domain modules for maintainability`

**P3 exit:** §7.3.4 + full `npm run test:settings`.

---

## Spec Coverage Matrix (plan ↔ Spec)

| Spec area | Tasks |
| --- | --- |
| P0-1 save contracts | Task 2 |
| P0-2 dirty/close | Task 3 |
| P0-3 ConfigCenter | Task 4 |
| P0-4 health | Task 4 |
| P0-5 proxy test | Task 5 |
| P1-0 visual tokens | Task 6 |
| P1-1 / 1b single entry + deep link | Task 7 |
| P1-2..4 density/search/badges | Task 8 |
| P1-5..6 appearance/presets | Task 9 |
| P2 backup HA | Tasks 10–11 |
| P3 maintainability | Task 12 |
| §7 scripts + E2E harness | Task 1 |
| §14 visual | Task 6 (+ later UI tasks follow checklist) |
| §7 closed loop | Every task steps include run + commit |

## Self-Review

1. **Spec coverage:** P0–P3 requirements each map to a task; SS-O10 enforced via Task 1 scripts and per-task tests.  
2. **Placeholders:** No TBD implementation steps; real export names for toolStrategy save must be verified at code time (called out in Task 2).  
3. **Type consistency:** `SettingsOpenOptions`, `SettingsDirtyPartition`, `RuntimePresetId` named consistently across tasks.  
4. **Closed loop:** Each task has failing test → implement → pass → commit; phase exit commands listed.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-25-system-settings-enterprise-hardening.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with executing-plans checkpoints  

**Which approach?**
