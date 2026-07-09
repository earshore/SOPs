# 需求规格与实现规划：Deep Chat 删除会话 / 删除 Prompt 模态框

> **实施状态：✅ 已完成（2026-07-09）**。本文件为 spec → 差异分析 → 视觉规范 → 组件拆分 → 任务步骤 → 验收标准的历史规划。
>
> **关键约束**：① 复刻 MA 模态框的**结构/动画/可访问性**；② **配色直接照搬 Master Analysis**（`#6257f5` 紫主色 + `#dc2626→#f97316` 红→橙危险态），不另作主题适配；③ 不改动 MA / KH 代码（范围纪律）；④ 覆盖两处删除：删除最近会话、删除 Prompt 列表。

---

## 1. 背景与需求

| 项 | 内容 |
| --- | --- |
| 参考对象 | `master_analysis` 数据采集页 → `HistoryPanel.deleteHistoryItem` 删除确认模态框（MA 配色） |
| 目标对象 A | `playground/deep-chat` → `deleteThread`（删除最近会话） |
| 目标对象 B | `playground/deep-chat` → `deletePromptDraft`（删除 Prompt 生成记录，即 Prompt 列表删除） |
| 交付范围 | 本文件：需求规格 → 交互差异分析 → 视觉规范 → 组件拆分 → 任务步骤 → 验收标准 |
| 配色 | **直接照搬 MA**：紫主色 `#6257f5` / 危险态头部 `红→橙 #dc2626→#f97316` / 确认按钮 `#dc2626` |

---

## 2. 删除交互差异分析

| 维度 | Master Analysis（参考 ✅） | Deep Chat 删除会话 / 删除 Prompt（目标 ❌） |
| --- | --- | --- |
| **渲染方式** | 自建 DOM 模态框 | 原生 `window.confirm()`（两处皆是） |
| **位置** | `master_analysis/utils/confirmModal.ts` | `playground/deep-chat/controller.ts:1552`（Prompt）、`:1634`（会话） |
| **视觉** | 品牌化渐变头部 + 图标 + 圆角卡片 + 模糊遮罩 | 操作系统默认灰盒，与 DC 精致 UI 不搭 |
| **标题/图标** | 渐变头部 + `fa-exclamation-triangle` | 无 |
| **危险提示** | "此操作无法撤销" 红色副提示 | 纯文本一句（"无法恢复"） |
| **按钮** | 取消（slate）+ 确认（红色实心） | 系统确定/取消 |
| **"不再提示"** | 有（`ignore_delete_history_snapshot` 持久化） | 无 |
| **可访问性** | `role/aria`、Esc、遮罩点击、焦点管理 | 无 |
| **动画** | 遮罩 `fade-in`、卡片 `scale-100 transition` | 无 |
| **删除后逻辑** | 删服务 → 重载 → toast | 逻辑已正确（删 `deletePromptResultAsync` + `removePromptHistory` / 改 `threadStore` + 重渲染），只差确认 UI |

**结论**：两处删除的**业务/删除逻辑均已正确**，唯一缺口是确认 UI 为原生弹窗。与 KH 任务完全相同的缺口，本任务照搬 MA 配色复刻模态框（KH 用了 KH 配色，本任务按你要求**直接用 MA 配色**）。

---

## 3. 视觉规范定义（直接照搬 MA 配色）

> 结构、尺寸、动画、可访问性与 MA **逐字一致**；颜色**直接复制 MA 的 `master_analysis_style.css:50–183` 数值**（紫主色 + 红→橙危险态），仅类名前缀由 `ma-` 改为 `dc-` 以自包含、避免跨模块样式耦合。

### 3.1 遮罩（backdrop）
- 类：`dc-confirm-modal-backdrop`
- 样式：`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center fade-in`
- 背景：`rgba(15,23,42,0.5)`（与 MA 同）

### 3.2 卡片（modal）
- 类：`dc-confirm-modal dc-confirm-modal--danger bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition`
- 边框：`1px solid rgba(98,87,245,0.24)`（**MA 紫主色边框，原值照搬**）
- 阴影：`0 24px 64px -32px rgba(98,87,245,0.42), 0 18px 48px -34px rgba(15,23,42,0.5)`（**MA 紫 tint 阴影，原值照搬**）

### 3.3 标题栏（--danger 变体）
- 类：`dc-confirm-modal-header p-5 text-white`
- 背景：`linear-gradient(135deg, #dc2626 0%, #f97316 100%)`（**MA 危险态红→橙，原值照搬**）
- 标题：`text-lg font-bold`，图标 `fa-exclamation-triangle`，与 MA 同结构

