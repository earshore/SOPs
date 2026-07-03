import { getElement } from '../ui/dom';
import { getInput } from './settingsFields';
import { THRESHOLD_FIELDS, type ThresholdFieldDefinition } from './thresholdFields';

const THRESHOLD_INPUT_CLASS = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

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
