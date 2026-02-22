# StateManager API 文档

## 概述

`StateManager` 是一个统一的状态管理器，提供类型安全的状态访问接口，封装 Zustand store。它作为应用状态的单一访问入口，支持中间件、状态订阅、时间旅行调试等高级特性。

## 特性

- ✅ **类型安全**：完整的 TypeScript 类型定义，编译时错误检查
- ✅ **单一入口**：统一的状态访问接口，避免直接操作 store
- ✅ **中间件支持**：可扩展的中间件系统（日志、持久化、验证）
- ✅ **状态订阅**：支持细粒度的状态变化监听
- ✅ **时间旅行**：支持状态快照、撤销/重做功能
- ✅ **状态导入导出**：支持状态的序列化和恢复
- ✅ **向后兼容**：过渡期兼容旧的 `state` 对象
- ✅ **批量更新**：支持批量更新多个状态字段

## 安装与导入

```typescript
// 导入单例实例（推荐）
import { stateManager } from '@/common/infrastructure/StateManager';

// 或导入类
import { StateManager } from '@/common/infrastructure/StateManager';
const manager = StateManager.getInstance();
```

## 核心概念

### 状态模块

StateManager 管理以下状态模块：

1. **Analysis** - AI 分析模块状态
2. **Scraper** - 数据抓取模块状态
3. **PromptLab** - Prompt 实验室状态
4. **KeywordTracker** - 关键词追踪状态
5. **UI** - 用户界面状态

### 中间件

中间件是在状态变化时执行的函数，可用于：
- 日志记录
- 状态持久化
- 数据验证
- 性能监控

### 时间旅行

时间旅行功能允许你：
- 创建状态快照
- 撤销到之前的状态
- 重做到之后的状态
- 导出/导入状态

## 核心 API

### getInstance()

获取 `StateManager` 的单例实例。

**签名：**
```typescript
static getInstance(options?: StateManagerOptions): StateManager
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `options` | `StateManagerOptions` | ❌ | 配置选项（仅首次调用时生效） |

**StateManagerOptions 接口：**

```typescript
interface StateManagerOptions {
  /** 是否持久化状态，默认 false */
  persist?: boolean;
  
  /** localStorage 存储键名，默认 'state-manager-snapshot' */
  persistKey?: string;
  
  /** 中间件列表 */
  middleware?: Middleware[];
  
  /** 最大快照历史数量，默认 50 */
  maxSnapshots?: number;
  
  /** 是否启用时间旅行调试，默认 false */
  enableTimeTravel?: boolean;
}
```

**返回值：**
- `StateManager` - 单例实例

**示例：**
```typescript
// 基础用法
const manager = StateManager.getInstance();

// 带配置
const manager = StateManager.getInstance({
  persist: true,
  persistKey: 'my-app-state',
  enableTimeTravel: true,
  maxSnapshots: 100
});
```

---

## Analysis 状态管理

### getAnalysisReport()

获取分析报告。

**签名：**
```typescript
getAnalysisReport(): AnalysisReport | string | null
```

**返回值：**
- `AnalysisReport | string | null` - 分析报告数据或 null

**示例：**
```typescript
const report = stateManager.getAnalysisReport();
if (report) {
  console.log('当前报告:', report);
}
```

---

### setAnalysisReport()

设置分析报告。

**签名：**
```typescript
setAnalysisReport(report: AnalysisReport | string): void
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `report` | `AnalysisReport \| string` | ✅ | 分析报告数据 |

**示例：**
```typescript
stateManager.setAnalysisReport({
  marketplace: 'US',
  results: [...],
  metadata: { generatedAt: new Date().toISOString() }
});
```

---

### getSelectedAsins()

获取选中的 ASINs。

**签名：**
```typescript
getSelectedAsins(): string[]
```

**返回值：**
- `string[]` - ASIN 数组

**示例：**
```typescript
const asins = stateManager.getSelectedAsins();
console.log('选中的 ASINs:', asins);
```

---

### setSelectedAsins()

设置选中的 ASINs。

