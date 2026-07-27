# Deep Chat Vision Upload UX M1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship production-ready Deep Chat vision image upload UX (Approach B): whitelist + total cap + SVG/remote reject, ghost dual-button geometry, helper microcopy, log redaction, and count-only history honesty — without base64 persistence or client compression.

**Architecture:** Keep deep-chat native images path. Harden pure validation in `visionAttachments.ts` (SSOT constants/errors). Wire prepare/toast/reject + optional `attachmentMeta.count` on store. Style upload as secondary ghost with dual-primary CSS exclusion; pin submit-only via aligner; inject helper chrome outside the input card. Model switch re-applies vision config and warns once if staged files remain.

**Tech Stack:** TypeScript, Vitest/jsdom, deep-chat web component (shadow DOM), Playwright E2E, existing `showToast` / EventBus patterns.

**Spec:** `docs/superpowers/specs/2026-07-27-deep-chat-vision-upload-ux-design.md`

## Global Constraints

- Approach **B only** — no deep-chat vendor fork, no scheme C composer rewrite.
- Images only; hide upload when `!supportsVision` (no grey fake button).
- **Never** persist base64 / `data:image` in thread, draft, or localStorage.
- Caps SSOT: `MAX_FILES=4`, `MAX_FILE=5MB`, `MAX_TOTAL=12MB` decoded in `visionAttachments.ts`.
- Accept whitelist only (png/jpeg/webp/gif); **block SVG and bmp**; no bare `image/*`.
- Reject remote `http(s)` image sources in M1.
- Upload: secondary ghost 36px; send remains primary; geometry end **55px** upload / **11px** send desktop; text padding **108** desktop / **100** mobile.
- Helper **outside** card; Chinese microcopy exact strings from formal spec §6.1.
- Dual-primary CSS exclusion mandatory (`:not(#upload-images-button)` or stronger ghost override).
- `alignSubmitButtonLayerToTextInput` targets **submit/stop only**, never first generic inside-end if it is upload.
- `redactSensitiveError` must strip/redact `data:image` URLs.
- `attachmentMeta` M1: `{ count: number }` only (no names/src); display `附 {n} 张图片（原图未保存）`.
- **No** client-side image compression in M1.
- **No** feature flag required; rollback = Pages previous deploy.
- Surgical edits; match existing style; keep ESLint warning gate at 0.
- TDD: failing tests first for pure validation and redaction.

## File structure (M1 touch list)

| File | Responsibility |
| --- | --- |
| `src/modules/app_center/views/playground/deep-chat/request/visionAttachments.ts` | Constants, whitelist, total cap, remote reject, error SSOT, images config |
| `…/request/visionAttachments.test.ts` | Unit tests for above |
| `…/request/handleRequest.ts` | Prepare wiring; stamp meta when saving vision turns |
| `…/request/handleRequest.vision.test.ts` | Integration: cap/SVG/meta/no base64 |
| `…/session/uiHooks.ts` | Redact data URLs |
| `…/session/uiHooks.test.ts` (create if missing) | Redaction unit tests |
| `…/session/conversationContext.ts` | `DeepChatAttachmentMeta` + normalize |
| `…/session/conversationContext.test.ts` | Meta normalize tests |
| `…/infra/deepChatConfig.ts` | Accept formats via resolve; tooltip; padding 108; helper hook call site if needed |
| `…/infra/deepChatStyles.ts` | Ghost upload, exclusion, geometry, strip, helper, reduced-motion |
| `…/composer/composerUi.ts` | Submit-only aligner selectors |
| `…/shell/shellUi.ts` | Model-switch residual toast |
| `…/types.ts` | Re-export meta type if needed |
| `tests/e2e/deep-chat-send.spec.ts` | Keep send pin; add dual-button spacing when vision available |
| `docs/CHANGELOG.md` | Unreleased note (repo habit) |

---

### Task 1: Constants + pure validation (total cap, SVG, whitelist, remote)

**Files:**
- Modify: `src/modules/app_center/views/playground/deep-chat/request/visionAttachments.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/request/visionAttachments.test.ts`

**Interfaces:**
- Consumes: existing `resolveDeepChatVisionUserParts`, `resolveDeepChatImagesConfig`
- Produces:
  - `DEEP_CHAT_VISION_MAX_TOTAL_BYTES = 12 * 1024 * 1024`
  - `DEEP_CHAT_VISION_ACCEPTED_FORMATS = 'image/png,image/jpeg,image/jpg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif'`
  - `DEEP_CHAT_VISION_ERROR` (or named exports) for exact Chinese strings
  - `isAllowedVisionImage(type?: string, name?: string): boolean`
  - `resolveDeepChatVisionUserParts` gains `maxTotalBytes?` and enforces total + SVG + remote reject
  - `resolveDeepChatImagesConfig(true).files.acceptedFormats === DEEP_CHAT_VISION_ACCEPTED_FORMATS`

- [ ] **Step 1: Write the failing tests**

Append to `visionAttachments.test.ts`:

```ts
import {
  DEEP_CHAT_VISION_ACCEPTED_FORMATS,
  DEEP_CHAT_VISION_MAX_TOTAL_BYTES,
  DEEP_CHAT_VISION_MAX_FILE_BYTES,
  resolveDeepChatImagesConfig,
  resolveDeepChatVisionUserParts,
} from './visionAttachments';

describe('vision accept whitelist', () => {
  it('exports exact acceptedFormats without bare image/*', () => {
    expect(DEEP_CHAT_VISION_ACCEPTED_FORMATS).toBe(
      'image/png,image/jpeg,image/jpg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif'
    );
    expect(DEEP_CHAT_VISION_ACCEPTED_FORMATS.includes('image/*')).toBe(false);
    const imagesConfig = resolveDeepChatImagesConfig(true);
    expect(imagesConfig).not.toBe(false);
    if (imagesConfig !== false) {
      expect(imagesConfig.files).toEqual({
        maxNumberOfFiles: 4,
        acceptedFormats: DEEP_CHAT_VISION_ACCEPTED_FORMATS,
      });
      // button.tooltip optional if library types reject it — constant still exported
      if (imagesConfig.button?.tooltip) {
        expect(imagesConfig.button.tooltip).toBe('上传图片');
      }
    }
  });
});

describe('resolveDeepChatVisionUserParts hardening', () => {
  it('rejects SVG by mime', async () => {
    const result = await resolveDeepChatVisionUserParts({
      body: {
        messages: [
          {
            role: 'user',
            text: 'x',
            files: [
              {
                type: 'image/svg+xml',
                src: 'data:image/svg+xml;base64,PHN2Zy8+',
                name: 'a.svg',
              },
            ],
          },
        ],
      },
      supportsVision: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('不支持 SVG 图片，请改用 PNG 或 JPEG。');
    }
  });

  it('rejects SVG by extension even if mime looks png', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'evil.svg', {
      type: 'image/png',
    });
    const result = await resolveDeepChatVisionUserParts({
      body: { text: 'x', files: [file] },
      supportsVision: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('SVG');
    }
  });

  it('rejects bmp', async () => {
    const file = new File([new Uint8Array([1])], 'a.bmp', { type: 'image/bmp' });
    const result = await resolveDeepChatVisionUserParts({
      body: { text: 'x', files: [file] },
      supportsVision: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        '不支持的文件类型，请使用 PNG、JPEG、WebP 或 GIF。'
      );
    }
  });

  it('rejects remote https image src', async () => {
    const result = await resolveDeepChatVisionUserParts({
      body: {
        messages: [
          {
            role: 'user',
            text: 'url',
            files: [{ type: 'image', src: 'https://cdn.example.com/a.png', name: 'a.png' }],
          },
        ],
      },
      supportsVision: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('不支持网络图片地址，请上传本地图片文件。');
    }
  });

  it('fails closed when decoded total exceeds 12MB', async () => {
    // Three ~4.1MB data URLs → over 12MB total, each under 5MB
    const per = Math.floor(DEEP_CHAT_VISION_MAX_FILE_BYTES * 0.82);
    const payload = 'A'.repeat(Math.ceil((per * 4) / 3) + 16);
    const src = `data:image/png;base64,${payload}`;
    const files = [0, 1, 2].map(i => ({
      type: 'image',
      src,
      name: `t${i}.png`,
    }));
    const result = await resolveDeepChatVisionUserParts({
      body: { messages: [{ role: 'user', text: 'big', files }] },
      supportsVision: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('本轮图片合计超过 12MB，请压缩或减少张数。');
    }
    expect(DEEP_CHAT_VISION_MAX_TOTAL_BYTES).toBe(12 * 1024 * 1024);
  });

  it('keeps non-vision and per-file size messages', async () => {
    // existing tests remain; update http acceptance test to expect reject
  });
});
```

**Critical:** Update the existing test `accepts http(s) image urls without size estimation` to expect **reject** (remote policy flip). Update `only uses files from the latest user message` to use data URLs instead of https.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npx vitest run src/modules/app_center/views/playground/deep-chat/request/visionAttachments.test.ts
```

Expected: FAIL — missing `DEEP_CHAT_VISION_MAX_TOTAL_BYTES` / still accepts `image/*` and https / SVG still allowed.

- [ ] **Step 3: Implement minimal validation**

In `visionAttachments.ts`:

```ts
export const DEEP_CHAT_VISION_MAX_TOTAL_BYTES = 12 * 1024 * 1024;

export const DEEP_CHAT_VISION_ACCEPTED_FORMATS =
  'image/png,image/jpeg,image/jpg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif';

export const DEEP_CHAT_VISION_COPY = {
  maxCount: (n: number) => `单次最多上传 ${n} 张图片，请减少后重试。`,
  maxFile: (name: string, mb: number) =>
    `图片「${name || '未命名'}」超过 ${mb}MB 上限。`,
  maxTotal: (mb: number) => `本轮图片合计超过 ${mb}MB，请压缩或减少张数。`,
  type: '不支持的文件类型，请使用 PNG、JPEG、WebP 或 GIF。',
  svg: '不支持 SVG 图片，请改用 PNG 或 JPEG。',
  nonVision: '当前模型不支持图片输入，请切换到支持视觉的模型后再试。',
  remote: '不支持网络图片地址，请上传本地图片文件。',
  read: '图片读取失败，请重试。',
  /** Gateway / provider payload-too-large (decoded 12MB still expands ~4/3 on wire). */
  payloadLarge: '图片过大或网关拒绝，请减少张数或压缩。',
  helper: '最多 4 张 · 单张 ≤ 5MB · 合计 ≤ 12MB · 仅当轮发送',
  uploadTooltip: '上传图片',
  uploadAria: '上传图片，最多四张',
  historyMeta: (n: number) => `附 ${n} 张图片（原图未保存）`,
  modelSwitch: '已切换到不支持图片的模型，发送前请移除图片或换回视觉模型。',
} as const;

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

function isSvg(type?: string, name?: string): boolean {
  if (type && /image\/svg\+xml/i.test(type)) return true;
  if (name && /\.svg$/i.test(name)) return true;
  return false;
}

