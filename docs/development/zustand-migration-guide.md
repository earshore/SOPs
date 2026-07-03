# Zustand 状态管理迁移指南

## 概述

项目已从自定义的 StateManager 迁移到 Zustand 状态管理库。本指南帮助开发者快速上手新的状态管理方式。

## 快速对比

### 旧方式 (StateManager) ❌

```typescript
import state from '@/common/state';
import { StateManager } from '@/common/infrastructure/StateManager';

// 读取状态
const currentTab = state.ui.currentTab;

// 更新状态
state.ui.currentTab = 'scraper';

// 使用 StateManager
const stateManager = StateManager.getInstance();
const report = stateManager.getAnalysisReport();
stateManager.setAnalysisReport(newReport);
```

### 新方式 (Zustand) ✅

```typescript
import { appStore } from '@/stores/useAppStore';

// 读取状态
const currentTab = appStore.getState().ui.currentTab;

// 更新状态
appStore.getState().setCurrentTab('scraper');

// 批量更新
appStore.getState().updateUI({
  currentTab: 'scraper',
  loading: true
});
```

## 核心概念

### 1. Store 结构

```typescript
interface AppStore {
  // 状态模块
  ui: UIState;
  scraper: ScraperState;
  analysis: AnalysisState;
  promptlab: PromptLabState;
  keywordTracker: KeywordTrackerState;
  
  // Actions (更新方法)
  setCurrentTab: (tab: string) => void;
  updateUI: (updates: Partial<UIState>) => void;
  // ... 更多 actions
}
```

### 2. 访问状态

```typescript
// 获取完整状态
const state = appStore.getState();

// 访问特定模块
const ui = appStore.getState().ui;
const scraper = appStore.getState().scraper;

// 使用 selectors (推荐)
import { selectors } from '@/stores/useAppStore';
const currentTab = selectors.currentTab(appStore.getState());
```

### 3. 更新状态

```typescript
// 使用专用 setter
appStore.getState().setCurrentTab('analysis');
appStore.getState().setIsScraping(true);

// 批量更新
appStore.getState().updateUI({
  currentTab: 'scraper',
  loading: true,
  theme: 'dark'
});

// 重置模块
appStore.getState().resetScraper();
```

### 4. 订阅状态变化

```typescript
// 订阅整个 store
const unsubscribe = appStore.subscribe((state) => {
  console.log('状态已更新:', state);
});

// 订阅特定状态
let previousTab = appStore.getState().ui.currentTab;
const unsubscribe = appStore.subscribe((state) => {
  if (state.ui.currentTab !== previousTab) {
    console.log('标签变化:', previousTab, '->', state.ui.currentTab);
    previousTab = state.ui.currentTab;
  }
});

// 取消订阅
unsubscribe();
```

## 迁移步骤

### 步骤 1: 更新 import 语句

```typescript
// ❌ 旧方式
import state from '@/common/state';
import { StateManager } from '@/common/infrastructure/StateManager';

// ✅ 新方式
import { appStore } from '@/stores/useAppStore';
```

### 步骤 2: 替换读取操作

```typescript
// ❌ 旧方式
const currentTab = state.ui.currentTab;
const isScraping = state.scraper.isScraping;

// ✅ 新方式
const currentTab = appStore.getState().ui.currentTab;
const isScraping = appStore.getState().scraper.isScraping;
```

### 步骤 3: 替换写入操作

```typescript
// ❌ 旧方式
state.ui.currentTab = 'scraper';
state.scraper.isScraping = true;

// ✅ 新方式
appStore.getState().setCurrentTab('scraper');
appStore.getState().setIsScraping(true);
```

### 步骤 4: 替换 StateManager 调用

```typescript
// ❌ 旧方式
const stateManager = StateManager.getInstance();
const report = stateManager.getAnalysisReport();
stateManager.setAnalysisReport(newReport);

// ✅ 新方式
const report = appStore.getState().analysis.analysisReport;
appStore.getState().setAnalysisReport(newReport);
```

## 各模块迁移示例

### UI 模块

