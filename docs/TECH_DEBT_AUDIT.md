# 技术债务审计与消除计划

**审计日期**: 2026-06-08
**最新更新**: 2026-07-09
**审计范围**: 当前 CI 门禁、依赖审计、`src/` 代码质量、CSS 变量与模块样式、技术债扫描、单元/集成测试。
**结论**: 当前没有仍阻塞 `ci:all` 的 P0 债务；本轮已消除循环依赖门禁、生产依赖漏洞、开发依赖漏洞、`ConfigCenter` 构建导入 warning、构建性能 warning、ESLint warning 基线、格式化基线、技术债扫描基线、安全审计 findings、Vitest 输出噪声、质量脚本失效问题、`src/` 非测试运行时代码复杂度热点、测试/工具复杂度噪声、CSS 变量命名基线和 CSS 模块重复建议。当前技术债扫描、复杂度分析和安全审计均为 0 issue；剩余事项为发布验证和未来真实身份服务接入条件，不作为当前代码债务。

---

## 本轮已执行

| 状态   | 项目                                  | 结果                                                                                                                                                                                                  |
| ------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 已完成 | 循环依赖门禁                          | `circular:check` 改为携带 `tsconfig.json`，模块 manifest 不再持有动态 view loader；真实循环依赖清零。                                                                                                 |
| 已完成 | Vitest 异步/输出噪声                  | `uiHelpers.ts` 的延迟 DOM 操作增加无 DOM 环境保护；NPI Tracker 导出测试 mock 下载 anchor 点击，全量 Vitest 不再出现 jsdom navigation 噪声。                                                           |
| 已完成 | 生产依赖漏洞                          | 移除 `xlsx`，用 `fflate` 加最小 XLSX XML 解析替代 PPC 搜索词导入；`npm audit --omit=dev` 为 0 漏洞。                                                                                                  |
| 已完成 | 开发依赖漏洞                          | 升级 `vite`/`vitest`/`@vitest/*`/`vite-plugin-singlefile`，显式引入 `esbuild@0.28.1`，并用 `overrides` 固定 LHCI/tsx 链上的风险传递依赖；`npm audit` 为 0 漏洞。                                      |
| 已完成 | 构建导入 warning                      | 将 DI 注册中的 `ConfigCenter` 改为静态导入，消除 Vite 8/Rolldown 的动态/静态 import 混用 warning。                                                                                                    |
| 已完成 | NPI Tracker warning 压降              | 拆分表格渲染、导出构造和事件分发，`npi_tracker/index.ts` ESLint warning 从 5 降到 0。                                                                                                                 |
| 已完成 | 公共错误 UI 安全渲染                  | `BaseModule` 和 `safeMount` 的错误降级 UI 改用 `setSafeHtml`，并转义错误文案，公共错误 UI 直接 `innerHTML` warning 清零。                                                                             |
| 已完成 | 公共导航/菜单安全渲染                 | `ErrorBoundary`、`OverviewRenderer`、`SidebarRenderer`、`navigation` 和 `megaMenu` 切到安全渲染入口，并拆分 `updateUIForRoute` 复杂度。                                                               |
| 已完成 | 模板页安全渲染收敛                    | AMZ Hub、More、SOP 静态模板页和组件单点渲染改用 `setSafeHtml`/安全片段/`replaceChildren`，SOP 视图目录直接 `innerHTML` warning 清零。                                                                 |
| 已完成 | Playground Deep Chat 安全收敛         | 会话列表、工具栏 SVG、模型下拉清空和删除 fallback 改用安全渲染/显式分支，业务模块 `no-restricted-syntax` 和 `no-non-null-assertion` 清零。                                                            |
| 已完成 | Playground Deep Chat 请求生命周期收紧 | 生成中会话删除/清空会标记并取消 pending 请求；停止生成仅在用户主动停止时保留 partial response；显式 thread 保存不再重建已删除会话。                                                                   |
| 已完成 | Playground Deep Chat 请求预算收紧     | 前端拒绝超长用户消息和系统提示词；历史上下文按预算保留最新消息；LLM 请求携带输出 token 上限。                                                                                                         |
| 已完成 | Playground 路由边界元数据透传         | 模块 manifest、菜单 route 和 Navigo route 保留 `meta`；Playground 声明当前产品级无认证放行策略，并用单测锁定转换行为。                                                                                |
| 已完成 | Playground 草稿保存降噪               | Deep Chat 输入草稿改为延迟持久化；卸载时 flush、清空时 cancel，避免高频输入持续写入 IndexedDB。                                                                                                       |
| 已完成 | Playground Prompt 删除一致性          | Prompt 删除先确认历史快照引用删除成功，再更新 Playground Prompt 列表；缺少快照引用按幂等成功处理，保存失败保留 UI 记录。                                                                              |
| 已完成 | Playground Deep Chat 构建分包         | `deep-chat` 第三方 bundle 改为按需静态资产脚本加载，Playground 路由 chunk 从约 420 kB 降到约 42 kB，Vite 大 chunk warning 清零。                                                                      |
| 已完成 | 构建性能 warning 收敛                 | 确认 Node `DEP0190` 在 Node 24.11.1 + Vite 8.0.16 下不可复现；Rolldown `pluginTimings` 是内置 asset/CSS 插件耗时占比诊断，已用 `checks.pluginTimings=false` 只关闭该诊断，其他构建 warning 保持开启。 |
| 已完成 | PPC 搜索词拆分收口                    | 清理 `ppc_tools/ppc_search_terms/index.ts` 拆分后残留的重复分析/筛选/设置实现，保留 `analysisEngine.ts`、`filters.ts`、`settings.ts` 等单一来源，恢复 type-check、lint 和 Vite 构建。                           |
| 已完成 | 测试 lint 非空断言清理                | `dnaExtractor.test.ts` 和 `universalDNAExtractor.test.ts` 改为显式断言收窄，`lint:tests` 从 99 条 `no-non-null-assertion` warning 收敛到 0。                                                          |
| 已完成 | 原生日志全局兜底                      | 为 `nativeLoggerConsole` 增加入口/测试 bootstrap 和全局类型声明，修复替换裸 `console` 后的类型与运行时兜底缺口。                                                                                      |
| 已完成 | PPC Agent/报表控件拆分收口            | 将分析流程、Agent 复核合并逻辑和报表控件渲染从 `index.ts` 拆到 `analysisFlow.ts`、`agentReview.ts`、`reportControls.ts`，清理拆分中间态的重复定义和漏导入。                                           |
| 已完成 | PPC 规则单一来源                      | 将搜索词规则和 ERP 活动规则拆到 `searchTermRules.ts`、`campaignRules.ts`，`analysisEngine.ts` 只保留报表解析和行级编排。                                                                              |
| 已完成 | 复杂度分析脚本恢复                    | `tools/complexity-analyzer.ts` 改为与仓库其他工具一致的 `glob@7` 默认导入 + `promisify`，`code:analyze:complexity` 恢复可运行。                                                                       |
| 已完成 | 本地存储与 LLM 单点规则清理           | `LocalDataStore` 内部集中访问浏览器存储，移除 `no-restricted-globals`；LLM 流读取和超时重试清掉常量循环/无效 catch。                                                                                  |
| 已完成 | 安全基础设施直接渲染压降              | `security`、`xssFixer`、`SafeModuleLoader` 和 `SafeRenderer` 的清空/静态 UI 路径改用 `replaceChildren` 或 `setSafeHtml`。                                                                             |
| 已完成 | 入口启动流程收敛                      | `main.ts` 的裸 `console` 改为入口局部日志适配器，并拆分启动编排函数，文件级 ESLint warning 清零。                                                                                                     |
| 已完成 | SafeModuleLoader 复杂度收敛           | 拆分错误分类、模块 render/mount 分派和 HTTP/DOM/解析判断，文件级 ESLint warning 从 3 降到 0。                                                                                                         |
| 已完成 | 路由类型守卫收敛                      | `guards.ts` 改为字段验证器复用，4 个类型守卫复杂度 warning 清零。                                                                                                                                     |
| 已完成 | Keyword Hunter Process 收敛           | 拆分统计渲染、词云 DOM、浮动关键词列表、翻译按钮状态和关键词定位，`process/index.ts` warning 从 5 降到 0。                                                                                            |
| 已完成 | PromptLab 服务复杂度收敛              | 拆分报告 Markdown 转换器、细粒度子项过滤和通用字段渲染 helper，`promptlabService.ts` warning 从 13 降到 0。                                                                                           |
| 已完成 | HTTP 缓存服务复杂度收敛               | 拆分内存/持久化读取、按前缀清理和过期项清理 helper，`HttpCacheService.ts` warning 从 4 降到 0。                                                                                                       |
| 已完成 | AI 置信度计算复杂度收敛               | 拆分通用质量检查、数组长度计分、文本有效项计分和平均置信度收尾 helper，`confidenceCalculator.ts` warning 从 4 降到 0。                                                                                |
| 已完成 | AI Analysis 入口复杂度收敛            | 拆分 `runAIAnalysis`、`runParallelAIAnalysis` 和 `runAnalysisAction` 的目标循环、缓存/并发执行、置信度 metadata 和 action 状态编排；复杂度报告问题函数从 249 降到 245。                               |
| 已完成 | PromptLab 报告渲染复杂度收敛          | 拆分新版报告模块初始化、单模块模板、标题/置信度/子项渲染 helper，`renderNewFormatModules` 不再出现在最新复杂度报告。                                                                                  |
| 已完成 | 竞争分析 DNA Adapter 复杂度收敛       | 拆分竞品关键词、metadata、source fields 和 DNA 构造流程，`extractDNA` 不再出现在最新复杂度报告；最新复杂度报告问题函数从 245 降到 239。                                                               |
| 已完成 | NPI Tracker 行渲染复杂度收敛          | 拆分 `renderTableRow` 的行上下文、基础档案、合规、财务、流量和决策单元格渲染，`renderTableRow` 不再出现在最新复杂度报告；问题函数从 236 降到 234。                                                    |
| 已完成 | SafeModuleLoader 加载入口复杂度收敛   | 拆分 `loadModule` 的选项归一化、加载指示器、并发等待、缓存命中、加载缓存、成功结果和错误收尾，`loadModule` 不再出现在最新复杂度报告；问题函数从 232 降到 231。                                          |
| 已完成 | Scraper 导入处理复杂度收敛            | 拆分 marketplace 选择弹窗的渲染/事件/清理流程，以及 `mergeProducts` 的主版本选择、Review 来源收集、去重和临时字段清理，`importHandler.ts` 不再出现在最新复杂度报告。                                   |
| 已完成 | More Prompts 动作注册复杂度收敛       | 将 `registerWindowActions` 中的查看、语言切换、关闭、卡片复制和弹窗复制动作拆成命名 handler，`registerWindowActions` 不再出现在最新复杂度报告。                                                        |
| 已完成 | Keyword Hunter 高亮渲染复杂度收敛     | 拆分 `highlightText` 的字符关键词映射、连续分段、位置 class 和安全 HTML 渲染；`highlightText`/`renderCopyDisplay` 不再出现在最新复杂度报告。                                                           |
| 已完成 | NPI Tracker E2E 复杂度噪声收敛        | 移除 `npi-tracker.spec.ts` 的文件级大 `describe` 包裹，保留各业务分组；该文件不再出现在最新复杂度报告，Playwright `--list` 可正常解析 102 个测试。                                                     |
| 已完成 | 格式化基线收敛                        | `format:check` 显式使用项目 Prettier 配置和 ignore 文件，`src/**/*.{js,ts,jsx,tsx,json,css,md}` 当前全部符合 Prettier。                                                                               |
| 已完成 | 技术债扫描基线清零                    | 抽取重复测试 fixture、导航开关状态、并行分析进度更新、历史 Prompt 指纹匹配和 LLM 响应错误构造；`tech-debt:scan` 当前 0 issue。                                                                        |
| 已完成 | ESLint warning baseline 清零          | `config/eslint-warning-baseline.json` 从 342 收敛到 0，`lint:warning-gate` 当前为 0/0 warning。                                                                                                       |
| 已完成 | 质量脚本可运行性                      | 修复 CSS 审计根目录、CSS 模块分析失效路径、注释代码清理器 `glob` 导入、质量检查 ESLint 输出缓冲和失败处理。                                                                                           |
| 已完成 | LLM timeout 边界单一化                | 删除未被生产路径引用的 `llmServiceWithTimeout` 包装器和自证测试；LLM 请求超时与重试继续由 `llmService` 的 `AbortController` 边界负责，避免双层重试、取消无效和悬挂 Promise 语义。                    |
| 已完成 | Marketing Calendar 搜索复杂度收敛     | 拆分搜索框 focus/dismiss/input/keyboard/clear/resize/scroll 事件绑定，`bindSearchEvents` 不再出现在最新复杂度报告。                                                                                   |
| 已完成 | Restricted Words 搜索复杂度收敛       | 拆分搜索条件读取、站点上下文过滤、关键词匹配和属性过滤，`executeSearch` 不再出现在最新复杂度报告。                                                                                                    |
| 已完成 | Master Analysis 报告生成复杂度收敛    | 拆分 legacy `generateReport` 的产品数据 section、Prompt 构造、LLM 调用和响应解析，`analysisService.ts` 不再出现在最新复杂度报告。                                                                      |
| 已完成 | SafeRenderer sanitizer 复杂度收敛     | 拆分 `sanitizeHtml` 的子节点遍历、元素清理、属性复制和 URL 属性检查，`SafeRenderer.ts` 不再出现在最新复杂度报告。                                                                                     |
| 已完成 | `src/` 运行时代码复杂度热点清空       | 继续拆分 `ImageLazyLoader.loadImage`、`parseReviews`、`parseBuyerProfile`、`buildContextSection`、`extractUSPs`、`calculateTitleKeywordsConfidence`、`renderMegaMenu` 和 `getPreviewText`；最新复杂度报告中 0 个过长函数、0 个高复杂度函数。 |
| 已完成 | CSS 变量命名基线清零                  | 冻结全局语义 token、组件 token 和模块命名空间 token 规则；将卡片渐变变量迁入 `--card-*` 命名空间，`css:audit` 当前 0 个不合规变量。                                                                  |
| 已完成 | CSS 动画重复小批收敛                  | 将 Home、Scraper、Keyword Hunter 和 AI Analysis 的模块 keyframes 收敛到全局动画库，并将模块动画时长收敛为 duration token；模块 CSS 动画重复次数从 45 降到 0。                                       |
| 已完成 | CSS 状态徽章和图标重复收敛            | 将跨 SOPs、AMZ Hub 和 More 复用的 `sop-status-*`、模块徽章、旧图标容器兼容层沉到全局组件 CSS；模块徽章和图标重复均只剩 1 次非建议项。                                                                |
| 已完成 | CSS 卡片壳层重复建议清零              | 将 `.sop-card`、`.amz_card-hover`、Keyword Hunter 卡片、Prompt 资料源卡片、Master Analysis widget 和 Scraper 手工选项卡片壳层集中到 `src/css/components/cards.css`；`css:analyze` 当前 0 条优化建议。 |
| 已完成 | 复杂度分析 JS 函数边界修正            | 为 JS/TS 函数扫描记录函数体是否已开始，避免多行函数或嵌套块在首个 `{}` 片段处提前闭合，降低测试/工具复杂度误报。                                                                                     |
| 已完成 | 截图索引生成复杂度收敛                | 将 `tests/helpers/screenshot-manager.ts` 的 HTML/CSS/客户端 JS 模板外置到 `tests/helpers/screenshot-index-template.html`；`generateHtmlIndex` 不再出现在最新复杂度报告。                            |
| 已完成 | Deep Chat 请求测试债务清理            | 将 Deep Chat 请求测试拆成短分组并抽取停止请求启动和线程持久化断言 helper，清除新增 long-function/duplicate-code 扫描回归；`tech-debt:scan` 当前恢复 0 issue。                                           |
| 已完成 | 质量仪表板生成复杂度收敛              | 拆分 `tests/quality/generate-dashboard.js` 的页面框架、样式、脚本和质量卡片模板；`generateDashboard`、`generateQualitySection` 不再出现在最新复杂度报告。                                             |
| 已完成 | AlpineRegistry 测试复杂度收敛         | 抽取共享 registry setup/cleanup，并按 register、init、依赖解析等职责拆分大块 `describe`；`AlpineRegistry.test.ts` 不再出现在最新复杂度报告。                                                         |
| 已完成 | Security Auditor 工具复杂度收敛       | 拆分 `tools/security-auditor.ts` 的 HTML report builder、分类匹配和 `javascript:` AST 检测 helper；该文件不再出现在最新复杂度报告。                                                                   |
| 已完成 | 安全审计 findings 清零                | Devtools、viewLoader 和 SafeModuleLoader 高风险渲染/URL findings 已收敛；LLM/代理凭据禁止写入普通 localStorage，旧明文 LLM key 和代理旧明文配置会迁移或按 secrets 清理；剩余 `Math.random`/静态 hash low findings 已收敛，`security:audit` 当前 0 issue。 |
| 已完成 | 测试/工具复杂度噪声清零               | 继续拆分 `quality-monitor`、`complexity-analyzer`、命名校验器、注释代码扫描器、视觉阈值校验、性能报告、bundle 分析和 Keyword Hunter fixture；`code:analyze:complexity` 当前 0 issue。                 |
| 已完成 | 审计报告产物                          | 旧的 dated 质量/安全/复杂度生成报告已从 Git 跟踪中清理；后续报告作为本地生成物忽略，当前状态以主文档和脚本输出为准。                                                                                 |