export function isAllowedVisionImage(type?: string, name?: string): boolean {
  if (isSvg(type, name)) return false;
  const mime = (type || '').toLowerCase().trim();
  if (mime && ALLOWED_MIME.has(mime)) return true;
  if (name && /\.(png|jpe?g|webp|gif)$/i.test(name)) {
    // extension ok only if mime empty or also allowed / generic image
    if (!mime || mime === 'image' || ALLOWED_MIME.has(mime)) return true;
  }
  return false;
}

function estimateCandidateBytes(candidate: FileCandidate): number | null {
  if (candidate.file) return candidate.file.size;
  const src = candidate.src?.trim() || '';
  if (isDataUrlImage(src)) return estimateDataUrlBytes(src);
  return null; // remote/unknown handled separately
}
```

Rewrite `partFromSrc` / `partFromNativeFile` / loop in `resolveDeepChatVisionUserParts`:

```ts
// In resolveDeepChatVisionUserParts after count check:
const maxTotalBytes = args.maxTotalBytes ?? DEEP_CHAT_VISION_MAX_TOTAL_BYTES;
let totalBytes = 0;
const parts: DeepChatVisionUserPart[] = [];

for (const candidate of candidates) {
  if (isSvg(candidate.type, candidate.name)) {
    return { ok: false, error: DEEP_CHAT_VISION_COPY.svg };
  }
  if (candidate.file) {
    if (!isAllowedVisionImage(candidate.file.type, candidate.file.name)) {
      return { ok: false, error: DEEP_CHAT_VISION_COPY.type };
    }
  } else if (candidate.src) {
    const src = candidate.src.trim();
    if (isHttpImageUrl(src)) {
      return { ok: false, error: DEEP_CHAT_VISION_COPY.remote };
    }
    if (isDataUrlImage(src)) {
      const mimeMatch = /^data:(image\/[a-z0-9.+-]+)/i.exec(src);
      const mime = mimeMatch?.[1];
      if (isSvg(mime, candidate.name) || !isAllowedVisionImage(mime, candidate.name)) {
        return {
          ok: false,
          error: isSvg(mime, candidate.name)
            ? DEEP_CHAT_VISION_COPY.svg
            : DEEP_CHAT_VISION_COPY.type,
        };
      }
    }
  }

  const size = estimateCandidateBytes(candidate);
  if (size !== null && size > maxFileBytes) {
    return {
      ok: false,
      error: DEEP_CHAT_VISION_COPY.maxFile(
        candidate.name || '',
        Math.floor(maxFileBytes / (1024 * 1024))
      ),
    };
  }
  if (size !== null) {
    totalBytes += size;
    if (totalBytes > maxTotalBytes) {
      return {
        ok: false,
        error: DEEP_CHAT_VISION_COPY.maxTotal(
          Math.floor(maxTotalBytes / (1024 * 1024))
        ),
      };
    }
  }

  const result = await partFromFileCandidate(candidate, maxFileBytes);
  if (!result.ok) return result;
  parts.push(...result.parts);
}
return { ok: true, parts };
```

Update `resolveDeepChatImagesConfig`:

```ts
return {
  files: {
    maxNumberOfFiles: DEEP_CHAT_VISION_MAX_FILES,
    acceptedFormats: DEEP_CHAT_VISION_ACCEPTED_FORMATS,
  },
  button: {
    tooltip: DEEP_CHAT_VISION_COPY.uploadTooltip,
  },
};
```

(If deep-chat types reject `button`, put tooltip only in CSS `title` / aria later in Task 3 — but keep constant exported.)

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npx vitest run src/modules/app_center/views/playground/deep-chat/request/visionAttachments.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/modules/app_center/views/playground/deep-chat/request/visionAttachments.ts src/modules/app_center/views/playground/deep-chat/request/visionAttachments.test.ts
git commit -m "feat(deep-chat): harden vision attach caps, whitelist, and remote reject"
```

---

### Task 2: handleRequest integration + redaction + attachmentMeta stamp

**Files:**
- Modify: `src/modules/app_center/views/playground/deep-chat/session/uiHooks.ts`
- Create or modify: `src/modules/app_center/views/playground/deep-chat/session/uiHooks.test.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/session/conversationContext.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/session/conversationContext.test.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/request/handleRequest.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/request/handleRequest.vision.test.ts`
- Modify: path that implements `saveThreadMessages` / `buildStoredThreadMessages` as needed to accept per-user meta

**Interfaces:**
- Consumes: `ResolveDeepChatVisionResult`, `DEEP_CHAT_VISION_COPY`
- Produces:
  - `DeepChatAttachmentMeta = { count: number }`
  - `formatVisionAttachmentMetaLabel(count: number): string` → `附 ${count} 张图片（原图未保存）`
  - `normalizeAttachmentMeta(raw: unknown): DeepChatAttachmentMeta | undefined`
  - `redactSensitiveError` redacts data URLs
  - On successful prepare with `visionUserParts.length > 0`, stored user message gets `attachmentMeta: { count }`

- [ ] **Step 1: Failing tests — redaction**

```ts
// uiHooks.test.ts
import { describe, expect, it } from 'vitest';
import { redactSensitiveError } from './uiHooks';

describe('redactSensitiveError vision payloads', () => {
  it('redacts data:image values in objects', () => {
    const huge = 'data:image/png;base64,' + 'A'.repeat(200);
    const redacted = redactSensitiveError({
      message: 'fail',
      image_url: huge,
      nested: { src: huge },
    }) as Record<string, unknown>;
    const serialized = JSON.stringify(redacted);
    expect(serialized).not.toContain('data:image/png;base64,AAA');
    expect(serialized).toMatch(/REDACTED|data:image/i); // short marker ok
    expect(serialized.length).toBeLessThan(huge.length);
  });

  it('redacts long base64-looking strings in Error message if present', () => {
    const err = new Error('boom data:image/jpeg;base64,' + 'B'.repeat(120));
    const redacted = redactSensitiveError(err) as { message: string };
    expect(redacted.message).not.toContain('BBBBBBBBBB');
  });
});
```

