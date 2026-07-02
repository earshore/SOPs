export interface ListenerRegistry {
  add(element: EventTarget | null, type: string, handler: EventListenerOrEventListenerObject): void;
  clear(): void;
}

interface ListenerRecord {
  element: EventTarget;
  type: string;
  handler: EventListenerOrEventListenerObject;
}

export function createListenerRegistry(): ListenerRegistry {
  const listeners: ListenerRecord[] = [];

  function add(
    element: EventTarget | null,
    type: string,
    handler: EventListenerOrEventListenerObject
  ): void {
    if (!element) return;
    element.addEventListener(type, handler);
    listeners.push({ element, type, handler });
  }

  function clear(): void {
    listeners.forEach(({ element, type, handler }) => {
      element.removeEventListener(type, handler);
    });
    listeners.length = 0;
  }

  return { add, clear };
}