### 3.4 内容区
- 描述文案：`text-sm text-slate-600`
- "无法恢复" 副提示：`text-xs text-red-400 mt-1 block`（**MA 原值 `text-red-400`**，照搬）
- "不再提示" 复选框：`dc-confirm-modal-checkbox`，`accent-color: #6257f5`（**MA 紫主色，原值照搬**）；标签 `text-xs text-slate-500`

### 3.5 按钮
| 按钮 | 类 / 样式 | 配色（照搬 MA） |
| --- | --- | --- |
| 取消 | slate 文字 + hover `slate-100` 背景 | `text-slate-500` → hover `text-slate-700 bg-slate-100` |
| 确认（危险） | `dc-confirm-modal-confirm min-h-10 px-5 py-2 text-white rounded-lg text-sm font-bold shadow-md` | `background: #dc2626`；hover `#b91c1c`；focus ring `rgba(220,38,38,0.32)`（**MA 危险态原值**） |

### 3.6 主题变体（--theme，预埋复用）
- 标题栏：`linear-gradient(135deg, #6257f5, #8b5cf6)`
- 确认按钮：`#6257f5` → hover `#4f46e5`
- 用于将来非破坏性确认，保持 API 与 MA 一致（自动识别破坏性）

### 3.7 动画 / 可访问性
- 复用全局 `fade-in`（`src/css/animations/keyframes.css`）+ 卡片 `transform scale-100 transition`
- `role="dialog"` `aria-modal` `aria-labelledby` `aria-describedby`；Esc 关闭；点遮罩关闭；打开聚焦取消、关闭还原焦点；渲染不完整降级关闭 —— **逐字复刻 MA `confirmModal.ts` 逻辑**

---

## 4. 组件拆分

| 文件 | 类型 | 职责 |
| --- | --- | --- |
| `src/modules/app_center/views/playground/deep-chat/utils/confirmModal.ts` | **新增** | DC 版确认模态框。移植 MA `confirmModal.ts` 全部逻辑，`ma-` 类名 → `dc-`，错误前缀 `[DeepChat]` |
| `src/modules/app_center/views/playground/deep-chat/styles.css` | **修改** | 追加 `.dc-confirm-modal-*` 系列，数值**照搬 MA**（紫主色 + 红→橙危险态） |
| `src/modules/app_center/views/playground/deep-chat/controller.ts` | **修改** | 两处接入：`deletePromptDraft`（≈L1552）、`deleteThread`（≈L1634）将 `window.confirm` 替换为 `confirmWithModal`；顶部新增 `import { confirmWithModal } from '../utils/confirmModal'` |
| `src/modules/app_center/views/playground/deep-chat/index.test.ts` | **修改** | 将 `window.confirm` 桩改为 mock `confirmWithModal`（resolve true），保证现有删除测试仍通过 |

> **关于复用**：`master_analysis/utils/confirmModal.ts` 的样式依赖 `master_analysis_style.css`（`ma-` 类仅在 MA 模块上下文有样式），DC 上下文不会加载该 CSS，故**不能直接 import MA 组件**（会渲染成无样式弹窗）。因此采用与 KH 一致的"DC 自包含副本"方案（`dc-` 前缀 + DC 内 CSS），保证 MA 配色原值落地且不跨模块耦合。
>
> **后续优化（不在本次范围）**：MA / KH / DC 现已各有一份近相同的 confirm 模态框，可考虑抽为共享 `@/components/ConfirmModal`（按主题参数化）统一三处；列为后续技术债清理，本次不动 MA/KH。

**参考文件（只读）**：
- `src/modules/app_center/views/master_analysis/utils/confirmModal.ts`（逻辑范本）
- `src/modules/app_center/views/master_analysis/master_analysis_style.css:50–183`（MA 配色原值范本）
- `src/modules/app_center/views/keyword_hunter/utils/confirmModal.ts` + `keyword_hunter/styles.css`（DC 副本的结构范本）

---

## 5. 任务步骤（原子化 + 每步验证）

- [ ] **T1 新增 DC confirmModal 组件**
  移植 MA `confirmWithModal` / `mountConfirmModal` / `getElements` / `addListeners` / `removeListeners` / `cleanupModal` / `getPreviousActiveElement` / `isDestructiveConfirmation`，类名 `dc-` 前缀，错误前缀 `[DeepChat]`。
  *验证*：文件可被 TS 编译；`confirmWithModal` 签名与 MA 一致。

- [ ] **T2 新增 DC 模态框 CSS**
  在 `deep-chat/styles.css` 末尾追加 §3 全部规则，`dc-` 前缀，数值**照搬 MA**（`#6257f5` / `rgba(98,87,245,…)` / `#dc2626→#f97316` / `#dc2626` 等）。
  *验证*：`npm run type-check` 通过；`npm run css:audit` 无新增告警。

