# SOPs 发布策略

本文档定义 GitHub Releases、版本号、变更说明与发版门禁的企业级约定。  
与 [变更日志](./CHANGELOG.md)、[部署指南](./DEPLOYMENT.md)、[CI 质量门禁](./CI-QUALITY-GATES.md) 配套使用。

## 1. 目标

- **可消费**：`Latest` 始终指向可上生产的稳定版（GA）。
- **可审计**：每个 Release 有完整 notes、commit SHA、构建信息与产物校验和。
- **可回滚**：产物可复现部署；notes 标明上一 GA 与回滚步骤。
- **通道清晰**：预发布不得抢占 Latest，不得在同号 GA 之后再发同号 RC。

## 2. 版本通道（SemVer）

| 通道  | Tag 格式         | package.json | GitHub             | 用途                   |
| ----- | ---------------- | ------------ | ------------------ | ---------------------- |
| Alpha | `vX.Y.Z-alpha.N` | 同左无 `v`   | **Pre-release**    | 探索性功能，不保证 API |
| Beta  | `vX.Y.Z-beta.N`  | 同左无 `v`   | **Pre-release**    | 功能基本完整，邀请内测 |
| RC    | `vX.Y.Z-rc.N`    | 同左无 `v`   | **Pre-release**    | 功能冻结后的发布候选   |
| GA    | `vX.Y.Z`         | 同左无 `v`   | **Latest**（正式） | 生产推荐版本           |

### 硬性规则

1. **仅 GA 可设为 Latest**；所有带 `alpha` / `beta` / `rc` 的 tag **必须**标记为 Pre-release。
2. **禁止**「先发 `vX.Y.Z` GA，再发 `vX.Y.Z-rc.N`」。GA 之后的下一条候选必须进入 **下一版本号**（如 `vX.Y.(Z+1)-rc.1` 或 `vX.(Y+1).0-rc.1`）。
3. **禁止** force-move / retag 已发布的远程 tag（紧急纠错须 24h 内全员通知，并在 CHANGELOG 记录；优先发新版本说明废弃）。
4. **三者一致**：`package.json` 的 `version`、git tag（去掉前缀 `v`）、Release tag 名称必须相同。
5. UI 版本号只读 `package.json`（经 `VITE_APP_VERSION` 注入），不得从随意 git tag 推断。

### 历史版本线说明（只读）

- `v3.0.4` 为历史 GA。
- `v3.0.4-rc.1` … `v3.0.4-rc.11` 为历史误序 RC（GA 之后继续同号候选），**冻结**：不再新增 `3.0.4-rc.*`。
- `v3.0.5-rc.1` / `v3.0.5-rc.2` 分别与 `v3.0.4-rc.9` / `v3.0.4-rc.10` 指向同一提交，仅保留为归档 tag；不得为其创建 GitHub Release，以免重复条目打乱发布页。
- `v3.0.5`（2026-07-13）为历史 GA：收口上述 RC 线并落地发布治理；取代误打且无 Release 的旧 `v3.0.5` tag 指向。
- `v3.0.6`（2026-07-14）为历史 GA：发布应用中心本地作业闭环与生产预览可靠性更新。
- `v3.0.7-rc.1`（2026-07-14）为历史生产验证候选：完成 Keyword Hunter / PromptLab 链路收敛与历史 Release 去重。
- `v3.0.7-rc.2`（2026-07-14）为历史生产验证候选：修复应用总览数据加载闪屏并移除 PromptLab SEO 关键词复制入口。
- `v3.0.7`（2026-07-18）为上一 GA：收口 `v3.0.7-rc.1`、`v3.0.7-rc.2` 与本次 GA 定稿变更。
- `v3.0.8`（2026-07-19）为历史 GA：修复 App Center 启动降级、模块异步 mount 竞态与 Deep Chat CSP 兼容问题。
- `v3.0.9`（2026-07-19）为历史 GA：落地 release-debt hardening（静态托管合同、质量/浏览器门禁、本地 `release:gate`）并收口构建质量门。
- `v3.0.10`（2026-07-20）为当前 GA：收口 `v3.0.9` 后热修（数据备份 UX、Vercel 构建、UI 打磨、confirm 弹窗去重）并恢复 package / tag / Release / 生产三者一致。
- `v3.0.11-rc.1`（2026-07-21）为生产验证候选：Amazon Skills 目录 + Deep Chat 技能挂载 / 并发会话体验；**Pre-release**，Latest 仍为 `v3.0.10`。
- `v3.0.11-rc.2`（2026-07-22）为生产验证候选：技能页叙事对齐 + Deep Chat Chip/输入热修；**Pre-release**，Latest 仍为 `v3.0.10`。
- `v3.0.11-rc.3`（2026-07-22）为生产验证候选：Deep Chat 会话稳定性、发布门禁与 Skill Registry 构建产物优化；**Pre-release**，Latest 仍为 `v3.0.10`。
- `v3.0.11-rc.4`（2026-07-23）为生产验证候选：Deep Chat 发送钮 pin/手机壳、会话 Skill Chip dock、侧栏 Skill Library；**Pre-release**，Latest 仍为 `v3.0.10`。
- `v3.0.11-rc.5`（2026-07-23）为生产验证候选：Deep Chat 技能单次执行（发送后消费挂载）；**Pre-release**，Latest 仍为 `v3.0.10`。
- `v3.0.11-rc.6`（2026-07-24）为生产验证候选：Deep Chat 包重组 + 深度思考 / 模型能力线；**Pre-release**，Latest 仍为 `v3.0.10`。
- `v3.0.11-rc.7`（2026-07-25）为生产验证候选：双路径 tools 闭环 + Create 字段透传 + 生成 chrome；**Pre-release**，Latest 仍为 `v3.0.10`。
- `v3.0.11-rc.8`（2026-07-25）为生产验证候选：系统设置企业级硬化（保存契约、二级导航、推理 5 档、UX 收敛）；**Pre-release**，Latest 仍为 `v3.0.10`。
- `v3.0.11-rc.9`（2026-07-26）为生产验证候选：主题架构企业级收口（极简素色 / A2）、可行动 LLM 失败体验、文档权威整理；**Pre-release**，Latest 仍为 `v3.0.10`。
- GA 后不得再发 `v3.0.10-rc.*`；当前 patch 候选为 `v3.0.11-rc.9`，GA 定稿后升 `v3.0.11`；若后续变更体量升 minor 则为 `v3.1.0-rc.1`。