## 验证快照

| 验证项                   | 命令                                                                                                                                                                                                                                                                                                                                                                                                                  | 当前结果                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 完整构建门禁             | `npm run build`                                                                                                                                                                                                                                                                                                                                                                                                       | 通过；包含 XSS、secret scan、循环依赖、应用类型检查、生产 ESLint、warning gate、测试类型检查、测试 ESLint、格式检查和 Vite 构建       |
| XSS 高危门禁             | `npm run xss:gate`                                                                                                                                                                                                                                                                                                                                                                                                    | 503 个源文件，0 风险点；清空 DOM 跳过 6 处                                                                                           |
| 循环依赖                 | `npm run circular:check`                                                                                                                                                                                                                                                                                                                                                                                              | 0 个循环依赖，0 个跳过依赖                                                                                                           |
| 应用类型检查             | `npm run type-check`                                                                                                                                                                                                                                                                                                                                                                                                  | 通过                                                                                                                                 |
| 测试类型检查             | `npm run type-check:tests`                                                                                                                                                                                                                                                                                                                                                                                            | 通过                                                                                                                                 |
| 生产 ESLint              | `npm run lint`                                                                                                                                                                                                                                                                                                                                                                                                        | 通过                                                                                                                                 |
| 测试 ESLint              | `npm run lint:tests`                                                                                                                                                                                                                                                                                                                                                                                                  | 通过；0 error、0 warning                                                                                                             |
| ESLint warning gate      | `npm run lint:warning-gate`                                                                                                                                                                                                                                                                                                                                                                                           | 0/0 warning，通过                                                                                                                    |
| 全量单元/集成测试        | `npx vitest run --reporter=dot`                                                                                                                                                                                                                                                                                                                                                                                       | 176 个文件，1997 个测试，通过                                                                                                        |
| 构建                     | `npm run build:app`                                                                                                                                                                                                                                                                                                                                                                                                   | 通过；未出现 Vite chunk size warning、`DEP0190` 或 Rolldown `pluginTimings` 提示                                                     |
| 视觉回归                 | `npx playwright test tests/visual --project=chromium`                                                                                                                                                                                                                                                                                                                                                                  | 30 个 Chromium 视觉测试通过；仅 Playwright runner 输出 `NO_COLOR`/`FORCE_COLOR` 环境变量提示                                        |
| PPC 搜索词专项测试       | `npx vitest run tests/unit/ppc-search-terms.test.ts tests/unit/ppc-search-terms-ui.test.ts tests/unit/ppcLlmAnalysisService.test.ts`                                                                                                                                                                                                                                                                                  | 3 个文件，33 个测试，通过                                                                                                            |
| 公共错误处理专项测试     | `npx vitest run tests/unit/AppError.test.ts tests/unit/GlobalErrorHandler.test.ts tests/unit/errorCodes.test.ts`                                                                                                                                                                                                                                                                                                      | 3 个文件，122 个测试，通过                                                                                                           |
| 安全渲染专项测试         | `npx vitest run tests/unit/SafeRenderer.test.ts`                                                                                                                                                                                                                                                                                                                                                                      | 1 个文件，59 个测试，通过                                                                                                            |
| 公共模块专项测试         | `npx vitest run tests/unit/AppError.test.ts tests/unit/GlobalErrorHandler.test.ts tests/unit/errorCodes.test.ts tests/unit/SafeRenderer.test.ts tests/unit/commonRenderers.test.ts tests/unit/SkeletonLoader.test.ts src/common/components/SkeletonLoader.test.ts tests/unit/routerNavigoCore.test.ts tests/unit/moduleManifest.test.ts tests/unit/StandardModule.test.ts src/common/utils/welcomeBannerA11y.test.ts` | 11 个文件，225 个测试，通过                                                                                                          |
| Playground Deep Chat E2E | `npx playwright test tests/e2e/deep-chat-send.spec.ts tests/e2e/deep-chat-prompt-preview.spec.ts --project=chromium`                                                                                                                                                                                                                                                                                                  | 7 个 Chromium 测试通过；仅 Playwright runner 输出 `NO_COLOR`/`FORCE_COLOR` 环境变量提示                                               |
| 生产依赖审计             | `npm audit --omit=dev`                                                                                                                                                                                                                                                                                                                                                                                                | 0 vulnerabilities                                                                                                                    |
| 全量依赖审计             | `npm audit`                                                                                                                                                                                                                                                                                                                                                                                                           | 0 vulnerabilities                                                                                                                    |
| 格式化检查               | `npm run format:check`                                                                                                                                                                                                                                                                                                                                                                                                | 通过，所有匹配的 `src` 文件符合 Prettier                                                                                             |
| CSS 变量审计             | `npm run css:audit`                                                                                                                                                                                                                                                                                                                                                                                                   | 80 个 CSS 文件，8768 次变量使用，8768 次符合规范，0 次不符合规范，0 deprecated                                                       |
| CSS 模块分析             | `npm run css:analyze`                                                                                                                                                                                                                                                                                                                                                                                                 | 10 个模块 CSS 文件，7198 行；卡片 2 类/3 次、按钮 2 类/5 次、图标 1 类/1 次、徽章 1 类/1 次；0 条优化建议                            |
| 质量基线                 | `npm run quality:check`                                                                                                                                                                                                                                                                                                                                                                                               | ESLint 检查 412 个文件，0 error、0 warning；TypeScript 0 error；统计 412 个文件，平均复杂度 19.4，最大复杂度 261，175 个文件超过阈值 |
| 复杂度分析               | `npm run code:analyze:complexity`                                                                                                                                                                                                                                                                                                                                                                                     | 705 个文件，13,701 个函数，0 个过长函数、0 个高复杂度函数、0 个问题函数                                                             |
| 技术债扫描               | `npm run tech-debt:scan`                                                                                                                                                                                                                                                                                                                                                                                              | 410 个文件，101,928 行，0 issue，债务比率 0.00%                                                                                      |
| 安全审计                 | `npm run security:audit`                                                                                                                                                                                                                                                                                                                                                                                              | 435 个文件，133,491 行，0 issue，风险分 0/100；生成报告为本地忽略产物，不再跟踪 dated 报告                                            |