- [ ] **T3 接入两处删除**
  - `deletePromptDraft`（≈L1552）：`confirmWithModal('删除 Prompt 生成记录', '删除后将移除该 Prompt 生成记录，<br/><span class="text-xs text-red-400 mt-1 block">无法恢复</span>', 'dc_ignore_delete_prompt', '删除 Prompt')`
  - `deleteThread`（≈L1634）：`confirmWithModal('删除会话', '删除后仅移除本地 Deep Chat 历史，<br/><span class="text-xs text-red-400 mt-1 block">无法恢复</span>', 'dc_ignore_delete_thread', '删除会话')`
  *验证*：两处删除逻辑（删服务/改 store/重渲染/toast）保持原行为；仅确认 UI 变更。

- [ ] **T4 "不再提示"持久化**
  组件内复用已导入的 `StorageService.get/set`（controller.ts 已 import `StorageService`），ignoreKey 命中即跳过弹窗返回 true。
  *验证*：勾选后再次删除不再弹窗；清空 storage 恢复。

- [ ] **T5 可访问性 & 交互对齐**
  确保 `role/aria`、Esc、遮罩点击、焦点管理、降级关闭与 MA 一致。
  *验证*：键盘可达、读屏语义正确、焦点还原。

- [ ] **T6 测试**
  - **迁移现有测试**：`index.test.ts` 将 `vi.spyOn(window,'confirm')` 改为 `vi.doMock('../utils/confirmModal', () => ({ confirmWithModal: mocks.confirmWithModal }))` 并 `confirmWithModal.mockResolvedValue(true)`；删除 Prompt 测试（≈L562–565）、删除会话菜单测试维持断言。
  - **新增组件测试**：`deep-chat/utils/confirmModal.test.ts`（挂载→确认 true / 取消 false / Esc false / 不再提示跳过 / danger 变体），镜像 KH `confirmModal.test.ts`。
  *验证*：`npx vitest run` 相关文件通过。

- [ ] **T7 质量门 + 手动验收**
  `npm run lint` → `npm run type-check` → `npm run build` 全绿；本地 `npm run dev` 目测两处删除弹窗（紫主色边框 + 红→橙头部）视觉与动画。
  *验证*：构建无错误；视觉与 MA 删除弹窗一致。

---

## 6. 验收标准（Definition of Done）

1. 点击删除会话 / 删除 Prompt → 均弹出**居中、MA 配色模态框**（非原生 `window.confirm`）。
2. 标题栏为**红→橙渐变（`#dc2626→#f97316`）** + 警告图标；确认按钮**红色实心 `#dc2626`**；卡片为**紫色调边框/阴影**；取消为 slate。
3. 确认 → 执行原删除逻辑 + 成功 toast；取消 / Esc / 点遮罩 → 中止，不删。
4. 勾选「不再提示」后，再次删除**不再弹窗**（按操作分别持久化 `dc_ignore_delete_thread` / `dc_ignore_delete_prompt`）；清空 storage 可恢复。
5. 焦点关闭后还原；具备完整 ARIA 对话框语义。
6. 视觉结构/动画/配色与 MA 删除弹窗**完全一致**（紫主色 + 红→橙）。
7. `lint` / `type-check` / `build` 全绿，现有 DC 测试无回归；不影响 MA / KH。
8. 新增/迁移测试覆盖确认/取消/Esc/不再提示/两处删除流程。

---

## 7. 待确认决策

| # | 决策点 | 推荐 | 备选 |
| --- | --- | --- | --- |
| D1 | 配色 | **直接照搬 MA**（已按需求 #3 确定） | — |
| D2 | 范围 | **两处都改**（删除会话 + 删除 Prompt） | 仅改其一 |
| D3 | "不再提示" | **保留**（完整复刻 MA 删除弹窗，含两处独立 ignoreKey） | 移除（删除会话属破坏性，每次确认更安全） |

---

## 8. 风险与注意

- **不能直接 import MA 组件**：`ma-` 样式仅在 MA 模块 CSS 作用域内，DC 上下文无该 CSS → 必自建 `dc-` 副本（与 KH 一致）。
- **类名前缀隔离**：`.dc-confirm-modal-*` 不与 MA/KH 冲突；即使后续 MA CSS 在 DC 加载也不互相干扰。
- **PurgeCSS 已禁用**：`config/postcss.config.js` 禁用 PurgeCSS，动态类名与 `text-red-400` 等工具类不会被误删。
- **测试时序**：DC 测试用 `vi.useFakeTimers()` + `requestAnimationFrame` 桩；模态框 `requestAnimationFrame` 聚焦逻辑已在 KH 测试中验证可行，DC 测试需同步保留 rAF 桩。
- **z-index**：沿用 `z-[60]` 与 MA 对齐；DC 无 KH 那种 `z-9999` 浮动窗，层级无冲突。
- **范围纪律**：不动 `master_analysis`、`keyword_hunter` 任何文件。
