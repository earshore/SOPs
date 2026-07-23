# 模型能力目录（头部 / 主流 · 2026-07）

**状态：** 已落地到 `src/services/modelCapability/registry.ts`  
**原则：** fail-closed；**只有 control 档**（有 `mapRequest`）才显示「启用推理」并写请求字段。

> 说明：用户口语中的「claude fable-5」按 **Claude 4.5**（opus / sonnet）理解并登记；非独立厂商。

## 档位

| 档位        | 含义                                         | 产品表现                                   |
| ----------- | -------------------------------------------- | ------------------------------------------ |
| **control** | 支持推理 + 已映射请求字段                    | 显示开关/强度；启用后发 `reasoning_effort` |
| **label**   | 业界公认会推理，但本网关字段未验证或实测 400 | **不显示开关**；不写字段                   |
| **未登记**  | 未知模型                                     | 完全 fail-closed                           |

## OpenAI

| 模式 / 族    | 示例 id                                                         | 档位        | 备注                      |
| ------------ | --------------------------------------------------------------- | ----------- | ------------------------- |
| o-series     | `o1`, `o1-mini`, `o3`, `o3-mini`, `o4-mini` + 日期后缀          | **control** | `reasoning_effort`        |
| GPT-5 旗舰   | `gpt-5`, `gpt-5.1`…`gpt-5.6`, `gpt-5-mini/pro/nano` + `gpt-5-*` | **control** | OpenAI 兼容网关契约       |
| GPT-4o / 4.1 | `gpt-4o`, `gpt-4.1`                                             | **未登记**  | 非推理默认；勿盲写 effort |

## xAI Grok

| 模式 / 族 | 示例 id                  | 档位        | 备注                          |
| --------- | ------------------------ | ----------- | ----------------------------- |
| Grok 4.5  | `grok-4.5`, `grok-4*`    | **control** | **new-api 实测 200 + effort** |
| Grok 3    | `grok-3`, `grok-3-mini*` | **control** | 常见网关透传                  |

## DeepSeek

| 模式 / 族     | 示例 id                              | 档位        | 备注                                      |
| ------------- | ------------------------------------ | ----------- | ----------------------------------------- |
| V4            | `deepseek-v4-flash`, `deepseek-v4-*` | **control** | **new-api 实测**                          |
| R1 / reasoner | `deepseek-r1*`, `deepseek-reasoner`  | **control** | 主流推理 SKU；若某 channel 400 再降 label |

## Anthropic Claude

| 模式 / 族        | 示例 id                                    | 档位      | 备注                                                    |
| ---------------- | ------------------------------------------ | --------- | ------------------------------------------------------- |
| Opus 4 / 4.5     | `claude-opus-4*`, `claude-opus-4.5*`       | **label** | 本网关 plain 200；`reasoning_effort`/`thinking` **400** |
| Sonnet 4 / 4.5   | `claude-sonnet-4*`, `claude-sonnet-4-5-*`  | **label** | 同上（含 `claude-sonnet-4-5-20250929`）                 |
| Haiku 4          | `claude-haiku-4*`                          | **label** | 同上                                                    |
| 3.5 / 3.7 Sonnet | `claude-3-5-sonnet*`, `claude-3-7-sonnet*` | **label** | 历史旗舰                                                |

**为何没开关：** 不是「不支持推理」，而是 **OpenAI 兼容层上的字段未打通**；硬开会 400。待 channel 确认 Anthropic extended thinking 字段后再升 control。

## Google Gemini

| 模式 / 族      | 示例 id                                            | 档位      | 备注                                         |
| -------------- | -------------------------------------------------- | --------- | -------------------------------------------- |
| Gemini 3.6     | `gemini-3.6-flash*`, `gemini-3.6-pro*`             | **label** | 字段多为 `thinking_config` 等，非统一 effort |
| Gemini 3.5 / 3 | `gemini-3.5-*`, `gemini-3-flash*`, `gemini-3-pro*` | **label** | 同上                                         |
| Gemini 2.5     | `gemini-2.5-flash*`, `gemini-2.5-pro*`             | **label** | 同上                                         |

## 其它常见推理线（label）

| 族            | 模式                                | 档位                      |
| ------------- | ----------------------------------- | ------------------------- |
| Moonshot Kimi | `kimi-k2*`, `moonshot-v1-thinking*` | label                     |
| Qwen / QwQ    | `qwen3*`, `qwen-qwq*`, `qwq*`       | label                     |
| 智谱 GLM      | `glm-4.5*`, `glm-z1*`               | label                     |
| 硅基 Hy3      | `hy3-preview`, `hy3-*`              | **control**（本网关实测） |

## 本项目 new-api 实测（key 可见模型 · 2026-07-23）

| id                           | plain | `reasoning_effort` | 目录档位 |
| ---------------------------- | ----- | ------------------ | -------- |
| `grok-4.5`                   | 200   | 200                | control  |
| `deepseek-v4-flash`          | 200   | 200                | control  |
| `hy3-preview`                | 200   | 200                | control  |
| `claude-sonnet-4-5-20250929` | 200   | **400**            | label    |

## 如何把 label 升为 control

1. 确认生产 `/models` 中的 **精确 id**
2. `POST chat/completions` 分别试：`reasoning_effort`、渠道文档中的 thinking 字段
3. 200 + 行为符合预期 → 在 `registry.ts` 改为 `controlChatReasoning` / 专用 mapper
4. 更新本表与 `appendix-model-reasoning-gateway.md` probe log

## 代码入口

- 规则表：`src/services/modelCapability/registry.ts`
- 解析：`resolveModelCapability` / `shouldShowReasoningControls`
- 网关附录：`appendix-model-reasoning-gateway.md`
