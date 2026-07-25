# 主题系统企业级审查与收敛路线图

**日期**: 2026-07-26  
**状态**: 审查完成 · 规范与分期路线已确认，待按阶段执行  
**产品形态**: 内部亚马逊运营工作台（BYOK 静态站），非营销 SaaS 换肤产品  
**权威文档链**: `THEME_SYSTEM_GUIDELINES` > 本文（审查/路线） > `VISUAL_DESIGN_GUIDELINES` > `src/css/*` 速查  

---

## 0. 一句话结论

主题系统 **架构层已具备企业级雏形**（A2 双层 + `ThemeManager` 单 API + `minimal` 工业素色），但 **实现层仍是多事实源并行**：generated token 被手写覆盖、Appearance 与 dark 抢同一属性、入口营销样式与工作台底线冲突、约 **900+** 处 Tailwind `blue-*` 硬编码使 Appearance 可见面偏窄。

下一阶段目标不是再加一套主题引擎，而是：

1. **拆清模式（Color Mode）与外观（Appearance）**  
2. **收口 token 事实源（D1/D2）**  
3. **用门禁阻止新散落**  
4. **按高 ROI 路径把壳层控件迁到语义 token（D6 分期）**

---

## 1. 现状架构盘点（As-Is）

### 1.1 已对齐的企业级资产

| 资产 | 路径 | 状态 |
| --- | --- | --- |
| 主题宪法 | `docs/THEME_SYSTEM_GUIDELINES.md` | A2、presets、债务 D1–D6、验收已写 |
| 页面/Banner 细则 | `docs/VISUAL_DESIGN_GUIDELINES.md` | 与宪法联动；Playground 例外已写清 |
| Appearance 运行时 SSOT | `src/common/config/themeConfig.ts` → `ThemeManager` | 单 API；存 `app-theme`；不写模块色 |
| 原子 token 源 | `src/common/config/design-tokens.ts` | 生成 CSS / Tailwind / TS 类型 |
| 生成变量 | `src/css/foundation/variables.generated.css` | 脚本生成 |
| 语义/迁移层 | `src/css/foundation/variables.css` | 手写；会覆盖 generated 同名项（D1） |
| 模块归属 | `menuConfig.ts` + `ColorContext.infer*` + `wb-theme-*` | Layer B |
| 入口色板工厂 | `src/common/constants/colorSchemes.ts` | 强营销向（D4） |
| 页面入口 | `welcome-banner.css`（`wb-theme-*` 变体集） | 归属表达主通道 |
| 设置入口 | Appearance 面板 → `ThemeManager.applyTheme` | 已接 presets（含 `minimal`） |

### 1.2 双层模型 A2（保留为基线）

```
优先级（高 → 低）
1. 语义状态色  success / warning / error / info
2. 模块归属色  menuConfig / wb-theme-* / ColorContext.infer
3. 外观主色    Appearance --color-primary* / focus-ring
4. 中性表面    surface / text / border
```

| 层 | 可写 | 不可改 |
| --- | --- | --- |
| A Appearance | `--color-primary*`、`--color-focus-ring`（及纯派生） | `wb-theme-*`、menu 色、状态色 |
| B Module Ownership | 导航 / banner / 入口卡归属 | 不被 Appearance 覆盖 |

**诚实影响面（验收必须写进产品预期）**:  
Appearance **只保证 token 化全局壳层**变色；硬编码 `blue-*` / 入口 `colorSchemes` 大圆角卡片 **可以不变**（D6/D4）。

### 1.3 运行时契约（已实现）

| 项 | 现状 |
| --- | --- |
| 唯一 Appearance API | `ThemeManager` |
| 存储 | `app-theme` |
| DOM 标记 | `document.documentElement.dataset.theme = appearanceId` |
| 运行时 CSS | `updateRuntimeCssRule('theme-manager-vars', …)` |
| 事件 | `theme-changed`（仅 Appearance） |
| 禁止 | 第二套 `themes.ts`、`applyTheme` 写 `ColorContext.setModuleColor` |

Presets 顺序：`default` → `minimal` → `ocean` → `forest` → `sunset` → `purple` → `rose`。

---

## 2. 分散与债务深度审查（Findings）

### 2.1 已登记债务（D1–D6）复核