## 3. 何时创建 GitHub Release

| 活动                    | 是否创建 Release | 说明               |
| ----------------------- | ---------------- | ------------------ |
| 日常 merge 到 `main`    | 否               | 依赖 CI 与部署日志 |
| 功能联调 / Staging 部署 | 可选 Draft       | 不公开为正式通道   |
| 功能冻结后的候选        | 是，Pre-release  | `*-rc.N`           |
| 生产里程碑              | 是，GA + Latest  | `vX.Y.Z`           |

**原则**：Release 是产品里程碑，不是开发日记。同一 RC 系列内合并相关提交后再打 tag，避免每个 commit 一个 Release。

## 4. 变更说明（SSOT）

- **唯一事实源**：`docs/CHANGELOG.md`（Keep a Changelog）。
- Release body 由脚本从 CHANGELOG 对应版本段落**完整**生成，再套用 [Release Notes 模板](./templates/RELEASE_NOTES_TEMPLATE.md) 补齐运维字段。
- 分区至少包含：`Added` / `Changed` / `Fixed`；涉及安全时必须有 `Security`；破坏性变更用 `### Breaking` 或明确迁移步骤。

### 叙述保留规则（硬性）

1. **禁止**为“简洁”而删除、折叠或覆盖既有版本章节（含历史 RC / GA）。
2. 新 GA 可在该版本章节内做**汇总 + 细化**，但必须保留此前各 RC 章节原文，或在 README「最新发布」中保留完整历史发版描述。
3. Release Notes / README 更新时只能**追加或细化**，不得用短列表替换长列表除非原条目已原样迁入 CHANGELOG 对应章节。
4. `Unreleased` 中尚未随本版发布的条目不得丢弃；应留在 `Unreleased` 或明确迁入正确版本号。

发版前检查：

- [ ] CHANGELOG 已有目标版本章节（日期正确、条目完整）
- [ ] `Unreleased` 中已落地条目已迁入该版本；未发布条目仍保留在 `Unreleased`
- [ ] README / Release 未删减历史发版描述
- [ ] 无密钥、内网账号、真实 API key

## 5. 发版门禁

发布 tag 触发 `.github/workflows/release.yml`。创建或更新 GitHub Release 前，tag 必须指向当前检出的提交，且该提交必须已有 `main` 分支上完成并成功的 Quality Gate 运行。

手动运行 `workflow_dispatch` 默认只构建并上传 workflow artifact；只有同时提供已存在的 tag 并显式设置 `publish=true` 才允许发布，且仍须通过上述精确 SHA 门禁。

发版流水线至少通过：

1. 版本一致性校验（`npm run release:validate`）
2. 安全门：`npm run ci:security`
3. 质量门：`npm run type-check`、`npm run lint`、`npm run lint:warning-gate`（完整 `ci:quality` 可在本地/主 CI 先行）
4. 构建：`npm run build:app`（发版流水线内跳过会再次全量 prebuild 的重复，见 workflow）
5. 产物打包与 SHA256（`npm run release:package`）
6. （推荐）E2E smoke：`npm run test:e2e:smoke` — workflow 中作为必需步骤

人工验收（GA 必做，RC 建议做）：

