# LLM连接问题全面诊断报告

## 📋 问题概述

**症状**: 测试环境和开发环境都无法连接大模型  
**端点**: `https://ai-gateway.earshore.workers.dev`  
**API Key**: `AI2026`  
**模型**: `glm-4.5-air` (注意: 代码中使用的是 `glm-4-air`)

---

## 🔍 根本原因分析

### 1. **模型名称不匹配** ⚠️ 高优先级

**问题**: 
- 用户提供的模型名称: `glm-4.5-air`
- 测试工具中使用的: `glm-4-air`

**影响**: 如果API网关不支持 `glm-4.5-air` 或 `glm-4-air`，会导致400或404错误

**解决方案**:
```javascript
// 需要确认正确的模型名称
// 可能的正确名称:
// - glm-4-air
// - glm-4.5-air  
// - glm-4
// - glm-4-plus
```

---

### 2. **环境配置缺失** ⚠️ 高优先级

**问题**: 项目中没有 `.env.development` 或 `.env.production` 文件

**当前状态**:
```bash
# 只存在示例文件
.env.example
```

**影响**: 
- `VITE_APP_ENV` 未设置，默认为 `production`
- `VITE_API_BASE_URL` 未设置，默认为 `/v1`
- 可能导致环境判断错误

**解决方案**:
```bash
# 创建开发环境配置
cp .env.example .env.development

# 创建生产环境配置  
cp .env.example .env.production
```

**开发环境配置** (`.env.development`):
```env
VITE_APP_ENV=development
VITE_API_BASE_URL=/v1
VITE_API_TIMEOUT=60000
VITE_ENABLE_MONITORING=true
VITE_ENABLE_DEBUG=true
VITE_LOG_LEVEL=debug
VITE_ENABLE_PERFORMANCE=true
```

**生产环境配置** (`.env.production`):
```env
VITE_APP_ENV=production
VITE_API_BASE_URL=/v1
VITE_API_TIMEOUT=30000
VITE_ENABLE_MONITORING=true
VITE_ENABLE_DEBUG=false
VITE_LOG_LEVEL=error
VITE_ENABLE_PERFORMANCE=true
```

---

### 3. **Cloudflare Functions环境变量未配置** ⚠️ 高优先级

**问题**: Cloudflare Pages需要配置环境变量才能正常工作

**必需的环境变量**:

#### 方案A: 服务器托管Key模式
```bash
# Cloudflare Pages 环境变量配置
LLM_API_BASE_URL=https://api.example.com/v1
LLM_API_KEY=sk-your-real-api-key-here
AUTH_PASSWORD=AI2026
```

#### 方案B: 用户自带Key模式
```bash
# Cloudflare Pages 环境变量配置
LLM_API_BASE_URL=https://api.example.com/v1
# 不设置 LLM_API_KEY，让用户提供
```

**配置步骤**:
1. 登录 Cloudflare Dashboard
2. 进入 Pages 项目
3. Settings → Environment variables
4. 添加上述变量
5. 重新部署项目

---

### 4. **API端点标准化逻辑问题** ⚠️ 中优先级

**问题位置**: `src/common/config/envConfig.ts` 第52-70行

```typescript
normalizeEndpoint(endpoint: string): string {
  // 开发环境: 统一使用代理路径
  if (EnvConfig.isDevelopment) {
    return this.baseUrl;  // 返回 /v1
  }
  
  // 生产环境: 
  if (endpoint && (endpoint.startsWith('http://') || endpoint.startsWith('https://'))) {
    let normalizedUrl = endpoint.trim();
    if (normalizedUrl.endsWith('/v1')) {
      normalizedUrl = normalizedUrl.slice(0, -3);
    }
    return normalizedUrl;
  }
  
  return this.baseUrl;
}
```

**问题分析**:

1. **开发环境问题**:
   - 总是返回 `/v1`，忽略用户配置的完整URL
   - 导致请求发送到 `http://localhost:5173/v1/chat/completions`
   - 而不是 `https://ai-gateway.earshore.workers.dev/chat/completions`

