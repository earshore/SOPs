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
      'OpenAI Chat Completions 官方 Create：文本 / 流式 / tools / vision / structured。与 Responses 并行全量，非降级子集。',
  },
  {
    id: 'responses',
    label: 'Responses',
    pathLabel: '/responses',
    description:
      'OpenAI Responses API 官方 Create：推理摘要、tools、vision、structured；上游不支持时客户端可回退 Chat Completions 传输路径。',
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
 * - gemini strips a single trailing /v1 or /v1beta from the base (preserving any
 *   gateway prefix before it) and appends /v1beta/models/{model}:generateContent
 *   (or :streamGenerateContent when opts.stream is true; fullUrl then carries
 *   ?alt=sse while pathSuffix stays query-free for logging/labels).
 */
export function buildFullApiUrl(
  endpoint: string,
  pathId: ApiPathId,
  model: string,
  opts?: { stream?: boolean }
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
  const stream = opts?.stream === true;
  const method = stream ? 'streamGenerateContent' : 'generateContent';
  const pathSuffix = `/v1beta/models/${modelSeg}:${method}`;
  // Strip a single trailing /v1 or /v1beta (case-insensitive), keeping any
  // gateway prefix (e.g. https://host/gateway/v1 → https://host/gateway).
  const geminiBase = base.replace(/\/v1(beta)?$/i, '');
  const query = stream ? '?alt=sse' : '';
  return { fullUrl: `${geminiBase}${pathSuffix}${query}`, pathSuffix };
}

/** Map path id → capability surface key (for registry mapRequest selection). */
export function apiPathIdToSurface(
  pathId: ApiPathId
): 'chat_completions' | 'responses' | 'anthropic_messages' | 'gemini_generate' {
  return pathId;
}
