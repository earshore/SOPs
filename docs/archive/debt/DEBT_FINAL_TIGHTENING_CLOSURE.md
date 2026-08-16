# 剩余技术债收尾闭环验收报告（2026-08-15）

作者：Manus AI

## 1. 扫描基线与债务口径

次序 13（slate structural 专项）收官（`278ec32d`）后，对 `docs/TECH_DEBT_BOARD.md` 八张卡片与全库门禁进行端到端扫描。门禁实测 `ci:quality` 全绿：semantic baseline 2128/2128（双锁）、modules 0/0、shell 24/24、bridge gate 通过、settings-scale 41 files、token:override 审计零新增未登记冲突。

| 卡片                  | 类别      | 剩余动作判定                                                                                                                                       |
| --------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-THM-01             | 主题      | 20 处 intentional override 已 allowlist 受控，identical 9→0 已清零；仅待 workbench migration 时机按 D2 候选池消化（240/361），本次不消化，维持登记 |
| TD-THM-02             | 主题      | Phase C 全部完成，0 剩余，已关闭                                                                                                                   |
| TD-CMP-02             | 表单      | 体系 A/B 收官（structural 2,048 处 100% + 112 处 settings-control）；P3 复检窗口 2026-09-14，唯一剩余项为到期人工复检                              |
| TD-CMP-04             | Badge     | 开放评估项 `wb-badge-*` 与 `sop-status-badge` 合并，**本次执行统一契约**                                                                           |
| TD-CMP-05 / TD-CMP-06 | 卡片/审计 | 已澄清/已完成，无动作                                                                                                                              |
| TD-OPS-02             | 可观测    | Sentry 功能开关，非代码债                                                                                                                          |
| TD-REL-01             | 发布      | 提交粒度流程项，非代码债                                                                                                                           |

## 2. TD-CMP-04 批 1 实施实证

`src/css/components/badges.css` 新建 `.badge` 统一契约块（约 110 行）：主类（inline-flex / rounded-full / 字号字重 padding token / 200ms 三属性过渡 / min-height 1.375rem 控件尺寸契约）+ 8 模块归属变体（hub/growth/safety/service/supply/analytics/ai/pro，color-mix 软色盘，与既有 wb-badge 变体视觉逐档一致）+ 3 SOP 状态变体（active/draft/pending，直接引用 semantic 色 token，消除 sop-status 自设 token 双链冗余）+ 键盘焦点契约（wb-badge focus-visible 下沉）+ 深色翻转 8 规则（三选择器 `.dark` / `[data-color-mode-resolved='dark']` / `[data-theme='dark']` 保留兼容）。

HTML 侧 40 个 template 完成双类叠加（37 处 `wb-badge-*` + sops/more/amz_hub overview 共 45 处 `sop-status-*`，叠加后形如 `class="wb-badge wb-badge-hub badge badge--hub"`），DOM 类名契约保留、CSS 实现统一收敛。app_center overview 裸 `wb-badge`（workflow 标记，无变体类）甄别保留。迁移全程零视觉断言破坏。

| 维度 | 实证                                                                                                                               |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 门禁 | ci:quality 20 项全绿；semantic 2128/2128 双锁（叠加 .badge 类不触发语义色扫描回退）；settings-scale 41 files                       |
| 构建 | build EXIT=0（8.15s）                                                                                                              |
| 冒烟 | 93 用例（31×3 浏览器）90 通过；3 失败为历次一致的基线既有缺陷（NPI chromium-only pixel baseline ×2 + webkit L657 时序 ×1），非回归 |

## 3. 剩余路线（非本次消除范围）

TD-THM-01 20 处 allowlist 随 workbench migration 时机按 D2 候选池（only-handwritten 240 / only-generated 361）消化；TD-CMP-02 复检于 2026-09-14 人工复检归档；smoke 3 例 chromium-only baseline 既有缺陷归后续路线（baseline 浏览器维度拆分）。TD-OPS-02（Sentry 开关）与 TD-REL-01（提交粒度流程）为产品/流程决策项，不属代码债消除范畴。

## 4. 发版

本批随 rc.4 发布（GitHub pre-release，3 产物归档 SHA256，手动执行发版动作）。
