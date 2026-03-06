/**
 * 报告适配器接口
 * 定义统一的 DNA 提取接口，支持多种报告格式
 */

import type { ExtendedDNA } from '../../types/extendedDNA';

/**
 * 报告适配器接口
 * 每种报告格式实现自己的适配器
 */
export interface ReportAdapter {
  /**
   * 检查是否可以处理该报告
   * @param report 待检查的报告对象
   * @returns true 如果可以处理
   */
  canHandle(report: unknown): boolean;

  /**
   * 从报告中提取 DNA
   * @param report 报告对象
   * @param language 目标语言代码（如 'zh', 'en', 'de'），用于本地化标签和文本，默认 'zh'
   * @returns 提取的 DNA 数据，如果失败返回 null
   */
  extractDNA(report: unknown, language?: string): ExtendedDNA | null;

  /**
   * 获取适配器名称
   */
  getName(): string;
}

/**
 * 提取结果接口（内部使用）
 */
export interface ExtractionResult<T> {
  data: T;
  confidence: number;
  sourceFields: string[];
}
