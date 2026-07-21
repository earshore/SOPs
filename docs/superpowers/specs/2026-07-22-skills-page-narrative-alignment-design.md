# Skills 页叙事对齐设计（方案 B）

**日期：** 2026-07-22  
**状态：** Implemented（方案 B 页面叙事对齐已落地）  
**范围：** 更多 → 大模型探索 → 技能页 UI/文案/板块结构  
**对照页：** 更多 → 大模型探索 → 提示词（`prompts/template.html`）

---

## 1. 目标与成功标准

### 1.1 产品目标

运营能理解「技能是什么 / 怎么用 / 何时用」，并在约 1 次滚动内进入技能目录完成试用或复制。

### 1.2 成功标准

1. 板块节奏与提示词页一致：原则 → 公式 → 目录 → 路径 → 规则。
2. 主 CTA 仍是 **在 Deep Chat 试用**（卡片 + 详情弹窗）。
3. 视觉归属「更多 / 大模型探索」：`wb-theme-violet` + slate 卡片 + violet 强调（与提示词页同系）。
4. 筛选区不吸顶；不新增硬编码主色；不引入技能 CRUD。
5. 现有目录交互（搜索、分类、卡片、详情、复制、试用）行为不回归。

---

## 2. 决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 结构方案 | **B：叙事增强 + 目录近首屏** | 对齐提示词叙事深度，目录仍靠上，主路径「找技能 → 试用」不丢 |
| 不选 A | 全镜像后目录下沉过深 | 与检索优先冲突 |
| 不选 C | 目录绝对第一 + 叙事下沉 | 与用户优先「叙事与方法论」不一致 |
| 吸顶 | 保持 `position: static` | 用户已明确要求筛选随页滚动 |
| 次要折叠区 | 删除 `details.skills-secondary` | 指标与三步说明拆入原则/公式/页脚，避免主叙事藏在折叠里 |

---

## 3. 信息架构（自上而下）

```
1. Welcome Banner（保留并微调文案）
2. 使用原则 ×4（新）
3. 技能使用公式（新，对标 Prompt Formula）
4. 技能目录（现有：搜索 + 分类 + 卡片网格）
5. 高频实战路径 ×4（新，对标 Seller Playbooks）
6. 业务规则如何进入技能（新，对标 Business Operating Rules）
7. 页脚：来源说明 + 轻量统计（总数/分类/脚本/试用版）
```

### 3.1 与提示词页映射

| 提示词页 | 技能页（本设计） |
|----------|------------------|
| Welcome Banner + tags | 同结构；tags 含动态总数 |
| 四原则卡 | 使用原则 ×4 |
| Prompt Formula | 技能使用公式 |
| Prompt Library（搜索/分类/卡片） | 技能目录 |
| Seller Playbooks 2×2 | 高频实战路径 2×2 |
| Business Operating Rules | 业务规则如何进入技能 |
| （无单独折叠指标） | 页脚四指标条 |

---

## 4. 板块内容规格

### 4.1 Welcome Banner

- 容器：`wb-container wb-container--simple wb-theme-violet`
- 图标：`fa-graduation-cap`
- 标题：技能  
- Badge：技能运营（或同等中文标签，不使用暴露内部 ID 的文案）
- 描述：强调「可挂载方法论 + Deep Chat 试用 / 复制全文」
- Tags：
  - 动态总数（空库：「技能库为空」）
  - 正式 / 试用版
  - 中文外壳 / 英文原文

### 4.2 使用原则 ×4

白底 `border-slate-200 rounded-lg` 卡片，图标区 `*-50` 浅底：

| 标题 | 要点 |
|------|------|
| 场景对齐 | 按广告 / Listing / 利润等选技能，不泛用万能 skill |
| 读清边界 | 能力边界、输入要求、输出格式先于试用 |
| 一键试用 | Deep Chat 挂载系统提示词，业务数据自己补 |
| 结果可验收 | 输出要能进 SOP/报表动作，而非空话 |

布局：`grid-cols-1 md:grid-cols-2 xl:grid-cols-4`，`mb-6`。

### 4.3 技能使用公式

- 外层：白卡 + eyebrow「Skill Formula」+ 标题「技能使用公式」
- 左（`lg:col-span-3`）：深色 `bg-slate-950` 结构块，6 步：
  1. 选场景  
  2. 读 SKILL 边界  
  3. 准备真实输入  
  4. 挂载 / 试用  
  5. 补业务数据  
  6. 验收与归档  
- 右（`lg:col-span-2`）两卡：
  - 上线前五问（列表）
  - 不要这样用（violet 浅底强调）

### 4.4 技能目录（主入口，行为不变）

保留：

- 搜索（`#skill-search`）
- 分类按钮（`#skill-category-container`）
- 结果计数（`#skill-result-count`）
- 卡片网格（`#skill-list`）
- 详情 `app-modal`、复制全文、在 Deep Chat 试用

微调（实现时）：

- 区块 eyebrow / 副标题与提示词库对齐（如「Skill Library」「可试用方法论」）
- `.skills-catalog-sticky` 保持 **static**，不吸顶
- 空库：筛选区可隐藏或保留空态引导；指标用「—」

