# 组件开发规范（Component Guidelines）

**Status:** active · SSOT · v1.0  
**Updated:** 2026-07-26  
**Owner:** 前端 / 设计系统  
**适用范围:** 全部用户可见 UI（含系统设置抽屉、工作台、模块页）

> **目标：** 禁止每页 reinvent 按钮/表单/弹层，保证 Appearance 与模块归属可落地。  
> **上位法：** [PRODUCT_PRINCIPLES](./PRODUCT_PRINCIPLES.md) · [THEME_SYSTEM_GUIDELINES](./THEME_SYSTEM_GUIDELINES.md) · [VISUAL_DESIGN_GUIDELINES](./VISUAL_DESIGN_GUIDELINES.md) · [MODAL_DEVELOPMENT_GUIDELINES](./MODAL_DEVELOPMENT_GUIDELINES.md)

---

## 1. 原则

1. **先共享后定制**：优先 `src/css/components/*`、共享 Alpine 组件、已有 settings/workbench 模式。  
2. **一条视觉语言**：主按钮、次按钮、危险、幽灵在全站语义一致。  
3. **Token 优先**：颜色/圆角/间距用 CSS 变量或 design-tokens；禁止新增业务页裸色值。  
4. **触控与焦点**：可点目标建议 **≥ 40–44px** 高；`:focus-visible` 可见。  
5. **工作台不漂移**：内容面板默认 **禁止 hover 位移 / scale 放大**（入口总览卡除外，见 VISUAL）。  
6. **新建组件要登记**：新增平行组件族须在 PR 说明「为何不能扩展现有类」。

---

## 2. 共享样式源（实现 SSOT）

| 能力 | 路径 | 说明 |
| --- | --- | --- |
| 按钮 | `src/css/components/buttons.css` | `.action-btn` + 变体 |
| 表单 | `src/css/components/forms.css` | 字段高度、focus、checkbox/radio |
| 卡片 | `src/css/components/cards.css` | 通用 card |
| Badge | `src/css/components/badges.css` | 状态/标签 |
| 空状态 | `src/css/components/empty-state.css` | `.empty-state` |
| Toast | `src/css/components/toast.css` + `showToast` | 禁止业务自建 snackbar |
| Modal | `src/css/components/modals.css` + `app-modal` / `confirmWithModal` | 见 Modal 规范 |
| Tabs / Loading / Status | 同目录对应文件 | 优先复用 |
| 模型选择 + 刷新 | `src/components/modelSelect/` + `docs/guides/model-select-component-guide.md` | 「选择 LLM 模型 + 重新获取模型列表」唯一实现；Settings 区只复用其 service 纯函数 |
| 入口 Banner | `welcome-banner.css` | 模块归属色，**不受** Appearance 换肤覆盖 |
| 设置面板专用 | `src/components/settings/systemSettings.css` | 仅设置抽屉；新页面**不要**复制为业务 SSOT |

页面壳：见 [SHARED_CAPABILITIES_GUIDE](./SHARED_CAPABILITIES_GUIDE.md)（`BaseModule` / 工厂）。

---

## 3. 按钮（Button）

> **裸按钮（naked button）重置：** 直接使用原生 `<button>` 而不套共享类时，必须重置浏览器默认样式——`font: inherit`（含 `font-family` / 字号）、`background: transparent`、`border: 0`、`cursor: pointer`；能复用共享类的场景优先用 `.action-btn` 族。裸按钮同样受 §3.2 契约与 focus ring 约束（ACCESSIBILITY §2.2）。

### 3.1 变体矩阵

