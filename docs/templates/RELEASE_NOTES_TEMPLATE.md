# Release Notes 模板

发版时由 `npm run release:notes` 从 `docs/CHANGELOG.md` 抽取版本章节，再按本模板补齐运维字段后写入 GitHub Release body。

将 `{{...}}` 替换为实际值；不适用的小节写「无」或删除。

```markdown
## SOPs {{VERSION}}

**发布通道：** {{CHANNEL}}  
**环境：** {{ENVIRONMENT}}  
**部署目标：** https://sops.hongecb.store  
**Git tag：** v{{VERSION}}  
**Commit：** {{GIT_SHA}}  
**构建时间：** {{BUILD_TIME}}

{{#if PRERELEASE}}
> ⚠ 预发布候选，**不要**默认用于生产。GitHub Latest 应仍指向最新 GA。
{{/if}}

### 用户可见变更

（由 CHANGELOG 的 Added / Changed 中面向运营的条目整理）

### 破坏性变更 / 迁移

- 无

### 安全

- 无已知安全公告 | 或简述修复

### 运维与部署

- 是否需要清 CDN/浏览器缓存：是 / 否
- CSP / 网关白名单变更：无 / 见 [DEPLOYMENT.md](../DEPLOYMENT.md)
- 建议回滚版本：{{PREVIOUS_GA}}
- 完整事故/回滚步骤：见 [OPS_RUNBOOK.md](../OPS_RUNBOOK.md)

#### 发版后冒烟（OPS — 必勾，不可只写「见 runbook」）

对照 [OPS_RUNBOOK §4](../OPS_RUNBOOK.md#4-发版后冒烟rc生产)：

- [ ] `https://sops.hongecb.store`（或本版部署目标）可打开
- [ ] 浏览器控制台无致命红错
- [ ] 系统设置可打开；侧栏一级/二级可点
- [ ] AI 连接：测试连接（值班自有 Key）
- [ ] 一处工具主路径冒烟（如 Deep Chat 发一句或打开分析页）
- [ ] CSP `connect-src` 仍含网关域（`new.hongecb.store`）
- [ ] 自动化：`npm run test:e2e:smoke`（CI 或本地）已绿

#### 无障碍发版抽检（A11y — RC 建议 / GA 必做）

对照 [ACCESSIBILITY §3](../ACCESSIBILITY.md#3-关键路径抽检清单发版--大改-ui)：

- [ ] Tab 可达顶栏 → 主内容；focus-visible 可见
- [ ] 系统设置：Esc / 脏数据确认可用键盘
- [ ] 确认弹层：焦点在对话框内，关闭后焦点不丢
- [ ] 至少一处业务主 CTA 可键盘触发
- [ ] 图标按钮有 accessible name（抽检）

### 产物

- `sops-dist-{{VERSION}}.zip`
- `build-info.json`
- `SHA256SUMS.txt`

### 完整变更

Release body **必须**粘贴 CHANGELOG 中该版本的完整章节，禁止改写成更短的 bullet 列表。  
历史 RC / 更早基线的叙述保留在 `docs/CHANGELOG.md` 与 README「最新发布」，发版时不要删除。

---

### CHANGELOG 原文（完整，不压缩）

{{CHANGELOG_SECTION}}
```

## 通道取值

| CHANNEL | 条件 |
|---------|------|
| Stable (GA) | 无预发布后缀 |
| Release Candidate | `-rc.N` |
| Beta | `-beta.N` |
| Alpha | `-alpha.N` |

## 环境取值

| ENVIRONMENT | 场景 |
|-------------|------|
| Production | GA 已部署生产 |
| Staging | RC / 预发验证 |
| Development | 一般不发正式 Release |
