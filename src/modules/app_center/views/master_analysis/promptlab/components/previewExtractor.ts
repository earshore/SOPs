/**
 * Promptlab 预览文本提取工具（纯函数）
 *
 * 从各种格式的分析报告数据中智能提取可读预览文本。
 * 无 Alpine 上下文依赖，完全可单独测试。
 */

import { ANALYSIS_MODULES } from '../../constants/prompts';
import { PROMPTLAB_DISPLAY_LIMITS } from '../../config/displayLimits';
// ==========================================
// 工具函数
// ==========================================

/**
 * 递归查找对象或数组中第一个有意义的字符串值
 * @param obj   任意值
 * @param depth 当前递归深度（内部使用，限制为 3）
 */
export function findFirstStringValue(obj: unknown, depth: number = 0): string | null {
  if (depth > 3) return null;

  if (typeof obj === 'string' && obj.trim().length > 0) {
    return obj.trim();
  }

  if (Array.isArray(obj) && obj.length > 0) {
    return findFirstStringValue(obj[0], depth + 1);
  }

  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const result = findFirstStringValue((obj as Record<string, unknown>)[key], depth + 1);
      if (result) return result;
    }
  }

  return null;
}

// ==========================================
// 新格式报告预览提取
// ==========================================

type PreviewData = Record<string, unknown>;
type PreviewHandler = (data: PreviewData) => string | undefined;

function getFieldString(value: unknown, field: string): string | undefined {
  if (value && typeof value === 'object' && field in value) {
    return String((value as PreviewData)[field]);
  }
  return undefined;
}

function joinObjectFieldValues(
  values: unknown[],
  limit: number,
  field: string,
  separator: string
): string {
  return values
    .slice(0, limit)
    .map((item: unknown) => getFieldString(item, field) ?? null)
    .filter(Boolean)
    .join(separator);
}

function extractTitleKeywordsPreview(data: PreviewData): string | undefined {
  if (!Array.isArray(data.primary_keywords)) return undefined;

  const keywords = joinObjectFieldValues(
    data.primary_keywords,
    PROMPTLAB_DISPLAY_LIMITS.HIGH_FREQUENCY_PHRASES,
    'keyword',
    ', '
  );
  return keywords || '无主要关键词';
}

function extractSellingPointsPreview(data: PreviewData): string | undefined {
  const strategyText = getFieldString(data.overall_strategy, 'primary_differentiation');
  if (strategyText !== undefined) return strategyText;

  if (Array.isArray(data.bullet_analysis) && data.bullet_analysis.length > 0) {
    const firstBulletText = getFieldString(data.bullet_analysis[0], 'differentiation_angle');
    if (firstBulletText !== undefined) return firstBulletText || '卖点分析';
  }

  return undefined;
}

function extractFatalFlawsPreview(data: PreviewData): string | undefined {
  if (Array.isArray(data.critical_issues)) {
    const issues = joinObjectFieldValues(
      data.critical_issues,
      PROMPTLAB_DISPLAY_LIMITS.PAIN_POINTS,
      'issue',
      '; '
    );
    return issues || '无致命缺陷';
  }

  return getFieldString(data.risk_assessment, 'primary_concern');
}

function extractWowMomentsPreview(data: PreviewData): string | undefined {
  if (Array.isArray(data.moments) && data.moments.length > 0) {
    const momentText = getFieldString(data.moments[0], 'moment_description');
    if (momentText !== undefined) return momentText || 'Wow时刻分析';
  }

  if (Array.isArray(data.emotional_triggers)) {
    return data.emotional_triggers
      .slice(0, PROMPTLAB_DISPLAY_LIMITS.EMOTIONAL_TRIGGERS)
      .map(String)
      .join(', ');
  }

  return undefined;
}

function extractHesitationPointsPreview(data: PreviewData): string | undefined {
  if (Array.isArray(data.hesitations) && data.hesitations.length > 0) {
    const worryText = getFieldString(data.hesitations[0], 'pre_purchase_worry');
    if (worryText !== undefined) return worryText || '犹豫点分析';
  }

  if (Array.isArray(data.common_doubts)) {
    return data.common_doubts
      .slice(0, PROMPTLAB_DISPLAY_LIMITS.COMMON_DOUBTS)
      .map(String)
      .join('; ');
  }

  return undefined;
}

