# ModelSelect 组件开发与使用指南

**Status:** active · 配套方案: `docs/superpowers/plans/2026-08-06-model-select-normalization.md`
**Updated:** 2026-08-06
**Owner:** 前端 / 运营工作台
**适用范围:** 一切需要「选择 LLM 模型 + 重新获取模型列表」的页面（设置区、运营工作台模块页）

> 本指南是**可执行契约**：页面接入请逐条对照 §3 骨架与 §4 行为契约，禁止绕过组件自建模型选择/刷新逻辑。
> 上位法: [COMPONENT_GUIDELINES.md](../COMPONENT_GUIDELINES.md) · [CONTENT_DESIGN.md](../CONTENT_DESIGN.md) · [SHARED_CAPABILITIES_GUIDE.md](../SHARED_CAPABILITIES_GUIDE.md)

---

## 1. 什么时候用这个组件

**用（Use）**

- 页面需要一个 `<select>` 展示当前可用模型，且需要用户切换。
- 页面有「重新获取模型列表」按钮（语义 = 真正调用 `/models` 刷新，不是重读本地缓存）。
- 选择结果需要绑定到工具策略默认模型（`toolStrategyService`）或 provider config。

**不用（Don't）**

- 只是**读取**当前解析出的模型（如 Master Analysis / PPC 只在请求时经 `resolveToolLlmConfig` 取模型）→ 不需要组件，继续走 `llmToolBridge`。
- 需要多选 / 模型能力矩阵表格（如设置页「模型与能力」详情）→ 用设置面板原生控件，仅复用 `modelSelectService` 的纯函数。
- **系统设置区（LLM 主表单 / 工具策略）**：Alpine 响应式绑定 + dirty 分区 + 显式保存矩阵（`COMPONENT_GUIDELINES.md` §10）决定其**不挂 `createModelSelect` controller、不换骨架**；只复用组件纯函数层（`dedupeModels / getModelId` 已 re-export 到 settings domain），消灭重复实现。

**判断口诀**：页面里出现「`fetchModelsFromApi`、模型去重、strategy 模型回写、刷新按钮 spin」任一逻辑 → 先检查是否已在组件里，组件有就用组件，没有就加进组件，**不要**在页面里再写一份。

---

## 2. 目录与分层

```text
src/components/modelSelect/
  types.ts                    # 公共类型（唯一 SSOT）
  modelSelectState.ts         # 状态机：纯 TS，无 DOM、无 IO、无副作用
  modelSelectService.ts       # 数据层：网络 + 持久化 + 选项构建（唯一允许 import 服务的文件）
  modelSelectUi.ts            # 渲染层：把 state 画到 DOM（纯函数，可单测）
  modelSelectController.ts    # 组合层：绑定事件、生命周期、对外 API
  modelSelect.css             # 样式：只引用 tokens / 共享语义类
  modelSelect.test.ts         # 单测
```

**依赖方向（禁止反向）**：

```text
controller → ui / service
service    → llmModelList + settingsLlmModel(纯函数上移) + toolStrategyService + llmFailureUx + storageService
ui         → types（只读 state 渲染）
state      → types
```

注意：`getModelId` 真身在 `src/common/utils/modelOptions.ts`（无依赖最底层），组件 `modelSelectService` re-export、`toolStrategyService` 与 settings 直接 import——避免组件与 services 的循环依赖；`dedupeModels` 真身在 `modelSelectService`，settings re-export。禁止在页面/服务内重写等价实现。

---

## 3. DOM 骨架（页面必须按此结构）

```html
<div data-model-select>
  <label data-model-select-label class="sr-only">AI 翻译模型</label>
  <select data-model-select aria-describedby="model-select-status"></select>
  <button
    data-model-select-refresh
    type="button"
    aria-label="重新获取可用模型"
    title="重新获取可用模型"
  >
    <i class="fas fa-sync-alt" aria-hidden="true"></i>
  </button>
  <span
    id="model-select-status"
    data-model-select-status
    class="sr-only"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  ></span>
</div>
```

