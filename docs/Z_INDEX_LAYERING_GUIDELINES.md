# Z-index 层叠层级规范指南

**Status:** active · SSOT
**Updated:** 2026-08-05
**适用范围**: 项目全部 CSS、Tailwind 类、TS 内联样式与动态注入样式的层级控制
**目标**: 统一层叠顺序，杜绝“浮窗盖住系统设置 / 弹窗 / Toast”类遮挡回归；给出可执行的分层表、铁律与冲突审计清单。

---

## 0. 结论速览

- 运行期生效的是**紧凑尺度**（`src/css/foundation/variables.css`）：`--z-dropdown: 30` → `--z-tooltip: 90`，共 9 档语义层。
- `variables.generated.css` / `design-tokens.ts` 中的 1000+ 语义 token 会被 `variables.css` 同名覆盖，**不得按 1000+ 尺度编写业务样式**（双尺度根因见 §4）。
- **body 级固定浮窗 ≤ 40**（`--z-header`）；任何业务浮层禁止超过 90（`--z-tooltip`）。
- `9999`（`--z-max`）只允许瞬态全局角标与 devtools；**弹窗不得占用 9999**。
- CI 已接入 `npm run z-index:audit`，越界层级自动拦截。

---

## 1. 运行期层级表（SSOT）

| 语义 | Token | 值 | 归属 |
| --- | --- | --- | --- |
| 隐藏 | `--z-hide` | -1 | 背景装饰层 |
| 基础 | `--z-base` | 0 | 默认流内元素 |
| 微提升 | `--z-raised` | 1 | 卡片内徽标 / 局部覆盖 |
| 数值层 | `--z-10` / `--z-20` | 10 / 20 | 页内绝对定位控件、表格吸顶列、按钮内浮层 |
| 下拉 | `--z-dropdown` | 30 | 头部菜单、导航下拉、选择器浮层 |
| 粘性 | `--z-sticky` | 35 | sticky 侧栏 / 表头 / 底部栏 |
| 头部 / 页内浮窗上限 | `--z-header` | 40 | 全局 header、**body 级页面浮窗上限** |
| 遮罩 / 覆盖 | `--z-overlay` | 50 | 系统设置面板、loading 遮罩、移动端抽屉、页面切换遮罩 |
| 弹窗遮罩 | `--z-modal-backdrop` | 55 | 模态遮罩 |
| 弹窗面板 | `--z-modal` | 60 | 模态面板 |
| 巨型下拉 | `--z-mega-menu` | calc(overlay-1)=49 | header mega menu（低于 overlay，不再与 `--z-modal` 同值） |
| 浮层 / 弹出 | `--z-popover` | 70 | 气泡卡片、右键菜单、页内浮层 |
| 轻提示 | `--z-toast` | 80 | Toast |
| 工具提示 | `--z-tooltip` | 90 | Tooltip |
| 顶级 | `--z-max` | 9999 | 瞬态全局角标、devtools |

**Tailwind 对照**：`z-10 / z-20 / z-30 / z-40 / z-50` 与数值层一致；`z-[60]` 等价 `--z-modal`，**业务代码禁止使用 `z-[任意值]`**（应写语义 token）。

---

## 2. 铁律

1. **业务样式只允许引用语义 token**（`var(--z-*)`）或 Tailwind `z-10`~`z-50`；禁止裸数字 ≥ 10（局部 0/1/2 除外），禁止裸 `9999` / `1000+`。
2. **body 级固定浮窗**（悬浮监控窗、最小化按钮、悬浮球）**≤ `--z-header`（40）**，必须低于系统设置 overlay（50）。
3. **全屏遮罩 / 设置面板 = 50**；弹窗分两层：backdrop 55 / panel 60。共享弹窗优先 `<app-modal>` / `confirmWithModal`；自定义 backdrop 不得使用 `z-[60]`（等于 modal 层）。
4. **Toast（80）/ Tooltip（90）永远高于业务浮层**：页面内下拉、气泡、菜单不得超过 70。
5. **`--z-max`（9999）仅允许**：瞬态全局角标（`reset.css` / `interactive.css` 顶部徽标）、devtools（仅限 `src/common/devtools/**`）。
6. **新浮层必须自测遮挡矩阵**：与系统设置（50）、共享弹窗（55/60）、Toast（80）同时出现时不得遮挡对方。
7. **层叠上下文意识**：`transform / opacity / filter / will-change / position:fixed` 会创建层叠上下文；页面内局部 z 只在所在上下文内生效，数值比 header 大不代表在 header 之上。需要跨页面盖住内容的浮层必须挂到 `body` 并使用全局层。
8. **禁止用 `!important` 提升层级**（z-index < 10 的局部 `!important` 如按钮内浮层豁免）。

