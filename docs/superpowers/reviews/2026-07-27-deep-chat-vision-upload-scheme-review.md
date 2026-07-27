# Deep Chat Vision Upload — Scheme Review

**Date:** 2026-07-27  
**Reviewer role:** Principal engineer + product reviewer (enterprise production readiness)  
**Inputs:**
- [UX design draft](../specs/2026-07-27-deep-chat-vision-upload-ux-design-draft.md)
- [UI design addendum](../specs/2026-07-27-deep-chat-vision-upload-ui-design.md)
- Implementation spot-check (read-only): `visionAttachments.ts`, `handleRequest.ts`, `deepChatConfig.ts`, `deepChatStyles.ts` (submit + upload), `PRODUCT_PRINCIPLES.md`, `SECURITY_PLAYBOOK.md`, related types/tests/shell aligner

**Status of package:** draft + UI design (pre formal spec)  
**Verdict:** **Go-with-fixes**

---

## Executive summary

The package is **directionally production-ready**: Approach B (config + request hardening + token styles, no deep-chat fork), images-only scope, fail-closed vision gate, and explicit ban on base64 thread persistence all match product principles and the current architecture.

It is **not** a clean Go. Implementation reality still allows SVG / bare `image/*`, has **no total payload cap**, and the existing send-button CSS/aligner will almost certainly paint the upload control as a second primary or mis-pin geometry unless formal spec locks the dual-button contract. Several M1 items (history `attachmentMeta`, non-vision paste toast, model-switch residual-attachment toast) need schema/hook contracts that are still underspecified.

**Recommendation:** merge draft + UI into a formal spec **after** addressing must-fix items below (especially security whitelist, total cap semantics, dual-button CSS/aligner, GIF wording, and a slimmed M1 meta strategy). Do not implement until formal spec locks these.

| Gate | Result |
| --- | --- |
| Scope discipline | Pass (with GIF wording clarification) |
| Draft ↔ UI consistency | Pass if UI wins open layout/copy decisions |
| Security / privacy | **Conditional** — SVG + logging gaps block as-is |
| Reliability | **Conditional** — total cap + wire expansion + model switch |
| A11y / i18n | Pass for M1 Chinese internal tool |
| Testability | Pass with explicit new cases |
| Implementability (no rewrite) | **Conditional** — dual-button geometry risk |
| Enterprise ops | Acceptable with Pages rollback; no flag needed if risk accepted |
| YAGNI | Mostly clean; watch `attachmentMeta` + optional compression |

---

## Strengths

1. **Correct architecture choice (方案 B)** — avoids Composer rewrite; reuses existing `resolveDeepChatVisionUserParts` / `applyDeepChatVisionUploadConfig` / `is-vision-enabled` dual-track.
2. **Hard product locks already aligned** — no cloud storage, no base64 persist, non-vision hide (not grey fake affordance), pure-image send allowed with `[图片]` placeholder.
3. **UI design is implementable** — concrete geometry (36/8/55/108), microcopy matrix, state tables, conflict resolution with send polish, visual QA matrix.
4. **Security awareness is explicit** — SVG ban, no data URL in storage, helper honesty on ephemerality.
5. **Existing tests are a good base** — `visionAttachments.test.ts` + `handleRequest.vision.test.ts` already assert non-vision reject, count/size fail-closed, and no `data:image` in thread serialization.
6. **YAGNI mostly held** — PDF/camera/mic/cloud/IndexedDB/scheme C deferred; client compress = M2.
7. **Principles fit** — tool-first, local-data honesty, few modals, shared toast, token colors.

---

## Findings table

