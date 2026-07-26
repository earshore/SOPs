# Ownership Role → Palette / wb-theme 映射表（Phase 4 预备）

**日期**: 2026-07-26  
**状态**: 可执行团队文档 · **不**触发大规模 CSS 重写  
**产品形态**: 内部亚马逊运营工作台  
**权威链**: `THEME_SYSTEM_GUIDELINES` > 审查路线图 §3.4 / Phase 4 > **本文** > `VISUAL_DESIGN_GUIDELINES` > `menuConfig` / banner 实现

| 关联文档 | 路径 |
| --- | --- |
| 审查与路线（§3.4 Role 草案、Phase 4） | `docs/superpowers/specs/2026-07-26-theme-system-enterprise-audit-and-roadmap.md` |
| 主题宪法（§3 颜色归属） | `docs/THEME_SYSTEM_GUIDELINES.md` |
| 菜单事实源 | `src/common/config/menuConfig.ts` |
| Banner theme 实现 | `src/css/components/welcome-banner.css`（`.wb-theme-*`） |
| **代码 SSOT（D8 scaffold）** | `src/common/config/ownershipRoles.ts`（`OWNERSHIP_ROLES` / helpers；非全站 DOM 绑定） |
| 作战手册 | `docs/superpowers/plans/2026-07-26-theme-system-team-operating-playbook.md` |

---

## 0. 一句话结论

**新页面只选 Ownership Role，不发明色名。**  
Role → 默认 palette（menu / colorSchemes）→ 兼容 `wb-theme-*` class；Appearance（A 轴）**永不**改写本表。

本文是 Phase 4 的 **Role 表落地稿**：给 Template / MO / Reviewer 用，**不要求**本轮批量改 HTML/CSS。

---

## 1. 三轴提醒（只读）

| 轴 | 写什么 | 不写什么 |
| --- | --- | --- |
| **M Color Mode** | 浅/深/跟随；`data-color-mode` | 模块归属、banner class |
| **A Appearance** | `--color-primary*`、focus 等壳层语义 token | `wb-theme-*`、menu 色、状态色 |
| **B Ownership** | 本表 role + menu `themeColor` / `category.color` + banner class + **nav chrome**（megaMenu `GLASS_COLORS` / `sidebar-theme-*`） | 用户主题 preset；禁止收成单一 `--color-primary` |

冲突优先级（宪法）：**状态色 > 模块归属（B）> Appearance primary（A）> 中性 surface**。

---

## 2. 完整 Role 表

### 2.1 列说明

| 列 | 含义 |
| --- | --- |
| **role id** | 稳定业务角色 id；代码侧可选 `data-ownership-role`（Phase 4） |
| **menu source** | `menuConfig` 中的模块 `themeColor` 和/或 `*.Categories[].color` |
| **palette** | 默认色板名（与 colorSchemes / Tailwind 色名对齐） |
| **wb-theme class(es)** | Welcome Banner 兼容 class；多值表示别名或可接受并存 |
| **notes / exceptions** | 配置与实现不一致、自定义 hero、禁止事项 |

### 2.2 表（SSOT 草案 · 19 roles）

