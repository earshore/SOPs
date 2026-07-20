// src/modules/amz_hub/constants/amz_hub_constants.ts
// ================================================================
// 🎯 Amazon Hub 常量定义 (TypeScript版本)
// ================================================================

import { parseIsoDateLocal } from '../data/marketingCalendar/dateRules';
import { resolveYear } from '../data/marketingCalendar/resolveYear';
import { MARKETING_EVENT_TEMPLATES } from '../data/marketingCalendar/templates';

/**
 * 国家数据接口
 */
export interface CountryData {
  name: string;
  traits: string;
  tips: string;
  radarData: [number, number, number, number, number];
}

/**
 * 国家代码类型（统一使用 ISO 3166-1 alpha-2 大写代码）
 * 注意：英国使用 GB（非 uk），与营销日历保持一致
 */
export type CountryCode =
  | 'DE'
  | 'GB'
  | 'FR'
  | 'IT'
  | 'ES'
  | 'NL'
  | 'SE'
  | 'PL'
  | 'BE'
  | 'TR'
  | 'IE';

/**
 * 欧洲国家画像数据
 * 雷达图维度顺序：[质量要求, 环保意识, 价格敏感, 外观设计, 品牌信任]
 */
export const AMZ_COUNTRY_DATA: Record<CountryCode, CountryData> = {
  DE: {
    name: '德国',
    traits: '严谨、注重参数、低退货容忍度、环保意识极强。',
    tips: '文案避免空洞形容词，强调TUV认证、保修条款和具体材质参数。Review中常见抱怨点为物流包装和说明书不清晰。',
    radarData: [90, 85, 40, 60, 95],
  },
  GB: {
    name: '英国',
    traits: '礼貌、幽默、价格敏感度中等、重视配送时效。',
    tips: '使用英式拼写 (Colour, Organise)。文案语调可适当轻松。特别关注 Prime 配送标识。',
    radarData: [70, 60, 80, 70, 75],
  },
  FR: {
    name: '法国',
    traits: '追求美感、感性消费、重视母语纯正度。',
    tips: '图片审美必须高。绝对不能使用机翻法语，法国人对语言错误容忍度极低。包装设计很重要。',
    radarData: [75, 50, 65, 90, 60],
  },
  IT: {
    name: '意大利',
    traits: '热情、重视设计感、价格敏感度较高。',
    tips: '强调产品的时尚感和设计风格。客户服务回复速度要快。',
    radarData: [60, 40, 85, 80, 50],
  },
  ES: {
    name: '西班牙',
    traits: '价格极其敏感、喜欢促销、家庭观念重。',
    tips: '强调性价比 (Value for money)。促销活动和Coupon效果最好。',
    radarData: [50, 30, 95, 60, 55],
  },
  NL: {
    name: '荷兰',
    traits: '务实直爽、英语极好但偏好母语、精打细算、不仅看价格也看质量。',
    tips: '物流必须快（对标本土Bol.com）。文案要直接（No Nonsense），强调环保和实用性。虽然有钱，但非常喜欢比价。',
    radarData: [80, 80, 85, 65, 85],
  },
  SE: {
    name: '瑞典',
    traits: '高信任社会、极度环保主义、偏好极简北欧风、高客单价接受度。',
    tips: '产品必须符合可持续发展标准。设计风格需简洁冷淡。任何隐形费用都会导致差评。',
    radarData: [85, 90, 45, 85, 90],
  },
  PL: {
    name: '波兰',
    traits: '电商发展极快、价格敏感度极高、年轻化。',
    tips: '主要竞争对手是Allegro。低价策略渗透效果好。必须使用波兰语客服，不要试图用英语沟通。',
    radarData: [55, 35, 90, 50, 60],
  },
  BE: {
    name: '比利时',
    traits: '语言复杂（荷/法双语）、生活标准高、低调谦逊。',
    tips: '必须提供双语（法/荷）Listing和说明书。相比荷兰人更含蓄，避免过于激进的营销措辞。',
    radarData: [75, 75, 65, 70, 80],
  },
  TR: {
    name: '土耳其',
    traits: '年轻人口多、通胀导致的价格极度敏感、喜欢分期付款。',
    tips: '退货率通常较高（尤其是时尚类）。紧跟当地流行趋势。注意汇率波动对定价的影响。',
    radarData: [50, 25, 95, 65, 45],
  },
  IE: {
    name: '爱尔兰',
    traits: '英语国家、消费力强、重视节日文化、对品质有要求。',
    tips: '英语Listing即可，但语调可偏英式。圣帕特里克节是核心营销节点。物流对标英国，需注意爱尔兰岛末端配送时效。',
    radarData: [70, 65, 60, 70, 80],
  },
};

/**
 * Chart.js 数据集接口
 */
export interface ChartDataset {
  data: number[];
  backgroundColor: string[];
  borderWidth: number;
  hoverOffset: number;
}

/**
 * Chart.js 数据接口
 */
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

/**
 * A10 算法图表配置数据
 */
