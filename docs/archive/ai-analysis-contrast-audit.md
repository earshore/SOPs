# AI 智能分析页面 — 样式可读性 / 对比度问题诊断与修复

**页面路径**: `src/modules/app_center/views/master_analysis/ai_analysis/`
**审查日期**: 2026-07-29
**结论**: 存在系统性可读性问题。根因是 **Tailwind 语义工具类与设计令牌变量错配**，叠加一套未被任何类引用的"孤儿变量"覆盖，导致开发者意图与实际渲染不一致。
**修复状态**: ✅ 已修复（2026-07-29）。误用类全部替换为 `text-[color:var(--color-text-*)]` / `bg-[color:var(--color-bg-*)]` 任意值语法，无效 dark 覆盖死代码已删除。详见文末「修复记录」。

---

## 一、根因机制

项目里并存两套命名相近、但前缀不同的语义色变量，导致混用：

| 变量体系 | 代表变量 | light 值 | dark 值 | 是否被工具类引用 |
| --- | --- | --- | --- | --- |
| **A. 设计令牌（正确）** | `--color-text-primary` / `--color-text-secondary` / `--color-text-tertiary` / `--color-bg-secondary` | slate-900 / 500 / 400 / 50 | slate-50 / 300 / 400 / 800 | ✅ 被自定义 CSS 大量引用 |
| **B. 旧别名（孤儿）** | `--text-secondary` / `--text-tertiary` / `--bg-secondary` | slate-800 / 700 / 50 | 由 `ai_analysis_style.css:237-239` 覆盖为 `#e2e8f0` / `#cbd5e1` / `#1f2937` | ❌ 无任何 `.text-secondary` 类引用这些变量 |
| **C. Tailwind colors 语义键** | `primary` / `secondary`（见 `config/tailwind.config.generated.js:269-279`） | `--color-primary`(蓝) / `--color-secondary`(slate-600) | `--color-primary` / `--color-secondary`(slate-400) | ✅ 生成 `text-*` / `bg-*` 工具类 |

### Tailwind 工具类实际映射（关键）

| 工具类 | 实际解析为 | 开发者通常意图 | 是否一致 |
| --- | --- | --- | --- |
| `text-primary` | `color: var(--color-primary)` = **品牌蓝 blue-500 `#3b82f6`** | 主要文本色（深墨色） | ❌ 文字变蓝 |
| `text-secondary` | `color: var(--color-secondary)` = **品牌次要色**（light: slate-600 `#475569`；dark: slate-400 `#94a3b8`） | 次级文本色 | ❌ 语义错（数值勉强可读，但非令牌文本色） |
| `bg-secondary` | `background-color: var(--color-secondary)` = **品牌次要色**（同上） | 次级背景（浅灰） | ❌ 背景变深灰蓝 |
| `text-tertiary` | **Tailwind colors 中无 `tertiary` 键，也无自定义 `.text-tertiary` 类** → 死类名，不生成任何样式 | 三级辅助文本色（浅灰） | ❌ 完全不生效，文字回退到继承色 |
| `bg-tertiary` | 同上，死类名 | 三级背景 | ❌ 完全不生效 |

### `ai_analysis_style.css` 的无效 dark 覆盖

```css
/* ai_analysis_style.css:233-240 */
.dark .ai-analysis-wrapper,
[data-theme='dark'] .ai-analysis-wrapper,
[data-color-mode-resolved='dark'] .ai-analysis-wrapper {
  --text-secondary: #e2e8f0;   /* 体系 B 变量 */
  --text-tertiary: #cbd5e1;    /* 体系 B 变量 */
  --bg-secondary: #1f2937;     /* 体系 B 变量 */
}
```

这段覆盖的是**体系 B** 变量，但 Tailwind 的 `text-secondary` / `bg-secondary` 工具类解析的是**体系 C** 的 `--color-secondary`，二者不是同一个变量。因此该覆盖**对工具类完全无效**，仅给人"已处理 dark 模式"的假象。

> 注：`dark-content-compat.css` 兼容层只重映射 `bg-white` / `bg-slate-50` / `text-slate-*` 等显式色阶类，**未覆盖** `bg-secondary` / `text-secondary` / `text-tertiary` / `text-primary` 这些语义键。

---

## 二、受影响位置清单

### 🔴 严重 1 — `bg-secondary` 用作卡片/区块背景（实为深灰蓝品牌次要色）

**文件**: `template.html`