- [ ] 生产或 Staging 首页可打开，CSP 正常
- [ ] 核心 SOP / App Center 路径可进入
- [ ] LLM 网关连通（用户自备 key，不把生产 key 写入仓库）
- [ ] 回滚版本号已写在 Release notes
- [ ] **OPS 发版冒烟**勾选完整（模板内清单，对照 [OPS_RUNBOOK §4](./OPS_RUNBOOK.md#4-发版后冒烟rc生产)）
- [ ] **A11y 键盘抽检**勾选（模板内清单，对照 [ACCESSIBILITY §3](./ACCESSIBILITY.md#3-关键路径抽检清单发版--大改-ui)）

Release body 模板见 [templates/RELEASE_NOTES_TEMPLATE.md](./templates/RELEASE_NOTES_TEMPLATE.md)（含 OPS / A11y 必勾项，禁止只写「见 runbook」）。

## 6. 产物（Artifacts）

每个 Release 应附带（由流水线上传）：

| 文件                      | 说明                                  |
| ------------------------- | ------------------------------------- |
| `sops-dist-<version>.zip` | `dist/` 构建产物                      |
| `build-info.json`         | version、git SHA、构建时间、Node 版本 |
| `SHA256SUMS.txt`          | 上述文件的校验和                      |

Source code zip/tarball 由 GitHub 自动提供，**不能**替代 `dist` 产物。

## 7. 操作流程

### 7.1 发布 RC

```bash
# 1. 更新 package.json version，例如 3.0.9-rc.1
# 2. 将 Unreleased 迁入 docs/CHANGELOG.md 对应章节
# 3. 提交并推送 main
# 4. 等待该提交的 main Quality Gate 成功（release workflow 会拒绝尚未通过的 SHA）
# 5. 打 tag 并推送（触发 release workflow）
git tag -a v3.0.9-rc.1 -m "v3.0.9-rc.1"
git push sops v3.0.9-rc.1
```

### 7.2 发布 GA

```bash
# version → 3.0.9（去掉 -rc.N），CHANGELOG 定稿
# 1. 提交并推送 main
# 2. 等待该提交的 main Quality Gate 成功
# 3. 仅在同一 SHA 已通过门禁后，创建并推送 annotated tag
git tag -a v3.0.9 -m "v3.0.9"
git push sops v3.0.9
```

### 7.3 本地校验（不推送）

```bash
npm run release:validate
npm run release:notes
npm run build:app
npm run release:package
```

### 7.4 手动纠正 Pre-release / Latest（应急）

```bash
gh release edit vX.Y.Z-rc.N --prerelease
gh release edit vX.Y.Z --latest
```

## 8. 环境与链接

| 环境             | URL                              | 说明                                         |
| ---------------- | -------------------------------- | -------------------------------------------- |
| Production       | https://sops.hongecb.store       | Cloudflare Pages；GitHub `homepage` 指向此处 |
| 文档中的部署步骤 | [DEPLOYMENT.md](./DEPLOYMENT.md) | 构建与 wrangler 部署                         |

仓库与 Pages **不**存放生产 LLM API key；密钥由用户在浏览器设置页配置，治理在 new-api 后台。

## 9. 角色与审批

| 动作               | 建议                     |
| ------------------ | ------------------------ |
| 推送 `v*-rc.*` tag | 维护者；CI 全绿          |
| 推送 GA tag        | 维护者；人工验收清单完成 |
| 修改本策略         | PR 评审后合并            |

后续可引入 `CODEOWNERS` 强制 `docs/CHANGELOG.md`、`.github/workflows/release.yml` 的评审。

## 10. 相关命令

```bash
npm run release:validate         # 校验 package version / tag / 预发布规则
npm run release:notes            # 从 CHANGELOG 生成 release body 片段
npm run release:package          # 打包 dist + build-info + SHA256SUMS
npm run release:backfill-notes   # 将指定版本 CHANGELOG 章节回填到 GitHub Release
npm run release:sync-all         # 全量：CHANGELOG 覆盖全部 Release + 回写全部 GitHub notes
npm run release:audit            # 审计 tag / Release / CHANGELOG / 产物 / 短 notes
```

回填 / 全量同步示例：

```bash
npm run release:backfill-notes -- --dry-run
npm run release:backfill-notes -- --only 3.0.4,3.0.4-rc.11
npm run release:sync-all -- --dry-run
npm run release:sync-all
```

`release:sync-all` 规则：

1. 以 GitHub 全部 Release 为清单，保证每个版本在 `docs/CHANGELOG.md` 有章节。
2. 已有 CHANGELOG 详述**优先保留**；缺失章节从 GitHub 原文导入（标注 historical）。
3. 每个 GitHub Release body = 运维头 + 对应 CHANGELOG **完整**章节（不压缩、不删历史）。
4. 不改变 Latest：仅当前稳定 GA（现为 `v3.0.10`）使用 `--latest`；RC 保持 `--prerelease`。