| role id | 业务含义 | menu source | palette | wb-theme class(es) | notes / exceptions |
| --- | --- | --- | --- | --- | --- |
| `role-neutral` | 首页 / 中性壳 | `modules.home.themeColor: slate` | `slate` | `wb-theme-neutral` | 首页可用全屏 splash；工作台入口保持极简。系统设置壳层优先 Appearance，**不**绑业务 role 色。 |
| `role-sops-overview` | SOPs 流程中心总览 | `modules.sops.themeColor: indigo` | `indigo` | `wb-theme-indigo`（总览入口） | 宪法旧文曾写 `blue`；**以 menuConfig `indigo` 为准**。仅总览入口，不替代 category 子 role。 |
| `role-ops-growth` | 运营与推广体系 | `sopCategories.growth.color: emerald` | `emerald` | `wb-theme-growth` | SOPs 增长泳道默认 banner。 |
| `role-ops-supply` | 供应链与物流体系 | `sopCategories.backend.color: amber` | `amber` | `wb-theme-supply` | 业务供给/仓储主色。**勿**与 Playground 实现例外混为一谈（见 `role-playground`）。 |
| `role-ops-safety` | 账号安全与风控 | `sopCategories.safety.color: red` | `red` | `wb-theme-safety` | 风控语义；状态色 success/warn/error 仍走全局状态 token，不因本 role 改写。 |
| `role-ops-service` | 客服与客户体验 | `sopCategories.service.color: teal` | `teal` | `wb-theme-service` / `wb-theme-teal` | 两 class 为同 palette 别名；新页优先 `wb-theme-service`，既有 `teal` 可保留至收敛。 |
| `role-apps-overview` | 应用中心总览 | `modules.app_center.themeColor: rose` | `rose` | 总览可用 `wb-theme-rose` 或 overview 局部 token（`--app-overview-*`） | 宪法旧文曾写 `purple`；**以 menuConfig `rose` 为准**。总览可走 App Center overview 局部 token，不发明新 `wb-theme-*`。 |
| `role-analysis` | Master Analysis 工作台 | `modules.master_analysis.themeColor` + `appCategories.master_analysis.color: indigo` | `indigo` | `wb-theme-indigo`；遗留 `wb-theme-analytics`（blue 系） | 新页用 `indigo`。`wb-theme-analytics` 为历史 scraper/分析页 blue 变体，**仅兼容，禁止新开**；Phase 4/5 可逐步归并到 `role-analysis`。 |
| `role-playground` | Playground / Deep Chat | 配置：`themeColor` / `appCategories.playground.color: orange` | 配置 `orange`；实现 terracotta 等 | **不**以 `wb-theme-orange` 为唯一 banner class；实现可见 `wb-theme-supply`、隐藏 banner、模块 CSS | **配置 vs 实现双层例外（硬登记）**。归属**不是** indigo / cyan。本轮**不新增** `wb-theme-orange`。重写 Deep Chat 色 = 独立需求，禁止夹带 Phase 4。 |
| `role-keywords` | Keyword Hunter | 配置：`modules.keyword_hunter.themeColor` + `appCategories.keyword_hunter.color: rose`；历史/视觉文常写 `fuchsia` | **权威 menu：`rose`**；banner 兼容 `fuchsia` | `wb-theme-rose`（对齐 menu）/ 现网常见 `wb-theme-fuchsia` | **例外：menu rose vs banner fuchsia 双轨**。Phase 4 收敛前：新页优先按 **menu `rose` + `wb-theme-rose`**；既有 `wb-theme-fuchsia` 不强制本轮改完。禁止第三色名。 |
| `role-ppc` | PPC Tools | `modules.ppc_tools.themeColor` + `appCategories.ppc_tools.color: emerald` | `emerald` | 无强制单一 `wb-theme-*`；自定义 **PPC hero** + `--ppc-*` 局部 token | 自定义 hero 须受控（登记局部 token）；主 CTA 尽量语义化；**不**发明 `wb-theme-ppc` 除非走 role 扩表流程。emerald 与 `role-ops-growth` 同 palette、不同 role（业务域不同）。 |
| `role-hub-overview` | Amazon 智库总览 | `modules.amz_hub.themeColor: orange` | `orange` | 总览入口色（实现可局部）；**不**默认等于 `role-playground` | 总览可与子分类 role 不同；子页必须用 hub 子 role，不得长期只绑 overview 色。 |
| `role-hub-knowledge` | Amazon 知识早知道 | `hubCategories.knowledge.color: indigo` | `indigo` | `wb-theme-indigo` | 与 `role-analysis` 同 palette；靠 role id / 导航上下文区分，不合并 role。 |
| `role-hub-practice` | 入门实操宝典 | `hubCategories.practice.color: green` | `green` | `wb-theme-growth`（兼容 class 名 growth；palette 为 green） | class 名 `growth` 历史借用 emerald 视觉；**palette 以 menu `green` 为准**。Phase 4 可评估是否引入 `wb-theme` 与 green 更贴合的别名，**禁止**业务页私自新 class。 |
| `role-hub-advanced` | 运营提升全攻略 | `hubCategories.advanced.color: rose` | **menu `rose`** | 现网/视觉文常写 `wb-theme-violet`；也可用 `wb-theme-rose` | **例外：menu rose vs 文档/实现 violet 漂移**。收敛前：以 **menu `rose`** 为配置权威；banner 迁移计划单独立项，不在本预备文档改 CSS。Skills 等子页若写死 violet，记入 Phase 4/5 清单。 |
| `role-more-overview` | 更多总览 | `modules.more_core.themeColor: green` | `green` | 总览入口 green / emerald 视觉 | 仅总览；子页走 `role-more-*`。 |
| `role-more-llm` | 大模型探索 | `moreCategories.explore.color: violet` | **menu `violet`** | `wb-theme-violet`；遗留页/文可能写 teal | 宪法 §3.2 旧映射写 `teal`；**以 menuConfig `violet` 为准**。`wb-theme-more-agents` 为探索域专用变体（见 §2.3），挂在本 role 下，不新开 role 除非业务独立。 |
| `role-more-business` | 示例业务场景 | `moreCategories.business_scenarios.color: cyan` | `cyan` | `wb-theme-cyan`；紫鸟等可局部案例色 / `zn-hero` | 局部案例色须登记；不得反向污染全局 primary。 |
| `role-sys-settings` | 系统设置 | 无业务 category color | （壳层） | 无业务 `wb-theme-*` 绑定 | Appearance + Color Mode 主场；**禁止**用模块归属色「刷」设置页。 |

