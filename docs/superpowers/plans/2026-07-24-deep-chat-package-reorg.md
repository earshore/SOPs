# Deep Chat 整包整理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `deep-chat` 整包收敛为按域划分的目录终态，对外 API 与产品行为不变，且整包合入时债务指标为 0。

**Architecture:** 根目录仅保留入口/共享契约/静态资源；业务按 `session` / `request` / `composer` / `chrome` / `shell` / `integrations` / `infra` 落盘。跨层回调经 `session/uiHooks` + 叶子模块（`domHelpers` / `mountContext`）破环；`types.ts` / `constants.ts` 留在根路径，禁止下沉到某一域。路径迁移只用 `git mv` + import 改写，禁止顺手改行为。

**Tech Stack:** TypeScript、Vite、Vitest、ESLint、项目 `circular:check` / `type-check` / `lint:warning-gate` / prebuild 门禁。

## Global Constraints

- **对外 API 不变：** `index.ts` 仅导出 `mount` / `unmount` / `clearDeepChatThreadStore` / `consumePendingSkillHandoff`；包外不得被迫改 import 路径。
- **行为不变：** 发送/停止/软卸载后台生成/线程切换/skill·listing handoff/Responses fail-closed 链式语义不得改。
- **禁止新增债务：**
  - 禁止 `@ts-nocheck`
  - 禁止文件级 `eslint-disable`（含 `no-unused-vars` 宽禁令）；`uiHooks` 现有**行级** `no-unsafe-function-type` 允许保留，不得扩散
  - `circular:check` = 0
  - `type-check` / `lint` / `lint:warning-gate` / `format:check` 绿
  - deep-chat unit **全绿**，用例数 ≥ 进入本计划时
  - 禁止长期旧路径 re-export shim
  - 禁止为迁目录新拉静态环
  - 禁止迁文件时「顺便优化」业务逻辑
- **依赖方向（强制）：**

```
types / constants / infra(utils, confirmModal, config, styles, elementLoader)
        ↑
sessionState / domHelpers / mountContext / uiHooks
        ↑
session（threadStore / pendingRuntime / conversationContext / sessionLifecycle）
        ↑
request（lifecycle / budget / businessTools / llmCall / handleRequest）
        ↑
chrome / composer
        ↑
shell / integrations
        ↑
controller → index
```

- **单步 SOP：** 先绿 → `git mv` → 只改 import → 再绿；任一门禁红即当步回滚或就地修绿，禁止「先合再清」。

---

## 文件与职责（终态树）

```
deep-chat/
├── index.ts                      # 唯一对外 barrel
├── controller.ts                 # 薄编排
├── types.ts                      # 跨域共享类型
├── constants.ts
├── styles.css
├── template.html
├── package.structure.test.ts     # 结构门禁（由 controller.split.test 升级）
├── index.test.ts                 # 集成回归（本计划不强制拆分）
│
├── session/
│   ├── sessionState.ts
│   ├── uiHooks.ts
│   ├── domHelpers.ts
│   ├── mountContext.ts
│   ├── threadStore.ts
│   ├── pendingRuntime.ts
│   ├── sessionLifecycle.ts
│   ├── conversationContext.ts
│   └── conversationContext.test.ts
│
├── request/
│   ├── handleRequest.ts
│   ├── llmCall.ts (+ .test)
│   ├── lifecycle.ts (+ .test)
│   ├── budget.ts (+ .test)
│   └── businessTools.ts (+ .test)
│
├── composer/
│   ├── composerUi.ts
│   ├── draftPersistence.ts (+ .test)
│   ├── messageToolbar.ts (+ .test)
│   ├── skillContextChip.ts (+ .test)
│   └── promptDrafts.ts
│
├── chrome/
│   └── generationChrome.ts
│
├── shell/
│   ├── shellUi.ts
│   ├── renderers.ts (+ .test)
│   ├── skillLibrary.ts
│   └── promptPreview.ts
│
├── integrations/
│   └── handoffs.ts
│
└── infra/
    ├── deepChatConfig.ts
    ├── deepChatElementLoader.ts
    ├── deepChatStyles.ts
    ├── utils.ts
    └── confirmModal.ts (+ .test)   # re-export @/components/modal/confirmModal
```

