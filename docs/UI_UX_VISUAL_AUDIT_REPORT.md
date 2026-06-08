# sops 视觉设计审计报告

审计日期：2026-06-08

## 1. 审计结论

本项目的产品定位更接近“亚马逊运营管理工作台 / 内部 SaaS 工具”，不是营销官网。视觉设计的优先级应是：信息可扫读、操作路径稳定、移动端可用、组件状态清晰、设计 token 统一、表单与数据表可靠。

当前桌面端核心页面已经具备可用的信息结构，但整体视觉方案存在三个系统性风险：

1. 移动端模块页不可用：侧边栏在移动端仍占据约 256px，主内容被压缩到约 134px，导致正文竖排式断行和核心任务无法完成。
2. 视觉系统碎片化：全局 token 已存在，但模块内又维护多套局部色彩、圆角、阴影、渐变和欢迎横幅特效，长期会放大维护成本和视觉漂移。
3. 首屏产品气质偏营销：主页使用沉浸式大字、装饰动画和隐藏默认鼠标指针，更像品牌展示页，不像运营人员进入工具后的工作台。

综合判断：

| 维度 | 评级 | 说明 |
| --- | --- | --- |
| 桌面端可用性 | B- | App Center、SOPS、PPC 等页面结构基本成立，能支撑工作流。 |
| 移动端可用性 | D | 多个模块页主内容宽度不足，属于阻断级问题。 |
| 视觉一致性 | C | 全局 token 基础不错，但模块局部系统过多。 |
| 信息架构 | B- | 分类、路径、卡片入口较清晰；主页首屏与工作台目标不匹配。 |
| 可访问性与交互反馈 | C | reset 层有良好基础，但小触控目标、图标语义、加载空白仍需补齐。 |
| 运营工具适配度 | C+ | 有数据密度和流程入口，但装饰性视觉过强。 |

## 2. 审计范围与方法

审计范围：

- 全局壳层与导航：`index.html`、`src/css/critical.css`
- 设计 token 与基础样式：`src/css/foundation/variables.css`、`src/common/config/design-tokens.ts`、`src/css/foundation/reset.css`
- 主页：`src/modules/home/homeDisplay.css`
- App Center：`src/modules/app_center/app_center_style.css`
- SOPS：`src/modules/sops/sops_style.css` 及相关模板
- PPC 搜索词分析器：`src/modules/app_center/views/ppc_search_terms/style.css`
- Playground：`src/modules/app_center/views/playground/styles.css`
- Amazon 智库：`src/modules/amz_hub/`
- 更多模块：`src/modules/more/`
- 全局 Mega Menu：`index.html`、`src/css/components/header-main.css`、`src/css/components/mega-menu.css`、`src/common/ui/megaMenu.ts`
- 欢迎横幅组件：`src/css/components/welcome-banner.css`

审计方法：

- 静态扫描 CSS / HTML / TS 中的 token、硬编码颜色、渐变、圆角、内联样式、`!important`、图标与装饰结构。
- 使用 Vite 本地服务和 Playwright 截图检查桌面端与移动端关键页面。
- 使用 `ui-ux-pro-max` 的优先级规则作为审计基线：可访问性、触控与交互、性能感知、风格匹配、响应式布局、字体与颜色、动画、表单反馈、导航、图表数据。

关键证据文件：

| 类型 | 文件 |
| --- | --- |
| 运行指标 | `output/playwright/ui-audit-metrics.json` |
| 首页桌面截图 | `output/playwright/ui-audit-home-desktop.png` |
| 首页移动截图 | `output/playwright/ui-audit-home-mobile.png` |
| App Center 桌面截图 | `output/playwright/ui-audit-app-center-desktop-wait.png` |
| App Center 移动截图 | `output/playwright/ui-audit-app-center-mobile.png` |
| PPC 桌面截图 | `output/playwright/ui-audit-ppc-desktop.png` |
| PPC 移动截图 | `output/playwright/ui-audit-ppc-mobile.png` |
| 补充运行指标 | `output/playwright/ui-audit-extra-metrics.json` |
| 质量量化指标 | `output/playwright/ui-audit-quality-metrics.json` |
| AMZ Hub 截图 | `output/playwright/ui-audit-amzHubOverview-desktop.png`、`output/playwright/ui-audit-amzHubOverview-mobile.png` |
| More 截图 | `output/playwright/ui-audit-moreOverview-desktop.png`、`output/playwright/ui-audit-moreOverview-mobile.png` |

静态扫描摘要：

| 项目 | 命中数 | 审计解释 |
| --- | ---: | --- |
| 渐变相关 | 268 | 对内部工具来说偏多，应压缩到少量有功能含义的场景。 |
| 大圆角 / 大圆角类 | 709 | 需要统一圆角阶梯，运营工具卡片建议以 8px 为主。 |
| 内联样式 | 319 | 影响 token 统一和暗色模式一致性。 |
| 十六进制颜色 | 2269 | 包含 token 定义，但模块级硬编码仍明显。 |
| Font Awesome / `fa-*` | 2017 | 当前可保留为项目既有图标体系，但需要统一尺寸、状态和语义。 |
| `!important` | 453 | 部分用于 reset / reduced motion 合理，模块样式中应逐步减少。 |
| 欢迎横幅 / blob 装饰 | 976 | 装饰结构复用过广，弱化了工具界面的专业密度。 |

## 3. 已有优势

1. 全局 token 基础已经存在。

   `src/css/foundation/variables.css` 定义了颜色、字体、阴影、z-index、渐变、focus ring 等基础变量；`src/common/config/design-tokens.ts` 也有语义色与 surface / border / status 映射。这是后续统一视觉系统的关键基础，不需要从零开始。

2. 基础可访问性样式有意识。

   `src/css/foundation/reset.css` 已覆盖 `:focus-visible`、`prefers-reduced-motion`、`forced-colors`、表单控件、触摸行为等基础规则。当前问题主要是模块层没有完全继承这些基础能力。

3. 桌面端工作流结构已有雏形。

   App Center 桌面端有“核心路径”和“应用矩阵”；PPC 页面有导入、阈值设置、分析结果与动作列表；SOPS 页面有分类筛选。这些结构符合运营工具的基本路径。

4. 图标语言相对集中。

   项目大量使用 Font Awesome。虽然不是最佳现代图标选择，但作为既有体系可以继续保留，短期更重要的是统一图标尺寸、对齐、可访问名称和按钮状态。

## 4. 关键问题清单

### P0：移动端模块布局阻断

证据：

- `output/playwright/ui-audit-app-center-mobile.png`
- `output/playwright/ui-audit-ppc-mobile.png`
- `output/playwright/ui-audit-metrics.json`

运行指标显示，移动端 `sops`、`appCenter`、`ppc`、`playground` 路由均出现：

| 路由 | 侧边栏宽度 | 主内容 x | 主内容宽度 |
| --- | ---: | ---: | ---: |
| SOPS mobile | 256px | 256px | 134px |
| App Center mobile | 256px | 256px | 134px |
| PPC mobile | 256px | 256px | 134px |
| Playground mobile | 256px | 256px | 134px |
| AMZ Hub mobile | 256px | 256px | 134px |
| More mobile | 256px | 256px | 134px |

影响：

- 核心标题、描述、表单和卡片被压缩成竖向断字。
- 用户无法正常阅读和完成任务。
- 这不是视觉偏好问题，而是移动端布局失效。

建议整改：

1. 在 `<= 768px` 断点下将侧边栏改为抽屉或临时 overlay，而不是常驻占宽。
2. 移动端主内容容器应满足 `x = 0`、`width = 100vw` 或等价约束。
3. 侧边栏打开时使用遮罩层、关闭按钮和焦点管理；关闭时不占布局空间。
4. 搜索框、分类导航、模块列表在移动端应改为顶部折叠筛选或分段控件。
5. 验收视口至少覆盖 375、390、430、768px；每个模块路由都要截图验证。

### P1：主页首屏与运营工作台定位不匹配

证据：

- `src/modules/home/homeDisplay.css:23` 隐藏默认鼠标指针：`cursor: none`
- `src/modules/home/homeDisplay.css:125` 使用 `clamp(3.5rem, 8vw, 7.5rem)` 的大标题
- `src/modules/home/homeDisplay.css:274` 定义自定义 cursor follower
- `output/playwright/ui-audit-home-desktop.png`

影响：

- 主页像品牌展示或动效封面，不像运营人员需要反复进入的工作台。
- 隐藏默认鼠标指针会降低可预期性，也可能影响部分用户的可访问体验。
- 巨型标题、装饰动画和展示文案占用了首屏，削弱了“下一步做什么”的效率。

建议整改：

1. 将首屏改为工作台：今日待办、最近使用工具、关键 SOP、异常提醒、最近分析结果。
2. 保留品牌表达，但压缩为顶部欢迎条或轻量 banner，避免全屏 hero。
3. 移除 `cursor: none` 和自定义 cursor；内部工具应优先使用系统默认指针。
4. 将装饰动画限制在低优先级区域，并继续遵守 reduced motion。

### P1：视觉系统碎片化

证据：

- 全局 token：`src/css/foundation/variables.css`、`src/common/config/design-tokens.ts`
- App Center 局部系统：`src/modules/app_center/app_center_style.css:93`
- PPC 局部系统：`src/modules/app_center/views/ppc_search_terms/style.css:1`
- 欢迎横幅局部系统：`src/css/components/welcome-banner.css:161`

当前 App Center 定义了 `--app-primary`、`--app-surface`、`--app-radius-*`、`--app-shadow-*`；PPC 又定义 `--ppc-blue`、`--ppc-surface`、`--ppc-border`、`--ppc-shadow`；欢迎横幅继续定义 `--wb-*` 变量和装饰结构。它们并非统一映射到全局语义 token。

影响：

- 同一类控件在不同模块呈现不同圆角、阴影、主色和 hover 状态。
- 暗色模式、主题切换、可访问对比度会变得难以统一验证。
- 新页面容易复制局部样式，进一步扩大视觉漂移。

建议整改：

1. 建立“运营工具语义 token 层”，例如：
   - `--surface-page`
   - `--surface-card`
   - `--surface-subtle`
   - `--border-muted`
   - `--border-strong`
   - `--accent-primary`
   - `--accent-success`
   - `--accent-warning`
   - `--accent-danger`
   - `--radius-control`
   - `--radius-card`
   - `--shadow-card`
   - `--shadow-popover`
2. 将 `--app-*`、`--ppc-*`、`--wb-*` 逐步改为引用全局语义 token，而不是直接定义新色值。
3. 新页面禁止新增未映射的主色、阴影、圆角变量。
4. 每个模块只允许保留少量业务语义变量，例如风险等级色、广告动作色，但这些也要映射到全局 status token。

### P1：装饰性渐变、光球、粒子使用过多

证据：

- `index.html:240` 至 `index.html:242` 使用 `bg-blob` 背景装饰。
- `src/css/components/welcome-banner.css:208` 起定义 `wb-orb`。
- `src/css/components/welcome-banner.css:270` 起定义 `wb-particle`。
- 多个 SOP / App Center 模板在横幅中重复插入 `wb-orb`、`wb-particle`。

影响：

- 对运营工具来说，装饰层比信息层更抢眼。
- 页面之间看起来“都很华丽”，但业务优先级、风险状态、主操作反而不够突出。
- 动效和渐变越多，加载、重绘、暗色模式、截图一致性越难控制。

建议整改：

1. 工具型页面默认不使用 blob / orb / particle。
2. 欢迎横幅保留为信息组件，而不是装饰组件：标题、说明、状态、主操作、辅助标签即可。
3. 渐变只用于少量状态强调或品牌入口，不作为每个卡片和面板的默认背景。
4. 用边框、间距、字重、表格密度建立层级，减少靠色彩和特效制造层级。

### P1：路由加载期间存在明显空白感

证据：

- Playwright 初次截图曾出现 header 已渲染、主内容为空的状态。
- 稳定等待后，各路由 selector ready 时间约 3.3s 至 4.1s。
- `output/playwright/ui-audit-metrics.json` 中桌面 / 移动路由 `loadMs` 多在 3300ms 以上。

影响：

- 用户会感知为页面没响应或模块加载失败。
- 动态导入路由在慢设备或弱网络下会放大空白感。

建议整改：

1. 主内容区域增加路由级 skeleton，而不是空白等待。
2. 侧边栏和页面标题可先渲染稳定占位，再填充模块内容。
3. 对超过 300ms 的异步操作显示加载反馈；超过 1s 使用骨架屏。
4. 将常用模块预取策略限定在首屏后的 idle 时间，避免阻塞首屏。

### P1：圆角、阴影和卡片密度偏展示化

证据：

- App Center 卡片使用 `var(--rounded-xl, 16px)`：`src/modules/app_center/app_center_style.css:300`、`:513`
- 欢迎横幅使用 `var(--rounded-2xl, 24px)`：`src/css/components/welcome-banner.css:435`
- 多处模板使用 `rounded-2xl`、大阴影和渐变面板。

影响：

- 工具页面显得更像展示卡片集合，而不是高频使用的运营台。
- 大圆角和大阴影会减少信息密度，尤其在数据表、筛选器、流程节点中。

建议整改：

1. 建议运营工具主卡片圆角统一为 8px。
2. 弹窗 / 大面板可使用 10px 至 12px，但需要明确 token。
3. 阴影阶梯收敛为 2 至 3 档：卡片、浮层、模态。
4. 流程节点和筛选按钮优先用边框、背景、字重表示状态，减少阴影和浮动 hover。

### P2：触控目标与按钮状态不稳定

证据：

`output/playwright/ui-audit-metrics.json` 记录到可见小目标：

| 页面 | 桌面小目标 | 移动小目标 |
| --- | ---: | ---: |
| SOPS | 6 | 1 |
| App Center | 14 | 1 |
| PPC | 21 | 2 |
| Playground | 9 | 7 |

部分小目标是 icon、状态点、隐藏 input，不一定都是问题；但筛选按钮、侧边栏按钮、icon-only 按钮、select 等可操作元素应统一满足触控面积。

建议整改：

1. 移动端可点击元素目标区域至少 44px 高。
2. icon-only button 必须有可访问名称、tooltip 或视觉文本。
3. 禁用、hover、active、focus、loading 状态应统一。
4. 表单控件在移动端高度建议 40px 至 44px，避免 30px select。

### P2：图标与 emoji 使用需要分层处理

当前项目以 Font Awesome 为主，这可以作为短期标准继续使用，不建议立即大规模迁移图标库。问题在于：

- icon-only 控件需要统一尺寸、可访问名称、焦点样式。
- 业务状态图标应避免用 emoji 充当结构性 UI 图标。
- 报告渲染、知识内容中的 emoji 可以作为内容符号，但不应作为按钮、导航、状态标签的唯一视觉语言。

建议整改：

1. 保留 Font Awesome，建立图标尺寸阶梯：12、14、16、20、24。
2. 导航图标、按钮图标、状态图标分别定义颜色和对齐规则。
3. 结构性图标不使用 emoji；内容文章里的 emoji 需要确认语义和可读性。

### P2：暗色模式与主题一致性存在隐患

证据：

- 全局 token 有暗色主题变量。
- 模块内仍存在大量局部 hex、rgba、内联样式和 `!important`。

影响：

- 暗色模式下可能出现局部低对比、边框不可见、卡片层级反转。
- 后续主题切换需要逐个模块修补。

建议整改：

1. 模块样式中的颜色尽量引用语义 token。
2. 审核所有内联 `style` 中的颜色变量，改为 class 或组件 token。
3. 每个关键页面提供 light / dark 两套截图验收。

## 5. 页面级审计摘要

### 5.1 首页

优点：

- 品牌识别强，视觉完成度高。
- 桌面端没有明显横向溢出。

问题：

- 首屏更像宣传封面，而不是工作台。
- 大标题、装饰背景和自定义 cursor 对内部工具价值有限。
- 移动端需要检查标题、页脚和头部 logo 的换行与遮挡。

建议：

- 将首页重构为“运营总览 + 快速入口 + 待处理事项”。
- 品牌展示下沉为小面积欢迎条。

### 5.2 App Center

优点：

- 桌面端“核心路径 + 应用矩阵”的信息结构清楚。
- 卡片内容包含入口、说明、标签，工作流路径明确。

问题：

- 移动端被侧边栏挤压，主内容不可用。
- 局部 `--app-*` 变量和大圆角 / 渐变面板较多。
- 紫色视觉权重偏高，长期可能形成单一主色观感。

建议：

- 先修移动壳层，再收敛 App Center token。
- 应用卡片用更克制的卡片密度和统一状态规则。

### 5.3 PPC 搜索词分析器

优点：

- 桌面端工作流清晰：导入、设置、分析、结果。
- 操作路径符合 PPC 分析任务。

问题：

- 移动端主内容不可用。
- `--ppc-*` 局部变量、硬编码颜色和渐变较多。
- 表单和结果表需要更强的响应式策略。

建议：

- 移动端采用单列步骤流，结果表改为卡片摘要或横向表格容器。
- 将 PPC 业务状态色映射到全局 status token。

### 5.4 SOPS

优点：

- 分类筛选适合 SOP 导航。
- 业务分组比较明确。

问题：

- 移动端主内容不可用。
- 多处 SOP 内容页重复欢迎横幅装饰结构，页面间差异主要靠颜色和特效。

建议：

- SOP 内容页应优先提高阅读性：标题、步骤、责任人、输入输出、风险提示。
- 欢迎横幅简化为标准模板，去除重复 orb / particle。

### 5.5 Playground

优点：

- 桌面端较克制，接近工具界面。

问题：

- 移动端仍受全局侧边栏布局影响。
- 顶部 icon button、小 select 等触控目标偏小。

建议：

- 移动端使用全宽聊天 / 实验区，线程列表变为抽屉。
- 顶部操作按钮统一 40px 至 44px 触控区域。

### 5.6 Amazon 智库

优点：

- 内容结构按知识、实践、进阶分类，信息架构比单纯文章列表更清楚。
- 桌面端标题、模块区块、卡片入口基本可扫读。
- `amz_quality_listing` 这类内容页有完整方法论结构，适合培训和运营知识沉淀。

问题：

- 移动端同样被全局侧边栏压缩，`#main-content` 仅约 134px。
- 知识内容页存在大量小 checkbox、未显式 label 的输入项和密集内容卡片，移动端可读性与触控性不足。
- AMZ Hub 与 SOPS 一样大量复用欢迎横幅装饰结构，知识内容页不需要每页都以装饰 banner 开场。

建议：

- 先纳入 P0 壳层修复回归范围。
- 知识详情页应采用阅读型排版：稳定行宽、目录锚点、正文 15px 至 16px、关键检查项 44px 触控区域。
- 对培训内容中的 checkbox / checklist 建立统一组件，确保 label 关联和点击区域。

### 5.7 More

优点：

- More Overview 的功能分组清楚，适合作为探索入口。
- Prompts 页面内容密度较高，有分类、搜索、卡片列表和操作按钮。

问题：

- 移动端同样被侧边栏压缩，More Overview / Prompts 均不可正常阅读。
- Prompts 页面存在 `prompt-search` 无显式 label、多个 32px `btn-icon`、39px 分类按钮等小目标。
- More 菜单里“快速访问”存在 `openSettings` 动作入口，但全局审计中没有看到清晰的可访问状态或禁用/失败反馈。

建议：

- Prompts 页面移动端应把分类筛选做成横向可滚动分段控件或抽屉筛选。
- `btn-icon` 统一补 `aria-label`、tooltip 和 40px 至 44px hit area。
- 搜索框增加视觉隐藏 label 或 `aria-label`，不要只依赖 placeholder。

### 5.8 全局导航与 Mega Menu

优点：

- 顶部导航把 SOPs、应用中心、Amazon 智库、更多分成四个一级入口，信息架构方向正确。
- Mega Menu 有 skeleton 初始态，避免菜单内容完全空白。

问题：

- `index.html:85`、`:112`、`:137`、`:163` 的 `nav-trigger` button 没有 `aria-expanded`、`aria-controls` 或明确菜单关系。
- `src/css/components/header-main.css:252` 通过 `.nav-group:hover .mega-menu` 打开菜单，键盘和触摸用户不一定能得到等价体验。
- `src/css/components/header-main.css:585` 在移动端直接隐藏 `.nav-wrapper`，但没有在审计范围内看到等价的模块导航入口补位。
- `src/css/components/mega-menu.css` 已有移动抽屉规则，但当前 `index.html` 使用的是 `.mega-menu` 结构，不是 `.mega-menu-panel`，移动端抽屉规则未必命中当前菜单。

建议：

- 顶部一级导航应支持 click / keyboard 打开，维护 `aria-expanded` 和 `aria-controls`。
- 移动端需要明确的模块入口：顶部菜单按钮、底部导航或模块切换抽屉，不能只隐藏桌面 nav。
- Mega Menu 的移动抽屉样式要与实际 DOM 类名对齐，避免“设计系统里有规则、页面上没用上”的重复问题。

## 6. 补充审计证据与文件级定位

### 6.1 移动端壳层根因定位

移动端侧边栏问题不是单个模块的 CSS 问题，而是应用壳层和设计系统布局类没有对齐。

关键定位：

| 文件 | 位置 | 现象 |
| --- | --- | --- |
| `index.html` | `:238` 至 `:251` | 根布局直接使用 `flex`，侧边栏使用 Tailwind `w-64`，主内容使用 `flex-1`。 |
| `src/common/ui/navigation.ts` | `:79` 至 `:104` | 导航逻辑只在 home / 非 home 之间切换 `hidden`、`-ml-64`，没有移动端抽屉状态。 |
| `src/css/layouts/container.css` | `:704` 至 `:739` | 已有移动端抽屉规则，但选择器是 `.layout-sidebar__aside` / `.layout-app__sidebar`，没有命中当前 `#dynamic-sidebar`。 |

结论：

- 设计系统里已经有“移动端侧栏全屏覆盖”的规则，但应用壳层没有使用对应 class。
- 直接修某个模块页不会解决根因；应该优先修 `#dynamic-sidebar` / `#main-content` 所在壳层。
- P0 修复完成后，所有模块页应一次性受益。

建议拆票：

| 任务 | 文件 | 验收 |
| --- | --- | --- |
| 壳层类名对齐 | `index.html`、`src/css/critical.css` 或专用 layout CSS | `#dynamic-sidebar` 在移动端默认不占宽。 |
| 侧栏开关状态 | `src/common/ui/navigation.ts` 或 header/nav 控制逻辑 | 移动端可打开 / 关闭侧栏，有遮罩和关闭路径。 |
| 主内容宽度断言 | Playwright layout smoke test | 390px 下 `#main-content.width >= 360`，关闭侧栏时 `x = 0`。 |

