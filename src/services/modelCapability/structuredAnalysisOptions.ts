/**
 * Shared LLM options for analysis modules that expect JSON.
 * When path is Responses + structured output: use text.format (json_object or soft schema).
 * Always keep jsonMode so chat fallback and parsers still work.
 */

import type { LLMOptions } from '@/services/llmService';
import { StorageService } from '@/services/storageService';
import { normalizeApiPathId } from './apiPaths';
import { resolveModelCapability } from './resolve';
import type { ResponsesJsonSchemaFormat } from './applyToRequest';

export type StructuredAnalysisContext = {
  provider: string;
  model: string;
  /** Optional override; defaults to stored provider config apiPath */
  apiPath?: unknown;
  /** Schema name for Responses text.format json_schema (soft, non-strict) */
  schemaName?: string;
  /** Optional explicit JSON Schema; default is loose object */
  jsonSchema?: ResponsesJsonSchemaFormat;
};

/**
 * Soft object schema: guides models without failing on extra keys.
 * strict:false — analysis parsers already validate with Zod after parseLlmJson.
 */
export function buildLooseAnalysisJsonSchema(name: string): ResponsesJsonSchemaFormat {
  return {
    name: name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'analysis_result',
    schema: {
      type: 'object',
      additionalProperties: true,
    },
    strict: false,
  };
}

/**
 * Merge analysis base options with Responses structured output when available.
 * - Always sets jsonMode: true
 * - On responses + supportsStructuredOutput: attaches jsonSchema (json_object path via jsonMode too)
 * - Hydrates apiPath from storage when omitted
 */
export function withStructuredAnalysisOptions(
  base: LLMOptions,
  ctx: StructuredAnalysisContext
): LLMOptions {
  const stored = StorageService.getLLMConfig(ctx.provider);
  const pathId = normalizeApiPathId(
    ctx.apiPath !== undefined ? ctx.apiPath : (stored as { apiPath?: unknown } | null)?.apiPath
  );
  const cap = resolveModelCapability({
    provider: ctx.provider,
    modelId: ctx.model,
    preferredSurface: pathId,
  });

  const next: LLMOptions = {
    ...base,
    jsonMode: true,
    apiPath: pathId,
  };

  if (pathId === 'responses' && cap.supportsStructuredOutput) {
    next.jsonSchema =
      ctx.jsonSchema ?? buildLooseAnalysisJsonSchema(ctx.schemaName || 'analysis_result');
  }

  return next;
}
