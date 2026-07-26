# Local Token Prefix Lifecycle (D9)

Date: 2026-07-26  
Debt: **D9 (P2)** — 局部 token 前缀多，缺「升全局 / 归档」生命周期  
Related:

- [主题系统企业级审查与收敛路线图 §2.2 D9](../specs/2026-07-26-theme-system-enterprise-audit-and-roadmap.md)
- [THEME_SYSTEM_GUIDELINES §6](../../THEME_SYSTEM_GUIDELINES.md)
- [Token Override Inventory (D1)](./2026-07-26-token-override-inventory.md)
- CSS 命名门：`scripts/quality/audit-css-variables.ts`（`NAMING_PATTERNS`）

**本交付范围（docs only）**: 登记已知前缀、决策规则、PR 清单与 D1 关系。  
**Non-goal**: 本 PR **不做** 大批量 CSS 重命名、不升全局、不删死前缀代码。

---

## 1. Problem statement

主题收敛后，模块与组件仍有大量 **局部 CSS 变量前缀**（`--ppc-*`、`--app-overview-*`、`--wb-*`、`--deep-chat-*`、`--ma-*`…）。宪法 §6 已要求「新增前先回答三问 + 映射到全局 token」，并登记了部分高扩散来源，但仍缺：

1. **生命周期**：何时 **elevate** 到全局 / 共享组件 token，何时 **keep local**，何时 **archive**。
2. **可审计库存**：文档示例（如 `--ppc-hero-*`、`--kh-status-*`）与仓库 **实际命名**（如 `--ppc-search-terms-*`、`--keyword-hunter-status-*`）可能漂移。
3. **与 D1 边界**：局部前缀 **不是** atomic override；不得用局部前缀绕过 `token:override-audit` / allowlist。

结果：作者倾向新造前缀；共享语义（surface / radius / focus）在多个模块重复定义；死前缀无人归档。

**D9 目标（文档门）**: 任何新前缀必须可对照本文件决策；升全局 / 归档有明确触发条件；**不**借 D9 做 rebrand 级 rename。

---

## 2. Inventory of known local prefixes (`src/`)

盘点方法（2026-07-26）：`src/**/*.css` 变量引用 + `audit-css-variables.ts` 的 `NAMING_PATTERNS` module/component 条。  
计数为「匹配次数」量级，用于判断扩散，**非**唯一 token 数精确基线。

### 2.1 Module / brand local（优先 keep local）

| 前缀 | 角色 | 示例路径 | 备注 / 生命周期倾向 |
| --- | --- | --- | --- |
| `--ppc-*`（现网多为 `--ppc-search-terms-*`） | PPC Search Terms 工作区 / hero 壳 | `src/modules/app_center/views/ppc_tools/style.css`；`…/ppc_search_terms/styles/style.hero.shell.css` 等 | 单工具交互模型 + emerald 业务强调；**keep local**。文档旧称 `--ppc-hero-*` 以代码为准 |
| `--app-*`（含 `--app-overview-*`、`--app-recent-*`、`--app-card-*`） | App Center 总览 / 最近使用 | `src/modules/app_center/app_center_style.css` | 总览品牌面；surface 族若再被第二模块复制 → 考虑 elevate 语义别名 |
| `--deep-chat-*` | Deep Chat / Playground 会话 UI（terracotta 品牌） | `src/modules/app_center/views/playground/styles.css` | **单模块品牌**；**禁止**把 terracotta 引擎升全局；shell focus 已部分跟 Appearance（D6 样本） |
| `--ma-*` | Master Analysis 工作台 accent | `…/master_analysis/master_analysis_style.css`；`…/ai_analysis/ai_analysis_style.css`；`…/scraper/scraper_style.css` | MA 子树共用 → **模块内共享**，非全局；勿拆成多个前缀 |
| `--scraper-*` | Scraper 工作区表面 | `…/scraper/scraper_style.css` | 窄面（border/radius/surface）；**keep local** 或逐步映射 `--workbench-radius` / surface |
| `--keyword-hunter-*` / `--keyword-status-*` | Keyword Hunter 状态 / 报告 | `src/modules/app_center/views/keyword_hunter/styles.css` | 文档示例 `--kh-*` **未**在 CSS 中作为主前缀；代码用长名。**keep local**；勿无消费者再引入 `--kh-*` 平行族 |
| `--module-*` | 跨模块轻量 accent 桥 | `src/css/foundation/variables.css`；`app_center_style.css` 等 | 已偏共享语义；新增属性优先复用，勿扩成第三套 primary |
| `--sop-*` / `--sops-*` / `--brand-risk-*` | SOPs 卡片 / 状态 / 专题色 | `src/modules/sops/sops_style.css`；`src/css/components/cards.css` 等 | 业务专题；**keep local**；`--sops-qwen-*` 等案例色不得进 Appearance |

