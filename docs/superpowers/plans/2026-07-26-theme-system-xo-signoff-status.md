# 主题系统 XO 签字状态（Phase 1 code-aware review）

**日期**: 2026-07-26  
**角色**: Experience Officer + QA（静态核验；**非**浏览器视觉签收）  
**范围**: `docs/superpowers/plans/2026-07-26-theme-system-experience-acceptance-matrix.md`  
**对照实现**: `src/common/config/themeConfig.ts` · `themeConfig.test.ts` · `tests/e2e/release-smoke.spec.ts` · Settings Appearance  
**诚实声明**: 本文**不**声称「全站视觉已 Pass」。凡肉眼对比、对比度体感、长时作业刺激、归属「一眼扫读」，一律 **Needs manual browser** 或由人类 XO 补签。

---

## 0. 状态图例

| 状态 | 含义 |
| --- | --- |
| **Pass (automated)** | 已有单测 / e2e / 门禁可重复证明 |
| **Pass (code contract)** | 代码路径 + 单元契约成立；**未**做浏览器视觉确认 |
| **Needs manual browser** | 需人类 XO 在真实浏览器点选与肉眼对比 |
| **Blocked** | 缺 UI / 缺完整产品路径 / 已知债务阻断正式体验签收 |

---

## 1. 矩阵场景 → 状态映射

### 1.1 环境矩阵（§2）

| Env | Color Mode × Appearance | 状态 | 依据（代码感知） |
| --- | --- | --- | --- |
| **E0** | light + `default` | **Pass (code contract)** 基线 + **Needs manual browser** 视觉 | 默认 preset 存在；`applyTheme('default')` 写 primary 族；肉眼壳层仍需人工 |
| **E1** | light + `minimal` | **Pass (code contract)** token 契约 + **Needs manual browser** 视觉 | 单测：`minimal` → slate-700 customVars + focus；不触 `ColorContext` |
| **E2** | light + 其他 preset 抽检 | **Pass (code contract)** 存在性 + **Needs manual browser** 抽检 | `THEME_PRESETS` 含 ocean/forest/sunset/purple/rose；无 e2e 色差 |
| **E3** | dark + `default` | **Pass (code contract)** API + UI 路径 + **Needs manual browser** 视觉 | API：`applyColorMode` + `applyTheme` 不互斥；Settings **颜色模式** 已接 `applyColorMode`；全站 dark 视觉仍需人类 XO |
| **E4** | dark + `minimal` | 同 E3 | 同上；组合切换需 30 分钟人工脚本 |

> Phase 0 曾写 Dark「Blocked until Phase 1」。运行时轴已拆分，且 **Settings 颜色模式 UI 已落地**（浅色/深色/跟随系统）。E3/E4 的阻断从「无 UI」降为 **Needs manual browser**（视觉签收未做）。

### 1.2 Core routes 可访问（§3 · R1–R9 打开）

| ID | Route | 状态 | 证明 |
| --- | --- | --- | --- |
| R1 | Home | **Pass (automated)** | `release-smoke` CORE_ROUTES `#panel-home` |
| R2 | App Center | **Pass (automated)** | smoke `.app-overview-container` |
| R3 | Master Analysis | **Pass (automated)** | smoke scraper / ai-analysis |
| R4 | Keyword Hunter | **Pass (automated)** | smoke keyword-hunter input + 空态用例 |
| R5 | PPC Search Terms | **Pass (automated)** | smoke + 本地分析用例 |
| R6 | Deep Chat | **Pass (automated)** | smoke `#deep-chat-view` + draft 用例 |
| R7 | Settings Appearance | **Pass (automated)** 可达 | `system-settings` E2E-P1-04：section / theme select 可见；**非** default↔minimal 色差 |
| R8 | SOPs sample | **Pass (automated)** | smoke sops overview；子页部分另有 mobile 用例 |
| R9 | Hub sample | **Pass (automated)** | smoke `.amz-hub-overview` |

> 上表仅证明 **可打开、无炸**；**不等于** Appearance 切换后壳层/归属视觉 Pass。

### 1.3 路由 × default vs minimal Must change / NOT（§4）

