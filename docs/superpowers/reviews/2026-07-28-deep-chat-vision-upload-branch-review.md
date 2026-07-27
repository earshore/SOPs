# Whole-branch review — Deep Chat vision upload UX M1

**Date:** 2026-07-28  
**Branch:** `feature/deep-chat-vision-upload-ux`  
**MERGE_BASE:** `ab40abc1a354ad53bae0022aafea2d69de621c66`  
**HEAD:** `5daece459317fd8014499c6636785687ed244f98`  
**Spec:** [2026-07-27-deep-chat-vision-upload-ux-design.md](../specs/2026-07-27-deep-chat-vision-upload-ux-design.md)  
**Review package:** `.superpowers/sdd/final-review-package.md`  
**Progress roll-up:** `.superpowers/sdd/progress.md`

**Diff scope reviewed:** `src/`, `tests/e2e/deep-chat-send.spec.ts`, `docs/CHANGELOG.md` (17 product files, ~+1089/−188 lines). SDD task reports under `.superpowers/sdd/` are out of product merge surface.

---

## 1. Spec goals O1–O9

| ID | Goal | Assessment | Evidence |
| --- | --- | --- | --- |
| **O1** Discoverable | **Met (best-effort)** | `applyDeepChatVisionUploadConfig` sets `images` + `is-vision-enabled`, injects helper, sets upload aria/title; init re-applies after 120ms for late shadow. Upload button still depends on deep-chat materializing `#upload-images-button`. |
| **O2** Predictable limits | **Met** | `DEEP_CHAT_VISION_COPY.helper` = `最多 4 张 · 单张 ≤ 5MB · 合计 ≤ 12MB · 仅当轮发送`; SSOT constants 4 / 5MB / 12MB. |
| **O3** Send zero-regression | **Met with hard e2e** | Submit-only selector excludes upload; text padding dual-write 108px / 100px mobile; e2e pins send after vision seed + non-vision hide. |
| **O4** Secondary upload | **Met in CSS** | Ghost `#upload-images-button`; all solid/stop rules use `:not(#upload-images-button)`. Dual-primary ban intentional. |
| **O5** Fail-closed safety | **Met** | SVG/mime+ext, bmp, remote http(s), count, per-file, total → Chinese errors; unit + vision integration. |
| **O6** No base64 persist | **Met** | Persist path stamps `attachmentMeta` only; tests assert no `data:image` in thread JSON. |
| **O7** History honesty | **Met** | `attachmentMeta.count` 1–4 normalize; display `附 {n} 张图片（原图未保存）` via `withVisionAttachmentMetaDisplay` (display-only). |
| **O8** Logging safe | **Met** | `redactSensitiveError` → `data:image` / long base64 redaction; unit coverage in `uiHooks.test.ts`. |
| **O9** Test gate | **Mostly met** | Strong unit/integration; e2e hard gates for non-vision hide + send pin; dual-button spacing **honest skip** when vendor button missing (manual E1/V1). |

**Non-goals respected:** no compression, no IndexedDB replay, no Scheme C composer rewrite, no magic-byte deep inspection, no multi-turn re-upload, no vendor fork.

---

## 2. Global constraints

| Constraint | Status | Notes |
| --- | --- | --- |
| No base64 persist | **Pass** | `handleRequest` saves text + optional `{ count }` only; vision parts live only on `callLLM` path. |
| Whitelist (not `image/*`) | **Pass** | Normative `DEEP_CHAT_VISION_ACCEPTED_FORMATS`; unit pins exact string. |
| 12MB total | **Pass** | `DEEP_CHAT_VISION_MAX_TOTAL_BYTES`; size check on decoded File.size / data-URL estimate; toast on over-cap. |
| Ghost / dual-primary ban | **Pass** | Styles + submit-only aligner/e2e selectors. |
| Helper | **Pass** | Host-injected `.deep-chat-vision-helper` after `#text-input-container` inside shadow `#input`; vision-only show. |
| Meta count-only | **Pass** | `normalizeAttachmentMeta` drops invalid / non-1–4; strips unknown keys by reconstructing `{ count }`. |
| Redaction | **Pass** | Message/stack/string/object string fields. |
| Remote URL reject | **Pass** | Fail-closed (was previously accepted). |

---

## 3. Security / privacy

**Strengths**

- SVG blocked by mime and extension (even when mime spoofed as `image/png`).
- Remote `http(s)` image src rejected — no SSRF-style “fetch remote into model” via chat body.
- No filenames or image bytes in `attachmentMeta` (privacy F21).
- Logs redact vision data URLs and long base64 blobs.
- Accept list removes bare `image/*` (G9 closed at config + resolve).

**Residual (accepted for M1, not merge blockers)**

- No magic-byte / polyglot inspection (explicit non-goal).
- Caps are **decoded** size; wire base64 ≈ 4/3 can still 413 — mitigated by `payloadLarge` toast mapping when error text matches size patterns.
- Staging still holds bytes in deep-chat shadow until send (library behavior); only persistence is constrained.
- Model switch leaves staged files and warns once (does not force-clear) — product choice per G6.

---

## 4. Test honesty

**Good**

- Prior dual-button soft-pass theater removed (`5daece45`): if `#upload-images-button` never appears under mock vision seed, test **skips with explicit manual matrix note**, not a green false positive.
- Hard e2e gates remain green-critical: non-vision upload hidden + send pin; send pin after vision model seed.
- Units cover SVG, bmp, remote, total cap, whitelist string, meta stamp, no-base64 thread, redaction.
- Integration: total over cap → toast, no `callLLM`; meta count without base64.

