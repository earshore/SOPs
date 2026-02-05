# 项目优化清单 (上线前必做)

> **目标**: 确保项目在正式上线前达到生产环境标准  
> **时间**: 预计5-7个工作日  
> **优先级**: P0 (阻塞上线) > P1 (强烈建议) > P2 (可选)

---

## ✅ P0 级别 - 阻塞上线 (必须完成)

### 1. 统一存储方式 ⏱️ 2天

**问题**: 发现3种存储方式并存,存在数据一致性风险

**现状**:
```javascript
// ❌ 方式1: 直接使用 localStorage (分散在多处)
localStorage.setItem('key', JSON.stringify(value));

// ❌ 方式2: StateManager 持久化中间件 (部分状态)
stateManager.set('path', value); // 自动持久化

// ✅ 方式3: StorageService (推荐,但未全面使用)
StorageService.set('key', value);
```

**任务清单**:
- [ ] 搜索所有 `localStorage.` 直接调用 (排除测试文件)
- [ ] 迁移到 `StorageService` 统一接口
- [ ] 更新 `StateManager` 持久化中间件使用 `StorageService`
- [ ] 添加存储配额检查和清理机制
- [ ] 更新相关文档

**验收标准**:
```bash
# 搜索结果应该只剩下 StorageService 内部实现
grep -r "localStorage\." src/ --exclude-dir=node_modules | wc -l
# 期望: 0 (除了 storageService.js 本身)
```

**参考代码**:
```javascript
// 迁移示例
// Before:
const config = JSON.parse(localStorage.getItem('llm_config') || '{}');

// After:
const config = StorageService.get('llm_config', {});
```

---

### 2. 修复路由状态不一致 ⏱️ 1天

**问题**: Hash路由与History API混用,可能导致状态不同步

**现状**:
```javascript
// ui.js - 直接操作 hash
function switchTab(tab) {
  window.location.hash = tab; // ❌ 绕过路由系统
}

// router.js - 同时监听两种事件
window.addEventListener('popstate', ...);
window.addEventListener('hashchange', ...); // 可能重复触发
```

**任务清单**:
- [ ] 废弃 `ui.js` 中的 `switchTab()` 直接hash操作
- [ ] 统一使用 `router.navigate()` 进行路由跳转
- [ ] 移除 `hashchange` 监听器,只保留 `popstate`
- [ ] 添加路由状态校验机制
- [ ] 更新所有调用 `switchTab()` 的地方

**验收标准**:
```javascript
// 所有路由跳转应该通过 router
router.navigate('sops_overview');

// 而不是
window.location.hash = 'sops_overview'; // ❌
```

**参考代码**:
```javascript
// src/common/utils/ui.js
export function switchTab(tab, updateHistory = true) {
  // ✅ 委托给路由系统
  return router.navigate(tab, { updateHistory });
}
```

---

### 3. 完善模块卸载逻辑 ⏱️ 2天

**问题**: 部分模块未正确实现 `onUnmount()`,可能导致内存泄漏

**现状**:
```javascript
// ❌ 某些模块缺少清理逻辑
class MyModule extends BaseModule {
  async init() {
    setInterval(() => { /* ... */ }, 1000); // 未清理
    document.addEventListener('click', handler); // 未清理
  }
  // 缺少 onUnmount()
}
```

**任务清单**:
- [ ] 审查所有模块的 `onUnmount()` 实现
- [ ] 确保所有定时器使用 `this.setInterval()`
- [ ] 确保所有事件监听使用 `this.addEventListener()`
- [ ] 添加卸载检查工具 (开发环境)
- [ ] 编写模块生命周期测试

**验收标准**:
```javascript
// 所有模块必须正确清理资源
class MyModule extends BaseModule {
  async init() {
    // ✅ 使用 BaseModule 提供的方法
    this.setInterval(() => { /* ... */ }, 1000);
    this.addEventListener(document, 'click', handler);
  }
  
  onUnmount() {
    // ✅ 自定义清理逻辑
    this.myCustomCleanup();
  }
}
```

