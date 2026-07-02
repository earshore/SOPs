import type { Product } from '../config/sampleData';

export type SchedulingPreference = 'recommended' | 'reliability' | 'speed';
export type ScheduleTier = 'stable' | 'recommended' | 'extreme';
export type FailureStrategy = 'abort' | 'continue';
export type ScheduleFailureMode = 'complete_required' | 'best_effort';
export type ScheduleStreamMode = 'final_only' | 'progressive';
export type ScheduleCacheStrategy = 'prefer_cache' | 'normal';

export interface AnalysisSchedulePlan {
  preference: SchedulingPreference;
  tier: ScheduleTier;
  label: string;
  maxConcurrency: number;
  failureStrategy: FailureStrategy;
  iconClass: string;
  goalText: string;
  detailText: string;
  speedLevelText: string;
  reliabilityLevelText: string;
  failureHandlingText: string;
}

export interface AnalysisRuntimeSchedulePlan extends AnalysisSchedulePlan {
  taskOrder: string[];
  cachedTargetIds: string[];
  uncachedTaskCount: number;
  failureMode: ScheduleFailureMode;
  streamMode: ScheduleStreamMode;
  retryBudget: number;
  cacheStrategy: ScheduleCacheStrategy;
  estimatedInputTokens: number;
  complexityScore: number;
}

interface ScheduleDefinition extends Omit<AnalysisSchedulePlan, 'maxConcurrency'> {
  baseConcurrency: number;
}

export interface AnalysisScheduleInput {
  preference?: SchedulingPreference;
  targetIds: string[];
  product: Product;
  language?: string;
  enableCache?: boolean;
  cachedTargetIds?: string[];
}

interface ScheduleMetrics {
  targetCount: number;
  reviewTargetCount: number;
  cachedTargetCount: number;
  uncachedTaskCount: number;
  reviewCount: number;
  bulletCount: number;
  asinCount: number;
  estimatedInputTokens: number;
  complexityScore: number;
}

type ComplexityMetric =
  | 'targetCount'
  | 'reviewTargetCount'
  | 'reviewCount'
  | 'bulletCount'
  | 'asinCount'
  | 'estimatedInputTokens';

interface ComplexityRule {
  metric: ComplexityMetric;
  levels: ReadonlyArray<{
    min: number;
    score: number;
  }>;
}

const MAX_ANALYSIS_CONCURRENCY = 8;
const REVIEW_TARGETS = new Set([
  'fatal-flaws',
  'wow-moments',
  'hesitation-points',
  'buyer-profile',
  'vocab-gap',
  'promise-reality',
]);

const TARGET_COMPLEXITY: Record<string, number> = {
  'title-keywords': 1,
  'selling-points': 2,
  'fatal-flaws': 3,
  'wow-moments': 3,
  'hesitation-points': 4,
  'buyer-profile': 4,
  'vocab-gap': 4,
  'promise-reality': 4,
};

const COMPLEXITY_RULES: readonly ComplexityRule[] = [
  { metric: 'targetCount', levels: [{ min: 7, score: 1 }] },
  { metric: 'reviewTargetCount', levels: [{ min: 4, score: 1 }] },
  {
    metric: 'reviewCount',
    levels: [
      { min: 200, score: 2 },
      { min: 80, score: 1 },
    ],
  },
  { metric: 'bulletCount', levels: [{ min: 12, score: 1 }] },
  {
    metric: 'asinCount',
    levels: [
      { min: 3, score: 2 },
      { min: 2, score: 1 },
    ],
  },
  {
    metric: 'estimatedInputTokens',
    levels: [
      { min: 12000, score: 2 },
      { min: 6000, score: 1 },
    ],
  },
];

