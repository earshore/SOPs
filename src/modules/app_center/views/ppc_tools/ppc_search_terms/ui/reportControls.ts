import { getElement, getTextarea, setButtonContent, setText } from './dom';
import { REPORT_LABELS } from '../actions/actionMetadata';
import { renderFilterButtons } from '../results/resultsRenderer';

import type { ColumnMapping } from '../columns/columns';
import type { ReportType } from '../types';
import type { FilterType } from '../utils/filters';

export function updateReportControls(
  container: HTMLElement,
  reportType: ReportType,
  activeFilter: FilterType
): FilterType {
  const nextFilter = renderFilterButtons(container, reportType, activeFilter);
  setText(
    container,
    'ppc-search-terms-object-header',
    reportType === 'erp_campaign' ? '广告活动' : '搜索词'
  );
  setText(
    container,
    'ppc-search-terms-stat-rows-label',
    reportType === 'erp_campaign' ? '广告活动' : '搜索词行'
  );

  const textarea = getTextarea(container, 'ppc-search-terms-paste-input');
  if (textarea) {
    textarea.placeholder = getReportPlaceholder(reportType);
  }

  if (reportType === 'erp_campaign') {
    setButtonContent(
      container,
      'ppc-search-terms-export-negative',
      'fas fa-pause',
      '导出停投/降预算'
    );
    setButtonContent(
      container,
      'ppc-search-terms-export-harvest',
      'fas fa-arrow-trend-up',
      '导出加预算'
    );
    return nextFilter;
  }

  setButtonContent(container, 'ppc-search-terms-export-negative', 'fas fa-ban', '导出否词');
  setButtonContent(container, 'ppc-search-terms-export-harvest', 'fas fa-bullseye', '导出加词');
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
  setPpcSearchTermsStatus(
    container,
    `已识别为${REPORT_LABELS[mapping.reportType]}，匹配 ${fields.length} 个字段，原始 ${totalRows} 行，有效 ${validRows} 行。${statusText}`
  );
}

export function setPpcSearchTermsStatus(
  container: HTMLElement,
  message: string,
  tone: 'status' | 'error' = 'status'
): void {
  const element = getElement(container, 'ppc-search-terms-mapping-status');
  if (!element) return;

  const normalizedMessage = message.trim();
  element.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  element.setAttribute('aria-live', tone === 'error' ? 'assertive' : 'polite');
  element.setAttribute('aria-atomic', 'true');
  element.classList.toggle('ppc-search-terms-status-line--empty', !normalizedMessage);
  element.classList.toggle('ppc-search-terms-status-line--error', tone === 'error');

  if (!normalizedMessage) {
    element.removeAttribute('aria-label');
    element.replaceChildren();
    return;
  }

  const titleText = tone === 'error' ? '处理失败' : '数据状态提示';
  element.setAttribute('aria-label', `${titleText}：${normalizedMessage}`);

  const iconWrapper = document.createElement('span');
  iconWrapper.className = 'ppc-search-terms-status-line-icon';
  const icon = document.createElement('i');
  icon.className = tone === 'error' ? 'fas fa-triangle-exclamation' : 'fas fa-circle-info';
  icon.setAttribute('aria-hidden', 'true');
  iconWrapper.append(icon);

  const copy = document.createElement('span');
  copy.className = 'ppc-search-terms-status-line-copy';

  const title = document.createElement('span');
  title.className = 'ppc-search-terms-status-line-title';
  title.textContent = titleText;

  const body = document.createElement('span');
  body.className = 'ppc-search-terms-status-line-message';
  body.textContent = normalizedMessage;

  copy.append(title, body);
  element.replaceChildren(iconWrapper, copy);
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
