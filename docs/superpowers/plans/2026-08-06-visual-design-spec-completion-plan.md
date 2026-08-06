# 视觉设计规范补齐 · 落地计划

**日期**: 2026-08-06  
**状态**: plan · 待执行  
**上游 Spec**: [视觉设计规范覆盖审查与补齐 Spec](../specs/2026-08-06-visual-design-spec-enterprise-coverage-review.md)  
**目标**: 在 1 周内把视觉设计规范的「覆盖面缺口（G1–G3）」清零为文档/契约事实，并启动「验收闭环（G4）」；**不改动既有主题结论**，不引入新视觉方向。

---

## 0. 计划总览

| 阶段 | 内容 | 预估 | 产出 | 验证 |
| --- | --- | --- | --- | --- |
| P0 | 文档漂移修复（G1） | 0.5–1 天 | 三处文档对齐实现 | 类名抽查 + 文档链接自检 |
| P1 | 规范增量条款（G2 文档面） | 1–2 天 | VISUAL/COMPONENT/ACCESSIBILITY 增补 + CHART_GUIDELINES 新建 | 索引更新 + 条款走查 |
| P2 | 契约对齐决策（G3） | 0.5–1 天 | `.card` 位移方向 + 按钮 hover 边界条款落地 | 门禁绿 + 抽查核心页 |
| P3 | 验收闭环启动（G4） | 1–2 天 | D12 首 8 张截图 + 签收；可选 a11y 评估 | XO 记录 + 状态板更新 |
| P4 | 回归保障（持续） | 持续 | 文档↔类名 audit 脚本（可选） | `ci:quality` |

**责任人建议**: 文档条款 = 前端/设计系统 Owner；契约对齐 = 前端 + 模块 Owner 确认；G4 签收 = 产品/技术 Lead 人工 XO。

---

## 1. P0 · 文档漂移修复（G1）

### 动作

| # | 文件 | 修复 |
| --- | --- | --- |
| P0-1 | `src/css/README.md` | 组件示例改为实现实际类名：`btn`→`action-btn`（含 primary/secondary/danger/ghost 变体），核对 `.badge/.card` 是否存在；删除不存在类名（`.card-grid`、`.btn` 等） |
| P0-2 | `src/css/QUICK-REFERENCE.md` | 同步类名与变量名（含 `--radius-2xl`、`.card-glass` 核对）；顶部加注「实现为准，本速查非决策源」 |
| P0-3 | `docs/guides/css/CSS-ARCHITECTURE-README.md` | z-index 尺度改为紧凑运行期（30–90），或加注指向 `Z_INDEX_LAYERING_GUIDELINES.md` |
| P0-4 | VISUAL §2.2 / THEME §3.2 归属表 | 收敛为「Role 表 + 指向 `ownershipRoles.ts`」，删除重复维护的二级表（保留简表） |

### 验证

- 类名抽查：`grep` 文档中出现的组件类名，逐一确认存在于 `src/css/components/*.css`。
- 文档链接自检：相对链接目标存在。
- `git diff --check`。

---

## 2. P1 · 规范增量条款（G2）

按 Spec §5 的草案逐项合入，**纯文档变更**：

| # | 条款 | 落点 |
| --- | --- | --- |
| P1-1 | 排版角色表（§5.1） | `VISUAL_DESIGN_GUIDELINES.md` §5 新增「5.0 排版角色」 |
| P1-2 | 间距语义表（§5.2） | `VISUAL_DESIGN_GUIDELINES.md` §4 新增「4.4 间距语义」 |
| P1-3 | 断点表（§5.6） | `VISUAL_DESIGN_GUIDELINES.md` §4 新增「4.5 响应式」 |
| P1-4 | 图标体系（§5.3） | `VISUAL_DESIGN_GUIDELINES.md` §3.5 扩展 |
| P1-5 | 图表规范（§5.4） | 新建 `docs/CHART_GUIDELINES.md`；THEME §10 与 INDEX 挂链接 |
| P1-6 | Table 规范（§5.5） | `COMPONENT_GUIDELINES.md` 新增「数据表」节（或 §6.1） |
| P1-7 | 对比度/focus（§5.7） | `ACCESSIBILITY.md` §2 扩展 |
| P1-8 | 状态 token 对照（G2-8） | `COMPONENT_GUIDELINES.md` §5/§6 |
| P1-9 | 索引更新 | `docs/INDEX.md`「设计与主题（快捷）」加入 CHART_GUIDELINES 与新章节 |

### 验证

- 逐条走查：条款与既有章节不冲突（冲突裁决链不变）。
- `npm run css:audit`（确保新引用的 token 名真实存在，例如 `--spacing-*`、`--color-error`）。
- 文档内 token 名与 `design-tokens.ts` / `variables.css` 核对一致。

