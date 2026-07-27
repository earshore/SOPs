# Task 2 Review — handleRequest integration + redaction + attachmentMeta

**Base:** `bfe653970e22703aad95879729efc4a0079035f0`  
**Head:** `b4c8088c91931ca83c80d141254679a0a19e5072`  
**Verdict:** **Approved**

---

## Spec Compliance

| Constraint / deliverable | Status | Evidence |
|---|---|---|
| Never persist base64 / `data:image` in thread / localStorage | **Met** | Success path stores text + `attachmentMeta` only; vision tests assert `JSON.stringify(thread)` has no `data:image`. Persist goes through `normalizeStoredThreadMessages` which keeps count-only meta. |
| `attachmentMeta` M1: `{ count: number }` only | **Met** | `DeepChatAttachmentMeta`, `normalizeAttachmentMeta` returns `{ count: n }` only (strips `src`/names). |
| Display `附 {n} 张图片（原图未保存）` | **Met** | `formatVisionAttachmentMetaLabel` exact string; applied display-only via `withVisionAttachmentMetaDisplay` in `getThreadDisplayMessages`. |
| `redactSensitiveError` strips/redacts `data:image` | **Met** | `redactString` + Error/object/string paths; `uiHooks.test.ts` covers object + Error.message. |
| Dual toast + reject on vision validation failures | **Met (kept)** | Prepare fail still `showToast` + `rejectDeepChatRequest` (`handleRequest.ts` ~221–224). Total-cap integration uses same path. |
| Stamp meta on successful prepare with vision parts | **Met** | `userAttachmentMeta: { count: visionUserParts.length }` on initial + final `saveThreadMessages`; stamped onto newest user row in `buildStoredThreadMessages`. |
| Caps / dual-primary / upload CSS / geometry | **Out of scope** | Not touched (correct for Task 2). |
| Surgical; no UI styles | **Met** | Diff limited to session/request plumbing + tests; no CSS. |
| TDD for pure validation + redaction | **Met (tests present)** | New/extended tests for redaction, normalize, stamp, total-cap. Verified: **19 passed / 0 failed**. Single commit conflates RED/GREEN (process not git-visible). |
| Payload-large best-effort (Step 7b) | **Met** | `looksLikePayloadTooLarge` + vision-only toast/in-chat prefer `DEEP_CHAT_VISION_COPY.payloadLarge`. |
| LLM path not fed display meta suffix as required content | **Met** | `createDeepChatRequestMessages` → `mergeThreadHistoryWithRequest(getActiveThread().messages, …)` uses **raw** stored text; display transform only in `getThreadDisplayMessages` → `chat.history`. |

Overall: Task 2 brief steps 5–8 implemented as specified; global constraints for this task satisfied.

---

## Strengths

1. **Count-only meta end-to-end** — type, normalize (1–4 finite), strip unknown keys, stamp on save, preserve on load, display-only honesty line.
2. **Persistence hygiene** — no image bytes on thread; tests lock “no `data:image` in thread JSON” for success + stamp cases.
3. **Redaction hardening** — full-string `data:image` wipe, long base64 heuristic, Error message/stack, object replacer, string/catch paths.
4. **Correct dual-save meta re-pass** — initial save + final assistant save both pass `userAttachmentMeta` so the user row is not dropped when the assistant settles.
5. **Surgical scope** — only required plumbing (`types`, `threadStore`, `pendingRuntime`) beyond named files; no composer/CSS creep.
6. **LLM isolation** — display append is confined to `getThreadDisplayMessages`; merge/history for the model stays on raw `thread.messages`.
7. **Tests green** — re-ran the three Task 2 suites: 19/19 pass.

---

## Issues

### Critical

None.

### Important

None blocking approval.

### Minor

1. **Total-cap integration test does not assert reject channel**  
   `rejects total over cap with toast and no callLLM` only checks `showToast` + `callLLM` not called. Dual channel is still implemented (`rejectDeepChatRequest`), but the new test does not lock in-chat reject text / `onResponse` the way the non-vision case does.

2. **No unit test for exact display label / `withVisionAttachmentMetaDisplay`**  
   Label string is correct in source (`附 ${count} 张图片（原图未保存）`), but only normalize/preserve are tested—not the display helper or exact Chinese microcopy.

3. **Partial / fail / stop / hydrate rebuilds omit `userAttachmentMeta`**  
   `pendingRuntime` paths (`saveFailedDeepChatResponse`, partial persist, stop, timeout, `applyPendingRequestsToThreadStore`) rebuild via `buildStoredThreadMessages` without re-passing meta. Preservation depends on `findExistingStoredMessage` role+text match after the initial stamp. Normal flow is fine; edge case if match fails would drop meta (brief only required re-pass on the two handleRequest saves).

4. **Redundant double `withVisionAttachmentMetaDisplay` on live pending placeholder path**  
   Applied to `withoutLivePartial` and again around the placeholder array. Harmless (`includes(label)` guard) but slightly noisy.

5. **TDD process not visible in git**  
   One commit contains tests + implementation; report’s RED 5-fail claim is not independently verifiable from history (tests themselves are adequate).

6. **`redactString` trailing `replace` is dead for any string already matching `data:image/`**  
   Early return covers those cases; residual replace is only useful for non-matching strings (effectively no-op for image URLs). Style/clarity only.

---

## Task quality

**Approved**

Implementation matches Task 2 brief and global constraints for redaction, count-only `attachmentMeta`, no base64 persistence, dual validation channel retention, display-only honesty, and surgical scope. Re-verified tests pass. Remaining items are test gaps and residual preservation reliance—not spec violations requiring rework before merge of this task.
