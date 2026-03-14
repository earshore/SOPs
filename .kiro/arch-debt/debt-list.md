# 架构债务清单

**生成时间**: 2024年
**当前状态**: Common目录已完成（16个文件），开始处理Modules和Services

---

## 📊 统计概览

| 债务类型 | 文件数量 | 已完成 | 剩余 | 完成率 |
|---------|---------|--------|------|--------|
| **错误处理** | 12个文件 | 5个 | 7个 | 42% |
| **存储访问** | 2个文件 | 1个 | 1个 | 50% |
| **事件机制** | 18个文件 | 0个 | 18个 | 0% |
| **日志记录** | 3个文件 | 0个 | 3个 | 0% |

**总计**: 35个文件，已完成 6个，剩余 29个，整体完成率 **17%**

---

## 🔴 错误处理债务 (12个文件)

### P0 - 核心服务 (3个文件)
- [ ] `src/services/llmService.ts` - **高风险**
  - 问题: 5处使用 `throw new Error()`
  - 影响: LLM调用核心服务，影响AI分析、Keyword Hunter、QALab等多个模块
  - 依赖: 被多个模块依赖

### P1 - 业务模块 (6个文件)
- [x] `src/modules/app_center/views/master_analysis/services/analysisService.ts` - **中风险** ✅ 第一批已完成
  - 问题: 1处使用 `throw new Error()`
  - 影响: AI分析服务
  
- [x] `src/modules/app_center/views/keyword_hunter/services/trackerService.ts` - **中风险** ✅ 第一批已完成
  - 问题: 4处使用 `throw new Error()`
  - 影响: Keyword Hunter追踪服务
  
- [x] `src/modules/app_center/views/master_analysis/qalab/services/rufusSimulator.ts` - **中风险** ✅ 第一批已完成
  - 问题: 2处使用 `throw new Error()`
  - 影响: QALab Rufus模拟器
  
- [ ] `src/modules/app_center/views/master_analysis/qalab/services/importHandler.ts` - **中风险**
  - 问题: 7处使用 `throw new Error()`
  - 影响: QALab数据导入
  
- [ ] `src/modules/app_center/views/master_analysis/scraper/handlers/dataOperations.ts` - **中风险**
  - 问题: 14处使用 `throw new Error()`
  - 影响: Scraper数据操作
  
- [ ] `src/modules/app_center/views/master_analysis/scraper/handlers/importHandler.ts` - **中风险**
  - 问题: 需要检查（与scraper相关）
  - 影响: Scraper数据导入

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

## 🟡 事件机制债务 (18个文件)

### P0 - 核心基础设施 (4个文件)
- [ ] `src/common/constants/eventConstants.ts` - **高风险**
  - 问题: 使用 `window.dispatchEvent` 和 `window.addEventListener`
  - 影响: 事件系统核心，被所有模块使用
  - 建议: 需要仔细评估，可能需要保留window事件作为底层实现
  
- [ ] `src/common/router/initRouter.ts` - **高风险**
  - 问题: 监听 `popstate` 事件
  - 影响: 路由核心功能
  - 建议: 浏览器原生事件，可能需要保留
  
- [ ] `src/common/errors/GlobalErrorHandler.ts` - **高风险**
  - 问题: 监听全局 `error` 和 `unhandledrejection`
  - 影响: 全局错误处理
  - 建议: 必须保留，这是浏览器原生错误捕获
  
- [ ] `src/main.ts` - **高风险**
  - 问题: 触发 `APP_EVENTS.INITIALIZED`
  - 影响: 应用初始化事件
  - 建议: 可以改用EventBus

### P1 - 业务模块 (8个文件)
- [ ] `src/modules/app_center/views/overview/index.ts` - **中风险**
  - 问题: 2处触发路由变化事件
  - 影响: Overview页面导航
  
- [ ] `src/modules/app_center/views/master_analysis/promptlab/components/PromptlabPanel.ts` - **中风险**
  - 问题: 监听 `HISTORY_UPDATED` 事件
  - 影响: Promptlab历史更新
  
