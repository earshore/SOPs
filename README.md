# sops - 亚马逊运营管理平台

sops 是一个 Vite + TypeScript 静态前端项目，面向亚马逊运营团队，提供 SOP 流程、Amazon 智库、应用中心和大模型探索工具。当前部署形态是 Cloudflare Pages 托管静态资源，浏览器端按用户配置调用 LLM 网关；仓库和 Pages 项目不应保存生产 API key。

> 本 README 已按最新远端 tag `v3.0.3-rc.14`、当前代码结构、`package.json` 脚本和部署文档重新核对。`docs/archive/` 与 `.kiro/specs/` 中的阶段性文档可作历史参考，不建议直接作为当前开发依据。

## 产品收敛方向

本项目下一阶段不追求外部商用平台能力，而是收敛为小团队内部的运营作业系统：新人能独立完成任务，老手能更快生成动作，团队能沉淀复盘。新增页面、工具或 Agent 前，应先对齐 [运营作业系统落地计划](./docs/OPERATING_SYSTEM_ROADMAP.md) 中的主线、闭环标准和不做事项。

## 最新发布

当前最新 tag 是 `v3.0.3-rc.14`（2026-07-03，release candidate）；最新稳定 tag 是 `v3.0.2`。`v3.0.3-rc.14` 聚焦 Keyword Hunter 测试刷新、历史报告清理和 Promptlab 视觉 readiness/E2E helper 稳定性，`v3.0.3` 系列累计带来以下面向运营的变化：

- 优化 Master Analysis 的 AI Analysis、Scraper 和 Promptlab 工作流界面。
- 新增工作流导向条和统一确认弹窗，减少高风险数据操作误触。
- 调整 Scraper 历史记录、数据操作和端到端测试，覆盖新的确认流程。
- 新增 Card、Callout、Workbench UI 审计和回归测试审计脚本。
- 统一报告与状态文案中的图标渲染，减少 emoji 依赖。
- NPI Tracker 改用 `data-action` 操作绑定并增加确认弹窗覆盖。
- Deep Chat prompt preview 支持 pointer-aware 交互并补充回归测试。
- AI Analysis 报告绑定 scraped-data 指纹，减少旧报告与新采集数据混用。
- Promptlab 拆分 readiness 状态并补充 SEO context，提升生成提示词的输入完整性。
- 增加 Vercel 部署兼容配置，同时保留 Cloudflare Pages 作为生产部署链路。
- 统一 AMZ_HUB 与 SOPS 内容、元数据和页面脚手架。
- 新增 AMZ_HUB 成熟期运营视图并调整模块命名。
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
- 同步应用内版本显示到 `3.0.3-rc.14`。

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

当前生产链路由 Cloudflare Pages 托管静态文件，LLM 请求由浏览器直连自部署 new-api 网关。部署细节与排查步骤见 [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)。

## 当前功能入口

| 区域 | 主要功能 | 代码入口 |
| --- | --- | --- |
| SOPs 流程中心 | 运营推广、供应链物流、账号安全、客服体验相关 SOP 页面 | `src/modules/sops/` |
| 应用中心 | Master Analysis、PPC Tools、Keyword Hunter、Deep Chat Playground | `src/modules/app_center/` |
| Amazon 智库 | 市场洞察、SEO 策略、运营实践和进阶攻略 | `src/modules/amz_hub/` |
| 更多 | Agent Center、提示词、工作流探索页 | `src/modules/more/` |

业务页面的路由和菜单元数据统一声明在各模块的 `module.manifest.ts`。`src/common/constants/routes.ts` 和 `src/common/config/menuConfig.ts` 会从这些 manifest 派生；子页面的动态导入入口仍需要同步维护对应模块的 `module.loaders.ts`。

### 应用中心入口

| 应用 | 路由 | 说明 |
| --- | --- | --- |
| Master Analysis | `/app-center/scraper`、`/app-center/ai-analysis`、`/app-center/promptlab` | 竞品数据采集、AI 分析和 Prompt 生成 |
| PPC Tools | `/app-center/ppc-search-terms` | 导入广告搜索词或活动报表，生成 PPC 动作清单和周报摘要 |
| Keyword Hunter | `/app-center/keyword-hunter/input`、`/app-center/keyword-hunter/process`、`/app-center/keyword-hunter/analysis` | 关键词输入、处理与分析统计 |
| Deep Chat | `/app-center/playground/deep-chat` | LLM 对话与提示词实验 |

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
