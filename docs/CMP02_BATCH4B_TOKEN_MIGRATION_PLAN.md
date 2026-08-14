# TD-CMP-02 批次 4B：NPI 表格语义色 Token 化专项方案

**日期**：2026-08-15 ｜ **作者**：Manus AI ｜ **状态**：已立项（5 个工作日排期确认）
**关联**：`CMP02_BATCH4_SCHEDULING_ASSESSMENT.md`（批次 4 评估，`43739653`）、TD-THM-02（`69c1a85d` 关闭）、语义色哨兵门禁（`764f31e8`）

## 1. 立项背景

批次 4 评估（`CMP02_BATCH4_SCHEDULING_ASSESSMENT.md`）将 npi 控件体系重新界定为两部分：4A（7 个动态控件本体）经复核已收口于 forms.css 的 update-field 补丁机制，登记关闭、零工作量；4B（307 处颜色类）经评估重新界定为 **npi 表格业务语义色**（slate/red/emerald/purple/amber 五族），不属于表单债范畴，且原依附的 TD-THM-02 appearance 迁移路线已随该专项关闭而断裂。TD-THM-02 收口时 modules lane 采用 blue+indigo 双族口径，npi 五族恰好全部落在门禁之外（npi 52 文件扫描 hits=0），形成结构性盲区。该盲区已于 `764f31e8` 通过 theme:hardcode-baseline 新增 semantic lane（五族、sops 模块 52 文件、baseline 4282 处、total + per-file 双锁）紧急堵住——此后任何新增内联语义色都会被门禁拦截，为 4B 迁移提供了「只降不升」的受控环境。

用户已确认启动批次 4B 的 5 个工作日排期，本方案即专项执行计划。

## 2. 目标与范围

专项目标是将 npi tracker 模块的内联五族颜色类迁移为 **`--npi-status-*` 语义 token**，实现「状态色单一登记点 + CSS 自动深色翻转 + 门禁防回退」三层闭环。迁移后 npi 子目录（`modules/sops/views/growth/npi_tracker`）的 semantic lane hits 应趋近于零（仅保留 mockData 的语义标记位，其样式由模板统一消费），semantic lane baseline（当前 sops 模块 4282 处）随之更新下降。

| 维度 | 内容 |
| --- | --- |
| 迁移对象 | npi_tracker 三文件：`template.html`、`index.ts`、`data/mockData.ts` |
| 颜色类统计（迁移前实测） | template.html 312 处、index.ts 21 处、mockData.ts 6 处，合计 339 处 |
| 五族分布（三文件合计） | slate ≈130（中性底色/文本）、red ≈48（失败/风险）、emerald ≈47（完成/正向）、purple ≈37（待办/规划）、amber ≈37（进行中/提醒） |
| 门禁口径 | semantic lane（`theme:hardcode-baseline`）五族 baseline 只降不升 |
| 视觉回归 | NPI 表格全状态 light/dark 截图断言（`docs/color-region-baselines/`，pixelmatch diffRatio≤0.001） |
| 不在范围 | 其他模块（amz_hub/app_center/more）的五族颜色类——仍属 appearance 长期路线；sops 非 npi 文件的语义色——TD-THM-03 或后续专项处理 |

## 3. `--npi-status-*` 契约设计

契约宿主为 `sops_style.css` 的 `.npi-tracker-page` 根 token 块（L270 起，与现有 `.sops-overview` 的 `--sops-qwen-*` 40+ token 体系同文件、同宿主风格）。命名按「状态档 × 用途变体」二维展开：

| Token | 用途 | 浅色值 | 深色翻转（`.dark` 块） |
| --- | --- | --- | --- |
| `--npi-status-todo` | 待办/规划（purple 族） | `#6257f5`（沿用 sops-qwen-violet） | `#8b85ff`（提高深色可读性） |
| `--npi-status-todo-soft` | 待办行底/徽章底 | `#f5f3ff`（qwen-soft） | `#1e1b4b` 级深色底 |
| `--npi-status-pending` | 进行中/提醒（amber 族） | `#d97706`（amber-600） | `#fbbf24` |
| `--npi-status-pending-soft` | 提醒行底/徽章底 | `#fffbeb`（amber-50） | `#451a03` 级深色底 |
| `--npi-status-done` | 完成/保留（emerald 族） | `#059669`（emerald-600） | `#34d399` |
| `--npi-status-done-soft` | 完成行底/徽章底 | `#ecfdf5`（emerald-50） | `#064e3b` 级深色底 |
| `--npi-status-fail` | 失败/风险（red 族） | `#dc2626`（red-600） | `#f87171` |
| `--npi-status-fail-soft` | 风险行底/徽章底 | `#fef2f2`（red-50） | `#450a0a` 级深色底 |
| `--npi-status-neutral` | 中性（slate 族） | `#475569`（slate-600） | `#94a3b8` |
| `--npi-status-neutral-soft` | 中性行底/斑马纹 | `#f8fafc`（slate-50） | `#0f172a` 级深色底 |

