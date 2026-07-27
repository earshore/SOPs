# Task 1 Report: Constants + pure validation (Deep Chat vision upload)

**Status:** DONE  
**Branch:** `feature/deep-chat-vision-upload-ux`  
**Commit:** `bfe65397` — `feat(deep-chat): harden vision attach caps, whitelist, and remote reject`

## Summary

Hardened pure validation and SSOT constants in `visionAttachments.ts` for M1 vision upload. Remote `http(s)` image sources are rejected; SVG/bmp and bare `image/*` are blocked; total decoded size cap is 12MB. Chinese microcopy is centralized in `DEEP_CHAT_VISION_COPY`.

## Files changed

| File | Change |
|------|--------|
| `src/modules/app_center/views/playground/deep-chat/request/visionAttachments.ts` | Constants, whitelist, validation loop, config |
| `src/modules/app_center/views/playground/deep-chat/request/visionAttachments.test.ts` | New hardening cases; remote policy flip; data-URL latest-message fixture |

## TDD

1. **RED:** Appended/updated tests first; `npx vitest run …/visionAttachments.test.ts` → **8 failed / 9 passed** (missing exports, still accepted `image/*` / https / SVG / no total cap).
2. **GREEN:** Minimal implementation per brief.
3. **GREEN verify:** **17 passed (17)**.

## API / constants (verbatim SSOT)

- `DEEP_CHAT_VISION_MAX_TOTAL_BYTES = 12 * 1024 * 1024`
- `DEEP_CHAT_VISION_ACCEPTED_FORMATS = 'image/png,image/jpeg,image/jpg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif'`
- `DEEP_CHAT_VISION_COPY` — exact Chinese strings (maxCount, maxFile, maxTotal, type, svg, nonVision, remote, read, payloadLarge, helper, uploadTooltip, uploadAria, historyMeta, modelSwitch)
- `isAllowedVisionImage(type?, name?)` — SVG hard-block; mime whitelist; extension fallback when mime empty / generic `image` / allowed
- `resolveDeepChatVisionUserParts` — optional `maxTotalBytes?`; enforces count, non-vision, SVG, type, remote, per-file, total
- `resolveDeepChatImagesConfig(true)` — `files.acceptedFormats === DEEP_CHAT_VISION_ACCEPTED_FORMATS`, `button.tooltip: '上传图片'`

## Policy flips vs previous behavior

| Before | After |
|--------|--------|
| `acceptedFormats: 'image/*'` | Explicit whitelist only |
| https/http image URLs accepted | Reject with `不支持网络图片地址，请上传本地图片文件。` |
| SVG / bmp via `image/*` | SVG dedicated message; bmp type error |
| No total size check | Fail closed when decoded sum > 12MB |

Existing tests updated:

- `accepts http(s)…` → **rejects** remote https
- `only uses files from the latest user message` → data URLs (not https)

## Tests run

```powershell
npx vitest run src/modules/app_center/views/playground/deep-chat/request/visionAttachments.test.ts
```

**Result:** 17 passed / 0 failed

## Self-review

- Surgical: only the two brief-listed files.
- No base64 persistence changes.
- Error strings match brief / DEEP_CHAT_VISION_COPY.
- `button` optional on images config type so consumers remain compatible; tooltip included when vision on.
- Size estimation still uses decoded data-URL / File.size; remotes never counted (rejected first).
- `partFromSrc` no longer returns http URLs.

## Out of scope (later tasks)

- UI / styles / dual-primary CSS / geometry padding  
- `handleRequest` / redact / `attachmentMeta`  
- Compression / feature flags  

## Concerns

None blocking. Optional note: `resolveDeepChatImagesConfig` now may return `button`; type is optional. Consumers that deep-equal the full config object without `button` would need updating (tests already assert `files` shape).
