/**
 * Promptlab DNA 提取动作模块
 *
 * 将 autoPopulateDNA、extractSingleField、highlightAutoFilledFields
 * 从 PromptlabPanel.ts 中提取出来，接收显式上下文参数。
 */

import { appStore } from '@/stores/useAppStore';
import { showToast } from '../../../../../../common/ui';
import { Logger } from '../../../../../../services/loggerService';
import { extractProductDNA, canExtractDNA as canExtractDNALegacy } from '../../services/dnaExtractor';
import {
  extractDNAFromDownloadsReport,
  canExtractDNAFromDownloadsReport,
} from '../../services/UniversalDNAExtractor';
import type { PromptlabAlpineContext } from './types';

// ==========================================
// 工具
// ==========================================

/**
 * 检查当前报告是否可以执行 DNA 提取
 */
export function canExtractDNA(): boolean {
  const report = appStore.getState().analysis.analysisReport;
  return canExtractDNAFromDownloadsReport(report as any) || canExtractDNALegacy(report as any);
}

// ==========================================
// 自动填充所有 DNA 字段
// ==========================================

/**
 * 从分析报告中提取产品 DNA 并自动填充所有相关字段
 */
export function autoPopulateDNA(ctx: PromptlabAlpineContext): void {
  Logger.debug('[dnaActions] 🧬 开始自动填充产品 DNA');

  const report = appStore.getState().analysis.analysisReport;
  if (!report) {
    showToast('未检测到分析报告', { type: 'warning' });
    return;
  }

  const unwrappedReport = (report as any).analysisReport ?? report;

  Logger.debug('[dnaActions] 报告结构:', {
    hasWrapper: !!(report as any).analysisReport,
    topKeys: Object.keys(report as any).slice(0, 10),
    unwrappedKeys: Object.keys(unwrappedReport).slice(0, 10),
  });

  const language =
    unwrappedReport._metadata?.language ?? ctx.profile.targetMarket ?? 'zh';

  let dna: any = extractDNAFromDownloadsReport(unwrappedReport, language);
  const isNewExtractor = !!dna;

  if (!dna) {
    Logger.debug('[dnaActions] 新提取器无法提取，尝试旧提取器');
    dna = extractProductDNA(unwrappedReport);
  }

  if (!dna) {
    showToast('无法从报告中提取产品 DNA', { type: 'warning' });
    return;
  }

  Logger.debug('[dnaActions] 使用提取器:', isNewExtractor ? '新 (universal)' : '旧 (legacy)');

  // 确认覆盖
  const hasExistingContent =
    ctx.profile.audience.trim() ||
    ctx.profile.usps.trim() ||
    ctx.profile.specs.trim();

  if (hasExistingContent && !confirm('检测到已有内容，是否覆盖现有的产品 DNA？')) {
    return;
  }

  // 填充基础字段
  ctx.profile.audience = dna.audience ?? '';
  ctx.profile.usps     = dna.usps     ?? '';
  ctx.profile.specs    = dna.specs    ?? '';

  // 新提取器额外填充关键词
  if (isNewExtractor && dna.keywords) {
    if (dna.keywords.core?.length > 0) {
      ctx.profile.keywordsTier1 = dna.keywords.core.join(', ');
    }
    if (dna.keywords.longTail?.length > 0) {
      ctx.profile.keywordsTier2 = dna.keywords.longTail.join(', ');
    }
    Logger.debug('[dnaActions] 已填充关键词:', {
      tier1: ctx.profile.keywordsTier1.slice(0, 50),
      tier2: ctx.profile.keywordsTier2.slice(0, 50),
    });
  }

  // 更新置信度
  ctx.dnaConfidence = {
    audience: Math.round(dna.confidence.audience  * 100),
    usps:     Math.round(dna.confidence.usps      * 100),
    specs:    Math.round(dna.confidence.specs      * 100),
    keywords: Math.round(dna.confidence.keywords   * 100),
    overall:  Math.round(
      ((dna.confidence.audience + dna.confidence.usps + dna.confidence.specs + dna.confidence.keywords) / 4) * 100,
    ),
  };

  ctx.saveState();

  const avg = Math.round(
    ((dna.confidence.audience + dna.confidence.usps + dna.confidence.specs + dna.confidence.keywords) / 4) * 100,
  );
  showToast(
    `✅ DNA 提取成功 (总体置信度: ${avg}%)\n` +
    `受众: ${ctx.dnaConfidence.audience}% | 卖点: ${ctx.dnaConfidence.usps}% | 参数: ${ctx.dnaConfidence.specs}% | 关键词: ${ctx.dnaConfidence.keywords}%`,
    { type: 'success' },
  );

  highlightAutoFilledFields(['lab-audience', 'lab-usps', 'lab-specs']);

  Logger.debug('[dnaActions] ✅ DNA 填充完成:', ctx.dnaConfidence);
}

// ==========================================
// 提取单个字段
// ==========================================

/**
 * 只重新提取并覆盖某一个字段的 DNA
 */
export function extractSingleField(
  ctx: PromptlabAlpineContext,
  fieldName: 'audience' | 'usps' | 'specs',
): void {
  Logger.debug('[dnaActions] 🔄 提取单个字段:', fieldName);

  const report = appStore.getState().analysis.analysisReport;
  if (!report) {
    showToast('未检测到分析报告', { type: 'warning' });
    return;
  }

  const unwrappedReport = (report as any).analysisReport ?? report;
  const language =
    unwrappedReport._metadata?.language ?? ctx.profile.targetMarket ?? 'zh';

  let dna: any = extractDNAFromDownloadsReport(unwrappedReport, language);
  if (!dna) dna = extractProductDNA(unwrappedReport);

  if (!dna) {
    showToast('无法从报告中提取产品 DNA', { type: 'warning' });
    return;
  }

  ctx.profile[fieldName] = dna[fieldName];
  ctx.dnaConfidence[fieldName] = Math.round(dna.confidence[fieldName] * 100);
  ctx.saveState();

  const fieldIdMap: Record<string, string> = {
    audience: 'lab-audience',
    usps:     'lab-usps',
    specs:    'lab-specs',
  };
  highlightAutoFilledFields([fieldIdMap[fieldName]!], 'green');

  const labelMap: Record<string, string> = {
    audience: '目标受众',
    usps:     '核心卖点',
    specs:    '技术参数',
  };
  showToast(
    `✅ 已重新提取${labelMap[fieldName]} (置信度: ${ctx.dnaConfidence[fieldName]}%)`,
    { type: 'success' },
  );

  Logger.debug('[dnaActions] ✅ 单字段提取完成:', {
    field: fieldName,
    confidence: ctx.dnaConfidence[fieldName],
  });
}

// ==========================================
// 视觉反馈
// ==========================================

/**
 * 短暂高亮自动填充的字段（蓝色或绿色边框 + 背景）
 */
export function highlightAutoFilledFields(
  fieldIds: string[],
  color: 'blue' | 'green' = 'blue',
): void {
  const bgClass    = color === 'blue' ? 'bg-blue-50'    : 'bg-green-50';
  const borderClass = color === 'blue' ? 'border-blue-300' : 'border-green-300';

  fieldIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add(bgClass, borderClass);
    setTimeout(() => el.classList.remove(bgClass, borderClass), 2000);
  });
}
