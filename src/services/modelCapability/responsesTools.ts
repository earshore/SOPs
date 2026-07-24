/**
 * OpenAI Responses API tools: normalize request tools + parse function_call items.
 * @see https://developers.openai.com/api/docs/guides/function-calling
 * @see https://developers.openai.com/api/docs/guides/migrate-to-responses
 */

export interface ResponsesFunctionCall {
  /** Stable id for function_call_output.call_id */
  callId: string;
  name: string;
  arguments: string;
  /** Optional item id from response.output */
  itemId?: string;
}

/** OpenAI Responses built-in tool type strings (pass-through). */
export const RESPONSES_BUILTIN_TOOL_TYPES = [
  'web_search',
  'web_search_preview',
  'file_search',
  'code_interpreter',
  'computer_use_preview',
  'image_generation',
  'mcp',
] as const;

export type ResponsesBuiltInToolType = (typeof RESPONSES_BUILTIN_TOOL_TYPES)[number];

export function isResponsesBuiltInToolType(type: unknown): type is ResponsesBuiltInToolType {
  return (
    typeof type === 'string' && (RESPONSES_BUILTIN_TOOL_TYPES as readonly string[]).includes(type)
  );
}

/**
 * Normalize tools from Chat Completions shape to Responses shape when needed.
 * Chat: { type:'function', function: { name, description, parameters } }
 * Responses: { type:'function', name, description, parameters }
 * Built-in: { type: 'web_search' | 'file_search' | ... } pass-through.
 */
export function normalizeToolsForResponses(tools: unknown[] | undefined): unknown[] | undefined {
  if (!tools || tools.length === 0) return tools;
  return tools.map(tool => {
    if (!tool || typeof tool !== 'object') return tool;
    const t = tool as Record<string, unknown>;
    if (isResponsesBuiltInToolType(t.type)) {
      return t;
    }
    if (t.type === 'function' && t.function && typeof t.function === 'object') {
      const fn = t.function as Record<string, unknown>;
      return {
        type: 'function',
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters,
        ...(typeof fn.strict === 'boolean' ? { strict: fn.strict } : {}),
      };
    }
    return tool;
  });
}

function readCallId(item: Record<string, unknown>): string {
  if (typeof item.call_id === 'string' && item.call_id.trim()) return item.call_id.trim();
  if (typeof item.id === 'string' && item.id.trim()) return item.id.trim();
  return '';
}

function readFunctionName(item: Record<string, unknown>): string {
  if (typeof item.name === 'string' && item.name.trim()) return item.name.trim();
  const fn = item.function as { name?: unknown } | undefined;
  if (fn && typeof fn.name === 'string') return fn.name.trim();
  return '';
}

function readFunctionArguments(item: Record<string, unknown>): string {
  if (typeof item.arguments === 'string') return item.arguments;
  if (item.arguments && typeof item.arguments === 'object') {
    try {
      return JSON.stringify(item.arguments);
    } catch {
      return '{}';
    }
  }
  const fn = item.function as { arguments?: unknown } | undefined;
  if (fn && typeof fn.arguments === 'string') return fn.arguments;
  return '{}';
}

function parseFunctionCallItem(item: Record<string, unknown>): ResponsesFunctionCall | null {
  const type = typeof item.type === 'string' ? item.type : '';
  if (type !== 'function_call' && type !== 'custom_tool_call') return null;
  const callId = readCallId(item);
  const name = readFunctionName(item);
  if (!callId || !name) return null;
  return {
    callId,
    name,
    arguments: readFunctionArguments(item),
    ...(typeof item.id === 'string' ? { itemId: item.id } : {}),
  };
}

/** Extract function_call items from a Responses non-stream body. */
export function extractResponsesFunctionCalls(
  data: Record<string, unknown> | null | undefined
): ResponsesFunctionCall[] {
  if (!data || typeof data !== 'object') return [];
  const output = data.output;
  if (!Array.isArray(output)) return [];
  const calls: ResponsesFunctionCall[] = [];
  for (const raw of output) {
    if (!raw || typeof raw !== 'object') continue;
    const parsed = parseFunctionCallItem(raw as Record<string, unknown>);
    if (parsed) calls.push(parsed);
  }
  return calls;
}

export function buildFunctionCallOutputItems(
  results: Array<{ callId: string; output: string }>
): Array<Record<string, unknown>> {
  return results.map(r => ({
    type: 'function_call_output',
    call_id: r.callId,
    output: r.output,
  }));
}

/** Rebuild function_call items for stateless tool follow-up (no previous_response_id). */
export function buildFunctionCallItemsForReplay(
  calls: ResponsesFunctionCall[]
): Array<Record<string, unknown>> {
  return calls.map(c => ({
    type: 'function_call',
    call_id: c.callId,
    name: c.name,
    arguments: c.arguments,
    ...(c.itemId ? { id: c.itemId } : {}),
  }));
}

/**
 * Tool follow-up input items.
 * - stateful (previous_response_id): only function_call_output
 * - stateless: function_call items + function_call_output (item replay)
 */
export function buildToolFollowUpInputItems(args: {
  functionCalls: ResponsesFunctionCall[];
  results: Array<{ callId: string; output: string }>;
  mode: 'stateful' | 'stateless';
}): Array<Record<string, unknown>> {
  const outputs = buildFunctionCallOutputItems(args.results);
  if (args.mode === 'stateful') {
    return outputs;
  }
  return [...buildFunctionCallItemsForReplay(args.functionCalls), ...outputs];
}
