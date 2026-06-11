import { StorageService } from '../../services/storageService';

export const OPS_METRIC_NAMES = [
  'ppc.action_export',
  'ppc.review_template_copy',
  'npi.csv_export',
  'npi.review_template_copy',
  'listing.review_template_copy',
  'promotion.submission_template_copy',
  'restricted_words.review_template_copy',
  'competitor.review_template_copy',
  'email_templates.reply_template_copy',
  'qa.maintenance_template_copy',
  'negative_review.review_template_copy',
  'performance_notification.report_template_copy',
  'product_compliance.review_template_copy',
  'account_security.review_template_copy',
  'permission.management_template_copy',
  'inventory.replenishment_template_copy',
  'procurement.qc_template_copy',
  'fba.shipping_template_copy',
  'brand_infringement.review_template_copy',
  'gpsr.compliance_template_copy',
] as const;

export type OpsMetricName = typeof OPS_METRIC_NAMES[number];

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