| ID | 检查项 | 状态 | 说明 |
| --- | --- | --- | --- |
| R1-C1 | 壳层 token 主按钮 | **Needs manual browser**（部分 **Pass code**） | navigation/search/modal 已用 `--color-primary*` / focus token；Home 内 D6 硬编码可能不变 |
| R1-C2 | splash / hero 叙事 | **Needs manual browser** | 契约：可不跟 Appearance |
| R1-C3 | 侧栏模块色 | **Pass (code contract)** + **Needs manual browser** | `applyTheme` 不调 `ColorContext.setModuleColor`；侧栏装饰归属仍需肉眼 |
| R1-I1 | 硬编码 blue CTA | **Pass (code contract)** Informational | D6 允许不变；非 Phase 1 Blocker |
| R2-C1 | header/设置 focus | **Needs manual browser** | focus 已绑 token 的控件应跟手；需 Tab 肉眼 |
| R2-C2 | 总览 purple 归属 | **Needs manual browser** | 归属层；代码不写 ownership |
| R2-C3 | 入口卡 hover 位移 | **Needs manual browser** | D4 观察项 |
| R2-I1 | 入口 blue 工具类 | Informational | D6 |
| R3-C1 | 工具条 token primary | **Needs manual browser** / 可能 Info | 业务 chrome 大量 D6 |
| R3-C2 | `wb-theme-indigo` | **Pass (code contract)** + **Needs manual browser** | Appearance 不写 banner class |
| R3-C3 | 空态/错误语义色 | **Pass (code contract)** + **Needs manual browser** | ThemeManager 不写 status |
| R3-I1 | 分析工具条 `blue-*` | Informational | D6 → Phase 5 |
| R4-C1 | 主按钮/focus | **Needs manual browser** | 壳层 vs 模块硬编码需区分 |
| R4-C2 | `wb-theme-fuchsia` | **Pass (code contract)** + **Needs manual browser** | 同上 ownership |
| R4-C3 | 侧栏 KH 目录色 | **Needs manual browser** | |
| R4-I1 | 模块 `blue-*` | Informational | D6 |
| R5-C1 | 全局壳层 primary/focus | **Needs manual browser** | |
| R5-C2 | `.ppc-hero` emerald | **Pass (code contract)** + **Needs manual browser** | 业务 hero 非 Appearance |
| R5-C3 | 业务 tag 多色 | **Needs manual browser** | 允许保留 |
| R5-I1 | 非 hero blue | Informational | D6 |
| R6-C1 | 页面外壳 header/focus | **Needs manual browser** | |
| R6-C2 | terracotta accent | **Pass (code contract)** + **Needs manual browser** | 禁止被 global primary 替换；无 e2e accent 断言 |
| R6-C3 | 次级按钮默认行为 | **Needs manual browser** | Visual 7.4 |
| R6-C4 | 发送主按钮 terracotta | **Needs manual browser** | |
| R6-I1 | 误用 global primary | **Pass (code contract)** 防写路径 | `applyTheme` 不碰 Deep Chat token；视觉仍需人工 |
| R7-C1 | `dataset.theme` / appearance | **Pass (automated)** unit + **Needs manual browser** UI | 单测写 `data-appearance` + 兼容 `data-theme`；设置 select 调 `ThemeManager.applyTheme` |
| R7-C2 | preview ≈ apply | **Pass (automated)** unit | `previewTheme('minimal')` 对齐 customVars；**设置 UI 无色块预览断言** |
| R7-C3 | minimal = slate-700 档 | **Pass (automated)** unit | 非 scheme-500 |
| R7-C4 | 7 presets 列表 | **Pass (code contract)** | `THEME_PRESETS` + settings `appearanceThemeOptions` 契约单测 |
| R7-C5 | 切换不改侧栏/banner | **Pass (code contract)** + **Needs manual browser** | 无 setModuleColor；肉眼必测 |
| R7-C6 | `app-theme` 持久化 | **Pass (automated)** unit + **Needs manual browser** 刷新 | Storage `app-theme`；无 e2e reload 用例 |
| R7-D1 | Dark 与 Appearance 共存 | **Pass (code contract)** API + UI + **Needs manual browser** | 单测轴独立；Settings **颜色模式** 已接 `applyColorMode`；视觉未签 |

