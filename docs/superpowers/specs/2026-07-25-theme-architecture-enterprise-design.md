# 主题架构企业级收口 + 极简素色主题 — 设计规格

**日期**: 2026-07-25  
**状态**: 设计已确认，待实现计划  
**范围策略**: 架构收口优先（方案 1）  
**外观/归属模型**: A2 — 外观主题可换全局 primary 色相，模块归属色独立  

---

## 1. 目标与非目标

### 1.1 目标

1. 将主题运行时收敛为**单一事实源**与可审计契约。
2. 明确 **Appearance（用户可选外观）** 与 **Module Ownership（模块归属色）** 的双层模型（A2）。
3. 新增 **极简素色（`minimal`）** Appearance preset：清晰、克制、适合长时间运营作业，非营销换肤。
4. 完善设计语言规范文档，消除冲突与双重 API 指引。

### 1.2 非目标（本轮不做）

- 全量迁移 `variables.css` 与 `design-tokens.ts` 的色阶/圆角重定义（登记为债务）。
- 重构 dark mode（`[data-theme='dark']` 与 appearance preset id 并存问题单独登记）。
- 重写 welcome-banner / colorSchemes 的入口卡营销向 hover。
- 修改 Deep Chat terracotta 局部 token。
- 更换全局字体栈或引入展示字体（Calistoga 等）。

---

## 2. 架构：双层主题模型（A2）

### 2.1 分层表

| 层 | 名称 | 数据源 | 可写 CSS 变量 | 不可改 |
| --- | --- | --- | --- | --- |
| A | Appearance（用户可选） | `src/common/config/themeConfig.ts` → `THEME_PRESETS` + `ThemeManager` | `--color-primary`、`--color-primary-light/dark/darker`；可选 `--color-focus-ring` | 模块 `wb-theme-*`、`menuConfig` 色、状态色 success/warning/error/info |
| B | Module Ownership | `menuConfig.ts` + welcome-banner / `colorSchemes` | 导航、banner、入口卡片归属色 | 不因切换 Appearance 而变 |

### 2.2 冲突优先级（高 → 低）

1. 语义状态色（success / warning / error / info）
2. 模块归属色（Layer B）
3. 外观主色（Layer A）
4. 中性 surface / text / border

**示例**: Keyword Hunter 页切换到 `minimal` 后，全局 CTA/focus 变为工业 slate；fuchsia 归属与 banner **不变**。

### 2.3 运行时契约

| 项 | 决策 |
| --- | --- |
| 唯一 API | `ThemeManager`（`applyTheme` / `restoreTheme` / `getAllThemes` / `getCurrentTheme` / `previewTheme`） |
| 存储 key | `app-theme`（与现 `themeConfig` 一致） |
| `themes.ts` | 无引用 → **删除**；禁止第二套 `applyTheme` 导出 |
| `data-theme` | 写 appearance preset id（`default` / `minimal` / `ocean` …）；**不**与模块色 class 混用 |
| 事件 | `theme-changed`；payload 只含 Appearance，不含 module color |
| 调用方 | `main.ts` 启动恢复；`systemSettings` 外观面板；调试 API 经 `ThemeManager` |

### 2.4 Token 分层（决策序）

| 层级 | 位置 | 责任 |
| --- | --- | --- |
| 1. Atomic | `design-tokens.ts` | 色阶、间距、字号、圆角原子值 |
| 2. Generated | `variables.generated.css` | 脚本生成，禁止手改 |
| 3. Semantic | `variables.css` | surface/text/border/shadow、暗色、迁移补充；**不得继续扩大**对同名基础 token 的覆盖 |
| 4. Appearance runtime | `ThemeManager` → runtime CSS rule | 仅 primary/focus 等 Layer A 变量 |
| 5. Module theme | `wb-theme-*`、模块局部 token | 归属与组件语义 |

---

## 3. 极简素色主题 `minimal`（ui-ux-pro-max 修订版）

### 3.1 定位

| 项 | 定义 |
| --- | --- |
| **id** | `minimal` |
| **显示名** | 极简素色 |
| **描述** | 工业中性主色，低刺激、高对比，适合长时间运营作业；不改变模块归属色 |
| **colorScheme** | `slate` |
| **气质** | Swiss / Industrial Minimal — 清晰与克制，**非** Exaggerated Minimalism / 营销换肤 |

### 3.2 设计来源与裁剪

使用 ui-ux-pro-max：`--design-system` + `variance=2` / `motion=2` / `density=8`，关键词侧重 internal ops dashboard、monochrome、restrained workbench。

| 维度 | skill 原始建议 | 本规格采纳 |
| --- | --- | --- |
| Style | Exaggerated Minimalism（超大字、展示体） | **否** → Industrial / Swiss Minimal |
| 色板 | `#18181B` + 蓝 accent `#2563EB` | **否蓝 accent 主路径** → 全程 slate 素色 |
| 工业库存板 | Primary `#334155` | **是** → `slate-700` |
| 字体 | Calistoga + Inter | **否** → 不换字体栈 |
| Motion | scroll reveal 300–400ms | 微交互 150–250ms；无装饰 scroll |

