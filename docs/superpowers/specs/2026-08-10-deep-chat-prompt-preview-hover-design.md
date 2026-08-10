# Deep Chat Prompt 列表预览气泡：点击不弹泡、仅 hover 驻留触发

**Date:** 2026-08-10
**Status:** draft
**Scope:** `src/modules/app_center/views/playground/deep-chat/shell/promptPreview.ts`、`shell/shellUi.ts`、`shell/renderers.ts`（只读）、`src/modules/app_center/views/playground/deep-chat/index.test.ts`、`tests/e2e/deep-chat-prompt-preview.spec.ts`

---

## 1. 需求与现状

### 1.1 需求（原文）

> 6. Deep Chat 页面 Prompt 列表，点击记录不要显示 Listing Prompt 气泡，气泡仅仅在鼠标停留才会触发，避免误触发遮挡用户操作。

### 1.2 现状（代码事实）

**DOM 骨架**（`src/modules/app_center/views/playground/deep-chat/template.html`）：

- `#deep-chat-prompt-rail` 右栏（L269），内含 `#deep-chat-prompt-list`（L273-274，`aria-label="Prompt 生成记录"`）。
- `#deep-chat-prompt-preview-popover` 气泡容器（L280-281+），`role="dialog"` / `aria-label="Prompt 预览"` / `aria-modal="false"` / `aria-hidden="true"`。样式（`src/modules/app_center/views/playground/styles.css` L842-865）：`position: fixed`、默认 `display: none`，`.is-visible` 才显示。

**列表项渲染**（`shell/renderers.ts` `renderPromptDraftItem` L253-266）：

- 主按钮 `.deep-chat-prompt-draft` **同时携带两个 data 属性**：`data-preview-prompt-id` 与 `data-use-prompt-draft-id`（L259）——即"点记录 = 使用 Prompt"，二者是同一按钮；另带 `aria-pressed`、`aria-describedby="deep-chat-prompt-preview-popover"`（L259）。
- 独立删除按钮 `data-delete-prompt-draft-id`（L265）。
- 列表项类 `.deep-chat-prompt-item`，含 `is-preview-active` 高亮（`getPromptDraftItemClassName` L280-285）。

**气泡逻辑**（`shell/promptPreview.ts`，344 行）：

- `PROMPT_PREVIEW_SHOW_DELAY_MS = 1000`（L9）：hover 驻留 1s 后显示，**已是 dwell 机制**。
- 触发源两个：
  - `pointerover`（L32-55）→ `schedulePromptPreviewShow`（L99-119）→ 1s 后 `showPromptPreview`。
  - `focusin`（L57-66）→ `onPromptFocusIn` **立即显示**（注释"键盘聚焦：立即显示（无需驻留）"），监听注册于 L85 / 清理 L92。
- 隐藏：`pointerleave`（L68-71）→ `schedulePromptPreviewHide` 160ms 延迟（L316-323），气泡自身 hover（`isPromptPreviewHovered`，L73-82）不隐藏。
- `showPromptPreview`（L129-146）置 `activePromptPreviewId` 并渲染；`hidePromptPreview`（L177-189）清定时器、置 null、`aria-hidden="true"`。
- `resetPromptPreviewState`（L191-196）由 controller `onUnmount` 调用（`controller.ts` L109-119）。
- **列表重渲染会保持气泡**：`renderPromptDraftList`（`renderers.ts` L232-236）在 `activePromptPreviewId` 非空时重新 `renderPromptPreview`，气泡不因重渲染消失。

**点击行为**（`shell/shellUi.ts` `bindThreadControls` → `onPromptListClick` L346-366）：

- `[data-open-promptlab]` → `openPromptlab()` 跳页（L347-349）。
- `[data-delete-prompt-draft-id]` → `deletePromptDraft`（L353-356）。
- `[data-use-prompt-draft-id]` → `createThreadFromPromptDraft`（L360-362）→ `session/threadStore.ts` L508-525：新建会话并填入 prompt；`createThread`（L494-498）触发 `renderPromptDraftsForActiveThread` 重渲染列表。
- `setupPromptPreview` 在 L369-370 挂接。

**现有测试**：

- 单测：`index.test.ts` L966-970 直接 `dispatchEvent(new FocusEvent('focusin', { bubbles: true }))` 并断言 `.deep-chat-prompt-preview-title` 含 "Listing Prompt"（**依赖 focusin 立即显示路径**）；L971-995 继续 `click()` 断言建会话等（JSDOM 的 `click()` 不派发 focus，不受影响）。
- e2e：`tests/e2e/deep-chat-prompt-preview.spec.ts` 三个用例：
  1. hover 定位与不漂移（L141-164，`page.mouse.move` 触发）；
  2. **键盘 focus 显示**（L166-179：`locator.focus()` → 气泡可见 + `aria-hidden="false"` + `describedBy` 断言）——与本需求直接冲突；
  3. 窄视口钳制（L181-197）。
  - e2e 分组：`scripts/test/run-functional-e2e.ts` L49-52 `deep-chat` 组 = 本 spec + `deep-chat-send.spec.ts`（后者无预览相关断言）。