## 非阻塞跟进项

| ID    | 类型             | 当前证据                                                                                                                                                 | 后续触发条件                                                                                              |
| ----- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| FU-08 | 发布验证         | 已补跑 Playground Deep Chat 7 条专项 Chromium e2e 和 Chromium 视觉回归；本轮代码门禁、技术债扫描、复杂度分析和安全审计均已清零。                        | 发布前或依赖升级、CSS 抽取、路由加载改动后，补跑 `test:e2e`、`test:performance`、`lighthouse` 并归档报告。 |
| FU-09 | 未来身份服务接入 | Deep Chat 请求生命周期和请求预算已收紧；Playground 路由已声明产品级无认证放行策略，feature flag 已执行；`requiresAuth` 路由在未接入真实认证服务前会拒绝访问，避免假权限放行。 | 接入用户身份/权限服务后，补充真实认证通过、未登录拒绝和权限不足路径测试。                                  |

## 修复执行顺序

1. **发布前补齐 FU-08 浏览器验证**：对权限、路由加载、分包相关改动执行 `test:e2e`、`test:visual`、`test:performance`、`lighthouse` 中对应项目，并归档失败截图或报告。
2. **真实身份服务接入时处理 FU-09**：当前版本未接入真实身份服务时拒绝 `requiresAuth` 路由；接入后再打开受保护路由并补齐认证通过、未登录拒绝和权限不足测试。

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

