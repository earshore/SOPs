/**
 * 通用 DNA 提取器
 *
 * ## 功能概述
 * UniversalDNAExtractor 是一个适配器模式的实现，用于从多种不同格式的 AI 分析报告中
 * 提取统一的产品 DNA 数据结构。它自动识别报告格式并选择合适的适配器进行处理。
 *
 * ## 支持的报告格式
 * 1. **Full Analysis Report** - 应用当前使用的主要格式
 *    - 包含字段: buyer-profile, selling-points, title-keywords
 *    - 适配器: FullAnalysisReportAdapter
 *
 * 2. **Competitor Report** - 竞品分析报告
 *    - 包含字段: competitor_insights, feature_points, keyword_clusters
 *    - 适配器: CompetitorReportAdapter
 *
 * 3. **Product Overview Report** - 产品概览报告
 *    - 包含字段: productOverview, coreFeatures, user_profile
 *    - 适配器: ProductOverviewAdapter
 *
 * 4. **Semantic Analysis Report** - 语义分析报告
 *    - 包含字段: pain_point_gaps, native_voice, high_frequency_phrases
 *    - 适配器: SemanticAnalysisAdapter
 *
 * ## 使用示例
 * ```typescript
 * const extractor = new UniversalDNAExtractor();
 *
 * // 提取 DNA（自动检测报告格式）
 * const dna = extractor.extractDNA(report, 'zh');
 *
 * if (dna) {
 *   const summary = {
 *     audience: dna.audience,
 *     usps: dna.usps,
 *     specs: dna.specs,
 *     confidence: dna.confidence
 *   };
 * }
 * ```
 *
 * ## 多语言支持
 * 提取器支持多语言标签本地化，通过 language 参数指定目标语言：
 * - 'zh' - 中文（默认）
 * - 'en' - 英语
 * - 'de' - 德语
 *
 * ## 架构设计
 * - **适配器模式**: 每种报告格式对应一个适配器
 * - **责任链模式**: 按优先级顺序尝试每个适配器
 * - **类型安全**: 使用 TypeScript 严格类型检查
 * - **错误处理**: 三层防护（输入验证 + try-catch + 日志）
 *
 * @see {@link ReportAdapter} 适配器接口定义
 * @see {@link ExtendedDNA} DNA 数据结构定义
 */

import type { ReportAdapter } from './adapters/ReportAdapter';
import type { ExtendedDNA } from '../types/extendedDNA';
import { FullAnalysisReportAdapter } from './adapters/FullAnalysisReportAdapter';
import { CompetitorReportAdapter } from './adapters/CompetitorReportAdapter';
import { ProductOverviewAdapter } from './adapters/ProductOverviewAdapter';
import { SemanticAnalysisAdapter } from './adapters/SemanticAnalysisAdapter';
import { isSupportedReport } from './reportTypeDetector';
/**
 * 通用 DNA 提取器类
 *
 * 负责协调多个报告适配器，自动选择合适的适配器处理不同格式的报告。
 *
 * @example
 * ```typescript
 * const extractor = new UniversalDNAExtractor();
 * const dna = extractor.extractDNA(aiReport, 'zh');
 * ```
 */
export class UniversalDNAExtractor {
  /** 已注册的报告适配器列表（按优先级排序） */
  private adapters: ReportAdapter[];

  /**
   * 构造函数
   *
   * 初始化并注册所有可用的报告适配器。
   * 适配器按优先级排序，FullAnalysisReportAdapter 优先级最高。
   */
  constructor() {
    // 注册所有适配器（FullAnalysisReportAdapter 优先，因为应用当前使用这个格式）
    this.adapters = [
      new FullAnalysisReportAdapter(),
      new CompetitorReportAdapter(),
      new ProductOverviewAdapter(),
      new SemanticAnalysisAdapter()
    ];
  }

  /**
   * 从报告中提取产品 DNA
   *
   * 自动检测报告格式并使用对应的适配器提取 DNA 数据。
   * 如果没有适配器能处理该报告，返回 null。
   *
   * @param report - 任意格式的 AI 分析报告对象
   * @param language - 目标语言代码，用于本地化标签和文本
   *                   支持: 'zh'(中文), 'en'(英语), 'de'(德语)
   *                   默认: 'zh'
   *
   * @returns 提取的 DNA 数据对象，包含受众、卖点、规格、关键词等信息
   *          如果报告格式不支持或提取失败，返回 null
   *
   * @example
   * ```typescript
   * // 中文市场
   * const dna = extractor.extractDNA(report, 'zh');
   *
   * // 德国市场
   * const dna = extractor.extractDNA(report, 'de');
 *
 * // 检查提取结果
 * if (dna) {
 *   const audienceText = dna.audience.join(', ');
 *   const confidence = dna.confidence;
 * } else {
 *   console.error('DNA 提取失败');
 * }
   * ```
   *
   * @throws 不会抛出异常，所有错误都会被捕获并记录日志
   */
  extractDNA(report: unknown, language: string = 'zh'): ExtendedDNA | null {
    if (!report || typeof report !== 'object') {
      return null;
    }

    // 查找匹配的适配器
    const adapter = this.adapters.find(a => a.canHandle(report));

    if (!adapter) {
      return null;
    }

    // 使用适配器提取 DNA
    try {
      return adapter.extractDNA(report, language);
    } catch (error) {
      console.error('[UniversalDNAExtractor] 提取过程出错:', error);
      return null;
    }
  }

  /**
   * 检查报告是否可以提取 DNA
   *
   * @param report 待检查的报告对象
   * @returns true 如果可以提取
   */
  canExtractDNA(report: unknown): boolean {
    if (!report || typeof report !== 'object') {
      return false;
    }

    return isSupportedReport(report);
  }

  /**
   * 获取支持的报告格式列表
   */
  getSupportedFormats(): string[] {
    return this.adapters.map(a => a.getName());
  }

  /**
   * 注册自定义适配器
   *
   * @param adapter 自定义适配器实例
   */
  registerAdapter(adapter: ReportAdapter): void {
    this.adapters.push(adapter);
  }
}

/**
 * 默认导出：单例实例
 */
export const universalDNAExtractor = new UniversalDNAExtractor();

/**
 * 便捷函数：从 Downloads 报告提取 DNA
 *
 * @param report 任意格式的报告对象
 * @param language 目标语言代码（如 'zh', 'en', 'de'），默认 'zh'
 * @returns 提取的 DNA 数据，如果失败返回 null
 */
export function extractDNAFromDownloadsReport(report: unknown, language: string = 'zh'): ExtendedDNA | null {
  return universalDNAExtractor.extractDNA(report, language);
}

/**
 * 便捷函数：检查是否可以从报告提取 DNA
 *
 * @param report 待检查的报告对象
 * @returns true 如果可以提取
 */
export function canExtractDNAFromDownloadsReport(report: unknown): boolean {
  return universalDNAExtractor.canExtractDNA(report);
}