### 6.2 路由与深链体验风险

补充运行时探针显示：直接访问现代路径时，页面会回到首页内容。例如 `/app-center`、`/app-center/ppc-search-terms`、`/app-center/playground/deep-chat` 在当前运行状态下最终 URL 带上 `#/home`，主内容仍是首页 hero。

相关代码：

- `src/common/router/initRouter.ts:265` 只读取 `window.location.hash`。
- `src/common/router/initRouter.ts:267` 至 `:275` 在没有 hash 时默认导航到 `/home`。
- `src/common/router/initRouter.ts:166` 至 `:172` EventBus 路由会把 routeId 转成现代 path，但初始导航仍以 hash 为主。

影响：

- 视觉验收路径和用户直接访问路径可能不是同一个页面。
- 现代路径看似存在，但刷新 / 直达时可能落回首页。
- 页面截图、视觉回归和真实用户深链体验会产生偏差。

建议：

1. 统一路由入口：要么完全支持现代 history path，要么在测试和文档中明确只使用 hash path。
2. 初始导航不能只看 hash；应同时解析 `window.location.pathname`。
3. 视觉测试应断言页面标题或关键 selector，避免“截到了首页但测试以为是目标页”。

### 6.3 文件级视觉债热点

静态扫描按文件聚合后，热点如下：

| 类别 | 主要热点 | 审计解释 |
| --- | --- | --- |
| 渐变 | `src/modules/app_center/views/keyword_hunter/keyword_hunter_style.css`、`src/modules/app_center/views/ppc_search_terms/style.css`、`src/css/components/welcome-banner.css` | 工具页应减少背景渐变，把渐变留给品牌入口或关键状态。 |
| 大圆角 | `src/modules/app_center/views/master_analysis/ai_analysis/template.html`、`src/modules/sops/views/growth/restricted_words/template.html`、`src/modules/sops/views/service/email_templates/template.html` | 大量 `rounded-2xl` / 大圆角卡片削弱运营工具密度。 |
| 内联样式 | `src/common/devtools/PerformanceMonitor.ts`、`src/common/devtools/MemoryDevTools.ts`、`index.html`、若干模块模板 | devtools 可接受部分内联，但业务模板中的颜色、圆角、滚动条应迁移到 token class。 |
| 硬编码颜色 | `src/modules/app_center/views/ppc_search_terms/style.css`、`src/css/components/mega-menu.css`、`src/css/components/forms.css` | 需要区分 token 定义和模块硬编码；模块硬编码是优先治理对象。 |
| `!important` | `src/modules/app_center/views/playground/deep-chat/index.ts`、`src/modules/app_center/app_center_style.css` | 第三方组件覆盖可保留少量，但模块自有样式应减少层叠对抗。 |
| 欢迎横幅装饰 | `src/css/components/welcome-banner.css`、多个 SOPS / AMZ Hub 模板 | `wb-orb` / `wb-particle` 被广泛复制，建议改为默认无装饰。 |

治理原则：

- 先治理“会复制扩散”的组件：欢迎横幅、侧边栏、卡片、筛选按钮、表单控件。
- 再治理“页面专属但高流量”的模块：App Center、PPC、SOPS Overview。
- devtools 内联样式可以后置，不应抢在用户可见页面之前。

### 6.4 可访问性与语义细节补充

补充运行时与静态检查发现以下细节：

| 问题 | 证据 | 建议 |
| --- | --- | --- |
| 侧边栏搜索框缺少显式 label | `src/common/components/SidebarRenderer.ts:525` 至 `:532` | 增加 `aria-label` 或视觉隐藏 label；placeholder 不能代替 label。 |
| 侧边栏清空按钮是 icon-only | `src/common/components/SidebarRenderer.ts:535` 至 `:541` | 增加 `aria-label="清空侧边栏搜索"`，并把点击区域提升到 32px 或 40px。 |
| SOPS heading 顺序不稳定 | 运行时 heading 顺序中 `h2` 先于 `h1` | 页面主标题应先出现 `h1`，横幅辅助标题不要抢在主标题之前。 |
| Playground 顶部图标按钮依赖 `title` | `src/modules/app_center/views/playground/deep-chat/template.html:36`、`:45` | `title` 可保留，但建议补 `aria-label` 并统一按钮尺寸。 |
| 10px 左右标签较多 | 运行时检测到多个 9px 至 10px badge / metadata | 状态 badge 可小，但正文说明、表格内容、按钮文本不应低于 12px；移动端正文建议 14px 至 16px。 |

### 6.5 现有视觉测试缺口

项目已经有 `tests/visual/visual.test.ts`，覆盖桌面、平板、移动和部分交互状态，这是优势。但从当前审计目标看，仍有几个缺口：

1. 页面列表没有覆盖 App Center Overview、PPC 搜索词分析器、Playground 当前关键路径的稳定深链。
2. 测试以截图对比为主，没有几何断言，无法直接阻止“主内容被侧栏挤成 134px”这类问题。
3. 多个路径仍使用旧 hash route，如 `/#promptlab`、`/#ai_analysis`，需要与当前 router path 规则统一。
4. 截图前只等待 selector，缺少“目标页面内容确实加载”的文本或 landmark 断言。

建议新增一组轻量布局 smoke test：

| 场景 | 断言 |
| --- | --- |
| 390px App Center | `#main-content.x === 0`，`#main-content.width >= 360`，页面包含“应用中心”。 |
| 390px PPC | `#main-content.x === 0`，页面包含“PPC 搜索词分析器”。 |
| 390px SOPS | `#main-content.x === 0`，页面包含“SOPS 流程中心”。 |
| 390px Playground | `#main-content.x === 0`，主要输入区可见。 |
| 1440px 模块页 | 侧边栏可见，主内容宽度大于 1000px，无横向滚动。 |

这组测试比完整视觉回归更轻，适合作为 P0 修复后的防回归门槛。

### 6.6 全项目模块覆盖补充

补充运行指标 `output/playwright/ui-audit-extra-metrics.json` 覆盖了 AMZ Hub 与 More：

| 路由 | 视口 | 主内容 x | 主内容宽度 | 主要问题 |
| --- | --- | ---: | ---: | --- |
| `amz_hub_overview` | mobile 390px | 256px | 134px | 智库总览被侧栏挤压。 |
| `amz_quality_listing` | mobile 390px | 256px | 134px | 长内容页无法阅读，checkbox 触控目标小。 |
| `more_overview` | mobile 390px | 256px | 134px | 探索入口被侧栏挤压。 |
| `more_prompts` | mobile 390px | 256px | 134px | 搜索、分类、卡片操作全部被挤压。 |

补充结论：

- P0 移动端壳层问题影响所有带动态侧栏的一级模块。
- 报告中的移动端验收不应只覆盖 SOPS / App Center / PPC / Playground，还必须纳入 AMZ Hub 和 More。
- 视觉债治理应从壳层和共享组件开始，否则每个模块都会重复暴露同类问题。

### 6.7 质量量化基线

补充探针 `output/playwright/ui-audit-quality-metrics.json` 对 12 个页面在 desktop 与 390px mobile 视口下做了近似检查：

- 主内容几何位置
- 低对比文本风险
- 12px 以下文本
- 小于 44px 的可操作目标
- 缺少显式 label 的 input / select / textarea
- icon-only button 可访问名称
- h1 数量与标题层级跳跃

说明：对比度检测是基于 computed color 与祖先背景色的近似计算，复杂渐变、透明叠层、阴影和加载态可能产生误差。它适合用于定位风险和建立回归门槛，不替代最终 WCAG 人工抽样复核。

量化摘要：

| 页面 | 主要风险 |
| --- | --- |
| `sopsOverview` | desktop / mobile 均有 15 条低对比样本、15 条 12px 以下文本样本；状态 badge 和入口文字对比偏弱。 |
| `appCenterOverview` | desktop / mobile 均有 15 个小目标样本；步骤编号、标签和筛选按钮需要统一尺寸与对比度。 |
| `ppcSearchTerms` | desktop / mobile 均有 11 个缺 label 控件样本、15 个小目标样本；操作按钮禁用态/文本对比偏弱。 |
| `promptlab` | desktop 有 14 个缺 label 控件样本、15 条低对比样本、15 个小目标样本，且缺少 h1。 |
| `scraper` | desktop / mobile 均缺少 h1；部分标签和辅助说明对比不足。 |
| `aiAnalysis` | desktop / mobile 均缺少 h1；关键操作按钮和数字状态对比偏弱。 |
| `playground` | desktop 有 13 个小目标样本，mobile 有 11 个小目标样本；顶部工具和模型选择区需要触控治理。 |
| `amzQualityListing` | mobile 有 15 个小目标样本、15 个缺 label 控件样本、3 处标题层级跳跃；阅读型页面需要单独治理。 |
| `morePrompts` | desktop / mobile 均有 15 条 12px 以下文本样本、15 个小目标样本；分类按钮和卡片操作密度偏高。 |

页面标题结构补充：

| 页面 | 问题 |
| --- | --- |
| `promptlab` | 未检测到 h1。 |
| `scraper` | 未检测到 h1。 |
| `aiAnalysis` | 未检测到 h1。 |
| `playground` | 未检测到 h1。 |
| `amzQualityListing` | mobile 视口出现标题层级跳跃样本。 |
| `morePrompts` | desktop / mobile 均出现 1 处标题层级跳跃样本。 |

建议将这些指标作为整改后的验收门槛：

| 指标 | 建议门槛 |
| --- | --- |
| 移动端主内容 | 390px 下 `#main-content.x = 0`，宽度不低于 360px。 |
| 页面主标题 | 每个核心页面有且仅有一个 h1，首个可见主标题不应从 h2 / h3 开始。 |
| 表单 label | 可见 input / select / textarea 100% 有 label、`aria-label` 或 `aria-labelledby`。 |
| 触控目标 | 移动端主要操作 hit area 不低于 44px；桌面端工具按钮不低于 32px，重要操作不低于 40px。 |
| 文本尺寸 | 正文不低于 14px；状态 badge 可低至 12px；低于 12px 只允许用于非关键信息。 |
| 对比度 | 正文 4.5:1；大号/粗体文本 3:1；禁用态可降低但必须明确不可交互。 |

### 6.8 设计系统治理与 CSS 模块库存

本轮补充运行了项目内已有质量脚本：

- `npm run css:audit`：扫描 `src` 下 53 个 CSS 文件。
- `npm run css:analyze`：分析 10 个模块 CSS 文件，并生成 `docs/css-module-analysis-report.md`。

变量审计结果：

| 指标 | 结果 |
| --- | --- |
| CSS 变量使用总数 | 3738 |
| 符合当前命名规则 | 1730（46.3%） |
| 不符合当前命名规则 | 2008 |
| 已废弃变量 | 0 |

说明：当前脚本的命名规则未必覆盖所有合理的组件私有 token，例如 code highlight 或特定微交互 token。但 46.3% 的符合率仍然说明：项目已经有 token 基础，却没有形成稳定的命名边界、迁移规则和新增样式准入标准。

模块 CSS 库存结果：

| 指标 | 结果 |
| --- | --- |
| 分析模块 CSS 文件 | 10 |
| 模块 CSS 总行数 | 4227 |
| 识别重复模式 | 10 类 |
| 卡片模式 | 3 类，18 次出现 |
| 按钮模式 | 1 类，4 次出现 |
| 动画模式 | 2 类，41 次出现 |
| 图标容器模式 | 2 类，3 次出现 |
| 徽章模式 | 2 类，9 次出现 |

样式债补充基线：

| 指标 | `src/css` + `src/modules` 计数 |
| --- | ---: |
| 硬编码 hex 颜色 | 1663 |
| 渐变 | 264 |
| `border-radius` 声明 | 454 |
| `box-shadow` 声明 | 309 |
| `!important` | 450 |
| `@keyframes` | 175 |
| `backdrop-filter` / blur filter | 49 |
| `transition: all` | 106 |
| inline `style` / `.style.` | 510 |

私有 token 命名空间补充：

| 命名空间 | 计数 | 判断 |
| --- | ---: | --- |
| `--app-*` | 104 | App Center 已形成局部系统，但应映射到全局语义 token。 |
| `--ppc-*` | 63 | PPC 搜索词分析器拥有独立品牌色和交互动效，应先做 token 对照表。 |
| `--amzf-*` / `--amzpa-*` / `--amzpt-*` | 153 | AMZ Hub 实践页存在多套局部命名，需要按内容页模板收敛。 |
| `--wb-*` | 287 | Welcome Banner 装饰 token 占比高，需限制使用场景。 |
| `--card-*` | 115 | 卡片组件已有抽象基础，可作为统一卡片 API 的入口。 |
| `--code-*` / `--syntax-*` / `--json-*` | 303 | 代码高亮类 token 可以保留组件私有命名，但需隔离在 code 组件边界内。 |
| `--micro-*` | 76 | 微交互 token 需要映射到全局 motion scale，并补 `prefers-reduced-motion` 验收。 |

治理建议：

1. 不建议一次性重命名 2008 次变量使用；应先确定“允许的私有命名空间”和“必须映射到全局 token 的命名空间”。
2. 第一批迁移目标应锁定 `--app-*`、`--ppc-*`、welcome banner、卡片、徽章和按钮，因为它们直接影响页面主视觉。
3. `--code-*`、`--syntax-*`、`--json-*` 可暂缓，只要求封装在代码展示组件内，不外溢到业务页面。
4. 新增页面准入规则应比历史清理更严格：不得新增未登记主色、阴影、圆角、动效变量；不得新增 `transition: all`。
5. `docs/css-module-analysis-report.md` 可作为设计系统拆分的辅助证据，但最终整改应以本报告的 P0/P1/P2 顺序为准。

### 6.9 组件层交互与语义审计补充

本轮继续抽样审计共享渲染器、顶部菜单和 HTML 模板。结论是：可访问性问题不是单个页面遗漏，而是多个共享入口没有定义“搜索框、筛选按钮、展开按钮、可点击卡片”的统一语义规范。

共享组件风险：

| 发现 | 证据 | 影响 | 建议 |
| --- | --- | --- | --- |
| Overview 搜索框缺少 label | `src/common/components/OverviewRenderer.ts:163` 至 `:168` | 使用 `OverviewRenderer` 的总览页会继承 placeholder-only 搜索框。 | 增加视觉隐藏 label 或 `aria-label`，并作为 Overview 搜索框标准。 |
| Overview 分类筛选只切换 `.active` | `src/common/components/OverviewRenderer.ts:511` 至 `:517` | 视觉状态与辅助技术状态脱节，键盘/读屏用户不知道当前筛选。 | 过滤按钮使用 `aria-pressed` 或 tablist/radio group 模式，并在事件里同步状态。 |
| Sidebar 分类展开缺少展开语义 | `src/common/components/SidebarRenderer.ts:415` 至 `:447` | 侧边栏分类可展开，但没有 `aria-expanded` / `aria-controls` / 受控区域 id。 | 分类 button 维护展开状态，children 容器补 id 和 hidden 状态。 |
| Sidebar 子项字号和触控偏小 | `src/common/components/SidebarRenderer.ts:496` 至 `:503` | 子路由 label 为 12px，图标容器 22px，移动端和高密度页面可读性弱。 | 移动端使用 14px label、至少 40px 行高；桌面保留紧凑但不低于 32px hit area。 |
| Mega Menu 卡片使用 `div` 承载导航 | `src/common/ui/megaMenu.ts:292` 至 `:297` | 鼠标可点击，但默认不可聚焦，键盘无法完整遍历菜单卡片。 | 改为 `button` / `a`，或至少补 `role="button"`、`tabindex="0"`、键盘事件；推荐直接用原生元素。 |
| 顶部一级菜单仍依赖 hover | `index.html:85`、`:112`、`:137`、`:163` 与 `src/css/components/header-main.css:252` | click、keyboard、touch 打开路径不稳定，移动端 `.nav-wrapper` 直接隐藏。 | 使用按钮点击管理 open state，维护 `aria-expanded`，移动端提供同等入口。 |

HTML 模板 label 静态扫描：

| 指标 | 结果 |
| --- | ---: |
| 扫描 HTML 模板 | 49 |
| 可见 input / select / textarea | 207 |
| 疑似缺少 label / aria 关联 | 196 |

疑似缺 label 热点：

| 文件 | 疑似缺 label 控件 |
| --- | ---: |
| `src/modules/sops/views/growth/npi_tracker/template.html` | 47 / 47 |
| `src/modules/amz_hub/views/practice/quality_listing/template.html` | 24 / 24 |
| `src/modules/sops/views/growth/promotion_submission/template.html` | 20 / 20 |
| `src/modules/app_center/views/ppc_search_terms/template.html` | 15 / 15 |
| `src/modules/app_center/views/master_analysis/promptlab/template.html` | 14 / 15 |
| `src/modules/sops/views/growth/restricted_words/template.html` | 11 / 11 |

说明：该扫描只检查控件本身的 `aria-label` / `aria-labelledby` 与同文件 `label for`，无法识别所有包裹式 label 或框架运行时生成语义，因此结果应作为“疑似风险清单”。但它与 Playwright 质量基线中 PPC、PromptLab、AMZ Quality Listing 的缺 label 样本一致，足以证明需要组件级治理。

非原生交互元素补充：

| 指标 | 结果 |
| --- | ---: |
| `<div>` / `<span>` / `<li>` 上直接挂 `data-action` | 28 |

主要集中在 `src/common/ui/megaMenu.ts:292`、`src/modules/sops/views/overview/template.html` 和 `src/modules/more/views/overview/template.html`。这些卡片应统一为原生 button/link，避免每个页面单独补键盘事件和焦点样式。

### 6.10 状态反馈、弹窗与视觉回归门槛

项目已经有状态反馈基础设施，包括 `SkeletonLoader`、`LoadingManager`、`ErrorBoundary`、Toast、全局进度条和 `AppModal`。问题不在于“没有组件”，而在于这些状态组件没有形成统一的语义、接入规则和视觉回归门槛。

已有基础：

| 能力 | 证据 | 判断 |
| --- | --- | --- |
| 骨架屏生成器 | `src/common/components/SkeletonLoader.ts:12` 至 `:21`、`:292` 至 `:333` | 支持 text/title/card/list/table 等类型，但目前更像工具类，没有形成路由级默认接入。 |
| 统一加载任务管理 | `src/common/utils/LoadingManager.ts:66` 至 `:80`、`:160` 至 `:177` | 能管理多任务和优先级消息，但只切换全局 loading 元素 class。 |
| 错误 / 加载 / 空态渲染 | `src/components/ErrorBoundary.ts:31` 至 `:185` | 有统一 UI，但语义与层级仍偏弱。 |
| Toast 通知 | `src/common/ui/notifications.ts:31` 至 `:79` | 使用 DOM API 创建，文本安全性较好，类型覆盖 success/error/warning/info。 |
| 弹窗组件 | `src/components/modal/AppModal.ts:55` 至 `:89`、`:121` 至 `:153` | 支持打开、关闭、遮罩点击、Esc 关闭。 |
| 动效降级 | `src/css/components/loading.css:384` 至 `:410`、`src/css/components/toast.css:161` 至 `:176` | loading / toast 已有 `prefers-reduced-motion` 降级。 |

状态反馈风险：

| 发现 | 证据 | 影响 | 建议 |
| --- | --- | --- | --- |
| 全局 loading 缺少 live region | `index.html:265` 至 `:279` | LoadingManager 更新文本时，读屏不会稳定感知“正在加载”。 | `#global-loading` 增加 `role="status"`、`aria-live="polite"`；加载期间主区域可设置 `aria-busy="true"`。 |
| ErrorBoundary 状态缺少 `role` | `src/components/ErrorBoundary.ts:61` 至 `:72`、`:110` 至 `:115` | 错误、加载、空态只是视觉块，不是明确的 status / alert。 | error 用 `role="alert"`，loading 用 `role="status"`，空态使用可被 landmark 或标题引用的结构。 |
| 路由加载仍使用小 spinner | `src/common/utils/ModuleLoader.ts:192` 至 `:214` | 模块加载时是小型居中 spinner，不能占位保留页面结构。 | 路由级加载默认使用页面骨架屏；超过 300ms 显示 skeleton，超过 1s 显示进度/说明。 |
| Skeleton API 未形成验收闭环 | `src/common/components/SkeletonLoader.ts:339` 至 `:354` | 有 `showSkeleton` API，但缺少“哪些页面必须用哪种骨架”的规范。 | 定义 route、table、form、content 四类 skeleton，并纳入视觉截图。 |
| Toast 缺少可访问公告和关闭路径 | `index.html:257`、`src/common/ui/notifications.ts:41` 至 `:78` | Toast 自动消失，读屏可能感知不到；长错误信息无法暂停或关闭。 | container 加 `aria-live`；error 使用 assertive 或 alert；长 toast 提供关闭按钮，持续 3-5s。 |
| Toast 文本偏小 | `src/css/components/toast.css:40`、`:70` 至 `:73` | 主文本 13px、描述 11px，在运营工具中可读性偏弱。 | 主文本不低于 14px，描述不低于 12px；移动端宽度适配 320px。 |
| AppModal 缺 dialog 语义和焦点管理 | `src/components/modal/AppModal.ts:413` 至 `:449` | 弹窗打开后没有 `role="dialog"`、`aria-modal`、标题关联、初始焦点和焦点返回。 | panel 增加 dialog 语义；open 时聚焦首个可操作元素或面板；关闭后返回触发器；Tab 焦点限制在弹窗内。 |
| 关键确认弹窗装饰过重 | `src/components/modal/sharedModals.html:1` 至 `:182` | 删除确认和导入冲突使用多层渐变、ping/spin、阴影，容易弱化决策信息。 | 危险操作弹窗用更克制布局：标题、说明、风险、主/次按钮；减少装饰动画。 |

视觉与性能回归缺口：

| 发现 | 证据 | 影响 | 建议 |
| --- | --- | --- | --- |
| visual test 会遮罩状态元素 | `tests/visual/visual.test.ts:131` 至 `:142`、`:163` 至 `:171` | 页面截图稳定，但不能证明 toast、progress、动态结果状态可用。 | 单独增加状态组件截图：loading、empty、error、toast、modal、progress。 |
| 截图等待以 selector 为主 | `tests/visual/visual.test.ts:261` 至 `:276`、`:303` 至 `:315`、`:341` 至 `:353` | 等到容器不等于等到目标内容正确，可能掩盖路由回退和空白态。 | 每页增加文本 / h1 / landmark 断言；移动端增加主内容几何断言。 |
| CLS 测试页面覆盖窄 | `tests/performance/verify-cls-all-pages.test.ts:24` 至 `:41` | 只覆盖首页、Promptlab、AI 分析、Scraper，未覆盖 SOPS、PPC、AMZ Hub、More。 | CLS / loading 验收覆盖全部核心模块和 390px 移动端。 |

