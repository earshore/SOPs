import { getElement, getInput } from './dom';
import {
  getAnalysisSettingInputs,
  getThresholdInputs,
  readActionOwner,
  saveActionOwner,
} from '../settings/settings';

export type AddListener = (
  element: EventTarget | null,
  type: string,
  handler: EventListenerOrEventListenerObject
) => void;

export interface PpcSearchTermsEventHandlers {
  openReportPicker(): void;
  importReport(): void;
  analyzeTextarea(): Promise<void>;
  loadSample(): void;
  clearAnalyzer(): void;
  toggleThresholdPanel(): void;
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

export function bindPpcSearchTermsEvents(
  container: HTMLElement,
  addListener: AddListener,
  handlers: PpcSearchTermsEventHandlers
): void {
  addListener(
    getElement(container, 'ppc-search-terms-file-trigger'),
    'click',
    handlers.openReportPicker
  );
  addListener(
    getElement(container, 'ppc-search-terms-file-input'),
    'change',
    handlers.importReport
  );
  addListener(getElement(container, 'ppc-search-terms-btn-parse'), 'click', () => {
    void handlers.analyzeTextarea();
  });
  addListener(getElement(container, 'ppc-search-terms-btn-sample'), 'click', handlers.loadSample);
  addListener(getElement(container, 'ppc-search-terms-btn-clear'), 'click', handlers.clearAnalyzer);
  addListener(
    getElement(container, 'ppc-search-terms-threshold-toggle'),
    'click',
    handlers.toggleThresholdPanel
  );
  addListener(
    getElement(container, 'ppc-search-terms-report-type'),
    'change',
    handlers.handleReportSelectionChange
  );
  addListener(getElement(container, 'ppc-search-terms-export-all'), 'click', handlers.exportAll);
  addListener(
    getElement(container, 'ppc-search-terms-export-current'),
    'click',
    handlers.exportCurrent
  );
  addListener(
    getElement(container, 'ppc-search-terms-export-negative'),
    'click',
    handlers.exportWaste
  );
  addListener(
    getElement(container, 'ppc-search-terms-export-harvest'),
    'click',
    handlers.exportGrowth
  );
  addListener(getElement(container, 'ppc-search-terms-copy-summary'), 'click', () => {
    void handlers.copySummary();
  });
  addListener(
    getInput(container, 'ppc-search-terms-action-search'),
    'input',
    handlers.handleActionSearch
  );
  addListener(
    getInput(container, 'ppc-search-terms-action-search'),
    'keydown',
    handlers.handleActionSearchKeydown
  );
  addListener(
    getElement(container, 'ppc-search-terms-action-search-clear'),
    'click',
    handlers.clearActionSearch
  );
  addListener(getElement(container, 'ppc-search-terms-filter-buttons'), 'click', event => {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('.category-filter-btn')
        : null;
    if (target) handlers.setFilter(target);
  });

  getThresholdInputs(container).forEach(input => {
    addListener(input, 'change', handlers.handleThresholdChange);
  });

  getAnalysisSettingInputs(container).forEach(input => {
    addListener(input, 'change', handlers.handleAnalysisSettingsChange);
  });

  addListener(getInput(container, 'ppc-search-terms-action-owner'), 'input', () =>
    saveActionOwner(readActionOwner(container))
  );
}