| ID | Severity | Area | Description | Recommended fix | Blocks M1? |
| --- | --- | --- | --- | --- | --- |
| F1 | **Critical** | Security | **SVG still allowed today.** `isImageMime` treats any `image/*` as OK and extension list includes `svg`; `acceptedFormats: 'image/*'`. Design correctly requires ban, but formal spec must treat this as **M1 P0 code**, not polish. SVG as attachment/data URL is XSS surface if deep-chat or history ever renders it. | Whitelist MIME + extension dual-check; reject `image/svg+xml` and `.svg` before FileReader; update `resolveDeepChatImagesConfig`; unit tests for SVG + bmp + unknown. | **Yes** |
| F2 | **Critical** | Reliability | **No total payload cap in code.** Draft/UI set 12MB decoded total; 4×5MB can still blow gateway/timeouts (G2). | Add `DEEP_CHAT_VISION_MAX_TOTAL_BYTES = 12 * 1024 * 1024`; fail-closed before/while building parts; SSOT with helper/toast strings; unit + integration tests. | **Yes** |
| F3 | **Critical** | UI / implementability | **Upload will inherit send solid-accent rules.** `.input-button.inside-end` / `.inside-end.input-button` force accent fill, hover, stop selectors. Upload is also an inside-end control in deep-chat. UI flags C4 but formal spec must require `:not(#upload-images-button)` (or higher-specificity ghost block) as **acceptance**, not tip. | Lock CSS contract in formal spec + e2e visual/class assertions: upload never solid accent; stop remains rightmost. | **Yes** (visual/regression) |
| F4 | **Important** | Implementability | **`alignSubmitButtonLayerToTextInput` pins a single `.input-button.inside-end`.** First match may be upload or submit depending on DOM order; only one button gets JS bottom pin. Dual-button layout can desync on multi-line / skill dock / resize. | Spec must require aligner targets **submit/stop only** (`#submit` path / `.submit-button` / exclude `#upload-images-button`). Upload position CSS-only; extend e2e spacing pins. | **Yes** |
| F5 | **Important** | Scope wording | **Out-of-scope lists “GIF” while Q5/UI allow `image/gif` files** (no separate GIF button). True wording conflict, not intentional product flip. | Formal spec: out-of-scope = **GIF entry / `chat.gifs`**, not static GIF as image type. Keep `image/gif` in accept whitelist. | No (docs only) |
| F6 | **Important** | Security / reliability | **HTTP(S) image `src` skips size estimation** (existing test locks this). Bypass of 5MB/12MB if deep-chat ever supplies remote URLs; also SSRF/exfil risk via model gateway fetching attacker URL (BYOK gateway dependent). | M1: product path = local File only; **reject non-data, non-blob remote URLs** *or* document residual risk and cap count only. Prefer reject remote in M1 for predictability. | **Yes** if remote can appear in body; else document + test “no remote” |
| F7 | **Important** | Security / ops | **`redactSensitiveError` does not redact `data:image…` / base64 blobs.** Logs on vision failure can dump huge sensitive payloads (screenshot PII) to console. | Extend redaction: strip/truncate values matching `data:image` / long base64; never log `visionUserParts` raw. Add unit test. | **Yes** (logging) |
| F8 | **Important** | Reliability | **12MB is decoded bytes; wire size ≈ 4/3** → ~16MB base64 JSON. Gateway 413/timeouts may still happen; no user-facing mapping for provider 413/payload-too-large. | Spec: state decoded vs wire; keep 12MB or lower to ~8–10MB if known gateway limits; map common LLM size errors to toast (`图片过大或网关拒绝，请减少张数或压缩`). | No for launch if toast generic exists; **yes** for formal AC clarity |
| F9 | **Important** | Product honesty / multi-turn | History honesty is good, but **no in-product cue after multi-turn that pixels were not re-sent**. Users may assume “model still sees the screenshot” when only text/`[图片]` remains. | M1 minimal: history meta line is enough **if shipped**. If meta deferred, add one-line empty-state or first-reply helper is overkill — then **require** meta or accept residual confusion in risks. | Depends (see F10) |
| F10 | **Important** | Scope / implementability | **M1 “轻量 attachmentMeta” touches thread types, `saveThreadMessages`, history render, storage migration.** `DeepChatMessage` has no meta field today. Risk of scope creep and storage bugs for a secondary honesty feature. | Formal spec options: **(A)** M1: only change user text to include meta suffix when pure image / when files present (no schema); **(B)** optional typed `attachmentMeta` with normalize/truncate in threadStore; **(C)** defer meta to M2, keep `[图片]` only + helper honesty. Prefer **A or C** for M1 velocity. | Blocks only if left ambiguous |
| F11 | **Important** | Reliability / UX | **Model switch + residual attachments:** hide upload when `!supportsVision` but do not clear attachments; toast once. Underspecified: how to detect “composer still has files”; whether deep-chat keeps files when `images=false`; double toast on send. | Spec detection strategy (onInput files / shadow query / flag on last add). One toast on switch; send still fail-closed. Integration test with mock files + model flip. | **Yes** for behavior lock |
| F12 | **Important** | Reliability / UX | **Non-vision paste/drag toast** may be unreachable if library ignores files when `images=false`. | Spike in formal plan: verify deep-chat behavior; if no event, host-level paste/drop on shell **or** demote to M2 with documented gap. Do not claim E2 without proven hook. | Blocks E2 AC if claimed in M1 |
| F13 | **Important** | UX consistency | **Validation reject = toast + in-chat `请求失败：…`** via `rejectDeepChatRequest`. UI matrix emphasizes toast; dual channel can feel like chat pollution / “少打断” tension. | Spec: keep both (document) **or** toast-only for validation (prefer toast + silent reject if library allows). Avoid saving failed validation as thread messages (already true if prepare returns null — lock this in AC). | No if documented |
| F14 | **Important** | Test holes | Planned tests miss: total cap, SVG, whitelist config string, remote URL policy, redaction, dual-button e2e, model-switch toast, meta no-`data:` serialization, aligner regression with skill dock + 4 thumbs. | Formal test plan checklist in § below; gate PR on unit + vision integration + send e2e extension. | **Yes** for new logic |
| F15 | **Important** | Early validation | G5 only half-fixed in M1 (send-path full validate; add-time optional). Users can stage 4× large images then fail on send for **total** cap. | Accept as M1 with helper visibility; M2 onInput. Optionally compute running total on send only with clear toast (already planned). | No |
| F16 | **Minor** | Draft ↔ UI | Draft §5.1 helper **inside** card; UI U-Q2 **outside** card (recommended). Not a product conflict if precedence = UI. | Formal spec adopts UI placement. | No |
| F17 | **Minor** | Draft ↔ UI | Draft helper long form includes “不写入本机会话”; UI `helper.full` shortens to “仅当轮发送”. Prefer UI short helper; optional longer title/tooltip if needed. | Lock UI §6 strings as SSOT. | No |
| F18 | **Minor** | A11y | Delete control hot area ≥28–32px vs upload ≥44; ACCESSIBILITY main buttons ≥40–44. Acceptable for overlay delete if name exists; document exception. | Spec note: delete overlay exception; prefer 32px. | No |
| F19 | **Minor** | A11y | Focus ring for DT toggles still uses purple `rgba(124, 58, 237, …)` while upload/send use accent RGB — pre-existing debt, not introduced; don’t expand in M1. | Out of scope mention only. | No |
| F20 | **Minor** | Security | **MIME spoofing** (`.png` + wrong bytes / SVG polyglot) not addressed. Browser + model may still choke; XSS mainly if rendered as SVG/HTML. | M1: extension+MIME whitelist enough; optional magic-byte check M2. | No |
| F21 | **Minor** | Privacy | `attachmentMeta.names` could store screenshot filenames (ASIN, order ids). | If meta ships: store **count only** in M1; names optional truncated, never full path. | No |
| F22 | **Minor** | Enterprise ops | No feature flag / kill switch for vision. Rollback = Pages previous deploy. Acceptable for internal BYOK tool; residual: can’t disable vision without redeploy. | Document rollback in plan; optional localStorage kill only if ops demand (YAGNI default: no). | No |
| F23 | **Minor** | Observability | Toasts-only; no structured metric for reject reason rates / 413. Fine for M1 internal. | M2: optional debug counters behind existing debug interface. | No |
| F24 | **Minor** | Copy SSOT | Existing errors (`不支持的文件类型：{name}`) differ from UI matrix (`请使用 PNG、JPEG…` / dedicated SVG string). | Single microcopy module or constants next to vision constants; snapshot tests. | No (but do before code freeze) |
| F25 | **Minor** | Product honesty | Helper does not say images go to **user-configured LLM gateway** (BYOK). Local storage honesty covered; egress honesty soft. | Optional M2 one clause or settings-adjacent; not M1 block. | No |
| F26 | **Nit** | YAGNI | Draft mentions optional client downscale / scheme C / IndexedDB as later — good. Keep out of M1 plan tasks except one-line defer. | — | No |
| F27 | **Nit** | UI | `color-mix` for active state may need fallback for older Electron/WebView if used in enterprise shells. | Prefer existing token vars already used by send. | No |
| F28 | **Nit** | Draft architecture diagram | Shows “optional client downscale (P1 optional)” inside M1 path box — slightly confusing. | Diagram label “M2 only”. | No |
| F29 | **Important** | Reliability | **Pending generation:** UI says upload disabled; code path has pending lock on send. Need confirm deep-chat disables upload during stream; if not, CSS `pointer-events: none` under `:host(.is-pending-generation)`. | Spec CSS/host class contract; manual E8. | Soft block |
| F30 | **Minor** | BMP | Extension allowlist today includes `bmp`; product whitelist does not. | Reject bmp with type toast. | With F1 |

