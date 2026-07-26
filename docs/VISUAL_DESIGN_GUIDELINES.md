# 视觉设计规范指南

**Status:** active · SSOT  
**Updated:** 2026-07-25  
**适用范围**: SOPs 项目 Web 端界面，优先约束 PC 端  
**目标**: 为后续页面开发、重构和视觉修复提供统一判断标准，避免新增孤岛式设计。

> 上层主题分层、token 来源、组件视觉底线和验收规则见 [稳定主题系统规范](./THEME_SYSTEM_GUIDELINES.md)。本文继续作为页面视觉和 welcome banner 的细则。

---

## 1. 设计原则

### 1.1 先归属，再表达

所有页面的主视觉必须先回答一个问题：它属于哪个模块、哪个一级目录。

页面可以有自己的业务特征，但欢迎横幅、主图标、主要强调色必须先和左侧边栏一级目录建立色系关联。业务差异可以出现在 tag dot、局部状态、数据图表和内容卡片中。

### 1.2 工具优先，装饰克制

本项目主要是运营工具、分析工具和知识工作台。视觉目标是清晰、稳定、可扫描，而不是营销页式的强冲击。

默认选择：

- 浅色背景。
- 明确层级。
- 小面积主题色。
- 稳定圆角和阴影。
- 少量、低透明度装饰。

避免：

- 每个页面重新定义一套 hero。
- 大面积高饱和渐变。
- 与模块归属无关的随机配色。
- 为了装饰加入大量粒子、光斑、复杂动画。
- 在工具页使用品牌落地页式的超大首屏。

### 1.3 组件优先，局部覆写有边界

新增页面优先使用共享组件样式，例如 `wb-container`、共享 card、共享 badge、共享 button。只有当页面结构确实不同，才允许自定义实现。

允许自定义的条件：

- 页面已经有明确独立交互模型，例如 PPC 上传分析器。
- 需要保留第三方示例页的业务叙事结构，例如紫鸟业务场景。
- 模块总览页需要比普通子页更强的入口感。

自定义后仍必须遵守本指南的颜色、字体、圆角、阴影和可访问性规则。

---

## 2. 颜色体系

### 2.1 颜色来源

颜色归属以 `src/common/config/menuConfig.ts` 为准。左侧边栏一级目录的 `color` 是页面主视觉的上游来源。

共享色系的实现主要在：

- `src/common/constants/colorSchemes.ts`
- `src/css/components/welcome-banner.css`
- 各模块的总览样式文件，例如 `app_center_style.css`、`amz_hub_style.css`、`more_style.css`、`sops_style.css`

`colorSchemes` 的 scale / 彩色阴影仅用于总览/入口卡；工作台面板禁止 hover 位移与 scale。

### 2.2 一级目录和 banner 色系映射

| 模块 | 一级目录 | 目录 color | Banner theme / 主色 |
| --- | --- | --- | --- |
| SOPs 流程中心 | 运营与推广体系 | `emerald` | `wb-theme-growth` |
| SOPs 流程中心 | 供应链与物流体系 | `amber` | `wb-theme-supply` |
| SOPs 流程中心 | 账号安全与风控体系 | `red` | `wb-theme-safety` |
| SOPs 流程中心 | 客服与客户体验体系 | `teal` | `wb-theme-service` / `wb-theme-teal` |
| 应用中心 | Master Analysis | `indigo` | `wb-theme-indigo` |
| 应用中心 | Keyword Hunter | `fuchsia` | `wb-theme-fuchsia` |
| 应用中心 | PPC Tools | `emerald` | PPC hero 使用 emerald / teal |
| 应用中心 | Playground | **配置** `orange`（`menuConfig` 的 `themeColor` / category `color`） | **实现例外**（模板/CSS 现状）：Deep Chat 使用 terracotta + `wb-theme-supply` / `wb-container--hidden` 等；**本轮不新增** `wb-theme-orange` 作为唯一 banner class。归属**不是** indigo / cyan |
| Amazon 智库 | Amazon知识早知道 | `indigo` | `wb-theme-indigo` |
| Amazon 智库 | 入门实操宝典 | `green` | `wb-theme-growth` |
| Amazon 智库 | 运营提升全攻略 | `violet` | `wb-theme-violet` |
| 更多 | 大模型探索 | `teal` | `wb-theme-teal` |
| 更多 | 示例业务场景 | `cyan` | `zn-hero` 使用 cyan / blue |

模块总览页可以使用模块主题色，而不是某个一级目录色：

