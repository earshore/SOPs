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
export function findFirstStringValue(
  obj: unknown,
  depth: number = 0,
): string | null {
  if (depth > 3) return null;

  if (typeof obj === 'string' && obj.trim().length > 0) {
    return obj.trim();
  }

  if (Array.isArray(obj) && obj.length > 0) {
    return findFirstStringValue(obj[0], depth + 1);
  }

  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const result = findFirstStringValue(
        (obj as Record<string, unknown>)[key],
        depth + 1,
      );
      if (result) return result;
    }
  }

  return null;
}

// ==========================================
// 新格式报告预览提取
// ==========================================

/**
 * 从新格式分析目标数据中智能提取预览文本
 *
 * @param targetId 分析目标 ID（如 'title-keywords', 'selling-points' 等）
 * @param data     该目标的分析数据对象
 * @returns        可显示的简短预览字符串
 */
export function extractPreviewText(targetId: string, data: unknown): string {
  console.log('[previewExtractor] extractPreviewText:', { targetId, dataType: typeof data });

  if (!data || typeof data !== 'object') return '数据格式错误';

  const d = data as Record<string, unknown>;

  try {
    switch (targetId) {
      case 'title-keywords': {
        if (Array.isArray(d.primary_keywords)) {
          const kw = d.primary_keywords
            .slice(0, PROMPTLAB_DISPLAY_LIMITS.HIGH_FREQUENCY_PHRASES)
            .map((k: unknown) =>
              k && typeof k === 'object' && 'keyword' in k
                ? String((k as { keyword: unknown }).keyword)
                : null,
            )
            .filter(Boolean)
            .join(', ');
          return kw || '无主要关键词';
        }
        break;
      }

      case 'selling-points': {
        const os = d.overall_strategy;
        if (os && typeof os === 'object' && 'primary_differentiation' in os) {
          return String((os as { primary_differentiation: unknown }).primary_differentiation);
        }
        if (Array.isArray(d.bullet_analysis) && d.bullet_analysis.length > 0) {
          const first = d.bullet_analysis[0];
          if (first && typeof first === 'object' && 'differentiation_angle' in first) {
            return String((first as { differentiation_angle: unknown }).differentiation_angle) || '卖点分析';
          }
        }
        break;
      }

      case 'fatal-flaws': {
        if (Array.isArray(d.critical_issues)) {
          const issues = d.critical_issues
            .slice(0, PROMPTLAB_DISPLAY_LIMITS.PAIN_POINTS)
            .map((i: unknown) =>
              i && typeof i === 'object' && 'issue' in i
                ? String((i as { issue: unknown }).issue)
                : null,
            )
            .filter(Boolean)
            .join('; ');
          return issues || '无致命缺陷';
        }
        const ra = d.risk_assessment;
        if (ra && typeof ra === 'object' && 'primary_concern' in ra) {
          return String((ra as { primary_concern: unknown }).primary_concern);
        }
        break;
      }

      case 'wow-moments': {
        if (Array.isArray(d.moments) && d.moments.length > 0) {
          const first = d.moments[0];
          if (first && typeof first === 'object' && 'moment_description' in first) {
            return String((first as { moment_description: unknown }).moment_description) || 'Wow时刻分析';
          }
        }
        if (Array.isArray(d.emotional_triggers)) {
          return d.emotional_triggers
            .slice(0, PROMPTLAB_DISPLAY_LIMITS.EMOTIONAL_TRIGGERS)
            .map(String)
            .join(', ');
        }
        break;
      }

      case 'hesitation-points': {
        if (Array.isArray(d.hesitations) && d.hesitations.length > 0) {
          const first = d.hesitations[0];
          if (first && typeof first === 'object' && 'pre_purchase_worry' in first) {
            return String((first as { pre_purchase_worry: unknown }).pre_purchase_worry) || '犹豫点分析';
          }
        }
        if (Array.isArray(d.common_doubts)) {
          return d.common_doubts
            .slice(0, PROMPTLAB_DISPLAY_LIMITS.COMMON_DOUBTS)
            .map(String)
            .join('; ');
        }
        break;
      }

      case 'buyer-profile': {
        if (Array.isArray(d.buyer_types) && d.buyer_types.length > 0) {
          const types = d.buyer_types
            .slice(0, PROMPTLAB_DISPLAY_LIMITS.PAIN_POINTS)
            .map((t: unknown) =>
              t && typeof t === 'object' && 'type' in t
                ? String((t as { type: unknown }).type)
                : null,
            )
            .filter(Boolean)
            .join(', ');
          return types || '买家画像分析';
        }
        const demo = d.demographics;
        if (demo && typeof demo === 'object' && 'lifestyle_indicators' in demo) {
          const li = (demo as { lifestyle_indicators: unknown }).lifestyle_indicators;
          if (Array.isArray(li)) {
            return li.slice(0, PROMPTLAB_DISPLAY_LIMITS.LIFESTYLE_INDICATORS).map(String).join(', ');
          }
        }
        break;
      }

      case 'vocab-gap': {
        if (Array.isArray(d.missing_keywords)) {
          const kw = d.missing_keywords
            .slice(0, 3)
            .map((k: unknown) => {
              if (k && typeof k === 'object' && 'keyword' in k) return String((k as { keyword: unknown }).keyword);
              return k ? String(k) : null;
            })
            .filter(Boolean)
            .join(', ');
          return kw || '词汇缺口分析';
        }
        break;
      }

      case 'promise-reality': {
        if (Array.isArray(d.gaps) && d.gaps.length > 0) {
          const g = d.gaps[0];
          if (g && typeof g === 'object') {
            const go = g as Record<string, unknown>;
            return String(go.promise ?? go.gap_description ?? '承诺与现实分析');
          }
        }
        break;
      }
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
  const module = ANALYSIS_MODULES.find((m) => m.id === key);
  if (module) return module.label_cn;
  return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * 将任意值格式化为短预览字符串（用于旧格式报告）
 */
export function getPreviewText(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') {
    return val.length > 50 ? val.slice(0, 50) + '...' : val;
  }
  try {
    if (Array.isArray(val)) {
      const texts = val.map((item) => {
        if (typeof item === 'object' && item !== null) return Object.values(item).join(' ');
        return String(item ?? '');
      });
      const str = texts.filter((t) => t.trim()).join(' | ');
      return str.length > 60 ? str.slice(0, 60) + '...' : str;
    }
    if (typeof val === 'object') {
      const str = Object.values(val).join(', ');
      return str.length > 60 ? str.slice(0, 60) + '...' : str;
    }
    return JSON.stringify(val).slice(0, 60) + '...';
  } catch {
    return 'Data...';
  }
}
