import { getButton, getElement } from '../ui/dom';

export function initializeThresholdPanel(container: HTMLElement): void {
  setThresholdPanelExpanded(container, false);
}

export function toggleThresholdPanel(container: HTMLElement): void {
  const toggle = getButton(container, 'ppc-search-terms-threshold-toggle');
  if (!toggle) return;

  const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
  setThresholdPanelExpanded(container, !isExpanded);
}

function setThresholdPanelExpanded(container: HTMLElement, isExpanded: boolean): void {
  const toggle = getButton(container, 'ppc-search-terms-threshold-toggle');
  const body = getElement(container, 'ppc-search-terms-threshold-body');
  if (!toggle || !body) return;

  toggle.setAttribute('aria-expanded', String(isExpanded));
  body.classList.toggle('hidden', !isExpanded);
  const label = getElement(container, 'ppc-search-terms-threshold-toggle-label');
  if (label) label.textContent = isExpanded ? '收起' : '展开';
}
