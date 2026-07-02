export interface DraftPersistController {
  schedule(): void;
  flush(): void;
  cancel(): void;
  hasPending(): boolean;
}

export function createDraftPersistController(
  persist: () => void,
  delayMs: number
): DraftPersistController {
  let timerId: number | null = null;

  const cancel = (): void => {
    if (timerId === null) {
      return;
    }

    window.clearTimeout(timerId);
    timerId = null;
  };

  return {
    schedule(): void {
      cancel();
      timerId = window.setTimeout(() => {
        timerId = null;
        persist();
      }, delayMs);
    },

    flush(): void {
      if (timerId === null) {
        return;
      }

      cancel();
      persist();
    },

    cancel,

    hasPending(): boolean {
      return timerId !== null;
    },
  };
}
