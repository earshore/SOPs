# Shell 主题审查报告（header / mega / sidebar / settings / modal / toast / search / system-mode）

- 日期：2026-07-26　审查方式：Playwright 交互审查（localhost:4273，只读）
- 证据：31+ 张截图与 computed-style 探针（probes.json / probes2.json / probes3.json），位于审查作业目录 `tmp/audit-shell/`

## 缺陷清单

- [P0] settings | 深色下 LLM 配置卡展开后表单 label（如"AI 厂商 / 配置档"、"API 路径"）为 slate-300 浅字叠在硬编码白底卡片上，对比度≈1:1 基本不可见（截图 dark-settings-expanded-cards.png） | src/components/settings/systemSettings.css:1161（.settings-llm-step 背景 rgba(255,255,255,.78) 未随模式翻转，文字已翻转） | B CSS硬编码
- [P1] settings | 深色抽屉内三类卡片保持白底浅边框（.settings-llm-step / .settings-collapsible-card / .settings-tool-app），折叠态呈刺眼白条，与深色抽屉严重不连贯 | src/components/settings/systemSettings.css:1158-1165、1588-1595（含 1206 行 .settings-llm-step__title 配套硬编码 #334155） | B CSS硬编码
- [P1] settings | 深色下外观区行标题（主题/色调/界面动画等）为 slate-700 深字叠深底，几乎不可读，层级反转（标题比 hint 更暗） | src/components/settings/systemSettings.css:915（.settings-appearance-row__title color:#334155） | B CSS硬编码
- [P2] settings | 徽章硬编码 hex 强调色深色下对比不足（--scrape #0891b2、--instant #7c3aed、--global #4f46e5；对照组：走 var(--color-warning-dark) 的 --ai-cost 深色下正常翻转为 amber-500） | src/components/settings/systemSettings.css:446、461、466 | B CSS硬编码
- [P2] settings | 左侧分类导航 is-current 文本用 --settings-accent-strong=var(--color-primary-dark)，深色下仍为 blue-600/700 深蓝，叠深底对比约 3:1 偏暗 | src/components/settings/systemSettings.css:12、2266-2274；根源 themeConfig.ts:271-275 / variables.generated.css:443-446（primary-light/dark 令牌不分模式） | D 设计
- [P2] settings | 分段控件激活态 chip 用 --settings-accent-soft=var(--color-primary-light)=色阶-100，深色下呈近白色块；极简素色（slate-100）最刺眼，默认/海洋亦为浅色块 | src/components/settings/systemSettings.css:653-658；根源 src/common/config/themeConfig.ts:272 及 minimal customVars :100 | D 设计
- [P2] sidebar | 深色下侧栏右分隔线保持浅色 rgba(226,232,240,.8)（bridge 已映射 .border-slate-200 但缺 /80 透明度变体） | index.html:337（border-slate-200/80）；utility-bridge.generated.css 无对应规则（参照 :296） | A 类名未映射
- [P2] toast（功能性附带发现，非主题）| window.showToast 先由 common/ui/index.ts:94 挂载真函数，后被 main.ts:660-666 legacy action 包装器覆盖；(msg,{type}) 双参调用丢失 type，success/error 均渲染为 toast-info | src/main.ts:660、src/common/ui/index.ts:94 | C inline/遗留全局

## 通过项（无缺陷）

- 设置抽屉外观区 IA：主题(浅色/深色/跟随系统) 在前，色调在后（两种模式一致；侧导航子项亦为 主题→色调→动画与动效）——达标
- 色调切换 默认→极简素色→海洋：仅 --color-primary 族变化；深色下 body/header/sidebar/抽屉表面全部不变——达标
- 跟随系统：OS 深色时 resolved=dark，与显式深色逐值一致（bodyBg/headerBg 相同）；emulateMedia 动态翻转双向即时生效（data-color-mode-resolved / .dark / root colorScheme 同步，无整页重载、无残留状态；UA 控件随 colorScheme 翻转）
- 四个顶部 mega 菜单 hover 展开两种模式均正常，深色面板 ~#101827、边框/阴影已语义化（header-main.css:321-337 + 857 深色覆盖）；light 下 mega-menu-inner 的 borderTop 计算色虽为 slate-900 但 border-top 宽度为 0，不渲染，非缺陷
- 模态（app-modal shadow DOM）与 toast 视觉均正确随模式翻转
- 侧栏展开/折叠/三级导航/active/hover：bg-slate-100/hover:bg-slate-200 等已被 bridge 正确映射（active 胶囊为语义化渐变，深色正常，早期怀疑排除）；侧栏搜索 focus 光环、结果下拉与空态两种模式均正常
