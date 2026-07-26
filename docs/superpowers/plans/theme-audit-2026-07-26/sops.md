# SOPs 模块双主题审查（2026-07-26）

范围：19 个 sops_* 路由，浅色/深色双主题截图 + computed-style 探针复核。浅色模式抽查（overview / promotion_submission / fba_shipping）无回归；以下缺陷全部为深色模式。

## 根因综述（3 个系统性机制）

1. **[机制一] `.content-callout` 组件深色塌陷**（影响 11 页，本模块最大缺陷源）
   `src/css/components/cards.css:623-707` 中 `--callout-bg` 取 `var(--color-blue-50/emerald-50/amber-50/red-50/purple-50/...)`，而这些 token 在 `variables.generated.css:40/92/144/170/222` 是静态浅色 hex，无深色覆盖；`background: var(--callout-bg) !important` 也不受 utility-bridge 影响（bridge 只重映射 Tailwind 工具类）。结果：深色下 callout 保持 #eff6ff 等浅底，而内部标题/正文的 `text-slate-800`、`text-blue-700`、`text-slate-600` 等被 bridge 翻转为 slate-100/blue-300/slate-300 浅色 → **浅底浅字，标题整段不可读**。探针实测（npi_tracker）：bg `rgb(239,246,255)` + 标题色 `rgb(147,197,253)`。
2. **[机制二] sops_style.css 桌面端"表面收紧"规则在双主题下强写浅色**
   `src/modules/sops/sops_style.css:957-1074`（`@media (min-width:1024px)`）把 `#sops_content_area` 内所有 `bg-gradient-to-*` 元素 `background-image:none` 并按 `from-*-50` 强写 `var(--color-*-50) !important` —— 同样是无深色覆盖的静态浅 hex，特异性+!important 压过 utility-bridge 的渐变端点重映射。深色桌面端一切模板内渐变横幅全部变浅色板块。探针实测（listing_seo 工作流横幅）：bg `rgb(239,246,255)`、backgroundImage none。
3. **[机制三·放大器] 浅色壳令桥接对后代整体失效**
   utility-bridge 的背景映射是 `color-mix(... , transparent)` 半透明染色，依赖下方深色表面。一旦父级壳（机制一/二）保持浅色，内部所有已桥接的 `bg-red-50`、`bg-white/60` 等子元素叠加出来仍是浅色 → 整节区域一起塌，而不是单个元素（promotion_submission 三大阶段壳、brand_infringement 审核步骤最典型）。

## 缺陷清单

- [P0] sops_overview | 深色下顶部 hero 仍是浅紫渐变底，而 `.wb-title` 已翻转为近白 `rgb(248,250,252)` → 白字压浅底不可读 | src/modules/sops/sops_style.css:45-61（`.sops-overview .wb-container--simple` 硬编码 `linear-gradient(...#f5f3ff...#eef6ff) !important`，压过 welcome-banner.css:1665 的深色规则） | B
- [P1] sops_overview | "适用范围声明"块深色下为浅紫岛（深字浅底可读，但破坏一体化；含硬编码 #f5f3ff/#eef6ff/#312e81/#3730a3） | src/modules/sops/sops_style.css:103-125 | B
- [P0] sops_npi_tracker | "新品生命周期阶段"4 个 callout 与"保留/放弃决策标准"2 个 callout 浅底浅字，阶段名不可读 | template.html:135-166、205-230；根因 cards.css:623-707 | B
- [P0] sops_promotion_submission | 阶段二/三/四 三大阶段壳整块浅色（奶油/粉/浅绿），壳内标题 `text-slate-800`→slate-100 全部不可见，为全模块最严重页面 | template.html:110、180、221（`content-callout--warning/danger/success p-6`）；根因 cards.css + 机制三 | B
- [P0] sops_listing_seo | 标题公式"正确/错误示例"、Search Terms 正确做法、A+ 排版规范编号条目等十余个 callout 浅底浅字 | template.html:262-267、286-348、490-543；根因 cards.css | B
- [P1] sops_listing_seo | Workflow 横幅壳深色下为浅蓝平板（内嵌 Step 卡已是深色 → 三明治式不一致，壳内容可读） | template.html:143（`from-blue-50 to-indigo-50`）；根因 sops_style.css:996-999 机制二 | B
- [P0] sops_competitor_monitoring | "SOP核心理念"浅紫块标题/正文均翻浅不可读；下方 6 张异常信号卡（价格战/BSR/Review/Listing/断货/新品）及 587/611 两条横幅同样浅色板块化 | template.html:82、320、347、374、401、428、455、587、611；根因 sops_style.css:990-1069 机制二 | B
- [P0] sops_account_security | 紫鸟浏览器配置/VPS 规范/IP 分配/绝对禁止行为 4 个 callout 标题不可见（绝对禁止行为整块粉底浅字） | template.html:91、118、153、178；根因 cards.css | B
- [P0] sops_brand_infringement | "上架前审核流程"Step 1-4 四个 callout 步骤标题全部不可见 | template.html:92、108、122、136；根因 cards.css + 机制三 | B
- [P0] sops_performance_notification | "标准处理流程"Step 1-5 五个 callout 步骤标题不可见 | template.html:124、136、165、181、194；根因 cards.css | B
- [P0] sops_fba_shipping | "Send to Amazon 工作流"Step 1-5 五个 callout 步骤标题不可见 | template.html:108、116、123、130、138；根因 cards.css | B
- [P0] sops_inventory_replenishment | "周度执行节奏"周一~周五 4 个 callout 标题不可见（左侧周次徽章可见，右侧标题消失） | template.html:215、226、236、246；根因 cards.css | B
- [P1] sops_inventory_replenishment | "库存计算公式"横幅壳浅色（公式主体与 4 个指标瓦片为深色可读，但节标题翻浅不可见，壳与内容主题分裂） | template.html:86（`from-blue-50 to-indigo-50`）；根因 sops_style.css 机制二 | B
- [P0] sops_negative_review | "每日处理流程"6 个 callout 与"合规移除决策树"路径 1-3 callout 标题浅底浅字 | template.html:283-353、451-484；根因 cards.css | B
- [P0] sops_qa_maintenance | "每周巡检流程"Step 1-5 六个 callout 标题不可见 | template.html:218、233、247、262、276、290；根因 cards.css | B
- [P1] sops_ppc_advertising | Phase 0 之后"广告架构全景图"区 4 个小 callout 同机制浅底浅字（首屏 2200px 以下，影响面小；页面其余部分深色表现全模块最佳） | template.html:592-606；根因 cards.css | B
- [P2] sops_overview | 分类导航徽章/折叠区在深色下正常，但 `.sops-overview-topic-badge` 等仍走 `--sops-qwen-soft`（#f5f3ff）系静态浅 token，主题化不彻底，后续改动易复发 | src/modules/sops/sops_style.css:11-43、120-125 | B

## 干净页面（深色达标）

sops_restricted_words、sops_eu_gpsr_compliance、sops_permission_management、sops_product_compliance、sops_procurement_qc、sops_email_templates 六页深浅双主题均达企业级一体化；ui-card 迁移面（卡壳、表格、矩阵、徽章、时间线、红线警告横幅）深色表现一致良好。
