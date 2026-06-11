/**
 * Promptlab DNA 提取动作模块
 *
 * 将 autoPopulateDNA、extractSingleField、highlightAutoFilledFields
 * 从 PromptlabPanel.ts 中提取出来，接收显式上下文参数。
 */

import { appStore } from '@/stores/useAppStore';
import { showToast } from '../../../../../../common/ui';
import { extractProductDNA, canExtractDNA as canExtractDNALegacy } from '../../services/dnaExtractor';
import type { ExtractedDNA } from '../../services/dnaExtractor';
import {
  extractDNAFromDownloadsReport,
  canExtractDNAFromDownloadsReport,
} from '../../services/UniversalDNAExtractor';
import type { ExtendedDNA } from '../../types/extendedDNA';
import type { PromptlabAlpineContext } from './types';
import type { FullAnalysisReport } from '../../ai_analysis/config/analysisReportData';
import { confirmWithModal } from '../../utils/confirmModal';

export type ExtractableFieldName = 'keywordsTier1' | 'keywordsTier2' | 'negative' | 'audience' | 'usps' | 'specs';

interface NormalizedDnaResult {
  fields: Record<ExtractableFieldName, string>;
  confidence: {
    audience: number;
    usps: number;
    specs: number;
    keywords: number;
    negative: number;
    overall: number;
  };
}

const FIELD_CONFIG: Record<ExtractableFieldName, {
  inputId: string;
  label: string;
  apply: (ctx: PromptlabAlpineContext, normalized: NormalizedDnaResult) => void;
  getConfidence: (ctx: PromptlabAlpineContext) => number;
}> = {
  keywordsTier1: {
    inputId: 'lab-keywords-tier1',
    label: 'Tier 1 核心大词',
    apply: (ctx, normalized) => {
      ctx.profile.keywordsTier1 = normalized.fields.keywordsTier1;
      ctx.dnaConfidence.keywords = normalized.confidence.keywords;
    },
    getConfidence: (ctx) => ctx.dnaConfidence.keywords,
  },
  keywordsTier2: {
    inputId: 'lab-keywords-tier2',
    label: 'Tier 2 长尾词',
    apply: (ctx, normalized) => {
      ctx.profile.keywordsTier2 = normalized.fields.keywordsTier2;
      ctx.dnaConfidence.keywords = normalized.confidence.keywords;
    },
    getConfidence: (ctx) => ctx.dnaConfidence.keywords,
  },
  negative: {
    inputId: 'negative-keywords',
    label: '限制词',
    apply: (ctx, normalized) => {
      ctx.profile.negative = normalized.fields.negative;
      ctx.dnaConfidence.negative = normalized.confidence.negative;
    },
    getConfidence: (ctx) => ctx.dnaConfidence.negative,
  },
  audience: {
    inputId: 'lab-audience',
    label: '目标受众',
    apply: (ctx, normalized) => {
      ctx.profile.audience = normalized.fields.audience;
      ctx.dnaConfidence.audience = normalized.confidence.audience;
    },
    getConfidence: (ctx) => ctx.dnaConfidence.audience,
  },
  usps: {
    inputId: 'lab-usps',
    label: '核心卖点',
    apply: (ctx, normalized) => {
      ctx.profile.usps = normalized.fields.usps;
      ctx.dnaConfidence.usps = normalized.confidence.usps;
    },
    getConfidence: (ctx) => ctx.dnaConfidence.usps,
  },
  specs: {
    inputId: 'lab-specs',
    label: '技术参数',
    apply: (ctx, normalized) => {
      ctx.profile.specs = normalized.fields.specs;
      ctx.dnaConfidence.specs = normalized.confidence.specs;
    },
    getConfidence: (ctx) => ctx.dnaConfidence.specs,
  },
};

const AUTO_POPULATE_CONFIDENCE_THRESHOLD = 70;

