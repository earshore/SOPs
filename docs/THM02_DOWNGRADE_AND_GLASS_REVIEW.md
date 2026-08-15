# TD-THM-02 降级决议与 glass 豁免复审（次序 10）

**执行日期**：2026-08-15
**执行提交**：待提交
**关联**：`NEXT_PHASES_PLAN.md` 次序 10；`GUI014_GLASS_COLOR_PALETTE.md`；`THM02_FINAL_SUMMARY.md`

## 1. TD-THM-02 清零闭环实绩

TD-THM-02（Tailwind `blue-/indigo-*` 硬编码迁移，D6）自 2026-08-14 Phase B/C 完成以来维持全库清零闭环，实绩如下。

| 口径 | 清零前基线 | 当前 | 变化 |
| --- | --- | --- | --- |
| modules lane（blue+indigo 双族，sops/app_center/amz_hub/more/other） | 334 | 65（modules gate 独立口径）→ 全模块 0 | 清零 |
| shell lane（megaMenu glass 色盘） | 13（blue-only） | 24（blue+indigo 双族收口口径，`d79372a3`） | 豁免登记冻结 |
| semantic lane（sops 五族） | 4282（`764f31e8` 扩容） | 4087（批次 4B 收官 `920ae462`） | -195 |

门禁保障链：`theme:hardcode-baseline:gate`（total 只降不升 + per-file 逐文件锁值）+ `theme:hardcode-baseline:modules:gate`（modules lane 独立基线）+ `theme:bridge:gate`（dark 翻转桥接层同步）。注入测试实证（注入 `bg-slate-900` 即报 +1 fail）验证 gate 防御有效。全库兜底核查（`340053d1`）已排除 arbitrary hex 回退值 / Chart.js / devtools 三类登记保留项的漏报可能。

**决议**：TD-THM-02 降级 **P1 → P3**（Closed-Verified）。剩余事项全部为登记保留：glass 豁免 24 处（GUI014）、arbitrary hex 回退值 / Chart.js / devtools 三类。

## 2. Glass 豁免复审（2026-08-15 复审）

按 `GUI014_GLASS_COLOR_PALETTE.md` 规范对 `src/common/ui/megaMenu.ts` 的 `GLASS_COLORS` 色盘常量做复审。

**存量核验**：当前 blue 族 22 处 + indigo 族 2 处 = 24 处，与 shell lane 登记基线（24/24）逐键一致，无新增、无漏报。`npm run theme:hardcode-baseline:gate` 输出 `shell: 24/24` 稳定。

**保留理由复核**（与原评审一致，全部成立）：

1. 18 族对称色盘，跨族扩展性依赖「新增色族只改色盘一处」，逐族 token 化收益低于成本；
2. dark 翻转已由 `utility-bridge.generated.css`（`generate:tokens` 自动生成）保障，`theme:bridge:gate` 强制同步，无法静默漂移；
3. 属 Brand Decoration 装饰域，不在 Content Surface 换肤范围内；
4. 集中式常量 + gate per-file 锁死，新增暴露面为零。

**复审结论**：豁免维持，规范文档有效。下次复审建议时机：workbench migration 触及导航体系时（届时可将装饰域色盘迁移至 workbench design token）。

## 3. 后续动作

- 看板 TD-THM-02 行：追加降级 P3 决议与本复审结论
- 路线文档：次序 10 标记完成，TD-THM-02 降级 P3
- TD-THM-02 相关 gate 保留在线（只降不升不产生维护成本，继续作为防线）
