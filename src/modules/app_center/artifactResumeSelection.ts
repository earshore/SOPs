import type { GeneratedPromptRecord, HistoryItem } from '@/types/modules-business';

export interface PendingPromptResume {
  historyId: HistoryItem['id'];
  prompt: GeneratedPromptRecord;
}

let pendingPromptResume: PendingPromptResume | null = null;

function clonePromptResume(selection: PendingPromptResume): PendingPromptResume {
  return {
    historyId: selection.historyId,
    prompt: JSON.parse(JSON.stringify(selection.prompt)) as GeneratedPromptRecord,
  };
}

export function queuePromptResume(selection: PendingPromptResume): void {
  pendingPromptResume = clonePromptResume(selection);
}

export function consumePromptResume(historyId: HistoryItem['id']): PendingPromptResume | null {
  if (!pendingPromptResume || String(pendingPromptResume.historyId) !== String(historyId)) {
    return null;
  }

  const selection = clonePromptResume(pendingPromptResume);
  pendingPromptResume = null;
  return selection;
}

export function clearPromptResume(): void {
  pendingPromptResume = null;
}
