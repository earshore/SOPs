/**
 * 并行分析服务 - 加速 AI 分析执行
 * 
 * 核心优化：
 * 1. 并行执行多个分析目标（最高 8x 加速）
 * 2. 智能缓存机制（避免重复分析）
 * 3. 流式结果返回（实时展示）
 * 4. 失败隔离（单个失败不影响整体）
 */

import { callLLM, type ChatMessage, type LLMStreamMetrics } from '../../../../../../services/llmService';
import { LocalDataStore } from '../../../../../../services/localDataStore';
import { StorageService, STORAGE_KEYS, CACHE_PREFIXES } from '../../../../../../services/storageService';
import { ValidationError, BusinessError } from '@common/errors/AppError';
import { configCenter } from '../../../../../../common/config/ConfigCenter';
import type { FullAnalysisReport } from '../config/analysisReportData';
import type { Product } from '../config/sampleData';
import { generateAnalysisPrompt } from '../prompts/analysisPrompts';
import { calculateFullReportConfidence, calculateOverallConfidence } from './confidenceCalculator';
import { Logger } from '../../../../../../services/loggerService';
import { estimateTokenCount } from '../utils/tokenCounter';

const DEFAULT_ANALYSIS_CONCURRENCY = 8;
const MAX_ANALYSIS_CONCURRENCY = 8;
const ANALYSIS_CACHE_VERSION = 'v2';
const ANALYSIS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

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
 * 分析任务结果
 */
interface AnalysisTask {
  targetId: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  result?: unknown;
  error?: string;
  startTime?: number;
  endTime?: number;
  fromCache?: boolean;
  promptChars?: number;
  estimatedInputTokens?: number;
  firstResponseMs?: number;
  streamChunks?: number;
  streamedChars?: number;
}

/**
 * 流式结果更新
 */
export interface ParallelAnalysisResultUpdate {
  targetId: string;
  status: 'success' | 'failed';
  completedCount: number;
  totalCount: number;
  successCount: number;
  failedCount: number;
  currentTasks: string[];
  report: FullAnalysisReport;
  result?: unknown;
  error?: string;
  fromCache?: boolean;
}

/**
 * 并行分析配置
 */
interface ParallelAnalysisConfig {
  maxConcurrency: number; // 最大并发数
  enableCache: boolean; // 是否启用缓存
  streamResults: boolean; // 是否流式返回结果
  failureStrategy: 'abort' | 'continue'; // 失败策略
  onTaskComplete?: (update: ParallelAnalysisResultUpdate) => void;
  onTaskFailed?: (update: ParallelAnalysisResultUpdate) => void;
}

const TARGET_TO_FIELD: Record<string, keyof FullAnalysisReport> = {
  'title-keywords': 'title-keywords',
  'selling-points': 'selling-points',
  'fatal-flaws': 'fatal-flaws',
  'wow-moments': 'wow-moments',
  'hesitation-points': 'hesitation-points',
  'buyer-profile': 'buyer-profile',
  'vocab-gap': 'vocab-gap',
  'promise-reality': 'promise-reality'
};

function buildReportSnapshot(report: Partial<FullAnalysisReport>, targetIds: string[], language: string): FullAnalysisReport {
  const reportWithoutMetadata = { ...report } as Partial<FullAnalysisReport>;
  delete reportWithoutMetadata._metadata;

  const confidence = calculateFullReportConfidence(reportWithoutMetadata as Record<string, unknown>);

  return {
    ...reportWithoutMetadata,
    _metadata: {
      confidence,
      overallConfidence: calculateOverallConfidence(confidence),
      analyzedAt: new Date().toISOString(),
      targetIds: [...targetIds],
      language
    }
  } as FullAnalysisReport;
}

function appendTaskResultToReport(report: Partial<FullAnalysisReport>, task: AnalysisTask): boolean {
  if (task.status !== 'success' || !task.result) {
    return false;
  }

  const fieldName = TARGET_TO_FIELD[task.targetId];
  if (!fieldName) {
    return false;
  }

  (report as Record<string, unknown>)[fieldName] = task.result;
  return true;
}

function normalizeMaxConcurrency(value: number, taskCount: number): number {
  const requested = Number.isFinite(value) ? Math.floor(value) : DEFAULT_ANALYSIS_CONCURRENCY;
  return Math.max(1, Math.min(requested, MAX_ANALYSIS_CONCURRENCY, Math.max(1, taskCount)));
}

/**
 * 缓存键生成
 */
export function generateCacheKey(targetId: string, product: Product, language: string): string {
  const productHash = `${product.asin}_${product.productTitle?.substring(0, 50)}_${product.customer_reviews?.length || 0}`;
  return `${CACHE_PREFIXES.AI_ANALYSIS}${ANALYSIS_CACHE_VERSION}:${targetId}:${productHash}:${language}`;
}

