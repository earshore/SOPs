# OpenAI Responses 全量能力路线图

**日期：** 2026-07-24  
**对照：** [Migrate to the Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)  
**状态：** A/B/C 子集已落地；全量 agentic 能力分阶段推进

## 产品边界（当前）

SOPs 当前 **真·实现** 的 `/v1/responses` 子集：

| 能力                                                                        | 状态                         |
| --------------------------------------------------------------------------- | ---------------------------- |
| Text generation (`input` / `instructions` / `stream` / `max_output_tokens`) | ✅                           |
| Reasoning (`reasoning.effort` + summary stream)                             | ✅                           |
| Structured Outputs (`text.format` json_object)                              | ✅（A2/B5）                  |
| `store` 默认 false（BYOK）+ 可选 true                                       | ✅（A3/B8）                  |
| `previous_response_id` 请求字段 + `onResponseId` 回调                       | ✅ 管道（调用方负责持久化）  |
| Tools / tool_choice 请求字段                                                | ✅ 管道（调用方传入 tools）  |
| Vision input parts                                                          | ✅ 管道（`visionUserParts`） |
| Built-in tools 运行时 UI/循环                                               | ❌ 未做（agent 循环）        |
| Conversations API                                                           | ❌ 未做                      |
| Computer use / MCP host                                                     | ❌ 非本期                    |

## A/B/C 落地对照

### A（产品主路径）

1. **文档边界** — 本文 + multi-protocol design 更新
2. **jsonMode** — Responses 用 `text.format`；仅当 surface 无 structured 时回退 chat
3. **多轮** — `previousResponseId` / `onResponseId` 可选
4. **Probe** — 见附录模板（需网关 key 实跑）

### B（扩展管道）

5. text.format ✅
6. tools 请求 shape ✅（无 agent loop）
7. vision parts ✅（无 UI 上传）
8. store / previous_response_id ✅
9. built-in tools 运行时 — **下一阶段**

### C（工程）

10. SSE 解析扩展 + 单测 ✅
11. SurfaceCapability 扩展 flags ✅
12. 设置页路径 vs 目录提示 ✅

## 下一阶段计划（真·全量）

| 阶段   | 目标                      | 交付                                                              |
| ------ | ------------------------- | ----------------------------------------------------------------- |
| **R1** | Agent tool loop           | 解析 `function_call` items → 执行 → `function_call_output` 再请求 |
| **R2** | Built-in tools            | `web_search` / `file_search` / `code_interpreter` 声明与网关透传  |
| **R3** | Conversations             | 可选 Conversations API 或稳定 previous_response_id 会话存储       |
| **R4** | Reasoning items 回灌      | 多轮 input 保留 reasoning items（官方更高准确率）                 |
| **R5** | Structured Outputs schema | `text.format` json_schema + strict                                |
| **R6** | 实网 probe 矩阵           | gpt-5.x responses 全字段 200 表写入 appendix                      |
| **R7** | Capability UI             | 设置页展示 supportsTools / Vision 等徽章                          |

## 代码入口

- `types.ts` — SurfaceCapabilityFlags
- `applyToRequest.ts` — `buildResponsesBody`
- `responsesParse.ts` — output / stream / refusal / id
- `llmService.ts` — transport options + onResponseId
- `systemSettings` — apiPathCapabilityHint

## Probe 模板（人工填）

| Date | Model   | Endpoint | Case                         | Result |
| ---- | ------- | -------- | ---------------------------- | ------ |
|      | gpt-5.5 |          | responses + reasoning.effort |        |
|      | gpt-5.5 |          | text.format json_object      |        |
|      | gpt-5.5 |          | previous_response_id turn2   |        |
|      | gpt-5.5 |          | stream output_text.delta     |        |