- [ ] `src/modules/app_center/views/master_analysis/qalab/index.ts` - **中风险**
  - 问题: 监听自定义 `qalab:data-imported` 事件
  - 影响: QALab数据导入
  
- [ ] `src/modules/app_center/views/master_analysis/ai_analysis/components/actions.ts` - **中风险**
  - 问题: 触发 `history-updated` 事件
  - 影响: AI分析历史更新
  
- [ ] `src/modules/app_center/views/master_analysis/ai_analysis/components/AlpinePanel.ts` - **中风险**
  - 问题: 监听 `navigate-to-scraper` 事件
  - 影响: 导航到Scraper
  
- [ ] `src/modules/app_center/views/master_analysis/scraper/handlers/dataOperations.ts` - **中风险**
  - 问题: 2处触发 `HISTORY_UPDATED` 事件
  - 影响: Scraper历史更新
  
- [ ] `src/modules/app_center/views/master_analysis/scraper/components/ScraperPanel.ts` - **中风险**
  - 问题: 2处监听历史更新事件
  - 影响: Scraper面板更新
  
- [ ] `src/modules/app_center/views/master_analysis/scraper/handlers/importHandler.ts` - **中风险**
  - 问题: 触发 `HISTORY_UPDATED` 事件
  - 影响: Scraper导入处理

### P2 - 服务层和工具 (6个文件)
- [ ] `src/services/webVitalsService.ts` - **低风险**
  - 问题: 监听 `load` 事件
  - 影响: Web性能监控
  - 建议: 浏览器原生事件，应该保留
  
- [ ] `src/services/errorTracker.ts` - **低风险**
  - 问题: 监听全局错误事件
  - 影响: 错误追踪
  - 建议: 浏览器原生事件，应该保留
  
- [ ] `src/services/analyticsService.ts` - **低风险**
  - 问题: 监听 `scroll` 和 `resize` 事件
  - 影响: 分析服务
  - 建议: 浏览器原生事件，应该保留
  
- [ ] `src/services/animation-manager.ts` - **低风险**
  - 问题: 触发动画设置变化事件
  - 影响: 动画管理
  
- [ ] `src/services/performanceService.ts` - **低风险**
  - 问题: 监听 `load` 事件
  - 影响: 性能监控
  - 建议: 浏览器原生事件，应该保留
  
- [ ] `src/components/button-ripple.ts` - **低风险**
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

### 第一批（5-6个文件，低风险）
重点：独立的业务模块，影响范围可控
1. `src/modules/app_center/views/master_analysis/services/analysisService.ts`
2. `src/modules/app_center/views/keyword_hunter/services/trackerService.ts`
3. `src/modules/app_center/views/master_analysis/qalab/services/rufusSimulator.ts`
4. `src/common/router/navigo/PreloadManager.ts`
5. `src/common/utils/WorkingStateManager.ts`
6. `src/modules/app_center/views/master_analysis/ai_analysis/services/parallelAnalysisService.ts`

### 第二批（5-6个文件，中风险）
重点：QALab和Scraper模块
1. `src/modules/app_center/views/master_analysis/qalab/services/importHandler.ts`
2. `src/modules/app_center/views/master_analysis/scraper/handlers/dataOperations.ts`
3. `src/modules/app_center/views/master_analysis/qalab/index.ts`
4. `src/modules/app_center/views/master_analysis/ai_analysis/components/actions.ts`
5. `src/modules/app_center/views/overview/index.ts`

### 第三批（4-5个文件，高风险）
重点：核心服务和事件系统
1. `src/services/llmService.ts` - 需要特别小心
2. `src/main.ts` - 应用初始化事件
3. `src/services/animation-manager.ts`
4. `src/modules/app_center/views/master_analysis/scraper/components/ScraperPanel.ts`

---

**更新时间**: 待定
**负责人**: Architecture Debt PM