**签名：**
```typescript
setSelectedAsins(asins: string[]): void
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `asins` | `string[]` | ✅ | ASIN 数组 |

**示例：**
```typescript
stateManager.setSelectedAsins(['B08N5WRWNW', 'B07XJ8C8F5']);
```

---

### 其他 Analysis 方法

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `getTranslatedReport()` | 获取翻译后的报告 | `AnalysisReport \| null` |
| `setTranslatedReport(report)` | 设置翻译后的报告 | `void` |
| `getIsAnalyzing()` | 获取是否正在分析 | `boolean` |
| `setIsAnalyzing(isAnalyzing)` | 设置是否正在分析 | `void` |
| `getReportData()` | 获取报告数据 | `any \| null` |
| `setReportData(reportData)` | 设置报告数据 | `void` |
| `getExpandedAsin()` | 获取展开的 ASIN | `string \| null` |
| `setExpandedAsin(asin)` | 设置展开的 ASIN | `void` |
| `getIsEditing()` | 获取是否正在编辑 | `boolean` |
| `setIsEditing(isEditing)` | 设置是否正在编辑 | `void` |
| `getShowTranslation()` | 获取是否显示翻译 | `boolean` |
| `setShowTranslation(show)` | 设置是否显示翻译 | `void` |
| `getEditHistory()` | 获取编辑历史 | `Array<AnalysisReport \| string>` |
| `addEditHistory(report)` | 添加编辑历史记录 | `void` |
| `clearEditHistory()` | 清空编辑历史 | `void` |
| `getLastTranslationModel()` | 获取最后使用的翻译模型 | `string \| null` |
| `setLastTranslationModel(model)` | 设置最后使用的翻译模型 | `void` |
| `getAnalysisFilters()` | 获取分析过滤器 | `any \| undefined` |
| `setAnalysisFilters(filters)` | 设置分析过滤器 | `void` |
| `getPendingReport()` | 获取待处理的报告 | `any \| undefined` |
| `setPendingReport(report)` | 设置待处理的报告 | `void` |
| `clearPendingReport()` | 清除待处理的报告 | `void` |

---

## Scraper 状态管理

### getScrapedData()

获取抓取的数据。

**签名：**
```typescript
getScrapedData(): any | null
```

**返回值：**
- `any | null` - 抓取的数据或 null

**示例：**
```typescript
const data = stateManager.getScrapedData();
if (data) {
  console.log('抓取的数据:', data);
}
```

---

### setScrapedData()

设置抓取的数据。

**签名：**
```typescript
setScrapedData(data: any): void
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `data` | `any` | ✅ | 抓取的数据 |

**示例：**
```typescript
stateManager.setScrapedData({
  asin: 'B08N5WRWNW',
  title: 'Product Title',
  price: 29.99
});
```

---

### updateScraper()

批量更新 Scraper 状态。

