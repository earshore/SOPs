# 剩余技术债收尾收紧方案（2026-08-15）

作者：Manus AI

## 1. 扫描基线

次序 13（slate structural 专项）收官（`278ec32d`）后，对 `docs/TECH_DEBT_BOARD.md` 八张卡片与全库门禁做一次端到端扫描，确认剩余债务的精确口径。当前门禁实测 `ci:quality` 全绿：semantic baseline 2128/2128、modules 0/0、shell 24/24、bridge gate 通过、settings-scale 41 files、token:override 审计零新增未登记冲突。

| 卡片      | 类别      | 现状                                                                                        | 剩余动作判定                                                          |
| --------- | --------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| TD-THM-01 | 主题      | 20 处 intentional override 已 allowlist 受控，identical 9→0 已清零                          | 维持登记，等待 workbench migration 时机按 D2 候选池消化（本次不消化） |
| TD-THM-02 | 主题      | Phase C 全部完成（0 剩余）                                                                  | 已关闭，无动作                                                        |
| TD-CMP-02 | 表单      | 体系 A/B 收官（structural 2,048 处 100% + 112 处 settings-control）；P3 复检窗口 2026-09-14 | 复检窗口到期为唯一剩余项，不属本次消除范围                            |
| TD-CMP-04 | Badge     | 两族已收敛，但 `wb-badge-*` 变体类与 `sop-status-badge` 合并仍为开放评估项                  | **本次执行合并统一**（唯一可动手的代码债）                            |
| TD-CMP-05 | 卡片/空态 | 过时误报已澄清                                                                              | 无动作                                                                |
| TD-CMP-06 | 审计      | 已完成                                                                                      | 无动作                                                                |
| TD-OPS-02 | 可观测    | Sentry 默认关闭（功能开关）                                                                 | 功能决策项，非代码债                                                  |
| TD-REL-01 | 发布      | 提交粒度过碎 review 成本高                                                                  | 流程项，非代码债                                                      |

## 2. 唯一可执行项：TD-CMP-04 badge 两族合并

扫描量化数据：`src/css/components/badges.css` 共 945 行，wb-badge 相关 110 行（含 `wb-badge-color/border/bg` 双文件引用 36 行、`wb-badge-icon-size` 5 行、`wb-badge-text-weight/size` 5 行、`wb-badge-animated` 2 行）；`.sop-status-badge` 主体 45 处消费（amz_hub/more/sops 三个 overview）。`wb-badge-*` 变体类消费 39 处：wb-badge-hub 13、safety 6、analytics 6、service 4、growth 4、supply 3、ai 2、pro 1。

两族语义不同：`wb-badge-*` 是工作中心**模块归属** badge（hub/safety/analytics/service/growth/supply/ai/pro），`sop-status-badge` 是 SOP**状态** badge（三端 overview）。强行合成单一 class 名会破坏现有 DOM 契约且收益不匹配工作量。本次采用**契约统一而非类名合并**：在 badges.css 建立单一 `.badge` 契约（共享尺寸/颜色/动画 token），两族 class 名保留（DOM 契约不变，复用 TD-THM-02 Phase B 模式），内部实现全部下沉到 `.badge` 契约，消除两族重复的 CSS 实现。

分批：批 1（CSS 契约建立 + amz_hub 6 template + app_center 5 template 迁移）；批 2（welcome-banner.css 变量链 12 处 + more/sops overview 收尾 + 旧类兼容清理）。每批独立验证：`ci:quality` + `build` + `smoke`。

## 3. 验收与发版纪律

每批满足：`ci:quality` 20 项全绿 + `npm run build` EXIT=0 + `smoke` 93 用例（31×3 浏览器，3 例历次一致的 NPI/chromium-only baseline 既有缺陷不视为回退）。全部完成后发布 rc.4（GitHub pre-release，3 产物归档 SHA256，手动执行，GitHub Actions 月限额已用尽）。