### 6.11 数据密集页面、表格与长内容审计补充

数据密集页面不是单纯压缩密度，而是要区分高频操作表格与低频培训长文。前者需要保留桌面端扫描效率，同时给移动端明确的摘要模式；后者需要阅读节奏、目录和可触控清单，而不是继续堆叠 `text-xs` 卡片。

长模板与密度热点：

| 文件 | 行数 | 表格 | 控件 | 小字号命中 | 固定 / 溢出命中 | 判断 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `src/modules/amz_hub/views/practice/quality_listing/template.html` | 1804 | 0 | 24 | 132 | 10 | 培训型长文页，缺阅读模板和清单组件标准。 |
| `src/modules/sops/views/service/email_templates/template.html` | 1711 | 3 | 0 | 151 | 3 | 多语言模板表格密集，适合抽象阅读 + 对照表模式。 |
| `src/modules/sops/views/growth/npi_tracker/template.html` | 1575 | 3 | 47 | 116 | 9 | 典型运营宽表，移动端必须单独治理。 |
| `src/modules/sops/views/growth/ppc_advertising/template.html` | 1487 | 3 | 0 | 125 | 3 | 长培训内容混合多张小字号策略表。 |
| `src/modules/sops/views/growth/restricted_words/template.html` | 1373 | 3 | 11 | 147 | 6 | 风险词库页同时存在长文、筛选和表格。 |
| `src/modules/sops/views/service/qa_maintenance/template.html` | 1277 | 2 | 0 | 130 | 2 | SOP 长内容与表格混排，小字号较多。 |
| `src/modules/sops/views/service/negative_review/template.html` | 1116 | 2 | 7 | 117 | 3 | 服务 SOP 长内容和决策表需要阅读节奏治理。 |

表格热点：

| 页面 | 证据 | 主要风险 | 建议 |
| --- | --- | --- | --- |
| NPI Tracker 主表 | `src/modules/sops/views/growth/npi_tracker/template.html:781` 至 `:823` | `overflow-x-auto`、`text-xs`、`whitespace-nowrap`、多组 colspan 和 `title` 解释表头叠加；桌面可扫读，但移动端只能横向拖拽宽表。 | 桌面保留密度，增加 sticky header / first column、列组说明和 density toggle；移动端改为 SKU 卡片摘要，展示阶段、库存、价格、合规、决策等关键字段。 |
| PPC 搜索词结果表 | `src/modules/app_center/views/ppc_search_terms/template.html:253` 至 `:268` | 9 列结果表只有横向滚动容器，未看到 caption / scope；数值列对齐较好，但移动端缺摘要。 | 表格补 caption、`scope="col"`、排序/筛选状态；移动端按搜索词卡片展示动作、花费、销售额、ACOS、原因。 |
| Restricted Words 表格 | `src/modules/sops/views/growth/restricted_words/template.html:730` 至 `:731`、`:988` 至 `:989`、`:1048` 至 `:1049` | 同页多张表混合小字号，词库主表使用 `min-h-[400px]` 嵌套滚动，移动端容易形成双滚动和读屏上下文丢失。 | 词库主表改为明确筛选区 + 结果区；桌面可 sticky header，移动端按词条卡片展示风险等级、语言、替代词。 |
| SOP 长页表格 | Email Templates、PPC Advertising、QA Maintenance、Negative Review 均有 2 至 3 张表 | 每页自行写 `overflow-x-auto` 和 `text-xs border-collapse`，缺少共享视觉层级、表题和移动策略。 | 建立共享 SOP 表格模式：表题、说明、列语义、数值对齐、滚动提示、移动卡片摘要。 |

长内容页风险：

| 页面 | 证据 | 主要风险 | 建议 |
| --- | --- | --- | --- |
| AMZ Quality Listing | `src/modules/amz_hub/views/practice/quality_listing/template.html:1` 至 `:30`、`:1569` 至 `:1712` | 1804 行培训内容以装饰 banner 开场，后段 24 个 checkbox 视觉尺寸为 16px，虽然包在 label 内，但触控和阅读节奏仍偏紧。 | 使用阅读型模板：目录 / 锚点导航、正文 15px 至 16px、行高 1.6 至 1.75、桌面行宽 65 至 75 字符；检查项组件保证 44px 点击区。 |
| Email Templates / PPC Advertising / QA Maintenance | 静态库存中小字号命中分别为 151、125、130 | 这些页面是培训和作业指南，不应长期用 `text-xs` 承担正文、解释和表格内容。 | `text-xs` 只保留给 badge / 元数据；正文、步骤说明、结果解释不低于 14px，移动端优先 15px 至 16px。 |

数据密集页治理标准：

1. 表格必须有表题或上下文标题，复杂表格补 `caption` 或可被标题引用的说明。
2. 表头使用 `scope="col"` / `scope="row"`，排序、筛选、选择状态通过文本或 ARIA 同步，不只靠颜色。
3. 数字列使用右对齐和 tabular figures；金额、百分比、订单数等列保持稳定宽度。
4. 6 列以上表格必须有移动端方案：卡片摘要优先；保留横向滚动时必须有可见滚动提示、关键列冻结和完整键盘路径。
5. `title` 只可作为补充提示，不能承担表头解释或按钮名称。
6. 长内容页超过 800 行或 6 个主章节时必须提供目录 / 锚点；超过 1200 行应考虑分段路由或折叠章节。
7. `text-xs` 准入规则：badge / metadata 可用；正文说明、表格主体、按钮文本、清单文本不得依赖小字号维持布局。

### 6.12 信息架构、任务流与入口一致性审计补充

当前项目有 5 个一级模块、43 个 manifest 路由：Home 1 个、SOPS 19 个、App Center 9 个、Amazon Hub 10 个、More 4 个。一级信息架构方向是成立的，但入口模式、概览页筛选和跨工具任务流仍不一致。对运营工具而言，用户不只是“进入页面”，还要在“采集 → 分析 → 生成 → SOP 执行”之间保持上下文和方位感。

入口与筛选模式对比：

| 模式 | 证据 | 判断 | 建议 |
| --- | --- | --- | --- |
| App Center Overview 已有较好基线 | `src/modules/app_center/views/overview/template.html:101` 至 `:122`、`src/modules/app_center/views/overview/index.ts:117` 至 `:153` | 有结果计数、`aria-live`、筛选 `aria-pressed`、搜索 label、空态切换；适合作为概览页标准。 | 不要另起一套 Overview 规范，优先把 App Center 的模式沉淀为共享组件。 |
| SOPS 新人任务入口是 `div data-action` | `src/modules/sops/views/overview/template.html:66` 至 `:103` | 卡片表达了高频任务路径，但不是原生 button / link，且跨到 App Center 工具时仍像普通 SOP 卡。 | 任务路径卡片改为链接 / button，并标明跨模块目标；支持键盘和焦点状态。 |
| SOPS / AMZ / More 筛选只改视觉 class | `src/modules/sops/views/overview/index.ts:50` 至 `:68`、`src/modules/amz_hub/views/overview/index.ts:14` 至 `:25`、`src/modules/more/views/overview/index.ts:17` 至 `:28` | 筛选状态没有同步 `aria-pressed`，也没有结果计数和空态提示。 | 迁移到 App Center 的筛选模式：`role="group"`、`aria-pressed`、结果计数、空态和搜索 label。 |
| 共享 OverviewRenderer 仍保留旧模式 | `src/common/components/OverviewRenderer.ts:241` 至 `:255`、`:326` 至 `:330`、`:489` 至 `:517` | 过滤按钮和卡片会继续生成旧语义；如果新页面继续使用它，旧问题会扩散。 | 先改共享 renderer，再替换手写 overview，避免逐页修补。 |

导航与任务流风险：

| 发现 | 证据 | 影响 | 建议 |
| --- | --- | --- | --- |
| 页面级 breadcrumb 只有样式 / 监控概念，没有稳定 UI | 静态搜索主要命中 `src/css/animations/micro-interactions.css:766` 至 `:790` 和监控服务 `addBreadcrumb`，未看到壳层渲染页面位置。 | 43 个路由中，用户进入深层 SOP 或工具页后主要靠侧边栏 active 感知位置；移动端侧栏关闭后方位感更弱。 | 在动态模块壳层提供轻量 breadcrumb 或 page context：一级模块、分类、当前页；当前项使用 `aria-current="page"`。 |
| 顶部 Mega Menu 有 active 样式但缺少脚本状态闭环 | `src/css/components/mega-menu.css:894` 至 `:906` 定义 `.mega-menu-item--active` / `aria-current`；`src/common/ui/megaMenu.ts:292` 至 `:297` 输出卡片但未看到设置 `aria-current`。 | 视觉系统预留了当前位置样式，但实际菜单项难以稳定表示当前页面。 | 路由变化时同步顶部菜单、侧栏、breadcrumb 的 current state。 |
| 路由入口混用 routeId、path、hash 和 EventBus | `src/common/router/initRouter.ts:157` 至 `:173`、`src/modules/app_center/views/keyword_hunter/input/index.ts:378` 至 `:379`、`src/modules/app_center/views/keyword_hunter/process/index.ts:840` 至 `:843`、`src/modules/app_center/views/master_analysis/ai_analysis/components/AlpinePanel.ts:643` 至 `:648` | 同一类“去另一个页面”的动作有不同实现，深链、历史记录、加载态、测试断言难统一。 | 定义单一导航契约：业务 UI 使用 routeId 或标准 path helper；禁止新代码直接写 `window.location.hash`。 |
| 初始导航仍以 hash 为主 | `src/common/router/initRouter.ts:143` 至 `:155`、`:265` 至 `:275` | 现代 path 和 hash path 在视觉测试、刷新、分享链接中容易出现不一致。 | 与 6.2 保持一致：明确当前支持的 URL 模式，并让测试和导航组件使用同一模式。 |
| 多步工具缺统一 stepper / return affordance | Keyword Hunter 输入页完成后进入 process，process 可同步回输入；Scraper 与 AI Analysis 也有互跳 | 用户能完成动作，但界面层没有统一展示“当前在第几步、下一步是什么、返回会保留什么”。 | 对 Keyword Hunter、Scraper → AI Analysis → PromptLab 这类链路提供轻量 stepper、返回按钮和数据保留提示。 |

信息架构治理标准：

1. 概览页统一使用 App Center 模式：搜索 label、筛选 `aria-pressed`、结果计数、空态、可键盘触发的卡片。
2. 跨模块任务路径必须明确目标模块，避免用户把 App Center 工具误认为 SOPS 子页。
3. 所有路由跳转走同一 helper，不在业务组件里直接写 hash。
4. 深层页面必须提供位置感知：breadcrumb、页面副标题或侧栏 current state 至少一种；移动端侧栏关闭时仍要保留当前模块/页面名。
5. 多步工具必须显示当前阶段、下一步和返回路径；返回或跨步不会静默丢失数据。

### 6.13 表单、上传与 AI 输入工作流审计补充

项目的核心价值集中在“输入运营数据 → 处理 / AI 分析 → 输出动作或 Prompt”。因此表单体验不能只看控件是否存在，还要看输入说明、错误定位、执行中状态、结果反馈和数据保留。当前有不少正向基础，但缺少统一的输入工作流标准。

核心输入页库存：

| 页面 | input | textarea | select | file | label | `aria-describedby` | 判断 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `src/modules/app_center/views/ppc_search_terms/template.html` | 12 | 2 | 1 | 1 | 14 | 0 | 标签和流程较完整，但阈值说明、错误说明没有和字段关联。 |
| `src/modules/app_center/views/master_analysis/promptlab/template.html` | 8 | 5 | 2 | 0 | 14 | 0 | 字段多、状态多，缺少字段级 help / error 关联，部分小按钮依赖 `title`。 |
| `src/modules/app_center/views/master_analysis/scraper/template.html` | 1 | 1 | 0 | 1 | 3 | 0 | 上传 / 导入能力强，但多处可点击容器和折叠区缺语义。 |
| `src/modules/app_center/views/master_analysis/ai_analysis/template.html` | 5 | 0 | 0 | 0 | 7 | 0 | 选择面板和目标卡片完整，但展开状态、选择状态和进度公告需要补语义。 |
| `src/modules/app_center/views/keyword_hunter/input/template.html` | 0 | 2 | 0 | 0 | 0 | 0 | 两个核心输入框没有 label，主要依赖 placeholder。 |
| `src/modules/more/views/explore/prompts/template.html` | 1 | 0 | 0 | 0 | 0 | 0 | 搜索框 placeholder-only，弹窗关闭按钮 icon-only。 |
| `src/modules/sops/views/growth/npi_tracker/template.html` | 45 | 0 | 2 | 0 | 2 | 0 | 表格内大量 input / checkbox，属于宽表编辑体验，需要表格治理联动。 |

工作流级发现：

| 页面 / 能力 | 证据 | 优点 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| PPC 数据导入与分析 | `src/modules/app_center/views/ppc_search_terms/template.html:68` 至 `:79`、`:103` 至 `:180`；`src/modules/app_center/views/ppc_search_terms/index.ts:636` 至 `:724`、`:1964` 至 `:1970` | 有流程步骤、文件选择、阈值表单、进度回调、降级结果和按钮 loading。 | 错误多以 toast 或状态行呈现，阈值字段没有 `aria-describedby`，按钮 loading 未同步 `aria-busy` / `role="status"`。 | 保留现有结构，补字段说明关联、分析状态 live region、错误靠近数据导入区显示。 |
| Scraper 导入 / 采集 | `src/modules/app_center/views/master_analysis/scraper/template.html:63` 至 `:83`、`:392` 至 `:404`；`src/modules/app_center/views/master_analysis/scraper/handlers/importHandler.ts:278` 至 `:329`、`:338` 至 `:470` | 文件类型、大小、空文件、数据结构验证较完整，错误文案友好。 | 折叠标题是 clickable div，上传入口和历史项多处用 div 承载点击；错误最终多落在 toast，缺少导入面板内持久错误。 | 折叠区改 button + `aria-expanded`；导入错误显示在上传区域内并可复制；toast 作为辅助提醒。 |
| Keyword Hunter 输入页 | `src/modules/app_center/views/keyword_hunter/input/template.html:96` 至 `:102`、`:172` 至 `:177`；`src/modules/app_center/views/keyword_hunter/input/index.ts:338` 至 `:383` | 有字符 / 关键词统计、清理、粘贴、状态保存和全局进度。 | 核心 textarea 没有 label，错误只 toast“请先输入关键词和文案”，无法定位哪个字段缺失；统计条绝对定位，移动端可能压住输入内容。 | 两个 textarea 补显式 label、helper、`aria-describedby` 和字段级错误；统计条在移动端改为输入框外部。 |
| Keyword Hunter AI 报告 | `src/modules/app_center/views/keyword_hunter/analysis/index.ts:385` 至 `:402`、`:564` 至 `:682` | 按钮有 active / disabled / loading / success 状态，失败后在结果区渲染错误卡和重试按钮。 | loading / error 卡未明确 `role="status"` / `role="alert"`；按钮状态只改 disabled 和文字。 | 作为 AI 执行状态组件样板，补可访问语义后复用到 PromptLab / AI Analysis。 |
| PromptLab 产品 DNA 与 Prompt 输出 | `src/modules/app_center/views/master_analysis/promptlab/template.html:77` 至 `:112`、`:132` 至 `:193`、`:488` 至 `:498`、`:575` 至 `:582` | 有报告缺失提示、字段置信度、生成按钮禁用态、只读输出区。 | 单字段提取按钮 28px 且依赖 `title`；字段提示主要靠 placeholder；输出 textarea 是 12px 等宽正文且有 inline `!important`。 | 提取按钮补 32px 至 40px 点击区和 `aria-label`；字段 help / error 与控件关联；输出区正文至少 13px 至 14px。 |
| AI Analysis 选择面板 | `src/modules/app_center/views/master_analysis/ai_analysis/template.html:67` 至 `:113`、`:169` 至 `:180`、`:383` 至 `:406` | ASIN 与目标选择信息清楚，缺数据时引导去 Scraper。 | 展开按钮缺 `aria-expanded` / `aria-controls`；目标卡片用颜色和勾选表达选择，未看到 `aria-pressed`。 | 折叠面板用 button 语义；目标卡片同步 `aria-pressed`，分析运行时主区域 `aria-busy`。 |
| More Prompts 搜索与弹窗 | `src/modules/more/views/explore/prompts/template.html:41` 至 `:47`、`:81` 至 `:84` | 搜索入口简单直接，弹窗内容分区清楚。 | 搜索框没有 label，关闭按钮 icon-only 无 `aria-label`，语言切换按钮缺 tab 语义。 | 搜索补 label；关闭按钮补名称；语言切换使用 tablist / `aria-selected` 或 segmented control。 |

输入工作流治理标准：

1. 每个 input / textarea / select 必须有可访问名称；复杂字段还要有 `aria-describedby` 关联 helper 或错误。
2. 字段级错误优先显示在字段附近；toast 只做全局提示，不能替代错误定位。
3. 上传 / 导入流程需要持久错误区，显示文件名、失败原因、可重试或清空动作。
4. AI 执行按钮需要同步 disabled、loading 文案、`aria-busy` 或 `role="status"`；执行结束后焦点或结果区域要有可感知变化。
5. 可折叠区域使用 button，维护 `aria-expanded` / `aria-controls`；不要用 clickable div 承载主要配置开合。
6. 大文本输入区的统计、提示、操作按钮不能覆盖正文；移动端应把统计条移到输入框外或保留足够 padding。
7. `title` 只能补充说明，不能作为小按钮唯一名称；icon-only / compact action 必须有 `aria-label`。

### 6.14 指标、分数、进度与状态编码审计补充

项目已经有大量运营指标、AI 置信度、分数徽章、进度条和 Chart.js 图表。当前问题不是“没有数据可视化”，而是可视化规则分散：部分实现已经具备语义基础，部分仍只靠颜色、宽度动画或 canvas 本身表达关键状态。

| 对象 | 证据 | 当前状态 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| AI Analysis 总体置信度 | `src/modules/app_center/views/master_analysis/ai_analysis/template.html:1023` 至 `:1026` | 置信度卡片已有 `role="status"`、`aria-live`、`role="progressbar"`、`aria-valuenow`。 | 这是较好的局部样板，但没有推广到其他进度 / 分数组件。 | 以此为基线定义 confidence / score / progress 语义组件。 |
| AI Analysis 执行进度 | `src/modules/app_center/views/master_analysis/ai_analysis/template.html:650` 至 `:674`、`AlpinePanel.ts:446` 至 `:451` | 执行进度用 `:style="progressStyle"` 改变宽度，步骤高亮依赖 `text-white/80`。 | 读屏不能稳定感知进度值和当前阶段；颜色 / 透明度承担了状态含义。 | 进度容器补 `role="progressbar"`、`aria-valuenow`、当前阶段 live 文案；步骤状态用文本或图标补充。 |
| Keyword Hunter 评分徽章 | `src/modules/app_center/views/keyword_hunter/analysis/index.ts:419` 至 `:548`、`keyword_hunter_style.css:646` 至 `:682` | 评分表格会把 `N/M` 转成高 / 中 / 低 badge，并追加总分进度条；数值使用 `font-variant-numeric: tabular-nums`。 | 分数阈值写在单页逻辑里，进度条是 DOM 注入和 inline style，没有 aria 语义；badge 使用 emoji + 颜色 + 文本，风格和全局 badge 不一致。 | 分数阈值、等级文案、图标、颜色 token、aria label 统一；总分进度条迁移到共享 progress 组件。 |
| Keyword Hunter 翻译 / 覆盖率进度 | `process/template.html:96` 至 `:106`、`:200` 至 `:209`、`process/index.ts:244` 至 `:254`、`:852` 至 `:884` | 翻译按钮和覆盖率条通过 `style.width` 展示 30%、100%、覆盖率百分比。 | 视觉可见但无 `progressbar` 语义；按钮内 10px 百分比在移动端可读性不足。 | 翻译进度和覆盖率补 `aria-valuenow` / `aria-valuetext`，按钮 loading 同步 `aria-busy`，小号百分比不低于可读阈值。 |
| 全局进度条 | `index.html:232` 至 `:233`、`src/common/ui/notifications.ts:84` 至 `:96` | 顶部全局进度条只切换 hidden 和 fill 宽度。 | 用户只能视觉感知，辅助技术无法知道正在加载或进度值。 | `#global-progress` 补 `role="progressbar"`，显示时同步 `aria-valuenow`，隐藏时重置。 |
| Scraper 任务进度 | `scraper/template.html:435` 至 `:439`、`ScraperPanel.ts:139` 至 `:141` | 按任务完成数计算宽度。 | 任务完成进度对读屏不可见；视觉测试还会 mask `.progress-bar-fill`。 | 任务进度补语义和状态文本；视觉回归单独覆盖进度状态，不只在截图中 mask。 |
| PPC KPI 与动作 badge | `ppc_search_terms/template.html:23` 至 `:37`、`style.css:100` 至 `:154`、`:630` 至 `:686` | KPI 标签 / 数值结构清楚，数值使用 tabular figures；动作 badge 文案明确。 | KPI 卡片和动作 badge 使用局部硬编码颜色，缺少统一单位、来源、空态、阈值说明；状态色未映射到全局 token。 | 定义 KPI 卡片字段：label、value、unit、source、empty/loading、trend；动作 badge 映射到全局 status token。 |
| SOPS 阶段 / 状态 badge | `src/modules/sops/sops_style.css:56` 至 `:87`、`:90` 至 `:108` | SOP 状态 badge 10px，阶段 badge 11px；部分颜色用 token，部分用硬编码 hex。 | 阶段和状态在移动端可读性偏弱，且不同模块的状态等级视觉不一致。 | 状态 badge 最小字号、圆角、图标、颜色和文本规范化；阶段标签不只靠颜色区分。 |
| Restricted Words 风险等级 | `restrictedWordsConstants.ts:5` 至 `:12`、`restrictedWordsHandler.ts:418` 至 `:430`、`:511` 至 `:520` | 风险等级有文字说明，但表格列使用 emoji icon、`title` 和 10px 风险 badge。 | 风险等级是高风险决策信息，不能依赖 emoji、颜色和 `title`；动态 Tailwind 类也不利于 token 收敛。 | 用统一风险 badge：等级数字 + 文案 + 图标组件 + `aria-label`，颜色映射到 severity token。 |
| AMZ Hub Chart.js 图表 | `ecosystem/template.html:101` 至 `:103`、`seo_strategy/template.html:38` 至 `:43`、`eu_insights/template.html:73` 至 `:75` | 有 doughnut / radar canvas，部分图表有可见说明和 legend。 | canvas 本身无 `aria-label`、`aria-describedby`、数据表或摘要 fallback；`seo_strategy/index.ts:77` 隐藏 radar ticks。 | 每个图表补标题、可读摘要、数据表 fallback、canvas 描述关联；图表颜色不能作为唯一维度区分。 |