### 1.4 A11y（§5）

| ID | 状态 | 说明 |
| --- | --- | --- |
| A1 主按钮对比 | **Needs manual browser** | slate-700 白字预期达标；无 axe 进 smoke |
| A2 正文对比 | **Needs manual browser** | light 基线可；dark 抽检受 E3/E4 产品路径限制 |
| A3 Focus visible | **Needs manual browser** | 壳层 focus 绑 token；无 Playwright outline 色断言 |
| A4 切换后 focus 不丢 | **Needs manual browser** | |
| A5 装饰图标 aria | **Needs manual browser** / 可后补自动 | smoke 未测 |
| A6 图标按钮名称 | **Needs manual browser** | |
| A7 Reduced motion | **Pass (code contract)** 设置项存在 + **Needs manual browser** | settings 有「遵循系统减少动效」；无 media e2e |
| A8 状态不只靠颜色 | **Needs manual browser** | 业务空态 smoke 有文案，非主题专测 |
| A9 Dark 对比 | **Needs manual browser** / **Pass (code contract)** CSS + UI | `variables.css` 双选择器 + Settings 颜色模式；无人工对比签收 |

### 1.5 长时运营（§6）

| ID | 状态 |
| --- | --- |
| L1 minimal 刺激低于 default | **Needs manual browser**（主观） |
| L2 工具页背景中性 | **Needs manual browser** |
| L3 Banner 低饱和正文优先 | **Needs manual browser** |
| L4 工作台无 hover 位移 | **Needs manual browser** |
| L5 focus 环不刺眼 | **Needs manual browser** |
| L6 minimal 持久化 | **Pass (code contract)** + **Needs manual browser** 刷新 |
| L7 多标签归属扫读 | **Needs manual browser** |
| L8 Deep Chat 奶油底 + terracotta | **Needs manual browser** |

### 1.6 Playbook XO 必测场景（作战手册 §8.2）

| ID | 场景 | 状态 |
| --- | --- | --- |
| X1 | default ↔ minimal ≥3 次 | **Needs manual browser**（API/select **Pass code**） |
| X2 | Ownership 不变 | **Pass (code contract)** + **Needs manual browser** |
| X3 | 对比度 | **Needs manual browser** |
| X4 | 长会话 15–30 min | **Needs manual browser** |
| X5 | minimal+dark / default+dark | **Pass (code contract)** API + Settings UI + **Needs manual browser** 视觉 |
| X6 | 设置面板自洽吃 token | **Needs manual browser** / debt | 颜色模式 UI 已有；accent 等仍可能硬编码 blue（D6 Informational） |

### 1.7 状态计数（本签收文档）

| 状态 | 约计（场景行，含路由检查 / A11y / 长时 / XO / Env） |
| --- | --- |
| **Pass (automated)** | **12**（9 路由打开级 smoke/可达 + R7 单元色契约子集 + 设置 section 可达） |
| **Pass (code contract)** | **22**（轴拆分、ownership 不写、minimal vars、restore 独立、dark CSS 选择器入口、预设存在性等） |
| **Needs manual browser** | **38**（壳层可见变色、归属肉眼、a11y 对比、长时、Deep Chat terracotta 视觉等） |
| **Blocked** | **~1–2**（仅正式视觉签收缺失类；**Settings 颜色模式 UI 已落地**） |

> 计数为**可勾选场景行**量级，同一 ID 可同时标 code + manual（上表主状态取「未闭环」侧）。  
> **结论**: **零**「全视觉 Pass」；**不允许** Tech Lead 单方签体验 RC。

---

## 2. Smoke 已覆盖 vs Appearance default↔minimal 缺口

### 2.1 `release-smoke.spec.ts` **已覆盖**

| 域 | 内容 |
| --- | --- |
| 路由可达 | Home / SOPs / App Center / Scraper / AI Analysis / Promptlab / Deep Chat / KH / PPC / AMZ Hub / More / Skills |
| 稳定性 | 核心路由无严重横向 overflow（mobile 子集） |
| 业务空态 | Scraper ASIN、AI Analysis 空数据、KH 空输入、PPC 空输入、Promptlab 本地 prompt、Deep Chat draft、Skills 试用 handoff |
| 设置 | LLM 默认 endpoint / 空 key 同步 / 鉴权与限流 Toast（**非 Appearance**） |
| 其它 | 营销日历本地 flag、SOPs→Hub SEO mobile、Restricted Words modal、NPI Next Step modal |

