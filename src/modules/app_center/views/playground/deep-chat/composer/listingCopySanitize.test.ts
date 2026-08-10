import { describe, expect, it } from 'vitest';
import {
  hasListingCopyStart,
  isCompleteListingCopy,
  isListingPromptContext,
  sanitizeListingCopy,
} from './listingCopySanitize';

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
    const text =
      'Vorab: Ich habe die Briefings gegen die Quellen-Prioritätsregeln geprüft.\nTitel: Kabellose Ohrhörer';
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

describe('isCompleteListingCopy', () => {
  const fullNumbered = [
    '1. Title: Kabellose Ohrhörer',
    '2. Bullet 1: Feature one',
    '3. Bullet 2: Feature two',
    '4. Bullet 3: Feature three',
    '5. Bullet 4: Feature four',
    '6. Bullet 5: Feature five',
    '7. Description: Long product description here.',
  ].join('\n');

  it('accepts a full numbered listing with Description and 5 bullets', () => {
    expect(isCompleteListingCopy(fullNumbered)).toBe(true);
  });

  it('rejects truncated numbered listing missing Description / bullets', () => {
    const truncated = [
      '1. Title: Kabellose Ohrhörer',
      '2. Bullet 1: Feature one',
      '3. Bullet 2: Feature two',
    ].join('\n');
    expect(hasListingCopyStart(truncated)).toBe(true);
    expect(isCompleteListingCopy(truncated)).toBe(false);
  });

  it('allows free-form Title start without numbered markers', () => {
    expect(
      isCompleteListingCopy('Title  \nOrganizer Box Storage Organizer Stackable Waterproof')
    ).toBe(true);
  });
});

describe('hasListingCopyStart', () => {
  it('grok 实测格式「Title  \nOrganizer Box…」（行首独立词 + 尾随两空格）命中', () => {
    expect(
      hasListingCopyStart('Title  \nOrganizer Box Storage Organizer Stackable Waterproof')
    ).toBe(true);
  });

  it('行首纯 Title（无冒号无编号）命中', () => {
    expect(hasListingCopyStart('Title\nProduct name here')).toBe(true);
  });

  it('gpt 实测格式（前言 + "1. Title"）命中', () => {
    expect(
      hasListingCopyStart(
        'Below is a complete, Rufus-ready Amazon.com listing\n1. Title: Organizer Box'
      )
    ).toBe(true);
  });

  it('德语 Titel （含冒号/行首词）命中', () => {
    expect(hasListingCopyStart('Vorab geprüft.\nTitel: Kabellose Ohrhörer')).toBe(true);
    expect(hasListingCopyStart('Titel\nProduktname')).toBe(true);
  });

  it('全角冒号 Title：命中', () => {
    expect(hasListingCopyStart('Title：Organizer Box')).toBe(true);
  });

  it('德语连字符构词（Title-Verifikation）不误命中', () => {
    expect(hasListingCopyStart('Title-Verifikation: Ich prüfe die Briefings.')).toBe(false);
  });

  it('DEEP_CHAT_001 错误文案不命中', () => {
    expect(
      hasListingCopyStart(
        '请求失败：模型完成了推理但未返回可见正文（常见原因：max_output_tokens 过小、网关只推 reasoning、或 /responses 返回了非标准正文格式）。请增大输出上限、关闭推理后重试，或在系统设置将路径改为 chat/completions。'
      )
    ).toBe(false);
  });

  it('普通句子 / 空字符串不命中', () => {
    expect(hasListingCopyStart('这是普通聊天消息，没有任何 Title 标记')).toBe(false);
    expect(hasListingCopyStart('')).toBe(false);
    expect(hasListingCopyStart('   ')).toBe(false);
  });

  it('正文中间（非行首）的 Title 不命中（要求行首或在冒号后行内）', () => {
    expect(hasListingCopyStart('please check the Title field.')).toBe(false);
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
