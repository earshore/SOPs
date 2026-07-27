# Task 5 Goal Report

**Task:** Composer geometry — submit-only aligner + helper host chrome  
**Spec focus:** submit-only aligner; helper outside card with exact Chinese copy; vision toggle for helper/upload chrome; no dual-primary regression  
**Sources:** `.superpowers/sdd/task-5-brief.md`, `task-5-report.md`, `task-5-review-package.md`, `task-5-test-report.md` + workspace sources  
**HEAD (review package):** `5a29538a` (BASE `d7df779f`)  
**Overall:** **GOALS_MET**  
**Status:** **DONE**

## Checklist

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | **Submit-only aligner** — `alignSubmitButtonLayerToTextInput` never selects / pins `#upload-images-button` | **Pass** | Shared `SUBMIT_INSIDE_END_SELECTOR` + `querySubmitInsideEndButton()` in `composerUi.ts` matches brief Step 1 (stop/submit/loading/disabled + fallback, all with `:not(#upload-images-button)`). Used by aligner, `observeSubmitButtonPin` metadata, `observeSubmitButtonState`, `syncSubmitStopButtonState`, `getSubmitButtonFromPointerEvent`. `getSubmitButtonFromEventPath` filters upload by `id !== 'upload-images-button'` and closest null-out. Aligner writes inline geometry only to the queried submit/stop button; upload remains CSS-only. |
| 2 | **Helper outside card + exact copy** | **Pass** | `syncDeepChatVisionHelper` in `deepChatConfig.ts`: injects `.deep-chat-vision-helper` **after** `#text-input-container` inside shadow `#input` (outside the input card). `textContent = DEEP_CHAT_VISION_COPY.helper` on create and update. SSOT string in `visionAttachments.ts`: `最多 4 张 · 单张 ≤ 5MB · 合计 ≤ 12MB · 仅当轮发送` (formal §6.1 / UI `helper.full`). `aria-hidden="true"`. |
| 3 | **Vision toggle** — show helper/upload chrome only when vision | **Pass** | `applyDeepChatVisionUploadConfig`: `chat.images = resolve…`, `classList.toggle('is-vision-enabled', supportsVision)`, `syncDeepChatVisionHelper(chat, supportsVision)`. Helper removed when `!supportsVision`. Best-effort upload `aria-label` / `title` only when vision on. `shellUi` remount re-applies config immediately + 120ms so shadow `#input` exists. CSS (Task 4): `:host(:not(.is-vision-enabled))` hides upload; helper `display:none` until `:host(.is-vision-enabled)`. |
| 4 | **No dual-primary regression** | **Pass** | Task 5 does not weaken Task 4 dual-primary CSS. Solid/stop paint rules remain `.input-button.inside-end:not(#upload-images-button)`. Aligner no longer pins first generic inside-end (which could be upload) — removes dual-button geometry desync risk (F4). Event-path stop hijack ignores upload. Diff scope: composerUi + deepChatConfig + shellUi only (no style flip to solid upload). |
| 5 | Surgical scope + interfaces | **Pass** | Produces: submit-only aligner contract + `syncDeepChatVisionHelper(chat, supportsVision)`. Consumes `DeepChatElement`, `DEEP_CHAT_VISION_COPY`. Review package: 3 files, +73/−8. No base64 persistence, no compression, no vendor fork. |

## Spec / brief alignment

- **Plan Task 5 Steps 1–3:** Aligner exclusion, helper inject after card, optional upload aria — all present in workspace.
- **Approach B:** No deep-chat vendor fork; helper host chrome in app code; upload position stays CSS-only.
- **Global dual-primary + geometry:** Enforced by prior Task 4 CSS + this task’s submit-only pin; send remains the JS-pinned primary control.

## Gaps

None blocking for Task 5 product goals.

**Residual (accepted; not a goal fail):**

- Helper inject is shadow `#input` (as brief sample), not light-DOM host shell; Task 4 styles already target shadow `.deep-chat-vision-helper` under `:host(.is-vision-enabled)`.
- Helper/aria depend on shadow readiness — mitigated by remount re-apply + 120ms; early configure alone can no-op until `#input` exists.
- Upload aria may be overwritten if deep-chat recreates the button without another `applyDeepChatVisionUploadConfig` pass (report concern; best-effort Step 3).
- No dedicated unit/e2e for aligner/helper in this task (deferred to Task 8 e2e / manual matrix). Smoke: `visionAttachments.test.ts` 17/17 + type-check PASS per implementer/test reports.
- Geometry CSS still lists bare `.inside-end.submit-button` / `.disabled-button` / `.loading-button` without id exclusion (Task 4 residual); upload identity remains `#upload-images-button` + ghost host rules — not introduced by Task 5.

## Verdict

**GOALS_MET** — Task 5 goals for submit-only aligner (exclude `#upload-images-button` at all pin/stop query sites), helper microcopy outside the text-input card with exact `DEEP_CHAT_VISION_COPY.helper`, vision on/off toggle for helper + `is-vision-enabled`, and no dual-primary regression are satisfied at HEAD `5a29538a`.

**Status:** DONE
