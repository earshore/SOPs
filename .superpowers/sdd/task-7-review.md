# Task 7 Review — Unit/integration green + E2E dual-button pins + manual matrix

**Base:** `7205e8515c857c6e255a7488c24d2e4d820f4c4c`  
**Head:** `f0efc731ba97c42b2d9e7745df641b89b60f9de7`  
**Verdict:** **Needs fixes**

---

## Spec Compliance

| Constraint / deliverable | Status | Evidence |
|---|---|---|
| Step 1: deep-chat unit suite green | **Met** | Re-run: **190 passed** / 19 files. Report matches. |
| Step 1: `type-check` | **Met** | Re-run: `tsc --noEmit` PASS. |
| Step 1: `lint:warning-gate` | **Met** | Re-run: `0/0 warning(s)`. Production extracts (`handleRequest`, `visionAttachments`, `conversationContext`) keep complexity under thresholds without behavior change (pure extract). |
| Fallout fix: submit selector excludes upload | **Met** | E2E + production use `.input-button.inside-end:not(#upload-images-button)`. All prior bare `.input-button.inside-end` send queries in `deep-chat-send.spec.ts` updated. |
| Step 2: `getDualButtonGeometry` helper | **Met (shape)** | Matches brief: send/upload rects, `uploadVisible`, `gap`, `bottomDelta`, `uploadBg`/`sendBg`, `sendRightGap` vs text container. Also treats `visibility: hidden` as not visible (stricter than brief sample). |
| Step 2: dual-button vision pin when fixture supports | **Not met in practice** | Test exists, but **always soft-skips**: Playwright JSON annotations show `manual-fallback` — `#upload-images-button` never materializes with `gpt-5` seed. Dual-button gap/bottom/bg assertions never execute. |
| Soft-skip keep send pin mandatory | **Met** | On soft path: `isSubmitButtonPinnedToTextInput` still required. Brief explicitly allows manual E1/V1 when vision fixture is unreliable. |
| Non-vision hide + send pin | **Met** | `hides vision upload for non-vision mock model and pins send only` re-run **PASS** (`!uploadVisible` + send right gap 11±2). |
| Step 3: send e2e suite | **Met (green)** | Re-run: **18 passed** chromium workers=1 (~2.2m). Note: vision dual-button case is green only via soft-skip. |
| Step 4: manual matrix E1–E13 | **Met (documented)** | Report table maps E1–E13 to automated residual vs pending human; honest that most E3–E12 are human. |
| Step 5: commit message | **Met** | `test(deep-chat): pin vision upload spacing and keep send geometry green`. |
| No feature scope creep | **Met** | No new product behavior, no compress/flag/vendor fork. Prod edits = lint extract + single-selector jsdom fallout + e2e assertion copy for empty-stream. |
| Report accuracy on dual-button | **Miss** | Report claims vision dual-button **PASS (did not need manual fallback)** — false; re-run always annotates `manual-fallback`. |

Overall: unit/type/lint gates and send-geometry regression pins are solid. The **headline dual-button vision e2e does not actually pin dual-button geometry** in this environment, and the report oversells that result. That fails the dual-button e2e quality bar for Task 7.

---

## Strengths

1. **Core gates re-verified green** — 190 unit, type-check, lint 0/0, 18 e2e send specs on chromium.
2. **Send/upload selector hygiene is thorough** — Shared `SEND_INSIDE_END_SELECTOR` wired through pin/visual helpers and every click/stop path; prevents upload hijacking send geometry after Task 4 dual-button.
3. **Non-vision path is a real automated pin** — Upload hidden + send 11px gap is asserted without soft-skip.
4. **Production changes stay non-feature** — Helper extracts preserve logic; no new UX/API; Approach B constraints intact.
5. **Manual matrix is useful** — Clear split of what unit covers vs human residual (E3–E12, dark, reduced-motion vision thrash).

---

## Issues

### Critical

None (no security/data-loss regression; soft-skip is brief-allowed, not a silent false product claim in code).

### Important