| 变体 | 类名（共享） | 用途 | 同屏建议 |
| --- | --- | --- | --- |
| **Primary** | `.action-btn.action-btn-primary` | 主保存、主提交、主 CTA | **每个操作区 ≤ 1** |
| **Secondary** | `.action-btn.action-btn-secondary` | 取消、测试、导出、次要操作 | 可多个 |
| **Danger** | `.action-btn-danger`（实心）+ `.action-btn-danger-ghost`（描边）两档；token：`--color-error` / `--color-error-dark`；hover 加深；必须配 focus ring | 删除、清空 | **永不**与 Primary 同视觉权重并排争抢；危险区独立，与主操作间距 ≥1rem（16px） |
| **Ghost / Text** | `.action-btn-ghost`（透明底；hover 用 `--color-bg-hover`；disabled 同 §3.2 disabled 规范） | 三级操作、链接式 | 不单独承担不可逆 |
| **Icon（图标按钮）** | `.action-btn-icon`（icon-only）；触控 ≥44px；必须 `aria-label`；图标 16px（见 VISUAL §3.5） | 工具栏、紧凑操作 | 密集排布时相邻间距 ≥8px |

设置区已对齐的模式（可参考，勿整文件复制）：

- 表单底栏：次要 flex + 主按钮更宽（如 `settings-strategy-footer`）  
- 双列操作：测试 | 保存等宽网格（如 `settings-proxy-form__actions`）

**按钮组 / 工具栏 recipe：**

- 组内间距 `8px`（`--spacing-xs`）；多组之间 `16px`（`--spacing-md`）。
- 等宽网格场景（如「测试 | 保存」）用 CSS grid 均分，不用手写 margin。
- 主次权重排布：Primary 放视觉终点（右侧 / 末位），Secondary 前置；同组必须同高（§3.4），禁止混档。

### 3.2 行为契约

| 状态 | 要求 |
| --- | --- |
| Default / Hover / Active / Disabled / Loading | 必须可区分；disabled 不接收点击 |
| Loading | 必须 `aria-busy="true"`；防重复提交；保留按钮宽度防布局跳动（实现细则见下） |
| 筛选 / 切换类按钮 | 选中态用 `aria-pressed`（true/false）表达，不只靠颜色 |
| 不可交互但需读屏 | 用 `aria-disabled="true"`（不用 disabled 属性）；样式同 disabled，保留可聚焦与可读屏 |
| 图标按钮 | 必须有 `aria-label` 或可见文本 |
| 工作台面板内 | 避免 `translateY` 强悬停位移（与 VISUAL 一致） |
| 按钮 hover 边界（P2-2） | 按钮 hover 允许 ≤1px 位移（`translateY(-1px)`），active 允许 pressed 反馈（`scale(0.98)`）；**面板/卡片**不适用此位移（THEME §4.1/§4.2） |

**Loading 态实现（`.action-btn.is-loading`）：**

- 类名约定：`.is-loading` 挂在 `.action-btn` 族上（`.action-btn.is-loading`）。
- spinner 尺寸 `14px`，颜色继承前景色（`currentColor`）。
- 必须 `aria-busy="true"`（按钮或其容器）。
- 防重复提交二选一：`disabled` 属性，或提交处理函数内业务锁早退。
- 保留按钮宽度防布局跳动：spinner 与文案同槽位替换，或 `min-width` 占位，禁止撑宽/缩窄。

**Disabled 规范：**

- 默认 `opacity: 0.5`（允许业务按场景覆盖，如 0.4–0.6）。
- **禁止 `cursor: not-allowed` 与 `pointer-events: none` 同时使用**（语义矛盾：前者表达可交互意图，后者已屏蔽事件）；二选一。
- `[aria-disabled]` 场景（不可交互但需读屏）：`aria-disabled="true"` + 点击事件守卫（早退），**不得**移出 Tab 序；样式同 disabled（opacity 0.5）。

**深色模式规则：**

- **禁止把提亮型 accent-strong token（如 `--settings-accent-strong`，dark 下被 `color-mix(…, #fff)` 提亮）用作白字按钮背景**：白字对比 ≈2.1:1，不达标（A9）。
- dark 主按钮向**深**推导：`--color-primary-dark`（或 `color-mix(accent, #000)`）；参照 `buttons.css` 既有做法（`.dark .action-btn-primary { --button-primary-bg: var(--color-primary-dark) }`）。

### 3.3 禁止