- [ ] **Step 2: Failing tests — meta normalize**

```ts
// conversationContext.test.ts additions
import {
  normalizeAttachmentMeta,
  type DeepChatMessage,
  normalizeStoredThreadMessages,
} from './conversationContext';

it('normalizeAttachmentMeta keeps finite count 1-4 only', () => {
  expect(normalizeAttachmentMeta({ count: 2 })).toEqual({ count: 2 });
  expect(normalizeAttachmentMeta({ count: 0 })).toBeUndefined();
  expect(normalizeAttachmentMeta({ count: 5 })).toBeUndefined();
  expect(normalizeAttachmentMeta({ count: 2, src: 'data:image/png;base64,xx' })).toEqual({
    count: 2,
  });
  expect(normalizeAttachmentMeta('x')).toBeUndefined();
});

it('normalizeStoredThreadMessages preserves attachmentMeta without inventing files', () => {
  const messages: DeepChatMessage[] = [
    { role: 'user', text: '[图片]', attachmentMeta: { count: 2 }, createdAt: 1 },
  ];
  const out = normalizeStoredThreadMessages(messages);
  expect(out[0]?.attachmentMeta).toEqual({ count: 2 });
  expect(JSON.stringify(out)).not.toContain('data:image');
});
```

- [ ] **Step 3: Failing tests — handleRequest vision**

```ts
// handleRequest.vision.test.ts
it('rejects total over cap with toast and no callLLM', async () => {
  resolveModelCapability.mockReturnValue({
    supportsVision: true,
    supportsReasoning: false,
    supportsTools: false,
    reasoningEfforts: [],
    mapRequest: null,
  });
  // build 3 large data urls under per-file, over total — same as unit helper
  // expect callLLM not called; showToast with 12MB copy
});

it('stamps attachmentMeta.count on stored user message without base64', async () => {
  resolveModelCapability.mockReturnValue({
    supportsVision: true,
    supportsReasoning: false,
    supportsTools: false,
    reasoningEfforts: [],
    mapRequest: null,
  });
  const src = tinyPngDataUrl();
  await handleDeepChatRequest(
    document.createElement('div'),
    {
      text: 'describe',
      messages: [
        {
          role: 'user',
          text: 'describe',
          files: [{ type: 'image', src, name: 'a.png' }],
        },
      ],
    },
    { onResponse: vi.fn(async () => undefined), onClose: vi.fn() }
  );
  const thread = sessionState.threadStore.threads[0];
  const user = thread?.messages.find(m => m.role === 'user');
  expect(user?.attachmentMeta).toEqual({ count: 1 });
  expect(JSON.stringify(thread)).not.toContain('data:image');
});
```

- [ ] **Step 4: Run tests — expect FAIL**

```powershell
npx vitest run src/modules/app_center/views/playground/deep-chat/session/uiHooks.test.ts src/modules/app_center/views/playground/deep-chat/session/conversationContext.test.ts src/modules/app_center/views/playground/deep-chat/request/handleRequest.vision.test.ts
```

- [ ] **Step 5: Implement redaction**

```ts
// uiHooks.ts — inside JSON.stringify replacer and Error path
function redactString(value: string): string {
  if (/data:image\//i.test(value) || /data:image\//i.test(value.slice(0, 64))) {
    return '[REDACTED_IMAGE_DATA]';
  }
  // long base64-ish blobs
  if (value.length > 256 && /^[A-Za-z0-9+/=\s]+$/.test(value.slice(0, 80)) && value.length > 512) {
    return '[REDACTED_BASE64]';
  }
  return value.replace(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/gi, '[REDACTED_IMAGE_DATA]');
}

export function redactSensitiveError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redactString(error.message),
      stack: error.stack ? redactString(error.stack) : error.stack,
    };
  }
  // ... existing object path with replacer:
  // if (typeof value === 'string') return redactString(value);
  // keep api key redaction
}
```

- [ ] **Step 6: Implement meta type + normalize**

```ts
// conversationContext.ts
export interface DeepChatAttachmentMeta {
  count: number;
}

export function normalizeAttachmentMeta(raw: unknown): DeepChatAttachmentMeta | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const count = (raw as { count?: unknown }).count;
  if (typeof count !== 'number' || !Number.isFinite(count)) return undefined;
  const n = Math.round(count);
  if (n < 1 || n > 4) return undefined;
  return { count: n };
}

export function formatVisionAttachmentMetaLabel(count: number): string {
  return `附 ${count} 张图片（原图未保存）`;
}
```

In `normalizeStoredMessage`, preserve:

```ts
const attachmentMeta = normalizeAttachmentMeta(
  (message as DeepChatMessage).attachmentMeta
);
// include in returned message if defined
```

- [ ] **Step 7: Stamp meta on save path**

Locate `saveThreadMessages` (request/lifecycle or session). Extend options:

```ts
export type SaveThreadMessagesOptions = {
  threadId?: string;
  // existing assistant fields…
  userAttachmentMeta?: DeepChatAttachmentMeta;
};
```

When building stored messages for the newest user turn, if `userAttachmentMeta` set, attach to that user message only.

In `handleDeepChatRequest` after prepare:

```ts
const userAttachmentMeta =
  visionUserParts && visionUserParts.length > 0
    ? { count: visionUserParts.length }
    : undefined;

saveThreadMessages(container, conversationMessages, '', {
  threadId: activeThread.id,
  ...(userAttachmentMeta ? { userAttachmentMeta } : {}),
});
// and again on final assistant save with same userAttachmentMeta so user row is not stripped
```

