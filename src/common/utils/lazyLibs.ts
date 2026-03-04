// src/common/utils/lazyLibs.ts
// ================================================================
// 🎯 懒加载重型库 (TypeScript版本)
// 延迟加载大型第三方库以优化初始包大小
// ================================================================

import { Logger } from '@services/loggerService';

/**
 * Chart.js 类型 (简化版)
 */
type ChartJS = unknown;

/**
 * GridStack 类型 (简化版)
 */
type GridStack = unknown;

/**
 * Window扩展类型
 */
type WindowWithLibs = Window & {
  Chart?: ChartJS;
  GridStack?: GridStack;
};

let chartJsPromise: Promise<ChartJS> | null = null;
let gridStackPromise: Promise<GridStack> | null = null;

/**
 * 懒加载 Chart.js
 */
export function loadChartJs(): Promise<ChartJS> {
  const win = window as WindowWithLibs;
  if (win.Chart) return Promise.resolve(win.Chart);

  if (!chartJsPromise) {
    Logger.debug('⏳ Loading Chart.js...');
    chartJsPromise = import('chart.js/auto')
      .then((module) => {
        win.Chart = module.default;
        Logger.debug('✅ Chart.js Loaded');
        return win.Chart as ChartJS;
      })
      .catch((err) => {
        Logger.error('Failed to load Chart.js', err);
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
  const win = window as WindowWithLibs;
  if (win.GridStack) return Promise.resolve(win.GridStack);

  if (!gridStackPromise) {
    Logger.debug('⏳ Loading GridStack...');
    // Load CSS first
    import('gridstack/dist/gridstack.min.css');

    gridStackPromise = import('gridstack')
      .then((module) => {
        win.GridStack = module.GridStack;
        Logger.debug('✅ GridStack Loaded');
        return win.GridStack as GridStack;
      })
      .catch((err) => {
        Logger.error('Failed to load GridStack', err);
        gridStackPromise = null;
        throw err;
      });
  }
  return gridStackPromise;
}
