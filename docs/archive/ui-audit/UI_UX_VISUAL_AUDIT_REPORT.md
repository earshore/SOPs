# sops 视觉设计审计报告（精简版）

审计日期：2026-06-08

## 1. 审计口径

本报告只审计视觉设计、响应式布局、可访问性、交互反馈、信息层级和设计系统一致性。权限、审计日志、通知中心、网络韧性、本地化、SLA 等更偏产品治理或工程治理的内容，不再纳入本轮视觉整改清单；如果后续要做，应单独立产品需求和技术设计。

本轮结论基于仓库静态扫描、现有 Playwright 截图和量化指标文件。没有做用户访谈，也没有实际修复 UI，因此所有建议按“可验证的最小整改”表达，不预设必须新增大型组件或 Provider。

关键证据：

| 类型 | 文件 |
| --- | --- |
| 运行指标 | `output/playwright/ui-audit-metrics.json` |
| 质量指标 | `output/playwright/ui-audit-quality-metrics.json` |
| 补充指标 | `output/playwright/ui-audit-extra-metrics.json` |
| 截图样本 | `output/playwright/ui-audit-*.png` |
| 设计 token | `src/css/foundation/variables.css`、`src/common/config/design-tokens.ts` |
| 主要壳层 | `index.html`、`src/common/components/SidebarRenderer.ts`、`src/css/layouts/container.css` |
| 重点页面 | `src/modules/home`、`src/modules/app_center`、`src/modules/sops`、`src/modules/amz_hub`、`src/modules/more` |

## 2. 总体结论

项目更像“亚马逊运营内部工作台”，不是营销官网。视觉方案的优先级应是：移动端可用、信息可扫读、操作路径稳定、表单和数据表可靠、状态反馈清楚、样式来源统一。

当前真实风险集中在四类：

| 优先级 | 问题 | 判断 |
| --- | --- | --- |
| P0 | 移动端动态侧边栏挤压主内容 | 阻断级。390px 下多个模块主内容宽度只有约 134px。 |
| P1 | 首页首屏偏展示化 | 巨型 hero、自定义 cursor 和装饰动效不符合高频运营工作台。 |
| P1 | 视觉系统碎片化 | 全局 token 已存在，但 App Center、PPC、welcome banner 等继续维护局部色彩、阴影、圆角和装饰体系。 |
| P1 | 基础交互和可访问性不稳定 | 缺 label、小触控目标、h1 缺失、部分点击卡片语义不足，已有量化指标能复现。 |

综合评级：

| 维度 | 评级 | 说明 |
| --- | --- | --- |
| 桌面端可用性 | B- | 主要页面结构成立，但视觉密度和状态语义不够稳定。 |
| 移动端可用性 | D | 多个核心模块出现主内容挤压，必须先修。 |
| 视觉一致性 | C | 有 token 基础，但模块局部样式扩散明显。 |
| 可访问性 | C | reset 层有基础，页面层仍有缺 label、小目标和标题结构问题。 |
| 运营工具适配度 | C+ | 有工具雏形，但首页和横幅装饰偏重。 |

## 3. 关键发现

### 3.1 移动端壳层阻断

证据：

- `output/playwright/ui-audit-metrics.json`
- `output/playwright/ui-audit-quality-metrics.json`
- `output/playwright/ui-audit-app-center-mobile.png`
- `output/playwright/ui-audit-ppc-mobile.png`

390px 移动视口下，`sopsOverview`、`appCenterOverview`、`ppcSearchTerms` 等页面显示 `mainX = 256`、`mainWidth = 134`，侧边栏仍占 256px。结果是标题、表单、卡片和正文被压缩，用户无法正常完成任务。

最小整改方向：

1. 768px 以下动态侧边栏关闭时不占布局宽度。
2. 打开侧边栏时作为抽屉 / overlay 出现，并有遮罩、关闭按钮和焦点返回。
3. 移动端主内容满足 `mainX = 0`，宽度接近视口宽度。
4. 首页、SOPS、App Center、PPC、Playground、AMZ Hub、More 都纳入移动截图回归。

### 3.2 首页首屏偏营销化

证据：

- `src/modules/home/homeDisplay.css` 中存在 `cursor: none` 和自定义 cursor follower。
- 首页标题使用超大字号，首屏主要承载品牌展示。
- `output/playwright/ui-audit-home-desktop.png`

问题不是“页面不好看”，而是产品定位不匹配。内部运营工具的首页应该帮助用户快速继续工作，而不是先展示品牌氛围。

最小整改方向：

1. 移除自定义 cursor，恢复系统默认指针。
2. 首屏改成紧凑工作台：最近工具、关键 SOP、最近分析、异常状态或待处理事项。
3. 品牌表达保留为轻量欢迎条，不再占满第一屏。
4. 装饰动画默认降级，遵守 reduced motion。

