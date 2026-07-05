# SOPS PC 端 UI 优化方案

> 范围限定：仅关注 PC / 桌面端体验，不再把移动端导航、触控热区、窄屏布局作为本轮优化重点。  
> 推荐适配宽度：1366px、1440px、1536px、1920px。  
> 主要场景：亚马逊运营人员在桌面浏览器中进行数据查看、SOP 管理、应用切换、系统配置与高频操作。

## 执行批次与当前状态

> 更新日期：2026-07-05

### Batch 1：低风险 P1 消债（已执行）

1. 应用中心卡片交互语义
   - 状态：已调整。
   - 范围：`src/modules/app_center/views/overview/template.html`、`src/modules/app_center/views/overview/index.ts`、`src/modules/app_center/app_center_style.css`。
   - 验收：卡片不再承担 `role="button"`；主入口与子入口均为明确按钮；过滤逻辑改为基于卡片 `data-category`。

2. 设置面板图标按钮可读名称
   - 状态：已调整。
   - 范围：`src/components/settings/systemSettings.html`、`src/components/settings/systemSettings.ts`。
   - 验收：关闭按钮、LLM API Key 显隐按钮、采集网络 API Key 显隐按钮均有可读名称或动态标题。

3. 低对比小字与禁用态
   - 状态：已调整首批高频页面。
   - 范围：`src/modules/sops/views/overview/template.html`、`src/modules/app_center/views/ppc_tools/style.css`、`src/modules/app_center/views/ppc_tools/ppc_search_terms/styles/style.results.toolbar.css`。
   - 验收：SOPS 总览辅助说明从 `slate-400` 提升到 `slate-500`；PPC 主操作绿色加深；PPC 禁用导出/清除按钮文字加深。

### Batch 2：PC 工作台结构优化（已执行）

1. 首页首屏可见性
   - 状态：已调整。
   - 范围：`src/modules/home/homeDisplay.html`、`src/modules/home/homeDisplay.css`、`src/modules/home/homeDisplay.ts`。
   - 验收：首屏 H1、副标题默认可见；路由挂载时禁用全局淡入包装；新增“SOP 流程中心 / 应用中心”两个明确入口。

2. 设置面板 PC 双栏结构
   - 状态：已调整。
   - 范围：`src/components/settings/systemSettings.html`、`src/components/settings/systemSettings.css`、`src/components/settings/systemSettings.ts`。
   - 验收：PC 面板宽度提升到 860px 上限；设置样式从模板内联 `<style>` 迁移到组件 CSS 并由 Vite 打包；运行时左侧分类导航直达模型、网络、本地数据、性能监控，右侧保留原表单和危险操作区域。

3. 应用中心矩阵扫描效率
   - 状态：已调整。
   - 范围：`src/modules/app_center/app_center_style.css`。
   - 验收：应用卡片等高；描述区高度更稳定；子入口固定在卡片底部工具条，Tab 顺序仍只经过可操作控件。

### Batch 3：设计系统与主题收敛（进行中）

1. 模态框接入组件令牌，减少 Shadow DOM 硬编码颜色。
   - 状态：已完成首批。
   - 范围：`src/components/modal/AppModal.ts`、`src/components/modal/AppModal.regression.test.ts`。
   - 验收：`AppModal` Shadow DOM 定义 `--modal-*` 语义令牌；面板、标题、关闭按钮、滚动条和焦点环引用令牌；关闭按钮不再使用 `transition: all`。
2. 收敛 `critical.css`、`variables.css`、`variables.generated.css` 的重复令牌。
   - 状态：已完成首批 alias 层与关键路径去重。
   - 范围：`src/css/critical.css`、`src/css/foundation/variables.css`、`src/css/components/buttons.css`、`src/css/components/header.css`、`src/css/utilities/containers.css`、`src/modules/app_center/app_center_style.css`、`src/modules/sops/sops_style.css`、`tests/unit/pc-design-token-css.test.ts`。
   - 验收：`variables.generated.css` 继续先于手工变量层加载；`critical.css` 在首屏入口导入生成 token，不再复制基础色板和字体变量，只保留首屏缺失的轻量别名；手工变量层新增 PC 布局、卡片、面板、主按钮、模块 Accent 语义别名；主按钮读取 `--button-primary-*`；公共容器和 Header 内容宽度读取 `--layout-*` / `--page-gutter`；应用中心与 SOPS 总览不再局部覆盖 `--color-primary*`，改用 `--module-accent*`。
3. 替换高频 `transition: all` 与布局属性动画。
   - 状态：已完成本轮组件/工具层收敛。
   - 范围：`src/css/foundation/variables.css`、`src/css/utilities/transitions.css`、`src/css/utilities/legacy-compat.css`、`src/css/components/buttons.css`、`src/css/components/badges.css`、`src/css/components/cards.css`、`src/css/components/icon-container.css`、`src/css/components/insight-cards.css`、`src/css/components/stat-cards.css`、`src/css/components/language-selector.css`、`src/css/components/timeline.css`、`src/css/components/tabs.css`、`src/css/components/modals.css`、`src/css/components/progress.css`、`src/css/components/toast.css`、`src/css/components/chat.css`、`src/css/components/markdown.css`、`src/css/components/header-main.css`、`tests/unit/pc-motion-css.test.ts`。
   - 验收：`.smooth-transition`、`.smooth-transition-slow`、`.transition-all` 改为 `--transition-interactive-properties` 属性集合；通用按钮、徽章、公共卡片、图标容器、洞察/统计卡、语言切换、时间线、分类标签、modal close、进度步骤、toast 退出态、聊天输入、Markdown 内容、主 Header 和兼容层只过渡颜色、边框、阴影、透明度和 transform；`src/css/components`、`src/css/utilities` 与 `src/css/critical.css` 扫描无 `transition: all`。
4. 建立 PC 端表格、列表、状态标签和按钮的统一扫描规格。
   - 状态：已完成首批。
   - 范围：`src/css/components/data-scan.css`、`src/css/main.css`、`tests/unit/pc-data-scan-css.test.ts`。
   - 验收：主 CSS 入口加载 PC 数据扫描组件；标准表格行高 44px、紧凑行高 36px；提供数字列右对齐、列表项、工具栏、语义状态徽章和 PC 操作按钮规格。

### Batch 4：模块级动效债务收敛（已执行）

1. 清理业务模块私有 CSS 中的 `transition: all`。
   - 状态：已完成。
   - 范围：`src/modules/sops/sops_style.css`、`src/modules/amz_hub/amz_hub_style.css`、`src/modules/amz_hub/views/practice/promo_tools/styles.css`、`src/modules/amz_hub/views/practice/promo_activities/styles.css`、`src/modules/amz_hub/views/practice/marketing_calendar/styles.css`、`src/modules/more/views/explore/prompts/prompts_style.css`、`src/modules/app_center/views/master_analysis/master_analysis_style.css`、`src/modules/app_center/views/master_analysis/ai_analysis/ai_analysis_style.css`、`src/modules/app_center/views/master_analysis/scraper/scraper_style.css`、`src/modules/app_center/views/keyword_hunter/keyword_hunter_style.css`、`tests/unit/pc-motion-css.test.ts`。
   - PC 端影响：这些页面是高频业务工作台，布局属性被默认动画化会增加 hover/focus 抖动风险，也会让长表格、工具卡、筛选器在大屏快速扫视时显得不稳定。
   - 优化方案：按模块分批把 `transition: all` 替换为颜色、边框、阴影、透明度和 transform；对确实需要展开/收起高度动画的区域单独保留显式 `height` 或 `max-height`，并配套模块级静态测试。
   - 验收：`src/modules`、`src/css/components`、`src/css/utilities` 与 `src/css/critical.css` 扫描无 `transition: all`；按钮、卡片、搜索框、可编辑输入、流程箭头、浮动窗、提示气泡和状态 Banner 只过渡颜色、边框、阴影、透明度和 transform；Scraper Tab 下划线由 `width` 动画改为 `transform: scaleX()`；`pc-motion-css.test.ts` 已锁定所有完成文件。

