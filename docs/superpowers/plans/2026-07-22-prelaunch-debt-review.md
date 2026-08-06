# 上线前债务审查报告（v3.0.11-rc.2）

**审查日期**: 2026-07-22  
**基线版本**: `3.0.11-rc.2`（`main` @ `c79addb7`）  
**生产 URL**: https://sops.hongecb.store  
**当前 GA / Latest**: `v3.0.10`  
**约束**: GitHub Actions 可能已触达月限额 → **以本地门禁与 HTTP 探针为验收证据**，不以 Actions 绿勾推断放行。

---

## 1. 结论摘要

| 维度 | 结论 | 说明 |
|------|------|------|
| **RC 代码质量** | 可继续做候选验证 | 安全/类型/Lint/格式/架构/CSS/技术债门禁通过；构建与产物合同通过 |
| **RC 自动化回归** | 本地通过 | Vitest 2782/2782；release smoke 26/26；覆盖率高于 ratchet |
| **生产 HTTP 合同** | 通过 | `release:production-gate` 对生产域名探测通过 |
| **GA 放行** | **暂不建议直接升 GA** | P0/P1 代码债已落地；GA 前完成提交 + 功能 E2E 抽样归档即可 |
| **P0 阻塞代码债** | **无** | 未发现会直接炸生产核心路径的高危扫描项（XSS/密钥/循环依赖/严重 tech-debt） |

**一句话**: 仓库处于 **可部署 RC / 可继续生产验证** 状态；2026-07-22 下午已按 P0/P1 **落地代码与文档修复**（见 §10），功能 E2E 三组已过；GA 前完成工作区提交（或打 rc.3）即可。

---

## 2. 本轮本地实扫证据（替代 GitHub Actions）

> 命令在本机执行；输出归档于 `output/prelaunch-*.log`。

### 2.1 安全与质量

| 检查 | 结果 | 备注 |
|------|------|------|
| `ci:security`（xss + secret + circular） | ✅ | XSS 0；密钥扫描通过；循环依赖 0 |
| `architecture:audit` | ✅ | 路由/页面架构 0 error |
| `css:audit` | ✅ | |
| `tech-debt:scan` / `tech-debt:gate` | ✅ | 3 条 **low**（见 §4.3） |
| `type-check` | ✅ | |
| `lint` + `lint:warning-gate` | ✅ | warning 基线 0 |
| `format:check` | ✅ | |
| `npm audit` / `npm audit --omit=dev` | ✅ | 0 vulnerabilities |
| `ui:audit` | ⚠️ 环境失败 | 需先起 dev server（`http://127.0.0.1:5174`）；**非产品逻辑失败** |

### 2.2 测试 / 构建 / 产物

| 检查 | 结果 | 备注 |
|------|------|------|
| `test:coverage` | ✅ | **250** files / **2782** tests passed；约 108.7s |
| 覆盖率 | ✅ | Lines **83.13%** / Stmts **81.31%** / Funcs **84.26%** / Branches **68.16%**（threshold: 82/80/82/65） |
| `build:app` | ✅ | Vite 8.0.16 生产构建成功 |
| `release:artifact-contract` | ✅ | `dist` 静态产物合同通过 |
| `release:validate` | ✅ | |
| `test:e2e:smoke:release` | ✅ | **26 passed / 1.4m**（含 Skills 试用交接、Deep Chat 草稿、核心路由与移动溢出） |
| `release:production-gate`（`PAGES_URL=https://sops.hongecb.store`） | ✅ | `/`=200；缺失 asset=404；`/home`→`/#/home` 302 |
| `test:performance:gate` | ✅ | **4 passed / 2.6m**；Lighthouse median 全 100，FCP/LCP/CLS/TBT 均在预算内 |
| `test:e2e:functional` 全量 | ❌ 未作为本轮阻塞跑完 | 历史上曾有超时/确定性缺陷；现有分组 runner，但 **未进 `release:gate` 阻塞阶段** |
| GitHub Actions Quality Gate | ⚠️ 不可用作证据 | 配额/计费限制；workflow 本身仍存在，但不作为本轮放行依据 |

