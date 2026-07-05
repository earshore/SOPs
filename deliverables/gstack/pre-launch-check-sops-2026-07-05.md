# 上线前全面检查报告：SOPS 前端项目

**日期**：2026-07-05  
**场景**：上线前检查 / 代码审查 / 安全审计 / QA测试+发布  
**参与成员**：产品官（代码质量审查）+ 安全卫士（OWASP+STRIDE 安全审计）+ 质量门神（QA测试与发布）

---

## 📌 TL;DR（执行摘要）

- 整体结论：🔴 **No-Go，不建议当前状态上线**。
- 阻塞项数量：**2 个硬阻塞**：`.env` 中存在真实敏感凭据；`npm run build` 未取得最终 Exit Code 0 证据。
- 工程质量结论：代码架构已成型，可支撑灰度，但错误传播、生命周期清理、StorageService 防御性存在上线隐患。
- 安全结论：XSS 门禁和生产依赖审计通过，但本地真实凭据泄漏风险必须先处理。
- 下一步：先完成凭据轮换/清理与完整构建验证，再决定是否进入有条件灰度。

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🔴 No-Go |
| 严重度分布 | 🔴 2 / 🟠 6 / 🟡 12 / 🟢 4 |
| 关键行动项 | 8 条 |
| 建议负责人 | 工程负责人 + 安全负责人 + QA/发布负责人 |
| 主要阻塞 | `.env` 真实凭据；生产构建最终状态未确认 |
| 可转为条件 Go 的前提 | 凭据完成轮换且确认未进版本历史/构建产物；`npm run build` 完整通过 |

---

## 🚦 阻塞项清单

| # | 阻塞项 | 严重度 | 证据 / 位置 | 上线前要求 |
|---|--------|--------|-------------|------------|
| 1 | 工作区 `.env` 存在真实敏感凭据 | 🔴 高 | `.env:1` `AUTH_PASSWORD`；`.env:5` `GATEWAY_NEW_API_API_KEY` | 立即吊销并轮换；删除本地真实 `.env`；确认未进入 Git 历史、构建产物、日志和共享压缩包；部署改用 Secret |
| 2 | `npm run build` 未取得完整通过证据 | 🔴 高 | QA 记录：任务被 killed，最后停在 `npm run format:check`，未出现 Vite build 完成或 Exit Code 0 | 重跑 `npm run build`，取得 Exit Code 0，并保存构建日志 |

---

## ♻️ 回滚预案

1. **发布前**：在 Cloudflare Pages / 当前静态托管平台保留上一版成功部署产物与部署 ID。
2. **发布中**：先灰度/预发验证核心路由：Home、SOPs、App Center、AMZ Hub、关键设置面板、LLM 调用路径。
3. **触发回滚条件**：出现模块无法加载、路由白屏、构建产物资源 404、凭据异常调用、LLM 网关异常放大、关键路径 P0/P1 错误。
4. **回滚动作**：立即切回上一版静态部署；撤销新环境变量；禁用异常网关 Key；保留失败版本日志用于复盘。
5. **回滚后验证**：重新检查首页加载、主菜单路由、核心模块懒加载、API/LLM 请求失败降级、浏览器控制台错误。

---

## 1. 各成员核心结论

### 🔍 产品官（代码质量审查）

- 核心判断：项目主架构已经成型，`ServiceBootstrap + DI Container + Alpine + Navigo Router + BaseModule + ModuleLoader + EventBus + StorageService` 能支撑上线，不是不可维护的脚本堆；但正式生产发布前不建议无条件上线。
- 关键建议：优先修复 `BaseModule.mount()` 吞错、`ModuleLoader` 全局监听/重试定时器清理不足、`StorageService` public API 防御性不一致、`StorageService.clear()` 全量清空风险。若只做内部灰度，可带监控条件 Go；正式生产建议先修 H1/H2/H3 类问题。