**签名：**
```typescript
updateScraper(updates: Partial<ScraperState>): void
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `updates` | `Partial<ScraperState>` | ✅ | 要更新的状态字段 |

**示例：**
```typescript
stateManager.updateScraper({
  isScraping: true,
  progress: 50,
  status: 'scraping'
});
```

---

### resetScraper()

重置 Scraper 状态到初始值。

**签名：**
```typescript
resetScraper(): void
```

**示例：**
```typescript
stateManager.resetScraper();
```

---

### 其他 Scraper 方法

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `getIsScraping()` | 获取是否正在抓取 | `boolean` |
| `setIsScraping(isScraping)` | 设置是否正在抓取 | `void` |
| `getScraperStatus()` | 获取 Scraper 状态 | `ScraperState['status']` |
| `setScraperStatus(status)` | 设置 Scraper 状态 | `void` |
| `getSelectedSite()` | 获取选中的站点 | `ScraperState['selectedSite']` |
| `setSelectedSite(site)` | 设置选中的站点 | `void` |
| `getCurrentHistoryId()` | 获取当前历史记录 ID | `ScraperState['currentHistoryId']` |
| `setCurrentHistoryId(id)` | 设置当前历史记录 ID | `void` |
| `getInputAsins()` | 获取输入的 ASINs | `string \| undefined` |
| `setInputAsins(asins)` | 设置输入的 ASINs | `void` |
| `getScraperProgress()` | 获取抓取进度 | `number \| undefined` |
| `setScraperProgress(progress)` | 设置抓取进度 | `void` |
| `getScraperError()` | 获取错误信息 | `string \| undefined` |
| `setScraperError(error)` | 设置错误信息 | `void` |
| `getScraperExpandedAsin()` | 获取展开的 ASIN（Scraper 模块） | `string \| null \| undefined` |
| `setScraperExpandedAsin(asin)` | 设置展开的 ASIN（Scraper 模块） | `void` |
| `getCurrentDataTab()` | 获取当前数据标签页 | `'preview' \| 'json'` |
| `setCurrentDataTab(tab)` | 设置当前数据标签页 | `void` |
| `getScraperHistory()` | 获取抓取历史记录 | `HistoryItem[]` |
| `addToHistory(item)` | 添加历史记录 | `void` |

---

## PromptLab 状态管理

### getUserProductProfile()

获取用户产品配置。

**签名：**
```typescript
getUserProductProfile(): PromptLabState['userProductProfile'] | null
```

**返回值：**
- `UserProductProfile | null` - 用户产品配置或 null

**示例：**
```typescript
const profile = stateManager.getUserProductProfile();
if (profile) {
  console.log('产品配置:', profile);
}
```

---

### setUserProductProfile()

设置用户产品配置。

**签名：**
```typescript
setUserProductProfile(profile: PromptLabState['userProductProfile']): void
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `profile` | `UserProductProfile` | ✅ | 用户产品配置 |

**示例：**
```typescript
stateManager.setUserProductProfile({
  targetMarket: 'English',
  keywordsTier1: 'wireless earbuds',
  keywordsTier2: 'bluetooth 5.0'
});
```

---

### updatePromptLab()

批量更新 PromptLab 状态。

**签名：**
```typescript
updatePromptLab(updates: Partial<PromptLabState>): void
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `updates` | `Partial<PromptLabState>` | ✅ | 要更新的状态字段 |

**示例：**
```typescript
stateManager.updatePromptLab({
  selectedModel: 'gpt-4',
  temperature: 0.8,
  maxTokens: 2000
});
```

---

### resetPromptLab()

重置 PromptLab 状态到初始值。

**签名：**
```typescript
resetPromptLab(): void
```

**示例：**
```typescript
stateManager.resetPromptLab();
```

---

### 其他 PromptLab 方法

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `getCurrentPrompt()` | 获取当前 Prompt | `string` |
| `setCurrentPrompt(prompt)` | 设置当前 Prompt | `void` |
| `getPromptHistory()` | 获取 Prompt 历史记录 | `PromptLabState['history']` |
| `addPromptHistory(item)` | 添加 Prompt 历史记录 | `void` |
| `getSelectedModel()` | 获取选中的模型 | `string` |
| `setSelectedModel(model)` | 设置选中的模型 | `void` |
| `getTemperature()` | 获取温度参数 | `number` |
| `setTemperature(temperature)` | 设置温度参数 | `void` |
| `getMaxTokens()` | 获取最大 Token 数 | `number` |
| `setMaxTokens(maxTokens)` | 设置最大 Token 数 | `void` |

---

## KeywordTracker 状态管理

### getKeywords()

获取关键词列表。

**签名：**
```typescript
getKeywords(): string[]
```

**返回值：**
- `string[]` - 关键词数组

**示例：**
```typescript
const keywords = stateManager.getKeywords();
console.log('关键词:', keywords);
```

---

### setKeywords()

设置关键词列表。

**签名：**
```typescript
setKeywords(keywords: string[]): void
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keywords` | `string[]` | ✅ | 关键词数组 |

**示例：**
```typescript
stateManager.setKeywords(['keyword1', 'keyword2', 'keyword3']);
```

---

### 其他 KeywordTracker 方法

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `getProcessedCopy()` | 获取处理后的文案 | `string` |
| `setProcessedCopy(copy)` | 设置处理后的文案 | `void` |

---

## UI 状态管理

### getCurrentTab()

获取当前标签页。

**签名：**
```typescript
getCurrentTab(): string
```

**返回值：**
- `string` - 当前标签页名称

**示例：**
```typescript
const tab = stateManager.getCurrentTab();
console.log('当前标签页:', tab);
```

---

### setCurrentTab()

设置当前标签页。

**签名：**
```typescript
setCurrentTab(tab: string): void
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `tab` | `string` | ✅ | 标签页名称 |