### 3.3 色板映射（仅现有 token）

| 角色 | Token | 计算色 | 用途 |
| --- | --- | --- | --- |
| Primary | `--color-slate-700` | `#334155` | 主按钮、关键链接 |
| On Primary | `--color-white` | `#ffffff` | 主按钮文字 |
| Primary soft | `--color-slate-100` | `#f1f5f9` | 浅底 / soft 填充 |
| Primary active | `--color-slate-800` | `#1e293b` | pressed |
| Primary darker | `--color-slate-900` | `#0f172a` | 最强调 |
| Focus ring | `--color-slate-700` | `#334155` | 键盘焦点（去默认蓝） |

**不写入 Appearance**: 整壳 background 重绘、状态色、模块 `wb-*`、Deep Chat 局部色。

### 3.4 配置草案

```ts
minimal: {
  id: 'minimal',
  name: '极简素色',
  description:
    '工业中性主色，低刺激、高对比，适合长时间运营作业；不改变模块归属色',
  colorScheme: 'slate',
  customVars: {
    '--color-primary': 'var(--color-slate-700)',
    '--color-primary-light': 'var(--color-slate-100)',
    '--color-primary-dark': 'var(--color-slate-800)',
    '--color-primary-darker': 'var(--color-slate-900)',
    '--color-focus-ring': 'var(--color-slate-700)',
  },
}
```

说明：默认 `getColorVars('slate')` 使用 500 档偏浅；`minimal` **必须**用 `customVars` 抬到 700，保证白字对比与「素而不飘」。

### 3.5 交互底线

- 正文对比 ≥ 4.5:1；主按钮白字 on `slate-700`。
- 焦点环可见；禁止无替代的 `outline: none`。
- 可点目标 ≥ 44px（沿用全局）。
- Hover 仅颜色/边框/轻阴影；工作台禁止 `translateY` / `scale`。
- 动效 150–250ms；遵守 `prefers-reduced-motion`。
- 禁止：粒子、彩色 glow、彩虹渐变、展示字体、无限 pulse/bounce 作主题卖点。

### 3.6 切换契约与影响面（审查收窄 · 选项 A）

**诚实边界（验收以此为准，禁止过度承诺整站换肤）：**

Appearance **仅**影响绑定 CSS 变量 `--color-primary*`、`--color-focus-ring` 及其派生语义（如 `--color-text-link`、`--color-border-focus`、`.action-btn-primary` 等使用这些变量的控件）。

| 区域 | `minimal` 开启后 | 验收 |
| --- | --- | --- |
| Token 化全局壳层：primary 按钮、链接色、focus ring | → 工业 slate（700 档） | **必验** |
| 硬编码 Tailwind `blue-*` / 模块色 class 的控件 | **可能不变** | 本轮 **不**要求迁移 |
| 侧栏模块色、`wb-theme-*`、menu 归属 | 不变 | **必验** |
| success / warning / error | 不变 | **必验** |
| Deep Chat terracotta | 不变 | **必验** |
| 工作台圆角 8px / 字体族 | 不变 | **必验** |

### 3.7 设置面板

- 排序：`default` → **`minimal`** → `ocean` → `forest` → `sunset` → `purple` → `rose`。
- 文案强调清晰/克制/长时作业；避免「时尚 / 氛围 / 高级感」营销措辞。
- 描述中须暗示影响面：只调整全局主色 token，**不**改变模块归属色与页面 banner 主题。

### 3.8 测试要求

1. `applyTheme('minimal')` → `data-theme="minimal"`。
2. primary/focus 为上表 token 引用。
3. `StorageService.set('app-theme', 'minimal')`。
4. `applyTheme` **不得**调用 `ColorContext.setModuleColor`（A2 补丁）。
5. 切换前后模块 banner 归属 class 不变（文档 checklist；可选后续 e2e）。

---

## 4. 设计语言文档改版

### 4.1 文档权威链

| 文档 | 角色 | 本轮动作 |
| --- | --- | --- |
| `docs/THEME_SYSTEM_GUIDELINES.md` | 主题系统宪法 | 大修：A2、presets、运行时、债务、验收 |
| `docs/VISUAL_DESIGN_GUIDELINES.md` | 页面/组件执行细则 | 消冲突 + 交叉引用 + `minimal` 说明 |
| `src/css/README.md` / `QUICK-REFERENCE.md` | 实现速查 | 仅必要时加链接 |
| 本文 | 实现前规格 | 已确认 |

冲突优先级：`THEME_SYSTEM` > `VISUAL_DESIGN` > CSS 速查。

### 4.2 `THEME_SYSTEM_GUIDELINES` 必增

1. 双层主题模型（A2）与优先级表  
2. Appearance Presets 清单（含 `minimal` 与各 `colorScheme`）  
3. 运行时契约（仅 `ThemeManager`；禁止 `themes.ts`）  
4. Token 分层与禁止扩大覆盖  
5. 已知债务登记（见 §6）  
6. 验收命令与切换 checklist  

### 4.3 `VISUAL_DESIGN_GUIDELINES` 收紧

