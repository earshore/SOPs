# OpenAI Responses / 平台能力路线图

**日期：** 2026-07-24（更新：业务 tools 接线 + 能力矩阵）  
**对照：** [Migrate to the Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)  
**状态：** **Create 收敛中** — 核心闭环 + 官方字段透传扩展（见 `2026-07-25-dual-track-api-convergence.md`）；非 OpenAI 全平台（Realtime/Batch/Conversations）

代码侧完整矩阵：`src/services/modelCapability/platformCapability.ts`（`OPENAI_PLATFORM_CAPABILITY_MATRIX`）。

## 闭环范围（产品子集）

| 层                                                                | 状态                                                       |
| ----------------------------------------------------------------- | ---------------------------------------------------------- |
| 协议：text / reasoning / structured / tools / vision / chain 代码 | ✅                                                         |
| R1 tool loop                                                      | ✅ stream-first + **stateless item 回放**（无 store 网关） |
| R2 built-in 透传                                                  | ✅ partial（无产品 UI 开关）                               |
| R3–R4 Deep Chat previous_id + latest-user                         | ✅ 代码就绪；**registry fail-closed**；网关 400 降级       |
| R5 json_schema                                                    | ✅                                                         |
| R6 实网 probe                                                     | ✅ `npm run probe:responses`                               |
| R7 设置徽章                                                       | ✅                                                         |
| 分析 JSON 结构化 options                                          | ✅ `withStructuredAnalysisOptions`                         |
| Deep Chat 只读 business tools                                     | ✅ **Responses + supportsTools 时注入**（不绑推理开关）    |
| Conversations / Assistants / Realtime / Batch                     | ❌ **不在产品范围**（见矩阵 `not_in_scope`）               |

## Deep Chat tools（当前实现）

**注入条件：** `apiPath` 为 `responses` **或** `chat_completions`，且 surface `supportsTools`，且 `enableBusinessTools` opt-in。

**双路径：** chat 与 responses 均支持 tools + tool loop（协议不同）。业务 tools 不再锁死 Responses。

**工具列表（只读、无密钥、无写入）：**

- `get_session_summary`
- `get_active_model`
- `list_recent_user_questions`

**调用策略（避免打掉 深度思考 UI）：**

1. **Stream-first**：首轮 `stream: true` + tools 入 body，保留 reasoning summary SSE。
2. 若流式正文为空（模型可能只发了 function_call）→ **non-stream tool loop** 回退。
3. 纯 non-stream 调用方仍可 `enableToolLoop: true` 走完整 tool loop。

实现：`llmService.callLLMStreamFirstThenToolLoop` + `deepChatBusinessTools.ts`。

## 分析模块

`withStructuredAnalysisOptions`：

- `aiAnalysisService` / `parallelAnalysisService`
- `analysisService`
- `ppc_search_terms` `llmAnalysisService`

行为：读用户 `apiPath`；Responses + structured → soft `jsonSchema` + `jsonMode`。

## 实网 probe（new.hongecb.store）

```bash
npm run probe:responses
```

| Case                              | Result（历史实测） |
| --------------------------------- | ------------------ |
| plain text                        | pass 200           |
| reasoning.effort (+ summary auto) | pass 200           |
| text.format json_object           | pass 200           |
| store=true                        | **fail** 400       |
| previous_response_id              | **fail** 400       |
| stream SSE                        | pass               |

客户端：链式 store/previous 失败时清链并重试（无 store）。

## OpenAI 全平台对齐说明

| 类别                                                                        | SOPs 立场                                                       |
| --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Responses 文本/推理/结构化/自定义 tools/vision                              | **已实现**（客户端）                                            |
| store / previous_response_id                                                | **fail-closed 默认关**；capability 开启后才链式；否则 item 回放 |
| Built-in tools 产品化 UI                                                    | **partial** 协议透传，无运营配置页                              |
| Conversations / Assistants / Realtime / Batch / Fine-tune / Vector store UI | **明确不做**（产品边界）                                        |

「Responses 全量能力」在本产品中的定义：

> 运营场景所需的 Responses **子集**（文本、推理展示、结构化 JSON、只读 tools、多协议路由）+ 网关探测与降级，  
> **不是** OpenAI 控制台级全平台（Conversations、Realtime、Batch 等）。

## 代码入口

- `platformCapability.ts` — 能力矩阵
- `structuredAnalysisOptions.ts`
- `deepChatBusinessTools.ts`
- `llmService.ts` — stream-first tool hybrid
- `tools/probe-responses-gateway.mjs` · `npm run probe:responses`
- `systemSettings` capability badges
