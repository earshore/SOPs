# GUI014 — Glass 毛玻璃卡片色盘（megaMenu）豁免规范

- **状态**：豁免登记（Exempt，评审决议保留）
- **关联技术债卡**：TD-THM-02（blue/indigo 硬编码收敛）
- **门禁口径**：`theme:hardcode-baseline:gate`（shell lane，blue-only，基线 13）
- **创建日期**：2026-08-14（TD-THM-02 批次 B 专项评审落地）
- **维护责任人**：前端 UI（导航体系）

## 1. 豁免对象

`src/common/ui/megaMenu.ts` 第 56–244 行的 `GLASS_COLORS` 常量。这是一个 **18 族对称毛玻璃色盘**（blue / sky / indigo / violet / purple / fuchsia / emerald / teal / green / lime / amber / orange / red / rose / pink / cyan / slate 及衍生），每族定义 9 个渲染键，供导航 mega menu 的毛玻璃卡片（glass card v3.2）使用：

| 键 | 用途 | blue 族示例（L57–66） |
|---|---|---|
| `glow` | 卡片顶部光晕渐变 | `from-blue-200/40 via-indigo-100/20 to-transparent` |
| `iconBg` | 图标渐变底 | `bg-gradient-to-br from-blue-500 to-indigo-600` |
| `iconShadow` | 图标投影色 | `shadow-blue-500/30` |
| `versionBg` | 版本标签淡底 | `bg-blue-500/10` |
| `versionText` | 版本标签文字 | `text-blue-600` |
| `tagBg` | 标签极淡底 | `bg-blue-500/8` |
| `tagText` | 标签文字（80%） | `text-blue-600/80` |
| `defaultBorder` | 细线边框 | `border-blue-200/40` |
| `hoverBg` | hover 高亮底 | `group-hover/card:bg-blue-50/60` |

gate 当前统计的 13 处 = blue 族 11 处 blue 类 + 2 处 indigo 类（`via-indigo-100/20`、`to-indigo-600`，为 blue 族渐变契约的固有组成部分）。若按 blue+indigo 全口径，blue 族单族合计 24 处、全 18 族跨族色合计 60 处以上。

## 2. 评审决议与保留理由

该色盘不属于主题硬编码债务，而是**导航体系的 design system 级装饰色盘**，保留理由如下。

**（1）跨族对称设计，非孤立硬编码。** 每族 9 键遵循严格的跨族对称契约（见 §3），blue 族只是 18 族之一且是 `getGlassColor()` 的默认 fallback。对 blue 族做语义 token 化意味着要同步定义 48 条以上的新语义渐变/投影 token，并把其余 60 处跨族代码一并迁入——收益远低于成本，且破坏"新增色族只改色盘一处"的扩展性。

**（2）深色模式兼容已由基础设施自动保障。** `utility-bridge.generated.css`（`npm run generate:tokens` 自动生成）已为 blue 族关键类生成深色翻转规则（blue-400×9、indigo-400×8、blue/indigo-600×4、blue/indigo-200×2 等），glass 卡片在 `resolved-dark` 下自动获得与 Theme token 一致的表面/文字/边框，浅色模式不受影响。**门禁保障链**：`theme:bridge:gate` 强制桥接层与源码基线同步，色盘类无法在 dark 下静默漂移。

**（3）装饰属性不在换肤范围内。** glow 渐变、icon 投影、hover 高亮属于品牌装饰层（Brand Decoration），与 sops/amz_hub 等模块"内容表面换肤"（Content Surface）的目标域不同。主题 token 体系（--module-accent-*）承载的是内容语义色，不承担装饰渐变的动态映射。

**（4）无新增风险暴露面。** 该文件为 TS 字符串渲染器，色盘定义集中在一处常量；gate 已将当前存量登记为基线（shell lane 13，per-file 校验锁死 `src/common/ui/megaMenu.ts`），任何新增 blue/indigo 类仍会被 `ci:quality` 拦截并触发逐行评审。

## 3. 色盘设计契约（修改时必须遵守）

1. **族内对称**：同一族 9 键必须全部使用同一主色 `{x}`，`glow` 的过渡中色固定为 `blue-100/20`（blue 族为 `indigo-100/20`），`iconBg` 终止色固定为 `blue-600`（blue 族为 `indigo-600`，indigo 族为 `violet-600`，灰调族为 `slate-600`）。
2. **跨族对称**：新增或删除色族时，必须同步补齐/移除全部 18 族，不得只改一族。
3. **键集稳定**：新增键（如新 hover 态）必须同时写入全部 18 族并同步到 `renderCard` 与桥接生成脚本。
4. **dark 验证**：修改任何族后，必须在深色模式下实测卡片（glow / hoverBg / tagText 三类最易在暗面上翻车），并确认 `npm run generate:tokens` 后 `theme:bridge:gate` 保持通过。
5. **新增类登记**：若新增的类名未落在当前 bridge 覆盖集（blue-400/600/200、indigo-400/600/200、blue/indigo-50/100/500），需先扩展 `scripts/build/generate-utility-bridge.ts` 的生成规则。

## 4. 维护规则

色盘本体禁止拆分到其他文件（保持 18 族集中可读）；色盘消费方（`renderCard`）已通过 `g.xxx` 间接引用，禁止在渲染模板中直接写硬编码色类；`focus-visible` 焦点环已语义化为 `ring-[var(--color-focus-ring,var(--color-primary))]`，属于 gate 内语义用法，不受本豁免约束；如未来决定做装饰层 token 化，应整体重命名 `GLASS_COLORS` 为语义键（如 `accent-glow`、`accent-iconBg`）并在 variables.css 定义 48+ 条渐变 token，届时本豁免方可关闭。

## 5. 豁免关闭条件

出现以下任一情况时重新评审：导航体系引入换肤能力（多主题品牌色切换）；18 族中的某一族被删除导致契约破坏；gateway 决定将装饰层纳入 token 体系。

---

*本文档由 TD-THM-02 Phase B→C 收尾阶段的专项评审产生，与 `docs/THM02_FINAL_SUMMARY.md` 第 6 章（下一阶段清零计划）互为索引。*