---

## 3. 谁用哪层（对照表）

| 组件 / 元素 | 层 |
| --- | --- |
| `header` / `.layout-app__header` | 40 |
| 移动端抽屉 `.header-mobile-drawer` | 50 |
| 系统设置 `.settings-panel-root`（`z-50`） | 50 |
| `.loading-overlay` / `.page-transition-overlay` | 50 |
| Keyword Hunter 浮窗 / 最小化按钮 | 40（已修复，原 9999） |
| `<app-modal>` host / container | 60（已修复，原 9999） |
| `.app-confirm-modal-backdrop` / `.ma-marketplace-modal-backdrop` | 55（已修复，原 `z-[60]`） |
| Toast / Tooltip | 80 / 90 |

---

## 4. 双尺度根因（必须收敛）

- `src/css/foundation/variables.generated.css`（源 `src/common/config/design-tokens.ts`）定义 `dropdown: 1000`、`sticky: 1020`、`modal-backdrop: 1040`、`modal: 1050`、`toast: 1080` 等大数值；
- `src/css/foundation/variables.css` 在同名变量上定义紧凑值 `30 / 35 / 55 / 60 / 80`，且加载顺序靠后（`src/css/main.css` 第 25、26 行），**运行期以紧凑值生效**；
- 后果：按 generated 尺度编写的样式与文档（如 `docs/guides/css/CSS-ARCHITECTURE-README.md`）与运行期行为不一致；TS 侧 `Z_INDEX`（如 `toast: '1080'`）与 CSS 实际值（80）漂移。
- 收敛建议：
  1. 以紧凑尺度为唯一运行期语义，停用 generated 中的 1000+ 语义 token，仅保留 `--z-0`~`--z-50` 与 `--z-max`；
  2. 同步 `design-tokens.ts` 与 CSS 架构文档；
  3. 已落地 CI 门禁：`npm run z-index:audit`（接入 `ci:quality`），扫描裸数字 ≥100、z-index `!important`（≥10）、Tailwind `z-[任意值]`。

---

## 5. 冲突清单（2026-08-05 全量审计）

### P0 越界（会盖住系统设置 / 弹窗 / Toast）

| 位置 | 现值 | 问题 | 建议 |
| --- | --- | --- | --- |
| `src/components/modal/AppModal.css:36`、`:68` | 9999 | 共享弹窗占用 `--z-max`，Toast/Tooltip 被压在下面 | 改 `--z-modal-backdrop`(55) / `--z-modal`(60) |
| `src/modules/amz_hub/views/practice/marketing_calendar/styles.css:359` | 99999 | 搜索历史下拉超过一切 | 改 `--z-popover`(70) 或页面内 `--z-dropdown`(30) |
| `src/modules/app_center/views/playground/styles.css:640` | 160 | Deep Chat 线程菜单越界 | 归一到 `--z-popover`(70) 以下 |
| `src/modules/app_center/views/playground/styles.css:847` | 80 | Prompt 预览浮层与 Toast 同值 | 改 `--z-popover`(70) |
| `src/modules/app_center/views/playground/styles.css:1015` | 120 | 页内搜索弹层越界 | 按 modal 语义 55/60 或降级到 70 |
| `src/modules/app_center/views/playground/styles.css:1433` | 1000 | 调参面板下拉越界 | 改 `--z-popover`(70) |
| `src/modules/app_center/views/playground/styles.css:2506` | 130 | Skill Library 页内弹层越界 | 按 modal 语义 55/60 |
| `src/css/utilities/interactive.css:349` | 100 | 拖拽态高于 Toast/Tooltip | 改 `--z-popover`(70) 或 `--z-sticky`(35) |
| `src/modules/app_center/views/master_analysis/master_analysis_style.css:753` | 100 `!important` | grid-stack 调整态越界（库自带 10000） | ✅ 已改为针对 `.ui-draggable-dragging` / `.ui-resizable-resizing` 的 `var(--z-header, 40)`，无 `!important` |
| `src/modules/app_center/views/master_analysis/scraper/scraper_style.css:595` | 100 | 下载按钮层级虚高 | 改局部 1 / 10 |

### P1 同值不同义（依赖 DOM 顺序，随时可能互相遮挡）

