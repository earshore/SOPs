// examples/state-sync-usage.ts
/**
 * 状态同步工具使用示例
 */

import { appStore } from '@/stores/useAppStore';
import type { 
  createStateSync, 
  createMultipleStateSyncs,
  createTwoWayBinding,
  createComputedSync,
  cleanupSubscriptions
} from '../src/common/utils/stateSync';

// ==================== 示例 1: 单个状态同步 ====================

function example1_SingleStateSync() {
  console.log('=== 示例 1: 单个状态同步 ===');
  
  // 在 Alpine 组件中
  const component = {
    selectedAsins: [] as string[],
    
    init() {
      // 订阅 selectedAsins 变化
      this._unsubscribe = createStateSync({
        selector: (state) => state.analysis.selectedAsins,
        onChange: (asins) => {
          this.selectedAsins = asins;
          console.log('ASINs 已更新:', asins);
        },
        immediate: true // 立即执行一次
      });
    },
    
    destroy() {
      this._unsubscribe?.();
    },
    
    _unsubscribe: null as (() => void) | null
  };
  
  component.init();
  
  // 触发状态变化
  appStore.getState().setSelectedAsins(['B001', 'B002']);
  
  component.destroy();
}

// ==================== 示例 2: 多个状态同步 ====================

function example2_MultipleStateSyncs() {
  console.log('=== 示例 2: 多个状态同步 ===');
  
  const component = {
    selectedAsins: [] as string[],
    isAnalyzing: false,
    analysisReport: null as any,
    
    init() {
      // 同时订阅多个状态
      this._unsubscribes = createMultipleStateSyncs([
        {
          selector: (state) => state.analysis.selectedAsins,
          onChange: (asins) => {
            this.selectedAsins = asins;
          }
        },
        {
          selector: (state) => state.analysis.isAnalyzing,
          onChange: (isAnalyzing) => {
            this.isAnalyzing = isAnalyzing;
          }
        },
        {
          selector: (state) => state.analysis.analysisReport,
          onChange: (report) => {
            this.analysisReport = report;
          }
        }
      ]);
    },
    
    destroy() {
      cleanupSubscriptions(this._unsubscribes);
    },
    
    _unsubscribes: [] as Array<() => void>
  };
  
  component.init();
  
  // 触发多个状态变化
  appStore.getState().setSelectedAsins(['B001']);
  appStore.getState().updateAnalysis({ isAnalyzing: true });
  
  component.destroy();
}

// ==================== 示例 3: 双向绑定 ====================

function example3_TwoWayBinding() {
  console.log('=== 示例 3: 双向绑定 ===');
  
  const component = {
    currentTab: 'home',
    
    init() {
      // 创建双向绑定
      this._binding = createTwoWayBinding({
        get: () => appStore.getState().ui.currentTab,
        set: (value) => appStore.getState().setCurrentTab(value),
        onChange: (value) => {
          this.currentTab = value;
          console.log('Tab 已更新:', value);
        }
      });
    },
    
    // 组件内部修改
    changeTab(tab: string) {
      appStore.getState().setCurrentTab(tab);
      // 会自动同步到 this.currentTab
    },
    
    destroy() {
      this._binding?.();
    },
    
    _binding: null as (() => void) | null
  };
  
  component.init();
  
  // 外部修改
  appStore.getState().setCurrentTab('scraper');
  
  // 组件内部修改
  component.changeTab('analysis');
  
  component.destroy();
}

// ==================== 示例 4: 计算属性同步 ====================

function example4_ComputedSync() {
  console.log('=== 示例 4: 计算属性同步 ===');
  
  const component = {
    canAnalyze: false,
    
    init() {
      // 创建计算属性：当 selectedAsins 和 scrapedData 都存在时可以分析
      this._computed = createComputedSync({
        deps: [
          (state) => state.analysis.selectedAsins,
          (state) => state.scraper.scrapedData
        ],
        compute: (selectedAsins, scrapedData) => {
          return selectedAsins.length > 0 && scrapedData !== null;
        },
        onChange: (canAnalyze) => {
          this.canAnalyze = canAnalyze;
          console.log('可以分析:', canAnalyze);
        }
      });
    },
    
    destroy() {
      this._computed?.();
    },
    
    _computed: null as (() => void) | null
  };
  
  component.init();
  
  // 触发依赖变化
  appStore.getState().setSelectedAsins(['B001']);
  appStore.getState().setScrapedData({ products: [] });
  
  component.destroy();
}

// ==================== 示例 5: Alpine.js 组件集成 ====================

function example5_AlpineIntegration() {
  console.log('=== 示例 5: Alpine.js 组件集成 ===');
  
  // 实际的 Alpine 组件定义
  const alpineComponent = () => ({
    // 响应式数据
    selectedAsins: [] as string[],
    isAnalyzing: false,
    canAnalyze: false,
    
    // 订阅清理函数
    _unsubscribes: [] as Array<() => void>,
    
    // 初始化
    init() {
      console.log('[Alpine] 初始化组件');
      
      // 同步多个状态
      this._unsubscribes = createMultipleStateSyncs([
        {
          selector: (state) => state.analysis.selectedAsins,
          onChange: (asins) => {
            this.selectedAsins = asins;
          },
          immediate: true
        },
        {
          selector: (state) => state.analysis.isAnalyzing,
          onChange: (isAnalyzing) => {
            this.isAnalyzing = isAnalyzing;
          },
          immediate: true
        }
      ]);
      
      // 添加计算属性
      this._unsubscribes.push(
        createComputedSync({
          deps: [
            (state) => state.analysis.selectedAsins,
            (state) => state.scraper.scrapedData
          ],
          compute: (selectedAsins, scrapedData) => {
            return selectedAsins.length > 0 && scrapedData !== null;
          },
          onChange: (canAnalyze) => {
            this.canAnalyze = canAnalyze;
          }
        })
      );
    },
    
    // 用户操作
    toggleAsin(asin: string) {
      const current = appStore.getState().analysis.selectedAsins;
      const index = current.indexOf(asin);
      if (index > -1) {
        appStore.getState().setSelectedAsins(current.filter(a => a !== asin));
      } else {
        appStore.getState().setSelectedAsins([...current, asin]);
      }
      // 状态会自动同步到 this.selectedAsins
    },
    
    startAnalysis() {
      if (!this.canAnalyze) {
        console.warn('无法开始分析');
        return;
      }
      
      appStore.getState().updateAnalysis({ isAnalyzing: true });
      // 状态会自动同步到 this.isAnalyzing
      
      // 模拟分析
      setTimeout(() => {
        appStore.getState().updateAnalysis({ isAnalyzing: false });
      }, 2000);
    },
    
    // 清理
    destroy() {
      console.log('[Alpine] 销毁组件');
      cleanupSubscriptions(this._unsubscribes);
    }
  });
  
  // 模拟使用
  const component = alpineComponent();
  component.init();
  
  // 触发操作
  component.toggleAsin('B001');
  component.toggleAsin('B002');
  component.startAnalysis();
  
  setTimeout(() => {
    component.destroy();
  }, 3000);
}

// ==================== 运行所有示例 ====================

export function runAllExamples() {
  example1_SingleStateSync();
  example2_MultipleStateSyncs();
  example3_TwoWayBinding();
  example4_ComputedSync();
  example5_AlpineIntegration();
}

if (require.main === module) {
  runAllExamples();
}
