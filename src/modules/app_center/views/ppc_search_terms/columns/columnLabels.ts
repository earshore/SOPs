import type { MappedColumnKey } from './columnTypes';

const COLUMN_LABELS: Record<MappedColumnKey, string> = {
  currency: '币种',
  shop: '店铺名称',
  status: '有效状态',
  serviceStatus: '服务状态',
  campaign: '广告活动',
  adGroup: '广告组',
  bidStrategy: '广告活动竞价策略',
  dailyBudget: '每日预算',
  adType: '广告类型',
  targetingType: '投放类型',
  topPlacement: '搜索结果顶部广告位',
  productPlacement: '产品页面广告位',
  restPlacement: '搜索结果其余位置',
  searchTerm: '搜索词',
  keyword: '关键词',
  matchType: '匹配类型',
  impressions: '曝光',
  ctr: 'CTR',
  clicks: '点击',
  cvr: 'CVR',
  spend: '花费',
  costPerOrder: '每笔订单花费',
  cpc: 'CPC',
  acos: 'ACOS',
  roas: 'ROAS',
  acots: 'ACoTS',
  asots: 'ASoTS',
  sales: '销售额',
  orders: '订单',
  ownOrders: '本广告产品订单',
  otherOrders: '其他产品广告订单',
  ownSales: '本广告产品销售额',
  otherSales: '其他产品广告销售额',
};

export function labelColumn(key: MappedColumnKey): string {
  return COLUMN_LABELS[key] || key;
}
