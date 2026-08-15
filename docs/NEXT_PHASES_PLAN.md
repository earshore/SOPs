# 后续收紧规划（v3.1.1-rc.3 发布后）

**制定日期**：2026-08-15
**前置里程碑**：v3.1.1-rc.3 已发布（pre-release，3 产物归档 SHA256）；TD-CMP-02 批次 4B 三批收官（semantic baseline 4282→4087）；TD-THM-02 100% 清零闭环；执行纪律：每次收紧满足 `ci:quality` 全绿 + `build` 成功 + `smoke` 通过，看板与代码冲突时以代码实测为准。

## 一、当前看板状态快照

| 卡片 | 优先级 | 状态 |
| --- | --- | --- |
| TD-THM-02 | P1 | 100% 清零闭环 + gate 在线「只降不升」，**建议降级 P3** |
| TD-CMP-02 | P2 | 批次 1-3 + 4A（登记关闭）+ 4B（三批收官）完成；**体系 A settings-control 112 处/14 文件为本专项未完成主项** |
| TD-THM-01 | P2 | generated token 被手写 variables 覆盖 20 处，实测修正进行中 |
| TD-OPS-02 | P2 | Sentry 默认关（产品决策，保持） |
| TD-REL-01 | P3 | RC 前 notes 整理（CHANGELOG 已覆盖） |
| TD-CMP-04/05/06 | P2→P3 | 已收敛完成 |

## 二、后续次序规划（建议）

### 次序 10：TD-THM-02 降级 + 豁免复审（0.5 工作日）

TD-THM-02 已是全库最干净的项（modules 576→48 降 92%，清零批次一至四 + 收尾 A/B，per-file 双锁 + S8 边界压测收口）。建议：看板降级 P1→P3，附清零实绩；shell lane glass 色盘 24 处豁免按 `GUI014_GLASS_COLOR_PALETTE.md` 做一次复审登记（专项评审结论已立，复审确认无新增豁免即可冻结）。

### 次序 11：TD-CMP-02 体系 A 收敛（TD-THM-02 路线延续，4-6 个工作日）

TD-CMP-02 剩余主战场：settings-control 类 112 处/14 文件（11 个 settings section + systemSettings.html），体系 A 与共享 form-* 零交叉属实，`--settings-focus-ring` 自建 color-mix 7 处。路线参照 TD-THM-02 成熟模式：**大工程不做大迁，按文件族分批、每批单独验证提交**。

| 批 | 范围 | 预估 | 验证点 |
| --- | --- | --- | --- |
| 批 A：摸底与契约 | 112 处全量分类（text/bg/border/focus 族）+ settings 根 token 块登记（复用 settings-scale 限额内空间，当前 1196/1200） | 1 天 | gate 命中数零上升；settings-scale 限额守住 |
| 批 B：systemSettings 面板 | systemSettings.css 面板 token 化（已下沉 6 个 control token 的既有基础） | 1 天 | smoke 设置面板截图断言 |
| 批 C：11 个 settings section | 按模块分组 3-4 批（每批 2-3 文件） | 2-3 天 | 每批 ci:quality + build + smoke |
| 批 D：收尾与降级 | 残留登记 + 看板 TD-CMP-02 降级 P3 | 0.5 天 | 清零闭环 |

### 次序 12：TD-THM-01 覆盖冲突收敛（2-3 工作日）

generated token 被手写 variables 覆盖 20 处（D1 类），逐个裁决：覆盖方 token 化 or 生成方扩容。需先按文件族摸底裁决表，再分批迁移，模式同 TD-THM-02。

### 次序 13：slate 结构性灰调统一化（TD-SOP-NPI-02 候选，独立立项，3-4 工作日）

template/index.ts 约 180 处 slate 结构性灰调（hover 行、边框、分隔）留在 semantic lane baseline 内，属结构性灰调而非状态语义色，TD-CMP-02 4B 明确划界未覆盖。可复用 `-subtle` 族的 color-mix 模式建立 `--sops-neutral-*` 契约，按同样分批纪律推进。

## 三、门禁体系后续动作

| 动作 | 触发条件 |
| --- | --- |
| TD-THM-02 降级 P3 | 次序 10 完成后更新看板与路线 |
| TD-CMP-02 降级 P3 | 次序 11 体系 A 清零闭环后 |
| 自动化发布流水线回归 | GitHub Actions 月度限额恢复后（v3.1.1-rc.3 为手动发布） |
| semantic lane 扩容评审 | 次序 13 slate 专项立项时一并评审（当前只降不升锁 4087） |

## 四、风险与纪律

批次 4B 全程已验证「契约登记 → 分批迁移 → 每批独立验证提交」的模式在语义色 lane 上有效（-195 且零回退），后续次序 11/12/13 沿用同一纪律。settings-scale 1200 行限额是次序 11 的主要物理约束，批 A 摸底时需先行量化每文件的注释合并空间。
