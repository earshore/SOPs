// src/common/utils/lazyLibs.ts
// ================================================================
// 🎯 懒加载重型库 (TypeScript版本)
// 延迟加载大型第三方库以优化初始包大小
// ================================================================

/**
 * Chart.js 类型 (简化版)
 */
type ChartJS = any;

/**
 * GridStack 类型 (简化版)
 */
type GridStack = any;

let chartJsPromise: Promise<ChartJS> | null = null;
let gridStackPromise: Promise<GridStack> | null = null;

/**
 * 懒加载 Chart.js
 */
export function loadChartJs(): Promise<ChartJS> {
  if ((window as any).Chart) return Promise.resolve((window as any).Chart);

  if (!chartJsPromise) {
    console.log('⏳ Loading Chart.js...');
    chartJsPromise = import('chart.js/auto')
      .then((module) => {
        (window as any).Chart = module.default;
        console.log('✅ Chart.js Loaded');
        return (window as any).Chart;
      })
      .catch((err) => {
        console.error('Failed to load Chart.js', err);
        chartJsPromise = null; // Allow retry
        throw err;
      });
  }
  return chartJsPromise;
}

/**
 * 懒加载 GridStack
 */
export function loadGridStack(): Promise<GridStack> {
  if ((window as any).GridStack) return Promise.resolve((window as any).GridStack);

  if (!gridStackPromise) {
    console.log('⏳ Loading GridStack...');
    // Load CSS first
    import('gridstack/dist/gridstack.min.css');

    gridStackPromise = import('gridstack')
      .then((module) => {
        (window as any).GridStack = module.GridStack;
        console.log('✅ GridStack Loaded');
        return (window as any).GridStack;
      })
      .catch((err) => {
        console.error('Failed to load GridStack', err);
        gridStackPromise = null;
        throw err;
      });
  }
  return gridStackPromise;
}
