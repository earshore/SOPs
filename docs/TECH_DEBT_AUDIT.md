# 技术债务审计与消除计划

**审计日期**: 2026-06-08
**审计范围**: 当前 CI 门禁、依赖审计、`src/` 代码质量、CSS 变量与模块样式、技术债扫描、单元/集成测试。
**结论**: 当前没有仍阻塞 `ci:all` 的 P0 债务；本轮已消除循环依赖门禁、生产依赖漏洞、开发依赖漏洞、`ConfigCenter` 构建导入 warning、Vitest 输出噪声和部分质量脚本失效问题。剩余债务主要集中在格式化基线、ESLint warning 基线、复杂度热点、CSS 令牌治理和构建性能 warning。

---

## 本轮已执行

| 状态 | 项目 | 结果 |
|------|------|------|
| 已完成 | 循环依赖门禁 | `circular:check` 改为携带 `tsconfig.json`，模块 manifest 不再持有动态 view loader；真实循环依赖清零。 |
| 已完成 | Vitest 异步/输出噪声 | `uiHelpers.ts` 的延迟 DOM 操作增加无 DOM 环境保护；NPI Tracker 导出测试 mock 下载 anchor 点击，全量 Vitest 不再出现 jsdom navigation 噪声。 |
| 已完成 | 生产依赖漏洞 | 移除 `xlsx`，用 `fflate` 加最小 XLSX XML 解析替代 PPC 搜索词导入；`npm audit --omit=dev` 为 0 漏洞。 |
| 已完成 | 开发依赖漏洞 | 升级 `vite`/`vitest`/`@vitest/*`/`vite-plugin-singlefile`，显式引入安全版 `esbuild`，并用 `overrides` 固定 LHCI 链上的 `tmp`/`uuid`；`npm audit` 为 0 漏洞。 |
| 已完成 | 构建导入 warning | 将 DI 注册中的 `ConfigCenter` 改为静态导入，消除 Vite 8/Rolldown 的动态/静态 import 混用 warning。 |
| 已完成 | NPI Tracker warning 压降 | 拆分表格渲染、导出构造和事件分发，`npi_tracker/index.ts` ESLint warning 从 5 降到 0。 |
| 已完成 | 公共错误 UI 安全渲染 | `BaseModule` 和 `safeMount` 的错误降级 UI 改用 `setSafeHtml`，并转义错误文案，公共错误 UI 直接 `innerHTML` warning 清零。 |
| 已完成 | 公共导航/菜单安全渲染 | `ErrorBoundary`、`OverviewRenderer`、`SidebarRenderer`、`navigation` 和 `megaMenu` 切到安全渲染入口，并拆分 `updateUIForRoute` 复杂度。 |
| 已完成 | 模板页安全渲染收敛 | AMZ Hub、More、SOP 静态模板页和组件单点渲染改用 `setSafeHtml`/安全片段/`replaceChildren`，SOP 视图目录直接 `innerHTML` warning 清零。 |
| 已完成 | Playground Deep Chat 安全收敛 | 会话列表、工具栏 SVG、模型下拉清空和删除 fallback 改用安全渲染/显式分支，业务模块 `no-restricted-syntax` 和 `no-non-null-assertion` 清零。 |
| 已完成 | 本地存储与 LLM 单点规则清理 | `LocalDataStore` 内部集中访问浏览器存储，移除 `no-restricted-globals`；LLM 流读取和超时重试清掉常量循环/无效 catch。 |
| 已完成 | 安全基础设施直接渲染压降 | `security`、`xssFixer`、`SafeModuleLoader` 和 `SafeRenderer` 的清空/静态 UI 路径改用 `replaceChildren` 或 `setSafeHtml`。 |
| 已完成 | 入口启动流程收敛 | `main.ts` 的裸 `console` 改为入口局部日志适配器，并拆分启动编排函数，文件级 ESLint warning 清零。 |
| 已完成 | SafeModuleLoader 复杂度收敛 | 拆分错误分类、模块 render/mount 分派和 HTTP/DOM/解析判断，文件级 ESLint warning 从 3 降到 0。 |
| 已完成 | 路由类型守卫收敛 | `guards.ts` 改为字段验证器复用，4 个类型守卫复杂度 warning 清零。 |
| 已完成 | Keyword Hunter Process 收敛 | 拆分统计渲染、词云 DOM、浮动关键词列表、翻译按钮状态和关键词定位，`process/index.ts` warning 从 5 降到 0。 |
| 已完成 | PromptLab 服务复杂度收敛 | 拆分报告 Markdown 转换器、细粒度子项过滤和通用字段渲染 helper，`promptlabService.ts` warning 从 13 降到 0。 |
| 已完成 | HTTP 缓存服务复杂度收敛 | 拆分内存/持久化读取、按前缀清理和过期项清理 helper，`HttpCacheService.ts` warning 从 4 降到 0。 |
| 已完成 | AI 置信度计算复杂度收敛 | 拆分通用质量检查、数组长度计分、文本有效项计分和平均置信度收尾 helper，`confidenceCalculator.ts` warning 从 4 降到 0。 |
| 已完成 | ESLint warning baseline 收紧 | `config/eslint-warning-baseline.json` 从 342 下调到 102，`lint:warning-gate` 锁定当前剩余 warning。 |
| 已完成 | 质量脚本可运行性 | 修复 CSS 审计根目录、CSS 模块分析失效路径、注释代码清理器 `glob` 导入、质量检查 ESLint 输出缓冲和失败处理。 |
| 已完成 | 审计报告产物 | 生成 `docs/css-module-analysis-report.md`、`tests/quality/tech-debt-2026-06-08.json`、`tests/quality/tech-debt-2026-06-08.html`。 |

