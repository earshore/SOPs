import { describe, expect, it } from 'vitest';
import { isListingPromptContext, sanitizeListingCopy } from './listingCopySanitize';

describe('sanitizeListingCopy', () => {
  it('剥离 "Ich habe die Briefings ... geprüft." 前言，截取到 "1. Title"', () => {
    const text = [
      'Ich habe die Briefings (Product DNA, SEO-Mandat, Competitor Insights) gegen die Quellen-Prioritäts- und Fakten-Autoritätsregeln geprüft. Wichtigste Konsequenz vorab: ...',
      '',
      '1. Title: Kabellose Ohrhörer mit langer Akkulaufzeit',
    ].join('\n');
    expect(sanitizeListingCopy(text)).toBe('1. Title: Kabellose Ohrhörer mit langer Akkulaufzeit');
  });

  it('从 **Title** 位置截取（markdown 粗体标题）', () => {
    const text = '开场说明\n\n**Title**: Wireless Earbuds with Long Battery Life';
    expect(sanitizeListingCopy(text)).toBe('**Title**: Wireless Earbuds with Long Battery Life');
  });

  it('无正文起始标记的普通文本原样返回', () => {
    const text = '这是普通聊天消息，没有任何 Title 标记';
    expect(sanitizeListingCopy(text)).toBe(text);
  });

  it('德语 "Titel:" 场景截取', () => {
    const text = 'Vorab: Ich habe die Briefings gegen die Quellen-Prioritätsregeln geprüft.\nTitel: Kabellose Ohrhörer';
    expect(sanitizeListingCopy(text)).toBe('Titel: Kabellose Ohrhörer');
  });

  it('行首编号变体（"1．Title" / "1) Titel"）也命中', () => {
    expect(sanitizeListingCopy('前言段落\n1．Title Produktname')).toBe('1．Title Produktname');
    expect(sanitizeListingCopy('前言段落\n1) Titel Produktname')).toBe('1) Titel Produktname');
  });

  it('空字符串 / 纯空白原样返回', () => {
    expect(sanitizeListingCopy('')).toBe('');
    expect(sanitizeListingCopy('   ')).toBe('   ');
  });
});

describe('isListingPromptContext', () => {
  it('显式传入合法 ListingPromptWorkflowContext 判定为 true', () => {
    expect(
      isListingPromptContext({
        promptId: 'prompt-1',
        prompt: 'Rewrite this listing with sharper benefits',
        seoKeywords: ['wireless earbuds'],
        workItemId: 'competitor_listing:history-1',
        marketplace: 'US',
        asinOrSku: 'B001',
      })
    ).toBe(true);
  });

  it('null / 非对象 / 缺少 promptId 的对象判定为 false', () => {
    expect(isListingPromptContext(null)).toBe(false);
    expect(isListingPromptContext('prompt-1')).toBe(false);
    expect(isListingPromptContext({ promptType: 'listing' })).toBe(false);
    expect(isListingPromptContext({})).toBe(false);
  });

  it('无参数时读取活动线程上下文（bootstrap 空线程下为 false）', () => {
    expect(isListingPromptContext()).toBe(false);
  });
});