### 🛡️ 安全卫士（OWASP+STRIDE 审计）

- 核心判断：`npm run xss:gate` 与 `npm audit --omit=dev` 均通过，未发现前端 SQL 拼接、生产代码直接危险 `innerHTML`、高危 CI 权限模式；但 `.env` 存在真实凭据构成上线硬阻塞。
- 关键建议：立即轮换 `.env` 中的认证密码和网关 API Key，删除真实 `.env`，使用部署平台 Secret；中期收紧 CSP、移除 `'unsafe-inline'`，并将前端直连 LLM 网关改为 BFF/Serverless 代理。

### ✅ 质量门神（QA测试与发布）

- 核心判断：`npm run type-check` 通过，`npm run lint` 通过；`npm run build` 启动后进入 prebuild/ci:security/ci:quality 阶段且未见 stderr，但任务最终被 killed，没有完整成功退出码。因此 QA 结论为 No-Go。
- 关键建议：上线前必须重跑 `npm run build` 并取得 Exit Code 0；本次未完成 E2E/兼容性实测，后续需补核心业务路径、空数据/异常输入、移动端布局和浏览器兼容烟测。

---

## 2. 综合审查发现（去重合并后按严重度排序）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 来源成员 |
|---|--------|------|------|---------|------|---------|
| 1 | 🔴 | 安全 | `.env:1`, `.env:5` | 工作区存在真实 `AUTH_PASSWORD` 和 `GATEWAY_NEW_API_API_KEY`，存在误提交、打包读取、日志/压缩包泄漏风险 | 立即吊销轮换；删除真实 `.env`；改用部署/CI Secret；补 `.env.example` 占位符 | 安全卫士 |
| 2 | 🔴 | QA/发布 | `npm run build` | 构建任务被 killed，未取得 Vite 生产构建完成和 Exit Code 0 证据 | 重跑完整构建并保存成功日志；构建通过前不得发布 | 质量门神 |
| 3 | 🟠 | 错误处理 | `src/common/BaseModule.ts:123-138` | `BaseModule.mount()` 捕获 `render/init` 错误后只渲染错误 UI，不重新抛出或进入统一错误事件，外层可能误判模块加载成功 | `handleError()` 后 emit `MODULE_ERROR`，关键模块错误交给 `ModuleLoader` 接管；接入 ErrorService/监控 | 产品官 |
| 4 | 🟠 | 生命周期 | `src/common/BaseModule.ts:343-379` | retry 按钮事件直接 `addEventListener`，未进入 `_disposables`；selector 拼接不够安全 | 使用 `this.addEventListener()` 托管；改用安全 data 属性或稳定 ID；重试失败进入统一错误流 | 产品官 |
| 5 | 🟠 | 生命周期 | `src/common/utils/ModuleLoader.ts:570-613` | 全局 `window` 路由事件使用匿名 listener，`destroy()` 不解绑，可能产生重复监听和幽灵实例 | 保存 handler 实例字段；`destroy()` 中 remove；长期迁移到 EventBus 并保存 unsubscribe | 产品官 |
| 6 | 🟠 | 生命周期 | `src/common/utils/ModuleLoader.ts:460-477` | retry `setTimeout` 未保存 ID，`destroy()` 无法取消，可能迟到加载 | 保存 retry timer；destroy/unmount 时 clear；建立统一 disposable 管理 | 产品官 |
| 7 | 🟠 | 存储可靠性 | `src/services/storageService.ts:420-437`, `442-450`, `599-605` | `remove/clear/has/keys/getUsage` 等 public API 直接访问 localStorage，防御性不一致 | 全部 public API 加 try/catch，失败返回安全默认值并统一记录 | 产品官 |
| 8 | 🟠 | 数据破坏风险 | `src/services/storageService.ts:426-430` | `StorageService.clear()` 会清空整个 origin 的 localStorage，若有用户触发路径会误删数据 | 改为只清应用 key；危险全清改名 `dangerouslyClearAllLocalStorage()`；上线前确认调用点 | 产品官 |
| 9 | 🟡 | 安全/CSP | `public/_headers:2` | CSP `script-src` 仍包含 `'unsafe-inline'` 且允许第三方 CDN，XSS 兜底能力下降 | 移除 inline，改 nonce/hash；第三方依赖固定版本并加 SRI 或本地打包 | 安全卫士 |
| 10 | 🟡 | 安全/API | `src/services/llmService.ts:499-505`, `src/common/config/apiEndpoints.ts:69-75` | 前端直连 LLM/代理网关并携带 Bearer；前端无法真正保护共享 Key | 生产改为 BFF/Serverless 代理，服务端鉴权、限流、审计；前端只持短期凭证 | 安全卫士 |
| 11 | 🟡 | 安全/存储 | `src/stores/middleware/persist.ts:71-79` | store persist 默认 JSON.stringify 到 localStorage，依赖调用方过滤敏感字段 | 建敏感字段拒写清单和单测，审查所有 store 的 partialize/validate | 安全卫士 |
| 12 | 🟡 | 可观测性 | `src/common/EventBus.ts:197-210`, `296-304` | listener 错误被收集到内存数组但无日志/告警，且无容量上限 | 接入 logger/errorTracker，设置 ring buffer 上限，避免静默失败 | 产品官 |
| 13 | 🟡 | 事件治理 | `src/common/EventBus.ts:130-135` | 超过 listener 上限时静默返回空取消函数，调用方误以为订阅成功 | 输出 warning/error 或返回订阅失败结果；纳入 leak detection | 产品官 |
| 14 | 🟡 | 监控初始化 | `src/common/bootstrap/ServiceBootstrap.ts:56-84`, `233-265` | 监控服务 fire-and-forget，失败静默且不进入初始化结果 | 暴露 monitoring status，catch 并记录 warning，初始化结果增加 warnings/optionalFailed | 产品官 |
| 15 | 🟡 | 定时器清理 | `src/common/bootstrap/ServiceBootstrap.ts:304-336` | 监控 interval 未保存，reset/destroy 无法清理，热重载/测试会泄漏 | 保存 interval IDs，提供 destroy/reset 清理 | 产品官 |
| 16 | 🟡 | HTTP 语义 | `src/services/httpService.ts:312-335` | AbortError 可能被 retry，用户取消/路由切换取消语义不清晰 | AbortError 默认不 retry；区分 timeout/user abort/retryable status | 产品官 |
| 17 | 🟡 | HTTP 请求体 | `src/services/httpService.ts:255-270` | `if (options.body)` 会丢弃 `0/false/''` 等合法 body | 改为 `body !== null && body !== undefined` | 产品官 |
| 18 | 🟡 | 路由质量门禁 | `src/common/router/initRouter.ts:38-49` | route conversion errors 只 console.error 后继续启动 | 生产/CI 中 fail fast；运行时 emit route error 并记录 | 产品官 |
| 19 | 🟡 | ActionRegistry | `src/common/utils/actionRegistry.ts:217-234`, `312-320` | 全局 click delegation 非幂等；payload 无运行时校验；清理事件存在硬编码字符串 | 增加幂等保护和 destroy；payload 类型守卫；统一使用 APP_EVENTS 常量 | 产品官 |
| 20 | 🟢 | 架构卫生 | `src/main.ts` | 入口文件职责偏多，启动编排、debug、legacy action、UI 初始化混杂 | 拆分 startup 模块，`main.ts` 只保留入口编排 | 产品官 |
| 21 | 🟢 | 注释质量 | 多处文件头和历史标记 | P0/P1/Phase 历史注释较多，长期会变成噪音 | 保留解释“为什么”的注释，历史阶段信息迁移到变更记录 | 产品官 |
| 22 | 🟢 | 低风险确认 | XSS/依赖/SQL/CSRF | 未发现前端 SQL 拼接；`xss:gate` 通过；`npm audit --omit=dev` 0 漏洞；SPA 无 Cookie 会话后端，CSRF 不典型 | 继续保持门禁；若未来网关使用 Cookie，补 SameSite/CSRF Token/Origin 校验 | 安全卫士 |