- [x] 确认 Prettier 配置，不直接用默认配置重排全仓；`format`/`format:check` 已显式指定 `config/.prettierrc.json` 和 `config/.prettierignore`。
- [x] 完成 `src/modules/app_center/views/ppc_tools/ppc_search_terms/**/*.{ts,html,css}` 格式化，并通过 PPC 专项测试、`type-check` 和 `lint:warning-gate`。
- [x] 完成 `src/common/errors/**/*.{ts,js,css,md,json}` 格式化，并通过公共错误处理专项测试、`type-check` 和 `lint:warning-gate`。
- [x] 完成 `src/common/infrastructure/**/*.{ts,js,css,md,json}` 格式化，并通过安全渲染专项测试、`type-check` 和 `lint:warning-gate`。
- [x] 完成 `src/common/**/*.{ts,js,css,md,json}` 格式化，并通过公共模块专项测试、`type-check` 和 `lint:warning-gate`。
- [x] 按 `src/common`、`src/components`、`src/services`、`src/modules/*` 分批格式化。
- [x] 每批只做格式化，不混入逻辑改动；每批运行 `type-check`、`lint:warning-gate`。
- [x] `format:check` 当前作为独立质量门禁，使用项目 Prettier 配置且验证通过。

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
- [x] 将 ESLint warning baseline 收紧到 0，避免后续新增 warning 回流。
- [x] 将测试长函数和扫描器重复代码基线收敛到 0，`lint:tests` 与 `tech-debt:scan` 均不再报告问题。
- [x] 对 `max-lines-per-function`、`complexity`、`max-depth` 只处理 top 文件，避免大范围重构。

