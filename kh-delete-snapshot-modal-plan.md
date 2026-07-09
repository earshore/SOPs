# 需求规格与实现规划：Keyword Hunter 输入页「删除快照」模态框

> **实施状态：✅ 已完成（2026-07-09）**。T1–T7 全部落地，测试 9/9 通过，`lint` / `type-check` / `format:check` / `build` 全绿。

> 目标：将 Master Analysis（数据采集页）删除历史快照的**模态框视觉/交互效果**完整复刻到 Keyword Hunter（输入格式化页）的删除快照操作。**危险态头部渐变直接复刻 MA 的 `红→橙 (#dc2626→#f97316)`，不使用 KH 主配色**；其余配色契合 KH（中性画框 + 危险红 + 蓝主题变体），不引入 MA 紫色品牌。

---

## 1. 背景与需求

| 项 | 内容 |
| --- | --- |
| 参考对象 | `master_analysis` 数据采集页（`scraper`）→ `HistoryPanel.deleteHistoryItem` 的删除确认模态框 |
| 目标对象 | `keyword_hunter` 输入格式化页（`input`）→ `deleteInputSnapshot` 的删除确认 |
| 交付范围 | 本文件：需求规格（spec）→ 交互差异分析 → 视觉规范 → 组件拆分 → 任务步骤 → 验收标准 |
| 关键约束 | ① 复刻 MA 模态框的**结构/动画/可访问性**；② 危险态头部渐变**直接复刻 MA 红→橙**（`#dc2626→#f97316`）；③ 其余配色契合 KH（中性画框 + 危险红 + 蓝主题变体），不引入 MA 紫色品牌；④ 不改动 MA 代码（范围纪律） |

---

## 2. 两页面「删除快照」交互差异分析

| 维度 | Master Analysis（参考 / 现状 ✅） | Keyword Hunter（目标 / 现状 ❌） |
| --- | --- | --- |
| **渲染方式** | 自建 DOM 模态框（`<body>` 注入 `ma-confirm-modal-backdrop`） | 原生浏览器 `window.confirm()` 灰色弹窗 |
| **视觉风格** | 品牌化：渐变标题栏 + 图标 + 圆角卡片 + 阴影 + 背景模糊 | 操作系统默认灰盒，与 KH 精致 UI 完全不搭 |
| **标题/图标** | 红色→橙色渐变头部 + `fa-exclamation-triangle` 警告图标 | 无（原生标题栏） |
| **危险提示** | 文案含 `<span class="text-red-400">此操作无法撤销</span>` | 纯文本一句提示 |
| **按钮** | 取消（slate）+ 确认（红色实心，危险态） | 系统「确定/取消」 |
| **"不再提示"** | 有（`ignore_delete_history_snapshot` 通过 `StorageService` 持久化） | 无 |
| **可访问性** | `role="dialog"` `aria-modal` `aria-labelledby/describedby`；Esc 关闭；点遮罩关闭；焦点管理（打开聚焦取消、关闭还原焦点） | 无 |
| **动画** | 遮罩 `fade-in`、卡片 `transform scale-100 transition` | 无 |
| **删除后** | 调 `HistoryService.deleteByIdAsync` → 重载 → toast 成功 → 发事件 | 调 `KeywordHunterSnapshotService.deleteByIdAsync` → 重载 → toast 成功（逻辑已 OK，只差确认 UI） |

**结论**：KH 的删除逻辑（删服务 + 重载 + toast）已经正确，唯一缺口是**确认 UI 是原生弹窗**。本任务就是把 MA 那套「自建模态框」能力移植到 KH，并改配色。

> 附带发现：KH `input/index.ts` 的 `confirmBeforeRestore`（恢复快照确认）同样用了 `window.confirm`。本规划**仅覆盖删除**（按需求范围），恢复确认列为可选后续项，不在本次改动内。

---

## 3. 视觉规范定义

> 结构、尺寸、动画、可访问性与 MA **完全一致**。配色原则：**危险态头部渐变直接复刻 MA（`#dc2626→#f97316`，按用户纠正）**；其余颜色契合 KH 调色板（中性画框 + 危险红 + 蓝主题变体），不引入 MA 紫色品牌。KH 调色板取自 `keyword_hunter/styles.css`（蓝 `#2563eb` / 翠绿 `#10b981` / 玫红 `#f43f5e` / 危险红 `#dc2626`）。

### 3.1 遮罩（backdrop）
- 类：`kh-confirm-modal-backdrop`
- 样式：`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center fade-in`
- 背景：`rgba(15,23,42,0.5)`（与 MA 同，保持全站遮罩语义一致）

### 3.2 卡片（modal）
- 类：`kh-confirm-modal kh-confirm-modal--danger bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition`
- 边框：`1px solid rgba(15,23,42,0.08)`（中性边框，避免引入 MA 紫或 KH 玫红品牌色，保持干净画框）
- 阴影：`0 24px 64px -32px rgba(15,23,42,0.18), 0 18px 48px -34px rgba(15,23,42,0.5)`（中性柔和阴影）