### Batch 5：PC 高频弹层交互状态收敛（已执行）

1. 收敛设置面板与共享确认弹层的 Hover / Focus / Active 反馈。
   - 状态：已完成首批。
   - 范围：`src/components/settings/systemSettings.html`、`src/components/modal/sharedModals.html`、`tests/unit/pc-motion-css.test.ts`。
   - PC 端影响：设置抽屉、导入冲突确认和删除确认是桌面端高频弹层；`transition-all`、悬浮旋转、图标放大和按钮缩放会让鼠标扫过时反馈过重，也会让键盘焦点状态不够统一。
   - 优化方案：将高频模板内的 `transition-all` 替换为 `transition`、`transition-colors`、`transition-shadow`、`transition-[width]` 等显式属性；关闭、显隐、危险操作、导入冲突选项等控件补齐 `focus-visible` ring；按钮按压反馈从 `active:scale-*` 改为 `active:translate-y-px`；导入冲突选项图标去掉 hover 放大。
   - 验收：设置面板与共享确认弹层扫描无 `transition-all`、`hover:rotate`、`hover/group-hover/active:scale`；焦点态均保留 `focus-visible:ring-2`；`pc-motion-css.test.ts` 已锁定首批高频模板。

### Batch 6：共享空状态与错误状态任务导向（已执行）

1. 将全局 fallback 从“说明失败”调整为“说明原因 + 给出下一步”。
   - 状态：已完成首批。
   - 范围：`src/components/ErrorBoundary.ts`、`tests/unit/errorBoundary-ui.test.ts`。
   - PC 端影响：模块加载失败、内容空状态、未注册模块和加载超时是桌面工作台的兜底体验；只显示“暂无内容 / 加载失败”会让用户不知道是重试、刷新、切换模块还是检查配置。
   - 优化方案：错误边界增加原因说明、错误详情、重试加载、刷新页面和辅助排查说明；空状态改为标题、下一步说明和辅助提示；未注册模块说明可从顶部导航选择其他模块或确认路由；超时状态说明刷新会重新初始化应用状态；关键按钮补齐 `focus-visible` ring。
   - 验收：新增单元测试锁定错误、空状态、未注册和超时四种 fallback 的任务导向文案、ARIA 状态和焦点态。

### Batch 7：PC 顶部导航当前位置与默认侧边栏稳定性（已执行）

1. 锁定顶部导航当前位置语义，并收敛默认侧边栏生成模板的动效。
   - 状态：已完成首批。
   - 范围：`src/common/ui/navigation.ts`、`tests/unit/navigationPageEnterAnimation.test.ts`、`tests/unit/pc-motion-css.test.ts`。
   - PC 端影响：桌面用户跨 SOP、应用中心、AMZ Hub、更多模块切换时，需要明确知道当前所处一级模块；默认侧边栏若继续生成 `transition-all`，会绕过前面 CSS 层的动效合同。
   - 优化方案：保留顶部导航由 `aria-current="page"` 驱动的当前位置高亮，并通过路由 UI 测试锁定当前项 / 非当前项状态；默认侧边栏按钮从 `transition-all` 改为显式 `transition`，并补齐 `focus-visible` ring；动效合同扫描加入 `navigation.ts`。
   - 验收：路由到 `sops_overview` 时 `nav-sops` 获得 `aria-current="page"`、蓝色文字和蓝色边框，其他一级导航清除当前位置；高频模板/生成模板扫描无 `transition-all`、缩放和旋转反馈，且保留 `focus-visible:ring-2`。

### Batch 8：应用中心 PC 紧凑列表视图（已执行）

1. 为应用矩阵增加卡片 / 列表模式切换。
   - 状态：已完成首批。
   - 范围：`src/modules/app_center/views/overview/template.html`、`src/modules/app_center/views/overview/index.ts`、`src/modules/app_center/app_center_style.css`、`tests/unit/app_center_overview.test.ts`。
   - PC 端影响：桌面用户在应用数量增加后，需要用更高密度的行式信息快速比较应用名、价值、标签和入口；只保留装饰性卡片会降低扫读效率。
   - 优化方案：在应用矩阵工具栏增加分段式“卡片 / 列表”切换；新增 4 条非交互列表行，行内保留显式主入口和子入口按钮；分类与既有搜索筛选同时作用于卡片和列表行，计数只按应用数量统计一次；列表行 Hover 只调整边框、背景和阴影，不改变布局尺寸。
   - 验收：默认展示卡片，切换列表时卡片容器 `aria-hidden="true"`、列表容器 `aria-hidden="false"`；真实模板提供 4 条 `app-overview-list-row` 且行本身不承担 `role="button"` / `tabindex`；筛选分类和搜索时列表行与卡片同步显隐，显示数量不重复计数。

### Batch 9：全局顶部菜单与搜索交互稳定性（已执行）

1. 收敛 Mega Menu 与搜索结果按钮的动效和焦点态。
   - 状态：已完成首批。
   - 范围：`src/common/ui/megaMenu.ts`、`src/common/ui/search.ts`、`tests/unit/pc-motion-css.test.ts`、`tests/unit/uiCurrent.test.ts`。
   - PC 端影响：顶部 Mega Menu、SOP / 智库 / 侧边栏搜索是桌面端跨模块导航的高频入口；若仍使用 `transition-all`，会让 hover、聚焦、阴影、背景和位移都被默认动画化，增加长时间鼠标扫视时的反馈噪声。
   - 优化方案：Mega Menu 卡片、玻璃背景层和箭头只使用 Tailwind `transition` 的限定属性集合；搜索结果按钮改为 `transition duration-200` 并补齐 `focus-visible` ring；动效合同扫描加入 `megaMenu.ts` 与 `search.ts`。
   - 验收：全局高频生成模板扫描无 `transition-all`、`hover/active/group-hover:scale`、`hover:rotate`，且保留 `focus-visible:ring-2`；现有 UI helper 测试确认 Mega Menu 渲染、展开收起、搜索结果点击和清空行为不变。

### Batch 10：Master Analysis 私有弹层交互状态收敛（已执行）

1. 清理确认弹层与多站点导入弹层的 `transition-all` 和缩放按压反馈。
   - 状态：已完成首批。
   - 范围：`src/modules/app_center/views/master_analysis/utils/confirmModal.ts`、`src/modules/app_center/views/master_analysis/scraper/handlers/importHandler.ts`、`tests/unit/pc-motion-css.test.ts`。
   - PC 端影响：删除确认、忽略提示确认和多站点导入选择都是桌面工作台中的风险操作；按钮按压缩放和默认动画所有属性会让弹层反馈与系统设置、共享确认弹层不一致。
   - 优化方案：弹层面板容器从 `transition-all` 改为 `transition`；多站点选项从 `transition-all` 改为 `transition duration-200`；确认按钮按压从 `active:scale-95` 改为 `active:translate-y-px`；导入弹层取消 / 确认按钮补齐 `focus-visible` ring；动效合同扫描加入两个私有弹层实现。
   - 验收：两个私有弹层实现扫描无 `transition-all`、`hover/active/group-hover:scale`、`hover:rotate`，且保留 `focus-visible:ring-2`；弹层事件、选择和清理逻辑未改动。

### Batch 11：SOPS 安全合规模板静态卡动效收敛（已执行）

1. 收敛 Product Compliance 流程卡与 EU GPSR 官方资源卡的 Hover 动效。
   - 状态：已完成首批。
   - 范围：`src/modules/sops/views/safety/product_compliance/template.html`、`src/modules/sops/views/safety/eu_gpsr_compliance/template.html`、`tests/unit/pc-motion-css.test.ts`。
   - PC 端影响：安全合规页面包含长表格、流程卡和外部资源入口；静态说明卡使用 `transition-all`、外链图标使用放大反馈，会在 PC 长页面扫视时产生不必要的视觉噪声。
   - 优化方案：Product Compliance 8 张 SOP 流程卡从 `transition-all` 改为 `transition duration-200`；EU GPSR 3 个官方资源外链从 `transition-all` 改为显式 `transition duration-200`，移除图标 `group-hover:scale-110`，并补齐外链卡 `focus-visible` ring；新增深层模板静态合同，只锁定无广义动画和缩放/旋转反馈。
   - 验收：两个安全合规模板扫描无 `transition-all`、`hover/active/group-hover:scale`、`hover:rotate`；Product Compliance 与 GPSR 现有单元测试通过。

