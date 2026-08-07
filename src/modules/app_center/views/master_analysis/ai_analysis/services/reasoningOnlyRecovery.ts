/**
 * AI 分析链路"空正文/纯推理"恢复工具。
 *
 * deepseek-v4-flash + max 推理 + /v1/responses 路径下，模型经常只输出 reasoning
 * 通道（SSE 事件全是 response.reasoning_summary_text.delta）而不输出正文 output_text，
 * 导致 callLLM 返回空正文（API_EMPTY_RESPONSE）或非 JSON（PARSE_LLM_002）。
 * 参考 Deep Chat 的恢复模式：追加一条 user 消息要求"直接输出正文"并关闭推理。
 */

/**
 * 恢复指令：追加在原始 prompt 之前（中文 + 德语，覆盖德语 Listing 场景）。
 */
const REASONING_ONLY_RECOVERY_INSTRUCTION =
  '直接输出符合要求的 JSON 正文，不要输出任何思考过程、不要输出 reasoning、不要自我审查说明。只输出 JSON。';

/**
 * 判断是否为"空正文/纯推理"类失败（可安全重试一次）。
 * 覆盖：callLLM 空正文（API_EMPTY_RESPONSE）、parseLlmJson 空响应（PARSE_LLM_001）及兜底消息匹配。
 */
export function isReasoningOnlyFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  // 空正文类：callLLM 空正文（API_EMPTY_RESPONSE）、parseLlmJson 空响应（PARSE_LLM_001）。
  // 实测 deepseek-v4-flash + max 推理 + /v1/responses 时，网关常把纯推理文本当作正文返回，
  // 使 parseLlmJson 在非空但非 JSON 的内容上抛 PARSE_LLM_002 —— 同样属于“推理挤占正文”场景，
  // 应触发恢复（重试一次关闭推理 + 强制 JSON）。
  if (code === 'API_EMPTY_RESPONSE' || code === 'PARSE_LLM_001' || code === 'PARSE_LLM_002') {
    return true;
  }
  const message = (error as { message?: unknown }).message;
  return (
    typeof message === 'string' &&
    (message.includes('Empty LLM response') || message.includes('Unable to parse valid JSON'))
  );
}

/**
 * 在原始 prompt 前追加恢复指令：要求模型直接输出 JSON 正文、不要思考过程。
 */
export function buildRecoveryPrompt(originalPrompt: string): string {
  return `${REASONING_ONLY_RECOVERY_INSTRUCTION}\n\n${originalPrompt}`;
}

/**
 * 空正文/纯推理恢复包装：首次失败且属于 reasoning-only 失败时，
 * 以 recovery=true 重试一次（调用方据此追加恢复 prompt 并关闭推理）。
 * 非 reasoning-only 失败或重试仍失败时，原样抛出错误给外层调用者。
 * 只重试一次，避免成本失控。
 *
 * 泛型化：调用方可把「LLM 调用 + 解析」整体放入闭包，使解析失败
 * （如 parseLlmJson 抛 PARSE_LLM_002）同样进入恢复重试分支。
 */
export async function callWithReasoningOnlyRecovery<T>(
  originalCall: (recovery: boolean) => Promise<T>
): Promise<T> {
  try {
    return await originalCall(false);
  } catch (error) {
    if (!isReasoningOnlyFailure(error)) {
      throw error;
    }
    return originalCall(true);
  }
}