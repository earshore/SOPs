/**
 * AI 分析服务 - 调用大模型进行真实数据分析
 */

import { callLLM, type ChatMessage } from '../../../../../../services/llmService';
import { StorageService, STORAGE_KEYS } from '../../../../../../services/storageService';
import { configCenter } from '../../../../../../common/config/ConfigCenter';
import type { FullAnalysisReport } from '../config/analysisReportData';
import { parseAnalysisReport } from './analysisService';
import type { Product } from '../config/sampleData';
import type { AnalysisResult } from '../types';
import { generateAnalysisPrompt } from '../prompts/analysisPrompts';

/**
 * LLM 配置接口
 */
interface LLMConfig {
  provider: string;
  endpoint: string;
  apiKey: string;
  model: string;
}

/**
 * 获取 LLM 配置
 */
async function getLLMConfig(): Promise<LLMConfig> {
  const activeProvider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER) as string | null;

  if (!activeProvider || typeof activeProvider !== 'string') {
    throw new Error('请先在系统设置中选择 LLM 提供商');
  }

  const config = await StorageService.getLLMConfigWithKey(activeProvider);

  if (!config || !config.apiKey) {
    throw new Error('所选提供商未配置 API Key');
  }

  const model = config.model || (config.models && config.models[0] ? (typeof config.models[0] === 'string' ? config.models[0] : config.models[0].id) : undefined);
  
  if (!model) {
    throw new Error('未选择模型，请在设置中同步或选择模型');
  }

  return {
    provider: activeProvider,
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    model: model
  };
}

// 已移除 prepareProductData 和 getPromptTemplate 函数
// 现在直接使用 analysisPrompts.ts 中的 generateAnalysisPrompt

/**
 * 调用 AI 分析单个目标
 */
async function analyzeTarget(
  targetId: string,
  product: Product,
  config: LLMConfig,
  language: string = 'en',
  onProgress?: (step: string) => void
): Promise<unknown> {
  // 使用 analysisPrompts.ts 中的 generateAnalysisPrompt 生成提示词
  const prompt = generateAnalysisPrompt(targetId, product, language);

  onProgress?.(`正在分析: ${targetId}...`);

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的亚马逊产品分析专家,擅长从 Listings 和 Reviews 中提取关键洞察。请严格按照要求的 JSON 格式返回分析结果。'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  try {
    const response = await callLLM(
      messages,
      config.provider,
      config.endpoint,
      config.apiKey,
      config.model,
      {
        temperature: 0.3,
        jsonMode: true,
        timeout: configCenter.get<number>('llm.analysisTimeout') || 120000,
        retries: configCenter.get<number>('llm.maxRetries') || 2
      }
    );

    console.log(`[AI分析] ${targetId} 原始响应长度:`, response.length);
    console.log(`[AI分析] ${targetId} 原始响应前500字符:`, response.substring(0, 500));

    // 解析 JSON 响应
    const result = JSON.parse(response);
    console.log(`[AI分析] ${targetId} 解析后的结果键:`, Object.keys(result));
    
    return result;
  } catch (error) {
    console.error(`[AI分析] ${targetId} 分析失败:`, error);
    throw new Error(`${targetId} 分析失败: ${(error as Error).message}`);
  }
}

/**
 * 执行完整的 AI 分析
 * @returns 返回包含结果数组和完整报告的对象
 */
export async function runAIAnalysis(
  targetIds: string[],
  product: Product,
  onProgress: (progress: number, step: string) => void,
  language: string = 'en'
): Promise<{ results: AnalysisResult[]; report: FullAnalysisReport }> {
  const config = await getLLMConfig();
  const report: Partial<FullAnalysisReport> = {
    asin: product.asin,
    product_title: product.productTitle,
    analysis_timestamp: new Date().toISOString(),
    market: 'US'
  };

  const totalTargets = targetIds.length;
  let completedTargets = 0;

  // 目标ID到报告字段的映射
  const targetToField: Record<string, keyof FullAnalysisReport> = {
    'title-keywords': 'title-keywords',
    'selling-points': 'selling-points',
    'fatal-flaws': 'fatal-flaws',
    'wow-moments': 'wow-moments',
    'hesitation-points': 'hesitation-points',
    'buyer-profile': 'buyer-profile',
    'vocab-gap': 'vocab-gap',
    'promise-reality': 'promise-reality'
  };

  // 逐个分析目标
  for (const targetId of targetIds) {
    try {
      const progress = Math.round((completedTargets / totalTargets) * 100);
      onProgress(progress, `正在分析: ${targetId}...`);

      const result = await analyzeTarget(targetId, product, config, language, (step) => {
        onProgress(progress, step);
      });

      // 验证并添加结果到报告中
      const fieldName = targetToField[targetId];
      if (fieldName && result) {
        // 确保结果是有效的对象
        if (typeof result === 'object' && result !== null) {
          // 检查是否有嵌套的字段名（AI 可能返回 {"title-keywords": {...}} 而不是直接的 {...}）
          let actualResult = result;
          const resultObj = result as Record<string, unknown>;
          if (resultObj[fieldName]) {
            // 如果存在嵌套，提取内层数据
            actualResult = resultObj[fieldName];
            console.log(`[AI分析] ${targetId} 检测到嵌套结构，已提取内层数据`);
          }
          
          (report as any)[fieldName] = actualResult;
          console.log(`[AI分析] ${targetId} 分析成功，数据已添加到报告`);
        } else {
          console.warn(`[AI分析] ${targetId} 返回的数据格式无效:`, result);
        }
      }

      completedTargets++;
    } catch (error) {
      console.error(`[AI分析] ${targetId} 失败:`, error);
      // 继续分析其他目标,不中断整个流程
      completedTargets++;
    }
  }

  onProgress(100, '分析完成!');

  // 解析报告为展示格式
  const results = parseAnalysisReport(report as FullAnalysisReport, targetIds);
  
  // 返回结果数组和完整报告
  return {
    results,
    report: report as FullAnalysisReport
  };
}

/**
 * 验证 AI 返回的数据格式
 */
export function validateAnalysisResult(targetId: string, result: unknown): boolean {
  // 基础验证:确保返回的是对象
  if (!result || typeof result !== 'object') {
    return false;
  }

  const data = result as Record<string, unknown>;

  // 根据不同的目标进行特定验证
  switch (targetId) {
    case 'title-keywords':
      return Array.isArray(data.primary_keywords) && 
             Array.isArray(data.secondary_keywords);
    
    case 'selling-points':
      return Array.isArray(data.bullet_analysis) && 
             !!data.overall_strategy && 
             !!data.function_scene_matrix;
    
    case 'fatal-flaws':
      return Array.isArray(data.critical_issues) && 
             Array.isArray(data.return_triggers);
    
    case 'wow-moments':
      return Array.isArray(data.moments) && 
             Array.isArray(data.emotional_triggers);
    
    case 'hesitation-points':
      return Array.isArray(data.hesitations) && 
             Array.isArray(data.common_doubts);
    
    case 'buyer-profile':
      return !!data.demographics && 
             Array.isArray(data.buyer_types) && 
             Array.isArray(data.usage_scenes);
    
    case 'vocab-gap':
      return Array.isArray(data.seller_terms) && 
             Array.isArray(data.buyer_terms) && 
             Array.isArray(data.term_translations);
    
    case 'promise-reality':
      return Array.isArray(data.gaps) && 
             Array.isArray(data.verified_claims) && 
             !!data.overall_credibility;
    
    default:
      return true;
  }
}
