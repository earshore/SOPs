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
});
