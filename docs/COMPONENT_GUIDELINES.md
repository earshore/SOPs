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
| 入口 Banner | `welcome-banner.css` | 模块归属色，**不受** Appearance 换肤覆盖 |
| 设置面板专用 | `src/components/settings/systemSettings.css` | 仅设置抽屉；新页面**不要**复制为业务 SSOT |

页面壳：见 [SHARED_CAPABILITIES_GUIDE](./SHARED_CAPABILITIES_GUIDE.md)（`BaseModule` / 工厂）。

---

## 3. 按钮（Button）

### 3.1 变体矩阵

| 变体 | 类名（共享） | 用途 | 同屏建议 |
| --- | --- | --- | --- |
| **Primary** | `.action-btn.action-btn-primary` | 主保存、主提交、主 CTA | **每个操作区 ≤ 1** |
| **Secondary** | `.action-btn.action-btn-secondary` | 取消、测试、导出、次要操作 | 可多个 |
| **Danger** | 危险实心/描边（见 buttons.css 危险变体；无则用 border+红字） | 删除、清空 | **永不**与 Primary 同视觉权重并排争抢 |
| **Ghost / Text** | 透明或文字链 | 三级操作、链接式 | 不单独承担不可逆 |

设置区已对齐的模式（可参考，勿整文件复制）：

- 表单底栏：次要 flex + 主按钮更宽（如 `settings-strategy-footer`）  
- 双列操作：测试 | 保存等宽网格（如 `settings-proxy-form__actions`）

### 3.2 行为契约

| 状态 | 要求 |
| --- | --- |
| Default / Hover / Active / Disabled / Loading | 必须可区分；disabled 不接收点击 |
| Loading | 防重复提交；保留按钮宽度防布局跳动 |
| 图标按钮 | 必须有 `aria-label` 或可见文本 |
| 工作台面板内 | 避免 `translateY` 强悬停位移（与 VISUAL 一致） |

### 3.3 禁止

- 每个页面自定义一套渐变主按钮色（应用 Appearance primary 或模块 CTA 约定）。  
- 危险操作使用 Primary 实心蓝/绿。  
- 仅靠颜色区分唯一操作（须有文案）。

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

---

## 6. 卡片与表面

| 用途 | 要求 |
| --- | --- |
| 内容卡 | 共享 card 或语义 surface；边框 + 轻阴影 |
| 入口总览卡 | 可用模块色与轻微动效；**工作台内面板**保持克制 |
| Badge | 语义固定（成功/警告/危险/信息/中性）；单区主 badge 宜少 |

卡片债与收敛：见 [CARD_UI_DEBT_REDUCTION_PLAN](./CARD_UI_DEBT_REDUCTION_PLAN.md)（计划，非替代本文）。

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

## 10. PR 检查清单（组件相关）

- [ ] 未新增平行 button/input/modal 体系  
- [ ] Primary ≤ 1 / 操作区；Danger ≠ Primary  
- [ ] 无新增未映射裸 hex（或已说明 allowlist）  
- [ ] 表单有可见 label；密钥/破坏操作有边界  
- [ ] Toast/确认走共享能力  
- [ ] 有对应单测或 e2e（行为变更时）  
- [ ] 工作台面板无违规 hover 位移  

---

## 11. 反模式

| 反模式 | 后果 |
| --- | --- |
| 复制 `systemSettings.css` 整段到业务模块 | 第三套设计系统 |
| 页面内联大段色板 | Appearance/归属失效 |
| 每个列表自建删除确认 UI | 行为不一致 |
| 用 banner 主题包装设置抽屉 | 归属错误 |
| 「先做完再补规范」 | 债务指数增长 |

---

## 12. 版本与演进

| 版本 | 说明 |
| --- | --- |
| v1.0 | 初版：按钮/表单/反馈/卡片/弹层/清单 |
| 后续 | 补 Table、DatePicker、虚拟列表；可加示意截图 |

变更走 [PRODUCT_PRINCIPLES §5](./PRODUCT_PRINCIPLES.md#5-规范变更流程)。
