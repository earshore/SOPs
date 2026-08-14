# TD-THM-02 Phase B 执行计划：Top10 文件迁移 + `--scope modules` 门禁

**Author**: Manus AI · **Date**: 2026-08-14 · **Scope**: earshore/SOPs · **Status**: 评估完成，待执行

---

## 1. 数据口径校准

看板卡面记载的「1,193 处（五色合计 ~6,047）」是 TD-THM-02 建立之初的全量口径，未包含第一阶段提示词常量化与第二阶段空状态收敛中已消化的部分，也不包含 `utility-bridge` 桥接层对存量类名的覆盖事实。以当前 `main`（`4b67ccfd`）重新运行官方审计脚本 `theme-hardcode-baseline.ts --scope all`，实测数据如下：

| 指标 | 数值 | 说明 |
| --- | --- | --- |
| 扫描文件数 | 682 | 全 `src` 树 |
| 命中文件数 | 59 | |
| **总命中（blue/indigo，四前缀 + 渐变/阴影变体）** | **746** | 较看板 1,193 已回落约 38%，前阶段间接收敛生效 |
| `modules` scope 合计 | 576 | sops 334 / amz_hub 163 / more 40 / app_center 39 / other 0 |
| shell 侧（megaMenu.ts） | 13–25 | 13 为基线口径（blue-only），25 为含渐变/阴影变体的宽口径 |

两个结构性发现决定迁移计划的边界：

1. **`utility-bridge.generated.css`（48 处）是自动生成文件**，由 `scripts/build/generate-utility-bridge.ts` 在 `npm run generate:tokens` 时产出，其职责正是把存量浅色工具类（含 `bg-blue-*` / `bg-indigo-*`）在 resolved-dark 下桥接到语义 token。它不是「待迁移债务」而是「迁移基础设施」，**Phase B 不动该文件**，命中数的消化应通过扩大生成脚本的 utility 清单或模板级迁移实现。
2. **`dark-content-compat.css`（64 处）是 T4 兼容层**，按仓库既有决策（README 注释「Rewriting every template is a long tail; this layer remaps… New code should use .ui-card / semantic tokens」）为业务模板保留的长尾兜底，**Phase B 同样不动**。

因此 Phase B 的有效迁移面为 **59 个命中文件 − 2 个基础设施层 − 1 个 shell 文件（megaMenu.ts 属 Phase 0 已受控的 shell lane）≈ 56 个业务文件，其中 top10 覆盖约 250 处（当前口径）**，与看板「top10 文件 589 处」的旧口径吻合度合理（旧口径含五色与更宽前缀）。

## 2. Top10 文件清单（当前口径实测排序）

按模块内命中数降序，排除生成/兼容基础设施后：

| # | 文件 | 模块族 | 命中 | 高频模式（典型样本） | 预估工作量 |
| --- | --- | --- | --- | --- | --- |
| 1 | `sops/views/growth/ppc_advertising/template.html` | sops | 57 | bg-blue-50、border-blue-200、text-blue-600 | 中 |
| 2 | `sops/views/safety/eu_gpsr_compliance/template.html` | sops | 40 | bg-blue-50、bg-blue-500、border-blue-200 | 中 |
| 3 | `sops/views/service/email_templates/template.html` | sops | 30 | bg-blue-50、border-blue-200、bg-blue-500 | 中 |
| 4 | `sops/views/service/negative_review/template.html` | sops | 27 | bg-blue-50、border-blue-200、text-blue-600 | 中 |
| 5 | `sops/views/service/qa_maintenance/template.html` | sops | 24 | bg-blue-50、border-blue-200、text-blue-700 | 小 |
| 6 | `sops/views/growth/restricted_words/template.html` | sops | 23 | bg-blue-50、border-blue-300、text-blue-800 | 小 |
| 7 | `sops/views/safety/product_compliance/template.html` | sops | 21 | border-blue-400/500、bg-blue-500、text-blue-600 | 中 |
| 8 | `sops/views/backend/procurement_qc/template.html` | sops | 19 | bg-blue-50、border-blue-200、text-blue-600 | 小 |
| 9 | `amz_hub/views/advanced/mature_phase/template.html` | amz_hub | 17 | bg-blue-500、border-blue-200、text-blue-800 | 小 |
| 10 | `sops/views/overview/template.html`（并列 17） | sops | 17 | bg-indigo-50、text-indigo-600、bg-blue-50 | 小 |

