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

/**
 * Normalize tools to Chat Completions shape:
 * { type:'function', function: { name, description, parameters } }
 * Accepts flat Responses shape or already-nested chat shape.
 */
function isNestedChatFunctionTool(t: Record<string, unknown>): boolean {
  return t.type === 'function' && Boolean(t.function) && typeof t.function === 'object';
}

function toChatFunctionToolFromFlat(t: Record<string, unknown>): unknown {
  if (typeof t.name !== 'string' || !t.name.trim()) return null;
  return {
    type: 'function',
    function: {
      name: t.name,
      ...(typeof t.description === 'string' ? { description: t.description } : {}),
      ...(t.parameters !== undefined ? { parameters: t.parameters } : {}),
      ...(typeof t.strict === 'boolean' ? { strict: t.strict } : {}),
    },
  };
}

function normalizeOneToolForChat(tool: unknown): unknown {
  if (!tool || typeof tool !== 'object') return tool;
  const t = tool as Record<string, unknown>;
  // Built-ins / non-function: pass through
  if (t.type && t.type !== 'function') return t;
  if (isNestedChatFunctionTool(t)) return t;
  // Flat Responses-style function tool
  return toChatFunctionToolFromFlat(t) ?? tool;
}

export function normalizeToolsForChat(tools: unknown[] | undefined): unknown[] | undefined {
  if (!tools || tools.length === 0) return tools;
  return tools.map(normalizeOneToolForChat);
}

/** Convert text-emitted tool calls into ChatFunctionToolCall[] with synthetic ids. */
export function textEmittedToChatToolCalls(
  calls: Array<{ name: string; arguments: string }>,
  idPrefix = 'text_call'
): ChatFunctionToolCall[] {
  return calls.map((call, index) => ({
    id: `${idPrefix}_${index + 1}`,
    type: 'function' as const,
    function: {
      name: call.name,
      arguments: call.arguments || '{}',
    },
  }));
}
