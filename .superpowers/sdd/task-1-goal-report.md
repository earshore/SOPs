# Task 1 Goal Report — Constants + pure validation

**Validator:** product goal / acceptance (read-only)  
**Date:** 2026-07-28  
**Scope:** Task 1 only (`visionAttachments.ts` / `visionAttachments.test.ts`)  
**Inputs:** `task-1-brief.md`, formal spec §5 / §6.1, `task-1-review-package.md`, source + vitest  
**HEAD (review package):** `bfe65397` — `feat(deep-chat): harden vision attach caps, whitelist, and remote reject`

---

## Scorecard

| # | Criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | `DEEP_CHAT_VISION_MAX_TOTAL_BYTES = 12MB` | **PASS** | `export const DEEP_CHAT_VISION_MAX_TOTAL_BYTES = 12 * 1024 * 1024` in `visionAttachments.ts` L15; enforced via `args.maxTotalBytes ?? DEEP_CHAT_VISION_MAX_TOTAL_BYTES` in `resolveDeepChatVisionUserParts`; test asserts `toBe(12 * 1024 * 1024)`. |
| 2 | `ACCEPTED_FORMATS` exact whitelist, no bare `image/*` | **PASS** | Exact string `image/png,image/jpeg,image/jpg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif`; test asserts equality and `includes('image/*') === false`. Matches formal spec §5 normative string. |
| 3 | SVG rejected (mime and extension) | **PASS** | `isSvg` checks `image/svg+xml` and `\.svg$`; loop rejects before FileReader; tests: mime exact `DEEP_CHAT_VISION_COPY.svg`, extension `toContain('SVG')` (brief allows contain). |
| 4 | bmp rejected | **PASS** | Not in `ALLOWED_MIME` / extension whitelist; File `a.bmp` / `image/bmp` → `DEEP_CHAT_VISION_COPY.type`; exact-string test. |
| 5 | remote http(s) rejected | **PASS** | `isHttpImageUrl` → `DEEP_CHAT_VISION_COPY.remote`; former accept test flipped to reject; duplicate hardening case; latest-message test uses data URLs. |
| 6 | `DEEP_CHAT_VISION_COPY` required Chinese strings | **PASS** | All brief keys present and match formal §6.1: `maxCount`, `maxFile`, `maxTotal`, `type`, `svg`, `nonVision`, `remote`, `read`, `payloadLarge`, `helper`, `uploadTooltip`, `uploadAria`, `historyMeta`, `modelSwitch`. Templates use `{n}`/`{mb}`/`{name}` consistently with SSOT. |
| 7 | `resolveDeepChatImagesConfig` uses whitelist formats | **PASS** | `acceptedFormats: DEEP_CHAT_VISION_ACCEPTED_FORMATS`; `maxNumberOfFiles: DEEP_CHAT_VISION_MAX_FILES`; optional `button.tooltip` = `uploadTooltip` (`上传图片`). |
| 8 | No scope creep (no UI / `handleRequest` in this task) | **PASS** | Diff package: **only** `visionAttachments.ts` + `visionAttachments.test.ts` (2 files). No composer CSS, no `handleRequest`, no thread/meta UI. |
| 9 | Tests assert exact error strings where brief requires | **PASS** | Brief-required exacts covered: SVG mime, bmp type, remote, max total 12MB, nonVision full string, maxFile `图片「big.png」超过 5MB 上限。`. SVG-by-extension uses `toContain('SVG')` as brief specifies. Pre-existing soft asserts remain (`toContain('不支持图片输入')`, `toContain('超过')`) but do not contradict brief hardening block. |

**Vitest:** `npx vitest run …/visionAttachments.test.ts` → **17/17 passed** (2026-07-28).

---

## Overall

**GOALS_MET**

Task 1 deliverables satisfy task goals and related formal-spec rules for constants, validation order (whitelist / SVG / remote / total cap), and copy SSOT. Pure-layer SSOT is in place for later UI tasks to consume without redefining strings or caps.

---

## Gaps

None blocking. Optional notes (non-blocking, severity **info**):

| Severity | Note |
| --- | --- |
| info | Spec table mentions `DEEP_CHAT_VISION_ALLOWED_MIME` / `_ALLOWED_EXT` as named constants; implementation uses private `ALLOWED_MIME` + `isAllowedVisionImage` — behavior matches brief (no required public export names). |
| info | Some legacy tests still use partial `toContain` for max-count / max-file paths; hardening suite uses exact strings. Strengthening legacy cases would improve regression signal only. |
| info | `partFromSrc` maps non-data non-http leftovers to `remote` copy (fail-closed); acceptable for M1 remote policy. |

---

## Checklist summary

1. PASS — 12MB total  
2. PASS — whitelist formats  
3. PASS — SVG mime + extension  
4. PASS — bmp  
5. PASS — remote http(s)  
6. PASS — Chinese copy SSOT  
7. PASS — images config whitelist  
8. PASS — scope (request layer only)  
9. PASS — exact strings per brief  

---

## Status

**DONE**
