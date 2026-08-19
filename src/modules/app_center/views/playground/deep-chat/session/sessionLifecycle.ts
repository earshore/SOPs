import { StorageService } from '@/services/storageService';

import {
  abortAllPendingRequests,
  clearAllPendingDisplayTimers,
  getMountedRenderContainer,
} from './pendingRuntime';
import {
  createDefaultThreadStore,
  clearPersistedThreadStore,
  renderHistoryThreadList,
  renderPromptDraftsForActiveThread,
} from './threadStore';
import { uiHooks } from './uiHooks';
import { THREAD_STORAGE_KEY } from '../constants';
import { sessionState, draftPersistController } from './sessionState';

export function disposeActiveSession(options: { clearPendingMap?: boolean } = {}): void {
  abortAllPendingRequests('cleared');
  clearAllPendingDisplayTimers();
  if (options.clearPendingMap) {
    sessionState.pendingRequests.clear();
  }
  sessionState.openThreadMenu = null;
  sessionState.editingThreadId = null;
  sessionState.editingThreadValue = '';
  sessionState.sessionSystemPrompt = '';
  sessionState.sessionTemperature = 0.3;
}

export async function clearDeepChatThreadStore(): Promise<void> {
  disposeActiveSession({ clearPendingMap: true });
  draftPersistController.cancel();
  sessionState.threadStore = createDefaultThreadStore();

  await clearPersistedThreadStore();
  StorageService.remove(THREAD_STORAGE_KEY);
  StorageService.remove(`${THREAD_STORAGE_KEY}_migrated_to_indexeddb`);

  const container = getMountedRenderContainer();
  if (!container) {
    return;
  }

  renderHistoryThreadList(container);
  renderPromptDraftsForActiveThread(container);
  uiHooks.refreshChatSearchResultsIfOpen(container);
  uiHooks.replaceChat(container);
  uiHooks.syncPendingStatus(container);
  uiHooks.applyThreadTuningToSession(container);
}

export { redactSensitiveError } from './uiHooks';
