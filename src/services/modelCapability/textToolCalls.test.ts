import { describe, expect, it } from 'vitest';
import {
  collapseTextEmittedToolCallsForDisplay,
  parseTextEmittedToolCalls,
  stripTextEmittedToolCalls,
  textLooksLikeEmittedToolCalls,
} from './textToolCalls';

describe('textToolCalls', () => {
  it('parses XML <tool_call> blocks (responses-style dumps)', () => {
    const text = `我会帮你搜索。

<tool_call>
<tool_name>search_x</tool_name>
<tool_args>
{"query": "AI news", "limit": 15}
</tool_args>
</tool_call>`;

    expect(textLooksLikeEmittedToolCalls(text)).toBe(true);
    const calls = parseTextEmittedToolCalls(text);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.name).toBe('search_x');
    expect(calls[0]?.arguments).toContain('AI news');
  });

  it('parses proprietary JSON tool arrays (chat-style dumps)', () => {
    const text = `正在搜索。

[{"search_x":[{"query":"AI news OR OpenAI","limit":15,"mode":"Latest"}]},{"web_search":[{"query":"AI news today","num_results":8}]}]`;

    expect(textLooksLikeEmittedToolCalls(text)).toBe(true);
    const calls = parseTextEmittedToolCalls(text);
    expect(calls.map(c => c.name).sort()).toEqual(['search_x', 'web_search']);
    expect(JSON.parse(calls.find(c => c.name === 'search_x')!.arguments).query).toContain('AI');
  });

  it('strips tool dumps and keeps prose', () => {
    const text = `先说明一下。

[{"search_x":[{"query":"AI"}]}]

后续还会补充。`;
    const stripped = stripTextEmittedToolCalls(text);
    expect(stripped).toContain('先说明一下');
    expect(stripped).not.toContain('search_x');
  });

  it('collapses residual tool markup into closed details by default', () => {
    const text = `<tool_call>
<tool_name>search_x</tool_name>
<tool_args>
{"query":"AI"}
</tool_args>
</tool_call>`;
    const collapsed = collapseTextEmittedToolCallsForDisplay(text);
    expect(collapsed).toContain('<details class="deep-chat-tool-call"');
    expect(collapsed).toContain('<summary>工具调用 · search_x</summary>');
    // Default collapsed: no open attribute
    expect(collapsed).not.toMatch(/<details[^>]*\sopen[\s>]/);
  });

  it('parses fenced JSON tool arrays embedded in prose', () => {
    const text = `先查一下：

\`\`\`json
[{"web_search":[{"query":"amazon FBA fees"}]}]
\`\`\`

再总结。`;
    const calls = parseTextEmittedToolCalls(text);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.name).toBe('web_search');
    expect(collapseTextEmittedToolCallsForDisplay(text)).toContain('工具调用 · web_search');
  });

  it('parses nested balanced arrays and ignores non-tool JSON', () => {
    const nested = `prefix [{"search_x":[{"query":"q","filters":{"a":[1,2]}}]}] suffix`;
    const calls = parseTextEmittedToolCalls(nested);
    expect(calls.some(c => c.name === 'search_x')).toBe(true);

    expect(textLooksLikeEmittedToolCalls('')).toBe(false);
    expect(textLooksLikeEmittedToolCalls('[{"query":"just data"}]')).toBe(false);
    expect(parseTextEmittedToolCalls('not tools')).toEqual([]);
    expect(stripTextEmittedToolCalls('')).toBe('');
  });

  it('handles empty tool_args and non-JSON arg bodies in XML dumps', () => {
    const emptyArgs = `<tool_call>
<tool_name>web_search</tool_name>
<tool_args>
</tool_args>
</tool_call>`;
    expect(parseTextEmittedToolCalls(emptyArgs)[0]?.arguments).toBe('{}');

    const plainArgs = `<tool_call>
<tool_name>web_search</tool_name>
<tool_args>
not-json-args
</tool_args>
</tool_call>`;
    const plain = parseTextEmittedToolCalls(plainArgs);
    expect(JSON.parse(plain[0]!.arguments)).toEqual({ raw: 'not-json-args' });
  });
});
