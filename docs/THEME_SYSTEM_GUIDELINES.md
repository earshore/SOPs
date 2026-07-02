# 稳定主题系统规范

**适用范围**: SOPs Web 端所有页面、模块样式、共享组件和视觉整改  
**更新时间**: 2026-07-02  
**目标**: 把项目从多套局部视觉方案收敛为稳定、可审计、适合内部运营工作台的主题系统。

---

## 1. 主题定位

SOPs 是内部亚马逊运营作业系统，不是营销官网。主题系统优先保证：

- 信息可扫读。
- 工作台布局稳定。
- 状态和风险含义清楚。
- 主题色用于归属和强调，不承担装饰主角。
- 可访问性、暗色模式和视觉回归能被稳定验证。

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

---

## 3. 颜色归属

### 3.1 决策顺序

1. 普通子页以 `menuConfig.ts` 中一级目录 `category.color` 为准。
2. 模块总览页可使用模块 `themeColor`。
3. 状态色使用语义状态 token，不跟随模块主题色。
4. 图表和数据系列可以使用多色，但必须有文字、图例或形状辅助，不能只靠颜色表达含义。

### 3.2 当前主题映射

| 区域 | 当前主题来源 | 页面主视觉 |
| --- | --- | --- |
| 首页 | `themeColor: slate` | 中性工作台，不使用品牌大 hero |
| SOPs 总览 | `themeColor: blue` | blue / indigo，仅用于总览入口 |
| SOPs 运营与推广 | `category.color: emerald` | `wb-theme-growth` |
| SOPs 供应链与物流 | `category.color: amber` | `wb-theme-supply` |
| SOPs 账号安全与风控 | `category.color: red` | `wb-theme-safety` |
| SOPs 客服与体验 | `category.color: teal` | `wb-theme-service` / `wb-theme-teal` |
| 应用中心总览 | `themeColor: purple` | purple / fuchsia，仅用于总览入口 |
| Master Analysis | `category.color: indigo` | `wb-theme-indigo` |
| Playground | `category.color: indigo` | indigo；Deep Chat 可隐藏 banner |
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
- 工具页默认不显示 orb / particle。
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
- 持续漂浮 orb、particle、bokeh、复杂光效。
- hover 上浮导致面板位置变化。
- 用 emoji 承担导航、按钮或状态语义。

允许：

- Loading skeleton。
- Toast / modal / drawer 的进入退出动效。
- 按钮 pressed feedback。
- 数据加载或任务进度的明确动效。
- 模块总览入口的轻微装饰，但首屏必须露出实际入口或工作内容。

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
3. `src/modules/app_center/views/ppc_search_terms/style.css`
4. `src/modules/app_center/views/keyword_hunter/keyword_hunter_style.css`
5. `src/modules/app_center/views/master_analysis/scraper/scraper_style.css`
6. `src/modules/app_center/views/playground/styles.css`

### M4：建立视觉回归基线

- 390px、768px、1440px 覆盖首页和核心模块。
- light / dark / reduced-motion 至少覆盖核心工具页。
- loading、empty、error、toast、modal、progress 需要单独截图样本。

---

## 8. 验收标准

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

---

## 9. 和现有文档的关系

- 本文是主题系统的上层规范，回答“颜色、token、组件和例外怎么决策”。
- `docs/VISUAL_DESIGN_GUIDELINES.md` 是页面视觉和 welcome banner 的详细执行规范。
- `src/css/README.md` 是 CSS 目录和组件使用说明。
- `src/css/QUICK-REFERENCE.md` 是变量和组件类速查，不作为主题决策源。

当文档冲突时，优先级为：

1. 本文的主题系统分层和验收规则。
2. `VISUAL_DESIGN_GUIDELINES.md` 的页面和 banner 细则。
3. `src/css/README.md` 与 `QUICK-REFERENCE.md` 的实现速查。

