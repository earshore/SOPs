import { ACTION_LABELS } from '../actions/actionMetadata';
import type { ActionType, AnalyzedRow, ReportType } from '../types';

export type FilterType = ActionType | 'all';

export function filterRows(rows: AnalyzedRow[], filter: FilterType): AnalyzedRow[] {
  if (filter === 'all') return rows;
  return rows.filter(row => row.action === filter);
}

export function searchRows(rows: AnalyzedRow[], query: string): AnalyzedRow[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return rows;
  return rows.filter(row => buildSearchText(row).includes(normalizedQuery));
}

export function isFilterType(value: string | undefined): value is FilterType {
  if (!value) return false;
  return value === 'all' || Object.prototype.hasOwnProperty.call(ACTION_LABELS, value);
}

export function getWasteExportFilter(reportType: ReportType): FilterType {
  return reportType === 'erp_campaign' ? 'campaign_pause' : 'negative_exact';
}

export function getGrowthExportFilter(reportType: ReportType): FilterType {
  return reportType === 'erp_campaign' ? 'campaign_scale' : 'harvest_exact';
}

function buildSearchText(row: AnalyzedRow): string {
  return normalizeSearchText(
    [
      row.searchTerm,
      row.campaign,
      row.adGroup,
      row.keyword,
      row.matchType,
      row.actionLabel,
      row.reason,
      row.store,
      row.serviceStatus,
      row.targetingType,
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}