**检查工具**:
```javascript
// src/common/utils/devTools.js (新建)
export function checkMemoryLeaks() {
  if (process.env.NODE_ENV !== 'development') return;
  
  const before = performance.memory.usedJSHeapSize;
  // 触发模块卸载
  router.navigate('home');
  
  setTimeout(() => {
    const after = performance.memory.usedJSHeapSize;
    const leak = after - before;
    if (leak > 1024 * 1024) { // 1MB
      console.warn(`⚠️ 可能存在内存泄漏: ${(leak / 1024 / 1024).toFixed(2)}MB`);
    }
  }, 1000);
}
```

---

### 4. API密钥加密存储 ⏱️ 2天

**问题**: API密钥明文存储在 LocalStorage,存在安全隐患

**现状**:
```javascript
// ❌ 明文存储
StorageService.set('llm_openai', {
  apiKey: 'sk-proj-xxx' // 可被轻易读取
});
```

**任务清单**:
- [ ] 实现简单的加密/解密工具 (AES-GCM)
- [ ] 使用用户设备指纹作为密钥
- [ ] 更新 `StorageService` 支持加密存储
- [ ] 迁移现有密钥到加密存储
- [ ] 添加密钥轮换提示

**参考代码**:
```javascript
// src/common/utils/crypto.js (新建)
import { subtle } from 'crypto';

export class SecureStorage {
  static async encrypt(data, key) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    
    const cryptoKey = await subtle.importKey(
      'raw',
      encoder.encode(key),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      dataBuffer
    );
    
    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    };
  }
  
  static async decrypt(encrypted, key) {
    // 解密逻辑...
  }
}

// 使用示例
const deviceKey = await getDeviceFingerprint();
const encrypted = await SecureStorage.encrypt(apiKey, deviceKey);
StorageService.set('llm_key_encrypted', encrypted);
```

**注意事项**:
- 这只是基础防护,不能完全防止XSS攻击
- 生产环境建议使用 Serverless 函数代理API调用
- 添加密钥过期机制

---

## 📋 P1 级别 - 强烈建议 (上线后1周内)

### 5. 统一 fetch 调用 ⏱️ 1天

**问题**: 部分代码直接使用 `fetch()`,未经过 `HttpService`

**任务清单**:
- [ ] 迁移 `scraperService.js` 到 `HttpService`
- [ ] 统一超时和重试策略
- [ ] 添加请求拦截器 (日志/监控)

**参考代码**:
```javascript
// Before:
const res = await fetch(url, { headers, signal });

// After:
const res = await HttpService.request(url, {
  headers,
  timeout: 15000,
  retries: 3
});
```

---

### 6. 统一错误处理 ⏱️ 2天

**问题**: 3种错误处理方式并存

**任务清单**:
- [ ] 为每个模块创建专属错误处理器
- [ ] 统一错误消息格式
- [ ] 添加错误分类和统计

**参考代码**:
```javascript
// 每个模块创建专属处理器
const handleError = ErrorService.createHandler('MasterPrompt');

try {
  await scrapeAsin(asin);
} catch (error) {
  handleError(error, { action: 'scrapeAsin', asin });
}
```

---

### 7. 优化状态树结构 ⏱️ 3天

**问题**: 缺少命名空间隔离,大型应用可能冲突

**任务清单**:
- [ ] 引入模块命名空间
- [ ] 迁移现有状态到新结构
- [ ] 添加状态树可视化工具

**参考代码**:
```javascript
// Before:
state.scraper.isScraping

// After:
state.modules.masterPrompt.scraper.isScraping
state.modules.keywordHunter.keywords
```

---

### 8. 添加 Zod 类型校验 ⏱️ 2天

**问题**: 缺少运行时类型校验

**任务清单**:
- [ ] 为关键数据结构定义 Schema
- [ ] 在 API 边界添加校验
- [ ] 集成到 StateManager 中间件