| 模块总览 | 模块 themeColor | 总览主色 |
| --- | --- | --- |
| SOPs 总览 | `blue` | blue / indigo |
| 应用中心总览 | `purple` | purple / pink |
| Amazon 智库总览 | `orange` | orange / red |
| 更多总览 | `green` | green / emerald |

### 2.3 主色、辅色和点缀色

主色用于：

- welcome banner 背景渐变。
- welcome banner 主图标渐变。
- 主图标阴影。
- 当前页面最重要的 badge 或 eyebrow。
- 侧边栏对应目录的图标和左侧装饰线。

辅色用于：

- 主色渐变的第二端。
- hover 阴影。
- 低透明度 orb / particle。
- 信息卡片顶部细线或左侧色条。

点缀色用于：

- tag dot。
- 图表系列。
- 状态提示。
- 业务分类。

点缀色不能反客为主。一个页面的首屏主视觉应该能一眼看出它属于哪个一级目录。

### 2.4 新增颜色规则

不要在页面模板里随手新增裸色值。优先顺序：

1. 使用已有 theme class，例如 `wb-theme-indigo`。
2. 使用全局 token，例如 `var(--color-slate-500)`。
3. 使用模块已有变量，例如 `--app-primary`。
4. 如果必须新增局部变量，命名必须带模块前缀，例如 `--ppc-hero-primary`。

新增 theme 时必须同时提供：

- 背景渐变变量。
- 装饰 orb 变量。
- 粒子颜色变量。
- 主图标渐变。
- 主图标阴影。
- 小徽章渐变。

### 2.5 用户 Appearance 主题

系统设置中的外观主题（Appearance）只改全局 `--color-primary*`、focus 环及由其派生的 token。

边界：

- **不**改左侧目录色、welcome banner 归属、`wb-theme-*`。
- **不**保证硬编码 Tailwind `blue-*` 等工具类随 Appearance 变化。
- `minimal`（极简素色）：工业 slate-700 主色档，适合长时作业。

反例：

- 用 Appearance 冲掉模块归属色。
- 用 Appearance 引入展示字体、彩色 glow。
- 承诺 Appearance 为「整站换肤」。

上层分层与验收见 [稳定主题系统规范](./THEME_SYSTEM_GUIDELINES.md) 的 A2 双层模型。

---

## 3. Welcome Banner 规范

### 3.1 默认使用共享组件

普通页面首屏优先使用：

```html
<div class="wb-container wb-container--simple wb-theme-indigo">
  <div class="wb-content">
    <div class="wb-icon">
      <i class="fas fa-example" aria-hidden="true"></i>
    </div>
    <div class="wb-title-row">
      <h1 class="wb-title">页面标题</h1>
      <span class="wb-badge">LABEL</span>
    </div>
    <p class="wb-description">页面说明。</p>
    <div class="wb-tags" aria-label="页面能力标签">
      <div class="wb-tag">
        <span class="wb-tag-dot" aria-hidden="true"></span>
        <span>标签</span>
      </div>
    </div>
  </div>
</div>
```

应用中心 card 型页面使用：

```html
<div class="wb-container wb-container--card wb-theme-fuchsia mb-8">
  <div class="wb-card">
    <div class="wb-bg-gradient"></div>
    <div class="wb-grid-pattern"></div>
    <div class="wb-content">
      <!-- header / icon / text -->
    </div>
  </div>
</div>
```

### 3.2 Banner 类型

| 类型 | 使用场景 | 约束 |
| --- | --- | --- |
| `wb-container--simple` | SOPs、AMZ、More 普通内容页 | 横向轻量，背景淡，图标 52px 左右 |
| `wb-container--card` | 应用中心工具页 | 信息密度更高，允许 `.wb-card` 背景层 |
| 模块总览 hero | 模块入口页 | 可以更强，但仍使用模块主题色 |
| 自定义 hero | PPC、紫鸟业务场景等特殊页 | 必须遵守目录色映射和字体规格 |
| `wb-container--hidden` | Deep Chat 等首屏不适合展示 banner 的页面 | 保留 DOM 语义，但视觉隐藏，不占布局 |

### 3.3 Banner 字体规格

| 元素 | 普通 banner | 总览 / 强 hero | 说明 |
| --- | --- | --- | --- |
| Title | `20px / 700 / 1.375` | `22px / 800 / 1.3` | 不使用负 letter-spacing |
| Description | `14px / 1.5` | `14px / 1.5` | 最大行宽建议 74ch |
| Tag | `12px / 500` | `12px / 500` | 最小高度 28px |
| Badge | `10px / 700` | `12px / 800` | 根据层级使用，不要过度放大 |

