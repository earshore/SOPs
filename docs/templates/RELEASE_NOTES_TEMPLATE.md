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
- CSP / 网关白名单变更：无 / 见 DEPLOYMENT.md
- 建议回滚版本：{{PREVIOUS_GA}}
- 验证清单：首页 200、核心路由可进、LLM 网关连通、`npm run test:e2e:smoke`

### 产物

- `sops-dist-{{VERSION}}.zip`
- `build-info.json`
- `SHA256SUMS.txt`

### 完整变更

详见 [CHANGELOG {{VERSION}}](../CHANGELOG.md)

---

### CHANGELOG 原文

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
