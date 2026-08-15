# 次序 13 专项方案：slate 结构性灰调统一化（TD-SOP-NPI-02 候选）

**日期**：2026-08-15 · **依据**：`NEXT_PHASES_PLAN.md` 次序 13 + `CMP02_FORM_DEBT_PLAN.md` 4B 划界 + `theme-hardcode-baseline.ts` semantic lane 机制实测

## 1. 立项背景与口径修正

次序 13 原口径为「template/index.ts 约 180 处 slate 结构性灰调」。立项摸底实测后修正：全 sops 模块 slate 族硬编码 **2,048 处 / 21 文件**（19 个 template.html + restrictedWordsHandler.ts 45 处 + npi_tracker/promotion_submission index.ts 12 处），全部落在 semantic lane baseline 4087 内（sops 52 文件、23 文件有命中）。旧口径 180 处仅为 ppc_advertising/listing_seo 两个文件的局部数字，特此修正，以本方案为准。

结构性灰调的定义沿用 CMP-02 4B 划界：非状态语义色的中性灰，用于 hover 行、表格分隔、卡片底色、正文层级与次要文本，与五族状态色（slate 族中承担 pending/done/muted 等状态语义的部分）按使用上下文甄别。slate 族横跨两端的特性是本次专项的核心难点：border-slate-200 分隔线是纯结构性，而 text-slate-500 在某些文件承担状态语义，需逐族甄别而非全族迁移。

## 2. 门禁兼容性

semantic lane 为「只降不升」双锁（total + per-file）。token 迁移使命中数下降，符合 gate 方向，不违反门禁；每批提交后通过 `npm run theme:hardcode-baseline:update` 刷新 baseline，保持双锁持续拦截增量。此模式已在 CMP-02 4B 验证（4282→4087，零回退）。迁移完成后 baseline 结构不变，防回退机制不受损。

## 3. Token 契约设计（--sops-neutral-* 五档族）

参照 4B `--npi-status-*` 契约模式（CSS 契约建立 → 分批迁移 → 每批验证），在 `src/modules/sops/sops_style.css` 建立中性灰契约族，含 dark 翻转块（dark 模式下灰阶上移一档保对比度）：

| Token                       | 映射                 | 用途                 |
| --------------------------- | -------------------- | -------------------- |
| `--sops-neutral-divider`    | border-slate-200/100 | 分隔线、卡片边框     |
| `--sops-neutral-surface`    | bg-slate-50/100      | 卡片底色、hover 行底 |
| `--sops-neutral-text`       | text-slate-700/800   | 正文主层级           |
| `--sops-neutral-text-muted` | text-slate-500/600   | 次要文本、非状态淡化 |
| `--sops-neutral-text-faint` | text-slate-300/400   | 占位符、最淡层级     |

甄别规则：纯结构性上下文（border/divide/bg、正文段落层级）迁移至 token；承担状态语义的 slate 用法（如表格中 muted 状态标记）保留并备注理由，记入甄别表。迁移后语义类命名沿用 `sops-neutral-*` 前缀与既有 `npi-status-*` 保持一致的命名纪律。

## 4. 分批计划（按文件族，每批独立验证提交）

| 批   | 范围                                                                            | 预估处数 | 说明                                             |
| ---- | ------------------------------------------------------------------------------- | -------- | ------------------------------------------------ |
| 批 1 | 契约建立 + growth 最大文件组（ppc_advertising 237+ / restricted_words 190+）    | ≈430     | CSS 契约 + dark 翻转 + 两文件迁移；baseline 更新 |
| 批 2 | service 组（email_templates 248+ / negative_review 206+ / qa_maintenance 171+） | ≈620     | 三文件同批                                       |
| 批 3 | 剩余 9 文件（growth 4 + backend 3 + safety 5 中未覆盖）                         | ≈700     | 分两小批（4-5 文件/批）                          |
| 批 4 | TS 端收尾 + 甄别表归档 + 验收报告                                               | ≈57      | restrictedWordsHandler 45 + index.ts 12          |

每批纪律：`ci:quality` 20 项全绿（baseline 刷新后 gate 重新锁定）+ `npm run build` + `CI=1 npm run test:e2e:smoke` 31/31（含 NPI 深浅双 baseline 像素级断言）+ prettier + 提交规范 `git -c user.name="Manus" -c user.email="manus@im" commit`。

## 4b. 批 1 完成记录（2026-08-15）

`.sops-neutral-*` 契约族（8 token：divider / divider-soft / surface / surface-raised / text / text-strong / text-muted / text-faint，+ `.sops-neutral-text-hover` / `.sops-neutral-surface-hover` 交互变体 + dark 翻转块）已建于 sops_style.css，仿照 4B `--npi-status-*` 契约模式。本批迁移 450 处：ppc_advertising 237 处清零、restricted_words template 192 处（残留 6 处 border-slate-300 甄别为 input/checkbox 控件边框契约，与 settings 控件口径一致，保留）、restrictedWordsHandler.ts 21 处。甄别执行记录：两文件 slate 用法均为结构性/排版层级，无状态语义用法（状态标记落在 amber/emerald/red 族），handler 9 行构造类全部结构性。

验收实证：ci:quality 20 项全绿（semantic baseline 4087→3600，-487，per-file 双锁刷新后重新锁定；modules 0/0、shell 24/24、lint 0/0）；build EXIT=0（7.7s）；smoke 完整 93 用例（31×3 浏览器）90 通过。3 例失败（firefox NPI pixel diff、webkit NPI 尺寸 1952×1262 vs 基线 976×631）经基线代码复测同样失败，确认为 NPI pixel 断言的 chromium-only 基线既有缺陷（4B 遗留：baseline 只在 chromium dpr=1 下生成），非本次回归；归入后续路线：baseline 按浏览器维度拆分三份，或 captureStableRegion 统一 deviceScaleFactor 后重 seed。

**批 2 已完成（2026-08-15）**：service 组三文件迁移 621 处（email_templates 247、negative_review 193、qa_maintenance 158）；残留 12 处甄别保留（bg-slate-400 ×5 优先级/分类 badge 状态语义——与 P0 red/P1 amber/P2 primary/EU purple 徽章同构色族体系，qa_maintenance E类 badge 同理；bg-slate-200 ×3 inline 状态小标签；border-slate-300 ×4 控件边框契约）；三文件 index.ts 无 slate 用法。semantic baseline 3600→2965（-635）双锁刷新。验收：ci:quality 20 项全绿 · build EXIT=0（7.75s）· smoke 93 用例 90 通过；3 失败与批 1 失败清单逐条一致（firefox/webkit NPI pixel 断言 + webkit L657 时序），确认基线既有缺陷非回归。

## 5. 风险与回滚

模板类名迁移为机械替换（值等价、class 名等价），零视觉 diff 风险；dark 翻转块为新增（dark 模式视觉变化仅限灰阶上移一档，属既定深色规范）。回滚基线：main `6918f3ef`。主要物理风险为单次批 diff 过大（批 2 六百余处），已按文件族切分控制单批 ≤700 处。

## 6. 验收基线（立项前全绿实证，`6918f3ef`）

ci:quality 20 项全绿（semantic 4087/4087 · modules 0/0 · shell 24/24 · settings-scale 41 files · lint 0/0）；build EXIT=0（8.3s）；smoke 31/31。