### 3.3 标题栏（--danger 变体）
- 类：`kh-confirm-modal-header p-5 text-white`
- 背景：`linear-gradient(135deg, #dc2626 0%, #f97316 100%)`
  - **按需求纠正：危险态头部渐变直接复刻 Master Analysis（`#dc2626 → #f97316` 红→橙），不使用 KH 主配色（玫红）。** 这是本任务"复刻视觉效果"的核心，橙色是危险语义的一部分。
- 标题：`text-lg font-bold`，图标 `fa-exclamation-triangle`，与 MA 同结构

### 3.4 内容区
- 描述文案：`text-sm text-slate-600`
- "此操作无法撤销" 副提示：`text-xs text-red-600 mt-1 block`（红色危险提示，与头部危险语义一致，替代 MA 的 `text-red-400`）
- "不再提示" 复选框：`kh-confirm-modal-checkbox`，`accent-color: #dc2626`（KH 危险红，契合配色要求，不引入 MA 紫色）；标签 `text-xs text-slate-500`

### 3.5 按钮
| 按钮 | 类 / 样式 | 配色（KH） |
| --- | --- | --- |
| 取消 | slate 文字 + hover `slate-100` 背景 | `text-slate-500` → hover `text-slate-700 bg-slate-100`（同 MA，中性） |
| 确认（危险） | `kh-confirm-modal-confirm min-h-10 px-5 py-2 text-white rounded-lg text-sm font-bold shadow-md` | `background: #dc2626`；hover `#b91c1c`；focus ring `rgba(220,38,38,0.32)` —— 红色危险按钮，数值与 MA 危险态一致，且与 KH 现有 `.keyword-hunter-input-snapshot-action.delete` / `.keyword-hunter-danger-action` 同色系 |

### 3.6 主题变体（--theme，非破坏性，预埋以便将来复用）
- 标题栏：`linear-gradient(135deg, var(--color-blue-600,#2563eb), var(--color-blue-700,#1d4ed8))`
- 确认按钮：`var(--color-blue-600)` → hover `var(--color-blue-700)`
- 用于未来可能的「恢复快照确认」等，保持 `confirmWithModal` API 与 MA 一致（自动识别破坏性）

### 3.7 动画
- 复用全站全局工具：`fade-in`（`src/css/animations/keyframes.css` 已定义，无需新增）
- 卡片：`transform scale-100 transition` + 可选 `fade-in-scale`（`src/css/components/forms.css:281` 已有），与 MA 视觉一致

### 3.8 可访问性（逐字复刻 MA 逻辑）
- `role="dialog"` `aria-modal="true"` `aria-labelledby` `aria-describedby`
- Esc 关闭（返回 false）、点遮罩关闭（返回 false）、取消/确认按钮 `{ once:true }`
- 打开时聚焦取消按钮；关闭时还原触发前焦点
- 渲染不完整自动降级关闭

---

## 4. 组件拆分

| 文件 | 类型 | 职责 | 说明 |
| --- | --- | --- | --- |
| `src/modules/app_center/views/keyword_hunter/utils/confirmModal.ts` | **新增** | KH 版确认模态框 | 移植 MA `confirmModal.ts` 的 `confirmWithModal` / `mountConfirmModal` / 焦点/Esc/遮罩/清理逻辑，类名改为 `kh-confirm-modal-*`，破坏性自动识别 |
| `src/modules/app_center/views/keyword_hunter/styles.css` | **修改** | 模态框样式 | 新增 `.kh-confirm-modal-*` 系列（backdrop / card / --danger / --theme / header / confirm / checkbox），配色如上 §3 |
| `src/modules/app_center/views/keyword_hunter/input/index.ts` | **修改** | 接入模态框 | `deleteInputSnapshot`（约 L606–622）将 `window.confirm(...)` 替换为 `confirmWithModal('删除输入快照', '...<br/><span ...>此操作无法撤销</span>', 'kh_ignore_delete_input_snapshot', '删除快照')` |
| `src/modules/app_center/views/keyword_hunter/input/index.ts`（顶部 import） | **修改** | 引入新组件 | `import { confirmWithModal } from '../utils/confirmModal';` |

> 不新建共享组件库（避免越界改动 MA）。若后续多模块需要，再抽 `@/components/ConfirmModal` 统一 —— 列为后续优化，不在本次。

**参考文件（只读，不改）**：
- `src/modules/app_center/views/master_analysis/utils/confirmModal.ts`（逻辑范本）
- `src/modules/app_center/views/master_analysis/master_analysis_style.css:133–183`（CSS 范本）

---

## 5. 任务步骤（原子化 + 每步验证）

