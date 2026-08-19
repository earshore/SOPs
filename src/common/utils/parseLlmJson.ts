/**
 * Robust JSON extraction for LLM text responses.
 * Handles code fences, surrounding prose, and lightly-broken JSON via jsonrepair.
 */

import { jsonrepair } from 'jsonrepair';

import { ValidationError } from '@/common/errors/AppError';

export interface ParseLlmJsonResult {
  value: unknown;
  wasRepaired: boolean;
}

export function parseLlmJson(response: string): ParseLlmJsonResult {
  const trimmed = stripCodeFence(response.trim());
  if (!trimmed) {
    throw new ValidationError('Empty LLM response', 'PARSE_LLM_001', 'response', response, {
      module: 'parseLlmJson',
      action: 'parseLlmJson',
    });
  }

  try {
    return { value: JSON.parse(trimmed), wasRepaired: false };
  } catch {
    // Continue to recovery paths.
  }

  const objectText = extractJsonObject(trimmed);
  if (objectText) {
    try {
      return { value: JSON.parse(objectText), wasRepaired: true };
    } catch {
      try {
        return { value: JSON.parse(jsonrepair(objectText)), wasRepaired: true };
      } catch {
        // Continue to full-text repair.
      }
    }
  }

  try {
    return { value: JSON.parse(jsonrepair(trimmed)), wasRepaired: true };
  } catch {
    throw new ValidationError(
      'Unable to parse valid JSON from LLM response',
      'PARSE_LLM_002',
      'response',
      response,
      {
        module: 'parseLlmJson',
        action: 'parseLlmJson',
      }
    );
  }
}

export function parseLlmJsonObject(response: string): Record<string, unknown> {
  const { value } = parseLlmJson(response);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('模型返回不是有效 JSON 对象', 'PARSE_LLM_003', 'response', value, {
      module: 'parseLlmJson',
      action: 'parseLlmJsonObject',
    });
  }
  return value as Record<string, unknown>;
}

export function stripCodeFence(value: string): string {
  return value
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export function extractJsonObject(value: string): string | null {
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return null;
  }
  return value.slice(start, end + 1);
}
