# Deep Chat Vision Upload UX M1 — Production Gate Audit

**Date:** 2026-07-27  
**Role:** Production Gate Auditor (enterprise release / quality gate)  
**Milestone:** M1  
**Package under review:**
- Formal spec: [`docs/superpowers/specs/2026-07-27-deep-chat-vision-upload-ux-design.md`](../specs/2026-07-27-deep-chat-vision-upload-ux-design.md)
- Plan: [`docs/superpowers/plans/2026-07-27-deep-chat-vision-upload-ux.md`](../plans/2026-07-27-deep-chat-vision-upload-ux.md)
- Prior review: [`docs/superpowers/reviews/2026-07-27-deep-chat-vision-upload-scheme-review.md`](./2026-07-27-deep-chat-vision-upload-scheme-review.md)
- UI design: [`docs/superpowers/specs/2026-07-27-deep-chat-vision-upload-ui-design.md`](../specs/2026-07-27-deep-chat-vision-upload-ui-design.md)
- Principles: [`docs/PRODUCT_PRINCIPLES.md`](../../PRODUCT_PRINCIPLES.md)
- Bar refs: `docs/TESTING_STRATEGY.md`, `docs/CI-QUALITY-GATES.md`, `docs/SECURITY_PLAYBOOK.md`

**Scope of this audit:** Spec + plan readiness only. **No `src/` implementation.**  
**Code spot-check:** read-only confirmation that claimed paths and gaps still match implementation reality.

---

## 1. Overall verdict

# **PASS WITH AMENDMENTS**

Implementation may **start** after the plan amendments applied in this gate pass (see §5). Remaining items are **accepted residual risks** or soft automation fallbacks — not M1 blockers.

| Gate question | Answer |
| --- | --- |
| Formal spec locks all prior must-fix (F1–F14 core)? | **Yes** |
| Plan has TDD tasks covering those locks? | **Yes** (after gate patches) |
| Spec ↔ plan ↔ UI constants/copy consistent? | **Yes** (after gate patches) |
| Enterprise ops (rollback / CHANGELOG / QA matrix)? | **Yes** |
| Product principles (images-only, local honesty, no cloud)? | **Yes** |
| Clean bare **PASS** with zero residual? | **No** — residual risks remain (honest) |

---

## 2. Scorecard

| Category | Score | Evidence |
| --- | --- | --- |
| **A. Product & scope** | **Pass** | Goals O1–O9 + Non-goals §3 explicit; Approach **B only**; no PDF/camera/cloud/IndexedDB/scheme C; GIF clarified as no `chat.gifs` entry but static GIF files OK; no base64 persist (O6) with thread/meta rules. Aligns PRODUCT_PRINCIPLES P1/P4/P5/P7/P8. |
| **B. Security & privacy** | **Pass** | SVG MIME+ext ban; no bare `image/*`; remote http(s) reject; `attachmentMeta` count-only (no names/src — F21); `redactSensitiveError` data URL required; helper/meta via `textContent`; XSS note in §8; SECURITY_PLAYBOOK-compatible (no new user HTML path). MIME spoof deferred M2 (acceptable). |
| **C. Reliability** | **Pass** | Dual gate: UI accept whitelist + prepare full validation; 12MB total decoded SSOT; model-switch residual toast once + fail-closed send; pending lock via `:host(.is-pending-generation)` (class exists in `sessionState.ts`); multi-turn honesty via meta; decoded-vs-wire + `err.payload_large` documented; dual toast+reject channel kept and documented. |
| **D. UX / a11y** | **Pass** | Helper discoverability of 4/5MB/12MB/仅当轮; Chinese microcopy SSOT; ghost secondary vs solid primary; geometry 36/8/55/108 locked; touch ≥44 via `::after`; focus ring; reduced-motion extension; non-vision hide (not grey); UI design and formal spec agree on helper **outside** card. |
| **E. Engineering quality of plan** | **Pass** (was Partial → patched) | Tasks 1–8 TDD-ordered; exact files; interfaces; PowerShell test commands; commit steps; coverage matrix; no TBD placeholders. Gate patches closed: `payload_large` COPY + Task 2 Step 7b; mobile skill dock 100; images-config test not over-strict; modelSwitch constant. Soft: dual-button e2e may fall to manual if vision fixture missing — plan documents fallback. |
| **F. Operability** | **Pass** | Rollback = Pages previous deploy (no flag, YAGNI); CHANGELOG Task 8; acceptance matrix §9.6 E1–E13 executable; residual risk register §12 / plan end; M1/M2 boundary frozen. |
| **G. Consistency** | **Pass** | Constants 4 / 5MB / 12MB / 55·54 / 108·100 / helper string match across formal spec, UI design, plan. Dual-primary exclusion + padding + helper outside card consistent. No contradictory dual-primary guidance. |

---

## 3. Spec ↔ Plan coverage matrix (review must-fix → plan task)

Prior scheme review must-fix items and formal-spec absorption:

| Review ID | Topic | Formal spec | Plan task | Gate |
| --- | --- | --- | --- | --- |
| **F1** | SVG / whitelist / no `image/*` | §5–6, §8 | Task 1, 3 | Covered |
| **F2** | Total 12MB decoded | §5 constant + §6 rule 7 | Task 1 | Covered |
| **F3** | Dual-primary CSS exclusion | §7.2 mandatory | Task 4 | Covered |
| **F4** | Submit-only aligner | §7.2 contract | Task 5 | Covered |
| **F5** | GIF wording | §3 non-goals | Global constraints | Covered |
| **F6** | Remote URL reject | §6 rule 8, `err.remote` | Task 1 | Covered |
| **F7** | Log data-URL redaction | §8, §9.2 | Task 2 | Covered |
| **F8** | Decoded vs wire + 413 toast | §5 note, `err.payload_large` | Task 1 COPY + Task 2 Step 7b | Covered (best-effort) |
| **F9/F10** | History honesty meta | §5.1 Option B slim `{ count }` | Task 2 | Covered |
| **F11** | Model-switch residual files | §7.7 + detection strategy | Task 6 | Covered |
| **F12** | Non-vision paste | Honest residual + best-effort | Task 6 Step 3 optional | Covered (honest AC) |
| **F13** | Dual toast + reject channel | §6.2 keep both | Task 2 (existing wire) | Covered |
| **F14** | Test matrix | §9.1–9.7 | Tasks 1, 2, 7 | Covered |
| **F29** | Pending generation upload lock | §7.2 CSS host class | Task 4 | Covered |
| **F30** | BMP reject | Whitelist (no bmp) | Task 1 | Covered |
| Microcopy SSOT | UI §6 → formal §6.1 | Task 1 `DEEP_CHAT_VISION_COPY` | Covered |
| M1/M2 freeze | Spec §11 | Global constraints | Covered |
| Dual-button e2e | Spec §9.5 | Task 7 (+ manual fallback) | Covered |
| CHANGELOG / rollback | Spec §10 | Tasks 7–8 | Covered |

**Open M1 items in formal spec §13:** None — confirmed.

---

## 4. Constant / copy consistency audit

| Item | Formal spec | UI design | Plan | Match? |
| --- | --- | --- | --- | --- |
| Max files | 4 | 4 | 4 | Yes |
| Max file | 5MB | 5MB | 5MB | Yes |
| Max total | **12MB decoded** | 12MB | 12MB | Yes |
| Accept string | exact whitelist (no `image/*`) | whitelist | same exact string | Yes |
| SVG ban | MIME + ext | yes | yes | Yes |
| Remote reject | M1 | (security path) | Task 1 | Yes |
| Upload end desktop | 55px | 55px | 55px | Yes |
| Upload end mobile | 54px | 54px | 54px | Yes |
| Send end/bottom | 11 / 11 (10 mobile) **unchanged** | same | same | Yes |
| Text padding | 108 / 100 | 108 / 100 | 108 / 100 | Yes |
| Skill dock pad | 108 / 100 | 108 / 100 | 108 + **100 mobile** (gate patch) | Yes |
| Helper placement | **Outside card** | Outside (U-Q2) | Task 5 inject after card | Yes |
| `helper.full` | `最多 4 张 · 单张 ≤ 5MB · 合计 ≤ 12MB · 仅当轮发送` | same | same | Yes |
| `upload.tooltip` | `上传图片` | same | same | Yes |
| `upload.aria` | `上传图片，最多四张` | same | same | Yes |
| `history.meta` | `附 {n} 张图片（原图未保存）` | same | same | Yes |
| `err.max_count` / `max_file` / `max_total` / `type` / `svg` / `non_vision` / `warn.model_switch` / `generic_read` | locked | same matrix | Task 1 COPY | Yes |
| `err.remote` | formal only (review F6) | not in UI matrix | Task 1 | Yes (spec > UI for security strings) |
| `err.payload_large` | formal | not in UI matrix | Task 1 + 2.7b (gate patch) | Yes |
| Upload visual | Ghost secondary | Ghost (U-Q1) | Task 4 | Yes |
| Dual primary | Forbidden | Forbidden | CSS exclusion mandatory | Yes |
| Base64 persist | Never | Never | Global constraint | Yes |
| Feature flag | Not required | — | Not required | Yes |
| Compress M1 | No | No | No | Yes |

**No contradictory dual-primary / padding / helper placement found** after formal merge (UI wins layout/copy; principles win product).

---

## 5. Required amendments

### 5.1 Applied in this gate pass (plan only)

| # | Amendment | File |
| --- | --- | --- |
| A1 | Add `payloadLarge` + `modelSwitch` to `DEEP_CHAT_VISION_COPY` SSOT in Task 1 | plan |
| A2 | Add Task 2 **Step 7b**: best-effort LLM 413 / payload-too-large → `err.payload_large` | plan |
| A3 | Mobile skill dock right padding **100px** in Task 4 CSS | plan |
| A4 | Soften images-config unit expectation so optional `button.tooltip` does not break `toEqual` | plan |
| A5 | Model-switch toast uses `DEEP_CHAT_VISION_COPY.modelSwitch` | plan |
| A6 | Spec coverage self-review rows updated for payload_large + skill dock | plan |