---

## 3. 威胁建模（STRIDE）+ OWASP Top 10 检查表

### 3.1 STRIDE 摘要

| 威胁 | 当前判断 | 证据 / 风险 | 建议 |
|------|----------|-------------|------|
| Spoofing 身份伪造 | 🟠 中高 | `.env` 中存在真实认证密码/API Key；前端直连网关 Bearer 模式难保护 | 凭据轮换；服务端代理鉴权；短期 token；审计调用来源 |
| Tampering 篡改 | 🟡 中 | 前端静态站点主要风险来自依赖/CDN/CSP 宽松 | 固定第三方资源版本，SRI 或本地打包，收紧 CSP |
| Repudiation 抵赖 | 🟡 中 | 前端直连 LLM 网关难做服务端审计 | BFF/Serverless 记录用户、请求 ID、限流与审计日志 |
| Information Disclosure 信息泄露 | 🔴 高 | `.env` 真实凭据、本地共享/误提交/日志泄漏风险 | 上线前必须删除、轮换并确认历史与产物 |
| Denial of Service 拒绝服务 | 🟡 中 | 前端直连共享网关 Key 可能被滥用导致额度耗尽 | 服务端限流、配额、异常熔断 |
| Elevation of Privilege 权限提升 | 🟡 中 | 仅凭前端无法证明 API 权限校验完整 | 后端/网关补鉴权、权限单测和未授权访问测试 |

