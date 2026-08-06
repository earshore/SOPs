# 无障碍规范（Accessibility）

**Status:** active · SSOT · v1.0  
**Updated:** 2026-08-07  
**Owner:** 前端 + 产品  
**目标等级（本阶段）：** **实用子集**（接近 WCAG 2.2 **AA 的关键路径**，非全站认证式合规）  

> **上位法：** [PRODUCT_PRINCIPLES](./PRODUCT_PRINCIPLES.md) · [COMPONENT_GUIDELINES](./COMPONENT_GUIDELINES.md) · [MODAL](./MODAL_DEVELOPMENT_GUIDELINES.md)  
> **诚实范围：** 内部运营工具、以 **PC 键盘 + 鼠标** 为主；移动端触控尽量满足，但不承诺完整移动 a11y 认证。

---

## 1. 产品决策

| 项 | 决策 |
| --- | --- |
| 主要输入 | 键盘 + 鼠标（PC） |
| 屏幕阅读器 | 关键流程应可理解；不承诺全站 SR 精细打磨 |
| 色觉 | 状态不只靠颜色（配文字/图标） |
| 动效 | 必须尊重 `prefers-reduced-motion` |
| 完整 WCAG 审计 | 非当前发版门禁；以本清单 + 抽检为准 |

若未来对外或采购要求 AA 认证，须单独立项升级本文件目标与 CI。

---

## 2. 强制底线（所有新 UI）

| # | 要求 | 验收 |
| --- | --- | --- |
| A1 | 可聚焦控件有 **可见 focus-visible** | Tab 可见环；勿 `outline: none` 无替代 |
| A2 | 图标按钮有 **accessible name** | `aria-label` 或可见文本 |
| A3 | 表单控件有 **可见 label**（或 sr-only 等效） | 不只靠 placeholder |
| A4 | 主操作 **键盘可达** | Tab / Enter / Space；Esc 关闭弹层 |
| A5 | 弹层 **焦点陷阱 + 关闭后焦点恢复** | 用共享 `app-modal` / confirm，勿自写残缺实现 |
| A6 | 危险操作 **确认** 且按钮文案明确 | `confirmWithModal` |
| A7 | 状态 **不只靠色** | 成功/错误有文案或图标 |
| A8 | 动效可关 | `prefers-reduced-motion`；设置「减少动效」生效 |
| A9 | 对比度可用 | 正文对比大致达标；浅灰字勿用于关键信息 |
| A10 | 触控目标 | 移动端触控目标**强制 ≥ 44px**（PC 主按钮 ≥ 40px 下限）；相邻按钮间距 **≥ 8px**（防误触） |

