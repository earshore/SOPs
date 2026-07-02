import { DEFAULT_ACTION_OWNER, normalizeActionOwner } from './actionItems';
import { buildCampaignActionCsv } from './campaignActionCsv';
import { buildErpSearchTermActionCsv, buildSearchTermActionCsv } from './searchTermActionCsv';
import type { AnalyzedRow } from './types';

export function buildActionCsv(rows: AnalyzedRow[], owner = DEFAULT_ACTION_OWNER): string {
  const actionOwner = normalizeActionOwner(owner);
  if (rows[0]?.reportType === 'erp_campaign') {
    return buildCampaignActionCsv(rows, actionOwner);
  }

  if (rows[0]?.reportType === 'erp_search_term') {
    return buildErpSearchTermActionCsv(rows, actionOwner);
  }

  return buildSearchTermActionCsv(rows, actionOwner);
}