**示例：**
```typescript
stateManager.setCurrentTab('promptlab');
```

---

### 其他 UI 方法

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `getTheme()` | 获取主题 | `'light' \| 'dark' \| 'auto'` |
| `setTheme(theme)` | 设置主题 | `void` |
| `getLoading()` | 获取加载状态 | `boolean` |
| `setLoading(loading)` | 设置加载状态 | `void` |

---

## 通用方法

### subscribe()

订阅状态变化。

**签名：**
```typescript
subscribe<T>(
  selector: (state: ReturnType<typeof appStore.getState>) => T,
  callback: (value: T) => void
): () => void
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `selector` | `Function` | ✅ | 状态选择器函数 |
| `callback` | `Function` | ✅ | 状态变化回调 |

**返回值：**
- `() => void` - 取消订阅函数

**示例：**
```typescript
// 订阅分析报告变化
const unsubscribe = stateManager.subscribe(
  (state) => state.analysis.analysisReport,
  (report) => {
    console.log('报告已更新:', report);
  }
);

// 取消订阅
unsubscribe();

// 订阅多个字段
const unsubscribe = stateManager.subscribe(
  (state) => ({
    report: state.analysis.analysisReport,
    asins: state.analysis.selectedAsins
  }),
  (value) => {
    console.log('状态已更新:', value);
  }
);
```

---

### getSnapshot()

获取完整状态快照。

**签名：**
```typescript
getSnapshot(): ReturnType<typeof appStore.getState>
```

**返回值：**
- `AppState` - 当前完整状态

**示例：**
```typescript
const snapshot = stateManager.getSnapshot();
console.log('当前状态:', snapshot);
```

---

### restoreSnapshot()

恢复状态快照。

**签名：**
```typescript
restoreSnapshot(snapshot: Partial<ReturnType<typeof appStore.getState>>): void
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `snapshot` | `Partial<AppState>` | ✅ | 状态快照 |

**示例：**
```typescript
// 保存当前状态
const snapshot = stateManager.getSnapshot();

// ... 执行一些操作 ...

// 恢复到之前的状态
stateManager.restoreSnapshot(snapshot);
```

---

### clear()

清空所有状态。

**签名：**
```typescript
clear(): void
```

**示例：**
```typescript
// 用户登出时清空状态
stateManager.clear();
```

---

## 时间旅行 API

### createSnapshot()

创建状态快照（需要启用 `enableTimeTravel`）。

**签名：**
```typescript
createSnapshot(description?: string): string
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `description` | `string` | ❌ | 快照描述 |

**返回值：**
- `string` - 快照 ID

**示例：**
```typescript
// 创建快照
const snapshotId = stateManager.createSnapshot('分析前的状态');

// ... 执行分析 ...

// 如果需要，可以恢复到这个快照
stateManager.restoreSnapshotById(snapshotId);
```

---

### restoreSnapshotById()

根据 ID 恢复快照。

**签名：**
```typescript
restoreSnapshotById(snapshotId: string): boolean
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `snapshotId` | `string` | ✅ | 快照 ID |

**返回值：**
- `boolean` - 是否成功恢复

**示例：**
```typescript
const success = stateManager.restoreSnapshotById('snapshot_123');
if (success) {
  console.log('快照恢复成功');
} else {
  console.log('快照不存在');
}
```

---

### undo()

后退到上一个快照。

**签名：**
```typescript
undo(): boolean
```

**返回值：**
- `boolean` - 是否成功后退

**示例：**
```typescript
// 撤销操作
if (stateManager.undo()) {
  console.log('已撤销');
} else {
  console.log('没有可撤销的操作');
}
```

---

### redo()

前进到下一个快照。

**签名：**
```typescript
redo(): boolean
```

**返回值：**
- `boolean` - 是否成功前进

