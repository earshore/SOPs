type AlpineWithLifecycle = Window['Alpine'] & {
  $data?: (element: Element | null) => unknown;
  destroyTree?: (root: Element) => void;
};

type DestroyableComponent = {
  destroy: () => void;
};

function isDestroyableComponent(value: unknown): value is DestroyableComponent {
  return !!value && typeof value === 'object' && typeof (value as DestroyableComponent).destroy === 'function';
}

export function getAlpineData(element: Element | null): unknown {
  const alpine = window.Alpine as AlpineWithLifecycle | undefined;
  return alpine?.$data?.(element) ?? null;
}

export function destroyAlpineComponent(selector: string): void {
  const element = document.querySelector(selector);
  if (!element) return;

  const alpineData = getAlpineData(element);
  if (isDestroyableComponent(alpineData)) {
    alpineData.destroy();
  }

  const alpine = window.Alpine as AlpineWithLifecycle | undefined;
  alpine?.destroyTree?.(element);
}
