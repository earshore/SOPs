# 稳定主题系统规范

**适用范围**: SOPs Web 端所有页面、模块样式、共享组件和视觉整改  
**更新时间**: 2026-07-25  
**目标**: 把项目从多套局部视觉方案收敛为稳定、可审计、适合内部运营工作台的主题系统；支持用户 Appearance 切换全局 primary，**不**覆盖模块归属色。

---

## 1. 主题定位

SOPs 是内部亚马逊运营作业系统，不是营销官网。主题系统优先保证：

- 信息可扫读。
- 工作台布局稳定。
- 状态和风险含义清楚。
- 主题色用于归属和强调，不承担装饰主角。
- 可访问性、暗色模式和视觉回归能被稳定验证。
- 用户可通过 Appearance 切换全局主色（primary / focus）；模块导航与 banner 归属色不受 Appearance 覆盖。

默认视觉方向：

- 中性浅色工作台背景。
- 白色或浅灰内容表面。
- 低对比边框和轻阴影表达层级。
- 模块主题色只用于导航、页面入口、图标、状态点、关键 CTA。
- 工具页不使用大面积高饱和渐变、漂浮粒子、自定义光标或营销 hero。

---

## 2. 主题分层

主题系统按以下顺序决策，低层负责基础事实，高层只能表达业务语义。

| 层级 | 位置 | 责任 | 允许内容 | 禁止内容 |
| --- | --- | --- | --- | --- |
| 1. 基础 token | `src/common/config/design-tokens.ts` | 颜色阶梯、间距、字号、圆角、阴影、断点 | 原子设计值 | 业务模块含义 |
| 2. 生成 token | `src/css/foundation/variables.generated.css` | 从基础 token 生成 CSS 变量 | 自动生成值 | 手工编辑 |
| 3. 手写语义 token | `src/css/foundation/variables.css` | 语义表面、文本、边框、暗色覆盖、迁移期补充 | `--surface-*`、`--border-*`、`--shadow-card` 等语义变量 | 覆盖基础 token 的同名尺寸和色阶 |
| 4. 归属配置 | `src/common/config/menuConfig.ts` | 模块和一级目录主题归属 | `themeColor`、`category.color` | 页面级随机颜色 |
| 5. 共享组件主题 | `src/css/components/*.css` | card、button、badge、welcome banner、状态组件 | 可复用组件变量和变体 | 单页业务布局 |
| 6. 模块样式 | `src/modules/**/style.css` | 模块独有布局和少量语义扩展 | 带模块前缀的局部 token | 重新定义通用 card/button/badge/hero 系统 |
| 7. 模板内动态样式 | `template.html`、渲染器 | 真实动态值 | 宽度百分比、动画延迟、数据驱动位置 | 裸色值、圆角、阴影、字体系统 |

### 2.1 单一事实源

长期目标是 `design-tokens.ts` 作为基础视觉事实源。`variables.generated.css` 只由脚本生成；`variables.css` 只保留语义 token、暗色模式和迁移期补充。

当前主入口导入顺序是：

```css
@import './foundation/variables.generated.css';
@import './foundation/variables.css';
```

因此 `variables.css` 会覆盖同名变量。新增或整改时不得继续扩大这种覆盖。遇到同名基础 token 时，优先迁回 `design-tokens.ts` 并运行：

```bash
npm run generate:tokens
```

### 2.2 双层主题模型（A2）

运行时颜色决策按以下**优先级**（高 → 低）理解，避免 Appearance 与业务归属互相踩踏：

1. 语义状态色  
2. 模块归属色  
3. 外观主色（Appearance）  
4. 中性 surface / text / border  

| 层 | 数据源 | 可写 | 不可改 |
| --- | --- | --- | --- |
| A Appearance | `themeConfig.ts` / `ThemeManager` | `--color-primary*`、`--color-focus-ring` | `wb-theme-*`、menu 归属、状态色 |
| B Module Ownership | `menuConfig` + banner/colorSchemes | 导航/banner/入口归属 | 不被 Appearance 覆盖 |

**运行时 SSOT：**

