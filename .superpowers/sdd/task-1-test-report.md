# Task 1 QA Test Report: Deep Chat vision upload (pure validation)

**Role:** Independent QA (re-run only; no product code changes)  
**Date:** 2026-07-28  
**Verdict:** **PASS**  
**Status:** DONE

## Scope

| Item | Path |
|------|------|
| Brief | `.superpowers/sdd/task-1-brief.md` |
| Implementer report (claims only) | `.superpowers/sdd/task-1-report.md` |
| Implementation | `src/modules/app_center/views/playground/deep-chat/request/visionAttachments.ts` |
| Tests | `src/modules/app_center/views/playground/deep-chat/request/visionAttachments.test.ts` |

## Command

```powershell
npx vitest run src/modules/app_center/views/playground/deep-chat/request/visionAttachments.test.ts
```

## Full summary output

```
 RUN  v4.1.8 D:/Users/Administrator/Documents/GitHub/SOPs

 ✓ .../visionAttachments.test.ts > resolveDeepChatImagesConfig > returns false when vision is unsupported
 ✓ .../visionAttachments.test.ts > resolveDeepChatImagesConfig > returns image-only upload config when vision is supported
 ✓ .../visionAttachments.test.ts > vision accept whitelist > exports exact acceptedFormats without bare image/*
 ✓ .../visionAttachments.test.ts > resolveDeepChatVisionUserParts > returns empty parts without files
 ✓ .../visionAttachments.test.ts > resolveDeepChatVisionUserParts > rejects files when model does not support vision
 ✓ .../visionAttachments.test.ts > resolveDeepChatVisionUserParts > maps message files to input_image parts
 ✓ .../visionAttachments.test.ts > resolveDeepChatVisionUserParts > maps top-level File objects
 ✓ .../visionAttachments.test.ts > resolveDeepChatVisionUserParts > fails closed when too many images
 ✓ .../visionAttachments.test.ts > resolveDeepChatVisionUserParts > fails closed when a data-url image exceeds size limit
 ✓ .../visionAttachments.test.ts > resolveDeepChatVisionUserParts > rejects remote https image src
 ✓ .../visionAttachments.test.ts > resolveDeepChatVisionUserParts > only uses files from the latest user message
 ✓ .../visionAttachments.test.ts > resolveDeepChatVisionUserParts hardening > rejects SVG by mime
 ✓ .../visionAttachments.test.ts > resolveDeepChatVisionUserParts hardening > rejects SVG by extension even if mime looks png
 ✓ .../visionAttachments.test.ts > resolveDeepChatVisionUserParts hardening > rejects bmp
 ✓ .../visionAttachments.test.ts > resolveDeepChatVisionUserParts hardening > rejects remote https image src
 ✓ .../visionAttachments.test.ts > resolveDeepChatVisionUserParts hardening > fails closed when decoded total exceeds 12MB
 ✓ .../visionAttachments.test.ts > resolveDeepChatVisionUserParts hardening > keeps non-vision and per-file size messages

 Test Files  1 passed (1)
      Tests  17 passed (17)
   Duration  ~1.29s
```

**Exit code:** 0

## Test counts

| Metric | Value |
|--------|-------|
| Test files | 1 passed |
| Tests | **17 passed / 0 failed** |
| Transform/import issues | none |

Matches implementer claim (17/17).

## Coverage vs brief acceptance criteria