**Formal spec:** no text change required — already complete and consistent.

**`src/`:** not modified (gate only).

### 5.2 No further blocking doc amendments

Implementers must not re-open:

- Approach C / deep-chat fork  
- Client compression in M1  
- Feature-flag service  
- `attachmentMeta.names`  
- Bare `image/*`  
- Silent clear of staged attachments on model switch  

---

## 6. Residual risks accepted for M1

| # | Risk | Why accepted | Mitigation in package |
| --- | --- | --- | --- |
| R1 | Wire size ≈ 4/3 of 12MB decoded may still 413 | Gateway limits unknown; compress is M2 | Helper honesty; total cap; `err.payload_large` best-effort |
| R2 | Multi-turn model cannot see prior pixels | Product lock (no re-upload) | `attachmentMeta` honesty line |
| R3 | Non-vision paste may be swallowed when `images=false` | Library hook unproven | Best-effort host paste; honest AC (not guaranteed E2) |
| R4 | Attachment strip class names may differ at runtime | Shadow DOM churn | Spike in Task 4; prefer stable ids |
| R5 | Dual-button e2e may lack vision model fixture | Env-dependent | Mandatory send pin e2e; dual-button → manual E1/V1 if needed |
| R6 | MIME spoof / polyglot | Not M1 threat model depth | Whitelist + SVG ban; magic bytes M2 |
| R7 | No vision kill switch without redeploy | Internal BYOK tool; P8 Pages rollback | Documented; YAGNI flag |
| R8 | Validation dual channel (toast + in-chat reject) | Existing pattern; “少打断” tension | Documented keep; no new snackbar |
| R9 | History display may use display-text append fallback | Avoid large bubble refactor | Meta field still stored; LLM path must not re-inject images |

---

## 7. Go / No-Go for implementation start

### **GO** — start implementation from the plan (Tasks 1→8)

**Preconditions for implementers:**

1. Treat formal spec as SSOT; plan as execution order.  
2. Use plan version **after** this gate’s amendments (A1–A6).  
3. Do not expand scope into M2 items (compress, add-time validation gate, error chips, metrics).  
4. Keep send geometry zero-regression; dual-primary exclusion is non-negotiable.  
5. Green gates before merge:  
   ```powershell
   npx vitest run src/modules/app_center/views/playground/deep-chat
   npm run type-check
   npm run lint:warning-gate
   npx playwright test tests/e2e/deep-chat-send.spec.ts --project=chromium --workers=1
   ```  
6. Manual QA E1–E13 (spec §9.6) before calling M1 done.

### Spot-check of code reality (supports “gaps still real”)

| Claim | Code reality (2026-07-27) |
| --- | --- |
| Paths exist | `visionAttachments.ts`, `handleRequest.ts`, `deepChatConfig.ts`, `deepChatStyles.ts`, `composerUi.ts`, `shellUi.ts`, `uiHooks.ts`, `conversationContext.ts`, `handleRequest.vision.test.ts`, `visionAttachments.test.ts`, `tests/e2e/deep-chat-send.spec.ts` |
| No total cap yet | `DEEP_CHAT_VISION_MAX_*` only files + 5MB; no `MAX_TOTAL` |
| Accept still `image/*` | `resolveDeepChatImagesConfig` returns `acceptedFormats: 'image/*'` |
| SVG allowed | `isImageMime` treats any `image/*` + ext includes `svg` |
| Aligner first inside-end | `composerUi.ts` queries `.input-button.inside-end` only |
| Solid inside-end CSS | bare `.inside-end.input-button` rules in `deepChatStyles.ts` |
| Redaction gaps | `redactSensitiveError` redacts keys only, not `data:image` values |
| No attachmentMeta | `DeepChatMessage` has no meta field |
| Pending host class | `is-pending-generation` exists (`PENDING_GENERATION_HOST_CLASS`) |
| Model switch re-apply | `shellUi.ts` already calls `applyDeepChatVisionUploadConfig` |
| `uiHooks.test.ts` | **missing** — plan correctly creates |

---

## 8. Sign-off

| Field | Value |
| --- | --- |
| **Verdict** | **PASS WITH AMENDMENTS** |
| **Go/No-Go** | **GO** for implementation start |
| **Role** | Production Gate Auditor |
| **Date** | 2026-07-27 |
| **Docs patched** | `docs/superpowers/plans/2026-07-27-deep-chat-vision-upload-ux.md` only |
| **Spec patched** | No (already sufficient) |
| **Code patched** | No |

**Auditor statement:** The formal design and implementation plan meet enterprise production-grade readiness for an internal BYOK static app M1, given Approach B, fail-closed vision validation, storage honesty, dual-button regression contract, test gates, and Pages rollback. Prior scheme-review critical/important must-fixes are locked in the formal spec and mapped to plan tasks. Residual risks are explicit and acceptable for M1.

---

**Document path:** `docs/superpowers/reviews/2026-07-27-deep-chat-vision-upload-production-gate.md`  
**Next step:** Implement plan Tasks 1–8 (subagent-driven or sequential); do not re-open scope without a new design delta.
