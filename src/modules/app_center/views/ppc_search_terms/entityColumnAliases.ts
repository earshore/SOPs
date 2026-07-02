import type { MappedColumnKey } from './columnTypes';

type EntityAliasKey = Extract<
  MappedColumnKey,
  | 'currency'
  | 'shop'
  | 'status'
  | 'serviceStatus'
  | 'campaign'
  | 'adGroup'
  | 'bidStrategy'
  | 'dailyBudget'
  | 'adType'
  | 'targetingType'
  | 'topPlacement'
  | 'productPlacement'
  | 'restPlacement'
  | 'searchTerm'
  | 'keyword'
  | 'matchType'
>;

export const ENTITY_COLUMN_ALIASES: Record<EntityAliasKey, string[]> = {
  currency: ['currency', 'currency code', '币种', '货币'],
  shop: ['店铺名称', '店铺', 'store', 'shop', 'account', 'account name'],
  status: ['有效状态', '状态', 'enabled status'],
  serviceStatus: ['服务状态', '投放状态', 'serving status', 'delivery status'],
  campaign: [
    'campaign name',
    'campaign name informational only',
    'campaign',
    'campaigns',
    '广告活动',
    '广告活动名称',
    '所在广告活动',
  ],
  adGroup: [
    'ad group name',
    'ad group name informational only',
    'ad group',
    'adgroup',
    '广告组',
    '广告组名称',
    '所在广告组',
  ],
  bidStrategy: ['广告活动竞价策略', '竞价策略', 'bidding strategy'],
  dailyBudget: ['每日预算', '日预算', 'daily budget', 'budget'],
  adType: ['广告类型', 'ad type', 'campaign type'],
  targetingType: ['投放类型', 'targeting type', 'targeting mode'],
  topPlacement: ['搜索结果顶部(首页)广告位', '搜索结果顶部首页广告位', 'top of search placement'],
  productPlacement: ['产品页面广告位', 'product pages placement'],
  restPlacement: ['搜索结果的其余位置', 'rest of search placement'],
  searchTerm: [
    'customer search term',
    'customer search term informational only',
    'search term',
    'search terms',
    '用户搜索词',
    '搜索词',
    '客户搜索词',
    '搜索词条',
  ],
  keyword: [
    'keyword',
    'targeting',
    'targeting informational only',
    'targeting expression',
    '投放',
    '投放词',
    '关键词',
    '定向',
  ],
  matchType: ['match type', 'match type informational only', 'match', '匹配类型'],
};