### 2.2 Shared component namespaces（已是「组件级全局」）

这些前缀由 `src/css/components/*` 或壳层消费，**≥2 路由 / 壳层** 使用；**不**算模块私有前缀，也 **不** 要求再 elevate 到 `design-tokens` 原子层，除非出现与 D1/D2 冲突的同名原子覆盖。

| 前缀 | 角色 | 示例路径 |
| --- | --- | --- |
| `--wb-*` | Welcome Banner 组件几何 / theme accent / 装饰 | `src/css/components/welcome-banner.css`（多模块模板挂 `wb-theme-*`） |
| `--settings-*` | 系统设置壳 | `src/components/settings/systemSettings.css` |
| `--sidebar-*` | 侧栏主题槽 | `src/css/components/sidebar-renderer.css` 等 |
| `--overview-card-*` | 总览入口卡 | `src/css/components/cards.css` |
| `--button-filter-*` | 筛选按钮组件 | `src/css/components/buttons.css` |
| `--panel-*` / `--callout-*` / `--field-*` 等 | 共享组件几何与语义 | `variables.css` + components |

### 2.3 Audit allowlist of **names**（`css:audit`）

`scripts/quality/audit-css-variables.ts` 已允许下列 **模块** 模式（节选）。**允许命名 ≠ 鼓励增生**；新前缀仍须走 §4 PR 清单，并同步本表 + 必要时扩展 `NAMING_PATTERNS`。

| Pattern key | Regex（摘要） |
| --- | --- |
| `moduleAppCenter` | `--app-[\w-]+` |
| `modulePpcTools` | `--ppc-[\w-]+` |
| `moduleKeywordHunter` | `--(kh\|keyword)-[\w-]+` |
| `moduleScraper` | `--scraper-(border\|radius\|surface)` |
| `modulePlayground` | `--playground-[\w-]+` |
| `moduleMasterAnalysis` | `--ma-[\w-]+` |
| `moduleDeepChat` | `--deep-chat-[\w-]+` |
| `moduleAccent` | `--module-[\w-]+` |
| `moduleSops` | `--(sop\|sops\|brand-risk)-[\w-]+` |
| `componentWelcomeBanner` | `--wb-[\w-]+` |

**漂移提示**:

- `--playground-*`：audit 允许；现网 Deep Chat 主用 `--deep-chat-*`。新代码优先既有 `--deep-chat-*`，勿平行新建 `--playground-*` 族除非独立预览层且清单通过。
- `--kh-*`：audit 允许；现网主用 `--keyword-hunter-*` / `--keyword-status-*`。不要无迁移地双写两套。

### 2.4 疑似 archive 候选（本 PR **只登记不删**）

**Inventory skim（`src/`，2026-07-26）**: 对几个已登记 / 漂移前缀做了 0-consumer 抽样；**不删 CSS**。

| 候选 | `src/` 状态 | 条件 | 动作（未来 PR） |
| --- | --- | --- | --- |
| `--ppc-hero-*` | **0** 声明 / **0** 消费（仅 docs 示例） | 文档-only | 定义文档改指 `--ppc-search-terms-*`；勿再教新代码使用 |
| `--kh-*` / `--kh-status-*` | **0** 声明 / **0** 消费（仅 docs + audit regex） | 文档-only；实网为 `--keyword-hunter-*` / `--keyword-status-*` | 更新定义示例；勿并行引入；整前缀死亡后可从 `NAMING_PATTERNS` 去掉 `kh` 分支 |
| `--playground-*` | **0** 声明 / **0** 消费（audit 允许；现网 `--deep-chat-*`） | 空允许名 + docs 示例 | 优先写 `--deep-chat-*`；若无独立预览层需求，可 archive docs 示例并考虑收紧 audit pattern |
| 模块内重复 surface/radius/focus 别名 | 未本波次全量核对 | 已 100% 等于 `--surface-*` / `--workbench-radius` / `--color-focus-ring` 且无覆写点 | 可就地删别名或改为注释映射；**分模块小 PR** |
| 废弃交互残留 | 未发现 | 功能下线后 0 引用 | 删声明 + 从本节 inventory 移入「Archived」附录 |

