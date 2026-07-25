# 主题系统体验验收矩阵（Appearance / Ownership / Dark）

**日期**: 2026-07-26  
**角色**: Experience Officer（体验官）+ Visual QA  
**状态**: 可执行验收基线（Phase 0–3 主用；Dark 在 Phase 1 前 **Blocked**）  
**权威文档链**:
`THEME_SYSTEM_GUIDELINES` > `2026-07-26-theme-system-enterprise-audit-and-roadmap` > 本文 > `VISUAL_DESIGN_GUIDELINES`  
**关联实现**:
`src/common/config/themeConfig.ts`（presets）· `tests/e2e/release-smoke.spec.ts`（路由 smoke，**不含** Appearance）

---

## 0. 一句话验收契约

Appearance **只保证 token 化全局壳层**（主按钮 / 链接强调 / focus 环）随 preset 变化；  
**不得**改模块归属（sidebar / `wb-theme-*` banner）、语义状态色、Deep Chat terracotta。  
硬编码 `blue-*`（债务 **D6**）**可以不变** —— 相关行标 **Informational**，Phase 0–1 **不作为 Blocker**。

---

## 1. Personas（谁测、测什么）

| Persona | 典型场景 | 关注点 | 验收权重 |
| --- | --- | --- | --- |
| **运营专员** | 长时作业：Keyword Hunter / PPC / Master Analysis | 可读、低刺眼、主 CTA 可辨、归属不错乱 | 高（日常路径） |
| **运营主管** | 跨模块巡检：Home → App Center → SOPs → Hub → Settings | 模块色一致、切换 Appearance 后团队认知不乱 | 高（跨归属） |
| **开发自测** | 改 theme / 壳层 CSS 后快速回归 | 可脚本化断言、对比 computed style、不扩 D6 | 中高（门禁） |

### 1.1 分角色最小执行包

| Persona | 必跑环境 | 必跑路由 | 可选 |
| --- | --- | --- | --- |
| 运营专员 | light + `default` / `minimal` | Keyword Hunter、PPC Search Terms、Master Analysis（Scraper 或 AI Analysis 其一）、Deep Chat | Settings Appearance 切换后回业务页 |
| 运营主管 | light + `default` / `minimal` | Home、App Center、SOPs sample、Hub sample、Settings Appearance | 全 core 路由扫一眼 |
| 开发自测 | light + `default` / `minimal`；Phase 1+ 加 dark 组合 | Settings Appearance + 任意 2 个工具页 + 1 个 banner 页 | `themeConfig` 单测 + smoke |

---

## 2. Environment Matrix

| Env ID | Color Mode | Appearance | 启用条件 | 备注 |
| --- | --- | --- | --- | --- |
| **E0** | light | `default`（blue 商务） | 始终 | 基线对照 |
| **E1** | light | `minimal`（slate-700 工业） | 始终 | 长时作业首选档 |
| **E2** | light | 其他 preset 抽检（`ocean` 或 `forest` 其一） | Phase 0 起可选 | 证明非仅 dual-theme |
| **E3** | dark | `default` | **Phase 1 后**（`data-color-mode`） | Phase 0：**Blocked**（D3/D11） |
| **E4** | dark | `minimal` | **Phase 1 后** | 与 E3 同；验证 A+M 可组合 |

### 2.1 Dark 阻塞说明（诚实）

| 项 | 现状 |
| --- | --- |
| 根因 | Appearance id 与 dark 共用 `data-theme`；`applyTheme` 会覆盖 dark（D3/D11） |
| Phase 0–0.x | **不验收** dark × Appearance 联用；发现 dark 被冲掉 → 记债务，**不**开 Phase 0 Blocker |
| Phase 1 DoD | `data-appearance` + `data-color-mode` 拆分后，E3/E4 进入正式矩阵 |
| 标记 | 文中凡 Dark 行写 **`[BLOCKED until Phase 1]`** |

### 2.2 Preset 清单（事实源）

来自 `THEME_PRESETS`：`default` · `minimal` · `ocean` · `forest` · `sunset` · `purple` · `rose`。  
**矩阵主对**：`default` vs `minimal`。其余 preset 在 Settings 预览 + 一页壳层抽检即可。

---

## 3. Core routes checklist

