import BaseModule from '@/common/BaseModule';
import { createSearchBox, type SearchBoxHandle } from '@/common/components/SearchBox';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { showToast } from '@/common/ui/notifications';
import { openFilePicker } from '@/common/utils/filePicker';

import { createActionListState } from './actions/actionListState';
import {
  analyzeReportText,
  cancelActiveAnalysis,
  type AnalysisFlowCallbacks,
} from './analysis/analysisFlow';
import { setPasteInputError } from './analysis/analysisInput';
import { inferReportTypeFromText } from './analysis/reportTypeInference';
import {
  consumePpcActionListResume,
  type PpcActionListSnapshot,
} from './export/actionListSnapshotService';
import {
  copyActionSummary,
  exportActionRows,
  type ExportControllerState,
} from './export/exportController';
import {
  handleReportFileImport,
  loadSampleReport,
  type ReportImportCallbacks,
} from './import/fileImport';
import { renderPpcResumeReviewBanner } from './resumeReviewBanner';
import { updateContextFieldsVisibility } from './settings/analysisSettingsPanel';
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
import { initializeThresholdPanel, toggleThresholdPanel } from './settings/thresholdPanel';
import { getInput, getTextarea, setAnalyzeButtonState, setText } from './ui/dom';
import { bindPpcSearchTermsEvents } from './ui/eventBindings';
import { createListenerRegistry } from './ui/listenerRegistry';
import { renderMappingStatus, setPpcSearchTermsStatus } from './ui/reportControls';
import { getGrowthExportFilter, getWasteExportFilter } from './utils/filters';

import type { AnalysisStatusTone } from './analysis/analysisFlowTypes';
import type { ColumnMapping } from './columns/columns';
import type { AnalyzedRow, ReportType } from './types';

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
let activeResumeSnapshot: PpcActionListSnapshot | null = null;
const listenerRegistry = createListenerRegistry();
let actionSearchHandle: SearchBoxHandle | null = null;

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
    const container = this.container;
    if (!container) return;
    const mountSignal = this.getAbortSignal();

    activeContainer = container;
    const resumeSnapshot = consumePpcActionListResume();
    if (resumeSnapshot) {
      restorePpcActionListSnapshot(resumeSnapshot);
    } else if (!retainAnalyzerState) {
      resetAnalyzerState();
    }
    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/app_center/views/ppc_tools/ppc_search_terms/template.html'
    );
    if (!this.isCurrentMount(mountSignal)) return;

    const renderer = SafeRenderer.getInstance();
    renderer.renderTemplate(container, html);
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
    if (activeResumeSnapshot) {
      const ownerInput = getInput(this.container, 'ppc-search-terms-action-owner');
      if (ownerInput) ownerInput.value = activeResumeSnapshot.owner;
    }
    bindEvents(this.container);
    initActionSearchBox(this.container);
    restoreAnalyzerView(this.container);
    if (activeResumeSnapshot) {
      renderPpcResumeReviewBanner(this.container, activeResumeSnapshot);
    }
  }

  protected onUnmount(): void {
    if (isAnalyzing) {
      retainAnalyzerState = true;
    }
    if (activeContainer === this.container) {
      activeContainer = null;
    }
    listenerRegistry.clear();
    actionSearchHandle?.destroy();
    actionSearchHandle = null;
  }
}
const ppcSearchTermsModule = new PpcSearchTermsModule();

export const mount = (container: HTMLElement): Promise<void> =>
  ppcSearchTermsModule.mount(container);
export const unmount = (): void => {
  ppcSearchTermsModule.unmount();
};

function initActionSearchBox(container: HTMLElement): void {
  actionSearchHandle?.destroy();
  actionSearchHandle = null;

  const mountPoint = container.querySelector<HTMLElement>('[data-sops-searchbox="ppc-action"]');
  if (!mountPoint) return;

  actionSearchHandle = createSearchBox({
    placeholder: '搜索词 / 活动 / 店铺 / 原因',
    ariaLabel: '搜索动作清单',
    inputId: 'ppc-search-terms-action-search',
    hideResultsWhenEmpty: true,
    onFilter: query => actionListState.applySearchQuery(container, query),
  });
  actionSearchHandle.mount(mountPoint);
}

function bindEvents(container: HTMLElement): void {
  bindPpcSearchTermsEvents(container, listenerRegistry.add, {
    openReportPicker: () => {
      if (!openFilePicker(getInput(container, 'ppc-search-terms-file-input'))) {
        showToast('无法打开文件选择器', {
          type: 'error',
          description: '请刷新页面后重试，或直接粘贴报表内容。',
        });
      }
    },
    importReport: () => handleReportFileImport(container, reportImportCallbacks),
    analyzeTextarea: () => analyzeTextarea(container),
    loadSample: () => loadSampleReport(container, reportImportCallbacks),
    clearAnalyzer: () => clearAnalyzer(container),
    toggleThresholdPanel: () => toggleThresholdPanel(container),
    handleReportSelectionChange: () => handleReportSelectionChange(container),
    exportAll: () => void exportActionRows(container, 'all', false, exportControllerState),
    exportCurrent: () =>
      void exportActionRows(container, actionListState.getFilter(), true, exportControllerState),
    exportWaste: () =>
      void exportActionRows(
        container,
        getWasteExportFilter(activeReportType),
        false,
        exportControllerState
      ),
    exportGrowth: () =>
      void exportActionRows(
        container,
        getGrowthExportFilter(activeReportType),
        false,
        exportControllerState
      ),
    copySummary: () => copyActionSummary(container, exportControllerState),
    setFilter: button => actionListState.setFilterFromButton(container, button),
    handleThresholdChange: () => handleThresholdChange(container),
    handleAnalysisSettingsChange: () => handleAnalysisSettingsChange(container),
  });
}

async function analyzeTextarea(container: HTMLElement): Promise<void> {
  const text = getTextarea(container, 'ppc-search-terms-paste-input')?.value || '';
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
  const textarea = getTextarea(container, 'ppc-search-terms-paste-input');
  if (textarea) textarea.value = '';
  const fileInput = getInput(container, 'ppc-search-terms-file-input');
  if (fileInput) {
    fileInput.value = '';
    fileInput.removeAttribute('aria-invalid');
  }
  setPasteInputError(container, '');
  actionListState.resetControls(container);
  setText(container, 'ppc-search-terms-file-name', '支持 CSV、TSV、XLSX 或直接粘贴表格内容。');
  setPpcSearchTermsStatus(container, '');
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
  const textarea = getTextarea(container, 'ppc-search-terms-paste-input');
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
    setPpcSearchTermsStatus(container, statusSnapshot.message, statusSnapshot.tone);
  } else {
    setPpcSearchTermsStatus(container, '');
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
  if (target) setPpcSearchTermsStatus(target, message, tone);
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
  activeResumeSnapshot = null;
  actionListState.reset();
}

function restorePpcActionListSnapshot(snapshot: PpcActionListSnapshot): void {
  sourceText = '';
  analyzedRows = snapshot.rows.map(row => ({ ...row }));
  activeReportType = snapshot.reportType;
  isAnalyzing = false;
  retainAnalyzerState = true;
  activeResumeSnapshot = snapshot;
  mappingStatusSnapshot = null;
  statusSnapshot = {
    message: `已恢复 ${snapshot.rows.length} 条本地 PPC 建议，请人工确认后再处理广告。`,
    tone: 'status',
  };
  actionListState.reset();
}
