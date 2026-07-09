# Deep Chat 最近会话列表 内联重命名 — 完成概览

## 功能
将"应用中心 → Playground → Deep Chat → 最近会话列表"的重命名，从浏览器系统弹窗
（`window.prompt`）改为**就地内联编辑**：光标定位到当前会话，在 `deep-chat-thread-name`
位置渲染 `<input type="text">`，输入即替换原文；**Enter / 失焦自动保存**，**Esc 取消**，
**空名拦截**（toast 警告且不保存），**未改动则不提交**。

## 改动文件
| 文件 | 改动 |
| --- | --- |
| `src/modules/app_center/views/playground/deep-chat/controller.ts` | 新增 `bindThreadEditControls`（从 `bindThreadControls` 抽出 input/keydown/focusout 三个编辑事件处理，使 `bindThreadControls` 回到 100 行以内）；`renderHistoryThreadList` 以 `editingState` 对象传参；保留 `beginThreadRename` / `commitThreadRename` / `cancelThreadRename` / `exitThreadEdit` / `focusEditingInput` |
| `src/modules/app_center/views/playground/deep-chat/renderers.ts` | 新增 `ThreadEditingState { id; value }`；`renderThreadList` / `renderThreadItem` 改收该对象（参数降至 5 个，消除 max-params 告警）；新增 `renderThreadEditItem` 渲染编辑态 `<input>`（用 `escapeHTML` 保证属性安全，`maxlength=120`） |
| `src/modules/app_center/views/playground/deep-chat/styles.css` | `.deep-chat-thread-item.is-editing`、`.deep-chat-thread-name-input`（含 focus-visible 高亮，使用设计令牌而非硬编码） |
| `src/modules/app_center/views/playground/deep-chat/index.test.ts` | 原 `window.prompt` 用例改为走内联编辑流；新增 6 个 inline rename 用例 |
| `src/modules/app_center/views/playground/deep-chat/renderers.test.ts` | 新增：普通渲染无 input、编辑态 input 预填值+maxlength=120、转义安全性 |

## 验证结果（全绿）
- `npx eslint` 两个文件：**0 warnings**（max-lines / max-params 已消除）
- `npm run type-check`：**通过**
- `npm run lint:warning-gate`：**0/0 warning(s)**
- `npx vitest run`（renderers.test.ts + index.test.ts）：**27 passed / 27**
- `npm run build:app`：**✓ built**（仅 bundle 体积提示，非错误）

## 重要提示
- 该特性曾被标记为"孤立 WIP"，且有外部进程反复以**损坏态**写回工作树（`renderers.ts`
  丢失 `getThreadItemClassName` 函数体，导致构建报 `Expected '}' but found 'EOF'`）。
  当前工作树是**正确可构建版本**。
- 若后续构建再次在该文件报上述错误，说明损坏态被重新注入 —— 请用本正确版本恢复。
- 建议**尽快提交**以固化正确版本（本功能不属于 rc.6 删除确认那条线）。
- 原始规划文档 `deep-chat-inline-rename-plan.md` 此前仅作为对话产物，**未落盘**到仓库。
