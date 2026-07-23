# OpenAI Responses 全量能力路线图

**日期：** 2026-07-24  
**对照：** [Migrate to the Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)  
**状态：** **真闭环完成** — 协议子集 + 业务接入 + 实网 probe 证据 + UI 徽章

## 闭环范围

| 层                                                           | 状态                               |
| ------------------------------------------------------------ | ---------------------------------- |
| 协议：text / reasoning / structured / tools / vision / chain | ✅                                 |
| R1 tool loop                                                 | ✅                                 |
| R2 built-in 透传                                             | ✅                                 |
| R3–R4 Deep Chat previous_id + latest-user                    | ✅（网关不支持时自动降级）         |
| R5 json_schema                                               | ✅                                 |
| R6 实网 probe                                                | ✅ 脚本 + new.hongecb 实测表       |
| R7 设置徽章                                                  | ✅                                 |
| **业务：分析 JSON 结构化 options**                           | ✅ `withStructuredAnalysisOptions` |
| **业务：Deep Chat 只读 tools**                               | ✅ 推理开启时启用                  |
| Conversations API 产品化                                     | 可选（本网关无 store/previous_id） |

## 业务接入

### 分析模块

`withStructuredAnalysisOptions` 已接入：

- `aiAnalysisService` / `parallelAnalysisService`
- `analysisService`（全量报告 + 翻译）
- `ppc_search_terms` `llmAnalysisService`

行为：读取用户 `apiPath`；Responses + structured → soft `jsonSchema` + `jsonMode`；chat → `jsonMode` + `response_format`。

### Deep Chat 只读 tools

会话 **启用推理** 且路径/模型支持 tools 时注入：

- `get_session_summary`
- `get_active_model`
- `list_recent_user_questions`

无密钥、无写入、未知 tool 拒绝。`enableToolLoop: true`（tool 轮 non-stream）。

## 实网 probe（new.hongecb.store / deepseek-v4-flash）

```bash
npm run probe:responses
```

| Case                    | Result                     |
| ----------------------- | -------------------------- |
| plain text              | pass 200                   |
| reasoning.effort=low    | pass 200                   |
| text.format json_object | pass 200                   |
| store=true              | **fail** 400 not supported |
| previous_response_id    | **fail** 400 not supported |
| stream SSE              | pass                       |

客户端：链式 store/previous 失败时清链并重试（无 store）。

## 代码入口

- `structuredAnalysisOptions.ts`
- `deepChatBusinessTools.ts`
- `tools/probe-responses-gateway.mjs` · `npm run probe:responses`
- `systemSettings` capability badges
