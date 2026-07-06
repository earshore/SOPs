# 上线前全面检查报告：SOPS 前端项目

**日期**：2026-07-05  
**场景**：上线前检查 / 代码审查 / 安全审计 / QA测试+发布  
**参与成员**：产品官（代码质量审查）+ 安全卫士（OWASP+STRIDE 安全审计）+ 质量门神（QA测试与发布）

---

## 📌 TL;DR（执行摘要）

- 整体结论：🔴 **No-Go，不建议当前状态上线**。
- 阻塞项数量：**1 个凭据事故闭环阻塞**：`.env` 当前已不在工作区，当前仓库与 `dist/` 未发现高置信度真实密钥；但 Git 历史已确认出现过真实认证/网关凭据片段，仍需完成吊销轮换、泄漏范围确认与事故闭环；`npm run build` 已在 2026-07-06 复跑通过。
- 工程质量结论：代码架构已成型，`BaseModule`、`ModuleLoader`、`StorageService` 的 P1 已补强；剩余主要是凭据事故闭环与可观测性/资源治理的持续改进。
- 安全结论：XSS 门禁和生产依赖审计通过，但已暴露凭据的轮换和泄漏范围处置必须先处理。
- 下一步：先完成凭据轮换与泄漏范围确认，再决定是否进入有条件灰度。

---

## 🎯 核心结论卡片

| 项目                 | 内容                                                       |
| -------------------- | ---------------------------------------------------------- |
| Go / No-Go           | 🔴 No-Go                                                   |
| 严重度分布           | 🔴 1 / 🟠 0 / 🟡 0 / 🟢 21                                 |
| 关键行动项           | 10 条                                                      |
| 建议负责人           | 工程负责人 + 安全负责人 + QA/发布负责人                    |
| 主要阻塞             | 已暴露凭据的轮换、Git 历史泄漏处置与日志/共享压缩包排查仍需闭环 |
| 可转为条件 Go 的前提 | 凭据完成轮换，Git 历史泄漏按事故流程处置，且确认未进入构建产物、日志和共享压缩包 |

---

## 🚦 阻塞项清单

| #   | 阻塞项                             | 严重度    | 证据 / 位置                                                                           | 上线前要求                                                                                                            |
| --- | ---------------------------------- | --------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | 已暴露凭据需完成轮换与泄漏范围确认 | 🔴 高     | 原始审计曾发现本地 `.env` 含真实认证/网关凭据；2026-07-06 复查本地 `.env` 已不存在，当前仓库与 `dist/` 未发现高置信度真实密钥，但 Git 历史中 `docs/DEPLOYMENT.md` 曾出现真实认证/网关凭据片段 | 立即吊销并轮换相关凭据；按泄漏事故处理 Git 历史命中；继续确认未进入构建产物、日志和共享压缩包；生产 LLM Key 不写入仓库或静态托管平台 Secret |
| 2   | `npm run build` 完整通过           | ✅ 已解除 | 2026-07-06 复跑 `npm run build`，prebuild 安全/质量门禁与 Vite 生产构建均 Exit Code 0 | 保存构建日志；后续发布前保持同一门禁                                                                                  |

---

## ♻️ 回滚预案

1. **发布前**：在 Cloudflare Pages / 当前静态托管平台保留上一版成功部署产物与部署 ID。
2. **发布中**：先灰度/预发验证核心路由：Home、SOPs、App Center、AMZ Hub、关键设置面板、LLM 调用路径。Cloudflare Pages / 当前静态托管平台只作为静态资源托管，LLM 验证路径为浏览器直连 `https://new.hongecb.store/v1`。
3. **触发回滚条件**：出现模块无法加载、路由白屏、构建产物资源 404、凭据异常调用、LLM 网关异常放大、关键路径 P0/P1 错误。
4. **回滚动作**：立即切回上一版静态部署；撤销新环境变量；禁用异常网关 Key；保留失败版本日志用于复盘。
5. **回滚后验证**：重新检查首页加载、主菜单路由、核心模块懒加载、API/LLM 请求失败降级、浏览器控制台错误。

---

## 1. 各成员核心结论

### 🔍 产品官（代码质量审查）