### 3.1 元素职责（不可改动语义）

| 元素 | 职责 | 组件写入 |
| --- | --- | --- |
| `[data-model-select]` | 根容器，`createModelSelect` 挂载点 | — |
| `[data-model-select]` select | 模型选项 | options、value、disabled |
| `[data-model-select-refresh]` | 刷新按钮 | disabled、`aria-busy`、icon 追加 `fa-spin` |
| `[data-model-select-status]` | sr-only 状态播报 | textContent、role 保持 `status`（错误时组件内部可切 `alert`） |
| `[data-model-select-label]` | 可见/隐藏 label | textContent 由页面提供（如「AI 翻译模型」） |

### 3.2 初始化

```ts
import { createModelSelect } from '@/components/modelSelect';

const modelSelect = createModelSelect(
  rootEl,                                  // [data-model-select] 或包含它的容器
  { targetId: 'keyword-hunter-seo-process', provider: activeProvider },
  {
    onModelChange(model) { /* 页面联动：如 Deep Chat 重算能力控件 */ },
    onRefresh({ models, selectedModel }) { /* 刷新成功（写盘后）回调：如 Deep Chat 重读 sessionState.currentConfig */ },
    onToast(message, type) { /* 默认走 showToast，可覆盖 */ },
    persist: 'strategy',                   // 'strategy' | 'dirty'（Settings 全局区用 'dirty'，等表单保存）
  }
);

// 页面卸载时（onUnmount / $cleanup）
modelSelect.destroy();
```

- `targetId` 必须是 `toolStrategyService.TOOL_STRATEGY_TARGETS` 中存在的 id（如 `keyword-hunter-seo-process` / `playground-deep-chat`）；Settings 全局区没有对应工具目标时传 `'llm-global'`（组件内部对该 id 跳过 strategy 回写）。

---

## 4. 行为契约（不可协商）

### 4.1 状态机

```text
idle ──(init)──────────────► ready
idle ──(refresh 点击)──────► fetching ──成功──► ready
                              fetching ──失败──► error ──(重试/重渲染)──► fetching
```

- 重复点击刷新：`fetching` 态下按钮 disabled，忽略再次点击。
- `error` 态：select 保持上一可用选项（不置空），状态行播报错误摘要，toast 展示完整错误。

### 4.2 刷新语义（P0 修复项）

「重新获取模型列表」**必须**调用 `fetchModelsFromApi(provider, endpoint, apiKey)` 真正请求 `/models`。

- 无活跃 provider → `showLlmFailureToast(ValidationError('请先在系统设置中选择 LLM 提供商', 'ERR_LLM_PROVIDER_NOT_SELECTED'))`
- 无 endpoint / 无 API Key → 对应标准错误码（`BIZ_NO_MODEL_CONFIGURED` / `ERR_LLM_API_KEY_MISSING`），提供「打开设置」动作
- 成功 → 写回：
  1. `StorageService.setLLMConfig(provider, { ...config, models, model: nextModel })`（保 key 为空串，密钥走 secure 存储）
  2. `setToolTargetDefaultModel(targetId, provider, nextModel)`（strategy 原值不存在或失效时取列表第一个）
- 失败 → `showLlmFailureToast(error, { titlePrefix: '获取模型失败: ' })`；非 Abort 错误上报 `ErrorService.handle(..., { action: 'refreshModels', module: 'modelSelect', notify: false })`

### 4.3 选项构建（单一实现）

```ts
// 唯一公式，禁止页面重写
options = dedupe(
  ensureSelected(
    [...configured.models, ...preset.models, strategyModel],
    config.model,             // 失效时并入首项保证可见
  )
)
```

### 4.4 选中变更