/**
 * 从缓存获取结果
 */
export async function getCachedResult(cacheKey: string): Promise<unknown | null> {
  try {
    const parsedCache = await LocalDataStore.get<{ data: unknown; timestamp: number }>(cacheKey, null);
    if (!parsedCache) {
      const legacyKey = cacheKey.replace(CACHE_PREFIXES.AI_ANALYSIS, 'ai_analysis_').replace(/:/g, '_');
      const legacyCached = StorageService.getRaw(legacyKey);
      if (!legacyCached) return null;
      const legacyParsed = JSON.parse(legacyCached);
      if (legacyParsed && typeof legacyParsed === 'object' && 'timestamp' in legacyParsed) {
        const age = Date.now() - (legacyParsed.timestamp as number);
        if (age < ANALYSIS_CACHE_TTL_MS) {
          Logger.debug(`[并行分析] 旧缓存命中: ${legacyKey}`);
          return (legacyParsed as { data: unknown }).data;
        }
      }
      StorageService.remove(legacyKey);
      return null;
    }

    if (parsedCache && typeof parsedCache === 'object' && 'timestamp' in parsedCache) {
      const age = Date.now() - (parsedCache.timestamp as number);
      // 缓存有效期：24小时
      if (age < ANALYSIS_CACHE_TTL_MS) {
        Logger.debug(`[并行分析] 缓存命中: ${cacheKey}`);
        return (parsedCache as { data: unknown }).data;
      }
    }
  } catch (error) {
    Logger.warn(`[并行分析] 缓存读取失败:`, error);
  }
  return null;
}

/**
 * 保存结果到缓存
 */
export async function setCachedResult(cacheKey: string, result: unknown): Promise<void> {
  try {
    await LocalDataStore.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    }, 'cache');
    Logger.debug(`[并行分析] 结果已缓存: ${cacheKey}`);
  } catch (error) {
    Logger.warn(`[并行分析] 缓存写入失败:`, error);
  }
}

/**
 * 获取 LLM 配置
 */
async function getLLMConfig(): Promise<LLMConfig> {
  const activeProvider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER) as string | null;

  if (!activeProvider || typeof activeProvider !== 'string') {
    throw new ValidationError(
      '请先在系统设置中选择 LLM 提供商',
      'ERR_LLM_PROVIDER_NOT_SELECTED',
      undefined,
      undefined,
      { module: 'ParallelAnalysisService', action: 'getLLMConfig' }
    );
  }

  const config = await StorageService.getLLMConfigWithKey(activeProvider);

  if (!config || !config.apiKey) {
    throw new ValidationError(
      '所选提供商未配置 API Key',
      'ERR_LLM_API_KEY_MISSING',
      undefined,
      undefined,
      { module: 'ParallelAnalysisService', action: 'getLLMConfig', provider: activeProvider }
    );
  }

  const model = config.model || (config.models && config.models[0] ? (typeof config.models[0] === 'string' ? config.models[0] : config.models[0].id) : undefined);

  if (!model) {
    throw new ValidationError(
      '未选择模型，请在设置中同步或选择模型',
      'ERR_LLM_MODEL_NOT_SELECTED',
      undefined,
      undefined,
      { module: 'ParallelAnalysisService', action: 'getLLMConfig', provider: activeProvider }
    );
  }

  return {
    provider: activeProvider,
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    model: model
  };
}

/**
 * 执行单个分析任务
 */
