# 模型能力目录与推理控制设计

**日期：** 2026-07-23  
**状态：** Implemented（P1 全局 + P2 会话覆盖 + new-api 实测附录已落地；见 appendix-model-reasoning-gateway.md）  
**范围：** 模型真实能力发现、推理开关 / 思考强度、系统设置全局默认 + Deep Chat 会话覆盖  
**非目标（本期）：** 多租户计费、自动 probe 未知模型、全厂商原生协议直连（仅 OpenAI 兼容 + 当前 new-api 中转形态）

---

## 0. 主路径审查（严谨性）

### 0.1 审查结论

**主路径「Capability Registry + `/v1/models` 合并 + 请求体 mapper」审查通过**，但原稿需补强下列约束，否则易在网关/未知模型上「看起来支持、实际 400」或静默无效。

### 0.2 原稿风险 → 补强

| # | 风险 | 补强规则 |
|---|------|----------|
| R1 | 把 OpenAI 字段名当成唯一真理 | **Mapper 按 `provider` + `modelPattern` 配置**；字段名以「对当前默认网关（new-api）实测」为准，文档中示例仅作示意 |
| R2 | 未知模型误开推理 UI | **Fail-closed**：Registry 未命中且 models 未声明 reasoning → `supportsReasoning: false`，不展示 UI、不写请求字段 |
| R3 | `/models` 的 features 字符串被过度信任 | **语义字段优先 Registry**；`/models` 仅可**提高** `contextWindow` 可信度或补充 `features` 标签，**不可单独**把未知模型升级为 supportsReasoning，除非 features 命中**白名单标签**（见 §3.3） |
| R4 | 网关拒绝未知字段导致整请求失败 | Mapper 输出前经 **allowlist 校验**；发送层只 merge 已声明字段；错误体若含 reasoning 相关，降级提示「当前网关未透传推理参数」 |
| R5 | 推理内容污染业务正文 | Stream 解析：`reasoning_content`（及网关等价字段）**不进入** `content` 最终拼接；UI 可选折叠展示 |
| R6 | temperature 与推理模型冲突 | Capability 标 `temperatureIgnored: true` 时，请求体**省略** temperature（不传 0 糊弄） |
| R7 | 全局与会话偏好互相踩踏 | 明确 **解析优先级**：会话显式覆盖 > 全局默认 > Registry 默认 effort > off |
| R8 | 模型列表被压成 `string[]` 丢能力 | 持久化保留 **对象形态** `{ id, name?, context?, features? }`；解析时再 merge Registry |
| R9 | 一次大改 Deep Chat + 设置 | **分期**：P1 系统设置全局 + llmService 请求映射；P2 Deep Chat 会话覆盖 + UI |
| R10 | 无验收契约 | 必须有 **契约单测**（mapper 输出快照）+ **mock 网关** 集成；生产以 new-api 实测表附录维护 |

### 0.3 审查通过条件（已满足）

1. 不依赖 `/v1/models` 作为唯一能力源。  
2. 用户可选推理开关与强度时，**主路径是请求 JSON 字段**，不是 prompt 文案。  
3. 未知模型 fail-closed。  
4. 与现有 SOPs 栈一致：BYOK、OpenAI 兼容 `chat/completions`、系统设置拉模型、Deep Chat 会话调参。  
5. 全局默认 + 会话覆盖的优先级可测试。

---

## 1. 目标与成功标准

### 1.1 产品目标

1. 运营/用户能看到：**当前模型是否支持推理**、能否开关、思考强度档位。  
2. 打开推理时，请求真实携带网关可识别的参数；关闭时**不携带**（或显式 off，由 mapper 决定）。  
3. **系统设置**提供全局默认；**Deep Chat** 可会话级覆盖（且仅覆盖有效模型能力范围内的选项）。

### 1.2 成功标准

| ID | 标准 |
|----|------|
| S1 | `GET /models` 仍只负责「可用 id 列表 + 可选 metadata」 |
| S2 | `supportsReasoning === false` 时设置页与 Deep Chat 均不展示推理控件 |
| S3 | 开启推理时，`callLLM` / stream 请求体含 mapper 约定字段；关闭时不含非法字段 |
| S4 | 全局默认变更后，新会话 / 未覆盖会话使用新默认 |
| S5 | Deep Chat 会话覆盖后，仅该线程请求使用覆盖值；其它模块走全局 |
| S6 | Stream 最终 `text` 不含 reasoning 通道内容 |
| S7 | 单测覆盖 resolve / merge / mapper / 优先级；无需真实 key 即可绿 |