- 核心判断：项目主架构已经成型，`ServiceBootstrap + DI Container + Alpine + Navigo Router + BaseModule + ModuleLoader + EventBus + StorageService` 能支撑上线，不是不可维护的脚本堆；但正式生产发布前仍需完成凭据轮换与泄漏范围确认。
- 关键建议：`BaseModule.mount()` 错误传播、`ModuleLoader` 全局监听/重试定时器/外部卸载清理、`StorageService` public API 防御与 `clear()` 全量清空风险已补强；EventBus、ServiceBootstrap、HttpService、ActionRegistry 和路由初始化治理也已补强，后续重点是保持回归门禁并完成凭据事故闭环。

### 🛡️ 安全卫士（OWASP+STRIDE 审计）

- 核心判断：`npm run xss:gate` 与 `npm audit --omit=dev` 均通过，未发现前端 SQL 拼接、生产代码直接危险 `innerHTML`、高危 CI 权限模式；本地 `.env` 当前已清理，当前仓库与 `dist/` 未发现高置信度真实密钥，但 Git 历史曾出现真实认证/网关凭据片段，已暴露凭据的轮换与泄漏范围确认仍是上线硬阻塞。
- 关键建议：立即轮换已暴露的认证密码和网关 API Key，保持真实 `.env` 不进入工作区；非 LLM 部署密钥使用部署平台 Secret，生产 LLM Key 不写入仓库或静态托管平台 Secret。中期继续收紧 CSP。生产 LLM 路径按当前产品约束保持浏览器直连自部署 new-api 中转站，不恢复旧服务端代理方案；模型白名单、额度、过期时间、限流和日志在 new-api 后台治理。

### ✅ 质量门神（QA测试与发布）

- 核心判断：`npm run type-check`、`npm run lint`、2026-07-06 复跑的 `npm run build`、Chromium `npm run test:e2e:smoke` 与 Firefox/WebKit `npm run test:e2e:smoke:compat` 均通过；构建与 smoke 阻塞已解除。
- 关键建议：保存本次构建、Chromium release smoke 和兼容性 smoke 成功日志；Scraper、AI Analysis、Keyword Hunter、PPC、Promptlab、Deep Chat、Restricted Words、NPI Tracker 和 SOPs→AMZ Hub 移动链路已纳入 release smoke，后续继续补更多真实业务数据和深层 SOP 交互。

---

## 2. 综合审查发现（去重合并后按严重度排序）

