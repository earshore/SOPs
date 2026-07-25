# 主题系统落地 — 开发团队作战手册

**日期**: 2026-07-26  
**状态**: 执行文档 · 给人 + Agent 共用  
**产品形态**: 内部亚马逊运营工作台（Vite + TS 静态 BYOK），非营销 SaaS 换肤  
**权威链**: `THEME_SYSTEM_GUIDELINES` > 审查路线图 > 本手册 > `VISUAL_DESIGN_GUIDELINES` > CSS 速查  

| 关联文档 | 路径 |
| --- | --- |
| 审查与路线（Phases 0–5 SSOT） | `docs/superpowers/specs/2026-07-26-theme-system-enterprise-audit-and-roadmap.md` |
| 主题宪法 | `docs/THEME_SYSTEM_GUIDELINES.md` |
| 视觉细则 | `docs/VISUAL_DESIGN_GUIDELINES.md` |
| A2 + minimal 设计（已落地基线） | `docs/superpowers/specs/2026-07-25-theme-architecture-enterprise-design.md` |
| CI 门禁 | `docs/CI-QUALITY-GATES.md` |
| 发布策略 | `docs/RELEASE_POLICY.md` |

---

## 1. Mission & non-goals

### 1.1 Mission

在 **不引入多租户 / white-label 引擎** 的前提下，把主题系统从「架构雏形 + 多事实源并行」收敛到 **可运营、可审计、可回滚** 的企业级状态：

1. **拆清三轴**：Color Mode（M）× Appearance（A）× Ownership（B）  
2. **收口 token 事实源**（D1/D2）：原子只写 `design-tokens.ts`  
3. **门禁阻止新散落**（D6 基线只降不升、禁止第二套主题 API）  
4. **壳层可见面先到位**（用户切换 `default` ↔ `minimal` 能明确感知）  
5. **归属永不被 Appearance 覆盖**（A2 硬契约）  
6. **可发 RC**：门禁绿 + 体验官签字 + CHANGELOG 完整  

成功画像对齐审查 §7：单写多读、模式可组合、用户可感知、归属稳定、债务可度量、文档无冲突、门禁绿。

### 1.2 Non-goals（全程禁止扩 scope）

| 禁止项 | 理由 |
| --- | --- |
| 换字体栈 / 展示字体（Calistoga 等） | 作业台非营销站 |
| 全站营销换肤动画、粒子、彩虹 glow | 与工作台底线冲突 |
| 一次 PR 清零 900+ `blue-*` | Phase 5 细水长流 |
| 重写 Deep Chat terracotta 业务色 | 独立需求另开 |
| 多品牌 white-label / 多租户主题引擎 | 非本产品形态 |
| 在业务页「发明」新 `wb-theme-*` 色名 | 必须走 Role 表 + 宪法 |
| 反向从页面发明 token 语义 | 先宪法/门禁，再 DOM/token，最后硬编码 |

### 1.3 Phase 地图（执行边界）

| Phase | 名称 | 预估 | 修债务 | 并行敏感 |
| --- | --- | --- | --- | --- |
| **0** | 治理与防回归 | 0.5–1 天 | 登记 D7–D12、类型收窄、基线/门禁 | 可单独完成，阻塞后续 PR 质量 |
| **1** | 拆 Color Mode 与 Appearance | 1–2 天 | D3/D11 | 与 Phase 2 **串行优先**（属性契约先稳） |
| **2** | Token 事实源收口 | 2–4 天 | D1/D2 | 与 Phase 3 部分并行（壳层不依赖色阶迁完） |
| **3** | 壳层 Appearance 可见面 | 2–3 天 | D5 + 壳层 D6 | 依赖 Phase 0 基线；最好 Phase 1 后 |
| **4** | Ownership / colorSchemes | 3–5 天 | D4/D7/D8 | 可与 Phase 3 后半、Phase 5 前序并行 |
| **5** | 业务页 D6 分期 | 持续 | D6 长尾 | 按模块泳道并行；永不阻塞 RC 主线 |

---

## 2. Org chart（精益编制）

支持两种编制：**1 人多角** 或 **4–7 人**。下表 headcount 为「逻辑席位」；单人时用括号内缩写自兼。

