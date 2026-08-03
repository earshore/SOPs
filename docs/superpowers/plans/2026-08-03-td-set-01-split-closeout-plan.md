# TD-SET-01 收口推进方案（systemSettings 拆分可维护性）

**日期**: 2026-08-03
**目标**: 在零行为变化前提下，把 `systemSettings.*` 单体拆为可独立演进、可评审、有门禁的模块结构（看板 TD-SET-01 关闭）。
**上位依据**: `docs/superpowers/specs/2026-07-25-system-settings-enterprise-hardening-design.md` §5.4 P3（P3-1 按 section 拆分 / P3-2 SettingsDomain 门面 / P3-3 测试金字塔）
**关联锚点**: TD-TEST-01（已关闭，视觉基线入库即本次拆分的渲染等价硬锁）；TD-CMP-01（设置面板样式反孤岛，范围外）

---

## 1. 收口定义与范围

**收口** = 拆分后满足全部验收目标（见 §5），且拆分的收益可度量、可防回潮。

- **范围**：`src/components/settings/` 的 ts/html/css 拆分 + `SettingsDomain` 门面 + 契约测试 + 规模/依赖门禁固化。
- **非目标（明确不做，避免与 P1/P2 混做）**：
  - 新增功能、新保存语义、外观/搜索/预设施展（属 P1 体验/唯一写入口议题，非本次）。
  - 改为多路由设置站 / Alpine 多组件重写（Spec 明确排除）。
  - 主题视觉治理（属 TD-THM-01/02）。

---

## 2. 现状证据（2026-08-03 实测）

| 项 | 实测值 | 说明 |
| --- | --- | --- |
| `systemSettings.ts` | **3248 行** | `ReadAllLines` 实测（与看板 ~2.5k+ 相符） |
| `systemSettings.html` | **3499 行** | 单根 `x-data="settingsPanel"`，全部区块在同一模板内 |
| `systemSettings.css` | **2293 行** | 统一 `settings-*` 语义类，无明显分区注释头 |
| 已抽 `domain/` 模块 | **8 个** | `settingsDeepLink / Dirty / Health / NavScroll / Presets / Rollback / Search / localDataCopy` |
| ts 内部段落 | 4 段 | L1-158 导入 + L186-285 LLM 助手族 + L289-1179 类型与域逻辑 + L1180-3131 Alpine 组件逻辑 + L3132-3248 初始化和导出 |
| 外部引用面 | **2 处** | `main.ts`（`withSystemSettings` 门面，调用 panel 实例方法）；`viewLoader.ts`（`import.meta.glob(... '?raw')` 加载 html） |
| 死代码候选 | **8 个空 stub 导出** | 模块级 `saveProviderConfig / loadProviderConfig / fetchModels / toggleApiKeyVisibility / testConnection / saveProxyConfig / renderProxyInputUI / initSettingsListeners` 全部为空实现，需 Phase 0 grep 复核是否零引用 |
| 专项测试资产 | **10 files / 140 tests** | `npm run test:unit:settings` 实测全绿（v0.12-rc.5 基线）；另有 `tests/e2e/system-settings.spec.ts` |
| 渲染硬锁 | **32 张 linux 基线** | TD-TEST-01 已入 CI，视觉比对绿 ≈ 渲染等价证据 |

结论：TS 侧已具备八成拆分条件（`domain/` 8 模块 + 单引用面 + 测试齐备）；HTML 侧是最大风险点（单模板 3499 行）。

---

## 3. 目标形态（对齐 Spec §5.4 建议拆分形态）

```text
src/components/settings/
  systemSettings.ts              # 注册 + open/close + 组装（厚度 ≤ 900 行）
  systemSettings.html            # 壳（抽屉骨架 + section 挂载点）
  systemSettings.css             # 壳层样式（≤ 1200 行）
  domain/                        # 已有 8 模块 + 新增 SettingsDomain 门面
    settingsDeepLink.ts / settingsDirty.ts / ...
  sections/
    llmSection.ts / .html / .css        # AI 模型与连接
    toolStrategySection.ts / ...
    networkSection.ts / ...
    dataSection.ts / ...
    appearanceSection.ts / ...
    diagnosticsSection.ts / ...
  loader.ts                      # html raw 片段按序组装（复用 viewLoader ?raw 机制）
```

约束：
- 对外 Alpine 契约不变：`x-data="settingsPanel"`、`initAlpineSettings / openSettings / closeSettings` 签名、panel 数据键集合均与拆分前一致。
- `sections/*`、`domain/*` 只允许被组合层引用，彼此不互引。

---

## 4. 分阶段收口路线（每阶段独立 PR、独立 Gate 全绿）

### Phase 0 — 基线锁定与契约（1 PR）
- 新增 `tests/unit/systemSettingsContract.test.ts`：锁定对外 API 签名 + `settingsPanel` 数据键集合（拆分前后比对）。
- 修正/对齐 `test:unit:settings` 脚本路径语义并记录 10/140 基线。
- grep 复核 8 个空 stub 引用情况并记录证据。
- 产出基线表（行数/覆盖率/专项测试耗时）写入 PR 描述。
- **验收**：AC-1..4。