### 3.3 视觉系统碎片化

证据：

- 全局基础：`src/css/foundation/variables.css`、`src/common/config/design-tokens.ts`
- App Center：`src/modules/app_center/app_center_style.css`
- PPC：`src/modules/app_center/views/ppc_tools/style.css`
- Welcome Banner：`src/css/components/welcome-banner.css`

项目已经有全局 token，但局部模块又定义 `--app-*`、`--ppc-*`、`--wb-*` 等变量，且包含独立阴影、圆角、渐变和主色。短期这会让页面显得丰富，长期会让暗色模式、对比度、组件状态和截图回归难以统一。

最小整改方向：

1. 先做 token 对照表，不急着重构所有 CSS。
2. 新增样式必须引用全局语义 token 或登记原因。
3. App Center、PPC、welcome banner 作为第一批收敛对象。
4. 保留少量业务语义色，但映射到全局 status token。

### 3.4 装饰元素过多

证据：

- `index.html` 使用 `bg-blob` 背景装饰。
- 多个模板插入 `wb-orb`、`wb-particle`。
- `src/css/components/welcome-banner.css` 定义了大面积装饰结构。

对运营工具而言，装饰层不应压过任务、风险、表格、筛选和主操作。当前横幅体系复用过广，容易让所有页面都呈现相似的“展示卡片感”。

最小整改方向：

1. 工具型页面默认不使用 orb / particle。
2. 欢迎横幅只保留标题、说明、状态、主操作和必要标签。
3. 渐变只用于品牌入口或关键状态，不作为普通面板背景。
4. 层级优先通过间距、字重、边框和内容分组表达。

### 3.5 基础可访问性和表单语义不足

证据：

- `output/playwright/ui-audit-quality-metrics.json`
- `output/playwright/ui-audit-extra-metrics.json`

样本中可以看到：

| 页面 | 问题示例 |
| --- | --- |
| `ppcSearchTerms` | 桌面样本中有多处缺 label 输入和小触控目标。 |
| `promptlab` | 样本中 h1 缺失，缺 label 输入较多。 |
| `scraper` / `aiAnalysis` / `playground` | 存在 h1 缺失、小目标或输入语义不足。 |
| `amzHubOverview` / `moreOverview` | 侧边栏搜索主要依赖 placeholder。 |

最小整改方向：

1. 搜索、输入、select、textarea 补 label 或稳定可访问名称。
2. icon-only 按钮补 `aria-label`，状态型按钮同步 `aria-pressed` / `aria-expanded`。
3. 每个核心页面保证一个清晰 h1。
4. 移动端触控目标不低于 44px，复杂表格提供移动摘要或明确横向滚动。

### 3.6 加载和状态反馈需要更稳定

证据：

- `output/playwright/ui-audit-metrics.json` 中多条路由 `loadMs` 超过 3s。
- 现有视觉测试会 mask 部分动态区域，容易漏掉 loading、toast、progress 的真实状态。

最小整改方向：

1. 路由加载超过 300ms 时显示 skeleton 或稳定 loading 区。
2. loading、empty、error、toast、progress 使用统一语义和截图样本。
3. 不把所有动态区只做 mask；关键状态需要单独截图验收。

## 4. 页面级摘要

| 页面 | 结论 | 优先整改 |
| --- | --- | --- |
| 首页 | 视觉完成度高，但偏品牌展示。 | 去自定义 cursor，改成紧凑工作台。 |
| SOPS | 桌面可读，移动端被侧边栏挤压。 | 先修移动壳层，再治理长内容行宽和 checklist。 |
| App Center | 信息架构较清楚，小目标和局部 token 较多。 | 收敛 App token、按钮、卡片和移动布局。 |
| PPC 搜索词 | 工具结构完整，但表单 label、宽表和局部样式需要治理。 | 先修输入语义和移动表格策略。 |
| Playground | 需要更清楚的页面标题和工具状态。 | 补 h1、触控目标和输出状态。 |
| Amazon 智库 | 内容丰富，横幅装饰复用过多。 | 降噪横幅，强化阅读模板和搜索语义。 |
| More | 总览入口基本可用。 | 与 App Center / SOPS 统一卡片和筛选语义。 |
| Mega Menu / 顶部导航 | 桌面入口可用，移动入口和键盘语义需要更稳。 | 768px 以下入口、`aria-expanded`、焦点返回。 |

## 5. 精简整改清单

详细拆分见 `UI_UX_REMEDIATION_BACKLOG.md`。本报告只保留汇总。

### P0：先修阻断

| 编号 | 整改项 | 验收标准 |
| --- | --- | --- |
| P0-1 | 移动端动态侧边栏抽屉化 | 375 / 390 / 430px 下，侧边栏关闭时主内容不被挤压。 |
| P0-2 | 移动端模块主内容容器修复 | SOPS、App Center、PPC、Playground、AMZ Hub、More 无竖排断字。 |
| P0-3 | 移动导航入口可用 | 768px 以下能进入所有一级模块，不依赖 hover。 |
| P0-4 | 移动壳层截图回归 | Playwright 记录首页 + 6 个核心模块截图。 |

