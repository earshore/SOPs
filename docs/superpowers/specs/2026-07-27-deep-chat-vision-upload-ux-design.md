# Deep Chat 图片上传（Vision Upload UX）— 正式设计规格

**Date:** 2026-07-27  
**Status:** design approved for planning  
**Milestone:** M1  
**Approach lock:** **B only** — deep-chat `images` 配置 + `auxiliaryStyle` + 请求侧校验；不 fork deep-chat、不自建 Composer 附件层（方案 C）  
**Inputs absorbed:**
- [UX design draft](./2026-07-27-deep-chat-vision-upload-ux-design-draft.md)
- [UI design addendum](./2026-07-27-deep-chat-vision-upload-ui-design.md)
- [Scheme review (Go-with-fixes)](../reviews/2026-07-27-deep-chat-vision-upload-scheme-review.md)

**Implementation plan:** [2026-07-27-deep-chat-vision-upload-ux.md](../plans/2026-07-27-deep-chat-vision-upload-ux.md)

**Precedence:** UI design layout/copy > draft open options; product principles > both. This formal spec is the implementer SSOT.

---

## 1. Problem

Deep Chat already gates vision images by `supportsVision` and builds `visionUserParts` for the current turn only. Production gaps remain:

| ID | Gap | Impact |
| --- | --- | --- |
| G1 | Limits not visible (4 / 5MB / no total) | Users fail only at send |
| G2 | No total payload cap | 4×5MB base64 → gateway 413/timeouts |
| G3 | Upload / strip not token-styled | Dual primary / visual debt vs send polish |
| G4 | Non-vision has no entry honesty | Paste/drag unexplained when hook exists |
| G5 | Validation mostly at prepare | Staging large/invalid files until send |
| G6 | Model switch + residual attachments unclear | Silent confusion or double toast |
| G7 | History loses pixels with weak honesty | Users assume multi-turn image memory |
| G8 | English tooltips / touch targets | a11y shortfall |
| G9 | SVG + bare `image/*` allowed in code | XSS surface |
| G10 | Dual inside-end geometry | Upload can steal send styles / mis-pin aligner |

---

## 2. Goals

| ID | Goal | Verifiable meaning |
| --- | --- | --- |
| O1 | Discoverable | Vision model: upload + helper visible within 3s |
| O2 | Predictable limits | Helper shows 4 · 5MB · 12MB · 仅当轮 before send |
| O3 | Send zero-regression | Send/stop geometry (36px, end 11, bottom 11) unchanged |
| O4 | Secondary upload | Ghost 36px; **never** solid accent dual-primary |
| O5 | Fail-closed safety | SVG/bmp/remote URL/total/count/size/type reject with Chinese toast |
| O6 | No base64 persist | Thread / draft / localStorage never contain `data:image` or raw image bytes |
| O7 | History honesty | Stored user messages may carry **count-only** meta; display `附 {n} 张图片（原图未保存）` |
| O8 | Logging safe | `redactSensitiveError` strips/redacts `data:image` / long base64 |
| O9 | Test gate | Unit + vision integration + send e2e pin + dual-button spacing |

---

## 3. Non-goals (M1)

- PDF / Office / camera / microphone / mixed files  
- Separate GIF entry (`chat.gifs`); static `image/gif` files remain allowed  
- Cloud object storage or IndexedDB original replay  
- Scheme C custom composer rewrite  
- Client-side image compression / canvas downscale  
- Near-limit pre-disable of upload at 4 files  
- Attachment error-chip UI (toast first)  
- Feature flag / kill switch service (Pages previous deploy is rollback)  
- Full bilingual i18n matrix  
- Magic-byte / polyglot deep inspection  
- Multi-turn automatic re-upload of prior images  
- Changing deep-chat vendor source  

---

## 4. Architecture

### 4.1 Approach B path

```
Composer (deep-chat shadow + host chrome)
  Skill chips (optional)
  Attachment strip (library, token-styled)
  Text input  [Upload ghost] [Send primary]
  Helper OUTSIDE card (host, vision only)
           │
           ▼ on send (required) · on add (best-effort M2)
visionAttachments.ts (pure SSOT)
  whitelist type · count · per-file · total decoded · reject SVG/remote
  → visionUserParts | Chinese error string
           │
           ▼
prepareDeepChatRequest → callLLM (current turn only)
thread persist: text + optional attachmentMeta { count }  (never bytes)
```

### 4.2 Module responsibilities