export const A10_CHART_DATA: ChartData = {
  labels: [
    '自然销量 (Organic)',
    '转化率 (CVR)',
    '站外/引流 (Off-site)',
    'PPC 广告',
    '点击率 (CTR)',
    '其他',
  ],
  datasets: [
    {
      data: [35, 25, 20, 10, 5, 5],
      backgroundColor: ['#1E293B', '#F59E0B', '#10B981', '#6366F1', '#3B82F6', '#94A3B8'],
      borderWidth: 0,
      hoverOffset: 4,
    },
  ],
};

/**
 * 雷达图数据集接口
 */
export interface RadarDataset {
  label: string;
  data: number[];
  fill: boolean;
  backgroundColor: string;
  borderColor: string;
  pointBackgroundColor: string;
}

/**
 * 雷达图数据接口
 */
export interface RadarChartData {
  labels: string[];
  datasets: RadarDataset[];
}

/**
 * SEO 关键词雷达图数据
 */
export const SEO_RADAR_DATA: RadarChartData = {
  labels: ['语义相关性', '流量准确性', '长尾挖掘力', '转化意图', '竞争程度'],
  datasets: [
    {
      label: 'Review/Listing 扒词',
      data: [95, 40, 90, 85, 30],
      fill: true,
      backgroundColor: 'rgba(234, 88, 12, 0.2)',
      borderColor: '#EA580C',
      pointBackgroundColor: '#EA580C',
    },
    {
      label: 'ABA 报告数据',
      data: [60, 95, 50, 70, 90],
      fill: true,
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: '#3B82F6',
      pointBackgroundColor: '#3B82F6',
    },
  ],
};

/**
 * 国家信息接口
 */
export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
}

/**
 * 营销日历 - 国家列表（统一大写 ISO 代码，与 AMZ_COUNTRY_DATA 对齐）
 */
export const AMZF_COUNTRIES: CountryInfo[] = [
  { code: 'DE', name: '德国', flag: '<span class="fi fi-de"></span>' },
  { code: 'FR', name: '法国', flag: '<span class="fi fi-fr"></span>' },
  { code: 'IT', name: '意大利', flag: '<span class="fi fi-it"></span>' },
  { code: 'ES', name: '西班牙', flag: '<span class="fi fi-es"></span>' },
  { code: 'NL', name: '荷兰', flag: '<span class="fi fi-nl"></span>' },
  { code: 'PL', name: '波兰', flag: '<span class="fi fi-pl"></span>' },
  { code: 'GB', name: '英国', flag: '<span class="fi fi-gb"></span>' },
  { code: 'SE', name: '瑞典', flag: '<span class="fi fi-se"></span>' },
  { code: 'BE', name: '比利时', flag: '<span class="fi fi-be"></span>' },
  { code: 'IE', name: '爱尔兰', flag: '<span class="fi fi-ie"></span>' },
  { code: 'TR', name: '土耳其', flag: '<span class="fi fi-tr"></span>' },
];

/**
 * 营销日历 - 月份列表
 */
export const AMZF_MONTHS: string[] = [
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
];

/**
 * 事件类型
 */
export type EventType = 'holiday' | 'shopping' | 'cultural' | 'financial' | 'season';

/**
 * 营销事件接口（legacy shape for encyclopedia UI）
 */
export interface MarketingEvent {
  id: number;
  name: string;
  nameEn: string;
  emoji: string;
  date: string;
  month: number;
  countries: string[];
  type: EventType;
  description: string;
  strategy: string;
  tags: string[];
}

/**
 * Map resolved occurrences to legacy MarketingEvent for existing calendar UI.
 * Single source of truth: evergreen templates + resolveYear(2026).
 */
function toLegacyMarketingEvents(year: number): MarketingEvent[] {
  const templateById = new Map(MARKETING_EVENT_TEMPLATES.map(t => [t.id, t]));
  return resolveYear(year).map((occ, index) => {
    const template = templateById.get(occ.templateId);
    let month = template?.defaultMonth ?? 1;
    if (occ.startDate) {
      month = parseIsoDateLocal(occ.startDate).m;
    }
    return {
      id: template?.legacyId ?? index + 1,
      name: occ.name,
      nameEn: occ.nameEn,
      emoji: occ.emoji,
      date: occ.dateLabel,
      month,
      countries: occ.countries,
      type: occ.type,
      description: occ.description,
      strategy: occ.strategy,
      tags: occ.tags,
    };
  });
}

/**
 * 营销日历 - 事件列表（兼容层）
 * 由 evergreen templates + resolveYear(2026) 生成，勿再手写全量事件体。
 */
export const AMZF_EVENTS: MarketingEvent[] = toLegacyMarketingEvents(2026);

// 默认导出
export default {
  AMZ_COUNTRY_DATA,
  A10_CHART_DATA,
  SEO_RADAR_DATA,
  AMZF_COUNTRIES,
  AMZF_MONTHS,
  AMZF_EVENTS,
};
