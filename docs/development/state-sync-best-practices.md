# 状态同步最佳实践

## 问题背景

在使用 Alpine.js 组件时，经常需要在组件本地状态和 Zustand 全局状态之间同步数据。手动同步容易出错且代码冗余。

### 反模式 ❌

```typescript
// 手动同步 - 容易出错
Alpine.data('myComponent', () => ({
  selectedAsins: [],
  
  init() {
    // 手动从 Zustand 读取
    this.selectedAsins = appStore.getState().analysis.selectedAsins;
    
    // 手动订阅变化
    this._unsubscribe = appStore.subscribe((state) => {
      this.selectedAsins = state.analysis.selectedAsins;
    });
  },
  
  updateAsins(asins) {
    // 手动更新 Zustand
    appStore.getState().setSelectedAsins(asins);
    // 手动更新本地状态
    this.selectedAsins = asins;
  },
  
  destroy() {
    this._unsubscribe?.();
  }
}));
```

**问题**:
- 代码重复
- 容易忘记同步
- 难以维护
- 容易出现状态不一致

## 解决方案

使用 `stateSync` 工具自动处理状态同步。

### 方案 1: 单向同步（推荐）✅

适用于只需要读取 Zustand 状态的场景。

```typescript
import { createStateSync } from '@/common/utils/stateSync';

Alpine.data('myComponent', () => ({
  selectedAsins: [],
  
  init() {
    this._unsubscribe = createStateSync({
      selector: (state) => state.analysis.selectedAsins,
      onChange: (asins) => {
        this.selectedAsins = asins;
      },
      immediate: true // 立即执行一次
    });
  },
  
  destroy() {
    this._unsubscribe?.();
  }
}));
```

### 方案 2: 多状态同步 ✅

适用于需要同步多个状态的场景。

```typescript
import { createMultipleStateSyncs, cleanupSubscriptions } from '@/common/utils/stateSync';

Alpine.data('myComponent', () => ({
  selectedAsins: [],
  isAnalyzing: false,
  analysisReport: null,
  
  init() {
    this._unsubscribes = createMultipleStateSyncs([
      {
        selector: (state) => state.analysis.selectedAsins,
        onChange: (asins) => { this.selectedAsins = asins; }
      },
      {
        selector: (state) => state.analysis.isAnalyzing,
        onChange: (isAnalyzing) => { this.isAnalyzing = isAnalyzing; }
      },
      {
        selector: (state) => state.analysis.analysisReport,
        onChange: (report) => { this.analysisReport = report; }
      }
    ]);
  },
  
  destroy() {
    cleanupSubscriptions(this._unsubscribes);
  }
}));
```

### 方案 3: 计算属性同步 ✅

适用于需要基于多个状态计算派生值的场景。

```typescript
import { createComputedSync } from '@/common/utils/stateSync';

Alpine.data('myComponent', () => ({
  canAnalyze: false,
  
  init() {
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
      }
    });
  },
  
  destroy() {
    this._computed?.();
  }
}));
```

### 方案 4: 使用 Getter（最简单）✅

适用于只读场景，不需要本地副本。

```typescript
Alpine.data('myComponent', () => ({
  // 使用 getter 直接读取 Zustand
  get selectedAsins() {
    return appStore.getState().analysis.selectedAsins;
  },
  
  get isAnalyzing() {
    return appStore.getState().analysis.isAnalyzing;
  },
  
  // 不需要 init/destroy
}));
```

**优点**:
- 最简单
- 始终是最新值
- 不需要订阅和清理

**缺点**:
- 每次访问都会调用 `getState()`
- 不适合频繁访问的场景

## 完整示例

### 示例 1: AI 分析组件

```typescript
import { createMultipleStateSyncs, createComputedSync, cleanupSubscriptions } from '@/common/utils/stateSync';
import { appStore } from '@/stores/useAppStore';

Alpine.data('aiAnalysisPanel', () => ({
  // 本地状态
  selectedAsins: [],
  selectedTargets: [],
  isAnalyzing: false,
  progress: 0,
  canAnalyze: false,
  
  // 订阅清理
  _unsubscribes: [],
  
  init() {
    // 同步基础状态
    this._unsubscribes = createMultipleStateSyncs([
      {
        selector: (state) => state.analysis.selectedAsins,
        onChange: (asins) => { this.selectedAsins = asins; },
        immediate: true
      },
      {
        selector: (state) => state.analysis.isAnalyzing,
        onChange: (isAnalyzing) => { this.isAnalyzing = isAnalyzing; },
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
  
  // 用户操作 - 直接更新 Zustand
  toggleAsin(asin) {
    const current = appStore.getState().analysis.selectedAsins;
    const index = current.indexOf(asin);
    if (index > -1) {
      appStore.getState().setSelectedAsins(current.filter(a => a !== asin));
    } else {
      appStore.getState().setSelectedAsins([...current, asin]);
    }
    // 状态会自动同步到 this.selectedAsins
  },
  
  async startAnalysis() {
    if (!this.canAnalyze) return;
    
    appStore.getState().updateAnalysis({ isAnalyzing: true });
    
    try {
      // 执行分析...
      this.progress = 50;
      await performAnalysis();
      this.progress = 100;
    } finally {
      appStore.getState().updateAnalysis({ isAnalyzing: false });
    }
  },
  
  destroy() {
    cleanupSubscriptions(this._unsubscribes);
  }
}));
```