| 角色 | HC | 核心职责 | 主责路径 / 产出 |
| --- | --- | --- | --- |
| **Theme Architect / Tech Lead**（TA） | 0.5–1 | 三轴契约、宪法修订、范围裁决、PR 架构评审 | `THEME_SYSTEM_GUIDELINES.md`、审查路线、RACI 仲裁 |
| **Token Platform Dev**（TP） | 0.5–1 | `design-tokens.ts`、生成管线、`variables.*`、generate 干净校验 | `design-tokens.ts`、`variables.generated.css`、Phase 2 |
| **Shell UI Dev**（SU） | 0.5–1 | 全局壳层：button/header/settings/toast/focus | `src/css/components/*`、settings Appearance UI、Phase 3 |
| **Module Ownership Dev**（MO） | 0.5–1 | Role 表、`wb-theme-*`、`colorSchemes` 拆分、menu/ColorContext | `menuConfig`、welcome-banner、`colorSchemes.ts`、Phase 4/5 |
| **QA / Automation**（QA） | 0.25–0.5 | 单测/e2e/audit 脚本、CI 脚本、基线门 | `themeConfig.test.ts`、audit scripts、smoke |
| **Visual Regression owner**（VR） | 0.25–0.5 | preset × 壳层截图矩阵、snapshot 更新纪律 | `tests/visual`、D12 清单 |
| **Experience Officer / 体验官**（XO） | 0.25 | 真实运营场景签字；否决「好看但难用」 | 场景清单 §8、Phase Done 人工闸 |
| **Release owner**（RO） | 0.25 | version/CHANGELOG/tag/RC 通道、回滚说明 | `RELEASE_POLICY.md`、RC/GA tag |

### 2.1 1 人模式（推荐起步）

| 人 | 兼角顺序 |
| --- | --- |
| Dev A | TA + TP + SU（架构/token/壳层同一人，避免契约分叉） |
| 可选 Dev B | MO + Phase 5 模块迁移 |
| 任意维护者轮值 | QA + VR（命令清单跑通即可） |
| 运营同事 / 自己戴帽 | XO |
| 仓库维护者 | RO |

### 2.2 4–7 人拆分建议

- **4 人**: TA/TP 合一 · SU · MO · QA/VR/RO 合一；XO 外挂 2h/周  
- **6–7 人**: 表中角色各 1 席；VR 与 QA 可分席  

**硬规则**: 宪法变更与 `ThemeManager` 契约变更 **必须**有 TA 审批；XO 在 Phase 1/3/RC 有 **否决权**（仅体验维度，不改架构拍板权）。

---

## 3. RACI

图例：R=执行 · A=拍板 · C=必协商 · I=知会  

| 工作项 | TA | TP | SU | MO | QA | VR | XO | RO |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Constitution 变更**（`THEME_SYSTEM_GUIDELINES` / 审查条款合入） | **A/R** | C | C | C | I | I | C | I |
| **ThemeManager / Appearance API** | **A** | C | **R** | C | C | I | I | I |
| **Token generate**（`design-tokens` → generated / CI clean） | A | **R** | C | I | C | I | I | I |
| **Shell migration**（button/header/focus/settings） | A | C | **R** | I | C | C | C | I |
| **Ownership / wb-theme / Role 表** | A | I | C | **R** | C | C | C | I |
| **blue-\* 业务页迁移（D6）** | A | I | C | **R** | C | C | C | I |
| **Dark mode 拆分**（`data-appearance` + `data-color-mode`） | **A** | C | **R** | C | **R** | C | C | I |
| **RC release**（主题相关里程碑） | C | I | I | I | **R** | C | **C**（签字） | **A/R** |

补充：

- `VISUAL_DESIGN_GUIDELINES` 冲突消解：TA=A，SU/MO=R（各改自己章节）。  
- 新增 audit 脚本：QA=R，TA=A。  
- Snapshot 更新：VR=R，XO 抽检关键帧，禁止「全量 `--update-snapshots` 蒙混」。  

---

## 4. Cadence（节奏）

### 4.1 Standup（每日，≤15 min）

固定三问（主题泳道专用，可并入全员 standup）：

1. 昨日合入哪条 **Phase / 债务 ID**？  
2. 今日是否触碰 **宪法 / ThemeManager / generated CSS**？（是 → 拉 TA）  
3. 门禁红了吗？红则 **先绿再扩**  

