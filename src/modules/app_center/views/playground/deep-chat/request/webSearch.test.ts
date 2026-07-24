import { describe, expect, it } from 'vitest';
import { sanitizeDuckDuckGoReaderText } from './webSearch';

describe('sanitizeDuckDuckGoReaderText', () => {
  it('strips region picker and time filters, keeps result body', () => {
    const raw = `
Title: DuckDuckGo

All Regions
Argentina
Australia
Austria
Belgium (fr)
United Kingdom
Vietnam (en)
Any Time
Past Day
Past Week
Past Month
Past Year

OpenAI releases new model
https://example.com/openai
Anthropic updates Claude
https://example.com/claude
`;
    const cleaned = sanitizeDuckDuckGoReaderText(raw);
    expect(cleaned).not.toContain('All Regions');
    expect(cleaned).not.toContain('Argentina');
    expect(cleaned).not.toContain('Past Year');
    expect(cleaned).not.toContain('Any Time');
    expect(cleaned).toContain('OpenAI releases new model');
    expect(cleaned).toContain('Anthropic updates Claude');
  });

  it('drops jina reader header chrome', () => {
    const raw = `
Title: DuckDuckGo
URL Source: https://lite.duckduckgo.com/lite/?q=AI
Markdown Content:

AI news headline here
`;
    const cleaned = sanitizeDuckDuckGoReaderText(raw);
    expect(cleaned).not.toMatch(/^Title:/m);
    expect(cleaned).not.toMatch(/^URL Source:/m);
    expect(cleaned).toContain('AI news headline here');
  });
});
