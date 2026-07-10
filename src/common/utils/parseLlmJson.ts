/**
 * Robust JSON extraction for LLM text responses.
 * Handles code fences, surrounding prose, and lightly-broken JSON via jsonrepair.
 */

import { jsonrepair } from 'jsonrepair';

export interface ParseLlmJsonResult {
  value: unknown;
  wasRepaired: boolean;
}

export function parseLlmJson(response: string): ParseLlmJsonResult {
  const trimmed = stripCodeFence(response.trim());
  if (!trimmed) {
    throw new Error('Empty LLM response');
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
    throw new Error('Unable to parse valid JSON from LLM response');
  }
}

export function parseLlmJsonObject(response: string): Record<string, unknown> {
  const { value } = parseLlmJson(response);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('模型返回不是有效 JSON 对象');
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
