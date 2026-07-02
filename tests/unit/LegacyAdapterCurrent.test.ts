import { afterEach, describe, expect, it, vi } from 'vitest';
import { LegacyAdapter } from '@/common/router/navigo/LegacyAdapter';
import type { NavigoAdapter } from '@/common/router/navigo/NavigoAdapter';

type LegacyRouterWindow = Window & {
  router?: unknown;
  switchTab?: unknown;
};

function createRouterMock(): NavigoAdapter {
  return {
    navigate: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    getCurrentRoute: vi.fn(() => null),
  } as unknown as NavigoAdapter;
}

describe('LegacyAdapter warning controls', () => {
  afterEach(() => {
    delete (window as LegacyRouterWindow).router;
    delete (window as LegacyRouterWindow).switchTab;
    vi.restoreAllMocks();
  });

  it('installs compatibility globals silently when warnings are disabled', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const adapter = new LegacyAdapter(createRouterMock(), false);

    adapter.installGlobalAPI();

    expect(warnSpy).not.toHaveBeenCalled();
    expect(typeof (window as LegacyRouterWindow).router).toBe('object');
    expect(typeof (window as LegacyRouterWindow).switchTab).toBe('function');
  });
});
