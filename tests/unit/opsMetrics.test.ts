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

  it('supports promotion submission template copy metrics', () => {
    const now = new Date('2026-01-04T12:00:00.000Z');

    const snapshot = recordOpsMetric('promotion.submission_template_copy', now);

    expect(snapshot).toEqual({
      'promotion.submission_template_copy': {
        count: 1,
        lastAt: '2026-01-04T12:00:00.000Z',
      },
    });
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });

  it('supports restricted words review template copy metrics', () => {
    const now = new Date('2026-01-04T18:00:00.000Z');

    const snapshot = recordOpsMetric('restricted_words.review_template_copy', now);

    expect(snapshot).toEqual({
      'restricted_words.review_template_copy': {
        count: 1,
        lastAt: '2026-01-04T18:00:00.000Z',
      },
    });
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });

  it('supports email templates reply template copy metrics', () => {
    const now = new Date('2026-01-04T21:00:00.000Z');

    const snapshot = recordOpsMetric('email_templates.reply_template_copy', now);

    expect(snapshot).toEqual({
      'email_templates.reply_template_copy': {
        count: 1,
        lastAt: '2026-01-04T21:00:00.000Z',
      },
    });
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });

  it('supports QA maintenance template copy metrics', () => {
    const now = new Date('2026-01-04T22:00:00.000Z');

    const snapshot = recordOpsMetric('qa.maintenance_template_copy', now);

    expect(snapshot).toEqual({
      'qa.maintenance_template_copy': {
        count: 1,
        lastAt: '2026-01-04T22:00:00.000Z',
      },
    });
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });

  it('supports competitor review template copy metrics', () => {
    const now = new Date('2026-01-05T00:00:00.000Z');

    const snapshot = recordOpsMetric('competitor.review_template_copy', now);

    expect(snapshot).toEqual({
      'competitor.review_template_copy': {
        count: 1,
        lastAt: '2026-01-05T00:00:00.000Z',
      },
    });
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });

  it('supports negative review VOC template copy metrics', () => {
    const now = new Date('2026-01-06T00:00:00.000Z');

    const snapshot = recordOpsMetric('negative_review.review_template_copy', now);

    expect(snapshot).toEqual({
      'negative_review.review_template_copy': {
        count: 1,
        lastAt: '2026-01-06T00:00:00.000Z',
      },
    });
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });

  it('supports performance notification report template copy metrics', () => {
    const now = new Date('2026-01-07T00:00:00.000Z');

    const snapshot = recordOpsMetric('performance_notification.report_template_copy', now);

    expect(snapshot).toEqual({
      'performance_notification.report_template_copy': {
        count: 1,
        lastAt: '2026-01-07T00:00:00.000Z',
      },
    });
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });

  it('supports product compliance review template copy metrics', () => {
    const now = new Date('2026-01-08T00:00:00.000Z');

    const snapshot = recordOpsMetric('product_compliance.review_template_copy', now);

    expect(snapshot).toEqual({
      'product_compliance.review_template_copy': {
        count: 1,
        lastAt: '2026-01-08T00:00:00.000Z',
      },
    });
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });

  it('supports account security review template copy metrics', () => {
    const now = new Date('2026-01-09T00:00:00.000Z');

    const snapshot = recordOpsMetric('account_security.review_template_copy', now);

    expect(snapshot).toEqual({
      'account_security.review_template_copy': {
        count: 1,
        lastAt: '2026-01-09T00:00:00.000Z',
      },
    });
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });

  it('supports permission management template copy metrics', () => {
    const now = new Date('2026-01-09T12:00:00.000Z');

    const snapshot = recordOpsMetric('permission.management_template_copy', now);

    expect(snapshot).toEqual({
      'permission.management_template_copy': {
        count: 1,
        lastAt: '2026-01-09T12:00:00.000Z',
      },
    });
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });

  it('supports inventory replenishment template copy metrics', () => {
    const now = new Date('2026-01-10T00:00:00.000Z');

    const snapshot = recordOpsMetric('inventory.replenishment_template_copy', now);

    expect(snapshot).toEqual({
      'inventory.replenishment_template_copy': {
        count: 1,
        lastAt: '2026-01-10T00:00:00.000Z',
      },
    });
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });

  it('supports procurement QC template copy metrics', () => {
    const now = new Date('2026-01-11T00:00:00.000Z');

    const snapshot = recordOpsMetric('procurement.qc_template_copy', now);

    expect(snapshot).toEqual({
      'procurement.qc_template_copy': {
        count: 1,
        lastAt: '2026-01-11T00:00:00.000Z',
      },
    });
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });

  it('supports FBA shipping template copy metrics', () => {
    const now = new Date('2026-01-12T00:00:00.000Z');

    const snapshot = recordOpsMetric('fba.shipping_template_copy', now);

    expect(snapshot).toEqual({
      'fba.shipping_template_copy': {
        count: 1,
        lastAt: '2026-01-12T00:00:00.000Z',
      },
    });
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });

  it('supports brand infringement review template copy metrics', () => {
    const now = new Date('2026-01-13T00:00:00.000Z');

    const snapshot = recordOpsMetric('brand_infringement.review_template_copy', now);

    expect(snapshot).toEqual({
      'brand_infringement.review_template_copy': {
        count: 1,
        lastAt: '2026-01-13T00:00:00.000Z',
      },
    });
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });

  it('supports GPSR compliance template copy metrics', () => {
    const now = new Date('2026-01-14T00:00:00.000Z');

    const snapshot = recordOpsMetric('gpsr.compliance_template_copy', now);

    expect(snapshot).toEqual({
      'gpsr.compliance_template_copy': {
        count: 1,
        lastAt: '2026-01-14T00:00:00.000Z',
      },
    });
    expect(StorageService.set).toHaveBeenCalledWith(OPS_METRICS_STORAGE_KEY, snapshot);
  });
});
