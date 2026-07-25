# 运行时降级与故障矩阵

**产品形态**：内部亚马逊运营工具，**BYOK 静态站点**（Cloudflare Pages + 浏览器直连中转站）。  
**非目标**：多租户 SaaS、服务端会话、统一账号体系。  
**更新**：与 `StorageService`、`llmToolBridge`、`SafeModuleLoader` / `ModuleLoader`、设置页深链对齐。

---

## 1. 如何读本表

| 列           | 含义                       |
| ------------ | -------------------------- |
| 故障场景     | 用户可感知现象             |
| 代码路径     | 实际处理入口（以仓库为准） |
| 用户体验     | Toast / 页内 UI / 静默     |
| 可继续做什么 | 降级后仍可用能力           |
| 建议操作     | 运维/用户下一步            |

---

## 2. LLM 与网关

| 故障场景          | 代码路径                                                                                        | 用户体验                                            | 可继续做什么                               | 建议操作                                 |
| ----------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------ | ---------------------------------------- |
| 未选提供商        | `llmToolBridge` → `ERR_LLM_PROVIDER_NOT_SELECTED`；`formatLlmFailureUx` / `showLlmFailureToast` | Toast 警告 + **打开设置**（`settings-section-llm`） | 本地非 LLM 功能、已缓存报告、静态 SOP/Hub  | 设置 → AI 模型与连接选厂商               |
| 无 API Key        | `ERR_LLM_API_KEY_MISSING`                                                                       | 同上                                                | 同上                                       | 凭证步骤填写 Key 并保存                  |
| 无模型            | `ERR_LLM_MODEL_NOT_SELECTED`                                                                    | 同上                                                | 同上                                       | 获取模型列表 / 检查工具策略              |
| 401 无效 Key      | `llmService.getLLMStatusError` → `API_INVALID_KEY`；全局 handler 可走 actionable toast          | 错误 Toast + 打开设置                               | 本地功能                                   | 换 Key / 查中转鉴权                      |
| 429 限流          | `API_RATE_LIMIT`；LLM 侧可能自动重试 429/5xx                                                    | 警告 Toast；部分调用自动退避重试                    | 降并发、等配额窗口                         | 降频 / 换模型档 / 查中转限流             |
| 超时              | `LLM_TIMEOUT` / `NET_TIMEOUT`                                                                   | 错误 Toast（可重试文案）                            | 缩短输入后重试；缓存命中路径仍可用         | 网络 / 模型过载 / 减输入                 |
| 中转站宕机 / 离线 | `NET_*`、fetch 失败                                                                             | 网络错误 Toast                                      | **整站静态 UI 仍可用**；历史数据与本地作业 | 网络恢复后重试；业务不依赖本仓库托管 LLM |
| 配额用尽          | `API_QUOTA_EXCEEDED`                                                                            | 错误 + 打开设置                                     | 本地功能                                   | 中转后台额度 / 换 Key                    |

错误码与支持排查见 [工具 LLM 错误码速查](./LLM_ERROR_CODES.md)。

---

## 3. 本地存储

| 故障场景            | 代码路径                                                                       | 用户体验                                                                | 可继续做什么                     | 建议操作                                |
| ------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------- | --------------------------------------- |
| localStorage 配额满 | `StorageService.handleStorageWriteError` → `SYS_STORAGE_FULL` + LRU 清理后重试 | `handleSystemError(..., notify: true)` → actionable toast（数据区深链） | 只读浏览；清理后可再写           | 设置 → 数据：导出备份 / 清缓存 / 删历史 |
| 写入其它错误        | `SYS_STORAGE_ERROR` / report                                                   | 错误通知                                                                | 视失败键：可能丢最近一次设置写入 | 重试；导出备份                          |
| 误清本地数据        | 用户操作 / 浏览器清站数据                                                      | 需重新配置 BYOK Key                                                     | 静态资源与代码仍在 CDN           | 重新配置 LLM；从备份导入                |

**说明**：密钥在浏览器侧（BYOK），服务端无备份；清站 = 失 Key。

---

## 4. 模块 / 资源加载

| 故障场景                | 代码路径                                                                    | 用户体验                 | 可继续做什么                       | 建议操作                        |
| ----------------------- | --------------------------------------------------------------------------- | ------------------------ | ---------------------------------- | ------------------------------- |
| 模板/模块加载失败       | `SafeModuleLoader`：重试、分类错误、`renderErrorUI`（重试 / 回首页 / 刷新） | 页内降级 UI，非整站白屏  | 其它已加载路由；刷新后重试失败路由 | 刷新；查网络与 Pages 部署完整性 |
| 动态 chunk 失败（弱网） | 路由 / 构建分包失败路径（依赖浏览器 `import()`）                            | 加载失败 UI 或控制台错误 | 已打开页面可继续                   | 硬刷新；确认 CDN 全量发布       |

生产子模块加载以 **ModuleLoader** 为准；`SafeModuleLoader.loadModule` 文档标明部分路径为 legacy。

---

## 5. 缓存与 LLM 工具路径

| 故障场景       | 代码路径                                | 用户体验                   | 可继续做什么         | 建议操作     |
| -------------- | --------------------------------------- | -------------------------- | -------------------- | ------------ |
| 分析缓存读失败 | Parallel / AI 缓存 try-catch 吞掉后回落 | 重新请求模型               | 功能可用，可能变慢   | 可清分析缓存 |
| in-flight 复用 | `llmRequestCache` / KH `in-flight` 状态 | 状态文案「复用进行中请求」 | 避免重复扣费         | 无需操作     |
| 缓存写失败     | 本地 store catch 静默                   | 下次可能重复算             | 主流程结果仍返回内存 | 检查存储配额 |

---

## 6. 非目标 / 明确不降级项

- **不**在 Pages secrets 注入生产 LLM Key。
- **不**在 LLM 全挂时伪造分析结果。
- **不**静默切换未授权提供商或模型。
- 安全渲染失败应失败可见，禁止「不安全 HTML 兜底」。

---

## 7. 开发约定

1. 新工具 LLM 调用只经 `resolveToolLlmConfig`；失败展示优先 `showLlmFailureToast` / `formatLlmFailureUx`。
2. 配置类错误必须可点进设置（`SETTINGS_OPEN` + `sectionId`）。
3. 存储满必须可到达数据区或清理路径，禁止仅 `console.error`。
4. 改行为时同步更新本矩阵与 `LLM_ERROR_CODES.md`。

相关：

- `src/common/errors/llmFailureUx.ts`
- `src/services/llmToolBridge.ts`
- `src/services/storageService.ts`
- `docs/troubleshooting/LLM_ERROR_CODES.md`
- `docs/SHARED_CAPABILITIES_GUIDE.md`