| #   | 严重度 | 类别           | 位置                                                                                                                                                                                                                                               | 问题描述                                                                                                                                                                                                                  | 建议                                                                                                                                             | 来源成员 |
| --- | ------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | 🔴     | 安全           | 原始审计记录、本地 `.env` 复查、当前仓库/`dist/` 高置信度密钥扫描、Git 历史扫描                                                                                                                                                                                                                     | 本地 `.env` 已清理，当前仓库与 `dist/` 未发现高置信度真实密钥；但 Git 历史中 `docs/DEPLOYMENT.md` 曾出现真实认证/网关凭据片段，仍需确认吊销轮换和泄漏范围                                                                                                                                                     | 立即吊销轮换；按泄漏事故处理 Git 历史命中；确认未进构建产物、日志和共享压缩包；生产 LLM Key 不写入仓库或静态托管平台 Secret                                        | 安全卫士 |
| 2   | 🟢     | QA/发布        | `npm run build`, `npm run test:e2e:smoke`, `npm run test:e2e:smoke:compat`, `tests/e2e/release-smoke.spec.ts`                                                                                                                                       | 2026-07-06 复跑完整构建、Chromium release smoke 与 Firefox/WebKit 兼容性 smoke 已通过；本轮补充 settings LLM 401/429 网关失败反馈、Scraper 空状态/非法 ASIN、AI Analysis 空数据阻断、Keyword Hunter 空输入与样例流程、PPC 空输入与本地样例分析、Promptlab 无报告本地生成、Deep Chat 生成 Prompt 草稿复用、Restricted Words 非法正则/详情弹窗、NPI Tracker 移动表格 Next Step 编辑、SOPs Listing SEO→AMZ Hub SEO 移动端跨模块链路，并把核心工作流纳入移动端溢出门禁         | 将构建与 smoke 成功日志纳入发布记录；发布前继续保持同一门禁                                                                                      | 质量门神 |
| 3   | 🟢     | 错误处理       | `src/common/BaseModule.ts:148-165`, `tests/unit/BaseModule.test.ts`                                                                                                                                                                                 | `BaseModule.mount()` 对 `render/init` 失败会渲染错误 UI、emit `MODULE_ERROR` 并重新抛错，外层 `ModuleLoader` 不会误判加载成功                                                                                               | 保持 `render/init` 失败回归测试；后续可继续接入集中监控                                                                                           | 产品官   |
| 4   | 🟢     | 生命周期       | `src/common/BaseModule.ts:371-409`, `tests/unit/BaseModule.test.ts`                                                                                                                                                                                 | retry 按钮事件已通过 `this.addEventListener()` 托管，错误状态卸载后 retry listener 会被移除                                                                                                                               | 保持自动清理单测；新增错误 UI 时继续走 `_disposables`                                                                                            | 产品官   |
| 5   | 🟢     | 生命周期       | `src/common/utils/ModuleLoader.ts:90-114`, `625-660`, `tests/unit/ModuleLoader.test.ts`                                                                                                                                                            | 全局路由和模块卸载 listener 已保存为实例字段，`destroy()` 会解绑，避免重复监听和幽灵实例                                                                                                                                  | 保持 `destroy()` listener 清理回归测试；长期仍可迁移到 EventBus unsubscribe 模式                                                                  | 产品官   |
| 6   | 🟢     | 生命周期       | `src/common/utils/ModuleLoader.ts:484-506`, `643-660`, `tests/unit/ModuleLoader.test.ts`                                                                                                                                                           | retry timer 已保存并在 `destroy()`/`MODULE_UNLOAD` 清理；`MODULE_UNLOAD` 现在会让 in-flight load 失效，避免旧模块迟到挂载或迟到重试                                                                                         | 保持 pending import 与 retry timer 的 `MODULE_UNLOAD` 回归测试                                                                                   | 产品官   |
| 7   | 🟢     | 存储可靠性     | `src/services/storageService.ts:436-505`, `654-673`, `827-1046`, `tests/unit/StorageService.test.ts`                                                                                                                                                | `remove/clear/has/keys/getUsage` 等基础 public API 已加防御性 `try/catch`；代理密钥、带凭据代理配置、异步采集历史和安全存储快捷方法也已补顶层防御，失败返回安全默认值或 localStorage 回退                                      | 保持 localStorage、安全存储、IndexedDB 失败回归测试；新增业务快捷方法时继续补顶层安全默认值                                                       | 产品官   |
| 8   | 🟢     | 数据破坏风险   | `src/services/storageService.ts:448-468`, `src/services/localDataStore.ts:673`, `tests/unit/StorageService.test.ts`                                                                                                                                 | `StorageService.clear()` 已改为仅清应用管理 key 或指定 namespace；全量清空 origin 的能力改为显式 `dangerouslyClearAllLocalStorage()`                                                                                        | 保持外部 key 不被 `clear()` 删除的单测；危险全清调用必须显式审查                                                                                 | 产品官   |
| 9   | 🟢     | 安全/CSP       | `public/_headers:2`, `vercel.json:31`, `src/common/config/apiEndpoints.test.ts`, `src/common/utils/runtimeStyles.ts`, `src/common/components/SidebarRenderer.ts`, `src/common/components/SkeletonLoader.ts`, `src/components/form-animation.ts`, `src/components/modal-animation.ts`, `src/modules/app_center/views/keyword_hunter/*`, `src/modules/app_center/views/master_analysis/**`, `src/modules/amz_hub/views/**` | CSP 已移除脚本 inline、第三方样式 CDN 与 `style-src-attr 'unsafe-inline'`；当前全仓静态 `style=` 为 0、Alpine `x-show` 为 0、动态 `:style`/`x-bind:style` 为 0；剩余 runtime DOM `element.style.*` 写入已迁为 class、属性或 CSSOM 规则，grep 仅剩 `block.style` 业务字段误报 | 发布前继续运行 CSP 单测、type-check、release smoke；第三方依赖继续固定版本并本地打包 | 安全卫士 |
| 10  | 🟢     | 安全/API       | `src/services/llmService.ts:499-505`, `src/common/config/apiEndpoints.ts:69-75`, `src/common/config/apiEndpoints.test.ts`, `tests/unit/llmService.test.ts`, `tests/unit/systemSettingsCurrent.test.ts`                                             | 生产 LLM 按产品约束由浏览器直连自部署 new-api 中转站；单测已锁定默认端点、浏览器 Authorization、CSP `connect-src`、禁止旧 `/api/llm/v1`/`_routes.json`/server-managed placeholder 回潮 | 继续由 new-api 后台治理模型白名单、额度、过期时间、限流和日志；仓库与托管平台不保存生产 LLM Key，用户 Key 仅保存在浏览器本地                     | 安全卫士 |
| 11  | 🟢     | 安全/存储      | `src/stores/middleware/persist.ts`, `tests/unit/persist.test.ts`, `tests/unit/useAppStore-persistence.test.ts`                                                                                                                                      | store persist 已内置敏感字段 denylist，保存和恢复旧状态都会递归丢弃 `apiKey`、token、password、credential、`userProductProfile` 等敏感字段；关键 app store 持久化也有回归测试                                                | 新增持久化字段时继续通过 denylist/partialize 单测证明不落盘敏感数据                                                                              | 安全卫士 |
| 12  | 🟢     | 可观测性       | `src/common/EventBus.ts:148-239`, `tests/unit/EventBus.test.ts`                                                                                                                                                                                     | listener 错误会输出 `console.error` 并进入有容量上限的 ring buffer，失败监听器不会阻断后续监听器执行                                                                                                                        | 保持错误记录上限和继续执行回归测试                                                                                                                | 产品官   |
| 13  | 🟢     | 事件治理       | `src/common/EventBus.ts:148-164`, `tests/unit/EventBus.test.ts`                                                                                                                                                                                     | 超过 listener 上限会输出 warning，并返回带 `subscribed=false`、`reason='listener-limit'` 的 unsubscribe 状态，调用方可识别订阅失败                                                                                           | 保持 listener-limit 状态和 leak detection 回归测试                                                                                                | 产品官   |
| 14  | 🟢     | 监控初始化     | `src/common/bootstrap/ServiceBootstrap.ts:56-84`, `233-283`, `tests/unit/ServiceBootstrap.test.ts`                                                                                                                                                  | 监控初始化失败会记录 `monitoringStatus` warning，不会拖垮必需服务；初始化结果暴露 warnings/optionalFailed                                                                                                                   | 保持 monitoring 失败非阻塞和 warning 回归测试                                                                                                     | 产品官   |
| 15  | 🟢     | 定时器清理     | `src/common/bootstrap/ServiceBootstrap.ts:304-360`, `tests/unit/ServiceBootstrap.test.ts`                                                                                                                                                           | 监控 interval 已通过实例字段保存，`destroy()` 会清理 interval、重置 monitoring 状态，避免热重载/测试泄漏                                                                                                                    | 保持 destroy 清理 interval 回归测试                                                                                                               | 产品官   |
| 16  | 🟢     | HTTP 语义      | `src/services/httpService.ts:312-335`, `tests/unit/httpService.test.ts`                                                                                                                                                                             | `AbortError` 默认不 retry；请求开始前已取消不会调用 `fetch`，重试等待期间取消也不会继续下一次请求                                                                                                                           | 保持用户取消、预取消、重试等待取消回归测试                                                                                                        | 产品官   |
| 17  | 🟢     | HTTP 请求体    | `src/services/httpService.ts:255-270`, `tests/unit/httpService.test.ts`                                                                                                                                                                             | 请求体判断已改为 `body !== null && body !== undefined`，`0`、`false`、空字符串等合法 falsy body 会被保留                                                                                                                    | 保持合法 falsy body 回归测试                                                                                                                      | 产品官   |
| 18  | 🟢     | 路由质量门禁   | `src/common/router/initRouter.ts:38-75`, `src/common/router/initRouter.test.ts`, `tests/unit/routerNavigoCore.test.ts`                                                                                                                              | route conversion errors 会 emit `ROUTE_ERROR`；CI/生产环境会 fail fast，且转换失败不会安装半成品 router 状态                                                                                                                | 保持 CI fail-fast、ROUTE_ERROR 和 converter error 回归测试                                                                                        | 产品官   |
| 19  | 🟢     | ActionRegistry | `src/common/utils/actionRegistry.ts:217-348`, `tests/unit/actionRegistryCurrent.test.ts`                                                                                                                                                            | 全局 click delegation 已幂等绑定并可 destroy；REGISTER/UNREGISTER payload 已有运行时守卫，畸形 payload 会被忽略并 warning                                                                                                     | 保持幂等绑定、destroy 和 payload 守卫回归测试                                                                                                     | 产品官   |
| 20  | 🟢     | 架构卫生       | `src/main.ts`                                                                                                                                                                                                                                      | 入口文件职责偏多，启动编排、debug、legacy action、UI 初始化混杂                                                                                                                                                           | 拆分 startup 模块，`main.ts` 只保留入口编排                                                                                                      | 产品官   |
| 21  | 🟢     | 注释质量       | 多处文件头和历史标记                                                                                                                                                                                                                               | P0/P1/Phase 历史注释较多，长期会变成噪音                                                                                                                                                                                  | 保留解释“为什么”的注释，历史阶段信息迁移到变更记录                                                                                               | 产品官   |
| 22  | 🟢     | 低风险确认     | XSS/依赖/SQL/CSRF                                                                                                                                                                                                                                  | 未发现前端 SQL 拼接；`xss:gate` 通过；`npm audit --omit=dev` 0 漏洞；SPA 无 Cookie 会话后端，CSRF 不典型                                                                                                                  | 继续保持门禁；若未来网关使用 Cookie，补 SameSite/CSRF Token/Origin 校验                                                                          | 安全卫士 |

