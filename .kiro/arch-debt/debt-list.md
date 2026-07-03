# 架构债务清单

**生成时间**: 2024年
**当前状态**: Common目录已完成（16个文件），开始处理Modules和Services

---

## 📊 统计概览

| 债务类型 | 文件数量 | 已完成 | 剩余 | 完成率 |
|---------|---------|--------|------|--------|
| **错误处理** | 10个文件 | 10个 | 0个 | 100% ✅ |
| **存储访问** | 2个文件 | 1个 | 1个 | 50% |
| **事件机制** | 17个文件 | 9个 | 8个 | 53% |
| **日志记录** | 3个文件 | 0个 | 3个 | 0% |
| **代码规范** | 1个任务 | 0个 | 1个 | 0% |
| **内存泄漏** | 3个文件 | 3个 | 0个 | 100% ✅ |

**总计**: 35个文件 + 1个任务，已完成 27个，剩余 8个，整体完成率 **77%**

---

## 🔴 错误处理债务 (10个文件)

### P0 - 核心服务 (3个文件)
- [x] `src/services/llmService.ts` - **高风险** ✅ 第四批已完成
  - 问题: 5处使用 `throw new Error()`
  - 影响: LLM调用核心服务，影响AI分析、Keyword Hunter等多个模块
  - 修复内容:
    - 第127-137行：生产环境安全检查 → `SystemError` (LLM_DANGEROUS_ENDPOINT)
    - 第357-359行：生产环境安全检查 → `SystemError` (LLM_DANGEROUS_ENDPOINT)
    - 第408行：模型列表为空 → `ApiError` (API_EMPTY_MODEL_LIST)
    - 第336行：兜底错误 → `SystemError` (LLM_UNKNOWN_FAILURE)

### P1 - 业务模块 (4个文件)
- [x] `src/modules/app_center/views/master_analysis/services/analysisService.ts` - **中风险** ✅ 第一批已完成
  - 问题: 1处使用 `throw new Error()`
  - 影响: AI分析服务
  
- [x] `src/modules/app_center/views/keyword_hunter/services/trackerService.ts` - **中风险** ✅ 第一批已完成
  - 问题: 4处使用 `throw new Error()`
  - 影响: Keyword Hunter追踪服务
  
- [x] `src/modules/app_center/views/master_analysis/scraper/handlers/dataOperations.ts` - **中风险** ✅ 已完成
  - 问题: 14处使用 `throw new Error()` + 2处触发 `HISTORY_UPDATED` 事件
  - 影响: Scraper数据操作
  - 状态: ✅ 错误处理和事件机制已完成
  
- [x] `src/modules/app_center/views/master_analysis/scraper/handlers/importHandler.ts` - **中风险** ✅ 已完成
  - 问题: 10处使用 `throw new Error()` + 事件机制
  - 影响: Scraper数据导入
  - 状态: ✅ 错误处理和事件机制已完成

### P2 - 工具模块 (3个文件)
- [x] `src/common/router/navigo/PreloadManager.ts` - **低风险** ✅ 第一批已完成
  - 问题: 1处使用 `new Error()` (超时错误)
  - 影响: 路由预加载
  
- [x] `src/common/utils/WorkingStateManager.ts` - **低风险** ✅ 第一批已完成
  - 问题: 2处使用 `new Error()` (超时错误)
  - 影响: 工作状态管理
  
- [ ] `src/common/utils/safeMount.ts` - **低风险**
  - 问题: 1处错误转换
  - 影响: 模块挂载

---

## 🟡 事件机制债务 (17个文件)

### P0 - 核心基础设施 (4个文件)
- [ ] `src/common/constants/eventConstants.ts` - **高风险** ⚠️ 保留
  - 问题: 使用 `window.dispatchEvent` 和 `window.addEventListener`
  - 影响: 事件系统核心，被所有模块使用
  - 建议: 这是EventBus的底层实现，必须保留
  
- [ ] `src/common/router/initRouter.ts` - **高风险** ⚠️ 保留
  - 问题: 监听 `popstate` 事件
  - 影响: 路由核心功能
  - 建议: 浏览器原生事件，必须保留
  
- [ ] `src/common/errors/GlobalErrorHandler.ts` - **高风险** ⚠️ 保留
  - 问题: 监听全局 `error` 和 `unhandledrejection`
  - 影响: 全局错误处理
  - 建议: 必须保留，这是浏览器原生错误捕获
  
- [ ] `src/main.ts` - **高风险** 📋 第四批计划
  - 问题: 触发 `APP_EVENTS.INITIALIZED`
  - 影响: 应用初始化事件
  - 建议: 可以改用EventBus

