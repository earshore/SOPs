import { unzipSync } from 'fflate';

import { ValidationError } from '@/common/errors/AppError';

import { parseWorksheetRows, rowsToDelimitedText } from './xlsxRows';
import { getFirstWorksheetPath, parseSharedStrings } from './xlsxWorkbook';
import { getZipText } from './xlsxXml';
import { assertReportRowLimit } from '../analysis/reportLimits';

export async function xlsxArrayBufferToDelimitedText(buffer: ArrayBuffer): Promise<string> {
  const files = unzipSync(new Uint8Array(buffer));
  const sheetPath = getFirstWorksheetPath(files);
  const sheetXml = getZipText(files, sheetPath);
  if (!sheetXml) {
    throw new ValidationError('XLSX 工作表读取失败', 'PPC_XLSX_005', 'sheetPath', sheetPath, {
      module: 'ppc_search_terms',
      action: 'xlsxArrayBufferToDelimitedText',
    });
  }

  const sharedStrings = parseSharedStrings(files);
  const rows = parseWorksheetRows(sheetXml, sharedStrings);
  assertReportRowLimit(rows.length - 1);
  const text = rowsToDelimitedText(rows);
  if (!text.trim()) {
    throw new ValidationError('XLSX 工作表为空', 'PPC_XLSX_006', 'sheetPath', sheetPath, {
      module: 'ppc_search_terms',
      action: 'xlsxArrayBufferToDelimitedText',
    });
  }

  return text;
}
