import type { Thresholds } from './types';

export interface ThresholdFieldDefinition {
  key: keyof Thresholds;
  id: string;
  label: string;
  defaultValue: number;
  min: string;
  step: string;
}

export const TARGET_ACOS_FIELD: ThresholdFieldDefinition = {
  key: 'targetAcos',
  id: 'ppc-target-acos',
  label: '目标 ACOS %',
  defaultValue: 35,
  min: '1',
  step: '1',
};

export const HIGH_ACOS_FIELD: ThresholdFieldDefinition = {
  key: 'highAcos',
  id: 'ppc-high-acos',
  label: '高 ACOS %',
  defaultValue: 55,
  min: '1',
  step: '1',
};

export const MIN_CLICKS_FIELD: ThresholdFieldDefinition = {
  key: 'minClicksNoOrder',
  id: 'ppc-min-clicks',
  label: '无单点击',
  defaultValue: 12,
  min: '1',
  step: '1',
};

export const MIN_SPEND_FIELD: ThresholdFieldDefinition = {
  key: 'minSpendNoOrder',
  id: 'ppc-min-spend',
  label: '无单花费',
  defaultValue: 15,
  min: '1',
  step: '1',
};

export const MIN_ORDERS_FIELD: ThresholdFieldDefinition = {
  key: 'minOrdersHarvest',
  id: 'ppc-min-orders',
  label: '收割订单',
  defaultValue: 2,
  min: '1',
  step: '1',
};

export const MIN_CTR_FIELD: ThresholdFieldDefinition = {
  key: 'minCtr',
  id: 'ppc-min-ctr',
  label: '低 CTR %',
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