- 每个页面自定义一套渐变主按钮色（应用 Appearance primary 或模块 CTA 约定）。  
- 危险操作使用 Primary 实心蓝/绿。  
- 仅靠颜色区分唯一操作（须有文案）。

### 3.4 尺寸与密度

高度阶梯（用 `min-height` 实现，配对应 padding 与字号）：

| 档位 | 高度 | Padding | 字号 | 适用 |
| --- | --- | --- | --- | --- |
| 紧凑 | 36px | `var(--spacing-xs) var(--spacing-md)`（8px 16px） | `--text-xs`（12px） | 密集工具条、表格内操作 |
| 默认 | 40px | `var(--spacing-sm) var(--spacing-lg)`（12px 24px） | `--text-sm`（13px） | 常规操作；**A10 下限** |
| 大 | 44px | `var(--spacing-sm) var(--spacing-lg)`（12px 24px） | `--text-base`（14px） | 移动端 / 触控为主；**触控推荐值** |

- **40px 是 A10 触控目标下限**（ACCESSIBILITY A10），不是推荐值；移动端触控目标**强制 ≥44px**（ACCESSIBILITY §2）。
- 圆角统一 `--rounded-lg`（手写 `variables.css` = 12px）：按钮是**控件级**圆角，工作台面板 8px（`--workbench-radius`）是**表面级**圆角，控件 > 表面，形成层级差；禁止把按钮圆角压到面板 8px 或反向放大。
  - 注意：generated 档 `--rounded-lg` 为 `0.5rem`（8px），与手写档不一致（THEME §8 债务 D2）——按钮实现以手写 `variables.css` 的 12px 为验收值。
- 同组按钮必须同高（§3.1 按钮组 recipe）；高度阶梯只允许整体切换，禁止单按钮混档。

---

## 4. 表单（Form）

### 4.1 字段基线

以 `forms.css` 变量为准：

| Token | 用途 |
| --- | --- |
| `--field-height`（约 40px） | 默认输入/选择高度 |
| `--field-height-compact` | 密集工具条 |
| `--field-focus` / ring | 跟随 Appearance focus，**非**写死 blue-500 |

### 4.2 规则

| 规则 | 说明 |
| --- | --- |
| 可见 label | 禁止仅 placeholder 当 label（搜索框等明确模式除外） |
| 帮助文案 | 短、可操作；禁止正确的废话（见 [CONTENT_DESIGN](./CONTENT_DESIGN.md)） |
| 错误 | 贴近字段；勿只在页顶一句 |
| 开关 / 分段 | 偏好类可**即时保存**；长表单仍可显式保存 |
| 密钥 | 可显示/隐藏；边界文案指向本机存储诚实原则 |

### 4.3 布局 recipe

| 场景 | 推荐 |
| --- | --- |
| 双字段并排 | CSS grid `1fr 1fr`，窄屏改单列（≤520px） |
| Label + 控件同一行 | flex，align center，控件 `min-width` 明确 |
| 分段选择（5 档等） | `.settings-segmented` 或共享 segmented；选项等分 |

---

## 5. 反馈（Toast / 空状态 / 加载）

| 类型 | 标准 | 禁止 |
| --- | --- | --- |
| Toast | `showToast` / 共享 toast 组件 | 业务内自定义固定 snackbar |
| 空状态 | `.empty-state` + 标题 + 一句说明 + 可选 CTA | 空白无解释 |
| 加载 | 共享 loading / 按钮 loading | 整页无反馈死锁 |
| 确认 | `confirmWithModal` | `window.confirm`（devtools 除外） |

### 5.1 状态 token → 组件对照

状态色 token 以 `src/css/foundation/variables.css` 为准（暗色模式自动覆盖为 400 档）：

| Token | 浅色模式取值 | 用于 |
| --- | --- | --- |
| `--color-success` | `--color-green-500` | `.badge-success*`、成功 toast、完成态 |
| `--color-warning` | `--color-amber-500` | `.badge-warning*`、警告 toast、低置信度提示 |
| `--color-error` | `--color-red-500` | `.badge-error*` / `.badge-danger*`、危险 toast、表单校验错误 |
| `--color-info` | `--color-blue-500` | `.badge-info*`、信息 toast、空态说明图标 |
| `--color-neutral` | 无此 token | 中性用 `.badge-neutral`（`--color-slate-100` 底 / `--color-slate-700` 字）或 `--color-secondary`（slate-600） |

