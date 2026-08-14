# 视觉设计规范覆盖审查与补齐 Spec

**日期**: 2026-08-06  
**状态**: 审查完成 · 待补齐项已分类（G1–G4）· 增量条款草案见 §5
**执行状态**: 2026-08-06 已完成 G1-1/2、G2 全部八项、G3-1/2（见落地计划）；G1-3 已补注记闭环；G3-1 经影响面分析确认 `.card` 基础类无生产调用点、无需迁移；G4 视觉签收依赖人工 XO，待排期  
**审查对象**: `docs/VISUAL_DESIGN_GUIDELINES.md` · `docs/THEME_SYSTEM_GUIDELINES.md` · `docs/COMPONENT_GUIDELINES.md` · `docs/ACCESSIBILITY.md` · `docs/CONTENT_DESIGN.md` · `docs/Z_INDEX_LAYERING_GUIDELINES.md` · `docs/PAGE_ENTRY_ANIMATION_GUIDELINES.md` · 相关 superpowers specs/plans · 实现层（`src/css/*`、`src/common/config/design-tokens.ts` 等）  
**权威文档链**: `THEME_SYSTEM_GUIDELINES` > `VISUAL_DESIGN_GUIDELINES` > 本文（审查/补齐 Spec） > `COMPONENT_GUIDELINES` > `src/css/*` 速查

---

## 0. 结论速览

**一句话**: 主题与工程治理层已达到**企业级可运营**（Code Green：三轴契约 + 全套门禁 + 债务台账 D1–D12）；但**规范覆盖面约 70%**，存在 4 类明确缺项（文档漂移 / 缺失规范面 / 契约与实现冲突 / 验收闭环未签收），**尚不能宣称「视觉设计规范整体达到企业生产系统水准」**。

| 维度 | 评分 | 说明 |
| --- | --- | --- |
| 主题系统（颜色/归属/Appearance/暗色/token 治理） | ✅ 企业级 | A2 双层 + `ThemeManager` 单 API + 门禁齐备；Code Green |
| 核心交互面规范（banner/布局/圆角/阴影/表单/按钮/状态/弹层/动效/z-index/内容/无障碍） | ⚠️ 覆盖但部分缺数值 | 规则质量高，但排版 scale、间距语义、图标体系、状态 token 表未成文 |
| 数据可视化 / 表格 / 复杂控件 | ❌ 缺失 | Chart.js 在用但无图表规范；Table/DatePicker 被 COMPONENT_GUIDELINES v1.1 自我声明「后续补」 |
| 文档准确性 | ❌ 漂移 | `src/css/README.md`、`QUICK-REFERENCE.md` 与实现脱节（`.btn` vs `.action-btn`）；CSS-ARCHITECTURE-README 的 z-index 尺度过时 |
| 验收闭环 | ⚠️ Yellow | 视觉回归 D12 仅 scaffold opt-in；人类 XO 未签收；a11y 无全量 CI |
| 代码契约与规范一致性 | ⚠️ 有冲突 | `.card` / `.action-btn` 默认 hover `translateY(-1px)` 与「工作台无位移」底线冲突 |

**合判定性**: 「架构级企业水准已达成，文档级覆盖与验收闭环未完全达成」→ 按本文 G1–G4 补齐。

---

## 1. 审查范围与方法

- **文档侧**：按企业设计系统标准清单（Accessibility / Touch / Performance / Style / Layout / Typography & Color / Animation / Forms / Navigation / Charts & Data 十类）逐项核对现行规范文档。
- **实现侧**：抽查 `src/common/config/design-tokens.ts`（token 事实源）、`src/css/components/*`（共享组件）、`src/css/foundation/*`（generated vs 手写），验证「规范所述」与「代码实际」是否一致。
- **治理侧**：核对 `package.json` 门禁脚本、`docs/superpowers/` 下的审查/计划/状态文档（theme-system-enterprise-audit-and-roadmap、theme-system-landing-status、theme-visual-baseline-d12 等）。

---

## 2. 覆盖矩阵（企业级清单 × 现状）

