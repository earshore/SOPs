# 推理等级企业闭环设计（L1 意图 · L2 能力 · L3 运行时）

**日期：** 2026-07-26  
**状态：** Implemented（spec + registry/UI/request 闭环 + 表驱动单测）  
**范围：** 系统设置全局推理档、模型能力 registry、`callLLM` 请求体与可观测日志  
**关联：** `2026-07-23-model-reasoning-capability-design.md`、`appendix-model-reasoning-gateway.md`、`model-capability-catalog-2026.md`

---

## 1. 目标

在多厂商（GPT / Grok / Gemini / Claude / DeepSeek / …）与 BYOK 网关下，保证：

1. **可靠性**：只发送当前模型 allowlist 内的推理档；用户意图经可证明的就近映射，禁止「不认识就 medium」的静默丢档。  
2. **稳定性**：`modelId × surface` → 合法档 / 默认档 / mapper 的单一事实源（registry）；换模型确定性钳制。  
3. **可用性**：设置 UI 只展示可发档；降档时一次性可见提示；开发态日志同时暴露 **requested** 与 **effective**。

---

## 2. 三层契约

### L1 — 产品强度轴（存储 / 跨模型意图）

有序枚举（低 → 高）：

`low < medium < high < xhigh < max`

- 开关独立：`enabled`；关闭时不写推理字段（effort 在生效层为 `off`）。  
- **不**把 OpenAI 全集 `none|minimal|…` 强制做成产品主轴（本期 non-goal）；需要时再扩展 L1。  
- Storage 可保留意图档（如 `max`）；换到不支持的模型时钳到最近合法档并提示。

### L2 — 模型能力 allowlist（registry SSOT）

每条规则在 **surface** 上声明：

| 字段 | 含义 |
|------|------|
| `reasoningEfforts` | 该模型在该 surface 可发送的档（有序） |
| `defaultEffort` | 未指定意图时的默认 |
| `effortControlKind` | 官方控制通道（见 vendor-effort-api-alignment） |
| `mapRequest` | 意图 → 请求体片段；无 mapRequest = fail-closed |

厂商字段级对齐（Claude `output_config.effort` vs legacy budget 等）：  
→ **`2026-07-26-vendor-effort-api-alignment-design.md`**

**代表矩阵（验收基线）：**

| 家族 | 代表 id | allowlist | default / control |
|------|---------|-----------|-------------------|
| xAI Grok-4.5 | `grok-4.5` | `low\|medium\|high` | high / openai effort |
| OpenAI GPT-5.x | `gpt-5.6` 等 | low…max（含 xhigh/max 透传） | medium / openai * |
| OpenAI o-series | `o3-mini` 等 | low\|medium\|high（官方枚举 minimal\|low\|medium\|high） | medium / openai * |
| DeepSeek V4 | `deepseek-v4-flash` / `deepseek-v4-pro` | low\|high\|max + `thinking.type` | high / thinking + effort |
| Kimi K3 | `kimi-k3*` | low\|high\|max（默认 max，始终推理） | max / openai effort |
| Kimi K2.x | `kimi-k2` / `kimi-k2.5*` / `kimi-k2.6*` | 无档位（`thinking.type` 开关） | — / thinking toggle |
| GLM-5.x | `glm-5*` | max\|xhigh\|high\|medium\|low（GLM-5.2+） | max / thinking + effort |
| Claude effort 代 | `claude-opus-4.5` | low…max | high / **output_config.effort** |
| Claude legacy | `claude-sonnet-4.5` | low…max → budget | medium / budget_tokens |
| Gemini | gemini-* | low…max → budget | medium / thinkingBudget |

依据：

- OpenAI Reasoning 文档：effort **model-dependent**，可含 `xhigh` / `max`。  
- xAI Grok-4.5：官方仅 `low|medium|high`（默认 high）。  
- Codex `model_reasoning_effort` 可写 max：属 **客户端意图层**，不等于每个后端模型原生支持。