| ID | 严重度 | 证据 | 业务影响 |
| --- | --- | --- | --- |
| **D1** | P0 结构 | `main.css` 先 import generated 再 import 手写 `variables.css`；手写含完整色阶/字号 | 「双 SSOT」；改 token 易踩覆盖 |
| **D2** | P1 语义 | design-tokens 与 variables 圆角命名像素不一致；工作台文档写死 ≤8px | 组件作者不知用 `md` 还是 `lg` |
| **D3** | P0 运行时 | Appearance id 与 dark 共用 `data-theme`；`applyTheme` 覆盖 dark | **无法稳定联用** dark + Appearance |
| **D4** | P1 体验 | `colorSchemes` 注释与 helper 含 `rounded-2xl`、`hover:-translate-y`、`scale-110` | 总览入口像营销站，污染工作台认知 |
| **D5** | P2 | focus soft 阴影可能仍偏蓝 | Appearance 切 `minimal` 后 focus 不完全跟手 |
| **D6** | P1 可见面 | 源码中 Tailwind `blue-*` 引用约 **900+** 行级命中 | Appearance「看起来没换肤」 |

### 2.2 新增发现（D7–D12）

| ID | 严重度 | 发现 | 建议方向 |
| --- | --- | --- | --- |
| **D7** | P1 | `ColorContext` 仍是全局单例「当前模块色」+ 监听列表；与 DOM 上的 `wb-theme-*` 双通道 | 归属只信 menu 推断 + 节点 class；`setModuleColor` 降级为 dev-only 或删除写入方 |
| **D8** | P1 | `wb-theme-*` 命名混用「语义角色」（growth/safety/supply）与「色名」（indigo/fuchsia/teal） | 建立 **Role → Palette** 表；禁止新主题只按色名增生 |
| **D9** | P2 | 局部 token 前缀多（`--ppc-*`、`--app-overview-*`、`--wb-*`、`--kh-*`…）虽已登记，缺 **生命周期**：何时升全局、何时归档 | 文档 + lint/审计：新增前缀必须 PR 说明 |
| **D10** | P1 | `ThemeColors` 接口含 `secondary/accent/success/...`，但 `previewTheme`/`getColorVars` 实际只解析 primary 族 | 收窄类型，避免调用方误以为 Appearance 可换状态色 |
| **D11** | P2 | 暗色覆盖写在 `variables.css` 的 `[data-theme='dark']`，与 Appearance 属性冲突（同 D3） | 拆 `data-color-mode` |
| **D12** | P2 | 缺少「主题变更」的 **视觉回归矩阵**（preset × 关键壳层截图）进 CI | 补 light/minimal 壳层 smoke 截图门 |

### 2.3 分散元素地图