---

## 3. 威胁建模（STRIDE）+ OWASP Top 10 检查表

### 3.1 STRIDE 摘要

| 威胁                            | 当前判断 | 证据 / 风险                                                                                       | 建议                                                                                      |
| ------------------------------- | -------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Spoofing 身份伪造               | 🟠 中高  | 历史 `.env`/部署文档记录曾出现真实认证密码/API Key；生产 LLM 采用浏览器直连 new-api，需避免平台共享 Key 下发到前端 | 凭据轮换；仓库/托管平台不保存生产 LLM Key；new-api 后台鉴权、额度、过期时间和调用来源审计 |
| Tampering 篡改                  | 🟡 中    | 前端静态站点主要风险来自依赖完整性；CSP 已移除 inline script/style 属性豁免                        | 固定第三方资源版本并本地打包，发布前保持 CSP 回归测试                                     |
| Repudiation 抵赖                | 🟡 中    | 前端直连 LLM 网关的审计边界在 new-api 后台                                                        | new-api 记录 Key、请求 ID、限流、模型和调用日志；前端保留请求失败降级与用户侧提示         |
| Information Disclosure 信息泄露 | 🔴 高    | 当前 `.env` 已不存在，但 Git 历史曾出现真实凭据片段，仍有共享/误提交/日志泄漏风险                                                     | 上线前必须完成吊销轮换、Git 历史泄漏处置，并确认构建产物、日志和共享压缩包                                                      |
| Denial of Service 拒绝服务      | 🟡 中    | 若误下发共享 Key，可能被滥用导致额度耗尽；当前产品应使用用户浏览器本地 Key 直连 new-api           | new-api 后台限流、配额、过期时间、异常熔断；前端禁止内置共享生产 Key                      |
| Elevation of Privilege 权限提升 | 🟡 中    | 仅凭前端无法证明 API 权限校验完整                                                                 | new-api 后台/网关补鉴权、权限单测和未授权访问测试                                         |