| # | Route | 建议 path / 定位 | Smoke 已覆盖？ | 归属预期（Layer B） |
| --- | --- | --- | --- | --- |
| R1 | **Home** | `/#/home` · `#panel-home` | 是 | slate / 首页 splash；非工具 banner |
| R2 | **App Center** | `/#/app-center` · `.app-overview-container` | 是 | 总览 purple 系入口，非子目录 banner |
| R3 | **Master Analysis** | `/#/app-center/master-analysis/scraper` 或 `…/ai-analysis` | 是（scraper / ai-analysis） | indigo · `wb-theme-indigo` |
| R4 | **Keyword Hunter** | `/#/app-center/keyword-hunter/input` | 是 | fuchsia · `wb-theme-fuchsia` |
| R5 | **PPC Search Terms** | `/#/app-center/ppc-tools/ppc-search-terms` | 是 | emerald/teal · PPC hero 归属 |
| R6 | **Deep Chat** | `/#/app-center/playground/deep-chat` · `#deep-chat-view` | 是 | terracotta 业务色；**非** Appearance primary |
| R7 | **Settings Appearance** | 全局设置 → Appearance 面板 | 部分（settings LLM，非 Appearance） | 预览色与 apply 一致 |
| R8 | **SOPs sample** | `/#/sops` 总览，或任一运营/供应链子页 | 总览是 | 总览 blue；子页 growth/supply/… |
| R9 | **Hub sample** | `/#/amz-hub` · `.amz-hub-overview` | 是 | 总览 orange；子页按目录色 |

> 执行时每个 route 在 **E0 与 E1** 各走一遍；E2 抽检 Settings + 一页壳层即可。

---

## 4. 路由 × default vs minimal：Must change / Must NOT change

### 4.0 通用图例（所有路由复用）

| 类别 | 检查点 | default → minimal 期望 | 严重度缺省 |
| --- | --- | --- | --- |
| **Must change（壳层 A）** | Primary 按钮填充/边（token 化） | blue 系 → slate-700 工业档 | Blocker* |
| | 全局文字链接 / 强调链接（token 化） | 随 primary | Major* |
| | `:focus-visible` 环（`--color-focus-ring`） | blue → slate-700 | Blocker* |
| | Settings 中主题预览主色块 | 与 apply 后一致 | Blocker |
| | `document.documentElement.dataset.theme` | `default` ↔ `minimal` | Blocker（开发） |
| **Must NOT change（归属 B）** | Welcome banner `wb-theme-*` 渐变/图标色 | 不变 | Blocker |
| | 左侧边栏一级目录色 / 装饰线 | 不变 | Blocker |
| | success / warning / error / info | 不变 | Blocker |
| | Deep Chat terracotta accent | 不变 | Blocker（R6） |
| | PPC hero emerald 归属 | 不变 | Blocker（R5） |
| **Informational（D6）** | 硬编码 Tailwind `bg-blue-*` / `text-blue-*` 业务控件 | **可以不变** | **Informational**（非 Phase 0–1 Blocker） |
| | 总览 entry 营销卡彩色 shadow / scale | 可不跟 Appearance | Informational / 记 D4 |

\*若该控件尚未 token 化（D6 泄漏），**降为 Informational**，并记入「壳层缺口清单」，供 Phase 3 迁移动。  
**Phase 3 后**：壳层白名单内 primary/focus **升回 Blocker**。

### 4.1 分路由矩阵

#### R1 Home

| ID | 检查项 | Must | E0/E1 | 备注 |
| --- | --- | --- | --- | --- |
| R1-C1 | 壳层/浮动入口上 token 化主按钮 | Change | 对比色 | 若仍 blue 硬编码 → Info |
| R1-C2 | 首页 splash / 粒子 hero 主叙事 | NOT | 视觉大体同 | 不要求跟 Appearance |
| R1-C3 | 侧栏模块色 | NOT | 不变 | Blocker |
| R1-I1 | 首页内硬编码 blue CTA | Info | 可变可不变 | D6 |

#### R2 App Center 总览

| ID | 检查项 | Must | E0/E1 | 备注 |
| --- | --- | --- | --- | --- |
| R2-C1 | 全局 header/设置入口 focus | Change | focus 色 | |
| R2-C2 | 总览入口卡 purple/pink 归属 | NOT | 不变 | Ownership |
| R2-C3 | 入口卡 hover translate/scale | NOT（工作台禁复制） | 总览允许轻微 | D4 观察 |
| R2-I1 | 入口卡内 blue 工具类 | Info | D6 | |

#### R3 Master Analysis