2. **生产环境问题**:
   - 会移除末尾的 `/v1`
   - `https://ai-gateway.earshore.workers.dev` → `https://ai-gateway.earshore.workers.dev`
   - 但如果端点本身就是 `https://api.example.com/v1`，会变成 `https://api.example.com`

**解决方案**:
```typescript
normalizeEndpoint(endpoint: string): string {
  // 如果用户配置了完整的URL，直接使用
  if (endpoint && (endpoint.startsWith('http://') || endpoint.startsWith('https://'))) {
    let normalizedUrl = endpoint.trim();
    // 移除末尾的 /v1 (如果存在)
    if (normalizedUrl.endsWith('/v1')) {
      normalizedUrl = normalizedUrl.slice(0, -3);
    }
    return normalizedUrl;
  }
  
  // 否则使用配置的基础路径
  return this.baseUrl;
}
```

---

### 5. **开发环境代理配置缺失** ⚠️ 中优先级

**问题**: 开发环境需要Vite代理配置才能转发到外部API

**当前状态**: 未找到 `vite.config.ts` 或 `vite.config.js`

**解决方案**: 创建 `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/v1': {
        target: 'https://ai-gateway.earshore.workers.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/v1/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
});
```

---

### 6. **生产环境安全检查过于严格** ⚠️ 低优先级

**问题位置**: `src/services/llmService.ts` 第75-88行

```typescript
// 🔒 P0修复: 生产环境安全检查
if (configCenter.isProduction() && isDangerousEndpoint(endpoint)) {
  const dangerousEndpoints = getDangerousEndpoints();
  throw new Error(
    '⛔ 安全限制: 生产环境禁止直接调用外部API\n\n' +
    '可能的原因:\n' +
    '1. 未配置代理服务器\n' +
    '2. API端点配置错误\n\n' +
    '解决方案:\n' +
    '- 请在设置中配置企业代理\n' +
    '- 或联系管理员配置 Cloudflare Workers 代理\n\n' +
    `检测到的危险端点: ${dangerousEndpoints.join(', ')}\n` +
    '这是为了保护您的API密钥安全。'
  );
}
```

**问题**: 
- `ai-gateway.earshore.workers.dev` 不在危险端点列表中
- 但如果用户配置了其他端点，可能会被拦截

**解决方案**: 将自定义网关添加到白名单:
```typescript
// src/common/config/apiEndpoints.ts
export const API_ENDPOINTS: Record<string, ApiEndpointConfig> = {
  // ... 其他配置
  customGateway: {
    domain: 'ai-gateway.earshore.workers.dev',
    requiresProxy: false,
    displayName: 'Custom AI Gateway',
    isDangerous: false  // 标记为安全
  }
};
```

---

### 7. **CSP策略限制** ⚠️ 低优先级

**问题位置**: `public/_headers`

**当前CSP配置**:
```
connect-src 'self' https://llm-gateway.hongecb.store https://api.hunyuan.cloud.tencent.com ...
```

**问题**: `ai-gateway.earshore.workers.dev` 不在 `connect-src` 白名单中

**解决方案**: 更新 `public/_headers`:
```
connect-src 'self' https://ai-gateway.earshore.workers.dev https://llm-gateway.hongecb.store ...
```

---

## 🛠️ 完整解决方案

### 步骤1: 创建环境配置文件

```bash
# 开发环境
cat > .env.development << 'EOF'
VITE_APP_ENV=development
VITE_API_BASE_URL=/v1
VITE_API_TIMEOUT=60000
VITE_ENABLE_DEBUG=true
VITE_LOG_LEVEL=debug
EOF

# 生产环境
cat > .env.production << 'EOF'
VITE_APP_ENV=production
VITE_API_BASE_URL=/v1
VITE_API_TIMEOUT=30000
VITE_ENABLE_DEBUG=false
VITE_LOG_LEVEL=error
EOF
```

### 步骤2: 创建Vite配置

```bash
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/v1': {
        target: 'https://ai-gateway.earshore.workers.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/v1/, ''),
      },
    },
  },
});
EOF
```

