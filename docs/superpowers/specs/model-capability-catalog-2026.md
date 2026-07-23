# 模型能力目录（多协议 · 2026-07）

**状态：** Implemented（真·多协议，无 label 假实现）  
**代码：** `src/services/modelCapability/registry.ts`  
**设计：** `docs/superpowers/specs/2026-07-23-multi-protocol-llm-design.md`

## 原则

1. **双 surface：** `chat_completions`（`/chat/completions`）+ `responses`（`/responses`）
2. **凡 supportsReasoning 必有 mapRequest**（禁止只打标签不映射）
3. **UI** 仅当解析后的 surface 上存在 mapRequest
4. **关闭推理** → mapper `{}`，不写字段

## 默认 surface

| 族 | preferredSurface | 启用时字段 |
|----|------------------|------------|
| OpenAI o / GPT-5 | **responses** | `reasoning: { effort }` |
| Grok / DeepSeek / Hy3 / 部分 CN | **chat_completions** | `reasoning_effort` |
| Claude | **chat_completions** | `thinking: { type, budget_tokens }` |
| Gemini | **chat_completions** | `reasoning_effort` + `extra_body.google.thinking_config` |

各模型同时可在另一 surface 上登记备用 mapper。

## 头部模型（摘要）

| 厂商 | 示例 id | 有推理开关 |
|------|---------|------------|
| OpenAI | `o3-mini`, `gpt-5.5`, `gpt-5.6` | ✅ |
| xAI | `grok-4.5`, `grok-4*` | ✅ |
| DeepSeek | `deepseek-v4-flash`, `deepseek-r1` | ✅ |
| Anthropic | `claude-sonnet-4-5-*`, `claude-opus-4.5*` | ✅（发 thinking；若 channel 未适配可能 400） |
| Google | `gemini-3.6-flash*`, `gemini-2.5-pro*` | ✅（发 Gemini thinking 字段） |
| 其它 | kimi / qwen3 / qwq / glm-4.5 | ✅（OpenAI effort） |
| 非推理默认 | `gpt-4o`, `gpt-4.1` | ❌ fail-closed |

## 网关实测（new.hongecb.store · 本 key）

| 调用 | 结果 |
|------|------|
| `POST /responses` + grok-4.5 + `reasoning.effort` | **200**，含 reasoning output |
| `POST /chat/completions` + grok/deepseek + `reasoning_effort` | **200** |
| `POST /chat/completions` + claude + `thinking` | 当前 channel **可能 400**（客户端仍发标准 Anthropic 字段，非假 label） |
| gemini-* | 当前 key **403**（无模型） |

## 升级 channel

若 Claude/Gemini 在你们的 new-api channel 上需不同字段，只改 `mappers.ts` 中对应函数即可，无需改 UI。