补充验收门槛：

1. 所有确定性进度条使用 `role="progressbar"`、`aria-valuemin`、`aria-valuemax`、`aria-valuenow`；不确定进度使用 `role="status"` 和 live 文案。
2. 分数 / 置信度 / 风险等级必须同时包含数值、等级文案和非颜色线索；阈值集中定义，不能散落在单页逻辑中。
3. KPI 卡片必须明确 label、value、unit、source、empty/loading/error 状态；数值使用 tabular figures。
4. Chart.js / canvas 图表必须有标题、摘要、图例、tooltip 和可读数据 fallback；雷达图 / 环形图不能只靠颜色或图形面积传递结论。
5. 视觉回归需要为 progress、score badge、confidence card、risk badge、chart canvas 单独留截图或断言；动态进度可 mask，但必须另有状态测试覆盖。

### 6.15 主题、暗色模式与高对比模式审计补充

当前项目有主题系统、dark CSS 和高对比基础，但它们不是同一个契约：品牌主题、明暗模式、系统偏好和 Zustand 状态分别存在，缺少统一的 DOM 标记和验收路径。

| 对象 | 证据 | 当前状态 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| 主题 DOM 标记 | `src/common/config/themes.ts:236` 至 `:250`、`src/common/config/themeConfig.ts:84` 至 `:123` | `applyTheme()` 会把品牌主题 id 写入 `data-theme`，例如 `blue`、`ocean`、`forest`。 | CSS 暗色规则大量依赖 `[data-theme="dark"]`；品牌主题和明暗模式共用同一属性，语义冲突。 | 分离 `data-brand-theme` 与 `data-color-mode`，或保留 `.dark` 专门承载明暗模式。 |
| Zustand UI theme | `src/stores/useAppStore.ts:198` 至 `:204`、`:240` 至 `:243` | `ui.theme` 支持 `light` / `dark` / `auto`，但 `setTheme` 只改 store。 | 状态里显示 dark 不等于 DOM 生效；测试和用户设置可能以为已切换，但页面仍是浅色主题。 | `setTheme` 统一驱动 DOM、storage、系统偏好监听和 ThemeManager，不保留两套主题入口。 |
| 全局暗色 token | `src/css/foundation/variables.css:686` 至 `:758` | `.dark, [data-theme="dark"]` 覆盖主色、背景、边框、状态色。 | 变量基础存在，但 `--color-primary-light` 重复定义，`--color-amber-400` 在 dark block 中被改成 rgba，容易污染基础色板。 | 暗色块只覆盖语义 token，不覆盖基础色板；重复变量纳入 token lint。 |
| 系统 dark 与显式 dark | `src/css/components/welcome-banner.css:817` 至 `:826`、`:1390` 至 `:1395`、`src/modules/sops/sops_style.css:425` 至 `:442` | 部分组件用 `@media (prefers-color-scheme: dark)`，部分用 `.dark` / `[data-theme="dark"]`。 | 用户显式主题、系统偏好和品牌主题可能得到不同结果；同一页面会出现局部暗色、局部浅色。 | 先定义优先级：用户显式选择 > system auto；所有组件统一读取 `data-color-mode` 或 `.dark`。 |
| 原生控件色彩方案 | `src/css/foundation/reset.css:95` 至 `:96`、`:956` 至 `:959` | `:root` 声明 `color-scheme: light dark`，dark 选择器声明 `color-scheme: dark`。 | 在页面大量 `bg-white` 固定浅色时，浏览器原生控件可能变暗但卡片仍浅，形成混合界面。 | 只有在明暗模式真正同步时声明对应 `color-scheme`；表单控件用语义 surface token。 |
| 模块浅色硬编码 | `src/modules/home/homeDisplay.css:6` 至 `:17`、AMZ Hub 知识页多处 `bg-white` / `text-slate-*` / inline 浅色渐变、`npi_tracker/index.ts:159` 至 `:161` | 主页、AMZ Hub、NPI 等页面仍大量固定浅色背景和文字。 | 暗色模式开启后模块主内容不会自动变暗，sticky 列和图表容器更容易出现对比反转。 | 阅读页、图表页、宽表页优先迁移到 `surface` / `on-surface` / `border` token。 |
| 高对比模式 | `src/css/foundation/reset.css:1076` 至 `:1097`、`src/css/components/mega-menu.css:2018`、`forms.css:1430` | reset、Mega Menu、forms、cards 等共享层有 `forced-colors` 基础。 | 模块内自定义 badge、inline style、Chart.js canvas、emoji 状态不能保证高对比可读。 | forced-colors smoke 覆盖导航、表单、badge、table、chart fallback；状态不依赖背景色。 |
| 视觉测试覆盖 | `tests/visual/visual.test.ts:499` 至 `:522` | dark mode 视觉测试只有首页桌面截图，使用 Playwright `colorScheme: 'dark'`。 | 真正高风险的 App Center、PPC、SOPS、AMZ Hub、More 没有 dark 截图；也没有验证显式主题切换。 | dark 截图覆盖首页 + 6 个模块 + 关键工具页，并分别测试 system dark 和显式 `data-color-mode="dark"`。 |

主题治理优先级建议：

1. 先拆分概念：品牌色主题不等于明暗模式；模块 `themeColor` 不等于 color mode。
2. 建立单一主题入口：`light` / `dark` / `auto` 写入 DOM、store、storage，并监听系统偏好变化。
3. 暗色 CSS 只覆盖语义 token；模块不能覆盖基础 palette token。
4. 对 `bg-white`、`text-slate-*`、浅色 inline gradient、Chart.js grid / tick 颜色建立迁移清单。
5. 验收同时覆盖 light、dark、forced-colors；截图之外还要跑 contrast / focus / form control smoke。

### 6.16 动效、微交互与 reduced-motion 审计补充

项目已经建设了较完整的动画基础设施，但动效来源过多：全局动画库、AnimationManager、按钮涟漪、表单动画、列表交错、welcome banner 粒子、首页 canvas、模块私有 keyframes 同时存在。当前最大风险不是“缺少动效”，而是动效契约没有收敛到业务含义和验收规则。

| 对象 | 证据 | 当前状态 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| 全局动画管理器 | `src/services/animation-manager.ts:37` 至 `:52`、`:175` 至 `:190`、`:214` 至 `:229` | 能读取配置、监听 `prefers-reduced-motion`，并写入 `data-animations` / `data-animation-speed`。 | 基础能力存在，但模块级 CSS / JS 动画不一定都读取这个契约。 | 将 `data-animations` 作为唯一运行时开关；新增动画必须声明类别和 reduced-motion 行为。 |
| 微交互初始化 | `src/main.ts:325` 至 `:383` | 启动时初始化 AnimationStore、图片 fade-in、按钮 ripple、表单动画、列表交错观察器。 | 这些微交互在内部工具中应服务反馈和定位；若默认全开，会增加主线程观察器、截图噪声和感知复杂度。 | 默认只启用反馈型动效：press、focus、loading、toast；装饰型和列表交错按页面显式启用。 |
| CSS 动画库 | `src/css/animations/keyframes.css:1` 至 `:27`、静态计数 `@keyframes` 94 个；`micro-interactions.css:1` 至 `:15` | 全局 keyframes 库覆盖页面、抽屉、toast、skeleton、ripple、列表交错等。 | 动画能力过宽，页面容易随手套用；很难判断哪些是产品标准，哪些是遗留装饰。 | 定义 motion scale：duration、easing、用途、允许属性；未登记 keyframes 不再新增。 |
| 动画速度控制冲突 | `micro-interactions.css:668` 至 `:678`、`animation-controls.css:62` 至 `:100` | 两套速度控制同时存在；一处写 `calc(var(--animation-speed-multiplier) * 1s)`，另一处写 `calc(var(--animation-speed-multiplier, 1) * 0.7)`。 | CSS 速度控制语义不一致，后者缺少时间单位，可能无法按预期生效。 | 保留一套速度控制实现，所有动画 duration 用 token 表达，不直接覆盖所有元素 duration。 |
| 首页 canvas 与自定义 cursor | `homeDisplay.ts:160` 至 `:182`、`:340` 至 `:362`、`homeDisplay.css:274` 至 `:283` | 首页会启动 `requestAnimationFrame` 粒子循环、监听 mousemove，并渲染 cursor follower。 | 首页作为工作台入口不应依赖持续装饰动画；未看到 reduced-motion 分支。 | 主页工作台化时移除 cursor / 粒子循环，或至少在 reduced-motion 下不启动 canvas 动画。 |
| Welcome Banner 粒子 | `welcome-banner.css:270` 至 `:318`、`:780` 至 `:788`、`:800` 至 `:814` | 粒子、orb、tag、badge 都有动画 / transition；reduced-motion 有禁用块。 | banner 作为复用组件承载过多装饰，放大模块视觉噪声；颜色 / 背景 transition 也会影响截图稳定性。 | 默认横幅无粒子；只有品牌展示页可显式开启装饰层。 |
| Scraper 模块私有动画 | `scraper_style.css:28` 至 `:48`、`:239` 至 `:252`、`:935` 至 `:940` | Scraper 有 16 个私有 keyframes、29 处 `transition: all`，reduced-motion 用整页 `*` 降时长。 | 这是动效热点；整页 reduced-motion 兜底过粗，可能掩盖不该存在的装饰动画。 | 保留 scraping/progress 反馈，删除或降级 particle、float、pulseGlow；逐个替换 `transition: all`。 |
| AI Analysis 动效 | `ai_analysis_style.css:132` 至 `:134`、`:399` 至 `:410`、`template.html:650` 至 `:674` | 按钮使用 `transition: all`；reduced-motion 只覆盖 slider thumb；分析进度有 shimmer。 | 执行进度动效是有业务意义的，但 reduced-motion 覆盖不完整。 | 分析进度保留宽度变化和阶段文本，禁用 shimmer / pulse；按钮 transition 指定属性。 |
| 危险 / 冲突弹窗装饰 | `src/components/modal/sharedModals.html:1` 至 `:18`、`:120` 至 `:128` | 导入冲突和删除确认使用 `animate-ping`、`animate-spin`、渐变和纹理。 | 高风险确认场景应优先清晰，不应让装饰动画抢注意力。 | 危险弹窗只保留稳定图标、风险说明和主次动作；禁用 ping / spin。 |
| 视觉测试稳定性 | `tests/visual/visual.test.ts:43` 至 `:48`、`:128` 至 `:142`、`:163` 至 `:171`、`:278` 至 `:290` | 截图配置 `animations: 'disabled'`，并 mask `.animate-*`、progress、toast、task card 等动态区。 | 截图稳定，但不能证明真实动效、loading、progress、toast 可用；动态区域被遮罩后容易漏掉布局和层级问题。 | 增加 motion smoke：normal 与 reduced-motion 两套截图；动态组件不只 mask，还要有专门状态截图。 |

动效治理原则：

1. 动效只服务反馈、空间关系、加载状态和焦点变化；装饰型循环动画默认关闭。
2. 所有 motion token 统一到 duration / easing / delay / category；禁止新增 `transition: all`。
3. `prefers-reduced-motion` 不只是缩短 duration，还要停止 shimmer、particle、pulse、spin、canvas loop 等非必要循环。
4. 视觉测试可 mask 随机内容，但必须为 loading、toast、progress、modal、banner、chart 等动态组件增加独立状态截图。
5. 首页和运营工具页面优先静态、可扫读；动效强度应低于内容层级和任务路径。

### 6.17 键盘可达性、焦点状态与可点击语义审计补充

当前项目已经有全局 `:focus-visible` 基础，也有少数页面把卡片、筛选、折叠控件做到了较好的键盘语义。但这些能力还没有形成跨模块契约：同样是“总览入口卡片”或“筛选按钮”，App Center 可键盘触发，SOPS / More / 共享渲染器则仍大量依赖 `div + click`。

| 对象 | 证据 | 当前状态 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| App Center Overview 基线 | `src/modules/app_center/views/overview/template.html:105` 至 `:117`、`:133`、`:163`、`:193`、`:217`，`index.ts:93` 至 `:121` | 分类筛选使用 button + `aria-pressed`，入口卡片有 `role="button"` / `tabindex="0"`，并支持 Enter / Space。 | 这是项目内较好的局部实现，但还没有回灌到共享 OverviewRenderer。 | 把 App Center Overview 抽为总览页验收基线：筛选状态、搜索 label、结果计数、空态、卡片键盘触发都必须齐全。 |
| PPC 搜索词页交互语义 | `src/modules/app_center/views/ppc_search_terms/template.html:140`、`:194` 至 `:212`，`index.ts:1534` 至 `:1537`、`:1875` 至 `:1876`，`style.css:256` 至 `:264` | 分析设置使用 `aria-expanded` / `aria-controls`；筛选按钮同步 `aria-pressed`；焦点样式覆盖主要操作。 | PPC 已经证明模块内可达到较高交互语义，但这种模式没有成为表单 / 数据页通用规则。 | 把 PPC 的 settings toggle、filter button、Escape 清搜索和 focus-visible 样式整理成工具页组件规范。 |
| 共享 OverviewRenderer | `src/common/components/OverviewRenderer.ts:327`、`:354`、`:383`、`:415`、`:491` 至 `:517` | 多种布局的卡片都是 `div data-action="switch-tab"`，事件只监听 click；筛选只切换 `.active`。 | 共享渲染器一旦用于新模块，会持续复制鼠标可用、键盘不可达的入口。 | 路由入口直接渲染为 button / link；如必须保留非原生容器，也要补 `role`、`tabindex`、Enter / Space、`aria-pressed`。 |
| Mega Menu 与顶部导航 | `src/common/ui/megaMenu.ts:292` 至 `:297`、`src/css/components/header-main.css:252`、`src/css/components/mega-menu.css:1902` 至 `:1923` | 菜单卡片是 `div data-action`；CSS 有焦点样式，但一级菜单主要依赖 hover 打开。 | 键盘和触摸用户可能无法打开、遍历、关闭菜单；视觉焦点样式存在但交互状态不完整。 | 一级触发器维护 `aria-expanded` / `aria-controls`；菜单项使用原生链接或 button；Esc 关闭后焦点返回触发器。 |
| 旧模块总览入口 | `src/modules/sops/views/overview/template.html:66`、`:78`、`:90`、`:102`，`src/modules/more/views/overview/template.html:68`、`:83`、`:98`，`src/modules/amz_hub/views/overview/template.html:117`、`:141` | 高频入口卡片仍是非原生可点击容器。 | 同类入口在不同模块行为不一致，键盘用户无法稳定进入 SOP、More、AMZ Hub 的主要路径。 | 旧总览页迁移到 App Center 模式；跨模块卡片明确目标、可聚焦、Enter / Space 可触发。 |
| 折叠 / 长内容头部 | `src/modules/sops/views/service/email_templates/template.html:308`、`:400`、`:463`、`:506`、`:581`、`:624`，`src/modules/app_center/views/master_analysis/scraper/template.html:63`、`:249`、`:370` | 多处折叠标题或历史项用 `div.cursor-pointer` / Alpine click。 | 折叠状态对读屏不可见，键盘无法自然展开，长内容页面的可扫读入口失效。 | 折叠触发器统一为 button，并维护 `aria-expanded`、`aria-controls`、可见 focus 状态。 |
| 焦点样式基础 | `src/css/foundation/reset.css:807` 至 `:818`、`src/css/utilities/interactive.css:449` 至 `:474`、`src/css/components/cards.css:1332` 至 `:1334` | 全局和组件层都有 focus-visible 基础；模块内仍有多处 `outline: none` 或 `focus:outline-none`。 | 不能简单判断为“无焦点样式”，但缺少准入规则时，新页面可能移除 outline 后没有等价替代。 | 规定移除 outline 的条件：必须提供 2px 以上可见 ring、足够对比度、键盘截图验收。 |
| 现有测试覆盖 | `tests/e2e/ai-analysis-confidence.spec.ts:405` 至 `:428`、`tests/visual/visual.test.ts:427` 至 `:488` | 有基础 keyboard / focus 测试，但多为“按 Tab 后有元素获得焦点”或单组件截图。 | 测试不能证明核心路径可用：菜单打开、卡片触发、弹窗关闭、焦点返回、筛选状态同步仍可能漏掉。 | 增加交互 smoke：Tab 顺序、Enter / Space 激活、Esc 关闭、`aria-current`、`aria-pressed`、`aria-expanded`、焦点返回。 |

键盘 / 焦点治理原则：

1. 所有可点击导航入口优先用 `<a>` 或 `<button>`；`div role="button"` 只作为过渡方案。
2. 所有切换态控件必须同步视觉状态与语义状态：`aria-pressed`、`aria-expanded`、`aria-current`、`aria-controls`。
3. hover 不能是唯一入口；顶部菜单、卡片、折叠区、清空按钮、弹窗关闭都必须有键盘路径。
4. 移除 outline 时必须提供等价或更强的 focus-visible 样式，并纳入截图 / smoke 验收。
5. 弹窗、菜单、抽屉必须定义初始焦点、Tab 边界、Esc 关闭和关闭后的焦点返回。

### 6.18 视觉资产、图标系统、emoji 与空状态审计补充

项目当前不是图片资产驱动，而是“Font Awesome 图标 + 渐变背景 + emoji + 文本卡片”驱动。对于内部运营工具，这种轻资产策略可以降低维护成本；但没有图标目录、品牌资产单一来源和空状态模板时，页面会继续靠临场搭配产生视觉差异。

| 对象 | 证据 | 当前状态 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| 静态视觉资产库存 | 静态资产扫描仅发现 `public/logo.svg`；`src` 和 `index.html` 未发现业务 `<img>` / `alt`；`index.html:9` 至 `:11` 使用 data URI favicon。 | 项目几乎没有独立图片资产，品牌图形主要是 favicon、页头 inline SVG 和装饰 SVG。 | 资产轻量是优势，但没有资产清单；同一 logo 在 `public/logo.svg`、favicon data URI、页头 inline SVG 中重复维护。 | 建立 `assets/brand` 或等价清单，logo / favicon / app mark 使用同一来源生成；品牌色使用 token，不在多个 SVG 中手写。 |
| Logo 色彩与来源 | `public/logo.svg:4` 至 `:8` 使用 `#4285F4` / `#9B72F2` / `#D96570`；`index.html:54` 至 `:59` 使用 `#6366f1` / `#a855f7` / `#ec4899`。 | 同一图形的渐变色不一致，且 favicon 和 header 各自内联。 | 品牌入口在不同尺寸和主题下可能不一致；后续暗色 / 高对比适配要改多处。 | Logo 只保留一套源文件和色彩 token；header 使用引用或组件化 SVG，favicon 由构建脚本或固定资源派生。 |
| Font Awesome 依赖 | `index.html:21` 至 `:23` 预加载并从 CDN 引入 Font Awesome；静态扫描 `fa-` 命中 1802 行。 | 图标系统实际依赖 Font Awesome 字体，菜单、按钮、状态、空态、长内容都直接写 class。 | 字体加载失败时大面积图标缺失；图标含义、尺寸、线性/实心风格和语义名称没有统一目录。 | 建立 icon registry：业务含义 -> 图标名 -> 尺寸 -> 颜色 token -> 是否装饰；关键图标可迁移到内联 SVG / 组件。 |
| 图标使用入口分散 | `src/common/config/menuConfig.ts:112` 至 `:336`、`src/common/ui/notifications.ts:45` 至 `:54`、`src/modules/amz_hub/views/practice/promo_tools/index.ts:50` 至 `:457`、`src/modules/more/views/explore/prompts/index.ts:69`、`:222`、`:251` | 有菜单配置、通知图标 map、页面私有 icon 数据和 `appendIcon()` helper，但没有统一规范。 | 同一概念可能在不同页面使用不同图标；状态图标颜色和文本关系不可控。 | 收敛为共享 icon helper / registry；通知、菜单、状态、空态和内容装饰分别定义允许图标集。 |
| UI emoji 使用 | 模板 / 模块非注释 UI emoji 命中约 297 行；例如 `src/modules/sops/views/service/qa_maintenance/template.html:849`、`:890`、`:913` 同时使用 Font Awesome 和 ✅ / ⚠️ / ❌；`src/modules/app_center/views/master_analysis/promptlab/components/reportRenderer.ts:193` 至 `:201` 用 emoji 作为分析目标图标。 | emoji 同时承担内容语气、状态标识和结构图标。 | emoji 样式由系统字体决定，不同平台尺寸、色彩、基线不一致；结构性状态也会和 Font Awesome 重复。 | 内容型 emoji 可保留在 SOP 文案中；结构性 UI、状态、导航和标题图标统一迁移到 icon registry，状态必须有文本。 |
| 空状态视觉模式 | `src/modules/app_center/views/ppc_search_terms/template.html:247` 至 `:253`、`src/modules/app_center/views/keyword_hunter/analysis/template.html:117` 至 `:150`、`src/modules/more/views/explore/prompts/index.ts:249` 至 `:258`、`src/common/infrastructure/SafeModuleLoader.ts:918` 至 `:930` | PPC 空状态简洁且带下一步；Keyword Hunter 空状态有多层装饰和 bounce / pulse；More prompts 极简；SafeModuleLoader 使用 inline SVG。 | 空状态密度、动效、行动建议和可访问语义不一致；装饰型空状态容易和工具页任务优先级冲突。 | 定义 empty state 模板：标题、原因、下一步、主操作、可选插图；默认无装饰动效，插图尺寸和语义固定。 |
| 业务图片缺位 | `src/modules/amz_hub/views/practice/quality_listing/template.html:622` 至 `:630`、`:1332` 至 `:1348` 讲图片质量问题，但页面没有实际示例图。 | 长内容页大量讲视觉规则、Listing 图片、A+ 内容，但主要靠文字、emoji、色块表达。 | 用户需要判断真实图片质量时，纯文字说明不够；但随意加入图片会增加版权、体积和维护风险。 | 只在高价值 SOP 中补受控示例：自制示意图、截图占位、对比表或可复用 diagram；所有图片必须有尺寸、alt、懒加载和版权来源。 |
| 图标 / 资产测试覆盖 | `tests/visual/visual.test.ts:381` 至 `:406` 有组件截图；未看到图标字体加载失败、空状态、品牌资产一致性或 image alt 的专项检查。 | 视觉测试会看整体页面，但不验证图标是否来自同一系统，也不验证空状态模板。 | CDN 字体失败、emoji 替换、空状态溢出和暗色下图标对比可能漏过。 | 增加 asset smoke：logo 来源一致、关键图标可见、空状态截图、图片必须有 alt / width / height / lazy 策略。 |

