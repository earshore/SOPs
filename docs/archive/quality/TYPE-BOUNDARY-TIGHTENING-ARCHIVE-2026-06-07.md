# 类型边界收紧阶段归档

**项目**: SOPs - 亚马逊运营管理平台  
**归档日期**: 2026年6月7日  
**阶段状态**: 已暂停，进入收益递减点  

---

## 本次补充范围

本次只继续做了低风险类型边界收紧，未触碰页面渲染安全、复杂度拆分、Zustand middleware 泛型、声明文件宽泛类型或服务单例私有构造绕法。

### 第 1 轮: Chart 和内部常量边界

- `src/common/utils/lazyLibs.ts`
  - 将 `ChartJS` 从 `unknown` 收紧为 `typeof import('chart.js/auto').default`。
- `src/modules/amz_hub/views/knowledge/ecosystem/index.ts`
  - 移除 `window as any` 读取 `Chart`。
  - 增加 canvas context 空值检查。
- `src/modules/amz_hub/views/knowledge/seo_strategy/index.ts`
  - 移除 `window as any` 读取 `Chart`。
  - 增加 canvas context 空值检查。
- `src/modules/amz_hub/views/knowledge/eu_insights/index.ts`
  - 移除 `window as any` 读取 `Chart`。
  - 将 `AMZ_COUNTRY_DATA as any` 改为 `CountryCode` 类型守卫。

### 第 2 轮: DOM 扩展属性边界

- `src/modules/sops/views/growth/npi_tracker/index.ts`
  - 将 `tbody._eventHandler` 的 DOM 挂属性模式改为模块内 `WeakMap<HTMLElement, EventListener>`。
  - 保持原有事件委托和重渲染行为不变。

### 第 3 轮: Alpine、定时器和内部常量边界

- `src/components/settings/systemSettings.ts`
  - 将 `window.__alpineRetryCount` 改为模块内 `alpineRetryCount`。
- `src/modules/amz_hub/views/practice/marketing_calendar/index.ts`
  - 移除 `BaseModule.setTimeout()` 返回值上的多余 `as any`。
- `src/modules/app_center/views/master_analysis/scraper/index.ts`
  - 使用局部 `AlpineWithData` 和 `getAlpineData()` 收紧 Alpine `$data` 访问。
- `src/modules/sops/views/growth/restricted_words/restrictedWordsHandler.ts`
  - 收紧 `RISK_LEVELS`、`WORD_CATEGORIES`、`localizedKeywords` 索引。
  - 收紧 legacy `window.showWordDetail` / `window.closeWordDetail` 和 ActionRegistry wrapper。

### 第 4 轮: 小型遗留边界收尾

- `src/services/alertService.ts`
  - 使用局部 `WindowWithToast` 收紧 `window.showToast` 访问。
  - 将 toast 调用改为当前真实的 `{ type }` 参数形状。
- `src/modules/app_center/views/keyword_hunter/analysis/index.ts`
  - 移除无效的 `updateKeywordTracker({} as any)` 防御性空更新。
- `src/common/devtools/PerformanceMonitor.ts`
  - 增加 `isInitialized()` 公共查询方法。
- `src/components/settings/systemSettings.ts`
  - 使用 `performanceMonitor.isInitialized()` 替代私有 `container` 字段探测。

## 验证

已通过:

```bash
npm run type-check
```

验证命令执行结果: `tsc --noEmit -p tsconfig.app.json` 通过。

## 阶段结论

当前类型削债已经吃掉“好收、低风险、收益明确”的主要部分。继续收紧仍有零散价值，但边际收益开始下降；从这里开始不建议把页面渲染安全、复杂度拆分或全局架构类型设计混入同一阶段。

## 刻意保留项

### A. 暂缓，属于接口或架构边界

- `src/stores/middleware/persist.ts`
  - Zustand `set(partial, replace as any)`。
  - `persistedSet(restoredState as any, true)`。
- `src/stores/middleware/devtools.ts`
  - Zustand `set(partial, replace as any)`。
  - `set(newState as any, true)`。
- `src/services/alertService.ts`
  - `new (AlertService as any)(logger)` 私有构造绕法。
- `src/services/analyticsService.ts`
  - `new (AnalyticsService as any)(logger, storage)` 私有构造绕法。

### B. 暂缓，属于跨模块数据模型

- `src/modules/app_center/views/master_analysis/ai_analysis/components/dataLoaders.ts`
  - `setAnalysisReport(detail.report as any)`。
- `src/modules/app_center/views/master_analysis/ai_analysis/components/actions.ts`
  - `setAnalysisReport(report as any)`。
  - `analysisReport as any`。
- `src/modules/app_center/views/master_analysis/ai_analysis/services/aiAnalysisService.ts`
  - `(report as any)[fieldName] = actualResult`。
- 建议单独开 “AI report 数据模型收敛” 阶段，先统一 report union / partial report / store setter 的类型边界。

### C. 声明文件宽泛边界

- `src/types/*.d.ts` 中仍有多处 `Record<string, unknown>` 和 `[key: string]: unknown`。
- 当前多为全局状态、事件、服务 metadata、模块配置扩展点。
- 不建议逐个硬删；应按领域逐个收敛，例如状态模型、事件 payload、服务 metadata。

### D. 另开阶段处理

- 大块 `innerHTML` 和页面渲染安全。
- 复杂度拆分、长函数拆分。
- 需要页面流程验证的结构性改动。
- 测试代码中的 mock / 负例输入 `as any`。