### Batch 12：Keyword Hunter 输入 / 处理页动效收敛（已执行）

1. 收敛 Keyword Hunter 工作流中编辑器、处理按钮、统计卡和浮动入口的 Hover / Focus / Active 反馈。
   - 状态：已完成首批。
   - 范围：`src/modules/app_center/views/keyword_hunter/input/template.html`、`src/modules/app_center/views/keyword_hunter/process/template.html`、`src/modules/app_center/views/keyword_hunter/process/index.ts`、`tests/unit/pc-motion-css.test.ts`。
   - PC 端影响：Keyword Hunter 是桌面端长时间编辑、对照和监控关键词覆盖率的工作流；编辑器焦点容器、处理按钮、统计卡和浮动关键词入口若使用 `transition-all` 或 hover 缩放，会让鼠标扫视和浮窗恢复时的反馈不够稳定。
   - 优化方案：输入页两个编辑器容器改为显式 `transition duration-200`；处理页开关滑块只过渡 transform，按钮按压从 `active:scale-95` 改为 `active:translate-y-px` 并补齐键盘焦点环；AI 翻译和覆盖率进度条保留进度语义但改为 `transition-[width]`；统计卡和最小化浮动按钮只过渡颜色、边框、阴影和 transform；运行时恢复浮窗不再注入 `transition-all`。
   - 验收：Keyword Hunter 输入 / 处理页及浮窗恢复逻辑扫描无 `transition-all`、`hover/active/group-hover:scale`、`hover:rotate`；深层模板动效合同已锁定本批文件。

### Batch 13：提示词语言切换与禁限词详情按钮收敛（已执行）

1. 清理两个低风险独立控件的广义过渡，并补齐键盘焦点态。
   - 状态：已完成。
   - 范围：`src/modules/more/views/explore/prompts/template.html`、`src/modules/sops/views/growth/restricted_words/restrictedWordsHandler.ts`、`tests/unit/pc-motion-css.test.ts`。
   - PC 端影响：提示词详情弹层的中英文切换和禁限词结果表的详情按钮都是桌面端表格/弹层中的小控件；继续使用 `transition-all` 会让按钮状态反馈与前面已收敛的弹层、导航和列表控件不一致。
   - 优化方案：提示词语言切换按钮改为 `transition duration-200` 并补齐 violet 焦点环；禁限词详情按钮改为 `transition duration-200`，补齐 blue 焦点环，并显式设置 `type="button"`，避免未来嵌入表单时出现隐式提交。
   - 验收：两个文件扫描无 `transition-all`、`hover/active/group-hover:scale`、`hover:rotate`；深层 PC 动效合同已锁定本批文件。

### Batch 14：Prompt Lab 表单与输出区动效收敛（已执行）

1. 收敛 Prompt Lab 中产品 DNA 表单、策略开关、翻转控制台、输出操作和报告维度卡的动效。
   - 状态：已完成。
   - 范围：`src/modules/app_center/views/master_analysis/promptlab/template.html`、`src/modules/app_center/views/master_analysis/promptlab/components/reportRenderer.ts`、`tests/unit/pc-motion-css.test.ts`。
   - PC 端影响：Prompt Lab 是桌面端长表单和右侧生成控制台并列的工作流；表单控件、报告维度卡和生成按钮如果继续使用 `transition-all`、hover 放大和上浮，会让大屏密集操作时的视觉反馈过重，也增加键盘焦点不一致的问题。
   - 优化方案：产品 DNA 表单输入、单字段提取按钮、目标市场 / Tone 选择器和 AI 策略开关统一改为 `transition duration-200`；Listing / Visual 翻转卡保留 3D transform 语义但改为 `transition-transform`；模式滑块只过渡 transform；生成按钮从 hover 放大 / 上浮改为 `active:translate-y-px` 并补齐焦点环；复制 / 清空 / 复制 SEO 关键词按钮补齐焦点环和图标按钮可读名称；报告维度卡从 `transition-all` 改为限定过渡。
   - 验收：Prompt Lab 模板与报告渲染器扫描无 `transition-all`、`hover/active/group-hover:scale`、`hover:rotate`；深层 PC 动效合同已锁定本批文件。

### Batch 15：Scraper 导入 / 历史 / 产品卡动效收敛（已执行）

1. 收敛 Scraper 空状态、导入入口、手动配置、历史快照、插件入口和产品 / 评论卡片的动效。
   - 状态：已完成。
   - 范围：`src/modules/app_center/views/master_analysis/scraper/template.html`、`src/modules/app_center/views/master_analysis/scraper/utils/renderers.ts`、`tests/unit/pc-motion-css.test.ts`。
   - PC 端影响：Scraper 页面包含导入、采集配置、历史快照和多 ASIN 产品卡；广义过渡和站点徽章 hover 放大会让长页面扫视时的状态反馈过重，图标按钮缺少焦点态也会降低键盘操作清晰度。
   - 优化方案：空状态图标、导入卡、手动采集选项、历史 ASIN 标签、加载按钮、插件下载入口和产品 / 评论卡统一改为 `transition duration-200`；历史站点徽章移除 `hover:scale-105`；产品删除与评论删除按钮补齐 `focus-visible` ring 和 `aria-label`；展开箭头继续使用已有 `transition-transform`。
   - 验收：Scraper 模板与产品卡渲染器扫描无 `transition-all`、`hover/active/group-hover:scale`、`hover:rotate`；深层 PC 动效合同已锁定本批文件。

### Batch 16：AI Analysis 选择 / 结果 / 操作区动效收敛（已执行）

1. 收敛 AI Analysis 中 ASIN 选择、分析目标卡、任务预览、Hero 操作区、结果卡和报告导出栏的动效。
   - 状态：已完成。
   - 范围：`src/modules/app_center/views/master_analysis/ai_analysis/template.html`、`src/modules/app_center/views/master_analysis/ai_analysis/components/AlpinePanel.ts`、`tests/unit/pc-motion-css.test.ts`。
   - PC 端影响：AI Analysis 是桌面端高密度配置和结果阅读页面；目标卡、Hero 主按钮、结果卡和导出操作栏如果继续使用 `transition-all` 或 hover 放大，会让状态反馈不稳定，也让键盘焦点与前面已收敛的工作流不一致。
   - 优化方案：ASIN 选择项、Listing / Reviews 分析目标卡、任务预览、Prompt 复制、Hero 卡片、性能设置、结果卡、发现条目和导出按钮统一改为 `transition duration-200` 并补齐重点按钮焦点环；主分析按钮按压反馈改为 `active:translate-y-px`；禁用原因提示只过渡 opacity；分析进度条保留宽度语义但改为 `transition-[width]`；动态主按钮类移除 `hover:scale-105`。
   - 验收：AI Analysis 模板与动态类文件扫描无 `transition-all`、`hover/active/group-hover:scale`、`hover:rotate`；深层 PC 动效合同已锁定本批文件。

### Batch 17：报告 / 搜索结果空状态任务导向（已执行）

