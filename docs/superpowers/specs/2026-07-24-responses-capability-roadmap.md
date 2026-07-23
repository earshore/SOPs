# OpenAI Responses 全量能力路线图

**日期：** 2026-07-24  
**对照：** [Migrate to the Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)  
**状态：** A/B/C + R1–R3 + R6 已落地；R4/R5/R7 继续

## 产品边界（当前）

| 能力 | 状态 |
|------|------|
| Text generation | ✅ |
| Reasoning (`reasoning.effort` + summary stream) | ✅ |
| Structured Outputs (`text.format` json_object) | ✅ |
| `store` 默认 false + 可选 true | ✅ |
| `previous_response_id` + `onResponseId`（含 stream） | ✅ |
| Function tool loop (`executeTool`) | ✅ R1 |
| Built-in tools **透传**（web_search / file_search / …） | ✅ R2 |
| Deep Chat 会话 `lastResponseId` 链 | ✅ R3 |
| Conversations API | ❌ 可选 |
| Reasoning items 回灌 | ❌ R4 |
| json_schema strict | ❌ R5 |
| Capability UI 徽章 | ❌ R7 |

## R3：Deep Chat 多轮

- 线程字段：`lastResponseId` / `lastResponseModel`
- 当系统设置 `apiPath === 'responses'`：
  - 发送时附带 `previousResponseId`（模型未变）
  - `store: true` 以便网关保留状态
  - `onResponseId` 写回线程并持久化
- 切换模型或新建会话会清空链

## R1：tool loop 用法

```ts
await callLLM(messages, provider, endpoint, key, model, {
  apiPath: 'responses',
  tools: [
    { type: 'function', name: 'lookup', description: '…', parameters: { type: 'object' } },
    // R2 built-in pass-through:
    { type: 'web_search' },
  ],
  executeTool: async ({ name, arguments: args }) => JSON.stringify({ ok: true }),
  maxToolRounds: 5,
});
```

## 下一阶段

| 阶段 | 目标 | 状态 |
|------|------|------|
| R1 tool loop | ✅ |
| R2 built-in 透传 | ✅ |
| R3 Deep Chat previous_id | ✅ |
| R6 probe 脚本 | ✅（表格待 key 实跑） |
| R4 Reasoning items 回灌 | 待做 |
| R5 json_schema strict | 待做 |
| R7 Capability UI | 待做 |

## 代码入口

- `responsesTools.ts` / `responsesToolLoop.ts`
- `llmService.ts` — tool loop + stream onResponseId
- `deep-chat/controller.ts` — lastResponseId 链
- `tools/probe-responses-gateway.mjs`

## Probe

```bash
NEW_API_KEY=sk-... node tools/probe-responses-gateway.mjs
```
