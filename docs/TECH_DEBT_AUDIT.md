# 技术债务审计与消除计划

**审计日期**: 2026-06-08
**审计范围**: 当前 CI 门禁、依赖审计、`src/` 代码质量、CSS 变量与模块样式、技术债扫描、单元/集成测试。
**结论**: 当前没有仍阻塞 `ci:all` 的 P0 债务；本轮已消除循环依赖门禁、生产依赖漏洞和部分质量脚本失效问题。剩余债务主要集中在开发依赖安全升级、格式化基线、ESLint warning 基线、复杂度热点、CSS 令牌治理和构建性能 warning。

---

## 本轮已执行

| 状态 | 项目 | 结果 |
|------|------|------|
| 已完成 | 循环依赖门禁 | `circular:check` 改为携带 `tsconfig.json`，模块 manifest 不再持有动态 view loader；真实循环依赖清零。 |
| 已完成 | Vitest 异步泄漏 | `uiHelpers.ts` 的延迟 DOM 操作增加无 DOM 环境保护，全量 Vitest 不再因测试结束后的回调报错。 |
| 已完成 | 生产依赖漏洞 | 移除 `xlsx`，用 `fflate` 加最小 XLSX XML 解析替代 PPC 搜索词导入；`npm audit --omit=dev` 为 0 漏洞。 |
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
| ESLint warning gate | `npm run lint:warning-gate` | 340/342 warning，基线内通过 |
| 全量单元/集成测试 | `npx vitest run --silent --reporter=basic` | 65 个文件，1372 个测试，通过 |
| 构建 | `npm run build` | 通过，仍有构建 warning |
| 生产依赖审计 | `npm audit --omit=dev` | 0 vulnerabilities |
| 全量依赖审计 | `npm audit` | 失败，剩余 11 个开发/传递依赖漏洞 |
| 格式化检查 | `npm run format:check` | 失败，308 个既有文件不符合 Prettier |
| CSS 变量审计 | `npm run css:audit` | 53 个 CSS 文件，3738 次变量使用，2008 次不符合规范 |
| CSS 模块分析 | `npm run css:analyze` | 10 个模块 CSS 文件，4227 行，3 条优化建议 |
| 质量基线 | `npm run quality:check` | 280 个文件，0 error，437 warning，162 个文件复杂度超阈值 |
| 技术债扫描 | `npm run tech-debt:scan` | 1188 项：0 critical、0 high、301 medium、887 low，债务比率 1.51% |

## 剩余技术债务

| ID | 优先级 | 债务 | 当前证据 | 验收条件 |
|----|--------|------|----------|----------|
| TD-01 | P1 | 开发依赖安全漏洞 | `npm audit` 剩余 11 项，集中在 `vite`/`vitest`/`esbuild` 和 `@lhci/cli`/`tmp`/`uuid` 链；自动修复需要 breaking/force。 | 在独立升级分支完成 Vite/Vitest/LHCI 兼容升级或替换，`npm audit` 清零，或对 dev-only 风险形成明确例外说明。 |
| TD-02 | P1 | 格式化基线未收敛 | `npm run format:check` 失败，308 个既有文件不符合 Prettier。 | 选定 Prettier 配置后按目录分批格式化，最终 `format:check` 通过，并避免混入功能改动。 |
| TD-03 | P2 | ESLint warning 基线仍高 | warning gate 为 340/342；质量报告口径为 437 warning。Top 规则：`no-non-null-assertion` 133、`no-restricted-syntax` 96、`complexity` 90、`no-console` 47、`max-lines-per-function` 41。 | 每个 PR 只压低一个规则或一个模块的 warning 基线，更新 warning baseline，保持 `ci:all` 通过。 |
| TD-04 | P2 | 复杂度热点 | `quality:check` 显示平均复杂度 26，最大复杂度 207，162 个文件超过阈值。技术债 top 文件包括 `navigation-animation.ts`、`ScraperPanel.ts`、`llmService.ts`、`keyword_hunter/process/index.ts`、`main.ts`。 | 按 top 文件拆分长函数和深嵌套，补回局部测试，复杂度和 warning 数量同步下降。 |
| TD-05 | P2 | CSS 变量体系不统一 | `css:audit` 显示 2008 次不符合变量命名规范，合规率 46.3%。 | 先建立变量别名/迁移表，再按 foundation、components、modules 分批替换；每批运行 `css:audit` 并记录下降量。 |
| TD-06 | P2 | 模块 CSS 重复 | `css:analyze` 发现卡片 3 类、按钮 1 类、动画 2 类、图标 2 类、徽章 2 类重复模式。 | 抽取到已有 `src/css/components/*` 和 `src/css/animations/*`，模块样式只保留差异化规则，视觉回归测试通过。 |
| TD-07 | P2 | 构建性能 warning | Vite 构建仍提示 `EventBus`、`ConfigCenter` 动态/静态 import 混用，且部分 chunk 超过 300 kB。 | 明确共享核心模块的加载策略，调整 manual chunks 或动态加载边界，构建 warning 数量下降且路由懒加载仍正常。 |
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