### 4.2 Design review（架构/视觉）

| 触发 | 参加者 | 产出 |
| --- | --- | --- |
| 改三轴 DOM 属性、存储 key、事件 payload | TA + SU + QA | ADR 短记或宪法 diff |
| 新增 Appearance preset / Role | TA + XO + SU/MO | 色板表 + 影响面诚实边界 |
| colorSchemes / workbench hover 策略 | TA + MO + XO | entry vs workbench 边界确认 |
| 任意「全站变色」承诺 | TA + XO | **拒绝或收窄到 token 壳层** |

**频率**: Phase 1 期间每变更必审；Phase 2+ 按 PR 触发，不必例会。

### 4.3 Code review 规则

**阻断（must fix）**

- [ ] 第二套主题 API / 恢复 `themes.ts`  
- [ ] `applyTheme` 路径写 `ColorContext.setModuleColor`  
- [ ] `variables.css` **新增**与 generated 同名基础色阶/字号（扩大 D1）  
- [ ] 工作台面板 `translateY` / `scale` hover  
- [ ] 新局部 token 前缀未登记宪法 §6.1  
- [ ] 壳层新增 `bg-blue-*` / `text-blue-*` 且无例外说明  
- [ ] 手改 `variables.generated.css`  

**应协商（should discuss）**

- Appearance 类型字段增删（`ThemeColors` 收窄）  
- Role 表新增一行  
- 视觉 snapshot 大批量更新  

**评审 SLA**: 主题契约 PR ≤1 工作日；纯业务 `blue-*` 替换 ≤2 工作日。

### 4.4 Freeze 规则

| 冻结类型 | 何时 | 允许 | 禁止 |
| --- | --- | --- | --- |
| **Phase freeze** | 该 Phase DoD 清单完成并门禁绿 | 文档勘误、测试补强 | 新债务扩 scope |
| **RC feature freeze** | RO 宣布主题 RC 候选 | bugfix、文档、基线下降 | 新 preset、新 Role、大迁移 |
| **Token freeze** | Phase 2 合并后 24h 观察窗 | 热修对比度 | 批量改色阶 |
| **Snapshot freeze** | RC 前 | 单帧 justified update | 无 diff 说明的全量 update |

对齐 `RELEASE_POLICY`：RC 为 Pre-release；**仅 GA 可 Latest**；禁止 GA 后再发同号 RC。

---

## 5. Definition of Ready / Done（Phase 0–5）

### Phase 0 — 治理与防回归

**Ready**

- [ ] 审查路线图已确认；团队读过 A2 影响面收窄条款  
- [ ] 已知无并行大改 `themeConfig` 的他人分支  

**Done**

- [ ] D7–D12 写入 `THEME_SYSTEM_GUIDELINES` §8（与审查一致）  
- [ ] `ThemeColors` / 注释收窄：状态色不可被 Appearance 切换写清  
- [ ] 禁止 `from '@/common/config/themes'`（lint 或 script）  
- [ ] 壳层 `blue-*` **基线数字**落盘（脚本或文档表）  
- [ ] default vs minimal **壳层截图清单**（D12 准备，可先人工）  
- [ ] `themeConfig` 单测 + `css:audit` + build 绿  

### Phase 1 — Color Mode × Appearance 拆分

**Ready**

- [ ] Phase 0 Done  
- [ ] 兼容策略书面确认：旧 `data-theme` 读路径、存储 `app-theme` / 新 `app-color-mode`  
- [ ] CSS 双选择器过渡方案（`[data-color-mode='dark']` + 临时兼容）评审通过  

**Done**

- [ ] DOM：`data-appearance` + `data-color-mode`；Appearance 不再占用 dark 槽  
- [ ] `ThemeManager.applyTheme` 只写 appearance；不碰 color-mode  
- [ ] Dark 独立 API/设置项；存储分离  
- [ ] **minimal + dark 可共存**（L3 验收）  
- [ ] 切换 Appearance 后模块 banner / 侧栏归属不变  
- [ ] 单测 + smoke；宪法 §D3 描述更新为「已拆分」或兼容期状态  
- [ ] XO 场景 §8.1–8.2 通过  

### Phase 2 — Token 事实源收口

**Ready**