## 验证快照

| 验证项 | 命令 | 当前结果 |
|--------|------|----------|
| 完整 CI 门禁 | `npm run ci:all` | 通过 |
| XSS 高危门禁 | `npm run xss:gate` | 329 个源文件，0 风险点 |
| 循环依赖 | `npm run circular:check` | 331 个文件，0 循环依赖，1 个 Vite/raw import warning |
| 应用类型检查 | `npm run type-check` | 通过 |
| 测试类型检查 | `npm run type-check:tests` | 通过 |
| ESLint warning gate | `npm run lint:warning-gate` | 102/102 warning，基线内通过 |
| 全量单元/集成测试 | `npx vitest run --silent` | 65 个文件，1372 个测试，通过 |
| 构建 | `npm run build` | 通过，`ConfigCenter` 动态/静态导入 warning 已消除；仍有大 chunk、plugin timing 和 `DEP0190` warning |
| 生产依赖审计 | `npm audit --omit=dev` | 0 vulnerabilities |
| 全量依赖审计 | `npm audit` | 0 vulnerabilities |
| 格式化检查 | `npm run format:check` | 失败，308 个既有文件不符合 Prettier |
| CSS 变量审计 | `npm run css:audit` | 53 个 CSS 文件，3738 次变量使用，2008 次不符合规范 |
| CSS 模块分析 | `npm run css:analyze` | 10 个模块 CSS 文件，4227 行，3 条优化建议 |
| 质量基线 | `npm run quality:check` | 280 个文件，0 error，437 warning，162 个文件复杂度超阈值 |
| 技术债扫描 | `npm run tech-debt:scan` | 1188 项：0 critical、0 high、301 medium、887 low，债务比率 1.51% |

## 剩余技术债务