### 2.2 Appearance default↔minimal **明确缺口**

| 缺口 | 现状 |
| --- | --- |
| 切换 Appearance | smoke **无** `settings-theme-select` 操作 |
| `data-appearance` / `data-theme` 断言 | e2e **无** |
| `--color-primary` computed default vs minimal | e2e **无**（仅 unit） |
| 主按钮 / focus 环色差 | e2e **无** |
| banner `wb-theme-*` 切换后不变 | e2e **无** |
| Deep Chat terracotta 不随 Appearance | e2e **无** |
| `app-theme` reload 持久化 | e2e **无** |
| Color mode dark × appearance | e2e **无**；设置 **无** color-mode 控件 |
| 长时 / 主观刺激 | **不可**自动化 |

### 2.3 相邻自动化（非 smoke，但相关）

| 来源 | 覆盖 | 未覆盖 |
| --- | --- | --- |
| `themeConfig.test.ts` | applyTheme / minimal vars / 不触 ColorContext / applyColorMode / 轴独立 / legacy dark 迁移 / preview | 浏览器渲染、业务 DOM |
| `system-settings.spec.ts` E2E-P1-04 | Appearance section 可见、theme select 存在 | 选 minimal 后色值、刷新 |
| `UT-P1-06` | `setAppearanceTheme` → `ThemeManager.applyTheme`；appearance 不进 dirty runtime | 视觉 |

---

## 3. 人类 XO 30 分钟手动浏览器脚本

**前置**: 最新构建或 `npm run dev`；Chrome/Edge；桌面 1440 宽；从干净或已知 `default` 开始。  
**工具**: 可选 DevTools Elements 看 `<html data-appearance data-theme data-color-mode class>`。  
**不测**: 全站 D6 变蓝与否（允许不变）。

| 分钟 | 步骤 | Pass 标准 | Fail 立刻停 |
| --- | --- | --- | --- |
| 0–2 | 打开 Home `/#/home`，确认无炸 | 主内容可见 | 白屏/红错 |
| 2–5 | 打开全局设置 → **外观与体验** | `#settings-section-appearance`、主题 select 可见 | 无主题控件 |
| 5–8 | 主题：`默认` → `极简素色` → `默认` → `极简素色`（≥3 次） | 切换无崩溃；`<html data-appearance>` 跟选中 id；兼容 `data-theme`=同 id | 闪崩；属性乱写 `dark` 进 theme 槽 |
| 8–10 | 保持 **minimal**，刷新整页 | 仍为 minimal；`app-theme` 记忆 | 刷新回 default 且无说明 |
| 10–14 | 仍 minimal：打开 Keyword Hunter | banner/侧栏 **fuchsia 归属不变**；仅 token 化壳层可偏 slate | banner 变灰/变蓝跟 Appearance |
| 14–17 | PPC Search Terms | `.ppc-hero` emerald/teal **不变** | hero 被 primary 染成工业灰主叙事 |
| 17–20 | Deep Chat | 发送/accent **terracotta**；非全局 primary 蓝/灰顶替 | terracotta 被 Appearance 吃掉 |
| 20–23 | Master Analysis（Scraper 或 AI） | `wb-theme-indigo` 类叙事不变；空态/错误色仍语义 | indigo banner 被冲 |
| 23–25 | App Center + SOPs + AMZ Hub 各 20s 扫一眼 | 总览 purple / blue / orange 归属大体稳定 | 归属全局被改成一套灰 |
| 25–27 | Tab：顶栏搜索入口、侧栏按钮、设置控件 | focus 环可见；minimal 下更偏 slate（若已 token 化） | focus 全无 / outline:none 裸奔 |
| 27–28 | 设置面板自身 | 记录是否仍「整板旧蓝」（预期：**可能仍蓝**，记债，勿谎称 X6 Pass） | 面板崩溃 |
| 28–30 | **Dark（设置 UI）** | 设置 → 颜色模式 → 深色 / 跟随系统；确认 `.dark` 与 appearance 并存；再切主题色不丢 dark | applyTheme 冲掉 dark |
| 收尾 | 切回 `default` + light | 可恢复 | 卡死在 minimal |

