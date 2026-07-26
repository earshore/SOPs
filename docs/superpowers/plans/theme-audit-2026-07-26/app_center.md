# App Center 模块双主题审查报告（2026-07-26）

- 审查范围：9 个路由页面 × 浅色/深色（深色逐页细读 + Playwright 计算样式探针，浅色抽查无回归）：app_center_overview、ai_analysis、scraper、promptlab、playground_deep_chat、ppc_search_terms、keyword_hunter_input/process/analysis
- 截图：`$CLAUDE_JOB_DIR/tmp/audit-ac/ac{1,2}/<path>-{light,dark}.png`（probe.json 确认各路由 resolved=dark、bodyBg rgb(15,23,42)）
- 结论：缺陷 16 项（P0×5 / P1×9 / P2×2）。app_center_overview、scraper、keyword_hunter_process、keyword_hunter_analysis 深色基本达标（analysis 仅 P2）；promptlab、playground_deep_chat、ppc_search_terms 为重灾区。

## 缺陷清单

- [P0] promptlab | 深色桌面端三张步骤卡头部整条纯白横带（`background: var(--color-white,#ffffff)`，@media ≥1024px 扁平化补丁锁死），slate-900 标题压白底在深色页面上刺眼割裂 | src/modules/app_center/views/master_analysis/master_analysis_style.css:892-897 | B
- [P0] promptlab | 生成控制台两张暗墨 hero 卡被 `background: var(--color-slate-100/-50) !important; color: var(--color-slate-700) !important` 压成浅灰底深灰字，深色下反成大面积浅色孤岛，设计意图（暗色控制台）被整体摧毁 | master_analysis_style.css:899-913 | B
- [P0] playground_deep_chat | 深色下页面外壳/侧栏/工具条整体奶白：模块 :root 级变量 `--deep-chat-bg:#fffaf7; --deep-chat-surface:#ffffff` 等 147 处 hex 无任何深色覆盖，另有 #ffffff 面板与浅色渐变直写 | src/modules/app_center/views/playground/styles.css:4-23,78,188,219,337,343 | B
- [P0] playground_deep_chat | Deep Chat 组件内部（消息气泡/输入框/历史区）浅色锁死：注入式样式串 60 处 hex + 415 处 !important，加 inline style 配置对象（`backgroundColor:'#ffffff', color:'#0f172a'` 等），完全绕过 CSS 级联与 utility-bridge，深色下白底聊天区 | src/modules/app_center/views/playground/deep-chat/infra/deepChatStyles.ts:333-334,428-429,520 + deepChatConfig.ts:86-93,161-177 | C
- [P0] ppc_search_terms | 深色下导入区/分析设置/结果筛选大面积白底浅渐变（#ffffff、#f8fafc、#f1f5f9 及浅色 linear-gradient 直写，14 个拆分 CSS 均无深色处理） | src/modules/app_center/views/ppc_tools/ppc_search_terms/styles/style.layout.css:31,108,118,194,234 + style.import.input.css:7,27,73,85 + style.results.filters.css:9,20,41 | B
- [P1] ai_analysis / scraper / promptlab | MA 三页 accent 映射用 !important 把 bg-blue-50/indigo-50/purple-50 等统一压成浅紫 `--ma-accent-soft:#f5f3ff` / `--ma-accent-tint:#ede9fe`（变量本身光锁），系统性击穿桥接，深色下探针实测 rgb(245,243,255)/rgb(237,233,254) 浅紫块 | master_analysis_style.css:8-21,274-281 | B
- [P1] ai_analysis | 深色空态图标瓦片被 @media ≥1024px 规则钉成 `background-color: var(--color-slate-100)`（base palette 不翻转），探针实测 rgb(241,245,249) | src/modules/app_center/views/master_analysis/ai_analysis/ai_analysis_style.css:348-358 | B
- [P1] ai_analysis / promptlab | 琥珀提示条说明文字 `text-amber-800/80` 带透明度后缀，不在桥接映射内（text-amber-700/800/900 有映射、/NN 变体没有），深色琥珀 tint 上深字可读性差 | ai_analysis/template.html:102 + promptlab/template.html:107（类名：text-amber-800/80） | A
- [P1] ai_analysis | 结果工具条按钮 `hover:bg-white` 未入桥（桥接无 hover: 变体），深色悬停闪白 | src/modules/app_center/views/master_analysis/ai_analysis/components/AlpinePanel.ts:414,420（类名：hover:bg-white） | A
- [P1] promptlab | 嵌入开关容器 `var(--color-slate-200) !important`、模式切换 glider `var(--color-white) !important`、步骤圆点 `.w-8` 压成 --ma-accent-soft、禁用按钮 `var(--color-slate-300) !important`——一组控件在深色下全为浅色 | master_analysis_style.css:929-936,943-956,970-973 | B
- [P1] promptlab | 输出卡整卡 `background: var(--color-slate-50) !important` + 头部/标题/正文 slate-500/600 锁定，深色下浅灰卡浅灰字 | master_analysis_style.css:975-993 | B
- [P1] keyword_hunter_input | 历史快照空态卡 `linear-gradient(...,var(--color-slate-50),white)`、快照项 `background: white`，深色下右栏白卡（截图确认） | src/modules/app_center/views/keyword_hunter/styles.css:333-345,369-377 | B
- [P1] ppc_search_terms | Hero 区浅色网格线渐变 + emerald-50/teal-50/slate-50 底、图标 `border:2px solid var(--ppc-search-terms-surface,#ffffff)`，深色下顶部浅色横幅孤岛 | style.hero.shell.css:6-14,63 | B
- [P1] ppc_search_terms | 统计瓦片 `rgba(255,255,255,0.72)` 白底 + #0f172a 墨字 + #475569 标签，四枚浅色 chips（#dbeafe/#d1fae5/#ffedd5/#ede9fe）全部硬编码 | style.hero.stats.css:1-8,14,30,38-53 | B
- [P2] keyword_hunter_analysis | 覆盖率进度轨道与关键词溢出计数用 `var(--color-slate-100)` base palette，深色下轻微浅块（面积小） | keyword_hunter/styles.css:2100,2167 | B
- [P2] ai_analysis / scraper / promptlab | 内容区容器 `linear-gradient(var(--color-slate-50), var(--color-slate-100))` base palette 光锁——当前被子面板盖住未见可视断裂，防御性记录 | master_analysis_style.css:4-6 | B