| 位置 | 现值 | 问题 | 建议 |
| --- | --- | --- | --- |
| `src/common/components/SidebarRenderer.ts:610` | `z-50` | 侧栏搜索下拉占用 overlay 层 | 改 `--z-dropdown`(30) 或 `--z-popover`(70) |
| `src/modules/app_center/views/master_analysis/ai_analysis/template.html:278` | `z-50` | 提示气泡占用 overlay 层 | ✅ 已改 `z-30`（页内气泡不超 70） |
| `src/components/modal/confirmModal.ts:41`、`scraper/handlers/importHandler.ts:381` | `z-[60]` | 自定义 backdrop 等于 modal 层 | 改 `--z-modal-backdrop`(55) |
| `src/modules/more/views/explore/prompts/prompts_style.css:58` | `--z-modal-backdrop`(55) | 模态容器占用遮罩层数值 | 容器拆 backdrop/panel 两层或改 `--z-modal`(60) |
| `src/css/components/header-main.css:302`、`src/css/critical.css:23` | `--z-mega-menu` 60 | mega menu 与 modal 同值 | ✅ 已改 `calc(var(--z-overlay, 50) - 1)` = 49 |
| `src/css/components/loading.css:81`、`src/css/animations/micro-interactions.css:1007` | `--z-overlay`(50) | 两个全屏遮罩与系统设置同层 | 接受（互斥出现），文档注明 |

### P2 Token 漂移与豁免

| 位置 | 现值 | 问题 | 建议 |
| --- | --- | --- | --- |
| `variables.generated.css` vs `variables.css` | 1000+ vs 30~90 | 同名语义 token 双值 | 收敛（见 §4） |
| `src/css/foundation/reset.css:838`、`src/css/utilities/interactive.css:504` | `--z-max` | 顶部角标占用 max 层 | 豁免，注释注明用途 |
| `src/common/devtools/PerformanceMonitor.ts:107`、`MemoryDevTools.ts:59` | 999999 / 10000 | devtools 专用 | 豁免，仅限 devtools |

### 修复记录（2026-08-05）

| 位置 | 修复 |
| --- | --- |
| Keyword Hunter 浮窗 / 最小化按钮 | `9999 → var(--z-header, 40)` |
| `<app-modal>` host / container（AppModal.css:4/36/68） | `9999 / 1000 → var(--z-modal, 60)` |
| 营销日历搜索历史下拉（marketing_calendar/styles.css:359） | `99999 → var(--z-popover, 70)` |
| Deep Chat 线程菜单 / Prompt 预览 / 搜索弹层 / 调参面板 / Skill Library | `160/80/120/1000/130 →` dropdown 30 / popover 70 / modal 60 |
| 全局拖拽态 `.dragging`（interactive.css:349） | `100 → var(--z-popover, 70)` |
| GridStack 调整态（master_analysis_style.css:753） | 死类 `.grid-stack-item-resizing` 改为库类 `.ui-draggable-dragging` / `.ui-resizable-resizing`，`100 !important → var(--z-header, 40)`，无 `!important` |
| Scraper 下载按钮（scraper_style.css:595） | `100 → 10` |
| 侧栏搜索下拉（SidebarRenderer.ts:610） | `z-50 → z-30` |
| Master Analysis 提示气泡（ai_analysis/template.html:278） | `z-50 → z-30` |
| PromptLab 模式切换控件（promptlab/template.html:698） | `z-[60] → z-30` |
| 确认弹窗 / Marketplace 弹窗 backdrop（confirmModal.css、confirmModal.ts、importHandler.ts、master_analysis_style.css:185） | 删除 `z-[60]`，统一 `var(--z-modal-backdrop, 55)` |
| 提示词详情模态（prompts_style.css:58） | `var(--z-modal-backdrop, 55) → var(--z-modal, 60)` |
| Mega menu（critical.css:23、header-main.css:302） | `60 → calc(var(--z-overlay, 50) - 1)` = 49，低于 overlay 不再与 modal 同值 |

**CI 门禁**：新增 `npm run z-index:audit`（`scripts/quality/audit-z-index.ts`），已接入 `ci:quality`；扫描裸数字 z-index ≥ 100、z-index `!important`（值 ≥ 10 或引用 token）、Tailwind `z-[任意值]`，豁免 `src/common/devtools/**`。

---

## 6. 验收与测试

- 新增或修改任何浮层，必须至少验证：打开系统设置时浮层被遮挡；打开 `<app-modal>` 时浮层被遮挡；Toast 出现时浮层不盖 Toast。
- 单元 / e2e 测试可用 `getComputedStyle(el).zIndex` 断言归属层，防止回归。
- 涉及遮挡问题的改动，应在 PR 描述中标注层级语义（例如“浮窗降至 header 层 40”）。

---

## 附：审计方法

`rg` 全量扫描：CSS `z-index:` 声明、Tailwind `z-*` 类、TS `style.setProperty` / 模板字符串、内联 `style`、`--z-*` 变量定义与引用；逐条对照运行期生效尺度（§1），按“越界 / 同值不同义 / token 漂移”三档归类。