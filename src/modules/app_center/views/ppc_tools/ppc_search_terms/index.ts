import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import BaseModule from '@/common/BaseModule';
import {
  analyzeReportText,
  cancelActiveAnalysis,
  type AnalysisFlowCallbacks,
} from './analysis/analysisFlow';
import { setPasteInputError } from './analysis/analysisInput';
import { updateContextFieldsVisibility } from './settings/analysisSettingsPanel';
import {
  handleReportFileImport,
  loadSampleReport,
  type ReportImportCallbacks,
} from './import/fileImport';
import {
  copyActionSummary,
  exportActionRows,
  type ExportControllerState,
} from './export/exportController';
import { getGrowthExportFilter, getWasteExportFilter } from './utils/filters';
import { getInput, getTextarea, setAnalyzeButtonState, setText } from './ui/dom';
import { bindPpcEvents } from './ui/eventBindings';
import { renderMappingStatus, setPpcStatus } from './ui/reportControls';
import { inferReportTypeFromText } from './analysis/reportTypeInference';
import { createListenerRegistry } from './ui/listenerRegistry';
import { initializeThresholdPanel, toggleThresholdPanel } from './settings/thresholdPanel';
import {
  readAnalysisSettings,
  readReportSelection,
  readThresholds,
  renderThresholdFields,
  restoreActionOwner,
  restoreAnalysisSettings,
  restoreReportSelection,
  restoreThresholds,
  saveAnalysisSettings,
  saveReportSelection,
  saveThresholds,
} from './settings/settings';
import { createActionListState } from './actions/actionListState';
import type { AnalyzedRow, ReportType } from './types';
import type { ColumnMapping } from './columns/columns';
import type { AnalysisStatusTone } from './analysis/analysisFlowTypes';

import '../style.css';

export type { ActionType, AnalyzedRow, Thresholds } from './types';
export { analyzeReport, analyzeSearchTermReport } from './analysis/analysisEngine';
export type { AnalysisResult } from './analysis/analysisEngine';
export { parseReport } from './import/delimitedReport';
export { buildActionCsv, buildSummaryText } from './export/exporters';
export { xlsxArrayBufferToDelimitedText } from './import/xlsx';

let analyzedRows: AnalyzedRow[] = [];
let sourceText = '';
let activeReportType: ReportType = 'search_term';
let isAnalyzing = false;
let retainAnalyzerState = false;
let activeContainer: HTMLElement | null = null;
const listenerRegistry = createListenerRegistry();

interface StatusSnapshot {
  message: string;
  tone: AnalysisStatusTone;
}

interface MappingStatusSnapshot {
  mapping: ColumnMapping;
  totalRows: number;
  validRows: number;
  status: string;
}

let statusSnapshot: StatusSnapshot | null = null;
let mappingStatusSnapshot: MappingStatusSnapshot | null = null;

const actionListState = createActionListState({
  getRows: () => analyzedRows,
  getReportType: () => activeReportType,
});

const analysisFlowCallbacks: AnalysisFlowCallbacks = {
  setSourceText: text => {
    sourceText = text;
  },
  setAnalyzedRows: rows => {
    analyzedRows = rows;
  },
  setActiveReportType: reportType => {
    activeReportType = reportType;
  },
  setAnalyzing: nextIsAnalyzing => {
    setAnalyzerAnalyzing(nextIsAnalyzing);
  },
  setStatus: (container, message, tone = 'status') => {
    setAnalyzerStatus(container, message, tone);
  },
  renderMappingStatus: (container, mapping, totalRows, validRows, status = '') => {
    setAnalyzerMappingStatus(container, mapping, totalRows, validRows, status);
  },
  resetResultControls: container => {
    const target = getRenderContainer(container);
    if (target) actionListState.resetControls(target);
  },
  renderResults: (container, rows) => {
    const target = getRenderContainer(container);
    if (target) actionListState.render(target, rows);
  },
  hasAnalyzedRows: () => analyzedRows.length > 0,
  formatFileSize,
};

const reportImportCallbacks: ReportImportCallbacks = {
  prepareReport: (container, text) => {
    prepareImportedReport(container, text);
  },
  formatFileSize,
};

