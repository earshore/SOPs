/**
 * Parse tool invocations that models dump as plain assistant text
 * (XML <tool_call> / proprietary JSON arrays) instead of native tool_calls.
 */

export interface TextEmittedToolCall {
  name: string;
  arguments: string;
  /** Original matched substring (for stripping / collapse UI). */
  raw: string;
}

const XML_TOOL_CALL_RE =
  /<tool_call>\s*<tool_name>\s*([^<]+?)\s*<\/tool_name>\s*<tool_args>\s*([\s\S]*?)\s*<\/tool_args>\s*<\/tool_call>/gi;

/** Known / heuristic tool names models invent in content-mode dumps. */
const TOOLISH_NAME_RE = /^(search_x|web_search|function|[a-z][a-z0-9_]{1,40})$/i;

/**
 * Proprietary multi-tool content format seen on some gateways:
 * [{"search_x":[{"query":"...","limit":15}]},{"web_search":[{"query":"..."}]}]
 */
const NON_TOOL_ARG_KEYS = new Set(['query', 'limit', 'mode', 'num_results']);

function isToolMapValue(value: unknown): boolean {
  return (
    Array.isArray(value) ||
    (Boolean(value) && typeof value === 'object') ||
    typeof value === 'string'
  );
}

function looksLikeToolMapEntries(entries: [string, unknown][]): boolean {
  return entries.every(
    ([name, value]) =>
      TOOLISH_NAME_RE.test(name) && !NON_TOOL_ARG_KEYS.has(name) && isToolMapValue(value)
  );
}

function toolCallsFromMapEntries(entries: [string, unknown][], raw: string): TextEmittedToolCall[] {
  const calls: TextEmittedToolCall[] = [];
  for (const [name, value] of entries) {
    if (!name.trim()) continue;
    const argsPayload = Array.isArray(value) && value.length === 1 ? value[0] : value;
    calls.push({
      name: name.trim(),
      arguments: typeof argsPayload === 'string' ? argsPayload : JSON.stringify(argsPayload ?? {}),
      raw,
    });
  }
  return calls;
}

function toolCallsFromParsedArray(parsed: unknown[], raw: string): TextEmittedToolCall[] {
  const calls: TextEmittedToolCall[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const entries = Object.entries(item as Record<string, unknown>);
    // Tool-map items look like { "search_x": [ {...} ] } — not { "query": "..." }.
    if (entries.length === 0 || !looksLikeToolMapEntries(entries)) continue;
    calls.push(...toolCallsFromMapEntries(entries, raw));
  }
  return calls;
}

function tryParseJsonToolArray(text: string): TextEmittedToolCall[] {
  const trimmed = text.trim();
  if (!trimmed.startsWith('[')) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return toolCallsFromParsedArray(parsed, trimmed);
  } catch {
    return [];
  }
}

/** Walk string contents while scanning balanced JSON arrays. */
function advanceJsonStringScan(ch: string, state: { escape: boolean }): 'stay' | 'exit' {
  if (state.escape) {
    state.escape = false;
    return 'stay';
  }
  if (ch === '\\') {
    state.escape = true;
    return 'stay';
  }
  return ch === '"' ? 'exit' : 'stay';
}

/** Find end index of a balanced `[...]` starting at `start` (must be `[`). */
function findBalancedArrayEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  const stringState = { escape: false };
  for (let j = start; j < text.length; j++) {
    const ch = text[j];
    if (ch === undefined) break;
    if (inString) {
      if (advanceJsonStringScan(ch, stringState) === 'exit') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      stringState.escape = false;
      continue;
    }
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) return j;
    }
  }
  return -1;
}

/** Extract balanced `[...]` slices from text (handles nested arrays/objects). */
function extractBalancedJsonArrays(text: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '[') continue;
    const end = findBalancedArrayEnd(text, i);
    if (end < 0) continue;
    out.push(text.slice(i, end + 1));
    i = end;
  }
  return out;
}

function pushUniqueToolCalls(
  calls: TextEmittedToolCall[],
  seen: Set<string>,
  parsed: TextEmittedToolCall[],
  raw: string
): void {
  for (const call of parsed) {
    const key = `${call.name}:${call.arguments}`;
    if (seen.has(key)) continue;
    seen.add(key);
    calls.push({ ...call, raw });
  }
}

/**
 * Extract fenced or bare JSON tool arrays embedded in larger assistant text.
 */