---

## Resolved decisions to lock into formal spec (merge draft + UI)

Prefer **UI design** where draft left OR options; below is the merged lock list.

| # | Decision | Lock |
| --- | --- | --- |
| D1 | Approach | **B only** — no deep-chat source fork, no scheme C in M1 |
| D2 | Scope | Images vision only; no PDF/Office/camera/mic/cloud/cross-session original replay |
| D3 | GIF | **No** `chat.gifs` entry; **yes** `image/gif` in file accept list |
| D4 | Non-vision entry | **Hidden** upload + helper; no grey fake button; explain only on attempt (if hook exists) |
| D5 | Caps | 4 files · 5MB/file · **12MB total decoded** · SSOT constants in `visionAttachments.ts` |
| D6 | Accept | Explicit whitelist: png/jpeg/jpg/webp/gif (+ extensions); **block SVG, bmp, bare `image/*`** |
| D7 | Persist | **Never** base64/data URL in thread/draft/localStorage; request-time only |
| D8 | History | Honest: `[图片]` and/or meta line “原图未保存”; **no multi-turn re-upload of prior images** |
| D9 | Upload visual | Ghost/outline secondary 36px; send solid primary; **never dual primary** |
| D10 | Geometry | Send end/bottom **unchanged**; upload left of send by 8px (end 55 desktop / 54 mobile); text padding 108/100 |
| D11 | Helper | Host chrome **outside** card below; vision only; UI §6 `helper.full` string |
| D12 | Microcopy | UI §6 matrix is SSOT (Chinese); no English default tooltips |
| D13 | Model switch | Apply vision config; if residual files → **one** warning toast; do not silent-clear; send fail-closed |
| D14 | Validation timing | M1: **send path full validation required**; add-time hook best-effort / M2 |
| D15 | Compress | **M1 no** client canvas compress |
| D16 | Toast channel | Shared `showToast`; no custom snackbar; prefer no focus steal |
| D17 | Error codes | Prefer stable strings for tests; optional later `VISION_*` AppError codes (not required M1 if strings SSOT) |
| D18 | Remote URL | **Default lock for formal spec: reject non-local image sources in M1** (override only with written residual-risk acceptance) |
| D19 | attachmentMeta | **Choose A or C before plan** (see F10); do not leave “optional light” ambiguous |
| D20 | Aligner | Submit/stop only; upload CSS-positioned; e2e pins both |
| D21 | Rollback | Pages previous deploy; no new feature-flag service required |
| D22 | Precedence | On conflict: **UI design > draft open options**; product principles > both |

