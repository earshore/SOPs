# 网关配置系统优化 - 实施指南

**日期**: 2026-04-17  
**状态**: 准备实施

---

## 📋 已创建的文件

### 1. 后端文件（Cloudflare Functions）

#### `functions/v1/_shared/gateway-resolver.js`
- **功能**: 网关自动发现和解析核心模块
- **关键函数**:
  - `discoverGateways(env)` - 从环境变量自动发现所有网关
  - `resolveGateway(provider, env)` - 解析指定网关配置
  - `listGateways(env)` - 获取所有网关列表
  - `validateGateway(provider, env)` - 验证网关配置

#### `functions/v1/gateways.js`
- **功能**: 网关列表 API 端点
- **路由**: `GET /v1/gateways`
- **响应**: 返回所有可用网关的列表

#### `functions/v1/chat/completions-optimized.js`
- **功能**: 优化后的对话 API（使用自动发现）
- **改进**: 
  - 使用 `gateway-resolver` 自动发现网关
  - 更好的错误处理和验证
  - 返回可用网关列表

#### `functions/v1/models-optimized.js`
- **功能**: 优化后的模型列表 API
- **改进**: 与 completions 保持一致的逻辑

### 2. 前端文件

#### `src/services/gatewayService.ts`
- **功能**: 前端网关服务
- **特性**:
  - 动态加载网关列表
  - 5 分钟缓存
  - 自动 fallback 到默认配置
  - 防止重复请求

---

## 🚀 实施步骤

### 阶段 1: 部署后端（无破坏性）

#### 步骤 1.1: 部署新文件

```bash
# 1. 确认新文件已创建
ls functions/v1/_shared/gateway-resolver.js
ls functions/v1/gateways.js
ls functions/v1/chat/completions-optimized.js
ls functions/v1/models-optimized.js

# 2. 测试本地环境
npm run dev

# 3. 测试网关 API
curl http://localhost:5173/v1/gateways \
  -H "Authorization: Bearer YOUR_PASSWORD"

# 4. 构建
npm run build

# 5. 部署到 Cloudflare Pages
npx wrangler pages deploy dist --project-name sops --branch b-0417
```

#### 步骤 1.2: 验证新 API

```bash
# 测试网关列表 API
curl https://your-domain.pages.dev/v1/gateways \
  -H "Authorization: Bearer YOUR_PASSWORD"

# 预期响应:
# {
#   "gateways": [
#     {"id": "new_api", "name": "NEW API", "endpoint": "...", "protocol": "openai"},
#     {"id": "cpa", "name": "CPA Gateway", "endpoint": "...", "protocol": "openai"}
#   ],
#   "count": 2,
#   "timestamp": 1713312000000
# }
```

### 阶段 2: 切换到优化版本（可回滚）

#### 步骤 2.1: 备份现有文件

```bash
# 备份现有的 CF Functions
cp functions/v1/chat/completions.js functions/v1/chat/completions.backup.js
cp functions/v1/models.js functions/v1/models.backup.js
```

#### 步骤 2.2: 替换为优化版本

```bash
# 方式 1: 重命名（推荐，可快速回滚）
mv functions/v1/chat/completions.js functions/v1/chat/completions.old.js
mv functions/v1/chat/completions-optimized.js functions/v1/chat/completions.js

mv functions/v1/models.js functions/v1/models.old.js
mv functions/v1/models-optimized.js functions/v1/models.js

# 方式 2: 直接替换
# cp functions/v1/chat/completions-optimized.js functions/v1/chat/completions.js
# cp functions/v1/models-optimized.js functions/v1/models.js
```

#### 步骤 2.3: 重新部署

```bash
npm run build
npx wrangler pages deploy dist --project-name sops --branch b-0417
```

#### 步骤 2.4: 验证功能

```bash
# 测试对话 API
curl https://your-domain.pages.dev/v1/chat/completions \
  -H "Authorization: Bearer YOUR_PASSWORD" \
  -H "X-Gateway-Provider: new_api" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hello"}]}'

# 测试模型列表 API
curl https://your-domain.pages.dev/v1/models \
  -H "Authorization: Bearer YOUR_PASSWORD" \
  -H "X-Gateway-Provider: new_api"
```

### 阶段 3: 集成前端服务

#### 步骤 3.1: 在应用启动时初始化

```typescript
// src/main.ts
import { initGatewayService } from '@/services/gatewayService';

async function initApp() {
  // 初始化网关服务
  await initGatewayService();
  
  // 其他初始化...
  Alpine.start();
}

initApp();
```

#### 步骤 3.2: 更新系统设置 UI

