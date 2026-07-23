# OpenAI Responses 全量能力路线图

**日期：** 2026-07-24  
**对照：** [Migrate to the Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)  
**状态：** A/B/C + R1–R7 **闭环完成**（产品文本/推理/工具管道子集；Conversations API 等可选增强另列）

## 产品边界（当前）

| 能力                                                | 状态     |
| --------------------------------------------------- | -------- |
| Text generation                                     | ✅       |
| Reasoning + summary stream                          | ✅       |
| `text.format` json_object / json_schema+strict      | ✅       |
| store / previous_response_id / stream onResponseId  | ✅       |
| Function tool loop (`executeTool`)                  | ✅ R1    |
| Built-in tools 透传                                 | ✅ R2    |
| Deep Chat lastResponseId 链                         | ✅ R3    |
| 链上 latest-user-only（reasoning items 服务端保留） | ✅ R4    |
| 设置页 Capability 徽章                              | ✅ R7    |
| Conversations API 产品化                            | 可选增强 |

## 闭环交付清单

| 阶段  | 交付                                                      | 提交线索      |
| ----- | --------------------------------------------------------- | ------------- |
| A/B/C | flags / text.format / store / previous_id 管道 / 设置提示 | `51cae801` 等 |
| R1    | tool loop                                                 | `cfa03a26`    |
| R2    | built-in tool types                                       | `bca1c98e`    |
| R3    | Deep Chat previous_id                                     | `bca1c98e`    |
| R4    | chain latest-user input                                   | `9f2f0758`    |
| R5    | json_schema strict                                        | `9f2f0758`    |
| R6    | `tools/probe-responses-gateway.mjs`                       | `cfa03a26`    |
| R7    | 设置页徽章                                                | 本提交        |

## 使用要点

### Deep Chat 多轮（responses）

系统设置选 **Responses** → 会话自动 `store` + `previous_response_id`；换模型清空链。

### Tool loop

```ts
await callLLM(messages, provider, endpoint, key, model, {
  apiPath: 'responses',
  tools: [
    { type: 'function', name: 'lookup', parameters: { type: 'object' } },
    { type: 'web_search' },
  ],
  executeTool: async ({ name, arguments: args }) => JSON.stringify({ ok: true }),
});
```

### json_schema

```ts
jsonSchema: { name: 'result', schema: { type: 'object', ... }, strict: true }
```

### Probe

```bash
NEW_API_KEY=sk-... node tools/probe-responses-gateway.mjs
```

## 可选后续（非阻塞闭环）

1. Conversations API 产品 UI
2. 分析模块默认接 `jsonSchema`
3. Deep Chat 挂载业务 tools（lookup ASIN 等）
4. 网关 live probe 表填入 appendix

## 代码入口

- `modelCapability/*` — body / parse / tools / loop
- `llmService.ts` — transport + tool loop + stream id
- `deep-chat/controller.ts` — lastResponseId
- `systemSettings.*` — path hint + **capability badges**
- `tools/probe-responses-gateway.mjs`