const exportControllerState: ExportControllerState = {
  getRows: () => analyzedRows,
  getReportType: () => activeReportType,
  getSearchQuery: () => actionListState.getSearchQuery(),
};

class PpcSearchTermsModule extends BaseModule {
  constructor() {
    super('ppc_search_terms');
  }

  protected async render(): Promise<void> {
    if (!this.container) return;

    activeContainer = this.container;
    if (!retainAnalyzerState) {
      resetAnalyzerState();
    }
    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/app_center/views/ppc_tools/ppc_search_terms/template.html'
    );
    const renderer = SafeRenderer.getInstance();
    renderer.renderTemplate(this.container, html);
  }

  protected async init(): Promise<void> {
    if (!this.container) return;

    renderThresholdFields(this.container);
    restoreThresholds(this.container);
    initializeThresholdPanel(this.container);
    const restoredSelection = restoreReportSelection(this.container);
    if (!retainAnalyzerState) {
      activeReportType = restoredSelection === 'auto' ? 'search_term' : restoredSelection;
    }
    restoreAnalysisSettings(this.container);
    updateContextFieldsVisibility(this.container);
    restoreActionOwner(this.container);
    bindEvents(this.container);
    restoreAnalyzerView(this.container);
  }

  protected onUnmount(): void {
    if (isAnalyzing) {
      retainAnalyzerState = true;
    }
    if (activeContainer === this.container) {
      activeContainer = null;
    }
    listenerRegistry.clear();
  }
}

const ppcSearchTermsModule = new PpcSearchTermsModule();

export const mount = (container: HTMLElement): Promise<void> =>
  ppcSearchTermsModule.mount(container);
export const unmount = (): void => {
  ppcSearchTermsModule.unmount();
};

function bindEvents(container: HTMLElement): void {
  bindPpcEvents(container, listenerRegistry.add, {
    importReport: () => handleReportFileImport(container, reportImportCallbacks),
    analyzeTextarea: () => analyzeTextarea(container),
    loadSample: () => loadSampleReport(container, reportImportCallbacks),
    clearAnalyzer: () => clearAnalyzer(container),
    toggleThresholdPanel: () => toggleThresholdPanel(container),
    handleReportSelectionChange: () => handleReportSelectionChange(container),
    exportAll: () => exportActionRows(container, 'all', false, exportControllerState),
    exportCurrent: () =>
      exportActionRows(container, actionListState.getFilter(), true, exportControllerState),
    exportWaste: () =>
      exportActionRows(
        container,
        getWasteExportFilter(activeReportType),
        false,
        exportControllerState
      ),
    exportGrowth: () =>
      exportActionRows(
        container,
        getGrowthExportFilter(activeReportType),
        false,
        exportControllerState
      ),
    copySummary: () => copyActionSummary(container, exportControllerState),
    handleActionSearch: () => actionListState.handleSearch(container),
    handleActionSearchKeydown: event => actionListState.handleSearchKeydown(container, event),
    clearActionSearch: () => actionListState.clearSearch(container),
    setFilter: button => actionListState.setFilterFromButton(container, button),
    handleThresholdChange: () => handleThresholdChange(container),
    handleAnalysisSettingsChange: () => handleAnalysisSettingsChange(container),
  });
}

async function analyzeTextarea(container: HTMLElement): Promise<void> {
  const text = getTextarea(container, 'ppc-paste-input')?.value || '';
  await analyzeReportText(container, text, analysisFlowCallbacks);
}

function prepareImportedReport(container: HTMLElement, text: string): void {
  sourceText = text.trim();
  analyzedRows = [];
  activeReportType = inferReportTypeFromText(sourceText, readReportSelection(container));
  statusSnapshot = null;
  mappingStatusSnapshot = null;
  retainAnalyzerState = false;
  actionListState.resetControls(container);
  actionListState.render(container, []);
}