规则：状态只给语义（success/warning/error/info/neutral），组件内禁止另写状态色裸值。

---

## 6. 卡片与表面

| 用途 | 要求 |
| --- | --- |
| 内容卡 | 共享 card 或语义 surface；边框 + 轻阴影 |
| 入口总览卡 | 可用模块色与轻微动效；**工作台内面板**保持克制 |
| Badge | 语义固定（成功/警告/危险/信息/中性）；单区主 badge 宜少 |

卡片债与收敛：见 [CARD_UI_DEBT_REDUCTION_PLAN](./CARD_UI_DEBT_REDUCTION_PLAN.md)（计划，非替代本文）。

### 6.1 数据表（Table）

| 项 | 要求 |
| --- | --- |
| 数字列 | 右对齐 + `font-variant-numeric: tabular-nums`（数字位对齐，参考 VISUAL 排版角色 Numeric） |
| 文本列 | 左对齐 |
| 吸顶表头 | `position: sticky` + `z-index: var(--z-sticky)`（variables.css = 35） |
| 行 hover | 只变背景，不做位移/缩放 |
| 空态 | 复用共享 `.empty-state`（标题 + 一句说明） |
| 加载 | 长表首屏用 skeleton（共享 loading），不做整页死锁 |
| 窄屏 | 提供横向滚动容器或卡片摘要，不挤压正文（历史 UI-P2-07） |

禁止：表内自建第二套空态、行 hover 位移、数字列左对齐且不设 tabular-nums。

---

## 7. 弹层与抽屉

完整规则：[MODAL_DEVELOPMENT_GUIDELINES](./MODAL_DEVELOPMENT_GUIDELINES.md)。

摘要：

| 场景 | 实现 |
| --- | --- |
| 表单/详情 | `<app-modal>` |
| 危险确认 | `confirmWithModal` |
| 系统设置 | 抽屉 + 内部危险仍 confirm |
| 特殊选择器 | 可定制布局，须复用焦点/Escape/滚动锁 |

---

## 8. Alpine / 生命周期

| 要求 | 说明 |
| --- | --- |
| 注册时机 | 组件在 `Alpine.start()` 前注册 |
| 清理 | EventBus / timer / 监听在 `$cleanup` 或 unmount 释放 |
| 全局 API | 业务导航用 `navigateToRouteId` / 约定 action，禁止散落 `location.hash` |

详见 `docs/api/AlpineRegistry.md` 与根 `CLAUDE.md` / `AGENTS.md`。

---

## 9. 无障碍（组件层最低线）

| 项 | 最低要求 |
| --- | --- |
| 焦点 | 键盘可到达主操作；focus-visible 环 |
| 名称 | 图标按钮有 accessible name |
| 对比 | 正文与图标对比度可用（目标：接近 WCAG AA） |
| 动效 | 尊重 `prefers-reduced-motion` |
| 对话框 | `role="dialog"` / `aria-modal` 由共享 modal 提供，勿自废 |

完整产品目标见 [ACCESSIBILITY.md](./ACCESSIBILITY.md)；组件层以本表为强制底线。

---

## 10. 系统设置：保存语义矩阵（即时 vs 显式）

> **SSOT 行为在代码：** `src/components/settings/systemSettings.ts`。改保存语义须同步改本表 + 相关单测/e2e。  
> 关闭债：**TD-SET-02**（文档化）；API 收敛仍属 **TD-SET-01** 拆分范围。