**Role 计数**: **19**（含 overview / playground / keywords / ppc / hub×4 / more×3 / neutral / sys）。

### 2.3 兼容 / 遗留 wb-theme class（不单独扩 role，除非产品要求）

下列 class **已在** `welcome-banner.css` 定义，Phase 4 **允许只读兼容**，新页面 **禁止**作为首选发明入口：

| class | 建议挂靠 role | 说明 |
| --- | --- | --- |
| `wb-theme-analytics` | `role-analysis` | blue 历史变体；禁止新开 |
| `wb-theme-teal` | `role-ops-service` | `service` 别名 |
| `wb-theme-fuchsia` | `role-keywords` | 与 menu `rose` 双轨期间兼容 |
| `wb-theme-hub-promo-tools` | `role-hub-practice` 或 `role-hub-advanced`（按页面所属 category） | 促销工具页专用变体；**不**升为独立 role，除非 category 拆分 |
| `wb-theme-hub-promo-activities` | 同上 | 促销活动页专用变体 |
| `wb-theme-more-agents` | `role-more-llm` | agents/技能探索变体 |
| `wb-theme-rose` | `role-apps-overview` / `role-keywords` / `role-hub-advanced` | 与 menu rose 对齐的合法 class |
| （不存在）`wb-theme-orange` | — | **禁止本轮新增**为 Playground 唯一 banner class |

### 2.4 已登记 CSS 中的 wb-theme 清单（实现侧 inventory）

`welcome-banner.css` 当前主题 class（便于对照，**不是**新 role 授权）：

`analytics` · `neutral` · `cyan` · `fuchsia` · `growth` · `safety` · `supply` · `teal`/`service` · `indigo` · `violet` · `rose` · `hub-promo-tools` · `hub-promo-activities` · `more-agents`

---

## 3. 新页面规则（必须选 role，禁止发明色）

### 3.1 必做流程

1. **定模块与 category**（`menuConfig` / route manifest），不要先写 class。  
2. **查本表选 role id**（上表 §2.2）；overview 用 `*-overview`，子页用 category role。  
3. **取 palette + 兼容 `wb-theme-*`**；模板 banner 只挂表中 class。  
4. 状态、图表、图表系列色走全局状态/数据色规则，**不**跟 role 混。  
5. 需要自定义 hero（PPC、Deep Chat、紫鸟）→ **局部 token 登记** + 本表 notes 扩写；不新增未授权 `wb-theme-*`。

