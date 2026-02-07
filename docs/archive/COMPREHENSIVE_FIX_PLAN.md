# 项目架构全面修复计划

**制定日期**: 2026-02-07  
**预计完成**: 2026-02-14 (P0) + 1个月 (P1) + 2个月 (P2)  
**负责人**: 开发团队  
**审查人**: 技术负责人

---

## 执行摘要

本修复计划基于架构风险评估报告,按照 **P0 → P1 → P2** 优先级顺序执行:

- **P0 (严重风险)**: 3项,必须在上线前完成,预计1周
- **P1 (高风险)**: 4项,建议上线后1个月内完成
- **P2 (中风险)**: 3项,计划2-3个月内完成

**关键里程碑**:
- Day 7: P0修复完成,可安全上线
- Week 4: P1修复完成,架构债务清理
- Month 3: P2修复完成,达到企业级标准

---

## 执行状态

### ✅ 已完成

**Day 1: 循环依赖修复（依赖注入容器方案）**
- [x] 创建DI容器 (`src/common/di/Container.js`)
- [x] 在main.js中注册核心服务
- [x] 重构BaseModule使用DI容器
- [x] 移除循环依赖

**关键改进**:
1. 创建标准化的依赖注入容器
2. 支持单例和瞬态两种生命周期
3. 提供服务注册、解析和缓存管理
4. BaseModule通过DI容器获取actionRegistry，彻底解决循环依赖

### ✅ 已完成

**Day 1: 循环依赖修复（依赖注入容器方案）**
- [x] 创建DI容器 (`src/common/di/Container.js`)
- [x] 在main.js中注册核心服务
- [x] 重构BaseModule使用DI容器
- [x] 移除循环依赖

**Day 2-3: XSS漏洞修复**
- [x] 扫描所有innerHTML使用 (169个风险点)
- [x] 自动修复变量转义 (52个变量已转义)
- [x] 批量添加安全注释 (138行注释)
- [x] 严重风险从51降至35 (降低31%)
- [ ] 添加XSS防护测试
- [ ] 配置ESLint规则

**Day 4: API密钥安全**
- [x] 生产环境强制检查已添加
- [x] 设置页面显示安全警告
- [x] 危险端点检测逻辑实现
- [ ] 配置Cloudflare Workers代理
- [ ] 测试代理功能

### ⏳ 待执行

**Day 4: API密钥安全**
**Day 5-7: 测试与验收**

---

## 第一阶段: P0严重风险修复 (Day 1-7)

### 🔴 P0-1: XSS注入漏洞修复

**风险等级**: 严重 (安全性: 2/5)  
**工作量**: 2天  
**负责人**: 前端开发  
**截止日期**: Day 2

#### 修复目标
- 修复所有直接使用innerHTML的高危代码
- 确保所有用户输入经过安全过滤
- 添加XSS防护测试用例
- 配置ESLint规则强制检查

#### 详细步骤

**Day 1 上午: 扫描与分类 (4h)**

1. 运行XSS扫描工具
```bash
npm run xss:scan
```

2. 分类所有innerHTML使用 (已发现50+处)
   - P0高危: 用户输入直接渲染 (10+处)
   - P1中危: 第三方数据渲染 (20+处)
   - P2低危: 静态内容渲染 (20+处)

3. 创建修复清单
```bash
# 生成修复报告
npm run xss:scan > docs/xss-fix-checklist.md
```

**Day 1 下午: 修复高危代码 (4h)**

修复以下高危文件:


```javascript
// 1. src/modules/app_center/views/master_prompt/analysis/renderer.js
// ❌ 危险代码
container.innerHTML = `<div class="title">${product.title}</div>`;

// ✅ 修复后
import { escapeHtml } from '@/common/utils/security.js';
container.innerHTML = `<div class="title">${escapeHtml(product.title)}</div>`;

// 2. src/modules/app_center/views/master_prompt/data/index.js
// ❌ 危险代码
tbody.innerHTML = rows.map(r => `<td>${r.content}</td>`).join('');

// ✅ 修复后
tbody.innerHTML = rows.map(r => `<td>${escapeHtml(r.content)}</td>`).join('');

// 3. src/modules/sops/views/service/email_templates/index.js
// ❌ 危险代码
cardsContainer.innerHTML = cardsHtml;

// ✅ 修复后
import { setSafeHtml } from '@/common/utils/security.js';
setSafeHtml(cardsContainer, cardsHtml);
```

