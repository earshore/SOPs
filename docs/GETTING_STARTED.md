# 快速开始

本项目当前按 Cloudflare Pages 静态部署：静态页面由 Pages 托管，生产 LLM 请求由浏览器直接调用自部署 new-api 中转站 `https://new.hongecb.store/v1`。

## 本地运行

```bash
npm install
cp .env.example .env
npm run dev
```

打开 Vite 输出的本地地址。`.env` 仅用于本地接口验证或脚本测试，不要提交真实 API key。

## 构建

```bash
npm run build
```

构建产物在 `dist/`。

## 部署

```bash
npx wrangler whoami
npx wrangler pages deploy dist --project-name sops --branch main
```

如未登录 Cloudflare：

```bash
npx wrangler login
```

## 验证

```bash
curl -I https://sops.hongecb.store
```

确认 CSP `connect-src` 允许 `https://new.hongecb.store`。模型白名单、额度、过期时间、限流和日志仍在 new-api 后台管理。

更多细节见 [部署指南](./DEPLOYMENT.md)。
