/**
 * AI 分析服务 - 调用大模型进行真实数据分析
 */

import { callLLM, type ChatMessage } from '../../../../../services/llmService';
import { StorageService, STORAGE_KEYS } from '../../../../../services/storageService';
import type { FullAnalysisReport } from './analysisReportData';
import { parseAnalysisReport } from './analysisService';
import type { Product } from './sampleData';
import type { AnalysisResult } from './types';
import { 
  TITLE_KEYWORDS_PROMPT,
  SELLING_POINTS_PROMPT,
  FATAL_FLAWS_PROMPT,
  WOW_MOMENTS_PROMPT,
  HESITATION_POINTS_PROMPT,
  BUYER_PROFILE_PROMPT,
  VOCAB_GAP_PROMPT,
  PROMISE_REALITY_PROMPT
} from './aiPrompts';

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

/**
 * 准备产品数据为 JSON 字符串
 */
function prepareProductData(product: Product): string {
  return JSON.stringify({
    asin: product.asin,
    title: product.productTitle,
    bullet_points: product.feature_bullets,
    reviews: product.customer_reviews.map(r => ({
      rating: r.star_rating,
      title: r.headline,
      text: r.body,
      verified: true
    }))
  }, null, 2);
}

/**
 * 获取分析目标的 Prompt 模板
 */
function getPromptTemplate(targetId: string): string {
  const prompts: Record<string, string> = {
    'title-keywords': TITLE_KEYWORDS_PROMPT,
    'selling-points': SELLING_POINTS_PROMPT,
    'fatal-flaws': FATAL_FLAWS_PROMPT,
    'wow-moments': WOW_MOMENTS_PROMPT,
    'hesitation-points': HESITATION_POINTS_PROMPT,
    'buyer-profile': BUYER_PROFILE_PROMPT,
    'vocab-gap': VOCAB_GAP_PROMPT,
    'promise-reality': PROMISE_REALITY_PROMPT
  };

  return prompts[targetId] || '';
}

/**
 * 调用 AI 分析单个目标
 */
async function analyzeTarget(
  targetId: string,
  product: Product,
  config: LLMConfig,
  onProgress?: (step: string) => void
): Promise<unknown> {
  const promptTemplate = getPromptTemplate(targetId);
  if (!promptTemplate) {
    throw new Error(`未找到分析目标 ${targetId} 的 Prompt 模板`);
  }

  const productData = prepareProductData(product);
  const prompt = promptTemplate.replace('{{PRODUCT_DATA}}', productData);

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
        timeout: 120000, // 2分钟超时
        retries: 2
      }
    );

    // 解析 JSON 响应
    const result = JSON.parse(response);
    return result;
  } catch (error) {
    console.error(`[AI分析] ${targetId} 分析失败:`, error);
    throw new Error(`${targetId} 分析失败: ${(error as Error).message}`);
  }
}

/**
 * 执行完整的 AI 分析
 */
export async function runAIAnalysis(
  targetIds: string[],
  product: Product,
  onProgress: (progress: number, step: string) => void
): Promise<AnalysisResult[]> {
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
    'title-keywords': 'title_keywords',
    'selling-points': 'selling_points',
    'fatal-flaws': 'fatal_flaws',
    'wow-moments': 'wow_moments',
    'hesitation-points': 'hesitation_points',
    'buyer-profile': 'buyer_profile',
    'vocab-gap': 'vocab_gap',
    'promise-reality': 'promise_reality'
  };

  // 逐个分析目标
  for (const targetId of targetIds) {
    try {
      const progress = Math.round((completedTargets / totalTargets) * 100);
      onProgress(progress, `正在分析: ${targetId}...`);

      const result = await analyzeTarget(targetId, product, config, (step) => {
        onProgress(progress, step);
      });

      // 将结果添加到报告中
      const fieldName = targetToField[targetId];
      if (fieldName) {
        (report as any)[fieldName] = result;
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
  return parseAnalysisReport(report as FullAnalysisReport, targetIds);
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