设计原则三条：**第一，色值对齐 Tailwind 原色阶**，浅色变体直接取自当前模板使用的 `text-{族}-{500|600}` / `bg-{族}-50` 值，保证迁移零视觉差；**第二，深色翻转纳入同一契约**，`.dark .npi-tracker-page` 块内统一登记十个 `-dark` 变体（当前 68 处 `.dark` 选择器多为逐类硬翻，迁移后收口为 token 块级翻转，CSS 行数同时瘦身）；**第三，业务状态枚举不变**（待办/进行中/完成/失败/中性五档），仅更换消费方式——模板侧从内联 Tailwind 颜色类改为 `var(--npi-status-*)` 驱动的 `.npi-status-*` 语义类或 style 内联变量，JS 动态模板同步改造。

## 4. 三端联动与分批计划

`template.html` 是完整单页表格应用（含 Alpine x-* 指令），行与控件由 `index.ts` 字符串模板动态拼接，状态色同时嵌入静态模板与 JS 渲染逻辑——改造必须三端同步。遵循「大工程不做大迁、每批单独验证提交」的原则，按依赖顺序分三批：

| 批次 | 范围 | 工作内容 | 预估工期 | 验证标准 |
| --- | --- | --- | --- | --- |
| 批 1 | `sops_style.css` | 契约建立：`.npi-tracker-page` 根块登记 10 个浅色 token + `.dark` 块登记 10 个翻转变体；契约注释（色值来源、状态语义、新增禁令）；同时更新 dark 翻转块的文档注释 | 0.5 天 | ci:quality 全绿 + build + smoke 31/31（纯新增 token，零侵入） |
| 批 2 | `index.ts`（21 处）+ `data/mockData.ts`（6 处） | JS 动态模板改造：行渲染函数的状态色分支从内联类改为语义 token 引用；mockData 颜色字段统一为状态枚举 + 模板侧派生色类（消除 mock 与模板的颜色耦合） | 1 天 | 截图断言 light/dark 双 baseline 零 diff + semantic lane baseline 下降 + 全链验证 |
| 批 3 | `template.html`（312 处） | 静态模板改造：行状态徽章、阶段高亮、斑马纹、条件分支（inventory/ctr/acoas/price）从内联 Tailwind 类改为语义 token 引用；删除 `.dark` 块内对应的逐类硬翻选择器（token 块级翻转接管） | 2 天 | 截图断言全状态零 diff + 语义 lane npi hits → 0 + 全链验证 + 更新 semantic lane baseline（4282 下降） |
| 收尾 | 全库 | baseline update（semantic lane）、截图基线确认、看板与路线文档同步 | 1.5 天 | ci:quality + build + smoke 31/31 全绿，提交 |

预估合计 **5 个工作日**（CSS 契约 0.5 + 迁移 3 + 截图基线与回归 1.5），与评估文档的排期一致。每批完成后必须满足门禁三件套（`ci:quality` 全绿、`build` 成功、`smoke` 通过），且语义 lane 基线只降不升。

## 5. 风险与应对

**视觉回归风险**：npi 表格是该模块核心交互面，339 处颜色类迁移的任何偏差都直接影响可读性。应对：批 1 完成后即用 `UPDATE_SNAPSHOTS=1` 冻结 light/dark 双 baseline，批 2/3 每批提交前跑 pixelmatch 断言，diffRatio 阈值 0.001（约允许 60 个像素差异，覆盖亚像素抗锯齿）。

**语义归类风险**：当前模板的紫色是否一律对应「待办」、琥珀是否一律对应「进行中」需在批 1 建立契约时逐类确认（约 74 处 purple/amber 需要人工核对状态语义），分类错误会导致契约与业务不符。应对：批 1 工期内含一次模板语义普查，产出「类 → 状态档」对照表随契约提交。

**JS 模板改造风险**：`index.ts` 的字符串模板中颜色类嵌入在条件表达式内（如 `inventory_days>60 ? 'text-red-600' : ''`），正则式迁移不可靠。应对：批 2 按函数逐段改造，每段改造后单独跑断言，禁止批量正则替换。

**门禁联动风险**：semantic lane baseline 4282 含 sops 全模块 52 文件，批 3 完成后需 `npm run theme:hardcode-baseline:update` 一次性更新——该命令必须在全链验证通过后执行并提交，否则会锁死错误基线。

## 6. 验收标准（专项关闭条件）

专项关闭需同时满足：其一，`modules/sops/views/growth/npi_tracker` 三文件的语义 lane hits 归零（或仅剩 mockData 的语义枚举标记，经评审登记豁免）；其二，semantic lane baseline 更新后 sops 模块总量低于 4282 且后续门禁持续只降不升；其三，NPI 表格 light/dark 双 baseline 截图断言零 diff 且 smoke 全绿；其四，CSS 契约注释完整（登记点唯一、色值来源可溯、新增禁令明确）；其五，看板 `TECH_DEBT_BOARD.md` 与路线文档 `TECH_DEBT_TIGHTENING_ROADMAP.md` 的 TD-CMP-02 行状态同步为「4B 完成」。