### 3.2 OWASP Top 10 摘要

| 项                                   | 结论          | 说明                                                                                                                               |
| ------------------------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| A01 Broken Access Control            | 🟡 待后端验证 | 前端无法证明网关/API 权限完整；需服务端鉴权与限流测试                                                                              |
| A02 Cryptographic Failures           | 🔴 命中       | 历史记录曾出现真实凭据；前端持 Bearer 也有泄漏风险                                                                                    |
| A03 Injection                        | 🟢 低         | 未发现 SQL 拼接；XSS 门禁通过；仍需收紧 CSP                                                                                        |
| A04 Insecure Design                  | 🟡 中         | 当前生产形态为浏览器直连 new-api；风险控制依赖用户本地 Key 与 new-api 后台策略，不能下发共享 Key                                   |
| A05 Security Misconfiguration        | 🟢 当前通过   | 静态 `style=`、`x-show`、动态 style 绑定与 runtime DOM style 写入已清零；CSP 已移除 `style-src-attr 'unsafe-inline'`              |
| A06 Vulnerable Components            | 🟢 当前通过   | `npm audit --omit=dev` 0 漏洞                                                                                                      |
| A07 Identification/Auth Failures     | 🟡 中         | AUTH_PASSWORD 暴露风险；需轮换并改 Secret 管理                                                                                     |
| A08 Software/Data Integrity Failures | 🟡 中         | 第三方依赖与构建产物完整性需持续加强                                                                                               |
| A09 Logging/Monitoring Failures      | 🟡 中         | 前端错误和 new-api 调用审计仍需完善                                                                                                |
| A10 SSRF                             | 🟢 不适用/低  | SPA 前端无服务端请求转发能力；若未来新增任意服务端请求转发层需重新评估                                                             |

