import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearListingPromptHandoff,
  consumeDeepChatThreadResume,
  consumeListingPromptForDeepChat,
  createListingPromptWorkflowContext,
  queueDeepChatThreadResume,
  queueListingPromptForDeepChat,
} from '@/modules/app_center/listingWorkflowHandoff';

describe('App Center Listing workflow handoff', () => {
  beforeEach(() => clearListingPromptHandoff());

  it('binds the selected Prompt to its execution and deduplicated SEO keywords', () => {
    const context = createListingPromptWorkflowContext({
      id: 'prompt-001',
      prompt: 'Generate a German product listing',
      historyId: 'history-001',
      marketplace: 'DE',
      asins: ['B000000001'],
      profile: {
        keywordsTier1: 'haupt keyword, Second Keyword',
        keywordsTier2: 'second keyword\nlongtail',
      },
    });

    expect(context).toEqual({
      promptId: 'prompt-001',
      prompt: 'Generate a German product listing',
      seoKeywords: ['haupt keyword', 'Second Keyword', 'longtail'],
      workItemId: 'competitor_listing:history-001',
      marketplace: 'DE',
      asinOrSku: 'B000000001',
    });
  });

  it('consumes a queued Prompt exactly once', () => {
    const context = createListingPromptWorkflowContext({
      id: 'prompt-001',
      prompt: 'Generate copy',
      profile: { keywordsTier1: 'keyword' },
    });
    queueListingPromptForDeepChat(context);

    expect(consumeListingPromptForDeepChat()).toEqual(context);
    expect(consumeListingPromptForDeepChat()).toBeNull();
  });

  it('consumes a queued Deep Chat thread exactly once', () => {
    queueDeepChatThreadResume('thread-2');

    expect(consumeDeepChatThreadResume()).toBe('thread-2');
    expect(consumeDeepChatThreadResume()).toBeNull();
  });

  it('routes product-copy generation to Deep Chat from the Listing Prompt header', () => {
    const template = readFileSync(
      'src/modules/app_center/views/master_analysis/promptlab/template.html',
      'utf8'
    );

    expect(template).toContain('handoffListingPromptToDeepChat');
    expect(template).toContain('推送至Deep Chat生成产品文案');
    expect(template).toContain('promptlab-handoff-deepchat-btn');
    expect(template).not.toContain('复制 SEO 关键词');
    expect(template).not.toContain('copySeoKeywords');
    expect(template).not.toContain('进入 Keyword Hunter 复核');
    expect(template).not.toContain('handoffListingPromptToKeywordHunter');
  });
});
