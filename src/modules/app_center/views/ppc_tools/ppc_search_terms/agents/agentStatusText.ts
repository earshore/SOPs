import type { PpcSearchTermsAgentAnalysisResult } from '../services/llmAnalysisService';

export function formatAgentStatus(result: PpcSearchTermsAgentAnalysisResult): string {
  const modelText =
    result.summary.modelRows > 0 ? `模型语义复核 ${result.summary.modelRows} 行` : '无需模型复核';
  const cacheText =
    result.summary.cachedBatches && result.summary.totalBatches
      ? `，缓存命中 ${result.summary.cachedBatches}/${result.summary.totalBatches} 批`
      : '';
  const skippedText =
    result.summary.skippedModelRows > 0
      ? `，已按优先级跳过 ${result.summary.skippedModelRows} 行低影响候选`
      : '';
  return `PPC Agent 完成：本地工具全量处理 ${result.summary.totalRows} 行，${modelText}${cacheText}${skippedText}`;
}

export function formatAgentToast(result: PpcSearchTermsAgentAnalysisResult): string {
  if (result.summary.modelRows === 0) {
    return `本地工具已完成 ${result.summary.totalRows} 行分析`;
  }

  const cacheText =
    result.summary.cachedBatches && result.summary.totalBatches
      ? `，缓存 ${result.summary.cachedBatches}/${result.summary.totalBatches} 批`
      : '';
  return `本地全量 ${result.summary.totalRows} 行，模型复核 ${result.summary.modelRows} 行${cacheText}`;
}