1. 将报告占位和搜索无结果从“说明为空”调整为“原因 + 推荐操作 + 次级帮助”。
   - 状态：已完成。
   - 范围：`src/modules/app_center/views/master_analysis/promptlab/template.html`、`src/modules/app_center/views/master_analysis/promptlab/components/reportRenderer.ts`、`src/modules/app_center/views/keyword_hunter/analysis/template.html`、`src/modules/more/views/explore/prompts/index.ts`、`src/modules/sops/views/growth/restricted_words/restrictedWordsHandler.ts`、`tests/unit/promptlab.test.ts`、`tests/unit/promptsModule.test.ts`、`tests/unit/restrictedWordsHandler.test.ts`、`tests/unit/ui-p1-08-template-a11y.test.ts`。
   - PC 端影响：这些区域位于 Prompt Lab、Keyword Hunter、提示词库和禁限词结果表的关键工作流中；旧文案只告诉用户“暂无/未找到”，不能帮助桌面用户快速判断是缺报告、筛选过窄还是需要回到上游步骤。
   - 优化方案：Prompt Lab 静态模板与运行时报告占位统一说明缺少 AI 分析报告、推荐先生成报告或手填产品 DNA；Keyword Hunter 评审报告空态说明需先完成 STEP 1 / STEP 2；提示词库和禁限词搜索空态说明筛选无命中，并给出清空、切换分类/模式和缩短关键词等操作。
   - 验收：相关单元测试锁定空态文案、`role="status"` / `aria-live` 语义和推荐操作；聚焦测试通过。

### Batch 18：数据准备 / 历史空状态任务导向（已执行）

1. 收敛数据导入、历史快照和产品数据缺失状态。
   - 状态：已完成。
   - 范围：`src/modules/app_center/views/keyword_hunter/input/template.html`、`src/modules/app_center/views/keyword_hunter/process/template.html`、`src/modules/app_center/views/keyword_hunter/process/index.ts`、`src/modules/app_center/views/master_analysis/scraper/template.html`、`src/modules/app_center/views/master_analysis/ai_analysis/template.html`、`tests/unit/keywordHunterProcessModule.test.ts`、`tests/unit/scraper-template-a11y.test.ts`、`tests/unit/ui-p1-08-template-a11y.test.ts`。
   - PC 端影响：数据准备类空态是工作流入口卡点；如果只显示“暂无数据”，用户不知道该导入 JSON、输入 ASIN、保存快照，还是返回输入页重新分析。
   - 优化方案：Keyword Hunter 历史快照、词频和关键词监控空态补齐原因与推荐动作；Scraper 导入区说明导入 JSON / 输入 ASIN 两条路径，历史区说明快照产生条件；AI Analysis 产品数据缺失状态说明 ASIN 列表为空并强化前往数据采集动作，相关按钮补齐键盘焦点环。
   - 验收：Keyword Hunter、Scraper、AI Analysis 相关测试通过；深层 PC 动效扫描仍无 `transition-all`、缩放或旋转反馈回退；`git diff --check` 通过。

### Batch 19：动态按钮可读名称补齐（已执行）

1. 补齐 Alpine 动态按钮的可读名称、状态语义和显式按钮类型。
   - 状态：已完成。
   - 范围：`src/modules/app_center/views/master_analysis/ai_analysis/template.html`、`src/modules/app_center/views/master_analysis/scraper/template.html`、`src/components/settings/systemSettings.html`、`tests/unit/ui-p1-08-template-a11y.test.ts`、`tests/unit/scraper-template-a11y.test.ts`、`tests/unit/systemSettingsCurrent.test.ts`。
   - PC 端影响：AI Analysis 目标选择卡、JSON 展开按钮、Scraper 手动采集按钮和系统设置拉取 / 测试按钮都在桌面高频流程中；如果动态按钮只依赖视觉文案或图标状态，键盘和屏幕阅读器用户难以判断当前动作、选择状态或展开状态。
   - 优化方案：AI Analysis 目标选择按钮增加目标名 + 已选择 / 未选择的动态 `aria-label`，并用 `aria-pressed` 暴露选择状态；JSON 报告按钮增加展开 / 收起动态名称和 `aria-expanded`；Scraper 手动采集与设置面板异步按钮增加显式 `type="button"` 和运行时可读名称。
   - 验收：相关聚焦单测通过；真实 UI 模板扫描未发现未命名的图标按钮或空文本按钮；`git diff --check` 通过。

### Batch 20：Scraper 导入入口原生按钮化（已执行）

1. 将导入 JSON 的模拟按钮替换为原生按钮。
   - 状态：已完成。
   - 范围：`src/modules/app_center/views/master_analysis/scraper/template.html`、`tests/unit/scraper-template-a11y.test.ts`。
   - PC 端影响：空数据导入区和重新导入入口是 Scraper 数据采集流程的关键入口；继续使用 `div role="button" tabindex="0"` 需要手写键盘事件，焦点语义也不如原生按钮稳定。
   - 优化方案：将两处导入触发区改为 `button type="button"`，保留原点击行为和视觉结构；补齐导入 / 重新导入的 `aria-label`，并增加统一 `focus-visible` 焦点环。
   - 验收：Scraper 静态语义测试通过；真实 UI 模板扫描已无 `div/span/article/li/section/a role="button"` 模拟按钮残留。

### Batch 21：Scraper 按钮类型显式化（已执行）

1. 收敛 Scraper 页面和动态渲染卡片中的隐式 submit 按钮。
   - 状态：已完成。
   - 范围：`src/modules/app_center/views/master_analysis/scraper/template.html`、`src/modules/app_center/views/master_analysis/scraper/utils/renderers.ts`、`tests/unit/scraper-template-a11y.test.ts`。
   - PC 端影响：Scraper 的 Tab、站点选择、历史快照操作、插件下载、产品删除和评论删除都是桌面端高频按钮；未显式声明 `type` 时，未来若被移动到表单上下文中会产生隐式提交风险。
   - 优化方案：为 Scraper 模板和渲染器中的全部业务按钮补齐 `type="button"`；新增静态测试扫描 Scraper UI 源，要求所有 `<button>` 开始标签都声明按钮类型。
   - 验收：Scraper 聚焦测试通过；Scraper 模板 / 渲染器扫描无隐式类型按钮残留。

### Batch 22：系统设置按钮类型显式化（已执行）

1. 收敛系统设置面板中的隐式 submit 按钮。
   - 状态：已完成。
   - 范围：`src/components/settings/systemSettings.html`、`tests/unit/systemSettingsCurrent.test.ts`。
   - PC 端影响：系统设置面板包含关闭、密钥显隐、保存配置、导入导出、清理数据和打开性能监控等桌面高频操作；未显式声明 `type` 时，未来若被嵌入表单上下文中会产生意外提交风险。
   - 优化方案：为设置面板内所有业务按钮补齐 `type="button"`，保留现有视觉、禁用态、焦点态和 Alpine 事件不变；在真实模板测试中加入静态扫描，要求所有 `<button>` 开始标签都声明按钮类型。
   - 验收：系统设置聚焦测试通过；设置模板扫描无隐式类型按钮残留。

### Batch 23：Workflows 入口按钮类型显式化（已执行）

1. 收敛工作流入口页中的隐式 submit 按钮。
   - 状态：已完成。
   - 范围：`src/modules/more/views/explore/workflows/template.html`、`tests/unit/workflows-template-a11y.test.ts`。
   - PC 端影响：Workflows 页承载跨模块跳转入口，桌面用户会从这里进入 Listing、PPC、数据采集、VOC、合规和日报等流程；入口按钮未声明类型时，未来若页面被嵌入表单或复用到配置面板中，会产生意外提交风险。
   - 优化方案：为 30 个 `data-action="switch-tab"` 工作流入口按钮补齐 `type="button"`，保留现有路由属性、视觉样式和按钮文案不变；新增静态测试锁定入口数量和显式按钮类型。
   - 验收：Workflows 聚焦测试通过；Workflows 模板扫描无隐式类型按钮残留。

### Batch 24：PromptLab 按钮类型显式化（已执行）

1. 收敛 PromptLab 页面中的隐式 submit 按钮。
   - 状态：已完成。
   - 范围：`src/modules/app_center/views/master_analysis/promptlab/template.html`、`tests/unit/promptlab-template-a11y.test.ts`。
   - PC 端影响：PromptLab 的维度展开、产品 DNA 自动填充、Listing / Visual 模式切换、生成、复制和清空操作都是桌面端长表单旁的高频按钮；未显式声明 `type` 时，未来若被嵌入表单上下文中会产生意外提交风险。
   - 优化方案：为 8 个 PromptLab 普通操作按钮补齐 `type="button"`，保留现有 Alpine 事件、禁用态、标题、可读名称和视觉样式不变；新增静态测试扫描模板内所有 `<button>` 开始标签。
   - 验收：PromptLab 模板扫描 19 个按钮、隐式类型 0 个；全局扫描仍无 `role="button"` 模拟按钮和未命名图标按钮残留。

