import { jsonrepair } from 'jsonrepair';

export function parseJsonObject(response: string): Record<string, unknown> {
  const trimmed = stripCodeFence(response.trim());

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end <= start) {
      throw new Error('模型返回不是有效 JSON');
    }
    const objectText = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(objectText) as Record<string, unknown>;
    } catch {
      return JSON.parse(jsonrepair(objectText)) as Record<string, unknown>;
    }
  }
}

function stripCodeFence(value: string): string {
  return value
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}