**示例：**
```typescript
// 重做操作
if (stateManager.redo()) {
  console.log('已重做');
} else {
  console.log('没有可重做的操作');
}
```

---

### canUndo()

检查是否可以后退。

**签名：**
```typescript
canUndo(): boolean
```

**返回值：**
- `boolean` - 是否可以后退

**示例：**
```typescript
if (stateManager.canUndo()) {
  // 显示撤销按钮
}
```

---

### canRedo()

检查是否可以前进。

**签名：**
```typescript
canRedo(): boolean
```

**返回值：**
- `boolean` - 是否可以前进

**示例：**
```typescript
if (stateManager.canRedo()) {
  // 显示重做按钮
}
```

---

### getSnapshotList()

获取所有快照列表。

**签名：**
```typescript
getSnapshotList(): Array<Omit<StateSnapshot, 'state'>>
```

**返回值：**
- `Array<{id: string, timestamp: number, description?: string}>` - 快照元数据列表

**示例：**
```typescript
const snapshots = stateManager.getSnapshotList();
snapshots.forEach(snapshot => {
  console.log(`${snapshot.id}: ${snapshot.description} (${new Date(snapshot.timestamp)})`);
});
```

---

### getCurrentSnapshotIndex()

获取当前快照索引。

**签名：**
```typescript
getCurrentSnapshotIndex(): number
```

**返回值：**
- `number` - 当前快照索引（-1 表示没有快照）

**示例：**
```typescript
const index = stateManager.getCurrentSnapshotIndex();
console.log(`当前在第 ${index + 1} 个快照`);
```

---

### clearSnapshotHistory()

清空快照历史。

**签名：**
```typescript
clearSnapshotHistory(): void
```

**示例：**
```typescript
stateManager.clearSnapshotHistory();
```

---

### deleteSnapshot()

删除指定快照。

**签名：**
```typescript
deleteSnapshot(snapshotId: string): boolean
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `snapshotId` | `string` | ✅ | 快照 ID |

**返回值：**
- `boolean` - 是否成功删除

**示例：**
```typescript
const success = stateManager.deleteSnapshot('snapshot_123');
```

---

### exportSnapshot()

导出快照到 JSON。

**签名：**
```typescript
exportSnapshot(snapshotId?: string): string
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `snapshotId` | `string` | ❌ | 快照 ID（不传则导出当前状态） |

**返回值：**
- `string` - JSON 字符串

**示例：**
```typescript
// 导出当前状态
const json = stateManager.exportSnapshot();
localStorage.setItem('backup', json);

// 导出指定快照
const json = stateManager.exportSnapshot('snapshot_123');
```

---

### importSnapshot()

从 JSON 导入快照。

**签名：**
```typescript
importSnapshot(json: string, restore?: boolean): string
```

**参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `json` | `string` | ✅ | - | JSON 字符串 |
| `restore` | `boolean` | ❌ | `false` | 是否立即恢复该快照 |

**返回值：**
- `string` - 导入的快照 ID

**抛出异常：**
- 导入失败时抛出 `Error`

**示例：**
```typescript
const json = localStorage.getItem('backup');
if (json) {
  const snapshotId = stateManager.importSnapshot(json, true);
  console.log('已恢复备份:', snapshotId);
}
```

---

## 中间件 API

### use()

添加中间件。

**签名：**
```typescript
use(middleware: Middleware): void
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `middleware` | `Middleware` | ✅ | 中间件函数 |

**Middleware 类型：**
```typescript
type Middleware = (state: any, action: string, payload: any) => void
```

**示例：**
```typescript
// 日志中间件
const loggerMiddleware = (state, action, payload) => {
  console.log(`[StateManager] ${action}`, payload);
};

stateManager.use(loggerMiddleware);

// 验证中间件
const validationMiddleware = (state, action, payload) => {
  if (action === 'setAnalysisReport' && !payload) {
    throw new Error('分析报告不能为空');
  }
};

stateManager.use(validationMiddleware);
```

---

### removeMiddleware()

移除中间件。

**签名：**
```typescript
removeMiddleware(middleware: Middleware): void
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `middleware` | `Middleware` | ✅ | 要移除的中间件函数 |

