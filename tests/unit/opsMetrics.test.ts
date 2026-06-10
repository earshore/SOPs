import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OPS_METRICS_STORAGE_KEY, readOpsMetrics, recordOpsMetric } from '@/common/utils/opsMetrics';
import { StorageService } from '@/services/storageService';

describe('recordOpsMetric', () => {
  beforeEach(() => {
    vi.spyOn(StorageService, 'get').mockReturnValue({});
    vi.spyOn(StorageService, 'set').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a local metric entry for first use', () => {
    const now = new Date('2026-01-02T03:04:05.000Z');

    const snapshot = recordOpsMetric('ppc.action_export', now);

    expect(snapshot).toEqual({
      'ppc.action_export': {
        count: 1,
        lastAt: '2026-01-02T03:04:05.000Z',
      },
    });
    expect(StorageService.get).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, {});
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });

  it('reads the current local metrics snapshot', () => {
    vi.mocked(StorageService.get).mockReturnValue({
      'ppc.review_template_copy': {
        count: 4,
        lastAt: '2026-01-02T00:00:00.000Z',
      },
    });

    const snapshot = readOpsMetrics();

    expect(snapshot).toEqual({
      'ppc.review_template_copy': {
        count: 4,
        lastAt: '2026-01-02T00:00:00.000Z',
      },
    });
    expect(StorageService.get).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, {});
  });

  it('increments the selected metric and keeps other metrics unchanged', () => {
    vi.mocked(StorageService.get).mockReturnValue({
      'npi.csv_export': {
        count: 2,
        lastAt: '2026-01-01T00:00:00.000Z',
      },
      'ppc.action_export': {
        count: 5,
        lastAt: '2026-01-01T01:00:00.000Z',
      },
    });
    const now = new Date('2026-01-03T00:00:00.000Z');

    const snapshot = recordOpsMetric('npi.csv_export', now);

    expect(snapshot).toEqual({
      'npi.csv_export': {
        count: 3,
        lastAt: '2026-01-03T00:00:00.000Z',
      },
      'ppc.action_export': {
        count: 5,
        lastAt: '2026-01-01T01:00:00.000Z',
      },
    });
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });

  it('supports Listing review template copy metrics', () => {
    const now = new Date('2026-01-04T00:00:00.000Z');

    const snapshot = recordOpsMetric('listing.review_template_copy', now);

    expect(snapshot).toEqual({
      'listing.review_template_copy': {
        count: 1,
        lastAt: '2026-01-04T00:00:00.000Z',
      },
    });
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });
});