### P1 - UI组件和工具 (3个文件)
- [ ] `src/common/components/OverviewRenderer.ts` - **中风险** 📋 第三批计划
  - 问题: 触发 `APP_EVENTS.ROUTE_CHANGE` 事件
  - 影响: Overview卡片导航
  
- [ ] `src/components/settings/systemSettings.ts` - **低风险** 📋 第三批计划
  - 问题: 触发设置开关事件
  - 影响: 设置面板
  
- [ ] `src/common/config/themeConfig.ts` - **低风险** 📋 第四批计划
  - 问题: 触发 `theme-changed` 事件
  - 影响: 主题切换

### P1 - 业务模块 (7个文件)
- [x] `src/modules/app_center/views/overview/index.ts` - **中风险** ✅ 第二批已完成
  - 问题: 2处触发路由变化事件
  - 影响: Overview页面导航
  
- [x] `src/modules/app_center/views/master_analysis/promptlab/components/PromptlabPanel.ts` - **中风险** ✅ 第二批已完成
  - 问题: 监听 `HISTORY_UPDATED` 事件
  - 影响: Promptlab历史更新
  
- [x] `src/modules/app_center/views/master_analysis/ai_analysis/components/actions.ts` - **中风险** ✅ 第二批已完成
  - 问题: 触发 `history-updated` 事件
  - 影响: AI分析历史更新
  
- [x] `src/modules/app_center/views/master_analysis/ai_analysis/components/AlpinePanel.ts` - **中风险** ✅ 第二批已完成
  - 问题: 监听 `navigate-to-scraper` 事件
  - 影响: 导航到Scraper
  
- [ ] `src/modules/app_center/views/master_analysis/scraper/handlers/dataOperations.ts` - **中风险** 🔄 第二批部分完成
  - 问题: 2处触发 `HISTORY_UPDATED` 事件（剩余）
  - 影响: Scraper历史更新
  - 状态: 错误处理已完成，事件机制待第四批完成
  
- [x] `src/modules/app_center/views/master_analysis/scraper/components/ScraperPanel.ts` - **中风险** ✅ 第二批已完成
  - 问题: 2处监听历史更新事件
  - 影响: Scraper面板更新
  
- [x] `src/modules/app_center/views/master_analysis/scraper/handlers/importHandler.ts` - **中风险** ✅ 第三批已完成
  - 问题: 触发 `HISTORY_UPDATED` 事件
  - 影响: Scraper导入处理

### P2 - 服务层和工具 (6个文件)
- [ ] `src/services/webVitalsService.ts` - **低风险** ⚠️ 保留
  - 问题: 监听 `load` 事件
  - 影响: Web性能监控
  - 建议: 浏览器原生事件，应该保留
  
- [ ] `src/services/errorTracker.ts` - **低风险** ⚠️ 保留
  - 问题: 监听全局错误事件
  - 影响: 错误追踪
  - 建议: 浏览器原生事件，应该保留
  
- [ ] `src/services/analyticsService.ts` - **低风险** ⚠️ 保留
  - 问题: 监听 `scroll` 和 `resize` 事件
  - 影响: 分析服务
  - 建议: 浏览器原生事件，应该保留
  
- [ ] `src/services/animation-manager.ts` - **低风险** ✅ 第三批已完成
  - 问题: 触发动画设置变化事件
  - 影响: 动画管理
  
- [ ] `src/services/performanceService.ts` - **低风险** ⚠️ 保留
  - 问题: 监听 `load` 事件
  - 影响: 性能监控
  - 建议: 浏览器原生事件，应该保留
  
- [x] `src/components/button-ripple.ts` - **低风险** ✅ 第三批已完成
  - 问题: 监听 `animation-settings-changed` 事件
  - 影响: 按钮波纹效果

---

## 🟢 存储访问债务 (2个文件)

### P1 - 业务模块 (2个文件)
- [x] `src/modules/app_center/views/master_analysis/ai_analysis/services/parallelAnalysisService.ts` - **低风险** ✅ 第一批已完成
  - 问题: 1处使用 `localStorage.getItem`
  - 影响: 并行分析服务缓存检查
  - 建议: 简单读取操作，低风险

---

## 🔵 日志记录债务 (3个文件)

### P2 - 错误处理和脚本 (3个文件)
- [ ] `src/common/errors/AppError.ts` - **低风险**
  - 问题: 1处使用 `console.warn` (错误处理中的fallback)
  - 影响: AppError基类
  - 建议: 这是错误处理的最后防线，可以保留
  
- [ ] `src/common/errors/GlobalErrorHandler.ts` - **低风险**
  - 问题: 2处使用 `console.error` (错误处理中的fallback)
  - 影响: 全局错误处理
  - 建议: 这是错误处理的最后防线，可以保留
  
