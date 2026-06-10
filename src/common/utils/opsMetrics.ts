import { StorageService } from '../../services/storageService';

export type OpsMetricName =
  | 'ppc.action_export'
  | 'ppc.review_template_copy'
  | 'npi.csv_export'
  | 'npi.review_template_copy'
  | 'listing.review_template_copy';

export interface OpsMetricEntry {
  count: number;
  lastAt: string;
}

export type OpsMetricsSnapshot = Partial<Record<OpsMetricName, OpsMetricEntry>>;

export const OPS_METRICS_STORAGE_KEY = 'ops_metrics_v1';

export function readOpsMetrics(): OpsMetricsSnapshot {
  return StorageService.get<OpsMetricsSnapshot>(OPS_METRICS_STORAGE_KEY, {}) || {};
}

export function recordOpsMetric(name: OpsMetricName, now = new Date()): OpsMetricsSnapshot {
  const metrics = readOpsMetrics();
  const current = metrics[name];
  const next: OpsMetricsSnapshot = {
    ...metrics,
    [name]: {
      count: (current?.count || 0) + 1,
      lastAt: now.toISOString(),
    },
  };

  StorageService.set(OPS_METRICS_STORAGE_KEY, next);
  return next;
}