| # | 企业级规范面 | 现状 | 证据 | 缺口 |
| --- | --- | --- | --- | --- |
| 1 | 设计原则 / 产品决策 | ✅ 完整 | VISUAL §1 · PRODUCT_PRINCIPLES | — |
| 2 | 颜色系统 + 语义 + 归属 | ✅ 完整 | THEME §2/3 · VISUAL §2 · ownershipRoles.ts | D6 ~900+ `blue-*` 长尾（承认现状，分期） |
| 3 | 排版体系（Type Scale 角色表） | ❌ 部分 | design-tokens 有 `FONT_SIZE`（2xs–4xl），但规范仅写 banner 几条字号（VISUAL §3.3/§5） | **缺 Type Role 表**：h1/h2/h3/body/caption/label ↔ token 映射、数字/表格字体（tabular-nums）、禁止负 letter-spacing 的边界 |
| 4 | 间距语义 | ❌ 部分 | `SPACING` token 存在；规范仅「8px 递进」「卡间距 24px」（VISUAL §4.1） | **缺间距语义表**：何时用 4/8/12/16/24/32 |
| 5 | 圆角 / 阴影 / 层级 | ⚠️ 覆盖 | VISUAL §4 · THEME §4.1 · `--workbench-radius` SSOT（D2 已决） | 与实现冲突见 G3；`--radius-*` 语义名历史漂移已治理 |
| 6 | 图标体系 | ❌ 部分 | 有 FA 约束、`aria-hidden`、icon-badge 规格（VISUAL §3.5） | **缺图标尺寸层级（16/20/24）、用途分类（导航/操作/状态/装饰）、emoji 替代边界细则** |
| 7 | 动效 / 动效 token | ✅ 覆盖 | PAGE_ENTRY_ANIMATION · THEME §5 · `--duration-*`/`--ease-*` | 页面动效 400–500ms、微交互 150–300ms 已量化；无需新增 |
| 8 | 表单 / 按钮 / 状态 | ⚠️ 覆盖 | COMPONENT_GUIDELINES §3/4/5 · VISUAL §6 | **状态色无组件对照表**（`--color-success/warning/error/info` 用于哪些组件）；loading/empty/error 视觉细则散落 |
| 9 | 弹层 / 浮层 / z-index | ✅ 完整 | MODAL_DEVELOPMENT_GUIDELINES · Z_INDEX（9 档语义层 + CI 门禁） | — |
| 10 | 数据可视化 | ❌ **缺失** | Chart.js 在 deps；THEME §3.1 仅一句「图表多色须有文字/图例/形状辅助」 | **缺图表规范**：系列色板序列、图例/tooltip/动画、饼图切片上限、颜色+形状双通道、可访问 fallback |
| 11 | 表格 / 数据网格 | ❌ **缺失** | COMPONENT_GUIDELINES v1.1「后续：补 Table、DatePicker、虚拟列表」；PPC/NPI/Restricted Words 已有数据表 | **缺 Table 规范**：吸顶/空态/行 hover/排序/数字右对齐/窄屏降级 |
| 12 | 响应式 / 断点 | ❌ 部分 | M4 提 390/768/1440（THEME §7）；ACCESSIBILITY 声明 PC 优先 | **缺断点 token 表与降级规则**；无 sm/md/lg/xl 与页面级响应式条款 |
| 13 | 无障碍 | ⚠️ 覆盖（诚实子集） | ACCESSIBILITY.md（A1–A10 强制底线 + 抽检清单） | **无全量 a11y CI**（ACCESSIBILITY §5）；对比度无数值表（A9「大致达标」） |
| 14 | 对比度 / focus 数值化 | ❌ 部分 | THEME §3.5 仅 on-primary ≥4.5:1 一处 | **缺对比度表格**（正文/小字号/disabled/状态组合）；focus ring 无统一几何规格 |
| 15 | 内容 / 文案 | ✅ 完整 | CONTENT_DESIGN.md（去 AI 味 + 配方表） | — |
| 16 | 组件文档 / 画廊 | ❌ 缺失 | 组件契约靠 `src/css/*.css` + audit 脚本 | **无组件示例页/速查与实现同步机制**（README 已漂移） |
| 17 | 视觉回归基线 | ⚠️ scaffold | D12 计划 + `test:visual:theme` opt-in 24 屏 | **Visual Yellow**：人工首 8 张未签收；CI 自动 baseline diff 未实现 |
| 18 | Token 单一事实源 | ✅ 完整 | design-tokens.ts → generated CSS/Tailwind/TS；`generate:tokens` + token:override-audit | D1 20 条 allowlist 手写覆盖（登记不阻塞） |