- 唯一主题 API：`ThemeManager`（`src/common/config/themeConfig.ts`）。
- 持久化存储 key：`app-theme`。
- **已删除** `src/common/config/themes.ts`；不得再引入平行主题配置文件。
- `applyTheme` 只写全局 primary / focus 相关 CSS 变量与 `data-theme`（appearance id）；**不得**调用 `ColorContext.setModuleColor` 或改写模块归属。

### 2.3 Appearance Presets

用户可选的全局外观预设（id → 名称 / colorScheme）：

| id | 名称 | colorScheme | 备注 |
| --- | --- | --- | --- |
| default | 默认 | blue | 商务默认 |
| minimal | 极简素色 | slate | primary/focus → slate-700 工业档（`customVars`） |
| ocean | 海洋 | cyan | |
| forest | 森林 | green | |
| sunset | 日落 | orange | |
| purple | 紫罗兰 | purple | |
| rose | 玫瑰 | rose | |

`minimal` 的 `customVars`（工业档主色，覆盖默认 scheme 的 500 档映射）：

| 变量 | 值 |
| --- | --- |
| `--color-primary` | `var(--color-slate-700)` |
| `--color-primary-light` | `var(--color-slate-100)` |
| `--color-primary-dark` | `var(--color-slate-800)` |
| `--color-primary-darker` | `var(--color-slate-900)` |
| `--color-focus-ring` | `var(--color-slate-700)` |

**契约：**

- Appearance **不得**调用或覆盖模块 `ColorContext` 归属（menu / 路由推断的 `wb-theme-*`、导航色）。
- **影响面**：仅 token 化的全局壳层（使用 `--color-primary*` / focus 等语义变量的区域）；大量硬编码 `blue-*` 的 UI **可以**不随 Appearance 变色（见债务 D6），验收不要求全站硬编码色跟随。
- `ThemeManager.previewTheme` 与 `applyTheme` 使用同一套 `getColorVars` + `customVars` 合并结果解析色值（例如 `minimal` 预览为 slate-700 工业档，而非 scheme 默认 500）。

---

## 3. 颜色归属

### 3.1 决策顺序

1. 普通子页以 `menuConfig.ts` 中一级目录 `category.color` 为准。
2. 模块总览页可使用模块 `themeColor`。
3. 状态色使用语义状态 token，不跟随模块主题色。
4. 图表和数据系列可以使用多色，但必须有文字、图例或形状辅助，不能只靠颜色表达含义。
5. Appearance 只改变全局 primary / focus token，不改变上述模块归属决策。

### 3.2 当前主题映射

| 区域 | 当前主题来源 | 页面主视觉 |
| --- | --- | --- |
| 首页 | `themeColor: slate` | 保留全屏 splash / 粒子 hero；工作台只作为极简浮动入口 |
| SOPs 总览 | `themeColor: blue` | blue / indigo，仅用于总览入口 |
| SOPs 运营与推广 | `category.color: emerald` | `wb-theme-growth` |
| SOPs 供应链与物流 | `category.color: amber` | `wb-theme-supply` |
| SOPs 账号安全与风控 | `category.color: red` | `wb-theme-safety` |
| SOPs 客服与体验 | `category.color: teal` | `wb-theme-service` / `wb-theme-teal` |
| 应用中心总览 | `themeColor: purple` | purple / fuchsia，仅用于总览入口 |
| Master Analysis | `category.color: indigo` | `wb-theme-indigo` |
| Playground | **配置**：`category.color` / `themeColor` = `orange` | **实现例外**：Deep Chat 可为 terracotta / `wb-theme-supply` / 隐藏 banner；**不**将 `wb-theme-orange` 写为本轮唯一 banner class。Playground 归属**不是** indigo / cyan |
| Keyword Hunter | `category.color: fuchsia` | `wb-theme-fuchsia` |
| PPC Tools | `category.color: emerald` | emerald / teal；自定义 hero 需受控 |
| Amazon 智库总览 | `themeColor: orange` | orange / red，仅用于总览入口 |
| Amazon 知识 | `category.color: indigo` | `wb-theme-indigo` |
| Amazon 入门实操 | `category.color: green` | `wb-theme-growth` |
| Amazon 运营提升 | `category.color: violet` | `wb-theme-violet` |
| 更多总览 | `themeColor: green` | green / emerald，仅用于总览入口 |
| 更多大模型探索 | `category.color: teal` | `wb-theme-teal` |
| 更多业务场景 | `category.color: cyan` | cyan / blue；紫鸟场景可局部使用案例色 |

