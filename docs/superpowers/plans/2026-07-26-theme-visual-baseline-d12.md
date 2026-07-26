# D12 视觉回归基线计划（Appearance default vs minimal）

**日期**: 2026-07-26  
**角色**: Visual QA  
**状态**: 计划 + **最小 opt-in scaffold**（**非** visual Pass；**非** CI fail-closed）  
**权威链**:
`2026-07-26-theme-system-experience-acceptance-matrix` >
`2026-07-26-theme-system-xo-signoff-status` >
本文（D12）  
**关联 tooling**:
`package.json` → `test:visual` / `test:visual:update` / `test:visual:theme` / `test:visual:theme:update` ·
`tests/visual/visual.test.ts` ·
`tests/visual/theme-appearance-scaffold.test.ts` ·
`docs/testing/visual-regression-testing.md` ·
`tests/e2e/release-smoke.spec.ts`（**无** Appearance 色差）

---

## 0. 一句话目标

为 **Appearance `default` ↔ `minimal`**（及 Phase 1 UI 已存在后的 **dark 可选层**）建立**可复用视觉回归基线**：  
哪些像素**必须**变、哪些归属**必须不变**写清楚；先用人眼 8 张闭环 XO 缺口，再决定是否把 Playwright 截图进 CI。

**诚实边界**（来自 XO 签收）:

| 层 | 现状 |
| --- | --- |
| Code gates | 可预签；**不等于**视觉 Pass |
| release-smoke | 路由可达；**无** Appearance 切换/色差 |
| `tests/visual` | 已有通用页面截图骨架；**已有** opt-in theme-axis scaffold（`THEME_VISUAL=1`，12 屏 = **24** 快照，默认 skip）；**仍无** visual Pass / CI fail-closed |
| 全站视觉签收 | **未签**；本文补基线 **计划**，非签收本身 |

---

## 1. Snapshot matrix（路由 × Appearance × Color Mode）

### 1.1 轴定义

| 轴 | 值 | 启用 |
| --- | --- | --- |
| **Route** | R1–R9（与体验矩阵 §3 一致） | 始终（主包） |
| **Appearance** | `default`（E0）· `minimal`（E1） | 始终 |
| **Color mode** | `light` · `dark`（E3/E4） | light 始终；**dark 可选**（Phase 1 Settings 颜色模式 UI 已落地，正式进矩阵需人工/自动化稳定后） |
| **Viewport（基线阶段）** | Desktop **1280×720**（与 `VISUAL_CONFIG.viewports.desktop` 对齐） | 首批只桌面；平板/移动 **不做** theme 基线（防噪声） |

### 1.2 主包矩阵（light · 必做）

| Route | Path / 定位 | `default` light | `minimal` light | 备注 |
| --- | --- | --- | --- | --- |
| **R1 Home** | `/#/home` · `#panel-home` | ☐ | ☐ | splash 允许大体同 |
| **R2 App Center** | `/#/app-center` · `.app-overview-container` | ☐ | ☐ | purple 总览归属 NOT |
| **R3 Master Analysis** | `/#/app-center/master-analysis/scraper`（或 ai-analysis） | ☐ | ☐ | `wb-theme-indigo` NOT |
| **R4 Keyword Hunter** | `/#/app-center/keyword-hunter/input` | ☐ | ☐ | fuchsia banner NOT |
| **R5 PPC Search Terms** | `/#/app-center/ppc-tools/ppc-search-terms` | ☐ | ☐ | `.ppc-hero` emerald NOT |
| **R6 Deep Chat** | `/#/app-center/playground/deep-chat` · `#deep-chat-view` | ☐ | ☐ | terracotta NOT |
| **R7 Settings Appearance** | 全局设置 → Appearance | ☐ | ☐ | 预览/select 与 apply 一致；可另截 focus |
| **R8 SOPs sample** | `/#/sops` 总览 | ☐ | ☐ | 总览 blue / 子页归属 NOT |
| **R9 Hub sample** | `/#/amz-hub` · `.amz-hub-overview` | ☐ | ☐ | 总览 orange NOT |

**计数（light 主包）**: 9 routes × 2 appearances = **18** full-page（或 viewport）snapshots。

### 1.3 Dark 可选层（E3/E4 · 不阻塞首批 8 张）

