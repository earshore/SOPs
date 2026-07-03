import { getButton, getElement, getInput } from '../ui/dom';

export function toggleAnalysisSettings(container: HTMLElement): void {
  const toggle = getButton(container, 'ppc-analysis-settings-toggle');
  const body = getElement(container, 'ppc-analysis-settings-body');
  if (!toggle || !body) return;

  const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!isExpanded));
  body.classList.toggle('hidden', isExpanded);
}

export function updateContextFieldsVisibility(container: HTMLElement): void {
  const useContext = getInput(container, 'ppc-use-context')?.checked || false;
  const fields = getElement(container, 'ppc-context-fields');
  if (!fields) return;

  fields.classList.toggle('hidden', !useContext);
  fields
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')
    .forEach(field => {
      field.disabled = !useContext;
    });
}