### 第 4 批：复杂度热点

- [x] `src/modules/more/views/explore/prompts/index.ts`：拆分 `registerWindowActions` 的查看、语言切换、关闭和复制动作，`registerWindowActions` 不再出现在复杂度报告。
- [x] `src/modules/amz_hub/views/practice/marketing_calendar/index.ts`：拆分 `bindSearchEvents` 的输入监听、筛选执行和空态刷新，`bindSearchEvents` 不再出现在复杂度报告。
- [x] `src/modules/sops/views/growth/restricted_words/restrictedWordsHandler.ts`：拆分 `executeSearch` 的条件收集、匹配执行和结果渲染，`executeSearch` 不再出现在复杂度报告。
- [x] `src/modules/app_center/views/master_analysis/services/analysisService.ts`：拆分 `generateReport` 的 section 组装和缺省值处理，`analysisService.ts` 不再出现在复杂度报告。
- [x] `src/common/infrastructure/SafeRenderer.ts`：拆分 `sanitizeHtml` 的节点清理和属性过滤，`SafeRenderer.ts` 不再出现在复杂度报告。
- [x] `src/common/utils/ImageLazyLoader.ts`：拆分 `loadImage` 的加载状态、事件处理、失败图和资源赋值，`loadImage` 不再出现在复杂度报告。
- [x] `src/modules/app_center/views/master_analysis/services/parserService.ts`：拆分 `parseReviews` 的容器定位、兜底解析和标准解析，`parseReviews` 不再出现在复杂度报告。
- [x] `src/modules/app_center/views/master_analysis/ai_analysis/services/analysisService.ts`：拆分 `parseBuyerProfile` 的统计、亮点和明细构造，`parseBuyerProfile` 不再出现在复杂度报告。
- [x] `src/modules/app_center/views/master_analysis/services/promptlabService.ts`：拆分 `buildContextSection` 的报告段过滤、Markdown 转换和上下文格式化，`buildContextSection` 不再出现在复杂度报告。
- [x] `src/modules/app_center/views/master_analysis/services/dnaExtractor.ts`：拆分 `extractUSPs` 的功能卖点、差异化和 bullet analysis 来源追加，`extractUSPs` 不再出现在复杂度报告。
- [x] `src/modules/app_center/views/master_analysis/ai_analysis/services/confidenceCalculator.ts`：复用通用计分 helper 收敛 `calculateTitleKeywordsConfidence`，目标函数不再出现在复杂度报告。
- [x] `src/common/ui/megaMenu.ts`：拆分 App 模块排序、单卡片渲染和 HTML 拼接，`renderMegaMenu` 不再出现在复杂度报告。
- [x] `src/modules/app_center/views/master_analysis/promptlab/components/previewExtractor.ts`：拆分旧格式预览的数组、对象和 primitive 文本格式化，`getPreviewText` 不再出现在复杂度报告。
- [x] `src/modules/app_center/views/keyword_hunter/process/index.ts`：继续拆分 `highlightText`、`renderCopyDisplay` 的文本切片和 DOM 片段构造，目标函数不再出现在复杂度报告。
- [x] `src/modules/app_center/views/keyword_hunter/process/index.ts`：拆分统计渲染、词云 DOM、浮动列表、翻译按钮和关键词定位，文件级 ESLint warning 清零。
- [x] `src/modules/app_center/views/master_analysis/services/promptlabService.ts`：拆分报告 Markdown 转换、通用字段渲染和子项过滤，文件级 ESLint warning 清零。
- [x] `src/services/HttpCacheService.ts`：拆分缓存读取、清理分支和过期持久化项处理，文件级 ESLint warning 清零。
- [x] `src/modules/app_center/views/master_analysis/ai_analysis/services/confidenceCalculator.ts`：拆分通用质量检查、数组计分和置信度收尾，文件级 ESLint warning 清零。
- [x] `src/modules/app_center/views/master_analysis/ai_analysis/services/aiAnalysisService.ts`：拆分目标循环、置信度计算和 metadata 组装，`runAIAnalysis` 不再出现在复杂度报告。
- [x] `src/modules/app_center/views/master_analysis/ai_analysis/services/parallelAnalysisService.ts`：拆分配置解析、缓存回放、pending 执行和失败策略，`runParallelAIAnalysis` 不再出现在复杂度报告。
- [x] `src/modules/app_center/views/master_analysis/ai_analysis/components/actions.ts`：拆分分析准备、并发配置、成功落库和错误处理，`runAnalysisAction` 不再出现在复杂度报告。
- [x] `src/modules/app_center/views/master_analysis/promptlab/components/reportRenderer.ts`：拆分新版报告模块初始化、单模块模板、标题/置信度/子项渲染，`renderNewFormatModules` 不再出现在复杂度报告。
- [x] `src/modules/app_center/views/master_analysis/services/adapters/CompetitorReportAdapter.ts`：拆分竞品 DNA 提取和构造流程，`extractDNA` 不再出现在复杂度报告。
- [x] `src/modules/sops/views/growth/npi_tracker/index.ts`：继续拆分 `renderTableRow` 单行模板、状态徽章、竞品字段和操作按钮，`renderTableRow` 不再出现在复杂度报告。
- [x] `src/common/infrastructure/SafeModuleLoader.ts`：继续拆分 `loadModule` 的缓存命中、动态导入、模块解析和错误收尾，`loadModule` 不再出现在复杂度报告。
- [x] `src/modules/app_center/views/master_analysis/scraper/handlers/importHandler.ts`：拆分 marketplace selection modal、产品合并和去重策略，`importHandler.ts` 不再出现在复杂度报告。
- [x] `src/main.ts`：减少启动流程中的 console 和长流程分支，文件级 ESLint warning 清零。
- [x] `src/common/ui/navigation.ts`：拆分视图加载、主面板切换和卸载事件分发，文件级复杂度 warning 清零。
- [x] `src/common/infrastructure/SafeModuleLoader.ts`：拆分错误分类和模块渲染分派，文件级 ESLint warning 清零。
- [x] `src/common/router/navigo/guards.ts`：复用字段验证器，文件级复杂度 warning 清零。
- [x] `src/modules/sops/views/growth/npi_tracker/index.ts`：拆分表格渲染、导出和事件分发，文件级 ESLint warning 清零。