```typescript
// src/components/settings/systemSettings.ts
import { gatewayService } from '@/services/gatewayService';

// 获取可用网关列表
const gateways = await gatewayService.fetchGateways();

// 渲染到 UI
gateways.forEach(gateway => {
  // 添加到下拉列表
  addGatewayOption(gateway.id, gateway.name);
});
```

### 阶段 4: 测试新网关

#### 步骤 4.1: 添加测试网关

```bash
# 只需配置环境变量
cat > secrets.json << EOF
{
  "GATEWAY_TEST_BASE_URL": "https://test-gateway.example.com/v1",
  "GATEWAY_TEST_API_KEY": "sk-test-key",
  "GATEWAY_TEST_DISPLAY_NAME": "Test Gateway"
}
EOF

# 上传到 Cloudflare Pages
npx wrangler pages secret bulk secrets.json --project-name sops

# 删除临时文件
rm secrets.json
```

#### 步骤 4.2: 验证自动发现

```bash
# 刷新网关列表
curl https://your-domain.pages.dev/v1/gateways \
  -H "Authorization: Bearer YOUR_PASSWORD"

# 应该看到新的 test 网关
```

#### 步骤 4.3: 测试新网关

```bash
# 使用新网关发送请求
curl https://your-domain.pages.dev/v1/chat/completions \
  -H "Authorization: Bearer YOUR_PASSWORD" \
  -H "X-Gateway-Provider: test" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hello"}]}'
```

---

## 🔄 回滚方案

### 如果出现问题，快速回滚

```bash
# 1. 恢复旧版本文件
mv functions/v1/chat/completions.old.js functions/v1/chat/completions.js
mv functions/v1/models.old.js functions/v1/models.js

# 2. 重新部署
npm run build
npx wrangler pages deploy dist --project-name sops --branch b-0417

# 3. 验证功能恢复
# 测试现有网关是否正常工作
```

---

## ✅ 验证清单

### 后端验证

- [ ] `gateway-resolver.js` 正确发现所有网关
- [ ] `/v1/gateways` API 返回正确的网关列表
- [ ] `/v1/chat/completions` 使用新逻辑正常工作
- [ ] `/v1/models` 使用新逻辑正常工作
- [ ] 错误处理正确（未知网关、缺少 API Key）
- [ ] 现有网关（new_api, cpa）功能正常

### 前端验证

- [ ] `gatewayService` 成功加载网关列表
- [ ] 系统设置显示所有可用网关
- [ ] 切换网关功能正常
- [ ] 缓存机制工作正常
- [ ] Fallback 到默认配置正常

### 新网关测试

- [ ] 只配置环境变量即可添加网关
- [ ] 新网关自动出现在列表中
- [ ] 新网关可以正常使用
- [ ] 删除环境变量后网关自动消失

---

## 📊 效果对比

### 优化前：新增网关

```
1. 修改 constants.ts
2. 修改 completions.js
3. 修改 models.js
4. 修改 apiEndpoints.ts
5. 配置 .env
6. 同步 CF Pages 环境变量
7. 重新部署

总计: 4 个文件 + 环境变量 + 部署
时间: ~15 分钟
风险: 高（容易遗漏）
```

### 优化后：新增网关

```
1. 配置环境变量
2. 同步 CF Pages 环境变量

总计: 只需环境变量
时间: ~2 分钟
风险: 极低（自动化）
```

---

## 🎯 后续优化

### 短期（完成基础优化后）

1. **移除硬编码配置**
   - 清理 `constants.ts` 中的 `PROVIDERS`
   - 更新 `apiEndpoints.ts` 为动态生成

2. **完善错误处理**
   - 网关不可用时的降级策略
   - 更友好的错误提示

3. **添加监控**
   - 网关使用统计
   - 性能监控
   - 错误率追踪

### 中期

1. **网关健康检查**
   - 定期检查网关可用性
   - 自动禁用不可用的网关

2. **智能路由**
   - 根据负载自动选择网关
   - 故障自动转移

3. **管理界面**
   - 网关配置 UI
   - 实时状态监控

---

## 📝 注意事项

### 环境变量命名

- 必须遵循 `GATEWAY_{ID}_BASE_URL` 格式
- ID 部分必须全大写
- 下划线会被转换为小写的 provider_id

### 向后兼容

- 新旧版本可以共存
- 优化版本包含 fallback 逻辑
- 可以随时回滚到旧版本

### 性能影响

- 网关列表有 5 分钟缓存
- 首次加载会有一次 API 请求
- 后续使用缓存，无性能影响

---

**准备者**: Claude (Opus 4.6)  
**状态**: ✅ 准备就绪，可以开始实施  
**预计时间**: 2-3 小时（包含测试）
