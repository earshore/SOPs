# Task 2 Brief

## Global Constraints (from plan)

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