**示例：**
```typescript
stateManager.removeMiddleware(loggerMiddleware);
```

---

## 类型定义

### StateSnapshot

状态快照接口。

```typescript
interface StateSnapshot {
  /** 快照 ID */
  id: string;
  
  /** 快照时间戳 */
  timestamp: number;
  
  /** 快照描述 */
  description?: string;
  
  /** 状态数据 */
  state: ReturnType<typeof appStore.getState>;
}
```

---

### HistoryItem

历史记录项接口。

```typescript
interface HistoryItem {
  id: string;
  timestamp: number;
  data: any;
  [key: string]: any;
}
```

---

## 使用示例

### 基础用法

```typescript
import { stateManager } from '@/common/infrastructure/StateManager';

// 获取状态
const report = stateManager.getAnalysisReport();

// 设置状态
stateManager.setAnalysisReport(newReport);

// 批量更新
stateManager.updateScraper({
  isScraping: true,
  progress: 50,
  status: 'scraping'
});
```

---

### 状态订阅

```typescript
// 订阅单个字段
const unsubscribe = stateManager.subscribe(
  (state) => state.analysis.analysisReport,
  (report) => {
    console.log('报告已更新:', report);
    updateUI(report);
  }
);

// 订阅多个字段
const unsubscribe = stateManager.subscribe(
  (state) => ({
    report: state.analysis.analysisReport,
    asins: state.analysis.selectedAsins,
    isAnalyzing: state.analysis.isAnalyzing
  }),
  (value) => {
    console.log('分析状态已更新:', value);
  }
);

// 组件卸载时取消订阅
onUnmounted(() => {
  unsubscribe();
});
```

---

### 使用中间件

```typescript
// 创建日志中间件
const loggerMiddleware = (state, action, payload) => {
  if (import.meta.env.DEV) {
    console.log(`[${new Date().toISOString()}] ${action}`, payload);
  }
};

// 创建持久化中间件
const persistMiddleware = (state, action, payload) => {
  const keysToSave = ['analysis', 'promptlab'];
  const dataToSave = {};
  
  keysToSave.forEach(key => {
    if (state[key]) {
      dataToSave[key] = state[key];
    }
  });
  
  localStorage.setItem('app-state', JSON.stringify(dataToSave));
};

// 创建验证中间件
const validationMiddleware = (state, action, payload) => {
  if (action === 'setAnalysisReport') {
    if (!payload || typeof payload !== 'object') {
      throw new Error('无效的分析报告格式');
    }
  }
  
  if (action === 'setSelectedAsins') {
    if (!Array.isArray(payload)) {
      throw new Error('ASINs 必须是数组');
    }
  }
};

// 注册中间件
const manager = StateManager.getInstance({
  middleware: [loggerMiddleware, persistMiddleware, validationMiddleware]
});

// 或动态添加
stateManager.use(loggerMiddleware);
```

---

### 时间旅行调试

```typescript
// 启用时间旅行
const manager = StateManager.getInstance({
  enableTimeTravel: true,
  maxSnapshots: 100,
  persist: true
});

// 在关键操作前创建快照
const snapshotId = stateManager.createSnapshot('分析前');

// 执行分析
await performAnalysis();

// 如果出错，可以恢复
if (hasError) {
  stateManager.restoreSnapshotById(snapshotId);
}

// 撤销/重做
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') {
    stateManager.undo();
  }
  if (e.ctrlKey && e.key === 'y') {
    stateManager.redo();
  }
});

// 显示历史记录
const snapshots = stateManager.getSnapshotList();
snapshots.forEach(snapshot => {
  console.log(`${snapshot.description} - ${new Date(snapshot.timestamp).toLocaleString()}`);
});
```

---

### 状态导入导出

```typescript
// 导出当前状态
function exportState() {
  const json = stateManager.exportSnapshot();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `state-backup-${Date.now()}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

// 导入状态
function importState(file: File) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const json = e.target?.result as string;
      const snapshotId = stateManager.importSnapshot(json, true);
      console.log('状态已恢复:', snapshotId);
    } catch (error) {
      console.error('导入失败:', error);
    }
  };
  
  reader.readAsText(file);
}

