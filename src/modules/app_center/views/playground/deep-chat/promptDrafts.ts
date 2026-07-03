import { appStore } from '@/stores/useAppStore';
import type { PromptHistoryItem } from '@/types/state';
import { MAX_PROMPT_DRAFT_COUNT } from './constants';
import { formatThreadTime } from './utils';

export function getPromptDrafts(): PromptHistoryItem[] {
  const history = appStore.getState().promptlab.history || [];

  return history
    .filter(item =>
      Boolean(
        item && item.prompt && (item.promptType === 'listing' || item.promptType === 'visual')
      )
    )
    .sort((a, b) => getPromptDraftTime(b) - getPromptDraftTime(a))
    .slice(0, MAX_PROMPT_DRAFT_COUNT);
}

export function getPromptDraftTime(prompt: PromptHistoryItem): number {
  if (Number.isFinite(prompt.timestamp)) {
    return prompt.timestamp;
  }

  const generatedTime = prompt.generatedAt ? new Date(prompt.generatedAt).getTime() : 0;
  return Number.isFinite(generatedTime) ? generatedTime : 0;
}

export function formatPromptDraftMeta(prompt: PromptHistoryItem): string {
  const parts = [
    prompt.marketplace,
    prompt.asins && prompt.asins.length > 0 ? prompt.asins.slice(0, 2).join(', ') : '',
    formatThreadTime(getPromptDraftTime(prompt)),
  ].filter(Boolean);

  return parts.join(' · ');
}

export function formatPromptDraftPreviewMeta(prompt: PromptHistoryItem): string {
  const asins = prompt.asins?.filter(Boolean).join(', ') || '';
  const parts = [prompt.marketplace, asins, formatThreadTime(getPromptDraftTime(prompt))].filter(
    Boolean
  );

  return parts.join(' · ');
}