---

## 4. 组件视觉底线

### 4.1 工作台面板

用于表单、表格、分析结果、配置区和数据工作区的面板必须稳定。

| 项 | 标准 |
| --- | --- |
| 圆角 | 默认 `8px`，最大不超过 `8px` |
| 背景 | `var(--surface-card)` 或 `var(--surface-panel)` |
| 边框 | `var(--border-subtle)` 或 `var(--border-muted)` |
| 阴影 | `var(--shadow-card)`，不使用强彩色阴影 |
| Hover | 可调整边框、背景或阴影，不得 `translateY`、缩放或改变布局 |
| 动效 | 150-250ms，仅用于状态反馈 |

大圆角、彩色阴影、hover 上浮只允许出现在模块总览入口卡片或营销式介绍卡片，不进入工作台面板。

### 4.2 卡片

| 类型 | 使用场景 | 标准 |
| --- | --- | --- |
| Workbench card | 工具页主操作、数据分析、配置 | `8px`、轻边框、无位移 |
| Entry card | 模块总览入口 | `8-16px`、可有轻微主题强调 |
| Marketing / story card | 紫鸟案例等叙事页 | 可更强，但不得影响工具页 |

同一个页面不得混用多个卡片视觉语言。需要新增卡片样式时，先检查 `src/css/components/cards.css`。

### 4.3 按钮

- 一个工作区内只保留一个主要 CTA。
- Primary 使用模块主色或全局 `--color-primary`，不要在单页硬编码新渐变。
- Secondary / Ghost 使用中性色边框和文本。
- Danger 使用 `--color-error` / red 系列，并与普通操作保持空间分离。
- 图标按钮必须有 `aria-label`，可点击面积不小于 `44px`。

### 4.4 Badge 和状态

- Badge 表达分类或状态，不能替代标题。
- 状态色使用语义：success、warning、error、info、neutral。
- 关键状态必须同时有文字或图标，不只靠颜色。
- `wb-badge-*` 在 banner 中最终应受当前 `wb-theme-*` 控制。

### 4.5 Welcome Banner

`welcome-banner.css` 是页面入口组件，不是全站装饰系统。

默认规则：

- 普通工具页使用紧凑 banner 或隐藏 banner。
- Banner 只放页面名称、一句话说明、必要能力标签。
- 工具页默认不显示 orb / particle；只有显式叠加 `.wb-container--decorative` 的总览 hero 可保留轻装饰。
- 背景必须低饱和、低透明，文本对比度优先。
- 主题变量由 `wb-theme-*` 提供，模块样式不得大面积覆盖 `--wb-*`。

允许自定义 hero 的前提：

- 页面有独立交互模型，例如 PPC 上传分析器。
- 主色仍来自 `menuConfig.ts`。
- 自定义 token 带模块前缀，例如 `--ppc-hero-*`。
- 对齐共享 banner 的标题、图标、圆角、阴影和可访问性底线。

---

## 5. 装饰和动效边界

默认禁止：

- 首页或工具页自定义 cursor。
- 工具页全屏品牌 hero。
- 大面积高饱和渐变背景。
- 工具页或普通面板持续漂浮 orb、particle、bokeh、复杂光效。
- hover 上浮导致面板位置变化。
- 用 emoji 承担导航、按钮或状态语义。

允许：

- 首页保留旧版全屏 splash / 粒子 hero，但不得把首屏主体改成工作台面板；工作台入口应以右下角等低干扰浮层出现。
- Loading skeleton。
- Toast / modal / drawer 的进入退出动效。
- 按钮 pressed feedback。
- 数据加载或任务进度的明确动效。
- 模块总览入口的轻微装饰，但首屏必须露出实际入口或工作内容；首页例外为完整品牌 splash 加极简浮动入口。

所有动效必须满足：

