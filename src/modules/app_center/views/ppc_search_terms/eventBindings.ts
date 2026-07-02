import { getElement, getInput } from './dom';
import {
  getAnalysisSettingInputs,
  getThresholdInputs,
  readActionOwner,
  saveActionOwner,
} from './settings';

export type AddListener = (
  element: EventTarget | null,
  type: string,
  handler: EventListenerOrEventListenerObject
) => void;

export interface PpcEventHandlers {
  importReport(): void;
  analyzeTextarea(): Promise<void>;
  loadSample(): void;
  clearAnalyzer(): void;
  toggleAnalysisSettings(): void;
  handleReportSelectionChange(): void;
  exportAll(): void;
  exportCurrent(): void;
  exportWaste(): void;
  exportGrowth(): void;
  copySummary(): Promise<void>;
  handleActionSearch(): void;
  handleActionSearchKeydown(event: Event): void;
  clearActionSearch(): void;
  setFilter(button: HTMLElement): void;
  handleThresholdChange(): void;
  handleAnalysisSettingsChange(): void;
}

export function bindPpcEvents(
  container: HTMLElement,
  addListener: AddListener,
  handlers: PpcEventHandlers
): void {
  addListener(getElement(container, 'ppc-file-input'), 'change', handlers.importReport);
  addListener(getElement(container, 'ppc-btn-parse'), 'click', () => {
    void handlers.analyzeTextarea();
  });
  addListener(getElement(container, 'ppc-btn-sample'), 'click', handlers.loadSample);
  addListener(getElement(container, 'ppc-btn-clear'), 'click', handlers.clearAnalyzer);
  addListener(
    getElement(container, 'ppc-analysis-settings-toggle'),
    'click',
    handlers.toggleAnalysisSettings
  );
  addListener(
    getElement(container, 'ppc-report-type'),
    'change',
    handlers.handleReportSelectionChange
  );
  addListener(getElement(container, 'ppc-export-all'), 'click', handlers.exportAll);
  addListener(getElement(container, 'ppc-export-current'), 'click', handlers.exportCurrent);
  addListener(getElement(container, 'ppc-export-negative'), 'click', handlers.exportWaste);
  addListener(getElement(container, 'ppc-export-harvest'), 'click', handlers.exportGrowth);
  addListener(getElement(container, 'ppc-copy-summary'), 'click', () => {
    void handlers.copySummary();
  });
  addListener(getInput(container, 'ppc-action-search'), 'input', handlers.handleActionSearch);
  addListener(
    getInput(container, 'ppc-action-search'),
    'keydown',
    handlers.handleActionSearchKeydown
  );
  addListener(
    getElement(container, 'ppc-action-search-clear'),
    'click',
    handlers.clearActionSearch
  );
  addListener(getElement(container, 'ppc-filter-buttons'), 'click', event => {
    const target =
      event.target instanceof Element ? event.target.closest<HTMLElement>('.ppc-filter-btn') : null;
    if (target) handlers.setFilter(target);
  });

  getThresholdInputs(container).forEach(input => {
    addListener(input, 'change', handlers.handleThresholdChange);
  });

  getAnalysisSettingInputs(container).forEach(input => {
    addListener(input, 'change', handlers.handleAnalysisSettingsChange);
  });

  addListener(getInput(container, 'ppc-action-owner'), 'input', () =>
    saveActionOwner(readActionOwner(container))
  );
}
