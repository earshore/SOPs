import { getElement, getInput } from '../ui/dom';

export function updateContextFieldsVisibility(container: HTMLElement): void {
  const useContext = getInput(container, 'ppc-search-terms-use-context')?.checked || false;
  const fields = getElement(container, 'ppc-search-terms-context-fields');
  if (!fields) return;

  fields.classList.toggle('hidden', !useContext);
  fields
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')
    .forEach(field => {
      field.disabled = !useContext;
    });
}