- [ ] `scripts/` - **低风险**
  - 问题: 开发脚本使用console
  - 影响: 仅开发环境
  - 建议: 脚本可以保留console

---

## 🟣 代码规范债务 (1个任务)

### P2 - 命名规范统一 (1个任务)
- [ ] **事件常量命名规范统一** - **中风险**
  - 文件: `src/common/constants/eventConstants.ts`
  - 问题: 存在3种命名模式混用（`app:` 前缀、纯kebab-case、camelCase）
  - 影响: 约19处代码 + 8个测试文件
  - 待统一常量: 9个事件常量
  - 优先级: P2（不影响功能，但影响代码质量）
  - 预计工作量: 2-3小时
  - 详细文档: `.kiro/arch-debt/event-naming-unification.md`
  - 状态: 📋 已记录，待执行

---

## 🔴 内存泄漏债务 (3个文件) ✅ 已完成

### P0 - 严重内存泄漏风险 (3个文件) ✅ 全部完成

- [x] `src/components/settings/systemSettings.ts` - **高风险** ✅ 内存泄漏修复已完成
  - 问题: EventBus订阅未清理，存在严重内存泄漏风险
  - 位置: 第141-150行
  - 修复内容: 添加 `_unsubscribers` 数组和 `$cleanup` 钩子
  - 状态: ✅ 已完成

- [x] `src/components/button-ripple.ts` - **中风险** ✅ 内存泄漏修复已完成
  - 问题: EventBus订阅未清理
  - 位置: 第189行
  - 修复内容: 添加模块级 `_unsubscribeAnimationSettings` 和 `cleanupButtonRipple()` 函数
  - 状态: ✅ 已完成

- [x] `src/modules/app_center/views/master_analysis/promptlab/components/PromptlabPanel.ts` - **中风险** ✅ 内存泄漏修复已完成
  - 问题: EventBus和window事件监听器未清理
  - 位置: 第251-260行
  - 修复内容: 添加 `_unsubscribers` 和 `_appStoreUnsubscribe`，使用 `$cleanup` 钩子
  - 状态: ✅ 已完成

### 内存泄漏影响评估 ✅ 已解决

**修复完成**:
1. **systemSettings.ts**: ✅ 已添加 `$cleanup` 钩子清理订阅
2. **button-ripple.ts**: ✅ 已添加 `cleanupButtonRipple()` 清理函数
3. **PromptlabPanel.ts**: ✅ 已添加 `$cleanup` 钩子清理订阅

**修复状态**: 全部完成 ✅

**实际工作量**: 约2小时

---

## 📋 特殊说明

### 需要保留的window事件
以下文件使用浏览器原生事件，**不应该**改为EventBus：
1. `src/common/errors/GlobalErrorHandler.ts` - 全局错误捕获
2. `src/common/router/initRouter.ts` - popstate事件
3. `src/services/errorTracker.ts` - 错误追踪
4. `src/services/webVitalsService.ts` - load事件
5. `src/services/analyticsService.ts` - scroll/resize事件
6. `src/services/performanceService.ts` - load事件

### 需要保留的console
以下文件的console使用是合理的：
1. `src/common/errors/AppError.ts` - 错误处理fallback
2. `src/common/errors/GlobalErrorHandler.ts` - 错误处理fallback
3. `scripts/` - 开发脚本

---

## 🎯 修复优先级建议

### 第一批（5个文件，低风险）
重点：独立的业务模块，影响范围可控
1. `src/modules/app_center/views/master_analysis/services/analysisService.ts`
2. `src/modules/app_center/views/keyword_hunter/services/trackerService.ts`
3. `src/common/router/navigo/PreloadManager.ts`
4. `src/common/utils/WorkingStateManager.ts`
5. `src/modules/app_center/views/master_analysis/ai_analysis/services/parallelAnalysisService.ts`

### 第二批（3个文件，中风险）
重点：Scraper、AI Analysis、Overview模块
1. `src/modules/app_center/views/master_analysis/scraper/handlers/dataOperations.ts`
2. `src/modules/app_center/views/master_analysis/ai_analysis/components/actions.ts`
3. `src/modules/app_center/views/overview/index.ts`

### 第三批（4-5个文件，高风险）
重点：核心服务和事件系统
1. `src/services/llmService.ts` - 需要特别小心
2. `src/main.ts` - 应用初始化事件
3. `src/services/animation-manager.ts`
4. `src/modules/app_center/views/master_analysis/scraper/components/ScraperPanel.ts`

---

**更新时间**: 待定
**负责人**: Architecture Debt PM