---

## Must-fix before formal spec

1. **F1 + F30 — Accept whitelist & SVG/bmp reject** written as normative M1 requirements with tests.  
2. **F2 + F8 — Total cap constant + decoded-vs-wire note + toast copy** locked.  
3. **F3 + F4 + D20 — Dual-button CSS exclusion + aligner target contract + e2e extension** (non-negotiable for send regression).  
4. **F5 — GIF wording** fixed in scope section.  
5. **F6/D18 — Remote URL policy** decided (recommend reject).  
6. **F7 — Logging redaction** for data URLs required in M1 security AC.  
7. **F10/D19 — History meta strategy** A vs C (or full B with schema) chosen.  
8. **F11 + F12 — Model-switch residual files & non-vision paste** either proven hooks or demoted with honest AC.  
9. **F13 — Dual toast + in-chat reject** behavior documented.  
10. **F14 — Test matrix** for new constants/paths listed as gate, not aspirational.  
11. Merge microcopy SSOT (UI §6) and kill draft/UI helper string drift (F17).  
12. State **M1 vs M2** explicitly: instant validate, compress, grey near-limit, observability = M2.

---

## Nice-to-have for M2

| Item | Why |
| --- | --- |
| onInput / add-time size & type toast | Closes G5 fully |
| Client downscale when file > ~1.5MB | Fewer gateway failures |
| Near-limit pre-disable upload at 4 | Less toast noise |
| Error chip on bad thumbnail | Visual fail without toast spam |
| Magic-byte / polyglot checks | Hardening beyond MIME |
| Structured debug metrics for vision rejects | Ops signal without Sentry |
| Egress honesty microcopy (gateway) | Stronger P4 |
| Grey non-vision educational empty state | Discoverability (product currently rejects) |
| Scheme C evaluation | Only if shadow DOM friction blocks polish |

