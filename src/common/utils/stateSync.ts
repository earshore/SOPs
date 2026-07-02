// src/common/utils/stateSync.ts
/**
 * 状态同步工具
 * 用于在 Alpine 组件和 Zustand 之间自动同步状态
 */

import { appStore } from '@/stores/useAppStore';

/**
 * 状态同步配置
 */
interface StateSyncConfig<T = unknown> {
  /** 状态选择器 */
  selector: (state: ReturnType<typeof appStore.getState>) => T;
  /** 状态变化回调 */
  onChange: (value: T, previousValue: T) => void;
  /** 是否立即执行一次回调 */
  immediate?: boolean;
}

/**
 * 创建状态同步器
 * 自动订阅 Zustand 状态变化并同步到 Alpine 组件
 *
 * @example
 * ```typescript
 * // 在 Alpine 组件的 init() 中
 * this._unsubscribe = createStateSync({
 *   selector: (state) => state.analysis.selectedAsins,
 *   onChange: (asins) => {
 *     this.selectedAsins = asins;
 *   },
 *   immediate: true
 * });
 *
 * // 在 destroy() 中清理
 * this._unsubscribe?.();
 * ```
 */
export function createStateSync<T>(config: StateSyncConfig<T>): () => void {
  const { selector, onChange, immediate = false } = config;

  let previousValue = selector(appStore.getState());

  // 立即执行一次
  if (immediate) {
    onChange(previousValue, previousValue);
  }

  // 订阅状态变化
  const unsubscribe = appStore.subscribe(state => {
    const currentValue = selector(state);

    // 只在值真正改变时触发回调
    if (currentValue !== previousValue) {
      onChange(currentValue, previousValue);
      previousValue = currentValue;
    }
  });

  return unsubscribe;
}

/**
 * 创建多个状态同步器
 *
 * @example
 * ```typescript
 * this._unsubscribes = createMultipleStateSyncs([
 *   {
 *     selector: (state) => state.analysis.selectedAsins,
 *     onChange: (asins) => { this.selectedAsins = asins; }
 *   },
 *   {
 *     selector: (state) => state.analysis.isAnalyzing,
 *     onChange: (isAnalyzing) => { this.isAnalyzing = isAnalyzing; }
 *   }
 * ]);
 *
 * // 清理所有订阅
 * this._unsubscribes.forEach(fn => fn());
 * ```
 */
export function createMultipleStateSyncs(configs: StateSyncConfig[]): Array<() => void> {
  return configs.map(config => createStateSync(config));
}

/**
 * 创建双向状态绑定
 * 自动在 Alpine 组件和 Zustand 之间双向同步
 *
 * @example
 * ```typescript
 * // 在 Alpine 组件中
 * Alpine.data('myComponent', () => ({
 *   selectedAsins: [],
 *
 *   init() {
 *     this._binding = createTwoWayBinding({
 *       get: () => appStore.getState().analysis.selectedAsins,
 *       set: (value) => appStore.getState().setSelectedAsins(value),
 *       onChange: (value) => { this.selectedAsins = value; }
 *     });
 *   },
 *
 *   destroy() {
 *     this._binding?.();
 *   }
 * }));
 * ```
 */
export function createTwoWayBinding<T>(config: {
  get: () => T;
  set: (value: T) => void;
  onChange: (value: T) => void;
}): () => void {
  const { get, onChange } = config;

  let previousValue = get();
  onChange(previousValue);

  const unsubscribe = appStore.subscribe(() => {
    const currentValue = get();
    if (currentValue !== previousValue) {
      onChange(currentValue);
      previousValue = currentValue;
    }
  });

  return unsubscribe;
}

/**
 * 创建计算属性同步器
 * 当依赖的状态变化时，自动重新计算并更新
 *
 * @example
 * ```typescript
 * this._computed = createComputedSync({
 *   deps: [
 *     (state) => state.analysis.selectedAsins,
 *     (state) => state.scraper.scrapedData
 *   ],
 *   compute: (selectedAsins, scrapedData) => {
 *     return selectedAsins.length > 0 && scrapedData !== null;
 *   },
 *   onChange: (canAnalyze) => {
 *     this.canAnalyze = canAnalyze;
 *   }
 * });
 * ```
 */
export function createComputedSync<T extends unknown[], R>(config: {
  deps: Array<(state: ReturnType<typeof appStore.getState>) => unknown>;
  compute: (...args: T) => R;
  onChange: (value: R) => void;
}): () => void {
  const { deps, compute, onChange } = config;

  let previousDeps: unknown[] = [];
  let previousResult: R;

  const update = () => {
    const state = appStore.getState();
    const currentDeps = deps.map(dep => dep(state));

    // 检查依赖是否变化
    const depsChanged = currentDeps.some((dep, i) => dep !== previousDeps[i]);

    if (depsChanged) {
      const result = compute(...(currentDeps as T));
      if (result !== previousResult) {
        onChange(result);
        previousResult = result;
      }
      previousDeps = currentDeps;
    }
  };

  // 立即执行一次
  update();

  // 订阅状态变化
  const unsubscribe = appStore.subscribe(update);

  return unsubscribe;
}

/**
 * 批量清理订阅
 *
 * @example
 * ```typescript
 * const unsubscribes = [
 *   createStateSync(...),
 *   createStateSync(...),
 *   createStateSync(...)
 * ];
 *
 * // 清理所有订阅
 * cleanupSubscriptions(unsubscribes);
 * ```
 */
export function cleanupSubscriptions(unsubscribes: Array<(() => void) | null | undefined>): void {
  unsubscribes.forEach(fn => fn?.());
}