### 3.2 禁止

| 禁止 | 正确做法 |
| --- | --- |
| 页面 PR 发明 `wb-theme-orange` / `wb-theme-foo` | 先扩 §2.2 role 行 + 宪法指针 + 审查，再实现 class |
| 用 Appearance primary 顶替 banner 归属 | A/B 分离；归属只读本表 |
| 把 Playground 配成 indigo/cyan | 固定 `role-playground` 例外文案 |
| 工作台路径用 colorSchemes 营销 hover（大 translate/scale） | Phase 4 拆 entry vs workbench helper（见 §5） |
| 设置页绑 `wb-theme-growth` 等业务 class | `role-sys-settings`：只动 A/M |

### 3.3 扩表流程（唯一合法新增 role / class 路径）

1. 提案：业务含义 + 建议 palette + 是否需要新 `wb-theme-*`。  
2. Theme Architect 批：写入本文 §2.2 + 路线图 §3.4 同步。  
3. 实现：CSS class（如需）→ menu color → 模板 → 视觉回归抽样。  
4. 禁止「先上线 class 后补表」。

---

## 4. Appearance 必须永不触碰的面

Appearance preset / `ThemeManager.applyTheme` / 设置「主题色」**不得**改变：

1. **本表任何 role 的 palette 归属**与导航/菜单 category 色  
2. **`wb-theme-*` class 选择与 banner 归属**（含 Playground 例外与 hidden banner）  
3. **状态色** success / warning / error / info 语义  
4. **字号阶梯、工作台圆角契约**（如 `--workbench-radius`）  
5. **模块局部 token 的业务含义**（`--ppc-*`、`--app-overview-*`、Deep Chat terracotta 等）——仅允许其「引用全局色阶」的派生值在 dark mode 下跟随 **M 轴**，不随 Appearance 换「模块身份」  
6. **ColorContext 推断的模块色**（在 Phase 4 废弃前，Appearance 路径也不得 `setModuleColor`）

Appearance **可以**动：`--color-primary*`、`--color-focus-ring`、token 化壳层（header/settings/modal 等已语义化区域）。

验收口令：**切换 `default` ↔ `minimal` 后，模块 banner / 侧栏归属色不变。**

---

## 5. Phase 4 代码迁移清单（任务 only · 不实现）

> 目标对齐审查 **Phase 4**：修 D4 / D7 / D8。下列为可勾选任务，**本文不写代码**。

### 5.1 Role 表落地

- [ ] 将本文 §2.2 标为 Phase 4 MO 输入；与路线图 §3.4  diff 一次并收口漂移（keywords rose/fuchsia、hub-advanced rose/violet、more-llm violet vs 旧 teal、overview indigo/rose）。  
- [ ] （可选）模板根或 banner 容器增加 `data-ownership-role="<role id>"`，与 class 双写过渡。  
- [ ] 文档：`VISUAL_DESIGN_GUIDELINES` §2.2 表增加 role id 列（另开 PR，非本预备必做）。  
- [ ] 登记遗留 class → role 挂靠（§2.3）到 MO 看板。

### 5.2 colorSchemes 拆分（D4）

- [ ] 审计 `colorSchemes`（或等价 helper）入口：**entry/overview** vs **workbench** 调用点列表。  
- [ ] 拆 helper：`entryMotion`（允许轻微营销向）vs `workbenchChrome`（禁止大 translate/scale；贴工作台底线）。  
- [ ] 去掉 workbench 路径的营销 hover 位移/缩放；保留色板引用。  
- [ ] 单测或视觉抽样：工作台卡片 hover 不「跳」。  

### 5.3 ColorContext（D7）

