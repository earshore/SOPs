import type { Thresholds } from '../types';

export interface ThresholdFieldDefinition {
  key: keyof Thresholds;
  id: string;
  label: string;
  helper: string;
  defaultValue: number;
  min: string;
  step: string;
}

export const TARGET_ACOS_FIELD: ThresholdFieldDefinition = {
  key: 'targetAcos',
  id: 'ppc-search-terms-target-acos',
  label: '目标 ACOS %',
  helper: '用于判断是否需要控价或降竞价。',
  defaultValue: 35,
  min: '1',
  step: '1',
};

export const HIGH_ACOS_FIELD: ThresholdFieldDefinition = {
  key: 'highAcos',
  id: 'ppc-search-terms-high-acos',
  label: '高 ACOS %',
  helper: '超过该值且有订单时优先进入控价动作。',
  defaultValue: 55,
  min: '1',
  step: '1',
};

export const MIN_CLICKS_FIELD: ThresholdFieldDefinition = {
  key: 'minClicksNoOrder',
  id: 'ppc-search-terms-min-clicks',
  label: '无单点击',
  helper: '无订单搜索词达到该点击数后进入否词候选。',
  defaultValue: 12,
  min: '1',
  step: '1',
};

export const MIN_SPEND_FIELD: ThresholdFieldDefinition = {
  key: 'minSpendNoOrder',
  id: 'ppc-search-terms-min-spend',
  label: '无单花费',
  helper: '无订单搜索词达到该花费后进入否词候选。',
  defaultValue: 15,
  min: '1',
  step: '1',
};

export const MIN_ORDERS_FIELD: ThresholdFieldDefinition = {
  key: 'minOrdersHarvest',
  id: 'ppc-search-terms-min-orders',
  label: '收割订单',
  helper: '达到该订单数后进入精准加词候选。',
  defaultValue: 2,
  min: '1',
  step: '1',
};

export const MIN_CTR_FIELD: ThresholdFieldDefinition = {
  key: 'minCtr',
  id: 'ppc-search-terms-min-ctr',
  label: '低 CTR %',
  helper: '低于该点击率时更倾向观察或优化 Listing。',
  defaultValue: 0.35,
  min: '0',
  step: '0.05',
};

export const THRESHOLD_FIELDS = [
  TARGET_ACOS_FIELD,
  HIGH_ACOS_FIELD,
  MIN_CLICKS_FIELD,
  MIN_SPEND_FIELD,
  MIN_ORDERS_FIELD,
  MIN_CTR_FIELD,
];
