import { parseMetric, parsePercentageMetric, percentage, ratio } from './metrics';
import type { ColumnMapping, MappedColumnKey } from './columns';
import type { RawRecord } from './delimitedReport';
import type { SearchTermMetrics } from './searchTermRules';
import type { AnalyzedRow } from './types';

type PerformanceMetrics = Pick<
  AnalyzedRow,
  'impressions' | 'clicks' | 'spend' | 'sales' | 'orders' | 'ctr' | 'cvr' | 'cpc' | 'acos'
>;

interface CampaignPerformanceMetrics extends PerformanceMetrics {
  dailyBudget: number;
  roas: number;
  ownSales: number;
  otherSales: number;
}

export function readSearchTermPerformanceMetrics(
  record: RawRecord,
  mapping: ColumnMapping
): PerformanceMetrics {
  const metrics = readBasePerformanceMetrics(record, mapping);

  return {
    ...metrics,
    cpc: ratio(metrics.spend, metrics.clicks),
  };
}

export function readCampaignPerformanceMetrics(
  record: RawRecord,
  mapping: ColumnMapping
): CampaignPerformanceMetrics {
  const metrics = readBasePerformanceMetrics(record, mapping);

  return {
    ...metrics,
    ctr: readOrCalculatePercentage(record, mapping, 'ctr', metrics.clicks, metrics.impressions),
    cvr: readOrCalculatePercentage(record, mapping, 'cvr', metrics.orders, metrics.clicks),
    cpc: parseMetric(readField(record, mapping, 'cpc')) || ratio(metrics.spend, metrics.clicks),
    acos: parsePercentageMetric(readField(record, mapping, 'acos'), metrics.acos),
    dailyBudget: parseMetric(readField(record, mapping, 'dailyBudget')),
    roas: parseMetric(readField(record, mapping, 'roas')) || ratio(metrics.sales, metrics.spend),
    ownSales: parseMetric(readField(record, mapping, 'ownSales')),
    otherSales: parseMetric(readField(record, mapping, 'otherSales')),
  };
}

export function readField(record: RawRecord, mapping: ColumnMapping, key: MappedColumnKey): string {
  const column = mapping.found[key];
  return column ? record[column] || '' : '';
}

function readBasePerformanceMetrics(record: RawRecord, mapping: ColumnMapping): SearchTermMetrics {
  const impressions = parseMetric(readField(record, mapping, 'impressions'));
  const clicks = parseMetric(readField(record, mapping, 'clicks'));
  const spend = parseMetric(readField(record, mapping, 'spend'));
  const sales = parseMetric(readField(record, mapping, 'sales'));
  const orders = parseMetric(readField(record, mapping, 'orders'));
  const ctr = percentage(clicks, impressions);
  const cvr = percentage(orders, clicks);
  const acos = percentage(spend, sales);

  return { impressions, clicks, spend, sales, orders, ctr, cvr, acos };
}

function readOrCalculatePercentage(
  record: RawRecord,
  mapping: ColumnMapping,
  key: MappedColumnKey,
  numerator: number,
  denominator: number
): number {
  return parsePercentageMetric(readField(record, mapping, key), percentage(numerator, denominator));
}