| Env | Color × Appearance | 路由范围建议 | 启用条件 |
| --- | --- | --- | --- |
| **E3** | dark + `default` | 先 R7 + R4 + R6（设置 / 工具归属 / terracotta） | Settings 颜色模式可点；截图前确认 `data-color-mode=dark` 与 `.dark` 并存、`data-appearance` 不被冲掉 |
| **E4** | dark + `minimal` | 同上三路由，再扩 R1–R9 | 同 E3；验证 A+M 可组合 |

**计数（dark 满配）**: 9 × 2 = **+18**（现标 **Optional**）。  
**首批不强制 dark**：避免字体/渐变在 dark 下未稳定时污染 baseline。

### 1.4 扩展（明确不做进 D12 首批）

| 项 | 决策 |
| --- | --- |
| E2 其他 preset（ocean/forest…） | 不做全矩阵；Settings 预览 + 1 壳层页肉眼即可 |
| tablet / mobile theme 轴 | 延后；现有 visual 响应式与 theme 解耦 |
| hover / 动画态 | 禁用动画截图；交互态不进 theme baseline |
| D6 硬编码 `blue-*` 是否变色 | **不**作为 diff 失败原因（Informational） |

### 1.5 场景总量一览

| 包 | 快照数 | 状态 |
| --- | --- | --- |
| Light 主包（R1–R9 × default/minimal） | **18** | 目标基线全集 |
| 明日首批（§6） | **8** | 立刻执行 |
| Dark 可选（R1–R9 × default/minimal） | **+18** | Phase 1 视觉稳定后 |
| 横切（focus 环、Settings 切换前后） | 建议 +2～4 局部截图 | 可选，不占 full-page 名额 |

---

## 2. Must change vs Must NOT change（ownership）

对齐体验矩阵 §4.0；**视觉 diff 解读规则**如下。

### 2.1 Must change（壳层 · Appearance 责任）

| 区域 | default → minimal 期望 | 严重度 |
| --- | --- | --- |
| Token 化 **Primary** 按钮填充/边 | blue 商务 → slate-700 工业 | Blocker* |
| Token 化全局链接 / 强调色 | 随 primary | Major* |
| `:focus-visible` 环（`--color-focus-ring`） | blue → slate-700 | Blocker* |
| Settings 主题预览主色 / 选中态 | 与 apply 后一致 | Blocker |
| `<html data-appearance>`（及兼容 `data-theme`=preset id） | `default` ↔ `minimal` | Blocker（开发断言可辅） |
| 壳层 header / 搜索 / modal 等已迁 token 的 chrome | 可见跟手 | Major* |

\*控件仍硬编码 `blue-*`（D6）→ **降为 Informational**，记壳层缺口，**不**用「没变」打 Fail 主题。

### 2.2 Must NOT change（归属 · Layer B）

| 区域 | 期望 | 严重度 |
| --- | --- | --- |
| Welcome banner `wb-theme-*` 渐变/图标色 | 切换 Appearance **不变** | Blocker |
| 左侧边栏一级目录色 / 装饰线 | 不变 | Blocker |
| success / warning / error / info 语义色 | 不变 | Blocker |
| Deep Chat terracotta（accent / 发送主按钮） | **禁止**被 global primary 顶替 | Blocker（R6） |
| PPC `.ppc-hero` emerald/teal | 不变 | Blocker（R5） |
| App Center 总览 purple、Hub orange、SOPs 总览/子页归属 | 大体稳定 | Blocker |
| megaMenu 模块玻璃色（仍 blue 等） | 可仍蓝；**≠** Appearance 失败 | Ownership / Info |

### 2.3 Informational（允许不变或噪声）

| 项 | 处理 |
| --- | --- |
| 业务内 `bg-blue-*` / `text-blue-*` | 可变可不变；**不**记 visual Fail |
| 总览营销卡 shadow / scale | 可不跟 Appearance |
| Settings 面板局部仍旧蓝 accent | 记债（X6），首批不挡 default↔minimal 壳层结论 |
| 动态内容（时间、结果列表、toast） | mask 或避开；禁止进 baseline 敏感区 |

### 2.4 Diff 解读口诀

```text
default 与 minimal 成对对比时：
  壳层 primary/focus 几乎无差  → 若 selector 已 token 化 → FAIL（Must change 缺失）
  banner / 侧栏 / terracotta / ppc-hero 有明显归属漂移 → FAIL（ownership）
  仅业务 blue-* 工具条未变 → PASS with debt（D6 Info）
  dark 叠层后 primary 与 appearance「谁赢」异常 → 记 Phase 1 风险，单独 E3/E4 行
```