| 冲突点 | 结论 |
| --- | --- |
| 工作台圆角 | 面板/表单工作区 **≤ 8px** |
| 入口/banner 圆角 | 允许 **12–16px**，不得用于工具面板 |
| Playground 归属 | **配置层** `menuConfig` = `orange`；**实现层** Deep Chat 为 terracotta / `wb-theme-supply` 等例外。禁止文档写死「Playground banner = wb-theme-orange」（该类本轮不存在且不新增） |
| colorSchemes 动效 | 仅总览/入口卡；工作台禁止 scale/translateY |
| 外观主题 | 只影响 token 化全局 primary/focus；点名 `minimal`；硬编码 blue 控件本轮可不迁 |

### 4.4 模块归属色（文档应与 menuConfig 对齐的要点）

- 配置权威：`menuConfig.ts`；Playground **配置**写 orange，旧文档 indigo/cyan 作废。  
- 页面实现可与配置暂不一致时，文档必须分两行写清，不得捏造不存在的 `wb-theme-*`。

---

## 5. 实现范围（本轮代码）

1. `themeConfig.ts`：新增 `minimal`；preset 顺序与企业化描述；`customVars` 覆盖 primary/focus。  
2. **A2 补丁**：`ThemeManager.applyTheme` **删除** `ColorContext.setModuleColor` 调用（模块归属改由 menu/路由推断，不因 Appearance 被覆盖）。  
3. `themeConfig.test.ts`：minimal 变量/存储 + 不调用 `setModuleColor` + preset 顺序。  
4. 删除 `themes.ts`（确认无引用与测试依赖）。  
5. 更新 `THEME_SYSTEM_GUIDELINES.md` 与 `VISUAL_DESIGN_GUIDELINES.md`。  
6. 设置面板自动读 `THEME_PRESETS` — 无需硬编码选项列表（已 `Object.values`）。  

**不做**: token 全量迁移、硬编码 blue 控件迁移、dark 重构、新增 `wb-theme-orange`、banner/CSS 大扫除、Deep Chat 色改、换字体。

---

## 6. 已知债务（登记，本轮不修）

| ID | 债务 | 说明 |
| --- | --- | --- |
| D1 | `variables.css` 重定义基础色阶/字号 | 覆盖 generated；长期迁回 `design-tokens.ts` |
| D2 | 圆角语义名像素不一致 | design-tokens `lg=8px` vs variables `md=8px/lg=12px`；工作台文档写死 8px 行为 |
| D3 | `[data-theme='dark']` 与 appearance id | **同一 `data-theme` 属性两义**；`applyTheme` 会写入 appearance id 并覆盖 `dark`。当前视为 **Appearance 与 dark 互斥，Appearance 优先**。后续应拆属性（如 `data-appearance` + `data-color-mode`） |
| D4 | `colorSchemes` 营销向 hover | scale/彩色阴影与工作台底线冲突；入口允许、工作台禁止（文档约束） |
| D5 | `--focus-ring-soft` 等仍可能残留蓝系硬编码 | Appearance 改 ring 色后 soft 阴影可能不完全跟手；低优先级 |
| D6 | 大量 UI 硬编码 `blue-*` 不走 `--color-primary` | 导致 Appearance 可见影响面有限；长期迁移，本轮不修 |

---

## 7. 验收标准

### 7.1 必跑

```bash
npx vitest run src/common/config/themeConfig.test.ts
npm run type-check
git diff --check
```

### 7.2 通过定义

- 全局仅 `ThemeManager` 作为 Appearance 应用入口；无 `themes.ts`。  
- `minimal` 可选且变量符合 §3.3；**影响面符合 §3.6 收窄边界**（不要求硬编码 blue 全站变色）。  
- `applyTheme` 不调用 `ColorContext.setModuleColor`。  
- 文档：无双重 apply 指引；Playground **配置** = orange 且实现例外写清；工作台 vs 入口圆角二分清楚；A2 优先级写死；D3 互斥写清。  
- 切换 Appearance 不改变模块归属色（checklist）。  
- **不**宣称 dark + Appearance 可同时正确工作。  

---

## 8. 决策记录

| 决策 | 选择 | 理由 |
| --- | --- | --- |
| 范围 | 架构收口优先 | 用户选 A |
| 外观 vs 归属 | A2 | 可换 primary，归属独立 |
| 实现路径 | 方案 1 双层契约 + 单一运行时 | 可控、可测、兼容设置 UI |
| 极简主题 | 工业 slate-700 + 显式 focus | ui-ux-pro-max 裁剪；长时作业、非营销 |
| 字体 | 不更换 | 避免营销展示体与外链依赖 |
| 验收影响面 | **收窄为 token 化壳层（审查选项 A）** | 避免过度承诺；硬编码 blue 记 D6 |
| ColorContext | **本轮从 applyTheme 解耦** | A2 补丁；侧栏已用 menu 推断 |
| 审查补丁 | 2026-07-25 用户确认 A + 纳入 + 改 plan/spec | 执行前闸门 |

---

## 9. 下一步

1. 用户审阅本规格。  
2. 通过后调用 **writing-plans** 产出实现计划。  
3. 按计划改代码与文档并验证。  