**压缩版（15 min）**: 设置切换 3 次 → 刷新 → KH + Deep Chat + PPC 三页 ownership → Tab focus 一次。

**记录模板**（贴 PR / RC）:

```text
XO: ________  Date: 2026-__-__  Build/SHA: ________
Browser: ________  Viewport: ________
X1 switch×3: Pass/Fail
X2 ownership (KH/PPC/MA/DeepChat): Pass/Fail
X3 contrast/focus: Pass/Fail
X4 long-session (or 10m proxy): Pass/Fail / Skipped
| X5 dark×appearance (设置颜色模式): Pass/Fail
X6 settings self-token: Pass/Fail / Debt (blue hardcode) |
D6 still-blue samples: (list, Informational)
Sign-off visual: Yes / No
```

---

## 4. 签收分层（Code gates vs Visual）

### 4.1 Tech Lead 可预签 — **Code gates only**

下列项基于 **静态代码 + 现有自动化**，Tech Lead 可签「Phase 1 代码门禁」，**不得**写成「XO 体验已过」：

| Gate | 证据 | 预签 |
| --- | --- | --- |
| Appearance 写 `data-appearance`；兼容写 `data-theme`=appearance id | `ThemeManager.applyTheme` | ☐ |
| Appearance **不**写 `data-color-mode` / `.dark` | 同文件 + unit | ☐ |
| Color Mode 独立：`app-color-mode`、`applyColorMode` / `restoreColorMode` | themeConfig + unit | ☐ |
| minimal slate-700 + focus customVars；不调 `ColorContext.setModuleColor` | unit | ☐ |
| legacy `data-theme=dark` 一次性迁移到 color mode | unit | ☐ |
| Settings 主题 select → `ThemeManager.applyTheme` | systemSettings.ts + UT-P1-06 | ☐ |
| 壳层部分 chrome 已语义 primary/focus | navigation / search / modal；CHANGELOG | ☐ |
| release-smoke 路由可达不因本批逻辑故意砍路由 | smoke 仍列 CORE_ROUTES | ☐ |
| Dark CSS 双/三选择器过渡存在 | `variables.css` `.dark, [data-theme='dark'], [data-color-mode='dark']` | ☐ |

**Tech Lead 预签语句（建议原文）**:

> 我确认 Phase 1 **代码契约与单元门禁**成立（Appearance / Color Mode 双轴 API、存储分离、minimal 工业 token、ownership 非 Appearance 写入）。  
> **不**代表浏览器视觉、对比度、长时作业、Settings dark UI 已验收。

签字: ________  日期: ________  SHA: ________

### 4.2 XO / 人类仍必须签 — **Visual / Experience**

| 项 | 谁 | 状态 |
| --- | --- | --- |
| X1–X4 视觉与体验 | XO | **未签**（需 §3 脚本） |
| X5 dark 组合产品体验 | XO | **未签**（Settings 颜色模式 UI 已有，需 §3 脚本） |
| X6 设置面板 token 自洽 | XO | **未签**；accent 可能仍偏硬编码 blue（debt） |
| 归属一眼扫读 / terracotta | XO | **未签** |
| 主题 RC 体验否决权 | XO | **保留** |

**XO 签收语句（仅人工跑完后填写）**:

> 我已按 30 分钟脚本（或等价）在浏览器完成 default↔minimal 与 ownership 抽检。  
> 结论: PASS / PASS with debt / FAIL  
> 债务单: ________

签字: ________  日期: ________

### 4.3 当前总判

| 层 | 结论 |
| --- | --- |
| Code gates | **可预签**（待 Tech Lead 勾表） |
| Visual / XO | **未签收** |
| 主题 RC 体验门禁 | **不可仅凭本文关闭** |

---

## 5. Phase 1 后风险（再确认）

### 5.1 双写 `data-theme` 兼容