### 2.3 工作区状态（发版风险）

```
main...sops/main
 M deep-chat/controller.ts
 M deep-chat/index.test.ts
 M deep-chat/renderers.ts
 M deep-chat/styles.css
 M deep-chat/template.html
```

未提交改动主题：移除顶栏「生成 Prompt」按钮，强化 Prompt 空状态（icon + CTA + 样式）。  
**风险**: 若带着脏工作区部署/打 tag，RC 与用户看到的 UI 会不一致；若丢弃未测，则遗留交互债。

---

## 3. 按完整项目流程的审查

### 3.1 架构

**已收敛（健康）**

- 模块边界清晰：`home` / `sops` / `app_center` / `amz_hub` / `more`
- 基础设施：EventBus、StorageService / secureStorage、AppError、SafeRenderer/SafeModuleLoader、路由守卫
- 部署边界文档明确：Cloudflare Pages 静态托管 + 浏览器直连 new-api（BYOK）
- 架构审计与循环依赖门禁通过

**仍需收敛的架构债**

| ID | 优先级 | 项 | 影响 | 建议 |
|----|--------|----|------|------|
| A-01 | P1 | **双宿主路由合同不一致** | CF：`_redirects` 302 到 Hash + 独立 `404.html`；Vercel：`rewrites` 回落 `index.html` | 生产以 CF 为准；Vercel 若保留预览，应对齐 302/缺失资源 404，或文档写明「仅 preview、合同以 CF 为准」 |
| A-02 | P1 | **超大热点模块** | `deep-chat/controller.ts` ~3.4k 行；`keyword_hunter/process` ~1.7k；`app_center` 合计 ~57k 行 | 发版后拆 controller（线程/模型/技能/发送生命周期）；不阻塞 RC |
| A-03 | P2 | **巨型 HTML 模板** | email_templates / ppc_advertising / quality_listing 等 100KB+ | 内容页组件化或分段加载；非上线阻断 |
| A-04 | P2 | **无服务端身份边界** | 产品定位为单用户 BYOK 静态站；`requiresAuth` 在未接入身份服务时 fail-closed | 写入发布说明与威胁模型；真多人协作前不升「平台级」承诺 |
| A-05 | P2 | **浏览器安全存储误解风险** | secureStorage 降低明文暴露，**不是**权限边界 | 设置页/文档持续强调；勿宣传「密钥仅本机安全」过头 |

### 3.2 设计 / 视觉

| ID | 优先级 | 项 | 说明 |
|----|--------|----|------|
| D-01 | P2 | Card / Workbench / Callout UI 债务计划仍在 | `docs/CARD_UI_DEBT_REDUCTION_PLAN.md`：导航卡 16px、工作台 8px、content/callout 分层；未宣称 100% 全站统一 |
| D-02 | P2 | `ui:audit` 依赖本地 dev server | 无法「单命令无服务」进 CI；本地发版清单应显式 `dev:simple` + `ui:audit` |
| D-03 | P2 | 主题 / token 体系已有指南 | 保持 `css:audit` 门禁；新样式禁止旁路 token |
| D-04 | P3 | 暗色/对比度 | 近期有 deep-chat / skills 热修；建议 GA 前对 Deep Chat + Skills + App Center 做一次目视走查 |

### 3.3 交互 / 产品闭环

对照 `docs/OPERATING_SYSTEM_ROADMAP.md`：

| ID | 优先级 | 项 | 说明 |
|----|--------|----|------|
| I-01 | P1 | **作业闭环未统一** | 大量 SOP/知识页仍偏「阅读说明」；工具页输出物/复核点/沉淀记录不一致 | GA 前明确「主推 3 条作业流」与「仅知识页」清单，避免对外口径过满 |
| I-02 | P1 | **Deep Chat × Prompt / Skills 入口一致性** | 未提交改动移除顶栏 Promptlab 按钮，空状态 CTA 保留；需确认是否为最终 IA | 合并前补单测+冒烟 Skills/Prompt 交接 |
| I-03 | P2 | **最近继续 / 工件恢复** | App Center 本地作业闭环已有基础；跨模块恢复与失败态文案需抽检 |
| I-04 | P2 | **高风险动作人工确认** | 广告/合规/客服类禁止自动执行 — 需在相关页保持强提示（产品原则已写，页面覆盖度需 spot-check） |
| I-05 | P3 | **移动端横向溢出** | smoke 已覆盖核心路由；非 smoke 路由仍建议抽检 |