**汇总**：12/18 项完整或基本覆盖；6 项缺失或半覆盖（排版体系、间距语义、图标体系、数据可视化、表格、响应式断点 + 对比度/focus 数值化）。

---

## 3. 已达标资产（保护清单，勿回退）

1. **三轴主题契约**（Color Mode × Appearance × Ownership）与运行时 SSOT（`ThemeManager`、`data-appearance` + `data-color-mode`、`ownershipRoles.ts`）。
2. **门禁体系**：`ci:quality` 内含 css:audit / z-index:audit / theme:hardcode-baseline:gate / theme:bridge:gate / token:override-audit:gate / ui:audit / smoke e2e 主题契约。
3. **债务台账**：D1–D12 结构化登记 + 路线图（Phase 0–5）+ 作战手册 + XO 矩阵，状态板诚实标注 Code Green / Visual Yellow。
4. **token 生成管线**：单一事实源 → CSS/Tailwind/TS 自动生成，禁止手工污染 generated。
5. **文档裁决链**：INDEX.md 冲突裁决顺序（PRODUCT_PRINCIPLES → 宪法 → Spec → 代码）。
6. **反例库 + 验收清单 + PR 检查项**（VISUAL §9/§10、COMPONENT §11）。

---

## 4. 待完善清单

### G1 · 文档漂移（P0 · 准确性）

| 项 | 问题 | 证据 | 建议 |
| --- | --- | --- | --- |
| G1-1 | `src/css/README.md` / `QUICK-REFERENCE.md` 记录 `.btn`、`.badge`、`.card-grid`、`--radius-2xl`、`.card-glass` 等 | 实现为 `.action-btn*`（`buttons.css` 无 `.btn`）；`.card` 存在但 hover 默认位移（见 G3-1） | 校对速查文档：类名/变量与 `src/css/components/*` 实际一致；删除不存在的类；标注「实现为准，速查非决策源」 |
| G1-2 | `docs/guides/css/CSS-ARCHITECTURE-README.md` 的 z-index 尺度（1000+）与运行期（30–90）不符 | Z_INDEX §4 已点明双尺度根因 | 同步该文档为紧凑尺度；或加注「z-index 以 Z_INDEX_LAYERING_GUIDELINES 为准」 |
| G1-3 | 归属映射表重复维护：VISUAL §2.2 与 THEME §3.2 各有「目录色→banner」表，且已存在 `ownershipRoles.ts` 代码表 | 两份文档内容已部分不一致（Playground 例外描述重复） | 收敛为一份 Role 表 + 链接；文档注明「以 `ownershipRoles.ts` 为准」 |

### G2 · 缺失规范面（P1 · 增量条款，见 §5）

| 项 | 缺失 | 建议落点 |
| --- | --- | --- |
| G2-1 | **Type Role 表**：标题/正文/说明/标签 ↔ token 映射；表格数字字体（`font-variant-numeric: tabular-nums`）；禁止负 letter-spacing 边界 | VISUAL §5 新增 5.0 排版角色表 |
| G2-2 | **间距语义表**：`--spacing-*` 用途对照（控件内/控件间/卡片内/区域间） | VISUAL §4 新增 4.4 |
| G2-3 | **图标体系**：尺寸层级（16/20/24/32）、用途分类、emoji 边界、状态图标语义 | VISUAL §3.5 扩展或新增章节 |
| G2-4 | **图表规范**（Chart.js 子集）：系列色板序列（从 colorSchemes 导出）、图例/tooltip、饼图≤6 切片、颜色+形状双通道、可访问 fallback（数据表）、动画时长 | 新增 `docs/CHART_GUIDELINES.md` + THEME 附录 |
| G2-5 | **Table 规范**：吸顶列/行 hover/空态/排序图标/数字右对齐/窄屏横向滚动 | COMPONENT_GUIDELINES §6.1 或新章节 |
| G2-6 | **断点与响应式**：断点 token 表（sm/md/lg/xl）、工具页窄屏降级规则（卡片化/横向滚动） | VISUAL §4 新增 4.5 |
| G2-7 | **对比度数值表**：正文/小字号/disabled/状态组合的 ratio 要求；focus ring 几何规格 | ACCESSIBILITY §2 扩展 + THEME 附录 |
| G2-8 | **状态 token 组件对照表**：`--color-success/warning/error/info/neutral` 用于 badge/toast/空态/加载的组件映射 | COMPONENT_GUIDELINES §5/§6 |