async function executeAnalysisTask(
  task: AnalysisTask,
  product: Product,
  config: LLMConfig,
  language: string,
  enableCache: boolean,
  onFirstResponse?: (task: AnalysisTask, metrics: LLMStreamMetrics) => void
): Promise<void> {
  task.status = 'running';
  task.startTime = Date.now();
  task.fromCache = false;

  try {
    // 检查缓存
    if (enableCache) {
      const cacheKey = generateCacheKey(task.targetId, product, language);
      const cachedResult = await getCachedResult(cacheKey);
      if (cachedResult) {
        task.result = cachedResult;
        task.status = 'success';
        task.endTime = Date.now();
        task.fromCache = true;
        Logger.debug(`[并行分析] ${task.targetId} 使用缓存结果`, {
          durationMs: task.endTime - task.startTime,
          fromCache: true
        });
        return;
      }
    }

    // 生成提示词
    const prompt = generateAnalysisPrompt(task.targetId, product, language);

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
    task.promptChars = prompt.length;
    task.estimatedInputTokens = estimateTokenCount(messages.map(message => message.content).join('\n'));

    // 调用 LLM
    const response = await callLLM(
      messages,
      config.provider,
      config.endpoint,
      config.apiKey,
      config.model,
      {
        temperature: 0.3,
        jsonMode: true,
        stream: true,
        onFirstResponse: (metrics) => {
          task.firstResponseMs = metrics.elapsedMs;
          onFirstResponse?.(task, metrics);
        },
        onStreamUpdate: (update) => {
          task.streamChunks = update.chunkCount;
          task.streamedChars = update.content.length;
        },
        timeout: configCenter.get<number>('llm.analysisTimeout') || 120000,
        retries: configCenter.get<number>('llm.maxRetries') || 2
      }
    );

    // 解析结果
    const result = JSON.parse(response);
    
    // 处理可能的嵌套结构
    let actualResult = result;
    if (result[task.targetId]) {
      actualResult = result[task.targetId];
    }

    task.result = actualResult;
    task.status = 'success';
    task.endTime = Date.now();

    // 保存到缓存
    if (enableCache) {
      const cacheKey = generateCacheKey(task.targetId, product, language);
      await setCachedResult(cacheKey, actualResult);
    }

    Logger.debug(`[并行分析] ${task.targetId} 分析成功`, {
      durationMs: task.endTime - task.startTime,
      promptChars: task.promptChars,
      estimatedInputTokens: task.estimatedInputTokens
    });
  } catch (error) {
    task.status = 'failed';
    task.error = (error as Error).message;
    task.endTime = Date.now();
    Logger.error(`[并行分析] ${task.targetId} 分析失败:`, error);
  }
}

/**
 * 并行执行分析任务（带并发控制）
 */
async function executeTasksWithConcurrency(
  tasks: AnalysisTask[],
  product: Product,
  config: LLMConfig,
  language: string,
  maxConcurrency: number,
  enableCache: boolean,
  onTaskSettled?: (task: AnalysisTask, completedCount: number, totalCount: number, currentTasks: string[]) => void,
  onTaskFirstResponse?: (task: AnalysisTask, completedCount: number, totalCount: number, currentTasks: string[]) => void
): Promise<void> {
  const totalTasks = tasks.length;
  let completedCount = 0;
  const runningTasks = new Set<Promise<void>>();

  for (const task of tasks) {
    while (runningTasks.size >= maxConcurrency) {
      await Promise.race(runningTasks);
    }

    const taskPromise = executeAnalysisTask(task, product, config, language, enableCache, () => {
      const currentRunning = tasks
        .filter(t => t.status === 'running')
        .map(t => t.targetId);

      onTaskFirstResponse?.(task, completedCount, totalTasks, currentRunning);
    })
      .finally(() => {
        runningTasks.delete(taskPromise);
        completedCount++;

        const currentRunning = tasks
          .filter(t => t.status === 'running')
          .map(t => t.targetId);

        onTaskSettled?.(task, completedCount, totalTasks, currentRunning);
      });

    runningTasks.add(taskPromise);
  }

  await Promise.all(runningTasks);
}

/**
 * 并行 AI 分析主函数
 */