### 3.4 实现

| ID | 优先级 | 项 | 说明 |
|----|--------|----|------|
| IMP-01 | P2 | `skillRegistryService` 3× `console.warn` | tech-debt low；建议走 loggerService，避免控制台噪声被当成未处理错误 |
| IMP-02 | P2 | 错误路径大量 `console.error` fallback | 与 GlobalErrorHandler / logger 并存；可接受为最后防线，但关键路径应结构化 |
| IMP-03 | P2 | Deep Chat vendor bundle 补丁 fail-closed | 已是正确策略；升级 deepChat.bundle 时必须验证补丁模式命中 |
| IMP-04 | P3 | `Math.random` / 存储边界 | 历史安全审计已收敛；新增代码需继续走 helper / StorageService |
| IMP-05 | P1 | **未提交 Deep Chat 交互改动** | 必须：补测 → 提交 → 再打下一 RC，或回滚后按当前 tag 部署 |

### 3.5 测试 / 冒烟 / 性能

| ID | 优先级 | 项 | 说明 |
|----|--------|----|------|
| T-01 | P0（流程） | **Actions 不可用时的本地发版清单** | 见 §5；`release:gate` 是一键编排，但耗时长；本轮分阶段已覆盖大部 |
| T-02 | P1 | **功能 E2E 未阻塞 `release:gate`** | `test:e2e:functional` 有分组 runner；建议 GA 前至少跑 analysis + deep-chat + keyword-hunter 组 |
| T-03 | P2 | **性能门禁证据** | 本轮已通过；后续大 CSS/路由改动后重跑 |
| T-04 | P1 | **CI 覆盖率阈值过松** | Actions `test.yml` 仍用 **60%** lines/statements；本地 vitest 为 **82/80/82/65** | 对齐 CI 阈值到与 `vite.config.js` 一致，避免「CI 绿但本地红」反转后误判 |
| T-05 | P2 | Smoke 用 `test:e2e:smoke` vs `test:e2e:smoke:release` | Actions 当前跑非 release 配置；本地发版应优先 **release 配置对 dist** |
| T-06 | P2 | 视觉回归 `test:visual` | 非默认门禁；大 CSS 改动后补跑 |
| T-07 | P3 | 跨浏览器 `test:e2e:smoke:compat` | Firefox/WebKit 未本轮执行 |

### 3.6 安全 / 运维 / 发布治理

| ID | 优先级 | 项 | 说明 |
|----|--------|----|------|
| S-01 | P1 | **Sentry 生产可观测性未证明** | `.env.example` 默认 `VITE_ENABLE_MONITORING=false`；无 DSN 证据 | 若生产开启监控，验证 DSN + CSP connect-src；否则明确「仅本地日志」 |
| S-02 | P1 | **网关依赖** | LLM 全走 `https://new.hongecb.store`；额度/限流/密钥由 new-api 治理 | 上线 checklist 含网关健康检查与 401/429 文案（smoke 已覆盖设置页失败态） |
| S-03 | P2 | **CSP connect-src 白名单** | 含 scraper 代理与 Amazon 域；定期审计是否过宽 | 变更 CSP 后重跑 smoke + 真实采集 |
| S-04 | P2 | **密钥不进仓库/Pages secrets** | 策略正确；用户 BYOK | 发布说明重申 |
| S-05 | P1 | **Release 通道纪律** | `v3.0.11-rc.*` 必须 Pre-release；Latest 保持 `v3.0.10` 直至 GA | 禁止 force-retag；GA 后不得再发同号 RC |
| S-06 | P2 | **回滚预案** | CHANGELOG 已写回滚到 `v3.0.10` Pages 部署 | 运维保留上一 GA dist / Pages 部署 ID |

