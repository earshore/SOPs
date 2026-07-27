/**
 * Deep Chat 图片附件 → visionUserParts。
 *
 * 产品规则：
 * - 仅当模型 supportsVision 时启用；
 * - vision parts 只服务当轮请求，禁止把 base64 写进 thread / localStorage；
 * - 单图 / 单轮张数 / 合计有硬上限，超限 fail-closed；
 * - 白名单 mime/扩展名；拒绝 SVG、bmp、远程 http(s)。
 */

export const DEEP_CHAT_VISION_MAX_FILES = 4;
/** 单图上限（字节）：5MB */
export const DEEP_CHAT_VISION_MAX_FILE_BYTES = 5 * 1024 * 1024;
/** 本轮合计上限（字节）：12MB */
export const DEEP_CHAT_VISION_MAX_TOTAL_BYTES = 12 * 1024 * 1024;

export const DEEP_CHAT_VISION_ACCEPTED_FORMATS =
  'image/png,image/jpeg,image/jpg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif';

/** 无正文时的占位文本（保证 normalize 不会丢弃本轮用户消息） */
export const DEEP_CHAT_VISION_PLACEHOLDER_TEXT = '[图片]';

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

export type DeepChatVisionUserPart = {
  type: 'input_image';
  image_url: string;
};

export type DeepChatMessageFileLike = {
  src?: string;
  name?: string;
  type?: string;
  ref?: File;
};

export type ResolveDeepChatVisionResult =
  | { ok: true; parts: DeepChatVisionUserPart[] }
  | { ok: false; error: string };

type FileCandidate = {
  src?: string;
  file?: File;
  name?: string;
  type?: string;
};

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

function isDataUrlImage(src: string): boolean {
  return /^data:image\//i.test(src);
}

function isHttpImageUrl(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

function estimateDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return dataUrl.length;
  const meta = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  if (/;base64/i.test(meta)) {
    // base64 约 4/3 膨胀
    return Math.floor((payload.length * 3) / 4);
  }
  try {
    return decodeURIComponent(payload).length;
  } catch {
    return payload.length;
  }
}

function estimateCandidateBytes(candidate: FileCandidate): number | null {
  if (candidate.file) return candidate.file.size;
  const src = candidate.src?.trim() || '';
  if (isDataUrlImage(src)) return estimateDataUrlBytes(src);
  return null; // remote/unknown handled separately
}

function candidateFromNativeFile(file: File, name?: string, type?: string): FileCandidate {
  return { file, name: name || file.name, type: type || file.type };
}

function candidateFromMessageFile(item: unknown): FileCandidate | null {
  if (!item || typeof item !== 'object') return null;
  const mf = item as DeepChatMessageFileLike & { file?: File };
  if (mf.ref instanceof File) return candidateFromNativeFile(mf.ref, mf.name, mf.type);
  if (mf.file instanceof File) return candidateFromNativeFile(mf.file, mf.name, mf.type);
  if (typeof mf.src === 'string' && mf.src) {
    return { src: mf.src, name: mf.name, type: mf.type };
  }
  return null;
}

function pushMessageFiles(files: unknown, out: FileCandidate[]): void {
  if (!Array.isArray(files)) return;
  for (const item of files) {
    const candidate = candidateFromMessageFile(item);
    if (candidate) out.push(candidate);
  }
}

function collectFromLatestUserMessage(messages: unknown[]): FileCandidate[] {
  const out: FileCandidate[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!message || typeof message !== 'object') continue;
    const role = (message as { role?: string }).role;
    if (role && role !== 'user') continue;
    pushMessageFiles((message as { files?: unknown }).files, out);
    break;
  }
  return out;
}

function collectFromTopLevelFiles(topFiles: unknown): FileCandidate[] {
  const out: FileCandidate[] = [];
  if (Array.isArray(topFiles)) {
    for (const item of topFiles) {
      if (item instanceof File) {
        out.push({ file: item, name: item.name, type: item.type });
        continue;
      }
      const candidate = candidateFromMessageFile(item);
      if (candidate) out.push(candidate);
    }
    return out;
  }
  if (typeof FileList !== 'undefined' && topFiles instanceof FileList) {
    for (let i = 0; i < topFiles.length; i++) {
      const file = topFiles.item(i);
      if (file) out.push({ file, name: file.name, type: file.type });
    }
  }
  return out;
}

