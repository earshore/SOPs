import { summarize } from './summary';
import {
  buildReviewActionLines,
  buildSpendSummaryLine,
  buildTopEvidenceLines,
  countHumanReviewRows,
} from './summaryTextLines';
import { DEFAULT_ACTION_OWNER, normalizeActionOwner } from '../actions/actionItems';
import { today } from '../utils/formatters';

import type { ActionType, AnalyzedRow } from '../types';

export function buildSummaryText(rows: AnalyzedRow[], owner = DEFAULT_ACTION_OWNER): string {
  const actionOwner = normalizeActionOwner(owner);
  if (rows[0]?.reportType === 'erp_campaign') {
    return buildCampaignSummaryText(rows, actionOwner);
  }

  const summary = summarize(rows);
  const count = (type: ActionType) => rows.filter(row => row.action === type).length;
  const reviewCount = countHumanReviewRows(rows);
  const title =
    rows[0]?.reportType === 'erp_search_term' ? 'ERP 广告搜索词周复盘' : 'PPC 搜索词周复盘';
  return [
    `# ${title} ${today()}`,
    '',
    '## 复盘结论',
    `- 搜索词行数：${summary.rowCount}`,
    buildSpendSummaryLine(summary),
    `- 动作计数：否精准：${count('negative_exact')}，加精准：${count('harvest_exact')}，加预算：${count('scale_budget')}，降竞价：${count('bid_down')}，进词池：${count('listing_term')}`,
    `- 人工复核：${reviewCount} 项建议动作需人工执行；观察项不自动执行。`,
    `- 建议动作 Owner：${actionOwner}`,
    '',
    '## 关键证据',
    ...buildTopEvidenceLines(rows),
    '',
    '## 建议动作（人工执行）',
    ...buildReviewActionLines(rows, actionOwner),
    '',
    '## 下周跟进',
    '- [ ] 完成高风险动作的人工作业记录。',
    '- [ ] 复查本周否词/加词/调预算后的花费、订单和 ACOS 变化。',
    '',
    '## 复盘记录',
    '- 复盘人：',
    '- 复盘时间：',
    `- 下次动作负责人：${actionOwner}`,
  ].join('\n');
}

function buildCampaignSummaryText(rows: AnalyzedRow[], owner: string): string {
  const summary = summarize(rows);
  const count = (type: ActionType) => rows.filter(row => row.action === type).length;
  const reviewCount = countHumanReviewRows(rows);
  return [
    `# PPC 广告活动周复盘 ${today()}`,
    '',
    '## 复盘结论',
    `- 广告活动数：${summary.rowCount}`,
    buildSpendSummaryLine(summary),
    `- 动作计数：处理状态：${count('campaign_fix_status')}，暂停/降预算：${count('campaign_pause')}，活动加预算：${count('campaign_scale')}，控价降竞价：${count('campaign_bid_down')}，结构复盘：${count('campaign_structure')}`,
    `- 人工复核：${reviewCount} 项建议动作需人工执行；观察项不自动执行。`,
    `- 建议动作 Owner：${owner}`,
    '',
    '## 关键证据',
    ...buildTopEvidenceLines(rows),
    '',
    '## 建议动作（人工执行）',
    ...buildReviewActionLines(rows, owner),
    '',
    '## 下周跟进',
    '- [ ] 完成高风险活动调整的人工作业记录。',
    '- [ ] 复查本周状态处理、预算调整和结构复盘后的花费、订单和 ACOS 变化。',
    '',
    '## 复盘记录',
    '- 复盘人：',
    '- 复盘时间：',
    `- 下次动作负责人：${owner}`,
  ].join('\n');
}