---

## 4. 债务优先级总表（上线前收敛）

### P0 — 发版前必须处理

| ID | 债务 | 状态 | 动作 / 验收 |
|----|------|------|-------------|
| P0-1 | 工作区脏改动 | ✅ 代码+单测完成，⏳ 待提交 | Deep Chat 空状态 / 停止态修复 + 49 单测通过；提交后 `git status` 干净 |
| P0-2 | 本地完整 RC 证据包 | ✅ | smoke/perf/coverage/production-gate 已过；`release-artifacts/release-readiness.json` 已写 |
| P0-3 | 生产验证不靠 Actions | ✅ 流程写死 | §2 本地证据 + production-gate；CI 配额恢复前不以 Actions 为唯一放行源 |

### P1 — GA 前强烈建议

| ID | 债务 | 状态 | 动作 |
|----|------|------|------|
| P1-1 | 功能 E2E 抽样 | ✅ | deep-chat 8 / keyword-hunter 7 / analysis 106 全过；日志 `output/p0p1-functional.log` |
| P1-2 | 性能门禁 | ✅ | 4 passed / 2.6m |
| P1-3 | CI 覆盖率阈值对齐 | ✅ | lines 82 / stmts 80 / funcs 82 / branches 65 |
| P1-4 | Actions smoke 对齐 dist | ✅ | download artifact + `test:e2e:smoke:release` |
| P1-5 | 双宿主路由 | ✅ | `vercel.json` 302 redirects；去掉 SPA index 回落 |
| P1-6 | 产品口径 | ✅ | README 主推/知识/探索表 |
| P1-7 | Sentry/监控 | ✅ | SECURITY + DEPLOYMENT + `.env.example` 默认关闭 |

### P2 — 下一迭代（不阻塞当前 RC 验证）

- 拆分 deep-chat controller / keyword hunter process  
- Card UI 全站统一推进  
- skillRegistry console.warn → logger  
- 巨型 SOP 模板组件化  
- `ui:audit` 支持 preview/dist 无 dev 依赖  
- 功能 E2E 正式并入 `release:gate`（预算与稳定性达标后）  
- 视觉回归默认抽检集  

### P3 / 明确不做（当前阶段）

- 多租户、计费、服务端权限平台  
- 大依赖 major 升级（非安全必要）  
- 路由架构从 Hash 迁 History（已有兼容 302）  

---

## 5. 本地发版清单（Actions 不可用时）

按顺序执行；任一步失败即停止。

```text
1. git status          → 工作区干净
2. npm run ci:security
3. npm run ci:quality  → 或分阶段 architecture/css/type-check/lint/format
4. npm run tech-debt:gate
5. npm run test:coverage
6. npm run build:app
7. npm run release:artifact-contract
8. npm run test:e2e:smoke:release
9. npm run test:performance:gate
10. (GA 前) npm run test:e2e:functional   # 或分组
11. npm run release:validate && npm run release:notes && npm run release:package
12. 部署 dist → Cloudflare Pages
13. PAGES_URL=https://sops.hongecb.store npm run release:production-gate
14. 人工：设置页配 key → Deep Chat 短对话 → Skills 试用 → Scraper 空态 → App Center 最近继续
```

一键等价（耗时长）：

```bash
npm run release:gate
```

生产探针：

```bash
# PowerShell
$env:PAGES_URL='https://sops.hongecb.store'; npm run release:production-gate
```

可选 UI 审计：

```bash
# 终端 A
npm run dev:simple
# 终端 B
npm run ui:audit
```

---

## 6. 模块风险热图（抽查优先级）

