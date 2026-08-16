# TD-CMP-02 表单债专项清理与重构计划

> 状态：摸底完成（2026-08-15）· 待排期启动 · P2
> 关联：`TECH_DEBT_BOARD.md` TD-CMP-02 行 · `ACCESSIBILITY.md` A 级规范 · TD-THM-02 收敛路线（大工程不做大迁）

## 1. 背景与问题定义

SOPs 前端当前存在三套并行的表单控件体系，它们在同一页面栈中各自维护 radius、padding、hover、focus 与语义 token，导致双套（甚至三套）维护成本与一致的深色翻转盲区。本轮摸底对三套体系的文件分布、引用规模与 focus-ring 现状完成了逐文件量化。

| 体系 | 定义位置 | 命中规模 | 消费形态 |
| --- | --- | --- | --- |
| A. settings-control | `src/components/settings/systemSettings.css` | 类引用 112 处 / 14 文件 | 11 个 settings section HTML + `systemSettings.html` |
| B. npi 内联 Tailwind | `src/modules/sops/views/growth/npi_tracker/template.html` + `index.ts` | 内联颜色类 307 处，静态控件 3 个 + 动态控件 7 个 | 纯内联 class，无 focus 处理类 |
| C. forms 9.1 兼容层 | `src/css/components/forms.css` | 自引用 255 处（40+ selectors），外部消费 ≈0 | 历史空壳，主要被 `ppc-report-type-control` 与 td 内联编辑规则使用 |

## 2. 摸底结论

### 2.1 体系 A：settings-control 与共享 form-\* 零交叉（属实）

看板描述"settings-control（0 采用共享 form-\*）"经 grep 交叉验证确认：settings 面板 11 个 section HTML 完全不消费 `form-input` / `form-select` / `form-textarea`，而是全部走 `settings-control` 及其 12 个变体（`--sm`、`--lg`、`settings-control--search`、`settings-proxy-form__control` 等）。该体系在 `systemSettings.css` 中自建了完整的控件契约（`--settings-focus-ring: 0 0 0 3px color-mix(...)`、radius、padding、hover、`.settings-focus-ring` 焦点环辅助类），`settings-focus-ring` 相关命中 13 处 / 6 文件（`systemSettings.css` 7、`toolStrategySection.css` 2、`dataSection/llmSection/networkSection.css` 各 1、`llmSection.html` 1）。

### 2.2 体系 B：npi 内联 Tailwind 的 `<768px` 盲区已部分收口

`npi_tracker` 三件套为 `template.html`（1477 行）、`index.ts`、`data/mockData.ts`。模板内 Tailwind 颜色类共 307 处（`border-slate-200` 45、`text-slate-700` 36、`text-slate-600` 32 居前三），模板与 TS 中 `focus:` 相关类命中为 0——控件焦点状态完全依赖全局 CSS 兜底。`update-field` 动态控件共 7 个（checkbox 6 + select 1），焦点逻辑仅在 `handleUpdateField`（L544）做数据更新，无视觉处理。

值得更新的是，此前 ACCESSIBILITY 补丁已在 `forms.css` 中为内联编辑控件补齐了 focus 基线：桌面 768+ 紧凑控件（L531-552，2px 单环）与窄屏 `<768px` 补丁（L555-567，同等 2px）。因此看板上"`<768px` 无状态基线"的状态应更新为"已通过 forms.css TD-CMP-02 补丁补齐 focus 环，但控件本体仍是内联 Tailwind 兑底，样式语义归属混乱"。

### 2.3 体系 C：forms 兼容层是"历史空壳"

`forms.css` 自引用 255 处、提供 40 余个 `.form-*` selector（`.form-input`/`.editor-input-modern`、`.form-textarea`、`.form-select`、checkbox 族、switch、card、bulk-bar 等），但外部 HTML/TS 消费点 ≈0（仅动画系统相关文件 4 处）。这意味着该兼容层 9.1 版本的大量样式长期无真实消费者，属于典型的"维护了却没人用"资产；真正在生效的是其中的 `ppc-report-type-control` 特殊清除规则（L527-534）与 td 内联编辑紧凑规则。

### 2.4 focus-ring 不一致：需裁决而非"代码有错"

代码中 `--field-focus-ring` 的 px 值存在两种口径，分布清晰：

| 位置 | px 值 | 组数 |
| --- | --- | --- |
| `forms.css` 主体（`.form-input` / `.form-textarea` / `.form-select` 等） | **3px** | 5 组（L94-95、135-136、387-388、499-500、1485-1486） |
| `forms.css` 内联编辑紧凑 + 窄屏补丁 | **2px** | 2 组（L550-552、564-566） |
| `systemSettings.css` `--settings-focus-ring` | **3px** | 1 组（L17，自建 color-mix 25%） |
| `buttons.css` `.action-btn`（文档引用） | outline 双 2px | 1 组 |

