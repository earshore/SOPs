import { showToast } from '@/common/ui/notifications';

import { isSearchTermReportType } from '../columns/columns';

import type { AnalysisResult } from '../analysis/analysisEngine';
import type { AnalysisSettings } from '../settings/settings';
import type { ReportType } from '../types';

export function finishLocalAnalysisIfNeeded(
  result: AnalysisResult,
  settings: AnalysisSettings
): boolean {
  if (result.reportType === 'erp_campaign') {
    showToast('ERP 广告活动分析完成', {
      type: 'success',
      description: `已识别 ${result.validRows} 个广告活动`,
    });
    return true;
  }

  if (!settings.useAgent) {
    showToast('PPC 本地分析完成', {
      type: 'success',
      description: `已识别 ${result.validRows} 行搜索词`,
    });
    return true;
  }

  return false;
}

export function getLocalAnalysisStatus(reportType: ReportType, useAgent = false): string {
  if (!isSearchTermReportType(reportType)) {
    return '活动级规则分析完成';
  }

  return useAgent
    ? '本地工具已生成初判，PPC Agent 正在复核候选...'
    : '本地规则分析完成，未启用 Agent 复核';
}
