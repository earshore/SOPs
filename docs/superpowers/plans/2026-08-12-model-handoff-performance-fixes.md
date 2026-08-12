# Model Scope, Deep Chat Handoff, and AI Analysis Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent application/session model choices from overwriting the system fallback, retain Deep Chat Listing content through Keyword Hunter handoff, and make AI Analysis evidence depth follow the selected performance profile.

**Architecture:** The shared ModelSelect component becomes catalog-only by default, while the host explicitly owns system/application/session persistence. Deep Chat keeps a per-thread model choice but removes page-default model inheritance. AI Analysis derives a single profile from the selected evidence depth and scheduling preference so UI and runtime use the same pair.

**Tech Stack:** TypeScript, Vite, Vitest, Playwright, IndexedDB/LocalDataStore.

---

### Task 1: Stop ModelSelect catalog refresh and application selections from mutating system fallback

**Files:**

- Modify: `src/components/modelSelect/types.ts`
- Modify: `src/components/modelSelect/modelSelectController.ts`
- Modify: `src/components/modelSelect/modelSelectService.ts`
- Modify: `src/modules/app_center/views/keyword_hunter/process/index.ts`
- Test: `src/components/modelSelect/modelSelect.test.ts`
- Test: `tests/unit/keywordHunterProcessModule.test.ts`
- Test: `src/modules/app_center/views/playground/deep-chat/index.test.ts`

- [ ] **Step 1: Write failing scope-isolation tests**

```ts
expect(mocks.setLLMConfig).not.toHaveBeenCalled();
expect(mocks.setToolTargetDefaultModel).not.toHaveBeenCalled();
```

Cover catalog refresh, SEO application selection, and Deep Chat refresh.

- [ ] **Step 2: Run the focused tests to verify RED**

Run: `npx vitest run src/components/modelSelect/modelSelect.test.ts tests/unit/keywordHunterProcessModule.test.ts src/modules/app_center/views/playground/deep-chat/index.test.ts`

Expected: failures that show refresh/selection still write `provider.config.model` or the unrelated target strategy.

- [ ] **Step 3: Make persistence scope explicit and catalog refresh catalog-only**

Use `persist: 'system' | 'app' | 'none'` with default `none`. Only `system` can call `StorageService.setLLMConfig`; only `app` writes its `ToolStrategyTargetId`; `refreshModelCatalog()` updates `models` without changing model/default or active provider. SEO passes `persist: 'app'`; Deep Chat stays `none`.

- [ ] **Step 4: Run the same tests to verify GREEN**

Expected: all focus tests pass and model refresh preserves the pre-existing selected model where it remains available.

### Task 2: Restore the exact three-layer Deep Chat model rule

**Files:**

- Modify: `src/modules/app_center/views/playground/deep-chat/session/pageDefaults.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/session/threadStore.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/types.ts`
- Test: `src/modules/app_center/views/playground/deep-chat/index.test.ts`

- [ ] **Step 1: Write failing tests for new threads and model fallback**

```ts
expect(newThread.model).toBeUndefined();
expect(modelSelect.value).toBe('app-model');
```

Verify new threads do not inherit a page model, while historical threads retain their own valid model and otherwise fall back to `playground-deep-chat` application model before global fallback.

- [ ] **Step 2: Run the focused Deep Chat test to verify RED**

Run: `npx vitest run src/modules/app_center/views/playground/deep-chat/index.test.ts`

Expected: the inherited-page-model assertion fails on current behavior.

- [ ] **Step 3: Remove model from page defaults and preserve session-only model choices**

Do not write page-default model during selection; remove model inheritance from new threads; retain compatibility reading old thread model strings. Keep the request/UI resolver ordering: thread model, tool target model, provider model, first catalog model.

- [ ] **Step 4: Re-run the focused Deep Chat test to verify GREEN**

Expected: history switching restores its session model, a new session follows application/system fallback, and no path writes global config.

### Task 3: Guard Deep Chat Listing handoff durability with a real browser regression

**Files:**