视觉资产治理原则：

1. 运营工具默认不需要大量图片；需要的是稳定的图标、空状态和状态标识系统。
2. 品牌资产只有一个源文件；favicon、页头 logo、PWA / 分享图从同一源派生。
3. Font Awesome 可继续作为过渡，但业务代码不直接散写图标 class；通过 registry 表达含义。
4. emoji 只用于内容语气和示例文案；不用于导航、按钮、状态 badge、表格状态和核心标题图标。
5. 新增图片必须声明来源、尺寸、alt、加载策略和暗色 / 高对比适配。

### 6.19 视觉性能、字体加载与首屏稳定性审计补充

项目已经有 critical CSS、动态 CSS import、模块 CSS 注册表、图片懒加载、PerformanceObserver 和 Lighthouse 配置。当前风险不在“完全没有性能意识”，而在这些能力没有形成可验证的视觉稳定契约：字体、图标、主样式、模块样式和路由内容的 ready 状态仍然分散。

| 对象 | 证据 | 当前状态 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| 外部字体关键路径 | `index.html:21` 至 `:23` 从 BootCDN 加载 Font Awesome 6.4.2；`:26` 至 `:34` 从 Google Fonts 加载 DM Sans / Syne / JetBrains Mono，使用 `display=swap`。 | 字体显示有 swap 基础，但首屏文字和图标都依赖外部域名；Font Awesome CSS 仍是 render-blocking stylesheet。 | 网络或区域访问波动会影响图标、字重和标题宽度；swap 可能造成首屏字体跳变，尤其是 Syne 标题和 JetBrains Mono 小字。 | 核心字体和图标自托管或由构建产物提供；只保留必要字重；字体 ready / fallback 截图纳入 smoke。 |
| Font Awesome 版本漂移 | `package.json:144` 依赖 `@fortawesome/fontawesome-free` `^7.1.0`；`index.html:21` 至 `:23` 加载 CDN 6.4.2。 | 项目同时存在 npm 依赖和 CDN 依赖，版本不一致。 | 开发、构建、离线和生产可能使用不同图标集；图标缺失或类名差异不容易被测试捕获。 | 选择单一来源：要么使用本地 npm 包并由 Vite 打包，要么明确 CDN 版本锁定且不保留未使用依赖。 |
| 字体 token 与页面回退 | `src/css/foundation/variables.css:35` 至 `:38`、`src/css/critical.css:19` 至 `:20` 使用 DM Sans / Syne / JetBrains Mono；`src/modules/home/homeDisplay.css:2`、`:16` 声称移除 Google Fonts 并使用系统字体；`src/css/foundation/reset.css:81` 设置 `font-size-adjust: none`。 | 全局字体 token 和首页字体策略不一致；fallback 只写族名，没有度量校准。 | 同一品牌入口在首页和应用壳层字形不一致；字体加载前后可能造成文字宽度和按钮尺寸轻微跳动。 | 明确字体策略：运营工具优先系统字体，品牌页可使用展示字体；如保留 Web Font，配置 metric-compatible fallback 或 `size-adjust`。 |
| 主 CSS 加载时机 | `index.html:38` 提前加载 `critical.css`；`src/main.ts:162` 至 `:168` 动态 import `main.css`，`:377` 至 `:380` 在 `DOMContentLoaded` 后 `await loadMainStyles()`。 | Critical CSS 先加载，主样式由 JS 启动后加载；主样式失败只记录 warn。 | JS 启动慢或主 CSS chunk 失败时，页面可能只有壳层关键样式，组件、表格、表单和状态视觉降级不可控。 | 定义 critical / main / module 三层边界；主样式失败时显示可理解错误态或降级壳层，不让页面以半样式状态继续运行。 |
| 模块 CSS 策略分裂 | `src/common/config/moduleCssRegistry.ts:38` 至 `:117` 定义模块 CSS 注册表；`src/main.ts:283` 至 `:286` 只预加载 high priority；静态搜索显示模块自身仍直接 `import './*.css'`，如 `src/modules/app_center/app_center.ts:7`、`src/modules/amz_hub/amz_hub.ts:3`、`src/modules/more/more.ts:2`。 | 同时存在模块内直接 import 和 moduleCssLoader registry；`loadModuleCSS()` 未看到在路由切换中作为 ready gate 使用。 | CSS 分包、预加载和路由 ready 状态难以判断；视觉测试等到内容 selector 时，不代表模块样式已经稳定。 | 选择一种模块样式策略：路由加载必须等待模块 CSS ready，或移除未接入的 registry；视觉测试增加 style-ready 断言。 |
| 图片懒加载基础 | `src/common/utils/ImageLazyLoader.ts:35` 至 `:42`、`:48` 至 `:76`、`:184` 至 `:185` 支持 IntersectionObserver、placeholder、error image 和 MutationObserver。 | 图片懒加载能力存在，但当前业务图片很少，更多是未来能力。 | 如果后续补 SOP 示例图或产品图，只有懒加载还不够，仍可能缺尺寸占位导致 CLS。 | 图片准入规则必须包含 `width` / `height` 或 `aspect-ratio`、alt、lazy/eager 策略和占位色。 |
| 运行时性能监控 | `src/services/performanceService.ts:114` 至 `:116`、`:232` 至 `:267` 有 CLS / LCP / FID / FCP 观测；`src/common/devtools/CSSPerformanceMonitor.ts:48` 至 `:51` 可记录 CSS 加载。 | 观测能力偏开发/运行时，未明确进入 CI 阻断和视觉报告。 | 性能数据可能只在 console 或调试面板里出现，不能防止设计回归。 | 把视觉性能指标写入可追踪报告：FCP、LCP、CLS、CSS chunk load time、font fallback 截图。 |
| 测试覆盖 | `tests/config/lighthouserc.js:104` 至 `:128` 有 FCP / LCP / CLS / TBT 阈值；`tests/performance/verify-cls-all-pages.test.ts:21` 至 `:38` 只覆盖首页、PromptLab、AI Analysis、Scraper。 | Lighthouse 配置较完整，但 CLS 专项只覆盖 4 页，且不覆盖移动壳层问题页。 | 高风险的 SOPS、PPC、AMZ Hub、More、Playground 和 390px 移动端仍可能有字体 / CSS / layout shift 回归。 | 核心路由性能 smoke 覆盖首页 + 6 个模块 + PPC / Playground，桌面和 390px 移动端都要验证。 |

视觉性能治理原则：

1. 首屏必须有稳定壳层：header、主内容区域、loading / skeleton、字体 fallback 都不能产生明显跳动。
2. 字体和图标属于视觉关键依赖；来源、版本、fallback、失败态必须可验证。
3. CSS 加载策略只保留一套主路径；路由 ready 必须包含 DOM ready、数据 ready 和样式 ready。
4. Lighthouse 阈值要覆盖真实核心路由和移动断点，不只覆盖容易通过的工具页。
5. 新增图片、字体、图标、动画和第三方样式必须说明对 FCP / LCP / CLS / TBT 的影响。

### 6.20 层级、浮层、滚动锁定与安全区域审计补充

项目已经定义了 z-index token、`modal-open` / `scroll-locked` 辅助类、移动端侧栏 overlay 规则和 safe-area 工具类。当前风险不在“没有规则”，而在规则没有成为单一契约：全局壳层、Web Component 弹窗、业务临时浮层、搜索下拉、调试面板和移动端抽屉各自选择层级与滚动策略。

| 对象 | 证据 | 当前状态 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| z-index token 双轨 | `src/css/foundation/variables.css:516` 至 `:528` 使用 30 至 90 的 CSS token；`src/common/config/design-tokens.ts:512` 至 `:516` 使用 1040 至 1080 的 TS token。 | CSS 与 TS token 的层级尺度不一致。 | 组件从不同入口取 token 时，同名语义不代表同一堆叠顺序，后续修复容易靠更大的硬编码覆盖。 | 选定单一层级 scale，并把 CSS variables、TS token、Tailwind safelist / 约定类映射到同一来源。 |
| Critical / 组件层级漂移 | `src/css/critical.css:120` 至 `:122` header 用 `--z-header`；`:223` 至 `:229` mega menu fixed，使用 `--z-mega-menu`；`src/css/components/toast.css:17` 至 `:20` toast 用 `--z-toast`；`src/css/components/loading.css:68` 至 `:71` loading overlay 用 `--z-overlay`。 | Header、mega menu、toast、loading 分别有局部层级，且 `--z-mega-menu` 不在主 token 表中。 | toast、loading、mega menu、modal 同时出现时顺序不可预测，尤其是 loading overlay 可能低于业务弹窗。 | 明确 app-shell / navigation / overlay / dialog / toast / debug 的顺序，并禁止未登记的 `--z-*`。 |
| AppModal 逃逸层级 | `src/components/modal/AppModal.ts:170` 至 `:182` host 用 `z-index: 1000`，容器硬编码 `z-index: 9999`；`:381` 至 `:390` 移动端改为底部 sheet。 | `AppModal` 没有使用 `--z-modal`，也没有接入 CSS 里的 `.modal-open` body 滚动锁定。 | 弹窗会盖过 toast、搜索下拉和大多数业务浮层，但不能保证与 devtools、全局 loading、其他 9999 浮窗顺序一致；移动底部 sheet 背景仍可能滚动。 | `AppModal` 接入统一 overlay manager：层级 token、body scroll lock、焦点陷阱、Esc、焦点返回和 safe-area padding 一起治理。 |
| 业务临时浮层 | `src/modules/app_center/views/master_analysis/scraper/handlers/importHandler.ts:170` 至 `:173`、`dataOperations.ts:325` 至 `:328` 动态创建 `z-[60]` backdrop；`src/modules/app_center/views/master_analysis/ai_analysis/template.html:683` 使用 `fixed inset-0 z-50`；`src/components/settings/systemSettings.html:4` 也是 `z-50`。 | 多个业务模块直接向 `document.body` 追加浮层，层级靠 Tailwind 原子值。 | 业务浮层与 global modal、mega menu、loading、toast 的优先级没有统一语义；也缺少滚动锁、焦点返回和嵌套浮层策略。 | 新增 `openDialog` / `openSheet` / `openPopover` 级别的统一入口，业务只声明类型和内容，不直接写 body 级 backdrop。 |
| 高层级逃逸 | `src/modules/app_center/views/keyword_hunter/keyword_hunter_style.css:97` 至 `:109`、`:183` 至 `:186` 使用 `z-index: 9999`；`src/modules/amz_hub/views/practice/marketing_calendar/styles.css:299` 至 `:312` 搜索历史用 `z-index: 99999`；`src/common/devtools/PerformanceMonitor.ts:65` 至 `:74` 使用 `999999`。 | 浮动关键词窗、搜索历史、devtools 面板都越过常规 token。 | 用户态浮层和调试态浮层混在同一层级空间；一旦同时打开弹窗、toast、下拉或 loading，遮挡关系会以偶然值决定。 | 业务浮动窗降回 app overlay / popover token；devtools 单独使用 debug layer，并只在开发模式注入。 |
| 滚动契约分裂 | `src/css/critical.css:46` 至 `:47` body 固定 `overflow: hidden; height: 100vh`；`index.html:251` 主内容负责 `overflow-y-auto`；`src/css/layouts/container.css:297` 至 `:319` 双栏 aside / main 也各自滚动。 | 当前是 body 锁死 + inner scroll；模块内又有表格、配置区、弹窗内容的局部滚动。 | 移动端容易出现滚动链路混乱、背景穿透、sticky 失效和键盘弹出后内容被遮挡。 | 定义唯一页面滚动容器；表格 / 弹窗 / 侧栏局部滚动必须声明高度、overscroll 行为和滚动锁联动。 |
| 移动 safe-area 未接入主壳层 | `src/css/layouts/container.css:593` 至 `:614` 定义 safe-area 工具；`:704` 至 `:739` 定义移动侧栏 overlay，但现有 `index.html:245` 使用的是 `#dynamic-sidebar`，`index.html:251` 主内容直接 `p-8`。 | safe-area 能力存在，但没有覆盖当前动态侧栏、主内容 padding、底部 sheet、loading 和 toast。 | iOS 手势区、横屏、刘海屏和小屏下，底部 sheet / toast / 主操作可能贴边或被系统手势区遮挡。 | 把 safe-area 纳入 app shell、drawer、modal sheet、toast container 和 fixed bottom action 的默认样式。 |
| Sticky 表格局部层级 | `src/modules/sops/views/growth/npi_tracker/index.ts:161`、`src/modules/sops/views/growth/npi_tracker/template.html:810` 使用 sticky left `z-10`；`src/modules/sops/views/growth/restricted_words/template.html:988` 至 `:991` 使用 sticky header `z-10`。 | 表格 sticky 层级是局部写死值。 | 当表格位于局部滚动容器、浮层或 sticky 页面头下时，冻结列和表头可能互相覆盖，或盖到弹窗下的背景内容。 | 表格组件定义 sticky header / first column / corner cell 层级，并在 modal 打开时验证背景 sticky 不穿透。 |

层级与滚动治理原则：

1. 层级 token 必须只有一套来源；不允许业务代码继续新增 `z-[9999]`、`99999`、未登记 `--z-*`。
2. 页面只保留一个主滚动容器；局部滚动必须说明高度、overscroll、sticky 和移动键盘影响。
3. 任何 body 级浮层都必须接入 overlay manager：层级、滚动锁、焦点、Esc、背景 inert / aria hidden、safe-area 一起处理。
4. 移动端 drawer、bottom sheet、toast、loading、搜索下拉和 sticky table 要在同一组视觉 smoke 中验证堆叠顺序。
5. 调试面板使用独立 debug layer，不能成为业务浮层提高 z-index 的参照。

### 6.21 响应式断点、容器宽度与密度体系审计补充

项目已经有 Tailwind 断点、设计 token、容器工具类和视觉回归视口。当前风险不在“没有响应式基础”，而在断点、容器、密度和测试矩阵没有收敛到同一套规则。业务模块继续使用私有 media query、固定宽度和紧凑表格策略，导致同一类页面在 390px、430px、768px、1440px、1920px 和超宽屏下的视觉表现不可预测。

| 对象 | 证据 | 当前状态 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| 断点 token 不一致 | `config/tailwind.config.generated.js:451` 至 `:458`、`src/common/config/design-tokens.ts:555` 至 `:561` 定义 `xs 375`、`sm 640`、`md 768`、`lg 1024`、`xl 1280`、`2xl 1440`、`3xl 1920`；`src/css/foundation/variables.css:653` 至 `:657` 又定义 `--breakpoint-2xl: 1536px`。 | Tailwind / TS token 与 CSS 参考值存在 1440 / 1536 分歧。 | 同一个 `2xl` 在模板、CSS 和测试中可能代表不同屏宽，宽屏布局和卡片列数容易漂移。 | 统一断点来源；CSS media query、Tailwind screens、TS BREAKPOINTS 和测试视口必须从同一表派生。 |
| 容器宽度多套 | `src/css/foundation/variables.css:394` 至 `:401` 使用容器 480 / 640 / 768 / 1024 / 1280 / 1450 / 1680；`src/css/utilities/containers.css:11` 至 `:13` `.module-container` 固定 `max-width: 1450px`；`:45` 至 `:50` 又有 1200 / 1600 宽度变体。 | 容器体系存在，但模块默认容器、内容窄容器、宽容器和超宽容器缺少使用准则。 | 运营工具页可能在桌面过松、在宽屏过散；长内容、表格、输入工具和概览页使用同一 `1450px` 默认不一定合适。 | 定义页面类型到容器的映射：工作台、表格、表单、阅读页、对话式工具分别使用不同最大宽度和密度。 |
| 私有 media query 分散 | 静态扫描显示 `src/css` 与 `src/modules` 中至少出现 16 个宽度阈值：375、480、560、639、640、767、768、769、900、1024、1025、1100、1280、1441、1536、1921。 | 多个模块自行选择 480、560、900、1100 等过渡点。 | 修一个断点不能覆盖所有模块；视觉测试即使通过 375 / 768，也不能证明 390、430、900、1100、1440 等边界稳定。 | 保留少量产品断点，其余通过容器查询、组件自适应或局部 density variant 解决；新增 media query 需要登记原因。 |
| 模块级响应式策略不统一 | `src/modules/app_center/app_center_style.css:734` 至 `:785` 使用 1100 / 900 / 768 / 560；`src/modules/sops/sops_style.css:350` 至 `:420` 使用 1024 / 768 / 480；`src/modules/app_center/views/playground/styles.css:503` 至 `:517` 使用 900 / 640。 | App Center、SOPS、Playground 各自定义折列和密度规则。 | 同类卡片、流程、工具面板在接近平板宽度时表现不同，用户从模块切换时会感觉布局规则不稳定。 | 抽象卡片 grid、flow steps、tool split-pane、chat surface 的响应式模式，模块只选择模式，不重复写断点。 |
| 固定宽度与局部宽屏适配 | `src/modules/app_center/views/ppc_search_terms/template.html:22` 使用 `xl:w-[560px]`；`src/modules/app_center/views/playground/deep-chat/index.ts:255`、`:316` 使用 `768px` 作为输入框和按钮定位基准；`src/modules/amz_hub/views/knowledge/seo_strategy/template.html:268` 使用 `xl:min-w-[720px]`。 | 部分关键区域通过固定宽度或固定基准进行适配。 | 在动态侧栏、390px 移动端、横屏或窄桌面下，固定宽度可能制造横向滚动、按钮错位或内容裁切。 | 固定宽度改为容器相对规则：`minmax()`、`clamp()`、容器查询、显式 overflow 策略和截图断言。 |
| 高密度网格与宽表 | `src/modules/sops/views/growth/ppc_advertising/template.html:69` 使用 `grid-cols-2 md:grid-cols-4 lg:grid-cols-8`；`src/modules/app_center/views/master_analysis/scraper/template.html:283` 使用 `grid-cols-5 2xl:grid-cols-10`；`src/modules/sops/views/growth/npi_tracker/template.html:781` 至 `:850` 使用 `overflow-x-auto`、`text-xs`、`whitespace-nowrap` 和 `max-w-[100px]` 截断。 | 数据密度依赖列数、横滚、`text-xs` 和截断。 | 宽屏可读性和移动可用性都容易失衡：桌面像报表墙，移动只能横向拖动，关键文本被截断。 | 建立 density token：compact / comfortable / presentation；表格在桌面和移动使用不同信息架构，而不是同一张表缩放。 |
| 截断与 nowrap 热点 | `src/common/components/OverviewRenderer.ts:243` 至 `:250` 筛选按钮 `whitespace-nowrap`；SOPS / AMZ / More 总览筛选也使用 `whitespace-nowrap`；AI Analysis 多处 `line-clamp-1/2`，如 `src/modules/app_center/views/master_analysis/ai_analysis/template.html:199`、`:356`、`:395`。 | 截断、nowrap 和 line-clamp 是常用兜底。 | 中文、英文、ASIN、长产品名和多语言内容会在不同宽度下被隐藏；如果没有 tooltip / 展开 / 摘要策略，用户看不到关键决策信息。 | 为筛选、标题、产品名、表格单元和报告摘要定义截断规则：何时换行、何时省略、何时提供完整内容。 |
| 视觉测试矩阵不足 | `tests/visual/visual.test.ts:52` 至 `:55` 只定义 desktop 1280x720、tablet 768x1024、mobile 375x667；`:253` 至 `:361` 只跑这三组；`tests/config/lighthouserc.js:33` 至 `:50` 只配置 desktop 1920x1080。 | 有视觉测试基础，但没有覆盖 390/430、移动横屏、1440、1920、超宽屏和 900/1100 关键边界。 | 私有断点和固定宽度问题会在未覆盖的尺寸漏过，尤其是动态侧栏、宽表、chat 输入框和多列 KPI。 | 补响应式 smoke 矩阵：390x844、430x932、667x375 横屏、900x800、1100x800、1440x900、1920x1080。 |

响应式治理原则：

1. 断点只保留产品级矩阵；组件适配优先用弹性布局、`minmax()`、`clamp()` 和容器规则。
2. 容器宽度按页面类型选择，不把所有工具页默认塞进同一个 `1450px` 容器。
3. 密度是设计决策，不是简单改 `text-xs`、缩 padding、增加列数；每个高密度页面要有 compact / comfortable 规则。
4. 截断必须可恢复：关键业务文本需要 tooltip、展开、详情面板或移动摘要。
5. 视觉测试要覆盖断点边界和真实设备尺寸，而不是只覆盖 375 / 768 / 1280 三个代表值。

### 6.22 AI 输出、Markdown / 代码块、报告渲染与导出态审计补充

项目已经具备 AI 输出基础：通用 Markdown 样式、代码块样式、PromptLab 报告选择器、Keyword Hunter Markdown 渲染、AI Analysis JSON / Markdown 复制与下载、Playground 消息复制。当前风险不在“没有输出界面”，而在输出阅读、代码块、复制、下载、打印和视觉测试仍由各模块分别实现，缺少统一的 AI report contract。