- [ ] Phase 1 主合并（或明确「仅迁语义、不动 dark 选择器」的隔离计划）  
- [ ] generated vs 手写同名变量 **diff 清单**已出  

**Done**

- [ ] 色阶/字号/基础 spacing 以 `design-tokens.ts` 为准迁回  
- [ ] `variables.css` 仅 semantic + dark/color-mode + 迁移；目标拆 `variables.semantic.css`  
- [ ] 工作台圆角语义对齐（`workbench-radius = 8px` 或等价显式 token）  
- [ ] CI：`generate:tokens` 后 generated **无手工 dirty**  
- [ ] `css:audit` 绿；核心页肉眼/截图无回归  

### Phase 3 — 壳层 Appearance 可见面

**Ready**

- [ ] Phase 0 基线存在；优先 Phase 1 已合（避免 dark 属性再撕一次）  
- [ ] 迁移白名单：`buttons` / `header*` / settings CTA / toast+focus soft  

**Done**

- [ ] default ↔ minimal：主按钮、链接、focus **肉眼明确变化**  
- [ ] D5 focus soft 跟手或登记剩余例外  
- [ ] **未**扫业务模块大表  
- [ ] 视觉回归相关帧更新且说明  
- [ ] smoke 不退化；XO 长会话场景通过  

### Phase 4 — Ownership / colorSchemes

**Ready**

- [ ] Role 表（审查 §3.4）获 TA 确认  
- [ ] Playground「配置 orange / 实现 terracotta」例外保留策略写清  

**Done**

- [ ] Role → Palette 表落地；新页面只选 role  
- [ ] `colorSchemes` 拆 entry vs workbench；workbench 路径无 translate/scale  
- [ ] `setModuleColor` deprecated 或删除无用写入方  
- [ ] Appearance 切换仍不改归属（回归）  
- [ ] ui:audit + 入口/工作台抽样 XO 通过  

### Phase 5 — D6 业务页分期（持续）

**Ready（每一期）**

- [ ] 本期模块名单 + `blue-*` 基线计数  
- [ ] 不破坏 Ownership 的迁移策略（primary CTA 语义化 vs 保留模块前缀）  

**Done（每一期）**

- [ ] 该模块 `blue-*` 计数下降（有数字）  
- [ ] 截图/清单 + 归属不变  
- [ ] 模块冒烟路径可用  
- [ ] **不**要求全站清零才算主题系统企业级完成（主线 DoD 以审查 §7 为准）  

### 全局企业级 Done（全部 Phase 主线）

对齐审查 §7 七条；主题 RC 另需 RO 通道 + XO 签字。

---

## 6. Workstreams & swimlanes（并行）

```text
        Week 建议轴（可压缩）
        ┌──────── Phase 0 ────────┐
TA/QA:  │ 宪法/债务/门禁/基线     │
        └───────────┬─────────────┘
                    ▼
        ┌──────── Phase 1 ────────┐
SU/QA:  │ data-appearance/mode    │  ← 尽量独占 ThemeManager
        └───────────┬─────────────┘
           ┌────────┴────────┐
           ▼                 ▼
   ┌── Phase 2 ──┐   ┌── Phase 3 ──┐     （Phase 3 可在 P1 后启动；
   │ TP token    │   │ SU 壳层     │      与 P2 中后段并行）
   └──────┬──────┘   └──────┬──────┘
          └────────┬────────┘
                   ▼
           ┌── Phase 4 ──┐
           │ MO ownership│  ← 可与 P3 收尾、P5 前序重叠
           └──────┬──────┘
                  ▼
           ┌── Phase 5 ──┐  持续多泳道
           │ 模块并行迁移 │
           └─────────────┘
```

| 可并行 | 条件 |
| --- | --- |
| Phase 0 文档 vs 基线脚本 | 无 |
| Phase 2 清单脚本 vs Phase 1 后半测试补强 | 不改同一 CSS 选择器文件时 |
| Phase 3 壳层 vs Phase 2 色阶迁回 | **禁止**同时大改 `variables.css` 同区域；用分支隔离 |
| Phase 4 Role 文档 vs Phase 3 | 文档先行可完全并行 |
| Phase 5 多模块 | 模块目录无交叉 CSS 即可并行 |
| VR 清单编写 vs 任意 Phase | 始终可并行 |