export async function runParallelAIAnalysis(
  targetIds: string[],
  product: Product,
  onProgress: (progress: number, step: string) => void,
  language: string = 'en',
  config: Partial<ParallelAnalysisConfig> = {}
): Promise<FullAnalysisReport> {
  const {
    maxConcurrency = DEFAULT_ANALYSIS_CONCURRENCY,
    enableCache = true,
    streamResults = false,
    failureStrategy = 'continue',
    onTaskComplete,
    onTaskFailed
  } = config;

  const startedAt = Date.now();
  const effectiveMaxConcurrency = normalizeMaxConcurrency(maxConcurrency, targetIds.length);

  Logger.debug(`[并行分析] 开始分析`, {
    targets: targetIds.length,
    requestedMaxConcurrency: maxConcurrency,
    effectiveMaxConcurrency
  });

  const llmConfig = await getLLMConfig();
  const tasks: AnalysisTask[] = targetIds.map(targetId => ({
    targetId,
    status: 'pending' as const
  }));

  const report: Partial<FullAnalysisReport> = {};
  const totalTasks = tasks.length;
  let successCount = 0;
  let failedCount = 0;

  await executeTasksWithConcurrency(
    tasks,
    product,
    llmConfig,
    language,
    effectiveMaxConcurrency,
    enableCache,
    (task, completedCount, _totalCount, currentTasks) => {
      if (task.status === 'success') {
        const appended = appendTaskResultToReport(report, task);
        if (appended) {
          successCount++;
          if (streamResults) {
            onTaskComplete?.({
              targetId: task.targetId,
              status: 'success',
              completedCount,
              totalCount: totalTasks,
              successCount,
              failedCount,
              currentTasks,
              report: buildReportSnapshot(report, targetIds, language),
              result: task.result,
              fromCache: task.fromCache
            });
          }
        }
      } else if (task.status === 'failed') {
        failedCount++;
        Logger.warn(`[并行分析] ${task.targetId} 失败: ${task.error}`);

        if (streamResults) {
          onTaskFailed?.({
            targetId: task.targetId,
            status: 'failed',
            completedCount,
            totalCount: totalTasks,
            successCount,
            failedCount,
            currentTasks,
            report: buildReportSnapshot(report, targetIds, language),
            error: task.error,
            fromCache: task.fromCache
          });
        }
      }

      const progress = Math.round((completedCount / totalTasks) * 100);
      const statusText = task.status === 'success'
        ? `已完成 ${task.targetId}`
        : `分析失败 ${task.targetId}`;
      const runningInfo = currentTasks.length > 0
        ? `，正在分析: ${currentTasks.join(', ')}`
        : '';
      onProgress(progress, `${statusText}${runningInfo} (${completedCount}/${totalTasks})`);
    },
    (task, completedCount, _totalCount, currentTasks) => {
      const progress = Math.max(1, Math.round((completedCount / totalTasks) * 100));
      const firstResponseSeconds = task.firstResponseMs
        ? (task.firstResponseMs / 1000).toFixed(1)
        : '0.0';
      const runningInfo = currentTasks.length > 0
        ? `，并行中: ${currentTasks.join(', ')}`
        : '';

      onProgress(
        progress,
        `模型已开始返回 ${task.targetId}，首包 ${firstResponseSeconds}s${runningInfo} (${completedCount}/${totalTasks})`
      );
    }
  );

  const finalReport = buildReportSnapshot(report, targetIds, language);

  if (failedCount > 0 && failureStrategy === 'abort') {
    throw new BusinessError(
      `分析失败: ${failedCount}/${totalTasks} 个目标分析失败`,
      'PARALLEL_ANALYSIS_001',
      { module: 'ParallelAnalysisService', action: 'runParallelAnalysis', failedCount, totalTasks }
    );
  }

  onProgress(100, `分析完成! 成功: ${successCount}, 失败: ${failedCount}`);

  Logger.debug(`[并行分析] 分析完成`, {
    durationMs: Date.now() - startedAt,
    successCount,
    failedCount,
    effectiveMaxConcurrency,
    tasks: tasks.map(task => ({
      targetId: task.targetId,
      status: task.status,
      durationMs: task.startTime && task.endTime ? task.endTime - task.startTime : undefined,
      fromCache: !!task.fromCache,
      promptChars: task.promptChars,
      estimatedInputTokens: task.estimatedInputTokens,
      firstResponseMs: task.firstResponseMs,
      streamChunks: task.streamChunks,
      streamedChars: task.streamedChars
    }))
  });

  return finalReport;
}

/**
 * 清除分析缓存
 */
export function clearAnalysisCache(): void {
  try {
    void clearAnalysisCacheAsync();
  } catch (error) {
    Logger.error('[并行分析] 清除缓存失败:', error);
  }
}

export async function clearAnalysisCacheAsync(): Promise<void> {
  const cacheKeys = await LocalDataStore.keys(CACHE_PREFIXES.AI_ANALYSIS);
  await Promise.all(cacheKeys.map(key => LocalDataStore.remove(key)));
  StorageService.keys()
    .filter(key => key.startsWith('ai_analysis_'))
    .forEach(key => StorageService.remove(key));
  Logger.debug(`[并行分析] 已清除 ${cacheKeys.length} 个缓存项`);
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): { count: number; totalSize: number } {
  try {
    const allKeys = StorageService.keys();
    const cacheKeys = allKeys.filter(key => key.startsWith('ai_analysis_'));
    let totalSize = 0;
    
    cacheKeys.forEach(key => {
      const value = StorageService.getRaw(key);
      if (value) {
        totalSize += value.length;
      }
    });

    return {
      count: cacheKeys.length,
      totalSize: totalSize
    };
  } catch (error) {
    Logger.error('[并行分析] 获取缓存统计失败:', error);
    return { count: 0, totalSize: 0 };
  }
}

export async function getCacheStatsAsync(): Promise<{ count: number; totalSize: number }> {
  try {
    const indexedKeys = await LocalDataStore.keys(CACHE_PREFIXES.AI_ANALYSIS);
    let totalSize = 0;

    for (const key of indexedKeys) {
      const value = await LocalDataStore.get(key, null);
      if (value) {
        totalSize += JSON.stringify(value).length;
      }
    }

    const legacyStats = getCacheStats();
    return {
      count: indexedKeys.length + legacyStats.count,
      totalSize: totalSize + legacyStats.totalSize
    };
  } catch (error) {
    Logger.error('[并行分析] 获取 IndexedDB 缓存统计失败:', error);
    return getCacheStats();
  }
}
