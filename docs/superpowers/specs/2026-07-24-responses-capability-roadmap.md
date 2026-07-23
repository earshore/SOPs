# OpenAI Responses 全量能力路线图

**日期：** 2026-07-24  
**对照：** [Migrate to the Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)  
**状态：** A/B/C + R1 tool loop + R6 probe 脚本已落地；R2–R7 继续推进

## 产品边界（当前）

| 能力 | 状态 |
|------|------|
| Text generation | ✅ |
| Reasoning (`reasoning.effort` + summary stream) | ✅ |
| Structured Outputs (`text.format` json_object) | ✅ |
| `store` 默认 false + 可选 true | ✅ |
| `previous_response_id` + `onResponseId` | ✅ |
| Tools 请求字段 + **function_call tool loop** | ✅ R1（`executeTool`） |
| Vision input parts | ✅ 管道 |
| Built-in tools 运行时 | ❌ R2 |
| Conversations API | ❌ R3 |
| Reasoning items 回灌 | ❌ R4 |
| json_schema strict | ❌ R5 |
| Capability UI 徽章 | ❌ R7 |

## 用法：tool loop

```ts
await callLLM(messages, provider, endpoint, key, model, {
  apiPath: 'responses',
  tools: [
    {
      type: 'function',
      name: 'lookup',
      description: 'Lookup a key',
      parameters: { type: 'object', properties: { key: { type: 'string' } } },
    },
  ],
  executeTool: async ({ name, arguments: args }) => {
    // return string output for function_call_output
    return JSON.stringify({ ok: true, name, args });
  },
  maxToolRounds: 5,
  onResponseId: id => {
    /* persist for multi-turn */
  },
});
```

- 启用条件：`apiPath === 'responses'` + `tools.length > 0` + `executeTool`
- 中间轮次 **强制 non-stream**，用 `previous_response_id` + `function_call_output` 续写
- Chat Completions 风格 tools 会自动规范为 Responses 扁平 shape

## 下一阶段

| 阶段 | 目标 | 状态 |
|------|------|------|
| **R1** | Agent tool loop | ✅ |
| **R6** | 实网 probe 脚本 | ✅ 脚本；表格待 key 实跑 |
| **R2** | Built-in tools | 待做 |
| **R3** | Conversations / 会话 previous_id 存储 | 待做 |
| **R4** | Reasoning items 回灌 | 待做 |
| **R5** | json_schema strict | 待做 |
| **R7** | Capability UI 徽章 | 待做 |

## 代码入口

- `responsesTools.ts` / `responsesToolLoop.ts` — function_call 解析与执行
- `llmService.ts` — `callLLMResponsesToolLoop`
- `tools/probe-responses-gateway.mjs` — live probe
- `applyToRequest.ts` — `buildResponsesBody` / follow-up input

## Probe

```bash
NEW_API_KEY=sk-... node tools/probe-responses-gateway.mjs
# optional: RESPONSES_PROBE_MODEL=gpt-5.5 NEW_API_ENDPOINT=https://host/v1
```

| Date | Model | Endpoint | Case | Result |
|------|-------|----------|------|--------|
| | | | plain text | |
| | | | reasoning.effort=low | |
| | | | text.format json_object | |
| | | | previous_response_id turn2 | |
| | | | stream SSE | |