### L3 — 运行时

```
global/session prefs (L1)
  + ResolvedModelCapability (L2)
  → resolveEffectiveReasoning
  → clampEffort (nearest tier)
  → mapRequest → body
  → log: effective [+ requested when demoted]
```

| 触点 | 行为 |
|------|------|
| 设置 UI 选项 | **仅** `capability.reasoningEfforts`（禁止 merge 全产品五档到所有模型） |
| 加载 / 换模型 | `clampReasoningPrefsToActiveModel`；若降档 → 一次性 toast |
| `callLLM` | 只发 effective；dev 日志含 effective，降档时附加 requested |
| 未知 / 无 mapRequest | fail-closed：不写推理字段 |

**就近钳制规则：** 精确命中 → 原档；否则先向下再向上找最近合法档（例：`max` + grok allowlist → `high`）。  
**禁止：** 仅因「不在 allowlist」就无条件 `medium`（除非 medium 恰为最近合法档或空列表兜底）。

---

## 3. 可观测性

| 字段 | 含义 |
|------|------|
| `requestedEffort` | 会话/全局意图（钳制前） |
| `effort`（effective） | 将写入请求 / 已钳制 |
| demoted | `requestedEffort !== effort`（enabled 且非 off 时） |

Dev console 示例：

```text
[LLM] 请求将发送推理参数 surface=chat_completions model=grok-4.5 effort=high requested=max
```

无降档时可不打印 `requested=`。

---

## 4. 验收矩阵（自动化）

| # | 输入 | 期望 |
|---|------|------|
| A | grok-4.5 + enabled + max | effective `high`；body `reasoning_effort: high` |
| B | gpt-5.6 + enabled + max | effective `max`；body 含 max（allowlist 透传） |
| C | gpt-5.6 + enabled + xhigh | effective `xhigh`；body `xhigh` |
| C2 | o3-mini + enabled + max | effective `high`（allowlist 封顶）；body `reasoning_effort: high` |
| D2 | deepseek-v4-flash + enabled + medium | effective `low`（官方枚举无 medium）；body `reasoning_effort: low` + `thinking.type: enabled` |
| D3 | kimi-k2.6 + enabled + high | 无档位；body `thinking.type: enabled`（关闭时省略，厂商默认开） |
| D4 | glm-5.2 + enabled + max | effective `max`；body `reasoning_effort: max` + `thinking.type: enabled` |
| D | grok-4.5 allowlist | 不含 xhigh/max；含 high |
| E | Claude/Gemini + max | effective `max`；mapper 产生 budget/thinking 字段 |
| F | UI options | ⊆ 当前模型 allowlist |

---

## 5. 非目标

- 以 live 网关 probe 作为发版门禁或唯一真理（网关可能对非法 effort 仍 200）。  
- 全局永远只展示三档，或永远展示五档假选项。  
- Deep Chat 会话 UI 大改（共用同一 resolve/clamp 即可）。  
- 自动从 `/models` 升级 supportsReasoning。

---

## 6. 实现落点

| 区域 | 文件 |
|------|------|
| L1/L3 纯函数 | `src/services/modelCapability/prefs.ts`、`types.ts` |
| L2 数据 | `src/services/modelCapability/registry.ts` |
| 请求日志 | `src/services/llmService.ts` (`logReasoningTransport`) |
| 设置闭环 | `src/components/settings/systemSettings.ts` |
| 契约测试 | `src/services/modelCapability/*effort*.test.ts`、registry/prefs tests |

---

## 7. 成功标准

1. Spec 与代码一致：产品轴 + 按模型 allowlist + 就近 clamp + UI 过滤 + requested/effective。  
2. 表驱动单测覆盖 GPT / Grok / Gemini|Claude 代表路径。  
3. type-check + 相关 unit + build + lint warning gate / release 相关 smoke 路径通过（见 goal verification）。
