import { beforeEach, describe, expect, it } from 'vitest';
import {
  appStore,
  createRefreshSafeKeywordTrackerState,
  KEYWORD_HUNTER_INPUT_PERSIST_MAX_CHARS,
} from './useAppStore';

describe('keywordTracker input persistence slice', () => {
  beforeEach(() => {
    appStore.getState().resetKeywordTracker();
  });

  it('keeps copy and keywords inputs in the refresh-safe slice', () => {
    const slice = createRefreshSafeKeywordTrackerState(
      { matchCase: true },
      { copyInputText: 'Listing body for KH', keywordsInputText: 'kw1\nkw2' }
    );
    expect(slice.copyInputText).toBe('Listing body for KH');
    expect(slice.keywordsInputText).toBe('kw1\nkw2');
    expect(slice.settings.matchCase).toBe(true);
    // Runtime-only fields stay cleared
    expect(slice.keywords).toEqual([]);
    expect(slice.isTracking).toBe(false);
  });

  it('clips oversized inputs to the persist max', () => {
    const huge = 'x'.repeat(KEYWORD_HUNTER_INPUT_PERSIST_MAX_CHARS + 50);
    const slice = createRefreshSafeKeywordTrackerState(undefined, { copyInputText: huge });
    expect(slice.copyInputText?.length).toBe(KEYWORD_HUNTER_INPUT_PERSIST_MAX_CHARS);
  });

  it('resetKeywordTracker clears inputs', () => {
    appStore.getState().updateKeywordTracker({
      copyInputText: 'x',
      keywordsInputText: 'y',
    });
    appStore.getState().resetKeywordTracker();
    expect(appStore.getState().keywordTracker.copyInputText).toBe('');
    expect(appStore.getState().keywordTracker.keywordsInputText).toBe('');
  });
});