| 区域 | 体量/复杂度 | 风险 | 上线前抽查 |
|------|-------------|------|------------|
| App Center / Deep Chat | 高 | 并发会话、技能 Chip、停止/卸载 | smoke 已覆盖主干；功能 E2E send/preview 建议补 |
| Keyword Hunter | 高 | 多步状态与快照 | smoke 输入闭环；建议 process/analysis e2e |
| Scraper / AI Analysis / Promptlab | 中高 | 数据接力与空态 | smoke 已覆盖空态；完整采集依赖外部代理 |
| SOPs 工具页（NPI 等） | 中 | 表格/弹层/导出 | smoke 移动端 Next Step |
| AMZ Hub 知识/实践页 | 中 | 多为静态内容 | 抽查链接与移动溢出 |
| Skills 目录 | 中（新） | 叙事 + 试用交接 | smoke 已覆盖 trial handoff |
| 设置 / LLM 配置 | 中 | 网关 401/429 | smoke 已覆盖 |

---

## 7. 与历史债务文档的关系

| 文档 | 状态解读 |
|------|----------|
| `docs/archive/kiro-2026-h1/arch-debt/debt-list.md` | 清单内架构债标为 100% 完成（2026-07-11）；与本轮扫描一致（无 high tech-debt） |
| `docs/TECH_DEBT_AUDIT.md` | 无阻塞 `ci:all` 的 P0；剩余 FU-09 身份服务为未来项 |
| `docs/superpowers/plans/2026-07-19-release-debt-hardening-landing-status.md` | hardening 已落地；功能 E2E 仍非 gate 阻塞；Actions 配额 out-of-band |
| 本报告 | **上线决策视角** 的收敛清单 + **2026-07-22 本地实扫证据** |

---

## 8. 建议决策

### 可以做

- 继续将 **当前已提交的 `v3.0.11-rc.2`** 作为生产验证候选（staging/小流量）
- 用本地清单替代 Actions 做回归
- 生产 HTTP 合同已通过；可做人工业务验收

### 不要做（在未完成 P0 前）

- 不要把 **未提交 Deep Chat 改动** 悄悄打进生产
- 不要把 `v3.0.11` **GA + Latest** 仅凭「历史债务文档写 100%」
- 不要因 Actions 无法启动而跳过 smoke/perf

### 建议下一动作顺序

1. **处理脏工作区**（提交或回滚）→ 如有提交则打 `v3.0.11-rc.3`  
2. 补齐 **performance gate** + **功能 E2E 抽样** 证据  
3. 人工验收主路径（Deep Chat / Skills / 主分析链 / 设置网关）  
4. 通过后准备 `v3.0.11` GA（CHANGELOG / notes / package / Pages / production-gate）  
5. 配额恢复后：对齐 CI 覆盖率与 release-smoke 配置  

---

## 9. 附录：本轮关键命令出口码快照

```
ci:security                 0
architecture:audit          0
css:audit                   0
ui:audit                    1  (no dev server)
tech-debt:gate              0  (3 low)
type-check / lint / format  0
npm audit (all)             0
test:coverage               0  (2782 passed)
build:app                   0
release:artifact-contract   0
release:validate            0
test:e2e:smoke:release      0  (26 passed)
release:production-gate     0  (sops.hongecb.store)
test:performance:gate       0  (4 passed)
```

**报告生成**: 2026-07-22  
**审查方式**: Superpowers 风格全流程审查 + 本地门禁实跑（非仅文档复读）
---

## 10. P0/P1 落地记录（2026-07-22 执行）

| 项 | 变更 |
|----|------|
| Deep Chat (P0-1) | 停止态仅 `!isSettled`；Prompt 空状态 CTA；按钮 36px 对齐；单测 49 通过 |
| CI (P1-3/P1-4) | `.github/workflows/test.yml` 覆盖率与 vitest 对齐；smoke/perf 下载 `build-artifact` 后跑 release 配置 |
| Vercel (P1-5) | `redirects` 302 → Hash；去掉 catch-all SPA rewrite；单测锁定合同 |
| 产品口径 (P1-6) | README 主推作业流 / 知识页 / 探索页 |
| 监控 (P1-7) | SECURITY + DEPLOYMENT + `.env.example` 明确 Sentry 默认关闭 |
| 证据 (P0-2) | `release-artifacts/release-readiness.json` |

剩余人工：`git commit`（或按需打 `v3.0.11-rc.3`）、确认功能 E2E 三组日志、可选人工冒烟。