### 1.3 非目标

- 自动对全网模型 probe 能力。  
- 统一所有厂商原生 API（非 OpenAI 兼容直连）。  
- 推理 token 计费面板、A/B 实验平台。  
- 把「思考强度」写进 system prompt 当主实现。

---

## 2. 背景与现状（SOPs）

| 组件 | 现状 | 缺口 |
|------|------|------|
| `fetchModelsFromApi` | 拉 `/models`，归一 `id` + 默认 `context:128000` + 可选 `features` | 无 reasoning 语义；默认 context 过乐观 |
| `LLMProviderConfig.models` | `string \| { id, name?, context?, features? }` | 无 effort / supportsReasoning |
| `createLLMRequestBody` | model/messages/temperature/max_tokens/stream/json | 无 reasoning 字段 |
| 系统设置 | 拉模型、测连通 | 无推理 UI |
| Deep Chat | 会话 temperature / systemPrompt | 无推理偏好；skill 已单次消费，与本设计正交 |

---

## 3. 架构

### 3.1 能力合成（只读解析）

```
Registry (L1, 版本化)
    +  optional Models API metadata (L3)
    +  safe defaults (L4)
    →  ResolvedModelCapability
```

**优先级（字段级）：**

| 字段 | 优先级（左赢） | 说明 |
|------|----------------|------|
| `supportsReasoning` | Registry > models 白名单 features > false | 禁止「未知变 true」 |
| `contextWindow` | models 有效数值 > Registry > 保守默认 32_768 | models 明显离谱（如 0）忽略 |
| `reasoningEfforts` | Registry only | UI 档位枚举 |
| `mapRequest` | Registry only | 请求字段映射 |
| `temperatureIgnored` | Registry > false | |

### 3.2 偏好合成（用户选择）

```
SessionOverride?  (Deep Chat thread)
    else GlobalDefaults  (system settings / storage)
    else Capability.defaultEffort / off
    → EffectiveReasoningPrefs
    → mapRequest → chat/completions body 片段
```

**解析伪代码：**

```ts
function resolveEffectiveReasoning(
  capability: ResolvedModelCapability,
  global: ReasoningUserPrefs,
  session?: Partial<ReasoningUserPrefs> | null
): EffectiveReasoningPrefs {
  if (!capability.supportsReasoning) {
    return { enabled: false, effort: 'off' };
  }
  const enabled =
    session?.enabled !== undefined ? session.enabled : (global.enabled ?? false);
  const rawEffort =
    session?.effort !== undefined ? session.effort : (global.effort ?? capability.defaultEffort ?? 'medium');
  const effort = clampEffort(rawEffort, capability.reasoningEfforts);
  if (!enabled) return { enabled: false, effort: 'off' };
  return { enabled: true, effort };
}
```

### 3.3 `/models` features 白名单（可选升级）

仅当 features（小写）命中下列之一时，可在 **Registry 未声明** 时将 `supportsReasoning` 设为 true，且 **仍无 mapRequest 则 UI 只读提示「需登记 mapper」、默认不发送字段**（避免盲开）：

- `reasoning` / `thinking` / `o1` / `o3` / `deepseek-r1`（可配置）

**更稳妥的默认：** 白名单也只用于 **标签展示**；真正发字段仍要求 Registry 有 `mapRequest`。  
**本期采用更稳妥默认：无 Registry mapRequest → 永不写 reasoning 请求字段。**

### 3.4 组件边界

| 单元 | 职责 | 不负责 |
|------|------|--------|
| `modelCapabilityRegistry` | 静态规则、匹配、默认 | 网络、UI |
| `resolveModelCapability` | 合并 models 条目 + Registry | 用户偏好 |
| `resolveEffectiveReasoning` | 全局/会话偏好合成 | HTTP |
| `applyReasoningToRequestBody` | 调 mapRequest、处理 temperature | stream 解析 |
| 系统设置 UI | 编辑全局默认、按当前模型显隐 | 会话状态 |
| Deep Chat | 会话覆盖、请求时传入 prefs | 改全局 storage（除非用户点「设为默认」——本期不做） |
| `llmService` | merge body、stream 分流 reasoning | 业务文案 |

---

## 4. 数据模型

### 4.1 Capability（Registry 条目）

