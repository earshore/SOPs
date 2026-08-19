import { ValidationError } from '@/common/errors/AppError';

import {
  COLUMN_ALIASES,
  getRequiredFields,
  labelColumn,
  type ColumnKey,
  type CampaignOnlyColumnKey,
  type ColumnMapping,
  type MappedColumnKey,
} from './columnDefinitions';

import type { ReportType } from '../types';

export type { CampaignOnlyColumnKey, ColumnKey, ColumnMapping, MappedColumnKey };
export { labelColumn };

export function resolveReportType(headers: string[], selection: ReportType | 'auto'): ReportType {
  if (selection !== 'auto') return selection;

  const normalizedHeaders = headers.map(normalizeHeader);

  if (hasErpSearchTermHeaders(normalizedHeaders)) return 'erp_search_term';
  if (hasErpCampaignHeaders(normalizedHeaders)) return 'erp_campaign';
  return 'search_term';
}

export function isSearchTermReportType(reportType: ReportType): boolean {
  return reportType === 'search_term' || reportType === 'erp_search_term';
}

export function mapColumns(headers: string[], reportType: ReportType): ColumnMapping {
  const found: Partial<Record<MappedColumnKey, string>> = {};

  Object.entries(COLUMN_ALIASES).forEach(([key, aliases]) => {
    const normalizedAliases = aliases.map(normalizeHeader);
    const match = headers.find(header => normalizedAliases.includes(normalizeHeader(header)));
    if (match) found[key as MappedColumnKey] = match;
  });

  const requiredFields = getRequiredFields(reportType);
  const missing = requiredFields.filter(key => !found[key]);
  if (missing.length > 0) {
    throw new ValidationError(
      `缺少必要列：${missing.map(key => labelColumn(key)).join('、')}`,
      'PPC_IMPORT_002',
      'columns',
      missing,
      { module: 'ppc_search_terms', action: 'mapColumns', reportType }
    );
  }

  return { reportType, found, missing };
}

function hasErpSearchTermHeaders(normalizedHeaders: string[]): boolean {
  return hasAllHeaders(normalizedHeaders, ['shop', 'searchTerm', 'campaign', 'adGroup', 'acos']);
}

function hasErpCampaignHeaders(normalizedHeaders: string[]): boolean {
  return hasAllHeaders(normalizedHeaders, ['shop', 'serviceStatus', 'acos', 'dailyBudget']);
}

function hasAllHeaders(normalizedHeaders: string[], keys: MappedColumnKey[]): boolean {
  return keys.every(key => hasAnyHeader(normalizedHeaders, COLUMN_ALIASES[key]));
}

function hasAnyHeader(normalizedHeaders: string[], aliases: string[]): boolean {
  const normalizedAliases = aliases.map(normalizeHeader);
  return normalizedHeaders.some(header => normalizedAliases.includes(header));
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[#()]/g, '').replace(/\s+/g, ' ').trim();
}
