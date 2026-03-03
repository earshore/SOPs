# Design Document: Custom Gateway Provider

## Overview

本设计文档描述了自定义网关厂商功能的技术实现方案。该功能允许用户在选择"自定义网关"（gateway）时，通过下拉框选择一个AI厂商标识，并配置自定义的网关地址，使系统能够通过用户的自建网关（如 https://ai-gateway.hongecb.store/）访问对应厂商的API。

设计原则：
- 最小化对现有系统的影响
- 复用现有UI组件和逻辑
- 保持向后兼容性
- 遵循现有的架构模式

## Architecture

### 系统架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM Config Page                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Provider Selector (ProviderSelector.js)              │  │
│  │  - 显示厂商列表（包括gateway）                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Config Panel (ConfigPanel.js)                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  当 provider === 'gateway' 时：                  │  │  │
│  │  │  - 显示"目标厂商"下拉框（新增）                  │  │  │
│  │  │  - API代理地址 → 自定义网关地址                  │  │  │
│  │  │  - API Key → ACCESS_PASSWORD                     │  │  │
│  │  │  - 其他配置保持不变                              │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              ConfigManager (ConfigManager.js)               │
│  - 保存配置时增加 targetProvider 字段                        │
│  - 配置格式：                                                │
│    {                                                         │
│      provider: 'gateway',                                    │
│      targetProvider: 'openai',  // 新增字段                 │
│      endpoint: 'https://ai-gateway.hongecb.store/',         │
│      apiKey: 'ACCESS_PASSWORD',                             │
│      model: 'gpt-4o-mini'                                    │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              GatewayAdapter (GatewayAdapter.js)             │
│  - 读取 targetProvider 字段                                  │
│  - 根据 targetProvider 调整请求格式（如需要）                │
│  - 使用自定义endpoint和apiKey发送请求                        │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

```
用户选择gateway → ConfigPanel显示目标厂商选择器
                 ↓
用户选择目标厂商（如openai） → 填写网关地址和ACCESS_PASSWORD
                 ↓
保存配置 → ConfigManager存储（包含targetProvider）
                 ↓
调用API → GatewayAdapter读取targetProvider → 构建请求
                 ↓
发送到自定义网关 → 网关转发到目标厂商API
```

## Components and Interfaces

### 1. ConfigPanel 组件扩展

**文件**: `src/components/settings/llm/ConfigPanel.js`

**新增状态**:
```javascript
{
  targetProvider: '',  // 目标厂商标识
  availableTargetProviders: [],  // 可选的目标厂商列表（剔除custom-gateway类别）
}
```

**新增方法**:
```javascript
/**
 * 加载可用的目标厂商列表
 * 从所有厂商中剔除custom-gateway类别的厂商
 */
loadAvailableTargetProviders() {
  // 获取所有厂商
  // 过滤掉category为'custom-gateway'的厂商
  // 返回可选列表
}

/**
 * 当provider变更为gateway时，加载目标厂商
 */
handleGatewayProviderSelected() {
  if (this.provider === 'gateway') {
    this.loadAvailableTargetProviders();
    // 如果已有配置，加载targetProvider
    if (this.config.targetProvider) {
      this.targetProvider = this.config.targetProvider;
    }
  }
}

/**
 * 保存配置时，如果是gateway，包含targetProvider
 */
async saveConfig() {
  const configToSave = {
    provider: this.provider,
    endpoint: this.config.endpoint,
    apiKey: this.config.apiKey,
    model: this.config.model,
    options: this.config.options
  };
  
  // 如果是gateway，添加targetProvider
  if (this.provider === 'gateway' && this.targetProvider) {
    configToSave.targetProvider = this.targetProvider;
  }
  
  await configManager.setConfig(this.provider, configToSave);
}
```

### 2. ConfigManager 扩展

**文件**: `src/services/llm/ConfigManager.js`

**配置数据结构扩展**:
```javascript
/**
 * @typedef {Object} AdapterConfig
 * @property {string} provider - 厂商标识
 * @property {string} [targetProvider] - 目标厂商标识（仅gateway使用）
 * @property {string} endpoint - API端点
 * @property {string} apiKey - API密钥或ACCESS_PASSWORD
 * @property {string} [model] - 模型ID
 * @property {Object} [options] - 其他选项
 */
```

**方法调整**:
- `setConfig()`: 支持保存targetProvider字段
- `getConfig()`: 返回包含targetProvider的配置
- 配置验证逻辑：当provider为gateway时，验证targetProvider是否存在

### 3. GatewayAdapter 扩展

**文件**: `src/adapters/GatewayAdapter.js`

**新增功能**:
```javascript
/**
 * 构造函数中读取targetProvider
 */
constructor(config) {
  super(config);
  this.targetProvider = config.targetProvider || null;
}

/**
 * 获取模型列表时，如果有targetProvider，可以使用目标厂商的模型列表逻辑
 */
async getModels() {
  // 如果有targetProvider，可以参考目标厂商的模型列表格式
  // 否则使用默认的gateway逻辑
  return super.getModels();
}

/**
 * 构建请求时，根据targetProvider调整请求格式（如果需要）
 */
buildRequest(messages, options) {
  // 大多数情况下，网关应该兼容OpenAI格式
  // 如果targetProvider有特殊要求，可以在这里处理
  return super.buildRequest(messages, options);
}
```

### 4. UI 模板扩展

**文件**: `src/components/settings/llm/llmConfig.html`

**在ConfigPanel的配置表单中，API Key输入框之前添加**:
```html
<!-- 目标厂商选择（仅gateway显示） -->
<div x-show="provider === 'gateway'">
    <label class="block text-sm font-medium text-slate-700 mb-2">
        目标 AI 厂商
    </label>
    <div class="text-xs text-slate-500 mb-2">选择要通过网关访问的AI厂商</div>
    <select x-model="targetProvider" 
            @change="handleTargetProviderChange()"
            class="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm">
        <option value="">请选择厂商</option>
        <template x-for="tp in availableTargetProviders" :key="tp">
            <option :value="tp" x-text="getProviderMeta(tp).name"></option>
        </template>
    </select>
</div>
```

**调整现有字段的标签（当provider === 'gateway'时）**:
- "API 代理地址" → 保持不变，但说明文字改为"请输入自定义网关地址"
- "API Key" → 保持不变，但说明文字改为"请输入网关的访问密码（ACCESS_PASSWORD）"

## Data Models

### GatewayConfig 数据模型

```javascript
/**
 * 自定义网关配置
 */
interface GatewayConfig {
  provider: 'gateway';              // 固定为gateway
  targetProvider: string;           // 目标厂商标识（如'openai', 'anthropic'）
  endpoint: string;                 // 自定义网关地址
  apiKey: string;                   // 网关访问密码（ACCESS_PASSWORD）
  model?: string;                   // 模型ID
  clientMode?: boolean;             // 是否使用客户端请求模式
  options?: {                       // 其他选项
    temperature?: number;
    maxTokens?: number;
    [key: string]: any;
  };
}
```

### 配置存储格式

```javascript
// localStorage中的存储格式
{
  "llm_configs": {
    "gateway": {
      "provider": "gateway",
      "targetProvider": "openai",
      "endpoint": "https://ai-gateway.hongecb.store/",
      "apiKey": "encrypted_access_password",
      "model": "gpt-4o-mini",
      "clientMode": false,
      "options": {}
    },
    "openai": {
      // 标准OpenAI配置
    }
  }
}
```

## Correctness Properties

*属性（Property）是指在系统所有有效执行中都应该成立的特征或行为。属性是人类可读规范与机器可验证正确性保证之间的桥梁。*

### Property 1: 目标厂商列表过滤正确性

*对于任意*加载的厂商列表，过滤后的目标厂商列表中的所有厂商都不应该属于'custom-gateway'类别

**Validates: Requirements 1.3, 2.1, 2.3**

### Property 2: Gateway配置完整性验证

*对于任意*provider为'gateway'的配置，保存时必须同时包含有效的targetProvider和Gateway_URL字段，否则保存操作应该被阻止

**Validates: Requirements 2.4, 3.3**

### Property 3: 配置持久化一致性（Round-trip）

*对于任意*有效的gateway配置，保存后重新加载应该得到相同的配置数据（包括targetProvider、endpoint、apiKey等所有字段）

**Validates: Requirements 3.2, 7.2, 9.1, 9.2**

### Property 4: 配置隔离性

*对于任意*gateway配置的变更（包括targetProvider、endpoint等），不应该影响其他厂商的配置数据和API调用行为

**Validates: Requirements 8.1, 8.2, 8.4, 8.5**

### Property 5: URL格式验证正确性

*对于任意*输入的字符串，URL验证函数应该正确判断其是否为有效的HTTPS URL格式

**Validates: Requirements 3.1, 3.4, 3.5**

### Property 6: API端点路由正确性

*对于任意*gateway配置的API请求，使用的端点应该是用户配置的Gateway_URL，而不是目标厂商的默认端点

**Validates: Requirements 4.1, 4.2, 4.4, 5.1**

### Property 7: 目标厂商选择与配置关联

*对于任意*选择的目标厂商，配置对象中的targetProvider字段应该与用户选择的Provider_Identifier一致

**Validates: Requirements 2.2, 2.5**

### Property 8: 连通性测试状态管理

*对于任意*连通性测试操作，测试进行中时按钮应该被禁用，测试完成后应该显示相应的成功或失败状态

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 9: 配置删除完整性

*对于任意*gateway配置的删除操作，应该同时清除配置数据和相关的缓存数据，并恢复使用默认配置

**Validates: Requirements 7.3, 7.5**

### Property 10: 错误处理一致性

*对于任意*API调用错误（网络错误、认证错误、格式错误、超时等），系统都应该显示相应的错误信息并允许用户采取后续操作

**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

## Error Handling

### 1. 配置验证错误

**场景**: 用户保存gateway配置时未选择目标厂商

**处理**:
```javascript
if (this.provider === 'gateway' && !this.targetProvider) {
  this.validationErrors.targetProvider = '请选择目标AI厂商';
  showToast('请选择目标AI厂商', 'warning');
  return;
}
```

### 2. 网关地址格式错误

**场景**: 用户输入的网关地址格式不正确

**处理**:
```javascript
if (!this.isValidUrl(this.config.endpoint)) {
  this.validationErrors.endpoint = '网关地址格式不正确';
  showToast('请输入有效的网关地址', 'warning');
  return;
}

if (!this.config.endpoint.startsWith('https://')) {
  this.validationErrors.endpoint = '网关地址必须使用HTTPS协议';
  showToast('网关地址必须使用HTTPS协议', 'warning');
  return;
}
```

### 3. 网关连接失败

**场景**: 测试连接时网关无法访问

**处理**:
```javascript
try {
  const result = await llmService.testConnection(this.provider, testConfig);
  if (!result.success) {
    this.testResult = {
      success: false,
      error: result.error || '网关连接失败，请检查网关地址和访问密码'
    };
    showToast(`连接失败: ${result.error}`, 'error');
  }
} catch (error) {
  this.testResult = {
    success: false,
    error: '网关连接超时或网络错误'
  };
  showToast('网关连接失败，请检查网络和网关地址', 'error');
}
```

### 4. 目标厂商不支持

**场景**: 用户选择的目标厂商在网关中不可用

**处理**:
```javascript
// 在获取模型列表时
try {
  const models = await adapter.getModels();
  if (models.length === 0) {
    showToast('该网关暂不支持所选厂商，请尝试其他厂商或检查网关配置', 'warning');
  }
} catch (error) {
  showToast(`获取模型列表失败: ${error.message}`, 'error');
}
```

### 5. 配置迁移错误

**场景**: 旧版本的gateway配置没有targetProvider字段

**处理**:
```javascript
// 在loadConfig时
if (this.provider === 'gateway' && !savedConfig.targetProvider) {
  // 向后兼容：如果没有targetProvider，提示用户选择
  showToast('请选择目标AI厂商以完成配置', 'info');
  this.targetProvider = '';
}
```

### 6. 数据持久化失败

**场景**: localStorage空间不足或被禁用

**处理**:
```javascript
try {
  await configManager.setConfig(this.provider, configToSave);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    showToast('存储空间不足，请清理浏览器数据后重试', 'error');
  } else if (error.message.includes('localStorage')) {
    showToast('浏览器存储被禁用，请检查浏览器设置', 'error');
  } else {
    showToast(`保存配置失败: ${error.message}`, 'error');
  }
}
```

## Testing Strategy

### 单元测试

**测试文件**: `tests/unit/llm/components/ConfigPanel.test.js`

测试用例：
1. 当provider为gateway时，显示目标厂商选择器
2. 目标厂商列表正确过滤custom-gateway类别
3. 保存gateway配置时包含targetProvider字段
4. 加载gateway配置时正确恢复targetProvider
5. 目标厂商未选择时阻止保存
6. 网关地址验证逻辑正确

**测试文件**: `tests/unit/llm/services/ConfigManager.test.js`

测试用例：
1. setConfig支持保存targetProvider字段
2. getConfig正确返回targetProvider字段
3. gateway配置的验证逻辑
4. 配置迁移兼容性（旧配置没有targetProvider）

**测试文件**: `tests/unit/llm/adapters/GatewayAdapter.test.js`

测试用例：
1. GatewayAdapter正确读取targetProvider
2. 使用自定义endpoint而不是默认endpoint
3. 请求格式符合OpenAI标准
4. 模型列表获取逻辑

### 集成测试

**测试文件**: `tests/integration/custom-gateway-provider.test.js`

测试场景：
1. 完整的配置流程：选择gateway → 选择目标厂商 → 填写网关地址 → 保存
2. 配置加载流程：刷新页面后正确恢复gateway配置
3. API调用流程：使用gateway配置成功调用API
4. 连通性测试：测试自定义网关的连接
5. 模型列表获取：通过网关获取目标厂商的模型列表

### 属性测试

**测试文件**: `tests/properties/custom-gateway-provider.properties.test.js`

属性测试用例：
1. **Property 1**: 目标厂商列表过滤正确性
2. **Property 2**: Gateway配置完整性
3. **Property 3**: 配置持久化一致性
4. **Property 4**: 配置隔离性
5. **Property 5**: URL验证正确性
6. **Property 6**: 端点使用正确性

每个属性测试运行100次迭代，使用随机生成的测试数据。

### 手动测试

**测试文件**: `tests/manual/custom-gateway-provider.html`

测试场景：
1. UI交互测试：选择gateway后目标厂商选择器正确显示
2. 表单验证测试：各种无效输入的错误提示
3. 连通性测试：实际网关的连接测试
4. 模型列表测试：获取并显示模型列表
5. API调用测试：使用配置的网关发送实际请求
6. 配置管理测试：保存、加载、删除配置

## Implementation Notes

### 1. 最小化影响原则

- 只在ConfigPanel.js中添加新逻辑，不修改其他组件
- 复用现有的UI组件和样式
- 保持现有的数据流和事件机制
- 向后兼容：旧的gateway配置仍然可用

### 2. 代码复用

- 复用ProviderSelector的厂商元数据
- 复用ConfigPanel的验证逻辑
- 复用GatewayAdapter的请求构建逻辑
- 复用现有的错误处理机制

### 3. 性能考虑

- 目标厂商列表只在provider为gateway时加载
- 使用缓存避免重复过滤厂商列表
- 配置保存使用异步操作，不阻塞UI

### 4. 安全考虑

- ACCESS_PASSWORD使用与API Key相同的加密存储机制
- 网关地址必须使用HTTPS协议
- 输入验证防止XSS攻击
- 敏感信息不在日志中输出

### 5. 用户体验

- 清晰的标签和说明文字
- 实时的表单验证反馈
- 友好的错误提示
- 保存成功后的即时反馈

## Migration Strategy

### 向后兼容

现有的gateway配置（没有targetProvider字段）仍然可以正常工作：

```javascript
// 旧配置
{
  provider: 'gateway',
  endpoint: 'https://api.chatanywhere.org/v1',
  apiKey: 'sk-xxx',
  model: 'gpt-4o-mini'
}

// 新配置
{
  provider: 'gateway',
  targetProvider: 'openai',  // 新增
  endpoint: 'https://ai-gateway.hongecb.store/',
  apiKey: 'ACCESS_PASSWORD',
  model: 'gpt-4o-mini'
}
```

### 配置迁移提示

当用户打开旧的gateway配置时，如果没有targetProvider字段，显示提示：

```javascript
if (this.provider === 'gateway' && !this.config.targetProvider) {
  showToast('建议选择目标AI厂商以获得更好的体验', 'info');
}
```

## Future Enhancements

1. **多网关支持**: 允许用户配置多个自定义网关
2. **网关模板**: 提供常见网关的配置模板
3. **网关健康检查**: 定期检查网关可用性
4. **网关性能监控**: 记录网关的响应时间和成功率
5. **网关负载均衡**: 支持配置多个网关地址进行负载均衡
