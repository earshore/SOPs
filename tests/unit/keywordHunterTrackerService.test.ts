import { describe, expect, it } from 'vitest';
import {
  analyzeKeywordMatching,
  cleanKeywordsText,
  findKeywordMatchRanges
} from '@/modules/app_center/views/keyword_hunter/services/trackerService';

describe('Keyword Hunter trackerService', () => {
  it('清理关键词格式时将逗号和分号分隔符整理为逐行关键词', () => {
    expect(cleanKeywordsText('wireless earbuds, noise cancelling; long battery-life')).toBe(
      'wireless earbuds\nnoise cancelling\nlong battery-life'
    );
  });

  it('默认按完整词匹配，避免词内子串误报', () => {
    const result = analyzeKeywordMatching('The redesign uses a red shell.', ['red']);
    const ranges = findKeywordMatchRanges('The redesign uses a red shell.', 'red');

    expect(result.matched).toEqual([{ keyword: 'red', count: 1 }]);
    expect(result.unmatched).toEqual([]);
    expect(ranges).toEqual([{ start: 20, end: 23 }]);
  });

  it('启用 matchPartial 时允许词内匹配', () => {
    const result = analyzeKeywordMatching(
      'The redesign uses a red shell.',
      ['red'],
      { matchPartial: true }
    );

    expect(result.matched).toEqual([{ keyword: 'red', count: 2 }]);
  });

  it('按 matchCase 控制大小写敏感度', () => {
    const insensitive = analyzeKeywordMatching('Wireless wireless', ['Wireless']);
    const sensitive = analyzeKeywordMatching(
      'Wireless wireless',
      ['Wireless'],
      { matchCase: true }
    );

    expect(insensitive.matched).toEqual([{ keyword: 'Wireless', count: 2 }]);
    expect(sensitive.matched).toEqual([{ keyword: 'Wireless', count: 1 }]);
  });

  it('按 matchPlural 控制简单单复数匹配', () => {
    const enabled = analyzeKeywordMatching(
      'This wireless earbud has long battery life.',
      ['wireless earbuds'],
      { matchPlural: true }
    );
    const disabled = analyzeKeywordMatching(
      'This wireless earbud has long battery life.',
      ['wireless earbuds'],
      { matchPlural: false }
    );

    expect(enabled.matched).toEqual([{ keyword: 'wireless earbuds', count: 1 }]);
    expect(disabled.unmatched).toEqual(['wireless earbuds']);
  });

  it('按 matchStem 控制简单英文词干匹配', () => {
    const enabled = analyzeKeywordMatching(
      'Noise cancel performance is stable.',
      ['noise cancelling'],
      { matchStem: true }
    );
    const disabled = analyzeKeywordMatching(
      'Noise cancel performance is stable.',
      ['noise cancelling'],
      { matchStem: false }
    );

    expect(enabled.matched).toEqual([{ keyword: 'noise cancelling', count: 1 }]);
    expect(disabled.unmatched).toEqual(['noise cancelling']);
  });
});
