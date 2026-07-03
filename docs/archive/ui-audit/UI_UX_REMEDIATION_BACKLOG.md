# sops 视觉与 UX 整改 backlog（精简版）

本 backlog 基于 `UI_UX_VISUAL_AUDIT_REPORT.md`。目标是修真实可见问题，不把视觉审计扩展成产品平台重建。

## 执行原则

- 先修阻断，再做收敛。
- 先改壳层和高复用样式，再改单页细节。
- 优先复用现有 token、CSS、渲染器和弹窗能力。
- 不预设新 Provider / Registry / 大型组件，除非重复问题已经被证据证明。
- 每项整改必须有截图、DOM 断言或静态扫描指标验收。

## P0：移动端可用性阻断

| ID | 整改项 | 影响范围 | 主要文件 | 验收标准 |
| --- | --- | --- | --- | --- |
| UI-P0-01 | 动态侧边栏移动端抽屉化 | SOPS、App Center、PPC、Playground、AMZ Hub、More | `index.html`、`src/common/ui/navigation.ts`、`src/css/layouts/container.css` | 375 / 390 / 430px 下侧边栏关闭时不占宽，`#main-content` 接近视口宽度。 |
| UI-P0-02 | 移动端主内容容器修复 | 全部动态侧边栏模块 | `index.html`、模块根容器样式 | 移动截图无竖排断字，核心表单和卡片不被压缩到不可读。 |
| UI-P0-03 | 移动端一级导航入口 | 全站导航 | `index.html`、`src/css/components/header-main.css` | 768px 以下可以进入 SOPs、应用中心、Amazon 智库、更多，不依赖 hover。 |
| UI-P0-04 | 壳层移动截图回归 | 首页 + 6 个模块 | `tests/visual/visual.test.ts` 或新增 smoke | 关键移动截图纳入回归，失败时能定位到具体页面。 |

## P1：核心视觉收敛

| ID | 整改项 | 影响范围 | 主要文件 | 验收标准 |
| --- | --- | --- | --- | --- |
| UI-P1-01 | 首页 splash 保留 + 极简浮动工作台入口 | 首页 | `src/modules/home/*` | 保留旧版全屏 splash / 粒子 hero 和完整 Home；工作台只作为低干扰浮动入口，不把首屏主体改成工作台面板。 |
| UI-P1-02 | 移除自定义 cursor | 首页 | `src/modules/home/homeDisplay.css`、首页模板 | 删除 `cursor: none` 和 follower 依赖，恢复系统指针。 |
| UI-P1-03 | 路由级 loading / skeleton | 动态路由 | 路由加载与模块挂载代码 | 页面等待超过 300ms 时主区域有稳定 loading，不出现长时间空白。 |
| UI-P1-04 | App Center / PPC / Welcome Banner token 对照 | 高扩散样式源 | `app_center_style.css`、`ppc_tools/style.css`、`welcome-banner.css` | 主要 `--app-*`、`--ppc-*`、`--wb-*` 映射到全局 token；新增局部 token 需登记。 |
| UI-P1-05 | 横幅和装饰降噪 | 首页、App Center、SOPS、AMZ Hub、More | `welcome-banner.css`、相关模板 | 工具页默认无 orb / particle；普通面板不使用大渐变和大阴影。 |
| UI-P1-06 | 共享卡片 / 按钮 / badge 统一 | SOPS、AMZ Hub、App Center、More | `src/css/components/cards.css`、`badges.css`、模块 CSS | 同类入口卡、状态 badge、按钮尺寸和 hover / focus 状态一致。 |
| UI-P1-07 | 总览页和侧边栏语义治理 | Overview、Sidebar、Mega Menu | `OverviewRenderer.ts`、`SidebarRenderer.ts`、`megaMenu.ts` | 搜索有 label；筛选按钮同步 `aria-pressed`；展开项维护 `aria-expanded`。 |
| UI-P1-08 | 表单 / 上传 / AI 输入状态标准化 | PPC、Scraper、Keyword Hunter、PromptLab、AI Analysis | 对应模板和状态组件 | label、helper、字段级错误、loading、success、error 的显示位置和语义一致。 |
| UI-P1-09 | 状态反馈和弹窗语义 | loading、empty、error、toast、progress、modal | `notifications.ts`、`LoadingManager.ts`、`AppModal.ts` | 状态组件有 role / aria-live；弹窗有标题关联、焦点进入和焦点返回。 |
| UI-P1-10 | 表格和长内容模板 | NPI、PPC、Restricted Words、SOP / AMZ Hub 长页 | 相关模板和 CSS | 宽表有移动摘要或明确横滚；长文页有稳定行宽、目录 / 锚点和 checklist label。 |
| UI-P1-11 | 主题和动效底线 | 全站主题 / motion | `variables.css`、`themeConfig.ts`、动画 CSS | light / dark / forced-colors、normal / reduced-motion 至少覆盖核心页面截图。 |
| UI-P1-12 | 视觉回归矩阵扩展 | 核心页面 | `tests/visual/visual.test.ts` | 390px、768px、1440px 覆盖首页 + 6 个核心模块；动态状态不只 blanket mask。 |

