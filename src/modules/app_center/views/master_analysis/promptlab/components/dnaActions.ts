/**
 * Promptlab DNA 提取动作模块
 *
 * 将 autoPopulateDNA、extractSingleField、highlightAutoFilledFields
 * 从 PromptlabPanel.ts 中提取出来，接收显式上下文参数。
 */

import { appStore } from '@/stores/useAppStore';
import SITE_CONFIGS from '@/common/constants/constants';
import { showToast } from '@/common/ui';
import {
  extractProductDNA,
  canExtractDNA as canExtractDNALegacy,
} from '../../services/dnaExtractor';
import type { ExtractedDNA } from '../../services/dnaExtractor';
import {
  extractDNAFromDownloadsReport,
  canExtractDNAFromDownloadsReport,
} from '../../services/UniversalDNAExtractor';
import { getReportFingerprint, unwrapReportPayload } from '../../services/reportIdentity';
import type { ExtendedDNA } from '../../types/extendedDNA';
import type {
  DnaExtractionFieldName,
  DnaExtractionFieldSummary,
  DnaExtractionStatus,
  DnaExtractionSummary,
  PromptlabAlpineContext,
} from './types';
import type { FullAnalysisReport } from '../../ai_analysis/config/analysisReportData';
import { confirmWithModal } from '../../utils/confirmModal';

export type ExtractableFieldName = DnaExtractionFieldName;

interface NormalizedDnaResult {
  fields: Record<ExtractableFieldName, string>;
  sources: Record<ExtractableFieldName, string[]>;
  reportType: string;
  confidence: {
    audience: number;
    usps: number;
    specs: number;
    keywords: number;
    keywordsTier1: number;
    keywordsTier2: number;
    negative: number;
    overall: number;
  };
}

const FIELD_CONFIG: Record<
  ExtractableFieldName,
  {
    inputId: string;
    label: string;
    apply: (ctx: PromptlabAlpineContext, normalized: NormalizedDnaResult) => void;
  }
> = {
  keywordsTier1: {
    inputId: 'lab-keywords-tier1',
    label: 'Tier 1 核心大词',
    apply: (ctx, normalized) => {
      ctx.profile.keywordsTier1 = normalized.fields.keywordsTier1;
      ctx.dnaConfidence.keywords = normalized.confidence.keywords;
      ctx.dnaConfidence.keywordsTier1 = normalized.confidence.keywordsTier1;
    },
  },
  keywordsTier2: {
    inputId: 'lab-keywords-tier2',
    label: 'Tier 2 长尾词',
    apply: (ctx, normalized) => {
      ctx.profile.keywordsTier2 = normalized.fields.keywordsTier2;
      ctx.dnaConfidence.keywords = normalized.confidence.keywords;
      ctx.dnaConfidence.keywordsTier2 = normalized.confidence.keywordsTier2;
    },
  },
  negative: {
    inputId: 'negative-keywords',
    label: '限制词',
    apply: (ctx, normalized) => {
      ctx.profile.negative = normalized.fields.negative;
      ctx.dnaConfidence.negative = normalized.confidence.negative;
    },
  },
  audience: {
    inputId: 'lab-audience',
    label: '目标受众',
    apply: (ctx, normalized) => {
      ctx.profile.audience = normalized.fields.audience;
      ctx.dnaConfidence.audience = normalized.confidence.audience;
    },
  },
  usps: {
    inputId: 'lab-usps',
    label: '核心卖点',
    apply: (ctx, normalized) => {
      ctx.profile.usps = normalized.fields.usps;
      ctx.dnaConfidence.usps = normalized.confidence.usps;
    },
  },
  specs: {
    inputId: 'lab-specs',
    label: '技术参数',
    apply: (ctx, normalized) => {
      ctx.profile.specs = normalized.fields.specs;
      ctx.profile.specsAuthority = 'report-derived';
      ctx.dnaConfidence.specs = normalized.confidence.specs;
    },
  },
};

const AUTO_POPULATE_CONFIDENCE_THRESHOLD = 70;

