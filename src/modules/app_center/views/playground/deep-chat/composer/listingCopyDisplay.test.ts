import { describe, expect, it } from 'vitest';
import { resolveListingDisplayText, withListingDisplaySanitize } from './listingCopyDisplay';

const listingContext = {
  promptId: 'prompt-1',
  prompt: 'Rewrite this listing with sharper benefits',
  seoKeywords: ['wireless earbuds'],
  workItemId: 'competitor_listing:history-1',
  marketplace: 'US',
  asinOrSku: 'B001',
};

const prefaceText = [
  'Ich habe die Briefings (Product DNA, SEO-Mandat, Competitor Insights) gegen die Quellen-Prioritäts- und Fakten-Autoritätsregeln geprüft. Wichtigste Konsequenz vorab: ...',
  '',
  '1. Title: Kabellose Ohrhörer mit langer Akkulaufzeit',
].join('\n');

describe('resolveListingDisplayText（渲染层单条净化）', () => {
  it('listing 上下文 + 前言 → 输出净化文本', () => {
    expect(resolveListingDisplayText(prefaceText, listingContext)).toBe(
      '1. Title: Kabellose Ohrhörer mit langer Akkulaufzeit'
    );
  });

  it('非 listing 上下文 → 原样返回', () => {
    expect(resolveListingDisplayText(prefaceText)).toBe(prefaceText);
    expect(resolveListingDisplayText(prefaceText, null)).toBe(prefaceText);
    expect(resolveListingDisplayText(prefaceText, { promptType: 'listing' })).toBe(prefaceText);
  });

  it('前言但无正文起始标记 → 原样返回（保守）', () => {
    const noMarker = '这是普通聊天消息，没有任何 Title 标记';
    expect(resolveListingDisplayText(noMarker, listingContext)).toBe(noMarker);
  });

  it('已净化文本再次渲染 → 幂等，保持净化结果', () => {
    const clean = '1. Title: Kabellose Ohrhörer mit langer Akkulaufzeit';
    expect(resolveListingDisplayText(clean, listingContext)).toBe(clean);
  });
});

describe('withListingDisplaySanitize（历史渲染列表净化）', () => {
  it('listing 上下文：仅克隆被净化的 AI 消息，user 消息与入参原文不动', () => {
    const userMessage = { role: 'user' as const, text: '请生成 Listing 文案', createdAt: 1 };
    const aiMessage = { role: 'ai' as const, text: prefaceText, createdAt: 2 };
    const result = withListingDisplaySanitize([userMessage, aiMessage], listingContext);
    // user 消息复用原引用
    expect(result[0]).toBe(userMessage);
    // AI 消息克隆并净化
    expect(result[1]).not.toBe(aiMessage);
    expect(result[1].text).toBe('1. Title: Kabellose Ohrhörer mit langer Akkulaufzeit');
    // 不污染入参
    expect(aiMessage.text).toBe(prefaceText);
  });

  it('非 listing 上下文 → 原数组原样返回', () => {
    const messages = [{ role: 'ai' as const, text: prefaceText, createdAt: 2 }];
    expect(withListingDisplaySanitize(messages)).toBe(messages);
    expect(withListingDisplaySanitize(messages, null)).toBe(messages);
  });

  it('前言但无标题标记 → 原数组原样返回', () => {
    const messages = [{ role: 'ai' as const, text: '没有标题标记的普通文本', createdAt: 2 }];
    expect(withListingDisplaySanitize(messages, listingContext)).toBe(messages);
  });
});
