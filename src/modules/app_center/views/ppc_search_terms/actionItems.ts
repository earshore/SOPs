import type { AnalyzedRow } from './types';

export const DEFAULT_ACTION_OWNER = '广告负责人';

export const ACTION_ITEM_COLUMNS = [
  'ActionItem ID',
  'Risk Level',
  'Requires Human Confirmation',
  'Status',
  'Owner',
];

export function buildActionItemCsvFields(row: AnalyzedRow, owner: string): string[] {
  return [
    buildActionItemId(row),
    getActionRiskLevel(row),
    requiresHumanConfirmation(row) ? 'TRUE' : 'FALSE',
    getActionStatus(row),
    owner,
  ];
}

export function requiresHumanConfirmation(row: AnalyzedRow): boolean {
  return row.action !== 'observe';
}

export function getActionStatus(row: AnalyzedRow): string {
  return requiresHumanConfirmation(row) ? 'pending_human_review' : 'monitoring';
}

export function normalizeActionOwner(owner: unknown): string {
  return typeof owner === 'string' && owner.trim() ? owner.trim() : DEFAULT_ACTION_OWNER;
}

function buildActionItemId(row: AnalyzedRow): string {
  return `ppc-${row.reportType}-${slugForId(row.id)}`;
}

function slugForId(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'action'
  );
}

function getActionRiskLevel(row: AnalyzedRow): string {
  if (
    [
      'negative_exact',
      'scale_budget',
      'bid_down',
      'campaign_fix_status',
      'campaign_pause',
      'campaign_scale',
      'campaign_bid_down',
    ].includes(row.action)
  ) {
    return 'high';
  }

  if (row.action === 'observe') {
    return 'low';
  }

  return 'medium';
}