| 行号 | 组件 | 类名片段 | 实际效果 |
| --- | --- | --- | --- |
| 1039 | 统计概览栏 - Listings 维度卡片 | `bg-secondary rounded-xl p-4 border border-slate-200` | light: 整块 `#475569` 深灰蓝底；dark: `#94a3b8` 中灰底 |
| 1053 | 统计概览栏 - Reviews 维度卡片 | 同上 | 同上 |
| 1067 | 统计概览栏 - 核心发现卡片 | 同上 | 同上 |
| 1081 | 统计概览栏 - 分析细项卡片 | 同上 | 同上 |
| 1094 | 统计概览栏 - 总体置信度卡片 | 同上 | 同上 |
| 526 | "任务预览"展开按钮 | `bg-secondary/80 ... text-tertiary` | 深灰蓝半透明底 + 文字色不生效（靠继承） |
| 972 | 证据卫生 chip | `bg-secondary ... text-tertiary` | 深灰蓝底 + 文字色不生效 |
| 1286 | Listings 结果 - 关键词标签 | `bg-secondary text-slate-700` | 深灰蓝底 + 深灰文字，对比度不足 |
| 1450 | Reviews 结果 - 关键词标签 | `bg-secondary text-slate-700` | 同上 |
| 64 | 配置面板折叠 header hover | `hover:bg-secondary/80` | hover 变深灰蓝，header 深色文字对比度下降 |

**影响**: 统计概览栏 5 张卡片是最突出的视觉问题——本意是浅灰底信息卡，实际渲染成深灰蓝色块，卡片内 `text-slate-900` 数字与 `text-secondary`(slate-600) 标签在深灰蓝底上对比度均不达标。

### 🔴 严重 2 — `text-tertiary` / `bg-tertiary` 死类名（完全不生效）

`text-tertiary` 约 30+ 处，`bg-tertiary` 2 处。文字/背景回退到继承值，"三级辅助"层次感丢失；在彩色或深色背景上可能不可读。

**文件**: `template.html`

| 行号 | 组件 |
| --- | --- |
| 238 | ASIN 列表项副标题 `text-tertiary line-clamp-1` |
| 417 | "基于标题与五点描述"说明 |
| 470 | "基于用户评论数据"说明 |
| 592, 616, 642, 651 | 任务预览 - Token 统计/字符数等辅助文本 |
| 975 | 证据卫生 chip 内 filter 图标 `text-tertiary` |
| 1213, 1242, 1269 | Listings 结果卡 header 标签（uppercase tracking-wider） |
| 1377, 1406, 1433 | Reviews 结果卡 header 标签 |
| 1486, 1543 | 结果区辅助说明文本 |
| 1583, 1596 | 空状态图标与提示 |
| 1620, 1632 | 空状态维度说明 |
| 1148, 1312 | `bg-tertiary` 结果计数徽章背景（不生效） |

**文件**: `components/AlpinePanel.ts`

| 行号 | 用途 |
| --- | --- |
| 517 | 折叠箭头图标类 `text-tertiary` |
| 525 | Prompt 展开箭头图标类 |
| 565 | 状态辅助文本类 |
| 697 | 非强对比态的徽章 `bg-slate-100 text-tertiary border ...` |
| 938 | 禁用态徽章 `bg-slate-100 text-tertiary ...` |

### 🟠 中等 3 — `text-primary` 用作标题（实为品牌蓝）

**文件**: `template.html`

| 行号 | 组件 |
| --- | --- |
| 72 | 配置面板标题 "选择 ASIN 与分析目标" |
| 145 | "选择 ASIN" 子标题 |
| 358 | "选择分析目标" 子标题 |
| 439 | 分析目标卡片标题（Listings） |
| 492 | 分析目标卡片标题（Reviews） |
| 535 | "任务预览" 标题 |

**文件**: `components/AlpinePanel.ts:687` — hero 标题色（非强对比态）

**影响**: 标题变蓝色 `#3b82f6`。白底上尚可读，但语义错误，且与品牌主色按钮视觉混淆；在蓝色 hero 渐变背景上会与背景撞色。

### 🟡 轻度 4 — `text-secondary` 用作次级文本（实为品牌次要色）

**文件**: `template.html`（约 20 处）+ `components/AlpinePanel.ts:691, 710`

代表行：73, 146, 172, 222, 244, 252, 359, 392, 443, 496, 536, 606, 647, 658, 730, 963, 1022, 1049, 1063, 1077, 1088, 1129, 1148, 1312, 1547, 1561, 1589, 1593, 1612, 1624

**影响**: light 下 slate-600(`#475569`) 比预期次级文本色 slate-500(`#64748b`) 略深，对比度尚可但语义错；dark 下 slate-400(`#94a3b8`) 在深色背景上可读。问题相对最轻，但与设计令牌体系不一致，且 dark 模式下 `ai_analysis_style.css` 的覆盖对它无效。

