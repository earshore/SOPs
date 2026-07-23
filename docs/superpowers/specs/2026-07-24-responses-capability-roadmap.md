# OpenAI Responses 全量能力路线图

**日期：** 2026-07-24  
**对照：** [Migrate to the Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)  
**状态：** A/B/C + R1–R6 已落地；R7 待做

## 产品边界（当前）

| 能力 | 状态 |
|------|------|
| Text generation | ✅ |
| Reasoning (`reasoning.effort` + summary stream) | ✅ |
| Structured Outputs (`text.format` json_object) | ✅ |
| Structured Outputs (`text.format` json_schema + strict) | ✅ R5 |
| `store` / `previous_response_id` / `onResponseId` | ✅ |
| Function tool loop (`executeTool`) | ✅ R1 |
| Built-in tools 透传 | ✅ R2 |
| Deep Chat 会话 lastResponseId 链 | ✅ R3 |
| 链上 latest-user-only（服务端保留 reasoning items） | ✅ R4 |
| Capability UI 徽章 | ❌ R7 |
| Conversations API | ❌ 可选 |

## R3 + R4：多轮

- Deep Chat 持久化 `lastResponseId` / `lastResponseModel`
- 有 `previous_response_id` 时：`input` **仅最新 user**，`store: true`，不重放历史 / instructions
- 服务端保留 reasoning items（官方多轮推理优势）

## R5：json_schema

```ts
await callLLM(messages, provider, endpoint, key, model, {
  apiPath: 'responses',
  jsonSchema: {
    name: 'analysis',
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean' } },
      required: ['ok'],
      additionalProperties: false,
    },
    strict: true, // default true when omitted
  },
});
```

优先于 `jsonMode` 的 `json_object`。

## 下一阶段

| 阶段 | 目标 | 状态 |
|------|------|------|
| R1–R6 | 见上 | ✅ |
| **R7** | 设置页 Capability 徽章（tools/vision/structured/responses） | 待做 |

## Probe

```bash
NEW_API_KEY=sk-... node tools/probe-responses-gateway.mjs
```
