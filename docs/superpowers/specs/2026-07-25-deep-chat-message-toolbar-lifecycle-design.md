# Deep Chat Message Toolbar 全生命周期审查与优化设计

**Date:** 2026-07-25  
**Status:** design (implementation plan follows)  
**Scope:** `deep-chat-message-toolbar` 可用性 / 稳定性（生成中切会话/切页再切回消失）

---

## 1. 问题复现（用户路径）

1. Deep Chat 中发起生成（尤其 **深度思考 / 工具** 阶段，尚无可见正文）。
2. 切换到其他会话或离开 Deep Chat 页面。
3. 再切回原会话：气泡上方/消息行的 **`deep-chat-message-toolbar` 整行消失**（时间、复制、状态、live 文案均无）。
4. 生成结束（有可见正文或 settle）后 toolbar **又出现**。

---

## 2. 生命周期地图

| 阶段        | 入口                                                                          | 行为                                                                |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Setup       | `shellUi.initDeepChat` → `setupMessageToolbars(chat, getMessages, actions)`   | `cleanup` 后延迟 0ms 绑 MutationObserver，`rAF` 渲染                |
| Render      | `renderMessageToolbars` → `installOrUpdateMessageToolbar`                     | 遍历 `.outer-message-container`，按角色/正文匹配 store              |
| Live status | `actions.getLiveGenerationStatusLabel` → `getActiveLiveGenerationStatusLabel` | waiting / generating / running tool 有文案；**reasoning 返回 null** |
| Refresh     | `refreshMessageToolbarStatuses`                                               | 使用 lastChat + lastActions 再 schedule 渲染                        |
| Remount     | `replaceChat` → `initDeepChat` → `setupMessageToolbars`                       | 新 deep-chat 节点，重新 setup                                       |
| Cleanup     | `cleanupMessageToolbars` / `controller.unmount`                               | 断 observer、清 timer/rAF、清空 last\*                              |

**数据依赖：**

- DOM：`.outer-message-container` + `.message-bubble` + `.inner-message-container`
- 正文：`getMessageContent`；**ZWSP-only 视为空**（live 占位）
- Store：`getThreadDisplayMessages` + `findStoredMessageForToolbar`
- Live 文案：仅 `getActiveLiveGenerationStatusLabel()`

---

## 3. 根因（已确认）

### 3.1 致命 early-return（主因）

`composer/messageToolbar.ts` → `installOrUpdateMessageToolbar`：

```ts
const meaningfulContent = isZwspOnlyText(content) ? '' : content;
if (!meaningfulContent && !(isLiveAi && args.liveLabel)) {
  clearLiveToolbarLabelIfEmpty(...);
  return; // 不创建 toolbar
}
```

切回会话时，在飞 AI 槽常用 `\u200b` 占位（`pendingRuntime` / remount 约定），故 `meaningfulContent === ''`。

### 3.2 Live label 在 reasoning 阶段故意为 null

`getActiveLiveGenerationStatusLabel`（`generationChrome.ts`）：

- `waiting` → 「思考中…」等
- `generating` → 「正在生成回复… · 已收到 N 字」
- **`reasoning` → `null`**（注释：避免与 深度思考 chrome 抢视觉）
- running tool → 「正在{工具}…」

因此：**reasoning 阶段 + ZWSP 气泡** 同时满足 early-return → **整条 toolbar 不挂载**（不只是 live 文案，连 time/copy 也没有）。

### 3.3 为何生成结束后又出现

settle / 正文非空后：

- `meaningfulContent` 有字 → 不再依赖 `liveLabel`
- 或 phase 变 generating / settled 后 store 有 AI 消息

→ `ensureMessageToolbarElement` 会创建 toolbar。

### 3.4 次要风险（非本次主因，但影响稳定性）

| ID  | 风险                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------- |
| T1  | 全局单例 observer/`lastToolbarChat`：并发 replace 时序若 cleanup 与 rAF 交错，可能短空窗              |
| T2  | setup 用 `setTimeout(0)`，shadow 未就绪时首帧可能无 host，依赖 observer 再刷；observer 未绑定时漏一帧 |
| T3  | `refreshMessageToolbarStatuses` 依赖 `lastToolbarActions`；若未 setup 完成就 refresh 会静默 no-op     |
| T4  | 仅 last AI + liveLabel 可挂空气泡；历史空槽永久不挂（可接受）                                         |
| T5  | MutationObserver `subtree:true` 与 chrome remount 互相触发，需保持 skip 友好                          |

---

## 4. 产品目标（可验收）