---

## 4. QA 测试结果摘要

| 测试/门禁            | 结果                         | 证据                                                                                                                       | 结论 |
| -------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---- |
| `npm run type-check` | ✅ 通过                      | Exit Code 0，无 stderr                                                                                                     | 通过 |
| `npm run lint`       | ✅ 通过                      | 后台任务完成，无 stderr                                                                                                    | 通过 |
| `npm run build`      | ✅ 通过                      | 2026-07-06 复跑完整通过，包含 prebuild 安全/质量门禁与 Vite build                                                          | 通过 |
| 功能/E2E 测试        | ✅ Chromium smoke 通过       | 2026-07-06 `npm run test:e2e:smoke` 24/24 通过，覆盖核心路由、移动端溢出、营销日历本地 flag icons、Scraper 空状态/非法 ASIN、AI Analysis 空数据、Keyword Hunter 空输入与样例流程、PPC 空输入与本地样例分析、Promptlab 无报告本地生成且不触发 LLM、Deep Chat 生成 Prompt 草稿预览/填入且不发送 LLM、Restricted Words 非法正则与详情弹窗、NPI Tracker 移动表格 Next Step 编辑、SOPs→AMZ Hub SEO 移动链路、设置页 LLM 直连 new-api 与 401/429 失败反馈 | 通过 |
| 兼容性测试           | ✅ Firefox/WebKit smoke 通过 | 2026-07-06 `npm run test:e2e:smoke:compat` 48/48 通过                                                                      | 通过 |
| PPC LLM 单测/回归    | ✅ 通过                      | 覆盖批次缓存、按模型隔离、首响指标、最多 2 并发且保持结果顺序；UI 覆盖“首响”状态展示                                       | 通过 |

### 建议补充的核心路径

- Home 首页加载、主菜单、设置入口。
- SOPs：Listing SEO→AMZ Hub SEO 移动端跨模块链路、Restricted Words 非法正则与详情弹窗、NPI Tracker 移动表格 Next Step 编辑已覆盖；继续补更多深层 SOP 交互和真实业务数据。
- App Center：Scraper、AI Analysis、Keyword Hunter、PPC、Promptlab、Deep Chat 的关键空数据/异常输入、样例流程或非发送草稿流已覆盖；继续补真实业务数据和更复杂异常输入。
- AMZ Hub：SEO 策略跨模块懒加载已覆盖；继续补更多知识页深层交互。
- LLM 请求失败、超时、限流、无 Key/无权限状态。
- 移动端布局、窄屏侧边栏、Chrome/Edge/Safari 兼容烟测。

---

## ✅ 行动清单

| #   | 行动                                                                                                                                                                    | 负责方          | 紧急度 | 期望完成       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------ | -------------- |
| 1   | 吊销并轮换已暴露的认证/网关凭据，保持真实 `.env` 不进入工作区；生产 LLM Key 不写入仓库或静态托管平台 Secret                                                             | 安全负责人      | P0     | 上线前         |
| 2   | Git 历史已确认命中过真实认证/网关凭据片段，需按泄漏事故流程处置；继续确认构建产物、日志、共享压缩包未泄漏                                                                                   | 安全负责人      | P0     | 上线前         |
| 3   | 保存 2026-07-06 `npm run build` 成功日志，并在发布前保持完整构建门禁                                                                                                    | QA/发布负责人   | P0     | 上线前         |
| 4   | 已修复 `BaseModule.mount()` 错误吞掉问题，`render/init` 失败会 emit `MODULE_ERROR` 并重新抛错，单测已覆盖                                                               | 前端负责人      | P0     | 已完成/持续回归 |
| 5   | 已修复 `ModuleLoader` 全局 listener、retry timer 与外部卸载时 in-flight load 清理问题，单测已覆盖                                                                       | 前端负责人      | P0     | 已完成/持续回归 |
| 6   | 已给 `StorageService` 基础 public API 和业务快捷 API 增加防御性 try/catch，并将 `clear()` 改为仅清应用管理 key；安全存储/IndexedDB 失败已有默认值或 localStorage 回退      | 前端负责人      | P1     | 已完成/持续回归 |
| 7   | 已完成 CSP 收紧：静态 `style=`、`x-show`、动态 style 绑定与 runtime DOM style 写入清零，并移除 `style-src-attr 'unsafe-inline'`；发布前保持回归测试 | 安全 + 前端     | P1     | 已完成/持续回归 |
| 8   | 已用测试锁定生产 LLM 浏览器直连 `https://new.hongecb.store/v1`，禁止旧代理路由回潮；new-api 后台继续负责模型白名单、额度、过期时间、限流和日志治理 | 架构/安全负责人 | P1     | 已完成/后台持续治理 |
| 9   | release smoke 已补 settings LLM 401/429 失败反馈、Scraper 空状态/非法 ASIN、AI Analysis 空数据阻断、Keyword Hunter 空输入与样例处理、PPC 空输入与本地样例分析、Promptlab 无报告本地生成、Deep Chat 生成 Prompt 草稿复用、Restricted Words 非法正则/详情弹窗、NPI Tracker 移动表格 Next Step 编辑、SOPs Listing SEO→AMZ Hub SEO 移动端跨模块链路，并扩展核心工作流移动端 overflow 覆盖；2026-07-06 Chromium release smoke 与 Firefox/WebKit 兼容性 smoke 已通过，后续继续保存成功日志   | QA 负责人       | P1     | 已完成/持续回归 |
| 10  | 已改善 EventBus、ServiceBootstrap、HttpService、ActionRegistry 与路由初始化的错误可观测性、资源清理和输入守卫，并补充回归测试                                           | 前端负责人      | P2     | 已完成/持续回归 |