| ID | 优先级 | 债务 | 当前证据 | 验收条件 |
|----|--------|------|----------|----------|
| TD-02 | P1 | 格式化基线未收敛 | `npm run format:check` 失败，308 个既有文件不符合 Prettier。 | 选定 Prettier 配置后按目录分批格式化，最终 `format:check` 通过，并避免混入功能改动。 |
| TD-03 | P2 | ESLint warning 基线仍高 | warning gate 为 102/102；Top 规则：`complexity` 59、`max-lines-per-function` 30、`max-params` 8、`max-depth` 5。 | 每个 PR 只压低一个规则或一个模块的 warning 基线，更新 warning baseline，保持 `ci:all` 通过。 |
| TD-04 | P2 | 复杂度热点 | `quality:check` 显示平均复杂度 26，最大复杂度 207，162 个文件超过阈值。当前 lint warning top 文件包括 `llmService.ts`、`reportRenderer.ts`、`parallelAnalysisService.ts`、`dataOperations.ts`、`importHandler.ts` 和 `FullAnalysisReportAdapter.ts`。 | 按 top 文件拆分长函数和深嵌套，补回局部测试，复杂度和 warning 数量同步下降。 |
| TD-05 | P2 | CSS 变量体系不统一 | `css:audit` 显示 2008 次不符合变量命名规范，合规率 46.3%。 | 先建立变量别名/迁移表，再按 foundation、components、modules 分批替换；每批运行 `css:audit` 并记录下降量。 |
| TD-06 | P2 | 模块 CSS 重复 | `css:analyze` 发现卡片 3 类、按钮 1 类、动画 2 类、图标 2 类、徽章 2 类重复模式。 | 抽取到已有 `src/css/components/*` 和 `src/css/animations/*`，模块样式只保留差异化规则，视觉回归测试通过。 |
| TD-07 | P2 | 构建性能 warning | Vite 8 构建仍提示 `deep-chat` chunk 超过 300 kB、插件耗时集中在 checker/terser，并保留 Node `DEP0190` warning。 | 复查大 chunk 拆分和工具链 warning 来源，构建 warning 数量下降且路由懒加载仍正常。 |
| TD-08 | P3 | 全量浏览器类验证未纳入本轮 | 本轮未执行 `test:e2e`、`test:visual`、`test:performance`、`lighthouse`。 | 依赖升级、CSS 抽取或路由加载改动后补跑对应浏览器类验证，并归档失败截图/报告。 |

## 消除计划清单

### 第 0 批：门禁恢复，已完成

- [x] 恢复循环依赖检查的 TypeScript 路径解析。
- [x] 拆开模块 manifest 元数据和运行时动态 loader。
- [x] 修复 Vitest 测试结束后的延迟 DOM 回调。
- [x] 移除生产依赖 `xlsx`，替换为受控的 XLSX 读取实现。
- [x] 修复质量脚本，使 CSS/复杂度/技术债扫描能输出可用数据。
- [x] 通过 `ci:all`、全量 Vitest、测试类型检查、生产依赖审计。

### 第 1 批：安全和工具链

- [x] 升级 Vite/Vitest 工具链到当前安全版本。
- [x] 将 Vite 8 不再支持的对象式 `manualChunks` 改为函数式分包配置。
- [x] 显式安装安全版 `esbuild`，满足 `cssMinify: 'esbuild'` 的解析需求。
- [x] 用 `overrides` 固定 `@lhci/cli` 传递依赖 `tmp` 和 `uuid` 到安全版本。
- [x] 验证 `npx lhci --version`、`npm audit`、`npm run ci:all` 和全量 Vitest。

### 第 2 批：格式化基线

- [ ] 确认 Prettier 配置，不直接用默认配置重排全仓。
- [ ] 按 `src/common`、`src/components`、`src/services`、`src/modules/*` 分批格式化。
- [ ] 每批只做格式化，不混入逻辑改动；每批运行 `type-check`、`lint:warning-gate`。
- [ ] 最终将 `format:check` 纳入 CI 或明确为独立质量门禁。

### 第 3 批：ESLint warning 基线压降

- [x] 先处理 `no-restricted-syntax`：逐处替换直接 `innerHTML`，保留必要的安全注释或使用安全渲染工具。
- [x] 将 `BaseModule` 和 `safeMount` 的错误降级 UI 切到安全渲染路径。
- [x] 将公共错误边界、总览、侧边栏、导航 fallback 和 mega menu 切到安全渲染路径。
- [x] 将 AMZ Hub、More、SOP 静态模板页和组件单点 DOM 更新切到安全渲染/安全清空路径。
- [x] 将 Deep Chat、NPI Tracker、Home Display 和 Keyword Hunter 中的非空断言改为显式分支。
- [x] 将 `LocalDataStore` 的浏览器存储访问集中到本服务内部 helper，消除 `no-restricted-globals`。
- [x] 单独审计 `SafeRenderer` 白名单 sanitizer 内部剩余 4 处 `innerHTML`，保留允许标签/属性语义并切到安全插入/DOMParser 解析。
- [x] 将 `console.*` 按用途迁移到 logger、debug gate 或移除。
- [x] 将 `SafeModuleLoader`、`guards.ts` 和 `keyword_hunter/process/index.ts` 文件级 ESLint warning 清零。
- [x] 将 `promptlabService.ts` 报告 Markdown 转换和细粒度子项过滤复杂度收敛，文件级 ESLint warning 清零。
- [x] 将 `HttpCacheService.ts` 内存/持久化读取和清理流程拆分，文件级 ESLint warning 清零。
- [x] 将 `confidenceCalculator.ts` 通用质量检查和报告计分分支拆分，文件级 ESLint warning 清零。
- [x] 将 ESLint warning baseline 收紧到 102，避免后续新增 warning 回流。
- [ ] 对 `max-lines-per-function`、`complexity`、`max-depth` 只处理 top 文件，避免大范围重构。

