import type {
  AppCenterArtifactEnvelope,
  AppCenterArtifactType,
  AppCenterWorkItem,
} from './artifactEnvelopeService';
import { getComplianceReviewView } from './complianceReviewState';

export interface RecentArtifactPresentation {
  typeLabel: string;
  primaryTitle: string;
  facts: string[];
  relativeTime: string;
  absoluteTime: string;
  isFresh: boolean;
}

/** Short type labels — shown once, not as a duplicated full title. */
export const RECENT_ARTIFACT_TYPE_LABELS: Record<AppCenterArtifactType, string> = {
  scrape_history: '采集',
  analysis_report: 'AI 分析',
  listing_prompt: 'Prompt',
  listing_copy: '产品文案',
  keyword_snapshot: '关键词',
  listing_review: '文案评审',
  ppc_action_list: 'PPC',
  compliance_check: '合规',
};

const WORK_ITEM_STATUS_LABELS: Record<AppCenterWorkItem['status'], string> = {
  draft: '尚未开始',
  in_progress: '进行中',
  review_required: '需人工复核',
  done: '已完成',
};

const PPC_FILTER_LABELS: Record<string, string> = {
  negative_exact: '否定关键词建议',
  harvest_exact: '收割精准词建议',
  scale_budget: '增加预算候选',
  bid_down: '降低竞价候选',
  listing_term: 'Listing 补词建议',
  campaign_fix_status: '广告活动状态修复',
  campaign_pause: '暂停活动候选',
  campaign_scale: '扩大投放候选',
  campaign_bid_down: '降低活动竞价候选',
  campaign_structure: '调整活动结构候选',
  observe: '继续观察',
};

const GENERIC_TITLE_NORMALIZED = new Set(
  [
    '采集历史',
    '采集',
    'ai分析',
    'ai分析报告',
    '分析报告',
    'listingprompt',
    'prompt',
    '产品文案',
    '文案',
    '关键词快照',
    '关键词',
    '文案评审',
    'ppc动作清单',
    'ppc',
    '合规复核',
    '合规',
  ].map(normalizeRecentText)
);

export function normalizeRecentText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

export function firstAsinOrSku(value: string | undefined): string {
  if (!value) return '';
  return value.split(',')[0]?.trim() || '';
}

function getAsinOrSkuCount(value: string | undefined): number {
  if (!value) return 0;
  return value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean).length;
}

export function formatWorkContext(workItem: AppCenterWorkItem | null | undefined): string {
  if (!workItem) return '';
  const marketplace = workItem.marketplace?.trim() || '';
  const asin = firstAsinOrSku(workItem.asinOrSku);
  const additionalCount = Math.max(0, getAsinOrSkuCount(workItem.asinOrSku) - 1);
  const asinLabel = additionalCount > 0 ? `${asin} +${additionalCount} ASIN` : asin;
  if (marketplace && asinLabel) return `${marketplace} · ${asinLabel}`;
  return asinLabel || marketplace;
}

export function isGenericArtifactTitle(title: string, typeLabel: string): boolean {
  const normalizedTitle = normalizeRecentText(title);
  const normalizedLabel = normalizeRecentText(typeLabel);
  if (!normalizedTitle) return true;
  if (normalizedTitle === normalizedLabel) return true;
  return GENERIC_TITLE_NORMALIZED.has(normalizedTitle);
}

