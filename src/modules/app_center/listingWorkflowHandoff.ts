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

let pendingPromptContext: ListingPromptWorkflowContext | null = null;

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
  pendingPromptContext = cloneContext(context);
}

export function consumeListingPromptForDeepChat(): ListingPromptWorkflowContext | null {
  if (!pendingPromptContext) return null;
  const context = cloneContext(pendingPromptContext);
  pendingPromptContext = null;
  return context;
}

export function clearListingPromptHandoff(): void {
  pendingPromptContext = null;
}