组件层细则见 [COMPONENT_GUIDELINES §9](./COMPONENT_GUIDELINES.md#9-无障碍组件层最低线)。

### 2.1 对比度数值（A9 细则）

| 场景 | 最低要求 |
| --- | --- |
| 正文（正常字号） | ≥ 4.5:1 |
| 大字号 / 粗体（≥18px，或 ≥14px bold） | ≥ 3:1 |
| disabled | 不要求达标，但必须保留可辨识边框 |
| 状态色文字（`--color-error` 等，浅底） | ≥ 4.5:1 |

> `--color-error` / `--color-success` / `--color-warning` / `--color-info` 均存在于 `src/css/foundation/variables.css`（浅色 = 500 档；暗色模式自动切换为 400 档），深色模式按 resolved 模式复核。
>
> **执行指引**：500 档状态色（如 red-500 `#ef4444` 白底约 3.8:1）用于图标 / 描边 / 浅色底，**不用于浅底上的状态文字**。状态文字需满足 ≥ 4.5:1 时使用深档：优先 `--color-*-dark`（600 档，如 `--color-error-dark`），必要时用色阶 700 档（`--color-red-700` 等，来自 `design-tokens.ts`）。

### 2.2 Focus ring 规格（A1 细则）

**双轨裁决（2026-08 横向审查定案，与代码实现一致）：** 按钮/弹层与表单控件采用两套焦点环，按控件类型选用：

| 轨道 | 适用 | 实现（代码事实） | 关键 token |
| --- | --- | --- | --- |
| **A · outline 双 2px** | 按钮（`.action-btn` 全变体）、弹层一般控件 | `outline: 2px solid var(--color-focus-ring); outline-offset: 2px;`（`buttons.css` L50-53 `.action-btn:focus-visible`） | `--color-focus-ring`（variables.css L118-122 = `var(--color-primary)`） |
| **B · box-shadow 单环 3px** | 表单控件（input / textarea / select / checkbox / radio） | `outline: none` + `box-shadow: 0 0 0 3px var(--field-focus-ring)`（forms.css `.form-input:focus` L91-97、`.form-textarea:focus` L132-137、`.form-select:focus` L384-389） | `--field-focus-ring` = `color-mix(in srgb, var(--color-focus-ring) 14%, transparent)`（forms.css L41-45） |

- 表格内联编辑 / 紧凑控件用 **2px 单环**变体：`box-shadow: 0 0 0 2px var(--field-focus-ring)`（forms.css L548-552，仅 `@media (min-width: 768px)`）；checkbox / radio 用 `--check-ring-focus`（10%，forms.css L56-60）。
- **Token 登记：**
  - `--field-focus-ring`（forms.css L41-45）：表单轨道专用，新增表单控件一律复用，禁止另写 `rgba(...)` 焦点环字面量（error / success 聚焦已对齐 color-mix 手法，forms.css L255-259 / L291-294）。
  - `--focus-ring-width` / `--focus-ring-offset` / `--focus-ring-color` / `--focus-ring-style` / `--focus-ring-shadow`：**已定义于手写 `variables.css` §16 焦点环（L397-407）**，dark 下 `--focus-ring-shadow` 另有适配（L612-616）；但 **generated 层（variables.generated.css）未生成这些 token**、组件层未统一接线（forms 走 `--field-focus-ring`，buttons 走 outline 字面量）——登记为双写一致性收口项（THEME §8 D 类债务），本细则以轨道 A/B 验收。
- 不得 `outline: none` 且无替代（与 A1 一致）。
- focus ring 必须显式保留在 `.action-btn` 全部变体上（含 danger / ghost / icon：buttons.css L50-53；`qa-action-btn` L190-193；`category-filter-btn` L282-292），禁止裸 `outline: none` 无替代。

### 2.3 对比度豁免登记（A9 细则）

已知豁免（登记即承认，不隐藏）：

| 豁免项 | 实测对比 | 依据 / 缓解 |
| --- | --- | --- |
| `.action-btn-primary` 浅色模式白字（13px / `--text-sm`，非大字号，目标 4.5:1） | ≈ 3.7:1 | 大面积主 CTA 填充 + hover 加深至 `--color-primary-dark`；此前只写在 `buttons.css` 代码注释中，现登记于此 |

规则：

- 今后**新增豁免必须双处标注**：本节登记 + 对应代码注释，两处缺一视为未豁免。
- 登记时注明：选择器、字号、实测比值、缓解手段。
- 豁免仅允许「大面积填充 + 加深 hover」类缓解模式；纯文字小号状态色（§2.1）不适用豁免。

### 2.4 特型控件焦点豁免登记（A1 细则）

焦点环豁免规则对齐 §2.3：**新增豁免必须双处标注**（本节登记 + 对应代码注释，两处缺一视为未豁免）；登记注明选择器、实现、理由与代码侧标注状态。

| 控件 | 实现（代码事实） | 豁免理由 | 代码侧标注 |
| --- | --- | --- | --- |
| 营销日历搜索框 `.amzf_search_box`（`marketing_calendar/styles.css` L216-227） | 输入框 `.amzf_search_input` `outline: none`（L268-277），可见焦点由容器 `.amzf_search_box:focus-within` 承接（border-color + 4px halo，L249-256） | 玻璃拟态搜索容器整体反馈，焦点环不落在裸输入框 | **待补**：styles.css 缺注释，未满足双处标注 |
| Keyword Hunter 编辑器 `.keyword-hunter-editor-shell`（`keyword_hunter/styles.css` L950-960） | 内部 textarea 用 `focus:ring-0`，焦点由容器 `:focus-within` ring 承接（含 `--primary` 变体 L956-960） | 高亮层 + 容器统一 ring，避免双层焦点环 | **已标注**：forms.css L146-152 注释明示「focus 反馈由 editor-shell 的 focus-within ring 承担」 |

**非豁免登记（待收口，不是豁免）：**

| 项 | 现状（代码事实） | 收口方向 |
| --- | --- | --- |
| NPI 表格内联编辑（<768px） | 共享紧凑控件与焦点样式仅在 `@media (min-width: 768px)` 下存在（forms.css L531-552）；窄屏下 `[data-action="update-field"]` 控件无统一高度/焦点基线（sops_style.css L431-441 仅解固定列） | 补 <768px 基线或窄屏表格降级方案（关联 TD-CMP-02） |

---

## 3. 关键路径抽检清单（发版 / 大改 UI）

人工 15–20 分钟：

### 3.1 壳层

- [ ] Tab 能从顶栏到侧栏到主内容  
- [ ] 打开/关闭 Mega 菜单不丢焦点逻辑  
- [ ] 路由切换后焦点不落到不可见节点  

### 3.2 系统设置

- [ ] 打开设置：焦点在面板内  
- [ ] Esc：无脏数据直接关；有脏数据出现确认且可用键盘选  
- [ ] 侧栏一级/二级可键盘激活（按钮）  
- [ ] 推理开关与分段可用键盘  
- [ ] 保存/测试按钮可聚焦  

### 3.3 弹层

- [ ] 打开 confirm：焦点在对话框内  
- [ ] Esc / 取消关闭；确认后焦点回到触发控件（共享实现）  

### 3.4 一处业务主路径（任选）

- [ ] Deep Chat 输入框可聚焦发送  
- [ ] 或分析页主 CTA 可键盘触发  

---

## 4. 实现指引（短）

| 场景 | 做 |
| --- | --- |
| 自定义点击 div | 改为 `button` 或补 `role="button"` + 键盘处理（优先真 button） |
| 隐藏装饰图标 | `aria-hidden="true"` |
| 活区提示 | 谨慎使用 `aria-live`；Toast 由共享层处理 |
| 跳过链接 | 可选增强；非本阶段强制 |
| 暗色模式 | 对比度随 Color Mode 验收；主题规范优先 |

---

## 5. 测试与门禁

| 类型 | 要求 |
| --- | --- |
| 自动化 | 无全量 a11y CI 强制（债务 TD-DOC/TEST）；鼓励关键交互 e2e 用 role/name |
| 人工 | 大 UI PR 与 RC 发版做 §3 抽检 |
| 工具 | 可选：浏览器 a11y 面板、axe 扩展（不替代清单） |

策略总览：[TESTING_STRATEGY.md](./TESTING_STRATEGY.md)。

---

## 6. PR 检查（a11y）

- [ ] 无「可点 div」无键盘  
- [ ] 图标按钮有名字  
- [ ] 未去掉 focus 样式  
- [ ] 弹层走共享 modal  
- [ ] 动效考虑 reduced-motion  
- [ ] 错误/状态有非颜色通道  

---

## 7. 反模式

| 禁止 | 原因 |
| --- | --- |
| `outline: none` 且无 focus-visible 替代 | 键盘用户迷路 |
| 仅颜色表示错误 | 色弱不可用 |
| 自动播放强闪烁动画 | 前庭/光敏风险 |
| 用 `title` 代替可见错误 | 移动/键盘不可靠 |
| 弹层不锁焦点 | 焦点逃到背后页面 |

---

## 8. 相关

- [COMPONENT_GUIDELINES.md](./COMPONENT_GUIDELINES.md)  
- [MODAL_DEVELOPMENT_GUIDELINES.md](./MODAL_DEVELOPMENT_GUIDELINES.md)  
- [THEME_SYSTEM_GUIDELINES.md](./THEME_SYSTEM_GUIDELINES.md)  
- [TECH_DEBT_BOARD.md](./TECH_DEBT_BOARD.md)  
