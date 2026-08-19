import { createOneShotHandoffQueue } from '@/common/utils/oneShotHandoff';

import type { GeneratedPromptProfileSnapshot } from '@/types/modules-business';

export interface ListingPromptSource {
  id: string;
  prompt: string;
  historyId?: string | number | null;
  sourceHistoryId?: string | number | null;
  marketplace?: string;
  asins?: string[];
  profile?: GeneratedPromptProfileSnapshot;
}

export interface ListingPromptWorkflowContext {
  promptId: string;
  prompt: string;
  seoKeywords: string[];
  workItemId: string;
  marketplace: string;
  asinOrSku: string;
}

function parseSeoKeywords(profile: GeneratedPromptProfileSnapshot | undefined): string[] {
  const seen = new Set<string>();
  return [profile?.keywordsTier1, profile?.keywordsTier2]
    .filter((value): value is string => typeof value === 'string')
    .join('\n')
    .split(/[\n,;，；]+/)
    .map(keyword => keyword.trim())
    .filter(keyword => {
      const normalized = keyword.toLowerCase();
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

function cloneContext(context: ListingPromptWorkflowContext): ListingPromptWorkflowContext {
  return {
    ...context,
    seoKeywords: [...context.seoKeywords],
  };
}

const promptHandoff = createOneShotHandoffQueue<ListingPromptWorkflowContext>({
  clone: cloneContext,
});
const threadResumeHandoff = createOneShotHandoffQueue<string>();

export function createListingPromptWorkflowContext(
  prompt: ListingPromptSource
): ListingPromptWorkflowContext {
  const historyId = prompt.historyId ?? prompt.sourceHistoryId;

  return {
    promptId: prompt.id,
    prompt: prompt.prompt,
    seoKeywords: parseSeoKeywords(prompt.profile),
    workItemId:
      historyId !== null && historyId !== undefined
        ? `competitor_listing:${String(historyId)}`
        : `competitor_listing:prompt:${prompt.id}`,
    marketplace: prompt.marketplace?.trim() || '',
    asinOrSku: prompt.asins?.filter(Boolean).join(', ') || '',
  };
}

export function queueListingPromptForDeepChat(context: ListingPromptWorkflowContext): void {
  promptHandoff.queue(context);
}

export function consumeListingPromptForDeepChat(): ListingPromptWorkflowContext | null {
  return promptHandoff.consume();
}

export function queueDeepChatThreadResume(threadId: string): void {
  const normalized = threadId.trim();
  if (!normalized) {
    threadResumeHandoff.clear();
    return;
  }
  threadResumeHandoff.queue(normalized);
}

export function consumeDeepChatThreadResume(): string | null {
  return threadResumeHandoff.consume();
}

export function clearListingPromptHandoff(): void {
  promptHandoff.clear();
  threadResumeHandoff.clear();
}
