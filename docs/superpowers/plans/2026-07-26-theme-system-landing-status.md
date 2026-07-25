# Theme System Landing Status Board

**日期**: 2026-07-26  
**范围**: `main` ahead of `sops/main` 主题收敛链（Phase 0 起）  
**角色**: Tech Lead / Release docs  
**诚实声明**: **Code gates 可运营；Visual / XO 未签收。** 不得宣称「主题体验 RC 已过」。

权威链：  
[企业审查路线图](../specs/2026-07-26-theme-system-enterprise-audit-and-roadmap.md) ·  
[作战手册](./2026-07-26-theme-system-team-operating-playbook.md) ·  
[体验矩阵](./2026-07-26-theme-system-experience-acceptance-matrix.md) ·  
[XO 签字状态](./2026-07-26-theme-system-xo-signoff-status.md) ·  
[Token 覆盖库存](./2026-07-26-token-override-inventory.md) ·  
[Workbench radius 决策](./2026-07-26-workbench-radius-decision.md)

---

## 1. Executive status

| 层 | 灯 | 一句话 |
| --- | --- | --- |
| **Code / 契约** | **Green** | Phase 0 门禁 + Phase 1 双轴 API + Settings 颜色模式 + 壳层 primary 语义化 + D1 allowlist 门 + workbench-radius 首批消费者已合入 |
| **Visual / XO** | **Yellow** | 人类 30 min 脚本 **未跑**；default↔minimal 可见体验与 dark 组合 **未签**；smoke 无全套色差断言 |
| **主题 RC 体验门** | **Open** | Tech Lead 可预签 code only；**不可**仅凭 code 关体验 RC |

**一句话**: 工程主线已过「可防回归」；体验主线仍卡在 **人工 XO + 壳层可见面收尾**。

---

## 2. Done by phase

| Phase | 目标 | 状态 | 已落地（证据） |
| --- | --- | --- | --- |
| **0** 治理与防回归 | 锁边界、不改视觉 | **Done (code)** | 作战手册、UX 矩阵、D7–D12 入宪、`theme:hardcode-baseline`、ThemeColors 收窄（D10 部分） |
| **1** Color Mode × Appearance | 修 D3/D11 运行时 | **Done (code)** / **Visual open** | `data-appearance` + `data-color-mode`；Settings 颜色模式 UI；壳层 nav/search/modal primary；unit + smoke 文档根属性 |
| **2** Token 事实源 | 修 D1/D2 结构 | **Partial** | 清点文档；192 条原子 identical 删除；allowlist **20**；`--workbench-radius` SSOT + 高流量消费者；**未**完成 `variables.semantic.css` 全拆 |
| **3** 壳层 Appearance 可见面 | 用户看得见换肤 | **Partial** | Settings primary chrome + form tokens/focus；壳层部分 CTA；**XO 未签「肉眼明确变化」** |
| **4** Ownership / colorSchemes | 修 D4/D7/D8 | **Not started** | Role 表 / entry vs workbench helper / `setModuleColor` 收敛未做 |
| **5** D6 业务页分期 | 业务 `blue-*` 降 | **Not started**（壳层基线已锁） | 业务 ~900+ 仍 Informational；壳层仅 megaMenu 13 |

图例：Done (code) = 契约/门禁/实现；Visual open = 浏览器签收缺失。

---

## 3. Gates live in CI

并入 `npm run ci:quality`（`prebuild` → security + quality）：

| 门 | npm script | 用途 |
| --- | --- | --- |
| CSS vars | `npm run css:audit` | 变量命名 / 结构 |
| 壳层 blue 基线 (D6) | `npm run theme:hardcode-baseline:gate` | shell `blue-*` **只降不升** |
| D1 原子覆盖 | `npm run token:override-audit:gate` | unallowlisted atomic **失败** |
| Theme 契约（PR 必跑） | `npx vitest run src/common/config/themeConfig.test.ts` | Appearance / Color Mode |
| UI 结构 | `npm run ui:audit`（含 `workbench-ui:audit`） | card/callout/workbench |
| Token 生成 | `npm run generate:tokens` | Phase 2+ 无手工污染 generated |
| 类型 / 全量 | `npm run type-check` · `npm run ci:all` | merge / 发版 |
| 发布烟雾 | `npm run test:e2e:smoke` | 路由 + Appearance/color-mode 文档根属性子集 |
| 报告（不阻断） | `theme:hardcode-baseline` · `token:override-audit` | 本地 diff 诊断 |

顺序（quality 内主题相关）: `css:audit` → `theme:hardcode-baseline:gate` → `token:override-audit:gate` → …

---

## 4. Metrics (now)

| 指标 | 值 | 备注 |
| --- | --- | --- |
| **Shell blue 硬编码** | **13** | **仅** `src/common/ui/megaMenu.ts`（模块玻璃色板 / Ownership，Informational） |
| **Workbench radius 已落区** | R0–R3 首批 | 语义 token + cards/panel 别名；analysis-widget、PromptLab/AI/MA、KH、PPC import/filter/table/settings、Scraper 面板、forms checkbox 等 → `var(--workbench-radius…)`；**entry/overview 卡未压** |
| **Atomic override allowlist** | **20** | radius 6 + shadow 6 + z-index 7 + easing 1；unallowlisted **0** |
| Handwritten `:root`（D1 首刀后） | ~267 | 去 192 identical 后；语义 + intentional 冲突保留 |
| XO 场景（签收文档） | ~12 automated / ~22 code / ~**38 manual** / visual **0 full Pass** | 见 XO status |
| 业务 `blue-*`（D6） | ~900+ 行级 | Phase 5；不阻塞 code Green |