### Batch 25：Keyword Hunter Process 按钮类型显式化（已执行）

1. 收敛 Keyword Hunter 处理页中的隐式 submit 按钮。
   - 状态：已完成。
   - 范围：`src/modules/app_center/views/keyword_hunter/process/template.html`、`tests/unit/keywordHunterProcessModule.test.ts`。
   - PC 端影响：SEO 处理中心顶部操作栏、AI 翻译按钮和关键词监控浮窗控制是桌面端文案处理流程的高频入口；未显式声明 `type` 时，未来若嵌入表单容器会产生意外提交风险。
   - 优化方案：为 5 个处理页业务按钮补齐 `type="button"`，保留现有 ID、点击绑定、禁用态、进度语义、标题和视觉样式不变；在已有模块测试中加入真实模板静态扫描。
   - 验收：Keyword Hunter Process 模板扫描 5 个按钮、隐式类型 0 个；全局扫描仍无 `role="button"` 模拟按钮和未命名图标按钮残留。

### Batch 26：Prompts 详情弹层按钮类型显式化（已执行）

1. 收敛提示词库详情弹层中的隐式 submit 按钮。
   - 状态：已完成。
   - 范围：`src/modules/more/views/explore/prompts/template.html`、`tests/unit/promptsModule.test.ts`。
   - PC 端影响：提示词详情弹层的关闭、语言切换和复制按钮是桌面端模板浏览、对照和复用的高频操作；未显式声明 `type` 时，未来若弹层内容嵌入表单容器会产生意外提交风险。
   - 优化方案：为 5 个详情弹层按钮补齐 `type="button"`，保留现有数据属性、键盘关闭、复制逻辑、语言切换状态和视觉样式不变；在 Prompts 模块测试中加入真实模板静态扫描。
   - 验收：Prompts 模板扫描 5 个按钮、隐式类型 0 个；全局扫描仍无 `role="button"` 模拟按钮和未命名图标按钮残留。

### Batch 27：共享弹层按钮类型显式化（已执行）

1. 收敛共享导入冲突 / 删除确认弹层中的隐式 submit 按钮。
   - 状态：已完成。
   - 范围：`src/components/modal/sharedModals.html`、`src/components/modal/AppModal.regression.test.ts`。
   - PC 端影响：导入冲突确认和删除确认是跨流程复用的桌面高风险操作；按钮未声明类型时，未来若弹层内容进入表单上下文，会把选择、取消或删除误解释为提交。
   - 优化方案：为 5 个共享弹层操作按钮补齐 `type="button"`，保留现有 ID、点击绑定、危险操作视觉层级、键盘焦点态和弹层标题语义不变；扩展 AppModal 回归测试扫描共享模板内所有按钮类型。
   - 验收：共享弹层模板扫描 5 个按钮、隐式类型 0 个；AppModal 与 Scraper 弹层回归测试通过；全局扫描仍无 `role="button"` 模拟按钮和未命名图标按钮残留。

### Batch 28：PromptLab 报告渲染器按钮类型显式化（已执行）

1. 收敛 PromptLab 动态报告维度卡中的隐式 submit 按钮。
   - 状态：已完成。
   - 范围：`src/modules/app_center/views/master_analysis/promptlab/components/reportRenderer.ts`、`tests/unit/promptlab-template-a11y.test.ts`。
   - PC 端影响：报告维度卡的子项和具体内容“全选 / 取消全选”是桌面端整理报告素材时的批量操作；未显式声明 `type` 时，未来若报告区域进入表单上下文会产生意外提交风险。
   - 优化方案：为动态渲染器中的 4 个批量选择按钮补齐 `type="button"`，保留 Alpine 点击阻止冒泡、文案、选择逻辑和视觉样式不变；扩展 PromptLab 静态测试覆盖模板和动态渲染器两类 HTML 来源。
   - 验收：PromptLab 模板扫描 19 个按钮、渲染器扫描 4 个按钮，隐式类型均为 0；PromptLab 聚焦测试通过；全局扫描仍无 `role="button"` 模拟按钮和未命名图标按钮残留。

### Batch 29：Usage Notice 场景入口按钮类型显式化（已执行）

1. 收敛使用须知页底部业务场景入口中的隐式 submit 按钮。
   - 状态：已完成。
   - 范围：`src/modules/more/views/business_scenarios/usage_notice/template.html`、`tests/unit/business-scenarios-template-a11y.test.ts`。
   - PC 端影响：使用须知页底部入口负责把桌面用户引导到差评响应、广告诊断、评论监控和日报场景；入口按钮未声明类型时，未来若说明页嵌入表单式配置容器会产生意外提交风险。
   - 优化方案：为 4 个 `data-action="switch-tab"` 场景入口按钮补齐 `type="button"`，保留路由属性、文案和视觉样式不变；新增业务场景模板静态语义测试。
   - 验收：Usage Notice 模板扫描 4 个按钮、隐式类型 0 个；业务场景聚焦测试通过；全局扫描仍无 `role="button"` 模拟按钮和未命名图标按钮残留。

### Batch 30：AI Analysis Prompt 面板按钮类型显式化（已执行）

1. 收敛 AI Analysis Prompt 面板中的隐式 submit 按钮。
   - 状态：已完成。
   - 范围：`src/modules/app_center/views/master_analysis/ai_analysis/template.html`、`tests/unit/ui-p1-08-template-a11y.test.ts`。
   - PC 端影响：Prompt 面板展开、Prompt 条目展开和复制 Prompt 是桌面端查看分析指令与复用内容的高频辅助操作；未显式声明 `type` 时，未来若面板进入表单上下文会产生意外提交风险。
   - 优化方案：为 3 个 Prompt 面板按钮补齐 `type="button"`，保留 Alpine 点击、阻止冒泡、展开状态、复制逻辑和视觉样式不变；扩展 AI Analysis 模板语义测试扫描所有按钮类型。
   - 验收：AI Analysis 模板扫描 27 个按钮、隐式类型 0 个；UI-P1-08 聚焦测试通过；全局扫描仍无 `role="button"` 模拟按钮和未命名图标按钮残留。

### Batch 31：Restricted Words 操作按钮类型显式化（已执行）

1. 收敛禁限词工作台中的隐式 submit 按钮。
   - 状态：已完成。
   - 范围：`src/modules/sops/views/growth/restricted_words/template.html`、`tests/unit/ui-p1-10-template-a11y.test.ts`。
   - PC 端影响：高危词搜索、重置和详情弹层关闭是桌面端合规检查流程中的高频操作；未显式声明 `type` 时，未来若工具区或弹层进入表单上下文会产生意外提交风险。
   - 优化方案：为 3 个操作按钮补齐 `type="button"`，保留现有 ID、标题、详情关闭动作和视觉样式不变；扩展 P1-10 静态测试扫描禁限词模板所有按钮类型。
   - 验收：Restricted Words 模板扫描 4 个按钮、隐式类型 0 个；禁限词聚焦测试通过；全局扫描仍无 `role="button"` 模拟按钮和未命名图标按钮残留。

### Batch 32：共享 fallback / modal 按钮类型显式化（已执行）

1. 收敛 ErrorBoundary 和 AppModal 生成模板中的隐式 submit 按钮。
   - 状态：已完成。
   - 范围：`src/components/ErrorBoundary.ts`、`src/components/modal/AppModal.ts`、`tests/unit/errorBoundary-ui.test.ts`、`src/components/modal/AppModal.regression.test.ts`。
   - PC 端影响：错误重试、刷新页面和弹层关闭是全局兜底交互；这些基础组件未声明按钮类型时，会把隐式 submit 风险扩散到所有模块 fallback 和弹层容器。
   - 优化方案：为 ErrorBoundary 的重试 / 刷新按钮、超时刷新按钮和 AppModal 关闭按钮补齐 `type="button"`；同步修正 AppModal 注释示例中的按钮类型；扩展回归测试检查运行时按钮类型和源码模板扫描。
   - 验收：ErrorBoundary 扫描 3 个按钮、AppModal 扫描 3 个按钮，隐式类型均为 0；ErrorBoundary / AppModal 聚焦测试通过；全局扫描仍无 `role="button"` 模拟按钮和未命名图标按钮残留。