第 10 位存在并列（`more/views/explore/workflows` 17、`sops/views/growth/listing_seo` 15、`app_center` 侧 `AlpinePanel.ts` 24 若计入 TS 渲染器）。**建议取 #56/71 号位 AlpinePanel.ts（24 处，TS 渲染器，语义集中度高）作为实质第 10 位**，top10 合计约 **268 处**，覆盖 modules 总量的 46%。

### 共性模式与目标映射

全 top10 的色阶分布高度同质，可归纳为四种语义，迁移即「类名 → 语义变量」的一对一替换：

| 存量类名模式 | 语义意图 | 建议映射目标 | 深色行为 |
| --- | --- | --- | --- |
| `bg-blue-50` / `bg-indigo-50`（约 55%） | 浅色表面 tint | `bg-[var(--surface-tint-accent,theme(colors.blue.50))]` 或新建 `.ui-tint` 工具类 | token 自带 dark fallback 后自动翻转 |
| `border-blue-200/300`（约 25%） | 强调色 hairline | `border-[var(--border-accent-hairline,theme(colors.blue.200))]` | 同上 |
| `text-blue-600/700/800`（约 15%） | 标题/链接强调 | `text-[var(--text-accent,theme(colors.blue.600))]` | 同上 |
| `bg-blue-500`（约 5%） | 实心强调按钮/标签 | `bg-[var(--color-accent)]`（Appearance accent token） | 已受 TD-THM-01 管控 |

语义变量定义统一落 `src/css/foundation/variables.css` + `design-tokens.ts`，dark fallback 沿用三选择器约定（`.dark` / `[data-color-mode-resolved='dark']` / `[data-theme='dark']`），与第二阶段 empty-state 契约的做法一致。迁移采用 `arbitrary value` 保留 Tailwind 前缀语义（`bg-`/`text-`/`border-`），不引入新 class 族，回归面最小。

### 文件级风险提示

- `product_compliance`（#7）含 `border-blue-400/500` 与 `bg-blue-500`，实心色占比高于平均，替换后需截图核验视觉对比度。
- `AlpinePanel.ts`（#10）为 TS 字符串渲染，替换后需跑 type-check 确认无类名拼接破坏。
- `email_templates`（#3）为富文本模板预览，迁移后用邮件预览页实测。

## 3. `--scope modules` 门禁方案

`theme-hardcode-baseline.ts` 已内建 `modules` scope（五族基线、`--fail-on-increase`、`--update-baseline`），**无需新写脚本**，Phase B 的接入动作是：

1. 将 `npm run theme:hardcode-baseline:gate`（或等效的 `--scope modules --fail-on-increase`）加入 `ci:quality` 第 N 项，与 `theme:hardcode-baseline:gate`（shell lane）并列；
2. 本轮迁移每完成一批文件即 `--update-baseline`，门禁基线随收敛下降，「只降不升」；
3. 遗留长尾（top10 之外的 46 个文件约 308 处 + 生成/兼容层）登记进 Phase C（slate/accent 长期战），不在本轮触碰。

## 4. 执行批次与验证纪律

按「同族聚合、单族单 commit」原则分三批：批次一 `sops` 8 文件（#1-8 中 7 个 sops + overview），批次二 `amz_hub` + `app_center`（mature_phase + AlpinePanel），批次三 `more` 并列文件（workflows）视容量并入批次一。每批执行纪律不变：`ci:quality` 全绿（含新门禁）→ `npm run build` → `CI=1 npm run test:e2e:smoke`（30 用例）→ `git pull --rebase` → 提交推 main → 更新看板（TD-THM-02 卡面）与路线文档（ROADMAP 次序 7 或 THM-02 段落）。

## 5. 预期产出

| 产出 | 目标值 |
| --- | --- |
| 迁移处数（top10） | ~268 处 blue/indigo 硬编码 → 语义 token |
| modules 命中下降 | 576 → ~308（降 47%） |
| CI 门禁 | `theme:modules:gate` 上线（1 项新增，ci:quality 20 项） |
| 不动项 | utility-bridge.generated.css、dark-content-compat.css、megaMenu.ts（shell lane 既有）、Phase C 长尾 |