---

## Testability — can M1 be proven?

**Yes**, if formal plan maps ACs to tests:

| Layer | Prove |
| --- | --- |
| Unit (`visionAttachments`) | total cap; SVG; bmp; whitelist config ≠ `image/*`; remote policy; type messages; count; per-file size; latest-user-only; empty OK |
| Unit (redaction) | data URL not present in redacted log payload |
| Integration (`handleRequest.vision`) | success parts; no base64 in `saveThreadMessages` / serialized thread; non-vision; total cap reject; pending lock unchanged |
| Unit/integration (thread) | if meta: serialize count without `data:`; round-trip normalize |
| E2E | send pin still green; vision: upload visible + spacing 8±2 + bottom align; non-vision: no upload; optional paste if hook proven |
| Manual QA | UI V1–V8, I1–I7, dark, skill+4 images+stop, reduced motion |

**Cannot fully automate without hooks:** true OS file picker, real clipboard image paste, full SR tree — acceptable with manual checklist.

---

## Implementability without rewriting deep-chat

**Feasible** on current map:

| Piece | Path |
| --- | --- |
| Caps / SVG / whitelist | `visionAttachments.ts` |
| Toast reject | already in `prepareDeepChatRequest` |
| Vision class / images config | `deepChatConfig.ts` / `applyDeepChatVisionUploadConfig` |
| Styles | `deepChatStyles.ts` + textInput padding dual-write |
| Model switch re-apply | `shellUi.ts` already calls apply |
| Helper chrome | host inject near skill-load-banner pattern |
| Meta (if any) | `conversationContext` / `threadStore` / message render |

**Friction points (not rewrite, but real work):** shadow DOM selectors for attachment strip; dual-button aligner; optional paste host listener; history meta rendering if chosen.

---

## Enterprise ops

| Topic | Assessment |
| --- | --- |
| Rollback | Cloudflare Pages previous deploy — aligns with PRODUCT_PRINCIPLES P8 |
| Feature flag | Not required for M1; vision already partially live. Optional kill is YAGNI unless ops insists |
| Observability | Toast + existing logger sufficient if **redaction fixed**; no Sentry dependency |
| Security gates | Keep `xss:gate` / no new user HTML paths; meta text via `textContent` |
| Data residency | Images only to user BYOK gateway for the turn — document in formal risk section |

---

## YAGNI violations

| Item | Verdict |
| --- | --- |
| Scheme C / IDB original cache | Correctly deferred |
| Client compress in M1 | Correctly deferred |
| Full bilingual i18n | Correctly non-goal |
| Full attachmentMeta schema with names + migration | **Risk of mild YAGNI** if overbuilt — use A or C |
| infoModal / marketing dropzone | Correctly avoided |
| Error chip M1 | Correctly optional |

