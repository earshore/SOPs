/**
 * Tool-loop termination helpers.
 * Gateways/models often keep emitting tool_calls without a final answer;
 * force a synthesis path so Deep Chat never ends on empty body.
 */

export type CollectedToolOutput = {
  name: string;
  callId: string;
  output: string;
};

function clip(text: string, max = 2000): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n…[truncated]`;
}

function formatOneToolOutput(item: CollectedToolOutput, index: number): string {
  let body = item.output;
  try {
    const parsed = JSON.parse(item.output) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.resultsText === 'string' && parsed.resultsText.trim()) {
        body = parsed.resultsText;
      } else if (typeof parsed.message === 'string' && parsed.message.trim()) {
        body = parsed.message;
      } else if (typeof parsed.error === 'string') {
        body = `错误：${parsed.error}${parsed.message ? ` — ${parsed.message}` : ''}`;
      }
    }
  } catch {
    // keep raw
  }
  return `### ${item.name} (${index + 1})\n${clip(String(body))}`;
}

/**
 * When the model never produces a visible final answer after tools, surface
 * a readable summary from tool outputs so the UI is not empty/error.
 */
export function synthesizeAnswerFromToolOutputs(outputs: CollectedToolOutput[]): string {
  if (!outputs.length) return '';
  const blocks = outputs.map((item, index) => formatOneToolOutput(item, index));
  return [
    '根据工具检索结果，整理如下：',
    '',
    ...blocks,
    '',
    '（模型未给出最终总结，以上为工具结果摘要。可再问我做更细的解读。）',
  ].join('\n');
}

/** Responses body stuck at in_progress with no output (seen on some deepseek channels). */
export function isResponsesInProgressEmpty(
  data: Record<string, unknown> | null | undefined
): boolean {
  if (!data || typeof data !== 'object') return false;
  if (data.status !== 'in_progress') return false;
  const output = data.output;
  return !Array.isArray(output) || output.length === 0;
}
