# Deep Chat Vision — Host Composer (Approach B production surface)

**Date:** 2026-07-28  
**Status:** Implemented on `feature/deep-chat-vision-upload-ux`  
**Supersedes UI surface of:** Approach B vendor `#upload-images-button` skin  
**Keeps:** request caps, no base64 persist, `attachmentMeta.count`, fail-closed non-vision send

## Problem

Vendor-button skin failed enterprise UX:

- Not discoverable on first open (hidden when `!supportsVision`)
- Visual language mismatched SOPs shell (library icon, magic absolute geometry)
- No host interaction loop (stage / remove / count / drag / paste)

## Decision

**Host owns the surface; deep-chat native `images` stays off.**

| Layer | Owner |
| --- | --- |
| Upload button + strip + helper | `composer/visionComposer.ts` (shadow host chrome) |
| Caps / mime / data-url parts | `request/visionAttachments.ts` (`hostFiles` preferred) |
| Send / stream / history text | deep-chat + existing request pipeline |
| Vendor `#upload-images-button` | Forced `chat.images = false` + CSS hide |

## UX contract

1. **Always visible** upload control after Deep Chat mounts (left of composer card).
2. **Non-vision:** control disabled + helper = `nonVision` copy; click/paste still toast reason.
3. **Vision:** control enabled; pick / paste / drop stages thumbnails with remove × and `n/4` badge.
4. **Validate on stage** (type/size/count/total), not only on send.
5. **Send** injects staged `File[]` as `hostFiles` → `visionUserParts`; strip clears immediately; no base64 in thread.
6. **Helper** always under card: limits when vision-ready, non-vision reason otherwise.
7. **Single primary:** send remains solid accent circle; upload is secondary pill (border + muted/accent-soft).

## Files

- Create: `composer/visionComposer.ts` (+ unit tests)
- Modify: `infra/deepChatConfig.ts`, `infra/deepChatStyles.ts`, `request/handleRequest.ts`, `request/visionAttachments.ts`, `shell/shellUi.ts`, `controller.ts`
- E2E: `tests/e2e/deep-chat-send.spec.ts` host-control geometry

## Product gate (2026-07-28)

| Setting | Path | Default |
| --- | --- | --- |
| `deepChat.enableVision` | 系统设置 → 工具策略 → Playground · Deep Chat → **启用 Vision**（Prompt 草稿数下方） | **false** |

- **Off:** host entry unmounted; request path does not attach vision parts (capability code retained).
- **On:** host text entry above composer; model `supportsVision` still gates enable vs disabled state.

## Non-goals (unchanged)

- Client compression / multi-turn pixel memory / PDF-camera-mic
- Fork deep-chat library source