页面内部紧凑卡片标题不应直接套 hero 字号。工具页卡片标题通常使用 `14px` 到 `18px`。

### 3.4 Banner 背景和装饰

普通 banner 背景要求：

- 主背景是低饱和、低透明度渐变。
- orb / particle 只作为轻微纹理。
- 粒子透明度不应影响文本可读性。
- 背景层不得遮挡内容。

装饰使用边界：

- 普通工具页可以有少量 orb / particle。
- 表单区、表格区、配置区不重复使用强装饰背景。
- Deep Chat、聊天、编辑器类页面可隐藏 banner，避免首屏被横幅挤占。

### 3.5 图标和 badge

主图标容器规则：

| 项 | 标准值 | 说明 |
| --- | --- | --- |
| Card banner 图标容器 | `56px`，PC 压缩态 `46px` | `.wb-icon-main` |
| Simple banner 图标容器 | `52px`，PC 压缩态 `46px` | `.wb-icon` |
| 自定义 hero 图标容器 | PC 首屏默认 `46px` | PPC 等特殊 hero 必须对齐 |
| 容器圆角 | `12px` | 使用 `--wb-icon-radius`，不改成胶囊或正圆 |
| Card 主图标字号 | `22px`，PC 压缩态 `19px` | 使用 `--wb-icon-card-font-size` / `--wb-icon-pc-font-size` |
| Simple 主图标字号 | `21px`，PC 压缩态 `19px` | 使用 `--wb-icon-font-size` / `--wb-icon-pc-font-size` |
| 主图标颜色 | `#ffffff` | 使用 `--wb-icon-color`，不要在页面级覆盖成彩色 |
| 阴影 | 同色系低透明阴影 | 使用 `--wb-icon-shadow` / `--wb-icon-shadow-hover` |

图标配色规则：

- 使用 Font Awesome 或项目已有图标体系，不使用 emoji 承担功能语义。
- 主图标渐变必须跟左侧一级目录色系一致。
- `--wb-icon-gradient-1` 是主色，`--wb-icon-gradient-2` 是同色系相邻色或同类辅助色。
- 主图标阴影必须跟主图标同色系，不使用默认蓝色阴影覆盖其他目录。
- 装饰性 `<i>` 必须设置 `aria-hidden="true"`。
- 单页自定义 hero 也必须显式定义主图标 token，不能只写局部 `width/background/color`。

Icon-badge 规则：

| 项 | 标准值 | 说明 |
| --- | --- | --- |
| 尺寸 | `20px`，PC 压缩态 `18px` | 使用 `--wb-icon-badge-size` / `--wb-icon-badge-pc-size` |
| 偏移 | `right: -4px; bottom: -4px` | 使用 `--wb-icon-badge-offset` |
| 圆角 | `999px` | 右下角小徽章允许为圆形 |
| 边框 | `2px solid #ffffff` | 用白边把小徽章从主图标中分离 |
| 内部图标字号 | `8px`，PC 压缩态 `7px` | 使用 `--wb-icon-badge-font-size` / `--wb-icon-badge-pc-font-size` |
| 阴影 | 同色系轻阴影 | 使用 `--wb-icon-badge-shadow` |

Icon-badge 配色：

- 默认使用当前主题的同色系辅助色，不再全局默认橙色。
- 如果主图标是蓝/靛蓝，可使用紫/蓝相邻色作为 icon-badge。
- 如果主图标是增长绿、服务青绿、PPC emerald，则 icon-badge 使用 emerald/teal 内部变化。
- 如果主图标是安全红，icon-badge 使用 rose/red，不能用橙色替代风险色。
- icon-badge 只表达“辅助状态/能力”视觉，不承载页面主状态；持续动画不放在 icon-badge 上。

Badge 规则：

- Badge 文案要短，通常不超过两个词或一个短标签。
- Badge 背景使用当前 `wb-theme-*` 的主色浅底，文本使用同色系深档。
- Badge 不承担页面主标题职责。
- Badge 默认不做脉冲、闪烁等持续动画；如确有状态变化含义，必须显式使用状态组件，不在 welcome banner badge 上表达。

### 3.6 底部元素和 badge 归一化

底部元素命名：

