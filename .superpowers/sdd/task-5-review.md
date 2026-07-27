# Task 5 Review — Composer geometry (submit-only aligner + helper host chrome)

**Base:** `d7df779f02a5cc08195aa7e7cc4a5b67e493c447`  
**Head:** `5a29538ac6c80686a6b2fbc27debb31609aee40f`  
**Verdict:** **Approved**

---

## Spec Compliance

| Constraint / deliverable | Status | Evidence |
|---|---|---|
| `alignSubmitButtonLayerToTextInput` submit/stop only | **Met** | Bare `.input-button.inside-end` replaced by shared `SUBMIT_INSIDE_END_SELECTOR` + `querySubmitInsideEndButton()`; selector matches brief Step 1 exactly, including all five arms with `:not(#upload-images-button)` (`composerUi.ts` ~434–450). Aligner writes pin styles only to the resolved submit button, never `#upload-images-button`. |
| Same exclusion on pin/state/stop call sites | **Met** | `observeSubmitButtonPin` realign aria path, `observeSubmitButtonState`, `syncSubmitStopButtonState`, `getSubmitButtonFromPointerEvent` all use `querySubmitInsideEndButton`. |
| Event-path submit resolution excludes upload | **Met** (beyond brief minimum) | `getSubmitButtonFromEventPath`: path filter `target.id !== 'upload-images-button'`; closest returns `null` if id is upload (~704–725). Prevents upload click hijack as stop/send. |
| Helper **outside** card | **Met** | `syncDeepChatVisionHelper` inserts `.deep-chat-vision-helper` after `#text-input-container` inside `#input` (sibling of card, not child) (`deepChatConfig.ts` ~89–95). |
| `COPY.helper` exact | **Met** | `helper.textContent = DEEP_CHAT_VISION_COPY.helper` on create and update; SSOT string is `最多 4 张 · 单张 ≤ 5MB · 合计 ≤ 12MB · 仅当轮发送` (`visionAttachments.ts` ~35). No hard-coded alternate microcopy. |
| Helper vision-gated remove | **Met** | `!supportsVision` → `helper?.remove()` and return (~80–82). |
| Helper wired from vision config | **Met** | `applyDeepChatVisionUploadConfig` calls `syncDeepChatVisionHelper` after images config + `is-vision-enabled` toggle (~57–59). |
| Aria on upload (best-effort Step 3) | **Met** | Sets `aria-label` / `title` from `DEEP_CHAT_VISION_COPY.uploadAria` / `uploadTooltip` when vision on and button present (~61–65). |
| Shadow timing remount re-apply | **Met** (allowed shell path) | `shellUi` `initDeepChat` re-calls `applyDeepChatVisionUploadConfig` immediately + 120ms with chat identity guard (~1094–1100). Brief allowed helper inject via `deepChatConfig` or `shellUi`. |
| Surgical edits | **Met** | 3 files, 73+/8−; no vendor fork, no composer rewrite, no compression/flag/base64 work. Commit message matches brief Step 5. |
| Unit smoke + type-check | **Claimed PASS** | Report: visionAttachments 17 passed; `npm run type-check` PASS. Not re-run in this review. |
| Dedicated aligner/helper unit/e2e | **Out of scope (correct)** | Brief: optional unit if present, else e2e Task 8. |

Overall: Task 5 Steps 1–3 and 5 are satisfied. Submit-only aligner is centralized; helper DOM placement and copy SSOT match the formal constraints; remount re-apply is a minimal shell chrome fix for shadow readiness.

---

## Strengths

1. **Submit-only selector is exact and shared** — One `SUBMIT_INSIDE_END_SELECTOR` / `querySubmitInsideEndButton` used by aligner and all stop/aria/pointer paths; no residual production bare `.input-button.inside-end` query that could pin or label upload as send.
2. **Helper placement matches “outside card” contract** — Sibling after `#text-input-container` inside `#input`; styles from Task 4 `.deep-chat-vision-helper` can apply under `:host(.is-vision-enabled)`.
3. **Exact microcopy via SSOT** — Uses `DEEP_CHAT_VISION_COPY.helper` only; no duplicated Chinese string in config/UI.
4. **Surgical + defensive** — Event-path exclusion and remount 120ms re-apply are small, on-scope hardening without expanding Task 5 into CSS or request pipeline work.
5. **Honest report** — Notes shadow timing dependency, possible deep-chat aria overwrite, and deferred e2e—none oversold as fully browser-verified.

---

## Issues

### Critical

None.

### Important

None blocking approval.

### Minor

1. **Upload aria best-effort may be overwritten**  
   Deep-chat can recreate `#upload-images-button` after config without another `applyDeepChatVisionUploadConfig` pass. Report already flags this; remount + model-switch re-apply covers typical paths. Not a brief miss (Step 3 is optional best-effort).

2. **Helper search is shadow-global**  
   `shadowRoot.querySelector('.deep-chat-vision-helper')` is not scoped under `#input`. Fine while only one helper exists; if deep-chat ever clones `#input`, prefer `input.querySelector(...)` later. Non-blocking.

3. **No dedicated unit/e2e for aligner/helper**  
   Correct per brief (Task 8). Residual risk: DOM order of multiple `.inside-end` nodes, helper insert when `#text-input-container` is missing (function returns early if `#input` missing; if card missing, appends to `#input` — still outside card).

4. **Type-check / vitest not re-run in review**  
   Relied on implementer report; static review of the three-file diff is sufficient for approve.

---

## Task quality

**Approved**

Meets Task 5 scope under the stated constraints: `alignSubmitButtonLayerToTextInput` is submit-only (shared selector + call-site exclusion), helper chrome is outside the text-input card, microcopy is exactly `DEEP_CHAT_VISION_COPY.helper`, and the change set is surgical. Residual items (aria overwrite, e2e) are correctly deferred or non-blocking.