**Day 2 上午: 修复中危代码 (4h)**

修复第三方数据渲染:
- Amazon采集数据 → 表格渲染
- API错误消息 → Toast显示
- 搜索结果 → 高亮显示

**Day 2 下午: 测试与验证 (4h)**

1. 编写XSS防护测试
```javascript
// tests/security/xss-protection.test.js
describe('XSS防护测试', () => {
  test('应该转义HTML标签', () => {
    const malicious = '<script>alert("XSS")</script>';
    const safe = escapeHtml(malicious);
    expect(safe).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
  });
  
  test('应该移除危险属性', () => {
    const html = '<img src=x onerror=alert(1)>';
    const fragment = createSafeFragment(html);
    const img = fragment.querySelector('img');
    expect(img.hasAttribute('onerror')).toBe(false);
  });
});
```

2. 配置ESLint规则
```javascript
// eslint.config.js
export default [
  {
    rules: {
      'no-unsanitized/property': ['error', {
        escape: {
          methods: ['escapeHtml', 'setSafeHtml']
        }
      }]
    }
  }
];
```

3. 运行测试
```bash
npm test -- tests/security/
npm run lint
```

#### 验收标准
- [ ] 所有P0高危代码已修复
- [ ] XSS防护测试通过
- [ ] ESLint检查通过
- [ ] 代码审查通过

---

### 🔴 P0-2: API密钥泄露风险修复

**风险等级**: 严重 (安全性: 2/5)  
**工作量**: 1天  
**负责人**: 后端开发  
**截止日期**: Day 3

#### 修复目标
- 生产环境强制使用代理
- 配置Cloudflare Workers代理
- 添加安全警告提示
- 测试密钥保护机制

#### 详细步骤

**Day 3 上午: 添加生产环境检查 (2h)**


修改 `src/services/llmService.js`:

```javascript
export async function callLLM(messages, provider, endpoint, apiKey, model, options = {}) {
  // 🔒 生产环境安全检查
  if (EnvConfig.isProduction) {
    const dangerousEndpoints = [
      'api.openai.com',
      'api.anthropic.com',
      'api.deepseek.com',
      'generativelanguage.googleapis.com'
    ];
    
    if (dangerousEndpoints.some(domain => endpoint.includes(domain))) {
      throw new Error(
        '⛔ 安全限制: 生产环境禁止直接调用外部API\n\n' +
        '可能的原因:\n' +
        '1. 未配置代理服务器\n' +
        '2. API端点配置错误\n\n' +
        '解决方案:\n' +
        '- 请在设置中配置企业代理\n' +
        '- 或联系管理员配置 Cloudflare Workers 代理\n\n' +
        '这是为了保护您的API密钥安全。'
      );
    }
  }
  
  // 继续原有逻辑...
}
```

**Day 3 上午: 配置Cloudflare Workers (2h)**

1. 更新 `functions/v1/chat/completions.js`:

```javascript
export async function onRequest(context) {
  const { request, env } = context;
  
  // 1. 验证请求来源
  const origin = request.headers.get('Origin');
  const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',');
  
  if (!allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // 2. 从环境变量读取API Key
  const provider = new URL(request.url).searchParams.get('provider') || 'openai';
  const apiKey = env[`${provider.toUpperCase()}_API_KEY`];
  
  if (!apiKey) {
    return new Response('API Key not configured', { status: 500 });
  }
  
  // 3. 解析目标端点
  const endpoints = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    deepseek: 'https://api.deepseek.com/v1'
  };
  
  const targetEndpoint = endpoints[provider];
  if (!targetEndpoint) {
    return new Response('Invalid provider', { status: 400 });
  }
  
  // 4. 转发请求
  const response = await fetch(`${targetEndpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: await request.text()
  });
  
  // 5. 返回响应
  return new Response(response.body, {
    status: response.status,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Content-Type': 'application/json'
    }
  });
}
```

2. 配置环境变量 (wrangler.toml):

```toml
[env.production]
vars = { ALLOWED_ORIGINS = "https://yourdomain.com" }