| ID | 检查项 | Must | E0/E1 | 备注 |
| --- | --- | --- | --- | --- |
| R3-C1 | Token 化主 CTA / 工具条 primary | Change* | * | *见 4.0 |
| R3-C2 | Banner `wb-theme-indigo` | NOT | 不变 | Blocker |
| R3-C3 | 空态/错误语义色 | NOT | 不变 | |
| R3-I1 | 分析工具条 `blue-*` | Info | D6 → Phase 5 | |

#### R4 Keyword Hunter

| ID | 检查项 | Must | E0/E1 | 备注 |
| --- | --- | --- | --- | --- |
| R4-C1 | Token 化主按钮 / focus | Change* | * | |
| R4-C2 | Banner `wb-theme-fuchsia` | NOT | 不变 | Blocker |
| R4-C3 | 侧栏 Keyword Hunter 目录色 | NOT | 不变 | |
| R4-I1 | 模块 chrome `blue-*` | Info | D6 | |

#### R5 PPC Search Terms

| ID | 检查项 | Must | E0/E1 | 备注 |
| --- | --- | --- | --- | --- |
| R5-C1 | 全局壳层 primary/focus | Change* | * | |
| R5-C2 | `.ppc-hero` emerald/teal | NOT | 不变 | Blocker |
| R5-C3 | 业务 tag 多色点缀 | NOT（可保留） | 不抢主归属 | |
| R5-I1 | 非 hero 区 blue 硬编码 | Info | D6 | |

#### R6 Deep Chat

| ID | 检查项 | Must | E0/E1 | 备注 |
| --- | --- | --- | --- | --- |
| R6-C1 | 全局 header/focus（页面外壳） | Change* | * | |
| R6-C2 | `--deep-chat-accent` terracotta | NOT | 不变 | **Blocker** |
| R6-C3 | 次级按钮默认黑字，hover 品牌色 | NOT（行为契约） | 不随 Appearance 改默认 | Visual 规范 7.4 |
| R6-C4 | 发送主按钮品牌填充 | NOT | 保持 terracotta | 非 Appearance primary |
| R6-I1 | 若误用全局 primary 替换 terracotta | — | **Fail Blocker** | 禁止 |

#### R7 Settings Appearance

| ID | 检查项 | Must | E0/E1 | 备注 |
| --- | --- | --- | --- | --- |
| R7-C1 | 切换 preset 后 `dataset.theme` | Change | 立即 | Blocker |
| R7-C2 | 预览 `previewTheme` ≈ apply 后 primary | Change 一致 | | Blocker |
| R7-C3 | `minimal` 主色为 slate-700 档 | Change | 非 scheme 500 | Blocker |
| R7-C4 | 列表含 7 presets 顺序 | — | default→…→rose | Major |
| R7-C5 | 切换不改侧栏/当前页 banner | NOT | | Blocker |
| R7-C6 | 持久化 `app-theme` 刷新后恢复 | Change 保持 | | Major |
| R7-D1 | Dark 开关与 Appearance 共存 | **Blocked** | Phase 1 | |

#### R8 SOPs sample

| ID | 检查项 | Must | E0/E1 | 备注 |
| --- | --- | --- | --- | --- |
| R8-C1 | 壳层 primary/focus | Change* | * | |
| R8-C2 | 总览 blue 或子页 growth/supply 等 | NOT | 不变 | 选 1 子页抽检即可 |
| R8-C3 | 风控页 red 安全归属 | NOT | 若测到 | 不随 Appearance 变粉/变灰 |

#### R9 Hub sample

| ID | 检查项 | Must | E0/E1 | 备注 |
| --- | --- | --- | --- | --- |
| R9-C1 | 壳层 primary/focus | Change* | * | |
| R9-C2 | 总览 orange 归属 | NOT | 不变 | |
| R9-C3 | 子页 indigo/growth/violet | NOT | 抽 1 | |

### 4.2 场景计数（执行包）

| 包 | 计算 | 场景数 |
| --- | --- | --- |
| 主包 A | 9 routes × 2 env（E0/E1） | **18** |
| 设置深测 | R7 专项行 × 2 env（含预览/持久化） | 计入 R7，不另加路由 |
| 可选 E2 | 1 preset × 2 面（Settings + 1 工具页） | **+2** |
| Dark E3/E4 | 9 routes × 2（Phase 1 后） | **+18**（现 Blocked） |
| A11y / 长时 | 见 §5–§6，跨路由抽检 | **+8** 检查项（非全路由笛卡尔） |