- [ ] 在独立分支评估 Vite/Vitest 升级路径，先运行 `npm audit`、`npm run ci:all`、全量 Vitest。
- [ ] 评估 `@lhci/cli` 升级、替换或隔离执行方案，避免按 `npm audit fix --force` 降级到不可用版本。
- [ ] 明确 dev-only 漏洞处理策略：清零优先；无法清零时记录暴露面、触发命令和补偿控制。

### 第 2 批：格式化基线

- [ ] 确认 Prettier 配置，不直接用默认配置重排全仓。
- [ ] 按 `src/common`、`src/components`、`src/services`、`src/modules/*` 分批格式化。
- [ ] 每批只做格式化，不混入逻辑改动；每批运行 `type-check`、`lint:warning-gate`。
- [ ] 最终将 `format:check` 纳入 CI 或明确为独立质量门禁。

### 第 3 批：ESLint warning 基线压降

- [ ] 先处理 `no-restricted-syntax`：逐处替换直接 `innerHTML`，保留必要的安全注释或使用安全渲染工具。
- [ ] 再处理 `no-non-null-assertion`：为 DOM 查询和状态读取补窄类型分支。
- [ ] 将 `console.*` 按用途迁移到 logger、debug gate 或移除。
- [ ] 对 `max-lines-per-function`、`complexity`、`max-depth` 只处理 top 文件，避免大范围重构。

### 第 4 批：复杂度热点

- [ ] `src/components/navigation-animation.ts`：拆分动画初始化、事件绑定、状态计算。
- [ ] `src/modules/app_center/views/master_analysis/scraper/components/ScraperPanel.ts`：拆分状态同步、导入、历史和 UI 操作。
- [ ] `src/services/llmService.ts`：拆分 provider 配置、请求构造、错误处理和流式响应。
- [ ] `src/modules/app_center/views/keyword_hunter/process/index.ts`：拆分流程控制和视图渲染。
- [ ] `src/main.ts`：减少启动流程中的 console 和长流程分支。

### 第 5 批：CSS 令牌和模块样式

- [ ] 先冻结新变量命名规则，避免继续增加非规范变量。
- [ ] 从高频变量开始迁移：duration、spacing、color、shadow、card、code、module-local token。
- [ ] 抽取卡片、动画、徽章、图标容器的重复模式到全局组件 CSS。
- [ ] 每批运行 `css:audit`、`css:analyze`，记录不合规变量和重复模式下降量。

### 第 6 批：构建和浏览器验证

- [ ] 处理 `EventBus`、`ConfigCenter` 的动态/静态 import 混用，确认不会破坏路由懒加载。
- [ ] 复查 `manualChunks`，优先拆分大模块而不是单纯提高 `chunkSizeWarningLimit`。
- [ ] 对依赖升级、CSS 抽取和路由加载改动补跑 `test:e2e`、`test:visual`、`test:performance`、`lighthouse`。

## 本轮不建议直接执行

- 不建议运行 `npm audit fix --force`：当前建议路径会引入 breaking change，并且 `@lhci/cli` 的建议版本是明显倒退。
- 不建议一次性格式化 308 个文件并混入功能修复：审查成本过高，也容易掩盖行为变更。
- 不建议在未补充浏览器验证前大改 CSS 抽象或构建分包：这类改动容易产生视觉和懒加载回归。

---

**下次复核建议**: 修改依赖工具链、路由加载、CSS 基础样式、AI analysis 数据流、PPC 搜索词导入或构建配置后，至少重跑 `npm run ci:all`、全量 Vitest、`npm audit --omit=dev` 和对应专项脚本。
