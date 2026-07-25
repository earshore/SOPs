import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildLlmRequestCacheKey,
  getTimedLocalCacheValue,
  hashString,
  runWithInFlightDedup,
  setTimedLocalCacheValue,
} from '@/services/llmRequestCache';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/services/localDataStore', () => ({
  LocalDataStore: {
    get: mocks.get,
    set: mocks.set,
    remove: mocks.remove,
  },
}));

describe('llmRequestCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue(null);
    mocks.set.mockResolvedValue(true);
    mocks.remove.mockResolvedValue(undefined);
  });

  it('builds stable cache keys from request identity', () => {
    const left = buildLlmRequestCacheKey({
      prefix: 'cache:demo:',
      version: 'v1',
      provider: 'new_api',
      endpoint: 'https://llm.example/v1',
      model: 'gpt-test',
      messages: [{ role: 'user', content: 'hi' }],
      options: { temperature: 0.1 },
    });
    const right = buildLlmRequestCacheKey({
      prefix: 'cache:demo:',
      version: 'v1',
      provider: 'new_api',
      endpoint: 'https://llm.example/v1',
      model: 'gpt-test',
      messages: [{ role: 'user', content: 'hi' }],
      options: { temperature: 0.1 },
    });

    expect(left).toBe(right);
    expect(left.startsWith('cache:demo::v1:')).toBe(true);
    expect(left.split(':').pop()).toBe(
      hashString(
        [
          'new_api',
          'https://llm.example/v1',
          'gpt-test',
          JSON.stringify({ temperature: 0.1 }),
          JSON.stringify([{ role: 'user', content: 'hi' }]),
        ].join('\n')
      )
    );
  });

  it('returns cached payload before TTL and drops expired entries', async () => {
    mocks.get.mockResolvedValueOnce({
      response: 'cached',
      timestamp: Date.now(),
    });
    await expect(
      getTimedLocalCacheValue('k1', 60_000, raw => {
        const response = (raw as { response?: unknown }).response;
        return typeof response === 'string' ? response : null;
      })
    ).resolves.toBe('cached');

    mocks.get.mockResolvedValueOnce({
      response: 'stale',
      timestamp: Date.now() - 120_000,
    });
    await expect(
      getTimedLocalCacheValue('k2', 60_000, raw => {
        const response = (raw as { response?: unknown }).response;
        return typeof response === 'string' ? response : null;
      })
    ).resolves.toBeNull();
    expect(mocks.remove).toHaveBeenCalledWith('k2');
  });

  it('writes timed cache values without throwing on store failures', async () => {
    mocks.set.mockRejectedValueOnce(new Error('quota'));
    await expect(setTimedLocalCacheValue('k3', { response: 'x' })).resolves.toBeUndefined();
  });

  it('dedupes in-flight requests by cache key', async () => {
    const inFlight = new Map<string, Promise<string>>();
    let runs = 0;
    const factory = () =>
      new Promise<string>(resolve => {
        runs += 1;
        setTimeout(() => resolve(`run-${runs}`), 10);
      });

    const first = runWithInFlightDedup(inFlight, 'same-key', factory);
    const second = runWithInFlightDedup(inFlight, 'same-key', factory);
    const [a, b] = await Promise.all([first, second]);

    expect(runs).toBe(1);
    expect(a.value).toBe(b.value);
    expect(a.fromInFlight || b.fromInFlight).toBe(true);
    expect(inFlight.size).toBe(0);
  });
});
