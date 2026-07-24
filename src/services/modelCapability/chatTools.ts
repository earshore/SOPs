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

function stringifyToolArguments(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return JSON.stringify(value);
}

function parseOneToolCall(raw: unknown): ChatFunctionToolCall | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const fn = row.function as { name?: unknown; arguments?: unknown } | undefined;
  const id = typeof row.id === 'string' ? row.id : '';
  const name = typeof fn?.name === 'string' ? fn.name : '';
  if (!id || !name) return null;
  return {
    id,
    type: 'function',
    function: { name, arguments: stringifyToolArguments(fn?.arguments) },
  };
}

export function extractChatToolCallsFromMessage(
  message: Record<string, unknown> | null | undefined
): ChatFunctionToolCall[] {
  if (!message || !Array.isArray(message.tool_calls)) {
    return [];
  }
  return message.tool_calls
    .map(parseOneToolCall)
    .filter((call): call is ChatFunctionToolCall => call !== null);
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

function emptyToolCall(): ChatFunctionToolCall {
  return {
    id: '',
    type: 'function',
    function: { name: '', arguments: '' },
  };
}

function applyStreamToolCallDelta(
  cur: ChatFunctionToolCall,
  delta: ChatStreamToolCallDelta
): ChatFunctionToolCall {
  const next = { ...cur, function: { ...cur.function } };
  if (typeof delta.id === 'string' && delta.id) next.id = delta.id;
  if (delta.function?.name) {
    next.function.name = (next.function.name || '') + delta.function.name;
  }
  if (typeof delta.function?.arguments === 'string') {
    next.function.arguments = (next.function.arguments || '') + delta.function.arguments;
  }
  return next;
}

function sortedToolCallsFromMap(
  byIndex: Map<number, ChatFunctionToolCall>
): ChatFunctionToolCall[] {
  return Array.from(byIndex.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v)
    .filter(c => c.id && c.function.name);
}

/**
 * Merge SSE delta.tool_calls fragments into complete ChatFunctionToolCall[].
 */
export function mergeChatStreamToolCallDeltas(
  existing: ChatFunctionToolCall[] | undefined,
  deltas: ChatStreamToolCallDelta[] | undefined
): ChatFunctionToolCall[] {
  const byIndex = new Map<number, ChatFunctionToolCall>();
  existing?.forEach((call, i) => {
    byIndex.set(i, { ...call, function: { ...call.function } });
  });
  if (!Array.isArray(deltas)) {
    return sortedToolCallsFromMap(byIndex);
  }
  for (const delta of deltas) {
    const index = typeof delta.index === 'number' ? delta.index : 0;
    const cur = byIndex.get(index) ?? emptyToolCall();
    byIndex.set(index, applyStreamToolCallDelta(cur, delta));
  }
  return sortedToolCallsFromMap(byIndex);
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