const SCHEDULE_DEFINITIONS: Record<SchedulingPreference, ScheduleDefinition> = {
  recommended: {
    preference: 'recommended',
    tier: 'recommended',
    label: '推荐档',
    baseConcurrency: 4,
    failureStrategy: 'continue',
    goalText: '平衡速度与稳定性，适合日常分析',
    detailText: '中等并发执行，单个维度失败时继续收集其他结果。',
    speedLevelText: '均衡提速',
    reliabilityLevelText: '推荐',
    failureHandlingText: '失败隔离',
    iconClass: 'fa-solid fa-gauge-high',
  },
  reliability: {
    preference: 'reliability',
    tier: 'stable',
    label: '可靠性优先',
    baseConcurrency: 2,
    failureStrategy: 'abort',
    goalText: '以完整结果为目标，降低限流和超时风险',
    detailText: '低并发稳态执行；任一关键维度失败时提示重试，避免交付残缺报告。',
    speedLevelText: '稳态执行',
    reliabilityLevelText: '高',
    failureHandlingText: '完整性校验',
    iconClass: 'fa-solid fa-shield-halved',
  },
  speed: {
    preference: 'speed',
    tier: 'extreme',
    label: '速度优先',
    baseConcurrency: 8,
    failureStrategy: 'continue',
    goalText: '以快速完成任务为目标，优先缩短等待时间',
    detailText: '高并发快速执行；单个维度失败不阻塞整体完成。',
    speedLevelText: '极速吞吐',
    reliabilityLevelText: '依赖网络',
    failureHandlingText: '快速跳过失败',
    iconClass: 'fa-solid fa-bolt',
  },
};

export function isSchedulingPreference(value: unknown): value is SchedulingPreference {
  return value === 'recommended' || value === 'reliability' || value === 'speed';
}

export function resolveAnalysisSchedule(
  settings: { schedulingPreference?: unknown },
  taskCount: number = MAX_ANALYSIS_CONCURRENCY
): AnalysisSchedulePlan {
  const preference = isSchedulingPreference(settings.schedulingPreference)
    ? settings.schedulingPreference
    : 'recommended';
  const definition = SCHEDULE_DEFINITIONS[preference];
  const normalizedTaskCount = Number.isFinite(taskCount)
    ? Math.max(1, Math.floor(taskCount))
    : MAX_ANALYSIS_CONCURRENCY;

  return {
    ...definition,
    maxConcurrency: Math.max(
      1,
      Math.min(definition.baseConcurrency, MAX_ANALYSIS_CONCURRENCY, normalizedTaskCount)
    ),
  };
}

export function resolveAnalysisSchedulePlan(
  input: AnalysisScheduleInput
): AnalysisRuntimeSchedulePlan {
  const targetIds = uniqueTargetIds(input.targetIds);
  const cachedTargetIds =
    input.enableCache === false ? [] : filterCachedTargets(input.cachedTargetIds || [], targetIds);
  const metrics = getScheduleMetrics(input.product, targetIds, cachedTargetIds);
  const preference = isSchedulingPreference(input.preference) ? input.preference : 'recommended';
  const decision = resolveRuntimeDecision(preference, metrics);
  const basePlan = resolveAnalysisSchedule({ schedulingPreference: preference }, targetIds.length);
  const taskOrder = sortTargetsForPlan(targetIds, cachedTargetIds, preference);

  return {
    ...basePlan,
    tier: decision.tier,
    maxConcurrency: Math.max(
      1,
      Math.min(
        decision.maxConcurrency,
        MAX_ANALYSIS_CONCURRENCY,
        Math.max(1, metrics.uncachedTaskCount)
      )
    ),
    failureStrategy: decision.failureStrategy,
    failureMode: decision.failureMode,
    streamMode: decision.streamMode,
    retryBudget: decision.retryBudget,
    cacheStrategy: cachedTargetIds.length > 0 ? 'prefer_cache' : 'normal',
    taskOrder,
    cachedTargetIds,
    uncachedTaskCount: metrics.uncachedTaskCount,
    estimatedInputTokens: metrics.estimatedInputTokens,
    complexityScore: metrics.complexityScore,
  };
}

function uniqueTargetIds(targetIds: string[]): string[] {
  return [...new Set((targetIds || []).filter(Boolean))];
}

function filterCachedTargets(cachedTargetIds: string[], targetIds: string[]): string[] {
  const targetSet = new Set(targetIds);
  return uniqueTargetIds(cachedTargetIds).filter(targetId => targetSet.has(targetId));
}

function getScheduleMetrics(
  product: Product,
  targetIds: string[],
  cachedTargetIds: string[]
): ScheduleMetrics {
  const reviewTargetCount = targetIds.filter(targetId => REVIEW_TARGETS.has(targetId)).length;
  const reviewCount = product.customer_reviews?.length || 0;
  const bulletCount = product.feature_bullets?.length || 0;
  const asinCount = getAsinCount(product);
  const estimatedInputTokens = estimateProductInputTokens(product);
  const uncachedTaskCount = Math.max(0, targetIds.length - cachedTargetIds.length);
  const complexityScore = getComplexityScore({
    targetCount: targetIds.length,
    reviewTargetCount,
    cachedTargetCount: cachedTargetIds.length,
    uncachedTaskCount,
    reviewCount,
    bulletCount,
    asinCount,
    estimatedInputTokens,
    complexityScore: 0,
  });

  return {
    targetCount: targetIds.length,
    reviewTargetCount,
    cachedTargetCount: cachedTargetIds.length,
    uncachedTaskCount,
    reviewCount,
    bulletCount,
    asinCount,
    estimatedInputTokens,
    complexityScore,
  };
}