| 对象 | 证据 | 当前状态 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| Markdown 基础样式偏展示化 | `src/css/components/markdown.css:8` 至 `:18` 定义基础排版，`:35` 至 `:68` 把首个 h2 做成大渐变 hero；`:218` 后定义表格，`:392` 至 `:408` 定义代码块。 | 有统一 `.markdown-content`，但默认样式带强装饰和基于标题顺序的视觉强调。 | AI 报告、知识文档、操作建议共用时，首个 h2 hero、渐变和 nth-of-type 语义会让普通输出显得像营销卡片，且标题顺序变化会改变语义颜色。 | 拆分 Markdown variant：report、article、compact、code-heavy；默认保持朴素阅读，强调样式由结构化数据或显式 class 驱动。 |
| 代码块系统未完全接入输出 | `src/css/components/code-highlight.css:125` 至 `:136` 有 `.code-block` 容器；`:650` 起有工具栏按钮；`:1596` 起有移动端代码块适配；`src/modules/app_center/views/master_analysis/ai_analysis/template.html:1110` 至 `:1111` 仍直接用 `pre > code` 展示 JSON。 | 代码块设计系统较完整，但 AI Analysis 和 Markdown 渲染输出多处没有使用 `.code-block` 结构。 | JSON、Prompt、Markdown 代码在不同模块中的滚动、复制、换行、移动端行号和暗色适配不一致。 | 统一 `CodeBlock` / `JsonViewer` 渲染模式，AI 输出中的代码、JSON、Prompt 预览全部使用同一结构和工具栏。 |
| Keyword Hunter 报告渲染 | `src/modules/app_center/views/keyword_hunter/analysis/index.ts:91` 至 `:105` 用 `marked.parse()`，失败时降级为 `pre`；`:165` 至 `:179` 恢复旧 HTML 或原始 Markdown；`:562` 至 `:600` 运行分析并渲染；`:650` 起用 DOM 构建错误卡。 | 渲染流程有安全与降级意识，错误态有重试按钮。 | 报告结构仍依赖模型返回 Markdown；表格、标题、评分、代码块、超长文本没有统一 schema 验证和截图门槛。 | 将 LLM 输出分为 raw markdown、parsed HTML、structured highlights、score summary 四层；关键输出必须有结构校验和 fallback。 |
| Keyword Hunter 私有 Markdown 定制 | `src/modules/app_center/views/keyword_hunter/keyword_hunter_style.css:418` 至 `:520` 对 `#kt-llm-analysis-result.markdown-content` 做模块专属 h2 / h3 样式；`:575` 至 `:646` 又按 li / code 顺序表达原文、改写、说明。 | 模块输出样式覆盖通用 Markdown，并用 nth-child 表达语义。 | 如果模型输出条目数量或顺序变化，红/绿/蓝语义会错位；结构语义依赖视觉颜色，不利于可访问性和长期维护。 | 原文 / 改写 / 说明用显式结构或 data attribute 渲染，不用 nth-child 推断语义。 |
| PromptLab 输出操作 | `src/modules/app_center/views/master_analysis/promptlab/template.html:559` 至 `:568` 是复制 / 清空图标按钮；`:575` 至 `:582` 用只读 textarea 展示最终 Prompt；`src/modules/app_center/views/master_analysis/promptlab/components/uiHelpers.ts:157` 至 `:164` 用 `document.execCommand('copy')` 复制。 | Prompt 输出是稳定 textarea，复制有 toast。 | 图标按钮只有 `title`，复制缺 Clipboard API fallback / 失败态；输出区域被视觉测试 mask，无法发现长 Prompt、token 计数、底部状态条遮挡问题。 | 输出工具栏使用标准 button label / aria-label；复制统一走 clipboard helper；长 Prompt、超限、复制失败、清空确认都纳入截图。 |
| AI Analysis 导出与 JSON 查看 | `src/modules/app_center/views/master_analysis/ai_analysis/template.html:1069` 至 `:1084` 提供 Markdown / JSON 复制和下载；`:1110` 至 `:1111` 展示 JSON；`src/modules/app_center/views/master_analysis/ai_analysis/components/actions.ts:128` 至 `:170` 使用 `navigator.clipboard.writeText`，`:176` 至 `:203` 下载 JSON。 | 复制与下载功能齐全，E2E 有 JSON 复制 / 下载检查。 | 复制按钮没有 loading / copied / failed 内联状态，只靠 toast；下载只验证触发，不验证导出内容结构、文件名可读性、空报告和超大报告视觉状态。 | 导出操作提供内联状态与禁用规则；测试验证 Markdown、JSON、文件名、内容摘要、空态、失败态和移动端工具栏。 |
| Playground 消息复制基线较好 | `src/modules/app_center/views/playground/deep-chat/index.ts:820` 至 `:838` 创建带 `aria-label` 的消息工具按钮；`:844` 至 `:897` 有 Clipboard API 和 textarea fallback。 | Playground 的复制可访问性与降级比其他输出模块更完整。 | 同一产品内复制交互标准不一致，用户在 PromptLab、AI Analysis、Playground 会遇到不同反馈。 | 把 Playground 的 copy helper 抽成共享输出操作，PromptLab、AI Analysis、Keyword Hunter 复用。 |
| 视觉测试主动忽略输出 | `tests/visual/visual.test.ts:106` mask `#final-prompt-output`；`:133` mask `#analysis-results`；AI Analysis 还 mask `.result-card`、`#json-viewer` 等动态输出。 | 视觉回归避免动态内容造成波动。 | 最重要的 AI 输出阅读体验、报告卡片、JSON viewer、长 prompt、代码块和导出栏反而没有视觉保障。 | 使用固定 mock 数据创建稳定输出截图，不再只 mask；至少覆盖 empty、loading、error、long output、code block、export toolbar。 |
| 打印 / 导出版式缺少报告级规则 | `src/css/utilities/print.css:5` 起有全局 print 工具，隐藏导航、去阴影、主内容全宽。 | 有通用打印基础，但没有 AI 报告 / Prompt / JSON 的专属 print/export 规则。 | 用户打印或复制导出长报告时，渐变、暗色 JSON、代码块、分页和链接可能不可读。 | 为 AI report 增加 print variant：去装饰、保留标题层级、代码浅色化、分页不截断、导出元信息可读。 |

AI 输出治理原则：

1. AI 输出是核心产物，不是普通动态内容；必须有稳定版式、结构校验、复制 / 下载 / 打印状态和截图验收。
2. Markdown 样式按使用场景分 variant，不把所有报告都套用同一个带装饰的 `.markdown-content`。
3. 语义不能靠 nth-child / nth-of-type 推断；模型输出结构变化时，视觉语义必须保持正确。
4. 复制、下载、清空、导出都要有共享操作状态：idle、busy、success、failure、disabled。
5. 视觉测试用固定 mock 输出覆盖真实阅读界面，减少 mask 动态输出的比例。

### 6.23 文案、术语、微文案与中英混排审计补充

项目已经声明中文界面基础：`index.html:2` 使用 `lang="zh-CN"`，并且大量业务内容面向中文运营人员。当前风险不在“缺少中文”，而在 UI 文案没有被当作设计系统契约管理：术语、动作、错误、空态、占位提示、可访问名称和中英混排散落在模板、TS toast、错误码和模块常量中。结果是同一类动作和状态在不同模块呈现不同语气、不同标点、不同英文保留规则，用户学习成本和回归测试盲区都会扩大。

| 对象 | 证据 | 当前状态 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| 本地化入口与文案来源 | `index.html:2` 声明 `zh-CN`；静态文件清单未发现成体系的 `i18n` / `locales` / `messages` / `glossary` 文案目录；`index.html:274`、`:276` 写死全局 loading；`src/main.ts:392`、`:405`、`:474`、`:490`、`:507` 写死系统 toast。 | 有中文界面，但没有 UI copy registry、术语表或状态文案规范。 | 文案只能逐文件修改；同类状态无法复用，也难以做中英混排、标点、可访问名称和截图验收。 | 建立 `UI Copy Contract`：术语表、动作词表、状态文案模板、错误文案模板、危险操作文案模板和可访问名称规则。 |
| 品牌与首页英文口号 | `index.html:76` 使用 `Prompt by Prompt`；`src/modules/home/homeDisplay.html:30` 使用 `AI SYSTEM ONLINE · READY TO TRANSFORM`；`:37` 使用 `AI DRIVEN | HUMAN CENTERED | PROCESS AS CODE | DECISION AT SPEED`。 | 首页仍保留全大写英文科技感文案。 | 对内部运营工具来说，首屏语气偏品牌展示，会强化前面已指出的 hero / marketing 感；中文用户进入工具前先处理英文口号。 | 区分品牌层与工具层：品牌页可保留英文，工作台首屏、导航、状态区应以短中文任务文案为主，英文术语只在必要业务名词中保留。 |
| AI / Prompt / API / LLM 术语混用 | `src/modules/app_center/module.manifest.ts:25` 是 `AI智能分析`，`:33` 是 `Prompt 生成`；`src/common/config/menuConfig.ts:147` 是 `AI分析与提示词工程`，`:183` 是 `AI 对话试验台` 与 `Prompt 试验`；`src/components/settings/systemSettings.ts:387` 是 `API Key`，`:392` 是 `API端点地址`，`:542` 是 `LLM 配置已保存`。 | `AI智能` / `AI 分析`、`Prompt` / `提示词`、`API端点` / `API 端点`、`LLM` 混合出现。 | 导航、按钮、设置和 toast 的同一概念名称不一致，用户不确定这些是否是同一能力；也会影响搜索、测试选择器和帮助文档。 | 定义术语首选写法：例如 `AI 分析`、`提示词（Prompt）`、`API Key`、`API 端点`、`LLM 配置`；导航、按钮、toast、帮助文本必须复用。 |
| 空态、加载态、错误态语气 | `index.html:274` / `:276` 是通用 `加载中` / `请稍候`；`src/components/ErrorBoundary.ts:126` 默认 `暂无内容`，`:170` 是 `内容容器加载超时，请刷新重试`；`src/common/BaseModule.ts:364` 是 `模块加载失败 (...)`；PPC 在 `src/modules/app_center/views/ppc_search_terms/template.html:249` / `:250` 使用更具体的 `还没有分析结果` 和下一步说明。 | 部分模块有清晰下一步，部分共享状态只有泛化提示。 | loading / empty / error 作为高频状态，如果没有“原因 + 下一步 + 主操作”，用户只能猜测是等待、失败还是需要输入数据。 | 状态文案模板统一为：标题说明状态、正文说明原因、末尾提供下一步或主操作；共享组件和业务模块都用同一结构。 |
| 错误与 toast 标点 / emoji 风格 | `src/common/errors/errorCodes.ts:15`、`:32`、`:52`、`:96`、`:101`、`:133`、`:145`、`:150` 使用中文句子中的 ASCII 逗号；`src/common/constants/constants.ts:285` 至 `:292` 的抓取错误包含 `🚫`、`❌`、`⏳`、`📡`、`⚠️`；`src/components/settings/systemSettings.ts:508` 使用 `连接成功！`。 | 错误码、toast、抓取错误各自定义语气、标点和图标。 | 错误反馈时而像系统日志、时而像业务提示；emoji 进入结构性错误文案会影响专业度和可访问语义。 | 错误文案统一中文标点和语气；结构性错误不直接使用 emoji，改用图标组件 + 可读文本；toast 标题和描述分层。 |
| 危险操作文案 | `src/components/settings/systemSettings.ts:682` 与 `:684` 使用两次 `window.confirm` 说明清空本地数据不可恢复。 | 文案有风险提醒，但交互仍是浏览器原生 confirm。 | 危险操作和全局 modal 契约脱节，无法统一标题、正文、后果、备份提示、按钮文案、焦点和截图验收。 | 危险操作使用统一 modal 文案结构：明确对象、不可逆后果、备份建议、取消按钮、危险主按钮和二次确认条件。 |
| 占位文案与 title-only 控件 | `src/common/components/SidebarRenderer.ts:527`、`src/common/components/OverviewRenderer.ts:166`、PPC `src/modules/app_center/views/ppc_search_terms/template.html:83` / `:177` / `:222` 使用 placeholder 承载说明；PromptLab `src/modules/app_center/views/master_analysis/promptlab/template.html:561` / `:566` 只有 `title="复制"` / `title="清空"`；Deep Chat `src/modules/app_center/views/playground/deep-chat/template.html:56` 使用英文 placeholder。 | placeholder、title、aria-label、可见 label 的边界不统一。 | placeholder 消失后用户失去说明；title 不是稳定的可访问名称；英文 placeholder 会打断中文工具语境。 | 输入控件必须有 label / helper；icon-only 按钮必须有 `aria-label` 和 tooltip；placeholder 只放示例，不放必读说明。 |
| 复制 / 下载 / 导出动作词 | PPC 使用 `复制周报摘要`（`src/modules/app_center/views/ppc_search_terms/template.html:243`）；系统设置使用 `本地数据已导出`（`src/components/settings/systemSettings.ts:637`）；AI Analysis 使用 `复制 Markdown 格式报告`、`复制 JSON 格式报告`、`下载 JSON 格式报告`（`src/modules/app_center/views/master_analysis/ai_analysis/template.html:1071`、`:1077`、`:1083`）；测试页对象使用 `导出 JSON`（`tests/e2e/pages/AIAnalysisPage.ts:117`）。 | `复制`、`下载`、`导出` 的使用边界不稳定。 | 用户无法预期动作结果：复制到剪贴板、下载本地文件、导出结构化数据在视觉和文案上应有不同反馈。 | 定义动作词表：复制 = 剪贴板；下载 = 文件落地；导出 = 生成可交换数据，可伴随下载；按钮、toast、测试选择器保持一致。 |
| 文案回归缺口 | `tests/visual/visual.test.ts:106`、`:133`、`:139`、`:140` mask 关键 AI 输出；`tests/e2e/pages/PromptlabPage.ts:102` 用 `button[title="复制"]` 定位；`tests/e2e/ai-analysis.spec.ts:402` 至 `:450` 验证 JSON 复制 / 下载功能，但没有术语、标点、title-only、placeholder-only 的质量门槛。 | 现有测试验证部分功能，不验证文案系统一致性。 | 文案漂移、英文 placeholder、ASCII 标点、title-only 控件和术语变体不会触发回归失败。 | 增加 copy smoke：扫描禁用术语变体、中文 ASCII 标点、placeholder-only、title-only；固定 mock 覆盖 empty / loading / error / copy / download / export 文案。 |

文案治理原则：

1. 术语是设计 token 的一部分；核心术语需要首选写法、允许写法和禁用写法。
2. 中英混排必须有规则：业务英文名可保留，状态、按钮、错误、帮助说明优先中文。
3. 状态文案必须回答“发生了什么、为什么、下一步做什么”，不能只写 `暂无`、`失败`、`请稍候`。
4. placeholder 不承担 label 或说明职责；title 不承担唯一可访问名称。
5. 复制、下载、导出、清空、删除、重试、同步、生成等动作要有统一含义、按钮文案和 toast 反馈。
6. 文案 smoke 要和视觉 smoke 一起进入质量门槛，尤其覆盖 `AI / Prompt / API / LLM` 术语、中文标点、危险操作和状态文案。

### 6.24 系统设置、偏好、密钥与本地数据管理审计补充

系统设置面板承载了 LLM 模型、API Key、采集代理、本地数据、性能监控等高风险配置。当前问题不在“没有设置入口”，而在设置体验还没有形成后台工具应有的配置契约：同一个抽屉里混合密钥、网络、备份、危险清空和开发监控，视觉上大量使用渐变、微小字号和装饰分隔，交互上缺少 dialog 语义、焦点管理、字段级错误、导入预览、危险操作统一确认和设置回归测试。

| 对象 | 证据 | 当前状态 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| 设置入口与系统状态 | `index.html:194` 是 Mega Menu 里的 `data-action="openSettings"`；`index.html:224` 至 `:226` 只在 header 显示 `未配置模型`；`src/main.ts:454` 注册 `openSettings` 动作。 | 设置入口存在，但配置状态只以 header 简短文案呈现。 | 用户知道“未配置模型”，但不清楚缺 API Key、缺模型、端点错误还是网络失败；进入路径依赖 Mega Menu 快捷访问。 | Header 状态拆成可点击状态组件：显示配置完整度、当前模型、错误原因和进入设置的主操作；移动端也要可达。 |
| 设置抽屉语义与焦点 | `src/components/settings/systemSettings.html:2` 至 `:17` 用固定全屏容器和右侧 panel；`:3` 监听 Escape；`:7` backdrop 点击关闭；`:29` 使用 `h2`；`:34` 至 `:37` 是关闭按钮。模板中未看到 `role="dialog"`、`aria-modal`、标题关联或关闭按钮可访问名称。 | 视觉上是 modal / drawer，语义上仍是普通 div。 | 读屏无法识别为设置对话框；打开后焦点、Tab 限制、关闭后焦点返回和背景不可交互不可验证。 | 接入统一 overlay / modal contract：`role="dialog"`、`aria-modal`、`aria-labelledby`、焦点初始位置、焦点陷阱、Esc / 遮罩关闭和焦点返回。 |
| 视觉密度与装饰 | `systemSettings.html:17` 使用 `bg-gradient-to-b` 和大侧向阴影；`:20` 使用渐变 accent；`:52`、`:218`、`:296`、`:355` 的 section heading 是 `text-xs uppercase tracking-widest`；多处图标容器是 6px / 7px / 9px。 | 设置面板视觉精致，但偏装饰化和高密度。 | 密钥、网络、备份属于高注意力任务，小字号和装饰分隔会增加扫读成本；渐变和大阴影与运营工具设置面板的安静语气不一致。 | 设置面板采用表单型布局：清晰分组标题、说明、字段状态、分区边界和稳定按钮层级；减少渐变、装饰线和微小图标。 |
| API Key 与密钥显示 | `systemSettings.html:112` 至 `:123` 是 API Key 输入和显示 / 隐藏按钮；`src/components/settings/systemSettings.ts:387`、`:392`、`:489`、`:518` 用 toast 提示缺字段；`:516` 至 `:542` 保存配置后关闭面板。 | 字段有 label，显示 / 隐藏按钮无 `aria-label`；缺字段、同步模型、测试连接和保存主要靠 toast。 | 密钥字段是敏感操作，按钮不可访问名称缺失；错误不在字段附近，保存后自动关闭会隐藏失败复查路径。 | 密钥字段补可访问名称、helper、字段级错误、保存状态和安全说明；保存成功后保留可见成功状态，关闭由用户决定。 |
| 模型同步与连接测试 | `systemSettings.html:129` 至 `:146` 是模型 select 和刷新按钮；`:183` 至 `:193` 是测试连接和保存配置；`systemSettings.ts:385` 至 `:481` 同步模型，`:487` 至 `:511` 测试连接。 | 同步 / 测试按钮有 loading 文案，但结果主要落在 toast 和 console。 | 模型列表为空、端点错误、Key 过期、网络超时都不会形成持久可见的配置诊断；用户离开设置后难以回溯。 | 增加配置诊断区：provider、endpoint、Key 状态、模型数量、最后测试时间、错误原因、下一步动作，且与 header 模型状态同步。 |
| 采集网络设置 | `systemSettings.html:224` 至 `:230` 提供 ScraperAPI、ZenRows、Bright Data、自定义 API、自定义 HTTP 代理；`:244` 至 `:259` 是条件输入和更新按钮；`systemSettings.ts:564` 至 `:573` 保存代理配置。 | 网络配置有说明卡，但缺少测试连接、适用场景和保存后状态。 | 采集失败时用户不知道是代理配置、目标站限制还是 API Key 问题；不同代理类型共享一个输入区，错误不易定位。 | 代理设置增加每种类型说明、测试按钮、最近一次采集错误映射、字段级错误和保存状态。 |
| 本地数据导入 / 导出 / 清理 | `systemSettings.html:302` 至 `:318` 展示 localStorage / IndexedDB 用量和说明；`:322` 至 `:337` 提供导出、导入恢复、清理缓存、清空全部；`systemSettings.ts:624` 至 `:695` 执行导出 / 导入 / 清理 / 清空。 | 数据管理功能完整，但导入用临时 file input，清空用 `window.confirm`，忙碌状态只禁用按钮。 | 备份文件格式、恢复影响范围、冲突策略、失败原因和清空后果都缺少稳定 UI；浏览器 confirm 无法纳入统一视觉和焦点测试。 | 数据管理改为分步流程：选择文件、预览内容、冲突说明、确认恢复；清空全部使用统一危险 modal 和二次确认输入。 |
| 性能监控入口 | `systemSettings.html:355` 至 `:386` 把性能监控放入设置面板；`systemSettings.ts:313` 至 `:327` 动态打开开发监控，toast 说明仅开发模式可用。 | 开发监控与普通设置放在同一面板。 | 普通运营用户可能看到不可用或不相关入口；监控面板的层级和 z-index 也可能干扰业务浮层。 | 将开发监控归入 debug / devtools 分层，生产环境隐藏或降级为只读健康状态；监控面板不作为业务设置的一部分。 |
| 设置测试缺口 | 静态搜索只看到 `tests/unit/validation.test.ts:184` 至 `:208` 验证 API Key 格式；未看到针对 `settingsPanel`、`open-settings`、`llm-api-key`、`清空全部`、`导入恢复` 的 E2E / visual 覆盖。 | 配置相关 UI 缺少回归门槛。 | 密钥按钮无可访问名称、设置抽屉无 dialog 语义、危险清空、导入恢复和监控入口都可能长期绕过测试。 | 新增设置 smoke：打开 / 关闭、焦点、字段错误、密钥显示、模型同步失败、导入预览、清空确认、移动端抽屉和 dark / forced-colors 截图。 |

设置治理原则：

1. 设置是高风险后台流程，不是普通侧边面板；必须有 dialog / drawer 语义、焦点管理和可恢复状态。
2. 密钥、端点、代理、模型、备份、清空都需要字段级错误和持久诊断，不只用 toast。
3. 危险操作必须进入统一危险确认模式；`window.confirm` 不能作为设置体验的长期方案。
4. 数据导入必须先预览再恢复，说明格式、影响范围、冲突策略和失败原因。
5. 开发监控与运营设置分层；生产用户只看到对业务有意义的健康状态。
6. 设置面板必须进入视觉和交互 smoke：桌面、移动、暗色、高对比、键盘、读屏名称、密钥显示、导入导出和危险确认。

### 6.25 搜索、筛选、发现与命令入口审计补充

项目已经在多个模块实现了搜索和筛选，但它们不是同一套发现体验：侧边栏、共享 OverviewRenderer、App Center 总览、SOPS / AMZ / More 旧总览、PPC 动作清单、Restricted Words、Marketing Calendar、More Prompts 各自维护控件、空态、计数、历史和键盘规则。当前风险不在“没有搜索”，而在用户无法预期搜索范围、结果数量、筛选状态、清空入口和键盘路径；同时项目缺少全局命令入口，功能发现仍主要依赖侧边栏、Mega Menu 和局部搜索。

