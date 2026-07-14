# sops - 亚马逊运营管理平台

sops 是一个 Vite + TypeScript 前端项目，面向亚马逊运营团队，提供 SOP 流程、Amazon 智库、应用中心和大模型探索工具。当前部署形态是 Cloudflare Pages 托管静态资源，浏览器端按用户配置调用 `https://new.hongecb.store/v1` 中转站；仓库和 Pages 项目不应保存生产 API key。

> 本 README 已按当前代码结构、`package.json` 脚本和部署文档重新核对。`docs/archive/` 与 `.kiro/specs/` 中的阶段性文档可作历史参考，不建议直接作为当前开发依据。

**生产站点：** [https://sops.hongecb.store](https://sops.hongecb.store)  
**发布策略：** [docs/RELEASE_POLICY.md](./docs/RELEASE_POLICY.md) · **安全策略：** [SECURITY.md](./SECURITY.md)

## 产品收敛方向

本项目下一阶段不追求外部商用平台能力，而是收敛为小团队内部的运营作业系统：新人能独立完成任务，老手能更快生成动作，团队能沉淀复盘。新增页面、工具或 Agent 前，应先对齐 [运营作业系统落地计划](./docs/OPERATING_SYSTEM_ROADMAP.md) 中的主线、闭环标准和不做事项。

## 最新发布

| 通道 | 版本 | 说明 |
|------|------|------|
| **GitHub Latest（稳定 GA）** | `v3.0.6` | 生产推荐版本 |
| 当前生产候选 | `v3.0.7-rc.1` | Pre-release，生产验证中 |
| package.json | `3.0.7-rc.1` | 与候选 tag / Release 一致 |
| 上一 GA | `v3.0.5` | 回滚参考 |

- 发版命令：`npm run release:validate` / `release:notes` / `release:package`；推送 `v*` tag 触发 [Release workflow](./.github/workflows/release.yml)。
- **全部历史版本**的完整叙述见 [docs/CHANGELOG.md](./docs/CHANGELOG.md)（与 GitHub Releases 一一对应，含 `0.1.0`…`3.0.7-rc.1` 及全部 RC/alpha/beta）；策略见 [docs/RELEASE_POLICY.md](./docs/RELEASE_POLICY.md)。
- 全量同步：`npm run release:sync-all`（CHANGELOG ↔ 全部 GitHub Release notes）。
- 版本线说明：`v3.0.4` GA 之后曾误序发布 `v3.0.4-rc.*` 并误标 `3.0.5` / `3.0.6-rc.*`；`v3.0.5` 已完成历史版本线收口，当前稳定版为 `v3.0.6`。

`v3.0.7-rc.1`（2026-07-14，生产验证候选）聚焦 Keyword Hunter 与 PromptLab 的链路收敛：

- Keyword Hunter 词云补齐清晰图例，移除容易造成流程倒退误解的「同步回输入」。
- 处理页不再自动恢复历史快照，避免旧文案和词频覆盖新作业。
- PromptLab 保留 SEO 关键词复制能力，将 Listing Prompt 明确交接到 Deep Chat，并对相同 Prompt 历史去重。
- 清理重复误标的历史 Release，同时保留 tag 与 CHANGELOG 可追溯性。
- 本候选版覆盖生产域验证，但 GitHub Latest 仍保持稳定 GA `v3.0.6`。

`v3.0.6`（2026-07-14，稳定 GA）聚焦应用中心本地作业闭环与生产可靠性：

- **完整 Listing 作业链路**：数据采集、AI 分析、Prompt、Deep Chat 产品文案、关键词复核、文案评审、合规复核全部纳入同一执行实例；相同站点 / ASIN 的二次执行仍保持独立。
- **最近作业体验**：链路节点直接导航，1 / 2 / 3 列布局、分类与状态筛选、需处理 / 最近更新排序、显示更多、右上角图标操作和多 ASIN 标题。
- **Deep Chat 与 Keyword Hunter 交接**：根据选中的 Listing Prompt 生成产品文案，再将该文案与对应 SEO 关键词送入 Keyword Hunter 输入格式化页面。
- **人工复核边界**：合规复核使用浮动对话框并记录通过 / 问题 / 不适用状态；PPC 动作清单保持独立作业且只记录人工复核，不自动修改广告或 Listing。
- **生产可靠性**：共享文件选择器修复 preview 文件导入，Router / ActionRegistry 初始化顺序修复，最近作业缺失载荷和旧版合规状态具有明确兼容路径。
- **发布治理**：补全 Release notes 回填、全量同步和审计工具，继续以 CHANGELOG 完整章节作为 GitHub Release 唯一事实源。

`v3.0.5`（2026-07-13，稳定 GA）在 `v3.0.4` 与冻结线 `3.0.4-rc.1`…`rc.11` 之上，面向生产的主要增量：

- **发布治理**：`docs/RELEASE_POLICY.md`、Release Notes 模板、`SECURITY.md`；发版脚本与 `.github/workflows/release.yml`；Release 附带 dist 产物、`build-info.json` 与 SHA256 校验和。
- **GitHub 通道纠正**：Latest 仅指向 GA；`v3.0.4-rc.11` 等 RC 保持 Pre-release；仓库 homepage 对齐生产域 `https://sops.hongecb.store`。
- **应用中心 Resume Queue**：高密度「最近继续」、fact chips、列数偏好、空状态引导；`recentArtifactPresenter` 与设计规格。
- **共享能力**：确认弹窗、剪贴板、SOP 模板、LLM JSON 工具；Shared Capabilities Guide 与 Modal 开发指南。
- **App Center 工作台**：catalog / artifact envelope / workflow / workspace；结构化错误与 `app:` 事件命名统一。
- **构建与版本**：应用版本只读 `package.json`；入口异步拆分（系统设置 / domain shells / FA brands）；CSP `connect-src` 对齐 Amazon 站点清单。
- **稳定性修复**：应用矩阵分类筛选、Alpine 设置懒加载竞态、AppModal host 可见性、Prettier 构建阻塞、css/lint 门禁、剪贴板降级、Sentry 生产兼容。

以下保留 `3.0.4-rc.*` 与更早基线的**完整发版描述**（不删减），便于对照里程碑与回滚。

`v3.0.4-rc.11` 在 `v3.0.4-rc.10` 基础上聚焦应用中心总览与构建体验，带来以下面向运营和维护的变化：

- 应用中心「最近继续」改为高密度 Resume Queue：上下文优先标题、fact chips、列数偏好与空状态引导。
- 拆分安全存储边界常量，消除无效动态导入告警；调整 chunk 告警阈值匹配 deferred 系统设置包。
- 优化入口异步加载（系统设置 / domain shells / FA brands），修复 Alpine 设置注册竞态与 Prettier 构建阻塞。
- 应用版本号只读 `package.json`，避免非 semver git tag 污染 UI 展示；同步应用内版本到 `3.0.4-rc.11`。

`v3.0.4-rc.10` 基线继续包含以下变化：

- 修复应用中心总览「应用矩阵」分类筛选在生产预览包中不生效的问题，确保卡片/列表真正隐藏。
- 统一生产路径结构化错误处理与应用级事件命名，降低模块间错误/事件风格分叉。
- 新增共享剪贴板、模板与 LLM JSON 工具，并补充 Shared Capabilities Guide。
- 对齐部署 CSP `connect-src` 与 Amazon 站点清单，移除废弃 CSS 半径别名。
- 同步应用内版本显示到 `3.0.4-rc.10`。

`v3.0.4-rc.9` 基线继续包含以下变化：

- 新增共享确认弹窗，并将 Keyword Hunter、Master Analysis、Deep Chat 等模块的重复确认逻辑收敛到公共组件。
- 增强 AppModal 的可组合能力与回归测试覆盖，补充 Modal 开发指南，降低后续弹窗实现分叉风险。
- 修复 AppModal 打开态下 host 元素不可见的问题，稳定 NPI Tracker 移动端 Next Step 弹窗 smoke 覆盖。
- SOPS 工具页新增共享模板模块与复制动作封装，统一流程说明、复制反馈和页面测试夹具。
- 替换 SOPS 页面里的分散剪贴板调用与 `alert` 反馈，改用统一复制结果处理。
- 调整页面架构审计以识别共享 SOP 模板模块，并同步应用内版本显示到 `3.0.4-rc.9`。

`v3.0.4-rc.8` 基线继续包含以下变化：

- 新增循环依赖检查脚本，统一处理 Vite `?url` 资源导入后再执行 Madge 审计。
- 整合 `v3.0.4-rc.1` 至 `v3.0.4-rc.7` 的 App Center 工作台、Deep Chat、Keyword Hunter、PPC Search Terms、系统设置和质量门禁更新。
- 归档历史预发布检查、UI 审计、安全审计和技术债务报告，收敛文档索引与项目结构说明。
- 将 Deep Chat bundle 固定输出到 `assets/vendor/deepChat.bundle.js`。
- 调整 Sentry 加载方式，提升生产构建兼容性；同步应用内版本到 `3.0.4-rc.8`。
- 沉淀质量报告与技术债务报告，优化 AI 翻译 UI。
- 修复暗色 tile 对比度和标签重叠问题。
- Keyword Hunter 输入页新增历史快照面板与快照服务，支持保存、恢复和删除分析状态。
- Keyword Hunter 分析结果支持自动归档，减少跨步骤状态丢失。
- Scraper 页面挂载时渲染当前采集数据，并补充当前数据与历史快照回归测试。
- Deep Chat 增加发送回归覆盖、停止遮罩和停止竞态修复。
- Promptlab 页面选择器、DNA 提取流程和端到端测试进一步稳定。
- 持久化分析运行记录，处理空 LLM 响应并提升请求预算控制。
- 拆分 AI Analysis、PPC Search Terms、Scraper import、Prompt Library 与 Keyword Highlight 热点模块。
- 新增主题系统文档，整合 CSS token、共享 keyframes、badge/icon 样式和质量工具。
- 刷新 Keyword Hunter 分析、输入页和快照服务测试覆盖。
- 清理历史复杂度/技术债务报告，更新架构债务与 Kiro 状态文档。
- 强化 Promptlab 视觉 readiness 状态与 E2E helper，减少选择器和等待抖动。
- 新增功能开关服务和路由守卫集成，支持模块按开关控制访问。
- 拆分 PPC Search Terms 动作、Agent、分析、导入导出、规则和 UI 模块。
- 持久化沉浸式翻译运行记录，并补充 AI Analysis 端到端 fixture。
- 强化 LLM streaming 解析和 Promptlab/Scraper 性能测试阈值。
- 路由系统迁移到 routeId 优先 API，并支持 manifest 路径与重定向。
- 移除 LegacyAdapter 和全局 legacy 路由 API，集中维护历史路由别名。
- 增加延迟路由/模块加载骨架，减少页面切换空白感。
- 将 PPC Search Terms 迁移到 PPC Tools，并拆分 Deep Chat 模块文件。
- 新增路由审计脚本并整理历史本地工具/报告归档。
- 规范化 App Center 路由命名，并补充历史路由别名。
- 提升欢迎页、卡片、弹窗、导航与模板控件的 ARIA/focus/accessibility 支持。
- Deep Chat 增加 pending assistant 文案和打字机反馈，稳定请求生命周期测试。
- Scraper 导入面板补充导入状态、可访问性文案和回归覆盖。
- Home 页面增加 Workbench 入口并统一 welcome/app_center 设计 token。
- 强化 CSP 与 SafeRenderer 安全处理，减少内联脚本和渲染风险。
- 收紧 LLM secret 暴露面并移除旧 timeout wrapper。
- 增加认证路由守卫和相关测试覆盖。
- 将 Floating Workbench 命名统一回 App Center。
- 补充安全审计报告和 CI 质量门禁文档。
- App Center 切换到 DeepSeek 蓝主题并更新主题色、图标和 mega-menu 语义类名。
- 重构 Master Analysis、Promptlab、Scraper 和 App Center 概览模板与样式。
- 新增 LLM provider 与 Scraper proxy 配置，补充系统设置入口。
- SOPS 工具页增加统一剪贴板辅助能力。
- 规范引号和压缩 CSS 格式，减少样式噪声。
- 导航流程支持排队执行，并新增可折叠概览交互。
- 重命名 Keyword Hunter 标签并格式化相关样式与测试。
- PPC Search Terms 增加阈值设置面板并优化导入/结果布局。
- 强化报告 UI，修复报告区块模板嵌套。
- 刷新 App Center 与 SOPS 主题，并启用 Deep Chat prompt panel。
- 新增 async DI、`loaderPath` API 与 SafeTemplateLoader，推动页面架构收敛。
- 增加页面架构审计、预发布检查文档和模板实现指南。
- 收敛 PC 端模块、模板、设计 token、动效 CSS 与概览列表视图。
- 空状态改为任务导向并补充按钮类型、ARIA 与可访问性测试。
- 强化模块错误、卸载流程、Loader 和 StorageService 安全性。
- 收紧 LLM 网关配置、CSP/headers 和直连 new_api 访问。
- 拆分 AppModal 样式并补充安全审计与发布 smoke 覆盖。
- 使用系统字体并调整 Deep Chat、Restricted Words 与代码高亮样式。
- 强化 HttpService Abort/timeout/retry 行为、EventBus 错误记录和持久化状态清洗。
- 新增 Sentry SDK、监控初始化、secret leak scanner 和安全 CI 门禁。
- 本地化 flag icons 并继续收紧 CSP 与 release 安全检查。
- Deep Chat 新增 Search Chats 弹窗、线程菜单、历史线程过滤和中文界面。
- 持久化 prompt 选择，优化 PromptLab、Settings 和 Playground 渲染体验。
- 强化 Keyword Hunter 可访问性、拖拽交互、追踪服务和分析流程状态。
- PPC Search Terms 分析器改用回调驱动 UI，并保留分析状态。
- Deep Chat/Playground 请求预算支持动态计算，并修复 LLM abort 边界行为。
- Keyword Hunter AI 翻译支持模型选择器和界面刷新。
- 新增运行时策略与工具策略服务，并将模型选择、超时、缓存和批处理设置接入 Keyword Hunter、Master Analysis、Deep Chat、PPC Search Terms 与 Scraper。
- 系统设置新增工具策略、运行时控制、数据备份、诊断和危险操作面板。
- 新增开发者诊断配置，支持性能、事件调试、错误/分析、功能开关和日志级别的持久化开关。
- 事件日志改为受调试开关门控，并在启动时应用开发者诊断设置。
- 移除 Deep Chat 未使用的 provider status UI，并调整配置刷新与模型选择交互。
- 系统设置面板改为原生 `<details>/<summary>` 折叠结构，补充默认折叠状态测试。
- Keyword Tracker 路由和服务命名收敛为 Keyword Hunter，并刷新输入、分析、流程模板与快照覆盖。
- Deep Chat 资源收敛到功能路由目录，并加强请求生命周期、预算、prompt 选择和线程历史行为。
- PPC Search Terms 更新设置、Agent 分析流、结果控件和相关单元/E2E/视觉测试。
- 新增 action name、import path 和 source naming 质量审计，并接入 `ci:quality`。
- 统一 TypeScript、Vite、Vitest 和源码导入到单一 `@/` 项目别名。
- 提取 SOPS owner field 共享处理，减少页面间重复实现。
- 内部私有/工具方法去除前导下划线，并同步调用点、测试和 source-name 审计规则。
- App Center 概览改为 catalog-driven 渲染，并新增工作台评审文档。
- 新增 App Center artifact envelope、workflow definitions 和 workspace context 服务。
- PPC Search Terms 增加 action-list 产物导出和 recent UI 衔接。
- PromptLab、Keyword Hunter 和历史记录服务接入新的产物/最近上下文。
- App Center 概览最近项（recent items）新增图标盒、相对/绝对时间展示与改进 aria-label，提升视觉与可访问性。
- 新增 Deep Chat 与 Keyword Hunter 快照删除的主题化确认弹窗，替换原生 `confirm()`，支持取消、Esc、点击遮罩关闭与「不再询问」持久化。
- 补充删除确认弹窗与快照删除流程的单元测试。
- Deep Chat 线程支持内联重命名，减少进入管理菜单的来回切换。
- 归档历史预发布检查、UI 审计与安全审计报告，新增循环依赖检查脚本并稳定 Deep Chat bundle 与 Sentry 加载链路。
- 同步应用内版本显示到 `3.0.5`。

## 快速开始

### 环境要求

- Node.js `>=18.0.0`
- npm
- Cloudflare 部署时需要 Wrangler 登录权限

### 本地开发

```bash
git clone https://github.com/earshore/SOPs.git
cd SOPs
npm install
```

如需本地接口验证，可复制环境模板：

```powershell
Copy-Item .env.example .env
```

macOS/Linux 可使用：

```bash
cp .env.example .env
```

启动开发服务器：

```bash
npm run dev
```

`npm run dev` 会启动 Vite，并尝试用 Chrome 无痕窗口打开本地地址。默认端口是 `5173`；如果端口被占用，以终端输出或自动打开的地址为准。只想启动服务器时可用 `npm run dev:simple`。

### 构建与预览

```bash
npm run build
npm run preview
```

`npm run build` 会先执行 `prebuild`，也就是 `npm run ci:security && npm run ci:quality`。构建产物输出到 `dist/`。

### 部署到 Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist --project-name sops --branch main
```

当前生产链路由 Cloudflare Pages 托管静态文件，LLM 请求由浏览器直连自部署 new-api 中转站 `https://new.hongecb.store/v1`。部署细节与排查步骤见 [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)。

## 当前功能入口

| 区域          | 主要功能                                                         | 代码入口                  |
| ------------- | ---------------------------------------------------------------- | ------------------------- |
| SOPs 流程中心 | 运营推广、供应链物流、账号安全、客服体验相关 SOP 页面            | `src/modules/sops/`       |
| 应用中心      | Master Analysis、PPC Tools、Keyword Hunter、Deep Chat Playground | `src/modules/app_center/` |
| Amazon 智库   | 市场洞察、SEO 策略、运营实践和进阶攻略                           | `src/modules/amz_hub/`    |
| 更多          | Agent Center、提示词、工作流探索页                               | `src/modules/more/`       |

业务页面的路由和菜单元数据统一声明在各模块的 `module.manifest.ts`。`src/common/constants/routes.ts` 和 `src/common/config/menuConfig.ts` 会从这些 manifest 派生；子页面的动态导入入口仍需要同步维护对应模块的 `module.loaders.ts`。

### 应用中心入口

| 应用            | 路由                                                                                                            | 说明                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Master Analysis | `/app-center/scraper`、`/app-center/ai-analysis`、`/app-center/promptlab`                                       | 竞品数据采集、AI 分析和 Prompt 生成                   |
| PPC Tools       | `/app-center/ppc-search-terms`                                                                                  | 导入广告搜索词或活动报表，生成 PPC 动作清单和周报摘要 |
| Keyword Hunter  | `/app-center/keyword-hunter/input`、`/app-center/keyword-hunter/process`、`/app-center/keyword-hunter/analysis` | 关键词输入、处理与分析统计                            |
| Deep Chat       | `/app-center/playground/deep-chat`                                                                              | LLM 对话与提示词实验                                  |

PPC 搜索词分析器只输出运营建议，最终否词、加词、改价、预算调整仍在 ERP 或广告后台执行。

## 技术栈

- 构建与语言：Vite、TypeScript
- UI 与交互：Alpine.js CSP build、Tailwind CSS、Font Awesome
- 路由与状态：Navigo、Zustand、项目内 `ModuleLoader`
- AI 与数据处理：Deep Chat、`llmService`、Marked、Zod、jsonrepair
- 可视化与重型库：Chart.js、GridStack，按需懒加载
- 质量与测试：Vitest、Playwright、ESLint、Lighthouse CI、Madge

## 项目结构

```text
SOPs/
├── config/                 # ESLint、Tailwind、Playwright、Vitest 等共享配置
├── docs/                   # 当前文档、指南、质量报告与归档文档
├── examples/               # 示例数据和用法样例
├── public/                 # Cloudflare Pages headers/redirects 与静态资源
├── scripts/
│   ├── build/              # 设计令牌、API 文档等生成脚本
│   ├── dev/                # 开发期维护脚本
│   └── quality/            # 质量门禁与趋势脚本
├── src/
│   ├── common/             # 路由、配置、DI、基础设施、工具函数
│   ├── components/         # 跨模块组件
│   ├── css/                # 样式入口、基础层、组件层、工具层
│   ├── modules/            # sops、app_center、amz_hub、more、home
│   ├── services/           # LLM、存储、性能、请求等服务
│   ├── stores/             # Zustand store 与中间件
│   └── types/              # 全局和业务类型
├── tests/                  # 单元、集成、E2E、性能、视觉测试
├── tools/                  # 安全、技术债、命名验证等工具
└── vite.config.js          # Vite 构建、压缩、分包与别名配置
```

## 常用命令

### 开发与构建

```bash
npm run dev              # 启动 Vite，并尝试打开 Chrome
npm run dev:simple       # 仅启动 Vite
npm run build            # 运行 prebuild 后构建 dist/
npm run preview          # 预览 dist/
```

### 类型、Lint 与 CI 门禁

```bash
npm run type-check       # 检查应用代码
npm run type-check:tests # 检查应用 + 测试代码
npm run lint             # ESLint 检查 src/
npm run lint:fix         # 自动修复可修复问题
npm run ci:security      # XSS gate + 循环依赖检查
npm run ci:quality       # 类型、Lint、warning baseline
npm run ci:all           # 安全 + 质量 + 构建
```

### 测试

```bash
npm run test             # Vitest
npm run test:coverage    # 单元测试覆盖率
npx vitest run tests/unit/ppc-search-terms.test.ts tests/unit/ppc-search-terms-ui.test.ts # PPC 工具专项测试
npm run test:e2e         # Playwright E2E
npm run test:performance # Playwright 性能测试
npm run test:visual      # 视觉回归测试
```

### CSS 与设计令牌

```bash
npm run generate:tokens  # 从 design-tokens.ts 生成 CSS/Tailwind/类型配置
npm run css:audit        # 审查 CSS 变量使用
npm run css:analyze      # 分析模块 CSS
npm run css:cleanup      # 清理未使用 CSS
```

### 安全与质量工具

```bash
npm run xss:scan         # 生成 docs/XSS_SCAN_REPORT.md
npm run xss:gate         # 高危 XSS 风险门禁
npm run security:audit   # AST/正则安全审计
npm run tech-debt:scan   # 技术债扫描
npm run quality:track    # 质量趋势跟踪
```

更多脚本以 [package.json](./package.json) 为准。

## 环境与 LLM 配置

`.env.example` 只用于本地接口验证或脚本测试。生产环境不要在 Cloudflare Pages secrets 中保存 LLM API key；模型白名单、额度、过期时间、限流和日志由 new-api 后台管理。

本地页面中的 LLM 配置由系统设置界面写入浏览器侧存储。相关服务位于：

- `src/services/llmService.ts`
- `src/services/storageService.ts`
- `src/common/utils/secureStorage.ts`

## 模块开发约定

新增一条业务子页面时，通常只需要同步以下位置：

1. 在目标模块的 `module.manifest.ts` 添加页面声明，包括 `routeId`、`label`、`category`、`icon` 和 `loader`；App Center 这类多子应用模块按需补充 `moduleId`。
2. 在目标模块的 `module.loaders.ts` 为该 `routeId` 添加动态导入入口。
3. 新增页面实现和测试；如果页面展示动态数据，动态内容必须经过转义或安全渲染。

只有新增模块实体或侧边栏分类时，才需要补充 `src/common/config/menuConfig.ts` 中的 modules/categories 元数据。

多数业务子页面使用 `BaseModule` + `template.html?raw`：

```typescript
import BaseModule from '@/common/BaseModule';
import templateHTML from './template.html?raw';

class MyPageModule extends BaseModule {
  constructor() {
    super('route_id');
  }

  async render(): Promise<void> {
    // 仅用于已审计的静态模板；动态内容使用 SafeRenderer 或 SecurityUtils。
    this.container!.innerHTML = templateHTML;
    this.container!.classList.add('fade-in');
  }
}

const instance = new MyPageModule();
export const mount = (container: HTMLElement) => instance.mount(container);
export const unmount = () => instance.unmount();
```

如果页面继承 `BaseModule`，不要覆盖 `mount()` 或 `unmount()`；自定义初始化放在 `init()`，清理逻辑放在 `onUnmount()`。少数 Shell 级视图或特殊页面仍会使用 `loadTemplate()`，修改前先看同目录现有写法。

## 安全与性能边界

安全相关实现集中在：

- `public/_headers`：Cloudflare Pages 响应头和 CSP
- `src/common/utils/security.ts`：HTML 转义、安全片段与 URL 检查
- `src/common/infrastructure/SafeRenderer.ts`：安全 DOM 渲染封装
- `tools/security/xss-scanner.js` 与 `tools/security-auditor.ts`：扫描和审计工具

性能相关配置集中在 `vite.config.js`、`src/common/utils/lazyLibs.ts`、`src/common/utils/ImageLazyLoader.ts` 和 `tests/performance/`。README 不承诺固定线上指标，性能结论以 Lighthouse/Playwright 的实际报告为准。

## 文档入口

- [docs/README.md](./docs/README.md) - 当前文档导航
- [docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md) - 快速开始
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Cloudflare Pages 与 new-api 部署说明
- [docs/CI-QUALITY-GATES.md](./docs/CI-QUALITY-GATES.md) - 当前 CI 安全与质量门禁
- [docs/CHANGELOG.md](./docs/CHANGELOG.md) - 项目变更记录
- [.kiro/CONTRIBUTING.md](./.kiro/CONTRIBUTING.md) - 贡献指南

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](./LICENSE)。

---

**维护者**: sops 开发团队  
**最后更新**: 2026-06-12