| Unit | Owns | Does not own |
| --- | --- | --- |
| `request/visionAttachments.ts` | Constants, pure validation, parts build, accept string, microcopy constants for errors | DOM |
| `request/handleRequest.ts` | Wire resolve → toast + reject; stamp meta on successful prepare path | FileReader |
| `session/uiHooks.ts` | `redactSensitiveError` data-URL redaction | Vision business rules |
| `infra/deepChatConfig.ts` | `images` config apply, vision class, text padding dual-write, Chinese tooltip | Toast copy proliferation |
| `infra/deepChatStyles.ts` | Upload ghost, dual-primary exclusion, geometry, strip, helper, reduced-motion | Business logic |
| `composer/composerUi.ts` | `alignSubmitButtonLayerToTextInput` **submit-only** | Upload CSS position |
| `shell/shellUi.ts` | Model change → reapply vision config + residual-attachment toast once | Silent clear of files |
| `session/conversationContext.ts` | `DeepChatMessage.attachmentMeta` normalize / strip unsafe fields | Image bytes |

### 4.3 Code map (implementation reality)

| Path | Role today |
| --- | --- |
| `src/modules/app_center/views/playground/deep-chat/request/visionAttachments.ts` | Caps 4/5MB; `acceptedFormats: 'image/*'`; allows SVG/bmp; accepts http(s) without size |
| `…/request/visionAttachments.test.ts` | Unit base |
| `…/request/handleRequest.ts` | prepare → toast + reject on vision fail |
| `…/request/handleRequest.vision.test.ts` | Integration no-base64 persist |
| `…/infra/deepChatConfig.ts` | `applyDeepChatVisionUploadConfig`; text padding `62px` right |
| `…/infra/deepChatStyles.ts` | Hide upload when `!is-vision-enabled`; solid `.inside-end` send rules |
| `…/composer/composerUi.ts` | Aligner queries first `.input-button.inside-end` |
| `…/shell/shellUi.ts` | Model change already calls `applyDeepChatVisionUploadConfig` |
| `…/session/conversationContext.ts` | `DeepChatMessage` has no meta field yet |
| `…/session/uiHooks.ts` | Redaction lacks `data:image` |

---

## 5. Data model & constants (SSOT)

All numeric limits and accept lists live in `visionAttachments.ts`. UI helper strings must match the same numbers (comment or shared export).

| Constant | Value | Notes |
| --- | --- | --- |
| `DEEP_CHAT_VISION_MAX_FILES` | `4` | Existing |
| `DEEP_CHAT_VISION_MAX_FILE_BYTES` | `5 * 1024 * 1024` | Existing (decoded / File.size) |
| `DEEP_CHAT_VISION_MAX_TOTAL_BYTES` | `12 * 1024 * 1024` | **New** sum of decoded candidate sizes |
| `DEEP_CHAT_VISION_PLACEHOLDER_TEXT` | `'[图片]'` | Existing pure-image text placeholder |
| `DEEP_CHAT_VISION_ACCEPTED_FORMATS` | see below | **Not** bare `image/*` |
| `DEEP_CHAT_VISION_ALLOWED_MIME` | png/jpeg/webp/gif | Case-insensitive |
| `DEEP_CHAT_VISION_ALLOWED_EXT` | png/jpg/jpeg/webp/gif | No svg/bmp |

**`acceptedFormats` exact string (normative):**

```text
image/png,image/jpeg,image/jpg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif
```

**Decoded vs wire:** caps apply to **decoded** bytes (`File.size` or data-URL estimated payload). Base64 JSON on the wire expands ≈ 4/3 (12MB decoded ≈ ~16MB wire). Residual gateway 413 risk remains; map provider size errors to a friendly toast when generic LLM error path allows:

`图片过大或网关拒绝，请减少张数或压缩。`

### 5.1 attachmentMeta (M1 locked — include)

**Decision:** **Option B slim** — structured field, **count only**. Not deferred. Not filename list (privacy F21).

```ts
// conversationContext.ts
export interface DeepChatAttachmentMeta {
  /** Number of images attached on the turn that produced this user message (1–4). */
  count: number;
}

export interface DeepChatMessage {
  // …existing fields…
  /**
   * Display-only honesty for vision turns. Never contains src/base64/names.
   * Must not be sent as LLM content.
   */
  attachmentMeta?: DeepChatAttachmentMeta;
}
```

**Rules:**

