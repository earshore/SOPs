# 模态框开发规范指南

**Status:** active · SSOT  
**Updated:** 2026-08-07  
**适用范围**: SOPs Web 端所有模态框、确认弹窗、抽屉式面板、业务弹窗和类弹窗交互  
**目标**: 统一弹窗选型、交互、可访问性、测试和安全要求，避免重复实现与孤岛式设计。

---

## 1. 基本原则

模态框是阻断式交互，新增或迁移时先确认它是否真的需要阻断用户。能在页面内完成的提示、状态说明和轻量操作，不应升级为弹窗。

必须遵守：

- 优先使用共享能力，不新建局部弹窗框架。
- 不复制 backdrop、Escape、焦点恢复、body scroll lock 等基础交互逻辑。
- 不为单个页面重做弹窗视觉系统。
- 不在业务代码里新增 `window.confirm` 或裸 `confirm(...)`，调试工具除外。
- 弹窗改动必须带验证，不能只靠手动点一点。

---

## 2. 弹窗分类与选型

| 场景                                           | 标准实现                        | 说明                                                         |
| ---------------------------------------------- | ------------------------------- | ------------------------------------------------------------ |
| 普通内容、详情、表单、编辑器、向导             | `<app-modal>`                   | 使用统一壳，保留页面内部业务布局。                           |
| 删除、清空、恢复覆盖、危险二次确认             | `confirmWithModal`              | 使用共享确认弹窗服务。                                       |
| 系统设置、侧边配置、持续编辑面板               | 抽屉式面板 + `confirmWithModal` | 抽屉壳可保留，危险操作确认必须统一。                         |
| 搜索、命令面板、Marketplace 选择等特殊业务弹窗 | 业务自定义布局                  | 只有交互模型明显不同才允许；仍需复用共享可访问性和关闭能力。 |
| DevTools 调试确认                              | 可暂用原生 confirm              | 仅限 `src/common/devtools/**`，不得扩散到用户可见功能。      |

选型顺序：

1. 是危险操作或不可逆操作吗？使用 `confirmWithModal`。
2. 是内容、表单、详情、预览、编辑流程吗？使用 `<app-modal>`。
3. 是长期停留的设置面板吗？使用抽屉式面板，内部危险操作接 `confirmWithModal`。
4. 是搜索、命令、选择器这类特殊交互吗？可以保留业务布局，但必须说明为什么不能用普通 `<app-modal>`。

---

## 3. `<app-modal>` 使用规范

标准组件位于 `src/components/modal/AppModal.ts`，标签名为 `<app-modal>`。

新增内容弹窗必须使用：

```html
<app-modal id="example-modal" title="编辑条目" size="md" no-header>
  <div slot="body">
    <!-- 页面自己的内容 -->
  </div>
  <div slot="footer">
    <button type="button" class="action-btn action-btn-secondary" data-action="close">取消</button>
    <button type="button" class="action-btn action-btn-primary" id="save-example">保存</button>
  </div>
</app-modal>
```

TypeScript 中只调用公开方法：

```ts
type AppModalElement = HTMLElement & {
  open: () => void;
  close: () => void;
  setTitle?: (title: string) => void;
};

const modal = document.getElementById('example-modal') as AppModalElement | null;
modal?.open();
```

组件已统一处理：

- `role="dialog"`、`aria-modal="true"`、标题关联或 `aria-label`。
- 初始焦点、Tab 焦点陷阱、关闭后焦点恢复。
- Escape 关闭、backdrop 关闭、关闭按钮。
- `body` 滚动锁定，多弹窗计数恢复。
- `data-action="close"` 的取消/关闭按钮。

属性要求：

- `title` 必填，即使使用 `no-header` 也要提供可访问名称。
- `size` 必须显式选择：`sm`、`md`、`lg`、`xl`、`2xl`、`full`。
- 只有在表单未保存、关键流程或强约束确认中，才允许设置 `close-on-backdrop="false"` 或 `close-on-escape="false"`。
- `closable="false"` 只用于确实不能由用户中断的流程，并且需要有业务说明和测试覆盖。

禁止：

- 新增页面级 `.modal-backdrop`、`.modal-panel`、`.fixed.inset-0` 弹窗壳。
- 自己监听 document Escape 来关闭普通 `<app-modal>`。
- 自己写焦点陷阱或 body scroll lock。
- 在弹窗里再套一层视觉 card 作为主容器。
- 只靠颜色表达危险、成功或禁用状态。

### 3.1 弹层按钮契约