function extractBuyerProfilePreview(data: PreviewData): string | undefined {
  if (Array.isArray(data.buyer_types) && data.buyer_types.length > 0) {
    const types = joinObjectFieldValues(
      data.buyer_types,
      PROMPTLAB_DISPLAY_LIMITS.PAIN_POINTS,
      'type',
      ', '
    );
    return types || '买家画像分析';
  }

  const lifestyleIndicators = (data.demographics as PreviewData | undefined)?.lifestyle_indicators;
  if (Array.isArray(lifestyleIndicators)) {
    return lifestyleIndicators
      .slice(0, PROMPTLAB_DISPLAY_LIMITS.LIFESTYLE_INDICATORS)
      .map(String)
      .join(', ');
  }

  return undefined;
}

function extractVocabGapPreview(data: PreviewData): string | undefined {
  if (!Array.isArray(data.missing_keywords)) return undefined;

  const keywords = data.missing_keywords
    .slice(0, 3)
    .map((keyword: unknown) => {
      const objectKeyword = getFieldString(keyword, 'keyword');
      return objectKeyword !== undefined ? objectKeyword : keyword ? String(keyword) : null;
    })
    .filter(Boolean)
    .join(', ');

  return keywords || '词汇缺口分析';
}

function extractPromiseRealityPreview(data: PreviewData): string | undefined {
  if (!Array.isArray(data.gaps) || data.gaps.length === 0) return undefined;

  const gap = data.gaps[0];
  if (!gap || typeof gap !== 'object') return undefined;

  const gapData = gap as PreviewData;
  return String(gapData.promise ?? gapData.gap_description ?? '承诺与现实分析');
}

const PREVIEW_HANDLERS: Record<string, PreviewHandler> = {
  'title-keywords': extractTitleKeywordsPreview,
  'selling-points': extractSellingPointsPreview,
  'fatal-flaws': extractFatalFlawsPreview,
  'wow-moments': extractWowMomentsPreview,
  'hesitation-points': extractHesitationPointsPreview,
  'buyer-profile': extractBuyerProfilePreview,
  'vocab-gap': extractVocabGapPreview,
  'promise-reality': extractPromiseRealityPreview,
};

/**
 * 从新格式分析目标数据中智能提取预览文本
 *
 * @param targetId 分析目标 ID（如 'title-keywords', 'selling-points' 等）
 * @param data     该目标的分析数据对象
 * @returns        可显示的简短预览字符串
 */
export function extractPreviewText(targetId: string, data: unknown): string {
  if (!data || typeof data !== 'object') return '数据格式错误';

  const d = data as Record<string, unknown>;

  try {
    const preview = PREVIEW_HANDLERS[targetId]?.(d);
    if (preview !== undefined) {
      return preview;
    }

    // 默认：尝试提取第一个字符串值
    const fallback = findFirstStringValue(data);
    if (fallback) {
      return fallback.length > 80 ? fallback.slice(0, 80) + '…' : fallback;
    }

    return '分析数据已加载';
  } catch (error) {
    console.error('[previewExtractor] extractPreviewText 失败:', error);
    return '分析数据已加载';
  }
}

// ==========================================
// 旧格式报告工具
// ==========================================

/**
 * 根据字段 key 查找中文标题（用于旧格式报告）
 */
export function getFieldTitle(key: string): string {
  const module = ANALYSIS_MODULES.find(m => m.id === key);
  if (module) return module.label_cn;
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function truncatePreviewText(text: string, limit: number): string {
  return text.length > limit ? text.slice(0, limit) + '...' : text;
}

function stringifyPreviewItem(item: unknown): string {
  if (typeof item === 'object' && item !== null) return Object.values(item).join(' ');
  return String(item ?? '');
}

function getArrayPreviewText(value: unknown[]): string {
  const str = value
    .map(stringifyPreviewItem)
    .filter(text => text.trim())
    .join(' | ');

  return truncatePreviewText(str, 60);
}

function getObjectPreviewText(value: object): string {
  return truncatePreviewText(Object.values(value).join(', '), 60);
}

function getPrimitivePreviewText(value: unknown): string {
  return JSON.stringify(value).slice(0, 60) + '...';
}

/**
 * 将任意值格式化为短预览字符串（用于旧格式报告）
 */
export function getPreviewText(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') {
    return truncatePreviewText(val, 50);
  }
  try {
    if (Array.isArray(val)) {
      return getArrayPreviewText(val);
    }
    if (typeof val === 'object') {
      return getObjectPreviewText(val);
    }
    return getPrimitivePreviewText(val);
  } catch {
    return 'Data...';
  }
}
