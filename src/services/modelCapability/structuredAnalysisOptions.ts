/**
 * Shared LLM options for analysis modules that expect JSON.
 * When path is Responses + structured output: use text.format (json_object or soft schema).
 * Always keep jsonMode so chat fallback and parsers still work.
 *
 * NOTE: Do not import llmService here — it imports modelCapability/index and would cycle.
 */

import { StorageService } from '@/services/storageService';
import { normalizeApiPathId, type ApiPathId } from './apiPaths';
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

export type StructuredAnalysisLlmFields = {
  jsonMode: true;
  apiPath: ApiPathId;
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
 * Merge analysis base options with structured output when available.
 * - Always sets jsonMode: true
 * - On responses or chat_completions + supportsStructuredOutput: attaches jsonSchema
 * - Hydrates apiPath from storage when omitted
 */
export function withStructuredAnalysisOptions<T extends object>(
  base: T,
  ctx: StructuredAnalysisContext
): T & StructuredAnalysisLlmFields {
  const stored = StorageService.getLLMConfig(ctx.provider);
  const pathId = normalizeApiPathId(
    ctx.apiPath !== undefined ? ctx.apiPath : (stored as { apiPath?: unknown } | null)?.apiPath
  );
  const cap = resolveModelCapability({
    provider: ctx.provider,
    modelId: ctx.model,
    preferredSurface: pathId,
  });

  const next = {
    ...base,
    jsonMode: true as const,
    apiPath: pathId,
  } as T & StructuredAnalysisLlmFields;

  // Responses text.format and chat response_format.json_schema when surface supports it.
  if (
    (pathId === 'responses' || pathId === 'chat_completions') &&
    cap.supportsStructuredOutput
  ) {
    next.jsonSchema =
      ctx.jsonSchema ?? buildLooseAnalysisJsonSchema(ctx.schemaName || 'analysis_result');
  }

  return next;
}