function extractEmbeddedJsonToolArrays(text: string): TextEmittedToolCall[] {
  const calls: TextEmittedToolCall[] = [];
  const seen = new Set<string>();

  // Prefer fenced ```json / ```html blocks that hold tool arrays.
  const fenceRe = /```(?:json|html|text)?\s*([\s\S]*?)```/gi;
  let fenceMatch: RegExpExecArray | null;
  while ((fenceMatch = fenceRe.exec(text)) !== null) {
    const block = (fenceMatch[1] ?? '').trim();
    const candidates = block.startsWith('[') ? [block] : extractBalancedJsonArrays(block);
    for (const candidate of candidates) {
      pushUniqueToolCalls(calls, seen, tryParseJsonToolArray(candidate), fenceMatch[0]);
    }
  }

  // Bare balanced JSON arrays (after prose). Prefer longer outer arrays first.
  const bareArrays = extractBalancedJsonArrays(text).sort((a, b) => b.length - a.length);
  for (const block of bareArrays) {
    if (!/"search_x"|"web_search"|_search"/.test(block) && !/"query"\s*:/.test(block)) {
      continue;
    }
    pushUniqueToolCalls(calls, seen, tryParseJsonToolArray(block), block);
  }

  return calls;
}

function parseXmlToolCalls(text: string): TextEmittedToolCall[] {
  const calls: TextEmittedToolCall[] = [];
  XML_TOOL_CALL_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = XML_TOOL_CALL_RE.exec(text)) !== null) {
    const name = (match[1] ?? '').trim();
    const argsRaw = (match[2] ?? '').trim();
    if (!name) continue;
    let argumentsJson = argsRaw;
    if (argsRaw && !argsRaw.startsWith('{') && !argsRaw.startsWith('[')) {
      // Some models put raw JSON object without braces issues; keep as-is when parseable.
      try {
        JSON.parse(argsRaw);
      } catch {
        argumentsJson = JSON.stringify({ raw: argsRaw });
      }
    } else if (!argsRaw) {
      argumentsJson = '{}';
    }
    calls.push({
      name,
      arguments: argumentsJson,
      raw: match[0],
    });
  }
  return calls;
}

/** True when text looks like it contains text-emitted tool invocations. */
export function textLooksLikeEmittedToolCalls(text: string): boolean {
  if (!text || !text.trim()) return false;
  if (/<tool_call>/i.test(text) && /<\/tool_call>/i.test(text)) return true;
  if (/<tool_name>/i.test(text) && /<tool_args>/i.test(text)) return true;
  return extractEmbeddedJsonToolArrays(text).length > 0;
}

/** Parse all text-emitted tool calls from assistant content. */
export function parseTextEmittedToolCalls(text: string): TextEmittedToolCall[] {
  if (!text || !text.trim()) return [];
  const xml = parseXmlToolCalls(text);
  if (xml.length > 0) return xml;
  return extractEmbeddedJsonToolArrays(text);
}

/** Remove text-emitted tool call blocks; keep surrounding prose. */
export function stripTextEmittedToolCalls(text: string): string {
  if (!text) return '';
  let out = text;
  // XML blocks
  out = out.replace(XML_TOOL_CALL_RE, '');
  // Replace raw spans captured by the parser (full balanced arrays / fences).
  const calls = parseTextEmittedToolCalls(out);
  for (const call of calls) {
    if (call.raw && out.includes(call.raw)) {
      out = out.split(call.raw).join('');
    }
  }
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Wrap residual tool-call markup in collapsed <details> for display.
 * deep-chat may render HTML; when not, prose still reads as a labeled block.
 */
export function collapseTextEmittedToolCallsForDisplay(text: string): string {
  if (!text || !textLooksLikeEmittedToolCalls(text)) return text;

  let out = text;
  XML_TOOL_CALL_RE.lastIndex = 0;
  out = out.replace(XML_TOOL_CALL_RE, (_full, name: string, args: string) => {
    const toolName = String(name || 'tool').trim();
    const body = String(args || '').trim();
    return `\n\n<details class="deep-chat-tool-call" data-tool="${escapeAttr(toolName)}"><summary>工具调用 · ${toolName}</summary>\n\n\`\`\`json\n${body}\n\`\`\`\n\n</details>\n\n`;
  });

  const jsonCalls = extractEmbeddedJsonToolArrays(out);
  const replacedRaws = new Set<string>();
  for (const call of jsonCalls) {
    if (!call.raw || replacedRaws.has(call.raw) || !out.includes(call.raw)) continue;
    replacedRaws.add(call.raw);
    const sameRaw = jsonCalls.filter(c => c.raw === call.raw);
    const names = [...new Set(sameRaw.map(c => c.name))].join(', ');
    const body = call.raw.replace(/^```(?:json|html|text)?\s*/i, '').replace(/\s*```$/, '');
    const collapsed = `\n\n<details class="deep-chat-tool-call"><summary>工具调用 · ${names}</summary>\n\n\`\`\`json\n${body.trim()}\n\`\`\`\n\n</details>\n\n`;
    out = out.split(call.raw).join(collapsed);
  }

  return out.replace(/\n{3,}/g, '\n\n').trim();
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