- [ ] **T1 新增 KH confirmModal 组件骨架**
  移植 `confirmWithModal` / `mountConfirmModal` / `getElements` / `addListeners` / `removeListeners` / `cleanupModal` / `getPreviousActiveElement` / `isDestructiveConfirmation` 逻辑；类名前缀 `kh-`；删除 MA 专属 `ma-accent` 依赖。
  *验证*：文件可被 TS 编译，`confirmWithModal` 导出签名与 MA 一致。

- [ ] **T2 新增 KH 模态框 CSS**
  在 `keyword_hunter/styles.css` 追加 §3 全部规则（backdrop / card / --danger / --theme / header / confirm / checkbox）。
  *验证*：`npm run css:audit` 无新增硬编码告警；`npm run type-check` 通过。

- [ ] **T3 接入删除流程**
  `deleteInputSnapshot` 用 `confirmWithModal` 替换 `window.confirm`；标题「删除输入快照」、危险副提示、ignoreKey `kh_ignore_delete_input_snapshot`、确认标签「删除快照」。
  *验证*：删除逻辑（删服务+重载+toast）保持原有行为；`confirmBeforeRestore` 不动。

- [ ] **T4 "不再提示"持久化**
  组件内部复用 `StorageService.get/set`（与 MA 同），ignoreKey 命中即跳过弹窗直接返回 `true`。
  *验证*：首次勾选→删除→再次点击删除不再弹窗；清除 storage 后恢复。

- [ ] **T5 可访问性 & 交互对齐**
  确保 `role/aria`、Esc、遮罩点击、焦点管理、降级关闭与 MA 一致。
  *验证*：键盘可达（Tab/Esc）、读屏语义正确、焦点还原。

- [ ] **T6 测试**
  - 组件测试：挂载→确认回调 true / 取消 false / Esc false / 勾选"不再提示"后跳过（镜像 `HistoryPanel.test.ts` 对 `confirmWithModal` 的 mock 方式）。
  - 删除流程测试：`deleteInputSnapshot` 在确认后调用 `deleteByIdAsync` 并 `showToast` 成功；取消时不删除。
  *验证*：`npx vitest run` 相关文件通过。

- [ ] **T7 质量门 + 手动验收**
  `npm run lint` → `npm run type-check` → `npm run build` 全绿；本地 `npm run dev` 目测删除弹窗视觉与动画。
  *验证*：构建产物无错误；视觉对比 MA 弹窗结构一致、危险头部为红→橙渐变。

---

## 6. 验收标准（Definition of Done）

1. 点击删除图标 → 弹出**居中、品牌化模态框**（非原生 `window.confirm`）。
2. 标题栏为**红→橙渐变（`#dc2626→#f97316`，直接复刻 MA）** + 警告图标；确认按钮为**红色实心**；取消为 slate。
3. 确认 → 执行删除 + 成功 toast；取消 / Esc / 点遮罩 → 中止，不删。
4. 勾选「不再提示」后，再次删除**不再弹窗**（持久化）；清空 storage 可恢复。
5. 焦点在关闭后**还原到触发按钮**；具备完整 ARIA 对话框语义。
6. 视觉结构/动画与 MA 删除弹窗**一致**；危险态头部直接复刻 MA 红→橙渐变，其余配色契合 KH（红/蓝/中性），**非** MA 紫色品牌。
7. `lint` / `type-check` / `build` 全绿，无回归；KH 浮动窗（z-9999）等其他组件不受影响。
8. 新增测试覆盖确认/取消/Esc/不再提示/删除流程。

---

## 7. 待确认决策（实施前需拍板）

| # | 决策点 | 推荐 | 备选 |
| --- | --- | --- | --- |
| D1 | 危险态头部渐变 | **已确认：直接复刻 MA** `#dc2626→#f97316`（红→橙，不使用 KH 主配色） | — |
| D2 | 范围 | **仅删除**（严格按需求） | 顺带把 `confirmBeforeRestore` 也换模态框（一致性更好，但超出范围） |
| D3 | "不再提示" | **保留**（完整复刻 MA 删除弹窗） | 移除（破坏性操作默认每次确认更安全） |

---

## 8. 风险与注意

- **z-index**：MA 用 `z-[60]`；KH 浮动窗为 `z-9999`。删除弹窗在输入页正常流中触发，不会被遮挡；但若日后浮动窗常驻需复核层级。规划保持 `z-[60]` 与 MA 对齐。
- **样式作用域**：新增 `.kh-confirm-modal-*` 仅作用于 KH 注入的 DOM（挂到 `<body>`），类名前缀隔离，不影响 MA。
- **PurgeCSS**：`config/postcss.config.js` 已禁用 PurgeCSS，动态类名不会被误删（与 MA 现状一致）。
- **不改动 MA**：严格遵守范围纪律，`master_analysis` 文件只读。