- 常规微交互 150-300ms。
- 使用 `transform` / `opacity`，不动画宽高和布局。
- 支持 `prefers-reduced-motion`。
- 不阻塞输入和滚动。

---

## 6. 局部 token 和例外流程

新增局部 token 前必须回答三个问题：

1. 是否能用全局语义 token 表达？
2. 是否能扩展共享组件变量表达？
3. 是否确实只属于一个模块或一个独立交互模型？

允许的局部 token 命名：

| 场景 | 前缀示例 |
| --- | --- |
| PPC 独立 hero | `--ppc-hero-*` |
| Keyword Hunter 业务状态 | `--kh-status-*` |
| Scraper 独有工作区 | `--scraper-*` |
| Playground 独有预览层 | `--playground-*` |

局部 token 必须映射到全局 token 或明确记录原因：

```css
.ppc-hero {
  --ppc-hero-accent: var(--color-emerald-600);
  --ppc-hero-accent-soft: var(--color-emerald-50);
  --ppc-hero-border: var(--border-subtle);
}
```

### 6.1 高扩散局部 token 登记

以下登记覆盖当前 UI 整改范围内的高扩散来源。新增或调整这些前缀时，必须同步更新本节或在对应 CSS 定义旁写明原因。

| 来源 | 局部 token | 全局来源 / 记录原因 |
| --- | --- | --- |
| App Center overview | `--app-overview-accent*` | 映射到 `--color-cyan-*`，仅表达应用中心总览主色。 |
| App Center overview | `--app-overview-surface*`、`--app-overview-border*`、`--app-overview-shadow` | 映射到 `--surface-*`、`--border-*`、`--shadow-panel`。 |
| App Center overview | `--app-overview-text-*`、`--app-overview-radius`、`--app-overview-pill-radius`、`--app-overview-focus-ring` | 映射到 `--color-text-*`、`--rounded-*`、`--focus-ring-soft` 派生值。 |
| Shared buttons | `--button-filter-*` | 筛选按钮组件 token，默认映射到全局 surface / border / text / focus token，模块仅覆写主题色。 |
| PPC tools | `--ppc-surface*`、`--ppc-border*`、`--ppc-text-*` | 映射到 `--surface-*`、`--border-*`、`--color-text-*`。 |
| PPC tools | `--ppc-primary*`、`--ppc-accent*`、`--ppc-*-soft/text` | 映射到全局主色、emerald 业务强调色和状态色阶；边框通过 `color-mix()` 从全局色派生。 |
| PPC tools | `--ppc-radius*`、`--ppc-shadow*`、`--ppc-focus-ring`、`--ppc-motion-*` | 映射到 `--rounded-*`、`--shadow-*`、`--focus-ring-soft`、全局 motion token。 |
| Welcome Banner | `--wb-theme-*`、`--wb-text-*`、`--wb-border-color` | 映射到全局色阶、`--color-text-*`、`--border-subtle`。 |
| Welcome Banner | `--wb-card-*`、`--wb-tag-*`、`--wb-badge-*` | 映射到 `--surface-*`、`--shadow-panel`、`--rounded-full`、字号和状态色派生值。 |
| Welcome Banner | `--wb-icon-*`、`--wb-icon-badge-*` | 颜色映射到全局色阶；尺寸和偏移是组件几何规格，保留在 `wb` 命名空间并由 `VISUAL_DESIGN_GUIDELINES.md` 约束。 |
| Welcome Banner | `--wb-gradient-*`、`--wb-orb-*`、`--wb-particle-color` | 仅用于 `.wb-container--decorative` 或 legacy banner 装饰层，必须从 `--wb-theme-*` 或全局色阶派生；工具页默认不应新增。 |

不允许：

```css
.feature-card {
  color: #334155;
  border-radius: 18px;
  box-shadow: 0 18px 42px rgba(...);
}
```

---

## 7. 迁移顺序

### M1：修正主题事实源

- 清点 `variables.css` 中覆盖 generated 基础 token 的同名变量。
- 将基础尺度和色阶迁回 `design-tokens.ts`。
- 保留 `variables.css` 作为语义、暗色和迁移补充层。
- 运行 `npm run generate:tokens` 并检查 diff。

### M2：稳定工作台面板