### Batch 33：剩余高频模板按钮类型显式化（已执行）

1. 清零 PC 高频模板和动态表格中的剩余隐式 submit 按钮。
   - 状态：已完成。
   - 范围：`src/modules/app_center/views/keyword_hunter/analysis/template.html`、`src/modules/sops/views/growth/npi_tracker/template.html`、`src/modules/sops/views/growth/npi_tracker/index.ts`、`src/modules/more/views/business_scenarios/*/template.html`、`tests/unit/ui-p1-08-template-a11y.test.ts`、`tests/unit/ui-p1-10-template-a11y.test.ts`、`tests/unit/business-scenarios-template-a11y.test.ts`、`tests/unit/npi-tracker.test.ts`。
   - PC 端影响：Keyword Hunter 生成报告、NPI 复盘 / 导出 / 表格决策和业务场景切换都是桌面端高频点击入口；补齐按钮类型后，即使未来这些区域被放入筛选表单、工具栏表单或弹层表单，也不会触发意外提交。
   - 优化方案：仅为剩余按钮补齐 `type="button"`，保留现有 `data-action`、禁用态、样式类和文案不变；扩展静态模板测试与 NPI 动态渲染测试，锁定按钮非提交语义。
   - 验收：全局扫描结果为 `roleButtons 0`、`unnamedButtons 0`、`implicitTotal 0`；本批聚焦 Vitest 通过；`git diff --check`、`npm run type-check`、`npm run build:app` 均通过。

### Batch 34：PC 验收清单审计与收尾修复（已执行）

1. 逐项审计 PC 验收清单并补齐剩余证据链。
   - 状态：已完成。
   - 范围：`src/modules/sops/sops_style.css`、`src/common/components/OverviewRenderer.ts`、`src/modules/app_center/views/master_analysis/scraper/template.html`、`scripts/quality/audit-card-ui.ts`、`scripts/quality/audit-workbench-ui.ts`、`tests/unit/pc-design-token-css.test.ts`、`tests/unit/scraper-template-a11y.test.ts`、`ui-pc-optimization-plan.md`。
   - PC 端影响：最终验收发现 NPI 长说明在 1920px 下会拉到 1384px，影响大屏阅读行长；同时严格扫描发现生成器按钮缺少显式类型、Scraper 站点按钮缺少稳定可读名称，UI audit 对折叠区和同类选择器路由切换存在时序误判。
   - 优化方案：NPI 页面段落增加 `max-width: min(100%, 64rem)`，将 1920px 下最长说明收敛到 1024px；OverviewRenderer 快速入口按钮补齐 `type="button"`；Scraper 站点按钮补动态 `aria-label`；Card audit 检查 App Center 任务路径前先展开折叠区；Workbench audit 等待目标页面就绪文本后再采样同类面板。
   - 验收：Playwright 桌面采样覆盖 1366 / 1440 / 1536 / 1920，首页、应用中心、SOPS、NPI 横向溢出均为 0；NPI 最长段落收敛到 1024px；`npm run ui:audit` 三段通过；按钮语义扫描为 `roleButtons 0`、`implicitButtons 0`、`iconOnlyWithoutName 0`；相关 Vitest、类型检查和构建通过。

## 0. PC 端优化目标

本轮优化不追求“大改风格”，而是让现有界面在 PC 工作台场景下更高效、更稳定、更一致：

1. **提升桌面信息密度**：让 1440px 以上屏幕充分展示任务、应用、数据和配置内容。
2. **强化视觉层次**：减少“所有卡片都很亮、所有区块都很重”的问题，让主任务更突出。
3. **统一组件语言**：按钮、卡片、标签、表单、弹层、筛选器使用统一规格。
4. **优化鼠标与键盘操作**：Hover、Focus、快捷入口、弹层关闭、表格/卡片操作更明确。
5. **保证可访问性与暗色模式基础**：PC 端同样需要清晰焦点、对比度和主题一致性。

## 1. 必须改进（P1）

### P1-01 收敛设计令牌，解决 PC 端页面视觉不一致

- **当前问题**
  - `variables.generated.css`、`variables.css`、`critical.css`、业务模块 CSS 同时声明语义接近的颜色、字体、阴影和渐变变量。
  - 应用中心、首页、设置面板、模态框在卡片阴影、主色、圆角、背景层次上存在割裂。
- **PC 端影响**
  - 大屏上模块并列展示时，不一致会被放大；用户会感觉不同模块像不同产品。
  - 后续维护时，新增页面很容易继续复制局部样式，设计债滚雪球。
- **优化方案**
  1. 明确 PC 端全局布局令牌：
     - 页面最大宽：`--layout-max-width: 1450px`；
     - 工作台宽屏最大宽：`--layout-wide-width: 1600px`；
     - 页面左右留白：`--page-gutter: 24px`，1536px 以上提升为 `32px`。
  2. 明确组件视觉令牌：
     - 卡片：`--card-bg`、`--card-border`、`--card-shadow`、`--card-radius`；
     - 主按钮：`--button-primary-bg`、`--button-primary-hover-bg`；
     - 面板：`--panel-bg`、`--panel-border`、`--panel-shadow`。
  3. 禁止业务模块直接覆盖 `--color-primary`，改用模块 Accent：
     - `--module-accent`；
     - `--module-accent-soft`；
     - `--module-accent-border`。
  4. `critical.css` 只保留首屏必要布局与引用，不再重复定义品牌色和字体族。
- **落地文件建议**
  - `src/common/config/design-tokens.ts`
  - `src/css/foundation/variables.css`
  - `src/css/foundation/variables.generated.css`
  - `src/css/critical.css`
- **验收标准**
  - 首页、应用中心、设置面板、模态框的卡片圆角、阴影、背景层级一致。
  - 新增模块只需设置 Accent 变量即可形成模块差异，不需要重写主色系统。

### P1-02 重构 PC 端页面布局节奏，减少“大卡片堆叠感”

- **当前问题**
  - 页面普遍使用大圆角卡片、渐变背景、阴影和图标容器，单个区域好看，但组合后显得信息块过重。
  - 视觉重心分散，用户很难一眼判断“下一步该点哪里”。
- **PC 端影响**
  - 桌面端用户通常是任务驱动型，视觉装饰过多会降低扫描效率。
  - 运营人员在长时间使用时更需要稳定、清晰、低噪声的信息层级。
- **优化方案**
  1. 建立 PC 页面三层结构：
     - **页面头部**：标题、说明、主操作；
     - **关键任务区**：最多 1-2 个高权重模块；
     - **内容矩阵区**：应用卡片、数据表、工具入口等。
  2. 减少嵌套卡片：卡片内二级内容优先用分隔线、浅背景条或列表，而不是再套一层卡片。
  3. 每屏只允许一个最高视觉权重 CTA，其余按钮降级为次级或文本按钮。
  4. 页面纵向间距建议：
     - 页面头部到底部内容：`24-32px`；
     - 大区块之间：`32px`；
     - 卡片内部区域：`16-20px`；
     - 列表项：`10-12px`。
- **落地文件建议**
  - `src/modules/home/homeDisplay.css`
  - `src/modules/app_center/app_center_style.css`
  - `src/css/utilities/containers.css`
- **验收标准**
  - 1440px 下首屏能明确看到页面标题、主操作和核心内容区。
  - 每个页面最多 1 个主 CTA，按钮权重不互相抢戏。

### P1-03 优化应用中心 PC 端卡片交互语义

- **当前问题**
  - 应用中心卡片使用 `article role="button" tabindex="0"`，内部又包含多个按钮入口。
  - PC 端 Hover 效果较多，但主点击区和子操作区边界不够明确。
