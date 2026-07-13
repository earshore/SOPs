import { appStore } from '@/stores/useAppStore';
import type { AppCenterListingCopy } from './listingCopyService';

export function applyListingCopyToKeywordHunter(copy: AppCenterListingCopy): void {
  appStore.getState().updateKeywordTracker({
    keywordsInputText: copy.seoKeywords.join('\n'),
    copyInputText: copy.content,
    keywords: [...copy.seoKeywords],
    processedCopy: copy.content,
    formattedCopy: '',
    matchedKeywords: [],
    unmatchedKeywords: [...copy.seoKeywords],
    wordFrequency: [],
    paragraphs: [],
    translationMode: false,
    showTranslation: false,
    llmAnalysisResult: '',
    currentSnapshotId: null,
    keywordLocationIndex: {},
    snapshotSource: {
      type: 'manual',
      workItemId: copy.workItemId,
      sourceRoute: 'playground_deep_chat',
      sourceAsinOrSku: copy.asinOrSku,
    },
  });
}