export function formatRelativeTime(value: string, now = Date.now()): string {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  const diff = now - time;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))} 周前`;
  return `${Math.floor(diff / (30 * day))} 个月前`;
}

export function formatAbsoluteTime(value: string): string {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function pushUniqueFact(facts: string[], value: string, blocked: Set<string>): void {
  const trimmed = value.trim();
  if (!trimmed) return;
  const normalized = normalizeRecentText(trimmed);
  if (!normalized || blocked.has(normalized)) return;
  if (facts.some(fact => normalizeRecentText(fact) === normalized)) return;
  facts.push(trimmed);
  blocked.add(normalized);
}

function countAsins(workItem: AppCenterWorkItem | null | undefined): number {
  if (!workItem?.asinOrSku) return 0;
  return workItem.asinOrSku
    .split(',')
    .map(part => part.trim())
    .filter(Boolean).length;
}

function createFactBlockedSet(
  workItem: AppCenterWorkItem | null | undefined,
  typeLabel: string,
  primaryTitle: string
): Set<string> {
  const blocked = new Set(
    [typeLabel, primaryTitle, '站点', 'marketplace'].map(normalizeRecentText).filter(Boolean)
  );
  const marketplace = workItem?.marketplace?.trim() || '';
  const asin = firstAsinOrSku(workItem?.asinOrSku);

  if (marketplace) blocked.add(normalizeRecentText(marketplace));
  if (asin) blocked.add(normalizeRecentText(asin));
  if (marketplace && asin) {
    blocked.add(normalizeRecentText(`${marketplace} · ${asin}`));
    blocked.add(normalizeRecentText(`${marketplace} ${asin}`));
  }
  return blocked;
}

function pushSummaryParts(
  facts: string[],
  summary: string,
  blocked: Set<string>,
  options?: { skipHistoryBound?: boolean }
): void {
  summary
    .split('·')
    .map(part => part.trim())
    .filter(Boolean)
    .forEach(part => {
      if (options?.skipHistoryBound && part.includes('绑定当前采集历史')) return;
      pushUniqueFact(facts, part, blocked);
    });
}

function appendAsinCountFact(
  facts: string[],
  workItem: AppCenterWorkItem | null | undefined,
  blocked: Set<string>
): void {
  const asinCount = countAsins(workItem);
  if (asinCount > 0) pushUniqueFact(facts, `${asinCount} ASIN`, blocked);
}

function appendPpcFacts(
  facts: string[],
  meta: Record<string, string | number | boolean>,
  blocked: Set<string>
): void {
  if (typeof meta.rowCount === 'number') {
    pushUniqueFact(facts, `${meta.rowCount} 条建议动作`, blocked);
  }
  if (typeof meta.owner === 'string' && meta.owner.trim()) {
    pushUniqueFact(facts, `负责人：${meta.owner.trim()}`, blocked);
  }
  if (typeof meta.filter === 'string' && meta.filter && meta.filter !== 'all') {
    pushUniqueFact(facts, PPC_FILTER_LABELS[meta.filter] || meta.filter, blocked);
  }
}

function appendTypeSpecificFacts(
  facts: string[],
  artifact: AppCenterArtifactEnvelope,
  workItem: AppCenterWorkItem | null | undefined,
  blocked: Set<string>
): void {
  const meta = artifact.metadata || {};
  const handlers: Partial<Record<AppCenterArtifactType, () => void>> = {
    scrape_history: () => appendAsinCountFact(facts, workItem, blocked),
    analysis_report: () => {
      if (typeof meta.dimensionCount === 'number' && meta.dimensionCount > 0) {
        pushUniqueFact(facts, `${meta.dimensionCount}分析维度`, blocked);
      }
      if (
        typeof meta.overallConfidencePercent === 'number' &&
        Number.isFinite(meta.overallConfidencePercent)
      ) {
        pushUniqueFact(facts, `${Math.round(meta.overallConfidencePercent)}%总体置信度`, blocked);
      }
      if (typeof meta.model === 'string' && meta.model.trim()) {
        pushUniqueFact(facts, meta.model.trim(), blocked);
      }
      if (facts.length === 0) {
        pushSummaryParts(facts, artifact.summary, blocked, { skipHistoryBound: true });
      }
      if (facts.length === 0) pushUniqueFact(facts, '分析报告已生成', blocked);
    },
    listing_prompt: () => {
      if (typeof meta.strategy === 'string' && meta.strategy.trim()) {
        pushUniqueFact(facts, `生成策略：${meta.strategy.trim()}`, blocked);
      } else {
        pushSummaryParts(facts, artifact.summary, blocked);
      }
      if (facts.length === 0) pushUniqueFact(facts, '生成策略配置', blocked);
    },
    listing_copy: () => {
      if (typeof meta.keywordCount === 'number') {
        pushUniqueFact(facts, `${meta.keywordCount}个SEO关键词`, blocked);
      }
      if (typeof meta.model === 'string' && meta.model.trim()) {
        pushUniqueFact(facts, meta.model.trim(), blocked);
      }
      if (facts.length === 0) pushSummaryParts(facts, artifact.summary, blocked);
    },
    keyword_snapshot: () => {
      if (typeof meta.keywordCount === 'number') {
        pushUniqueFact(facts, `${meta.keywordCount}个关键词`, blocked);
      }
      if (typeof meta.matchedCount === 'number') {
        pushUniqueFact(facts, `${meta.matchedCount}个命中`, blocked);
      }
      if (typeof meta.unmatchedCount === 'number') {
        pushUniqueFact(facts, `${meta.unmatchedCount}个未命中`, blocked);
      }
      if (facts.length === 0) pushSummaryParts(facts, artifact.summary, blocked);
    },
    listing_review: () => {
      if (typeof meta.grade === 'string' && meta.grade.trim()) {
        pushUniqueFact(facts, `综合评级：${meta.grade.trim()}`, blocked);
      }
      if (typeof meta.score === 'number') {
        pushUniqueFact(facts, `${meta.score}/100`, blocked);
      }
      if (facts.length === 0) pushSummaryParts(facts, artifact.summary, blocked);
    },
    ppc_action_list: () => appendPpcFacts(facts, meta, blocked),
    compliance_check: () => {
      const review = getComplianceReviewView(artifact);
      pushUniqueFact(facts, `已复核 ${review.reviewedCount}/${review.totalCount} 项`, blocked);
      if (review.issueCount > 0) {
        pushUniqueFact(facts, `发现 ${review.issueCount} 项问题`, blocked);
      }
      if (review.notApplicableCount > 0) {
        pushUniqueFact(facts, `${review.notApplicableCount} 项不适用`, blocked);
      }
      if (review.complete && !review.hasIssues) {
        pushUniqueFact(facts, '人工复核已完成', blocked);
      }
    },
  };
  handlers[artifact.type]?.();
}

export function extractRecentFacts(
  artifact: AppCenterArtifactEnvelope,
  workItem: AppCenterWorkItem | null | undefined,
  typeLabel: string,
  primaryTitle: string
): string[] {
  const facts: string[] = [];
  const blocked = createFactBlockedSet(workItem, typeLabel, primaryTitle);
  // Body stays compact: type-specific metrics only (no execution-start / name noise).
  // Journey rail carries stage summaries; relative time lives in the card corner.
  appendTypeSpecificFacts(facts, artifact, workItem, blocked);

  if (facts.length === 0 && artifact.summary.trim()) {
    pushSummaryParts(facts, artifact.summary, blocked, {
      skipHistoryBound: true,
    });
  }

  // Hard cap for scannable density in the recent-card body.
  return facts.slice(0, 3);
}

export function resolvePrimaryTitle(
  artifact: AppCenterArtifactEnvelope,
  workItem: AppCenterWorkItem | null | undefined,
  typeLabel: string
): string {
  const workContext = formatWorkContext(workItem);

  if (workContext) return workContext;
  if (artifact.title.trim() && !isGenericArtifactTitle(artifact.title, typeLabel)) {
    return artifact.title.trim();
  }
  if (workItem?.title?.trim()) return workItem.title.trim();
  return typeLabel;
}

/**
 * Pure presentation transform for the App Center "最近作业" resume queue.
 * Does not touch DOM or storage — safe for unit tests with fake envelopes.
 */
export function buildRecentArtifactPresentation(
  artifact: AppCenterArtifactEnvelope,
  workItem?: AppCenterWorkItem | null,
  now = Date.now()
): RecentArtifactPresentation {
  const typeLabel = RECENT_ARTIFACT_TYPE_LABELS[artifact.type];
  const primaryTitle = resolvePrimaryTitle(artifact, workItem, typeLabel);
  const activityAt = artifact.updatedAt || artifact.createdAt;
  const activityTime = new Date(activityAt).getTime();
  const relativeTime = formatRelativeTime(activityAt, now);
  const absoluteTime = formatAbsoluteTime(activityAt);

  return {
    typeLabel,
    primaryTitle,
    facts: extractRecentFacts(artifact, workItem, typeLabel, primaryTitle),
    relativeTime,
    absoluteTime,
    isFresh: Number.isFinite(activityTime) && now - activityTime < 60 * 60 * 1000,
  };
}

function getExecutionId(workItem: AppCenterWorkItem | null | undefined): string {
  return workItem?.id.split(':').at(-1) || '';
}

/**
 * Plain-text summary for clipboard / 复盘 — no cloud sync, local operator aid only.
 */
export function buildResumeClipboardSummary(
  artifact: AppCenterArtifactEnvelope,
  workItem?: AppCenterWorkItem | null,
  now = Date.now()
): string {
  const presentation = buildRecentArtifactPresentation(artifact, workItem, now);
  const executionId = getExecutionId(workItem);
  const lines = [
    `作业：${presentation.primaryTitle}`,
    executionId ? `执行编号：${executionId}` : '',
    workItem?.createdAt ? `执行开始：${formatAbsoluteTime(workItem.createdAt)}` : '',
    `类型：${presentation.typeLabel}`,
    workItem?.status ? `状态：${WORK_ITEM_STATUS_LABELS[workItem.status]}` : '',
    workItem?.marketplace ? `站点：${workItem.marketplace}` : '',
    workItem?.asinOrSku ? `ASIN/SKU：${workItem.asinOrSku}` : '',
    presentation.facts.length ? `要点：${presentation.facts.join(' · ')}` : '',
    presentation.absoluteTime || presentation.relativeTime
      ? `时间：${presentation.absoluteTime || presentation.relativeTime}`
      : '',
  ].filter(Boolean);

  return lines.join('\n');
}
