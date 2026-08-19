import { ValidationError } from '@/common/errors/AppError';
import { showToast } from '@/common/ui/notifications';

import { xlsxArrayBufferToDelimitedText } from './xlsx';
import { setPasteInputError } from '../analysis/analysisInput';
import { MAX_IMPORT_FILE_SIZE_BYTES } from '../analysis/reportLimits';
import { getInput, getTextarea, setText } from '../ui/dom';
import { setPpcSearchTermsStatus } from '../ui/reportControls';

export interface ReportImportCallbacks {
  prepareReport(container: HTMLElement, text: string): void;
  formatFileSize(bytes: number): string;
}

const SAMPLE_REPORT = `Campaign Name,Ad Group Name,Customer Search Term,Keyword,Match Type,Impressions,Clicks,Spend,7 Day Total Sales,7 Day Total Orders (#)
DE_Auto_Core,Auto Group,winter dog coat,dog coat,broad,6200,31,42.80,0,0
DE_Auto_Core,Auto Group,waterproof dog jacket,dog coat,broad,4100,45,54.20,210.50,6
DE_Manual_Exact,Core Exact,reflective dog coat,reflective dog coat,exact,1800,24,28.30,135.90,4
DE_Manual_Broad,Explore,cheap dog sweater,dog sweater,broad,2600,18,21.40,18.99,1
DE_Manual_Broad,Explore,dog rain jacket,dog coat,broad,5200,37,39.60,156.00,5
DE_Auto_Core,Close Match,cat winter coat,dog coat,broad,1900,14,18.20,0,0
DE_Manual_Phrase,Competitor,brandname dog coat,dog coat,phrase,1200,9,13.40,0,0
DE_Manual_Broad,Explore,small dog warm coat,dog coat,broad,3400,28,31.90,92.00,3
DE_Auto_Core,Substitutes,pet rain poncho,dog coat,broad,900,5,5.80,0,0
DE_Manual_Exact,Core Exact,dog jacket waterproof winter,dog jacket,exact,2100,35,43.50,260.00,8`;

export async function handleReportFileImport(
  container: HTMLElement,
  callbacks: ReportImportCallbacks
): Promise<void> {
  const input = getInput(container, 'ppc-search-terms-file-input');
  const file = input?.files?.[0];
  if (!file) return;

  try {
    const text = await readReportFile(file, callbacks);
    const textarea = getTextarea(container, 'ppc-search-terms-paste-input');
    if (textarea) textarea.value = text;
    input.removeAttribute('aria-invalid');
    setPasteInputError(container, '');
    callbacks.prepareReport(container, text);
    setText(container, 'ppc-search-terms-file-name', `已选择：${file.name}`);
    setPpcSearchTermsStatus(container, '报表已导入，请确认报表类型和阈值后点击“分析当前数据”。');
  } catch (error) {
    const message = error instanceof Error ? error.message : '文件读取失败';
    input.setAttribute('aria-invalid', 'true');
    setPpcSearchTermsStatus(container, `文件读取失败：${message}`, 'error');
    showToast('文件读取失败', { type: 'error', description: message });
  }
}

export function loadSampleReport(container: HTMLElement, callbacks: ReportImportCallbacks): void {
  const textarea = getTextarea(container, 'ppc-search-terms-paste-input');
  if (textarea) textarea.value = SAMPLE_REPORT;
  setPasteInputError(container, '');
  callbacks.prepareReport(container, SAMPLE_REPORT);
  setText(container, 'ppc-search-terms-file-name', '已加载样例数据');
  setPpcSearchTermsStatus(container, '样例数据已加载，请点击“分析当前数据”开始分析。');
}

async function readReportFile(file: File, callbacks: ReportImportCallbacks): Promise<string> {
  if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
    throw new ValidationError(
      `报表文件超过 ${callbacks.formatFileSize(MAX_IMPORT_FILE_SIZE_BYTES)}，请拆分后再导入`,
      'PPC_IMPORT_004',
      'fileSize',
      file.size,
      { module: 'ppc_search_terms', action: 'readReportFile' }
    );
  }

  if (isXlsxFile(file)) {
    return xlsxArrayBufferToDelimitedText(await file.arrayBuffer());
  }

  return file.text();
}

function isXlsxFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith('.xlsx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}
