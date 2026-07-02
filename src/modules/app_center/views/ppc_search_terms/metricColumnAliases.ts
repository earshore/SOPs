import type { MappedColumnKey } from './columnTypes';

type MetricAliasKey = Extract<
  MappedColumnKey,
  | 'impressions'
  | 'ctr'
  | 'clicks'
  | 'cvr'
  | 'spend'
  | 'costPerOrder'
  | 'cpc'
  | 'acos'
  | 'roas'
  | 'acots'
  | 'asots'
  | 'sales'
  | 'orders'
  | 'ownOrders'
  | 'otherOrders'
  | 'ownSales'
  | 'otherSales'
>;

export const METRIC_COLUMN_ALIASES: Record<MetricAliasKey, string[]> = {
  impressions: ['impressions', 'impression', '展示量', '曝光量', '广告曝光量', '曝光'],
  ctr: ['广告点击率', '点击率(CTR)', 'click-through rate', 'ctr'],
  clicks: ['clicks', 'clicks informational only', 'click', '点击量', '广告点击量', '点击'],
  cvr: ['广告转化率', '7天的转化率', 'conversion rate', 'cvr'],
  spend: [
    'spend',
    'spend informational only',
    'cost',
    'costs',
    'ad spend',
    '花费',
    '广告花费',
    '支出',
  ],
  costPerOrder: ['每笔订单花费', 'cost per order'],
  cpc: ['平均点击费用', '每次点击成本(CPC)', 'cpc', 'average cpc', 'cost per click'],
  acos: ['acos', 'ACoS', '广告成本销售比(ACOS)'],
  roas: ['roas', 'ROAS', '投入产出比(ROAS)'],
  acots: ['acots', 'ACoTS'],
  asots: ['asots', 'ASoTS'],
  sales: [
    'sales',
    'total sales',
    'sales 7 day total',
    'sales 14 day total',
    '7 day total sales',
    '7 day total sales total',
    '14 day total sales',
    '14 day total sales total',
    'attributed sales',
    '销售额',
    '7天总销售额',
    '14天总销售额',
    '广告销售额',
  ],
  orders: [
    'orders',
    'total orders',
    'orders 7 day total',
    'orders 14 day total',
    '7 day total orders (#)',
    '7 day total orders',
    '14 day total orders (#)',
    '14 day total orders',
    'purchases',
    'conversions',
    '订单',
    '订单量',
    '7天总订单数(#)',
    '7天总订单数',
    '14天总订单数(#)',
    '14天总订单数',
    '广告订单量',
  ],
  ownOrders: ['本广告产品订单量', '7天内广告SKU销售量(#)'],
  otherOrders: ['其他产品广告订单量', '7天内其他SKU销售量(#)'],
  ownSales: ['本广告产品销售额', '7天内广告SKU销售额'],
  otherSales: ['其他产品广告销售额', '7天内其他SKU销售额'],
};