### 3.2 OWASP Top 10 摘要

| 项 | 结论 | 说明 |
|----|------|------|
| A01 Broken Access Control | 🟡 待后端验证 | 前端无法证明网关/API 权限完整；需服务端鉴权与限流测试 |
| A02 Cryptographic Failures | 🔴 命中 | `.env` 存在真实凭据；前端持 Bearer 也有泄漏风险 |
| A03 Injection | 🟢 低 | 未发现 SQL 拼接；XSS 门禁通过；仍需收紧 CSP |
| A04 Insecure Design | 🟡 中 | 前端直连 LLM/代理网关设计天然难保护共享 Key |
| A05 Security Misconfiguration | 🟡 中 | CSP 允许 `'unsafe-inline'` 和第三方 CDN |
| A06 Vulnerable Components | 🟢 当前通过 | `npm audit --omit=dev` 0 漏洞 |
| A07 Identification/Auth Failures | 🟡 中 | AUTH_PASSWORD 暴露风险；需轮换并改 Secret 管理 |
| A08 Software/Data Integrity Failures | 🟡 中 | CDN 资源与构建产物完整性需加强 |
| A09 Logging/Monitoring Failures | 🟡 中 | 前端错误和网关调用审计仍需完善 |
| A10 SSRF | 🟢 不适用/低 | SPA 前端无服务端请求转发能力；若接入 BFF 后需重新评估 |

---

## 4. QA 测试结果摘要

| 测试/门禁 | 结果 | 证据 | 结论 |
|-----------|------|------|------|
| `npm run type-check` | ✅ 通过 | Exit Code 0，无 stderr | 通过 |
| `npm run lint` | ✅ 通过 | 后台任务完成，无 stderr | 通过 |
| `npm run build` | ❌ 未确认 | 任务被 killed，最后输出停在 `npm run format:check`，未出现最终成功退出码 | 阻塞 |
| 功能/E2E 测试 | ⚠️ 未执行完整实测 | 本轮受执行中断影响，仅形成建议 | 非阻塞但需补测 |
| 兼容性测试 | ⚠️ 未执行完整实测 | 建议补移动端与主流浏览器烟测 | 非阻塞但需补测 |

