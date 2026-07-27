import { describe, expect, it } from 'vitest';
import {
  DEEP_CHAT_VISION_MAX_FILE_BYTES,
  DEEP_CHAT_VISION_MAX_FILES,
  resolveDeepChatImagesConfig,
  resolveDeepChatVisionUserParts,
} from './visionAttachments';

function tinyPngDataUrl(): string {
  // 1x1 transparent PNG
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
}

function oversizedDataUrl(): string {
  // base64 解码后约 3/4 体积；铺到超过 5MB 解码上限。
  const payload = 'A'.repeat(Math.ceil((DEEP_CHAT_VISION_MAX_FILE_BYTES * 4) / 3) + 64);
  return `data:image/png;base64,${payload}`;
}

describe('resolveDeepChatImagesConfig', () => {
  it('returns false when vision is unsupported', () => {
    expect(resolveDeepChatImagesConfig(false)).toBe(false);
  });

  it('returns image-only upload config when vision is supported', () => {
    expect(resolveDeepChatImagesConfig(true)).toEqual({
      files: {
        maxNumberOfFiles: DEEP_CHAT_VISION_MAX_FILES,
        acceptedFormats: 'image/*',
      },
    });
  });
});

describe('resolveDeepChatVisionUserParts', () => {
  it('returns empty parts without files', async () => {
    const result = await resolveDeepChatVisionUserParts({
      body: { text: 'hello' },
      supportsVision: true,
    });
    expect(result).toEqual({ ok: true, parts: [] });
  });

  it('rejects files when model does not support vision', async () => {
    const result = await resolveDeepChatVisionUserParts({
      body: {
        messages: [
          {
            role: 'user',
            text: 'see',
            files: [{ type: 'image', src: tinyPngDataUrl(), name: 'a.png' }],
          },
        ],
      },
      supportsVision: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('不支持图片输入');
    }
  });

  it('maps message files to input_image parts', async () => {
    const src = tinyPngDataUrl();
    const result = await resolveDeepChatVisionUserParts({
      body: {
        messages: [
          {
            role: 'user',
            text: 'describe',
            files: [{ type: 'image', src, name: 'a.png' }],
          },
        ],
      },
      supportsVision: true,
    });
    expect(result).toEqual({
      ok: true,
      parts: [{ type: 'input_image', image_url: src }],
    });
  });

  it('maps top-level File objects', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'shot.png', { type: 'image/png' });
    const result = await resolveDeepChatVisionUserParts({
      body: { text: 'see', files: [file] },
      supportsVision: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.parts).toHaveLength(1);
      expect(result.parts[0]?.type).toBe('input_image');
      expect(result.parts[0]?.image_url.startsWith('data:image/png')).toBe(true);
    }
  });

  it('fails closed when too many images', async () => {
    const src = tinyPngDataUrl();
    const files = Array.from({ length: DEEP_CHAT_VISION_MAX_FILES + 1 }, (_, i) => ({
      type: 'image',
      src,
      name: `a${i}.png`,
    }));
    const result = await resolveDeepChatVisionUserParts({
      body: { messages: [{ role: 'user', text: 'many', files }] },
      supportsVision: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(`最多上传 ${DEEP_CHAT_VISION_MAX_FILES}`);
    }
  });

  it('fails closed when a data-url image exceeds size limit', async () => {
    const result = await resolveDeepChatVisionUserParts({
      body: {
        messages: [
          {
            role: 'user',
            text: 'big',
            files: [{ type: 'image', src: oversizedDataUrl(), name: 'big.png' }],
          },
        ],
      },
      supportsVision: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('超过');
    }
  });

  it('accepts http(s) image urls without size estimation', async () => {
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
    expect(result).toEqual({
      ok: true,
      parts: [{ type: 'input_image', image_url: 'https://cdn.example.com/a.png' }],
    });
  });

  it('only uses files from the latest user message', async () => {
    const result = await resolveDeepChatVisionUserParts({
      body: {
        messages: [
          {
            role: 'user',
            text: 'old',
            files: [{ type: 'image', src: 'https://cdn.example.com/old.png', name: 'old.png' }],
          },
          { role: 'ai', text: 'ok' },
          {
            role: 'user',
            text: 'new',
            files: [{ type: 'image', src: 'https://cdn.example.com/new.png', name: 'new.png' }],
          },
        ],
      },
      supportsVision: true,
    });
    expect(result).toEqual({
      ok: true,
      parts: [{ type: 'input_image', image_url: 'https://cdn.example.com/new.png' }],
    });
  });
});
