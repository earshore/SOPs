import { APP_EVENTS, emitAppEvent } from '@/common/constants/eventConstants';
import eventBus from '@/common/EventBus';

export function emitHistoryUpdated(): void {
  eventBus.emit(APP_EVENTS.HISTORY_UPDATED);

  if (typeof window !== 'undefined') {
    emitAppEvent(APP_EVENTS.HISTORY_UPDATED);
  }
}