Ensure `buildStoredThreadMessages` can merge meta onto the last matching new user message without putting meta on assistant.

Also extend `SaveThreadMessagesOptions` in `types.ts` (or the local type export used by `threadStore.ts`) with `userAttachmentMeta?: DeepChatAttachmentMeta`.

- [ ] **Step 7b: Best-effort `err.payload_large` mapping (LLM path)**

In the LLM catch path of `handleRequest` (where `showLlmFailureToast` / `formatDeepChatErrorResponse` run), if the error message/status looks like payload-too-large / 413 / content length, prefer toast/user text from `DEEP_CHAT_VISION_COPY.payloadLarge` when the failed turn had vision parts (or any staged image send). Do **not** invent a new error subsystem — string match / status code only:

```ts
function looksLikePayloadTooLarge(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return /413|payload|too large|content.?length|request entity|entity too large|context_length|maximum context/i.test(
    msg
  );
}
// when visionUserParts?.length and looksLikePayloadTooLarge(error):
// use DEEP_CHAT_VISION_COPY.payloadLarge for toast title/body preference
```

If no reliable signal exists, keep generic LLM failure toast (residual risk already accepted). Unit test optional; manual E5/E6 still covers total-cap path.

- [ ] **Step 8: History display hook (minimal)**

If message toolbar / bubble render already shows user text only, add a small secondary line when `message.attachmentMeta` exists:

Prefer existing toolbar or message chrome path that iterates stored messages. Minimal approach:

```ts
// wherever user bubble secondary chrome is built (messageToolbar or generation chrome helper)
if (message.role === 'user' && message.attachmentMeta?.count) {
  // create span.deep-chat-vision-history-meta with textContent =
  // formatVisionAttachmentMetaLabel(message.attachmentMeta.count)
}
```

If no stable render hook without large refactor, **acceptable M1 fallback**: append meta as a second line in **display-only** history mapping (`getThreadDisplayMessages`) using `text` display transform that does **not** change LLM `conversationMessages` — verify LLM path uses content without meta suffix.

Safer lock for M1 if display hook is heavy: store meta field + unit test serialization; render via `getThreadDisplayMessages`:

```ts
// display-only mapping
if (msg.attachmentMeta?.count) {
  return {
    ...msg,
    text: `${msg.text || ''}\n${formatVisionAttachmentMetaLabel(msg.attachmentMeta.count)}`.trim(),
  };
}
```

**Must ensure** `createDeepChatRequestMessages` / history→LLM uses stored text **without** re-injecting images and without requiring meta in model prompt. If display mapping mutates text only for `chat.history`, keep LLM merge on raw stored text (`[图片]` / user prose) — meta line in history UI is OK to include for honesty (model seeing “原图未保存” is acceptable).

- [ ] **Step 9: Run tests PASS**

```powershell
npx vitest run src/modules/app_center/views/playground/deep-chat/session/uiHooks.test.ts src/modules/app_center/views/playground/deep-chat/session/conversationContext.test.ts src/modules/app_center/views/playground/deep-chat/request/handleRequest.vision.test.ts
```

- [ ] **Step 10: Commit**

```powershell
git add src/modules/app_center/views/playground/deep-chat/session/uiHooks.ts src/modules/app_center/views/playground/deep-chat/session/uiHooks.test.ts src/modules/app_center/views/playground/deep-chat/session/conversationContext.ts src/modules/app_center/views/playground/deep-chat/session/conversationContext.test.ts src/modules/app_center/views/playground/deep-chat/request/handleRequest.ts src/modules/app_center/views/playground/deep-chat/request/handleRequest.vision.test.ts
git commit -m "feat(deep-chat): redact vision data URLs and stamp attachmentMeta count"
```

---

### Task 3: deepChatConfig images accept + Chinese tooltip + text padding

**Files:**
- Modify: `src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/request/visionAttachments.ts` (if tooltip shape needs tweak)

**Interfaces:**
- Consumes: `resolveDeepChatImagesConfig`, `DEEP_CHAT_VISION_COPY`
- Produces: textInput padding right **108px** desktop dual-write; `chat.images` uses whitelist config

- [ ] **Step 1: Update text padding dual-write**

In `configureDeepChatTextInputStyles`:

```ts
padding: '18px 108px 16px 22px',
```

Keep placeholder `有问题，尽管问`.

- [ ] **Step 2: Ensure apply path uses resolveDeepChatImagesConfig only**

```ts
export function applyDeepChatVisionUploadConfig(chat: DeepChatElement | null | undefined): void {
  if (!chat) return;
  const supportsVision = resolveCurrentModelSupportsVision();
  chat.images = resolveDeepChatImagesConfig(supportsVision);
  chat.classList.toggle('is-vision-enabled', supportsVision);
}
```

No extra logic beyond class + images (helper sync in Task 5/6).

- [ ] **Step 3: Type-check**

```powershell
npm run type-check
```

Expected: PASS (or fix images button type if deep-chat config shape complains — cast `as Record<string, unknown>` if needed).

- [ ] **Step 4: Commit**

```powershell
git add src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts
git commit -m "feat(deep-chat): vision images whitelist config and dual-button text padding"
```

---

### Task 4: deepChatStyles — upload secondary, dual-primary exclusion, strip, helper, motion

**Files:**
- Modify: `src/modules/app_center/views/playground/deep-chat/infra/deepChatStyles.ts`

**Interfaces:**
- Consumes: host class `is-vision-enabled`, `#upload-images-button`, `.deep-chat-vision-helper`
- Produces: CSS contract matching formal spec §7.2–7.5

- [ ] **Step 1: Exclude upload from solid inside-end rules**

