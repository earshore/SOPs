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

/** Local fallback markers (honest UX — not model-authored). */
export const TOOL_LOOP_LOCAL_FALLBACK_HEADER = '根据工具检索结果，整理如下：';
export const TOOL_LOOP_LOCAL_FALLBACK_FOOTER =
  '（以上为本地工具结果摘要，非模型最终回答。可再问我做更细的解读或指定关注点。）';

const DEFAULT_BLOCK_MAX = 2000;
const SYNTHESIS_PROMPT_TOTAL_MAX = 8000;

function clip(text: string, max = DEFAULT_BLOCK_MAX): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n…[truncated]`;
}

function preferToolResultBody(parsed: Record<string, unknown>): string | null {
  if (typeof parsed.resultsText === 'string' && parsed.resultsText.trim()) {
    return parsed.resultsText;
  }
  if (typeof parsed.message === 'string' && parsed.message.trim()) {
    return parsed.message;
  }
  if (typeof parsed.error === 'string') {
    const msg = typeof parsed.message === 'string' ? parsed.message : '';
    return `错误：${parsed.error}${msg ? ` — ${msg}` : ''}`;
  }
  return null;
}

function formatOneToolOutput(item: CollectedToolOutput, index: number): string {
  let body = item.output;
  try {
    const parsed = JSON.parse(item.output) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      body = preferToolResultBody(parsed as Record<string, unknown>) ?? body;
    }
  } catch {
    // keep raw
  }
  return `### ${item.name} (${index + 1})\n${clip(String(body))}`;
}

/** Detect local fallback so callers/tests can distinguish from model prose. */
export function isLocalToolFallbackText(text: string): boolean {
  const t = (text || '').trim();
  if (!t) return false;
  return (
    t.includes(TOOL_LOOP_LOCAL_FALLBACK_HEADER) &&
    (t.includes('模型未给出最终总结') || t.includes('本地工具结果摘要'))
  );
}

/**
 * Compact tool blocks for a model synthesis prompt (total length capped).
 */
export function formatToolOutputsForSynthesis(
  outputs: CollectedToolOutput[],
  totalMax = SYNTHESIS_PROMPT_TOTAL_MAX
): string {
  if (!outputs.length) return '';
  const perBlock = Math.max(400, Math.floor(totalMax / Math.max(1, outputs.length)));
  const blocks = outputs.map((item, index) => {
    let body = item.output;
    try {
      const parsed = JSON.parse(item.output) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        body = preferToolResultBody(parsed as Record<string, unknown>) ?? body;
      }
    } catch {
      // keep raw
    }
    return `### ${item.name} (${index + 1})\n${clip(String(body), perBlock)}`;
  });
  let joined = blocks.join('\n\n');
  if (joined.length > totalMax) {
    joined = `${joined.slice(0, totalMax)}\n…[truncated]`;
  }
  return joined;
}

/**
 * User message appended for one-shot model synthesis after empty tool-loop final.
 */
export function buildModelToolSynthesisUserMessage(outputs: CollectedToolOutput[]): string {
  const toolBody = formatToolOutputsForSynthesis(outputs);
  return [
    '以下是已完成的工具调用结果。请用简洁中文给出对用户有用的最终回答：',
    '- 直接回答用户问题，综合要点，不要大段粘贴原始工具 JSON 或原始检索列表',
    '- 如有来源链接可简要引用',
    '- 若结果不足或互相矛盾，请明确说明',
    '- 只输出最终回答正文，不要再发起工具调用',
    '',
    '工具结果：',
    toolBody || '（无工具文本）',
  ].join('\n');
}

/**
 * When the model never produces a visible final answer after tools, surface
 * a readable summary from tool outputs so the UI is not empty/error.
 * This is a local fallback — prefer model synthesis first (see llmService).
 */
export function synthesizeAnswerFromToolOutputs(outputs: CollectedToolOutput[]): string {
  if (!outputs.length) return '';
  const blocks = outputs.map((item, index) => formatOneToolOutput(item, index));
  return [TOOL_LOOP_LOCAL_FALLBACK_HEADER, '', ...blocks, '', TOOL_LOOP_LOCAL_FALLBACK_FOOTER].join(
    '\n'
  );
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