const FIELD_CONFIDENCE_KEY_MAP: Record<
  ExtractableFieldName,
  keyof NormalizedDnaResult['confidence']
> = {
  keywordsTier1: 'keywordsTier1',
  keywordsTier2: 'keywordsTier2',
  negative: 'negative',
  audience: 'audience',
  usps: 'usps',
  specs: 'specs',
};

const FIELD_SOURCE_KEY_MAP: Record<ExtractableFieldName, string> = {
  keywordsTier1: 'keywordsCore',
  keywordsTier2: 'keywordsLongTail',
  negative: 'restrictedWords',
  audience: 'audience',
  usps: 'usps',
  specs: 'specs',
};

const AGGREGATE_SOURCE_HINTS: Record<ExtractableFieldName, string[]> = {
  keywordsTier1: [
    'primary_keywords',
    'keyword_clusters.core',
    'keywordClusters.core',
    'attribute',
    'title-keywords',
  ],
  keywordsTier2: [
    'secondary_keywords',
    'long_tail',
    'longTail',
    'native_phrasing',
    'title-keywords',
  ],
  negative: ['removed_modifiers', 'removed_brand_terms', 'banned', 'compliance'],
  audience: [
    'buyer-profile',
    'user_profile',
    'userProfile',
    'competitor_insights.user_profile',
    'use_cases',
  ],
  usps: ['selling-points', 'feature_points', 'coreFeatures', 'differentiation_angles', 'strengths'],
  specs: ['secondary_keywords', 'bullet_analysis', 'attribute', 'coreFeatures', 'title-keywords'],
};

const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
  english: 'en',
  german: 'de',
  french: 'fr',
  italian: 'it',
  spanish: 'es',
  japanese: 'ja',
  chinese: 'zh',
  dutch: 'nl',
  swedish: 'sv',
  polish: 'pl',
  portuguese: 'pt',
  turkish: 'tr',
  arabic: 'ar',
};

type SiteConfigLike = {
  locale?: string;
  name?: string;
  domain?: string;
};

const SITE_CONFIG_RECORD = SITE_CONFIGS as Record<string, SiteConfigLike>;

const SOURCE_LABELS: Record<string, string> = {
  'buyer-profile': '买家画像',
  'buyer-profile.demographics': '买家画像-人群特征',
  'buyer-profile.buyer_types': '买家画像-买家类型',
  'buyer-profile.purchase_motivations': '买家画像-购买动机',
  'selling-points': '卖点分析',
  'selling-points.function_scene_matrix.functions': '卖点分析-功能场景',
  'selling-points.overall_strategy.primary_differentiation': '卖点分析-核心差异点',
  'selling-points.bullet_analysis': '卖点分析-Bullet 解析',
  'title-keywords': '标题关键词分析',
  'title-keywords.primary_keywords': '标题关键词-核心词',
  'title-keywords.secondary_keywords': '标题关键词-属性/长尾词',
  'title-keywords.scene_keywords': '标题关键词-场景词',
  'title-keywords.removed_modifiers': '标题关键词-移除修饰词',
  'title-keywords.removed_brand_terms': '标题关键词-移除品牌词',
  'keyword_clusters.core': '关键词簇-核心词',
  'keyword_clusters.long_tail': '关键词簇-长尾词',
  'keyword_clusters.attribute': '关键词簇-属性词',
  'keyword_clusters.banned': '关键词簇-禁用词',
  keywordClusters: '关键词簇',
  'keywordClusters.core': '关键词簇-核心词',
  'keywordClusters.longTail': '关键词簇-长尾词',
  'keywordClusters.intent': '关键词簇-意图词',
  intents: '搜索意图',
  'competitor_insights.user_profile': '竞品洞察-用户画像',
  'competitor_insights.strengths': '竞品洞察-优势卖点',
  feature_points: '竞品报告-功能点',
  complianceRisks: '合规风险',
  'compliance_risks.examples': '合规风险-示例词',
  coreFeatures: '产品概览-核心功能',
  strengths: '产品概览-优势',
  weaknesses: '产品概览-痛点',
  differentiationAngles: '产品概览-差异化角度',
  'user_profile.decision_drivers': '用户画像-决策驱动',
  'user_profile.demographics.age_ranges': '用户画像-年龄段',
  'user_profile.demographics.household': '用户画像-家庭特征',
  'user_profile.scenarios': '用户画像-使用场景',
  'user_profile.pain_points': '用户画像-痛点',
  high_frequency_phrases: '高频短语',
  'high_frequency_phrases.attribute': '高频短语-属性词',
  'high_frequency_phrases.use_cases': '高频短语-使用场景',
  'native_voice.native_phrasing': '本土表达-自然说法',
  'native_voice.emotional_hook': '本土表达-情绪钩子',
  'pain_point_gaps.differentiation_angles': '痛点缺口-差异化角度',
  'pain_point_gaps.top_quality_issues': '痛点缺口-质量问题',
  'pain_point_gaps.unmet_need': '痛点缺口-未满足需求',
};