**Caveats (not soft-pass)**

- Dual-button **spacing/color** automation is conditional; CI may skip that case → O9 dual-button geometry is **manual residual**, honestly documented in progress + e2e comments.
- `visionAttachments.test.ts` still has some duplicate remote-reject cases (pre-existing minor from T1 roll-up) — noise, not false green.
- One e2e empty-SSE copy assertion updated to match `llmService` empty-body message — slight surface outside pure vision UX, but keeps send suite honest rather than masking product copy drift.

---

## 5. Scope creep / YAGNI

**In scope (Approach B)**

- `visionAttachments` SSOT + Chinese copy  
- Config/styles/helper/ghost  
- Submit-only aligner  
- Meta + display honesty  
- Redaction  
- Model-switch toast + non-vision paste toast  
- 413-ish friendly mapping when vision was used  
- CHANGELOG Unreleased line  

**Acceptable micro-refactors**

- `buildAssistantStoredMessage` / `paintSettledGenerationChrome` / `reportDeepChatRequestFailure` extractions while wiring meta and payload-large — small, same-file, not new product surface.

**Not observed**

- No custom attachment strip framework, no cloud storage, no flag service, no vendor fork.

---

## 6. Architecture fit

Module boundaries match the formal spec map:

| Unit | Role in branch |
| --- | --- |
| `visionAttachments.ts` | Caps, whitelist, resolve API, copy SSOT |
| `handleRequest.ts` | Fail toast, stamp meta, payload-large path |
| `conversationContext.ts` | Meta type, normalize, display label |
| `pendingRuntime.ts` | Display-only honesty wrap |
| `uiHooks.ts` | Redaction only |
| `deepChatConfig.ts` | images config, helper, staged-file probe |
| `deepChatStyles.ts` | Ghost, dual-primary exclusion, strip polish, helper |
| `composerUi.ts` | Submit-only button queries |
| `shellUi.ts` | Model change + paste honesty + delayed re-apply |

DI / EventBus / design-token rules: vision work stays in deep-chat playground module; no new global event debt; styles use existing `--deep-chat-*` tokens.

---

## Strengths

1. **Clear Approach B delivery** — library `images` + `auxiliaryStyle` + pure request validation; no composer rewrite.
2. **Hard security upgrades** — SVG/bmp/remote rejected; total 12MB; whitelist exact string tested.
3. **Persistence honesty** — count-only meta + display line; strong no-base64 assertions on the real request path.
4. **Send geometry discipline** — upload never owns solid primary styles; aligner and e2e consistently exclude `#upload-images-button`.
5. **Copy SSOT** — limits and toasts centralized in `DEEP_CHAT_VISION_COPY`.
6. **Test culture fix on T7** — honest skip instead of soft-pass for dual-button; hard gates preserved.
7. **Task ledger complete** T1–T8 with CHANGELOG note.

---

## Critical issues

**None** for merge of M1 as specified.

---

## Important issues

**None blocking.** The following are **Important residuals** already acknowledged in plan/progress; ship with eyes open:

1. **Dual-button e2e may skip in CI** — O4 CSS is in-tree; automated dual geometry is not guaranteed under mock seed. Manual matrix E1/V1 remains the proof for upload+send spacing when the vendor button is flaky.
2. **Wire size vs decoded 12MB** — residual 413 risk; `payloadLarge` mapping is best-effort regex, not provider-complete.
3. **Helper / upload aria best-effort** — depends on shadow timing; delayed re-apply helps but is not a MutationObserver guarantee (M1 acceptable).

---

## Minor issues

From progress roll-up + this pass (non-blocking):

1. Duplicate remote-URL unit cases; soft tooltip optional assert if library types omit `button.tooltip`.
2. Total-cap unit path relies on synthetic data URLs (fine); no separate display-label pure unit beyond context tests.
3. Attachment strip CSS selectors are best-effort against vendor class names.
4. Non-vision paste toast is host-level best-effort; no dedicated unit for shell toast.
5. `redactString` over-redacts entire strings that merely *contain* `data:image` (security-favoring; may lose surrounding log context).
6. Empty-SSE e2e string update is adjacent product coupling — document if empty-body copy changes again.

---

## Merge readiness

| Check | Result |
| --- | --- |
| Goals O1–O8 | Met |
| O9 | Met with documented dual-button manual residual |
| Global constraints | Met |
| Security/privacy M1 bar | Met |
| Test honesty | Met (soft-pass removed) |
| Scope / YAGNI | Clean |
| CHANGELOG | Unreleased note present |

---

## Verdict

**Ready to merge**

M1 Approach B is complete against the formal design: fail-closed vision attach, no base64 history, count-only honesty, ghost secondary control, helper limits, redaction, and send-geometry hard gates. Dual-button automated geometry remains a **documented manual residual**, not a hidden soft pass.

---

## Residual accepted risks

1. Gateway/provider may still 413 when ~12MB decoded expands on the wire (~16MB JSON).  
2. Multi-turn has no pixel memory; only count honesty line.  
3. No client compression / near-limit upload disable.  
4. Staging bytes live in deep-chat DOM until send (library).  
5. Dual-button visual spacing may not be CI-enforced when `#upload-images-button` does not materialize under mock.  
6. Model switch does not auto-clear staged images (warn once).  
7. No magic-byte validation of file content.  

---

## Reviewer

Whole-branch final review (Grok Build subagent), 2026-07-28.  
Status: **DONE**.
