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
  - 仍需后续逐页处理 Prompt Lab、Scraper、Keyword Hunter 等更深业务模板，避免一次性大改带来回归风险。
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
  - 公共 CSS、业务模块私有 CSS、设置面板与共享确认弹层模板已完成收敛。
  - 深层业务 HTML 模板仍保留少量 Tailwind `transition-all`，后续按页面继续消债。
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
  - 业务页内私有空状态仍需按页面继续处理，例如 Prompt Lab 报告空状态、Scraper 历史/导入空状态、Keyword Hunter 结果空状态。
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

- [ ] 1366px 下页面无横向滚动，主内容不被导航或浮层遮挡。
- [ ] 1440px 下首屏能看到页面标题、主操作和核心内容区。
- [ ] 1536px / 1920px 下内容不会无限拉宽，阅读行长保持合理。
- [ ] 首页、应用中心、设置面板、模态框的圆角、阴影、边框、标题层级一致。
- [ ] 应用中心卡片不存在嵌套交互区域。
- [ ] 设置面板可在 3 秒内定位到模型、网络、数据、性能分类。
- [ ] 所有图标按钮有可读名称或明确可见文本。
- [ ] 键盘可完成导航、打开应用、筛选、关闭弹层等关键操作。
- [ ] 弹层在浅色 / 暗色模式下无白色孤岛或低对比文本。
- [ ] Hover、Focus、Active 状态在按钮、卡片、菜单、表单控件间保持一致。

## 6. 一句话落地建议

先不要从“哪里看起来不好看”开始改，而是从 **令牌统一 → 页面布局节奏 → 关键交互语义 → 设置面板效率 → 弹层一致性** 这条线推进。这样 PC 端体验会更像一个成熟运营工作台，而不是一组漂亮但各自发挥的页面。
