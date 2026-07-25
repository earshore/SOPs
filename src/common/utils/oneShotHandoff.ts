/**
 * Single-slot one-shot handoff queue (queue → peek/consume → clear).
 */

export interface OneShotHandoffQueue<T> {
  queue(value: T): void;
  peek(): T | null;
  consume(): T | null;
  clear(): void;
}

function defaultClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Fall through to shallow clone.
    }
  }
  if (value !== null && typeof value === 'object') {
    return { ...(value as object) } as T;
  }
  return value;
}

export function createOneShotHandoffQueue<T>(options?: {
  clone?: (value: T) => T;
}): OneShotHandoffQueue<T> {
  const clone = options?.clone ?? defaultClone;
  let pending: T | null = null;

  return {
    queue(value: T): void {
      pending = clone(value);
    },
    peek(): T | null {
      if (pending === null) return null;
      return clone(pending);
    },
    consume(): T | null {
      if (pending === null) return null;
      const value = clone(pending);
      pending = null;
      return value;
    },
    clear(): void {
      pending = null;
    },
  };
}
