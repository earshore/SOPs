# 企业级主题系统重构蓝图：主题 = 浅色/深色/系统

**日期**: 2026-07-26  
**状态**: T0–T3 **Done** · T4 **Done（桥接方案）** — utility-bridge 生成器把源码内全部浅色工具类映射为深色语义（浅色零改动），配合逐模块审查修复（sops/amz/more/MA/KH/PPC/DeepChat/settings）· 默认 system **Done** · 整屋调光过渡 **Done** · T5 Open（视觉矩阵门禁）
**触发**: 产品纠正——当前将 Appearance 预设误称为「主题」，颜色模式（浅/深/系统）未达企业级一体化  
**范围**: 运行时 · Token · 壳层 · 共享组件 · 业务模块 · 设置 IA · 命名  
**关联**: `THEME_SYSTEM_GUIDELINES` · Ownership 深绑定审查 · D11/D3 债务  

---

## 0. 裁决（必须先认）

### 0.1 产品真义（用户可见）

| 中文（用户） | 含义 | 当前错误叫法 | 运行时真相 |
| --- | --- | --- | --- |
| **主题** | 浅色 / 深色 / **跟随系统** | 「颜色模式」 | `app-color-mode` · `applyColorMode` · resolved `.dark` |
| **色调 / 强调风格** | 默认 · 极简素色 · 海洋 · 森林 · … | 「主题」 | `app-theme` · `applyTheme` · `data-appearance` |
| **模块归属色** | KH rose · PPC emerald · … | 常与「主题色」混谈 | `menuConfig` / `wb-theme-*` / `sidebar-theme-*` |

**对标**：Linear / GitHub / Notion / Slack —— **Theme 永远是 Light/Dark/System**；Accent 是可选第二行。

### 0.2 架构真义（工程）

```text
Theme (Mode)     → 中性表面体系：canvas / panel / card / elevated / text / border / shadow / glass
Accent (Tone)    → 仅 --color-primary* + --color-focus-ring（壳 CTA / 链接强调）
Ownership (Biz)  → 导航与 banner 身份色相（多色 wayfinding）
Status           → success / warning / error / info
```

优先级：

```text
Status > Ownership 色相 > Accent primary > Theme 中性面
```

**Accent 不得改 Theme 表面；Theme 不得改写 Accent primary；二者都不得洗 Ownership。**

### 0.3 一句话诊断

> 运行时 **双轴骨架已有**，但产品把 **色调叫成主题**，CSS 暗色层又 **把主色硬改成 indigo**，业务模板仍是 **bg-white / text-slate 的浅色纸面帝国** —— 所以深色像「打补丁的七零八落」，没有组织级一体化，而不是「再加几个 dark 选择器」能修好的。

---

## 1. 全仓审查结论摘要（多代理）

### 1.1 运行时 / Color Mode

| 项 | 状态 |
| --- | --- |
| preference vs resolved | API 正确 |
| system + matchMedia | 有 |
| applyTheme 不擦 .dark | 单测覆盖 |
| **FOUC 首屏** | **P0 无 head 同步脚本；critical.css 锁浅色** |
| **暗色 token 写 primary→indigo** | **P0 Theme 踩 Accent** |
| prefers-color-scheme 孤岛 | **P0** badges / welcome-banner / 部分 sops |
| 模式切换过渡 | 无（仅 Accent 有 200ms） |
| 默认 | `light`（企业常见 `system`） |
| `app-color-mode` 进导出键 | 缺失 |
| 设置层级 | **主题=色调在前，模式在后**（倒置） |

### 1.2 Token / 表面

| 项 | 状态 |
| --- | --- |
| 语义 surface/text/border 暗色块 | 有基础 |
| 暗色 elevation | panel/card 易塌平 |
| 双词汇 | `--surface-*` / `--color-bg-*` / 组件本地 `--settings-*` |
| 组件 | toast 最好；settings/welcome/modal 碎片化 |
| 业务模块 HTML | **0 `dark:`**；`bg-white`×875+ / `text-slate-*`×3400+ |

### 1.3 壳层