- [ ] 标记 `setModuleColor` **deprecated**（JSDoc + 内部注释）；列出全部调用方。  
- [ ] 明确权威通道：路由/menu 推断 → DOM `wb-theme-*` / 未来 `data-ownership-role`；全局写入仅兼容。  
- [ ] 删除可证无用的监听/订阅；保留期间双通道文档说明「以 DOM 归属为准」。  
- [ ] 确认 Appearance / `applyTheme` 路径**零** `setModuleColor`（已有门禁则复跑）。  

### 5.4 wb-theme 命名收敛（D8）

- [x] **代码 SSOT scaffold**：`src/common/config/ownershipRoles.ts`（`OwnershipRoleId` × 19、`OWNERSHIP_ROLES`、`getPaletteForRole` / `getOwnershipRoleForModule`；**无** Appearance 写入、**无** 全站 `data-ownership-role` 绑定）。  
- [ ] 生成「role → 首选 class」常量表的全站消费 / DOM 双写（仍 Phase 4 任务）。  
- [ ] Playground：维持配置 orange / 实现 terracotta+例外；**不**加 `wb-theme-orange`。  
- [ ] Keywords：定收敛目标（rose 或 fuchsia 二选一产品拍板）→ 改 menu 或改 banner 的单向迁移 PR。  
- [ ] Hub advanced / More llm：对齐 menu 与 banner 的单向迁移 PR。  
- [ ] 禁止清单写入 lint/文档门：新 HTML 不得出现未在表中的 `wb-theme-*`（可选 CI grep）。  

### 5.5 验证（Phase 4 Done 建议）

- [ ] Appearance 切换：抽样 SOPs growth / Analysis / Keywords / Hub knowledge / More llm banner **class 与观感归属不变**。  
- [ ] Playground / Deep Chat：仍非 indigo/cyan；terracotta 例外仍在。  
- [ ] `theme:hardcode-baseline` / 相关 CI 不回退。  
- [ ] XO 抽样签字（作战手册场景，不扩 scope）。  

### 5.6 明确不做（Phase 4 边界）

- 不重写 Deep Chat 业务色  
- 不一次清零全站 `blue-*`（Phase 5）  
- 不引入 white-label / 多租户主题引擎  
- 不换字体栈  
- 不把本预备文档直接改成全量 HTML class 扫街  

---

## 6. 配置 vs 文档漂移速查（供 Phase 4 收口）

| 区域 | menuConfig（代码权威） | 旧宪法/视觉表述 | Phase 4 处理建议 |
| --- | --- | --- | --- |
| SOPs 总览 | `indigo` | 曾写 `blue` | 文档改 indigo；role=`role-sops-overview` |
| 应用中心总览 | `rose` | 曾写 `purple` | 文档改 rose |
| Keyword Hunter | `rose` | 常写 `fuchsia` + `wb-theme-fuchsia` | 产品拍板后单向收敛 |
| Hub 运营提升 | `rose` | 常写 `violet` + `wb-theme-violet` | 同上 |
| More 大模型探索 | `violet` | 曾写 `teal` + `wb-theme-teal` | 文档改 violet；role=`role-more-llm` |
| Playground | 配置 `orange` | 实现 terracotta / supply / hidden | **保持双层例外** |

---

## 7. 给 Reviewer 的 30 秒检查单

- [ ] 新页是否写了 **role id**（或可映射到 §2.2）？  
- [ ] banner class 是否在 §2.2/§2.3 内？  
- [ ] 是否误用 Appearance 改归属？  
- [ ] Playground / PPC / 紫鸟是否走登记例外而非新 class？  
- [ ] 是否夹带 Phase 5 业务硬编码大扫除？  

---

## 8. 修订记录

| 日期 | 变更 |
| --- | --- |
| 2026-07-26 | 初版：19 roles 全表、例外清单、新页规则、Appearance 禁区、Phase 4 任务清单（docs only） |
| 2026-07-26 | D8 light scaffold：链接 `src/common/config/ownershipRoles.ts` 代码 SSOT（表 + pure helpers，非全站绑定） |