| Criterion | Covered by test(s)? | Result |
|-----------|---------------------|--------|
| **Total 12MB** (`DEEP_CHAT_VISION_MAX_TOTAL_BYTES = 12 * 1024 * 1024`) | Hardening: `fails closed when decoded total exceeds 12MB` (exact Chinese total message + constant assert) | **PASS** |
| **SVG mime** | Hardening: `rejects SVG by mime` → exact `不支持 SVG 图片，请改用 PNG 或 JPEG。` | **PASS** |
| **SVG extension** (even if mime looks png) | Hardening: `rejects SVG by extension even if mime looks png` | **PASS** |
| **bmp reject** | Hardening: `rejects bmp` → exact type whitelist message | **PASS** |
| **Remote https reject** | Suite + hardening: both assert exact remote copy | **PASS** |
| **Whitelist; no bare `image/*`** | `vision accept whitelist` + config `acceptedFormats === DEEP_CHAT_VISION_ACCEPTED_FORMATS` | **PASS** |
| **Existing max files** still fail-closed | `fails closed when too many images` (MAX_FILES+1) | **PASS** |
| **Existing max per-file size** still fail-closed | `fails closed when a data-url image exceeds size limit` + hardening exact `图片「big.png」超过 5MB 上限。` | **PASS** |
| **Non-vision** message retained | Hardening: exact nonVision string | **PASS** |
| **Latest-user-message only** uses data URLs (not https) | `only uses files from the latest user message` | **PASS** |
| **Remote policy flip** (old accept → reject) | `rejects remote https image src` (×2) | **PASS** |
| **`resolveDeepChatImagesConfig(true)` files shape** | Config tests + whitelist (max 4, acceptedFormats SSOT; optional button tooltip) | **PASS** |

### Brief checklist items (Task 1 steps)

- Step 1 tests present in `visionAttachments.test.ts` as specified (whitelist, SVG mime/ext, bmp, remote, 12MB total, non-vision/per-file keepers).
- Step 4 expected: PASS — **confirmed independently**.

## Spot-check: tests ↔ implementation

1. **Remote reject** — `isHttpImageUrl` (`/^https?:\/\//i`) runs before size/parts; returns `DEEP_CHAT_VISION_COPY.remote`. Aligns with both remote tests.
2. **SVG** — `isSvg` checks mime `image/svg+xml` and `\.svg$`; loop returns `DEEP_CHAT_VISION_COPY.svg` before generic type errors. Aligns with mime + extension tests (including `evil.svg` + `image/png` File).
3. **Total cap** — After per-file check, `totalBytes += size` with `maxTotalBytes ?? DEEP_CHAT_VISION_MAX_TOTAL_BYTES` (12MB); error via `maxTotal(12)`. Aligns with three ~0.82×5MB data-URL fixture.

Constants SSOT observed in impl: `MAX_FILES=4`, `MAX_FILE=5MB`, `MAX_TOTAL=12MB`, accepted formats string without `image/*`, `DEEP_CHAT_VISION_COPY` Chinese strings match brief.

## Gaps vs brief (non-blocking for Task 1)

| Gap | Severity | Notes |
|-----|----------|-------|
| No dedicated unit test for `isAllowedVisionImage` export in isolation | Low | Behavior exercised via `resolveDeepChatVisionUserParts` / config |
| No explicit **http** (non-TLS) remote case | Low | Same `isHttpImageUrl` regex covers `http://`; only https fixtures exist |
| No “under total cap but multi-file success” happy path for 12MB boundary | Low | Fail-closed over-total is covered; under-total multi-file not asserted |
| Duplicate remote tests (suite + hardening) | Info | Redundant but consistent |
| Out-of-scope Task 1 (UI, redact, attachmentMeta, dual-primary CSS) | N/A | Correctly not in this file |

None of the above fail Task 1 acceptance for pure validation.

## Implementer report verification

| Claim | Independent result |
|-------|-------------------|
| 17 passed | **Confirmed** |
| Remote policy flip | **Confirmed** in tests + impl |
| Whitelist / no `image/*` | **Confirmed** |
| SVG / bmp / 12MB total | **Confirmed** |

## Verdict

**PASS** — All 17 tests green; brief Task 1 pure-validation criteria covered; spot-checks consistent with implementation. No product fixes required from QA.

**Report path:** `.superpowers/sdd/task-1-test-report.md`  
**Status:** DONE