弹层内（footer / body / confirm 面板）**所有按钮必须复用 `.action-btn` 族**（见 [COMPONENT_GUIDELINES §3.1](./COMPONENT_GUIDELINES.md#31-变体矩阵)），禁止弹窗内自绘按钮类（TD-CMP-03 已登记为债）：

| 弹层位 | 类名 | 说明 |
| --- | --- | --- |
| 取消 / 关闭 | `.action-btn.action-btn-secondary` | 次要操作；承载 `data-action="close"` 的关闭路径 |
| 主提交 / 保存 | `.action-btn.action-btn-primary` | 主操作，每弹层 ≤ 1 |
| 危险 / 删除 | `.action-btn-danger`（实心）/ `.action-btn-danger-ghost`（描边）两档 | 危险确认；与主操作间距 ≥1rem |
| 三级 / 链接式 | `.action-btn-ghost` | 非不可逆操作 |

**danger 合规范例：** 共享 `confirmWithModal` 的面板按钮已 token 化对齐 `.action-btn-danger` 档——`.app-confirm-modal-confirm` 用 `--color-error` 底 + `--color-error-contrast` 白字、hover `--color-error-dark`、dark 三前缀加深 `--color-error-dark` / `red-600`（`confirmModal.css` L62-76、L101-109；对照 `buttons.css` L95-121、L378-385）。新弹层 danger 按钮直接复用共享类或按同一 token 对齐，不要新造红色系。

---

## 4. 共享确认弹窗规范

共享确认服务位于 `src/components/modal/confirmModal.ts`。

新代码必须从共享路径导入：

```ts
import { confirmWithModal } from '@/components/modal/confirmModal';

const confirmed = await confirmWithModal(
  '删除输入快照',
  '删除后将移除该输入快照，<br><span class="text-xs text-red-400 mt-1 block">无法恢复</span>',
  'kh_ignore_delete_input_snapshot',
  '删除快照'
);

if (!confirmed) return;
```

API 保持稳定：

```ts
confirmWithModal(
  title: string,
  content: string,
  storageKey?: string,
  confirmLabel?: string
): Promise<boolean>;
```

行为约定：

- 确认返回 `true`，取消、Escape、backdrop、缺失必要控件返回 `false`。
- 传入 `storageKey` 后会显示“不再提示”。
- 服务会自动写入 `modal_ignore_${storageKey}`，调用方不得传入完整的 `modal_ignore_` 前缀。
- 如果 `modal_ignore_${storageKey}` 已为 `true`，服务直接返回 `true`。
- 标题、内容或按钮文案包含“删除、清空、移除、无法撤销、无法恢复”时，使用危险态样式。
- 关闭后必须恢复到打开前的焦点元素。

兼容 wrapper 只为旧路径保留：

- `src/modules/app_center/views/master_analysis/utils/confirmModal.ts`
- `src/modules/app_center/views/keyword_hunter/utils/confirmModal.ts`
- `src/modules/app_center/views/playground/deep-chat/utils/confirmModal.ts`

新模块不得新增本地 `confirmModal.ts`。如果旧模块已经通过 wrapper 导入，可以在局部迁移中保留；新增模块和新文件一律使用共享路径。

内容安全要求：

- `content` 只允许使用静态、审查过的少量 HTML 片段，例如 `<br>` 和状态 `<span>`。
- 动态文本必须先转义，或用 DOM API / `SafeRenderer` 构建安全节点后再传入。
- 不允许把用户输入、模型输出、接口返回内容直接拼入 `content`。

---

## 5. 可访问性要求

所有弹窗必须满足以下清单：

- 有明确可读标题，标题能说明用户正在确认或编辑什么。
- 弹窗打开后焦点进入弹窗，Tab 不离开弹窗。
- 关闭后焦点回到触发控件。
- 默认提供关闭按钮、取消按钮、Escape 和 backdrop 关闭路径。
- 禁用 Escape 或 backdrop 时必须有明确业务理由，并覆盖测试。
- 按钮使用 `type="button"`，避免误触发表单提交。
- 危险操作按钮文案必须表达动作，例如“删除快照”，不能只写“确认”。
- 图标必须是辅助表达，不能替代文字标题和按钮文案。

---

## 6. 视觉与交互要求

弹窗视觉遵循 [稳定主题系统规范](./THEME_SYSTEM_GUIDELINES.md) 和 [视觉设计规范指南](./VISUAL_DESIGN_GUIDELINES.md)。

新增弹窗不得重新发明：

- 遮罩透明度。
- 面板圆角和阴影。
- header/footer 布局。
- 关闭按钮样式。
- 危险确认样式。

业务内容可以自定义，但必须保持工作台工具属性：信息可扫描、层级稳定、按钮位置可预期。不要在弹窗内加入说明弹窗如何使用的可见文案；必要帮助应放到字段标签、错误提示或 tooltip 中。

### 6.1 弹层深色禁令（light-only 表面）

弹层表面（面板 / body 区块 / 表单卡片）**禁止 light-only 表面写法**：`bg-white`、`bg-slate-50`、`from-*-50`、`bg-gradient-to-*`+浅色起点等浅色专属背景在 dark 下不翻转，会产生白色方块。

| 做法 | 标准 | 代码事实 |
| --- | --- | --- |
| 面板背景 | `var(--surface-card)` / `var(--surface-panel)`（dark 自动翻转；variables.css L101-107 / L540-548） | 合规范例：`.app-confirm-modal` 已用 `var(--surface-panel)`（`confirmModal.css` L6-14）；`<app-modal>`（AppModal.ts Shadow DOM）同理 |
| 边框 | `var(--border-subtle)` / `var(--border-muted)` | dark 适配见 variables.css L550-554 |
| 文案色 | `var(--color-text-primary)` / `--color-text-secondary` | —— |

**禁止静态内联 style：** 静态 `style="..."` 属性被迁移资产政策禁止——`src/common/config/apiEndpoints.test.ts` 对壳层/迁移资产断言 `not.toMatch(/\sstyle=/)`（L282-284），且拒绝 `x-bind:style` / `:style` 绑定（L235-243）。需要覆盖默认样式时用 **CSS 类或模块 CSS 文件**（如 `confirmModal.css`），不得退化为内联样式。

---

## 7. 测试要求

涉及弹窗基础能力时，至少覆盖：

- 打开与关闭。
- 确认与取消。
- Escape 关闭。
- backdrop 关闭。
- 禁用 `close-on-backdrop` / `close-on-escape` 后不能关闭。
- 焦点进入、Tab 焦点陷阱、关闭后焦点恢复。
- body scroll lock 打开和恢复。
- 缺失必要 DOM 控件时的兜底行为。

涉及 `confirmWithModal` 时，至少覆盖：

- 确认返回 `true`。
- 取消、Escape、backdrop 返回 `false`。
- “不再提示”写入 `modal_ignore_${storageKey}`。
- 已忽略时跳过弹窗并返回 `true`。
- wrapper 路径行为不变。

迁移业务弹窗时，至少覆盖：

- DOM 使用 `<app-modal>`。
- 标题、可访问名称或 `aria` 行为正确。
- 键盘关闭行为正确。
- 关闭后业务状态清理正确。
- 原有业务动作没有因迁移丢失。

迁移原生确认时，测试应断言业务改用 `confirmWithModal`；除 DevTools 外，不应再 mock 或调用原生 confirm。

---

## 8. 验证门禁

弹窗相关改动完成前必须运行：

```bash
npm run build
git diff --check
```

按改动范围追加运行对应单测，例如：

```bash
npm test -- --run src/components/modal/confirmModal.test.ts src/components/modal/AppModal.regression.test.ts
```

如果改动涉及设置、Keyword Hunter、Deep Chat、Prompt、Restricted Words 或 NPI，还要运行对应模块测试。提交前用搜索确认没有新增用户可见原生确认：

```bash
rg -n '\bconfirm\s*\(' src tests
```

允许的残留范围只有 `src/common/devtools/**` 和测试中的本地 helper/mock。

---

## 9. 反模式清单

禁止新增以下实现：

- `window.confirm`、裸 `confirm(...)`、`window.alert` 用作用户可见业务弹窗。
- 第四份、第五份局部 `confirmModal.ts`。
- 生产代码为了测试导出 `__testables`。
- 手写重复的 backdrop、Escape、focus trap、scroll lock。
- 动态 HTML 直接拼入确认弹窗内容。
- 没有标题或只有图标的弹窗。
- 没有取消路径的危险确认。
- 只改视觉、不补键盘和可访问性测试的弹窗迁移。
- 弹窗内自绘按钮类，未复用 `.action-btn` 族（§3.1）。
- 弹层表面用 `bg-white` / `bg-slate-50` / `from-*-50` 等 light-only 背景或静态内联 style（§6.1）。

---

## 10. 代码评审清单

评审弹窗改动时逐项确认：

- 选型是否符合第 2 节。
- 新内容弹窗是否使用 `<app-modal>`。
- 新危险确认是否使用共享 `confirmWithModal`。
- 是否没有新增用户可见原生 confirm。
- 是否没有新增局部确认弹窗实现。
- `storageKey` 是否没有包含 `modal_ignore_` 前缀。
- 动态内容是否经过安全渲染或转义。
- 标题、关闭路径、焦点恢复、键盘操作是否齐全。
- 测试是否覆盖弹窗交互和业务回归。
- `npm run build` 和相关单测是否通过。
- 弹层按钮是否复用 `.action-btn` 族（§3.1），danger 是否两档（实心 / 描边）。
- 弹层是否无 light-only 表面、无静态内联 style（§6.1）。