### Phase 1 — TS 机械拆分（2–3 PR，纯搬移零行为变化）
- 按 Spec 拆 6 个 `sections/*.ts`；将 L186-285 助手族、L289-1179 域逻辑、L1180-3131 组件逻辑按 section 归位；`systemSettings.ts` 只留 import/类型聚合/组合/导出。
- 每 PR ≤ 400 行 diff，审查重点是搬运等价性。
- **验收**：AC-1..5、AC-10（中间 PR 以 AC-1..4 为主）。

### Phase 2 — HTML/CSS 拆分（1–2 PR）
- 把 3499 行模板按 `sections/*.html` 拆段，经 `loader.ts`（`import.meta.glob(..., { query: '?raw' })`）按固定顺序组装为单一字符串，等值还原原模板；CSS 按 section 分文件、同一构建入口合并。
- **验收**：AC-1..4 + **视觉基线比对绿（TD-TEST-01 硬锁）**。

### Phase 3 — SettingsDomain 门面（1–2 PR）
- 提供 `load / savePartition / diff / validate / snapshot` 5 个纯函数（基于既有 `domain/` 8 模块），UI 不再直写全局策略存储。
- 单测补齐（5 个方法各 ≥1 用例）。
- **验收**：AC-6、AC-9。

### Phase 4 — 清理与门禁固化（1 PR）
- 删 8 个空 stub；新增 `settings-scale` audit（行数 + 依赖方向 + section 引用校验）进 `ci:quality`；确认 `circular:check` 绿。
- 看板 TD-SET-01 → Closed（带上 commit + Gate run）。
- **验收**：AC-7、AC-8、AC-10。

---

## 5. 验收目标（AC，全部可执行可判）

| ID | 验收目标 | 判定方式 |
| --- | --- | --- |
| **AC-1** | 行为不变束缚全部生效 | `npm run test:coverage` 四阈值 ≥ 拆分基线（基线以 Phase 0 记录为准；现行门禁 82/80/82/65 只升不降） |
| **AC-2** | 专项单测全绿 | `npm run test:unit:settings`（基线 10 files/140 tests） |
| **AC-3** | e2e 无回归 | `npm run test:e2e:settings` + `npm run test:e2e:smoke` 绿 |
| **AC-4** | Alpine 契约不变 | `systemSettingsContract.test.ts` 绿，且 `x-data="settingsPanel"` / 对外 3 API 签名 / panel 数据键集合与拆分前一致 |
| **AC-5** | 文件规模达标 | `systemSettings.ts` ≤ 900 行；`html` ≤ 1200；`css` ≤ 1200；单个 `sections/*` ≤ 600 行 |
| **AC-6** | 依赖方向受控 | 依赖单向 `sections/ → domain/`；`sections/`、`domain/` 不被外部直接 import；`npm run circular:check` 绿 |
| **AC-7** | 门禁已固化 | `settings-scale` audit 进 `ci:quality`，CI `build` job 绿 |
| **AC-8** | 死代码清零 | 8 个空 stub 已删；全仓 grep 零引用；删除后契约测试绿 |
| **AC-9** | SettingsDomain 生效 | 5 个门面方法均有单测；UI 直接写存储路径调用点归零（grep 门禁） |
| **AC-10** | 交付黑盒验证 | `Quality Gate` 9/9 jobs 绿（含 visual/performance）；`TECH_DEBT_BOARD.md` TD-SET-01 → Closed（日期+commit+run） |

> AC-5 若某文件无法达标，需在 PR 中给出正当理由并给出时间窗（不允许无理由带病合并）。

---

## 6. 风险与护栏

| 风险 | 护栏 |
| --- | --- |
| 拆分引入行为回归 | AC-1..4 多重锁：契约、专项单测、coverage ratchet、e2e |
| HTML 拆分破坏渲染 | 视觉基线比对绿（TD-TEST-01 已入 CI）作为渲染等价硬证 |
| 拆分导致覆盖率缺口 | AC-1 只升不降（Phase 0 记录基线，逐阶段比对） |
| 依赖方向回潮 | AC-7 audit 进 CI，检测即红 |
| 与 P1/P2 混做 | 非目标明确列出，Phase 3 只做门面不做新语义 |

---

## 7. 工作量与节奏建议

- **总 PR 数**：6–8 个；每 PR 独立绿（Gate 9/9），可单独回滚。
- **顺序**：Phase 0 → 1 → 2 → 3 → 4（Phase 3 与 Phase 2 可并行但需各自全绿）。
- **建议每周 1–2 个 PR**，Phase 0 先行以锁定契约，避免后续大重构漂移。
- 本方案完成后，更新 `docs/superpowers/specs/2026-07-25-*` §5.4 地址引出本收口记录，保证单真相。