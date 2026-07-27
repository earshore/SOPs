/**
 * Deep Chat 图片附件 → visionUserParts。
 *
 * 产品规则：
 * - 仅当模型 supportsVision 时启用；
 * - vision parts 只服务当轮请求，禁止把 base64 写进 thread / localStorage；
 * - 单图 / 单轮张数有硬上限，超限 fail-closed。
 */

export const DEEP_CHAT_VISION_MAX_FILES = 4;
/** 单图上限（字节）：5MB */
export const DEEP_CHAT_VISION_MAX_FILE_BYTES = 5 * 1024 * 1024;
/** 无正文时的占位文本（保证 normalize 不会丢弃本轮用户消息） */
export const DEEP_CHAT_VISION_PLACEHOLDER_TEXT = '[图片]';

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

function isImageMime(type: string | undefined, name?: string): boolean {
  if (type && type.startsWith('image/')) return true;
  if (!type && name) {
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
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

function maxSizeError(label: string, maxFileBytes: number): string {
  return `图片「${label || '未命名'}」超过 ${Math.floor(maxFileBytes / (1024 * 1024))}MB 上限。`;
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
      reject(new Error('图片读取失败'));
    };
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

async function partFromNativeFile(
  file: File,
  maxFileBytes: number
): Promise<ResolveDeepChatVisionResult> {
  if (!isImageMime(file.type, file.name)) {
    return { ok: false, error: `不支持的文件类型：${file.name || '未知文件'}` };
  }
  if (file.size > maxFileBytes) {
    return { ok: false, error: maxSizeError(file.name, maxFileBytes) };
  }
  const dataUrl = await readFileAsDataUrl(file);
  return { ok: true, parts: [{ type: 'input_image', image_url: dataUrl }] };
}

function partFromSrc(
  src: string,
  name: string | undefined,
  maxFileBytes: number
): ResolveDeepChatVisionResult {
  if (isDataUrlImage(src)) {
    if (estimateDataUrlBytes(src) > maxFileBytes) {
      return { ok: false, error: maxSizeError(name || '', maxFileBytes) };
    }
    return { ok: true, parts: [{ type: 'input_image', image_url: src }] };
  }
  if (isHttpImageUrl(src)) {
    return { ok: true, parts: [{ type: 'input_image', image_url: src }] };
  }
  return { ok: false, error: `无法识别的图片来源：${name || '未知文件'}` };
}

async function partFromFileCandidate(
  candidate: FileCandidate,
  maxFileBytes: number
): Promise<ResolveDeepChatVisionResult> {
  if (candidate.file) {
    return partFromNativeFile(candidate.file, maxFileBytes);
  }
  const src = candidate.src?.trim() || '';
  if (!src) return { ok: true, parts: [] };
  return partFromSrc(src, candidate.name, maxFileBytes);
}

/**
 * 从 deep-chat 请求 body 提取 visionUserParts。
 * - supportsVision=false：有图则报错，无图返回空数组；
 * - 仅 image 类型；超张数 / 超体积 fail-closed。
 */
export async function resolveDeepChatVisionUserParts(args: {
  body: unknown;
  supportsVision: boolean;
  maxFiles?: number;
  maxFileBytes?: number;
}): Promise<ResolveDeepChatVisionResult> {
  const maxFiles = args.maxFiles ?? DEEP_CHAT_VISION_MAX_FILES;
  const maxFileBytes = args.maxFileBytes ?? DEEP_CHAT_VISION_MAX_FILE_BYTES;
  const candidates = collectFileCandidates(args.body);

  if (candidates.length === 0) {
    return { ok: true, parts: [] };
  }
  if (!args.supportsVision) {
    return {
      ok: false,
      error: '当前模型不支持图片输入，请切换到支持视觉的模型后再试。',
    };
  }
  if (candidates.length > maxFiles) {
    return {
      ok: false,
      error: `单次最多上传 ${maxFiles} 张图片，请减少后重试。`,
    };
  }

  const parts: DeepChatVisionUserPart[] = [];
  for (const candidate of candidates) {
    const result = await partFromFileCandidate(candidate, maxFileBytes);
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
    } {
  if (!supportsVision) return false;
  return {
    files: {
      maxNumberOfFiles: DEEP_CHAT_VISION_MAX_FILES,
      acceptedFormats: 'image/*',
    },
  };
}