1. Set when a user turn is stored after a successful prepare with `visionUserParts.length > 0`.  
2. `count = visionUserParts.length` (integer 1–4).  
3. Normalize on load: if missing/invalid, drop field; never invent files.  
4. Strip any unknown keys; reject if payload looks like it contains `src` / data URLs (defensive).  
5. Display line (user bubble secondary, or adjacent to `[图片]`):  
   `附 {n} 张图片（原图未保存）` with Arabic `n`.  
6. Pure-image stored text remains `[图片]` (or user text if present); meta is **additive**, not a replacement that invents prose for the model.  
7. Serialization of thread JSON must never contain `data:image` because of meta (meta has no image fields).

**Explicitly not in M1:** `names[]`, migration of historical threads beyond normalize drop, multi-turn re-attach.

### 5.2 Resolve API (normative shape)

```ts
export type ResolveDeepChatVisionResult =
  | { ok: true; parts: DeepChatVisionUserPart[] }
  | { ok: false; error: string };

export async function resolveDeepChatVisionUserParts(args: {
  body: unknown;
  supportsVision: boolean;
  maxFiles?: number;
  maxFileBytes?: number;
  maxTotalBytes?: number;
}): Promise<ResolveDeepChatVisionResult>;

export function resolveDeepChatImagesConfig(supportsVision: boolean):
  | false
  | {
      files: {
        maxNumberOfFiles: number;
        acceptedFormats: string;
      };
      button?: { styles?: Record<string, unknown>; tooltip?: string };
    };
```

Tooltip Chinese: `上传图片`. Prefer config tooltip if library supports; CSS/aria still required.

---

## 6. Validation rules

Order of checks (fail-closed, first failure wins):

1. **Collect candidates** from latest user message files only (existing), else top-level files.  
2. **Empty** → `{ ok: true, parts: [] }`.  
3. **!supportsVision** + any candidate → `err.non_vision`.  
4. **count > MAX_FILES** → `err.max_count`.  
5. **Per candidate type:**
   - Reject SVG by MIME `image/svg+xml` **or** extension `.svg` (before FileReader).  
   - Reject bmp / unknown / non-whitelist.  
   - Reject if neither MIME nor extension matches whitelist (when both empty → type error).  
6. **Per-file size** (`File.size` or data-URL estimate) > 5MB → `err.max_file`.  
7. **Running total** of accepted sizes > 12MB → `err.max_total` (before or after each accept; must not return partial oversized set).  
8. **Source policy (M1):**  
   - Allow: `File` / `blob:` (via File) / `data:image/(png|jpeg|jpg|webp|gif);…`  
   - **Reject** `http:` / `https:` remote image `src` with type/source error (predictable caps; no gateway SSRF via model fetch of attacker URL).  
9. Build `input_image` parts with data URLs for Files.

**GIF wording:** out-of-scope is **GIF entry UI** (`chat.gifs`). Static GIF **files** are in whitelist.

### 6.1 Microcopy SSOT (Chinese — exact strings)

| Key | String |
| --- | --- |
| `upload.tooltip` | `上传图片` |
| `upload.aria` | `上传图片，最多四张` |
| `helper.full` | `最多 4 张 · 单张 ≤ 5MB · 合计 ≤ 12MB · 仅当轮发送` |
| `history.meta` | `附 {n} 张图片（原图未保存）` |
| `placeholder.logic` | `[图片]` |
| `input.placeholder` | `有问题，尽管问` (**unchanged**) |
| `err.max_count` | `单次最多上传 4 张图片，请减少后重试。` |
| `err.max_file` | `图片「{name}」超过 5MB 上限。` |
| `err.max_total` | `本轮图片合计超过 12MB，请压缩或减少张数。` |
| `err.type` | `不支持的文件类型，请使用 PNG、JPEG、WebP 或 GIF。` |
| `err.svg` | `不支持 SVG 图片，请改用 PNG 或 JPEG。` |
| `err.non_vision` | `当前模型不支持图片输入，请切换到支持视觉的模型后再试。` |
| `warn.model_switch` | `已切换到不支持图片的模型，发送前请移除图片或换回视觉模型。` |
| `err.generic_read` | `图片读取失败，请重试。` |
| `err.remote` | `不支持网络图片地址，请上传本地图片文件。` |
| `err.payload_large` | `图片过大或网关拒绝，请减少张数或压缩。` |

`{name}` UI truncate ≤24 chars + `…` optional; logs may keep full name without data URL.

### 6.2 Feedback channels