- 新页面统一使用 `wb-tags > wb-tag`。
- 旧页面允许保留 `wb-meta > span`，但它只是兼容别名，视觉必须与 `wb-tag` 一致。
- 不在同一个 banner 内混用 `wb-meta` 和 `wb-tags`。

底部元素视觉：

- Tag 是 28px 最小高度的胶囊标签，字号 `12px / 500`。
- `wb-tag-dot` 默认继承当前 `wb-theme-*` 的主题色；只有模块总览或跨类别说明场景可以使用多色 dot。
- `wb-meta` 内的 Font Awesome 小图标必须 `aria-hidden="true"`，颜色继承当前主题色，不写页面级硬编码蓝色。
- 如果使用 `mr-1` 等间距工具类，组件 CSS 会以统一 gap 为准；新代码不再额外加图标 margin。

Badge 视觉：

- `wb-badge-*` 只表达语义类别；在带 `wb-theme-*` 的 banner 中，最终颜色以 banner 主题色为准。
- Badge 背景、文本、边框必须来自 `--wb-badge-bg`、`--wb-badge-color`、`--wb-badge-border`。
- `wb-badge-safety` 使用红/玫红风险色系，`wb-badge-service` 使用青绿服务色系，不能回退到橙色或紫色孤岛。
- Badge 图标使用 `currentColor`，尺寸约 `9px`，不单独改成高饱和强调色。

---

## 4. 布局、间距和圆角

### 4.1 页面容器

工具页默认使用 `module-container`。不要在单页里重新定义宽度体系。

PC 端常规结构：

- 页面顶部：welcome banner。
- 主内容：卡片、表单、数据表或工作区。
- 卡片之间：`24px` 左右间距。
- 内容区内部：按 8px 递进。

### 4.2 圆角

| 元素 | 圆角 |
| --- | --- |
| 工作台面板 / 表单工作区 | **≤ 8px** |
| Welcome banner / 模块总览入口卡 | **12–16px**（不得复制到工具面板） |
| 表单输入 | `8px` 到 `12px` |
| Tag / pill | `999px` |
| 图标容器 | `8px` 到 `12px` |

不要在同一页面混用过多圆角风格。工具页卡片优先克制，不使用过大的圆角；总览入口卡的大圆角不得套用到工作台面板。

### 4.3 阴影

阴影用于表达层级，不用于装饰堆叠。

推荐：

- Banner: 低透明大范围阴影。
- 卡片: `shadow-sm` 或很轻的边框。
- 弹窗 / dropdown: 明确浮层阴影。

避免：

- 每个卡片都有强彩色阴影。
- 同一区域同时使用粗边框、强阴影、大渐变。
- hover 时大幅位移。

---

## 5. 文字和信息层级

### 5.1 标题层级

每个页面应有一个清晰主标题。优先用：

- `h1.wb-title` 用于页面主标题。
- `h2` 用于页面主要 section。
- `h3` 用于卡片内部标题。

不要为了视觉大小随意跳标题层级。

### 5.2 正文

正文默认：

- 字号 `14px`。
- 行高 `1.5` 到 `1.7`。
- 颜色 `slate-600` 或相近 token。

长文页面：

- 控制正文行宽。
- 用 section、列表、表格分组。
- 避免一整屏连续灰字。

### 5.3 文案密度

Welcome banner 只解释当前页面能做什么，不写操作手册。

推荐结构：

- 标题：页面名称。
- 描述：一句话说明价值和范围。
- Tag：数据源、状态、能力边界。

不推荐：

- 在 banner 写大段使用说明。
- Tag 写成长句。
- 同一个信息在 title、description、tag 中重复。

---

## 6. 表单、按钮和状态

### 6.1 表单

表单字段必须有可访问名称：

- 可见 label。
- 或 `aria-label`。
- 或 `aria-labelledby`。

输入区域必须有清晰状态：

- 默认。
- focus。
- disabled。
- loading。
- error。
- success。

错误信息应靠近字段，不只放在页面顶部。

### 6.2 按钮

按钮层级：

- Primary: 当前页面最主要动作，一个区域内通常只保留一个。
- Secondary: 常规辅助动作。
- Ghost / subtle: 低优先级动作。
- Danger: 删除、清空、不可逆操作。

按钮尺寸和图标：

- 有明确命令时使用文本或图标加文本。
- 图标按钮必须有 `aria-label`。
- 不用 emoji 作为按钮图标。

### 6.3 状态组件

Loading、empty、error、success、toast 必须统一语义：

- loading 超过 300ms 时显示稳定占位。
- error 提供原因和可操作下一步。
- toast 不承载唯一关键信息。
- 长任务提供进度或阶段说明。