function clearAnalyzer(container: HTMLElement): void {
  cancelActiveAnalysis();
  resetAnalyzerState();
  setAnalyzeButtonState(container, false);
  const textarea = getTextarea(container, 'ppc-paste-input');
  if (textarea) textarea.value = '';
  const fileInput = getInput(container, 'ppc-file-input');
  if (fileInput) {
    fileInput.value = '';
    fileInput.removeAttribute('aria-invalid');
  }
  setPasteInputError(container, '');
  actionListState.resetControls(container);
  setText(container, 'ppc-file-name', '支持 CSV、TSV、XLSX 或直接粘贴表格内容。');
  setPpcStatus(container, '');
  actionListState.render(container, []);
}

function handleThresholdChange(container: HTMLElement): void {
  const thresholds = readThresholds(container);
  saveThresholds(thresholds);
  if (sourceText) {
    setAnalyzerStatus(container, '阈值已更新，请点击“分析当前数据”重新分析。');
  }
}

function handleReportSelectionChange(container: HTMLElement): void {
  const selection = readReportSelection(container);
  saveReportSelection(selection);
  activeReportType = selection === 'auto' ? inferCurrentReportType() : selection;
  analyzedRows = [];
  mappingStatusSnapshot = null;
  actionListState.resetControls(container);
  actionListState.render(container, []);

  if (sourceText) {
    setAnalyzerStatus(container, '报表类型已更新，请点击“分析当前数据”重新分析。');
  }
}

function inferCurrentReportType(): ReportType {
  return inferReportTypeFromText(sourceText, 'auto', activeReportType);
}

function handleAnalysisSettingsChange(container: HTMLElement): void {
  updateContextFieldsVisibility(container);
  saveAnalysisSettings(readAnalysisSettings(container));
}

function formatFileSize(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

function restoreAnalyzerView(container: HTMLElement): void {
  const textarea = getTextarea(container, 'ppc-paste-input');
  if (textarea && sourceText) {
    textarea.value = sourceText;
    setPasteInputError(container, '');
  }

  actionListState.syncReportControls(container);
  if (mappingStatusSnapshot) {
    renderMappingStatus(
      container,
      mappingStatusSnapshot.mapping,
      mappingStatusSnapshot.totalRows,
      mappingStatusSnapshot.validRows,
      mappingStatusSnapshot.status
    );
  } else if (statusSnapshot) {
    setPpcStatus(container, statusSnapshot.message, statusSnapshot.tone);
  } else {
    setPpcStatus(container, '');
  }

  setAnalyzeButtonState(container, isAnalyzing);
  actionListState.render(container, analyzedRows);
  if (!isAnalyzing) {
    retainAnalyzerState = false;
  }
}

function getRenderContainer(fallback?: HTMLElement | null): HTMLElement | null {
  if (activeContainer?.isConnected) {
    return activeContainer;
  }

  return fallback?.isConnected ? fallback : null;
}

function setAnalyzerAnalyzing(nextIsAnalyzing: boolean): void {
  isAnalyzing = nextIsAnalyzing;
  const container = getRenderContainer();
  if (container) {
    setAnalyzeButtonState(container, nextIsAnalyzing);
    if (!nextIsAnalyzing) {
      retainAnalyzerState = false;
    }
  }
}

function setAnalyzerStatus(
  container: HTMLElement,
  message: string,
  tone: AnalysisStatusTone = 'status'
): void {
  statusSnapshot = { message, tone };
  mappingStatusSnapshot = null;
  const target = getRenderContainer(container);
  if (target) setPpcStatus(target, message, tone);
}

function setAnalyzerMappingStatus(
  container: HTMLElement,
  mapping: ColumnMapping,
  totalRows: number,
  validRows: number,
  status = ''
): void {
  mappingStatusSnapshot = { mapping, totalRows, validRows, status };
  statusSnapshot = null;
  const target = getRenderContainer(container);
  if (target) renderMappingStatus(target, mapping, totalRows, validRows, status);
}

function resetAnalyzerState(): void {
  sourceText = '';
  analyzedRows = [];
  isAnalyzing = false;
  retainAnalyzerState = false;
  statusSnapshot = null;
  mappingStatusSnapshot = null;
  actionListState.reset();
}
