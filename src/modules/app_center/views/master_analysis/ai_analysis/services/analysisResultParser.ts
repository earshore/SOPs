import { z } from 'zod';

import { ValidationError } from '@/common/errors/AppError';
import { parseLlmJson } from '@/common/utils/parseLlmJson';

const looseRecord = z.record(z.string(), z.unknown());
const objectArray = z.array(looseRecord);
const stringArray = z.array(z.string());

export type AnalysisParsePhase = 'full' | 'map' | 'reduce';

const sellingPointsFullSchema = z
  .object({
    bullet_analysis: objectArray,
    overall_strategy: looseRecord,
    function_scene_matrix: looseRecord,
  })
  .passthrough();

/** Map phase: bullets only (strategy comes from Reduce). */
const sellingPointsMapSchema = z
  .object({
    bullet_analysis: objectArray,
    overall_strategy: looseRecord.optional(),
    function_scene_matrix: looseRecord.optional(),
  })
  .passthrough();

/** Reduce phase: strategy objects; bullets optional pass-through. */
const sellingPointsReduceSchema = z
  .object({
    overall_strategy: looseRecord,
    function_scene_matrix: looseRecord,
    bullet_analysis: objectArray.optional(),
  })
  .passthrough();

const analysisSchemas: Record<string, z.ZodType<Record<string, unknown>>> = {
  'title-keywords': z
    .object({
      primary_keywords: objectArray,
      secondary_keywords: objectArray,
      scene_keywords: objectArray.optional(),
      audience_keywords: objectArray.optional(),
      removed_modifiers: stringArray.optional(),
      removed_brand_terms: stringArray.optional(),
      optimization_suggestions: stringArray.optional(),
    })
    .passthrough(),
  'selling-points': sellingPointsFullSchema,
  'fatal-flaws': z
    .object({
      critical_issues: objectArray,
      return_triggers: stringArray,
      expectation_gaps: objectArray.optional(),
      actionable_fixes: stringArray.optional(),
      risk_assessment: looseRecord.optional(),
    })
    .passthrough(),
  'wow-moments': z
    .object({
      moments: objectArray,
      emotional_triggers: stringArray,
      high_conversion_phrases: stringArray.optional(),
      unexpected_benefits: stringArray.optional(),
      copywriting_angles: stringArray.optional(),
    })
    .passthrough(),
  'hesitation-points': z
    .object({
      hesitations: objectArray,
      common_doubts: stringArray,
      trust_builders: stringArray.optional(),
      qa_optimization_items: objectArray.optional(),
    })
    .passthrough(),
  'buyer-profile': z
    .object({
      demographics: looseRecord,
      buyer_types: objectArray,
      usage_scenes: objectArray,
      purchase_motivations: stringArray.optional(),
      geographic_insights: looseRecord.optional(),
    })
    .passthrough(),
  'vocab-gap': z
    .object({
      seller_terms: stringArray,
      buyer_terms: stringArray,
      uncovered_buyer_terms: objectArray,
      term_translations: objectArray,
      listing_optimization: looseRecord.optional(),
    })
    .passthrough(),
  'promise-reality': z
    .object({
      gaps: objectArray,
      verified_claims: stringArray,
      unverified_claims: stringArray.optional(),
      overall_credibility: looseRecord,
      listing_revision_suggestions: stringArray.optional(),
    })
    .passthrough(),
};

export interface ParsedAnalysisResponse {
  data: Record<string, unknown>;
  wasRepaired: boolean;
}

const fatalFlawsMapSchema = z
  .object({
    critical_issues: objectArray,
    return_triggers: stringArray.optional(),
    expectation_gaps: objectArray.optional(),
    actionable_fixes: stringArray.optional(),
    risk_assessment: looseRecord.optional(),
  })
  .passthrough();

const wowMomentsMapSchema = z
  .object({
    moments: objectArray,
    emotional_triggers: stringArray.optional(),
    high_conversion_phrases: stringArray.optional(),
    unexpected_benefits: stringArray.optional(),
    copywriting_angles: stringArray.optional(),
  })
  .passthrough();