---

## 5. Open debts D1–D12

| ID | 严重度 | 状态 | 剩余工作 |
| --- | --- | --- | --- |
| **D1** | P0 结构 | **Partial** | 20 条 intentional atomic 仍手写覆盖；远期 semantic 文件拆分 / 消费者迁 workbench 后再收 allowlist |
| **D2** | P1 语义 | **Partial** | SSOT 已有；长尾模块 `rounded-md/lg/xl` 误用与 R4 引用改名未清 |
| **D3** | P0 运行时 | **Code fixed** | 停双写 `data-theme` 兼容计划；e2e dark×minimal 共存加厚；**视觉签** |
| **D4** | P1 体验 | **Open** | `colorSchemes` entry vs workbench；去掉 workbench translate/scale |
| **D5** | P2 | **Partial** | focus soft 全站跟手；剩余蓝偏 focus 登记例外 |
| **D6** | P1 可见面 | **Shell locked / biz open** | 业务页分期降 `blue-*`；megaMenu 13 保持 Ownership 叙事 |
| **D7** | P1 | **Open** | ColorContext 双通道 → menu + class 单信；`setModuleColor` deprecate |
| **D8** | P1 | **Open** | Role → Palette 表；禁色名增生 |
| **D9** | P2 | **Open** | 局部 token 前缀生命周期（升全局 / 归档） |
| **D10** | P1 | **Partial** | 类型已收窄 primary 族；调用方误用状态色文档/审计可再紧 |
| **D11** | P2 | **Code fixed** | 与 D3 同源；CSS 选择器迁移期清理 |
| **D12** | P2 | **Open** | default/minimal 壳层截图矩阵进 CI / 稳定 visual 基线 |

---

## 6. Human XO — next action

**阻塞体验关闸的唯一最短路径**: 人类按 **30 分钟浏览器脚本**跑完并贴记录。

- 脚本与记录模板:  
  [`2026-07-26-theme-system-xo-signoff-status.md` §3](./2026-07-26-theme-system-xo-signoff-status.md#3-人类-xo-30-分钟手动浏览器脚本)
- 矩阵: [`experience-acceptance-matrix.md`](./2026-07-26-theme-system-experience-acceptance-matrix.md)
- 必测: X1 default↔minimal×3 · X2 ownership 抽检 · X5 dark×appearance · focus · 刷新持久化
- **不测**: 全站 D6 仍蓝（允许 Informational）
- 签收后: 填 XO 结论 `PASS / PASS with debt / FAIL`；Tech Lead 仅勾 code gates §4.1

---

## 7. Recommended next 3 agent waves

| # | Wave | 范围 | 验证 |
| --- | --- | --- | --- |
| **1** | **XO 闭环 + e2e 加厚** | 陪跑/整理 XO 记录；补 smoke：`minimal` 持久化、`wb-theme` 不随 Appearance 变、color-mode dark 与 appearance 共存 | 矩阵勾选 + e2e 绿 |
| **2** | **Phase 3 壳层可见面收尾** | Toast/focus soft (D5)、settings 残留 blue 债、header/按钮白名单扫尾；**不**扫业务模块 | default↔minimal 截图 + hardcode gate 不升 |
| **3** | **Phase 2 收口 / 开 Phase 4 文档** | workbench-radius 长尾消费者；allowlist 说明稳定；Role 表 + colorSchemes 拆分设计（实现可并行文档先行） | `token:override-audit:gate` + `workbench-ui:audit` + 审查 §3.4 |

**禁止本周扩 scope**: 一次清零 900+ blue、换字体、重写 Deep Chat terracotta、white-label 引擎。

---

## 8. Commit list (`sops/main` → `HEAD`)

```
947fa398 feat(theme): token gate in CI, more workbench radii, forms focus
f094399a feat(theme): settings form tokens, workbench radius consumers, allowlist
29714c27 feat(theme): settings primary chrome, workbench radius, e2e
d1a8c774 feat(theme): settings color mode, token audit, XO status
7e47a711 feat(theme): Phase 1 color-mode split and shell primary tokens
26623ec8 feat(theme): team playbook, UX matrix, and Phase 0 gates
```

前置（`sops/main` tip，主题审查起点）:

```
f8f925a8 docs(theme): enterprise audit and convergence roadmap
```

---

## 9. Doc map (quick)

| 文档 | 用途 |
| --- | --- |
| 本文件 | **站会/排期一眼板** |
| `theme-system-xo-signoff-status.md` | Code vs Visual 签收分层 + 30 min 脚本 |
| `theme-system-team-operating-playbook.md` | RACI / DoD / gate 命令 |
| `theme-system-experience-acceptance-matrix.md` | 路由 × preset 验收 |
| `token-override-inventory.md` | D1 数字与 allowlist |
| `workbench-radius-decision.md` | D2 SSOT 与迁移阶梯 |
| `theme-system-enterprise-audit-and-roadmap.md` | D1–D12 + Phase 0–5 权威 |

---

**维护**: 每合入主题 PR 或 XO 签收后更新 §1 灯色、§2 表、§4 指标、§8 SHA。  
**Non-goal**: 本文不替代 CHANGELOG；不自动关 RC。