| 必须串行 | 原因 |
| --- | --- |
| Phase 0 → 任何扩写 PR 质量标准 | 基线未锁则 diff 无意义 |
| Phase 1 → 宣称 dark+appearance 联用验收 | 契约未拆前禁止承诺 |
| Token freeze 窗内大批量壳层色改 | 难归因回归 |
| RC freeze 后新 Role/preset | 发布通道清晰 |

---

## 7. Gate commands

主题相关变更 **最小集**（开发机 / PR）：

```bash
# Appearance 契约
npx vitest run src/common/config/themeConfig.test.ts

# Token / 变量 / 工作台 UI 结构
npm run css:audit
npm run ui:audit

# 涉及 token 源时（Phase 2+）
npm run generate:tokens
# 然后确认 variables.generated.css 无非预期 diff

# 类型与构建
npm run type-check
npm run build
# 或完整：npm run build:app / npm run ci:all（含 security）

# 发布烟雾
npm run test:e2e:smoke

# 视觉（有帧时）
npm run test:visual
# 仅在 VR 授权且逐帧说明后：
# npm run test:visual:update
```

| 门 | 命令 | 阻断级别 |
| --- | --- | --- |
| Theme unit | `npx vitest run src/common/config/themeConfig.test.ts` | 主题 PR **必须** |
| CSS vars | `npm run css:audit` | 主题/CSS PR **必须**（`ci:quality` 已含） |
| UI structure | `npm run ui:audit` | 壳层/组件 PR **必须** |
| Generate clean | `npm run generate:tokens` + git clean check | Phase 2+ **必须** |
| Type | `npm run type-check` | **必须** |
| Build | `npm run build` / `build:app` | RC **必须** |
| Smoke | `npm run test:e2e:smoke` | RC **必须**（release workflow 亦要求） |
| Visual | `npm run test:visual` | Phase 3/4/RC **强烈建议**；有基线后变 **必须** |
| Hardcode baseline | `theme:hardcode-baseline`（建议新增，Phase 0） | 壳层 PR 只降不升 |
| Full CI | `npm run ci:all` | merge main / 发版前 |

PR 自检（主题相关，贴到描述）：

- [ ] 未新增第二套主题 API  
- [ ] 未在 Appearance 路径写模块色  
- [ ] 未在 `variables.css` 覆盖 generated 色阶  
- [ ] 工作台面板无 translate hover  
- [ ] 新局部 token 已登记  
- [ ] 上表必跑命令已绿  

---

## 8. Experience Officer protocol（体验官）

### 8.1 角色

- **代表**：每日长时间使用工作台的运营同学（可自兼）。  
- **权力**：Phase 1 Done、Phase 3 Done、主题 RC 的 **体验否决**；否决须写清场景与期望，不得只写「不好看」。  
- **无权**：擅自改架构优先级、要求营销动效、要求一次清零 blue。  

### 8.2 必测场景

| ID | 场景 | 步骤要点 | 期望 |
| --- | --- | --- | --- |
| X1 | **default ↔ minimal** | 设置 → Appearance 来回切换 ≥3 次；观察壳层 CTA/链接/focus | 变化清晰；无闪白崩溃；刷新后记忆正确 |
| X2 | **Ownership 不变** | 在 KH / PPC / MA / Deep Chat 等页切 Appearance | banner、侧栏模块色、入口归属 **不变**；状态色不变 |
| X3 | **对比度** | minimal 下主按钮白字、正文、focus 环 | 正文 ≥4.5:1；主按钮可读；focus 可见；禁无替代 `outline:none` |
| X4 | **长会话作业** | minimal 下连续操作 15–30 min（表单/列表/设置） | 无高刺激动效、无布局跳动 hover、无眼疲劳「发飘」浅主色 |
| X5 | **dark 组合**（Phase 1+） | minimal + dark；default + dark | 两轴独立；表面/文字跟 color-mode；primary 跟 appearance |
| X6 | **设置自洽** | 在 Appearance 面板内看主按钮/focus | 面板自身已吃 token，不出现「面板还是旧蓝、页外已变」严重分裂（壳层迁移后） |

### 8.3 Pass / Fail 量规

