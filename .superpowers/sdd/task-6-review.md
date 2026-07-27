# Task 6 Review — Model switch residual-attachment messaging

**Base:** `5a29538ac6c80686a6b2fbc27debb31609aee40f`  
**Head:** `7205e8515c857c6e255a7488c24d2e4d820f4c4c`  
**Verdict:** **Approved**

---

## Spec Compliance

| Constraint / deliverable | Status | Evidence |
|---|---|---|
| Helper `deepChatHasStagedImageAttachments` (Step 1) | **Met** | Exact brief body in `deepChatConfig.ts` ~69–79: shadow root guard; `#file-attachment-container` `childElementCount > 0`; `#file-input` `files.length > 0`; else `false`. |
| Wire model change: pre-capture vision + files | **Met** | `onModelChange` captures `hadVision` / `hadFiles` **before** `sessionState.selectedModel` + `applyDeepChatVisionUploadConfig` (`shellUi.ts` ~201–208). |
| One residual toast `DEEP_CHAT_VISION_COPY.modelSwitch` | **Met** | Single `if (hadVision && !hasVision && hadFiles)` → `showToast(DEEP_CHAT_VISION_COPY.modelSwitch, { type: 'warning' })` (~210–213). Grep: only production call site for `modelSwitch` toast is this path. |
| **No silent clear** of staged attachments | **Met** | Diff adds no strip/input clear, no `files` reset, no attachment-container DOM wipe. Only re-applies vision config (`chat.images` / class / helper). Report and code agree: user must remove staged images themselves. |
| Best-effort non-vision paste (Step 3 optional) | **Met** | Container `paste` listener: skip if missing chat or `is-vision-enabled`; scan `clipboardData.items` for `image/*`; toast `DEEP_CHAT_VISION_COPY.nonVision`; **no** `preventDefault` / block / clear (~220–236). Cleanup via `sessionState.cleanupCallbacks`. |
| Microcopy SSOT | **Met** | Model-switch uses `DEEP_CHAT_VISION_COPY.modelSwitch`; paste uses `DEEP_CHAT_VISION_COPY.nonVision` (brief Step 3 sample hard-coded the Chinese string; implementation correctly prefers SSOT—stricter/better). |
| Approach B only; surgical | **Met** | 2 source files (+ report): `deepChatConfig.ts` +13, `shellUi.ts` +31/−1. No vendor fork, no composer rewrite, no compression/flag/base64 work. Commit message matches brief Step 4. |
| Unit automation for E2 residual | **Out of scope (correct)** | Report: shadow strip / paste not reliable in unit env; manual browser residual documented. Matches brief. |

Overall: Task 6 Steps 1–4 satisfied under the stated constraints (one `modelSwitch` toast path, no attachment clear, best-effort paste, surgical).

---

## Strengths

1. **Ordering is correct** — Vision/files sampled before model assignment and config re-apply; post-check uses updated `is-vision-enabled` so toast only fires on vision → non-vision with residual files.
2. **Single toast path for residual model switch** — One conditional; no duplicate listeners or secondary `modelSwitch` emitters.
3. **No silent clear** — Implementation warns and leaves staged attachments for the user; matches formal “do not clear attachments” constraint.
4. **Paste is truly best-effort** — Warns only; does not cancel paste or mutate clipboard/composer state; cleaned up on session teardown.
5. **Surgical + SSOT** — Optional helper lives next to other deep-chat config helpers; both toasts pull from `DEEP_CHAT_VISION_COPY`.

---

## Issues

### Critical

None.

### Important

None blocking approval.

### Minor

1. **Shadow DOM paste delivery**  
   Listener is on the host `container`, not inside deep-chat shadow. Depending on browser retargeting, paste originating entirely inside shadow may not always surface as a bubbling `paste` on the light-DOM container. Acceptable for optional best-effort Step 3; report already marks manual residual.

2. **Staged detection is structural, not type-filtered**  
   Any children under `#file-attachment-container` or any files on `#file-input` count as “had files.” Matches brief helper exactly; non-image residual (if deep-chat ever allows) would still toast on vision drop—fail-closed for messaging.

3. **`chat.images = false` may interact with deep-chat internals**  
   Task does not clear the strip in app code; vendor may still drop staged UI when images config is disabled. That is outside Approach B control. App-side constraint (no explicit clear) is honored.

4. **No automated test**  
   Correct per brief. Residual risk: wrong shadow selectors if deep-chat upgrades IDs (`#file-attachment-container` / `#file-input`).

5. **Type-check / vitest not re-run in review**  
   Static review of the two-file production diff is sufficient for approve; report verification is manual E2 residual only.

---

## Task quality

**Approved**

Meets Task 6 scope under the stated constraints: one residual toast via `DEEP_CHAT_VISION_COPY.modelSwitch` when leaving vision with staged composer files, no app-side silent attachment clear, optional best-effort non-vision paste toast with SSOT `nonVision` copy, and a surgical Approach B change set. Residual browser/shadow behavior is correctly documented, not oversold.
