export function setAnalyzeButtonState(container: HTMLElement, isAnalyzing: boolean): void {
  const button = getButton(container, 'ppc-search-terms-btn-parse');
  if (!button) return;

  button.disabled = isAnalyzing;
  button.replaceChildren(
    createIcon(isAnalyzing ? 'fas fa-circle-notch fa-spin' : 'fas fa-chart-line'),
    document.createTextNode(isAnalyzing ? '分析中' : '分析当前数据')
  );
}

export function setButtonDisabled(container: HTMLElement, id: string, disabled: boolean): void {
  const button = getButton(container, id);
  if (button) button.disabled = disabled;
}

export function setButtonContent(
  container: HTMLElement,
  id: string,
  iconClass: string,
  label: string
): void {
  const button = getButton(container, id);
  if (!button) return;
  button.replaceChildren(createIcon(iconClass), document.createTextNode(label));
}

export function createIcon(className: string): HTMLElement {
  const icon = document.createElement('i');
  icon.className = className;
  return icon;
}

export function getElement(container: HTMLElement, id: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`#${id}`);
}

export function getInput(container: HTMLElement, id: string): HTMLInputElement | null {
  return container.querySelector<HTMLInputElement>(`#${id}`);
}

export function getButton(container: HTMLElement, id: string): HTMLButtonElement | null {
  return container.querySelector<HTMLButtonElement>(`#${id}`);
}

export function getTextarea(container: HTMLElement, id: string): HTMLTextAreaElement | null {
  return container.querySelector<HTMLTextAreaElement>(`#${id}`);
}

export function setText(container: HTMLElement, id: string, text: string): void {
  const element = getElement(container, id);
  if (element) element.textContent = text;
}