| 结果 | 条件 |
| --- | --- |
| **Pass** | X1–X4 全过；Phase 1+ 时 X5 过；无 P0 可读性/归属破坏 |
| **Pass with notes** | 仅 D6 硬编码控件未变色（**允许**，须注明非回归）；或 D5 soft 阴影轻微偏差已建票 |
| **Fail** | 归属被 Appearance 改掉；focus 消失；主按钮不可读；切换丢存储；dark 与 appearance 互相覆盖（P1 后）；工作台出现 translate/scale 抖动 |
| **Block RC** | Fail 未修；或 XO 未签字；或门禁红 |

记录模板（可贴 PR / RC checklist）：

```text
XO: <name>  Date:
Build/SHA:
Appearance: default | minimal | …
Color mode: light | dark | system
X1-X6: Pass/Fail + 截图链接
Notes / tickets:
Sign-off: Yes / No
```

---

## 9. Risk & rollback（分 Phase）

| Phase | 主要风险 | 缓解 | Rollback |
| --- | --- | --- | --- |
| **0** | 基线脚本误报阻断开发 | 先 warn 后 error；基线可评审上调仅一次 | 关掉新 gate 的 CI required；保留脚本 |
| **1** | 旧书签/缓存只认 `data-theme`；dark 丢 | 兼容读旧属性一版；双写过渡可选 | 回退 ThemeManager + CSS 选择器 PR；保留 `app-theme` 值语义 |
| **1** | 设置 UI 半迁移导致 mode/appearance 错乱 | 设置与 runtime 同 PR 或 feature flag | 隐藏 dark 新入口，恢复旧路径 |
| **2** | 色阶迁回导致大面积色差 | 分批（先字号/spacing 后色）；截图 diff | `git revert` token PR；generated 重新生成自旧 tokens |
| **2** | 圆角语义改名弄破组件 | 显式 `workbench-radius`；文档写死 8px 行为 | 恢复旧变量别名映射 |
| **3** | 壳层改完业务仍「看起来没换肤」 | 产品预期写进设置文案与 XO 量规（诚实边界） | 单文件 revert buttons/header |
| **4** | Role 重命名破坏 class | 兼容旧 `wb-theme-*` 映射表；禁止断崖删 class | 映射回退；模板暂留旧 class |
| **4** | colorSchemes 拆分漏入口页 | 入口/工作台分文件 + ui audit | 恢复单工厂，标记 deprecated |
| **5** | 模块 CTA 误伤归属色 | 只动 primary 语义类；PR 必带前后截图 | 模块级 revert |
| **RC** | 发错 Latest / 同号 RC | 严守 `RELEASE_POLICY` | Pre-release 标记纠正；紧急用上一 GA 产物回滚部署 |

**通用回滚原则**

1. 主题运行时与 token 大改 **独立 PR**，禁止与业务功能绑死。  
2. 存储 key：`app-theme` 保持 Appearance id；新增 `app-color-mode` 失败时不得污染 `app-theme`。  
3. 生产回滚：按 Release notes 上一 GA；静态站替换 `dist` 即可（BYOK 无服务端主题状态）。  

---

## 10. Agent / subagent mapping

供后续自动化派工（Zed / 多 agent）时对齐人类角色。

| 人类角色 | Agent 任务类型 | 典型 prompt 边界 |
| --- | --- | --- |
| TA | `architecture-review` / `docs-constitution` | 只改 docs 与契约说明；裁决 scope；禁止顺手重构业务 |
| TP | `token-pipeline` | `design-tokens.ts`、generate 脚本、variables 拆分；禁改模块业务逻辑 |
| SU | `shell-ui-migration` | `src/css/components/*`、settings Appearance；禁扫 `src/modules/**` 大表 |
| MO | `ownership-migration` | menuConfig、wb-theme、colorSchemes、单模块 chrome；禁改 ThemeManager 存储语义 |
| QA | `gates-and-tests` | 补测、audit 脚本、CI 接线；禁改视觉 token 值「为了让测试过」 |
| VR | `visual-baseline` | `tests/visual`、清单、谨慎 update snapshot；禁无无说明全量 update |
| XO | `ux-scenario-checklist` | 产出场景结果与否决说明；**不直接改代码**（可开 fail ticket） |
| RO | `release-rc` | version、CHANGELOG、tag 清单、notes；禁夹带功能 |

**编排建议**