- Modify: `src/modules/app_center/views/playground/deep-chat/session/threadStore.ts` if the test proves navigation can outrun persistence
- Modify: `src/modules/app_center/views/playground/deep-chat/integrations/handoffs.ts` only if needed to await source persistence
- Create or Modify: `tests/e2e/deep-chat-keyword-hunter-handoff.spec.ts`

- [ ] **Step 1: Create a failing browser test around the real handoff UI**

The test must generate a complete Listing with a unique sentinel, click the real push button, assert Keyword Hunter receives the content/keywords, return to Deep Chat, rebuild/reload, and assert the source thread still contains the sentinel. It must also assert a second history thread remains unchanged.

- [ ] **Step 2: Run the single Playwright test to verify RED or document a stable passing baseline**

Run: `npx playwright test tests/e2e/deep-chat-keyword-hunter-handoff.spec.ts --project=chromium`

If the exact real flow is already durable, retain the passing test as the regression gate and do not add speculative persistence changes.

- [ ] **Step 3: Apply the smallest durability fix only if RED reproduces a persistence race**

Add an awaitable thread-store flush before cross-route handoff only when the test demonstrates source content can be lost. Do not clear or rewrite Deep Chat messages during handoff.

- [ ] **Step 4: Re-run the browser test**

Expected: Keyword Hunter gets a copy, returning/reloading preserves the original thread, and unrelated history is intact.

### Task 4: Couple AI Analysis evidence depth to performance settings

**Files:**

- Modify: `src/modules/app_center/views/master_analysis/ai_analysis/components/PerformanceSettings.ts`
- Modify: `src/modules/app_center/views/master_analysis/ai_analysis/components/actions.ts`
- Modify: `src/modules/app_center/views/master_analysis/ai_analysis/services/reasoningPolicy.ts`
- Modify: `src/components/settings/domain/settingsPresets.ts`
- Test: `src/modules/app_center/views/master_analysis/ai_analysis/components/PerformanceSettings.test.ts`
- Test: `src/modules/app_center/views/master_analysis/ai_analysis/services/__tests__/reasoningPolicy.test.ts`

- [ ] **Step 1: Write failing profile-mapping tests**

```ts
expect(resolveMasterAnalysisPreset('speed')).toEqual({
  evidenceDepth: 'fast',
  schedulingPreference: 'speed',
});
expect(resolveMasterAnalysisPreset('recommended')).toEqual({
  evidenceDepth: 'balanced',
  schedulingPreference: 'recommended',
});
expect(resolveMasterAnalysisPreset('reliability')).toEqual({
  evidenceDepth: 'deep',
  schedulingPreference: 'reliability',
});
```

Verify a user-created mixed pair displays as custom rather than silently claiming a preset.

- [ ] **Step 2: Run focused tests to verify RED**

Run: `npx vitest run src/modules/app_center/views/master_analysis/ai_analysis/components/PerformanceSettings.test.ts src/modules/app_center/views/master_analysis/ai_analysis/services/__tests__/reasoningPolicy.test.ts`

Expected: preset mapping and display state failures.

- [ ] **Step 3: Implement the three explicit profiles and correct UI copy**

Map 快速/均衡/深入 to `fast/speed`, `balanced/recommended`, and `deep/reliability`. Preserve manual combinations as 自定义. Remove the false “仅影响本次” wording because this page persists runtime settings.

- [ ] **Step 4: Run the focused tests to verify GREEN**

Expected: profile mapping, capability-clamped reasoning, and user-visible selection state are consistent.

### Task 5: Full verification and review

**Files:**

- Modify only the files above; do not change release/deployment configuration.

- [ ] **Step 1: Review diff scope and formatting**

Run: `git diff --check` and inspect `git diff --stat`.

- [ ] **Step 2: Run project build**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 3: Run production smoke suite**

Run: `npm run test:e2e:smoke`

Expected: Chromium smoke suite passes.

- [ ] **Step 4: Report branch, changed behavior, exact verification, and remaining release action**

Do not publish or deploy unless explicitly authorized.