> PPC LLM 并发、缓存与首响展示为并行功能/性能变更，非 CSP 收紧任务，不计入 CSP P1 完成条件。

---

## ⚠️ 待完善 / 已知局限

- 本次复查已可靠确认 `type-check`、`lint`、完整 `npm run build`、Chromium release smoke 与 Firefox/WebKit 兼容性 smoke 通过。
- 已补充 settings LLM 401/429 浏览器级异常反馈验证、Scraper 空状态/非法 ASIN、AI Analysis 空数据、Keyword Hunter 空输入与样例流程、PPC 空输入与本地样例分析、Promptlab 无报告本地生成、Deep Chat 生成 Prompt 草稿复用、Restricted Words 非法正则/详情弹窗、NPI Tracker 移动表格 Next Step 编辑、SOPs→AMZ Hub SEO 移动链路，并扩展核心工作流移动端 overflow 门禁。
- NPI Tracker 窄屏横向滚动后 Next Step 按钮曾被粘性 SKU 列覆盖；已在移动端禁用 NPI 主表粘性列并用 release smoke 验证弹窗可打开、位于视口内且保存后回写标签。
- 安全审计以静态代码审阅、关键字检索、配置核验和现有门禁为主；2026-07-06 本地复查确认 `.env` 不存在、当前仓库与 `dist/` 未发现高置信度真实密钥，但 Git 历史曾出现真实认证/网关凭据片段；API 未授权访问、后端鉴权、网关限流无法仅凭前端仓库完全证明。
- 本轮已完成 CSP 静态 `style=`、`x-show`、动态 style 绑定与 runtime DOM style 写入清零，并移除 `style-src-attr 'unsafe-inline'`；`BaseModule`、`ModuleLoader`、`StorageService`、EventBus、ServiceBootstrap、HttpService、ActionRegistry 和路由初始化相关 P1/P2 均已补强并有回归测试。
- 已暴露凭据的具体值未在报告中展开；处理时请按敏感信息事故标准执行，避免二次传播。

---

## 📚 成员产出索引

- `gstack-product-reviewer`（产品官）原始产出：上线前代码质量审查报告，覆盖 `BaseModule`、`ModuleLoader`、`StorageService`、`EventBus`、`ServiceBootstrap`、`HttpService`、`ActionRegistry` 等核心文件。
- `gstack-security-officer`（安全卫士）原始产出：安全审计收尾结论，覆盖 `.env` 凭据、CSP、前端直连 LLM 网关、localStorage 持久化、XSS/依赖/CI 风险。
- `gstack-qa-lead`（质量门神）原始产出：QA 收尾结论曾标记 `build` 最终状态未确认；2026-07-06 复跑 `npm run build`、Chromium `npm run test:e2e:smoke` 24/24 与 Firefox/WebKit `npm run test:e2e:smoke:compat` 48/48 已通过。

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
