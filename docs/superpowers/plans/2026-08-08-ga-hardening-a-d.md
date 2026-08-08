# GA 上线前加固 Sprint — 执行计划（2026-08-08）

> 依据「最终版审查报告（纯代码证据）」制定。每阶段独立验证 + 独立 commit，全部通过后再进下一阶段。

## 阶段 A — S0：「导入新的」模板绑定修复（阻塞项）

- 改动：`scraper/template.html` `@change="handleImportFiles($event, 'overwrite')"` → `'new'`
- 防御：模板断言测试（禁 `'overwrite'`、必须 `'new'`）
- 验证：`npm run type-check` + 相关 vitest + 浏览器实测真实按钮全流程（弹窗/存档/替换/toast）
- commit：`Fix new-import mode binding in scraper template`

## 阶段 B — S1：DeepSeek chat 面关闭推理

- 改动：`modelCapability/mappers.ts` `mapThinkingPlusEffort` off 分支返回 `{ thinking: { type: 'disabled' } }`（对齐 `mapOpenAiThinkingToggle`）
- 同步修正 `parallelAnalysisService.ts`、`reviewEvidencePipeline.ts` 的「fast 关闭推理」错误注释（实际 cap=low）
- 验证：modelCapability 单测（off → 含禁用字段）+ type-check
- commit：`Disable DeepSeek thinking when reasoning off`

## 阶段 C — S2：存储一致性（清空回灌 + 双存储失步）

- `storageService.ts`：
  - `removeScrapeHistoryAsync` 删 IDB 后同步删 localStorage `scrape_history` + `scrape_history_migrated_to_indexeddb`
  - `setScrapeHistoryAsync` 写 IDB 成功后同步写 localStorage 镜像（同步读路径见最新）
- 不动 `migrateLocalStorageKey` 的「保留源 key 备份」设计（有单测断言）
- 验证：storage 单测（清空无回灌、镜像一致）+ type-check
- commit：`Keep local storage mirror in sync with IDB history`

## 阶段 D — S3：CI 加固

- `release.yml` / `test.yml`：Build 后加 `npx tsx scripts/release/static-artifact-contract.ts dist`（静态契约进 CI）
- `dependency-update.yml`：`npm audit fix --audit-level=high`（降档）；PR token 用 `secrets.AUTOMATION_PAT || secrets.GITHUB_TOKEN`（未配置时回退，不破坏现有）
- `GlobalErrorHandler.ts:197-205` 白名单补 `NET_OFFLINE` / `NET_REQUEST_FAILED` + 单测
- `scripts/quality/bundle-size-gate.ts`（新增体积门禁：dist js gzip ≤ 阈值硬失败）+ `test.yml` build job 挂接
- 验证：本地跑 xss:gate/secret:scan、artifact-contract（本地 build 后）、type-check、bundle-size-gate
- commit：`Harden release gates and audit coverage`

## 阶段 E — 下一迭代（GA 后，本文档仅记录）
- P1-1 耗时估算同源化、P1-2 流式超时语义、业务 e2e 进 CI、评论列表截断、xss-scanner 补模式、browserslist