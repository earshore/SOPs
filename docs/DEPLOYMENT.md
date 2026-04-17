# 🚀 SOPs 项目部署指南

**版本**: 1.0.0  
**更新日期**: 2026-04-17  
**适用环境**: Cloudflare Pages

---

## 📋 目录

- [快速开始](#快速开始)
- [环境要求](#环境要求)
- [本地开发](#本地开发)
- [部署到 Cloudflare Pages](#部署到-cloudflare-pages)
- [环境变量配置](#环境变量配置)
- [网关配置](#网关配置)
- [常见问题](#常见问题)
- [故障排查](#故障排查)

---

## 🎯 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/earshore/SOPs.git
cd SOPs
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置必需的变量
# 至少需要配置 AUTH_PASSWORD 和一个网关
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

---

## 💻 环境要求

### 必需软件

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Git**: >= 2.0.0

### 推荐工具

- **Wrangler CLI**: Cloudflare Pages 部署工具
- **VS Code**: 推荐的代码编辑器

### 安装 Wrangler

```bash
npm install -g wrangler

# 登录 Cloudflare
wrangler login
```

---

## 🛠️ 本地开发

### 开发命令

```bash
# 启动开发服务器（带热重载）
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 运行测试
npm run test

# 代码检查
npm run lint

# 类型检查
npm run type-check
```

### 开发服务器配置

开发服务器默认运行在 `http://localhost:5173`

如需修改端口，编辑 `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: 3000, // 修改为你想要的端口
  },
});
```

---

## ☁️ 部署到 Cloudflare Pages

### 方式 1: 通过 Wrangler CLI（推荐）

#### 首次部署

```bash
# 1. 构建项目
npm run build

# 2. 部署到 Cloudflare Pages
npx wrangler pages deploy dist --project-name sops --branch main

# 3. 按提示完成配置
```

#### 后续部署

```bash
# 构建并部署
npm run build
npx wrangler pages deploy dist --project-name sops --branch main
```

### 方式 2: 通过 GitHub 集成（自动部署）

#### 1. 连接 GitHub 仓库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** 页面
3. 点击 **Create a project**
4. 选择 **Connect to Git**
5. 授权并选择 `earshore/SOPs` 仓库

#### 2. 配置构建设置

```yaml
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
Node version: 18
```

#### 3. 配置环境变量

在 Cloudflare Pages 项目设置中添加环境变量（见下文）

#### 4. 触发部署

推送代码到 GitHub 后自动触发部署：

```bash
git push origin main
```

---

## 🔐 环境变量配置

### 必需的环境变量

#### 1. AUTH_PASSWORD（必需）

统一访问密码，用于 API 认证。

```bash
AUTH_PASSWORD=your-secure-password
```

**安全建议**:
- 使用强密码（至少 16 位，包含大小写字母、数字、特殊字符）
- 不要使用默认密码
- 定期更换密码

#### 2. 网关配置（至少一个）

每个网关需要配置以下变量：

```bash
# 网关基础 URL（必需）
GATEWAY_{ID}_BASE_URL=https://your-gateway.com/v1

# 网关 API Key（必需）
GATEWAY_{ID}_API_KEY=sk-your-api-key

# 网关显示名称（可选，默认使用 ID）
GATEWAY_{ID}_DISPLAY_NAME=Your Gateway Name

# 网关协议（可选，默认 openai）
GATEWAY_{ID}_PROTOCOL=openai
```

**注意**:
- `{ID}` 必须全大写，如 `NEW_API`、`CPA`
- 实际使用时会转换为小写，如 `new_api`、`cpa`
- 下划线会保留，如 `NEW_API` → `new_api`

### 配置示例

#### .env 文件示例

```bash
# 统一访问密码
AUTH_PASSWORD=AI2027

# NEW API 网关（主网关）
GATEWAY_NEW_API_BASE_URL=https://new.hongecb.store/v1
GATEWAY_NEW_API_API_KEY=sk-1ZXVZdYINz22hL70US2UOBiwimwTZwjDrRYLHaFMR9s0ntPA
GATEWAY_NEW_API_DISPLAY_NAME=NEW API

# CPA 网关（备用网关）
GATEWAY_CPA_BASE_URL=https://cpa.hongecb.store/v1
GATEWAY_CPA_API_KEY=sk-EdUxVJC5gGHRG6g83
GATEWAY_CPA_DISPLAY_NAME=CPA Gateway
```

### 上传到 Cloudflare Pages

#### 方式 1: 使用 Wrangler CLI

```bash
# 1. 创建 secrets.json 文件
cat > secrets.json << EOF
{
  "AUTH_PASSWORD": "your-secure-password",
  "GATEWAY_NEW_API_BASE_URL": "https://new.hongecb.store/v1",
  "GATEWAY_NEW_API_API_KEY": "sk-xxx",
  "GATEWAY_NEW_API_DISPLAY_NAME": "NEW API",
  "GATEWAY_CPA_BASE_URL": "https://cpa.hongecb.store/v1",
  "GATEWAY_CPA_API_KEY": "sk-xxx",
  "GATEWAY_CPA_DISPLAY_NAME": "CPA Gateway"
}
EOF

# 2. 上传到 Production 环境
npx wrangler pages secret bulk secrets.json --project-name sops

# 3. 上传到 Preview 环境（可选）
npx wrangler pages secret bulk secrets.json --project-name sops --env preview

# 4. 删除临时文件
rm secrets.json
```

#### 方式 2: 通过 Cloudflare Dashboard

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** → 选择项目 **sops**
3. 进入 **Settings** → **Environment variables**
4. 选择环境（Production 或 Preview）
5. 点击 **Add variable** 逐个添加
6. 点击 **Save** 保存

### 查看已配置的环境变量

```bash
# 查看 Production 环境
npx wrangler pages secret list --project-name sops

# 查看 Preview 环境
npx wrangler pages secret list --project-name sops --env preview
```

---

## 🌐 网关配置

### 什么是网关？

网关是 LLM API 的代理服务，用于：
- 统一不同 LLM 提供商的 API 接口
- 负载均衡和故障转移
- API Key 管理和安全
- 请求缓存和优化

### 支持的网关协议

- **OpenAI**: 兼容 OpenAI API 格式（默认）
- **Anthropic**: 兼容 Anthropic API 格式

### 添加新网关

#### 1. 准备网关信息

- 网关基础 URL（如 `https://api.example.com/v1`）
- API Key（如 `sk-xxx`）
- 显示名称（如 `My Gateway`）
- 协议类型（`openai` 或 `anthropic`）

#### 2. 配置环境变量

```bash
# 创建配置文件
cat > new-gateway.json << EOF
{
  "GATEWAY_MYGATEWAY_BASE_URL": "https://api.example.com/v1",
  "GATEWAY_MYGATEWAY_API_KEY": "sk-xxx",
  "GATEWAY_MYGATEWAY_DISPLAY_NAME": "My Gateway",
  "GATEWAY_MYGATEWAY_PROTOCOL": "openai"
}
EOF

# 上传到 Cloudflare Pages
npx wrangler pages secret bulk new-gateway.json --project-name sops

# 清理临时文件
rm new-gateway.json
```

#### 3. 重新部署（触发环境变量更新）

```bash
npm run build
npx wrangler pages deploy dist --project-name sops --branch main
```

#### 4. 验证网关

```bash
# 获取网关列表
curl https://sops-3js.pages.dev/v1/gateways \
  -H "Authorization: Bearer YOUR_PASSWORD"

# 应该看到新添加的网关
```

### 删除网关

```bash
# 删除环境变量
npx wrangler pages secret delete GATEWAY_MYGATEWAY_BASE_URL --project-name sops
npx wrangler pages secret delete GATEWAY_MYGATEWAY_API_KEY --project-name sops
npx wrangler pages secret delete GATEWAY_MYGATEWAY_DISPLAY_NAME --project-name sops
npx wrangler pages secret delete GATEWAY_MYGATEWAY_PROTOCOL --project-name sops

# 重新部署
npm run build
npx wrangler pages deploy dist --project-name sops --branch main
```

### 网关命名规范

#### 推荐的 ID 命名

- 使用全大写字母
- 使用下划线分隔单词
- 简短且有意义

**示例**:
- `NEW_API` → `new_api`
- `CPA` → `cpa`
- `CLAUDE_PROXY` → `claude_proxy`
- `GPT_GATEWAY` → `gpt_gateway`

#### 不推荐的命名

- ❌ `gateway1`（无意义）
- ❌ `my-gateway`（使用连字符）
- ❌ `MyGateway`（混合大小写）

---

## ❓ 常见问题

### Q1: 部署后网关列表为空？

**原因**: 环境变量未配置或未生效

**解决**:
1. 检查环境变量是否正确配置
2. 确认环境变量格式正确（`GATEWAY_{ID}_BASE_URL`）
3. 重新部署触发环境变量更新

```bash
# 检查环境变量
npx wrangler pages secret list --project-name sops

# 重新部署
npm run build
npx wrangler pages deploy dist --project-name sops --branch main
```

### Q2: 提示"未知网关"错误？

**原因**: 网关 ID 不匹配

**解决**:
1. 检查环境变量中的网关 ID
2. 确认前端使用的网关 ID 与环境变量一致
3. 网关 ID 区分大小写（环境变量大写，使用时小写）

```bash
# 查看可用网关
curl https://your-domain.pages.dev/v1/gateways \
  -H "Authorization: Bearer YOUR_PASSWORD"
```

### Q3: API 返回 401 错误？

**原因**: AUTH_PASSWORD 不正确

**解决**:
1. 检查 `AUTH_PASSWORD` 环境变量
2. 确认前端使用的密码与环境变量一致
3. 密码区分大小写

### Q4: 本地开发时网关不可用？

**原因**: 本地 `.env` 文件未配置

**解决**:
1. 复制 `.env.example` 为 `.env`
2. 配置必需的环境变量
3. 重启开发服务器

```bash
cp .env.example .env
# 编辑 .env 文件
npm run dev
```

### Q5: 部署后修改环境变量不生效？

**原因**: 环境变量更新需要重新部署

**解决**:
修改环境变量后必须重新部署：

```bash
npm run build
npx wrangler pages deploy dist --project-name sops --branch main
```

### Q6: Preview 和 Production 环境配置不同？

**原因**: 两个环境的环境变量是独立的

**解决**:
分别为两个环境配置环境变量：

```bash
# Production 环境
npx wrangler pages secret bulk secrets.json --project-name sops

# Preview 环境
npx wrangler pages secret bulk secrets.json --project-name sops --env preview
```

---

## 🔧 故障排查

### 检查清单

#### 1. 环境变量检查

```bash
# 查看 Production 环境变量
npx wrangler pages secret list --project-name sops

# 查看 Preview 环境变量
npx wrangler pages secret list --project-name sops --env preview
```

**必需的变量**:
- ✅ `AUTH_PASSWORD`
- ✅ `GATEWAY_{ID}_BASE_URL`（至少一个）
- ✅ `GATEWAY_{ID}_API_KEY`（至少一个）

#### 2. 网关配置检查

```bash
# 测试网关列表 API
curl https://your-domain.pages.dev/v1/gateways \
  -H "Authorization: Bearer YOUR_PASSWORD"

# 预期响应
{
  "gateways": [
    {
      "id": "new_api",
      "name": "NEW API",
      "endpoint": "https://...",
      "protocol": "openai"
    }
  ],
  "count": 1
}
```

#### 3. API 端点检查

```bash
# 测试模型列表
curl https://your-domain.pages.dev/v1/models \
  -H "Authorization: Bearer YOUR_PASSWORD" \
  -H "X-Gateway-Provider: new_api"

# 测试对话 API
curl https://your-domain.pages.dev/v1/chat/completions \
  -H "Authorization: Bearer YOUR_PASSWORD" \
  -H "X-Gateway-Provider: new_api" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hello"}]}'
```

#### 4. 构建检查

```bash
# 清理并重新构建
rm -rf dist node_modules
npm install
npm run build

# 检查构建输出
ls -la dist/
```

#### 5. 部署日志检查

```bash
# 查看最近的部署
npx wrangler pages deployment list --project-name sops

# 查看部署详情
npx wrangler pages deployment tail --project-name sops
```

### 常见错误及解决方案

#### 错误 1: `Module not found`

**原因**: 依赖未安装或版本不兼容

**解决**:
```bash
rm -rf node_modules package-lock.json
npm install
```

#### 错误 2: `Build failed`

**原因**: TypeScript 类型错误或语法错误

**解决**:
```bash
# 检查类型错误
npm run type-check

# 检查语法错误
npm run lint
```

#### 错误 3: `502 Bad Gateway`

**原因**: 上游网关服务不可用

**解决**:
1. 检查网关 URL 是否正确
2. 检查网关服务是否在线
3. 检查 API Key 是否有效
4. 尝试使用其他网关

#### 错误 4: `CORS Error`

**原因**: 跨域配置问题

**解决**:
检查 `functions/v1/_shared/` 中的 CORS 配置：

```javascript
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Gateway-Provider",
};
```

---

## 📚 相关文档

### 核心文档
- [README.md](../README.md) - 项目概述
- [CHANGELOG.md](../CHANGELOG.md) - 更新日志
- [CONTRIBUTING.md](../.kiro/CONTRIBUTING.md) - 贡献指南

### 技术文档
- [网关维护指南](./guides/gateway-maintenance-guide.md)
- [网关优化方案](../.kiro/gateway-optimization-proposal.md)
- [API 文档](./api/README.md)

### 快速参考
- [文档索引](./INDEX.md)
- [快速参考](./QUICK_REFERENCE.md)

---

## 🆘 获取帮助

### 问题反馈

如遇到问题，请：

1. 查看本文档的[常见问题](#常见问题)和[故障排查](#故障排查)
2. 查看 [GitHub Issues](https://github.com/earshore/SOPs/issues)
3. 提交新的 Issue（请提供详细信息）

### 提交 Issue 时请包含

- 操作系统和版本
- Node.js 和 npm 版本
- 错误信息和堆栈跟踪
- 复现步骤
- 相关配置（隐藏敏感信息）

### 联系方式

- GitHub: https://github.com/earshore/SOPs
- Issues: https://github.com/earshore/SOPs/issues

---

## 📝 更新日志

### v1.0.0 (2026-04-17)

- ✅ 初始版本
- ✅ 完整的部署指南
- ✅ 环境变量配置说明
- ✅ 网关配置指南
- ✅ 常见问题和故障排查

---

**文档维护者**: Claude (Opus 4.6)  
**最后更新**: 2026-04-17  
**文档版本**: 1.0.0