---

## 7. 自定义页面的约束

### 7.1 PPC 页面

PPC 使用自定义 `.ppc-hero` 是允许的，但必须满足：

- Hero 主色跟 `PPC Tools` 的 `emerald` 目录色一致。
- 主图标遵守 welcome banner PC 压缩规格：`46px` 容器、`12px` 圆角、`19px` 主图标。
- 右下角 icon-badge 使用 `18px`、`-4px` 偏移、`7px` 内部图标和 `2px` 白边。
- 主图标和 icon-badge 都使用 emerald / teal 同色系，不回退到蓝色、橙色或紫色。
- 业务 tag dot 可以保留多色，用于表达数据源或分析维度。
- 不把全页功能色一次性改成 hero 色，除非做完整模块级改版。

### 7.2 紫鸟业务场景页

紫鸟业务场景使用 `.zn-hero` 是允许的，但必须满足：

- 首屏 banner 主色跟 `示例业务场景` 的 `cyan` 目录色一致。
- 场景内部可以使用案例辅助色，但不覆盖首屏归属。
- 使用须知页的 `zn-notice-title` 也按 welcome banner 处理。

### 7.3 模块总览页

模块总览页可以比普通子页更强，但必须：

- 使用模块主题色，而不是随机选择。
- 保持标题、描述、tag 字号和共享 banner 接近。
- 不把总览 hero 的强样式复制到普通工具页。

---

### 7.4 Deep Chat 工作台

Deep Chat（`src/modules/app_center/views/playground/deep-chat/`）是应用中心 Playground 下的对话工作台。它使用独立的 terracotta 品牌 token，但必须服从本文的工具优先与层级克制原则。

#### 品牌色（Terracotta）

| Token / 用途 | 值 |
| --- | --- |
| 主色 `--deep-chat-accent` | `#a85f3f`（rgb `168, 95, 63`） |
| Hover `--deep-chat-accent-hover` | `#8f4f33` |
| Active `--deep-chat-accent-active` | `#6f3925` |
| Soft 底 `--deep-chat-accent-soft` | `#faf3ee` |
| 画布底 `--deep-chat-bg` | `#fffaf7` |
| 主文字 `--deep-chat-ink` | `#0f172a` |

- 主色只用于小面积强调：边框、焦点环、选中态、主操作填充按钮、hover 文字。
- 工作台背景使用近白奶油渐变，不要整屏偏桃/偏橙染色。
- 宽屏与窄屏共用同一套环境色，不要在 `≥1024px` 强制回纯白卡片把氛围冲掉。

#### 次级工具按钮（默认黑字）

适用于侧栏「新建会话」「搜索会话」与顶栏「Skill Library」等次级 chrome 按钮。

| 状态 | 背景 | 文字 / 图标 | 描边 |
| --- | --- | --- | --- |
| 默认 | `#ffffff` | 黑色 `#0f172a`（`--deep-chat-ink`） | terracotta 低透明度描边 |
| Hover / Focus | `#ffffff` | terracotta `#8f4f33` | 描边略加重 + 轻阴影 |
| Active | 同 hover | 同 hover | 可轻微下压 `translateY` |

规则：

1. **默认必须是黑字**，不要默认使用 terracotta 文字或奶油底染色。
2. **只有 hover / focus 才切换字体与图标颜色**到品牌色。
3. 图标颜色默认 `inherit`，与文字同步，避免图标单独高亮抢视线。
4. 同类次级按钮视觉规格应统一：白底、细描边、黑字、hover 变色。
5. 主发送按钮等主操作仍可用品牌填充色，不与次级按钮混用同一默认态。

#### 会话列表

- 最近会话标题默认字重 `400`（不要加粗抢视线）。
- 自动标题长度可到约 100 字；窄栏与搜索列表用 CSS 行数裁切（侧栏约 3 行、搜索约 2 行），不要在数据层过早截成极短文案。
- 未读点、进行中状态用小面积点缀，不要整行高亮成主色块。

#### 搜索会话弹窗

- 弹窗宽度保持适中（约 `680px`），不要为了“少省略”去强行拉满主工作区宽度。
- 列表内容长度通过标题生成与行数裁切解决，而不是改窗口尺寸。

实现文件：

- 样式：`src/modules/app_center/views/playground/styles.css`
- 组件内联样式：`deepChatStyles.ts`（widget 内部 chrome）
- 交互：`controller.ts`、`skillLibrary.ts`