| 点 | 现状 | 风险 |
| --- | --- | --- |
| Appearance | 同时写 `data-appearance` + `data-theme`=preset id | 旧读者可活 |
| Dark 生效 | 优先 `.dark` class + `data-color-mode`；仍兼容选择器 `[data-theme='dark']` | 若有代码再写 `data-theme=dark`，会与 appearance id **争槽** |
| CSS | 大量 `.dark, [data-theme='dark']` 与部分 `[data-color-mode='dark']` 并存 | 迁移期选择器爆炸；遗漏选择器 → light 残留 |
| dark 覆盖 primary | `variables.css` dark 块重写 `--color-primary` 为 indigo-400 族 | 与 Appearance runtime 规则叠层顺序需肉眼确认「谁赢」 |

**缓解**: 禁止新代码写 `data-theme=dark`；新样式优先 `data-color-mode` / `.dark`；加 e2e「dark + minimal 共存」。

### 5.2 megaMenu 仍 blue（归属 / 硬编码）

| 点 | 现状 |
| --- | --- |
| `megaMenu.ts` `GLASS_COLORS.blue` 等 | **故意**模块色板 / 入口玻璃态，changelog：壳层迁 token，**megaMenu 保留 13 处级归属** |
| 验收 | Appearance 切换后 megaMenu 仍蓝 **≠ Fail**；标 **Informational / Ownership** |
| 误判 | 勿把「菜单还蓝」写成 Appearance 坏了 |

### 5.3 Settings：颜色模式 UI 已落地；局部仍可能硬编码蓝

| 检查（读时） | 结果 |
| --- | --- |
| `systemSettings.html` Appearance 区 | **有**主题 select、**颜色模式**（浅色/深色/跟随系统）、动画开关、减少动效、动画速度 |
| Color Mode 控件 | **有**：`setAppearanceColorMode` → `ThemeManager.applyColorMode`；不经过 `applyTheme` |
| `--settings-accent` | 仍可能 **硬编码** `var(--color-blue-600)` 等 → X6 debt / D6 Informational |
| 分段 active / focus / 主 CTA | 部分可能仍偏旧蓝；需人工记债 |
| X6「面板吃 token」 | **部分达成**（模式切换）；accent 全量语义化 → 后续 Phase 3 设置白名单 |

**影响**: 用户无法在设置里完成 E3/E4；开发可用 API/控制台测轴独立，**不能**宣称「设置 dark 体验 Ready」。

### 5.4 其它残留

| 项 | 备注 |
| --- | --- |
| D6 业务 `blue-*` | 仍 Informational |
| D5 focus soft | 部分壳层已迁；全站未清 |
| smoke 无 Appearance | 回归盲区，建议跟进矩阵 §9.3 用例名 |
| system 模式 | API + matchMedia 单测有；无设置 UI |

---

## 6. 建议下一步（非本文实施）

1. 人类 XO 跑 §3 脚本并贴截图 / 记录。  
2. Tech Lead 仅勾 §4.1 code gates。  
3. 产品债：Settings accent / 分段 → semantic primary（X6 收尾）。  
4. e2e 最小包：`appearance minimal persists`、`switch does not change wb-theme`、`settings color-mode dark coexists with minimal`。  
5. 兼容收口计划：读路径迁离 `data-theme` 后再停双写。

---

## 7. 摘要（给 RO / 排期）

| 指标 | 值 |
| --- | --- |
| 文档路径 | `docs/superpowers/plans/2026-07-26-theme-system-xo-signoff-status.md` |
| Pass (automated) | **~12** |
| Pass (code contract) | **~22** |
| Needs manual browser | **~38** |
| Blocked | **~1–2**（仅正式视觉签收） |
| 视觉全站 Pass | **否（明确未签）** |
| Tech Lead code 预签 | **允许** |
| XO 体验签 | **仍要求** |
| 最大体验阻断 | **人类 30 分钟脚本未跑**；Settings 局部 blue 债；smoke **无 Appearance 色差** |

**一句话**: Phase 1 **双轴代码门禁可预签**；**default↔minimal 可见体验与 dark 产品路径尚未 XO 签收**，不得宣称「主题体验全部通过」。
