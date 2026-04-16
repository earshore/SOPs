# 网关维护步骤指南

**版本**: 1.0  
**最后更新**: 2026-04-17  
**适用范围**: sops 项目 LLM 网关管理

---

## 📚 目录

1. [概述](#概述)
2. [架构说明](#架构说明)
3. [新增网关](#新增网关)
4. [更新网关](#更新网关)
5. [删除网关](#删除网关)
6. [故障排查](#故障排查)
7. [维护检查清单](#维护检查清单)
8. [最佳实践](#最佳实践)

---

## 概述

### 什么是网关

网关（Gateway）是 LLM API 的代理服务，负责：
- 转发前端请求到上游 LLM 服务
- 保护 API Key 不暴露到前端
- 提供统一的认证机制
- 支持多个 LLM 提供商

### 网关架构

```
用户浏览器
  │  Authorization: Bearer <AUTH_PASSWORD>
  │  X-Gateway-Provider: <provider_id>
  ▼
Cloudflare Functions (/v1/*)
  │  验证 AUTH_PASSWORD
  │  查路由表 → 获取真实 baseURL + apiKey
  ▼
上游 LLM 网关 (OpenAI 兼容)
```

### 核心原则

1. **前端只持有统一密码** - 不暴露真实 API Key
2. **相对路径请求** - 前端只请求 `/v1/*`
3. **Cloudflare 代理** - 所有请求经 CF Functions 转发
4. **环境变量配置** - 网关配置存储在环境变量中

---

## 架构说明

### 文件结构

```
sops/
├── src/
│   ├── common/
│   │   ├── constants/
│   │   │   └── constants.ts          # 前端网关配置
│   │   └── config/
│   │       ├── apiEndpoints.ts       # API 端点白名单
│   │       └── envConfig.ts          # 环境配置
│   └── services/
│       └── llmService.ts             # LLM 服务
├── functions/
│   └── v1/
│       ├── chat/
│       │   └── completions.js        # 对话 API 代理
│       └── models.js                 # 模型列表 API 代理
├── .env                              # 本地环境变量
└── .env.example                      # 环境变量模板
```

### 配置层级

1. **前端配置** (`constants.ts`)
   - 网关显示名称
   - 支持的模型列表
   - 功能特性

2. **路由配置** (`completions.js`, `models.js`)
   - 网关 URL 映射
   - API Key 映射
   - 请求转发逻辑

3. **安全配置** (`apiEndpoints.ts`)
   - 域名白名单
   - 危险端点标记
   - 代理需求标记

4. **环境变量** (`.env`, Cloudflare Pages)
   - 网关 Base URL
   - 网关 API Key
   - 统一访问密码

---

## 新增网关

### 步骤概览

新增一个网关需要修改 **4 个文件** + 配置 **环境变量**。

### 步骤 1: 注册前端配置

**文件**: `src/common/constants/constants.ts`

在 `PROVIDERS` 对象中新增：

```typescript
export const PROVIDERS = {
  // ... 现有网关
  
  // 新增网关
  your_gateway: {
    name: "Your Gateway",
    endpoint: "https://your-gateway.example.com/v1",
    models: [
      { 
        id: "gpt-4", 
        context: 128000, 
        features: ["function", "vision"] 
      },
      { 
        id: "gpt-3.5-turbo", 
        context: 16000, 
        features: ["function"] 
      },
    ],
  },
};
```

**注意事项**:
- `key` (如 `your_gateway`) 是 `provider_id`，全局唯一
- 只能包含小写字母和下划线
- `endpoint` 仅用于展示，不参与实际请求
- `features` 可选值: `"function"`, `"vision"`, `"audio"`, `"code"`

---

### 步骤 2: 注册 Cloudflare Functions 路由

**文件**: `functions/v1/chat/completions.js` 和 `functions/v1/models.js`

在两个文件的 `resolveGateway()` 函数中，找到 `map` 对象并新增：

```javascript
function resolveGateway(provider, env) {
  const map = {
    // ... 现有网关
    
    // 新增网关
    your_gateway: {
      baseUrl: env.GATEWAY_YOUR_GATEWAY_BASE_URL || "https://your-gateway.example.com/v1",
      apiKey: env.GATEWAY_YOUR_GATEWAY_API_KEY || "",
    },
  };
  
  return map[provider] || null;
}
```

**注意事项**:
- 环境变量命名: `GATEWAY_` + provider_id 全大写 + `_BASE_URL` / `_API_KEY`
- 两个文件必须**同步修改**
- `|| ""` 的 fallback 留空，CF 会在缺失时返回错误

---

### 步骤 3: 更新 API 端点白名单

**文件**: `src/common/config/apiEndpoints.ts`

在 `API_ENDPOINTS` 对象中新增：

```typescript
export const API_ENDPOINTS: Record<string, ApiEndpointConfig> = {
  // ... 现有端点
  
  // 新增网关
  your_gateway: {
    domain: 'your-gateway.example.com',
    requiresProxy: false,
    displayName: 'Your Gateway',
    isDangerous: false,  // 必须为 false
  },
};
```

**注意事项**:
- `isDangerous` 必须为 `false`（经 CF 代理，非直连）
- `domain` 只填域名，不含 `https://` 和路径
- 如果误填 `isDangerous: true`，生产环境会拦截请求

---

### 步骤 4: 配置本地环境变量

**文件**: `.env` (不提交到 Git)

```env
# Your Gateway
GATEWAY_YOUR_GATEWAY_BASE_URL = https://your-gateway.example.com/v1
GATEWAY_YOUR_GATEWAY_API_KEY  = sk-xxxxxxxxxxxxxxxx
```

**测试本地配置**:

```bash
# 启动开发服务器
npm run dev

# 在浏览器中测试网关连接
# 系统设置 → 选择 "Your Gateway" → 测试连接
```

---

### 步骤 5: 同步到 Cloudflare Pages

**生产部署必须执行此步骤！**

#### 方法 1: 使用 Wrangler CLI (推荐)

创建临时文件 `secrets.json`:

```json
{
  "GATEWAY_YOUR_GATEWAY_BASE_URL": "https://your-gateway.example.com/v1",
  "GATEWAY_YOUR_GATEWAY_API_KEY": "sk-xxxxxxxxxxxxxxxx"
}
```

上传并删除:

```bash
# 上传环境变量
npx wrangler pages secret bulk secrets.json --project-name sops

# 删除临时文件
rm secrets.json  # Linux/Mac
del secrets.json # Windows
```

#### 方法 2: 使用部署脚本

```bash
npm run deploy:env -- --project-name sops --env production
```

#### 方法 3: 手动在 Cloudflare 控制台配置

1. 登录 Cloudflare Dashboard
2. 进入 Pages → sops 项目
3. Settings → Environment Variables
4. 添加变量:
   - `GATEWAY_YOUR_GATEWAY_BASE_URL`
   - `GATEWAY_YOUR_GATEWAY_API_KEY`

---

### 步骤 6: 重新部署

```bash
# 构建
npm run build

# 部署到 Cloudflare Pages
npx wrangler pages deploy dist --project-name sops --branch main
```

---

### 验证清单

- [ ] `constants.ts` 中已添加网关配置
- [ ] `completions.js` 中已添加路由
- [ ] `models.js` 中已添加路由
- [ ] `apiEndpoints.ts` 中已添加端点
- [ ] `.env` 中已配置环境变量
- [ ] Cloudflare Pages 环境变量已同步
- [ ] 本地测试通过
- [ ] 生产环境测试通过

---

## 更新网关

### 更新 URL

**场景**: 网关域名或路径变更

1. 更新 `constants.ts` 中的 `endpoint`
2. 更新 `completions.js` 和 `models.js` 中的 `baseUrl` fallback
3. 更新 `apiEndpoints.ts` 中的 `domain`
4. 更新 `.env` 中的 `GATEWAY_*_BASE_URL`
5. 更新 Cloudflare Pages 环境变量
6. 重新部署

### 更新 API Key

**场景**: API Key 过期或轮换

1. 更新 `.env` 中的 `GATEWAY_*_API_KEY`
2. 更新 Cloudflare Pages 环境变量:

```bash
# 单个变量更新
npx wrangler pages secret put GATEWAY_YOUR_GATEWAY_API_KEY --project-name sops
# 输入新的 API Key
```

3. 无需重新部署（环境变量立即生效）

### 更新模型列表

**场景**: 网关支持新模型

1. 更新 `constants.ts` 中的 `models` 数组:

```typescript
your_gateway: {
  name: "Your Gateway",
  endpoint: "https://your-gateway.example.com/v1",
  models: [
    // 新增模型
    { 
      id: "gpt-4-turbo", 
      context: 128000, 
      features: ["function", "vision"] 
    },
    // 现有模型
    { id: "gpt-4", context: 128000, features: ["function"] },
  ],
},
```

2. 重新构建和部署

### 更新显示名称

**场景**: 更改网关在 UI 中的显示名称

1. 更新 `constants.ts` 中的 `name`
2. 更新 `apiEndpoints.ts` 中的 `displayName`
3. 重新构建和部署

---

## 删除网关

### 步骤 1: 移除前端配置

**文件**: `src/common/constants/constants.ts`

删除或注释掉对应的网关配置:

```typescript
export const PROVIDERS = {
  // your_gateway: {  // 已删除
  //   name: "Your Gateway",
  //   ...
  // },
};
```

### 步骤 2: 移除路由配置

**文件**: `functions/v1/chat/completions.js` 和 `functions/v1/models.js`

删除 `resolveGateway()` 中的对应项:

```javascript
function resolveGateway(provider, env) {
  const map = {
    // your_gateway: { ... },  // 已删除
  };
  return map[provider] || null;
}
```

### 步骤 3: 移除端点配置

**文件**: `src/common/config/apiEndpoints.ts`

删除对应的端点:

```typescript
export const API_ENDPOINTS = {
  // your_gateway: { ... },  // 已删除
};
```

### 步骤 4: 清理环境变量

**本地**:

从 `.env` 中删除:

```env
# GATEWAY_YOUR_GATEWAY_BASE_URL = ...  # 已删除
# GATEWAY_YOUR_GATEWAY_API_KEY = ...   # 已删除
```

**Cloudflare Pages**:

```bash
# 删除环境变量
npx wrangler pages secret delete GATEWAY_YOUR_GATEWAY_BASE_URL --project-name sops
npx wrangler pages secret delete GATEWAY_YOUR_GATEWAY_API_KEY --project-name sops
```

或在 Cloudflare 控制台手动删除。

### 步骤 5: 重新部署

```bash
npm run build
npx wrangler pages deploy dist --project-name sops --branch main
```

---

## 故障排查

### CORS 错误

**症状**:
```
Access to fetch at 'https://...' has been blocked by CORS policy
```

**原因**: 请求绕过了 CF Functions，直接访问外部 URL

**解决方案**:
1. 检查 `envConfig.ts` 的 `normalizeEndpoint()` 必须返回相对路径
2. 确认前端没有直接使用完整 URL

### 401 访问被拒绝

**症状**:
```
⛔ 访问被拒绝：请输入正确的访问密码
```

**原因**: 前端 API Key 与 `AUTH_PASSWORD` 不匹配

**解决方案**:
1. 检查系统设置中的 API Key
2. 确认与 `.env` 中的 `AUTH_PASSWORD` 一致
3. 确认 Cloudflare Pages 环境变量已设置

### 网关 API Key 未配置

**症状**:
```
⛔ 网关 xxx 未配置 API Key，请检查 Cloudflare 环境变量
```

**原因**: CF Pages 环境变量中缺少 `GATEWAY_*_API_KEY`

**解决方案**:
```bash
npx wrangler pages secret put GATEWAY_XXX_API_KEY --project-name sops
```

### 未知网关标识

**症状**:
```
⛔ 未知网关标识: xxx，支持: ...
```

**原因**: 
- 只改了 `constants.ts`，忘记同步 `completions.js` / `models.js`
- provider_id 拼写不一致

**解决方案**:
1. 确保三处 provider_id 完全一致（大小写敏感）
2. 检查 `completions.js` 和 `models.js` 都已更新

### 模型列表正常但对话失败

**原因**: `models.js` 和 `completions.js` 路由配置不一致

**解决方案**:
1. 对比两个文件的 `resolveGateway()` 函数
2. 确保配置完全同步

### 生产环境拦截请求

**症状**:
```
Dangerous endpoint detected in production
```

**原因**: `apiEndpoints.ts` 中 `isDangerous: true`

**解决方案**:
1. 将 `isDangerous` 改为 `false`
2. 重新部署

---

## 维护检查清单

### 日常检查

- [ ] 所有网关连接正常
- [ ] API Key 未过期
- [ ] 环境变量同步（本地 vs 生产）
- [ ] 无 CORS 错误
- [ ] 无认证失败

### 月度检查

- [ ] 审查网关使用情况
- [ ] 清理未使用的网关
- [ ] 更新过期的 API Key
- [ ] 检查网关性能
- [ ] 更新文档

### 季度检查

- [ ] 审查网关架构
- [ ] 评估新网关接入需求
- [ ] 优化路由配置
- [ ] 更新安全策略
- [ ] 培训团队成员

---

## 最佳实践

### 命名规范

1. **provider_id**: 
   - 只用小写字母和下划线
   - 简短且有意义
   - 例如: `openai`, `claude`, `deepseek`

2. **环境变量**:
   - 格式: `GATEWAY_{ID}_BASE_URL` / `GATEWAY_{ID}_API_KEY`
   - ID 部分全大写
   - 例如: `GATEWAY_OPENAI_BASE_URL`

3. **显示名称**:
   - 用户友好
   - 简洁明了
   - 例如: "OpenAI", "Claude Gateway"

### 安全实践

1. **API Key 管理**:
   - 永远不要提交到 Git
   - 使用环境变量
   - 定期轮换
   - 使用强密码

2. **访问控制**:
   - 统一使用 `AUTH_PASSWORD`
   - 不暴露真实 API Key 到前端
   - 所有请求经 CF Functions 代理

3. **错误处理**:
   - 不在错误信息中暴露敏感信息
   - 记录详细日志用于调试
   - 提供用户友好的错误提示

### 配置管理

1. **环境变量**:
   - 本地开发使用 `.env`
   - 生产环境使用 Cloudflare Pages 环境变量
   - 保持两者同步

2. **版本控制**:
   - 提交 `.env.example` 作为模板
   - 不提交 `.env` 到 Git
   - 在 README 中说明配置步骤

3. **文档维护**:
   - 及时更新网关列表
   - 记录配置变更
   - 提供故障排查指南

### 测试流程

1. **本地测试**:
   - 配置 `.env`
   - 启动开发服务器
   - 测试网关连接
   - 测试模型列表
   - 测试对话功能

2. **生产测试**:
   - 部署到 Cloudflare Pages
   - 验证环境变量
   - 测试所有网关
   - 监控错误日志

3. **回归测试**:
   - 测试现有网关不受影响
   - 验证新网关功能正常
   - 检查性能指标

---

## 相关文档

- [LLM 网关接入指南](./llm-gateway-integration-guide.md) - 详细的接入步骤
- [API 端点配置](../../src/common/config/apiEndpoints.ts) - 端点白名单
- [环境配置](../../src/common/config/envConfig.ts) - 环境变量管理
- [LLM 服务](../../src/services/llmService.ts) - LLM 服务实现

---

## 附录

### 当前已接入网关

| provider_id | 显示名称 | Base URL | 状态 |
|-------------|---------|----------|------|
| `new_api` | NEW API | `https://new.hongecb.store/v1` | ✅ 活跃 |
| `cpa` | CPA Gateway | `https://cpa.hongecb.store/v1` | ✅ 活跃 |

### 环境变量模板

```env
# 统一访问密码
AUTH_PASSWORD = your-password-here

# 网关配置模板
GATEWAY_{ID}_BASE_URL = https://your-gateway.example.com/v1
GATEWAY_{ID}_API_KEY = sk-your-api-key
GATEWAY_{ID}_DISPLAY_NAME = Your Gateway Name (可选)
GATEWAY_{ID}_PROTOCOL = openai (可选，默认 openai)
```

### 常用命令

```bash
# 本地开发
npm run dev

# 构建
npm run build

# 部署
npx wrangler pages deploy dist --project-name sops

# 环境变量管理
npx wrangler pages secret list --project-name sops
npx wrangler pages secret put KEY_NAME --project-name sops
npx wrangler pages secret delete KEY_NAME --project-name sops
npx wrangler pages secret bulk secrets.json --project-name sops

# 部署环境变量
npm run deploy:env -- --project-name sops --env production
```

---

**维护者**: sops 开发团队  
**最后更新**: 2026-04-17  
**版本**: 1.0