### 1.3 问题现象

真实浏览器中 **mousedown → focus → focusin → click** 时序固定：鼠标点击列表项主按钮（使用/预览按钮）必然触发 `focusin` → `onPromptFocusIn` 立即弹泡。气泡 `position: fixed` 覆盖在列表左侧区域，遮挡用户操作；且点击"使用"后列表重渲染，`activePromptPreviewId` 仍非空，气泡继续停留（`renderers.ts` L232-236）。

---

## 2. 根因

1. **直接根因**：`promptPreview.ts` L57-66 的 `focusin` 立即显示路径。鼠标点击必然伴随 focus，导致"点击即弹泡"——与需求"仅鼠标停留触发"矛盾。
2. **残留放大**：点击后 `activePromptPreviewId` 未清除，列表重渲染（`renderers.ts` L232-236）让气泡持续显示，进一步遮挡新会话界面。
3. **次要路径**：点击前鼠标必然先进入按钮触发 `pointerover` → 调度 1s dwell timer；若点击发生在 1s 内，该 timer 不会因点击取消，点击完成后 1s 时刻仍会弹泡（`schedulePromptPreviewShow` L114-118 无点击取消逻辑）。

---

## 3. 方案设计

### 3.1 核心决策与结论

| # | 决策点 | 结论 | 理由 |
| --- | --- | --- | --- |
| D1 | focusin 立即显示路径 | **整体移除** `onPromptFocusIn`（L57-66）及监听注册/清理（L85、L92） | 需求原文即"仅鼠标停留触发"；删除 11 行零新增状态，直接消除根因。键盘主操作不受影响（见 3.3 键盘可达性结论） |
| D2 | 点击后气泡处置 | **点击列表任意 action 时立即隐藏**（`onPromptListClick` 开头 `hidePromptPreview(container)`） | 覆盖两个场景：① 先 hover 驻留后点击——气泡正在显示，点击即隐藏，符合"避免遮挡"语义；② 点击前 dwell timer 已调度（点击必然先 `pointerover`）——`hidePromptPreview` 内部 `clearPromptPreviewShowTimer()`（L178）清掉 timer，防止点击后 1s 突然弹泡。统一在 click 一处处理，简单且覆盖全部 action（openPromptlab / delete / use） |
| D3 | dwell 时长 | **维持 1000ms 不变**（`PROMPT_PREVIEW_SHOW_DELAY_MS` 不动） | 需求未要求调速；现有 e2e 断言依赖此时长；不设新常量 |
| D4 | 备选方案：pointerdown 标记抑制 focusin | **不采用**（记录为备选，见 3.4） | 需要新增全局/模块级 flag + pointerup/pointercancel 复位 + 超时兜底，是脆弱状态机；收益仅为保留键盘预览，与简单优先冲突 |

### 3.2 代码改动（函数级）

**A. `shell/promptPreview.ts`（-11 行，无新增）**

1. 删除 `onPromptFocusIn` 函数体（L57-66）。
2. 删除 `promptList.addEventListener('focusin', onPromptFocusIn);`（L85）。
3. 删除 `promptList.removeEventListener('focusin', onPromptFocusIn);`（L92）。

其余逻辑（pointerover dwell、pointerleave 160ms 隐藏、气泡自身 hover 不隐藏、`showPromptPreview`/`hidePromptPreview`/`resetPromptPreviewState`、定位与 `syncPromptPreviewHighlight`）**全部不动**。

**B. `shell/shellUi.ts`（+2 行）**

1. `import` 行（L83-87 附近）：从 `./promptPreview` 追加导入 `hidePromptPreview`。
2. `onPromptListClick`（L346）函数体第一行插入 `hidePromptPreview(container);`——在任何 action 分发（openPromptlab / delete / use）之前隐藏气泡并清空 dwell timer。

**C. 不做任何改动的文件**：`template.html`、`renderers.ts`（其 L232-236"重渲染保持气泡"逻辑无需改：click 已置 `activePromptPreviewId = null`，重渲染走 `else if` 分支隐藏，天然一致）、`styles.css`、`threadStore.ts`、`promptDrafts.ts`。

### 3.3 键盘可达性（a11y）结论

**取舍结论：接受"键盘用户无预览"，主操作键盘路径完整保留。**