---

## 3. P2 · 契约对齐决策（G3）

| # | 决策点 | 建议方案 | 代码动作 |
| --- | --- | --- | --- |
| P2-1 | `.card` hover 位移 | 默认**无位移**：`.card:hover` 只改边框/阴影；新增 `.card--lift` 供 Entry 卡显式启用 | `cards.css` 默认 `--card-translate-hover: 0`；Entry 调用点显式加 `.card--lift`；同步 colorSchemes entry helpers |
| P2-2 | 按钮 hover/active | 明确契约：按钮 hover 允许 ≤1px lift；`active` 允许 pressed 反馈（scale 0.98）；面板/卡片不适用 | 不改 `buttons.css`；仅 COMPONENT §3.2 补一句边界条款（消除灰色地带） |

> 若 P2-1 改动引起总览/入口卡视觉回归，按 D4/colorSchemes 路线保留 Entry 位移（megaMenu 13 基线不变）。

### 验证

- `npm run ui:audit` + `npm run workbench-ui:audit` 绿。
- `npm run test:e2e:smoke`（核心路由不炸）。
- 浏览器抽查：工作台卡片 hover 无位移；模块总览入口卡仍有轻微上浮。

---

## 4. P3 · 验收闭环启动（G4）

| # | 动作 | 产出 | 验证 |
| --- | --- | --- | --- |
| P3-1 | D12 首 8 张人工截图（默认 vs minimal） | 截图 + MANIFEST（D12 §6 命名规范） | 人工 XO 记录（30 min 脚本） |
| P3-2 | 签收结论：`PASS / PASS with debt / FAIL` | 更新 XO 签字状态文档 | 状态板 Visual Yellow → Green（或登记债务） |
| P3-3 | a11y 评估（可选）：对核心路径跑一次 axe 扩展扫描 | 结果记录到 ACCESSIBILITY §5 或债务看板 | 不 fail-closed；仅登记 |
| P3-4 | （可选）文档↔类名 audit 脚本 | `scripts/quality/audit-doc-classnames.ts`（校验 README/QUICK-REFERENCE 类名存在性） | 纳入 `ci:quality`（或作为 local 命令） ✅ 已落地 |

### 验证

- `npm run test:visual:theme`（scaffold 24 屏 opt-in 不阻断）。
- XO 签字文档更新。

---

## 5. P4 · 回归保障（持续）

- 新页面/新组件 PR 时，视觉规范条款走查并入 PR 检查项（COMPONENT §11 追加 2 条：排版角色/间距语义使用；图表/表格遵守对应章节）。
- 每季度复跑 G1 类文档抽查，防止漂移复发。
- D6 长尾维持现状，按流量分批（不设 deadline）。

---

## 6. 完成定义（DoD）

当以下全部为真时，本计划可归档：

1. G1 三处漂移修复并抽查通过；文档类名 ↔ 实现类名一致。
2. G2 八项条款全部合入对应文档，INDEX 索引更新，无与既有章节冲突。
3. G3 决策已落地（`.card` 默认无位移 + 按钮边界条款），门禁绿。
4. G4 人工 XO 完成，状态板记录签收结论（Visual Green 或债务登记）。
5. `npm run ci:quality` 与 `npm run build` 通过；`git diff --check` 干净。

---

## 7. 依赖与风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| P2-1 改动 Entry 卡视觉 | 总览入口 hover 手感变化 | 保留 `colorSchemes` entry helpers 位移；仅默认 `.card` 改无位移；截图对比 |
| 文档条款与既有章节冲突 | 裁决链混乱 | 冲突时以 THEME 宪法 > VISUAL > COMPONENT 顺序裁决；增量不改既有结论 |
| XO/截图排期依赖人类 | 阻塞 G4 签收 | P0–P2 全部为文档/门禁类工作，可并行；G4 独立排期 |
| 图表/表格规范引用 token 不存在 | 条款无法执行 | 落笔前核对 `design-tokens.ts` / `variables.css` 实际 token |

---

## 8. 建议执行顺序（本周）

| 顺序 | 项 | 责任人 |
| --- | --- | --- |
| 1 | P0 文档漂移修复 | 前端 |
| 2 | P1 增量条款（先 VISUAL 三表，再 CHART/TABLE，最后 A11Y/INDEX） | 设计系统 Owner |
| 3 | P2 契约对齐（P2-1 需模块 Owner 确认调用点） | 前端 + 模块 Owner |
| 4 | P3 XO 截图签收 | 产品/技术 Lead |
| 5 | P4 audit 脚本与 PR 检查项 | 前端（可选） |