---

## 3. Tooling options：Playwright screenshots vs 仅手动 XO

### 3.1 选项对比

| 选项 | 做法 | 优点 | 风险 / 成本 | D12 建议 |
| --- | --- | --- | --- | --- |
| **A. 仅手动 XO** | 按 xo-signoff §3 30 分钟脚本；人工截图归档 | 零 flaky；适合主观 L1/L7 | 不可重复；无 PR 门禁 | **明日首批必做**（闭环未签视觉） |
| **B. Playwright `toHaveScreenshot`** | 扩展 `tests/visual` 或新建 `tests/visual/theme-appearance*.spec.ts`；`npm run test:visual` / `test:visual:update` | 可重复；与现有 pixelmatch / threshold 栈一致 | 字体/OS/动画 flaky；需 mask 与稳定 wait | **第二步**：首批 8 张人工通过后，再固化同 8 张为 baseline |
| **C. 混合（推荐路径）** | 人工定「真相」→ Playwright 锁壳层/归属关键帧；computed style e2e 补契约 | 体验 + 回归 | 文档与命名要统一 | **D12 默认策略** |
| **D. 仅 DOM/CSS 断言** | `getComputedStyle` primary / `wb-theme-*` class | 低 flaky | **看不见**渐变/terracotta 质感 | 作辅助，**不替代**截图 |

### 3.2 现有资产（勿重复造轮）

| 资产 | 用途 |
| --- | --- |
| `npm run test:visual` | 跑 `tests/visual` |
| `npm run test:visual:update` | `--update-snapshots` 更新基线 |
| `tests/visual/visual.test.ts` | 页面/组件截图；**尚无** appearance 轴 |
| `tests/visual/threshold-config.ts` | STRICT/STANDARD 等；theme 对拍建议 **STRICT** 壳层、**STANDARD** 全页 |
| `docs/testing/visual-regression-testing.md` | 阈值、mask、更新流程 |
| **无** workflow 跑 visual | 见 §4 |

### 3.3 截图前稳定化清单（A/B 共用）

1. Viewport **1280×720**；Chrome/Chromium 固定渠道。  
2. `animations: 'disabled'`（Playwright）或等价减少动效。  
3. 从已知 `default` + light 启动；切换后等一帧布局。  
4. Mask：`.timestamp`、toast、动态结果区、`[data-dynamic="true"]`。  
5. 记录 build SHA、浏览器、`data-appearance` / `data-color-mode`。  
6. Dark 可选：先设 color mode，再设 appearance；确认二者并存再截。

---

## 4. CI placement recommendation（只建议，不实现）

### 4.1 现状

| 通道 | Appearance 视觉 |
| --- | --- |
| `ci:quality` / hardcode-baseline | 代码债门禁，**非**截图 |
| `test:e2e:smoke` / smoke-e2e job | 路由可达，**无** theme 色差 |
| `test:visual` | 本地脚本存在；**.github/workflows 未挂 visual job**（2026-07-26 核验） |

### 4.2 推荐落点（分期）

| 阶段 | 放置 | 触发 | 门禁强度 |
| --- | --- | --- | --- |
| **Now** | 不进 CI | 本地 / XO PR 附件 | 人工 Pass 表 |
| **Phase A（有 8 张稳定 baseline 后）** | 可选 job `visual-theme` 或在现有 workflow 加 **manual / path-filter** 步骤：`npm run test:visual -- tests/visual/theme-...` | `workflow_dispatch` + PR labels `theme` / 改 `themeConfig`、壳层 CSS、Settings Appearance | **non-blocking** 先出 artifact |
| **Phase B** | 与 smoke **分离**的 job（避免拖垮 release-smoke） | PR to main + nightly | blocking 仅限 **theme 路径** 变更；全量 PR 仍 optional |
| **明确不推荐** | 塞进 `release-smoke` 同步阻塞 | — | flaky 会误杀发布；smoke 应保持「能开不炸」 |

### 4.3 CI 工程注意（若日后接）

- Runner 与本地 **同 OS 字体策略**（文档已提示 Docker/固定浏览器）；Windows runner 与开发机不一致时优先 **Linux + 固定 Playwright 镜像**。  
- 失败上传：`test-results/` + diff PNG artifact。  
- 基线更新：仅允许明确 PR（`test:visual:update`）+ Visual QA / XO 过目，禁止静默 refresh。  
- 阈值：全页 STANDARD；壳层组件 STRICT；dark 可单独调松 1 级。

