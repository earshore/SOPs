import { ValidationError } from '@/common/errors/AppError';

export const MAX_IMPORT_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_REPORT_DATA_CHARS = 20 * 1024 * 1024;
export const MAX_REPORT_ROWS = 20000;

export function assertReportRowLimit(rowCount: number): void {
  if (rowCount > MAX_REPORT_ROWS) {
    throw new ValidationError(
      `报表行数超过上限 ${MAX_REPORT_ROWS} 行，请拆分后再导入`,
      'PPC_IMPORT_001',
      'rowCount',
      rowCount,
      { module: 'ppc_search_terms', action: 'assertReportRowLimit' }
    );
  }
}