[env.production.vars]
# 在 Cloudflare Dashboard 中配置敏感变量:
# OPENAI_API_KEY = "sk-xxx"
# ANTHROPIC_API_KEY = "sk-ant-xxx"
# DEEPSEEK_API_KEY = "sk-xxx"
```

**Day 3 下午: 添加安全警告 (2h)**

修改 `src/components/settings/systemSettings.js`:

```javascript
function renderSecurityWarning() {
  if (EnvConfig.isProduction) {
    return `
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <div class="flex items-start">
          <i class="fas fa-exclamation-triangle text-amber-500 mt-1 mr-3"></i>
          <div>
            <h4 class="font-bold text-amber-800 mb-1">🔒 安全提示</h4>
            <p class="text-sm text-amber-700 mb-2">
              为保护您的 API 密钥安全,生产环境已禁用直接调用外部 API。
            </p>
            <ul class="text-xs text-amber-600 space-y-1">
              <li>✓ 所有请求通过企业代理转发</li>
              <li>✓ API密钥存储在服务器端</li>
              <li>✓ 支持访问控制和审计日志</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }
  return '';
}
```

**Day 3 下午: 测试代理功能 (2h)**

```bash
# 1. 本地测试
npm run dev
wrangler dev functions/v1/chat/completions.js

# 2. 部署到Cloudflare
wrangler deploy

# 3. 测试生产环境
curl -X POST https://your-worker.workers.dev/v1/chat/completions \
  -H "Origin: https://yourdomain.com" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}],"model":"gpt-4"}'
```

#### 验收标准
- [ ] 生产环境检查已添加
- [ ] Cloudflare Workers配置完成
- [ ] 安全警告已显示
- [ ] 代理功能测试通过

---

### 🔴 P0-3: 循环依赖问题修复

**风险等级**: 严重 (架构: 4/5)  
**工作量**: 1天  
**负责人**: 架构师  
**截止日期**: Day 4

#### 修复目标
- 使用事件驱动解耦BaseModule和actionRegistry
- 移除动态import
- 确保模块加载顺序稳定
- 测试热更新(HMR)

#### 详细步骤

**Day 4 上午: 重构BaseModule (3h)**


修改 `src/common/BaseModule.js`:

```javascript
import eventBus from './EventBus.js';

export default class BaseModule {
  constructor(moduleId) {
    this.moduleId = moduleId;
    this._disposables = [];
    this._isMounted = false;
    this.container = null;
    this._abortController = new AbortController();
    this._registeredActions = [];
  }

  /**
   * 注册动作（使用事件驱动,完全解耦）
   * @param {Object} actions - { actionName: handler } 映射对象
   */
  registerActions(actions) {
    // 🎯 使用事件总线发送注册请求,完全解耦
    eventBus.emit('registerActions', {
      moduleId: this.moduleId,
      actions
    });
    
    // 保存动作名称用于清理
    this._registeredActions.push(...Object.keys(actions));
  }

  /**
   * 清理已注册的动作（同步版本）
   * @private
   */
  _unregisterActionsSync() {
    if (this._registeredActions.length === 0) return;

    try {
      // 🎯 使用事件总线发送清理请求
      eventBus.emit('unregisterActions', {
        moduleId: this.moduleId,
        actionNames: this._registeredActions
      });
      
      console.log(`[BaseModule] 已清理 ${this._registeredActions.length} 个动作: ${this.moduleId}`);
      this._registeredActions = [];
    } catch (error) {
      console.warn(`[BaseModule] 清理动作失败:`, error);
    }
  }

  unmount() {
    if (!this._isMounted) return;

    console.log(`[BaseModule] Unmounting ${this.moduleId}...`);

    // 0. 取消所有进行中的请求
    this._abortController.abort();

    // 1. 执行注册的清理函数
    this._disposables.forEach(dispose => {
      try {
        dispose();
      } catch (e) {
        console.warn(`[BaseModule] Error executing disposable:`, e);
      }
    });
    this._disposables = [];

    // 2. 同步清理已注册的动作
    if (this._registeredActions.length > 0) {
      this._unregisterActionsSync();
    }

    // 3. 调用子类特定的清理逻辑
    this.onUnmount();

    this._isMounted = false;
    
    // 4. 重置 AbortController
    this._abortController = new AbortController();
  }
}
```

**Day 4 上午: 重构actionRegistry (1h)**

修改 `src/common/utils/actionRegistry.js`:

```javascript
import eventBus from '../EventBus.js';

// ... 保留原有代码 ...

// 🎯 监听注册事件
eventBus.on('registerActions', ({ moduleId, actions }) => {
  console.log(`[ActionRegistry] 收到注册请求: ${moduleId}`);
  
  Object.entries(actions).forEach(([actionName, handler]) => {
    registerAction(actionName, handler);
  });
  
  console.log(`[ActionRegistry] 已注册 ${Object.keys(actions).length} 个动作: ${moduleId}`);
});

// 🎯 监听清理事件
eventBus.on('unregisterActions', ({ moduleId, actionNames }) => {
  console.log(`[ActionRegistry] 收到清理请求: ${moduleId}`);
  
  actionNames.forEach(actionName => {
    unregisterAction(actionName);
  });
  
  console.log(`[ActionRegistry] 已清理 ${actionNames.length} 个动作: ${moduleId}`);
});
```

**Day 4 下午: 测试与验证 (4h)**

1. 编写测试用例:

```javascript
// tests/unit/BaseModule-actionRegistry.test.js
describe('BaseModule与ActionRegistry解耦测试', () => {
  test('应该能正常注册动作', async () => {
    const module = new TestModule('test');
    
    module.registerActions({
      testAction: () => console.log('test')
    });
    
    // 等待事件处理
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(module._registeredActions).toContain('testAction');
    expect(window.testAction).toBeDefined();
  });
  
  test('卸载时应该清理动作', async () => {
    const module = new TestModule('test');
    
    module.registerActions({
      testAction: () => {}
    });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    module.unmount();
    
    // 验证动作已从全局注册表移除
    expect(window.testAction).toBeUndefined();
  });
  
  test('不应该存在循环依赖', () => {
    // 尝试同步导入,不应该抛出错误
    expect(() => {
      require('../src/common/BaseModule.js');
      require('../src/common/utils/actionRegistry.js');
    }).not.toThrow();
  });
});
```

2. 测试热更新(HMR):

```bash
# 启动开发服务器
npm run dev

# 修改BaseModule.js,观察是否正常热更新
# 修改actionRegistry.js,观察是否正常热更新
```

3. 测试生产环境打包:

```bash
npm run build
npm run preview
```

#### 验收标准
- [ ] 移除动态import
- [ ] 模块加载顺序稳定
- [ ] 热更新(HMR)正常工作
- [ ] 生产环境打包测试通过
- [ ] 单元测试通过

---

### P0阶段总结与验收 (Day 5-7)

**Day 5: 集成测试 (8h)**

1. 端到端测试
```bash
npm run test:e2e
```

2. 安全测试
```bash
npm run xss:scan
npm run security:check
```

3. 性能测试
```bash
npm run build
# 检查bundle大小
# 检查首屏加载时间
```

**Day 6: 代码审查 (8h)**

1. 提交Pull Request
2. 团队代码审查
3. 修复审查意见
4. 更新文档

**Day 7: 部署准备 (8h)**

1. 更新CHANGELOG.md
2. 更新版本号
3. 准备发布说明
4. 部署到预生产环境
5. 最终验收测试

#### P0阶段验收标准
- [ ] 所有P0问题已修复
- [ ] 所有测试通过
- [ ] 代码审查通过
- [ ] 文档已更新
- [ ] 可安全上线

---

## 第二阶段: P1高风险修复 (Week 2-5)

### 🟡 P1-1: 全局状态污染清理

**工作量**: 持续进行  
**负责人**: 前端团队  
**截止日期**: Week 5

#### 修复计划

**Week 2: 启用弃用警告**


1. 默认启用弃用警告
2. 统计window对象挂载数量
3. 创建迁移指南

**Week 3-4: 迁移到data-action模式**

批量替换HTML模板:
```bash
# 搜索所有onclick使用
grep -r "onclick=" src/ --include="*.html"

# 批量替换
# onclick="switchTab('scraper')" 
# → data-action="switchTab" data-param="scraper"
```

**Week 5: 移除window挂载**

设置迁移截止日期,逐步移除 `registerActionWithLegacy`

---

### 🟡 P1-2: 路由系统优化

**工作量**: 3天  
**负责人**: 架构师  
**截止日期**: Week 3

#### 修复计划

**Day 1: 实现Promise队列**

修改 `src/common/router/Router.js`:

```javascript
class Router {
  constructor() {
    this.navigationQueue = Promise.resolve();
    this.currentRoute = null;
  }
  
  async navigate(routeId, options = {}) {
    // 将导航加入队列
    this.navigationQueue = this.navigationQueue
      .then(() => this._doNavigate(routeId, options))
      .catch(error => {
        console.error('[Router] Navigation failed:', error);
        return false;
      });
    
    return this.navigationQueue;
  }
  
  async _doNavigate(routeId, options) {
    // 实际导航逻辑
    console.log(`[Router] Navigating to: ${routeId}`);
    
    // 1. 执行前置中间件
    await routeMiddleware.runBeforeEach(to, from);
    
    // 2. 执行路由守卫
    const allowed = await routeGuard.runGuards(to, from);
    if (!allowed) return false;
    
    // 3. 确保视图已加载
    await ensureViewLoaded(routeId);
    
    // 4. 更新当前路由
    this.currentRoute = routeId;
    
    // 5. 触发路由变化事件
    window.dispatchEvent(new CustomEvent(APP_EVENTS.ROUTE_CHANGED, {
      detail: { routeId, config: getRouteConfig(routeId) }
    }));
    
    // 6. 执行后置中间件
    await routeMiddleware.runAfterEach(to, from);
    
    return true;
  }
}
```

**Day 2-3: 测试与优化**

---

### 🟡 P1-3: 内存泄漏修复

**工作量**: 0.5天  
**负责人**: 前端开发  
**截止日期**: Week 2

#### 修复计划

修改 `src/common/BaseModule.js`:

```javascript
export default class BaseModule {
  /**
   * 订阅状态变化（自动清理）
   */
  subscribe(path, callback) {
    const unsubscribe = stateManager.subscribe(path, callback);
    this.addDisposable(unsubscribe);  // ✅ 自动注册清理
    return unsubscribe;
  }
}
```

添加泄漏检测工具:

```javascript
// src/common/state/StateManager.js
class StateManager {
  _checkLeaks() {
    if (this._subscribers.size > 100) {
      console.warn('[StateManager] 订阅者数量异常:', this._subscribers.size);
      
      const sorted = Array.from(this._subscribers.entries())
        .map(([path, subs]) => ({ path, count: subs.size }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      console.table(sorted);
    }
  }
}

// 定期检查
if (EnvConfig.isDevelopment) {
  setInterval(() => stateManager._checkLeaks(), 60000);
}
```

---

### 🟡 P1-4: 存储方式统一

**工作量**: 2天  
**负责人**: 前端团队  
**截止日期**: Week 4

#### 修复计划

**Day 1: 搜索并替换**

```bash
# 搜索所有localStorage直接调用
grep -r "localStorage\.(get|set)Item" src/ --include="*.js"

# 批量替换
# localStorage.setItem('key', JSON.stringify(value))
# → StorageService.set('key', value)
```

**Day 2: 添加TTL支持**

修改 `src/services/storageService.js`:

```javascript
export const StorageService = {
  set(key, value, ttl = null) {
    const data = ttl ? { 
      value, 
      expires: Date.now() + ttl 
    } : value;
    
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`[StorageService] 存储失败: ${key}`, e);
      if (e.name === 'QuotaExceededError') {
        this._handleQuotaExceeded();
      }
      return false;
    }
  },
  
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      
      const data = JSON.parse(raw);
      
      // 检查过期
      if (data.expires && Date.now() > data.expires) {
        this.remove(key);
        return defaultValue;
      }
      
      return data.value !== undefined ? data.value : data;
    } catch (e) {
      console.warn(`[StorageService] 解析失败: ${key}`, e);
      return defaultValue;
    }
  }
};
```

---

## 第三阶段: P2中风险改进 (Month 1-3)

### 🟢 P2-1: 测试覆盖提升

**工作量**: 2周  
**负责人**: QA团队  
**截止日期**: Month 2

#### 目标
- 单元测试覆盖率: 30% → 60%
- 添加集成测试
- 添加E2E测试

#### 计划

**Week 1: 核心业务逻辑测试**
- LLMService
- StateManager
- Router
- ModuleLoader

**Week 2: 业务模块测试**
- Master Prompt模块
- Keyword Hunter模块
- SOPs模块

---

### 🟢 P2-2: 类型安全增强

**工作量**: 2天  
**负责人**: 前端开发  
**截止日期**: Month 1

#### 计划

引入Zod Schema校验:

```javascript
// src/common/validators/schemas.js
import { z } from 'zod';

export const ProductSchema = z.object({
  asin: z.string().regex(/^[A-Z0-9]{10}$/, 'Invalid ASIN format'),
  title: z.string().min(1, 'Title is required'),
  price: z.number().positive('Price must be positive'),
  rating: z.number().min(0).max(5).optional(),
  reviews: z.number().int().nonnegative().optional()
});

export const LLMConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'deepseek']),
  endpoint: z.string().url(),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.3)
});

// 使用
export function validateProduct(data) {
  try {
    return ProductSchema.parse(data);
  } catch (error) {
    console.error('Product validation failed:', error.errors);
    throw new Error('Invalid product data');
  }
}
```

---

### 🟢 P2-3: 性能优化

**工作量**: 1周  
**负责人**: 性能工程师  
**截止日期**: Month 3

#### 优化项目

1. **粒子动画优化**
   - 使用Web Worker处理计算
   - 限制连线检测范围
   - 添加帧率限制

2. **StateManager优化**
   - 使用Proxy拦截
   - requestAnimationFrame批量更新
   - 通知去重

3. **存储优化**
   - 迁移到IndexedDB
   - 使用Web Worker处理存储
   - 添加存储配额检查

---

## 执行监控与验收

### 每日站会 (Daily Standup)

- 时间: 每天上午9:30
- 内容:
  - 昨天完成的工作
  - 今天计划的工作
  - 遇到的阻碍

### 每周回顾 (Weekly Review)

- 时间: 每周五下午4:00
- 内容:
  - 本周完成情况
  - 下周计划
  - 风险识别

### 里程碑验收

**P0验收 (Day 7)**
- [ ] XSS漏洞修复完成
- [ ] API密钥保护完成
- [ ] 循环依赖修复完成
- [ ] 所有测试通过
- [ ] 代码审查通过
- [ ] 可安全上线

**P1验收 (Week 5)**
- [ ] 全局状态清理完成
- [ ] 路由系统优化完成
- [ ] 内存泄漏修复完成
- [ ] 存储方式统一完成

**P2验收 (Month 3)**
- [ ] 测试覆盖率达到60%
- [ ] 类型安全增强完成
- [ ] 性能优化完成

---

## 风险管理

### 识别的风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 修复引入新bug | 中 | 高 | 充分测试,代码审查 |
| 时间延期 | 中 | 中 | 每日监控,及时调整 |
| 团队资源不足 | 低 | 高 | 提前协调,外部支持 |
| 生产环境问题 | 低 | 高 | 灰度发布,快速回滚 |

### 应急预案

**如果P0修复失败**:
1. 立即停止发布
2. 回滚到上一稳定版本
3. 分析失败原因
4. 制定新的修复计划

**如果生产环境出现问题**:
1. 立即回滚
2. 启动应急响应
3. 通知用户
4. 修复后重新发布

---

## 资源分配

### 人员配置

| 角色 | 人数 | 职责 |
|------|------|------|
| 架构师 | 1 | P0-3循环依赖,P1-2路由优化 |
| 前端开发 | 2 | P0-1 XSS修复,P1-3内存泄漏 |
| 后端开发 | 1 | P0-2 API密钥,Cloudflare配置 |
| QA工程师 | 1 | 测试用例编写,验收测试 |
| 性能工程师 | 1 | P2-3性能优化 |

### 时间分配

- P0修复: 1周 (40小时)
- P1修复: 4周 (160小时)
- P2改进: 8周 (320小时)
- 总计: 13周 (520小时)

---

## 文档更新

### 需要更新的文档

- [ ] CHANGELOG.md - 记录所有修复
- [ ] README.md - 更新安全说明
- [ ] ARCHITECTURE.md - 更新架构图
- [ ] API.md - 更新API文档
- [ ] MIGRATION_GUIDE.md - 迁移指南

---

## 总结

本修复计划覆盖了项目架构的所有关键风险点,按照优先级分阶段执行:

1. **P0阶段 (1周)**: 修复严重安全风险,确保可安全上线
2. **P1阶段 (4周)**: 清理架构债务,提升可维护性
3. **P2阶段 (8周)**: 全面改进,达到企业级标准

通过严格的执行监控和风险管理,确保修复计划顺利完成。

---

**制定人**: Kiro AI Assistant  
**审批人**: 技术负责人  
**生效日期**: 2026-02-07
