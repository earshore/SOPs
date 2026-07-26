# 运维 Runbook（最低信号包）

**Status:** active · SSOT · v1.0  
**Updated:** 2026-07-26  
**Owner:** 工程 / 值班  
**产品形态:** Cloudflare Pages 静态站 + BYOK 网关 + 浏览器本地数据  

> **上位法：** [DEPLOYMENT.md](./DEPLOYMENT.md) · [RELEASE_POLICY.md](./RELEASE_POLICY.md) · [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md)  
> **降级细节：** [DEGRADATION_MATRIX.md](./troubleshooting/DEGRADATION_MATRIX.md) · [LLM_ERROR_CODES.md](./troubleshooting/LLM_ERROR_CODES.md)

---

## 0. 服务边界（值班必读）

| 组件 | 谁负责 | 本仓库能否修 |
| --- | --- | --- |
| 静态站点 Pages | Cloudflare 项目 `sops` | 回滚/重部署 `dist` |
| 自定义域 | `https://sops.hongecb.store` | DNS/Pages 绑定 |
| LLM 中转 | new-api `https://new.hongecb.store` | **否**（后台额度/Key/模型） |
| 用户 API Key | 浏览器本机设置 | 指导用户改设置，**不**代持 |
| 业务数据 | localStorage / IndexedDB | 导出/清理/导入；无服务端恢复 |
| 错误聚合 | Sentry **默认关** | 见 §5；默认靠浏览器控制台 |

**最低信号包（无 Sentry 时）：**

1. 生产首页 HTTP 状态 + CSP 头  
2. 浏览器控制台报错  
3. 设置页连接测试 / 模型列表  
4. 网关 `/v1/models`（仅可信环境、用户自有 Key）  
5. 最近 GitHub Release / tag / Pages 部署记录  

---

## 1. 快速检查（5 分钟）

```powershell
# 1) 站点是否活着
curl.exe -sI https://sops.hongecb.store | findstr /I "HTTP CSP content-security"

# 2) 预览部署（若刚发布）
# curl.exe -sI https://<deployment>.sops-3js.pages.dev

# 3) 本地复现
npm run build:app
npm run preview
```

期望：

- `HTTP/1.1 200`（或 CF 正常缓存）  
- CSP `connect-src` 含 `https://new.hongecb.store`  
- 页面可打开 hash 路由  

---

## 2. 事故分级

| 级别 | 定义 | 响应 |
| --- | --- | --- |
| **SEV-1** | 全站不可用（白屏/全 5xx/错误域） | 立即回滚 Pages；通知使用者 |
| **SEV-2** | 核心作业不可用（LLM 全失败/设置打不开/主工具挂） | 2h 内定位；可回滚或网关侧处理 |
| **SEV-3** | 单模块/单浏览器问题 | 下一工作日修复；记债务板 |
| **SEV-4** | 文案/样式/边缘 | 排期 |

---

## 3. 场景 Runbook

### 3.1 首页白屏 / 资源 404

| 步骤 | 动作 |
| --- | --- |
| 1 | `curl -I` 首页是否 200；是否 HTML |
| 2 | DevTools Network：JS/CSS 是否 404；是否被错误 rewrite 成 HTML |
| 3 | 确认最近部署：`wrangler pages deploy` 是否成功；对比 `dist` 与线上 asset hash |
| 4 | **回滚**：Cloudflare Dashboard → Pages → `sops` → Deployments → 选上一成功部署 Rollback；或重新 deploy 已知良好 tag 的 `dist` |
| 5 | 检查 `public/_headers` / `_redirects` 是否被错误改动 |

**禁止：** 为修路由把任意路径 rewrite 成 `index.html` 掩盖缺失资源（见 DEPLOYMENT）。

### 3.2 LLM 全部失败（对话/分析不可用）