- **PC 端影响**
  - 鼠标用户容易误点卡片空白区域或子入口。
  - 键盘用户 Tab 时会遇到“卡片本身”和“卡片内部按钮”双重焦点，认知负担较高。
- **优化方案**
  1. 卡片保持信息容器语义，取消整卡 `role="button"`。
  2. 每张卡片右上角或底部固定一个主入口按钮，例如“打开应用”。
  3. 子能力入口统一放在卡片底部工具条，使用轻量按钮样式。
  4. Hover 只强化当前可点击按钮，不让整张卡片产生过强“可点击”暗示。
  5. 键盘焦点顺序：卡片主按钮 → 子入口按钮 → 下一张卡片。
- **落地文件建议**
  - `src/modules/app_center/views/overview/template.html`
  - `src/modules/app_center/app_center_style.css`
- **验收标准**
  - 不存在可点击区域嵌套。
  - 鼠标悬浮时可明确判断哪个元素可点击。
  - Tab 顺序可预测，不重复、不绕路。

### P1-04 PC 端设置面板信息密度过高，需要分区降噪

- **当前问题**
  - 设置面板把模型配置、网络设置、本地数据、性能监控放在一个长滚动面板中。
  - 渐变、图标、说明、标签、按钮密度较高，视觉权重接近。
- **PC 端影响**
  - 桌面用户配置时需要快速定位具体设置项；当前长面板会增加搜索成本。
  - 危险操作“清空全部”和普通操作在同一视觉环境中，风险识别不够强。
- **优化方案**
  1. PC 端设置面板改为左右结构：
     - 左侧：设置分类导航（模型、网络、数据、性能）；
     - 右侧：当前分类表单。
  2. 面板宽度从 `max-w-lg` 调整为 `720-860px`，充分利用 PC 空间。
  3. 危险操作独立为“危险区域”，使用红色边框、明确说明和二次确认。
  4. 表单项采用标准节奏：标签 13px、输入 14px、说明 12px，输入高度 40px。
  5. 每个分类只保留一个主按钮，其他动作降级为次级按钮。
- **落地文件建议**
  - `src/components/settings/systemSettings.html`
  - `src/components/settings/systemSettings.ts`
  - 可新增 `src/components/settings/systemSettings.css`
- **验收标准**
  - 用户在 3 秒内能定位到“模型配置 / 网络设置 / 数据管理”。
  - 危险操作视觉上与普通操作明显分离。

### P1-05 模态框组件需要接入主题令牌，避免 PC 弹层割裂

- **当前问题**
  - `AppModal.ts` Shadow DOM 样式中大量硬编码白色、蓝色、灰色和阴影。
  - 模态框视觉与全局令牌系统未完全打通。
- **PC 端影响**
  - 弹层是桌面端高频反馈入口，如果弹层风格不一致，会削弱产品整体感。
  - 暗色模式或品牌色调整时，弹层最容易成为“白色孤岛”。
- **优化方案**
  1. 为模态框定义组件令牌：
     - `--modal-bg`；
     - `--modal-text-primary`；
     - `--modal-text-secondary`；
     - `--modal-border`；
     - `--modal-shadow`；
     - `--modal-backdrop`。
  2. Shadow DOM 内只引用组件令牌，不直接写 `#ffffff`、`#1e293b` 等颜色。
  3. 统一弹层宽度体系：
     - 小确认：384px；
     - 标准表单：480px；
     - 复杂配置：640px；
     - 工作台型弹层：860px。
  4. PC 端弹层底部按钮统一右对齐：次按钮在左，主按钮在右。
- **落地文件建议**
  - `src/components/modal/AppModal.ts`
  - `src/css/foundation/variables.css`
- **验收标准**
  - 浅色 / 暗色主题下弹层均无硬编码色彩割裂。
  - 所有弹层按钮布局与间距一致。

## 2. 建议优化（P2）

### P2-01 PC 端导航与顶部栏需要强化当前位置感

- **当前状态**
  - 顶部主导航已由 `aria-current="page"` 驱动当前位置高亮，并有路由测试覆盖。
  - 默认侧边栏生成模板已去掉 `transition-all` 并补齐键盘焦点环，避免和 PC 动效合同分叉。
  - Mega Menu 与 SOP / 智库 / 侧边栏搜索结果按钮已加入高频模板动效合同，键盘焦点态已补齐。
  - 后续仍可继续增强面包屑或页面级模块标签，但不在本批一次性展开。
- **当前问题**
  - 顶部导航有基础样式，但大屏下当前位置、模块分组和用户当前任务关系还不够强。
- **PC 端影响**
  - 用户跨模块切换时需要额外判断当前所在模块。
- **优化方案**
  1. 一级导航当前项增加左/下 Accent 指示条，而不是只依赖文字颜色。
  2. 页面头部增加面包屑或模块标签，例如“应用中心 / 数据采集”。
  3. Mega menu 中当前模块入口固定高亮。
  4. Header 高度、阴影、背景透明度统一，避免不同页面滚动时表现不一。

### P2-02 应用中心 PC 卡片矩阵可提升扫描效率

- **当前状态**
  - 已完成首批：应用矩阵支持卡片 / 列表模式切换；列表模式以更高信息密度展示应用名、一句话价值、标签、主入口和子入口。
  - 列表行保持信息容器语义，操作仍由明确按钮承担；分类与既有搜索筛选已同步到列表行。
  - 后续若应用数量继续增加，可继续补真实搜索框、标签折叠 `+N` 与用户偏好记忆。
- **当前问题**
  - 卡片视觉较丰富，但 PC 大屏上同类信息重复较多。
- **PC 端影响**
  - 用户要在大量应用中定位目标，扫描效率比装饰感更重要。
- **优化方案**
  1. 卡片内信息顺序固定为：应用名 → 一句话价值 → 状态/标签 → 主操作 → 子入口。
  2. 标签数量最多展示 3 个，多余收进 `+N`。
  3. 支持 PC 端紧凑视图：列表模式 / 卡片模式切换。
  4. 卡片 Hover 时只提升边框和阴影，不改变布局尺寸，避免鼠标经过造成跳动感。

### P2-03 表格、列表和数据模块需要统一 PC 扫描规格

- **当前问题**
  - 项目中同时存在卡片、表格、列表、统计块等多种数据呈现方式，规格需要统一。
- **PC 端影响**
  - 运营类产品依赖高频扫读，行高、列间距、状态色不统一会降低效率。
- **优化方案**
  1. 标准表格行高：44px；紧凑表格行高：36px。
  2. 表头字号 12px、正文 13-14px、数字列右对齐。
  3. 状态标签使用统一语义色：成功、警告、错误、信息、中性。
  4. 表格工具栏固定结构：标题 / 筛选 / 搜索 / 批量操作。

### P2-04 Hover、Focus、Active 状态强度需要统一

- **当前状态**
  - 已完成首批高频弹层收敛：系统设置、导入冲突确认、删除确认。
  - 已完成全局导航入口首批收敛：默认侧边栏、Mega Menu、搜索结果按钮均锁定显式过渡属性与 `focus-visible` ring。
  - 已完成 Master Analysis 私有确认 / 多站点导入弹层首批收敛：确认按钮使用 `active:translate-y-px`，导入弹层按钮补齐键盘焦点态。
  - 已完成 SOPS 安全合规模板首批收敛：静态流程卡不再使用 `transition-all`，EU GPSR 外链卡不再使用图标放大反馈并补齐键盘焦点态。
  - 已完成 Keyword Hunter 输入 / 处理页首批收敛：处理按钮使用 `active:translate-y-px`，浮动入口移除 hover 放大并补齐键盘焦点态。
  - 已完成提示词语言切换与禁限词详情按钮收敛：小型按钮改为限定过渡并补齐 `focus-visible` ring。
  - 已完成 Prompt Lab 表单与输出区首批收敛：生成按钮不再 hover 放大 / 上浮，翻转控制台只保留 transform 过渡。
  - 已完成 Scraper 导入 / 历史 / 产品卡首批收敛：历史站点徽章移除 hover 放大，产品 / 评论删除按钮补齐焦点态。
  - 已完成 AI Analysis 选择 / 结果 / 操作区首批收敛：主分析按钮移除 hover 放大，进度条改为显式宽度过渡。