function getNormalizedFieldConfidence(
  normalized: NormalizedDnaResult,
  fieldName: ExtractableFieldName
): number {
  return normalized.confidence[FIELD_CONFIDENCE_KEY_MAP[fieldName]];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function getStringArrayField(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function getSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? '分析报告字段';
}

function getSourceText(sources: string[]): string {
  if (sources.length === 0) {
    return '未识别来源';
  }

  return sources.slice(0, 2).map(getSourceLabel).join('、');
}

function getStoredAnalysisReport(): unknown {
  return unwrapReportPayload(appStore.getState().analysis.analysisReport);
}

function normalizeLanguageCode(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.toLowerCase().replace('_', '-');
  const siteConfig =
    SITE_CONFIG_RECORD[trimmed.toUpperCase()] ||
    Object.values(SITE_CONFIG_RECORD).find(config => {
      return (
        config.name?.toLowerCase() === normalized ||
        config.domain?.toLowerCase() === normalized ||
        config.locale?.toLowerCase().replace('_', '-') === normalized
      );
    });

  if (siteConfig?.locale) {
    return siteConfig.locale.split('_')[0]?.toLowerCase() || null;
  }

  const directLocaleMatch = normalized.match(/^([a-z]{2})(?:-[a-z]{2})?$/);
  if (directLocaleMatch) {
    return directLocaleMatch[1] ?? null;
  }

  return LANGUAGE_NAME_TO_CODE[normalized] ?? null;
}

function resolveExtractionLanguage(
  ctx: PromptlabAlpineContext,
  report: unknown,
  unwrappedReport: unknown
): string {
  const reportRecord = isRecord(report) ? report : {};
  const rootMetadata = isRecord(reportRecord.metadata) ? reportRecord.metadata : {};
  const unwrappedRecord = isRecord(unwrappedReport) ? unwrappedReport : {};
  const analysisMetadata = isRecord(unwrappedRecord._metadata) ? unwrappedRecord._metadata : {};

  const candidates = [
    analysisMetadata.language,
    analysisMetadata.targetMarket,
    rootMetadata.language,
    rootMetadata.marketplace,
    reportRecord.language,
    reportRecord.marketplace,
    reportRecord.targetMarket,
    ctx.profile.targetMarket,
  ];

  for (const candidate of candidates) {
    const languageCode = normalizeLanguageCode(candidate);
    if (languageCode) {
      return languageCode;
    }
  }

  return 'zh';
}

/**
 * 检查当前报告是否可以执行 DNA 提取
 */
export function canExtractDNA(): boolean {
  const report = getStoredAnalysisReport();
  return (
    canExtractDNAFromDownloadsReport(report) ||
    canExtractDNALegacy(report as FullAnalysisReport | null)
  );
}

function getRawDna(ctx: PromptlabAlpineContext): ExtendedDNA | ExtractedDNA | null {
  const report = appStore.getState().analysis.analysisReport;
  if (!report) {
    return null;
  }

  const unwrappedReport = getStoredAnalysisReport();
  const language = resolveExtractionLanguage(ctx, report, unwrappedReport);

  const extracted = extractDNAFromDownloadsReport(unwrappedReport, language);
  if (extracted) {
    return extracted;
  }

  const legacy = extractProductDNA(unwrappedReport as FullAnalysisReport | null);
  return legacy;
}

function bindProfileToCurrentReport(ctx: PromptlabAlpineContext): void {
  const fingerprint = getReportFingerprint(appStore.getState().analysis.analysisReport);
  if (fingerprint) {
    ctx.profile.reportFingerprint = fingerprint;
  }
}

function normalizeConfidenceValue(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  const percent = value > 1 ? value : value * 100;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

function normalizeDnaFields(
  dnaRecord: Record<string, unknown>,
  keywords: Record<string, unknown>
): Record<ExtractableFieldName, string> {
  return {
    keywordsTier1: getStringArrayField(keywords, 'core').filter(Boolean).join(', '),
    keywordsTier2: getStringArrayField(keywords, 'longTail').filter(Boolean).join(', '),
    negative: getStringArrayField(dnaRecord, 'restrictedWords').filter(Boolean).join(', '),
    audience: typeof dnaRecord.audience === 'string' ? dnaRecord.audience : '',
    usps: typeof dnaRecord.usps === 'string' ? dnaRecord.usps : '',
    specs: typeof dnaRecord.specs === 'string' ? dnaRecord.specs : '',
  };
}

function averagePositive(values: number[]): number {
  const candidates = values.filter(value => value > 0);
  return candidates.length > 0
    ? Math.round(candidates.reduce((sum, value) => sum + value, 0) / candidates.length)
    : 0;
}

function normalizeKeywordConfidence(
  fieldValue: string,
  fieldConfidence: unknown,
  fallbackConfidence: number
): number {
  if (!fieldValue) {
    return 0;
  }

  return normalizeConfidenceValue(fieldConfidence) || fallbackConfidence;
}

function normalizeDnaConfidence(
  fields: Record<ExtractableFieldName, string>,
  confidence: Record<string, unknown>
): NormalizedDnaResult['confidence'] {
  const fallbackKeywordConfidence = normalizeConfidenceValue(confidence.keywords);
  const keywordsTier1Confidence = normalizeKeywordConfidence(
    fields.keywordsTier1,
    confidence.keywordsCore,
    fallbackKeywordConfidence
  );
  const keywordsTier2Confidence = normalizeKeywordConfidence(
    fields.keywordsTier2,
    confidence.keywordsLongTail,
    fallbackKeywordConfidence
  );

  const normalizedConfidence: NormalizedDnaResult['confidence'] = {
    audience: normalizeConfidenceValue(confidence.audience),
    usps: normalizeConfidenceValue(confidence.usps),
    specs: normalizeConfidenceValue(confidence.specs),
    keywords:
      averagePositive([keywordsTier1Confidence, keywordsTier2Confidence]) ||
      fallbackKeywordConfidence,
    keywordsTier1: keywordsTier1Confidence,
    keywordsTier2: keywordsTier2Confidence,
    negative: normalizeConfidenceValue(confidence.restrictedWords),
    overall: 0,
  };

  normalizedConfidence.overall = averagePositive([
    normalizedConfidence.audience,
    normalizedConfidence.usps,
    normalizedConfidence.specs,
    normalizedConfidence.keywordsTier1,
    normalizedConfidence.keywordsTier2,
    normalizedConfidence.negative,
  ]);

  return normalizedConfidence;
}

function getAggregateSourceFallback(
  metadata: Record<string, unknown>,
  fieldName: ExtractableFieldName
): string[] {
  const sourceFields = getStringArrayField(metadata, 'sourceFields');
  if (sourceFields.length === 0) {
    return [];
  }

  const hints = AGGREGATE_SOURCE_HINTS[fieldName];
  return sourceFields.filter(source => {
    return hints.some(hint => source.includes(hint));
  });
}

function getDnaFieldSources(
  metadata: Record<string, unknown>,
  fieldName: ExtractableFieldName
): string[] {
  const fieldSources = isRecord(metadata.fieldSources) ? metadata.fieldSources : {};
  const sourceKey = FIELD_SOURCE_KEY_MAP[fieldName];
  const sources = getStringArrayField(fieldSources, sourceKey);
  return sources.length > 0 ? sources : getAggregateSourceFallback(metadata, fieldName);
}

function normalizeDnaSources(
  dnaRecord: Record<string, unknown>
): Record<ExtractableFieldName, string[]> {
  const metadata = isRecord(dnaRecord.metadata) ? dnaRecord.metadata : {};
  return {
    keywordsTier1: getDnaFieldSources(metadata, 'keywordsTier1'),
    keywordsTier2: getDnaFieldSources(metadata, 'keywordsTier2'),
    negative: getDnaFieldSources(metadata, 'negative'),
    audience: getDnaFieldSources(metadata, 'audience'),
    usps: getDnaFieldSources(metadata, 'usps'),
    specs: getDnaFieldSources(metadata, 'specs'),
  };
}

function getDnaReportType(dnaRecord: Record<string, unknown>): string {
  const metadata = isRecord(dnaRecord.metadata) ? dnaRecord.metadata : {};
  return typeof metadata.reportType === 'string' ? metadata.reportType : 'legacy';
}

function normalizeDnaResult(dna: ExtendedDNA | ExtractedDNA): NormalizedDnaResult {
  const dnaRecord = dna as unknown as Record<string, unknown>;
  const keywords = isRecord(dnaRecord.keywords) ? dnaRecord.keywords : {};
  const confidence = isRecord(dnaRecord.confidence) ? dnaRecord.confidence : {};
  const fields = normalizeDnaFields(dnaRecord, keywords);

  return {
    fields,
    sources: normalizeDnaSources(dnaRecord),
    reportType: getDnaReportType(dnaRecord),
    confidence: normalizeDnaConfidence(fields, confidence),
  };
}

function getDnaExtractionStatus(hasValue: boolean, confidence: number): DnaExtractionStatus {
  if (!hasValue) {
    return 'empty';
  }

  return confidence >= AUTO_POPULATE_CONFIDENCE_THRESHOLD ? 'high' : 'low';
}

function createFieldSummary(
  normalized: NormalizedDnaResult,
  fieldName: ExtractableFieldName
): DnaExtractionFieldSummary {
  const value = normalized.fields[fieldName].trim();
  const confidence = getNormalizedFieldConfidence(normalized, fieldName);
  const hasValue = value.length > 0;

  return {
    field: fieldName,
    label: FIELD_CONFIG[fieldName].label,
    confidence,
    status: getDnaExtractionStatus(hasValue, confidence),
    hasValue,
    source: getSourceText(normalized.sources[fieldName]),
  };
}

function createDnaExtractionSummary(normalized: NormalizedDnaResult): DnaExtractionSummary {
  const fieldEntries = Object.keys(FIELD_CONFIG) as ExtractableFieldName[];
  const fields = fieldEntries.map(fieldName => createFieldSummary(normalized, fieldName));

  return {
    totalFields: fields.length,
    extractableFields: fields.filter(field => field.hasValue).length,
    highConfidenceFields: fields.filter(field => field.status === 'high').length,
    lowConfidenceFields: fields.filter(field => field.status === 'low').length,
    emptyFields: fields.filter(field => field.status === 'empty').length,
    overallConfidence: normalized.confidence.overall,
    reportType: normalized.reportType,
    fields,
    updatedAt: new Date().toISOString(),
  };
}

export function refreshDnaExtractionSummary(ctx: PromptlabAlpineContext): void {
  const dna = getRawDna(ctx);
  ctx.dnaExtractionSummary = dna ? createDnaExtractionSummary(normalizeDnaResult(dna)) : null;
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
    ctx.dnaExtractionSummary = null;
    showToast('未检测到分析报告或无法提取产品 DNA', { type: 'warning' });
    return;
  }

  const normalized = normalizeDnaResult(dna);
  ctx.dnaExtractionSummary = createDnaExtractionSummary(normalized);
  const fieldEntries = Object.entries(FIELD_CONFIG) as Array<
    [ExtractableFieldName, (typeof FIELD_CONFIG)[ExtractableFieldName]]
  >;

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
      { type: 'warning' }
    );
    return;
  }

  if (hasExistingDnaContent(ctx)) {
    const confirmed = await confirmWithModal(
      '覆盖产品 DNA',
      '检测到已有内容，是否覆盖现有的高置信度产品 DNA 字段？',
      '',
      '覆盖字段'
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
    keywordsTier1: normalized.confidence.keywordsTier1,
    keywordsTier2: normalized.confidence.keywordsTier2,
    negative: normalized.confidence.negative,
    overall: normalized.confidence.overall,
  };

  bindProfileToCurrentReport(ctx);
  ctx.saveState();

  const filledLabels = fillableFields.map(([, config]) => config.label).join('、');
  const blockedLabels = blockedFields.map(([, config]) => config.label).join('、');
  const blockedHint = blockedLabels
    ? `\n以下字段置信度低于 ${AUTO_POPULATE_CONFIDENCE_THRESHOLD}% ，请使用“仅重新提取此字段”：${blockedLabels}`
    : '';

  showToast(`已从报告填充高置信度 DNA 字段：${filledLabels}${blockedHint}`, { type: 'success' });

  highlightAutoFilledFields(fillableFields.map(([, config]) => config.inputId));
}