// 自动备份
setInterval(() => {
  const json = stateManager.exportSnapshot();
  localStorage.setItem('auto-backup', json);
}, 5 * 60 * 1000); // 每 5 分钟备份一次
```

---

### 在 Alpine.js 组件中使用

```typescript
import { stateManager } from '@/common/infrastructure/StateManager';

Alpine.data('analysisPanel', () => ({
  report: null,
  selectedAsins: [],
  unsubscribe: null,
  
  init() {
    // 初始化状态
    this.report = stateManager.getAnalysisReport();
    this.selectedAsins = stateManager.getSelectedAsins();
    
    // 订阅状态变化
    this.unsubscribe = stateManager.subscribe(
      (state) => ({
        report: state.analysis.analysisReport,
        asins: state.analysis.selectedAsins
      }),
      (value) => {
        this.report = value.report;
        this.selectedAsins = value.asins;
      }
    );
  },
  
  destroy() {
    // 取消订阅
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  },
  
  updateReport(newReport) {
    // 更新状态
    stateManager.setAnalysisReport(newReport);
  },
  
  selectAsin(asin) {
    const asins = [...this.selectedAsins, asin];
    stateManager.setSelectedAsins(asins);
  }
}));
```

---

## 最佳实践

### 1. 使用单例实例

始终使用导出的单例实例：

```typescript
// ✅ 推荐
import { stateManager } from '@/common/infrastructure/StateManager';

// ❌ 不推荐
const manager = StateManager.getInstance();
```

### 2. 使用类型安全的方法

使用专用的 getter/setter 而不是直接访问 store：

```typescript
// ✅ 推荐
const report = stateManager.getAnalysisReport();
stateManager.setAnalysisReport(newReport);

// ❌ 不推荐
const report = appStore.getState().analysis.analysisReport;
appStore.getState().setAnalysisReport(newReport);
```

### 3. 批量更新状态

使用批量更新方法提升性能：

```typescript
// ✅ 推荐
stateManager.updateScraper({
  isScraping: true,
  progress: 50,
  status: 'scraping'
});

// ❌ 不推荐
stateManager.setIsScraping(true);
stateManager.setScraperProgress(50);
stateManager.setScraperStatus('scraping');
```

### 4. 及时取消订阅

避免内存泄漏：

```typescript
// ✅ 推荐
const unsubscribe = stateManager.subscribe(selector, callback);

// 组件卸载时取消订阅
onUnmounted(() => {
  unsubscribe();
});

// ❌ 不推荐 - 忘记取消订阅
stateManager.subscribe(selector, callback);
```

### 5. 使用中间件进行横切关注点

将日志、验证等逻辑放在中间件中：

```typescript
// ✅ 推荐
const validationMiddleware = (state, action, payload) => {
  // 统一的验证逻辑
};

stateManager.use(validationMiddleware);

// ❌ 不推荐 - 在每个 setter 中重复验证
stateManager.setAnalysisReport(report); // 需要手动验证
```

### 6. 合理使用时间旅行

仅在需要时启用时间旅行：

```typescript
// 开发环境启用
const manager = StateManager.getInstance({
  enableTimeTravel: import.meta.env.DEV,
  maxSnapshots: 50
});
```

### 7. 定期清理快照

避免内存占用过高：

```typescript
// 定期清理旧快照
setInterval(() => {
  const snapshots = stateManager.getSnapshotList();
  if (snapshots.length > 100) {
    stateManager.clearSnapshotHistory();
  }
}, 10 * 60 * 1000); // 每 10 分钟检查一次
```

### 8. 使用描述性的快照名称

便于调试和追踪：

```typescript
// ✅ 推荐
stateManager.createSnapshot('分析开始前的状态');
stateManager.createSnapshot('用户选择了 3 个 ASINs');