### 建议补充的核心路径

- Home 首页加载、主菜单、设置入口。
- SOPs 主流程与异常输入、空数据状态。
- App Center：Scraper、AI Analysis、Promptlab、PPC、Keyword Hunter、Deep Chat。
- AMZ Hub 路由加载与模块懒加载。
- LLM 请求失败、超时、限流、无 Key/无权限状态。
- 移动端布局、窄屏侧边栏、Chrome/Edge/Safari 兼容烟测。

---

## ✅ 行动清单

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|----------|
| 1 | 吊销并轮换 `.env` 中的 `AUTH_PASSWORD` 与 `GATEWAY_NEW_API_API_KEY`，删除本地真实 `.env`，改用部署/CI Secret | 安全负责人 | P0 | 上线前 |
| 2 | 检查 Git 历史、构建产物、日志、共享压缩包，确认上述凭据未泄漏；如已泄漏按事故流程处理 | 安全负责人 | P0 | 上线前 |
| 3 | 重新执行 `npm run build`，保存完整日志并确认 Exit Code 0 | QA/发布负责人 | P0 | 上线前 |
| 4 | 修复 `BaseModule.mount()` 错误吞掉问题，并将模块初始化失败接入统一错误事件/监控 | 前端负责人 | P0 | 正式生产前 |
| 5 | 修复 `ModuleLoader` 全局 listener 与 retry timer 清理问题 | 前端负责人 | P0 | 正式生产前 |
| 6 | 给 `StorageService` 所有 public API 增加防御性 try/catch，并确认/改造 `clear()` 全量清空风险 | 前端负责人 | P0 | 正式生产前 |
| 7 | 收紧 CSP，移除 `'unsafe-inline'`，第三方 CDN 改本地打包或加 SRI | 安全 + 前端 | P1 | 本轮或下轮迭代 |
| 8 | 将生产 LLM/代理网关从前端直连改为 BFF/Serverless 代理，加入服务端鉴权、限流、审计 | 架构/后端负责人 | P1 | 近期迭代 |
| 9 | 补充核心路径功能/E2E/兼容性烟测 | QA 负责人 | P1 | 发布候选前 |
| 10 | 改善 EventBus、ServiceBootstrap、HttpService 的错误可观测性与资源清理 | 前端负责人 | P2 | 后续治理 |

---

## ⚠️ 待完善 / 已知局限

- 本次 QA 因多次基础设施/执行中断，最终仅可靠确认 `type-check` 与 `lint` 通过；`build` 的最终状态未确认，这是报告中的硬阻塞。
- 未完成真实浏览器 E2E、移动端、跨浏览器兼容性实测；这些应在构建通过后补充。
- 安全审计以静态代码审阅、关键字检索、配置核验和现有门禁为主；API 未授权访问、后端鉴权、网关限流无法仅凭前端仓库完全证明。
- 代码审查未修改任何文件，所有修复建议仍需工程团队排期实施。
- `.env` 中真实凭据的具体值未在报告中展开；处理时请按敏感信息事故标准执行，避免二次传播。

---

## 📚 成员产出索引

- `gstack-product-reviewer`（产品官）原始产出：上线前代码质量审查报告，覆盖 `BaseModule`、`ModuleLoader`、`StorageService`、`EventBus`、`ServiceBootstrap`、`HttpService`、`ActionRegistry` 等核心文件。
- `gstack-security-officer`（安全卫士）原始产出：安全审计收尾结论，覆盖 `.env` 凭据、CSP、前端直连 LLM 网关、localStorage 持久化、XSS/依赖/CI 风险。
- `gstack-qa-lead`（质量门神）原始产出：QA 收尾结论，确认 `type-check` 与 `lint` 通过，标记 `build` 最终状态未确认为 No-Go 阻塞项。

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
