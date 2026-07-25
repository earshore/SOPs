/**
 * Shared LLM request cache + in-flight dedupe helpers.
 * Business modules keep domain payload shape and enable/TTL policy.
 */

import { LocalDataStore } from '@/services/localDataStore';

export function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export function buildLlmRequestCacheKey(parts: {
  prefix: string;
  version: string;
  provider: string;
  endpoint: string;
  model: string;
  messages: unknown;
  options: unknown;
}): string {
  return [
    parts.prefix,
    parts.version,
    hashString(
      [
        parts.provider,
        parts.endpoint,
        parts.model,
        JSON.stringify(parts.options),
        JSON.stringify(parts.messages),
      ].join('\n')
    ),
  ].join(':');
}

export async function getTimedLocalCacheValue<T>(
  cacheKey: string,
  cacheTtlMs: number,
  extract: (raw: unknown) => T | null
): Promise<T | null> {
  try {
    const cached = await LocalDataStore.get<unknown>(cacheKey, null);
    if (!cached || typeof cached !== 'object') {
      return null;
    }

    const timestamp = (cached as { timestamp?: unknown }).timestamp;
    if (typeof timestamp !== 'number') {
      return null;
    }

    if (Date.now() - timestamp >= cacheTtlMs) {
      await LocalDataStore.remove(cacheKey);
      return null;
    }

    return extract(cached);
  } catch {
    return null;
  }
}

export async function setTimedLocalCacheValue(
  cacheKey: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await LocalDataStore.set(
      cacheKey,
      {
        ...payload,
        timestamp: Date.now(),
      },
      'cache'
    );
  } catch {
    // Cache failures must not block tool results.
  }
}

export async function runWithInFlightDedup<T>(
  inFlight: Map<string, Promise<T>>,
  cacheKey: string,
  factory: () => Promise<T>
): Promise<{ value: T; fromInFlight: boolean }> {
  const existing = inFlight.get(cacheKey);
  if (existing) {
    return { value: await existing, fromInFlight: true };
  }

  const request = factory();
  inFlight.set(cacheKey, request);
  try {
    return { value: await request, fromInFlight: false };
  } finally {
    if (inFlight.get(cacheKey) === request) {
      inFlight.delete(cacheKey);
    }
  }
}
