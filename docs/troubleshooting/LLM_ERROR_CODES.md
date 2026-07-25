# 工具 LLM 错误码速查

**适用范围**：AI Analysis、Parallel Analysis、PPC 搜索词、Keyword Hunter 等走 `resolveToolLlmConfig` / `llmToolBridge` 的工具路径。  
**更新**：与共享 LLM 配置收敛后的生产文案对齐（`ERR_LLM_*`）。

---

## 1. 配置类（调用前）

| 错误码                          | 用户可见文案（主）                   | 常见原因                                             | 建议操作                                                              |
| ------------------------------- | ------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------- |
| `ERR_LLM_PROVIDER_NOT_SELECTED` | 请先在系统设置中选择 LLM 提供商      | 未选 active provider / 本地配置清空                  | 打开 **全局设置 → AI 模型与连接**，选择厂商配置档                     |
| `ERR_LLM_API_KEY_MISSING`       | 所选提供商未配置 API Key             | Key 为空或未写入安全存储                             | 在 **凭证** 步骤填写 API Key 并保存                                   |
| `ERR_LLM_MODEL_NOT_SELECTED`    | 未选择模型，请在设置中同步或选择模型 | 无默认模型；工具策略模型无效；仅有 models 列表未选中 | **获取模型列表** 后选择默认模型；检查 **工具策略** 中该工具的默认模型 |

实现入口：`src/services/llmToolBridge.ts`。

工具侧还可附带 `module` / `action` 上下文（如 `AIAnalysisService`、`KeywordHunterService`），便于日志过滤。

---

## 2. 与历史码的关系

| 历史（勿新用）    | 现用                            | 说明         |
| ----------------- | ------------------------------- | ------------ |
| `AI_ANALYSIS_001` | `ERR_LLM_PROVIDER_NOT_SELECTED` | 提供商未选   |
| `AI_ANALYSIS_002` | `ERR_LLM_API_KEY_MISSING`       | API Key 缺失 |
| `AI_ANALYSIS_003` | `ERR_LLM_MODEL_NOT_SELECTED`    | 模型未选     |

**监控 / 告警**：若仍按 `AI_ANALYSIS_00x` 过滤配置失败，请改为 `ERR_LLM_*`。  
**用户文案**：中文提示保持可读；以运行时 `ValidationError.message` 为准。

仍保留的业务码（非配置桥）：

| 错误码                                                | 含义                 | 模块                        |
| ----------------------------------------------------- | -------------------- | --------------------------- |
| `AI_ANALYSIS_004`                                     | 单个分析目标执行失败 | AI Analysis `analyzeTarget` |
| `ERR_EMPTY_LISTING_TEXT` / `ERR_INVALID_LISTING_TEXT` | Listing 输入无效     | Keyword Hunter              |
| `ERR_EMPTY_TRANSLATION_TEXT` / `ERR_EMPTY_PARAGRAPHS` | 翻译输入无效         | Keyword Hunter              |
| `PARSE_LLM_003` 等                                    | 模型 JSON 解析失败   | `parseLlmJson`              |

通用网络/网关类仍见 `src/common/errors/errorCodes.ts`（如 `API_INVALID_KEY`、`API_RATE_LIMIT`、`NET_TIMEOUT`），多用于 HTTP/同步模型列表等路径。

---

## 3. 网关与同步模型列表（设置页）

设置页 **获取模型列表** / 连接测试不经过 `llmToolBridge` 的业务工具 target，但用户侧处理一致：

| 现象                      | 优先检查                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------- |
| Toast「请先输入 API Key」 | 凭证步骤未填 Key（不会发 `/models`）                                                  |
| 「API Key 无效或已过期」  | 401；换 Key / 检查中转站鉴权                                                          |
| Rate limit                | 429；降频或换档                                                                       |
| Endpoint 不对             | 默认中转 `https://new.hongecb.store/v1`；勿误填需代理的公有云直连（见设置内安全提示） |

---

## 4. 开发约定

1. **新工具 LLM 调用**必须先 `resolveToolLlmConfig(targetId)` 或 `resolveToolLlmPublicConfig`（缓存键），禁止复制 provider/key/model 校验。
2. **新错误码**：配置类优先复用 `ERR_LLM_*`；业务语义用模块前缀（如 `ERR_EMPTY_*`），并在本文档补一行。
3. **不要**再引入 `AI_ANALYSIS_001`～`003`。
4. 用户提示尽量带可执行下一步（打开设置 / 同步模型 / 检查网络）。
5. **展示层**：业务 catch 优先 `showLlmFailureToast(error)`（或先 `formatLlmFailureUx` 再自定义 UI）；不要只 `error.message` 无行动点。

相关实现：

- `src/services/llmToolBridge.ts`
- `src/common/errors/llmFailureUx.ts`（可行动 Toast / 设置深链）
- `src/common/errors/errorCodes.ts`（通用码）
- `docs/troubleshooting/DEGRADATION_MATRIX.md`（降级矩阵）
- `docs/SHARED_CAPABILITIES_GUIDE.md` § 工具 LLM 配置解析

---

## 5. 支持排查清单（简）

1. 看 Toast / 控制台是否含 `ERR_LLM_*` 或上表业务码。
2. 设置 → AI 模型与连接：厂商、Endpoint、Key、默认模型。
3. 工具策略：该工具是否绑定了不存在的模型 id。
4. 网络：中转站 `/models` 与 chat/completions 是否 401/429/超时。
5. 本地数据：误清数据后需重新配置 Key（BYOK，服务端无备份）。
