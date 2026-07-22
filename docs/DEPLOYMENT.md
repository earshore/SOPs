# SOPs 部署指南

本文档描述当前生产部署形态：Cloudflare Pages 只负责托管 Vite 构建后的静态资源，LLM 请求由浏览器直接调用自部署 new-api 中转站 `https://new.hongecb.store/v1`。

版本通道、GitHub Release 与产物约定见 [RELEASE_POLICY.md](./RELEASE_POLICY.md)。

## 架构边界

- 静态站点：**生产**为 Cloudflare Pages，构建输出目录为 `dist/`。
- Vercel：仅作可选预览/对照宿主，**不是**生产合同源。`vercel.json` 的 clean-path **302 → Hash** 与 `public/_redirects` 对齐；已移除「未知路径 rewrite 到 `index.html`」的 SPA 回落，避免缺失资源被当成 200 HTML。
- 模型网关：自部署 new-api，OpenAI 兼容接口，地址为 `https://new.hongecb.store/v1`。
- 凭据边界：仓库和 Cloudflare Pages 项目不保存生产 LLM API key；用户在浏览器设置页保存自己的 new-api key。
- 浏览器本地密钥：仅用于减少明文暴露，不是服务端密钥托管，也不是权限边界；同源脚本、浏览器扩展或本机访问仍属于风险面。
- 治理：模型白名单、额度、过期时间、限流和日志由 new-api 后台管理。
- 错误监控（Sentry）：**默认关闭**。仅当生产构建显式注入 `VITE_SENTRY_DSN` 且运行在 production 时才会初始化；未配置 DSN 时保持本地日志，不把「未开 Sentry」当作故障。若启用 Sentry，须同步把 DSN 主机加入 CSP `connect-src` 并做一次线上报活。

## 本地准备

```bash
npm install
cp .env.example .env
```

`.env` 只用于本地接口验证或脚本测试，不作为 Cloudflare Pages 的 LLM 生产配置来源。不要提交真实 API key。

## 构建

本地完整门禁 + 构建（开发/发版推荐）：

```bash
npm run build
```

仅产物构建（**Vercel / 纯静态宿主**使用；不重复跑 `prebuild` 里的 security/quality 门禁）：

```bash
npm run build:app
```

`vercel.json` 的 `buildCommand` 必须是 `npm run build:app`。`npm run build` 会经 `prebuild` 跑完整 `ci:security` + `ci:quality`，适合本地与 CI，不适合作为 Vercel 构建命令（易把格式/lint 门禁失败当成部署失败）。

构建完成后确认 `dist/` 存在，且 `dist/_headers` 的 CSP `connect-src` 包含 `https://new.hongecb.store`。
生产环境不应在 `connect-src` 中放行 OpenAI、Gemini、腾讯混元等模型直连域；LLM 统一通过 new-api 中转站治理。

## 部署到 Cloudflare Pages

从仓库根目录执行部署：

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

若需直接验证 new-api，只在可信本地终端使用 key：

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

在 new-api 后台检查 API key 是否有效、是否在模型白名单内、额度是否耗尽、是否过期。也确认浏览器设置页保存的是当前用户可用 key。

### 模型请求 429

检查 new-api 后台的 key、账号、模型额度或限流策略。

### 浏览器 CORS 报错

确认 new-api 服务允许当前站点来源。

### CSP 阻止请求

检查 `public/_headers` 和 `vercel.json`，确保 `connect-src` 保留 `https://new.hongecb.store`。修改后重新构建并部署。

## 维护规则

- 不要把生产 LLM API key 写入仓库、Cloudflare Pages secrets、`.env` 示例、前端默认配置或文档。
- 不要恢复旧的服务端代理链路或 `_routes.json` 函数路由。
- 不要把浏览器 `SecureStorage` 当作认证/授权系统；生产权限、额度和日志应在 new-api 后台治理。
- 新增模型或调整模型权限，应优先在 new-api 后台完成。
- 若新增可浏览器直连服务，先更新 `src/common/config/apiEndpoints.ts` 中的端点策略，再同步响应头。
