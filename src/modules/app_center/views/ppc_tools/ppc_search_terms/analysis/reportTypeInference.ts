import { resolveReportType } from '../columns/columns';
import { parseReport } from '../import/delimitedReport';

import type { ReportSelection, ReportType } from '../types';

export function inferReportTypeFromText(
  text: string,
  selection: ReportSelection,
  fallback: ReportType = 'search_term'
): ReportType {
  if (selection !== 'auto') return selection;
  if (!text) return fallback;

  try {
    return resolveReportType(parseReport(text).headers, 'auto');
  } catch {
    return fallback;
  }
}