### G3 · 契约与实现冲突（P1 · 代码侧决策）

| 项 | 冲突 | 建议 |
| --- | --- | --- |
| G3-1 | `cards.css` 的 `.card:hover` 默认 `translateY(-1px)`，与 THEME §4.2「Workbench card：8px、轻边框、**无位移**」冲突；需业务方手动 `.card--static` 退出 | **决策点**：把默认改为无位移（hover 只变边框/阴影），Entry 卡显式加 `.card--lift`；或把规范改为「共享 `.card` 允许 -1px lift」。建议前者（与底线一致） |
| G3-2 | `buttons.css` 的 `.action-btn:hover { translateY(-1px) }`、`:active { scale(0.98) }` 与「面板禁止 hover 位移」的边界 | 规范 §4.1 指**面板**；按钮按动反馈（`:active`）允许。需在 COMPONENT §3 明确：「按钮 hover 允许 ≤1px lift，active 允许 pressed 反馈；面板/卡片不适用」——消除灰色地带 |
| G3-3 | Playground 配置 `orange` vs 实现 terracotta 例外（VISUAL §2.2 / THEME §3.2 已记录） | 维持例外，但统一写入 Role 表备注；本轮**不新增** `wb-theme-orange`（已在规范中，保持不变即可） |

### G4 · 验收闭环（P2 · 持续）

| 项 | 缺口 | 建议 |
| --- | --- | --- |
| G4-1 | 视觉回归 **Visual Yellow**：D12 scaffold 24 屏 opt-in，人类首 8 张未签收 | 按 D12 §6 排期人工截图 → 签收 → 再评估 CI baseline diff（明确不做 fail-closed 阻断） |
| G4-2 | 无障碍无全量 CI | 鼓励关键交互 e2e 用 role/name；可评估 axe 扩展为可选门禁；AA 认证单独立项（ACCESSIBILITY §1 已声明） |
| G4-3 | 组件画廊缺位导致速查文档漂移（G1-1 根因） | 可选：`docs/api/` 或静态模板页做组件示例页；若不做，至少用 audit 脚本校验「文档类名 ↔ CSS 类名」存在性（低成本防漂移） |

---

## 5. To-Be 增量条款草案（写入各宪法的附录）

> 原则：**只增量、不改既有结论**；全部为文档条款，代码侧仅 G3 两处契约对齐。

### 5.1 排版角色表（→ VISUAL §5 新增「5.0 排版角色」）

| Role | 应用 | 字号/字重/行高 token | 说明 |
| --- | --- | --- | --- |
| Display / 模块总览主标题 | 总览 hero | `xl`–`2xl` / 800 / tight | 仅总览入口，不进工具页 |
| Page title | 页面主标题（`h1.wb-title`） | `lg`–`xl` / 700 / snug | Banner 规格以 §3.3 为准 |
| Section title | 页面 section（`h2`） | `lg` / 600 / snug | |
| Card title | 卡片标题（`h3`/`.card-title`） | `base`–`lg` / 600 / normal | 工具页卡标题 14–18px |
| Body | 正文/描述 | `base` / 400 / normal–relaxed | slate-600 语义色 |
| Caption / Helper | 说明、表格注脚 | `sm` / 400 / normal | 不得用于关键信息 |
| Label / 标签 | 表单 label、badge、tag | `sm` / 500 | |
| Numeric / 表格数字 | 数据列 | `base` / 400 / tabular-nums | `font-variant-numeric: tabular-nums` 保持数字对齐 |

约束：正文不得小于 `sm`（12px）；展示字体不进工具页；不在正文使用负 letter-spacing。

### 5.2 间距语义表（→ VISUAL §4 新增「4.4 间距语义」）

