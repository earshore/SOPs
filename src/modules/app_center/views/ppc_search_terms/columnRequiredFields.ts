import type { MappedColumnKey } from './columnTypes';
import type { ReportType } from './types';

const REQUIRED_FIELDS: MappedColumnKey[] = ['searchTerm', 'clicks', 'spend', 'sales', 'orders'];
const ERP_SEARCH_TERM_REQUIRED_FIELDS: MappedColumnKey[] = [
  'shop',
  'searchTerm',
  'campaign',
  'adGroup',
  'clicks',
  'spend',
  'sales',
  'orders',
];
const ERP_CAMPAIGN_REQUIRED_FIELDS: MappedColumnKey[] = [
  'shop',
  'campaign',
  'clicks',
  'spend',
  'sales',
  'orders',
];

export function getRequiredFields(reportType: ReportType): MappedColumnKey[] {
  if (reportType === 'erp_campaign') return ERP_CAMPAIGN_REQUIRED_FIELDS;
  if (reportType === 'erp_search_term') return ERP_SEARCH_TERM_REQUIRED_FIELDS;
  return REQUIRED_FIELDS;
}