### 第 5 批：CSS 令牌和模块样式

- [x] 先冻结新变量命名规则，避免继续增加非规范变量；已覆盖全局语义 token、组件 token 和模块命名空间 token。
- [x] 从高频变量开始迁移：card 渐变变量迁入 `--card-*`，module-local token 通过命名空间规则收敛，`css:audit` 清零。
- [x] 抽取卡片、动画、徽章、图标容器的重复模式到全局组件 CSS；`css:analyze` 当前 0 条优化建议，Chromium 视觉回归通过。
- [x] 每批运行 `css:audit`、`css:analyze`，记录不合规变量和重复模式下降量。

### 第 6 批：构建和浏览器验证

- [x] 处理 `ConfigCenter` 的动态/静态 import 混用，确认 `npm run build` 不再出现该 warning。
- [x] 将 `deep-chat` 第三方 bundle 从 Playground chunk 中移出，改为按需静态资产脚本加载，未提高 `chunkSizeWarningLimit`。
- [x] 复查 plugin timing 和 Node `DEP0190` warning 来源；`DEP0190` 未复现，`pluginTimings` 已按 Rolldown check 精准关闭。
- [x] 已补跑 Playground Deep Chat prompt preview 专项 e2e 和 Chromium `test:visual`；后续对依赖升级、CSS 抽取和路由加载改动继续补跑全量 `test:e2e`、`test:performance`、`lighthouse`。

