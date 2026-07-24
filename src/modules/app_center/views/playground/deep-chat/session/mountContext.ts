/**
 * Mounted container helpers — leaf module (only sessionState).
 */
import { sessionState } from './sessionState';

export function getMountedRenderContainer(): HTMLElement | null {
  if (!sessionState.mountedContainer || !document.body.contains(sessionState.mountedContainer)) {
    return null;
  }
  return sessionState.mountedContainer;
}

export function getRenderContainerForThread(threadId: string): HTMLElement | null {
  const container = getMountedRenderContainer();
  if (!container) {
    return null;
  }
  return sessionState.threadStore.activeThreadId === threadId ? container : null;
}