**参考代码**:
```javascript
import { z } from 'zod';

// 定义 Schema
const ProductSchema = z.object({
  asin: z.string().regex(/^[A-Z0-9]{10}$/),
  productTitle: z.string().min(1),
  feature_bullets: z.array(z.string()).max(5),
  customer_reviews: z.array(ReviewSchema)
});

// 使用
const product = ProductSchema.parse(rawData); // 抛出错误
const product = ProductSchema.safeParse(rawData); // 返回 { success, data, error }
```

---

## 🎯 P2 级别 - 可选优化 (上线后1月内)

### 9. 性能优化 ⏱️ 1周

**任务清单**:
- [ ] 优化粒子动画 (Web Worker)
- [ ] 优化状态通知机制 (批量更新)
- [ ] 添加虚拟滚动 (大列表)
- [ ] 图片懒加载

---

### 10. 测试覆盖提升 ⏱️ 2周

**任务清单**:
- [ ] 为核心业务逻辑添加单元测试
- [ ] 添加集成测试 (路由 + 状态)
- [ ] 添加E2E测试 (关键流程)
- [ ] 目标覆盖率: 60%+

---

### 11. 日志系统 ⏱️ 3天

**任务清单**:
- [ ] 实现统一日志服务
- [ ] 支持日志级别控制
- [ ] 生产环境日志上报

---

### 12. 错误追踪 ⏱️ 3天

**任务清单**:
- [ ] 集成 Sentry
- [ ] 添加用户行为追踪
- [ ] 实现错误重现机制

---

## 📊 进度追踪

### 每日检查清单

```markdown
## Day 1
- [ ] P0-1: 统一存储方式 (50%)
- [ ] P0-2: 修复路由状态 (100%)

## Day 2
- [ ] P0-1: 统一存储方式 (100%)
- [ ] P0-3: 完善模块卸载 (50%)

## Day 3
- [ ] P0-3: 完善模块卸载 (100%)
- [ ] P0-4: API密钥加密 (50%)

## Day 4
- [ ] P0-4: API密钥加密 (100%)
- [ ] 集成测试

## Day 5
- [ ] 回归测试
- [ ] 性能测试
- [ ] 准备上线
```

### 验收标准

**上线前必须满足**:
- ✅ 所有 P0 任务完成
- ✅ 无阻塞性 Bug
- ✅ 核心流程测试通过
- ✅ 性能指标达标 (首屏 < 2s)
- ✅ 安全扫描通过

**上线后1周内**:
- ✅ 所有 P1 任务完成
- ✅ 监控和告警配置完成
- ✅ 用户反馈收集机制就绪

---

## 🛠️ 工具和脚本

### 自动化检查脚本

```bash
#!/bin/bash
# check-before-deploy.sh

echo "🔍 检查 localStorage 直接调用..."
LOCALSTORAGE_COUNT=$(grep -r "localStorage\." src/ --exclude-dir=node_modules --exclude="storageService.js" | wc -l)
if [ $LOCALSTORAGE_COUNT -gt 0 ]; then
  echo "❌ 发现 $LOCALSTORAGE_COUNT 处 localStorage 直接调用"
  exit 1
fi

echo "🔍 检查路由直接 hash 操作..."
HASH_COUNT=$(grep -r "window.location.hash =" src/ | wc -l)
if [ $HASH_COUNT -gt 0 ]; then
  echo "❌ 发现 $HASH_COUNT 处直接 hash 操作"
  exit 1
fi

echo "🔍 检查模块卸载实现..."
# 检查所有 BaseModule 子类是否实现 onUnmount
# (需要自定义脚本)

echo "✅ 所有检查通过!"
```

### 性能监控脚本

```javascript
// src/common/utils/performance.js
export class PerformanceMonitor {
  static measure(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
    
    // 上报到监控服务
    if (end - start > 1000) {
      console.warn(`⚠️ ${name} 执行时间过长`);
    }
    
    return result;
  }
}
```

---

## 📞 联系方式

**问题反馈**: 
- 技术问题: 提交 Issue
- 紧急问题: 联系架构负责人

**文档更新**:
- 完成任务后更新本清单
- 标记完成日期和负责人

---

**最后更新**: 2026-02-05  
**负责人**: 开发团队  
**审核人**: 架构师