- 该列表项主按钮同时是 `[data-use-prompt-draft-id]`：键盘 Tab 聚焦后 **Enter/Space 触发 click → `onPromptListClick` → `createThreadFromPromptDraft`**，主操作（使用 Prompt）键盘可达，满足 `docs/ACCESSIBILITY.md` A4（主操作键盘可达）。
- 预览是 hover 便利功能而非关键操作；需求原文明确"气泡仅仅在鼠标停留才会触发"，移除 focusin 是该语义的直接结果。
- `aria-describedby="deep-chat-prompt-preview-popover"`（`renderers.ts` L259）保留不动：隐藏（`aria-hidden="true"`）的弹层不进入可访问性树，该属性变为惰性但无害，删除属于无收益改动。
- 弹层 `role="dialog" aria-modal="false"`、不可聚焦（无 tabindex）、无焦点陷阱问题，A5 不适用，无需处理。

**若产品坚持键盘预览（待确认问题 #1）**：备选方案 B 见 3.4。

### 3.4 备选方案（不推荐，记录备选）

**pointerdown-flag 抑制**：`promptList` 上 `pointerdown` 置 `suppressPromptPreviewFocusIn = true`，`onPromptFocusIn` 检查该 flag 为真则跳过并复位；`pointerup` / `pointercancel` / 短超时（如 300ms）复位。纯 Tab 聚焦（无 pointer 前置）仍立即显示。

- 优点：保留键盘预览。
- 缺点：新增 3 个监听器/定时器 + 模块级状态；鼠标拖选、触屏、右键菜单、pointer 事件未派发的浏览器差异都会引入误判；测试面扩大。**判定：收益 < 复杂度，不采用。**

---

## 4. 测试与验收

### 4.1 e2e（`tests/e2e/deep-chat-prompt-preview.spec.ts`）

Playwright 的 `click()` 会先把鼠标移到元素中心（触发 `pointerover` 调度 dwell），因此"点击不弹泡"断言必须同时覆盖 dwell timer 被清除。

| # | 用例 | 动作 | 断言 |
| --- | --- | --- | --- |
| T1 | 保留：hover 驻留显示且不漂移 | 现 test 1（L141-164） | 不动 |
| T2 | 保留：窄视口钳制 | 现 test 3（L181-197） | 不动 |
| T3 | 改写：点击不弹泡（替代现 test 2 的 focus 显示语义） | `locator(PROMPT_SELECTOR).first().click()` | 气泡无 `.is-visible`；再 `waitForTimeout(1300)` 后仍无 `.is-visible`（证明 dwell timer 被清除，而非仅"点击瞬间未显示"） |
| T4 | 新增：键盘 focus 不弹泡 | `locator(PROMPT_SELECTOR).first().focus()` | 气泡无 `.is-visible`，`aria-hidden="true"`；`waitForTimeout(1200)` 后仍不显示 |
| T5 | 新增：移出隐藏 | hover 显示后 `mouse.move` 移出列表 | 约 500ms 内气泡无 `.is-visible`、`aria-hidden="true"` |
| T6 | 新增：先 hover 后点击 use 不被遮挡 | hover 至显示 → `[data-use-prompt-draft-id]` click | 点击后气泡**立即**隐藏（无 `.is-visible`）；新会话创建成功（`.deep-chat-prompt-item.is-selected` 存在）；随后 1.3s 内不再出现 |
| T7 | 新增：点击 delete 不弹泡 | `[data-delete-prompt-draft-id]` click | 条目移除、气泡无 `.is-visible`（含 1.3s 等待） |
| T8 | a11y 断言 | T3/T4 后复查 | 按钮 `aria-describedby` 属性仍为 `deep-chat-prompt-preview-popover`；气泡 `aria-hidden="true"` |

**现 test 2（L166-179）必须删除/改写**：其"focus → 立即显示 + describedBy 关联"断言与本需求直接冲突，由 T3/T4 取代。

### 4.2 单测（vitest）

**必须更新**：`index.test.ts` L966-970 段——`dispatchEvent(new FocusEvent('focusin', ...))` 后断言标题含 "Listing Prompt" 将失败，改为**反断言**：focusin 派发后 `.deep-chat-prompt-preview-popover` 无 `.is-visible`（或 `aria-hidden === 'true'`）。L971 起的 `click()` → 建会话断言不受影响（JSDOM click 不派发 focus，且点击路径本次未改）。

**建议新增（可选，推荐）**：`shell/promptPreview.test.ts`（同目录惯例，参照 `shell/renderers.test.ts`）。**零可测化改造**——`showPromptPreview` / `hidePromptPreview` / `setupPromptPreview` 均已导出，用 fixture 容器（含 `#deep-chat-prompt-list` 一个带 `data-preview-prompt-id` 的按钮 + `#deep-chat-prompt-preview-popover`）+ `vi.useFakeTimers()` 覆盖三条关键路径：

