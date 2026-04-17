# 🚀 快速开始指南

欢迎使用 SOPs - 亚马逊运营管理平台！本指南将帮助你在 5 分钟内完成部署。

---

## 📋 前置要求

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Cloudflare 账号**（用于部署）

---

## ⚡ 快速部署（3 步）

### 1️⃣ 克隆并安装

```bash
# 克隆项目
git clone https://github.com/earshore/SOPs.git
cd SOPs

# 安装依赖
npm install
```

### 2️⃣ 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，至少修改以下内容：
# - AUTH_PASSWORD: 改为你的密码
# - GATEWAY_NEW_API_API_KEY: 改为你的 API Key
```

**最小配置示例**：
```bash
AUTH_PASSWORD=your-secure-password

GATEWAY_NEW_API_BASE_URL=https://new.hongecb.store/v1
GATEWAY_NEW_API_API_KEY=sk-your-api-key-here
GATEWAY_NEW_API_DISPLAY_NAME=NEW API
```

### 3️⃣ 本地运行

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

---

## ☁️ 部署到 Cloudflare Pages

### 方式 1: 使用 Wrangler CLI（推荐）

```bash
# 1. 安装 Wrangler
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 构建项目
npm run build

# 4. 部署
npx wrangler pages deploy dist --project-name sops --branch main

# 5. 上传环境变量
cat > secrets.json << EOF
{
  "AUTH_PASSWORD": "your-secure-password",
  "GATEWAY_NEW_API_BASE_URL": "https://new.hongecb.store/v1",
  "GATEWAY_NEW_API_API_KEY": "sk-your-api-key-here",
  "GATEWAY_NEW_API_DISPLAY_NAME": "NEW API"
}
EOF

npx wrangler pages secret bulk secrets.json --project-name sops
rm secrets.json

# 6. 重新部署（使环境变量生效）
npx wrangler pages deploy dist --project-name sops --branch main
```

### 方式 2: 通过 GitHub 集成（自动部署）

1. Fork 本项目到你的 GitHub
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. Pages → Create a project → Connect to Git
4. 选择你 Fork 的仓库
5. 配置构建设置：
   - Framework: Vite
   - Build command: `npm run build`
   - Build output: `dist`
6. 在 Settings → Environment variables 中添加环境变量
7. 推送代码触发自动部署

---

## ✅ 验证部署

```bash
# 测试网关列表 API
curl https://your-domain.pages.dev/v1/gateways \
  -H "Authorization: Bearer your-password"

# 预期响应
{
  "gateways": [
    {
      "id": "new_api",
      "name": "NEW API",
      "endpoint": "https://new.hongecb.store/v1",
      "protocol": "openai"
    }
  ],
  "count": 1
}
```

---

## 🎯 下一步

### 添加更多网关

只需添加环境变量，无需修改代码：

```bash
# 创建新网关配置
cat > new-gateway.json << EOF
{
  "GATEWAY_CPA_BASE_URL": "https://cpa.hongecb.store/v1",
  "GATEWAY_CPA_API_KEY": "sk-your-key",
  "GATEWAY_CPA_DISPLAY_NAME": "CPA Gateway"
}
EOF

# 上传到 Cloudflare
npx wrangler pages secret bulk new-gateway.json --project-name sops
rm new-gateway.json

# 重新部署
npm run build
npx wrangler pages deploy dist --project-name sops --branch main
```

### 自定义配置

- 修改主题：编辑 `src/common/config/design-tokens.ts`
- 添加模块：在 `src/modules/` 下创建新模块
- 修改路由：编辑 `src/common/config/menuConfig.ts`

---

## 📚 完整文档

- [完整部署指南](./DEPLOYMENT.md) - 详细的部署说明
- [网关维护指南](./guides/gateway-maintenance-guide.md) - 网关配置详解
- [快速参考](./QUICK_REFERENCE.md) - 常用命令和配置
- [文档索引](./INDEX.md) - 所有文档列表

---

## ❓ 常见问题

### Q: 部署后网关列表为空？

**A**: 检查环境变量是否正确配置，并重新部署：

```bash
# 检查环境变量
npx wrangler pages secret list --project-name sops

# 重新部署
npm run build
npx wrangler pages deploy dist --project-name sops --branch main
```

### Q: 提示 401 错误？

**A**: 检查 `AUTH_PASSWORD` 是否正确配置，前端输入的密码需要与环境变量一致。

### Q: 本地开发时网关不可用？

**A**: 确保 `.env` 文件已正确配置，并重启开发服务器。

---

## 🆘 获取帮助

- 查看 [完整文档](./DEPLOYMENT.md)
- 提交 [GitHub Issue](https://github.com/earshore/SOPs/issues)
- 查看 [故障排查指南](./DEPLOYMENT.md#故障排查)

---

**祝你使用愉快！** 🎉
