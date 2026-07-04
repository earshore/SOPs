# SOPs 部署指南

本文档描述当前生产部署形态：Cloudflare Pages 只负责托管 Vite 构建后的静态资源，LLM 请求由浏览器直接调用自部署 new-api 网关 `https://new.hongecb.store/v1`。

## 架构边界

- 静态站点：Cloudflare Pages，构建输出目录为 `dist/`。
- 模型网关：自部署 new-api，OpenAI 兼容接口，地址为 `https://new.hongecb.store/v1`。
- 权限与治理：API key 白名单、额度、过期时间、限流、日志监控均由 new-api 管理。
- 浏览器本地密钥：仅用于减少明文暴露，不是服务端密钥托管，也不是权限边界；同源脚本、浏览器扩展或本机访问仍属于风险面。
- 已移除：边缘 API 代理、旧路由头、Pages 环境变量网关注册流程。

## 本地准备

```bash
npm install
cp .env.example .env
```

`.env` 只用于本地接口验证或脚本测试，不再作为 Cloudflare Pages 的 LLM 生产配置来源。不要提交真实 API key。

## 构建

```bash
npm run build
```

构建完成后确认 `dist/` 存在，且 `dist/_headers` 的 CSP `connect-src` 包含 `https://new.hongecb.store`。
生产环境不应在 `connect-src` 中放行 OpenAI、Gemini、腾讯混元等模型直连域；LLM 统一通过 new-api 网关治理。

## 部署到 Cloudflare Pages

```bash
npx wrangler whoami
npx wrangler pages deploy dist --project-name sops --branch main
```

如果尚未登录，先执行：

```bash
npx wrangler login
```

## 部署后验证

```bash
curl -I https://sops.hongecb.store
```

需要看到：

- 页面返回 `200` 或 Cloudflare 正常缓存状态。
- `Content-Security-Policy` 中允许 `https://new.hongecb.store`。
- 不再出现旧网关域名或外部模型直连域名。

可选：使用本地 `.env` 中的 key 直接验证 new-api。

```bash
curl https://new.hongecb.store/v1/models \
  -H "Authorization: Bearer $GATEWAY_NEW_API_API_KEY"
```

Windows PowerShell:

```powershell
curl.exe https://new.hongecb.store/v1/models `
  -H "Authorization: Bearer $env:GATEWAY_NEW_API_API_KEY"
```

## 故障排查

### 模型请求 401 或 403

在 new-api 后台检查 API key 是否有效、是否在模型白名单内、额度是否耗尽、是否过期。

### 模型请求 429

在 new-api 后台检查该 key 或账号的限流策略，并结合网关日志观察并发请求数。

### 浏览器 CORS 报错

确认 new-api 服务允许当前站点来源。当前阶段按生产观察策略暂不收紧 CORS；后续如需收紧，应先在 new-api 上加入 `https://sops.hongecb.store` 和必要的 Pages 预览域名。

### CSP 阻止请求

检查 `public/_headers`，确保 `connect-src` 保留 `https://new.hongecb.store`。修改后重新构建并部署。
如果新增可浏览器直连服务，先更新 `src/common/config/apiEndpoints.ts` 中的端点策略，再同步响应头；不要直接手改 CSP 放行模型供应商 API。

## 维护规则

- 不要重新引入边缘函数作为 LLM 代理，除非有新的安全或合规要求。
- 不要在 Pages 项目中保存 LLM API key；生产调用凭据由用户配置并由 new-api 侧治理。
- 不要把浏览器 `SecureStorage` 当作认证/授权系统；需要权限隔离时，应先接入真实身份服务，再启用路由 `requiresAuth`。
- Cloudflare Pages production secrets 应保持为空；用 `npx wrangler pages secret list --project-name sops` 复查。
- 新增模型或调整模型权限，应在 new-api 后台完成，不需要修改前端部署链路。
