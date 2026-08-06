# CODEBUDDY.md This file provides guidance to CodeBuddy when working with code in this repository.

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm install` | 安装依赖。项目要求 Node `>=18`。首次拉取仓库或依赖变更后先执行。 |
| `npm run dev` | 通过 `scripts/dev.bat` 启动 Vite，并在 Windows 上自动尝试用 Chrome 无痕窗口打开本地站点。适合日常联调。 |
| `npm run dev:simple` | 只启动 Vite，不自动开浏览器。调试端口、配合其他工具或远程调试时更稳妥。 |
| `npm run build` | 生成生产构建到 `dist/`。该命令不会替代完整类型校验；改动 TypeScript 后通常还要单独执行 `npm run type-check`。 |
| `npm run preview` | 本地预览生产构建产物，用于验证构建后资源、路由和压缩输出。 |
| `npm run lint` | 对 `src/` 运行 ESLint。适合在提交前检查常见规范问题。 |
| `npm run lint:fix` | 自动修复可安全修复的 ESLint 问题。执行后仍应复查关键文件。 |
| `npm run type-check` | 运行 TypeScript 全量检查。Vite 配置不再内置 checker 插件，类型质量由该脚本和 CI gate 负责。 |
| `npm run test` | 启动 Vitest。默认进入观察模式，适合本地持续开发。 |
| `npx vitest run tests/unit/<file>.test.ts` | 运行单个 Vitest 测试文件。定位回归或只验证某个模块时用这个最直接。 |
| `npm run test:coverage` | 以 run 模式执行单元测试并生成覆盖率报告。 |
| `npm run playwright:install` | 首次执行 E2E/视觉测试前安装 Playwright 浏览器。新环境通常先跑一次。 |
| `npm run test:e2e` | 运行 Playwright 测试；默认会自动拉起开发服务器。适合完整端到端回归。 |
| `npx playwright test tests/e2e/<file>.ts --project=chromium` | 只运行单个 Playwright 文件并限制到 Chromium，适合快速复现某个前端流程问题。 |
| `npm run generate:tokens` | 从 `src/common/config/design-tokens.ts` 重新生成 CSS 变量、Tailwind 配置和设计令牌类型。修改设计令牌后必须执行。 |
| `npm run css:audit` | 审查 CSS 变量和设计令牌使用情况。改样式体系或排查硬编码值时很有用。 |
| `npm run css:migrate:dry` | 预览 CSS 变量迁移，不直接改文件。大规模样式治理前先跑它。 |

## 架构总览

这是一个基于 Vite 的单页前端应用，核心业务是亚马逊运营管理平台。运行时是“壳层视图 + 路由懒加载子模块 + Alpine.js 交互 + Zustand 状态 + 自定义 DI/EventBus/Router”的组合架构，同时仍保留部分旧的全局 API 和 `window` 事件兼容层。

应用入口是 `src/main.ts`。启动顺序很关键：先注册服务并用 `ServiceBootstrap` 初始化 DI 容器中的核心服务，再注册 Alpine 组件并 `Alpine.start()`，随后加载关键壳层视图 `initViews()`，最后触发初始路由导航 `triggerInitialNavigation()`。如果改动启动逻辑，不要打乱这个顺序；路由在壳层 DOM 未加载前就触发，模块挂载会直接失败。

基础设施主要集中在 `src/common/`：
- `di/` 提供 `Container`、`ServiceRegistry` 和服务注册定义；核心服务通过注册表进入容器，而不是靠到处直接 new。
- `bootstrap/ServiceBootstrap.ts` 负责按依赖层级初始化服务。
- `EventBus.ts` 是新的事件总线；仓库正在从 `window.dispatchEvent()` 迁移到它，但兼容代码仍然存在，修改时要保留过渡层。
- `router/` 是 Navigo 路由系统；`initRouter.ts` 会把 `menuConfig.ts` 中的菜单/路由配置转换成实际路由。
- `utils/viewLoader.ts` 负责加载顶层壳 HTML，例如 `home`、`sops`、`app_center` 这类主面板。
- `utils/ModuleLoader.ts` 负责在壳层内容区内按路由动态 import 具体业务页面。

业务代码主要在 `src/modules/`，按领域拆成 `home`、`sops`、`amz_hub`、`app_center`、`more`。理解它时要把它看成“两级加载”：
1. `viewLoader` 先把顶层模块外壳插入 DOM；
2. 各业务模块的入口文件（如 `src/modules/app_center/app_center.ts`）监听路由变化，再把实际页面模块懒加载进对应 `content_area`。

页面实现大量依赖 `BaseModule` 生命周期。子页面通常用 `template.html?raw` 导入静态模板，在 `render()` 中写入容器，在 `init()` 中绑定事件/图表，在 `onUnmount()` 中清理资源。不要覆盖 `mount()`/`unmount()`；清理逻辑应放在框架预留的清理点。`loadTemplate()` 主要留给壳层视图注入，不应替代子页面里的 `?raw` 模板导入。

`src/components/` 放的是跨业务复用 UI/交互组件，例如设置面板和 modal；`src/services/` 放通用服务能力，如日志、存储、HTTP、LLM、性能监控；`src/stores/` 里是 Zustand store；`src/css/` 是分层设计系统，入口是 `critical.css` 和 `main.css`，而设计令牌的单一数据源在 `src/common/config/design-tokens.ts`。

样式体系是这个仓库的重要主轴。设计令牌会生成 CSS 变量、Tailwind 配置和 TypeScript 类型，所以颜色、间距、阴影等不要硬编码。修改令牌后要重新生成。`config/postcss.config.js` 里当前刻意禁用了 PurgeCSS，因为大量模板是 `?raw` 或动态加载的，错误恢复 PurgeCSS 很容易把运行时需要的类删掉。

测试与质量工具分散在几层：常用脚本在 `package.json`，Vitest 的实际配置内嵌在根 `vite.config.js` 里，Playwright 顶层配置文件再转发到 `config/playwright.config.ts`。仓库里 `config/vitest.config.ts` 和 `config/playwright.config.ts` 仍保留一些 `test/` 路径写法，而真实目录是 `tests/`；如果你要修测试配置，先确认改的是当前脚本真正使用的那一份配置。

当前生产形态是 Cloudflare Pages 静态站点；LLM 请求由浏览器直接调用 `https://new.hongecb.store/v1`。仓库不再保留边缘 `/v1` 代理，本地开发也不再依赖 Vite `/v1` 代理。

## 仓库内隐含约束

- 优先使用 `EventBus` 和事件常量，新增事件不要继续扩散裸 `window.dispatchEvent()`；但清理旧代码前要确认兼容层是否仍被调用。
- Alpine 组件必须在 `Alpine.start()` 之前注册；动态组件还依赖 `AlpineRegistry`。
- `StorageService` 是统一存储入口，尽量不要直接碰 `localStorage`。
- 路由 ID、菜单配置、壳层面板 ID、`content_area` ID 之间有隐式契约；改路由时要同时核对 `menuConfig.ts`、模块入口映射和对应 HTML 容器。
- 新增子页面通常不止改一处：至少要检查路由常量、路由 ID 类型、`menuConfig.ts`，以及对应顶层模块的动态 import 映射。
- 该仓库维护了 `docs/archive/kiro-2026-h1/arch-debt/`（2026-H1 历史快照）技术债跟踪记录；当前重点之一是把旧事件机制迁到 EventBus；碰到相关文件时最好先看对应债务记录。
- 常用路径别名见 `tsconfig.json`：`@`、`@common`、`@services`、`@modules`、`@components`、`@router`。跨层引用优先用别名，别手写很长的相对路径。