**根目录业务 `.ts` 白名单：** `index.ts` · `controller.ts` · `types.ts` · `constants.ts` · `package.structure.test.ts` · `index.test.ts`  
（过渡期允许 `controller.split.test.ts` 直至 Task 4 重命名。）

---

## 进度基线（2026-07-24 盘点）

| 阶段 | 状态 | 说明 |
|------|------|------|
| Phase A — controller 域拆分 | **已完成** | `session/*` `request/handle·llm` `chrome` `composerUi` `shellUi` `integrations` + uiHooks 破环 |
| Phase 0 — 文件级宽禁令清零 | **已完成** | deep-chat 内仅 `uiHooks` 一行行级 disable；无 `@ts-nocheck` |
| Phase 1 — request/session 历史模块迁入 | **已完成（路径）** | lifecycle / budget / businessTools / conversationContext 已在域目录 |
| Phase 2 — composer 历史模块迁入 | **已完成（路径）** | draft / toolbar / chip / promptDrafts 已在 `composer/` |
| Phase 3 — shell + infra 迁入 | **已完成（路径）** | renderers / skillLibrary / promptPreview + infra/* 已就位；根目录仅白名单 + 待改名 structure 测试 |
| Phase 4 — 结构门禁 + 删 shim + build | **未完成** | structure 测试尚未锁终态全树；scratch `tools/*deep-chat*` 未清理 |
| 残余红测 | **阻塞 Done** | deep-chat unit：5 fail / 109 pass（114）；根因见 Task 1 |

**当前门禁快照：**

- `circular:check` = 0 ✅  
- `type-check` ✅  
- deep-chat unit：5 FAIL（`index.test.ts`）❌  
- 失败现象：`TypeError: renderer.escapeHtml is not a function`（来自 `@/components/modal/confirmModal` → `SafeRenderer`）  
- 根因：`index.test.ts` 中 `installDeepChatTemplateMocks()` 的 `SafeRenderer` mock **只提供了 `renderTemplate`，缺少 `escapeHtml`**。  
- **非** `infra/utils.escapeHTML` 路径错误（shell 侧已正确 import `../infra/utils`）。

**已知分层张力（本计划必须处理到「不新增 / 不恶化」）：**

- `session/threadStore.ts` 静态 import `shell/renderers`、`composer/*`（上层渲染被 session 拉起）。  
- `session/sessionState.ts` type-import `ThreadMenuState` from `shell/renderers`。  
- circular 目前为 0，但方向违反 §Global 依赖图 → **Task 2 用类型上提 + uiHooks 渲染回调收口**，禁止用 eslint-disable 或再拉环「绕过」。

---

### Task 0: 冻结基线与门禁命令（执行前必做）

**Files:**
- 只读；不改代码

**Interfaces:**
- Consumes: 无
- Produces: 基线数字（tests 总数、circular、是否有 nocheck）写入 PR/执行日志

- [ ] **Step 1: 记录债务扫描**

```bash
# 在仓库根目录
npm run circular:check
npm run type-check
# 期望：Circular dependencies: 0；tsc 无错误

# 文件级宽禁令 / nocheck（PowerShell）
Select-String -Path "src\modules\app_center\views\playground\deep-chat\**\*.ts" -Pattern "@ts-nocheck|eslint-disable(?!-next-line)" -Recurse
# 期望：无匹配（uiHooks 的 eslint-disable-next-line 不算文件级）
```

- [ ] **Step 2: 记录 unit 基线**

```bash
npm test -- --run src/modules/app_center/views/playground/deep-chat
# 记录：Tests N passed / M failed / Total T
# 当前已知：109 passed / 5 failed / 114 total — 不得以删用例方式「变绿」
```

- [ ] **Step 3: 确认根目录文件集合**

```powershell
Get-ChildItem "src\modules\app_center\views\playground\deep-chat" -File | Select-Object -ExpandProperty Name
# 期望仅：constants.ts, controller.split.test.ts|package.structure.test.ts, controller.ts,
#         index.test.ts, index.ts, styles.css, template.html, types.ts
```

---

### Task 1: 修绿 5 个 `index.test`（SafeRenderer mock 补全）

**Files:**
- Modify: `src/modules/app_center/views/playground/deep-chat/index.test.ts`（约 `installDeepChatTemplateMocks`，~L438–456）
- 不改生产 modal / SafeRenderer（除非证明生产 API 缺失 — 当前 `SafeRenderer.escapeHtml` 已存在）

**Interfaces:**
- Consumes: `SafeRenderer.getInstance()` 真实 API：`renderTemplate(container, html)` · `escapeHtml(text: string): string`
- Produces: mock 与真实 surface 对齐，confirm/choice modal 在 jsdom 下可挂载

- [ ] **Step 1: 写/更新断言 — mock 必须暴露 escapeHtml**

在 `installDeepChatTemplateMocks` 内，将 SafeRenderer mock 改为：

```typescript
vi.doMock('@/common/infrastructure/SafeRenderer', () => ({
  SafeRenderer: {
    getInstance: () => ({
      escapeHtml: (text: string) =>
        String(text)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;'),
      renderTemplate: (container: HTMLElement, html: string) => {
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        container.replaceChildren(
          ...Array.from(parsed.body.childNodes).map(node => document.importNode(node, true))
        );
      },
    }),
  },
}));
```

- [ ] **Step 2: 跑 deep-chat unit**

```bash
npm test -- --run src/modules/app_center/views/playground/deep-chat
```

Expected: **114 passed**（或 ≥ 进入时 total）；0 failed；无 unhandled `escapeHtml` rejection。

- [ ] **Step 3: 若仍有失败，按失败栈定位（禁止跳过）**

| 症状 | 排查 |
|------|------|
| 仍 `escapeHtml is not a function` | 确认 mock 在 `importDeepChat` 之前安装；`doUnmock` 未过早；模块缓存 `vi.resetModules` 后重新 install |
| 断言文案/DOM 不一致 | 只修测试期望与 mock，不改产品分支逻辑 |
| 新环 / type error | 回退本 task 生产文件改动（本 task 不应改生产） |

- [ ] **Step 4: 门禁**

```bash
npm run circular:check
npm run type-check
```

Expected: 全绿。

---

### Task 2: 消除 session→shell 反向依赖（零分层债务）

**Files:**
- Modify: `src/modules/app_center/views/playground/deep-chat/types.ts` — 上提 `ThreadMenuState` / `ThreadEditingState`（若仅类型）
- Modify: `src/modules/app_center/views/playground/deep-chat/shell/renderers.ts` — 从 `types` 或本地 re-export 类型，避免 session 依赖 shell
- Modify: `src/modules/app_center/views/playground/deep-chat/session/sessionState.ts` — `import type { ThreadMenuState } from '../types'`（或 `./threadUiTypes` 若不愿污染 types）
- Modify: `src/modules/app_center/views/playground/deep-chat/session/threadStore.ts` — **禁止**静态 `import { renderThreadList, renderPromptDraftList } from '../shell/renderers'`
- Modify: `src/modules/app_center/views/playground/deep-chat/session/uiHooks.ts` — 增加类型安全的 render 槽（或复用已有 HookFn 槽并在 shell 注册）
- Modify: `src/modules/app_center/views/playground/deep-chat/shell/shellUi.ts`（或 controller 装配点）— 注册 `renderThreadList` / `renderPromptDraftList` 到 uiHooks
- Modify: `session/pendingRuntime.ts` / `sessionState.ts` 对 `composer/*` 的**必要**依赖：优先经已有 uiHooks（`refreshMessageToolbarStatuses`）或把 draft controller 工厂调用留在 composer 装配；**不得**为消依赖复制业务逻辑

**Interfaces:**
- Consumes: 现有 `uiHooks` 注册模式（见 `session/uiHooks.ts`、`request/handleRequest` 的 `registerRequestUiHooks`）
- Produces:
  - `registerShellRenderHooks({ renderThreadList, renderPromptDraftList, ... })` 或等价命名
  - `threadStore` 内调用 `uiHooks.renderThreadList?.(...)`（fail-closed：未注册则 no-op 或 dev assert）
  - `ThreadMenuState` 定义位置：**不在 shell**，session/types 可引用

**推荐最小实现（类型上提 + 渲染钩子）：**

```typescript
// types.ts（或 session/threadUiTypes.ts 再由 types re-export）
export interface ThreadMenuState {
  threadId: string;
  placement: 'above' | 'below';
}
export interface ThreadEditingState {
  id: string;
  value: string;
}
```

```typescript
// session/uiHooks.ts — 增加槽位（保持与现有 HookFn 风格一致，禁止 any 洪泛）
export type RenderThreadListFn = (
  container: HTMLElement,
  threadStore: DeepChatThreadStore,
  pendingRequests: Map<string, PendingDeepChatRequest>,
  threadMenuState: ThreadMenuState | null,
  editingState: ThreadEditingState | null
) => void;

// register / call 与现有 uiHooks 模式对齐
```

```typescript
// threadStore.ts — 删除 from '../shell/renderers'
// 替换调用点：
uiHooks.renderThreadList?.(container, store, pending, menuState, editingState);
```

```typescript
// shell/shellUi.ts init 时
registerShellRenderHooks({
  renderThreadList,
  renderPromptDraftList,
});
```

- [ ] **Step 1: 类型上提**

移动 `ThreadMenuState` / `ThreadEditingState` 到 `types.ts`（或 `session/threadUiTypes.ts` + types 再导出）。`renderers.ts` 改为从 types import 或本地 type-only 兼容 export。

- [ ] **Step 2: uiHooks 增加 render 槽并在 shell 注册**

- [ ] **Step 3: threadStore / sessionState 去掉 `../shell/*` import**

验收 grep：

```bash
# 期望 session 下无 shell 引用
# PowerShell:
Select-String -Path "src\modules\app_center\views\playground\deep-chat\session\*.ts" -Pattern "from ['\`"]\.\./shell"
# 期望：无匹配
```

- [ ] **Step 4: composer 反向依赖收口（最小）**

对 `session → composer`：
- `refreshMessageToolbarStatuses`：若已有 hook 则用 hook；否则在 shell/composer 装配后注册到 uiHooks，session 只调 hook。
- `createDraftPersistController` / `getPromptDrafts`：优先保持数据函数在 composer，但 **sessionState 不应在模块顶层硬绑 UI 模块**；若改动面过大，**记录为「已知张力」且不得新增更多 session→composer 边**，本 task 至少清零 **session→shell**。

- [ ] **Step 5: 测试与环**

```bash
npm run circular:check
npm run type-check
npm test -- --run src/modules/app_center/views/playground/deep-chat
```

Expected: circular=0；unit 全绿。

**约束：** 本 task 只做依赖方向修复，不改线程/渲染可见行为。

---

### Task 3: 结构门禁测试（防回归债务）

**Files:**
- Create or Rename: `src/modules/app_center/views/playground/deep-chat/package.structure.test.ts`  
  （可由 `controller.split.test.ts` **git mv** 升级，避免双测漂移）
- Delete after rename: 旧名若残留则删

**Interfaces:**
- Consumes: 终态树与根白名单
- Produces: 失败即 CI 红，阻止根目录再堆业务 `.ts`

- [ ] **Step 1: 写入结构测试（完整内容）**

```typescript
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DEEP_CHAT_ROOT = join(process.cwd(), 'src/modules/app_center/views/playground/deep-chat');

const ROOT_FILE_WHITELIST = new Set([
  'index.ts',
  'controller.ts',
  'types.ts',
  'constants.ts',
  'styles.css',
  'template.html',
  'index.test.ts',
  'package.structure.test.ts',
]);

const REQUIRED_DOMAIN_FILES = [
  'session/sessionState.ts',
  'session/uiHooks.ts',
  'session/domHelpers.ts',
  'session/mountContext.ts',
  'session/threadStore.ts',
  'session/pendingRuntime.ts',
  'session/sessionLifecycle.ts',
  'session/conversationContext.ts',
  'request/handleRequest.ts',
  'request/llmCall.ts',
  'request/lifecycle.ts',
  'request/budget.ts',
  'request/businessTools.ts',
  'composer/composerUi.ts',
  'composer/draftPersistence.ts',
  'composer/messageToolbar.ts',
  'composer/skillContextChip.ts',
  'composer/promptDrafts.ts',
  'chrome/generationChrome.ts',
  'shell/shellUi.ts',
  'shell/renderers.ts',
  'shell/skillLibrary.ts',
  'shell/promptPreview.ts',
  'integrations/handoffs.ts',
  'infra/deepChatConfig.ts',
  'infra/deepChatElementLoader.ts',
  'infra/deepChatStyles.ts',
  'infra/utils.ts',
  'infra/confirmModal.ts',
];

const FORBIDDEN_ROOT_BASENAMES = [
  'requestLifecycle.ts',
  'requestBudget.ts',
  'deepChatBusinessTools.ts',
  'conversationContext.ts',
  'draftPersistence.ts',
  'messageToolbar.ts',
  'skillContextChip.ts',
  'promptDrafts.ts',
  'promptPreview.ts',
  'skillLibrary.ts',
  'renderers.ts',
  'deepChatConfig.ts',
  'deepChatElementLoader.ts',
  'deepChatStyles.ts',
  'utils.ts',
];

describe('deep-chat package structure', () => {
  it('keeps thin controller and stable public exports', () => {
    const controller = readFileSync(join(DEEP_CHAT_ROOT, 'controller.ts'), 'utf8');
    const lineCount = controller.split(/\r?\n/).length;
    expect(lineCount).toBeLessThan(600);

    const indexSrc = readFileSync(join(DEEP_CHAT_ROOT, 'index.ts'), 'utf8');
    expect(indexSrc).toContain('mount');
    expect(indexSrc).toContain('unmount');
    expect(indexSrc).toContain('clearDeepChatThreadStore');
    expect(indexSrc).toContain('consumePendingSkillHandoff');
    // index 不得变成厚 barrel
    expect(indexSrc.split(/\r?\n/).length).toBeLessThan(30);
  });

  it('places required domain modules', () => {
    for (const rel of REQUIRED_DOMAIN_FILES) {
      expect(existsSync(join(DEEP_CHAT_ROOT, rel)), rel).toBe(true);
    }
  });

  it('keeps root business files on whitelist only', () => {
    const rootEntries = readdirSync(DEEP_CHAT_ROOT).filter(name => {
      const p = join(DEEP_CHAT_ROOT, name);
      return statSync(p).isFile();
    });
    for (const name of rootEntries) {
      expect(ROOT_FILE_WHITELIST.has(name), `unexpected root file: ${name}`).toBe(true);
    }
    for (const banned of FORBIDDEN_ROOT_BASENAMES) {
      expect(existsSync(join(DEEP_CHAT_ROOT, banned)), banned).toBe(false);
    }
  });

  it('forbids file-level eslint-disable and ts-nocheck in package sources', () => {
    function walk(dir: string): string[] {
      const out: string[] = [];
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) out.push(...walk(p));
        else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) out.push(p);
      }
      return out;
    }
    for (const file of walk(DEEP_CHAT_ROOT)) {
      const src = readFileSync(file, 'utf8');
      expect(src.includes('@ts-nocheck'), file).toBe(false);
      // 文件头宽禁令（允许 eslint-disable-next-line）
      const fileLevel = /^\/\*\s*eslint-disable\b/m.test(src) || /^\/\/\s*eslint-disable\b/m.test(src);
      expect(fileLevel, file).toBe(false);
    }
  });

  it('wires controller to domain entrypoints without re-hydrating god-file', () => {
    const controller = readFileSync(join(DEEP_CHAT_ROOT, 'controller.ts'), 'utf8');
    expect(controller).toContain('./session/threadStore');
    expect(controller).toContain('./shell/shellUi');
    expect(controller).toContain('./composer/composerUi');
    expect(controller).toContain('./chrome/generationChrome');
    expect(controller).toContain('./integrations/handoffs');
    const shell = readFileSync(join(DEEP_CHAT_ROOT, 'shell/shellUi.ts'), 'utf8');
    expect(shell).toMatch(/handleDeepChatRequest|from ['"].*handleRequest/);
  });
});
```

- [ ] **Step 2: 删除旧 `controller.split.test.ts`（若已 rename）**

```bash
# 若采用 git mv：
git mv src/modules/app_center/views/playground/deep-chat/controller.split.test.ts \
       src/modules/app_center/views/playground/deep-chat/package.structure.test.ts
# 再把文件内容替换/扩展为上表
```

- [ ] **Step 3: 跑结构 + 全包 unit**

```bash
npm test -- --run src/modules/app_center/views/playground/deep-chat/package.structure.test.ts
npm test -- --run src/modules/app_center/views/playground/deep-chat
```

Expected: 全绿。

---

### Task 4: 删除过渡物与机械脚本债务

**Files:**
- Delete（确认无引用后）仓库根 `tools/` 下仅用于本迁移的一次性脚本，例如：  
  `tools/break-deep-chat-cycles.mjs` · `tools/fix-deep-chat-split*.mjs` · `tools/rewrite-deep-chat-imports-*.mjs` · `tools/phase0-deep-chat-debt.mjs` · `tools/prune-unused-imports-deep-chat.mjs` · `tools/strip-deep-chat-nocheck.mjs` · `tools/split-deep-chat-controller.mjs` · `tools/undo-infra-paths.mjs` · `tools/clean-deep-chat-lint.mjs` · `tools/fix-deep-chat-cross-imports.mjs` · `tools/fix-moved-internal-imports.mjs` · `tools/fix-deep-chat-tsc.mjs`  
  **先 grep 文档/CI 引用，无引用再删；若团队希望保留审计痕迹，可移到 `tools/archive/` 并在计划验收表注明 — 但不得留在默认开发路径误跑。**
- Delete: 任何 deep-chat 内旧路径 re-export 空壳（当前盘点应已无；再扫一次）
- 禁止：删除仍被 `package.json` scripts 引用的脚本

- [ ] **Step 1: 扫 shim**

```powershell
# 旧名不应再出现在 deep-chat 根
Get-ChildItem "src\modules\app_center\views\playground\deep-chat" -File -Filter "*.ts" |
  Where-Object { $_.Name -match 'requestLifecycle|requestBudget|deepChatBusinessTools|conversationContext|utils\.ts' }
# 期望：空
```

- [ ] **Step 2: 扫 tools 引用后删除一次性脚本**

```powershell
Select-String -Path "package.json","scripts\**\*","docs\**\*" -Pattern "fix-deep-chat-split|rewrite-deep-chat-imports|phase0-deep-chat" -ErrorAction SilentlyContinue
# 无 CI 引用后再 Remove-Item tools\...
```

- [ ] **Step 3: 确认无 `@ts-nocheck` / 文件级 disable / 双路径**

---

### Task 5: 全量验收（Done 定义）

**Files:** 无新代码；只跑门禁并更新本计划勾选状态

- [ ] **Step 1: deep-chat 专用门禁**

```bash
npm run circular:check
npm run type-check
npx eslint "src/modules/app_center/views/playground/deep-chat/**/*.{ts,tsx}" --ignore-pattern "**/*.test.ts" --max-warnings=0
npm run lint:warning-gate
npm test -- --run src/modules/app_center/views/playground/deep-chat
npm run format:check
```

Expected: 全绿；unit 0 fail；用例数 ≥ Task 0 基线 total。

- [ ] **Step 2: 生产 build（含 prebuild）**

```bash
npm run build
```

Expected: exit 0。

- [ ] **Step 3: 验收检查表全部勾选**

见下文 §验收检查表。

- [ ] **Step 4: 将本计划状态改为「已完成」并写清 commit 范围（执行阶段再 commit；本制定阶段不强制 commit）**

---

## 单文件迁移 SOP（若仍有漏网路径时复用）

对每一个 `git mv A → B`：

1. 当前 deep-chat unit + circular 绿  
2. `git mv` 源与对应 `*.test.ts`  
3. **只改 import 路径**  
4. 同步测试内路径字符串  
5. 跑 Task 5 Step 1 子集（circular / type-check / deep-chat unit）  
6. 失败 → 当步回滚或修绿  

---

## 债务禁令清单（审查用）

| 禁止项 | 原因 |
|--------|------|
| `@ts-nocheck` | 掩盖类型错误 |
| 文件级 `eslint-disable no-unused-vars` | 掩盖死 import |
| 长期旧路径 re-export | 双路径债务 |
| 为迁目录新增 static 环 | 再次触发 circular:check |
| 扩大 `uiHooks` 的 `any` / 无类型 Function 滥用 | 类型债务回潮 |
| 迁文件时改行为「顺便优化」 | 无法归因回归 |
| 删测 / 降覆盖使门禁变绿 | 假绿 |
| 一次 PR 夹带 UX/协议重写 | 审查面过大 |

---

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| SafeRenderer mock 不完整导致 modal 测红 | Task 1 优先；mock 对齐真实 API |
| session→shell 解耦时漏注册 hook → 列表空白 | shell init 必注册；structure/集成测覆盖线程列表渲染 |
| circular 回潮 | 每 task 后 `circular:check`；禁止 session 再 import shell |
| 大文件 composerUi/shellUi 再膨胀 | 本计划不二次内拆；另开计划 |
| 误删仍在用的 tools 脚本 | Task 4 先 grep 引用 |

---

## 建议 PR / 提交切分

| 单元 | 内容 | 依赖 |
|------|------|------|
| PR/Commit-1 | Task 1 测绿 | 无 |
| PR/Commit-2 | Task 2 分层收口 | Task 1 |
| PR/Commit-3 | Task 3 structure 门禁 | Task 1–2 |
| PR/Commit-4 | Task 4 清理 + Task 5 build | Task 3 |

合计约 **0.5–1.5 人日**（路径迁移已完成；剩余为红测 + 分层 + 门禁）。

---

## 验收检查表（整包 Done）

- [ ] 根目录业务文件 ⊆ 白名单（structure 测试锁定）
- [ ] 无 `@ts-nocheck`、无文件级 unused-vars 宽禁令
- [ ] `session/**` 无 `from '../shell/...'` 静态 import
- [ ] `circular:check` = 0
- [ ] `type-check` / `lint` / `lint:warning-gate` / `format:check` 绿
- [ ] deep-chat unit 全绿（用例数 ≥ 基线）
- [ ] 公共导出路径未变（`index.ts` 四函数）
- [ ] `package.structure.test.ts` 存在且绿
- [ ] `npm run build` 绿
- [ ] 无旧路径 re-export 残留
- [ ] 一次性迁移脚本已归档或删除且无 CI 引用

---

## 执行顺序一句话

> **先补 mock 测绿 → 再清 session→shell 反向依赖 → structure 测试锁死终态 → 删 shim/脚本 → build 收口。**  
> 任何一步引入债务（nocheck / 环 / 降测 / 行为漂移）视为该步未完成。

---

## 与既有工作的关系

| 工作 | 关系 |
|------|------|
| controller 拆分 + uiHooks 破环 | Phase A 已完成 |
| Phase 0–3 路径迁入 | 目录终态已基本落地；本计划收口残余 |
| Responses fail-closed / tool replay | **不改动** |
| prebuild 门禁 | 每 task 后至少 circular + type-check + deep-chat unit；整包以 build 收口 |

---

**计划状态：** 已完成（2026-07-24）。  
- Task 1：SafeRenderer mock + confirmModal 路径 mock 修绿（114→118 unit，结构测 +4）  
- Task 2：session→shell 经 uiHooks 收口；ThreadMenuState 上提 types  
- Task 3：`package.structure.test.ts` 锁定终态  
- Task 4：删除一次性 `tools/*deep-chat*` 迁移脚本  
- Task 5：circular/type-check/eslint/warning-gate/format/unit 全绿；`npm run build` exit 0