### 步骤3: 配置Cloudflare环境变量

在Cloudflare Pages Dashboard中添加:
```
LLM_API_BASE_URL=https://api.example.com/v1
AUTH_PASSWORD=AI2026
```

### 步骤4: 更新API端点配置

```typescript
// src/common/config/apiEndpoints.ts
export const API_ENDPOINTS: Record<string, ApiEndpointConfig> = {
  // ... 其他配置
  customGateway: {
    domain: 'ai-gateway.earshore.workers.dev',
    requiresProxy: false,
    displayName: 'Custom AI Gateway',
    isDangerous: false
  }
};
```

### 步骤5: 更新CSP策略

```
# public/_headers
connect-src 'self' https://ai-gateway.earshore.workers.dev ...
```

### 步骤6: 修复端点标准化逻辑

参见上文"API端点标准化逻辑问题"部分的解决方案

---

## 🧪 测试步骤

### 1. 使用诊断工具测试

打开 `test/llm-connection-test.html`:
```bash
# 开发环境
npm run dev
# 访问 http://localhost:5173/test/llm-connection-test.html

# 或直接在浏览器打开
open test/llm-connection-test.html
```

### 2. 测试流程

1. 选择环境 (开发/生产)
2. 输入端点: `https://ai-gateway.earshore.workers.dev`
3. 输入API Key: `AI2026`
4. 输入模型: `glm-4-air` (或 `glm-4.5-air`)
5. 点击"测试连接"
6. 点击"获取模型列表"
7. 点击"测试对话"

### 3. 预期结果

- ✅ 端点可达
- ✅ CORS配置正确
- ✅ 认证成功
- ✅ 获取模型列表成功
- ✅ 对话测试成功

---

## 📊 问题优先级总结

| 优先级 | 问题 | 影响 | 解决难度 |
|--------|------|------|----------|
| P0 | 模型名称不匹配 | 直接导致API调用失败 | 低 |
| P0 | 环境配置缺失 | 环境判断错误 | 低 |
| P0 | Cloudflare环境变量未配置 | 生产环境无法工作 | 低 |
| P1 | API端点标准化逻辑问题 | 开发环境请求错误 | 中 |
| P1 | 开发环境代理配置缺失 | 开发环境无法连接 | 中 |
| P2 | 生产环境安全检查 | 可能误拦截 | 低 |
| P2 | CSP策略限制 | 浏览器拦截请求 | 低 |

---

## 🎯 快速修复建议

**最小改动方案** (5分钟):

1. 创建 `.env.development`:
```bash
echo "VITE_APP_ENV=development" > .env.development
echo "VITE_API_BASE_URL=/v1" >> .env.development
```

2. 创建 `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
export default defineConfig({
  server: {
    proxy: {
      '/v1': {
        target: 'https://ai-gateway.earshore.workers.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/v1/, ''),
      },
    },
  },
});
```

3. 在系统设置中配置LLM:
   - Provider: Custom
   - Endpoint: `https://ai-gateway.earshore.workers.dev`
   - API Key: `AI2026`
   - Model: `glm-4-air` (确认正确的模型名称)

4. 重启开发服务器:
```bash
npm run dev
```

---

## 📝 后续建议

1. **确认模型名称**: 联系API网关提供商确认正确的模型名称
2. **监控日志**: 查看浏览器控制台和网络请求，确认实际发送的URL
3. **测试生产环境**: 部署到Cloudflare Pages后测试
4. **添加错误处理**: 改进错误提示，帮助用户快速定位问题
5. **文档完善**: 更新用户文档，说明如何配置自定义API网关

---

## 🔗 相关文件

- `src/services/llmService.ts` - LLM服务核心逻辑
- `src/common/config/envConfig.ts` - 环境配置
- `src/common/config/apiEndpoints.ts` - API端点配置
- `functions/v1/chat/completions.js` - Cloudflare Functions
- `public/_headers` - CSP策略
- `test/llm-connection-test.html` - 诊断工具

---

生成时间: 2026-02-25
