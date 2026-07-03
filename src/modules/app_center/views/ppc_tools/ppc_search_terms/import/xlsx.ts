import { unzipSync } from 'fflate';
import { assertReportRowLimit } from '../analysis/reportLimits';
import { getFirstWorksheetPath, parseSharedStrings } from './xlsxWorkbook';
import { parseWorksheetRows, rowsToDelimitedText } from './xlsxRows';
import { getZipText } from './xlsxXml';

export async function xlsxArrayBufferToDelimitedText(buffer: ArrayBuffer): Promise<string> {
  const files = unzipSync(new Uint8Array(buffer));
  const sheetPath = getFirstWorksheetPath(files);
  const sheetXml = getZipText(files, sheetPath);
  if (!sheetXml) {
    throw new Error('XLSX 工作表读取失败');
  }

  const sharedStrings = parseSharedStrings(files);
  const rows = parseWorksheetRows(sheetXml, sharedStrings);
  assertReportRowLimit(rows.length - 1);
  const text = rowsToDelimitedText(rows);
  if (!text.trim()) {
    throw new Error('XLSX 工作表为空');
  }

  return text;
}
