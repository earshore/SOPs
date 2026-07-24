/**
 * OpenAI Chat Completions resource CRUD client (stored completions).
 * Thin authenticated HTTP against the user's endpoint base (…/v1).
 * Gateways that do not implement storage return non-2xx — callers handle ApiError.
 *
 * @see https://developers.openai.com/api/reference/resources/chat
 */

import { ApiError } from '@/common/errors';

export interface ChatCompletionsResourceClientOptions {
  /** Base endpoint ending with /v1 (or compatible) */
  endpoint: string;
  apiKey?: string;
  signal?: AbortSignal;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function buildHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

async function parseError(response: Response, action: string): Promise<ApiError> {
  const text = await response.text();
  let message = `Chat Completions ${action} failed (${response.status})`;
  try {
    const json = JSON.parse(text) as { error?: { message?: string } };
    if (json.error?.message) message = json.error.message;
  } catch {
    if (text.trim()) message = text.slice(0, 300);
  }
  return new ApiError(message, 'CHAT_COMPLETIONS_RESOURCE_ERROR', response.status, text, {
    module: 'ChatCompletionsResource',
    action,
  });
}

async function requestJson(
  url: string,
  init: RequestInit,
  action: string
): Promise<Record<string, unknown>> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw await parseError(response, action);
  }
  if (response.status === 204) {
    return {};
  }
  const data = (await response.json()) as Record<string, unknown>;
  return data;
}

/** GET /chat/completions — list stored completions (OpenAI). */
export async function listChatCompletions(
  options: ChatCompletionsResourceClientOptions & { limit?: number; after?: string }
): Promise<Record<string, unknown>> {
  const base = stripTrailingSlash(options.endpoint.trim());
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.after) params.set('after', options.after);
  const qs = params.toString();
  const url = `${base}/chat/completions${qs ? `?${qs}` : ''}`;
  return requestJson(
    url,
    {
      method: 'GET',
      headers: buildHeaders(options.apiKey),
      signal: options.signal,
    },
    'listChatCompletions'
  );
}

/** GET /chat/completions/{id} */
export async function getChatCompletion(
  options: ChatCompletionsResourceClientOptions & { completionId: string }
): Promise<Record<string, unknown>> {
  const base = stripTrailingSlash(options.endpoint.trim());
  const id = encodeURIComponent(options.completionId);
  return requestJson(
    `${base}/chat/completions/${id}`,
    {
      method: 'GET',
      headers: buildHeaders(options.apiKey),
      signal: options.signal,
    },
    'getChatCompletion'
  );
}

/** POST /chat/completions/{id} — update metadata etc. */
export async function updateChatCompletion(
  options: ChatCompletionsResourceClientOptions & {
    completionId: string;
    body: Record<string, unknown>;
  }
): Promise<Record<string, unknown>> {
  const base = stripTrailingSlash(options.endpoint.trim());
  const id = encodeURIComponent(options.completionId);
  return requestJson(
    `${base}/chat/completions/${id}`,
    {
      method: 'POST',
      headers: buildHeaders(options.apiKey),
      body: JSON.stringify(options.body),
      signal: options.signal,
    },
    'updateChatCompletion'
  );
}

/** DELETE /chat/completions/{id} */
export async function deleteChatCompletion(
  options: ChatCompletionsResourceClientOptions & { completionId: string }
): Promise<Record<string, unknown>> {
  const base = stripTrailingSlash(options.endpoint.trim());
  const id = encodeURIComponent(options.completionId);
  return requestJson(
    `${base}/chat/completions/${id}`,
    {
      method: 'DELETE',
      headers: buildHeaders(options.apiKey),
      signal: options.signal,
    },
    'deleteChatCompletion'
  );
}

/** GET /chat/completions/{id}/messages */
export async function getChatCompletionMessages(
  options: ChatCompletionsResourceClientOptions & { completionId: string }
): Promise<Record<string, unknown>> {
  const base = stripTrailingSlash(options.endpoint.trim());
  const id = encodeURIComponent(options.completionId);
  return requestJson(
    `${base}/chat/completions/${id}/messages`,
    {
      method: 'GET',
      headers: buildHeaders(options.apiKey),
      signal: options.signal,
    },
    'getChatCompletionMessages'
  );
}