1. 先 `docs-constitution`（Phase 0）→ 再 `gates-and-tests` 锁门。  
2. `shell-ui-migration` 与 `token-pipeline` 分 agent，避免同文件冲突。  
3. `ownership-migration` 按模块拆 subagent，共享 Role 表只读。  
4. 任意 agent **禁止**：发明多租户需求、换字体、Deep Chat 色重写、一次清零 blue。  
5. 合并前固定跑 §7 命令；RC 前插入 XO checklist（人类或只读 agent）。  

---

## 11. First 2-week sprint（Phase 0 + 启动 Phase 1）

假设 D0 = 启动日（工作日）。单人按顺序；多人按括号角色。

### Week 1 — Phase 0 锁死边界

| Day | 清单 | 角色 | 验证 |
| --- | --- | --- | --- |
| **D1** | 全员（或自己）精读审查路线 + 宪法 A2/D1–D12；本手册过一遍 RACI | TA | 口头对齐 non-goals |
| **D1** | 开主题看板：Phase 0–5 列 + 债务 ID 标签 | TA | 看板可见 |
| **D2** | 合入/核对 D7–D12 进宪法 §8；PR 模板勾选主题项 | TA | docs only PR |
| **D2** | 盘点 `ThemeColors` 误导字段；起草类型收窄补丁（可先注释+类型 partial） | SU/TA | 设计备忘 |
| **D3** | 实现/挂载「禁止 themes 旧路径」检查；统计壳层 `blue-*` 基线并落盘 | QA/TP | 脚本可跑出数字 |
| **D4** | default/minimal 壳层截图清单（header、primary btn、settings、侧栏+banner） | VR/XO | 清单文件或表格 |
| **D5** | `ThemeColors` 收窄落地 + `themeConfig` 单测加固；跑 §7 最小集 | SU/QA | 单测+css:audit+build |
| **D5** | **Phase 0 Done 评审**；未完成项降级为 ticket 不得挡 D6 | TA+XO | Phase 0 freeze |

### Week 2 — Phase 1 启动

| Day | 清单 | 角色 | 验证 |
| --- | --- | --- | --- |
| **D6** | 设计：`data-appearance` / `data-color-mode`、存储 key、兼容读旧 `data-theme`、事件是否拆分 | TA+SU | 短设计注记进 PR 描述 |
| **D7** | TDD：ThemeManager 只写 appearance；color-mode 独立 API 单测红→绿 | SU/QA | vitest |
| **D8** | CSS：dark 覆盖迁/双选择器；设置面板分外观与明暗 | SU/TP | 手动 minimal+dark |
| **D9** | 兼容层与迁移说明；更新宪法 D3/D11 状态；XO 跑 X1/X2/X5 | SU+XO | XO 表 |
| **D10** | 修反馈；smoke + type-check + build；**不要求**本周必须 RC | QA+RO | 门禁绿 |
| **D10** | 规划 Week 3：Phase 1 收口 PR 或 Phase 2 diff 清单启动 | TA | 下个 sprint 目标 |

**Sprint 成功标准（2 周结束）**

- [ ] Phase 0 = Done  
- [ ] Phase 1 主路径可演示（即使兼容层未删）或明确阻塞项 ≤2 且有 owner  
- [ ] 无扩大 D1 的合并  
- [ ] 壳层 blue 基线数字存在  
- [ ] XO 至少完成 X1/X2 一次正式记录  

---

## How to start tomorrow

1. **今天 30 min**：打开审查路线图 + 本手册 §1/§7/§11，把 Phase 0 看板列出来。  
2. **明天上午**：只做 **docs + 基线**——D7–D12 宪法对齐、shell `blue-*` 计数、截图清单；**不改业务页颜色**。  
3. **明天下午**：跑通门禁最小集：  
   `npx vitest run src/common/config/themeConfig.test.ts` · `npm run css:audit` · `npm run ui:audit` · `npm run type-check`  
4. **预约 1 次 XO**：用现网/本地 `default`↔`minimal` 走 X1/X2，留下基线观感（Phase 3 对比用）。  
5. **禁止**：开「顺手清 blue」大 PR；等 Phase 0 freeze 后再动 `data-theme` 拆分。  

路径：`docs/superpowers/plans/2026-07-26-theme-system-team-operating-playbook.md`