---

## 5. Naming convention for baselines

### 5.1 文件名模式

```text
theme__{routeId}__{routeSlug}__{appearance}__{colorMode}__{viewport}[__{region}].png
```

| 段 | 取值 | 例 |
| --- | --- | --- |
| `routeId` | `r1` … `r9` | `r4` |
| `routeSlug` | kebab | `keyword-hunter` |
| `appearance` | `default` \| `minimal` \| … | `minimal` |
| `colorMode` | `light` \| `dark` | `light` |
| `viewport` | `desktop` \| `tablet` \| `mobile` | `desktop` |
| `region`（可选） | `full`（默认省略）· `shell` · `banner` · `sidebar` · `focus` · `settings-panel` | `banner` |

**示例**:

```text
theme__r4__keyword-hunter__default__light__desktop.png
theme__r4__keyword-hunter__minimal__light__desktop.png
theme__r6__deep-chat__minimal__light__desktop__banner.png
theme__r7__settings-appearance__minimal__dark__desktop.png
```

### 5.2 目录建议

```text
tests/visual/theme-baselines/          # 或 Playwright 默认 *-snapshots/ 下分 theme/
  light/
    default/
    minimal/
  dark/                                 # optional
    default/
    minimal/
```

人工 XO 归档（非测试 runner）:

```text
docs/screenshots/theme-d12/YYYY-MM-DD/
  theme__r4__...png
  MANIFEST.md                           # SHA、浏览器、操作步骤
```

### 5.3 用例 / 测试名（Playwright scaffold）

**Scaffold 快照名**（已落地，短形）:

```text
theme-default-light-settings-appearance.png
theme-minimal-light-settings-appearance.png
theme-default-light-keyword-hunter.png
theme-minimal-light-keyword-hunter.png
theme-default-light-home.png
theme-minimal-light-home.png
theme-default-light-app-center.png
theme-minimal-light-app-center.png
theme-default-light-scraper.png
theme-minimal-light-scraper.png
theme-default-light-promptlab.png
theme-minimal-light-promptlab.png
theme-default-light-ppc-search-terms.png
theme-minimal-light-ppc-search-terms.png
theme-default-light-sops-overview.png
theme-minimal-light-sops-overview.png
theme-default-light-amz-hub-overview.png
theme-minimal-light-amz-hub-overview.png
theme-default-light-deep-chat.png
theme-minimal-light-deep-chat.png
theme-default-light-skills.png
theme-minimal-light-skills.png
theme-default-light-npi-tracker.png
theme-minimal-light-npi-tracker.png
```

**用例标题**:

```text
theme appearance: settings-appearance default light desktop
theme appearance: keyword-hunter minimal light desktop
theme appearance: app-center default light desktop
theme appearance: scraper minimal light desktop
theme appearance: ppc-search-terms default light desktop
theme appearance: sops-overview default light desktop
theme appearance: amz-hub-overview default light desktop
theme appearance: deep-chat default light desktop
theme appearance: deep-chat minimal light desktop
theme appearance: skills default light desktop
theme appearance: skills minimal light desktop
```

全量主包仍建议 §5.1 长形 `theme__r*__…`；scaffold 用短形以免与 generic visual 冲突。  
契约类 e2e 仍用非截图名（如 smoke ownership）。

### 5.5 Opt-in scaffold （已落地 · 2026-07-26）

| 项 | 值 |
| --- | --- |
| 文件 | `tests/visual/theme-appearance-scaffold.test.ts` |
| 开关 | `THEME_VISUAL=1`（缺省 / 非 1 → **整套 skip**） |
| 命令 | `npm run test:visual:theme` · `npm run test:visual:theme:update` |
| 屏 | Settings Appearance、Keyword Hunter、Home、**App Center**、**Scraper**、**PromptLab**、**PPC Search Terms**、**SOPs overview**、**Amazon Hub overview**、**Deep Chat**、**Skills**、**NPI Tracker** × default/minimal × light = **24**（12×2；Skills + NPI 为 R1–R9 主包外的 D6 样本） |
| Ownership 注意 | App Center 多色总览 / Scraper indigo / PromptLab indigo / PPC emerald / SOPs overview / Amazon Hub orange / Deep Chat terracotta send / Skills violet catalog / NPI growth banner **不得**被 Appearance primary 吞掉；terracotta / Skills violet / NPI growth **不**当 primary 断言 |
| 基线仓库 | **不提交**（`tests/visual/.gitignore` 忽略 `theme-appearance-scaffold.test.ts-snapshots/`） |
| CI | **不挂**；**不** fail-closed；**不**塞 release-smoke |
| 等价签收？ | **否** — 仅骨架；人工首 8 张 XO 仍 required |