const FIELD_CONFIDENCE_KEY_MAP: Record<ExtractableFieldName, keyof NormalizedDnaResult['confidence']> = {
  keywordsTier1: 'keywords',
  keywordsTier2: 'keywords',
  negative: 'negative',
  audience: 'audience',
  usps: 'usps',
  specs: 'specs',
};

function getNormalizedFieldConfidence(normalized: NormalizedDnaResult, fieldName: ExtractableFieldName): number {
  return normalized.confidence[FIELD_CONFIDENCE_KEY_MAP[fieldName]];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function getStringArrayField(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/**
 * 检查当前报告是否可以执行 DNA 提取
 */
export function canExtractDNA(): boolean {
  const report = appStore.getState().analysis.analysisReport;
  return canExtractDNAFromDownloadsReport(report) || canExtractDNALegacy(report as FullAnalysisReport | null);
}

function getRawDna(ctx: PromptlabAlpineContext): ExtendedDNA | ExtractedDNA | null {
  const report = appStore.getState().analysis.analysisReport;
  if (!report) {
    return null;
  }

  const reportRecord = report as Record<string, unknown>;
  const unwrappedReport = reportRecord.analysisReport ?? report;
  const unwrappedRecord = isRecord(unwrappedReport) ? unwrappedReport : null;
  const metadata = isRecord(unwrappedRecord?._metadata) ? unwrappedRecord._metadata : null;
  const metadataLanguage = metadata?.language;
  const language =
    typeof metadataLanguage === 'string' ? metadataLanguage : ctx.profile.targetMarket ?? 'zh';

  const extracted = extractDNAFromDownloadsReport(unwrappedReport, language);
  if (extracted) {
    return extracted;
  }

  const legacy = extractProductDNA(unwrappedReport as FullAnalysisReport | null);
  return legacy;
}

function normalizeConfidenceValue(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function normalizeDnaResult(dna: ExtendedDNA | ExtractedDNA): NormalizedDnaResult {
  const dnaRecord = dna as unknown as Record<string, unknown>;
  const keywords = isRecord(dnaRecord.keywords) ? dnaRecord.keywords : {};
  const confidence = isRecord(dnaRecord.confidence) ? dnaRecord.confidence : {};

  const fields: Record<ExtractableFieldName, string> = {
    keywordsTier1: getStringArrayField(keywords, 'core').filter(Boolean).join(', '),
    keywordsTier2: getStringArrayField(keywords, 'longTail').filter(Boolean).join(', '),
    negative: getStringArrayField(dnaRecord, 'restrictedWords').filter(Boolean).join(', '),
    audience: typeof dnaRecord.audience === 'string' ? dnaRecord.audience : '',
    usps: typeof dnaRecord.usps === 'string' ? dnaRecord.usps : '',
    specs: typeof dnaRecord.specs === 'string' ? dnaRecord.specs : '',
  };

  const normalizedConfidence = {
    audience: normalizeConfidenceValue(confidence.audience),
    usps: normalizeConfidenceValue(confidence.usps),
    specs: normalizeConfidenceValue(confidence.specs),
    keywords: normalizeConfidenceValue(confidence.keywords),
    negative: normalizeConfidenceValue(confidence.restrictedWords),
    overall: 0,
  };

  const overallCandidates = Object.values(normalizedConfidence).filter(value => value > 0);
  normalizedConfidence.overall = overallCandidates.length > 0
    ? Math.round(overallCandidates.reduce((sum, value) => sum + value, 0) / overallCandidates.length)
    : 0;

  return {
    fields,
    confidence: normalizedConfidence,
  };
}

function hasExistingDnaContent(ctx: PromptlabAlpineContext): boolean {
  return [
    ctx.profile.keywordsTier1,
    ctx.profile.keywordsTier2,
    ctx.profile.negative,
    ctx.profile.audience,
    ctx.profile.usps,
    ctx.profile.specs,
  ].some(value => value.trim().length > 0);
}

/**
 * 从分析报告中提取产品 DNA，并仅自动填充置信度达标的字段
 */
export async function autoPopulateDNA(ctx: PromptlabAlpineContext): Promise<void> {
  const dna = getRawDna(ctx);
  if (!dna) {
    showToast('未检测到分析报告或无法提取产品 DNA', { type: 'warning' });
    return;
  }

  const normalized = normalizeDnaResult(dna);
  const fieldEntries = Object.entries(FIELD_CONFIG) as Array<[ExtractableFieldName, typeof FIELD_CONFIG[ExtractableFieldName]]>;

  const fillableFields = fieldEntries.filter(([fieldName]) => {
    const value = normalized.fields[fieldName].trim();
    const confidence = getNormalizedFieldConfidence(normalized, fieldName);
    return value.length > 0 && confidence >= AUTO_POPULATE_CONFIDENCE_THRESHOLD;
  });

  const blockedFields = fieldEntries.filter(([fieldName]) => {
    const value = normalized.fields[fieldName].trim();
    const confidence = getNormalizedFieldConfidence(normalized, fieldName);
    return value.length > 0 && confidence < AUTO_POPULATE_CONFIDENCE_THRESHOLD;
  });

  if (fillableFields.length === 0) {
    showToast(
      `当前可提取字段置信度均低于 ${AUTO_POPULATE_CONFIDENCE_THRESHOLD}% ，请使用“仅重新提取此字段”逐项填充`,
      { type: 'warning' },
    );
    return;
  }

  if (hasExistingDnaContent(ctx)) {
    const confirmed = await confirmWithModal(
      '覆盖产品 DNA',
      '检测到已有内容，是否覆盖现有的高置信度产品 DNA 字段？',
      '',
      '覆盖字段',
    );

    if (!confirmed) return;
  }

  fillableFields.forEach(([, config]) => {
    config.apply(ctx, normalized);
  });

  ctx.dnaConfidence = {
    audience: normalized.confidence.audience,
    usps: normalized.confidence.usps,
    specs: normalized.confidence.specs,
    keywords: normalized.confidence.keywords,
    negative: normalized.confidence.negative,
    overall: normalized.confidence.overall,
  };

  ctx.saveState();

  const filledLabels = fillableFields.map(([, config]) => config.label).join('、');
  const blockedLabels = blockedFields.map(([, config]) => config.label).join('、');
  const blockedHint = blockedLabels
    ? `\n以下字段置信度低于 ${AUTO_POPULATE_CONFIDENCE_THRESHOLD}% ，请使用“仅重新提取此字段”：${blockedLabels}`
    : '';

  showToast(
    `✅ 已从报告填充高置信度 DNA 字段：${filledLabels}${blockedHint}`,
    { type: 'success' },
  );

  highlightAutoFilledFields(fillableFields.map(([, config]) => config.inputId));
}

/**
 * 只重新提取并覆盖某一个字段的 DNA
 */
export function extractSingleField(
  ctx: PromptlabAlpineContext,
  fieldName: ExtractableFieldName,
): void {
  const dna = getRawDna(ctx);
  if (!dna) {
    showToast('未检测到分析报告或无法提取产品 DNA', { type: 'warning' });
    return;
  }

  const normalized = normalizeDnaResult(dna);
  const config = FIELD_CONFIG[fieldName];

  config.apply(ctx, normalized);
  ctx.dnaConfidence.overall = normalized.confidence.overall;
  ctx.saveState();

  highlightAutoFilledFields([config.inputId], 'green');
  showToast(
    `✅ 已重新提取${config.label} (置信度: ${config.getConfidence(ctx)}%)`,
    { type: 'success' },
  );
}

/**
 * 短暂高亮自动填充的字段（蓝色或绿色边框 + 背景）
 */
export function highlightAutoFilledFields(
  fieldIds: string[],
  color: 'blue' | 'green' = 'blue',
): void {
  const bgClass = color === 'blue' ? 'bg-blue-50' : 'bg-green-50';
  const borderClass = color === 'blue' ? 'border-blue-300' : 'border-green-300';

  fieldIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add(bgClass, borderClass);
    setTimeout(() => el.classList.remove(bgClass, borderClass), 2000);
  });
}
