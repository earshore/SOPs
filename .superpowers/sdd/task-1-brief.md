# Task 1 Brief

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