// ❌ 不推荐
stateManager.createSnapshot();
stateManager.createSnapshot('snapshot');
```

---

## 常见问题

### Q: StateManager 和直接使用 Zustand store 有什么区别？

A: StateManager 提供了：
- 类型安全的访问接口
- 中间件支持
- 时间旅行调试
- 状态导入导出
- 向后兼容旧代码

### Q: 如何在多个组件间共享状态？

A: 使用 `subscribe` 方法订阅状态变化：

```typescript
// 组件 A
stateManager.setAnalysisReport(report);

// 组件 B
stateManager.subscribe(
  (state) => state.analysis.analysisReport,
  (report) => {
    // 自动接收更新
  }
);
```

### Q: 中间件的执行顺序是什么？

A: 按照添加顺序执行。先添加的先执行。

### Q: 时间旅行会影响性能吗？

A: 会有一定影响，因为需要深度克隆状态。建议：
- 仅在开发环境启用
- 限制快照数量
- 定期清理旧快照

### Q: 如何处理异步操作？

A: StateManager 本身是同步的，异步操作应在外部处理：

```typescript
async function performAnalysis() {
  stateManager.setIsAnalyzing(true);
  
  try {
    const result = await analyzeData();
    stateManager.setAnalysisReport(result);
  } catch (error) {
    console.error(error);
  } finally {
    stateManager.setIsAnalyzing(false);
  }
}
```

### Q: 如何调试状态变化？

A: 使用日志中间件：

```typescript
const debugMiddleware = (state, action, payload) => {
  console.group(`[StateManager] ${action}`);
  console.log('Payload:', payload);
  console.log('State:', state);
  console.groupEnd();
};

stateManager.use(debugMiddleware);
```

### Q: 状态持久化会自动进行吗？

A: 不会。需要通过中间件或手动调用 `exportSnapshot` 实现：

```typescript
// 使用中间件自动持久化
const persistMiddleware = (state, action, payload) => {
  localStorage.setItem('app-state', JSON.stringify(state));
};

stateManager.use(persistMiddleware);
```

### Q: 如何迁移现有代码？

A: 逐步替换：

```typescript
// 旧代码
state.analysis.analysisReport = newReport;

// 新代码
stateManager.setAnalysisReport(newReport);

// 过渡期两者可以共存
```

### Q: 可以在中间件中修改状态吗？

A: 不建议。中间件应该是只读的，用于观察和记录：

```typescript
// ❌ 不推荐
const middleware = (state, action, payload) => {
  state.analysis.analysisReport = null; // 不要这样做
};

// ✅ 推荐
const middleware = (state, action, payload) => {
  console.log('状态变化:', action, payload);
};
```

---

## 性能考虑

### 内存占用

- 每个快照会占用内存（深度克隆整个状态）
- 建议限制快照数量（默认 50 个）
- 定期清理不需要的快照

### 订阅性能

- 订阅会在每次状态变化时执行
- 使用精确的 selector 避免不必要的更新
- 及时取消不需要的订阅

### 中间件性能

- 中间件会在每次状态变化时执行
- 避免在中间件中执行耗时操作
- 考虑使用防抖/节流

---

## 迁移指南

### 从旧 state 对象迁移

```typescript
// 旧代码
state.analysis.analysisReport = newReport;
state.analysis.selectedAsins = ['ASIN1', 'ASIN2'];

// 新代码
stateManager.setAnalysisReport(newReport);
stateManager.setSelectedAsins(['ASIN1', 'ASIN2']);
```

### 从直接使用 Zustand 迁移

```typescript
// 旧代码
const store = useAppStore();
store.setAnalysisReport(newReport);

// 新代码
stateManager.setAnalysisReport(newReport);
```

---

## 相关文档

- [SafeModuleLoader API 文档](./SafeModuleLoader.md)
- [AlpineRegistry API 文档](./AlpineRegistry.md)
- [SafeRenderer API 文档](./SafeRenderer.md)
- [状态管理最佳实践](../guides/state-management.md)
- [迁移指南](../guides/migration-guide.md)

---

## 更新日志

### v1.0.0 (2025-01-XX)
- ✨ 初始版本
- ✅ 统一状态访问接口
- ✅ 中间件系统
- ✅ 时间旅行调试
- ✅ 状态导入导出
- ✅ 向后兼容旧代码

---

## 许可证

MIT License

