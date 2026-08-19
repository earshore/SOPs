/**
 * Alpine 组件辅助函数
 * 提供各种工具函数和辅助方法
 */

import { LANGUAGE_HEADERS } from '@/common/constants/constants';
import { appStore } from '@/stores/useAppStore';

import { generateAnalysisPrompt } from '../prompts/analysisPrompts';
import { mergeProducts } from '../utils/dataTransformers';
import { getTargetIcon, getTargetColor } from '../utils/targetHelpers';
import { estimateTokenCount, formatTokenCount } from '../utils/tokenCounter';

import type { Product } from '../config/sampleData';

/**
 * 通过 targetId 获取 icon
 */
export function getResultIcon(targetId: string): string {
  return getTargetIcon(targetId);
}

/**
 * 通过 targetId 获取 color
 */
export function getResultColor(targetId: string): string {
  return getTargetColor(targetId);
}

/**
 * 获取目标颜色映射
 */
export function getTargetColorClass(color: string): string {
  const colorMap: Record<string, string> = {
    blue: 'blue',
    cyan: 'cyan',
    red: 'red',
    amber: 'amber',
    orange: 'orange',
    purple: 'purple',
    teal: 'teal',
    rose: 'rose',
  };
  return colorMap[color] || 'blue';
}

/**
 * 获取市场对应的语言代码
 */
export function getMarketLanguage(): string {
  const scrapedData = appStore.getState().scraper?.scrapedData;
  if (scrapedData && scrapedData.metadata && scrapedData.metadata.marketplace) {
    const marketplace = scrapedData.metadata.marketplace;

    // 从 LANGUAGE_HEADERS 获取语言配置
    const langConfig = LANGUAGE_HEADERS[marketplace];

    if (langConfig && langConfig.locale) {
      // 从 locale (如 "de_DE") 提取语言代码 (如 "de")
      const language = langConfig.locale.split('_')[0];
      return language || 'en';
    }
  }

  // 默认返回英语
  return 'en';
}

/**
 * 生成提示词文本
 */
export function getPromptText(targetId: string, currentProducts: Product[]): string {
  if (currentProducts.length === 0) return '无产品数据';

  try {
    // 如果有多个产品，合并后生成提示词
    const mergedProduct =
      currentProducts.length > 1 ? mergeProducts(currentProducts) : currentProducts[0];

    // 确保 mergedProduct 存在
    if (!mergedProduct) {
      return '无产品数据';
    }

    // 获取正确的语言代码
    const language = getMarketLanguage();
    return generateAnalysisPrompt(targetId, mergedProduct, language);
  } catch (error) {
    console.error('[辅助函数] 生成提示词失败:', error);
    return '提示词生成失败';
  }
}

/**
 * 获取提示词的 token 数量
 */
export function getPromptTokenCount(targetId: string, currentProducts: Product[]): number {
  const promptText = getPromptText(targetId, currentProducts);
  return estimateTokenCount(promptText);
}

/**
 * 获取格式化的 token 数量显示
 */
export function getFormattedTokenCount(targetId: string, currentProducts: Product[]): string {
  const count = getPromptTokenCount(targetId, currentProducts);
  return formatTokenCount(count);
}
