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

  it('rejects truncated numbered Bullet template missing Description / bullets', () => {
    const truncated = [
      '1. Title: Kabellose Ohrhörer',
      '2. Bullet 1: Feature one',
      '3. Bullet 2: Feature two',
    ].join('\n');
    expect(hasListingCopyStart(truncated)).toBe(true);
    expect(isCompleteListingCopy(truncated)).toBe(false);
  });

  it('does not treat lone "1. Title" as incomplete when body is a long free-form listing', () => {
    const mixed = [
      '1. Title: HONGE CB Ordnungssystem – Platzsparend & Wasserdicht',
      '',
      'Dieses vielseitige Ordnungssystem schafft Stauraum in Küche und Bad.',
      'Es ist stapelbar, wasserdicht und in unter zwei Minuten aufgebaut.',
      'Ideal für Gewürze, Kosmetik und Büroartikel mit neutralem Design.',
      'Bestellen Sie jetzt und schaffen Sie Ordnung im gesamten Zuhause.',
    ].join('\n');
    expect(hasListingCopyStart(mixed)).toBe(true);
    expect(isCompleteListingCopy(mixed)).toBe(true);
  });

  it('accepts markdown-bold DE listing (**Titel** / **Bullet** / **Beschreibung**)', () => {
    const boldDe = [
      '**Titel**: Kabellose Ohrhörer mit ANC',
      '**Bullet 1**: Langer Akku',
      '**Bullet 2**: Aktive Geräuschunterdrückung',
      '**Bullet 3**: IPX5 wasserdicht',
      '**Bullet 4**: Bequemer Sitz',
      '**Bullet 5**: Schnellladen',
      '**Beschreibung**: Hochwertige Ohrhörer für den Alltag mit klarem Klang.',
    ].join('\n');
    expect(isCompleteListingCopy(boldDe)).toBe(true);
  });

  it('accepts Title + dash bullets + Description (no "N. Bullet" labels)', () => {
    const dashStyle = [
      '1. Title: Wireless Earbuds',
      'Key benefits:',
      '- Long battery life for all-day use',
      '- Active noise cancellation',
      '- IPX5 sweat resistance',
      '- Comfortable fit',
      '- Fast USB-C charging',
      'Description:',
      'Premium wireless earbuds designed for daily commuting and workouts.',
    ].join('\n');
    expect(isCompleteListingCopy(dashStyle)).toBe(true);
  });

  it('allows long free-form Title start without numbered Bullet labels', () => {
    const free = `Title
Organizer Box Storage Organizer Stackable Waterproof for Kitchen and Bathroom
This modular system creates extra space in every cabinet and is easy to clean.
Stackable design, BPA-free plastic, tool-free setup in under two minutes.
Perfect for spices, cosmetics, tools, and office supplies in any room.`;
    expect(isCompleteListingCopy(free)).toBe(true);
  });

  it('rejects title-only stub', () => {
    expect(isCompleteListingCopy('Title\nShort name')).toBe(false);
    expect(isCompleteListingCopy('1. Title: Only a title line')).toBe(false);
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

  it('德语 markdown 加粗 Titel（冒号在 ** 外）命中 — 实测误拦根因', () => {
    // indexOf('Titel:') 在 "**Titel**:" 上失败（l 与 : 之间夹着 **）
    expect(hasListingCopyStart('**Titel**: Kabellose Ohrhörer mit ANC')).toBe(true);
    expect(hasListingCopyStart('**Titel**\nKabellose Ohrhörer mit ANC')).toBe(true);
    expect(
      hasListingCopyStart(
        'Ich habe die Briefings geprüft.\n\n**Titel**: Kabellose Ohrhörer\n\n**Bullet 1**: …'
      )
    ).toBe(true);
    expect(sanitizeListingCopy('Vorwort.\n\n**Titel**: Produktname')).toBe(
      '**Titel**: Produktname'
    );
  });

  it('markdown 标题行 # Title / ## Titel 命中', () => {
    expect(hasListingCopyStart('# Title\nWireless earbuds')).toBe(true);
    expect(hasListingCopyStart('## Titel\nKabellose Ohrhörer')).toBe(true);
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