**本次 skim 仍有消费（非 archive）**: `--ppc-search-terms-*`、`--keyword-hunter-*`、`--keyword-status-*`、`--deep-chat-*`、`--scraper-*`、`--module-*`、`--brand-risk-*` 等在 `src/` 仍有引用。

---

## 3. Decision rules

### 3.1 Elevate → global / shared

**升全局（或升共享组件 token）** 当满足任一条：

1. **≥2 业务模块** 或 **壳层（header / sidebar / modal / settings / shared buttons）** 需要同一语义；或  
2. 该值应随 **Appearance** / **Color Mode** / **workbench SSOT** 变化（primary、focus、surface、`--workbench-radius` 等）；或  
3. 继续局部拷贝会导致 D1 式同名冲突或 D6 硬编码回潮。

**落地层级（由低到高，选最低足够层）**:

| 目标 | 放哪里 | 例 |
| --- | --- | --- |
| 原子尺度 / 色阶 | `design-tokens.ts` → `generate:tokens` | 新色阶步长（罕见） |
| 语义 surface / 工作台角色 | `variables.css`（语义段） | `--workbench-radius`、`--surface-panel` |
| 可复用组件 API | `src/css/components/*.css` | `--button-filter-*`、`--wb-theme-*` |
| **禁止** | 在模块 CSS 里发明与 atomic 同名的 `--rounded-md` 覆盖 | 走 D1 allowlist，不走「新前缀」 |

Elevate 时：模块侧改为 `var(--semantic-…)`；局部名可保留一层别名一个迁移周期，然后 archive。

### 3.2 Keep local

**保持局部前缀** 当：

1. **单模块品牌** 或独立交互模型（Deep Chat terracotta、PPC search-terms hero/emerald、App overview 专题色、SOPs 案例色）；或  
2. 仅几何/动画槽位且映射已写清（`--scraper-radius` → workbench 等）；或  
3. Ownership / banner 主题槽需要模块命名空间（与 Appearance 隔离）。

规则：

- 局部值 **优先** `var(--color-*)` / `var(--surface-*)` / `var(--workbench-radius)` 派生，禁止裸色 + 魔法 px 扩散。  
- 不在第二模块 `import` 或复制第一模块的前缀文件；第二消费者 = elevate 信号。  
- Appearance 主 CTA / focus 用全局 `--color-primary*` / `--color-focus-ring`，**不要**新建 `--foo-primary` 除非模块必须锁定非 Appearance 品牌色（须在 PR 说明）。

### 3.3 Archive

**归档（删除或文档标 deprecated）** 当：

1. **0 consumers**：全库无 `var(--prefix-…)` / 无声明；或  
2. 功能 / 路由已下线；或  
3. 已 elevate，局部别名迁移期结束（建议 ≤1–2 个主题 PR 周期）。

归档步骤（未来执行 PR，非本文件）:

1. grep 证明 0 引用；  
2. 删 CSS 声明与无用 `NAMING_PATTERNS` 条（若整前缀死亡）；  
3. 更新本节 inventory + `THEME_SYSTEM_GUIDELINES` §6.1；  
4. **不**在归档 PR 混入视觉改版。

---

## 4. PR checklist — new local prefix

新前缀或为既有前缀 **新增一大族** 属性时，PR 描述须勾选：