**当前可执行（Phase 0）**: **18** 路由环境场景 + **8** 横切检查 ≈ **26** 可勾选项；  
**Phase 1 后满配**: +18 dark ≈ **44** 路由环境场景（+横切）。

---

## 5. A11y checks

| ID | 检查 | 方法 | 通过标准 | 严重度 | 自动化 |
| --- | --- | --- | --- | --- | --- |
| A1 | 主按钮 on-primary 对比 | 取 computed bg/fg | ≥ **4.5:1**（`minimal` slate-700 白字应达标） | Blocker | 半自动（axe/对比工具） |
| A2 | 正文 / 次要灰字 | 抽 2 工具页 | ≥ 4.5:1 正文；大字 ≥ 3:1 | Major | 半自动 |
| A3 | Focus visible | Tab 遍历壳层 + 主表单 | 清晰可见；`minimal` 环跟 slate | Blocker | Playwright 可测 outline |
| A4 | Focus 不丢（Appearance 切换后） | 切换主题再 Tab | 仍有可见 focus | Major | 手动优先 |
| A5 | 装饰图标 | banner 图标 | `aria-hidden="true"` | Minor | 可自动 |
| A6 | 图标按钮名称 | 顶栏/侧栏 | 有 `aria-label` 或等价 | Major | 可自动 |
| A7 | Reduced motion | `prefers-reduced-motion: reduce` | 无布局位移动画；主题过渡可缩短/关 | Major | Playwright media |
| A8 | 状态不只靠颜色 | error/empty | 有文案或图标 | Major | 手动 |
| A9 | Dark 对比 **[BLOCKED until Phase 1]** | E3/E4 | 表面/正文仍可读 | Blocker（Phase 1+） | 半自动 |

---

## 6. Long-session ops checks（长时运营）

面向 **运营专员** 连续作业 30–60 min 模拟（可压缩为 10 min 巡检 + 主观量表）。

| ID | 检查 | 期望 | 严重度 |
| --- | --- | --- | --- |
| L1 | `minimal` 下主色刺激低于 `default` 高饱和蓝 | 主观「更素、更稳」；无霓虹 glow | Major（体验） |
| L2 | 工具页背景保持中性浅色 | 不大面积模块染色 | Blocker 若整页被 primary 浸染 |
| L3 | Banner 低饱和，正文优先 | 符合 VISUAL 工具优先 | Major |
| L4 | 工作台面板无 hover 位移 | 表格/表单稳定 | Blocker |
| L5 | 长时间 focus 环不刺眼 | `minimal` 工业环可接受 | Minor–Major |
| L6 | 偏好：专员可选 `minimal` 并持久化 | 刷新仍为 minimal | Major |
| L7 | 多标签作业：切换模块后归属色仍扫读清晰 | B 层稳定 | Blocker |
| L8 | Deep Chat 奶油底 + 小面积 terracotta | 不整屏桃染；不跟 Appearance 变蓝/变灰 | Blocker |

---

## 7. Pass / Fail rubric

### 7.1 严重度定义

| 级别 | 定义 | 发布门禁 |
| --- | --- | --- |
| **Blocker** | 破坏 A2 契约：归属被 Appearance 冲掉；状态色被改；Deep Chat terracotta 被替换；token 化壳层 focus/主按钮在 Phase 3 后仍不跟手；关键对比失败 | **不可合入 / 不可发版** |
| **Major** | 预览与 apply 不一致；持久化失败；a11y 名称/reduced-motion 缺失；长时刺激明显超标 | 当迭代应修；可带债仅当书面豁免 |
| **Minor** | 文案/间距毛刺；装饰 aria；非关键动画时长 | 可记债 |
| **Informational** | **D6** 硬编码 blue 未变；D4 营销卡行为；Dark 在 Phase 0 的已知冲突 | **不阻断** Phase 0–1；记入基线度量 |

### 7.2 判定规则

| 结果 | 条件 |
| --- | --- |
| **PASS** | 0 Blocker；Major ≤ 约定豁免数（默认 0）；Informational 已登记 |
| **PASS with debt** | 0 Blocker；Major 有书面豁免 + issue；Informational 有计数 |
| **FAIL** | ≥1 Blocker，或未豁免 Major |

### 7.3 常见误判纠正

