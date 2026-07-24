# Chat Completions 上线就绪审计

**日期：** 2026-07-24  
**对照官方文档：** [Chat](https://developers.openai.com/api/reference/resources/chat) · [Create chat completion](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)  
**代码入口：** `src/services/llmService.ts` · `src/services/modelCapability/{apiPaths,applyToRequest,protocolBodies,mappers,registry,resolve}.ts`  
**状态：** Phase A + B 已落地（2026-07-24）· 产品子集 **GO** · Phase C 明确 out of scope / 按需

---

## 1. 结论（能否上线）

| 判定维度 | 结论 | 说明 |
| -------- | ---- | ---- |
| **SOPs 产品主路径**（文本对话 / 分析 JSON / 推理开关 / 流式） | **GO（产品子集）** | Phase A：校验放宽、max_completion_tokens、tools 路径 fail-closed、空正文诊断、`probe:chat` |
| **官方 Chat Completions 全量 API 等价** | **不可声称（NO）** | 缺 chat tools loop / vision / json_schema / 多模态 messages / Completions CRUD 等；产品子集已硬化 |
| **默认路径 Grok / DeepSeek 文本** | **接近可上线** | Registry 默认 `chat_completions` + `reasoning_effort`；probe 与单测有实证 |
| **OpenAI o / GPT-5 走 chat 回退** | **有风险** | 仍发 `max_tokens`（官方标注 deprecated 且与 o 系不兼容）；官方推荐 Responses，本项目默认也是 Responses，但 404 回退会落到 chat |
| **Deep Chat tools / vision 在 chat 路径** | **未达上线** | `buildChatCompletionsBody` **丢弃** tools/vision；surface 能力位未声明 |

**总评：**  
以「Amazon 运营平台 + BYOK OpenAI 兼容网关 + 文本分析/对话」为产品边界，**Phase A 后产品子集可达上线（GO）**；  
以「完整实现官方 chat/completions 资源」为标准，仍 **未达全量 API 等价**（tools loop / vision / Completions CRUD 等按产品边界不做或走 Responses）。  
P0 已在 `feat/chat-completions-hardening` 落地；P1 其余项见路线图 Phase B/C。

官方备注：新项目推荐 [Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses)；Chat Completions 仍为兼容主流网关的关键路径。本项目的多协议设计与此一致。

---

## 2. 官方 API 覆盖矩阵

### 2.1 资源级（Chat 集合）

| 官方方法 | 本项目 | 产品必要性 | 判定 |
| -------- | ------ | ---------- | ---- |
| `POST /chat/completions` Create | ✅ 实现 | 必须 | 核心 |
| `GET /chat/completions` List | ❌ | 否（控制台/存储型） | 明确 out of scope |
| `GET /chat/completions/{id}` Get | ❌ | 否 | out of scope |
| `POST /chat/completions/{id}` Update | ❌ | 否 | out of scope |
| `DELETE /chat/completions/{id}` Delete | ❌ | 否 | out of scope |
| `GET .../messages` | ❌ | 否 | out of scope |

### 2.2 Create 请求体（Body）

| 官方参数 | 本项目 | 严重度 | 备注 |
| -------- | ------ | ------ | ---- |
| `model` | ✅ | — | |
| `messages` | ⚠️ 子集 | **P0/P1** | 仅 `system\|user\|assistant` + **string** content；无 `developer`、`tool`、多模态 parts |
| `stream` | ✅ 默认 true | — | |
| `stream_options` / `include_usage` | ❌ | P1 | 流式无 usage 回传 |
| `temperature` | ✅ | — | reasoning 模型 `temperatureIgnored` 时省略 |
| `max_tokens` | ✅ 遗留网关 / Claude | — | 非 OpenAI 推理模型仍用 |
| `max_completion_tokens` | ✅ OpenAI 推理 chat | — | Phase A：`applyChatMaxOutputTokens` |
| `response_format` `json_object` | ✅ | — | jsonMode |
| `response_format` `json_schema` | ❌ chat 路径 | P1 | Responses 有；chat 仅 object |
| `service_tier` | ✅ 可选 | — | |
| `tools` / `tool_choice` / `parallel_tool_calls` | ❌ chat body 不实现 | **产品冻结 B2** | `enableToolLoop` 非 responses → `LLM_TOOLS_PATH_UNSUPPORTED`；软传 tools 仍忽略 |
| `reasoning_effort` | ✅ mapper | — | OpenAI / Grok / DeepSeek 兼容 |
| Claude `thinking` on chat | ✅ mapper | 网关依赖 | channel 可能 400，有文案 |
| Gemini dual fields on chat | ✅ mapper | 网关依赖 | |
| `top_p` / penalties / `stop` / `n` / `seed` / `logit_bias` / `logprobs` | ❌ | P2 | 产品未暴露，可延后 |
| `metadata` / `store` / `prompt_cache_key` / `safety_identifier` | ❌ | P2 / 平台 | |
| `modalities` / audio / `prediction` / `web_search_options` | ❌ | out of scope | |
| `user`（deprecated） | ❌ | — | 正确不依赖 |

### 2.3 Create 响应 / 流式

| 官方 shape | 本项目 | 严重度 | 备注 |
| ---------- | ------ | ------ | ---- |
| `choices[].message.content` string | ✅ | — | |
| `content: null` + tool_calls | ✅ 校验放宽 | — | Phase A：Zod nullable + tool_calls finish_reason |
| `finish_reason: tool_calls` | ✅ | — | Phase A |
| `message.tool_calls` | ⚠️ 类型接受，无 loop | P1 | 产品 tools 走 Responses |
| `message.refusal` / annotations | ❌ | P2 | |
| `usage` + `completion_tokens_details.reasoning_tokens` | ⚠️ 类型弱 | P1 | 未消费 usage |
| SSE `data: [DONE]` + delta.content | ✅ | — | |
| SSE delta `reasoning_content` | ✅ | — | 网关扩展字段，与正文隔离 |
| SSE content 为 array parts | ❌ | P1 | 部分模型多模态流 |
| 流式中 error payload | ✅ 抛 `API_STREAM_ERROR` | — | |

### 2.4 传输与可靠性

| 能力 | 状态 |
| ---- | ---- |
| URL `{endpoint}/chat/completions` | ✅ `apiPaths.buildFullApiUrl` |
| `Authorization: Bearer` | ✅ |
| 超时 + 流式活动续期 | ✅ |
| 429 / 5xx 指数退避重试 | ✅ |
| 推理字段 400 友好文案 | ✅ |
| 非 chat 路径 404 → 一次回退 chat | ✅ |
| 生产禁止危险直连端点 | ✅ `assertSafeLLMEndpoint` |
| 实网 probe chat 矩阵 | ⚠️ 仅 `probe:reasoning` 部分覆盖 | 缺 `probe:chat` 全矩阵 |

---

## 3. 架构现状（实现摘要）

```
settings.llm.apiPath (默认 chat_completions)
  → hydrateReasoningOptionsFromStorage
  → createLLMTransport
      resolveModelCapability(preferredSurface=pathId)
      buildBodyForApiPath → buildChatCompletionsBody
      buildFullApiUrl → POST .../chat/completions
  → fetch + readOpenAIStream / JSON
  → assertValidLLMResponse (chat only)
```

**优点（可上线资产）：**

1. 路径与 body 解耦清晰（`apiPaths` / `protocolBodies` / `applyToRequest`）。
2. 推理 **fail-closed**：无 `mapRequest` 不写字段；关闭推理发 `{}`。
3. 多厂商 mapper 真实发字段，非 UI 假标签。
4. 流式正文与 `reasoning_content` 通道隔离。
5. jsonMode 强制 chat + `response_format`，利于分析链路。
6. 单测：`llmService.stream.test.ts`、`applyToRequest.test.ts`、`apiPaths.test.ts` 等（本次抽样 33 tests pass）。

**结构性短板：**

1. **chat 与 responses 能力不对称**：`surfaceOpenAiEffort()` 未声明 `supportsTools/Structured/Vision`；`buildChatCompletionsBody` 不接 tools/vision/jsonSchema。
2. **类型与 Zod 停在旧 OpenAI shape**（`function_call`，无 `tool_calls`）。
3. **token 上限字段未跟官方演进**。
4. **产品 tools 仅绑 Responses**，用户选 chat 时业务 tools 静默不可用。

---

## 4. 债务清单（按优先级）

### P0 — 上线阻断 / 高概率线上故障

| ID | 债务 | 状态 | 说明 |
| -- | ---- | ---- | ---- |
| **CC-P0-1** | `max_completion_tokens` 策略 | **已修复** | OpenAI 推理 → `max_completion_tokens`；Claude/thinking → `max_tokens` |
| **CC-P0-2** | 响应 Zod 过严 | **已修复** | nullable content、`tool_calls` finish_reason、object 宽松 |
| **CC-P0-3** | tools 静默丢弃 | **已修复（B2）** | 硬：`enableToolLoop` 非 responses 抛错；软：dev `console.warn`；产品 tools 冻结于 Responses |
| **CC-P0-4** | chat surface 能力位 | **已修复** | structured=true；tools/vision=false（诚实） |

### P1 — 上线后短期应补

| ID | 债务 | 建议 |
| -- | ---- | ---- |
| **CC-P1-1** | 无 chat tool loop | **B2 冻结** | 文档 + 设置文案；Deep Chat tools 仅 Responses |
| **CC-P1-2** | `response_format.json_schema` on chat | **已修复** | `applyChatResponseFormat` + 分析 soft schema |
| **CC-P1-3** | 多模态 image_url parts | **Phase C / out of scope** | soft-warn；用 Responses vision |
| **CC-P1-4** | `stream_options.include_usage` | **已修复** | stream 时默认附带 |
| **CC-P1-5** | chat 空正文 | **已修复** | 空 stop → `API_EMPTY_RESPONSE` |
| **CC-P1-6** | `probe:chat` | **已修复 + 实网** | 见 appendix 2026-07-24 矩阵 |
| **CC-P1-7** | 类型 tool_calls / refusal | **已修复** | `api.d.ts` + Zod |
| **CC-P1-8** | Claude/Gemini channel 差异 | **部分** | deepseek/grok 实网 OK；Claude 未在 preferred 切片；mapper 仍可改 |

### P2 — 增强 / 明确不做

| ID | 项 | 决策建议 |
| -- | -- | -------- |
| **CC-P2-1** | top_p、penalties、stop、seed、logprobs、n | 产品未暴露 → 暂不做；API 层预留可选透传即可 |
| **CC-P2-2** | Completions CRUD / List | **产品 out of scope** |
| **CC-P2-3** | Audio / Realtime / Batch | out of scope |
| **CC-P2-4** | `developer` role | 需要时映射 system 或原生 developer |
| **CC-P2-5** | platformCapability 矩阵拆分 chat 专表 | 文档债，便于评审 |

---

## 5. 优化路线（三阶段）

### Phase A — 生产硬化 · **DONE**

目标：默认 chat 路径在常见模型上 **不误杀、不发废弃致命字段、能力位诚实**。  
出口：单测绿 · token 策略 · 现代响应校验 · tools 诚实（B2）· 空正文诊断。

### Phase B — 产品能力对称 · **DONE**

目标：用户选 chat 时与选 responses 的核心体验差距可控。

1. Tools：**B2 冻结** + 设置文案 + soft warn  
2. json_schema on chat：**已实现**  
3. stream usage：**已实现**  
4. empty body：**已实现**  
5. 实网 probe：**appendix 已写入**（deepseek / grok）

### Phase C — 官方深度对齐 · **DEFERRED / OUT OF SCOPE**

| 项 | 决策 |
| -- | ---- |
| 多模态 image_url messages | 不做；用 Responses vision |
| top_p / penalties / seed 等采样透传 | 产品未暴露 → 不做 |
| usage 产品化 UI | 仅协议 `include_usage`；无账单 UI |
| Completions List/Get/Update/Delete | 明确 out of scope |

---

## 6. 与 Responses 路线关系

| 能力 | Responses（现状） | Chat Completions（现状） |
| ---- | ----------------- | ------------------------ |
| 文本 + 流式 | ✅ | ✅ |
| 推理展示 | ✅ summary | ⚠️ reasoning_content 网关扩展 |
| Structured | ✅ text.format | ⚠️ 仅 json_object |
| Tools loop | ✅ | ❌ |
| Vision | ✅ | ❌ |
| 网关 404 降级 | → chat | 自身即兜底 |

**产品策略建议：**  
- 默认路径保持 **chat_completions**（兼容面最大）。  
- OpenAI 旗舰继续 prefer **responses**。  
- **不要**在未实现 chat tools 前把 Deep Chat tools 绑死在「任意 apiPath」。  
- 文档中明确：上线宣称是 **「OpenAI 兼容 Chat Completions 产品子集」**，不是官方全资源实现。

---

## 7. 验证基线

### 审计时（实现前）

```text
npm test -- --run src/services/modelCapability/applyToRequest.test.ts \
  src/services/modelCapability/apiPaths.test.ts \
  src/services/llmService.stream.test.ts
→ 3 files / 33 tests passed
```

### Phase A+B 闭环验证（2026-07-24，`feat/chat-completions-hardening`）

```text
npm test -- --run src/services/modelCapability src/services/llmService.stream.test.ts \
  tests/unit/common/guards/typeGuards.llm.test.ts tests/unit/llmService.test.ts
→ 15 files / 123 tests passed

npm run type-check → exit 0
npm run probe:chat → deepseek-v4-flash + grok-4.5 all OK (appendix)
```

### 残留债务（明确不阻塞产品子集上线）

| 类 | 项 | 处置 |
| -- | -- | -- |
| 产品冻结 | chat tool loop / vision 多模态 | 走 Responses；Phase C 不排期 |
| 网关 | Claude channel thinking 字段 | P1-8 可选再 probe |
| 全量 API | Completions CRUD / audio 等 | out of scope |

---

## 8. 参考

- 官方：https://developers.openai.com/api/reference/resources/chat  
- 设计：`docs/superpowers/specs/2026-07-23-multi-protocol-llm-design.md`  
- Responses 路线：`docs/superpowers/specs/2026-07-24-responses-capability-roadmap.md`  
- 修复计划：`docs/superpowers/plans/2026-07-24-chat-completions-production-hardening.md`