### 第 4 批：复杂度热点

- [ ] `src/components/navigation-animation.ts`：拆分动画初始化、事件绑定、状态计算。
- [ ] `src/modules/app_center/views/master_analysis/scraper/components/ScraperPanel.ts`：拆分状态同步、导入、历史和 UI 操作。
- [ ] `src/services/llmService.ts`：拆分 provider 配置、请求构造、错误处理和流式响应。
- [x] `src/modules/app_center/views/keyword_hunter/process/index.ts`：拆分统计渲染、词云 DOM、浮动列表、翻译按钮和关键词定位，文件级 ESLint warning 清零。
- [x] `src/modules/app_center/views/master_analysis/services/promptlabService.ts`：拆分报告 Markdown 转换、通用字段渲染和子项过滤，文件级 ESLint warning 清零。
- [x] `src/services/HttpCacheService.ts`：拆分缓存读取、清理分支和过期持久化项处理，文件级 ESLint warning 清零。
- [x] `src/modules/app_center/views/master_analysis/ai_analysis/services/confidenceCalculator.ts`：拆分通用质量检查、数组计分和置信度收尾，文件级 ESLint warning 清零。
- [x] `src/main.ts`：减少启动流程中的 console 和长流程分支，文件级 ESLint warning 清零。
- [x] `src/common/ui/navigation.ts`：拆分视图加载、主面板切换和卸载事件分发，文件级复杂度 warning 清零。
- [x] `src/common/infrastructure/SafeModuleLoader.ts`：拆分错误分类和模块渲染分派，文件级 ESLint warning 清零。
- [x] `src/common/router/navigo/guards.ts`：复用字段验证器，文件级复杂度 warning 清零。
- [x] `src/modules/sops/views/growth/npi_tracker/index.ts`：拆分表格渲染、导出和事件分发，文件级 ESLint warning 清零。

### 第 5 批：CSS 令牌和模块样式

- [ ] 先冻结新变量命名规则，避免继续增加非规范变量。
- [ ] 从高频变量开始迁移：duration、spacing、color、shadow、card、code、module-local token。
- [ ] 抽取卡片、动画、徽章、图标容器的重复模式到全局组件 CSS。
- [ ] 每批运行 `css:audit`、`css:analyze`，记录不合规变量和重复模式下降量。

### 第 6 批：构建和浏览器验证

- [x] 处理 `ConfigCenter` 的动态/静态 import 混用，确认 `npm run build` 不再出现该 warning。
- [ ] 复查 Vite 8/Rolldown 下的大 chunk 拆分，优先拆分 `deep-chat` 等大模块而不是单纯提高 `chunkSizeWarningLimit`。
- [ ] 对依赖升级、CSS 抽取和路由加载改动补跑 `test:e2e`、`test:visual`、`test:performance`、`lighthouse`。

## 本轮不建议直接执行

- 不建议一次性格式化 308 个文件并混入功能修复：审查成本过高，也容易掩盖行为变更。
- 不建议在未补充浏览器验证前大改 CSS 抽象或构建分包：这类改动容易产生视觉和懒加载回归。

---

**下次复核建议**: 修改依赖工具链、路由加载、CSS 基础样式、AI analysis 数据流、PPC 搜索词导入或构建配置后，至少重跑 `npm run ci:all`、全量 Vitest、`npm audit --omit=dev` 和对应专项脚本。
