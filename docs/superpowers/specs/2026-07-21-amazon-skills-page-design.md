# Amazon Skills 页与 Skill Registry 设计规格

**日期：** 2026-07-21  
**状态：** Ready for review  
**范围代号：** Phase A — Skills 页 + 可调用 Registry（非工作台 UI）

---

## 1. 背景与目标

### 1.1 背景

SOPs「更多 → 大模型探索」现有三页：智能体、提示词、工作流。智能体页已画出 `Role → Goal → Skill → MCP → Tool → Report` 链路，但 Skill Library 仍为占位。

外部资产 [nexscope-ai/Amazon-Skills](https://github.com/nexscope-ai/Amazon-Skills) 提供约 53 个标准 Agent Skills（每目录 `SKILL.md` + 可选 `scripts/`），可被 OpenClaw / Claude Code / Cursor 等加载。需将其合理植入本系统，供目录浏览，并让后续工作台/Agent **真实按 id 调用全部 skill**。

### 1.2 目标

1. 在「更多 → 大模型探索」新增 **技能** 页，风格与规范对齐现有 explore 体系。
2. 以 Git submodule 引入 Amazon-Skills 全文资产。
3. 落地全站 **`skillRegistry`**：`list` / `get` / `loadSkillContext`，与 Skills 页同源。
4. 工作台/Agent **本期不改业务绑定**，但 API 必须就绪，任意 skillId 可同步加载进 LLM 上下文。
5. 更多总览补「技能」入口卡片。

### 1.3 非目标（本期不做）

- 工作台 UI、页内执行 skill `scripts/`、页内调用 LLM
- 将 PPC / 日报等现有 Agent 强制绑定具体 skill
- 全量中文翻译 `SKILL.md` 正文
- 新 npm 依赖做 frontmatter / markdown 渲染
- 挂载到 DI `ServiceRegistry`（一期直接 export 单例）
- 一次把 53 个 skill 全部注入上下文（禁止默认行为）

---

## 2. 已锁定决策

| # | 决策 | 结论 |
|---|---|---|
| D1 | 范围 | Skills 页 + Registry；工作台可调全部 skill（按 id 显式 load） |
| D2 | 资产来源 | Git submodule → `nexscope-ai/Amazon-Skills` |
| D3 | 加载方式 | Vite `import.meta.glob` + 运行时解析（路径 1） |
| D4 | 主调用方 | 本应用内 Agent / 工作流 |
| D5 | 语言 | 中文外壳 + 上游英文 `SKILL.md` 原文 |
| D6 | 注入默认格式 | `loadSkillContext` 默认 `raw`（完整 SKILL.md） |
| D7 | scripts | 仅元数据探测；浏览器不执行；禁止 `?raw` 内联脚本进业务包 |
| D8 | DI | 一期 `export const skillRegistry` 单例，不挂 DI |
| D9 | UI 范式 | explore violet + 提示词页搜索/分类/卡片/modal；ui-ux-pro-max 作目录型信息架构参考 |
| D10 | 总览 | 必做「技能」卡；徽章 **已接入**；顺序：智能体 → 技能 → 提示词 → 工作流 |

---

## 3. 信息架构与路由

### 3.1 菜单位置

| 项 | 值 |
|---|---|
| 模块 | 更多 (`more_core`) |
| 分组 | 大模型探索 (`explore`) |
| 侧栏标签 | 技能 |
| 图标 | `fas fa-graduation-cap` |
| 顺序 | 智能体 → **技能** → 提示词 → 工作流 |

同步更新 `menuConfig.moreCategories.explore.description`：

> 智能体、技能、提示词、工作流等实用功能。

### 3.2 路由契约

| 字段 | 值 |
|---|---|
| `key` | `SKILLS` |
| `routeId` | `more_skills` |
| `path` | `/more/explore/skills` |
| `label` | 技能 |
| `category` | `explore` |
| `loaderPath` | `./views/explore/skills/index.ts` |

联动：

- `src/modules/more/module.manifest.ts`
- `src/common/router/legacyRouteAliases.ts`（`/more_skills` → `more_skills`）
- `MODULE_MAP` 由 `import.meta.glob` 自动拾取
- 路由相关单测（若有枚举）补 `more_skills`

### 3.3 目录结构

```text
vendor/amazon-skills/                    # git submodule
src/services/skillRegistry/              # 全站可调用
  types.ts
  parseSkillMd.ts
  categoryMap.ts
  loadSkillModules.ts
  skillRegistryService.ts
  index.ts
  *.test.ts
src/modules/more/views/explore/skills/
  index.ts
  template.html
  skills_style.css
```

原则：**资产在 submodule；解析与索引在 `src/services/skillRegistry`**。工作台禁止依赖 more 模块 UI。

### 3.4 与相邻页关系

```text
智能体 ──发现入口──▶ 技能（目录 + Registry）
提示词 ──并行层──▶ 技能（Prompt 模板 ≠ Agent Skill）
工作流 ──后续可引用──▶ skillId（本期不改工作流页）
更多总览 ──必做卡片──▶ more_skills
```

---

## 4. Skill Registry（工作台契约）

### 4.1 设计目标

- 单一真相源：`vendor/amazon-skills/*/SKILL.md`
- 构建期打入包内，运行时 **同步** `getSkill` / `loadSkillContext`（无网络）
- Skills 页与工作台共用同一 API：「页上可见 ⟺ 可 load」
- 可单测：解析、分类、搜索、缺 skill、空库

### 4.2 类型

```ts
type SkillCategoryId =
  | 'product_research'
  | 'competitor'
  | 'pricing_profit'
  | 'advertising'
  | 'listing'
  | 'analytics'
  | 'growth'
  | 'other';

type SkillStatus = 'available' | 'beta' | 'unknown';

type SkillLoadFormat = 'raw' | 'body';

interface SkillMeta {
  id: string;
  title: string;
  description: string;
  category: SkillCategoryId;
  categoryLabel: string;
  emoji?: string;
  status: SkillStatus;
  hasScripts: boolean;
  source: 'amazon-skills';
  repoPath: string;
}

interface Skill extends SkillMeta {
  body: string;
  raw: string;
  frontmatter: Record<string, unknown>;
}

interface SkillLoadOptions {
  format?: SkillLoadFormat; // default: 'raw'
}

interface SkillSearchQuery {
  keyword?: string;
  category?: SkillCategoryId | 'all';
  status?: SkillStatus | 'all';
  hasScripts?: boolean;
}
```

### 4.3 分类映射

- `categoryMap.ts`：skill id / 目录名 → `SkillCategoryId` + 中文 label + status
- 与上游 README 业务分组对齐
- **未入表 skill 仍完整入库并可 load**，UI 归「其他」、status 为 `unknown`
- categoryMap 只影响展示分组，不影响「可调用全部」

### 4.4 加载

```ts
// loadSkillModules.ts — 路径相对该文件
import.meta.glob(
  '../../../vendor/amazon-skills/*/SKILL.md',
  { query: '?raw', import: 'default', eager: true }
);

// scripts 仅路径/URL 探测，禁止 ?raw 内联脚本正文
import.meta.glob(
  '../../../vendor/amazon-skills/*/scripts/**',
  { query: '?url', import: 'default', eager: true }
);
```

类型声明（`src/types/global.d.ts`）：

```ts
declare module '*.md?raw' {
  const content: string;
  export default content;
}
```

初始化（懒加载，`ensureInitialized`）：

1. 遍历 SKILL.md glob
2. `parseSkillMd(raw)` → name / description / body / frontmatter
3. 父目录名 + scripts glob → `hasScripts`
4. `Map<id, Skill>`；**id 冲突 first-wins + warn**
5. 缺 `name`：用父目录名作 id + warn，**仍纳入**
6. 单文件 parse 失败：skip + `parseFailures++` + warn，不阻断其余

**空库策略（软失败）：**

- `ensureInitialized()` 得到 0 个 skill → 空 Map + `Logger.error`，**不**抛错拖垮整站
- 页面展示空态（提示 submodule init）
- 工作台 `loadSkillContext` / strict 批量在空库时抛 `SystemError` `SKILL_REG_002`

### 4.5 Frontmatter 解析

- **零新依赖**
- 匹配文件头 `---\n...\n---`
- 解析标量：`name`、`description`（行级 `key: value` / 引号字符串）
- `metadata` 可选解析 `nexscope.emoji`；失败则忽略 emoji
- 不依赖完整 YAML 规范；非法 frontmatter → 该文件 skip（`SKILL_REG_003` 语义）

### 4.6 对外 API

```ts
interface SkillRegistry {
  ensureInitialized(): void;

  listSkills(query?: SkillSearchQuery): SkillMeta[];
  getSkill(id: string): Skill | undefined;
  hasSkill(id: string): boolean;
  getCategories(): Array<{ id: SkillCategoryId; label: string; count: number }>;

  /** 未知 id → ValidationError SKILL_REG_001；空库 → SystemError SKILL_REG_002 */
  loadSkillContext(id: string, options?: SkillLoadOptions): string;

  /**
   * 批量加载。strict:true 时任一缺失/空库抛错；
   * 默认 skip 缺失 + warn。
   */
  loadSkillsContext(
    ids: string[],
    options?: SkillLoadOptions & { strict?: boolean }
  ): string;

  getStats(): {
    total: number;
    parseFailures: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
  };
}
```

批量拼接模板：

```text
---
# Skill: {id}
{content}
---
```

导出：`src/services/skillRegistry/index.ts` → `export { skillRegistry } from './skillRegistryService'`

### 4.7 错误码

| Code | 类型 | 场景 |
|---|---|---|
| `SKILL_REG_001` | ValidationError | 指定 skill id 不存在 |
| `SKILL_REG_002` | SystemError | load 时 registry 为空（submodule/glob 失败） |
| `SKILL_REG_003` | （内部） | 单文件 parse 失败，skip + warn |

### 4.8 工作台调用约定

```ts
import { skillRegistry } from '@/services/skillRegistry';

const block = skillRegistry.loadSkillContext('amazon-ppc-campaign');
// 拼入 system / developer 消息，勿与不可信用户数据混段

const multi = skillRegistry.loadSkillsContext([
  'amazon-keyword-research',
  'amazon-listing-optimization',
]);
```

细则：

1. **按 id 显式加载**；禁止默认注入全部 53
2. skill 正文视为可信内部资产（submodule）
3. 用户业务数据仍按现有规则 untrusted
4. scripts 不在浏览器执行；宿主执行层另开期
5. Agent 在配置/代码中声明依赖的 `skillId[]`

---

## 5. Skills 页 UI / 交互

### 5.1 设计原则

吸收 **ui-ux-pro-max** 的文档目录模式（Search-first + 分类 + 列表 + 详情），视觉与组件 **强制贴合** more/explore：

| 采用 | 拒绝（防孤岛） |
|---|---|
| `wb-theme-violet`、白底 `border-slate-200` 卡片 | 新字体、OLED 暗色主题 |
| 提示词页搜索 / `category-btn` / 卡片 / `app-modal` | 独立 design system 色板 |
| Font Awesome 结构图标 | emoji 作导航/结构图标 |
| design tokens / 现有 Tailwind violet-slate | glass 重特效 |
| `textContent` 渲染 skill 正文 | `innerHTML` 渲染不可信/外部 md |

上游 `emoji` 仅作标题旁次要文本装饰，不作图标容器。

### 5.2 页面结构

1. Welcome Banner（`wb-container--simple wb-theme-violet`）
2. 指标条 4 卡（`getStats()`）
3. 工作台调用说明（只读代码块 + 契约说明）
4. Skill Library：搜索 + 分类 + 结果计数 + 卡片网格
5. 详情 Modal
6. 页脚归属（MIT / 源仓库 / 不执行 scripts）

### 5.3 Banner 文案

- 标题：技能  
- Badge：`SKILL OPS`  
- 描述：Amazon Skills 资产目录：浏览、检索、复制 skill 正文与 skillId；工作台通过 skillRegistry 按 id 加载，与本页同源。  
- Tags：`{total} Skills`（来自 `getStats().total`，禁止写死 53）· `Registry 可调用` · `中文外壳 / 英文原文`

### 5.4 指标条

| 卡 | 数据 |
|---|---|
| TOTAL | `stats.total` |
| CATEGORY | 有计数的分类数 |
| SCRIPTS | `hasScripts === true` 数量 |
| BETA | `status === 'beta'` 数量 |

### 5.5 Library 交互

- 搜索：`#skill-search`，debounce 200ms，`listSkills({ keyword, category })`
- 分类：全部 + `getCategories()`；`aria-pressed`；active 用现有 `category-btn.active`
- 结果计数：`显示 N / 共 M 个技能`，`aria-live="polite"`
- 网格：`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`
- 卡片：分类 badge、status（色+文）、title、`id` mono、description 两行 clamp、查看/复制 id/复制正文
- 空态：无匹配（建议清空/示例词）；registry 空（submodule 命令 + `role="alert"`）
- DOM：`createElement` + `textContent`，对齐 prompts 安全渲染

### 5.6 详情 Modal

- 复用 `app-modal`；header 渐变与 prompts 一致（`violet → fuchsia`）
- 展示 meta + **`raw` 只读 pre/text**（一期不做 markdown 渲染）
- 操作：复制 raw、复制 skillId、复制  
  `npx skills add nexscope-ai/Amazon-Skills --skill {id} -g`  
  关闭（按钮 / backdrop / Escape）
- Toast：`showToast`；clipboard：`copyTextToClipboard`

### 5.7 不做

- 页内运行 skill / 调 LLM  
- 虚拟列表（53 量级无需）  
- URL query 深链（二期可选 `?skill=id`）  
- 新 icon 库 / 新字体 / 独立主题  

### 5.8 UI 自检清单

- [ ] FA 结构图标；无 emoji 导航图标  
- [ ] hover + cursor-pointer；过渡用现有 duration token  
- [ ] 正文对比 ≥ 4.5:1  
- [ ] 可见 focus ring  
- [ ] 图标按钮 `aria-label`  
- [ ] 空态有恢复路径  
- [ ] status 不单靠颜色  
- [ ] 无新增装饰动画；尊重 reduced-motion 全局策略  
- [ ] 375–1440 无横向溢出  
- [ ] skill 正文不用 `innerHTML`  

---

## 6. 更多总览（必做）

**文件：** `src/modules/more/views/overview/template.html`

1. 探索区副标题改为含「技能」  
2. 在智能体与提示词之间插入技能卡：

| 字段 | 值 |
|---|---|
| 导航 | `data-action="switch-tab" data-tab="more_skills"` |
| 样式 | `sop-card overview-accent-card overview-accent-violet` |
| 图标 | `fas fa-graduation-cap` + `bg-violet-50 text-violet-600` |
| 徽章 | `sop-status-badge sop-status-active` + **已接入** |
| 标题 | 技能 |
| 描述 | Amazon Skills 资产目录：浏览、检索、复制 skill 正文与 skillId；工作台经 skillRegistry 同源调用。 |
| 底栏 | `Agent Skill · 可调用 Registry` |

3. 顺序：智能体 → 技能 → 提示词 → 工作流  
4. 一期不做总览动态 skill 计数；不新增总览专用 CSS  

---

## 7. Submodule 工程约定

| 项 | 约定 |
|---|---|
| 路径 | `vendor/amazon-skills` |
| 远程 | `https://github.com/nexscope-ai/Amazon-Skills.git` |
| 指针 | 锁定 commit SHA |
| 本地 | `git submodule update --init --recursive` |
| CI | checkout 开启 submodules 或显式 init |
| 升级 | 更新指针 + 新 skill 补 categoryMap |

---

## 8. 实现顺序

1. submodule + `*.md?raw` 类型  
2. parseSkillMd + categoryMap + loadSkillModules + skillRegistry + 单测  
3. module.manifest + alias + menu 文案  
4. Skills 页 UI  
5. 更多总览卡片  
6. （可选）Agent 页 Skill Library 链到 `more_skills`  
7. type-check / 相关单测 / 手工冒烟  

Registry 先于 UI，保证工作台契约不依赖页面。

---

## 9. 测试与验收

### 9.1 自动化

| 用例 | 期望 |
|---|---|
| frontmatter 正常 | name / description / body |
| 缺 name | 父目录名作 id，仍入库 |
| 坏文件 | skip + parseFailures++ |
| id 冲突 | first-wins |
| listSkills 关键词 | 匹配 id/title/description，大小写不敏感 |
| 未映射分类 | other，仍可 load |
| 未知 id load | ValidationError `SKILL_REG_001` |
| 空库 load | SystemError `SKILL_REG_002` |
| 批量 strict / 非 strict | 符合 4.6 |
| 路由 | `routeIdToPath('more_skills') === '/more/explore/skills'` |

### 9.2 手工冒烟

1. 侧栏出现「技能」，顺序正确  
2. `/more/explore/skills` 列表非空（submodule 已 init）  
3. 搜索与分类有效  
4. 详情复制 raw / id / 安装命令 + toast  
5. 总览「技能」→ 进入页；徽章「已接入」  
6. `listSkills().length` 与 TOTAL 一致  
7. `loadSkillContext('amazon-keyword-research')` 非空  

### 9.3 不算失败

- 不执行 scripts  
- 不自动改造 PPC Agent  
- 不翻译 SKILL 正文  

---

## 10. 风险

| 风险 | 缓解 |
|---|---|
| 未 init submodule | 空态 + 命令；load 时 `SKILL_REG_002` |
| 上游新 skill 未映射 | 仍可调用，UI「其他」 |
| 包体积 | 一期可接受；lazy 属契约变更，另开期 |
| frontmatter 非标 | 最小解析 + skip |
| 样式分叉 | 复用 category-btn / modal / violet |

---

## 11. 参考

- 源资产：https://github.com/nexscope-ai/Amazon-Skills  
- UI 参考 skill：ui-ux-pro-max（`~/.agents/skills/ui-ux-pro-max`），仅用信息架构与 UX 清单  
- 同构页面：`src/modules/more/views/explore/prompts/`、`agents/`、`overview/`  

---

## 12. 变更记录

| 日期 | 说明 |
|---|---|
| 2026-07-21 | 初稿：Section 1–4 用户确认后落盘 |