| Token | 值 | 用途 |
| --- | --- | --- |
| `--spacing-1` | 4px | 图标与文字间隙、tag dot 内距 |
| `--spacing-2` | 8px | 控件内水平 padding、紧凑控件间距 |
| `--spacing-3` | 12px | 表单控件间、卡内元素垂直间距 |
| `--spacing-4` | 16px | 卡内 padding、字段 label–控件间距 |
| `--spacing-6` | 24px | 卡片之间、区域之间 |
| `--spacing-8` | 32px | 页面大区块分隔 |

### 5.3 图标体系（→ VISUAL §3.5 扩展）

- 尺寸层级：`16px`（行内/操作）、`20px`（工具栏）、`24px`（导航/入口）、`32px+`（大图标容器）。
- 分类：导航图标、操作图标、状态图标、装饰图标；状态图标必须伴随文字或颜色+形状双通道。
- emoji 边界：内容型（非语义装饰）可保留；**禁止** emoji 承担导航/按钮/状态语义（沿用现有条款）。
- 所有装饰 `<i>` 必须 `aria-hidden="true"`（已有，重申）。

### 5.4 图表规范要点（→ 新增 CHART_GUIDELINES.md，THEME 附录挂链接）

- 系列色板：从 `colorSchemes` / 全局色阶导出的**固定序列**（≥8 色，色相间隔可辨），禁止页内随手配色。
- 图例 + tooltip 必备；关键数值常显（不只 hover）。
- 饼图/环形图 ≤6 切片；>6 用堆叠条形。
- 颜色+形状/文字双通道；提供数据表 fallback。
- 动效 ≤300ms；尊重 `prefers-reduced-motion`。

### 5.5 Table 规范要点（→ COMPONENT_GUIDELINES 新增「数据表」节）

- 数字列右对齐 + tabular-nums；文本列左对齐。
- 吸顶表头（sticky）使用 `--z-sticky`（35）；行 hover 只变背景。
- 空态用共享 `.empty-state`；长表加载用 skeleton。
- 窄屏：提供横向滚动或卡片摘要，不挤压正文（对应历史 UI-P2-07）。

### 5.6 断点表（→ VISUAL §4 新增「4.5 响应式」）

| 断点 | 应用 |
| --- | --- |
| ≥1440px | 大屏主工作台（标准） |
| 768–1439px | 侧栏压缩态、banner 压缩规格（§3.5） |
| ≤768px | 单列布局、双字段表单折行（COMPONENT §4.3） |
| ≤390px | 触控目标 ≥40–44px 复核 |

### 5.7 对比度与 focus（→ ACCESSIBILITY §2 扩展）

- 正文 ≥4.5:1；大字号/粗体（≥18px/700）≥3:1；disabled 不要求达标但必须保留可辨识边框。
- 状态组合：`--color-error` 文字须在浅底 ≥4.5:1。
- focus ring：统一 `--color-focus-ring` + 2px 环 + 2px offset；不依赖浏览器默认仅在有替代时移除。

---

## 6. 边界（明确不做 · 防范围膨胀）

- 换字体栈 / 引入展示字体（设计-token 已有系统字体族，维持）。
- 全站营销式动效、white-label 引擎。
- 重写 Deep Chat terracotta 业务色。
- 一次 PR 清零 ~900+ `blue-*`（D6 分期，维持现状）。
- 本波次不新增 `wb-theme-*` 变体（Role 表为准）。

---

## 7. 验收定义

本文作为「补齐 Spec」的完成定义：

1. G1 三处文档漂移修复，且「文档类名 ↔ CSS 类名」可被 audit 脚本校验（或人工抽查记录）。
2. G2 八项条款全部合入对应宪法文档（VISUAL / COMPONENT / ACCESSIBILITY / 新增 CHART_GUIDELINES），文档冲突裁决链更新 INDEX 索引。
3. G3 两处契约对齐决策已定并落地（`.card` 默认位移方向 + 按钮 hover 边界条款）。
4. G4 视觉回归 D12 人工首 8 张完成签收（Visual Yellow → 按 XO 结论转 Green 或登记债务）。
5. 必跑验证：`npm run ci:quality`（门禁不红）+ 文档链接自检 + `git diff --check`。

落地顺序与责任人拆分见 [视觉设计规范补齐计划](../plans/2026-08-06-visual-design-spec-completion-plan.md)。