| ID        | Outcome                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **TB-O1** | 任意 in-flight pending（含 reasoning / tool / waiting）在切会话/切页再切回后，**live AI 槽始终有 toolbar 行**（至少 time 或 live status 占位）。 |
| **TB-O2** | reasoning 阶段提供**稳定 live 文案**（如「深度思考中…」），不因 hide waiting 而整栏拆除。                                                        |
| **TB-O3** | 正文仍为 ZWSP 时，toolbar **不**被 early-return 掉；仅可不显示 copy 等依赖正文的操作。                                                           |
| **TB-O4** | settle 后 toolbar 与 status badge（未完成/已停止）行为与现网一致，无回归。                                                                       |
| **TB-O5** | 单测覆盖：reasoning + ZWSP + live pending → 存在 `.deep-chat-message-toolbar`；无 liveLabel 旧路径不得再吞整栏。                                 |

**Non-goals：** 改 deep-chat vendor；改 深度思考 body 合同（另有 spec）；Keyword Hunter 交接逻辑大改。

---

## 5. 推荐方案

### 5.1 拆分「是否挂载 toolbar」与「live 文案」

- **挂载条件（live AI）：**  
  `isLiveAi && (hasPendingForActiveThread || meaningfulContent || liveLabel)`  
  或更简单：`isLiveAi && session has pending for active thread` **始终挂载**（即使 ZWSP）。
- **Live 文案：** 独立 `syncToolbarLiveGenerationLabel`；无 label 时只清 status span，**不卸载 toolbar**。

### 5.2 reasoning 阶段 live label

`getActiveLiveGenerationStatusLabel`：

```ts
if (phase === 'reasoning') {
  return '深度思考中…'; // or rotate mild copy; keep non-null
}
```

与 深度思考 chrome 并存可接受：toolbar 末尾短状态，chrome 为正文折叠区。

### 5.3 操作按钮策略（ZWSP 时）

- time：可用（now / pending.startedAt）
- copy / 送关键词：正文空时 disabled 或隐藏
- live status：显示 TB-O2 文案

### 5.4 Remount 契约

`initDeepChat` 在 `setupMessageToolbars` 之后：

- 立即 `refreshMessageToolbarStatuses`（不必等 observer）
- 与 `remountDeepThinkingChromeAfterChatReplace` 的 32/80ms 重试对齐，**增加 toolbar refresh 同频短重试**（可选 0/32/80），防止 shadow 晚到

### 5.5 生命周期状态机（概念）

```
unbound → setup(chat) → bound(observer)
         ↘ cleanup → unbound
bound + mutation/rAF → render
render(live AI + pending + empty body) → ensure toolbar shell + live label
render(no pending + empty) → skip create (or remove live-only shell)
```

---

## 6. 分批实现计划

### Batch TB0 — 修复消失（P0）

1. `getActiveLiveGenerationStatusLabel`：`reasoning` 返回非 null 文案。
2. `installOrUpdateMessageToolbar`：live AI + active pending 时**强制 ensure toolbar**，即使 ZWSP 且无 label。
3. 单测（jsdom）：构造 outer/bubble/inner + ZWSP + mock liveLabel null + 模拟 pending 条件 → 调用渲染入口后存在 `.deep-chat-message-toolbar`。
4. 现有 remount streaming 测试保持绿。

### Batch TB1 — Remount 加固（P1）

1. `initDeepChat` 末尾显式 `refreshMessageToolbarStatuses`。
2. 可选与 chrome 同节奏 deferred refresh。
3. 测试：setup 后 shadow 后置再 refresh 仍挂上 toolbar。

### Batch TB2 — 操作可用性与 a11y（P2）

1. 空正文时 copy disabled + `aria-disabled`。
2. live status `aria-live=polite` 已有，核对 reasoning 文案切换。
3. 文档化 lifecycle 注释于 `messageToolbar.ts` 文件头。

---

## 7. 关键文件

| File                                           | 变更                      |
| ---------------------------------------------- | ------------------------- |
| `composer/messageToolbar.ts`                   | 挂载条件、空正文按钮      |
| `chrome/generationChrome.ts`                   | reasoning live label      |
| `composer/messageToolbar.test.ts` / `.dt` 扩展 | TB-O1/O5                  |
| `shell/shellUi.ts`                             | remount 后 refresh（TB1） |

---

## 8. 验证清单

- [ ] 生成中（reasoning）切走再切回：toolbar 始终可见且有「深度思考中…」类文案
- [ ] generating 阶段：仍显示字数进度
- [ ] settle：live 文案消失，time/copy 正常
- [ ] 无 pending 的 ZWSP 空气泡：不误挂工具条
- [ ] `npx vitest run …/deep-chat` + `lint:warning-gate` 绿

---

## 9. 结论（一句话）

**Toolbar 消失不是 remount 漏调 setup，而是「reasoning 阶段 liveLabel=null + ZWSP 空正文」触发了「不创建 toolbar」的 early-return。** 修复必须把 **toolbar 壳生命周期** 与 **live 文案是否为空** 解耦，并在 reasoning 给出非 null 状态文案。
