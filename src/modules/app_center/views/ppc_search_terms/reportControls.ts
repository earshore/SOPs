import { REPORT_LABELS } from './actionMetadata';
import type { ColumnMapping } from './columns';
import { getTextarea, setButtonContent, setText } from './dom';
import type { FilterType } from './filters';
import { renderFilterButtons } from './resultsRenderer';
import type { ReportType } from './types';

export function updateReportControls(
  container: HTMLElement,
  reportType: ReportType,
  activeFilter: FilterType
): FilterType {
  const nextFilter = renderFilterButtons(container, reportType, activeFilter);
  setText(container, 'ppc-object-header', reportType === 'erp_campaign' ? '广告活动' : '搜索词');
  setText(
    container,
    'ppc-stat-rows-label',
    reportType === 'erp_campaign' ? '广告活动' : '搜索词行'
  );

  const textarea = getTextarea(container, 'ppc-paste-input');
  if (textarea) {
    textarea.placeholder = getReportPlaceholder(reportType);
  }

  if (reportType === 'erp_campaign') {
    setButtonContent(container, 'ppc-export-negative', 'fas fa-pause', '导出停投/降预算');
    setButtonContent(container, 'ppc-export-harvest', 'fas fa-arrow-trend-up', '导出加预算');
    return nextFilter;
  }

  setButtonContent(container, 'ppc-export-negative', 'fas fa-ban', '导出否词');
  setButtonContent(container, 'ppc-export-harvest', 'fas fa-bullseye', '导出加词');
  return nextFilter;
}

export function renderMappingStatus(
  container: HTMLElement,
  mapping: ColumnMapping,
  totalRows: number,
  validRows: number,
  status = ''
): void {
  const fields = Object.values(mapping.found).filter(Boolean);
  const statusText = status ? ` ${status}` : '';
  setText(
    container,
    'ppc-mapping-status',
    `已识别为${REPORT_LABELS[mapping.reportType]}，匹配 ${fields.length} 个字段，原始 ${totalRows} 行，有效 ${validRows} 行。${statusText}`
  );
}

function getReportPlaceholder(reportType: ReportType): string {
  if (reportType === 'erp_campaign') {
    return '也可以直接粘贴 ERP 广告活动报表内容，首行需要包含列名。';
  }

  if (reportType === 'erp_search_term') {
    return '也可以直接粘贴 ERP 广告搜索词报表内容，首行需要包含列名。';
  }

  return '也可以直接粘贴 Search Term 报表内容，首行需要包含列名。';
}
