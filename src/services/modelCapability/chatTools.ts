/**
 * Chat Completions tools: extract tool_calls, stream delta merge, tool-loop messages.
 * Official: assistant message.tool_calls + follow-up role=tool messages.
 */

export interface ChatFunctionToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

/** OpenAI stream tool_calls delta fragment (index-based). */
export interface ChatStreamToolCallDelta {
  index?: number;
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
}

export function extractChatToolCallsFromMessage(
  message: Record<string, unknown> | null | undefined
): ChatFunctionToolCall[] {
  if (!message || !Array.isArray(message.tool_calls)) {
    return [];
  }
  const out: ChatFunctionToolCall[] = [];
  for (const raw of message.tool_calls) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const fn = row.function as { name?: unknown; arguments?: unknown } | undefined;
    const id = typeof row.id === 'string' ? row.id : '';
    const name = typeof fn?.name === 'string' ? fn.name : '';
    const args =
      typeof fn?.arguments === 'string'
        ? fn.arguments
        : fn?.arguments != null
          ? JSON.stringify(fn.arguments)
          : '';
    if (!id || !name) continue;
    out.push({
      id,
      type: 'function',
      function: { name, arguments: args },
    });
  }
  return out;
}

export function extractChatToolCallsFromCompletion(
  data: Record<string, unknown> | null | undefined
): ChatFunctionToolCall[] {
  if (!data) return [];
  const choices = data.choices;
  if (!Array.isArray(choices) || !choices[0]) return [];
  const first = choices[0] as Record<string, unknown>;
  const message = first.message as Record<string, unknown> | undefined;
  return extractChatToolCallsFromMessage(message);
}

/**
 * Merge SSE delta.tool_calls fragments into complete ChatFunctionToolCall[].
 */
export function mergeChatStreamToolCallDeltas(
  existing: ChatFunctionToolCall[] | undefined,
  deltas: ChatStreamToolCallDelta[] | undefined
): ChatFunctionToolCall[] {
  const byIndex = new Map<number, ChatFunctionToolCall>();
  if (existing) {
    existing.forEach((call, i) => {
      byIndex.set(i, { ...call, function: { ...call.function } });
    });
  }
  if (!Array.isArray(deltas)) {
    return Array.from(byIndex.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => v);
  }
  for (const delta of deltas) {
    const index = typeof delta.index === 'number' ? delta.index : 0;
    const cur = byIndex.get(index) ?? {
      id: '',
      type: 'function' as const,
      function: { name: '', arguments: '' },
    };
    if (typeof delta.id === 'string' && delta.id) cur.id = delta.id;
    if (delta.function?.name) {
      cur.function.name = (cur.function.name || '') + delta.function.name;
    }
    if (typeof delta.function?.arguments === 'string') {
      cur.function.arguments = (cur.function.arguments || '') + delta.function.arguments;
    }
    byIndex.set(index, cur);
  }
  return Array.from(byIndex.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v)
    .filter(c => c.id && c.function.name);
}

export function extractChatStreamToolCallDeltas(
  payload: Record<string, unknown>
): ChatStreamToolCallDelta[] {
  const choices = payload.choices;
  if (!Array.isArray(choices) || !choices[0]) return [];
  const first = choices[0] as Record<string, unknown>;
  const delta = first.delta as Record<string, unknown> | undefined;
  if (!delta || !Array.isArray(delta.tool_calls)) return [];
  return delta.tool_calls as ChatStreamToolCallDelta[];
}

/** Build OpenAI chat messages for next tool-loop round. */
export function appendChatToolRoundMessages(
  messages: Array<Record<string, unknown>>,
  toolCalls: ChatFunctionToolCall[],
  results: Array<{ callId: string; output: string }>
): Array<Record<string, unknown>> {
  const next = [...messages];
  next.push({
    role: 'assistant',
    content: null,
    tool_calls: toolCalls,
  });
  const byId = new Map(results.map(r => [r.callId, r.output]));
  for (const call of toolCalls) {
    next.push({
      role: 'tool',
      tool_call_id: call.id,
      content: byId.get(call.id) ?? '',
    });
  }
  return next;
}
