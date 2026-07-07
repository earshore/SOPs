export function getAnalysisSettingInputs(container: HTMLElement): HTMLInputElement[] {
  return getInputsByIds(container, [
    'ppc-search-terms-use-agent',
    'ppc-search-terms-allow-local-fallback',
    'ppc-search-terms-use-context',
  ]);
}

export function readNumber(container: HTMLElement, id: string, fallback: number): number {
  const value = Number.parseFloat(getInput(container, id)?.value || '');
  return Number.isFinite(value) ? value : fallback;
}

export function setInputValue(
  container: HTMLElement,
  id: string,
  value: number | undefined,
  fallback: number
): void {
  const input = getInput(container, id);
  if (input) input.value = String(value ?? fallback);
}

export function setChecked(container: HTMLElement, id: string, value: boolean): void {
  const input = getInput(container, id);
  if (input) input.checked = value;
}

export function getInput(container: HTMLElement, id: string): HTMLInputElement | null {
  return container.querySelector<HTMLInputElement>(`#${id}`);
}

export function getSelect(container: HTMLElement, id: string): HTMLSelectElement | null {
  return container.querySelector<HTMLSelectElement>(`#${id}`);
}

export function getTextarea(container: HTMLElement, id: string): HTMLTextAreaElement | null {
  return container.querySelector<HTMLTextAreaElement>(`#${id}`);
}

function getInputsByIds(container: HTMLElement, ids: string[]): HTMLInputElement[] {
  return ids
    .map(id => getInput(container, id))
    .filter((input): input is HTMLInputElement => input !== null);
}