| Event | Toast | In-chat reject | Thread storage |
| --- | --- | --- | --- |
| Validation fail in prepare | `showToast(error, { type: 'warning' })` | `rejectDeepChatRequest` → `请求失败：…` (existing dual channel; **documented keep**) | **No** new user/assistant turn for validation-only prepare failure (prepare returns null before save) |
| Model switch residual | one warning toast | none | none |
| LLM 413 / size | prefer `err.payload_large` when mappable | existing error path | existing failure handling |
| Success | none | stream | text + optional `attachmentMeta` |

Shared `showToast` only — no custom snackbar. Toast must not steal focus.

### 6.3 Validation timing

| Stage | M1 requirement |
| --- | --- |
| Send / prepare | **Full validation required** |
| Add / onInput | Best-effort only; not a ship gate if library lacks hook |
| Near-limit grey upload | M2 |

---

## 7. UI / interaction

### 7.1 Composer IA (top → bottom)

```
#input
├── .deep-chat-skill-load-banner          [host]
├── #text-input-container                 [card r=29]
│   ├── #deep-chat-session-skill-chip-dock
│   ├── #file-attachment-container        [library strip]
│   ├── #text-input
│   └── .input-button-container
│       ├── #upload-images-button         [vision only · ghost]
│       └── submit .inside-end            [primary / stop]
└── .deep-chat-vision-helper              [host · OUTSIDE card · vision only]
```

Helper is **outside** the card (UI U-Q2) so `#text-input-container { overflow: hidden }` cannot clip it and button geometry stays independent.

### 7.2 Dual-button geometry (locked)

| Element | Desktop | ≤640px |
| --- | --- | --- |
| Send size | 36×36 | 36×36 |
| Send `inset-inline-end` | `max(11px, calc((100% - 768px)/2 + 11px))` **unchanged** | `10px` **unchanged** |
| Send `inset-block-end` | `11px` | `10px` |
| Upload size | 36×36 visual; **≥44×44** hit via `::after` or padding | same |
| Upload `inset-inline-end` | `max(55px, calc((100% - 768px)/2 + 55px))` (= 11+36+8) | `54px` (= 10+36+8) |
| Upload `inset-block-end` | **same as send** (bottom-aligned) | same |
| Gap upload↔send | **8px** clear | 8px |
| `#text-input` padding | `18px 108px 16px 22px` | `17px 100px 15px 18px` |
| Skill dock right pad | **108** desktop / **100** mobile (was 58) | |

**CSS dual-primary exclusion (mandatory):**

- All solid-accent / stop / disabled rules that currently target bare `.input-button.inside-end` **must exclude** `#upload-images-button` (e.g. `.input-button.inside-end:not(#upload-images-button)` **or** higher-specificity ghost block that overrides fill).  
- Upload never uses solid `var(--deep-chat-accent)` fill.  
- Stop remains rightmost 36px slot; upload stays in left slot with reduced opacity / `pointer-events: none` while generating if library does not disable it (`:host(.is-pending-generation) #upload-images-button`).

**Aligner contract (mandatory):**

`alignSubmitButtonLayerToTextInput` must target **submit/stop only**:

```ts
// Prefer explicit submit selectors; never first generic inside-end if upload matches first.
root.querySelector<HTMLElement>(
  '.input-button.inside-end.submit-button, .input-button.inside-end[data-deep-chat-stop-active], .input-button.inside-end.loading-button, #submit-button, button.inside-end:not(#upload-images-button)'
);
// Fallback: .input-button.inside-end:not(#upload-images-button)
```

Upload position is **CSS-only**; aligner must not write inline geometry to `#upload-images-button`.

### 7.3 Upload visual (secondary ghost)

| State | Spec |
| --- | --- |
| Default | surface bg, 1px accent-border, accent icon |
| Hover / focus-visible | accent-soft bg, ring `2px solid rgba(var(--deep-chat-accent-rgb), 0.75)` offset 2 |
| Generating / disabled | faint border/icon opacity 0.5; not clickable |
| Hidden | `!supportsVision` → `display: none` (not grey fake affordance) |

Colors only via `--deep-chat-*` tokens. Icon: image/frame semantic (not paperclip). Tooltip/aria Chinese.

### 7.4 Attachment strip

- Empty: no layout height.  
- Filled: horizontal chips, thumbs ~44×44, radius 8, hairline border, delete overlay prefer ≥32px hit.  
- Overflow-x auto inside strip only.  
- Token colors only.

### 7.5 Helper

- Class: `.deep-chat-vision-helper`  
- Text: `helper.full` exact  
- 12px / 1.4 / muted ink; max-width `min(100%, 768px)` centered; margin-top 8px  
- Visible only with vision (`is-vision-enabled` / host flag)  
- Not focusable  