### 4.5 高频实战路径 ×4

2×2 网格，每卡含：图标 + 标题 + 一句说明 + 输入/处理/输出 三格。

| 路径 | 与 registry 分类呼应 |
|------|----------------------|
| Listing 转化 | `listing` |
| 广告分诊 | `advertising` |
| 利润与定价 | `pricing_profit` |
| 选品与竞品 | `product_research` / `competitor` |

路径卡 **不强制** 跳转筛选（YAGNI）；若实现时零成本，可选「点击路径预填分类」作为增强，非本 spec 必做。

### 4.6 业务规则如何进入技能

6 张规则卡（类名建议 `skill-source-card`，样式平行 `prompt-source-card`）：

1. Listing 合规 — 先合规再转化  
2. 关键词口径 — 分组后再进标题/五点/A+  
3. 广告样本量 — 低样本只观察  
4. VOC 证据 — 聚类 + 责任分发  
5. 利润口径 — 费用与毛利事实  
6. 挂载与人工复核 — 技能给方法，人不让模型替你拍板  

每卡：label + strong 标题 + 说明 + 「技能要求」子块。

### 4.7 页脚

- Amazon-Skills 来源链接（MIT，nexscope-ai/Amazon-Skills）
- 说明：工作台编程加载走 skillRegistry，不向运营暴露 skillId 复制入口
- 四指标：总数 / 分类 / 脚本 / 试用版（`#metric-*` 逻辑复用现有 `renderMetrics`）

---

## 5. 视觉与设计规范

| 项 | 约定 |
|----|------|
| Banner | `wb-theme-violet` |
| 卡片 | 白底 `border-slate-200 rounded-lg` |
| 主强调 | violet token / 既有 `skill-cta-primary` |
| 公式深色区 | `slate-950` + violet 点缀字色（对标提示词页） |
| 规则卡 | 可复用 prompts 的 source-card 视觉语言，独立 class 避免耦合 |
| 颜色 | 禁止页面内随意新增主色硬编码；优先 token / 既有 violet-slate 模式 |
| 动画 | 克制；仅 transition 已有交互即可 |
| 可访问 | 图标 `aria-hidden`；搜索 label；modal 既有 close/CTA |

参考：`docs/VISUAL_DESIGN_GUIDELINES.md`、`docs/THEME_SYSTEM_GUIDELINES.md`。

---

## 6. 实现边界

### 6.1 在范围内

- `skills/template.html` 结构重组与文案  
- `skills_style.css`：原则/公式/路径/规则/页脚样式；删除吸顶相关残留  
- `skills/index.ts`：指标渲染目标 DOM 调整（若 ID 迁移）；空库 chrome；**不**改 handoff 协议  
- 可选：从 prompts_style 抽取/平行 source-card 样式  

### 6.2 非目标

- skillRegistry / vendor SKILL.md 变更  
- Deep Chat 挂载协议、Chip、会话状态机  
- 技能 CRUD、skillId 运营复制  
- 筛选吸顶、个性化推荐、路径强制跳转筛选  

---

## 7. 文件与改动预期

| 文件 | 改动 |
|------|------|
| `src/modules/more/views/explore/skills/template.html` | 主结构按 IA 重排；移除 `details.skills-secondary` |
| `src/modules/more/views/explore/skills/skills_style.css` | 新板块样式；对齐 prompts 密度 |
| `src/modules/more/views/explore/skills/index.ts` | 指标/空库 DOM 选择器适配；其余交互保持 |
| 测试 | 若有 skills 路由/DOM 依赖测试则更新选择器；无则仅 smoke 目录仍可用 |

---

## 8. 验收清单

- [ ] 桌面：顺序为 Hero → 原则 → 公式 → 目录 → 路径 → 规则 → 页脚  
- [ ] 目录：搜索 / 分类 / 卡片 / 详情 / 复制 / Deep Chat 试用可用  
- [ ] 空库：Banner + 指标「—」+ 引导，不误显示「0 已接入」错觉  
- [ ] 移动端无横向溢出；主 CTA 可点  
- [ ] 筛选区滚动时不悬浮固定  
- [ ] `npm run type-check`、相关 lint、既有 skills/deep-chat 单测不回归  

---

## 9. 风险与缓解

| 风险 | 缓解 |
|------|------|
| 页面变长导致目录下沉 | 原则/公式控制字数；目录仍在中上段 |
| 与 prompts 样式耦合 | 使用 `skill-source-card` 等独立 class，视觉平行而非 import 绑定 |
| 空库 DOM ID 变更 | `renderMetrics` / `syncEmptyLibraryChrome` 同步改选择器并手测 |

---

## 10. 下一步

1. 用户审阅并批准本 spec  
2. 调用 **writing-plans** 输出实现计划（任务拆分 + 验收步骤）  
3. 按计划实现与验证  

---

## Spec Self-Review（已执行）

- [x] 无 TBD/TODO 占位  
- [x] 方案 B 与 IA、非目标一致  
- [x] 范围限于技能页 UI，不扩散 Deep Chat  
- [x] 吸顶/折叠区/主 CTA 行为已显式约定  