| 现象 | 错误结论 | 正确结论 |
| --- | --- | --- |
| 业务页大量按钮仍蓝 |「Appearance 坏了」Blocker | **Informational D6**（Phase 0–1） |
| Banner 随 minimal 变灰 |「换肤成功」 | **FAIL Blocker**（归属被破坏） |
| Dark 打开后切 minimal dark 丢 | Phase 0 Blocker | **Blocked / D3** 直至 Phase 1 |
| Deep Chat 主色变蓝 |「统一 primary 成功」 | **FAIL Blocker** |

---

## 8. Sign-off form

### 8.1 元数据

| 字段 | 填写 |
| --- | --- |
| 构建 / commit | |
| 验收日期 | |
| 环境 | E0 / E1 /（E2）/（E3–E4 Phase 1+） |
| 浏览器 | Chrome / Edge / … |
| 分辨率 | 建议 1440 宽 + 一档窄屏抽检 |

### 8.2 结论

| 项 | PASS / FAIL / PASS with debt | 备注 |
| --- | --- | --- |
| 壳层 Must change（诚实范围） | | |
| 归属 Must NOT change | | |
| A11y §5 | | |
| Long-session §6 | | |
| Dark 组合 | N/A 或结果 | Phase 0 填 N/A |
| D6 Informational 登记 | 是 / 否 | 附计数或截图 |

### 8.3 签字

| 角色 | 姓名 | 日期 | 签字 |
| --- | --- | --- | --- |
| **Experience Officer（体验官）** | | | |
| **QA** | | | |
| **Tech Lead** | | | |

豁免 Major 时：Issue 链接 ________  到期 ________

---

## 9. Automation mapping

### 9.1 现状（release-smoke）

`tests/e2e/release-smoke.spec.ts` 覆盖 **路由可开、无严重 overflow、关键空态/业务不炸、LLM 设置**，**不覆盖**：

- Appearance 切换  
- default vs minimal 色差  
- ownership 不变  
- focus 环色  
- dark 组合  

### 9.2 行级映射

| 矩阵域 | 代表 ID | Playwright 潜力 | 建议阶段 | 手动 only |
| --- | --- | --- | --- | --- |
| 路由可访问 | R1–R9 打开 | **已有** smoke | 现网 | |
| `data-theme` 切换 | R7-C1 | 高 | Phase 0 | |
| `app-theme` 持久化 | R7-C6 | 高 | Phase 0 | |
| computed `--color-primary` | R7-C3 | 高 | Phase 0 | |
| 主按钮 bg 对比 default/minimal | 壳层 Change | 中（需稳定 selector） | Phase 3 | |
| Banner class 含 `wb-theme-*` | R3-C2 等 | 中高 | Phase 0 | |
| 侧栏目录色 class | 侧栏 NOT | 中 | Phase 0–4 | |
| Deep Chat accent token | R6-C2 | 中 | Phase 0 | |
| 硬编码 blue 是否变色 | D6 Info | 低价值 | 度量脚本优于 e2e | 可选 |
| 对比度 4.5:1 | A1–A2 | 半自动 axe | Phase 1+ | 关键页手动复核 |
| Focus visible | A3 | 中 | Phase 3 | |
| Reduced motion | A7 | 高 | Phase 0–1 | |
| 长时眼疲劳 L1 | L1 | **不可** | — | **手动** |
| Dark×Appearance | E3/E4 | 高 | **Phase 1 后** | |
| 主观归属「一眼扫读」 | L7 | 低 | — | **手动** |

### 9.3 建议新增用例名（不在本文实现）

1. `appearance minimal persists after reload`  
2. `appearance switch does not change wb-theme on keyword hunter`  
3. `deep chat accent remains terracotta after appearance change`  
4. `focus ring token follows minimal slate`（Phase 3 selector 稳定后）  
5. `color mode dark coexists with appearance minimal`（Phase 1）

---

## 10. Regression pack by Phase（0–3 minimum）

每期结束后跑对应包；**上期包不删**，只叠加。

### Phase 0 — 治理与防回归

| 项 | 验证 |
| --- | --- |
| 文档契约 | A2 / D6 Informational 被 QA 理解 |
| E0/E1 × R7 | 切换、预览一致、持久化 |
| E0/E1 × R3/R4/R5/R6 抽检 | **归属不变**；Deep Chat terracotta 不变 |
| Informational | 记录「仍蓝」控件清单，**不 Fail** |
| 自动化 | `themeConfig` 单测；可选 dataset/persist e2e |
| Dark | **不测联用**；标 N/A |
| 命令 | `npx vitest run src/common/config/themeConfig.test.ts` · `npm run css:audit` · smoke |

