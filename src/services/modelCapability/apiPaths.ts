/**
 * User-selectable LLM API path modes (native multi-protocol).
 * Endpoint base (e.g. https://host/v1) + path suffix → full request URL.
 */

export type ApiPathId = 'chat_completions' | 'responses' | 'anthropic_messages' | 'gemini_generate';

export interface ApiPathOption {
  id: ApiPathId;
  /** Short label for settings select */
  label: string;
  /** Shown as path segment next to endpoint */
  pathLabel: string;
  description: string;
}

export const API_PATH_OPTIONS: readonly ApiPathOption[] = [
  {
    id: 'chat_completions',
    label: 'Chat Completions',
    pathLabel: '/chat/completions',
    description:
      'OpenAI 兼容 Chat Completions：多数官方与中转默认支持，适合日常分析与对话。业务 tools / 工具循环请改用 Responses。',
  },
  {
    id: 'responses',
    label: 'Responses',
    pathLabel: '/responses',
    description:
      'OpenAI Responses API：推理摘要与 tools 链路更完整（Deep Chat 业务工具仅此路径）；上游不支持时客户端可回退 Chat Completions。',
  },
  {
    id: 'anthropic_messages',
    label: 'Messages (Anthropic)',
    pathLabel: '/messages',
    description: 'Anthropic Messages 原生路径：仅当上游透传 Claude Messages 协议时使用。',
  },
  {
    id: 'gemini_generate',
    label: 'Gemini generateContent',
    pathLabel: '/v1beta/models/{model}:generateContent',
    description: 'Google Gemini generateContent 原生路径：仅当上游支持该形态时使用。',
  },
] as const;

export const DEFAULT_API_PATH_ID: ApiPathId = 'chat_completions';

export function isApiPathId(value: unknown): value is ApiPathId {
  return (
    value === 'chat_completions' ||
    value === 'responses' ||
    value === 'anthropic_messages' ||
    value === 'gemini_generate'
  );
}

export function normalizeApiPathId(value: unknown): ApiPathId {
  return isApiPathId(value) ? value : DEFAULT_API_PATH_ID;
}

/** Strip trailing slash from base endpoint. */
export function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Join user endpoint with path mode.
 * - append modes use endpoint as base (expect …/v1)
 * - gemini replaces trailing /v1 with /v1beta/models/{model}:generateContent, else origin + path
 */
export function buildFullApiUrl(
  endpoint: string,
  pathId: ApiPathId,
  model: string
): { fullUrl: string; pathSuffix: string } {
  const base = stripTrailingSlash((endpoint || '').trim());
  if (!base) {
    return { fullUrl: '', pathSuffix: '' };
  }

  if (pathId === 'chat_completions') {
    const pathSuffix = '/chat/completions';
    return { fullUrl: `${base}${pathSuffix}`, pathSuffix };
  }
  if (pathId === 'responses') {
    const pathSuffix = '/responses';
    return { fullUrl: `${base}${pathSuffix}`, pathSuffix };
  }
  if (pathId === 'anthropic_messages') {
    const pathSuffix = '/messages';
    return { fullUrl: `${base}${pathSuffix}`, pathSuffix };
  }

  // gemini_generate
  const modelSeg = encodeURIComponent(model || '{model}');
  const geminiPath = `/v1beta/models/${modelSeg}:generateContent`;
  try {
    const u = new URL(base.includes('://') ? base : `https://${base}`);
    // If endpoint ends with /v1 or /v1beta, use origin only for gemini
    const origin = u.origin;
    const pathSuffix = geminiPath;
    return { fullUrl: `${origin}${pathSuffix}`, pathSuffix };
  } catch {
    const withoutV1 = base.replace(/\/v1$/i, '').replace(/\/v1beta$/i, '');
    return {
      fullUrl: `${withoutV1}${geminiPath}`,
      pathSuffix: geminiPath,
    };
  }
}

/** Map path id → capability surface key (for registry mapRequest selection). */
export function apiPathIdToSurface(
  pathId: ApiPathId
): 'chat_completions' | 'responses' | 'anthropic_messages' | 'gemini_generate' {
  return pathId;
}