---

## 8. 实施流程

### 8.1 新增页面流程

1. 在 manifest 中确认模块和 `category`。
2. 查 `menuConfig.ts` 中该 category 的 `color`。
3. 选择对应 `wb-theme-*` 或自定义 hero token。
4. 使用共享 banner 结构。
5. 使用现有 card、button、badge、form 样式。
6. 在 PC 端浏览器检查首屏、滚动后主内容、focus 状态。
7. 运行必要校验。

### 8.2 修改旧页面流程

1. 先记录现有页面归属和一级目录色。
2. 只改影响归一化的样式，不顺手重构业务逻辑。
3. 如果页面已有自定义 hero，先判断能否迁移到 `wb-*`。
4. 不能迁移时，补齐颜色、字体、圆角、阴影和可访问性约束。
5. 浏览器确认真实计算样式。

### 8.3 新增 theme 流程

新增 `wb-theme-*` 前先确认已有 theme 是否可复用。

必须新增时：

```css
.wb-theme-example {
  --wb-gradient-1: rgba(...);
  --wb-gradient-2: rgba(...);
  --wb-orb-1-color: rgba(...);
  --wb-orb-2-color: rgba(...);
  --wb-orb-3-color: rgba(...);
  --wb-particle-color: rgba(...);
  --wb-icon-gradient-1: #...;
  --wb-icon-gradient-2: #...;
  --wb-icon-shadow: 0 8px 18px -14px rgba(...);
  --wb-icon-shadow-hover: 0 10px 22px -16px rgba(...);
  --wb-icon-badge-gradient-1: #...;
  --wb-icon-badge-gradient-2: #...;
  --wb-icon-badge-shadow: 0 6px 12px -9px rgba(...);
}
```

---

## 9. 验收清单

视觉验收：

- 页面主色和左侧一级目录色一致。
- Welcome banner title、description、tag 字号符合规范。
- 背景色、图标渐变、图标阴影、icon-badge 阴影属于同一色系。
- 主图标容器尺寸、圆角、内部图标字号、右下角 icon-badge 符合 3.5 规格。
- Tag 可以有点缀色，但不会抢主色。
- 没有新增孤立 hero 系统。
- 页面首屏不被过度装饰占据。

可访问性验收：

- 页面主标题层级清晰。
- 装饰图标有 `aria-hidden="true"`。
- 图标按钮有 `aria-label`。
- 表单字段有 label 或等价可访问名称。
- 文本对比度足够，灰字不压在浅灰背景上。

实现验收：

- 新增样式优先走共享 token。
- 没有无理由新增 `!important`。
- 没有在模板里散落大量裸色值。
- 自定义 hero 有明确理由。
- `git diff --check` 通过。
- 影响页面样式时，使用浏览器确认 PC 端真实渲染。

推荐命令：

```bash
git diff --check
npm run build
```

---

## 10. 常见反例

### 反例 1：页面归属和 banner 主色不一致

问题：

- 左侧一级目录是 `Keyword Hunter / fuchsia`。
- 页面 banner 使用 `cyan`。

修正：

- 改为 `wb-theme-fuchsia`。
- 保留 tag dot 的业务多色。

### 反例 2：图标颜色跟背景色脱节

问题：

- 背景是绿色系。
- 主图标仍是蓝色渐变。
- 图标阴影仍是蓝色。

修正：

- 同步修改 `--wb-icon-gradient-*` 和 `--wb-icon-shadow*`。

### 反例 3：普通工具页使用总览 hero

问题：

- 工具页顶部使用大面积模块总览 hero。
- 首屏只看到横幅，看不到实际工作区。

修正：

- 改回 `wb-container--simple` 或 `wb-container--card`。
- 将操作说明放入下方卡片或 helper text。

### 反例 4：自定义页面完全脱离规范

问题：

- 自定义 `.foo-hero` 有独立字号、圆角、背景、图标、tag。
- 和侧边栏目录无关系。

修正：

- 优先迁移到 `wb-*`。
- 如果不能迁移，至少对齐本指南的颜色映射、字体规格、圆角和阴影。

---

## 11. 维护责任

新增或修改视觉系统时，需要同步检查：

- `src/common/config/menuConfig.ts`
- `src/common/constants/colorSchemes.ts`
- `src/css/components/welcome-banner.css`
- 对应模块样式文件
- 本文档

如果目录色调整，必须同步更新 welcome banner 映射，避免侧边栏和页面首屏再次分裂。