Change every send solid selector that matches bare `.input-button.inside-end` to:

```css
.input-button.inside-end:not(#upload-images-button),
.inside-end.input-button:not(#upload-images-button),
.inside-end.submit-button,
.inside-end.disabled-button,
.inside-end.loading-button {
  /* existing send geometry/colors */
}
```

Apply the same `:not(#upload-images-button)` to hover/active/disabled/stop rules that would paint upload as primary/red.

- [ ] **Step 2: Upload ghost + geometry block**

```css
:host(.is-vision-enabled) #upload-images-button {
  display: flex !important;
  position: absolute !important;
  width: 36px !important;
  height: 36px !important;
  inset-inline-end: max(55px, calc((100% - 768px) / 2 + 55px)) !important;
  inset-block-end: 11px !important;
  inset-block-start: auto !important;
  margin: 0 !important;
  transform: none !important;
  border-radius: 50% !important;
  border: 1px solid var(--deep-chat-accent-border, rgba(168, 95, 63, 0.35)) !important;
  background: var(--deep-chat-surface, #ffffff) !important;
  box-shadow: none !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  opacity: 1 !important;
  transition: background 150ms cubic-bezier(0, 0, 0.2, 1), border-color 150ms cubic-bezier(0, 0, 0.2, 1) !important;
}

:host(.is-vision-enabled) #upload-images-button::after {
  content: '' !important;
  position: absolute !important;
  inset: -4px !important; /* ~44 hit target */
}

:host(.is-vision-enabled) #upload-images-button:hover,
:host(.is-vision-enabled) #upload-images-button:focus-visible {
  background: var(--deep-chat-accent-soft, #faf3ee) !important;
  border-color: var(--deep-chat-accent-border-hover, rgba(168, 95, 63, 0.55)) !important;
}

:host(.is-vision-enabled) #upload-images-button:focus-visible {
  outline: 2px solid rgba(var(--deep-chat-accent-rgb, 168, 95, 63), 0.75) !important;
  outline-offset: 2px !important;
}

:host(.is-pending-generation) #upload-images-button {
  opacity: 0.5 !important;
  pointer-events: none !important;
  cursor: not-allowed !important;
}
```

- [ ] **Step 3: Text padding + skill dock**

```css
#text-input {
  padding: 18px 108px 16px 22px !important;
}

#text-input-container.has-session-skill-chip-dock > #deep-chat-session-skill-chip-dock {
  padding: 10px 108px 0 14px !important;
}
```

Mobile `@media (max-width: 640px)`:

```css
#text-input {
  padding: 17px 100px 15px 18px !important;
}
#text-input-container.has-session-skill-chip-dock > #deep-chat-session-skill-chip-dock {
  padding: 10px 100px 0 14px !important;
}
:host(.is-vision-enabled) #upload-images-button {
  inset-inline-end: 54px !important;
  inset-block-end: 10px !important;
}
```

- [ ] **Step 4: Attachment strip token polish**

```css
#file-attachment-container {
  padding: 8px 12px 0 14px !important;
  gap: 8px !important;
  overflow-x: auto !important;
}

#file-attachment-container img,
#file-attachment-container .image-attachment,
#file-attachment-container [class*='attachment'] img {
  width: 44px !important;
  height: 44px !important;
  object-fit: cover !important;
  border-radius: 8px !important;
  border: 1px solid var(--deep-chat-hairline, #e2e8f0) !important;
}
```

(Adjust selectors after one runtime DOM spike if class names differ — keep stable ids preferred.)

- [ ] **Step 5: Helper styles**

```css
.deep-chat-vision-helper {
  display: none;
  box-sizing: border-box;
  width: min(100%, 768px);
  margin: 8px auto 0;
  padding: 0 12px;
  color: var(--deep-chat-ink-muted, #64748b);
  font-size: 12px;
  line-height: 1.4;
  font-weight: 400;
  text-align: left;
}

:host(.is-vision-enabled) .deep-chat-vision-helper {
  display: block;
}
```

Note: helper may live in light DOM host; if so, style from shell CSS or inject with inline class under host container (Task 5). Keep auxiliaryStyle rule for shadow if injected inside `#input`.

- [ ] **Step 6: reduced-motion**

Extend existing block:

```css
@media (prefers-reduced-motion: reduce) {
  #upload-images-button,
  #file-attachment-container,
  .deep-chat-vision-helper {
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 7: Manual visual smoke (dev)** — open Deep Chat with vision model; confirm ghost upload left of send, no dual solid primary.

- [ ] **Step 8: Commit**

```powershell
git add src/modules/app_center/views/playground/deep-chat/infra/deepChatStyles.ts
git commit -m "style(deep-chat): ghost vision upload button and dual-primary CSS exclusion"
```

---

### Task 5: Composer geometry — submit-only aligner + helper host chrome

**Files:**
- Modify: `src/modules/app_center/views/playground/deep-chat/composer/composerUi.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts` or `shell/shellUi.ts` for helper inject
- Optional unit: existing composer tests if present; else e2e in Task 8

**Interfaces:**
- Consumes: `DeepChatElement`, `DEEP_CHAT_VISION_COPY.helper`
- Produces:
  - `alignSubmitButtonLayerToTextInput` never selects `#upload-images-button`
  - `syncDeepChatVisionHelper(chat | container, supportsVision: boolean): void`

- [ ] **Step 1: Fix aligner query**

Replace:

```ts
const button = root?.querySelector<HTMLElement>('.input-button.inside-end');
```

With:

