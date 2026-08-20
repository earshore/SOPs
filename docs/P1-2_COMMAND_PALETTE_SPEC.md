# P1-2 ⌘K 命令面板实现方案 Spec

**作者**：Manus AI  ·  **日期**：2026-08-20  ·  **状态**：待评审  ·  **来源**：`docs/sops-ux-review.md` P1-2

## 1. 背景与目标

当前仓库内存在三处互相独立的搜索入口（`src/common/ui/search.ts` 中的 `searchSOPs` / `searchHub` / `searchSidebar`），每个入口只能过滤当前模块的路由，且全部依赖固定 DOM 容器 ID。对于覆盖 5 个模块、约 50 条路由的信息架构，用户找到目标工具的平均点击成本较高。本 Spec 的目标是引入一个**键盘优先的全局命令面板**（⌘K / Ctrl+K 唤起），在一个统一的输入框内完成全部路由的模糊搜索与高频动作的直达执行，将老手的跳转成本从"打开侧边栏 → 找模块 → 找条目"压缩为一次按键加一次回车。

约束条件延续项目历史决策：不引入 React/Vue 等重型框架；遵循 Alpine CSP 模式（`@alpinejs/csp`）与现有 CSP nonce 体系；改动必须可被现有 `type-check` / `lint` / `vitest` / `vite build` 门禁完整覆盖，且不得破坏既有的三处局部搜索。

## 2. 调研结论：可复用的既有能力

在 main HEAD（`f8a0ca1f`）上完成的调研确认了以下可直接复用的基础设施，这决定了本方案的实现形态是"薄封装 + 纯函数索引"而非重构搜索系统。

| 能力 | 位置 | 复用方式 |
| --- | --- | --- |
| 全量路由清单 | `src/common/config/routeManifests.ts`（`ROUTE_MANIFESTS`，5 个模块约 50 条路由）与 `src/common/config/menuConfig.ts`（`MENU_CONFIG` 三层结构） | 命令面板的**数据源**，路由变更自动生效，零维护成本 |
| 路由类型系统 | `src/common/constants/routes.ts`（`RouteId` 联合类型 + `ALL_ROUTE_ID_VALUES`）与 `src/common/router/navigo/route-ids.ts`（`isValidRouteId`） | 面板条目天然带类型安全的路由 ID |
| 标准导航 API | `src/common/router/index.ts` 的 `navigateToRouteId(routeId, options)` | 面板选中路由后唯一跳转入口，自带 routeId 校验与中间件 |
| 设置面板深链 | `APP_EVENTS.SETTINGS_OPEN`（`src/common/constants/eventConstants.ts`）+ `systemSettings.ts` 订阅 + `normalizeSettingsOpenOptions` | 命令"打开设置"直接 emit 该事件并传 `section`，与 `llmFailureUx` 深链同一模式 |
| 模糊匹配逻辑 | `search.ts` 的 `findModuleRoutes` / `routeMatchesQuery`（单模块版） | 扩展为跨模块的纯函数 `matchCommand`，保证新旧搜索口径一致 |
| 对话框与动态 DOM 先例 | `recentPanel.ts` 的 `document.createElement('dialog')`、`showToast` 的 `action` 按钮、`confirmWithModal` | 面板采用原生 `<dialog>` 元素 + 纯 DOM 构建，CSP 友好且无需 Alpine 模板 |

调研同时排除了两项不可行或收益可疑的设计：其一，**数据备份/导入导出不宜做成面板直接动作**——`dataSection` 的导出逻辑内嵌在 settings 组件内部，跨组件调用会引入紧耦合，一期改为深链到"数据与备份"区；其二，**拼音搜索不引入第三方库**——一期采用 label / 模块名 / 类别的降级子串 + 多键模糊匹配，命中质量已可覆盖绝大多数老手场景，中文分词留二期评估。

## 3. 功能范围

### 3.1 一期（本 Spec 范围）

命令面板由两类条目构成。**路由条目**覆盖 `ROUTE_MANIFESTS` 全量路由，每条携带 routeId、label、icon、模块名与类别，搜索时跨模块统一排序（优先级：历史最近使用 > 匹配质量 > 模块序）。**动作条目**共 6 条静态命令：打开设置（可带 section 参数：LLM / 数据与备份 / 外观 / 诊断）、切换颜色模式（浅色 / 深色 / 跟随系统，调用 `ThemeManager.applyColorMode`）、返回首页、设置搜索。

面板交互遵循命令面板通用范式：⌘K / Ctrl+K 全局唤起（在输入框内按 ⌘K 则不拦截、允许原生行为）；键入即过滤；↑↓/Ctrl+J/Tab 移动焦点，Enter 执行，Esc 关闭；输入为空时展示"最近使用"组（localStorage 记录执行历史，上限 8 条）；空结果展示"未找到匹配，按 Enter 使用搜索功能搜索"并走 `searchHub` 兜底。