/**
 * 只重新提取并覆盖某一个字段的 DNA
 */
export async function extractSingleField(
  ctx: PromptlabAlpineContext,
  fieldName: ExtractableFieldName
): Promise<void> {
  const dna = getRawDna(ctx);
  if (!dna) {
    ctx.dnaExtractionSummary = null;
    showToast('未检测到分析报告或无法提取产品 DNA', { type: 'warning' });
    return;
  }

  const normalized = normalizeDnaResult(dna);
  ctx.dnaExtractionSummary = createDnaExtractionSummary(normalized);
  const config = FIELD_CONFIG[fieldName];
  const value = normalized.fields[fieldName].trim();
  const confidence = getNormalizedFieldConfidence(normalized, fieldName);

  if (!value) {
    showToast(`报告中未找到${config.label}，已保留现有内容`, { type: 'warning' });
    return;
  }

  if (confidence < AUTO_POPULATE_CONFIDENCE_THRESHOLD) {
    const confirmed = await confirmWithModal(
      '低置信度字段',
      `字段“${config.label}”的提取置信度为 ${confidence}%，低于自动填充阈值。是否仍然覆盖当前内容？`,
      '',
      '仍然覆盖'
    );

    if (!confirmed) return;
  }

  config.apply(ctx, normalized);
  ctx.dnaConfidence.overall = normalized.confidence.overall;
  bindProfileToCurrentReport(ctx);
  ctx.saveState();

  highlightAutoFilledFields([config.inputId], 'green');
  const lowConfidenceHint =
    confidence < AUTO_POPULATE_CONFIDENCE_THRESHOLD ? '，低于自动填充阈值，请人工复核' : '';
  showToast(`已重新提取${config.label} (置信度: ${confidence}%)${lowConfidenceHint}`, {
    type: confidence >= AUTO_POPULATE_CONFIDENCE_THRESHOLD ? 'success' : 'warning',
  });
}

/**
 * 短暂高亮自动填充的字段（蓝色或绿色边框 + 背景）
 */
export function highlightAutoFilledFields(
  fieldIds: string[],
  color: 'blue' | 'green' = 'blue'
): void {
  const bgClass = color === 'blue' ? 'bg-blue-50' : 'bg-green-50';
  const borderClass = color === 'blue' ? 'border-blue-300' : 'border-green-300';

  fieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add(bgClass, borderClass);
    setTimeout(() => el.classList.remove(bgClass, borderClass), 2000);
  });
}