```ts
const button =
  root?.querySelector<HTMLElement>(
    '.input-button.inside-end:not(#upload-images-button)[data-deep-chat-stop-active], .input-button.inside-end.submit-button:not(#upload-images-button), .input-button.inside-end.loading-button:not(#upload-images-button), .input-button.inside-end.disabled-button:not(#upload-images-button), .input-button.inside-end:not(#upload-images-button)'
  ) || null;
```

Also update `observeSubmitButtonPin` / `syncSubmitButtonMetadata` call sites that query `.input-button.inside-end` for stop aria — same exclusion.

- [ ] **Step 2: Helper inject**

```ts
export function syncDeepChatVisionHelper(
  chat: DeepChatElement | null | undefined,
  supportsVision: boolean
): void {
  if (!chat?.shadowRoot) return;
  const input = chat.shadowRoot.querySelector('#input');
  if (!input) return;
  let helper = chat.shadowRoot.querySelector<HTMLElement>('.deep-chat-vision-helper');
  if (!supportsVision) {
    helper?.remove();
    return;
  }
  if (!helper) {
    helper = document.createElement('div');
    helper.className = 'deep-chat-vision-helper';
    helper.setAttribute('aria-hidden', 'true');
    helper.textContent = DEEP_CHAT_VISION_COPY.helper;
    // place after #text-input-container inside #input
    const card = input.querySelector('#text-input-container');
    if (card?.nextSibling) {
      input.insertBefore(helper, card.nextSibling);
    } else {
      input.appendChild(helper);
    }
  } else {
    helper.textContent = DEEP_CHAT_VISION_COPY.helper;
  }
}
```

Call from `applyDeepChatVisionUploadConfig`:

```ts
chat.images = resolveDeepChatImagesConfig(supportsVision);
chat.classList.toggle('is-vision-enabled', supportsVision);
syncDeepChatVisionHelper(chat, supportsVision);
```

(If circular import, put `syncDeepChatVisionHelper` in `deepChatConfig.ts` or a tiny `visionHelperUi.ts` under composer/infra.)

- [ ] **Step 3: Aria on upload (best-effort)**

After vision enable, optional:

```ts
const upload = chat.shadowRoot?.querySelector<HTMLElement>('#upload-images-button');
if (upload) {
  upload.setAttribute('aria-label', DEEP_CHAT_VISION_COPY.uploadAria);
  upload.setAttribute('title', DEEP_CHAT_VISION_COPY.uploadTooltip);
}
```

- [ ] **Step 4: Run deep-chat unit suite smoke**

```powershell
npx vitest run src/modules/app_center/views/playground/deep-chat/request/visionAttachments.test.ts
npm run type-check
```

- [ ] **Step 5: Commit**

```powershell
git add src/modules/app_center/views/playground/deep-chat/composer/composerUi.ts src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts
git commit -m "fix(deep-chat): submit-only button aligner and vision helper chrome"
```

---

### Task 6: Model switch residual-attachment messaging

**Files:**
- Modify: `src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts` (optional shared helper)

**Interfaces:**
- Consumes: `applyDeepChatVisionUploadConfig`, `showToast`, `DEEP_CHAT_VISION_COPY` / warn string
- Produces: at most one `warn.model_switch` per switch when leaving vision with staged files

- [ ] **Step 1: Helper to detect staged composer files**

```ts
export function deepChatHasStagedImageAttachments(chat: DeepChatElement | null | undefined): boolean {
  const root = chat?.shadowRoot;
  if (!root) return false;
  const strip = root.querySelector('#file-attachment-container');
  if (strip && strip.childElementCount > 0) return true;
  const fileInput = root.querySelector<HTMLInputElement>('#file-input');
  if (fileInput?.files && fileInput.files.length > 0) return true;
  return false;
}
```

- [ ] **Step 2: Wire model change**

In `onModelChange` (shellUi ~190):

```ts
const chat = getChat(container);
const hadVision = chat?.classList.contains('is-vision-enabled') ?? false;
const hadFiles = deepChatHasStagedImageAttachments(chat);

sessionState.selectedModel = nextModel;
syncDeepChatReasoningControlsFromThread(container);
applyDeepChatVisionUploadConfig(chat);

const hasVision = chat?.classList.contains('is-vision-enabled') ?? false;
if (hadVision && !hasVision && hadFiles) {
  showToast(DEEP_CHAT_VISION_COPY.modelSwitch, {
    type: 'warning',
  });
}
```

Do **not** clear attachments.

- [ ] **Step 3: Best-effort non-vision paste (optional soft)**

If low-cost: on container paste when `!is-vision-enabled` and clipboard has files/items image → toast `err.non_vision`. If unreliable in unit env, skip automation; document manual E2 residual.

```ts
const onPaste = (event: ClipboardEvent): void => {
  const chat = getChat(container);
  if (!chat || chat.classList.contains('is-vision-enabled')) return;
  const items = event.clipboardData?.items;
  if (!items) return;
  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      showToast('当前模型不支持图片输入，请切换到支持视觉的模型后再试。', {
        type: 'warning',
      });
      break;
    }
  }
};
container.addEventListener('paste', onPaste);
sessionState.cleanupCallbacks.push(() => container.removeEventListener('paste', onPaste));
```

- [ ] **Step 4: Commit**

```powershell
git add src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts src/modules/app_center/views/playground/deep-chat/infra/deepChatConfig.ts
git commit -m "feat(deep-chat): warn once when model switch leaves staged vision images"
```

---

### Task 7: Unit/integration green + E2E dual-button pins + manual matrix

**Files:**
- Modify: `tests/e2e/deep-chat-send.spec.ts`
- Possibly mock vision model in e2e helpers if required

**Interfaces:**
- Consumes: shadow `#upload-images-button`, send `.input-button.inside-end:not(#upload-images-button)`
- Produces: Playwright assertions for spacing when vision enabled