- 优先处理 `workbench-ui:audit` 暴露的问题。
- Scraper、AI Analysis、PromptLab、Keyword Hunter、PPC 的工作区面板统一到 `8px`、轻边框、无 hover 位移。
- 保留模块总览入口的较强视觉，但不复制到工具页内部。

### M3：收敛高扩散样式源

优先治理：

1. `src/css/components/welcome-banner.css`
2. `src/modules/app_center/app_center_style.css`
3. `src/modules/app_center/views/ppc_tools/style.css`
4. `src/modules/app_center/views/keyword_hunter/keyword_hunter_style.css`
5. `src/modules/app_center/views/master_analysis/scraper/scraper_style.css`
6. `src/modules/app_center/views/playground/styles.css`

### M4：建立视觉回归基线

- 390px、768px、1440px 覆盖首页和核心模块。
- light / dark / reduced-motion 至少覆盖核心工具页。
- loading、empty、error、toast、modal、progress 需要单独截图样本。

---

## 8. 已知债务

以下债务在主题整改中**承认现状**，不在本规范要求“本轮一次清零”；新增代码应避免扩大。

| ID | 内容 |
| --- | --- |
| D1 | `variables.css` 重定义基础色阶 / 字号，覆盖 generated |
| D2 | 圆角语义名与像素不一致；工作台行为写死 ≤8px |
| D3 | `[data-theme='dark']` 与 appearance id **互斥共用** `data-theme`；`applyTheme` 会覆盖 dark；后续应拆 `data-appearance` / `data-color-mode` |
| D4 | colorSchemes 营销向 hover 与工作台底线冲突 |
| D5 | `--focus-ring-soft` 等可能残留蓝系硬编码 |
| D6 | 大量 UI 硬编码 `blue-*`，Appearance 可见影响有限 |

---

## 9. 验收标准

### 必跑命令

```bash
npm run css:audit
npm run ui:audit
git diff --check
```

涉及 token 生成时：

```bash
npm run generate:tokens
```

涉及页面视觉时：

```bash
npm run test:visual
```

涉及 Appearance / `ThemeManager` 时：

```bash
npx vitest run src/common/config/themeConfig.test.ts
```

发布前：

```bash
npm run build
```

### 通过定义

- `css:audit` 不新增非规范变量；允许既有债务只在单独任务中逐步减少。
- `ui:audit` 通过 card、callout、workbench 三类审计。
- 新增样式没有无理由 `!important`。
- 新增模板没有裸色值，动态宽度和动画延迟除外。
- 工作台面板圆角不超过 `8px`，hover 不移动布局。
- 页面主视觉颜色和 `menuConfig.ts` 归属一致。
- 文本对比度、focus、触控目标和可访问名称满足基础要求。
- Appearance 切换后，模块 banner / `wb-theme-*` 归属**不变**。
- 只保证 **token 化壳层**随 Appearance 变色；**不要求**硬编码 `blue-*` 全站变色（D6）。
- **不**验收 dark 模式与 Appearance 联用（D3）。
- `npx vitest run src/common/config/themeConfig.test.ts` 通过。
- 仓库中**不存在** `src/common/config/themes.ts`。
- `applyTheme` **不**调用 `ColorContext.setModuleColor`。

---

## 10. 和现有文档的关系

- 本文是主题系统的上层规范（宪法），回答“颜色、token、组件、Appearance 与模块归属、例外怎么决策”。
- `docs/VISUAL_DESIGN_GUIDELINES.md` 是页面视觉和 welcome banner 的详细执行规范。
- `src/css/README.md` 是 CSS 目录和组件使用说明。
- `src/css/QUICK-REFERENCE.md` 是变量和组件类速查，不作为主题决策源。
- Appearance 运行时实现以 `src/common/config/themeConfig.ts` 为准；模块归属以 `menuConfig.ts` 与 banner `wb-theme-*` 为准。

当文档冲突时，优先级为：

1. 本文的主题系统分层（含 A2 双层模型）和验收规则。
2. `VISUAL_DESIGN_GUIDELINES.md` 的页面和 banner 细则。
3. `src/css/README.md` 与 `QUICK-REFERENCE.md` 的实现速查。