| 面 | 一体化暗色 | 说明 |
| --- | --- | --- |
| Toast | 优 | 语义 token 范本 |
| Header/mega | 补丁式 | 玻璃白字面 + 局部 tri-selector |
| Sidebar | 差 | Tailwind 浅色 + ownership soft 仅适合 light |
| Settings 抽屉 | **极差** | 整板浅色岛 |
| Home 浮动 | 差 | 白玻璃 |
| Modals | 中–差 | 半 token 半白 |

### 1.4 业务模块（覆盖缺口量级）

| 区 | 缺口 | 最差密度 |
| --- | --- | --- |
| sops 页面 | ~96% 浅色硬编码 | growth/service 模板 |
| more | ~100% | skills / scenarios |
| amz_hub | 模板浅色 + CSS 桌面补丁 | quality_listing |
| MA / KH / PromptLab | 高 | tool 白卡 |
| Deep Chat | 注入 hex | 独立债 |
| app_center shell | 相对好 | overview 语义 var |

### 1.5 命名 / 设置 IA

设置现序：**「主题」= 色调 select →「颜色模式」= 真主题**。  
与 Linear/GitHub **完全相反**，是理解缺陷的 UI 固化。

---

## 2. 目标产品与技术模型

### 2.1 设置 IA（用户可见）

```text
外观与体验
├── 主题          [ 浅色 | 深色 | 跟随系统 ]     ← 主控件 · 大分段
│                 跟随系统时展示：当前为深色/浅色
├── 色调          [ 默认 | 极简素色 | 海洋 | … ] ← 次控件 · 强调色
│                 仅全局强调；不改变模块归属色
└── 动画与动效    …
```

### 2.2 DOM / 存储（渐进，先行为后改名）

**Phase 行为正确（不强制立刻改 key 名）:**

| 轴 | 存储（现状可保留） | DOM | 写入者 |
| --- | --- | --- | --- |
| 主题 | `app-color-mode` | `data-color-mode` + `data-color-mode-resolved` + `.dark` + `color-scheme` | `applyColorMode` |
| 色调 | `app-theme` | `data-appearance`（compat `data-theme`=色调 id） | `applyTheme` |

**远期更干净命名（可选迁移）:**

| 产品 | 存储 | DOM |
| --- | --- | --- |
| 主题 | `app-theme-mode` | `data-theme-preference` + `data-theme`=resolved |
| 色调 | `app-accent` | `data-accent` |

一期内双读旧 key。

### 2.3 Token 所有权（铁律）

```text
Theme(resolved dark|light)
  拥有: --surface-*, --color-bg-*, --color-text-*, --color-border-*,
        --border-*, 中性 --shadow-*, scrollbar, shell-glass, color-scheme
  禁止: --color-primary*, --color-focus-ring, --own-*

Accent(data-appearance)
  拥有: --color-primary*, --color-focus-ring, --shadow-primary-*
  禁止: 表面 / ownership / status

Ownership
  拥有: --own-* 或 wb/sidebar 配方色相
  禁止: 全局 canvas

Status
  拥有: success/warning/error/info
```

**立刻要删的错误：** `variables.css` 暗色块把 `--color-primary*` / focus 写成 indigo。

### 2.4 壳层配方（Theme 拥有）

| Token | 用途 |
| --- | --- |
| `--shell-surface` | header / mega 面板 / settings 抽屉底 |
| `--shell-surface-glass` | color-mix(surface) + blur |
| `--shell-border` / `--shell-text` / `--shell-muted` | 导航中性 |
| `--shell-scrim` | modal backdrop |

Header / mega 面板 / settings / home dock / modal **只许**用 shell/surface，禁止再发明 `rgba(255,255,255,0.92)`。

### 2.5 Ownership（不变产品目标）

- mega / sidebar / banner **保持多色 wayfinding**  
- Theme 只调 soft/border **明度**，不改色相  
- 见 `2026-07-26-theme-ownership-surfaces-deep-review.md` O2 `--own-*`

### 2.6 企业启动序列（消 FOUC）