### 7.6 Entry state machine

| State | Condition | UI |
| --- | --- | --- |
| Hidden | no model / `!supportsVision` | no upload, no helper |
| Enabled | `supportsVision` | upload + helper |
| Busy | pending generation | upload disabled; send = stop |

### 7.7 Interaction flows

1. **Pick files** → library strip → send validates fully.  
2. **Paste / drag** vision → same validation path.  
3. **Non-vision paste/drag:** if host or library surfaces the attempt → `err.non_vision` toast. If library swallows with `images=false` and no event, **M1 residual risk** (honest AC: best-effort host listener; do not claim guaranteed paste intercept without proven hook).  
4. **Pure image send** allowed; logic placeholder `[图片]`; no “please type text” force.  
5. **Model switch vision → non-vision:** reapply config; if composer still has staged files → **one** `warn.model_switch` toast; **do not** silent-clear; send still fail-closed.  
6. **Remove one thumb:** library delete; no undo toast.  
7. **Success:** strip clears (library); history text + meta; no base64 in storage.

**Residual files detection (M1 strategy):**

1. Prefer `chat.onInput` files length if available when toggling vision off.  
2. Else shadow query: `#file-attachment-container` children / `.file-attachment` / non-empty file input list — use first stable selector verified in spike.  
3. Toast at most once per switch event (guard flag cleared when switching back to vision or attachments empty).

### 7.8 Motion / a11y

- Transitions ≤200ms; extend `prefers-reduced-motion` to upload + attachment.  
- Tab order: text → (attachment controls) → upload → send.  
- Upload accessible name: `上传图片，最多四张`.  
- Errors not color-only; toast full sentence.  
- Delete overlay hit ≥28–32px documented exception vs 44px main controls.

---

## 8. Security

| Rule | M1 |
| --- | --- |
| No base64 / data URL in thread, draft, localStorage | **Required** |
| SVG blocked (MIME + extension) before read | **Required** |
| No bare `image/*` accept | **Required** |
| Remote http(s) image src rejected | **Required** |
| `redactSensitiveError` strips `data:image…` and long base64-looking strings | **Required** |
| Never log raw `visionUserParts` | **Required** |
| Meta has no names/src | **Required** |
| XSS: meta / helper via `textContent` | **Required** |
| MIME spoof / polyglot | M2 optional |

---

## 9. Testing & acceptance matrix

### 9.1 Unit (`visionAttachments`)

- [ ] total > 12MB fail with `err.max_total`  
- [ ] SVG MIME reject + `.svg` name reject  
- [ ] bmp / unknown reject with `err.type`  
- [ ] `resolveDeepChatImagesConfig(true).files.acceptedFormats` exact whitelist string (≠ `image/*`)  
- [ ] remote https src rejected  
- [ ] count / per-file / non-vision / empty / latest-user-only still pass  
- [ ] error strings match microcopy SSOT  

### 9.2 Unit (`redactSensitiveError`)

- [ ] object with `data:image/png;base64,…` value does not retain full data URL after redaction  

### 9.3 Integration (`handleRequest.vision`)

- [ ] success parts to `callLLM`  
- [ ] thread JSON has no `data:image`  
- [ ] non-vision toast + no callLLM  
- [ ] total cap reject  
- [ ] SVG reject  
- [ ] validation fail does not append user turn with base64  
- [ ] success stamps `attachmentMeta.count` on stored user message  

### 9.4 Thread normalize

- [ ] invalid meta dropped; valid `{ count: 2 }` kept; no src keys  

### 9.5 E2E

- [ ] Existing send pin geometry still green  
- [ ] Vision: upload visible; horizontal gap 8±2 vs send; bottom align ±2  
- [ ] Non-vision: upload not visible  
- [ ] Upload not solid accent (computed background ≠ send accent when idle)  

### 9.6 Manual QA

| # | Scenario | Expect |
| --- | --- | --- |
| E1 | Vision model | Upload + helper visible |
| E2 | Non-vision | No upload/helper; paste toast if hook fires |
| E3 | 5 images | Reject count |
| E4 | Single 6MB | Reject file |
| E5 | 3 images sum >12MB | Reject total |
| E6 | Pure image send | Success; no base64 in storage; meta line if count≥1 |
| E7 | Refresh session | No originals; meta honesty line |
| E8 | Generating | Cannot add images around pending lock |
| E9 | Dark theme | Upload border/icon/helper readable |
| E10 | Keyboard | Tab upload/send; focus-visible ring |
| E11 | Skill + 4 thumbs + stop | No overlap; stop rightmost |
| E12 | Model switch with staged files | One `warn.model_switch` |
| E13 | Reduced motion | No motion thrash |