```text
┌─────────────────────────────────────────────────────────────┐
│ Token 源                                                     │
│  design-tokens.ts ──generate──► variables.generated.css      │
│  variables.css (手写覆盖) ──override──► 运行时最终 :root        │
├─────────────────────────────────────────────────────────────┤
│ Appearance                                                   │
│  THEME_PRESETS + ThemeManager ──runtime rule──► primary/focus│
│  data-theme = appearanceId  (与 dark 冲突)                    │
├─────────────────────────────────────────────────────────────┤
│ Module ownership                                             │
│  menuConfig ──► ColorContext.infer ──► Sidebar Tailwind 类   │
│  templates ──► wb-theme-* ──► welcome-banner CSS 变量         │
│  colorSchemes ──► 总览/入口卡片 class 字符串                   │
├─────────────────────────────────────────────────────────────┤
│ 硬编码泄漏                                                   │
│  Tailwind blue-* / 模块内 hex / 组件默认 blue fallback        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 目标架构（To-Be · 企业级）

### 3.1 三轴模型（在 A2 上补第三轴）

| 轴 | 名称 | DOM / 存储 | 职责 |
| --- | --- | --- | --- |
| **M** Color Mode | 明暗 | `data-color-mode="light\|dark\|system"`；存 `app-color-mode` | 表面、文本、边框、阴影的明暗切换 |
| **A** Appearance | 外观主色 | `data-appearance="default\|minimal\|…"`；存 `app-theme`（可保留 key 兼容） | 仅 primary / focus 族 |
| **B** Ownership | 模块归属 | 节点 `wb-theme-*` + menu 推断；**不**写在 `html` 根上抢属性 | 导航/banner/入口归属 |

冲突优先级升级为：

1. 状态色  
2. Ownership（B）  
3. Appearance primary（A）  
4. Color Mode 中性面（M）  

### 3.2 Token 金字塔（强制）

| 层 | 名称 | 唯一写入方 | 消费方 |
| --- | --- | --- | --- |
| T0 Atomic | `design-tokens.ts` | 人类 + `generate:tokens` | 生成器 |
| T1 Generated | `variables.generated.css` | **仅生成器** | 全局 |
| T2 Semantic | `variables.semantic.css`（目标拆出） | 人类；**禁止**重定义 T1 色阶/字号像素 | 组件 |
| T3 Appearance runtime | ThemeManager runtime rule | ThemeManager | 壳层控件 |
| T4 Ownership | `wb-theme-*` / 模块前缀 | banner / 模块 CSS | 入口与模块 chrome |
| T5 Local | `--ppc-*` 等 | 模块；必须 map 到 T2/T0 | 单模块 |

**规则**: 新增样式禁止「跳层」——不得在模块 CSS 写裸 hex（动态数据宽度除外）。

### 3.3 组件主题契约（Workbench vs Entry）

| 场景 | 圆角 | Hover | 阴影 | 主色来源 |
| --- | --- | --- | --- | --- |
| Workbench 工具区 | ≤8px | 边框/背景 only，**禁** translate/scale | `--shadow-card` | Appearance primary 或中性 secondary |
| Entry / 总览卡 | 8–16px | 允许轻微强调，**禁**布局位移进工作台复制 | 轻彩色可选 | Ownership B |
| Marketing / 案例 | 可更强 | 仅叙事页 | 可更强 | 案例色，隔离前缀 |

`colorSchemes` 长期应拆为：

- `entryColorSchemes`（总览允许）  
- `workbenchChrome`（侧栏/列表，无 scale/translate）

### 3.4 Ownership 角色表（收敛 wb-theme 命名）

| Role id | 业务含义 | 默认 palette | 现有 class（兼容） |
| --- | --- | --- | --- |
| `role-ops-growth` | 运营增长 | emerald | `wb-theme-growth` |
| `role-ops-supply` | 供应链 | amber | `wb-theme-supply` |
| `role-ops-safety` | 风控 | red | `wb-theme-safety` |
| `role-ops-service` | 客服体验 | teal | `wb-theme-service` / `wb-theme-teal` |
| `role-analysis` | 分析工作台 | indigo | `wb-theme-indigo` |
| `role-keywords` | 关键词 | fuchsia | `wb-theme-fuchsia` |
| `role-ppc` | 广告工具 | emerald | （模块自定义 hero） |
| `role-hub-knowledge` | 智库知识 | indigo | `wb-theme-indigo` |
| `role-hub-practice` | 入门实操 | green | `wb-theme-growth` |
| `role-hub-advanced` | 运营提升 | violet | `wb-theme-violet` |
| `role-more-llm` | 大模型探索 | teal | `wb-theme-teal` |
| `role-neutral` | 中性/首页 | slate | `wb-theme-neutral` |

**规范**: 新页面只选 **role**，不直接发明 `wb-theme-orange` 除非 role 表新增一行并改宪法。

### 3.5 Appearance Preset 设计原则

| 原则 | 说明 |
| --- | --- |
| 作业优先 | 低刺激、长时阅读；禁止展示字体与装饰卖点 |
| 只动 A 轴 | 不改 B 归属、不改状态色、不改字号阶梯 |
| Token only | `customVars` 只引用 `var(--color-*)` |
| 对比达标 | 主按钮 on-primary ≥ 4.5:1（`minimal` 用 slate-700 是正确范例） |
| 可预览 | `previewTheme` 与 `applyTheme` 合并算法必须一致（已满足） |

推荐默认档：内部团队可默认 **`minimal`**（工业素色）或保留 `default` 蓝商务；产品决策单独确认，技术两边都支持。

---

## 4. 设计规范增量（写入宪法的条款草案）

下列条款建议在执行 Phase 0/1 时合入 `THEME_SYSTEM_GUIDELINES.md`：

1. **属性拆分**: 根节点同时允许 `data-appearance` + `data-color-mode`；废弃用 appearance id 占用 dark 槽位。  
2. **Appearance 类型收窄**: `ThemeColors` 仅保留 primary 族 + focus；状态色从接口删除。  
3. **禁止扩大 D1**: PR 若在 `variables.css` 新增与 generated 同名基础色阶/字号 → review 拒绝。  
4. **硬编码闸门**: 新增 `bg-blue-*` / `text-blue-*` 于壳层组件（header/按钮/链接）需改为 `--color-primary*` 或说明例外。  
5. **Ownership 只读 API**: 业务侧优先 `ColorContext.inferColorFromModule`；禁止新代码调用 `setModuleColor` 作为 Appearance 副作用。  
6. **局部 token 登记**: 新前缀必须写入宪法 §6.1 表。  
7. **验收分层**:  
   - L0 架构：无 `themes.ts`、apply 不碰模块色、preset 单测绿  
   - L1 壳层：header/primary button/focus 随 Appearance  
   - L2 归属：切换 Appearance 后 banner/sidebar 归属不变  
   - L3 模式：dark 与 appearance 可组合（Phase 1 完成后）

---

## 5. 收敛路线图（按收益排序）

### Phase 0 — 治理与防回归（0.5–1 天，最高 ROI）

**目标**: 不改视觉，锁死边界。

| 动作 | 产出 |
| --- | --- |
| 把 D7–D12 写入 `THEME_SYSTEM_GUIDELINES` §8 | 债务表完整 |
| `themeConfig`：收窄 `ThemeColors` / 文档注释 | 防误用 |
| ESLint 或 scripts：禁止新增 `from '@/common/config/themes'`；可选 warn `setModuleColor` | 门禁 |
| 壳层白名单审计脚本：统计 header/buttons 中 `blue-*` 数量基线 | D6 度量 |
| 视觉基线：default vs minimal 壳层截图清单 | D12 准备 |

**验证**: `themeConfig` 单测 + `css:audit` + build。

### Phase 1 — 拆 Color Mode 与 Appearance（1–2 天，P0）

**目标**: 修 D3/D11，企业可用性。

| 动作 | 细节 |
| --- | --- |
| DOM | `data-appearance` + `data-color-mode`；兼容读旧 `data-theme` |
| `ThemeManager.applyTheme` | 只写 appearance；不碰 color-mode |
| Dark 切换 | 独立 API / 设置项写 `data-color-mode` |
| CSS | `[data-color-mode='dark']` 承接原 dark 覆盖；保留临时双选择器兼容一版 |
| 存储 | `app-color-mode`；`app-theme` 继续存 appearance |

**验证**: 单测 + 手动：minimal + dark 可共存；模块 banner 不变。

### Phase 2 — Token 事实源收口（2–4 天，P0 结构）

**目标**: 修 D1/D2。

| 动作 | 细节 |
| --- | --- |
| 清点 | 脚本 diff：generated vs 手写同名变量列表 |
| 迁回 | 色阶/字号/基础 spacing 以 `design-tokens.ts` 为准 |
| 拆分 | `variables.css` → 仅 semantic + dark + 迁移；目标文件名 `variables.semantic.css` |
| 圆角 | 统一工作台语义：`workbench-radius = 8px` 显式 token，文档与 design-tokens 对齐 |
| 生成 | `npm run generate:tokens` 进 CI 校验「generated 无手工 diff」 |

**验证**: `generate:tokens` dry + `css:audit` + 核心页肉眼/截图。

### Phase 3 — 壳层 Appearance 可见面（2–3 天，P1）

**目标**: 让用户「看得见」换肤，而不全站扫 blue。

| 优先迁移 | 原因 |
| --- | --- |
| `buttons.css` primary / focus | 最高频 CTA |
| `header*.css` 链接/激活 | 全局壳 |
| 设置面板主按钮与 focus | 换肤入口自洽 |
| Toast/action 与 focus ring soft（D5） | 跟手 |

策略：只改 **共享壳层组件**，不动业务模块大表。

**验证**: default ↔ minimal 切换录屏/截图；smoke 不退化。

### Phase 4 — Ownership 与 colorSchemes 收敛（3–5 天，P1）

**目标**: 修 D4/D7/D8。

| 动作 | 细节 |
| --- | --- |
| Role 表 | 落地 §3.4；模板逐步加 `data-ownership-role`（可选） |
| colorSchemes | 拆 entry vs workbench helper；去掉 workbench 路径的 translate/scale |
| ColorContext | 标记 `setModuleColor` deprecated；删除无用监听若可证 |
| Playground | 维持「配置 orange / 实现 terracotta」例外，但写入 role 表备注 |

### Phase 5 — D6 业务页分期（持续）

按流量/共享度：

1. App Center overview  
2. Master Analysis 工具条  
3. Keyword Hunter chrome  
4. PPC hero（保持模块前缀，但 primary CTA 尽量语义化）  
5. 长尾模块  

每期：度量 `blue-*` 计数下降 + 截图 + 不破坏归属。

### 明确不做（防范围膨胀）

- 换字体栈 / 展示字体  
- 全站营销换肤动画  
- 重写 Deep Chat terracotta 业务色（除非单独需求）  
- 一次 PR 清零 900+ `blue-*`  
- 多品牌 white-label 引擎  

---

## 6. 治理与门禁

| 门禁 | 用途 |
| --- | --- |
| `npm run generate:tokens` + check clean | T0/T1 不被手工污染 |
| `npm run css:audit` | 变量命名 |
| `npm run ui:audit` | card/callout/workbench |
| `themeConfig.test.ts` | Appearance 契约 |
| 新增：`theme:hardcode-baseline`（建议） | 壳层 `blue-*` 只降不升 |
| `npm run test:e2e:smoke` | 路由不炸 |
| 可选 visual | default/minimal 壳层 |

PR 模板检查项（主题相关）：

- [ ] 未新增第二套主题 API  
- [ ] 未在 Appearance 路径写模块色  
- [ ] 未在 `variables.css` 覆盖 generated 色阶  
- [ ] 工作台面板无 translate hover  
- [ ] 新局部 token 已登记  

---

## 7. 成功画像（Definition of Done · 企业级）

当下列全部为真时，可称「企业级主题系统已收敛到可运营状态」：

1. **单写多读**: 原子 token 仅 `design-tokens.ts`；Appearance 仅 `ThemeManager`；归属仅 menu + wb role。  
2. **模式可组合**: dark/light 与 minimal/default 同时正确。  
3. **用户可感知**: 切换 Appearance 后，全局主按钮/链接/focus 明确变化。  
4. **归属稳定**: 任意 Appearance 下 KH/PPC/MA banner 与侧栏色不变。  
5. **债务可度量**: D1 覆盖列表为空或仅白名单；壳层 `blue-*` 基线持续下降。  
6. **文档无冲突**: 宪法 / 视觉 / CSS 速查三角一致。  
7. **门禁绿**: build + theme 单测 + css/ui audit + smoke。  

---

## 8. 建议执行顺序（立即）

| 顺序 | 项 | 预估 |
| --- | --- | --- |
| 1 | Phase 0 治理（债务表 + 类型收窄 + 基线脚本） | 短 |
| 2 | Phase 1 `data-appearance` / `data-color-mode` | 中 |
| 3 | Phase 2 token 收口 | 中–长 |
| 4 | Phase 3 壳层 primary 迁移 | 中 |
| 5 | Phase 4 ownership / colorSchemes | 中 |
| 6 | Phase 5 业务页 D6 细水长流 | 持续 |

---

## 9. 与既有 Spec/Plan 的关系

| 文档 | 关系 |
| --- | --- |
| `2026-07-25-theme-architecture-enterprise-design.md` | **已完成**的 A2 + minimal 设计；本文在其上做审查与深化 |
| `2026-07-25-theme-architecture-enterprise.md` plan | **已基本落地**；剩余为 D1–D6 登记项 |
| 本文 | **下一阶段企业级收敛**的审计与路线 SSOT |

实现时：先改宪法与门禁，再动 DOM 属性与 token，最后迁硬编码——禁止反向从页面「发明」新主题语义。

---

## 10. 附录：关键路径速查

```
Appearance 切换
  settings → ThemeManager.applyTheme
    → dataset (appearance)
    → runtime CSS primary/focus
    → Storage app-theme
    → event theme-changed

模块页渲染
  menuConfig / route
    → ColorContext.inferColorFromModule
    → Sidebar Tailwind scheme
    → template wb-theme-* 
    → welcome-banner 变量

Token 加载
  variables.generated.css
  variables.css (override risk)
  components/*.css
  modules/**/*.css
```