**Phase 0 出口 Blocker**: 归属被改；terracotta 被改；apply 与 preview 主色不一致；`themes.ts` 回流。

### Phase 1 — Color Mode 与 Appearance 拆分

| 项 | 验证 |
| --- | --- |
| 含 Phase 0 全包 | 回归 |
| E3/E4 解锁 | dark + default / dark + minimal |
| DOM | `data-appearance` + `data-color-mode`（兼容旧读） |
| R7-D1 | 先切 dark 再切 minimal，mode 不丢 |
| Banner / 侧栏 | dark 下归属仍可读且不被 primary 替换 |
| A9 | dark 正文对比抽检 |

**Phase 1 出口 Blocker**: 两轴仍互斥；minimal+dark 不可用；dark 下归属色错误串层。

### Phase 2 — Token 事实源收口

| 项 | 验证 |
| --- | --- |
| 含 Phase 0–1 | 回归 |
| E0/E1 核心页 | 表面/字号/圆角无「突然错位」 |
| 工作台 radius ≤8px | 工具页抽检 |
| `generate:tokens` | clean / CI 一致 |
| Appearance | primary 仍只走 ThemeManager |

**Phase 2 出口 Blocker**: 全局字号/色阶回归；工作台圆角失控；Appearance 写坏。

### Phase 3 — 壳层 Appearance 可见面

| 项 | 验证 |
| --- | --- |
| 含 Phase 0–2 | 回归 |
| 壳层白名单 | `buttons` primary、header 链接/激活、设置主按钮、focus soft（D5） |
| E0 vs E1 | **Must change 升为真实 Blocker**（白名单内） |
| 录屏/截图 | default↔minimal 可感知 |
| D6 业务页 | 仍可为 Informational，但壳层不得再扩 blue 硬编码 |
| smoke | 不退化 |

**Phase 3 出口 Blocker**: 白名单壳层切换无可见差异；focus 仍锁死蓝（D5 未收）；归属回归。

### Phase 3 之后（提示，非本矩阵强制）

- Phase 4：ownership / colorSchemes 行为回归  
- Phase 5：按流量降 `blue-*`；对应行从 Informational **逐步**升为 Must change  

---

## 11. 快速执行清单（打印用）

```text
[ ] E0 default：R1–R9 打开无炸
[ ] E1 minimal：R1–R9 打开无炸
[ ] R7：default↔minimal 预览=apply，刷新保持
[ ] R3/R4/R5：banner/侧栏归属不变
[ ] R6：terracotta 不变
[ ] 壳层 focus 可见；minimal 环跟 slate（若已 token 化）
[ ] D6 仍蓝 → 记 Info，不 Block Phase 0–1
[ ] A11y A1/A3/A7 抽检
[ ] L1/L4/L8 长时与稳定性
[ ] Dark：Phase 0 填 N/A；Phase 1+ 跑 E3/E4
[ ] 三方签字 §8
```

---

## 12. 文档维护

| 变更 | 动作 |
| --- | --- |
| 新增 preset | 更新 §2.2；E2 抽检名单 |
| Phase 1 合入 | 去掉 Dark Blocked；启用 E3/E4 |
| Phase 3 壳层迁移 | 将对应 Change* 从 Info 升 Blocker |
| D6 计数变化 | 更新 Informational 基线，不改 A2 契约 |
| smoke 增加 Appearance | 更新 §9 |

**冲突优先级**: `THEME_SYSTEM_GUIDELINES` > 企业审查路线图 > **本文** > 视觉细则。

---

## 13. 摘要（给执行者）

| 指标 | 值 |
| --- | --- |
| Personas | 3（运营专员 / 运营主管 / 开发自测） |
| 主环境 | light `default` + light `minimal`；dark **Blocked until Phase 1** |
| Core routes | 9 |
| 可执行场景（Phase 0） | **18** 路由×环境 + **8** 横切 ≈ **26** |
| Phase 1 后路由×环境 | **36**（+ dark×2）满配约 **44** 含横切量级 |
| Blocker 核心 | 归属/`wb-theme` 被改；状态色被改；Deep Chat terracotta 被改；预览≠apply；Phase 3 后壳层 primary/focus 不跟手；关键对比失败 |
| 非 Blocker（Phase 0–1） | **D6** 硬编码 blue 不变 → Informational |
| 签字 | Experience Officer · QA · Tech Lead |