| 步骤 | 动作 |
| --- | --- |
| 1 | 区分：**静态站正常** vs **仅 LLM 挂**（UI 能开 = 站 OK） |
| 2 | 设置 → AI 模型与连接：Endpoint / Key / 模型是否齐全；点「测试连接」 |
| 3 | 看 Toast/错误码：401/429/超时/网络（对照 LLM_ERROR_CODES） |
| 4 | 网关：可信环境用用户 Key 调 `GET /v1/models` |
| 5 | CORS：控制台是否跨域；改网关 CORS，不改密钥进仓库 |
| 6 | CSP：是否拦截 `new.hongecb.store` |
| 7 | 工具策略是否指到不存在模型 |

**可继续：** 静态 SOP/Hub、本地已缓存数据、非 LLM 工具。

### 3.3 系统设置打不开 / 保存无效

| 步骤 | 动作 |
| --- | --- |
| 1 | 控制台是否 Alpine / 模块加载错误 |
| 2 | 硬刷新；换浏览器/无痕（排除扩展） |
| 3 | Application → 存储是否满；设置 → 数据与备份看配额提示 |
| 4 | 推理档位：确认 Zod 允许 xhigh/max（旧 bug 已修）；清错误配置后重存 |
| 5 | 导出备份 → 清理 → 再导入（最后手段） |

### 3.4 本地数据丢失 / 误清空

| 步骤 | 动作 |
| --- | --- |
| 1 | **无服务端副本**；问是否有导出 zip/json |
| 2 | 有备份：设置 → 数据导入与导出 → 导入（merge/replace 按提示） |
| 3 | 无备份：无法从本仓库恢复；记流程改进（导出提醒） |

### 3.5 采集 / 代理失败

| 步骤 | 动作 |
| --- | --- |
| 1 | 设置 → 工具策略 → Master Analysis → 数据采集 |
| 2 | 连接方式 + Key；测试连接 |
| 3 | 第三方代理额度/IP 黑名单（ScraperAPI 等） |
| 4 | CSP connect-src 是否含代理域 |

### 3.6 发版后回滚

| 步骤 | 动作 |
| --- | --- |
| 1 | 确认坏版本 tag / deployment id |
| 2 | Pages Rollback 到上一 **Successful** production 部署 |
| 3 | 或：检出已知良好 tag → `npm run build` → `wrangler pages deploy dist --project-name sops --branch main` |
| 4 | 验证 §1 + 关键路径冒烟（打开设置、一次 LLM 测试） |
| 5 | GitHub 上说明 Pre-release 问题；**不要** force-move 已推送 tag |

部署命令摘要：

```bash
npm run build
npx wrangler pages deploy dist --project-name sops --branch main
```

---

## 4. 发版后冒烟（RC/生产）

- [ ] `https://sops.hongecb.store` 打开  
- [ ] 控制台无致命红错  
- [ ] 打开系统设置；侧栏一级/二级可点  
- [ ] AI 连接：测试连接（用值班自有 Key）  
- [ ] 一处工具主路径（如 Deep Chat 发一句或打开分析页）  
- [ ] CSP 仍含网关域  

---

## 5. 可观测性决策

| 项 | 决策 |
| --- | --- |
| Sentry | **默认关闭**；开启须 `VITE_SENTRY_DSN` + CSP + 发版声明 |
| 无 Sentry | 接受「控制台 + 用户报告」；不把「无 Sentry」当故障 |
| 日志 | 不用生产用户 Key 打进文档/issue 正文 |

---

## 6. 联系与升级

1. 内部频道通知现象 + 级别 + 是否已回滚  
2. 安全类走 [SECURITY.md](../SECURITY.md)，勿公开 issue 贴密钥  
3. 工程债记 [TECH_DEBT_BOARD.md](./TECH_DEBT_BOARD.md)  

---

## 7. 相关

- [DEPLOYMENT.md](./DEPLOYMENT.md)  
- [RELEASE_POLICY.md](./RELEASE_POLICY.md)  
- [troubleshooting/troubleshooting-guide.md](./troubleshooting/troubleshooting-guide.md)  
