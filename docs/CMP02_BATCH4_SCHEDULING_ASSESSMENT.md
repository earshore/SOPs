# TD-CMP-02 批次 4 独立排期评估

**日期**：2026-08-15 ｜ **作者**：Manus AI ｜ **关联**：TD-CMP-02 表单债专项（`docs/CMP02_FORM_DEBT_PLAN.md`）、TD-THM-02（已关闭）

## 1. 评估结论摘要

经过本轮全量检查点与逐文件复核，原批次 4 的界定（"npi 控件本体收口 307 处中 297 处按 TD-THM appearance 路线缓行"）需要**重新界定**。核心结论如下表：

| 评估项 | 结论 |
| --- | --- |
| 7 个动态控件本体 | **已对齐，无需再改**：全部带 `data-action='update-field'`，forms.css L376-413 补丁（min-height / focus 背景 / outline none）已生效 |
| 307 处颜色类 | **不属于表单债**，属于 npi 表格业务语义色（slate 157 / red 58 / emerald 57 / purple 32 / amber 25），与表单控件样式无关 |
| TD-THM-02 耦合 | **已断裂**：TD-THM-02 已关闭、gate 锁死；modules lane 门禁（blue+indigo 双族）对 npi 的 slate/red/emerald/purple/amber **完全无覆盖**（npi 52 文件扫描 hits=0），原"依附 TD-THM appearance 路线缓行"的前提不再成立 |
| 批次 4 建议 | 拆分为 4A（登记关闭，零工作量）+ 4B（新建 npi 语义色 token 化专项，建议独立排期，预估 5 个工作日） |

## 2. 全量检查点（2026-08-15）

main @ `d2940171` 健康确认：**ci:quality 20 项全绿（EXIT=0）→ build（EXIT=0）→ e2e smoke 30/30 通过**。工作区干净，无未提交变更。TD-CMP-02 前三个批次（focus-ring 契约 `8a103b21`、forms 空壳瘦身 `a86d300d`、settings-control 变体下沉 `b0d9358c`）均已通过此检查点验证。

## 3. npi 控件体系现状复核

npi tracker 模块仅三个文件：`template.html`（静态页结构）、`index.ts`（动态渲染逻辑）、`data/mockData.ts`（模拟数据）。本次复核对三套体系逐项验证：

**动态控件（7 个）已全部收口。** index.ts L296-367 内的 5 个 checkbox、1 个 number input、1 个 select 全部带 `data-action='update-field'` 属性，forms.css 中 TD-CMP-02 批次 1/2 建立的 body 级补丁（L376-413，`body input[data-action='update-field'], body select[data-action='update-field']` 三组：min-height、focus 背景、outline none）对这些控件**自动生效、无需任何 HTML 改动**。7 个控件中 5 个 checkbox 带 `text-emerald-600`（选中态勾号着色，属业务语义色而非表单控件样式）。原计划中"7 个动态 update-field 控件"的收口工作实际已由批次 1/2 的补丁机制完成。

**颜色类分布与业务语义。** 模板 302 处 + JS 动态模板 21 处 + mockData 6 处，共 329 处颜色类命中。分布为 slate 157（中性/表格底色）、red 58（失败/风险状态）、emerald 57（完成/正向状态，含 checkbox 勾号 5 处）、purple 32（待办/规划状态）、amber 25（进行中/提醒状态）。这些颜色类承载**表格行状态徽章、阶段高亮等业务语义**，不属于"表单控件外观一致性"范畴，与 TD-CMP-02 的原始目标（三套表单体系双套维护 + 深色盲区）无关。

**门禁覆盖盲区已确认。** theme:hardcode-baseline 的 modules lane 采用 blue+indigo 双族口径（shell lane 已于 `d79372a3` 同步对齐），baseline 显示 npi 52 个文件扫描 hits 为 0——npi 完全不使用 blue/indigo 族，全部颜色类落在 slate/red/emerald/purple/amber 五族。这意味着 npi 的 307 处内联颜色类当前**不受任何门禁约束**，属于 TD-THM-02 关闭后遗留的监控盲区，是潜在的新债温床。

## 4. 技术难点分析

**难点一：渲染架构耦合（Alpine.js 单页字符串模板）。** `template.html` 是一个完整的单页表格应用，行与控件由 `index.ts` 通过字符串模板动态拼接（26 处 input/select/textarea 相关模板段），状态色嵌入在 JS 逻辑中（`updateField` 与行渲染函数）。将颜色类迁移为语义 token 不是简单的样式替换，而是需要同时建立「token 命名契约 → CSS 宿主 → JS 模板引用」的三端联动，每次状态色变更需跨三端同步。