function collectFileCandidates(body: unknown): FileCandidate[] {
  if (!body || typeof body !== 'object') return [];
  const record = body as Record<string, unknown>;

  // 只取本轮：messages 有内容时用最后一条 user 的 files，避免历史图重复上传。
  if (Array.isArray(record.messages) && record.messages.length > 0) {
    return collectFromLatestUserMessage(record.messages);
  }

  // 无 messages 时回落顶层 files（自定义 handler 的单轮载荷）
  return collectFromTopLevelFiles(record.files);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result) {
        resolve(reader.result);
        return;
      }
      reject(new Error(DEEP_CHAT_VISION_COPY.read));
    };
    reader.onerror = () => reject(new Error(DEEP_CHAT_VISION_COPY.read));
    reader.readAsDataURL(file);
  });
}

async function partFromNativeFile(file: File): Promise<ResolveDeepChatVisionResult> {
  const dataUrl = await readFileAsDataUrl(file);
  return { ok: true, parts: [{ type: 'input_image', image_url: dataUrl }] };
}

function partFromSrc(src: string): ResolveDeepChatVisionResult {
  if (isDataUrlImage(src)) {
    return { ok: true, parts: [{ type: 'input_image', image_url: src }] };
  }
  return { ok: false, error: DEEP_CHAT_VISION_COPY.remote };
}

async function partFromFileCandidate(
  candidate: FileCandidate
): Promise<ResolveDeepChatVisionResult> {
  if (candidate.file) {
    return partFromNativeFile(candidate.file);
  }
  const src = candidate.src?.trim() || '';
  if (!src) return { ok: true, parts: [] };
  return partFromSrc(src);
}

/**
 * 从 deep-chat 请求 body 提取 visionUserParts。
 * - supportsVision=false：有图则报错，无图返回空数组；
 * - 白名单 image 类型；超张数 / 超体积 / 远程 URL fail-closed。
 */
export async function resolveDeepChatVisionUserParts(args: {
  body: unknown;
  supportsVision: boolean;
  maxFiles?: number;
  maxFileBytes?: number;
  maxTotalBytes?: number;
}): Promise<ResolveDeepChatVisionResult> {
  const maxFiles = args.maxFiles ?? DEEP_CHAT_VISION_MAX_FILES;
  const maxFileBytes = args.maxFileBytes ?? DEEP_CHAT_VISION_MAX_FILE_BYTES;
  const maxTotalBytes = args.maxTotalBytes ?? DEEP_CHAT_VISION_MAX_TOTAL_BYTES;
  const candidates = collectFileCandidates(args.body);

  if (candidates.length === 0) {
    return { ok: true, parts: [] };
  }
  if (!args.supportsVision) {
    return {
      ok: false,
      error: DEEP_CHAT_VISION_COPY.nonVision,
    };
  }
  if (candidates.length > maxFiles) {
    return {
      ok: false,
      error: DEEP_CHAT_VISION_COPY.maxCount(maxFiles),
    };
  }

  const parts: DeepChatVisionUserPart[] = [];
  let totalBytes = 0;

  for (const candidate of candidates) {
    if (isSvg(candidate.type, candidate.name)) {
      return { ok: false, error: DEEP_CHAT_VISION_COPY.svg };
    }
    if (candidate.file) {
      if (isSvg(candidate.file.type, candidate.file.name)) {
        return { ok: false, error: DEEP_CHAT_VISION_COPY.svg };
      }
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
        if (isSvg(mime, candidate.name)) {
          return { ok: false, error: DEEP_CHAT_VISION_COPY.svg };
        }
        if (!isAllowedVisionImage(mime, candidate.name)) {
          return { ok: false, error: DEEP_CHAT_VISION_COPY.type };
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

    const result = await partFromFileCandidate(candidate);
    if (!result.ok) return result;
    parts.push(...result.parts);
  }
  return { ok: true, parts };
}

/** 当前模型是否应开启 deep-chat 图片上传入口。 */
export function resolveDeepChatImagesConfig(supportsVision: boolean):
  | false
  | {
      files: {
        maxNumberOfFiles: number;
        acceptedFormats: string;
      };
      button?: {
        tooltip: string;
      };
    } {
  if (!supportsVision) return false;
  return {
    files: {
      maxNumberOfFiles: DEEP_CHAT_VISION_MAX_FILES,
      acceptedFormats: DEEP_CHAT_VISION_ACCEPTED_FORMATS,
    },
    button: {
      tooltip: DEEP_CHAT_VISION_COPY.uploadTooltip,
    },
  };
}