---

## Missing acceptance criteria (add to formal spec)

1. `acceptedFormats` string exact value and **not** `image/*`.  
2. SVG reject by MIME **and** extension **before** read.  
3. Total decoded bytes ≤ 12MB across all candidates.  
4. Remote/http(s) image policy (recommend reject) + test.  
5. No `data:image` / base64 substrings in thread JSON after any vision send/fail.  
6. Logger redaction never prints full data URLs.  
7. Upload button: ghost styles; excluded from solid `.inside-end` accent rules.  
8. Aligner does not move/style `#upload-images-button`.  
9. Send/stop geometry e2e **and** upload spacing e2e on vision model.  
10. Validation failures do not persist user/assistant error turns into thread storage.  
11. Model-switch residual attachment: at most one `warn.model_switch` per switch event.  
12. Non-vision paste: either implemented + tested **or** explicitly out of M1 with residual risk.  
13. History honesty AC depending on D19 (meta line **or** explicit defer).  
14. Skill dock + 4 attachments + stop: no overlap checklist.  
15. Dark theme contrast smoke for upload border/icon/helper.

---

## Sign-off checklist

Use before promoting to formal design spec / implementation plan.

- [ ] Verdict accepted: **Go-with-fixes** (not bare Go)
- [ ] F1–F4, F6–F7, F10–F12 addressed in formal spec text
- [ ] GIF scope wording fixed (F5)
- [ ] Merged decision table D1–D22 copied into formal spec
- [ ] Microcopy SSOT = UI §6 (no dual strings)
- [ ] M1 / M2 boundary frozen (compress, instant validate, error chip)
- [ ] Test gate list attached to implementation plan
- [ ] Security: SVG ban + no base64 persist + log redaction + no new XSS render path
- [ ] Send button zero-regression contract explicit
- [ ] Product principles: images-only, local honesty, no cloud attachment storage
- [ ] Owner assigned for dual-button CSS/aligner spike before large UI polish PR
- [ ] Residual risks (gateway 413 after base64 expansion; multi-turn no pixel memory) written for release notes / helper

**Reviewer sign-off:** Go-with-fixes — proceed to formal spec **after** must-fix items are written into the spec (not merely acknowledged).

---

## Appendix A — Implementation reality snapshot (2026-07-27)

| Area | Current code | Design target |
| --- | --- | --- |
| Max files | 4 | 4 |
| Max file bytes | 5MB | 5MB |
| Max total | **missing** | 12MB |
| Accept | `image/*` | whitelist, no SVG |
| SVG | **allowed** via mime/ext | blocked |
| Base64 in thread | avoided on success path (tested) | keep + harden fail paths/logs |
| Vision gate | `supportsVision` + class | keep + model-switch toast |
| Upload styles | show/hide only | ghost + position + tokens |
| Text padding | 62px right | 108 / 100 |
| Helper | none | host line |
| attachmentMeta | none | decide A/B/C |
| redact data URL | **no** | yes |

## Appendix B — Rubric scores (summary)

| Rubric dimension | Score | Notes |
| --- | --- | --- |
| 1 Product scope discipline | Strong | Clarify GIF; guard meta scope |
| 2 Draft ↔ UI consistency | Strong | UI wins layout/copy |
| 3 Security | Weak until F1/F6/F7 | Design good, code gaps |
| 4 Reliability | Medium | Cap + switch + remote |
| 5 A11y & i18n | Strong for M1 | Chinese-only OK |
| 6 Testability | Strong if plan absorbs F14 | |
| 7 Implementability | Medium | Dual-button risk |
| 8 Enterprise ops | Adequate | Pages rollback |
| 9 YAGNI | Strong | Watch meta |
| 10 Acceptance criteria | Incomplete | List above |

---

**Document path:** `docs/superpowers/reviews/2026-07-27-deep-chat-vision-upload-scheme-review.md`  
**Next pipeline step:** Spec + Plan agent merges draft + UI + this review into formal design + implementation tasks; then production Go/No-Go checklist.