const hesitationMapSchema = z
  .object({
    hesitations: objectArray,
    common_doubts: stringArray.optional(),
    trust_builders: stringArray.optional(),
    qa_optimization_items: objectArray.optional(),
  })
  .passthrough();

const buyerProfileMapSchema = z
  .object({
    demographics: looseRecord.optional(),
    buyer_types: objectArray.optional(),
    usage_scenes: objectArray.optional(),
    purchase_motivations: stringArray.optional(),
    geographic_insights: looseRecord.optional(),
  })
  .passthrough();

const vocabGapMapSchema = z
  .object({
    seller_terms: stringArray.optional(),
    buyer_terms: stringArray.optional(),
    uncovered_buyer_terms: objectArray.optional(),
    term_translations: objectArray.optional(),
    listing_optimization: looseRecord.optional(),
  })
  .passthrough();

const promiseRealityMapSchema = z
  .object({
    gaps: objectArray.optional(),
    verified_claims: stringArray.optional(),
    unverified_claims: stringArray.optional(),
    overall_credibility: looseRecord.optional(),
    listing_revision_suggestions: stringArray.optional(),
  })
  .passthrough();

const sellingPointsPhaseSchemas: Record<AnalysisParsePhase, z.ZodType<Record<string, unknown>>> = {
  full: sellingPointsFullSchema,
  map: sellingPointsMapSchema,
  reduce: sellingPointsReduceSchema,
};

const mapPhaseSchemas: Record<string, z.ZodType<Record<string, unknown>>> = {
  'fatal-flaws': fatalFlawsMapSchema,
  'wow-moments': wowMomentsMapSchema,
  'hesitation-points': hesitationMapSchema,
  'buyer-profile': buyerProfileMapSchema,
  'vocab-gap': vocabGapMapSchema,
  'promise-reality': promiseRealityMapSchema,
};

function resolveAnalysisSchema(
  targetId: string,
  phase: AnalysisParsePhase = 'full'
): z.ZodType<Record<string, unknown>> | undefined {
  if (targetId === 'selling-points') {
    return sellingPointsPhaseSchemas[phase];
  }
  return phase === 'map'
    ? (mapPhaseSchemas[targetId] ?? analysisSchemas[targetId])
    : analysisSchemas[targetId];
}

export function parseAnalysisResponse(
  targetId: string,
  response: string,
  options?: { phase?: AnalysisParsePhase }
): ParsedAnalysisResponse {
  const parsed = parseLlmJson(response);
  const unwrapped = unwrapAnalysisResult(targetId, parsed.value);
  const phase = options?.phase ?? 'full';
  const schema = resolveAnalysisSchema(targetId, phase);

  if (!schema) {
    return { data: unwrapped, wasRepaired: parsed.wasRepaired };
  }

  const validation = schema.safeParse(unwrapped);
  if (!validation.success) {
    const reason = validation.error.issues
      .slice(0, 3)
      .map(issue => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    throw new ValidationError(
      `AI analysis result schema mismatch for ${targetId}: ${reason}`,
      'AI_PARSER_001',
      'result',
      unwrapped,
      { module: 'analysisResultParser', action: 'parseAnalysisResult', targetId, phase }
    );
  }

  return { data: validation.data, wasRepaired: parsed.wasRepaired };
}

export function validateAnalysisResult(
  targetId: string,
  result: unknown,
  phase: AnalysisParsePhase = 'full'
): boolean {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return false;
  }

  const schema = resolveAnalysisSchema(targetId, phase);
  if (!schema) {
    return true;
  }

  return schema.safeParse(result).success;
}

function unwrapAnalysisResult(targetId: string, value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(
      `AI analysis response for ${targetId} is not a JSON object`,
      'AI_PARSER_002',
      'response',
      value,
      { module: 'analysisResultParser', action: 'unwrapAnalysisResult', targetId }
    );
  }

  const objectValue = value as Record<string, unknown>;
  const nested = objectValue[targetId];
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }

  return objectValue;
}