- 立即持久化（`persist: 'strategy'`）或标记脏（`persist: 'dirty'`，Settings 全局区）。
- 触发 `onModelChange(model)` 后由宿主决定后续动作（组件不代做能力控件联动、不代刷新翻译状态机）。
- 刷新成功（写盘后）触发 `onRefresh({ models, selectedModel })`：宿主需要同步会话状态（如 Deep Chat 的 `sessionState`）或联动能力控件时使用；`onRefresh` 可以是 async（宿主自行 await 内部操作）。

### 4.5 文案（对齐 CONTENT_DESIGN，禁止自造变体）

| 场景 | 文案 |
| --- | --- |
| 刷新按钮 label/title | `重新获取可用模型` |
| 刷新中状态 | `正在获取可用模型` |
| 成功 toast | `成功同步 N 个模型` |
| 成功状态行 | `当前模型：{model}` |
| 空列表 | select 空项 `模型未配置` / `暂无可选模型`（无 provider / 有 provider 无模型） |
| 失败 toast | 前缀 `获取模型失败: ` + `llmFailureUx` 标准模板正文 |

Settings 按钮形态可保留带文本的「获取模型列表 / 同步中」（同一文案源，不新增变体）。

---

## 5. 样式与无障碍（最低线）

- 样式：`modelSelect.css` 只引用 `forms.css` / `buttons.css` 语义类与 design tokens；**禁止**新增裸 hex / 第三套按钮体系。
- 刷新 icon：`fas fa-sync-alt`，fetching 时追加 `fa-spin`；按钮 ≥ 40px 高（密集工具条可 `--field-height-compact`）。
- `select` disabled 态必须可辨识（沿用 forms 约定）。
- a11y：label 与 select 关联；状态行 `aria-live="polite"`（错误 `role="alert"`）；刷新按钮 `aria-busy`；焦点环 `:focus-visible`。

---

## 6. 测试要求（合入门禁）

| 层级 | 必测项 |
| --- | --- |
| `modelSelectState.test.ts` | 状态转移合法/非法、重复刷新忽略 |
| `modelSelectService.test.ts` | 选项去重与保序、strategy 失效回退首个、刷新成功写回（mock fetch + storage）、无 provider/endpoint/key 各错误码 |
| `modelSelectUi.test.ts` | 渲染三态（ready/fetching/error）DOM 断言、aria 属性 |
| 宿主页面 | 接入页面回归：Deep Chat 刷新后模型**真实变化**、Keyword Hunter 翻译模型切换生效、Settings 表单保存语义不变 |

命令：`npm run test:unit:modelSelect`；宿主回归用对应套件（`settings` / `keyword-hunter` / `deep-chat`）。

---

## 7. 接入 Checklist（给实现者）

- [ ] 页面骨架使用 §3 DOM 结构，无手写 select/刷新按钮
- [ ] 未在页面 import `fetchModelsFromApi`（唯一入口在组件 service）
- [ ] `targetId` 已注册到 `TOOL_STRATEGY_TARGETS`（或合法传 `'llm-global'`）
- [ ] `destroy()` 在卸载路径调用（EventBus/timer/监听清理）
- [ ] 文案来自 §4.5，无自造变体
- [ ] 新增页面行为有单测或已有套件回归
- [ ] 无新增依赖 / 无新裸色值 / 无第三套按钮体系

---

## 8. 演进

| 版本 | 变更 |
| --- | --- |
| v1.0 | 初版：状态机 + 数据层 + 渲染层 + 控制器；收敛 4 处引用点；Deep Chat 刷新行为修复；`normalizeModels / getFirstModel / dedupeTranslationModels` 等页面自研实现移除；`onRefresh` hook（Deep Chat 会话同步）；Settings 纯函数层收敛（dedupeModels / getModelId re-export） |

新增能力（如多模型批量管理、能力矩阵选择器）优先扩展组件或复用其 service 纯函数，**禁止**在页面另起实现；如需新范式，按 `COMPONENT_GUIDELINES.md` §6 登记说明。