1. `pointerover` → 1s 后显示（dwell）；
2. `pointerleave` → 160ms 后隐藏（且气泡自身 hover 时不隐藏）；
3. 调度 dwell 期间调用 `hidePromptPreview` → timer 被清除、1s 后仍不显示（等价于"点击取消 dwell"）。

理由：本次改动恰好落在 `promptPreview.ts` 的事件状态机上，模块级单测回归价值高、成本低。若产品/团队倾向最小改动，可仅做 e2e + index.test.ts 更新，本项由评审拍板。

### 4.3 验收命令

```sh
# 单测（deep-chat 模块 + 全量）
npx vitest run src/modules/app_center/views/playground/deep-chat

# e2e（deep-chat 组）
npm run test:e2e:functional   # 分组脚本，deep-chat 组含本 spec 与 deep-chat-send.spec.ts
# 或单跑
npx playwright test tests/e2e/deep-chat-prompt-preview.spec.ts

# 类型与 lint
npm run type-check:tests
npm run lint:tests
```

**验收标准**：T1/T2/T5-T8 通过；T3/T4 通过且无 flake（1300ms 等待用 `waitForSelector state: 'hidden'` + 反查 `.is-visible` 计数为 0，避免仅依赖固定 sleep）。

### 4.4 a11y 检查点

- 按钮 focus-visible 样式无改动（A1 不受影响）。
- Enter/Space 使用 Prompt 的主操作路径不变（A4 保持满足）。
- 气泡 `aria-hidden` 状态机由 `hidePromptPreview`/`renderPromptPreview` 维护，改动后点击/聚焦路径恒为 `true`，hover 显示路径恒为 `false`——e2e T4/T8 覆盖。
- `aria-describedby` 惰性化登记（见 3.3），不构成回归。

---

## 5. 影响面与风险

| 项 | 影响 | 处置 |
| --- | --- | --- |
| 键盘用户 | Tab 聚焦不再自动预览；主操作（Enter 使用）不受影响 | 需求语义的直接后果，待确认问题 #1 拍板；备选方案 3.4 备录 |
| 现有 e2e test 2 | 语义反转，必须改写 | T3/T4 取代 |
| 现有单测 `index.test.ts` L966-970 | focusin 断言失败 | 改为反断言（4.2） |
| 点击后气泡残留 | 由 D2 一次性解决（click 前隐藏 + `activePromptPreviewId` 置空 → 重渲染不再复活） | 无 |
| dwell timer 残留 | `hidePromptPreview` 清除 show/hide 双 timer，点击后 1s 不再弹泡 | T3/T6 覆盖 |
| 移动端触控 | 部分浏览器 tap 会派发 `pointerover`，触屏上仍可能 1s 后弹泡 | 本需求仅承诺鼠标；Mobile Chrome/Safari 项目下 e2e 用 mouse API 模拟，触屏真机需人工抽检（列入待确认 #3） |
| XSS / HTML 输出 | 无任何输出变更（`setSafeHtml`/`escapeHTML` 路径不动） | 无 |
| 性能 | 删除一个监听器，无新增运行时开销 | 无 |

---

## 6. 不做的事

- **不引入** pointerdown-flag 抑制机制（3.4 已判定否决）。
- **不新增**键盘预览替代交互（独立预览按钮、修饰键 + Enter 等）——除非待确认 #1 要求。
- **不改** dwell 时长（1000ms）、定位/箭头逻辑、`is-left-of-anchor`、CSS。
- **不清理** `aria-describedby`（惰性但无害）。
- **不处理** popover 的 Esc 关闭/焦点管理（非模态、不可聚焦弹层，A5 不适用；非本需求）。
- **不处理** 移动端触控 dwell（超出"鼠标停留"范围）。
- **不动** `renderers.ts` / `threadStore.ts` / `template.html` / `styles.css`。

---

## 7. 待确认问题

1. **键盘可达性取舍**：接受"键盘用户无预览、主操作（Enter 使用）保留"（推荐，符合需求原文），还是必须保留键盘预览路径（则采用 3.4 备选 pointerdown-flag 方案，或另行设计显式预览控件）？
2. **点击后隐藏时机**：确认"点击列表任意 action 按钮即隐藏气泡（含先 hover 显示后点击的场景）"——本方案按"隐藏"设计（D2）。
3. **单测范围**：是否新增 `shell/promptPreview.test.ts`（推荐，零可测化改造），还是仅更新 `index.test.ts` + e2e 即可？
4. **移动端抽检**：触屏真机上 tap 触发 `pointerover` → 1s 后弹泡的现象是否纳入本迭代范围（建议不纳入，另行登记）？