```ts
/** 产品侧思考强度；'off' 仅表示关闭，不出现在 efforts 列表 */
export type ReasoningEffort = 'off' | 'low' | 'medium' | 'high';

export interface ModelCapabilityRule {
  /** 精确 id 或简易 glob：`*` 后缀/中缀，大小写敏感按 id 原样 */
  modelPattern: string;
  /** 空 = 任意 provider */
  provider?: string;
  contextWindow: number;
  supportsReasoning: boolean;
  /** 可选档位，不含 off */
  reasoningEfforts?: Array<'low' | 'medium' | 'high'>;
  defaultEffort?: 'low' | 'medium' | 'high';
  temperatureIgnored?: boolean;
  features?: string[];
  /**
   * 将产品 prefs 映射为 chat/completions 顶层字段。
   * enabled=false 或 effort=off 时必须返回 {} 或显式 off 字段（由规则作者决定，需网关兼容）。
   */
  mapRequest?: (prefs: { enabled: boolean; effort: ReasoningEffort }) => Record<string, unknown>;
}

export interface ResolvedModelCapability {
  modelId: string;
  provider: string;
  contextWindow: number;
  supportsReasoning: boolean;
  reasoningEfforts: Array<'low' | 'medium' | 'high'>;
  defaultEffort: 'low' | 'medium' | 'high';
  temperatureIgnored: boolean;
  features: string[];
  /** 无 mapRequest 时为 null：即使 supports 为 true 也不发字段（登记中） */
  mapRequest: ModelCapabilityRule['mapRequest'] | null;
  source: {
    registryMatched: boolean;
    modelsContext?: number;
    modelsFeatures?: string[];
  };
}
```

### 4.2 用户偏好

```ts
/** 系统设置全局默认（按 provider 或全局一份——本期全局一份，跟随当前启用 provider 的模型解析） */
export interface ReasoningUserPrefs {
  /** 是否开启推理；仅当 capability.supportsReasoning && mapRequest 时生效 */
  enabled: boolean;
  /** 开启时的强度 */
  effort: 'low' | 'medium' | 'high';
}

/** Deep Chat 线程可选覆盖；字段缺省 = 继承全局 */
export type SessionReasoningOverride = Partial<ReasoningUserPrefs>;
```

存储建议：

- 全局：`StorageService` / 现有 LLM 配置旁的 `reasoningPrefs: ReasoningUserPrefs`（与 provider 配置同生命周期）。  
- 会话：`DeepChatThread.reasoning?: SessionReasoningOverride`（与 temperature 类似）。

### 4.3 模型列表持久化

`LLMProviderConfig.models` 继续支持 string，但 **fetch 后写入对象**：

```ts
{ id: string; name?: string; context?: number; features?: string[] }
```

UI 下拉仍显示 id/name；resolve 时用 id + provider 查能力。

---

## 5. 请求与流式行为

### 5.1 请求体

```ts
function buildChatCompletionsBody(args: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  jsonMode?: boolean;
  serviceTier?: string;
  capability: ResolvedModelCapability;
  reasoning: EffectiveReasoningPrefs;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: args.model,
    messages: args.messages,
  };
  if (!args.capability.temperatureIgnored && args.temperature !== undefined) {
    body.temperature = args.temperature;
  }
  if (args.maxTokens !== undefined) body.max_tokens = args.maxTokens;
  if (args.stream) body.stream = true;
  if (args.jsonMode) body.response_format = { type: 'json_object' };
  if (args.serviceTier) body.service_tier = args.serviceTier;

  if (args.capability.mapRequest) {
    const extra = args.capability.mapRequest({
      enabled: args.reasoning.enabled,
      effort: args.reasoning.enabled ? args.reasoning.effort : 'off',
    });
    // 只允许 plain JSON 可序列化的一层字段；禁止覆盖 model/messages
    for (const [k, v] of Object.entries(extra)) {
      if (k === 'model' || k === 'messages') continue;
      body[k] = v;
    }
  }
  return body;
}
```

### 5.2 示例 mapper（须经 new-api 实测后入库；此处为契约形状）

```ts
// 示例 A：OpenAI 风格
mapRequest: ({ enabled, effort }) =>
  enabled && effort !== 'off' ? { reasoning_effort: effort } : {},

// 示例 B：部分网关布尔开关 + 档位
mapRequest: ({ enabled, effort }) =>
  enabled && effort !== 'off'
    ? { enable_thinking: true, thinking_level: effort }
    : { enable_thinking: false },
```

**入库前验收：** 对目标 model 各发一次 off / low / high，记录 200 与错误体，写入 `docs` 附录或 registry 注释。