function getAsinCount(product: Product): number {
  const metadata = product.metadata as Record<string, unknown> | undefined;
  const metadataCount = Number(metadata?.product_count);
  if (Number.isFinite(metadataCount) && metadataCount > 0) {
    return Math.floor(metadataCount);
  }

  const metadataAsins = metadata?.asins;
  if (Array.isArray(metadataAsins) && metadataAsins.length > 0) {
    return metadataAsins.length;
  }

  return Math.max(
    1,
    String(product.asin || '')
      .split(',')
      .filter(Boolean).length
  );
}

function estimateProductInputTokens(product: Product): number {
  const reviewChars = (product.customer_reviews || []).reduce((sum, review) => {
    return sum + (review.headline?.length || 0) + (review.body?.length || 0);
  }, 0);
  const bulletChars = (product.feature_bullets || []).reduce(
    (sum, bullet) => sum + bullet.length,
    0
  );
  const titleChars = product.productTitle?.length || 0;

  return Math.ceil((titleChars + bulletChars + reviewChars) / 4);
}

function getComplexityScore(metrics: ScheduleMetrics): number {
  const baseScore = COMPLEXITY_RULES.reduce((score, rule) => {
    return score + getComplexityRuleScore(metrics, rule);
  }, 0);
  const cacheAdjustment = metrics.cachedTargetCount >= Math.ceil(metrics.targetCount / 2) ? -1 : 0;

  return Math.max(0, baseScore + cacheAdjustment);
}

function getComplexityRuleScore(metrics: ScheduleMetrics, rule: ComplexityRule): number {
  return rule.levels.find(level => metrics[rule.metric] >= level.min)?.score || 0;
}

function resolveRuntimeDecision(
  preference: SchedulingPreference,
  metrics: ScheduleMetrics
): {
  tier: ScheduleTier;
  maxConcurrency: number;
  failureStrategy: FailureStrategy;
  failureMode: ScheduleFailureMode;
  streamMode: ScheduleStreamMode;
  retryBudget: number;
} {
  if (preference === 'reliability') {
    return {
      tier: 'stable',
      maxConcurrency: metrics.complexityScore >= 3 ? 1 : 2,
      failureStrategy: 'abort',
      failureMode: 'complete_required',
      streamMode: 'final_only',
      retryBudget: 2,
    };
  }

  if (preference === 'speed') {
    const highRisk = metrics.complexityScore >= 5;
    const mediumRisk = metrics.complexityScore >= 3;
    return {
      tier: highRisk ? 'recommended' : 'extreme',
      maxConcurrency: highRisk ? 4 : mediumRisk ? 6 : 8,
      failureStrategy: 'continue',
      failureMode: 'best_effort',
      streamMode: 'progressive',
      retryBudget: highRisk ? 1 : 0,
    };
  }

  if (metrics.complexityScore >= 5) {
    return {
      tier: 'stable',
      maxConcurrency: 2,
      failureStrategy: 'continue',
      failureMode: 'best_effort',
      streamMode: 'progressive',
      retryBudget: 2,
    };
  }

  return {
    tier: 'recommended',
    maxConcurrency: metrics.complexityScore >= 3 ? 3 : 4,
    failureStrategy: 'continue',
    failureMode: 'best_effort',
    streamMode: 'progressive',
    retryBudget: 1,
  };
}

function sortTargetsForPlan(
  targetIds: string[],
  cachedTargetIds: string[],
  preference: SchedulingPreference
): string[] {
  const cachedSet = new Set(cachedTargetIds);
  return [...targetIds].sort((a, b) => {
    const cachedDelta = Number(cachedSet.has(b)) - Number(cachedSet.has(a));
    if (cachedDelta !== 0) return cachedDelta;

    const complexityDelta = getTargetComplexity(a) - getTargetComplexity(b);
    if (preference === 'reliability') {
      return -complexityDelta;
    }
    return complexityDelta;
  });
}

function getTargetComplexity(targetId: string): number {
  return TARGET_COMPLEXITY[targetId] || 3;
}