```text
1. <head> 同步脚本：读 app-color-mode → resolve system → 写 marker + color-scheme
2. critical.css 仅用语义 surface/text（禁止锁死 slate-50 body）
3. 首屏按主题正确绘制
4. JS hydrate ThemeManager；data-theme-ready=1 后允许过渡
5. 再 restore 色调（primary vars），绝不擦 mode
```

### 2.7 切换体验

| 动作 | 体验 |
| --- | --- |
| 改主题（浅/深/系统） | 全站中性面丝滑切换；可选 150ms color transition；首屏禁止 transition |
| 改色调 | 仅 primary/focus/壳 CTA 变；模块身份色不动 |
| 系统主题变化 | preference=system 时跟随 OS，无整页闪白 |

---

## 3. 分阶段路线图（企业生产级）

### Phase T0 — 认知与契约钉死（本周 · 低风险）

- [x] 本蓝图  
- [x] 宪法顶部 **产品用语表**（主题=Mode，色调=Accent）  
- [x] 设置文案与顺序：主题在前、色调在后（**仅 copy/IA，不改存储 key**）  
- [x] 色调 description 去掉「主题」歧义  

**状态:** **Done**（`a87895b7` redefine theme/accent）  
**验收:** 用户打开设置，第一眼选浅/深/系统叫「主题」。

### Phase T1 — Theme 轴诚实（P0 技术 · 高收益）

1. [x] **删除暗色块对 primary/focus 的 indigo 覆写**（primary stomp） — `c19cc6c6`  
2. [x] **Head 同步主题脚本 + critical 语义化**（灭 FOUC） — `9db508ba`  
3. [x] `prefers-color-scheme` 孤岛 → `data-color-mode-resolved` — `ee599bb5`  
4. [x] `app-color-mode` 进入 export/CONFIG_KEYS — `f1a1dd00`  
5. [x] 默认新用户 → `system`（可配置）  
6. [x] 模式切换：`color-scheme` + 可选短过渡（bootstrap / critical / `data-theme-ready`）  

**状态:** **Done**（全 6 项）  
**验收:**  
- 冷启动 dark/system→dark **零浅色闪**  
- `minimal + dark` primary 仍是 slate 系，**不是 indigo**  
- 强制浅色 + OS 深色：banner/badge 不跟 OS 瞎变  

### Phase T2 — 壳层一体化（Theme 表面）

优先级：Settings 抽屉 → Header/mega 中性面 → Sidebar 中性壳 → Home 浮动 → Modal  

- [x] Settings 抽屉（`b9f40bff`）  
- [x] Header/mega 中性面（`4e768321`）  
- [x] Sidebar 中性壳（`808b4f08`）  
- [x] Home 浮动 + Modal（`bee360ba`）  
- [ ] Ownership soft 双明度（侧栏 active 不再浅色粉岛）  
- [ ] 全壳层 elevation / border 统一收口 + 体验签收  

**状态:** **Done** — settings / header / sidebar / home / modal 已走 dual-theme surface；Ownership soft 双明度与统一签收仍 open（不阻壳层主面落地）  
**验收:** 设置/侧栏/顶栏在深色下像同一产品，不是白岛+补丁。

### Phase T3 — 共享组件「一个设计系统」

参照 toast 标准：forms 本地 token 进全局 Theme 图；secondary button hover；timeline 白边；loading skeleton。  

- [x] forms 双主题 field token（`3c697fc3`）  
- [x] secondary button surfaces（`ad754b8d`）  
- [x] `.ui-card` 语义原语 + 样本页（`d41f99ea` + 后续迁移）  
- [ ] timeline 白边  
- [ ] loading skeleton  
- [ ] 组件 scorecard 全面提升  

**状态:** **Partial** — forms / secondary buttons / ui-card primitive + samples 已落地；timeline / skeleton / scorecard 仍 open  
**验收:** 组件 scorecard 从 ~6/10 → ≥8.5/10。

### Phase T4 — 业务内容表面工业化

按量：sops → more → amz_hub → MA/KH/PromptLab → Deep Chat  

- 禁止新 `bg-white`/`text-slate-*` 作表面/正文（lint 门）  
- 引入 `.ui-card` / `.ui-panel` 语义原语  
- 淘汰 amz 仅桌面 cardization 补丁  

