import { describe, expect, it } from 'vitest';
import {
  DEEP_CHAT_VISION_ACCEPTED_FORMATS,
  DEEP_CHAT_VISION_MAX_FILE_BYTES,
  DEEP_CHAT_VISION_MAX_FILES,
  DEEP_CHAT_VISION_MAX_TOTAL_BYTES,
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
    const imagesConfig = resolveDeepChatImagesConfig(true);
    expect(imagesConfig).not.toBe(false);
    if (imagesConfig !== false) {
      expect(imagesConfig.files).toEqual({
        maxNumberOfFiles: DEEP_CHAT_VISION_MAX_FILES,
        acceptedFormats: DEEP_CHAT_VISION_ACCEPTED_FORMATS,
      });
    }
  });
});

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

  it('only uses files from the latest user message', async () => {
    const oldSrc = tinyPngDataUrl();
    const newSrc =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8BQz0AEYBxVSF+FAP5IAv8X0f1+AAAAAElFTkSuQmCC';
    const result = await resolveDeepChatVisionUserParts({
      body: {
        messages: [
          {
            role: 'user',
            text: 'old',
            files: [{ type: 'image', src: oldSrc, name: 'old.png' }],
          },
          { role: 'ai', text: 'ok' },
          {
            role: 'user',
            text: 'new',
            files: [{ type: 'image', src: newSrc, name: 'new.png' }],
          },
        ],
      },
      supportsVision: true,
    });
    expect(result).toEqual({
      ok: true,
      parts: [{ type: 'input_image', image_url: newSrc }],
    });
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
    const nonVision = await resolveDeepChatVisionUserParts({
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
    expect(nonVision.ok).toBe(false);
    if (!nonVision.ok) {
      expect(nonVision.error).toBe(
        '当前模型不支持图片输入，请切换到支持视觉的模型后再试。'
      );
    }

    const oversized = await resolveDeepChatVisionUserParts({
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
    expect(oversized.ok).toBe(false);
    if (!oversized.ok) {
      expect(oversized.error).toBe('图片「big.png」超过 5MB 上限。');
    }
  });
});