**Playwright 稳定化步骤**（scaffold 已做）:

1. Viewport 1280×720；`animations: 'disabled'`
2. `addInitScript` 写入 `app-theme` / `app-color-mode`（JSON 字符串，对齐 StorageService）
3. 导航后断言 `html[data-appearance]` / `data-color-mode=light`
4. Settings 屏：`#nav-more` → 全局设置 → 外观与体验
5. Mask 动态区；STANDARD 全页阈值
6. 更新基线仅本地：`npm run test:visual:theme:update`

### 5.4 禁止

- 无 appearance 段的笼统 `keyword-hunter-desktop.png` 混进 theme 轴（与现有 generic visual 冲突）。  
- 用 `data-theme=dark` 当 appearance 文件名（color mode 与 appearance **分槽**）。

---

## 6. First 8 screenshots to capture (human XO readiness)

> ### 截图 ≠ Pass
>
> | 说法 | 是否成立 |
> | --- | --- |
> | 落盘 8 张人工截图 | **不等于** visual Pass / 主题 RC 签收 |
> | `THEME_VISUAL=1` scaffold 跑出 24 张 | **不等于** 人工真相；**不**进 blocking CI |
> | 本清单勾完 | 只保证「能拍、能对、能写 XO 记录」 |
>
> **交叉引用**: 人类 XO 30 min 脚本
> [`theme-system-xo-signoff-status.md` §3](./2026-07-26-theme-system-xo-signoff-status.md#3-人类-xo-30-分钟手动浏览器脚本)。

**目标**: 用最少 8 张覆盖 XO 核心（Settings 切换、KH/PPC 归属、Deep Chat terracotta、Home 壳层）；对齐当前 scaffold **12×2=24** 屏名空间，但不把 24 张都当人工首批。

### 6.1 Scaffold 12 屏 ↔ 人工首 8（对照）

Scaffold 顺序（与 `theme-appearance-scaffold.test.ts` 一致）:
**settings · KH · home · app-center · scraper · promptlab · ppc · sops · hub · deep-chat · skills · npi**。

| Scaffold slug | 首 8 角色 | 人工截图 | 备注 |
| --- | --- | --- | --- |
| `settings-appearance` | #1 default + #2 minimal | 必拍成对 | 切换起点 / Must change |
| `keyword-hunter` | #3 default + #4 minimal | 必拍成对 | ownership banner NOT |
| `ppc-search-terms` | #5 default + #6 minimal | 必拍成对 | `.ppc-hero` emerald NOT |
| `deep-chat` | #7 **minimal only** | 必拍 | terracotta 压测（最易被 primary 顶替） |
| `home` | #8 **minimal only** | 必拍 | 跨模块壳层扫读 |
| `app-center` | — | 首 8 外 | 多色总览；扫一眼 / 扩样 |
| `scraper` | — | 首 8 外 | indigo ownership |
| `promptlab` | — | 首 8 外 | indigo ownership |
| `sops-overview` | — | 首 8 外 | 总览 blue |
| `amz-hub-overview` | — | 首 8 外 | orange ownership |
| `skills` | — | 首 8 外 | violet D6 样本 |
| `npi-tracker` | — | 首 8 外 | growth D6 样本 |

**Scaffold ROI 跳过**（不占首 8、也未进 12 屏 scaffold）: **Email Templates**、**QA Maintenance** 及其他长内容/低频路由——归属信号弱、动态/copy 噪声高；需要时再扩样，**不**拉低人工首批 ROI。

**有意未进首 8（但在 scaffold 24 内）**: app-center / scraper / promptlab / sops / hub / skills / npi 的 default+minimal 对；dark 对；deep-chat default（minimal 已足以证「不被顶替」）。

### 6.2 首 8 清单（文件名 + 截什么）

| # | 人工归档名（长形 §5.1） | Scaffold 短形（对照） | Path / 定位 | Appearance | 截什么 | 为何在首 8 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `theme__r7__settings-appearance__default__light__desktop.png` | `theme-default-light-settings-appearance.png` | Settings → 外观与体验 | default | Appearance 面板 + theme select | 切换起点；对照预览 |
| 2 | `theme__r7__settings-appearance__minimal__light__desktop.png` | `theme-minimal-light-settings-appearance.png` | 同上 | minimal | 同区域切到极简后 | Must change；X1 |
| 3 | `theme__r4__keyword-hunter__default__light__desktop.png` | `theme-default-light-keyword-hunter.png` | `/#/app-center/keyword-hunter/input` | default | banner + 侧栏 + 主工具区 | ownership 基线 |
| 4 | `theme__r4__keyword-hunter__minimal__light__desktop.png` | `theme-minimal-light-keyword-hunter.png` | 同上 | minimal | 同构图 | banner NOT + 壳层可变 |
| 5 | `theme__r5__ppc-search-terms__default__light__desktop.png` | `theme-default-light-ppc-search-terms.png` | `/#/app-center/ppc-tools/ppc-search-terms` | default | 含 `.ppc-hero` | emerald 基线 |
| 6 | `theme__r5__ppc-search-terms__minimal__light__desktop.png` | `theme-minimal-light-ppc-search-terms.png` | 同上 | minimal | 同构图 | hero 不得被 primary 吞 |
| 7 | `theme__r6__deep-chat__minimal__light__desktop.png` | `theme-minimal-light-deep-chat.png` | `/#/app-center/playground/deep-chat` | **minimal** | 发送/accent 区 | terracotta 压测 |
| 8 | `theme__r1__home__minimal__light__desktop.png` | `theme-minimal-light-home.png` | `/#/home` | minimal | 首页 + 可见 chrome | 侧栏归属 NOT |

### 6.3 截取顺序（一次会话，减少切换）

```text
A. default light 会话
   1) 打开 Settings 外观 → 拍 #1
   2) 不关 Settings（或先关）→ KH → 拍 #3
   3) PPC Search Terms → 拍 #5

B. 切到 minimal（Settings 选中 + 应用）并确认 html[data-appearance=minimal]
   4) Settings 外观 → 拍 #2
   5) 刷新一次（文字记录持久化即可，不占第 9 张）
   6) KH → 拍 #4
   7) PPC → 拍 #6
   8) Deep Chat → 拍 #7
   9) Home → 拍 #8
```

**对齐 diff 读法**: #1↔#2、#3↔#4、#5↔#6；#7/#8 单张解读（minimal 压测）。

### 6.4 Filename 勾选清单（人工归档）

落盘目录: `docs/screenshots/theme-d12/YYYY-MM-DD/` + `MANIFEST.md`（SHA、浏览器、viewport、步骤）。

```text
[ ] theme__r7__settings-appearance__default__light__desktop.png
[ ] theme__r7__settings-appearance__minimal__light__desktop.png
[ ] theme__r4__keyword-hunter__default__light__desktop.png
[ ] theme__r4__keyword-hunter__minimal__light__desktop.png
[ ] theme__r5__ppc-search-terms__default__light__desktop.png
[ ] theme__r5__ppc-search-terms__minimal__light__desktop.png
[ ] theme__r6__deep-chat__minimal__light__desktop.png
[ ] theme__r1__home__minimal__light__desktop.png
```

### 6.5 执行前检查（勾选）

```text
[ ] Viewport 1280×720；动画减少 / reduced-motion 可选
[ ] 从 default light 开始；build/SHA 写入 MANIFEST
[ ] 8 张按 §6.2 长形命名落盘（不提交 binary baseline）
[ ] 成对 diff + 单张解读（§6.3）
[ ] 记录 data-appearance / data-color-mode 与文件名一致
[ ] 结论贴 XO 记录模板（xo-signoff §3）
[ ] 不声称 visual Pass；不挂 CI fail-closed；不 mint 仓库快照
```

---

## 7. Pass criteria

### 7.1 首批 8 张（明日）— 人工

| ID | 标准 | Fail |
| --- | --- | --- |
| **P-pair** | default/minimal 成对页构图一致（滚动位置、面板开合） | 构图不可比 |
| **P-shell** | #1→#2 可见壳层/预览向 slate 工业档偏移（或明确标 D6 未 token 化） | 已 token 化控件完全无差且无债务说明 |
| **P-own-kh** | #3↔#4：`wb-theme-fuchsia` / 侧栏 KH 色不跟 Appearance 灰化 | banner 变灰/变蓝主叙事 |
| **P-own-ppc** | #5↔#6：`.ppc-hero` emerald/teal 稳定 | hero 被 primary 染成工业主色 |
| **P-own-dc** | #7：terracotta accent/发送仍在；非 global primary | terracotta 被顶替 |
| **P-own-home** | #8：侧栏模块色稳定；splash 不要求跟 Appearance | 归属全局一套灰 |
| **P-attr** | 截图时刻 `data-appearance` 与文件名一致 | 属性与 UI 不一致 |
| **P-debt** | D6/Settings 旧蓝仅记 Informational，不伪装 Pass 全站 token | 把「还蓝」写成 Appearance 坏了或反过来瞒债 |

**首批结论枚举**（与 XO 一致）:

- **PASS** — 上表无 Fail  
- **PASS with debt** — 仅 D6 / Settings accent Info  
- **FAIL** — 任一 ownership Blocker 或 token 化壳层应变更未变  

### 7.2 满配 18 张 light 主包 — 人工或 Playwright

| 标准 | 说明 |
| --- | --- |
| 每路由 E0/E1 成对存在 | 命名符合 §5 |
| 全路由 ownership 抽检无 Blocker | 矩阵 §4.1 |
| Playwright 若启用 | diff ≤ 该页阈值；无未 mask 动态噪声导致的红 |
| 更新基线 | 仅有意 UI 变更 + 双人（开发 + Visual QA/XO）确认 |

### 7.3 Dark 可选层

| 标准 | Fail |
| --- | --- |
| `data-color-mode=dark`（或 `.dark`）与 `data-appearance` 并存 | applyTheme 冲掉 dark |
| terracotta / banner 归属在 dark 下仍可辨 | 归属被 primary 或错误 token 吞没 |
| 不与 light baseline 直接像素对比 | 应用 dark 自己的 baseline 目录 |

### 7.4 与签收分层关系

| 门禁 | 本文产出能否关闭 |
| --- | --- |
| Tech Lead code gates | **否**（本文不替代） |
| XO 视觉签收 | **首批 8 张 + 记录模板** 可支撑「部分视觉 Pass」；**未**自动等于全站 18+dark Pass |
| 主题 RC 体验 | 需 XO 明确签字；D12 只提供基线方法与首批范围 |

### 7.5 完成定义（D12 文档 + scaffold）

- [x] Snapshot matrix 写清 light 18 + dark optional 18  
- [x] Must change / NOT / Info 归属规则  
- [x] Tooling A/B/C 与现有 `test:visual` 关系  
- [x] CI 分期建议（**仍未**挂 blocking job）  
- [x] 命名约定  
- [x] 首 8 张人工清单（§6：对齐 scaffold 12 屏名空间 + 截取顺序 + 文件名勾选 + **截图≠Pass**）  
- [x] Pass / Fail 标准  
- [x] **Opt-in scaffold**（12 屏 × 2 appearance = **24**；含 PromptLab + Deep Chat + Skills catalog + NPI Tracker；`THEME_VISUAL=1`；基线 gitignore）

**仍不在 D12 范围**: 提交 binary baseline、挂 CI fail-closed、宣称 visual Pass、塞 release-smoke。

---

## 8. 摘要

| 项 | 值 |
| --- | --- |
| 文档 | `docs/superpowers/plans/2026-07-26-theme-visual-baseline-d12.md` |
| Light 主包快照 | **18**（9×2） |
| Dark 可选 | **+18** |
| **人工首批** | **8**（§6 顺序/文件名/截图≠Pass；Email·QA 跳过） |
| 工具 | 人工 XO 定真相 → Playwright `test:visual:theme` 固化；smoke 不塞截图 |
| Scaffold | **24** 张 opt-in（settings / KH / home / app-center / scraper / promptlab / ppc / sops / hub / deep-chat / skills / npi × default/minimal light） |
| CI | 先 local/artifact；**未**挂 job；稳定后独立 non-blocking → path-filter blocking |
| 当前视觉签收 | 仍依赖人类；D12 = 计划 + scaffold，**非** Pass |

**一句话**: 用 **18** 张 light 主包 + scaffold 扩样（现 **24**）、**8** 张人工 XO（截图≠Pass）；永不让 visual flaky 绑架 release-smoke。