1. **Dual-button vision e2e never asserts dual-button geometry**  
   - Seed: rewrite `llm_playwright_mock.model` → `gpt-5` after goto, then `#deep-chat-refresh-config`.  
   - Capability registry: `gpt-5` **does** resolve `supportsVision: true` (verified via `resolveModelCapability`).  
   - Runtime: `#upload-images-button` still not visible within 8s → `manual-fallback` annotation → pass on send pin only.  
   - Re-run evidence: Playwright JSON annotations always include  
     `Vision upload button not materialised with gpt-5 mock seed — dual-button pin is manual E1/V1`.  
   - **Fix required (pick one):**  
     a. Make vision fixture reliable (select model via UI / re-apply `applyDeepChatVisionUploadConfig` after model change / remount chat so deep-chat materializes upload under `is-vision-enabled`), **then** hard-assert gap 8±2, bottom ≤2, `uploadBg !== sendBg`, send gap 11±2; **or**  
     b. Drop the pretend poll: `test.skip` / `test.fix` with explicit reason and matrix E1/V1 as the only dual-button gate — do not burn 8s soft-timeout every CI run while claiming dual-button automation.

2. **Report oversells dual-button automation**  
   - Report: “Vision model (`gpt-5` seed): … **PASS** (did not need manual fallback)”.  
   - Reality: always needs manual fallback.  
   - **Fix:** Correct Task 7 report (and any PR body) to state soft-skip / manual E1/V1 until (1a) lands.

3. **Gate completeness gap for dual-button**  
   - Unit/type/lint/send pins: complete.  
   - Dual-button secondary spacing + ghost contrast: **not CI-enforced** today.  
   - Acceptable only if explicitly manual; not acceptable as “automated pin covered” for E1 without a true green path.

### Minor

1. **Dead `addInitScript` no-op** in vision dual-button test (~1575–1577) — remove or replace with a real pre-navigation seed.

2. **Selector simplification vs Task 5 multi-branch**  
   - Task 5 approved five-arm `SUBMIT_INSIDE_END_SELECTOR`; Task 7 collapses to one arm for jsdom ShadowRoot. Unit stop tests restored; DOM-order risk low while only one non-upload inside-end exists. Prefer a short comment or unit that pins first-match ≠ `#upload-images-button` when both nodes exist.

3. **`uploadBg !== sendBg` is a weak secondary check** once dual-button is real — acceptable per brief sample; later could pin ghost alpha / token if flaky.

4. **Soft-skip burns ~8–16s** on every full send suite run without adding dual-button signal.

---

## Focus areas (requested)

### Test gate completeness

| Gate | Status |
|---|---|
| `npx vitest run …/deep-chat` | PASS 190 (re-run) |
| `npm run type-check` | PASS (re-run) |
| `npm run lint:warning-gate` | PASS 0/0 (re-run) |
| `npx playwright test tests/e2e/deep-chat-send.spec.ts --project=chromium --workers=1` | 18 PASS (re-run); vision dual-button via soft-skip only |
| Manual E1–E13 matrix | Documented; mostly pending human |

**Incomplete relative to Task 7 intent:** automated dual-button spacing/secondary pin is not a real gate.

### No scope creep into features

**OK.** Diff touches report + e2e + three request/session files (lint extract) + `composerUi` selector fallout. No new vision product behavior, no CHANGELOG (Task 8), no compression/flags/vendor fork.

### Dual-button e2e quality

**Needs fixes.** Helper and non-vision hide pin are good. Vision dual-button test is a long soft-pass that never measures gap/bottom/bg; report incorrectly claims full automated success.

---

## Task quality

**Needs fixes**

Ship criteria for re-approval:

1. Either hard-green dual-button geometry with a reliable vision seed **or** honest skip + matrix-only dual-button (no false soft-pass theater).  
2. Correct `task-7-report.md` dual-button / E1 claims to match reality.  
3. Keep existing send-pin and non-vision hide pins green (already good).

Until then, unit/type/lint/send regression are fine to rely on; **do not treat dual-button secondary spacing as CI-proven**.
