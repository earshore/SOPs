import { StorageService } from '@/services/storageService';
import { getElement } from './dom';
import { getInput, readNumber, setInputValue } from './settingsFields';
import type { Thresholds } from './types';

const STORAGE_KEY = 'ppc_search_terms_thresholds_v1';
const THRESHOLD_INPUT_CLASS = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

interface ThresholdFieldDefinition {
  key: keyof Thresholds;
  id: string;
  label: string;
  defaultValue: number;
  min: string;
  step: string;
}

const TARGET_ACOS_FIELD: ThresholdFieldDefinition = {
  key: 'targetAcos',
  id: 'ppc-target-acos',
  label: '目标 ACOS %',
  defaultValue: 35,
  min: '1',
  step: '1',
};
const HIGH_ACOS_FIELD: ThresholdFieldDefinition = {
  key: 'highAcos',
  id: 'ppc-high-acos',
  label: '高 ACOS %',
  defaultValue: 55,
  min: '1',
  step: '1',
};
const MIN_CLICKS_FIELD: ThresholdFieldDefinition = {
  key: 'minClicksNoOrder',
  id: 'ppc-min-clicks',
  label: '无单点击',
  defaultValue: 12,
  min: '1',
  step: '1',
};
const MIN_SPEND_FIELD: ThresholdFieldDefinition = {
  key: 'minSpendNoOrder',
  id: 'ppc-min-spend',
  label: '无单花费',
  defaultValue: 15,
  min: '1',
  step: '1',
};
const MIN_ORDERS_FIELD: ThresholdFieldDefinition = {
  key: 'minOrdersHarvest',
  id: 'ppc-min-orders',
  label: '收割订单',
  defaultValue: 2,
  min: '1',
  step: '1',
};
const MIN_CTR_FIELD: ThresholdFieldDefinition = {
  key: 'minCtr',
  id: 'ppc-min-ctr',
  label: '低 CTR %',
  defaultValue: 0.35,
  min: '0',
  step: '0.05',
};

const THRESHOLD_FIELDS = [
  TARGET_ACOS_FIELD,
  HIGH_ACOS_FIELD,
  MIN_CLICKS_FIELD,
  MIN_SPEND_FIELD,
  MIN_ORDERS_FIELD,
  MIN_CTR_FIELD,
];

export function renderThresholdFields(container: HTMLElement): void {
  const grid = getElement(container, 'ppc-threshold-grid');
  if (!grid) return;
  grid.replaceChildren(...THRESHOLD_FIELDS.map(createThresholdField));
}

export function getThresholdInputs(container: HTMLElement): HTMLInputElement[] {
  return THRESHOLD_FIELDS.map(field => getInput(container, field.id)).filter(
    (input): input is HTMLInputElement => input !== null
  );
}

export function readThresholds(container: HTMLElement): Thresholds {
  return {
    targetAcos: readThresholdField(container, TARGET_ACOS_FIELD),
    highAcos: readThresholdField(container, HIGH_ACOS_FIELD),
    minClicksNoOrder: readThresholdField(container, MIN_CLICKS_FIELD),
    minSpendNoOrder: readThresholdField(container, MIN_SPEND_FIELD),
    minOrdersHarvest: readThresholdField(container, MIN_ORDERS_FIELD),
    minCtr: readThresholdField(container, MIN_CTR_FIELD),
  };
}

export function restoreThresholds(container: HTMLElement): void {
  const saved = StorageService.get<Partial<Thresholds>>(STORAGE_KEY, {}) || {};
  THRESHOLD_FIELDS.forEach(field => {
    setInputValue(container, field.id, saved[field.key], field.defaultValue);
  });
}

export function saveThresholds(thresholds: Thresholds): void {
  StorageService.set(STORAGE_KEY, thresholds);
}

function readThresholdField(container: HTMLElement, field: ThresholdFieldDefinition): number {
  return readNumber(container, field.id, field.defaultValue);
}

function createThresholdField(field: ThresholdFieldDefinition): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'text-xs font-semibold text-slate-600';
  label.append(document.createTextNode(field.label), createThresholdInput(field));
  return label;
}

function createThresholdInput(field: ThresholdFieldDefinition): HTMLInputElement {
  const input = document.createElement('input');
  input.id = field.id;
  input.type = 'number';
  input.value = String(field.defaultValue);
  input.min = field.min;
  input.step = field.step;
  input.className = THRESHOLD_INPUT_CLASS;
  return input;
}