- [ ] **Step 1: Run full deep-chat unit suite**

```powershell
npx vitest run src/modules/app_center/views/playground/deep-chat
npm run type-check
npm run lint:warning-gate
```

Expected: PASS. Fix any fallout from remote URL test flips or config shape.

- [ ] **Step 2: Extend e2e helper**

```ts
async function getDualButtonGeometry(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector('#deep-chat-view')?.shadowRoot;
    const send = root?.querySelector<HTMLElement>(
      '.input-button.inside-end:not(#upload-images-button)'
    );
    const upload = root?.querySelector<HTMLElement>('#upload-images-button');
    if (!send) return null;
    const s = send.getBoundingClientRect();
    const u = upload && getComputedStyle(upload).display !== 'none'
      ? upload.getBoundingClientRect()
      : null;
    return {
      sendRightGap: /* existing pin math */,
      uploadVisible: Boolean(u && u.width > 0),
      gap: u ? s.left - u.right : null,
      bottomDelta: u ? Math.abs(s.bottom - u.bottom) : null,
      uploadBg: upload ? getComputedStyle(upload).backgroundColor : null,
      sendBg: getComputedStyle(send).backgroundColor,
    };
  });
}
```

When a vision-capable model can be selected in e2e fixtures:

```ts
test('keeps vision upload secondary and spaced from send', async ({ page }) => {
  // seed + open + select vision model if fixture supports
  await expect.poll(async () => {
    const g = await getDualButtonGeometry(page);
    return (
      g &&
      g.uploadVisible &&
      g.gap !== null &&
      Math.abs((g.gap as number) - 8) <= 2 &&
      (g.bottomDelta as number) <= 2 &&
      g.uploadBg !== g.sendBg
    );
  }).toBe(true);
});
```

If e2e cannot select vision models reliably, keep send pin tests mandatory and mark dual-button as **manual E1/V1** in matrix — do not skip send regression tests.

- [ ] **Step 3: Run send e2e**

```powershell
npx playwright test tests/e2e/deep-chat-send.spec.ts --project=chromium --workers=1
```

Expected: existing pin tests PASS; new test PASS or skipped with documented reason.

- [ ] **Step 4: Document manual E2E matrix in PR / commit message body**

Copy checklist from formal spec §9.6 (E1–E13).

- [ ] **Step 5: Commit**

```powershell
git add tests/e2e/deep-chat-send.spec.ts
git commit -m "test(deep-chat): pin vision upload spacing and keep send geometry green"
```

---

### Task 8: CHANGELOG note

**Files:**
- Modify: `docs/CHANGELOG.md` (Unreleased)

- [ ] **Step 1: Add Unreleased bullet**

```markdown
### Changed
- Deep Chat vision upload: whitelist formats (no SVG), 12MB total cap, ghost upload control, helper limits line, count-only history honesty, safer error redaction.
```

- [ ] **Step 2: Commit**

```powershell
git add docs/CHANGELOG.md
git commit -m "docs: note deep-chat vision upload UX M1 in changelog"
```

---

## Spec coverage self-review

| Spec requirement | Task |
| --- | --- |
| Total 12MB SSOT + tests | 1 |
| SVG + whitelist + no `image/*` | 1, 3 |
| Remote URL reject | 1 |
| Microcopy SSOT errors (incl. remote / payloadLarge / modelSwitch) | 1 |
| handleRequest toast + reject dual channel | 2 (existing + new cases) |
| No base64 persist | 2 |
| attachmentMeta `{ count }` + display | 2 |
| `err.payload_large` best-effort LLM 413 map | 2 (Step 7b) |
| redactSensitiveError data:image | 2 |
| images config + tooltip + padding 108 | 3 |
| Ghost upload + dual-primary exclusion | 4 |
| Geometry 55/11 + mobile 54/10 + skill dock 108/100 | 4 |
| Attachment strip tokens | 4 |
| Helper outside card | 4, 5 |
| Submit-only aligner | 5 |
| Model switch residual toast | 6 |
| Non-vision paste best-effort | 6 |
| Unit/integration/e2e gates | 7 |
| Manual matrix E1–E13 | 7 |
| CHANGELOG | 8 |
| No compress / no feature flag | Global constraints (no task adds them) |

## Placeholder scan

No TBD/TODO left in tasks. Remote policy, meta schema, and dual-channel errors are concrete.

## Type consistency

- `DEEP_CHAT_VISION_MAX_TOTAL_BYTES` / `DEEP_CHAT_VISION_ACCEPTED_FORMATS` / `DEEP_CHAT_VISION_COPY` defined Task 1; consumed Tasks 2–6.
- `DeepChatAttachmentMeta = { count: number }` Task 2; stamped from `visionUserParts.length`.
- `syncDeepChatVisionHelper(chat, supportsVision)` Task 5; called from apply config.
- Aligner exclusion selector shared Task 5 + e2e Task 7.

## Verification (full gate)

```powershell
npx vitest run src/modules/app_center/views/playground/deep-chat
npm run type-check
npm run lint:warning-gate
npx playwright test tests/e2e/deep-chat-send.spec.ts --project=chromium --workers=1
```

Manual: vision model → helper + ghost upload → 4 thumbs → send → refresh shows meta not pixels → switch to non-vision with staged files → one warning → send fail-closed.

## Residual risks (accept for M1)

1. Wire base64 expansion may still 413 at ~16MB — map provider errors when possible; M2 compress.  
2. Non-vision paste may be swallowed by deep-chat when `images=false` — host paste is best-effort.  
3. Attachment strip class names may need one DOM spike for token CSS.  
4. Multi-turn has no pixel memory — meta honesty only.