### 9.7 Regression gates

```bash
npx vitest run src/modules/app_center/views/playground/deep-chat/request/visionAttachments.test.ts
npx vitest run src/modules/app_center/views/playground/deep-chat/request/handleRequest.vision.test.ts
npx vitest run src/modules/app_center/views/playground/deep-chat
npm run type-check
npm run lint:warning-gate
npx playwright test tests/e2e/deep-chat-send.spec.ts --project=chromium --workers=1
```

---

## 10. Rollout / rollback

| Item | Decision |
| --- | --- |
| Feature flag | **Not required** — vision path already partially live; M1 hardens it |
| Rollout | Normal deploy with Pages |
| Rollback | Cloudflare Pages previous deploy (PRODUCT_PRINCIPLES P8) |
| Kill switch | YAGNI; redeploy prior build if needed |
| Observability | Toasts + redacted logger; no new Sentry metric M1 |

---

## 11. M1 vs M2 boundary

| Item | Milestone |
| --- | --- |
| Total cap, SVG ban, whitelist, remote reject | **M1** |
| Dual-button CSS + submit-only aligner + padding 108/100 | **M1** |
| Helper outside card + Chinese microcopy | **M1** |
| Log redaction | **M1** |
| attachmentMeta count-only + history display | **M1** |
| Model-switch residual toast | **M1** |
| Full add-time validation | M2 |
| Client compress | M2 |
| Pre-grey at 4 files / error chips | M2 |
| Magic bytes / metrics / egress honesty copy | M2 |
| Scheme C / IndexedDB originals | M3 |

---

## 12. Risks & residual

| Risk | Mitigation |
| --- | --- |
| Wire size ≈ 4/3 of 12MB still 413 | Helper honesty; `err.payload_large`; M2 compress |
| Multi-turn model cannot see prior pixels | Meta line; no product promise of pixel memory |
| Non-vision paste swallowed by library | Best-effort host listener; residual if no event |
| Shadow DOM selector churn | Stable ids (`#upload-images-button`); e2e presence |
| Dual-button pin desync | Submit-only aligner + CSS upload + e2e gap pin |
| Gateway fetches attacker URL | Remote src rejected M1 |

---

## 13. Open items

**None for M1.** Deferred work is only explicit M2/M3 items in §11.

---

## 14. Changelog of decisions vs draft

| Topic | Draft / open | Formal lock |
| --- | --- | --- |
| Approach | B recommended | **B only** |
| Helper placement | Draft inside card option | **Outside card** (UI) |
| Helper copy | Longer “不写入本机会话” | **UI short** `helper.full` |
| Total cap | 12MB proposed | **12MB decoded SSOT** |
| Accept | Whitelist proposed | **Exact string; no `image/*`** |
| SVG | Ban proposed | **MIME+ext P0** |
| Remote URL | Soft risk note | **Reject M1** |
| GIF | Confusing out-of-scope wording | **No gifs entry; gif files OK** |
| Upload visual | Family with send | **Ghost secondary; dual-primary exclusion mandatory** |
| Aligner | Not specified | **Submit-only; upload CSS-only** |
| attachmentMeta | Optional light / underspecified | **`{ count: number }` only; display locked** |
| Compress | Optional P1 | **M1 no** |
| Feature flag | Silent | **Not required** |
| Non-vision entry | Hide | **Hide** (not grey) |
| Validation dual channel | Toast + reject | **Keep both; document** |
| Microcopy | Draft + UI drift | **UI §6 matrix SSOT** |
| Logging | “already redacts” (false for data URLs) | **Must redact data:image M1** |

---

## 15. Definition of Done

1. Vision entry discoverable; limits predictable; failures understandable in Chinese.  
2. No base64 in any storage path after success or validation fail.  
3. Unit + integration + send e2e gates green per §9.  
4. Upload ghost + send primary; geometry pins hold; stop unobstructed.  
5. History shows count meta honesty without original pixels.  
6. Scope remains images-only vision; no cloud storage.  
7. Spec + plan reviewed; no unresolved M1 open questions.

---

**Document owner:** Product + Frontend  
**Implements with:** Approach B · images-only · no base64 persistence · max 4 / 5MB / 12MB total · block SVG · reject remote · attachmentMeta count-only · no M1 compress · no feature flag  