| 对象 | 证据 | 当前状态 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| 侧边栏搜索入口 | `src/common/ui/navigation.ts:24`、`:32`、`:40`、`:48` 为不同模块定义搜索 placeholder；`src/common/components/SidebarRenderer.ts:526` 至 `:545` 渲染 `#sidebar-search-input`、清空按钮和结果容器；`src/common/ui/search.ts:213` 至 `:279` 处理侧边栏搜索和清空。 | 有模块化搜索入口和结果容器，但输入主要依赖 placeholder，清空按钮和结果区语义不完整。 | 读屏用户难以确认搜索范围；搜索结果出现 / 消失没有稳定 live region；移动端抽屉和搜索结果下拉的层级也缺少统一 smoke。 | 侧边栏搜索接入共享 `SearchField + SearchResults` 契约：可见或屏读 label、清空按钮 `aria-label`、结果计数、空态、键盘选择和浮层层级规则。 |
| 共享 OverviewRenderer | `src/common/components/OverviewRenderer.ts:157` 至 `:166` 渲染 `搜索功能模块...`；`:499` 至 `:548` 绑定搜索并切换卡片 / section display。 | 共享渲染器具备搜索和筛选逻辑，但没有形成 App Center 那样的 label、计数、空态和 `aria-pressed` 基线。 | 共享组件一旦被新页面复用，会继续复制 placeholder-only、状态不可见和筛选语义不稳定的问题。 | 将 App Center Overview 的搜索 / 筛选 / 计数 / 空态规则回灌到 OverviewRenderer，作为总览页默认模板。 |
| App Center 总览基线 | `src/modules/app_center/views/overview/template.html:95` 至 `:124` 提供分类筛选 label、`aria-pressed`、搜索 label 和清空按钮；`:101` 和 `:242` 至 `:244` 有结果计数和空态 live；`index.ts:50` 至 `:78`、`:121`、`:145` 至 `:152` 同步搜索、筛选和空态。 | 这是目前最完整的总览搜索 / 筛选模式。 | 优秀模式停留在单页，旧总览和共享渲染器没有统一继承。 | 把 App Center Overview 提升为总览页 contract：所有概览页使用相同控件结构、状态字段和测试断言。 |
| 旧总览页筛选 | `src/modules/sops/views/overview/template.html:131` 至 `:147`、`src/modules/amz_hub/views/overview/template.html:71` 至 `:89`、`src/modules/more/views/overview/template.html:44` 至 `:49` 使用 `data-category` 分类按钮。 | 有分类入口，但未看到同等的 `aria-pressed`、结果计数、空态和键盘状态契约。 | 同为“总览页”，交互质量和可访问性表现不同；用户无法通过一致模式理解当前筛选范围。 | SOPS / AMZ / More 总览迁移到统一 Overview contract，保留业务分类但统一按钮语义、空态和结果计数。 |
| PPC 动作清单搜索 | `src/modules/app_center/views/ppc_search_terms/template.html:193` 至 `:224` 有筛选按钮、`aria-pressed`、搜索 label 和清空按钮；`index.ts:1269` 至 `:1347` 更新搜索、筛选和结果计数；`:1383` 至 `:1408` 处理空态；`:1533` 至 `:1541` 和 `:1836` 至 `:1841` 同步动态筛选按钮语义。 | 业务搜索功能较完整，结果计数和空态文案明确。 | 模式仍是模块私有；清空按钮等 icon 控件与全局控件命名、尺寸和可访问名称可能不一致。 | 将 PPC 的结果计数、动态筛选和空态作为业务表格搜索基线，并统一清空按钮、禁用态、导出当前筛选的反馈规则。 |
| Restricted Words 检索 | `src/modules/sops/views/growth/restricted_words/template.html:968` 至 `:985` 有搜索模式、输入、搜索和重置；`:1003`、`:1012` 有分类 / 风险筛选；`src/modules/sops/views/growth/restricted_words/restrictedWordsHandler.ts:178` 至 `:190` 绑定搜索、Enter 和筛选；`:359` 给出无结果建议；测试覆盖 `tests/e2e/restricted-words.spec.ts` 和 `tests/unit/restricted-words.test.ts` 的多种搜索模式。 | 功能覆盖强，但重置按钮只有 `title`，Enter 使用 `keypress`，模式 / 筛选 / 结果说明没有统一可访问契约。 | 搜索模式复杂时，如果没有字段说明、结果摘要和错误反馈，用户不清楚当前是精确、模糊、全文还是正则检索；视觉回归也难发现语义退化。 | 以“复杂检索表单”治理：模式 select、输入、筛选、结果摘要和重置按钮使用 fieldset / label / helper / live region，并覆盖正则错误和无结果截图。 |
| Marketing Calendar 搜索历史 | `src/modules/amz_hub/views/practice/marketing_calendar/template.html:60` 至 `:70` 渲染搜索框、清空按钮和历史容器；`index.ts:277` 至 `:330` 手动定位历史下拉；`:508` 至 `:533` 渲染历史、清空和删除项。 | 有搜索历史和清空历史能力，但历史项 / 删除项用局部 DOM 和手动定位管理。 | 下拉像 combobox / listbox，却缺少对应语义、键盘选择、焦点关闭和浮层层级契约；删除历史的点击目标和可访问名称不稳定。 | 搜索历史使用 combobox / listbox 或共享 popover contract，历史项和删除按钮都用原生 button，支持方向键、Esc、焦点返回和移动端位置约束。 |
| More Prompts 搜索 | `src/modules/more/views/explore/prompts/template.html:44` 使用 `#prompt-search` placeholder；`index.ts:159`、`:193`、`:249` 至 `:258` 处理搜索、分类和空态。 | 有提示词搜索和空态，但输入、分类和空态仍是页面私有实现。 | More 作为功能发现入口，如果搜索没有 label、结果计数和筛选状态，会削弱提示词库的可扫描性。 | 迁移到共享搜索筛选模板，补 label、计数、空态原因、当前分类状态和键盘触发。 |
| 全局命令 / 快速发现入口 | `index.html:188` 至 `:195` 的 quick access 只提供设置入口；`src/common/utils/actionRegistry.ts:54` 注册 `openSettings`；`src/common/devtools/PerformanceMonitor.ts:51` 的 `Ctrl+Shift+P` 是开发监控快捷键。 | 没有面向业务用户的全局 command palette；发现路径由 Mega Menu、侧边栏和局部搜索分散承担。 | 工具数量增加后，用户需要知道模块位置才能找到功能；局部搜索无法跨模块执行“打开工具 / 跳转 SOP / 执行动作”。 | 建立全局命令入口：统一索引路由、SOP、应用、最近使用、设置和常用动作；支持快捷键、模糊搜索、键盘选择、空态和权限 / 状态过滤。 |
| 搜索回归测试 | `tests/unit/app_center_overview.test.ts:95` 至 `:132` 覆盖 App Center 搜索和空态；`tests/e2e/restricted-words.spec.ts` 覆盖 Restricted Words 搜索 / 筛选；`tests/unit/ppc-search-terms-ui.test.ts:221` 至 `:233` 覆盖 PPC 搜索清空；未看到跨侧边栏、旧总览、Marketing Calendar 历史、More Prompts 和全局命令入口的一致性 smoke。 | 测试是局部功能验证，不是产品级搜索发现契约。 | label、`aria-pressed`、结果计数、空态、键盘路径、历史下拉、移动端浮层和命令入口缺口不会统一暴露。 | 新增 search discovery smoke：侧边栏、总览页、业务表格、复杂检索、搜索历史、提示词库和命令入口都断言搜索范围、结果数、空态、键盘和移动截图。 |

搜索发现治理原则：

1. 搜索入口必须说明范围：全站、当前模块、当前总览、当前表格或当前提示词库，不能只靠 placeholder。
2. 筛选状态必须可见且可读：`aria-pressed` / `aria-selected`、结果计数、空态原因和清空入口要同步更新。
3. App Center Overview 和 PPC 是当前较好的局部基线，应提升为共享契约，而不是继续让每个模块自写。
4. 搜索历史、建议列表和命令面板都属于浮层交互，必须接入统一 popover / combobox / listbox、键盘和 z-index 规则。
5. 全局命令入口应服务“发现和跳转”，不是替代每个业务页面的精细筛选；两类搜索要明确分层。
6. 搜索 smoke 必须覆盖桌面、移动、键盘、读屏名称、结果计数、空态、清空、搜索历史和命令入口。

### 6.26 帮助、引导、说明与学习路径审计补充

项目面向内部运营人员，页面中存在大量业务说明、SOP 长文、外部官方链接、样例数据和局部提示。当前风险不在“没有内容”，而在帮助体验没有被设计成产品级体系：说明散落在总览卡、长文页、hover tooltip、native title、样例按钮、可折叠指南和仓库文档中，缺少统一入口、上下文层级、键盘可达性、移动端可用性、来源可信度、更新时间和回归测试。

| 对象 | 证据 | 当前状态 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| 共享使用指南 | `src/common/components/OverviewRenderer.ts:39` 至 `:42` 定义 `showGuide` / `customGuide`；`:176` 至 `:199` 渲染默认 `使用指南`；`:203` 至 `:225` 渲染快速入口。 | 有总览级指南和快速入口，但默认指南主要重复模块描述，并使用渐变卡片和大图标。 | 指南像装饰说明块，不像任务导向帮助；新用户仍不知道“先做什么、常见错误、下一步去哪、如何回退”。 | 建立 `HelpPanel` contract：目的、适用场景、前置条件、步骤、常见错误、下一步、相关文档；总览页默认指南按同一结构渲染。 |
| Scraper 策略指南 | `src/modules/app_center/views/master_analysis/scraper/template.html:62` 至 `:95` 是可点击策略指南头部和说明；`:63` 使用 `div @click="toggleRefineGuide()"`；`src/modules/app_center/views/master_analysis/scraper/components/ScraperPanel.ts:496` 切换状态；`tests/e2e/scraper.spec.ts:491` 至 `:506` 覆盖展开 / 收起。 | 指南内容业务价值高，但触发器不是 button，缺少 `aria-expanded` / `aria-controls`。 | 键盘和读屏用户难以操作；E2E 测试只验证状态变化，且 `tests/e2e/pages/ScraperPage.ts:152` 至 `:189` 通过 DOM class 切换而非真实点击，无法证明实际交互契约可用。 | 可折叠指南统一为 disclosure 组件：button 触发、语义状态、焦点可见、动画可降级、截图覆盖展开 / 收起 / 移动端。 |
| AI Analysis hover tooltip | `src/modules/app_center/views/master_analysis/ai_analysis/template.html:222` 至 `:243` 用 `@mouseenter` / `@mouseleave` 控制产品摘要 tooltip；`:618` 至 `:635` 用 `group-hover` 展示禁用原因；`AlpinePanel.ts:55`、`:201` 至 `:206` 管理 tooltip 状态。 | 有上下文提示和禁用原因提示，但依赖 hover，且提示层 `pointer-events-none`。 | 移动端、键盘和读屏无法稳定获得说明；禁用按钮的原因不应只藏在 hover tooltip 中。 | tooltip 只承载补充解释；禁用原因、字段错误、前置条件用可见 helper / inline status，tooltip 使用统一 trigger、`aria-describedby`、focus / hover / touch 和关闭规则。 |
| title-only 与原生 title 说明 | PromptLab `src/modules/app_center/views/master_analysis/promptlab/template.html:80`、`:134`、`:159`、`:184`、`:213`、`:240`、`:268`、`:561`、`:566` 多处依赖 `title`；Playground `src/modules/app_center/views/playground/deep-chat/template.html:36`、`:45`、`:49` 依赖 `title`；NPI `src/modules/sops/views/growth/npi_tracker/template.html:819` 至 `:823` 用 `title` 解释列缩写。 | `title` 被当作帮助、tooltip 和可访问名称的混合替代。 | 原生 title 在触屏不可用、键盘不稳定、样式不可控；复杂缩写和动作说明无法纳入视觉回归。 | 所有帮助型 tooltip 改为统一组件；icon-only / 缩写列必须有 `aria-label` 或 `aria-describedby`，并在移动端提供可展开说明。 |
| 样例数据和演示入口 | PPC `src/modules/app_center/views/ppc_search_terms/template.html:55` 提供 `加载样例`；`index.ts:609` 至 `:610` 写入样例状态；`:1402` 至 `:1403` 空态提示导入报表或加载样例。 | PPC 的样例入口可帮助新用户起步，空态也给出下一步。 | 样例能力是局部实现，其他复杂工具没有统一“试用 / 真实数据 / 清空演示数据”模式；用户可能混淆样例结果和真实业务结果。 | 样例数据统一为 onboarding pattern：标记 demo 状态、说明数据来源、提供清空 / 替换真实数据、截图覆盖样例态和真实态切换。 |
| SOP 外部学习链接 | 多个 SOP 页有 `操作视频教程`，如 `src/modules/sops/views/service/qa_maintenance/template.html:1248`、`negative_review/template.html:1084`、`ppc_advertising/template.html:1457`、`restricted_words/template.html:1299`；外部链接多用 `target="_blank"`，如 `qa_maintenance/template.html:1262` 至 `:1266`、`restricted_words/template.html:1313` 至 `:1320`；AMZ Hub 部分链接使用 `rel="noopener noreferrer"`，如 `src/modules/amz_hub/views/knowledge/seo_strategy/template.html:111` 至 `:136`。 | 长文页提供官方链接和学习资源，但外链安全属性、来源说明和视觉模式不一致。 | 新窗口行为、可信来源、更新时间、是否官方、是否需要账号登录都不清晰；`target="_blank"` 缺 `rel` 也有安全风险。 | 建立 `ReferenceLinks` 组件：来源类型、官方 / 内部、更新时间、打开方式、`rel`、失效检查和可访问名称统一。 |
| 仓库文档与应用内帮助割裂 | `docs/README.md:8` 至 `:11` 列出部署、DNA 提取器、PromptLab 置信度指南；`:34` 至 `:35` 有故障排查；静态搜索只看到这些文档被 `docs/README.md` 引用，未看到应用 UI 链接到 `docs/guides` 或 troubleshooting。 | 项目有技术 / 用户指南，但主要停留在仓库文档层。 | 运营用户在应用内遇到问题时无法从当前页面直达对应指南；文档也缺少与具体 UI 状态绑定的入口。 | 每个复杂工具提供“帮助 / 文档 / 故障排查”入口，链接到对应 guide 或内嵌帮助抽屉，并记录文档版本与适用模块。 |
| 可关闭提示与“不再提示” | `src/modules/app_center/views/master_analysis/scraper/handlers/dataOperations.ts:317` 至 `:389` 自建确认 modal，含 `不再提示` 存储逻辑。 | 能减少重复提示，但属于局部 modal 和局部偏好。 | 用户关闭关键提示后缺少恢复路径；这类偏好没有进入设置面板或帮助中心，也没有统一可访问语义。 | `不再提示` 必须登记到偏好中心：可查看、恢复、说明影响范围；关键风险提示不能无条件永久隐藏。 |
| 帮助回归测试 | `tests/e2e/scraper.spec.ts:491` 至 `:506` 覆盖策略指南展开 / 收起；`tests/e2e/ai-analysis.spec.ts:545` 至 `:547` 对 tooltip 只做可选日志；未看到应用内 docs 链接、外部 reference link、title-only、帮助抽屉、样例状态和移动 tooltip 的统一 smoke。 | 测试覆盖局部行为，不覆盖帮助体系质量。 | hover-only、title-only、不可键盘展开、外链缺 `rel`、样例与真实数据混淆、文档入口缺失都不会稳定失败。 | 新增 help smoke：tooltip / disclosure / sample / reference links / docs entry / dismissible tips 覆盖键盘、移动、暗色、高对比和截图。 |

帮助学习治理原则：

1. 帮助内容分层：页面目标和前置条件常驻可见，复杂解释用 disclosure，补充定义用 tooltip，长文档用帮助抽屉或文档链接。
2. Tooltip 不能承载关键状态、错误、禁用原因或下一步；这些必须可见、可聚焦、可被读屏读取。
3. 所有指南 / 折叠说明都用原生 button 或 disclosure 语义，维护 `aria-expanded` / `aria-controls`。
4. 样例数据是 onboarding 能力，必须明确 demo 状态、来源、清空和替换真实数据路径。
5. 外部官方链接和仓库指南需要统一 ReferenceLinks：来源、更新时间、打开方式、安全属性和失效检查。
6. 帮助体系必须纳入 smoke：桌面、移动、键盘、触屏、读屏名称、暗色、高对比、外链、样例态和“不再提示”恢复路径。

### 6.27 历史记录、草稿、快照、最近使用与可恢复性审计补充

项目已经具备较完整的本地持久化基础：Scraper 历史快照、PromptLab / Keyword Hunter / PPC 的状态恢复、Deep Chat 本地会话、系统设置导入导出和 IndexedDB 数据仓库都已存在。当前风险不在“没有保存”，而在保存与恢复没有形成用户可理解、可验证、可撤销的产品流程：恢复通常静默发生，删除多依赖 `window.confirm`，快照覆盖语义不透明，导入恢复缺少预览和冲突策略，视觉测试也没有稳定覆盖历史 / 草稿 / 恢复态。

| 对象 | 证据 | 当前状态 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| 本地持久化基础 | `src/services/storageService.ts:34` 定义 `SCRAPE_HISTORY`；`:587` 至 `:629` 提供历史读写和清理；`src/services/localDataStore.ts:151`、`:174`、`:196` 提供 `clearAll` / `exportAll` / `importAll`；`src/stores/useAppStore.ts:111`、`:125`、`:276` 管理 `currentHistoryId`。 | 技术底座较完整，localStorage、IndexedDB 和全局 store 都能承载恢复能力。 | 数据被保存不等于用户知道“保存了什么、来自哪里、何时恢复、恢复会覆盖什么”。静默持久化会制造错觉：界面看起来是新任务，实际可能带着旧状态。 | 建立 `Recovery Contract`：所有恢复态显示来源、时间、范围、覆盖对象、保存 / 放弃 / 另存为路径，并把数据层状态映射到可见 UI。 |
| Scraper 历史快照列表 | `src/modules/app_center/views/master_analysis/scraper/template.html:612` 至 `:730` 渲染 `历史快照`；`:642` 使用可点击 `div @click="loadHistoryItem(item)"`；`:655`、`:704` 的删除 / 加载按钮主要依赖 `title`；`HistoryPanel.ts:47`、`:63`、`:74` 使用原生 `confirm`。 | 有快照列表、已分析 badge、加载、删除、查看报告能力。 | 历史卡片主操作不是 button；删除按钮依赖 hover 显示，移动端和键盘发现性弱；删除 / 覆盖没有统一 modal、撤销或焦点管理；`title` 不能承载可访问名称和帮助说明。 | 历史快照使用列表 / 卡片 contract：主卡片 button 化、当前快照标记、更新时间、数据规模、报告状态、键盘可达、移动端显式操作、统一危险确认和删除后 undo。 |
| 快照更新语义 | `src/modules/app_center/views/master_analysis/services/historyService.ts:86` 至 `:136` 依据 `currentHistoryId` 更新现有快照或插入新快照；`tests/unit/historyService.test.ts` 覆盖创建 / 更新 / 最大数量。 | 逻辑上能复用当前快照，也能限制历史数量。 | 用户界面没有清楚说明“本次采集会覆盖当前快照还是创建新快照”，也缺少版本差异、变更摘要和另存为入口。 | 在执行采集 / 加载快照 / 进入 AI 分析前展示快照策略：当前快照、将要覆盖的对象、是否另存为新快照、分析报告是否会随快照保留。 |
| 草稿与配置静默恢复 | `PromptlabPanel.ts:328` 调用 `restoreState()`，`:399` 恢复用户产品资料；`keyword_hunter/input/index.ts:112` 和 `:488` 恢复输入；`ppc_search_terms/index.ts:359`、`:1709` 恢复阈值。 | 多个工具会恢复上次输入、资料或分析设置。 | 恢复是好能力，但如果没有“已恢复草稿 / 上次设置”的可见状态，用户无法判断当前内容是新输入、旧草稿还是自动带入配置；错误数据也可能被继续使用。 | 所有草稿恢复显示 lightweight banner：来源、保存时间、恢复字段、丢弃、继续编辑、保存为默认；复杂配置恢复要有设置摘要和重置入口。 |
| Deep Chat 会话历史 | `src/modules/app_center/views/playground/deep-chat/index.ts:609` 至 `:611` 绑定删除；`:978` 至 `:984` 删除会话并提示本地历史不可恢复；线程列表渲染包含消息数和时间。 | 本地会话历史可见，删除按钮有较明确的危险文案。 | 删除后不可恢复，只能依赖 `window.confirm`；没有归档、撤销、单会话导出或“最近删除”；与系统设置的全量备份能力也没有视觉关联。 | Chat 历史分层为新建、继续、归档、删除、导出；删除默认提供短时 undo 或最近删除区，高风险清空才进入二次确认。 |
| 系统设置备份与恢复 | `src/components/settings/systemSettings.html:302` 至 `:337` 展示 localStorage / IndexedDB 用量和 `导出全部`、`导入恢复`、`清空全部`；`systemSettings.ts:624` 至 `:695` 执行导出、导入、清理和二次清空确认。 | 全量备份能力存在，且文案说明清理缓存不会删除配置、密钥、历史或聊天。 | 导入恢复没有预览文件内容、数据范围、版本兼容、冲突策略或恢复前备份提示；恢复结果还要求刷新页面确认，用户难以知道哪些模块已经被替换。 | 导入恢复改为向导：选择文件、校验版本、预览范围、冲突策略、确认恢复、恢复结果摘要和失败回滚说明；备份入口要从历史 / chat / 设置等相关页面互相可达。 |
| 不可逆删除与撤销缺口 | `HistoryPanel.ts:47`、`:63` 删除 / 清空历史；`deep-chat/index.ts:984` 删除会话；`src/components/settings/systemSettings.ts:682`、`:684` 清空全部；`src/modules/app_center/views/master_analysis/scraper/handlers/dataOperations.ts` 的删除说明包含不可撤销语义。 | 危险操作普遍有确认，但以浏览器 confirm 或局部 modal 为主。 | 确认不等于可恢复；用户误删后缺少 undo、最近删除、归档、导出备份提示和统一视觉语言。 | 删除策略分级：普通条目短时 undo；批量清空二次确认；全量清空要求输入确认词并提示先导出；所有危险操作接入同一 modal、焦点和文案 contract。 |
| 可恢复性回归测试 | `tests/unit/LocalDataStore.test.ts`、`StorageService.test.ts`、`historyService.test.ts`、`scraper-historyPanel.test.ts`、`promptlab.test.ts` 覆盖部分存储和恢复逻辑；`tests/visual/visual.test.ts:166` mask `.history-item`，而当前 Scraper UI 使用 `.history-card`。 | 单元测试有基础，但视觉 / 交互恢复态覆盖薄弱。 | 逻辑测试能证明数据可存取，不能证明用户能看懂、键盘可达、移动端可操作、删除可撤销、导入可预览；视觉 mask 还可能让历史状态完全绕过回归。 | 新增 recovery smoke：Scraper 快照、PromptLab 草稿、Keyword Hunter 输入、PPC 设置、Deep Chat 会话、系统导入导出、删除 undo、恢复 banner、移动端、暗色、高对比和键盘路径。 |

可恢复性治理原则：

1. 可恢复性是可见流程，不是隐藏在 localStorage / IndexedDB 里的副作用。
2. 每个恢复态都必须说明来源、时间、范围和下一步：继续、丢弃、另存、替换或恢复默认。
3. 快照 / 草稿 / 最近会话 / 配置恢复使用同一套状态语言，避免每个工具自定义“历史”“草稿”“记录”的含义。
4. 删除要分级处理：可 undo 的不要做成不可逆；真正不可逆的必须给出备份、影响范围和二次确认。
5. 导入恢复必须先预览再覆盖，并说明冲突策略、版本兼容和失败回滚。
6. recovery smoke 必须覆盖视觉、键盘、触屏、暗色、高对比、导入导出、恢复 banner、删除 undo 和历史快照卡片。