### 3.2 明确的二期候选（不在本 Spec 范围）

拼音模糊匹配、命令条目权重学习、"复制当前页面链接"、批量操作（全选 ASIN、清空筛选）类动作命令、以及将三处局部搜索迁移到同一索引引擎。二期的存在是为了在评审阶段划定边界，避免一期过度设计。

## 4. 架构设计

### 4.1 模块划分

```
src/common/command-palette/
├── index.ts                  # 公开 API：openCommandPalette / closeCommandPalette / register（事件总线挂载点）
├── types.ts                  # CommandItem（route | action | recent）、CommandPaletteState
├── buildIndex.ts             # 纯函数：ROUTE_MANIFESTS → CommandItem[] 静态索引 + 元数据（模块名/类别中文）
├── filterCommands.ts         # 纯函数：(items, query, recent) → 排序后列表（核心算法，独立单测）
├── CommandPalette.ts         # 自定义元素 <sops-command-palette>：DOM 构建、键盘循环、focus trap、aria
└── __tests__/
    ├── buildIndex.test.ts
    └── filterCommands.test.ts
```

`buildIndex` 与 `filterCommands` 均为纯函数且不依赖 DOM，这使核心逻辑的单元测试可以脱离浏览器环境运行，测试成本与回归风险最低。`CommandPalette.ts` 仅承载渲染与输入事件，逻辑薄，测试以交互场景单测为主（jsdom + 键盘事件模拟）。

### 4.2 组件形态与 CSP 合规

面板实现为**自定义元素** `<sops-command-palette>`（继承 HTMLElement），内部使用 `document.createElement('dialog')` 作为容器——这是 `recentPanel.ts` 已验证过的模式，不受 CSP `script-src` 限制。渲染采用全量 DOM API 构建（与 `showToast` 的 action 按钮同一手法），不依赖 Alpine 模板或 inline script。生命周期挂载方式遵循项目惯例：在应用初始化点（`main.ts` 或 `initRouter` 之后）执行一次 `customElements.define` + 事件总线监听，面板默认隐藏，仅在 `openCommandPalette()` 调用时插入 DOM 并 `showModal()`。

### 4.3 数据流

```
⌘K / Ctrl+K 全局 keydown
      │
      ▼
openCommandPalette() ── insert <sops-command-palette> ── dialog.showModal()
      │                                    │
      │                                    ▼
      │                            buildIndex()（静态，缓存）
      │                                    │
      │                                    ▼
      └───────── input 事件 ◄─ filterCommands(items, query, recent)
                                       │
                                       ▼
                                渲染分组列表（最近 / 路由 / 动作）
                                       │
                                       ▼
                              Enter ──► 路由条目: navigateToRouteId(routeId)
                                         动作条目: 执行 action.fn()（emit SETTINGS_OPEN / applyColorMode 等）
                                       │
                                       ▼
                              执行成功 ──► writeRecent(routeId) ── close ── announceDone(toast 留二期)
```

### 4.4 过滤器算法

匹配沿用 `search.ts` 的 `routeMatchesQuery` 思路并做两点扩展。其一，匹配范围从单模块路由扩展为 `{routeLabel, moduleLabel, category, actionLabel, actionKeywords}` 的组合文本；其二，查询按空白切分为多键，所有键必须命中（AND 语义），支持 "导出 设置" 这类组合查询。排序规则为：最近使用条目置顶（按执行时间倒序，最近 8 条），其余按首键命中位置与完整性（label 完整子串 > 类别命中）排序。全部逻辑封装在 `filterCommands` 一个纯函数内，便于单测穷举边界。

## 5. 关键接口

```typescript
// types.ts
interface RouteCommandItem {
  kind: 'route';
  routeId: RouteId;            // 类型安全的既有条目 ID
  label: string;               // MENU_CONFIG 的 label
  icon: string;
  moduleLabel: string;         // 模块中文名（modules[moduleId].title）
  category?: string;
  keywords?: string[];         // 动作类中文别名，路由条目可为空
}

interface ActionCommandItem {
  kind: 'action';
  id: string;                  // 例 'open-settings-llm'
  label: string;
  description?: string;
  keywords: string[];          // 必填，如 ['设置', '配置', 'llm', 'api key']
  execute: () => void | Promise<void>;
}

type CommandItem = RouteCommandItem | ActionCommandItem;

// buildIndex.ts
export function buildCommandIndex(manifests: typeof ROUTE_MANIFESTS,
  modules: MenuConfig['modules']): CommandItem[];

// filterCommands.ts
export interface FilterOptions {
  recent?: Array<{ id: string; at: number }>;  // localStorage 读出的历史记录
  maxRecent?: number;                          // 默认 8
}
export function filterCommands(items: CommandItem[], query: string,
  options?: FilterOptions): CommandItem[];

// index.ts
export function openCommandPalette(initialQuery?: string): void;
export function closeCommandPalette(): void;
export function initCommandPalette(): void;  // 应用初始化时调用一次
```