**难点二：语义色契约缺失。** sops_style.css（1558 行）已有 `.sops-overview` 根 token 块（40+ 个 `--sops-qwen-*` token）与 `.npi-tracker-page` / `.npi-lifecycle-table` 族（L270-349），存在可挂载的 token 宿主，但 **npi 专属语义色 token 尚未登记**（待办/进行中/完成/失败/中性五档及其深浅变体）。需要先在 CSS 侧建立 `--npi-status-*` 契约并确认五色与 `--sops-qwen-*` 色系的映射关系，再逐类迁移。

**难点三：TD-THM 路线断裂后的归属问题。** 原计划将 297 处"缓行"依附于 TD-THM-02 appearance 路线，但该专项已于 `69c1a85d` 关闭、gate 锁死，TD-THM-03 尚未立项。npi 语义色 token 化无法再搭 TD-THM 的便车，需要作为**独立专项**立项（新 ID 建议 `TD-SOP-NPI-01` 或在 TD-CMP-02 下增补批次 4B），并考虑同步在 theme:hardcode-baseline 门禁中扩大色族覆盖（纳管 slate/red/emerald/purple/amber 族）以堵住盲区。

**难点四：视觉回归范围大。** npi 表格是该模块的核心交互面，307 处颜色类迁移的任何偏差都会直接体现在表格可读性上。需要建立逐状态（五档 × 深浅变体）的截图对比基线，smoke 用例目前仅覆盖功能路径，**不包含 npi 表格全状态视觉断言**，这是该专项排期必须计入的隐性成本。

## 5. 与 TD-THM 路线的耦合影响

TD-THM-02 的关闭对批次 4 产生了三方面的连锁影响。**第一，前提断裂**：原计划"297 处按 TD-THM appearance 路线缓行"依赖 TD-THM-02 的 ongoing appearance 迁移通道，现在该通道已关闭，npi 颜色类失去迁移载体。**第二，盲区固化**：TD-THM-02 收口时 modules lane 采用 blue+indigo 双族口径，npi 的五族颜色类恰好全部落在口径之外；随着 gate 锁死，这一盲区将被长期固化，后续任何 npi 新增的内联颜色类都不会触发门禁——这是当前评估中发现的最重要的结构性风险。**第三，token 体系对齐需求**：TD-THM-02 期间建立的共享 utility token 与 dark 桥接层（`utility-bridge.generated.css`）已覆盖 blue/indigo 双族的深色翻转，npi 五族的深色翻转目前依赖 Tailwind 默认行为，缺乏项目级 dark 契约（与 TD-THM-02 解决的深色盲区问题同源）。

因此，批次 4 的合理归宿有两个选项，推荐按优先级评估：

| 选项 | 内容 | 门禁联动 | 预估工期 |
| --- | --- | --- | --- |
| A. 纳入 TD-CMP-02 批次 4B（推荐） | npi 语义色 token 化专项（`--npi-status-*` 五档契约 + JS 模板三端迁移 + 全状态截图基线） | 可选：theme:hardcode-baseline 增加 slate/red/emerald/purple/amber 族覆盖（gate 扩容属新门禁需求，需单独评审） | CSS 契约 0.5 天 + 迁移 3 天 + 截图基线与回归 1.5 天 ≈ 5 个工作日 |
| B. 独立新专项 TD-SOP-NPI-01 | 与 A 相同范围，但作为模块级（sops）债务单独跟踪，与表单债脱钩 | 同左 | 同左 |

两种选项的交付物一致，区别仅在于看板归属。若选择 A，TD-CMP-02 的关闭条件需同步更新为"4B 完成"；若选择 B，TD-CMP-02 可在 4A 登记后关闭（7 控件本体已收口、307 处颜色类经本次评估重新界定为非表单债），避免看板长期悬置。

## 6. 批次 4A：零工作量登记（建议立即执行）

经复核，7 个动态控件本体已完全收口于 forms.css 补丁机制。建议将 4A 标记为登记关闭：commit 中新增一行说明即可（不引入代码变更风险）。此动作可与本次评估文档提交合并。

## 7. 下一步建议

建议按以下顺序推进：第一步（本次）提交评估文档 + 4A 登记 + 看板/路线文档同步，TD-CMP-02 状态更新为"4A 登记关闭；4B 独立排期待启动"；第二步（排期）用户确认后立项 4B（TD-SOP-NPI-01 或 CMP-02 4B），先完成 `--npi-status-*` 契约登记（零侵入、可先行提交），建立视觉基线截图；第三步（执行）分批迁移 307 处颜色类，每批附带 smoke 与新增的 npi 表格截图回归。

---

*评估数据来源：npi 颜色类统计脚本（329 处命中，template.html 302 / index.ts 21 / mockData.ts 6）、theme-blue-hardcode-baseline.json（modules lane npi 52 文件 hits=0）、forms.css L376-413（update-field 补丁）、index.ts L296-367（7 控件定义）、sops_style.css（L1-40 根 token 块、L270-349 npi 类族）。*