### P1：视觉系统和核心体验

| 编号 | 整改项 | 验收标准 |
| --- | --- | --- |
| P1-1 | 首页工作台化 | 首屏出现最近工具、关键 SOP、近期状态；hero 不占满首屏。 |
| P1-2 | 移除自定义 cursor | `cursor: none` 和 follower 不再用于首页。 |
| P1-3 | 路由 loading / skeleton | 关键路由加载时主内容不空白。 |
| P1-4 | token 对照表 | `--app-*`、`--ppc-*`、`--wb-*` 主要变量映射到全局 token。 |
| P1-5 | 横幅和装饰降噪 | 工具页默认无 orb / particle，普通面板不用大渐变。 |
| P1-6 | 共享卡片 / 按钮 / badge 收敛 | 同类入口和状态在主要模块中视觉一致。 |
| P1-7 | 表单和搜索语义 | 侧边栏搜索、PPC、PromptLab、More Prompts 等输入有 label / helper / error。 |
| P1-8 | 状态反馈语义 | loading、empty、error、toast、progress 有可访问语义和截图。 |
| P1-9 | 表格和长内容模板 | 宽表有移动策略，长文页有稳定行宽、目录或锚点。 |
| P1-10 | 主题和动效底线 | light / dark / forced-colors、normal / reduced-motion 有最小截图样本。 |

### P2：逐页清理

| 编号 | 整改项 | 验收标准 |
| --- | --- | --- |
| P2-1 | 小触控目标清理 | 移动端主要操作 hit area 不低于 44px。 |
| P2-2 | h1 / 标题层级清理 | PromptLab、Scraper、AI Analysis、Playground 等核心页面有明确 h1。 |
| P2-3 | icon-only 和 title-only 清理 | 图标按钮有 `aria-label`，关键说明不只依赖 `title`。 |
| P2-4 | inline style / `!important` 收敛 | 新增样式不继续扩大硬编码和强覆盖。 |
| P2-5 | 结构性 emoji 分层 | 状态和导航优先用现有图标体系，内容型 emoji 可保留。 |
| P2-6 | AI 输出和导出状态 | 长输出、复制、下载、错误态有稳定布局和截图。 |
| P2-7 | 设置面板基础可用性 | 密钥显隐、导入导出、清空确认有语义和焦点管理。 |
| P2-8 | 视觉回归矩阵扩展 | 桌面、390px、横屏、暗色和高对比覆盖核心页面。 |

## 6. 执行顺序

1. 先修移动壳层和移动导航入口。
2. 再压缩首页 hero 和 welcome banner 装饰。
3. 建立 token 对照表，只治理 App Center、PPC、welcome banner 三个高扩散来源。
4. 补核心页面 label、h1、触控目标和状态语义。
5. 再处理表格、长内容、AI 输出、暗色 / 高对比和 reduced-motion。
6. 最后扩展视觉回归矩阵，避免同类问题反复出现。

## 7. 本轮不建议做的事

为避免过度设计，本轮不建议把以下内容作为视觉审计整改：

- 新建完整权限 / 角色 / 审计日志体系。
- 新建通知中心、任务日历、SLA 或升级路径。
- 新建全局网络韧性平台、版本更新中心或 PWA 策略。
- 重建完整 MarketContext、本地化和货币系统。
- 为每个问题预设新组件名、Provider、Registry 或复杂框架。

如果这些能力确实有业务需求，应单独建产品需求，先确认用户、数据来源、交互路径和验收标准。

## 8. 验收建议

最小验收命令：

- `npm run css:audit`
- `npm run css:analyze`
- `npm run test:visual`

最小截图矩阵：

| 视口 | 页面 |
| --- | --- |
| 390x844 | 首页、SOPS、App Center、PPC、Playground、AMZ Hub、More |
| 768x1024 | 首页、SOPS、App Center、PPC |
| 1440x900 | 首页、SOPS、App Center、PPC、AMZ Hub、More |

必须检查：

- 主内容没有被侧边栏挤压。
- 没有不可控横向滚动。
- 主要按钮和输入可点击、可聚焦、可读屏命名。
- 每个核心页面有清晰 h1。
- loading、empty、error、toast、modal、progress 至少各有一组状态截图。
- 新增 CSS 不引入未登记主色、圆角、阴影和大装饰结构。

## 9. 结论

本项目不需要继续堆叠视觉效果，真正需要的是收敛：先解决移动端不可用，再把已有 token、卡片、按钮、横幅、表单和状态反馈统一起来。整改应尽量复用现有结构，只有在重复问题被证明确实存在时才新增抽象。