- **当前问题**
  - 不同组件的 Hover 有的变色、有的升起、有的放大、有的旋转。
- **PC 端影响**
  - 鼠标用户很依赖 Hover 判断可交互性，反馈不统一会造成学习成本。
- **优化方案**
  1. 卡片 Hover：边框加深 + 阴影一档提升。
  2. 按钮 Hover：背景/边框变化，不默认放大。
  3. 图标按钮 Hover：浅背景容器，不旋转，除非是明确关闭按钮。
  4. Active：统一 `translateY(1px)` 或轻微压暗。
  5. Focus：统一 2px ring + 2px offset，保证键盘可见。

### P2-05 减少 `transition: all`，提升 PC 长页面稳定性

- **当前状态**
  - 公共 CSS、业务模块私有 CSS、设置面板、共享确认弹层、默认侧边栏、Mega Menu、搜索结果生成模板、Master Analysis 私有弹层、SOPS 安全合规模板首批静态卡、Keyword Hunter 输入 / 处理页、两个低风险独立控件、Prompt Lab 表单 / 输出区、Scraper 导入 / 历史 / 产品卡和 AI Analysis 选择 / 结果 / 操作区已完成收敛。
  - 当前本轮扫描范围内的深层业务模板已无 `transition-all`、hover/active 缩放或 hover 旋转残留；后续新增页面继续通过 PC 动效合同防回退。
- **当前问题**
  - 项目中存在 `transition: all` 工具类和局部布局属性动画。
- **PC 端影响**
  - 长页面、卡片矩阵、数据面板同时存在时，非必要动画会带来微卡顿。
- **优化方案**
  1. 将 `transition: all` 替换为明确属性：`color, background-color, border-color, box-shadow, opacity, transform`。
  2. 避免动画化 `width`、`height`、`max-width`、`top`、`left`。
  3. 工作台展开、浮层出现、卡片反馈优先用 `transform` 与 `opacity`。

### P2-06 PC 端空状态与错误状态需要更任务导向

- **当前状态**
  - 全局 `ErrorBoundary`、通用空状态、未注册模块和超时 fallback 已完成首批任务导向改造。
  - 业务页内私有空状态已完成首批页面级收敛：Prompt Lab 报告静态 / 运行时占位、Keyword Hunter 报告 / 历史快照 / 词频 / 关键词监控空态、Scraper 导入 / 历史空态、AI Analysis 产品数据缺失状态、提示词库搜索无结果、禁限词搜索无结果。
  - 当前复扫剩余命中主要是 SOP 正文说明、常量文案、操作 toast 或服务异常信息；不再属于本轮页面级空状态首批范围。
- **当前问题**
  - 错误和空状态目前偏通用，如“功能开发中”“加载超时”等。
- **PC 端影响**
  - 桌面用户通常正在完成明确任务，空状态应该直接给下一步，而不是只说明没有内容。
- **优化方案**
  1. 空状态结构统一：标题 → 原因 → 推荐操作 → 次级帮助。
  2. 错误状态提供明确动作：重试、返回首页、查看配置、复制错误信息。
  3. 对配置类错误直接链接到设置面板对应分类。

## 3. 不纳入本轮的内容

以下内容在上一版报告中提到，但本轮既然只管 PC 端，先不作为重点：

1. 移动端汉堡菜单 / 底部导航。
2. 小屏 375px / 560px 卡片换行优化。
3. 触屏热区专门扩展到 44px 的移动端策略。
4. 移动端横向滚动筛选替代方案。

说明：PC 端仍需保证键盘可访问和鼠标可点，但不以触屏舒适度作为主要约束。

## 4. 推荐实施顺序

### 第一批：必须改进

1. **统一设计令牌与组件令牌**
   - 先定规则，避免后续改动继续分叉。

2. **优化 PC 端页面布局节奏**
   - 统一容器宽度、页面头部、区块间距、卡片层级。

3. **修复应用中心卡片交互语义**
   - 解决嵌套交互与误点问题，是明确的 UX / A11y 问题。

4. **重构设置面板为 PC 双栏结构**
   - 提升配置效率，降低长滚动认知成本。

5. **模态框接入主题令牌**
   - 统一弹层视觉，补齐暗色与品牌一致性基础。

### 第二批：建议优化

6. **强化顶部导航当前位置感**。
7. **应用中心增加紧凑列表视图**。
8. **统一表格 / 列表 / 数据模块扫描规格**。
9. **统一 Hover / Focus / Active 状态**。
10. **替换 `transition: all` 与布局属性动画**。
11. **重写空状态与错误状态文案结构**。

## 5. PC 端验收清单

- [x] 1366px 下页面无横向滚动，主内容不被导航或浮层遮挡。
  - 证据：Playwright 采样首页、应用中心、SOPS、NPI，在 1366px 下 `horizontalOverflow = 0`，目标模块 heading 与首屏内容可见。
- [x] 1440px 下首屏能看到页面标题、主操作和核心内容区。
  - 证据：Playwright 采样 1440px，应用中心首屏包含“应用中心 / 任务路径”和入口按钮，SOPS 首屏包含“标准作业程序 (SOPs)”和筛选按钮，NPI 首屏包含“新品生命周期跟踪 SOP”和作业元信息。
- [x] 1536px / 1920px 下内容不会无限拉宽，阅读行长保持合理。
  - 证据：Playwright 采样 1536 / 1920px 横向溢出均为 0；主要内容最大宽度受 PC 容器约束；NPI 长说明由 1384px 收敛到 1024px。
- [x] 首页、应用中心、设置面板、模态框的圆角、阴影、边框、标题层级一致。
  - 证据：`npm run ui:audit` 的 card / callout / workbench 三段通过；`pc-design-token-css.test.ts` 锁定布局、组件令牌和模块 Accent；AppModal 回归测试锁定弹层令牌。
- [x] 应用中心卡片不存在嵌套交互区域。
  - 证据：`app_center_overview.test.ts` 覆盖真实卡片非交互容器、主入口/子入口为显式按钮，列表视图行也不承担交互。
- [x] 设置面板可在 3 秒内定位到模型、网络、数据、性能分类。
  - 证据：`systemSettingsCurrent.test.ts` 锁定真实模板的 PC 分类导航；运行时 DOM 具备“模型配置 / 采集网络 / 本地数据 / 性能监控”四个导航链接。
- [x] 所有图标按钮有可读名称或明确可见文本。
  - 证据：严格按钮扫描结果为 `iconOnlyWithoutName 0`；Scraper 站点按钮补齐动态 `aria-label`；系统设置、Scraper、AppModal、ErrorBoundary 等聚焦测试覆盖可读名称。
- [x] 键盘可完成导航、打开应用、筛选、关闭弹层等关键操作。
  - 证据：导航、Mega Menu、应用中心筛选/视图切换、系统设置、AppModal、Scraper 导入入口均有单测覆盖；关键交互保留原生按钮 / 链接语义和 `focus-visible` ring。
- [x] 弹层在浅色 / 暗色模式下无白色孤岛或低对比文本。
  - 证据：AppModal Shadow DOM 令牌化，设置面板和共享弹层接入主题/焦点令牌；相关回归测试和 PC token 合同通过。
- [x] Hover、Focus、Active 状态在按钮、卡片、菜单、表单控件间保持一致。
  - 证据：`npm run ui:audit` 通过；`pc-motion-css.test.ts` 锁定无 `transition-all`、无 hover/active 缩放和旋转残留，并保留焦点环。

## 6. 一句话落地建议

先不要从“哪里看起来不好看”开始改，而是从 **令牌统一 → 页面布局节奏 → 关键交互语义 → 设置面板效率 → 弹层一致性** 这条线推进。这样 PC 端体验会更像一个成熟运营工作台，而不是一组漂亮但各自发挥的页面。