`ACCESSIBILITY.md` 的 2px 约定（L63/L66）实际针对的是"表格内联编辑 / 紧凑控件"这一特定场景，与主体表单控件的 3px 默认并不直接冲突，但文档未区分场景、代码也无统一裁决注释，长期看必然再出现口径漂移。**裁决建议（P2）：保持 3px 为通用表单控件默认、2px 为紧凑/内联控件变体，并在 `forms.css` 头部以注释固化该契约，同时把 settings 自建 token 下沉到共享 `--field-focus-ring` 语义 token。**

## 3. 重构计划（大工程不做大迁，四批次）

遵循 TD-THM-02 已验证的批次纪律：每批单独 commit、单独跑 `ci:quality + build + smoke`。

### 批次 1（文档裁决 + focus-ring 契约固化）· 预计 1 commit

在 `forms.css` 头部新增 focus-ring 契约注释（3px 通用 / 2px 紧凑变体 / `--check-ring-focus` checkbox），同步 `ACCESSIBILITY.md` 区分场景表述。`systemSettings.css` 的 `--settings-focus-ring` 改为引用共享语义 token（`var(--field-focus-ring)` 语义等价值），消除自建 color-mix。本批不改任何布局，风险为零，为后续批次锁定口径。

### 批次 2（forms 空壳瘦身）· 预计 1 commit

审计 `forms.css` 40+ selector 的真实消费者，删除确认零消费的历史 selector（保留 `ppc-report-type-control` 清除规则与 td 内联编辑规则），将文件从 255 处自引用收敛到有效集。需先对每个 selector 跑一次 `grep -rl` 消费点确认，避免误删动画系统依赖。

### 批次 3（settings-control 变体下沉）· 预计 2-3 commits

将 settings 11 个 section 的控件逐步迁移为引用共享 form token：radius / padding / hover 用共享变量替换自建值；focus 环统一为 `--field-focus-ring`；`.settings-focus-ring` 辅助类改为语义 token 实现。每 3-4 个 section 一个批次，逐批验证。settings-control 类名可保留（DOM 契约不变），仅替换其内部实现——与 TD-THM-02 Phase B 的"类名保留、语义下沉"模式一致。

### 批次 4（npi 内联 Tailwind 收口）· 预计 2 commits

将 `npi_tracker` 模板中 307 处内联颜色类分批替换为语义 token / 共享 color 类（先从控件本体 10 处静态控件 + 动态 checkbox/select 的 class 开始，因其直接关联 TD-CMP-02 的"无状态基线"问题；其余 297 处表格装饰类属 TD-THM 范畴，登记后按 appearance 路线缓行）。动态控件 class 收口到 `index.ts` 内的常量数组，避免散落模板字符串。

## 4. 豁免与登记

与 GUI014 glass 色盘豁免模式一致，本专项建立 `docs/CMP02_FORM_EXEMPTIONS.md` 豁免登记表，记录两类豁免：npi 表格装饰类（297 处，随 appearance 路线处理）与 `form-animation.ts` 动画系统引用（4 处，待动画架构评审后决定归属）。

## 5. 验收标准

| 指标 | 目标 |
| --- | --- |
| focus-ring 口径 | 代码与文档一致（3px 通用 / 2px 紧凑），`forms.css` 头部有契约注释 |
| settings 自建 token | `--settings-focus-ring` 不再自建 color-mix，下沉共享语义 token |
| forms 空壳 | 零消费 selector 全部删除，`forms.css` 体积可量化下降 |
| npi 控件本体 | 控件 class 全部收口到常量/语义类，`focus:` 状态有显式来源 |
| 每批门禁 | `npm run ci:quality`（20 项）+ `npm run build` + `CI=1 npm run test:e2e:smoke` 30/30 |

## 6. 数据附录（摸底原始统计）

settings-control 类引用 Top 文件：`toolStrategyDeepChat.html` 18、`networkSection.html` 16、`toolStrategyKeywordHunter.html` / `toolStrategyMasterAnalysis.html` / `toolStrategyPpcFlags.html` 各 12、`systemSettings.css` 10、`toolStrategyGeneralAi.html` 8、`llmSection.html` 7、`dataSection.html` 6。npi 模板颜色类 Top：`border-slate-200` 45、`text-slate-700` 36、`text-slate-600` 32、`text-slate-500` 23、`text-emerald-500` 19、`text-red-600` 17。npi 动态 `update-field` 控件位于 `index.ts` L307-L327（checkbox ×5）、L365（select ×1）；表单类交叉验证命令：`grep -rn "settings-control.*form-\|form-input.*settings" src --include="*.html" --include="*.ts"` 结果 0 命中（11 个 settings HTML 文件确认零交叉）。
