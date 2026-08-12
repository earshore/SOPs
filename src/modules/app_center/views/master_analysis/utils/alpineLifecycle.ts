type AlpineWithLifecycle = Window['Alpine'] & {
  $data?: (element: Element | null) => unknown;
  destroyTree?: (root: Element) => void;
};

export function getAlpineData(element: Element | null): unknown {
  const alpine = window.Alpine as AlpineWithLifecycle | undefined;
  return alpine?.$data?.(element) ?? null;
}

export function destroyAlpineComponent(selector: string): void {
  const element = document.querySelector(selector);
  if (!element) return;

  // Alpine 的 x-data 清理钩子会自行调用 data.destroy()，
  // 这里只需销毁组件树；手动再调一次会导致 destroy() 执行两遍（如重复弹 toast）。
  const alpine = window.Alpine as AlpineWithLifecycle | undefined;
  alpine?.destroyTree?.(element);
}