动作命令的配置表（硬编码在 `src/common/command-palette/actions.ts`，方便二期扩展）：

| id | label | keywords | execute |
| --- | --- | --- | --- |
| `open-settings` | 打开设置 | 设置、配置、偏好 | `emit(SETTINGS_OPEN)` |
| `open-settings-llm` | 打开设置 · AI 配置 | ai、llm、api key、模型、接入 | `emit(SETTINGS_OPEN, { section: 'llm' })` |
| `open-settings-data` | 打开设置 · 数据与备份 | 备份、导入、导出、数据 | `emit(SETTINGS_OPEN, { section: 'data' })` |
| `open-settings-appearance` | 打开设置 · 外观 | 主题、颜色、深色、浅色 | `emit(SETTINGS_OPEN, { section: 'appearance' })` |
| `color-mode-dark` / `-light` / `-system` | 切换深色 / 浅色 / 跟随系统 | dark、夜间、模式 | `ThemeManager.applyColorMode(mode)` |
| `go-home` | 返回首页 | 首页、home、splash | `navigateToRouteId('home')` |

## 6. 无障碍与体验要求

面板必须满足以下无障碍基线，与项目已有的 `aria-live` / `role=alert` 实践对齐：容器 `role="dialog"` + `aria-modal="true"`；输入框 `role="combobox"` + `aria-expanded` + `aria-controls` 指向列表；列表 `role="listbox"`，条目 `role="option"` + `aria-selected`；高亮条目由 `aria-activedescendant` 驱动；focus trap 在面板打开期间生效，关闭后焦点归还给唤起前的元素。视觉方面沿用项目既有设计 token（`--surface-panel`、`--border-subtle`），暗色模式自动适配；移动端（≤768px）不注册快捷键但保留编程式唤起入口（供后续首页 Launchpad 二期集成）。

## 7. 实现步骤与验收

实现将拆为四个可独立评审的提交。第一步（纯函数层）：`types.ts` + `buildIndex.ts` + `filterCommands.ts` 及对应单测，要求覆盖"空查询"、"多键 AND"、"无匹配"、"recent 排序置顶"、"模块名命中"五个分支。第二步（组件层）：`CommandPalette.ts` 自定义元素与渲染、键盘循环、focus trap，配套 jsdom 交互单测。第三步（接入层）：`index.ts` 的 `initCommandPalette`、全局快捷键注册（`initRouter` 初始化之后）与事件总线解耦。第四步（验证）：全量 `type-check` / `eslint` / `prettier` / `vitest`（预期 3,742 + 新增约 20 条）/ `vite build` 全绿；冒烟验证唤起、搜索、路由跳转、设置深链、颜色切换六条路径。

验收标准共六条：⌘K / Ctrl+K 在任意路由下 300ms 内唤起；输入任意中文字符可命中目标路由；最近使用组在无查询时展示且执行后更新；路由条目执行后 URL 与面板内容与目标模块一致；设置深链条目打开设置面板并定位到对应 section；任意时刻 Esc 关闭面板且焦点归还。

## 8. 风险与对策

| 风险 | 等级 | 对策 |
| --- | --- | --- |
| Alpine CSP 模式下自定义元素挂载时序问题 | 中 | 遵循 `recentPanel.ts` 已验证的纯 DOM 模式；挂载点放在路由初始化之后；不依赖 Alpine 生命周期 |
| 命令面板与既有三处局部搜索的口径漂移 | 低 | 匹配算法从 `routeMatchesQuery` 扩展而来，共用同一测试用例集 |
| 快捷键与 Alpine/浏览器原生行为冲突 | 低 | 仅在 `input` 元素聚焦时拦截 ⌘K；其余场景全局注册；Esc 优先交 `dialog` 原生处理 |
| 动作命令跨组件耦合（如备份导出） | 中 | 一期一律用事件深链，不直接调用组件内部函数；直接调用留二期并随组件 API 化推进 |
| bundle 体积增长 | 低 | 纯函数 + 自定义元素合计预估 +4~6KB（gzip 前），命令面板按路由 lazy-import，非首屏加载 |

## 9. 参考资料

本 Spec 的事实依据均来自主仓库 main 分支（`f8a0ca1f`）的直接代码核对：`src/common/config/routeManifests.ts`、`src/common/config/moduleManifest.ts`、`src/common/config/menuConfig.ts`、`src/common/constants/routes.ts`、`src/common/router/index.ts`、`src/common/router/navigo/route-ids.ts`、`src/common/ui/search.ts`、`src/common/constants/eventConstants.ts`、`src/components/settings/systemSettings.ts`、`src/modules/app_center/views/overview/recentPanel.ts`、`src/common/config/themeConfig.ts`、`docs/sops-ux-review.md`。
