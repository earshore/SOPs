import { parseLlmJsonObject } from '@/common/utils/parseLlmJson';

export function parseJsonObject(response: string): Record<string, unknown> {
  return parseLlmJsonObject(response);
}
