# 厂商推理控制 API 企业对齐与长期演进

**日期：** 2026-07-26  
**状态：** Implemented（EffortControlKind + Claude 双路径 + 表驱动契约）  
**范围：** 多厂商推理强度 → 官方请求字段；能力目录演进流程  
**关联：** `2026-07-26-reasoning-effort-closed-loop-design.md`、`registry.ts`、`mappers.ts`

---

## 1. 目标

1. **官方 API 对齐**：发出去的字段与厂商文档一致（字符串枚举 / budget 各走其道）。  
2. **生产可观测**：`effortControlKind` + requested/effective + body marker。  
3. **长期可演进**：厂商改 API 时只改 **registry 规则 + mapper 种类**，不改业务 UI 与 `callLLM` 主路径。

---

## 2. 产品轴 vs 厂商字面量（禁止混淆）

| 层 | 内容 |
|----|------|
| L1 产品 | `low \| medium \| high \| xhigh \| max`（**无 extra**；Claude 的 xhigh ≈ 口语 “extra high”） |
| L2 模型 | `reasoningEfforts` + `defaultEffort` + **`effortControlKind`** + `mapRequest` |
| L3 运行时 | clamp → mapRequest → body；日志 effective / requested |

**禁止：**

- 全局 UI 假五档对不支持模型可选  
- 用 Codex 配置枚举代替厂商 HTTP 字段  
- 为 Claude 引入非官方字符串 `extra`

---

## 3. EffortControlKind（SSOT）

| Kind | 官方形态 | 代表家族 |
|------|----------|----------|
| `openai_reasoning_effort` | `reasoning_effort` | Chat Completions（GPT / Grok 网关） |
| `openai_responses_reasoning` | `reasoning.effort` | Responses |
| `anthropic_output_effort` | `output_config.effort` | Claude effort 能力代（Opus 4.5+ / Sonnet 4.6+ / …） |
| `anthropic_budget_tokens` | `thinking.budget_tokens` | Claude 旧 extended thinking |
| `gemini_thinking_budget` | `thinkingConfig.thinkingBudget` + 网关 effort | Gemini |
| `none` | 不写字段 | 未知 / fail-closed |

新增厂商控制方式 = **新增 kind + mapper + registry 挂载**，禁止在 `systemSettings` 写厂商 if。

---

## 4. 当前对齐矩阵（验收基线）

| 家族 | Allowlist | Control | Default | 文档依据 |
|------|-----------|---------|---------|----------|
| GPT-5 / o | low…max | openai_* | medium | OpenAI Reasoning |
| Grok-4.5 | low\|medium\|high | openai_reasoning_effort | high | xAI Reasoning |
| Claude effort 代 | low…max | **output_config.effort** | **high** | Anthropic Effort |
| Claude legacy | low…max → budget | thinking.budget_tokens | medium | Extended thinking (legacy) |
| Gemini | low…max → budget | thinkingBudget | medium | Gemini thinking |

Claude **没有** `extra`；产品与 wire 均为 **`xhigh`**。

---

## 5. 长期更新流程（运营 / 研发）

当厂商发布新模型或改 effort 枚举：

1. **读官方文档**（非论坛/配置客户端）→ 记下 allowlist、default、字段路径。  
2. **Registry**：更具体的 `modelPattern` 放在更前；绑定正确 `effortControlKind` + mapper。  
3. **Mapper**：仅当出现新字段路径时新增 kind；旧 kind 保留至模型退役。  
4. **契约测试**：表驱动 `(modelId, requested) → effective + body 片段`。  
5. **asOf / changelog**：更新 `MODEL_CAPABILITY_CATALOG_META.asOf` 与本 spec。  
6. **网关**：new-api 可能透传或吞字段；以 client allowlist 为准，不靠 HTTP 200 证明支持。

### 退役与双轨

- 同一产品族可并存两种 kind（例：Claude 4.5 sonnet = budget，Opus 4.5 = output effort）。  
- 旧 mapper **不删除**，直到 catalog 无引用。  
- 未知 modelId：**fail-closed**（无推理 UI / 无字段）。

---

## 6. 实现落点

| 组件 | 文件 |
|------|------|
| Kind 类型 | `types.ts` → `EffortControlKind` |
| Mappers | `mappers.ts` → `mapAnthropicOutputEffort` 等 |
| Catalog | `registry.ts` |
| Resolve | `resolve.ts` → `effortControlKind` |
| 日志 | `llmService.extractOutboundReasoningMarker` 识别 `output_config.effort` |
| 测试 | `effortClosedLoop.test.ts`、`mappers.test.ts`、`registry.test.ts` |

---

## 7. 成功标准

1. Claude Opus 4.5 + max → body `output_config.effort === "max"`。  
2. Claude Sonnet 4.5 + max → body `thinking.budget_tokens`（legacy）。  
3. 无 `extra` 字符串出现在类型或 mapper 输出。  
4. GPT/Grok 既有 allowlist 行为保持。  
5. 表驱动单测 + type-check 通过。