### 第 7 批：Playground 边界收紧

- [x] 删除/清空会话时取消 pending LLM 请求，避免 late response 复活已删除会话。
- [x] 停止生成只在用户主动停止时保留 partial response。
- [x] 增加 Playground 请求预算：用户消息、系统提示词、上下文和输出 token 上限。
- [x] 为 Playground route manifest 增加访问策略元数据，并让 route converter 保留该 meta。
- [x] 记录当前产品层无认证放行策略并用测试锁定行为。
- [x] 在未接入真实认证服务时拒绝 `requiresAuth` 路由，避免假权限放行。
- [x] Deep Chat 草稿输入改为 debounce 持久化，卸载/清空边界分别 flush/cancel。
- [x] Prompt 删除改为等待历史快照引用删除结果，避免持久层失败时 UI 先显示已删除。
- [ ] 接入真实身份/权限服务后，补充真实认证通过、未登录拒绝和权限不足路径守卫测试。

### 第 8 批：测试/工具复杂度噪声

- [x] 修正 `tools/complexity-analyzer.ts` 的 JS/TS 函数结束判断，减少多行函数和嵌套块导致的误报。
- [x] 外置截图索引 HTML 模板，`tests/helpers/screenshot-manager.ts` 的 `generateHtmlIndex` 不再出现在复杂度报告。
- [x] 拆分 Deep Chat 请求测试分组并抽取重复请求启动/持久化断言，`tech-debt:scan` 恢复 0 issue。
- [x] 拆分质量仪表板页面、样式、脚本和质量卡片模板，`tests/quality/generate-dashboard.js` 的目标函数不再出现在复杂度报告。
- [x] 拆分 `tests/unit/AlpineRegistry.test.ts` 大块 `describe` 并抽取共享 setup，复杂度问题函数从 50 降到 45。
- [x] 拆分 `tools/security-auditor.ts` 的 HTML report builder、分类匹配和 `javascript:` AST 检测，复杂度问题函数从 45 降到 39。
- [x] 继续压降测试/工具复杂度噪声，最新复杂度问题函数降到 31；顶部剩余为 `scraperPanelCurrent.test.ts`、`scraper-performance.spec.ts`、`quality-monitor.ts` 和 `tech-debt-scanner.ts`。
- [x] 拆分剩余长测试、performance fixture 和质量工具函数；`code:analyze:complexity` 当前 0 个过长函数、0 个高复杂度函数、0 个问题函数。

### 第 9 批：安全审计发现项

- [x] 修复 `security:audit` high findings：devtools/viewLoader/SafeModuleLoader 安全渲染与 URL 赋值收敛，LLM/代理凭据禁止普通 localStorage 明文写入，旧明文 LLM key 和代理旧明文配置会迁移或按 secrets 清理，SecureStorage/StorageService 作为受控边界由 AST 规则识别。
- [x] 复核并清理 20 个 low findings：19 个 `Math.random` 场景改走 Web Crypto 随机 helper，1 个静态 URL hash 赋值场景加入明确的内部路由白名单。

## 本轮不建议直接执行

- 不建议将后续复杂度、CSS 或权限边界修复混入格式化批次：格式化基线已清零，后续应保持行为改动可审查。
- 不建议在未补充浏览器验证前大改 CSS 抽象或构建分包：这类改动容易产生视觉和懒加载回归。

---

**下次复核建议**: 修改依赖工具链、路由加载、CSS 基础样式、AI analysis 数据流、PPC 搜索词导入或构建配置后，至少重跑 `npm run ci:all`、全量 Vitest、`npm audit --omit=dev` 和对应专项脚本。