### 5.3 Stream

- `delta.content` → 正文  
- `delta.reasoning_content`（及配置的别名列表）→ 可选 `onReasoningUpdate`，**不**拼进最终 `content`  
- 已有测试「忽略 reasoning_content」保留并扩展  

---

## 6. UI / UX

### 6.1 系统设置（P1 必做）

位置：LLM 配置区、模型下拉附近。

| 状态 | UI |
|------|-----|
| 当前模型无 reasoning 能力或无 mapRequest | 不展示开关（可一行灰字：「当前模型未登记推理能力」仅 dev/高级可选，默认隐藏） |
| 有能力 | Toggle「启用推理」+ Select「思考强度」low/medium/high |
| Toggle 关 | 隐藏或禁用 Select |
| 拉取模型后切换 model | 若新模型不支持，隐藏控件；全局 prefs 保留，解析时自动 ignore |

### 6.2 Deep Chat（P2）

- Tuning 面板：同款控件，标注「本会话」  
- 「重置」：清除会话 `reasoning` 覆盖，回到全局  
- 发送：用 `resolveEffectiveReasoning(capability, global, thread.reasoning)`  

### 6.3 文案原则

- 用「推理 / 思考强度」，避免厂商商标绑死 UI。  
- 不承诺「一定展示思维链」——依赖网关是否返回 reasoning 通道。

---

## 7. 分期交付

| 阶段 | 交付 | 验收 |
|------|------|------|
| **P1** | Registry + resolve + `llmService` body 合并 + 系统设置全局 prefs UI + 单测 | S1–S4, S6–S7（全局） |
| **P2** | Deep Chat 会话 `reasoning` 字段 + tuning UI + 请求透传 | S5 |
| **P3** | new-api 实测附录、扩展 patterns、可选 features 白名单展示 | 生产抽测表 |

用户倾向：**系统设置全局先，再会话覆盖** → 对齐 P1 → P2。

---

## 8. 测试策略

1. **Registry 匹配**：精确 id、前缀 glob、provider 限定、未命中 fail-closed。  
2. **Merge**：models context 覆盖；非法 context 丢弃。  
3. **优先级**：session.enabled=false 覆盖 global.enabled=true。  
4. **Mapper 快照**：给定 prefs → body 字段。  
5. **Stream**：混有 reasoning_content 的 SSE → 最终 text 纯净。  
6. **设置 UI**（组件/单测或轻 e2e）：切换模型显隐。  

---

## 9. 风险与运维

| 风险 | 缓解 |
|------|------|
| 网关升级改字段 | Registry 版本化 + 附录实测日期 |
| 用户 key 直连不同上游 | provider 维度规则；默认 fail-closed |
| 推理费暴涨 | 默认 enabled=false |
| 旧配置无 reasoningPrefs | 读时默认 `{ enabled: false, effort: 'medium' }` |

---

## 10. 决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 能力源 | Registry 为主，`/models` 为辅 | 行业真实；与 SOPs 中转一致 |
| 未知模型 | Fail-closed | 避免 400 / 空耗 |
| 无 mapRequest | 不发 reasoning 字段 | 防止盲写 |
| 偏好层级 | 全局默认 + 会话覆盖 | 用户指定；设置先落地 |
| 强度枚举 | low/medium/high + off | 覆盖主流；mapper 可多对一 |
| Prompt 控制思考 | 不作为主路径 | 不可靠 |

---

## 11. 开放问题（实现前可默认）

| 问题 | 默认 |
|------|------|
| 全局 prefs 是否 per-provider？ | 本期 **单一全局**；P3 可拆 |
| 是否在 UI 展示思维链？ | P1 不展示；P2 可选折叠 |
| Registry 放 TS 还是 JSON？ | **TS 模块**（可测、可跟版本） |

---

## 12. 附录：与旧讨论的差异（审查修订）

1. 明确 **mapRequest 缺失 = 禁止发字段**。  
2. **`/models` 不能单独开启 supportsReasoning 的发送行为**。  
3. **context 默认 32_768 保守值**（替换原稿对 128k 的乐观默认，仅针对「完全未知」；Registry/models 有值仍用有值）。  
4. **分期与存储键**写死，避免一次改爆 controller。  
5. **temperature 省略**而非传特殊值。

---

**下一步：** 用户审阅本 Spec → 确认后按 `docs/superpowers/plans/2026-07-23-model-reasoning-capability.md` 实施（P1 全局 → P2 会话）。