## P2：逐页质量清理

| ID | 整改项 | 影响范围 | 主要文件 | 验收标准 |
| --- | --- | --- | --- | --- |
| UI-P2-01 | 表单 label 补齐 | PPC、PromptLab、More Prompts、侧边栏搜索 | 对应模板与 `SidebarRenderer.ts` | 可见 input / select / textarea 有 label、`aria-label` 或 `aria-labelledby`。 |
| UI-P2-02 | 触控目标治理 | 移动端工具页 | 模块 CSS、共享按钮 / 表单样式 | 主要操作 hit area 不低于 44px，小图标按钮补足点击区域。 |
| UI-P2-03 | 标题结构治理 | PromptLab、Scraper、AI Analysis、Playground、AMZ Quality | 相关模板 | 核心页面有一个清晰 h1，标题层级不跳跃。 |
| UI-P2-04 | icon-only / title-only 治理 | Playground、PromptLab、Scraper、NPI | 相关模板和渲染器 | 图标按钮有可访问名称；关键说明不只依赖 `title`。 |
| UI-P2-05 | inline style / `!important` 收敛 | 全项目 CSS / 模板 | `src/css`、`src/modules` | 新增样式不扩大硬编码颜色、圆角、阴影和模块级 `!important`。 |
| UI-P2-06 | 结构性 emoji 分层 | 导航、状态、空态、长内容页 | 模板和共享图标样式 | 状态和导航优先用现有图标体系；内容型 emoji 保留但不承担唯一语义。 |
| UI-P2-07 | 数据表移动策略 | PPC、NPI、Restricted Words | 相关模板和 CSS | 移动端不挤压表格正文；提供卡片摘要或明确横向滚动。 |
| UI-P2-08 | 长内容阅读节奏 | AMZ Quality、Email Templates、PPC Advertising、QA Maintenance | 对应 `template.html` | 正文行宽、字号、行高稳定；目录 / 锚点可跳转。 |
| UI-P2-09 | AI 输出和导出状态 | PromptLab、AI Analysis、Keyword Hunter、Playground | 输出渲染器和导出 helper | 长输出、Markdown 表格、代码块、复制、下载、错误态布局稳定。 |
| UI-P2-10 | 设置面板基础可用性 | 系统设置、本地数据、密钥 | `systemSettings.*`、`AppModal.ts` | 密钥显隐、导入导出、清空确认有可访问名称、焦点管理和移动截图。 |

## 建议里程碑

| 里程碑 | 范围 | 完成定义 |
| --- | --- | --- |
| M1 | UI-P0-01 到 UI-P0-04 | 移动端核心路由可用，截图回归稳定。 |
| M2 | UI-P1-01 到 UI-P1-05 | 首页保留完整 splash 且工作台入口浮动化，高扩散装饰源完成降噪。 |
| M3 | UI-P1-06 到 UI-P1-12 | 共享样式、语义、表格、主题和视觉回归进入稳定基线。 |
| M4 | UI-P2-01 到 UI-P2-10 | 逐页质量问题进入持续清理，不再扩大设计债。 |

## 推荐验收命令

- `npm run css:audit`
- `npm run css:analyze`
- `npm run test:visual`

补充 smoke 建议：

- 移动壳层：375 / 390 / 430 / 768px 覆盖首页、SOPS、App Center、PPC、Playground、AMZ Hub、More。
- 交互语义：筛选 `aria-pressed`、折叠 `aria-expanded`、弹窗焦点返回、卡片 Enter / Space 激活。
- 表单状态：空值错误、上传错误、AI loading、成功、失败重试。
- 视觉状态：loading、empty、error、toast、modal、progress、dark、forced-colors、reduced-motion。

## 已移出本轮视觉 backlog

以下事项不再作为视觉审计整改项，避免过度设计：

- 权限 / 角色 / 审计日志体系。
- 通知中心 / 任务日历 / SLA / 升级路径。
- 网络韧性平台、版本更新中心、PWA 策略。
- 完整 MarketContext、本地化、货币和税费系统。
- 预设新 Provider、Registry 或大型组件框架。

这些可以作为独立产品或工程需求评估，但不应阻塞当前视觉收敛。