已迁移样本：  
- [x] more skills / workflows（`f151e180`）  
- [x] sops `competitor_monitoring`（`f151e180`）  
- [x] amz knowledge 样本（eu_insights / seo_strategy，`53f20d02`）  
- [ ] app center（未落地）  
- [ ] 其余 Top 模板与 lint 门  

**状态:** **Partial** — more skills/workflows、sops competitor_monitoring、amz knowledge 样本已走 ui-card；app center 与大面积业务页仍 open  
**验收:** Top 20 最差模板改完后，Dark 下无大面积白卡。

### Phase T5 — Ownership palette 包 + 门禁

- `--own-*` SSOT；mega/sidebar/banner 收敛  
- 视觉矩阵：**Theme × Accent × 关键壳**（含 dark）  
- Agent-contract 扩展 Theme 断言  

---

## 4. 明确不做什么（防再次理解跑偏）

| 禁止 | 原因 |
| --- | --- |
| 把「默认/海洋…」继续叫用户「主题」 | 固化错误心智 |
| 用 Accent 冒充全站换肤 | D6 现实 + 运营工作台定位 |
| Dark 强制 indigo 品牌 | 毁色调轴 |
| 导航收成 `--color-primary` | 毁归属 wayfinding |
| 一次性改完所有 SOP HTML | 应分波 + 门禁 |
| 用 `prefers-color-scheme` 当 app 主题 | 无视用户强制浅/深 |

---

## 5. 成功标准（企业生产级 Definition of Done）

1. **用户语言**: 「主题」= 浅/深/系统；「色调」= 强调风格。  
2. **冷启动**: 任意保存的主题下 **无错误主题闪烁**。  
3. **正交**: Theme × Accent 任意组合，Accent 色相不被 Theme 劫持；Ownership 色相不被二者洗掉。  
4. **一体化**: 壳 + 设置 + 主工具在深浅下同一 elevation / 边框 / 字体阶。  
5. **内容**: 新页面默认语义表面；旧页分波清零白卡。  
6. **门禁**: smoke + visual 覆盖 **Theme×Accent**；export 含主题偏好。  
7. **体感**: 切换主题「整屋调光」；切换色调「点缀换强调」——而非「七零八落的局部 CSS」。

---

## 6. 与既有工作的关系

| 既有 | 关系 |
| --- | --- |
| A2 / Appearance 样本 FREEZE | **兼容**：色调样本可停；**Theme 轴是新主战场** |
| Ownership 深审查 | **输入**：B 层 palette 管理 |
| Agent-contract XO | 证明 A 不冲 B 类级；**不**证明 Theme 一体化 |
| D11 tri-selector | 过渡手段；终态靠 **Token 驱动** 减少补丁 |

---

## 7. 建议立即开工顺序（工程）

```text
T0 设置 IA + 宪法用语
T1-1 删 dark primary 覆写          ← 最大「色调在深色下胡说」修复
T1-2 head FOUC 脚本 + critical
T1-3 prefers 孤岛迁移
T2 Settings 抽屉语义化             ← 最大「打开设置像另一产品」修复
T2 Sidebar/Header 中性壳
T4 选 1 条 SOP 竖切证明模式
```

---

## 8. 审查证据索引

多代理 2026-07-26 并行审查覆盖：

- Color Mode 运行时 / FOUC / primary-stomp  
- 壳层碎片化 map  
- 模块浅色硬编码矩阵与 Top 20 文件  
- 组件 scorecard（toast 9 → settings 3）  
- Token 分层与 elevation 塌陷  
- 命名与 Linear/GitHub IA  

细节可回放各审计会话；**本文件为裁决 SSOT**。

---

**结语：**  
企业级主题系统不是「再做几个 Appearance 皮肤」，而是 **把浅色/深色/系统做成完整、可预测、全表面一致的第一主题轴**，色调只作强调旋钮，归属色作业务 wayfinding。当前最大缺陷是 **认知倒置 + Theme 表面未工业化 + CSS 暗色劫持品牌色**。按 T0→T5 推进，才能达到「组织一体化」而非「补丁集合」。