| 区域 / 控件 | 调用 | 模式 | Dirty 分区 | 面板关闭 |
| --- | --- | --- | --- | --- |
| LLM 主表单（Endpoint/Key/模型等）+「保存 LLM」 | `saveProviderConfig()` | **显式** | 清 LLM 脏 | **不**自动关 |
| 推理开关 / 推理档位 | `autoSaveProviderConfig(...)` | **即时** | 不进「未保存表单」脏（已写盘） | 不关 |
| 推理档位被模型能力降级 | `autoSaveProviderConfig(..., { silent: true })` | **即时静默** | 同上 | 不关 |
| 工具策略表单数值/开关（改后未点保存） | `setRuntime*` / 工具目标模型 | **脏**直至显式保存 | 运行时/工具分区 | 关时确认 |
| 「保存工具与运行策略」 | `saveToolStrategy()` | **显式**（同时写 tool + runtime） | 清对应脏 | **不**自动关 |
| 应用策略预案按钮 | `persistRuntimeStrategySettings({ toast })` | **即时** | 已写盘 | 不关 |
| Master Analysis 性能设置 | `persistRuntimeStrategySettings` | **即时** | 已写盘 | 不关 |
| 采集代理 Key/类型 + 保存 | `saveProxyConfig()` | **显式** | 网络分区 | 不关 |
| 数据区「保存数据策略」（`runtime.storage.*`） | `saveRuntimeStrategy()` → 同 `saveRuntimeStrategySettings` | **显式**（有意分区按钮；与工具区同 runtime API 族，非第二引擎） | runtime | **不**自动关；Toast：`数据策略已保存` |
| Appearance 主题 / 颜色模式 / 动效 | `ThemeManager` / `animationSettingsStore` | **即时**（独立 store） | 不走 LLM/工具脏分区 | 不关 |

**开发者规则：**

1. **按钮型偏好**（开关、档位、预设）→ 即时写盘 + 短 Toast；禁止「再找大保存」。  
2. **表单型配置**（多字段、Key、Endpoint）→ 显式保存；保存后**禁止**强制关面板。  
3. 新增设置控件时：先归入上表一行，再写代码；并在 PR 注明即时/显式。  
4. 用户可见文案遵循 [CONTENT_DESIGN](./CONTENT_DESIGN.md)；安全边界见 [SECURITY_PLAYBOOK](./SECURITY_PLAYBOOK.md)。

---

## 11. PR 检查清单（组件相关）

- [ ] 未新增平行 button/input/modal 体系  
- [ ] Primary ≤ 1 / 操作区；Danger ≠ Primary  
- [ ] 无新增未映射裸 hex（或已说明 allowlist）  
- [ ] 表单有可见 label；密钥/破坏操作有边界  
- [ ] Toast/确认走共享能力  
- [ ] 有对应单测或 e2e（行为变更时）  
- [ ] 工作台面板无违规 hover 位移  

---

## 12. 反模式

| 反模式 | 后果 |
| --- | --- |
| 复制 `systemSettings.css` 整段到业务模块 | 第三套设计系统 |
| 页面内联大段色板 | Appearance/归属失效 |
| 每个列表自建删除确认 UI | 行为不一致 |
| 用 banner 主题包装设置抽屉 | 归属错误 |
| 「先做完再补规范」 | 债务指数增长 |

---

## 13. 版本与演进

| 版本 | 说明 |
| --- | --- |
| v1.0 | 初版：按钮/表单/反馈/卡片/弹层/清单 |
| v1.1 | §10 系统设置即时 vs 显式保存矩阵（TD-SET-02） |
| v1.2 | 补充数据表规范（§6.1）、状态 token 对照表（§5.1）、按钮 hover 边界（§3.2） |
| v1.3 | 登记 ModelSelect 共享组件（模型选择 + 刷新，见 `docs/guides/model-select-component-guide.md`） |
| v1.4 | 按钮规范补齐：danger/ghost/icon 变体类名、§3.4 尺寸与密度、Loading/aria/disabled 契约、深色 accent-strong 禁用（2026-08 按钮体系缺口审查） |
| 后续 | 补 DatePicker、虚拟列表；可加示意截图 |

变更走 [PRODUCT_PRINCIPLES §5](./PRODUCT_PRINCIPLES.md#5-规范变更流程)。
