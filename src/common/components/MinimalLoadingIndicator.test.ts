import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  beginMinimalLoading,
  MINIMAL_LOADING_DELAY_MS,
  resetMinimalLoadingIndicator,
} from './MinimalLoadingIndicator';

describe('MinimalLoadingIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetMinimalLoadingIndicator();
  });

  afterEach(() => {
    resetMinimalLoadingIndicator();
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('does not render during a fast load', async () => {
    const stopLoading = beginMinimalLoading('sops_overview');

    await vi.advanceTimersByTimeAsync(MINIMAL_LOADING_DELAY_MS - 1);
    expect(document.getElementById('minimal-route-loading-indicator')).toBeNull();

    stopLoading();
    await vi.advanceTimersByTimeAsync(1);
    expect(document.getElementById('minimal-route-loading-indicator')).toBeNull();
  });

  it('renders exactly five dots for a slow load and removes them immediately when complete', async () => {
    const stopLoading = beginMinimalLoading('sops_overview');

    await vi.advanceTimersByTimeAsync(MINIMAL_LOADING_DELAY_MS);
    const indicator = document.getElementById('minimal-route-loading-indicator');
    expect(indicator).not.toBeNull();
    expect(indicator?.getAttribute('role')).toBe('status');
    expect(indicator?.querySelectorAll('.minimal-loading-indicator__dots i')).toHaveLength(5);

    stopLoading();
    expect(document.getElementById('minimal-route-loading-indicator')).toBeNull();
  });

  it('keeps one indicator while concurrent loads are still pending', async () => {
    const stopFirst = beginMinimalLoading('sops_overview');
    const stopSecond = beginMinimalLoading('app_center_overview');

    await vi.advanceTimersByTimeAsync(MINIMAL_LOADING_DELAY_MS);
    stopFirst();
    expect(document.getElementById('minimal-route-loading-indicator')).not.toBeNull();

    stopSecond();
    expect(document.getElementById('minimal-route-loading-indicator')).toBeNull();
  });
});
