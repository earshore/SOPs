import type { SkillCategoryId, SkillStatus } from './types';

export const CATEGORY_LABELS: Record<SkillCategoryId, string> = {
  product_research: '选品与关键词',
  competitor: '竞品分析',
  pricing_profit: '定价与利润',
  advertising: '广告投放',
  listing: 'Listing 优化',
  analytics: '分析与监控',
  growth: '增长与扩展',
  other: '其他',
};

type Entry = { category: SkillCategoryId; status?: SkillStatus };

const SKILL_CATEGORY_MAP: Record<string, Entry> = {
  'amazon-keyword-research': { category: 'product_research' },
  'amazon-trending-products': { category: 'product_research' },
  'amazon-product-research': { category: 'product_research' },
  'amazon-niche-finder': { category: 'product_research' },
  'amazon-seller-analytics': { category: 'product_research' },
  'amazon-private-label': { category: 'product_research' },
  'amazon-wholesale-sourcing': { category: 'product_research' },
  'amazon-category-ungating': { category: 'product_research' },
  'amazon-competitor-monitoring': { category: 'competitor' },
  'amazon-brand-analytics': { category: 'competitor' },
  'amazon-competitor-analysis': { category: 'competitor' },
  'amazon-review-analyzer': { category: 'competitor' },
  'amazon-fba-calculator': { category: 'pricing_profit' },
  'tariff-calculator-amazon': { category: 'pricing_profit' },
  'amazon-profit-analyzer': { category: 'pricing_profit' },
  'amazon-repricing-strategy': { category: 'pricing_profit' },
  'amazon-buy-box': { category: 'pricing_profit' },
  'amazon-deal-finder': { category: 'pricing_profit' },
  'amazon-shipping-calculator': { category: 'pricing_profit' },
  'amazon-coupon-strategy': { category: 'pricing_profit' },
  'amazon-ppc-campaign': { category: 'advertising' },
  'amazon-advertising-strategy': { category: 'advertising' },
  'amazon-negative-keywords': { category: 'advertising' },
  'amazon-display-ads': { category: 'advertising' },
  'amazon-dayparting-strategy': { category: 'advertising' },
  'amazon-brand-tailored-promotions': { category: 'advertising' },
  'amazon-listing-optimization': { category: 'listing' },
  'amazon-a-plus-content': { category: 'listing' },
  'amazon-backend-keywords': { category: 'listing' },
  'amazon-search-optimization': { category: 'listing' },
  'amazon-listing-images': { category: 'listing' },
  'amazon-enhanced-brand-content': { category: 'listing' },
  'amazon-storefront-design': { category: 'listing' },
  'amazon-variation-strategy': { category: 'listing' },
  'amazon-product-bundling': { category: 'listing' },
  'amazon-sales-estimator': { category: 'analytics' },
  'amazon-rank-tracker': { category: 'analytics' },
  'amazon-keyword-tracker': { category: 'analytics' },
  'amazon-price-tracker': { category: 'analytics' },
  'amazon-product-photography': { category: 'analytics', status: 'beta' },
  'amazon-inventory-management': { category: 'analytics' },
  'amazon-seasonal-planning': { category: 'analytics' },
  'amazon-return-reduction': { category: 'analytics' },
  'amazon-review-strategy': { category: 'analytics' },
  'amazon-global-selling': { category: 'growth', status: 'beta' },
  'amazon-fba-prep': { category: 'growth', status: 'beta' },
  'amazon-international-listings': { category: 'growth' },
  'amazon-brand-registry': { category: 'growth' },
  'amazon-product-compliance': { category: 'growth' },
  'amazon-suspension-appeal': { category: 'growth' },
  'amazon-subscribe-save': { category: 'growth' },
  'amazon-vine-program': { category: 'growth' },
};

export function resolveSkillCategory(id: string): {
  category: SkillCategoryId;
  categoryLabel: string;
  status: SkillStatus;
} {
  const entry = SKILL_CATEGORY_MAP[id];
  if (!entry) {
    return {
      category: 'other',
      categoryLabel: CATEGORY_LABELS.other,
      status: 'unknown',
    };
  }
  return {
    category: entry.category,
    categoryLabel: CATEGORY_LABELS[entry.category],
    status: entry.status ?? 'available',
  };
}
