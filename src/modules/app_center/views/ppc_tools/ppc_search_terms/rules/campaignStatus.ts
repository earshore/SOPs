interface CampaignStatusFields {
  status: string;
  serviceStatus: string;
}

const ACTIVE_CAMPAIGN_STATUS_KEYWORDS = [
  '正在投放',
  '投放中',
  '有效',
  '启用',
  '已启用',
  'enabled',
  'delivering',
  'serving',
  'running',
  'active',
];

const INACTIVE_CAMPAIGN_STATUS_KEYWORDS = [
  '暂停',
  '已暂停',
  '停止',
  '已停止',
  '付款失败',
  '异常',
  '拒登',
  'paused',
  'disabled',
  'inactive',
  'archived',
  'ended',
  'not delivering',
  'out of budget',
];

export function getCampaignStatusLabel(metrics: CampaignStatusFields): string {
  return [metrics.status, metrics.serviceStatus].filter(Boolean).join(' / ') || '-';
}

export function hasInactiveCampaignStatus(metrics: CampaignStatusFields): boolean {
  const statuses = [metrics.status, metrics.serviceStatus].filter(Boolean);
  if (statuses.length === 0) return false;
  if (statuses.some(isInactiveCampaignStatus)) return true;
  return statuses.every(status => !isActiveCampaignStatus(status));
}

function isInactiveCampaignStatus(value: string): boolean {
  const normalized = normalizeStatusText(value);
  return INACTIVE_CAMPAIGN_STATUS_KEYWORDS.some(keyword => normalized.includes(keyword));
}

function isActiveCampaignStatus(value: string): boolean {
  const normalized = normalizeStatusText(value);
  return ACTIVE_CAMPAIGN_STATUS_KEYWORDS.some(keyword => normalized.includes(keyword));
}

function normalizeStatusText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}