- [ ] **三问**（宪法 §6）：不能用全局语义？不能扩展共享组件变量？确实单模块 / 单交互模型？  
- [ ] **命名**：`--{module-or-component}-{role}-*`；小写 + 连字符；不与 atomic / 已有前缀撞车。  
- [ ] **映射**：默认值写成 `var(--…)` 派生，或注释说明为何不能派生。  
- [ ] **生命周期**：写明倾向 `keep local` / `elevate candidate` / `temporary alias`。  
- [ ] **消费者数**：当前 1 个模块；若已知 ≥2，直接 elevate，不建局部前缀。  
- [ ] **审计**：新前缀已在 `NAMING_PATTERNS` **或** 本 PR 扩展 audit（`npm run css:audit` 绿）。  
- [ ] **文档**：更新本文件 §2 表 **或** 宪法 §6.1 高扩散登记（高扩散必登）。  
- [ ] **Non-scope**：无顺手全库 rename；无修改 D1 allowlist「冒充」局部问题。  
- [ ] **验证**：`npm run css:audit`；若动 token 生成则 `npm run generate:tokens`；相关 unit/smoke 按需。

**拒绝信号**（reviewer）:

- 新前缀只是把 `--color-primary` 换皮成 `--mod-primary` 且无品牌锁定理由。  
- 复制 `--app-overview-surface*` 到另一模块而不抽共享。  
- 为通过 D1 gate 引入模块级同名 atomic。

---

## 5. Relationship to D1 allowlist / design-tokens

| 话题 | D1 | D9 |
| --- | --- | --- |
| 对象 | `variables.css` **同名覆盖** generated **原子** token | **模块/组件前缀** 的增生与升降级 |
| 门禁 | `token:override-audit` + `config/token-atomic-override-allowlist.json` | 文档 + `css:audit` 命名 + PR 清单（本文件） |
| 事实源 | `design-tokens.ts` → generated；handwritten 仅语义 / intentional override | 局部声明在 module/component CSS；应 **映射到** 语义/原子，不替代事实源 |
| 错误用法 | 无理由扩大 allowlist | 用 `--mod-rounded-md` 逃避 workbench/D2；或局部重定义 `--color-blue-500` |

**协作约定**:

1. 局部前缀的 **值** 可以引用全局 token；**不要**在局部选择器重写 atomic 同名变量。  
2. Elevate 到语义层时走 `variables.css` 语义段或 components，**不是**先写进 allowlist。  
3. D2 `--workbench-radius` 是共享语义：模块 `--*-radius` 应别名到它，而不是再造 8px 原子。

---

## 6. Non-goals（本 D9 文档波次）

- **不做** 全库前缀 rename（含 `--keyword-hunter-*` → `--kh-*`、`--ppc-search-terms-*` → `--ppc-hero-*`）。  
- **不删** 仍有引用的「冗余但安全」别名。  
- **不** 改变 Deep Chat terracotta / PPC emerald / Ownership `wb-theme-*` 产品决策。  
- **不** 替代 D6 硬编码清理或 D12 视觉基线。  
- **不** 新增 CI 硬门「禁止新前缀」（可后续加 advisory；本波次仅文档）。

---

## 7. Suggested follow-ups（optional）

| Wave | 内容 | 验证 |
| --- | --- | --- |
| F1 | 宪法 §6 示例与代码实名对齐（注释级） | 文档 diff only |
| F2 | 按模块删 0-consumer 声明 | grep 0 + `css:audit` |
| F3 | 将多模块重复的 surface/focus 别名 elevate 一小批 | 视觉 XO 抽检；无 mass rename |
| F4 | advisory 脚本：新前缀未登本表则 warn | 非 blocking |

---

## 8. Doc map

| 文档 | 与 D9 关系 |
| --- | --- |
| 本文件 | **生命周期 SSOT** |
| `THEME_SYSTEM_GUIDELINES.md` §6 | 日常作者入口；链到本文件 |
| `theme-system-landing-status.md` | D9 状态灯 |
| `token-override-inventory.md` | D1 边界 |
| `audit-css-variables.ts` | 命名允许列表（执法子集） |

---

**维护**: 新增或归档前缀时更新 §2；改变 elevate/archive 规则时 bump 日期并在 landing status 记一笔。  
**诚实声明**: 本文关闭的是 D9 的 **文档债**；代码侧仍可存在冗余前缀，属 Informational / 后续 F 波次。