## 7. 建议整改清单

详细任务拆分见 `docs/UI_UX_REMEDIATION_BACKLOG.md`。本节保留按优先级汇总的验收清单。

### P0：必须先修

| 编号 | 整改项 | 验收标准 |
| --- | --- | --- |
| P0-1 | 移动端侧边栏改为抽屉 / overlay | 375、390、430px 下主内容宽度接近视口宽度，非打开状态侧边栏不占宽。 |
| P0-2 | 修复移动端模块主内容容器 | `sops`、`appCenter`、`ppc`、`playground`、`amzHub`、`more` 移动截图无竖排断字、无核心内容被挤压。 |
| P0-3 | 建立移动端壳层回归截图 | Playwright 覆盖首页 + 6 个模块页，截图纳入回归证据。 |
| P0-4 | 修复一级导航移动端入口 | 768px 以下仍能进入 SOPs、应用中心、Amazon 智库、更多，不依赖桌面 hover 菜单。 |

### P1：两周内建议完成

| 编号 | 整改项 | 验收标准 |
| --- | --- | --- |
| P1-1 | 首页改为运营工作台首屏 | 首屏展示待办、最近工具、关键 SOP、异常状态，品牌 hero 不再占满首屏。 |
| P1-2 | 移除主页自定义 cursor | 默认系统指针恢复，交互反馈通过按钮 / 链接状态体现。 |
| P1-3 | 路由级 skeleton | 动态路由加载时主区域不空白，超过 300ms 有视觉反馈。 |
| P1-4 | 统一语义 token | `--app-*`、`--ppc-*` 主要变量映射到全局 token；新增模块不能再随意定义主色和阴影。 |
| P1-5 | 收敛欢迎横幅 | 默认横幅无 orb / particle；仅保留标题、说明、状态、主操作、标签。 |
| P1-6 | 收敛圆角与阴影 | 主卡片圆角以 8px 为默认；阴影阶梯不超过 3 档。 |
| P1-7 | 减少装饰渐变 | 工具型页面渐变只用于品牌入口或重要状态，不作为默认面板背景。 |
| P1-8 | Mega Menu 语义化 | 一级菜单 button 维护 `aria-expanded` / `aria-controls`，支持键盘打开和关闭。 |
| P1-9 | 核心页面标题结构治理 | PromptLab、Scraper、AI Analysis、Playground 等页面补齐 h1，避免标题层级跳跃。 |
| P1-10 | 设计 token 准入规则 | 明确允许的全局 token、组件私有 token 和模块临时 token；新增 CSS 不再引入未登记主色、阴影、圆角。 |
| P1-11 | 重复组件库存治理 | 以卡片、徽章、按钮、图标容器、动效为第一批抽取目标，对齐 `docs/css-module-analysis-report.md` 的重复模式。 |
| P1-12 | 共享渲染器语义治理 | `OverviewRenderer`、`SidebarRenderer`、Mega Menu 统一搜索、筛选、展开、可点击卡片语义。 |
| P1-13 | 可点击卡片原生化 | Mega Menu、SOPS 总览、More 总览的 `div data-action` 导航卡片改为 button / link。 |
| P1-14 | 状态反馈语义治理 | loading、empty、error、toast、progress 增加 status / alert / live region，并定义文案与显示时长。 |
| P1-15 | 弹窗语义与焦点治理 | `AppModal` 增加 dialog 语义、焦点陷阱、焦点返回；危险确认弹窗降噪。 |
| P1-16 | 数据表组件标准化 | 共享表格模式覆盖 caption / scope / sticky / density / 数值对齐 / 移动摘要。 |
| P1-17 | 阅读型长内容模板 | AMZ Hub 与 SOP 长文页有目录、锚点、稳定行宽、正文尺寸和 checklist 组件规则。 |
| P1-18 | 概览页入口模式统一 | SOPS、AMZ Hub、More 和共享 OverviewRenderer 迁移到 App Center 的搜索、筛选、计数、空态模式。 |
| P1-19 | 统一导航契约 | 业务 UI 不直接写 `window.location.hash`；跨工具跳转统一 route helper，并保留加载态和历史记录。 |
| P1-20 | 输入工作流标准化 | 上传、粘贴、大文本输入、AI 执行、结果错误卡形成统一组件和语义规则。 |
| P1-21 | 导入 / 上传错误反馈标准 | 文件类型、大小、解析失败、数据结构错误在上传面板内持久展示，toast 只作辅助。 |
| P1-22 | 指标 / 图表 / 状态编码标准 | KPI、进度、置信度、分数、风险等级和 Chart.js 图表统一 token、阈值、文案、图例和可访问替代内容。 |
| P1-23 | 主题 / 暗色模式契约治理 | 分离品牌主题与明暗模式；`light` / `dark` / `auto` 统一驱动 DOM、store、storage 和系统偏好监听。 |
| P1-24 | 动效 / 微交互契约治理 | 定义 motion scale、动效类别、运行时开关、reduced-motion 规则；反馈型动效和装饰型动效分层。 |
| P1-25 | 键盘交互 / 焦点状态契约治理 | 统一可点击语义、Enter / Space、Esc、Tab 顺序、focus-visible、`aria-pressed` / `aria-expanded` / `aria-current` 规则。 |
| P1-26 | 视觉资产 / 图标系统契约治理 | 建立品牌资产单一来源、icon registry、空状态模板和结构性 emoji 禁用规则。 |
| P1-27 | 视觉性能 / 字体加载契约治理 | 统一字体与图标来源、CSS ready 策略、首屏 fallback、路由 style-ready 和核心 Web Vitals 门槛。 |
| P1-28 | 层级 / 浮层 / 滚动锁定契约治理 | 统一 z-index token、overlay manager、body scroll lock、safe-area、drawer / modal / toast / loading 堆叠顺序。 |
| P1-29 | 响应式断点 / 容器 / 密度契约治理 | Tailwind、TS token、CSS media query、容器宽度、页面类型密度和截断策略使用同一套响应式规则。 |
| P1-30 | AI 输出 / Markdown / 代码块 / 导出契约治理 | 统一 Markdown variant、CodeBlock / JsonViewer、copy / download / print 状态和 LLM 输出结构 fallback。 |
| P1-31 | 文案 / 术语 / 微文案契约治理 | 建立 UI copy registry 和术语表，统一 `AI / Prompt / API / LLM`、复制 / 下载 / 导出、empty / loading / error、危险操作和可访问名称文案。 |
| P1-32 | 系统设置 / 偏好 / 本地数据管理契约治理 | 设置抽屉接入 dialog / drawer 契约；API Key、模型、代理、导入导出、清缓存、清空全部和性能监控分层治理。 |
| P1-33 | 搜索 / 筛选 / 发现入口契约治理 | 统一侧边栏、总览页、业务表格、复杂检索、搜索历史和全局命令入口的 label、状态、计数、空态和键盘规则。 |
| P1-34 | 帮助 / 引导 / Tooltip / 文档入口契约治理 | 统一使用指南、折叠说明、tooltip、样例数据、外部引用链接、应用内文档入口和“不再提示”偏好恢复路径。 |
| P1-35 | 历史 / 草稿 / 快照 / 恢复契约治理 | 统一历史快照、草稿恢复、最近会话、配置恢复、备份导入、危险删除和撤销路径的可见状态、语义、文案和测试契约。 |

### P2：逐步治理

| 编号 | 整改项 | 验收标准 |
| --- | --- | --- |
| P2-1 | 触控目标统一 | 移动端可操作元素 hit area 不低于 44px；小图标按钮有补足点击区域。 |
| P2-2 | icon-only 控件补语义 | icon-only button 有 `aria-label` 或可访问文本；hover / focus / active 状态统一。 |
| P2-3 | 表单控件响应式 | select、input、textarea 在移动端高度和宽度稳定，不出现 30px 小控件。 |
| P2-4 | 减少模块内 `!important` | 除 reset、第三方覆盖、reduced motion 外，模块样式避免继续新增 `!important`。 |
| P2-5 | 内联颜色迁移 | 内联 `style` 中的颜色、渐变、圆角迁移到 class / token。 |
| P2-6 | 暗色模式截图验收 | 首页、App Center、PPC、SOPS、Playground、AMZ Hub、More 各提供 light / dark 截图，并覆盖显式 dark 与 system dark。 |
| P2-7 | 数据表移动策略 | PPC 等结果表在移动端提供卡片摘要或可控横向滚动，不挤压正文。 |
| P2-8 | emoji 分层治理 | 结构性 UI 不使用 emoji；内容型 emoji 保留但需确认语义清晰。 |
| P2-9 | 阅读型内容页治理 | AMZ Hub / SOP 长文页统一正文行宽、目录、checkbox label 和触控区域。 |
| P2-10 | 对比度与小字号治理 | 状态 badge、步骤编号、辅助说明、禁用按钮按质量量化基线逐页清理。 |
| P2-11 | 表单 label 治理 | PPC、PromptLab、More Prompts、侧边栏搜索等可见控件补齐 label 或 aria 名称。 |
| P2-12 | CSS 变量迁移基线 | `npm run css:audit` 的符合率从 46.3% 提升到 70% 以上；新增不合规变量为 0。 |
| P2-13 | 动效治理 | `transition: all` 逐步替换为明确属性；Scraper、首页 canvas、welcome banner、危险弹窗、AI Analysis shimmer 纳入 reduced-motion 清理。 |
| P2-14 | HTML 模板 label 批量治理 | 疑似缺 label 控件从 196 个降至 0；优先处理 NPI、AMZ Quality、Promotion、PPC、PromptLab。 |
| P2-15 | 状态组件视觉回归 | loading、empty、error、toast、modal、progress 都有桌面/移动截图；normal 与 reduced-motion 各有一组关键状态验收。 |
| P2-16 | NPI 宽表移动治理 | 桌面保留高密度宽表，移动端改为分组卡片摘要或显式横向滚动 + 冻结关键列。 |
| P2-17 | 表格可访问性补齐 | PPC、Restricted Words、SOP 表格补 caption / scope / 可读排序筛选状态。 |
| P2-18 | 小字号库存阈值治理 | 长文页和表格页正文 / 说明 / 结果内容不再依赖 `text-xs`；低于 12px 只用于非关键信息。 |
| P2-19 | 页面位置感知治理 | 动态模块页提供 breadcrumb / page context / `aria-current`，移动端关闭侧栏后仍能知道当前位置。 |
| P2-20 | 多步工具任务流提示 | Keyword Hunter、Scraper、AI Analysis、PromptLab 展示阶段、下一步、返回路径和数据保留提示。 |
| P2-21 | 大文本输入区 label / helper / error 治理 | Keyword Hunter、PromptLab、PPC context、More Prompts 搜索补齐 label、`aria-describedby` 和字段级错误。 |
| P2-22 | 折叠配置区语义治理 | Scraper、AI Analysis、PromptLab 折叠面板改为 button + `aria-expanded` / `aria-controls`。 |
| P2-23 | 进度条 / 分数 / 置信度语义治理 | 全局进度、AI Analysis 执行进度、Scraper 任务进度、Keyword Hunter 评分和覆盖率都有 progress/status 语义与状态截图。 |
| P2-24 | 图表可访问替代内容 | AMZ Hub canvas 图表补 `aria-label` / `aria-describedby`、数据摘要、fallback 表格和图表截图验收。 |
| P2-25 | 高对比与暗色 token 清理 | `bg-white`、`text-slate-*`、浅色 inline gradient、Chart.js 浅色网格迁移到语义 token；forced-colors smoke 覆盖导航、表单、badge、table、chart fallback。 |
| P2-26 | 键盘可达性 smoke / 焦点回归 | 顶部导航、Mega Menu、概览卡片、筛选、折叠面板、弹窗、抽屉都验证 Tab、Enter / Space、Esc、焦点返回和语义状态同步。 |
| P2-27 | emoji / 空状态 / 图片资产清理 | 结构性 UI emoji 迁移到图标组件；空状态统一模板；新增图片都有 alt、尺寸、加载策略和版权来源。 |
| P2-28 | 字体 / CSS / 视觉稳定性 smoke | 核心路由验证 FCP、LCP、CLS、TBT、字体 fallback、图标可见、主 CSS 失败降级和模块 style-ready。 |
| P2-29 | 浮层堆叠 / 滚动锁定 / safe-area smoke | modal、sheet、toast、loading、mega menu、搜索下拉、sticky table 和移动抽屉在桌面 / 390px / 横屏下有截图和交互断言。 |
| P2-30 | 响应式断点 / 横屏 / 超宽屏 smoke | 390、430、667x375 横屏、900、1100、1440、1920、超宽屏覆盖核心路由，验证容器宽度、列数、截断和横向滚动。 |
| P2-31 | AI 输出 / 导出 / Markdown smoke | PromptLab、AI Analysis、Keyword Hunter、Playground 覆盖 empty、loading、error、long output、code block、copy、download、print。 |
| P2-32 | 文案一致性 / 中英混排 / 状态文案 smoke | 扫描术语变体、中文 ASCII 标点、placeholder-only、title-only；固定 mock 覆盖 empty、loading、error、copy、download、export 和危险确认文案。 |
| P2-33 | 设置面板 / 密钥 / 备份 / 危险操作 smoke | 覆盖打开关闭、焦点陷阱、密钥显示按钮、字段级错误、模型同步失败、代理测试、导入预览、清空确认、移动抽屉和暗色 / 高对比截图。 |
| P2-34 | 搜索 / 筛选 / 命令入口 smoke | 覆盖侧边栏搜索、概览筛选、App Center 搜索、Restricted Words 模式、PPC 动作搜索、Marketing Calendar 历史、More Prompts、全局命令入口、键盘、aria、计数、空态和移动截图。 |
| P2-35 | 帮助 / 引导 / Tooltip / 学习路径 smoke | 覆盖使用指南、Scraper 策略指南、AI Analysis tooltip、title-only 替代、样例数据、外部链接、应用内文档入口、“不再提示”恢复、键盘、移动、暗色和高对比截图。 |
| P2-36 | 历史 / 草稿 / 快照 / 恢复 smoke | 覆盖 Scraper 历史快照、PromptLab 草稿、Keyword Hunter 输入恢复、PPC 设置恢复、Deep Chat 会话、系统导入导出、删除 undo、键盘、移动、暗色和高对比截图。 |

## 8. 推荐执行顺序

1. 修移动壳层：侧边栏抽屉、主内容全宽、移动截图回归，覆盖 SOPS、App Center、PPC、Playground、AMZ Hub、More。
2. 加路由 skeleton：减少空白等待感。
3. 改首页首屏：从展示封面调整为运营工作台。
4. 修一级导航移动端入口和 Mega Menu 语义。
5. 统一 token：先收敛 App Center 与 PPC，再处理欢迎横幅、AMZ Hub、SOP 内容页。
6. 收敛视觉装饰：减少 blob、orb、particle、大渐变和大阴影。
7. 建立表格和长内容模板：先治理 NPI、PPC 搜索词、Restricted Words、AMZ Quality Listing，再覆盖 SOP 长页。
8. 统一概览页和导航契约：用 App Center Overview 作为基线，收敛 SOPS / AMZ / More / OverviewRenderer，并禁止新增直接 hash 跳转。
9. 统一输入工作流：先处理 Keyword Hunter、PPC、Scraper、PromptLab 的 label / helper / error / loading 状态。
10. 统一指标和状态编码：把 KPI、进度、置信度、分数、风险等级和 Chart.js 图表纳入同一套 token、语义和截图规则。
11. 治理主题契约：分离品牌主题和明暗模式，再补暗色 / 高对比截图。
12. 治理动效契约：统一 AnimationManager、motion token、reduced-motion 和视觉测试覆盖。
13. 治理键盘与焦点契约：把 App Center Overview / PPC 的交互语义回灌到共享渲染器、Mega Menu、旧总览页和折叠面板。
14. 治理视觉资产和图标契约：统一 logo 来源、icon registry、emoji 分层、空状态模板和图片准入。
15. 治理视觉性能契约：统一字体 / 图标来源、CSS 加载策略、路由 style-ready、Web Vitals 和 fallback 截图。
16. 治理层级与滚动契约：统一 z-index、overlay manager、滚动锁定、safe-area、浮层堆叠和 sticky table 背景穿透规则。
17. 治理响应式契约：统一断点、容器宽度、页面密度、横屏、超宽屏和截断策略。
18. 治理 AI 输出契约：统一 Markdown / CodeBlock / JsonViewer / report card / copy / download / print 规则。
19. 治理文案契约：统一术语表、动作词、状态文案、错误文案、危险操作文案、placeholder / title / aria-label 规则。
20. 治理设置体验契约：统一系统设置、密钥、模型、代理、本地数据、危险操作和开发监控分层。
21. 治理搜索发现契约：统一全局命令、侧边栏搜索、概览筛选、业务表格搜索、复杂检索和搜索历史。
22. 治理帮助学习契约：统一使用指南、折叠说明、tooltip、样例数据、文档入口、外部引用和“不再提示”偏好。
23. 治理可恢复性契约：统一历史快照、草稿、最近会话、配置恢复、备份导入、危险删除和撤销路径。
24. 补交互细节：触控目标、icon-only 语义、表单控件、标题层级、状态反馈、弹窗语义、暗色模式截图。
25. 建立质量量化回归：把 `#main-content` 几何、h1、label、触控目标、低对比样本、状态组件截图、表格移动摘要、概览页筛选状态、输入错误态、进度 / 分数 / 图表语义、dark / forced-colors、reduced-motion、键盘路径和焦点返回、图标 / 空状态 / 图片资产、字体 / CSS / Web Vitals、浮层堆叠 / 滚动锁定 / safe-area、响应式断点 / 横屏 / 超宽屏、AI 输出 / 导出 / Markdown、文案一致性、设置面板、搜索发现、帮助学习、可恢复性纳入 smoke test。

## 9. 验收建议

移动端验收：

- 视口：375x812、390x844、430x932、768x1024。
- 页面：首页、SOPS 总览、App Center 总览、PPC 搜索词分析器、Playground、AMZ Hub 总览、More 总览。
- 必须检查：无主内容挤压、无横向不可控溢出、无竖排断字、主操作可点击、侧边栏可关闭。
- 横屏补充：667x375、844x390，必须检查顶部导航、抽屉、bottom sheet、表格横滚和固定输入框不遮挡内容。

桌面端验收：

- 视口：1280x800、1440x900、1920x1080。
- 必须检查：卡片密度、主操作优先级、筛选区换行、表格可读性、hover / focus / loading 状态。
- 断点边界补充：900x800、1100x800、1536x960、2560x1440，必须检查多列网格、容器最大宽度、长标题截断和超宽屏留白。

设计系统验收：

- 新增或修改页面不得新增未映射的主色、圆角、阴影 token。
- 组件状态必须覆盖 default、hover、active、focus-visible、disabled、loading。
- loading、empty、error、toast、modal、progress 必须有可访问语义和截图验收。
- KPI、score、confidence、risk badge 和 Chart.js 图表必须有可读文案、非颜色线索、替代摘要和截图验收。
- 主题验收必须区分品牌主题和明暗模式；`light` / `dark` / `auto` 的 DOM 标记、store 状态和截图结果一致。
- 动效验收必须区分 normal 与 reduced-motion；装饰型循环动画默认关闭或有显式开关。
- 6 列以上数据表必须有桌面和移动两套验收：桌面检查 sticky / density / 数值对齐，移动检查卡片摘要或明确横向滚动。
- 长内容页必须检查目录、锚点、正文行宽、正文尺寸、checklist label 和 44px 触控区域。
- 概览页必须检查筛选 `aria-pressed`、结果计数、空态、搜索 label、卡片键盘触发和当前页面位置感知。
- 搜索 / 筛选 / 命令入口必须检查搜索范围 label、结果计数、清空按钮、空态、搜索历史、键盘选择、`aria-pressed` / `aria-selected` 和移动端浮层位置。
- 帮助 / 引导 / Tooltip 必须检查 disclosure 语义、`aria-describedby`、hover / focus / touch、样例数据状态、文档入口、外部链接 `rel`、不再提示恢复路径和移动端可用性。
- 历史 / 草稿 / 快照 / 恢复必须检查恢复来源、保存时间、当前快照、覆盖提示、撤销路径、导入预览、删除确认、键盘可达和移动端可用性。
- 输入工作流必须检查字段 label、helper、字段级错误、上传错误区、AI 执行 loading / success / error 状态。
- 键盘路径必须检查顶部导航、Mega Menu、概览卡片、筛选、折叠面板、弹窗和抽屉的 Tab 顺序、Enter / Space、Esc、焦点返回和语义状态同步。
- 视觉资产必须检查 logo 单一来源、关键图标可见、结构性 UI 无 emoji、空状态模板一致；新增图片必须有 alt、尺寸和加载策略。
- 视觉性能必须检查字体 fallback、图标字体加载、主 CSS 失败降级、模块 style-ready、FCP、LCP、CLS、TBT，并覆盖桌面和 390px 移动端。
- 层级 / 浮层必须检查 modal、sheet、toast、loading、mega menu、搜索下拉、移动抽屉、sticky table 的堆叠顺序、滚动锁定、背景不可交互和 safe-area padding。
- 响应式必须检查断点 token 一致、容器类型选择、组件列数、固定宽度、截断可恢复、横屏和超宽屏密度。
- AI 输出必须检查 Markdown 标题、表格、列表、代码块、JSON viewer、长 Prompt、复制 / 下载 / 打印、空态、加载态、错误态和固定 mock 输出截图。
- 文案必须检查术语表、动作词、中文标点、中英混排、placeholder / title / aria-label 边界、empty / loading / error / toast / 危险确认文案。
- 设置必须检查 dialog / drawer 语义、焦点管理、字段级错误、密钥显示按钮、模型同步、代理配置、导入预览、导出文件、清缓存、清空确认和开发监控分层。
- 每个核心页面至少保留一张 light 截图；暗色模式上线前补 dark 截图。
- 核心页面量化指标应逐步收敛：缺 label 控件为 0，h1 缺失为 0，移动端主内容宽度达标。

## 10. 结论

本项目不缺视觉投入，缺的是“运营工具标准”下的收敛。当前最优先的问题不是继续美化，而是先恢复移动端可用性，再把各模块的视觉语言统一到全局 token 和稳定组件规则中。完成 P0 和 P1 后，桌面端会从“漂亮但分散”更接近“专业、稳定、可长期维护”的内部运营平台。