### 示例 2: Scraper 组件

```typescript
Alpine.data('scraperPanel', () => ({
  // 使用 getter 直接读取（简单场景）
  get isScraping() {
    return appStore.getState().scraper.isScraping;
  },
  
  get scrapedData() {
    return appStore.getState().scraper.scrapedData;
  },
  
  get hasData() {
    return this.scrapedData?.products?.length > 0;
  },
  
  // 用户操作
  async startScraping() {
    appStore.getState().setIsScraping(true);
    
    try {
      const data = await scrapeData();
      appStore.getState().setScrapedData(data);
    } finally {
      appStore.getState().setIsScraping(false);
    }
  }
}));
```

## 性能优化

### 1. 使用 Selector 优化

```typescript
// ❌ 不好 - 每次都创建新对象
selector: (state) => ({
  asins: state.analysis.selectedAsins,
  report: state.analysis.analysisReport
})

// ✅ 好 - 只选择需要的值
selector: (state) => state.analysis.selectedAsins
```

### 2. 避免不必要的订阅

```typescript
// ❌ 不好 - 订阅整个 store
appStore.subscribe((state) => {
  this.selectedAsins = state.analysis.selectedAsins;
});

// ✅ 好 - 使用 createStateSync 自动优化
createStateSync({
  selector: (state) => state.analysis.selectedAsins,
  onChange: (asins) => { this.selectedAsins = asins; }
});
```

### 3. 批量更新

```typescript
// ❌ 不好 - 多次更新触发多次订阅
appStore.getState().setSelectedAsins(['B001']);
appStore.getState().setIsAnalyzing(true);
appStore.getState().setShowTranslation(false);

// ✅ 好 - 批量更新
appStore.getState().updateAnalysis({
  selectedAsins: ['B001'],
  isAnalyzing: true,
  showTranslation: false
});
```

## 常见问题

### Q: 什么时候使用 Getter，什么时候使用订阅？

A:
- **Getter**: 简单只读场景，不频繁访问
- **订阅**: 需要本地副本，频繁访问，或需要在变化时执行副作用

### Q: 如何避免内存泄漏？

A: 始终在 `destroy()` 中清理订阅：

```typescript
destroy() {
  this._unsubscribe?.();
  // 或
  cleanupSubscriptions(this._unsubscribes);
}
```

### Q: 如何调试状态同步？

A:
1. 在 `onChange` 中添加 `console.log`
2. 使用 Redux DevTools 查看状态变化
3. 检查 `window.appStore.getState()` 的值

### Q: 性能会有问题吗？

A: 不会。`createStateSync` 内部做了优化：
- 只在值真正改变时触发回调
- 使用浅比较检测变化
- Zustand 本身性能很好

## 迁移指南

### 从手动同步迁移

```typescript
// 旧代码
init() {
  this.selectedAsins = appStore.getState().analysis.selectedAsins;
  this._unsubscribe = appStore.subscribe((state) => {
    this.selectedAsins = state.analysis.selectedAsins;
  });
}

// 新代码
init() {
  this._unsubscribe = createStateSync({
    selector: (state) => state.analysis.selectedAsins,
    onChange: (asins) => { this.selectedAsins = asins; },
    immediate: true
  });
}
```

### 从 ModuleState 迁移

```typescript
// 旧代码 - 使用 ModuleState
const moduleState = { selectedAsins: [] };
this.selectedAsins = moduleState.selectedAsins;

// 新代码 - 直接使用 Zustand
this._unsubscribe = createStateSync({
  selector: (state) => state.analysis.selectedAsins,
  onChange: (asins) => { this.selectedAsins = asins; }
});
```

## 参考资源

- [状态同步工具源码](../../src/common/utils/stateSync.ts)
- [使用示例](../../examples/state-sync-usage.ts)
- [Zustand 文档](https://github.com/pmndrs/zustand)