```typescript
// 读取
const currentTab = appStore.getState().ui.currentTab;
const theme = appStore.getState().ui.theme;

// 更新
appStore.getState().setCurrentTab('analysis');
appStore.getState().setTheme('dark');
appStore.getState().setLoading(true);

// 批量更新
appStore.getState().updateUI({
  currentTab: 'scraper',
  loading: false,
  theme: 'light'
});
```

### Scraper 模块

```typescript
// 读取
const isScraping = appStore.getState().scraper.isScraping;
const scrapedData = appStore.getState().scraper.scrapedData;

// 更新
appStore.getState().setIsScraping(true);
appStore.getState().setScraperStatus('scraping');
appStore.getState().setSelectedSite('amazon.com');
appStore.getState().setScrapedData(data);

// 批量更新
appStore.getState().updateScraper({
  isScraping: false,
  status: 'success',
  progress: 100
});

// 重置
appStore.getState().resetScraper();
```

### Analysis 模块

```typescript
// 读取
const selectedAsins = appStore.getState().analysis.selectedAsins;
const analysisReport = appStore.getState().analysis.analysisReport;

// 更新
appStore.getState().setSelectedAsins(['B001', 'B002']);
appStore.getState().setAnalysisReport(report);
appStore.getState().setIsEditing(true);

// 批量更新
appStore.getState().updateAnalysis({
  selectedAsins: ['B001'],
  isEditing: false,
  showTranslation: true
});

// 重置
appStore.getState().resetAnalysis();
```

## 高级用法

### 使用 Selectors

```typescript
import { selectors } from '@/stores/useAppStore';

const state = appStore.getState();
const currentTab = selectors.currentTab(state);
const isScraping = selectors.isScraping(state);
const analysisReport = selectors.analysisReport(state);
```

### 持久化状态

以下状态会自动保存到 localStorage：
- `ui.currentTab`
- `ui.currentDataTab`
- `ui.currentReportTab`
- `ui.theme`
- `ui.sidebarCollapsed`
- `scraper.selectedSite`
- `scraper.scrapedData`

刷新页面后会自动恢复。

### DevTools 集成

在开发环境中，可以使用 Redux DevTools 扩展查看状态变化：

1. 安装 Redux DevTools 浏览器扩展
2. 打开开发者工具
3. 切换到 Redux 标签
4. 查看状态树和时间旅行功能

## 常见问题

### Q: 为什么要迁移到 Zustand？

A: 
- **性能更好**: 减少不必要的渲染
- **类型安全**: 完整的 TypeScript 支持
- **DevTools**: 内置 Redux DevTools 支持
- **持久化**: 内置持久化中间件
- **社区支持**: 活跃的社区和生态系统

### Q: 旧代码还能运行吗？

A: 可以。我们提供了兼容层，旧的 `state.xxx` 访问方式仍然有效，但会在开发环境显示弃用警告。建议尽快迁移。

### Q: 如何在组件中使用？

A: 
```typescript
// 在 Alpine.js 组件中
Alpine.data('myComponent', () => ({
  init() {
    // 读取状态
    this.currentTab = appStore.getState().ui.currentTab;
    
    // 订阅变化
    this.unsubscribe = appStore.subscribe((state) => {
      this.currentTab = state.ui.currentTab;
    });
  },
  
  destroy() {
    // 清理订阅
    this.unsubscribe?.();
  }
}));
```

### Q: 如何调试状态？

A:
1. 使用 Redux DevTools 扩展
2. 在控制台访问 `window.appStore`
3. 查看 localStorage 中的 `app-storage` 键

## 参考资源

- [Zustand 官方文档](https://github.com/pmndrs/zustand)
- [项目示例代码](../examples/zustand-usage.ts)
- [迁移报告](./zustand-migration-report-2026-02-26.md)
- [Store 实现](../src/stores/useAppStore.ts)

## 获取帮助

如有问题，请：
1. 查看本指南和示例代码
2. 检查 Redux DevTools 中的状态
3. 查看控制台的弃用警告
4. 联系开发团队