---

## 三、修复建议（方向）

> 以下方向已于 2026-07-29 全部执行，详见文末「修复记录」。

1. **统一改用设计令牌任意值语法**（页面内已有正确范例，如 `template.html:1227` 的 `text-[color:var(--color-text-secondary,#64748b)]`）：
   - `text-primary`（当本意是主要文本色）→ `text-[color:var(--color-text-primary)]` 或自定义类
   - `text-secondary`（次级文本）→ `text-[color:var(--color-text-secondary)]`
   - `text-tertiary`（三级文本）→ `text-[color:var(--color-text-tertiary)]`
   - `bg-secondary`（次级背景）→ `bg-[color:var(--color-bg-secondary)]`
   - `bg-tertiary` → `bg-[color:var(--color-bg-tertiary)]`

2. **或在 Tailwind 配置的 `colors` 中补齐 `tertiary` 语义键**，并把 `primary`/`secondary` 的文本/背景语义拆开（当前 `primary` 同时承担"品牌色"和"主要文本色"两种语义，是混淆根源）。

3. **删除 `ai_analysis_style.css:233-240` 的无效 dark 覆盖**（体系 B 变量无类引用），避免误导后续维护者以为 dark 模式已处理。

4. **统计概览栏 5 张卡片（1039/1053/1067/1081/1094）优先修复**——这是视觉对比度问题最严重的位置。

---

## 四、验证方式

修复后建议在 light 与 dark 两种主题下分别检查：
- 统计概览栏卡片背景与内含文字对比度（WCAG AA ≥ 4.5:1）
- "任务预览"展开按钮静止态文字是否可见
- 证据卫生 chip 文字是否可见
- 各处 `text-tertiary` 辅助文本是否呈现预期的浅灰层次

---

## 五、修复记录（2026-07-29 执行）

### 改动文件

| 文件 | 改动 |
| --- | --- |
| `template.html` | 约 80 处类名替换 |
| `components/AlpinePanel.ts` | 约 10 处类名替换（类名在单引号字符串 / 模板字符串内） |
| `ai_analysis_style.css` | 删除第 233-240 行无效 dark 覆盖死代码 |

### 替换映射

| 误用类 | 修复为 | 引用变量 |
| --- | --- | --- |
| `text-primary` | `text-[color:var(--color-text-primary)]` | slate-900 / slate-50 |
| `text-secondary` | `text-[color:var(--color-text-secondary)]` | slate-500 / slate-300 |
| `text-tertiary` | `text-[color:var(--color-text-tertiary)]` | slate-400 / slate-400 |
| `bg-secondary` | `bg-[color:var(--color-bg-secondary)]` | slate-50 / slate-800 |
| `bg-tertiary` | `bg-[color:var(--color-bg-tertiary)]` | slate-100 / rgba(255,255,255,0.06) |
| `hover:bg-secondary/80` | `hover:bg-[color:var(--color-bg-hover)]` | rgba(0,0,0,0.04) / rgba(255,255,255,0.06) |
| `bg-secondary/80`、`bg-tertiary/50` | 去掉透明度修饰符，用对应 `--color-bg-*` | var() 不支持通道拆分 |

### 替换技巧

用带边界后缀的 replace_all 区分裸类名与已有的 `var(--color-text-tertiary)` 引用，避免误伤：
- `text-tertiary"`（HTML 双引号结尾）、`text-tertiary `（空格）、`text-tertiary'`（TS 单引号）、`` text-tertiary` ``（模板字符串反引号）分别处理
- 已有的 `var(--color-text-secondary,#64748b)` 等引用因 `text-secondary` 后跟 `,`/`)` 而不被匹配，保持完好

### 验证

- ✅ grep 确认无残留误用类（`text-primary`/`text-secondary`/`text-tertiary`/`bg-secondary`/`bg-tertiary` 作为裸类名）
- ✅ 已有的 `var(--color-text-*)` / `var(--color-bg-*)` 引用未受损
- ⚠️ 未运行 `type-check` / `build`：本会话 shell 工具失效，仅静态验证。改动为纯类名字面量替换，类型安全；任意值语法在页面原有代码已有先例，Tailwind JIT 可正常生成

### 临时文件

`scripts/_fix-ai-analysis-classes.{cjs,ps1}`、`scripts/_fix-diag.ps1` 为调试残留（因 shell 失效未实际用上，改用 Edit 工具完成），可手动删除。