## 三条最普遍的跨页模式

1. **模块 CSS 用基础色板做表面色，深色不翻转**（promptlab、ai_analysis、keyword_hunter、ppc_search_terms 全部命中）：`var(--color-white)`、`var(--color-slate-50/100/200/300)`、`white`/`#ffffff` 字面量被当作背景/文字色。variables.css 深色块只翻语义 token（--surface-*/--color-text-*），base palette 永不翻转，所以这些规则在深色下原样输出浅色。改用语义 token 即根治。
2. **模块级 !important 系统性击穿 utility-bridge**（MA 三页 accent 映射 :274-281、promptlab @media ≥1024px 扁平化块 :835-994）：桥接选择器无 !important，任何带 !important 的模块规则必然获胜。桥接本身工作正常（bg-white/slate 梯度/渐变类全部正确翻转，scraper 的 TS 拼类实测无恙），被压掉的全是这类覆盖。
3. **注入式/inline 样式完全绕过 CSS 主题层**（playground deep-chat）：deepChatStyles.ts 以字符串注入 shadow 领域并带 415 处 !important，deepChatConfig.ts 用 inline style 对象传入 web component，两者均不经过级联，桥接与深色变量无从作用；配合模块 :root 变量无深色覆盖，构成全站最严重的整页失效。

## 桥接映射缺口（A 类汇总，建议在生成器补齐）

- `text-*-N/NN` 带透明度后缀的文字类（本模块命中 text-amber-800/80；与 amz_hub 报告的 text-*-900/75 同一缺口）
- `hover:bg-white` 等 hover: 前缀变体

## 达标项

- app_center_overview、scraper、keyword_hunter_process 深浅两态干净；keyword_hunter_analysis 仅一处 P2。
- scraper utils/renderers.ts 里 TS 拼接的 bg-white/text-slate-800/border-slate-100 全部被桥接正确翻转——"TS 拼浅色类"本身不是问题，桥接覆盖即安全。
- 浅色模式 9 页全部正常，无桥接回归。
