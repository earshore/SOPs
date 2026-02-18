# P0 严重风险修复方案

**优先级**: 🔴 P0 - 必须在发布前修复  
**预计工作量**: 2-3 天  
**负责人**: 开发团队

---

## 风险 #1: XSS 注入漏洞

### 问题描述
项目中多处直接使用 `innerHTML` 插入用户输入,未经过滤和转义,存在严重的 XSS 注入风险。

### 影响范围
- 用户输入的 ASIN
- LLM 生成的分析报告
- 评论内容展示
- Prompt 模板渲染

### 漏洞示例
```javascript
// ❌ 危险代码
container.innerHTML = `<div class="title">${product.title}</div>`;

// 如果 product.title = '<img src=x onerror=alert(document.cookie)>'
// 将执行恶意脚本
```

### 修复方案

#### 方案 A: 全局搜索替换 (推荐)
```bash
# 1. 搜索所有 innerHTML 使用
grep -r "innerHTML\s*=" src/

# 2. 逐个审查并替换
```

**替换规则**:
```javascript
// 纯文本内容 → 使用 textContent
element.innerHTML = userInput;
// 改为
element.textContent = userInput;

// HTML 模板 + 变量 → 使用 escapeHtml
element.innerHTML = `<div>${title}</div>`;
// 改为
import { escapeHtml } from '@/common/utils/security.js';
element.innerHTML = `<div>${escapeHtml(title)}</div>`;

// 复杂 HTML → 使用 setSafeHtml
element.innerHTML = complexHtml;
// 改为
import { setSafeHtml } from '@/common/utils/security.js';
setSafeHtml(element, complexHtml);
```

#### 方案 B: 创建安全包装器
```javascript
// src/common/utils/dom.js
import { escapeHtml, setSafeHtml } from './security.js';

/**
 * 安全的 innerHTML 设置
 * @param {HTMLElement} element 
 * @param {string} html 
 */
export function setHTML(element, html) {
  if (!element) return;
  
  // 检测是否包含用户输入
  if (html.includes('{{') || html.includes('${')) {
    console.warn('[Security] 检测到模板变量,请使用 escapeHtml');
  }
  
  setSafeHtml(element, html);
}

// 全局替换
// innerHTML = xxx  →  setHTML(element, xxx)
```

#### 方案 C: 使用模板引擎 (长期方案)
```javascript
// 引入 lit-html 或 Vue 模板
import { html, render } from 'lit-html';

render(html`
  <div class="title">${product.title}</div>
`, container);
// lit-html 自动转义
```

### 修复清单

#### 高危文件 (必须修复)
- [ ] `src/modules/app_center/views/master_prompt/analysis/renderer.js`
  - 分析报告渲染
  - 评论内容展示
- [ ] `src/modules/app_center/views/master_prompt/data/index.js`
  - 数据预览表格
- [ ] `src/modules/app_center/views/master_prompt/scraper/index.js`
  - ASIN 输入处理
- [ ] `src/modules/sops/views/service/email_templates/index.js`
  - 邮件模板渲染
- [ ] `src/components/modal/AppModal.js`
  - 模态框内容

#### 中危文件 (建议修复)
- [ ] `src/common/utils/ui.js`
  - Toast 消息
  - Mega Menu 渲染
- [ ] `src/modules/more/views/explore/prompts/index.js`
  - Prompt 库展示

### 测试方案
```javascript
// tests/security/xss.test.js
describe('XSS 防护测试', () => {
  test('应该转义 HTML 标签', () => {
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

---

## 风险 #2: API 密钥泄露

### 问题描述
生产环境允许用户直接配置 OpenAI API Key,密钥存储在浏览器 localStorage 中,可能被以下方式窃取:
1. XSS 攻击
2. 浏览器插件
3. 开发者工具

### 影响范围
- OpenAI API Key
- Anthropic API Key
- 其他第三方 API Key

### 修复方案

#### 方案 A: 强制使用代理 (推荐)
```javascript
// src/services/llmService.js
export async function callLLM(messages, provider, endpoint, apiKey, model, options = {}) {
  // 🔒 生产环境安全检查
  if (EnvConfig.isProduction) {
    // 禁止直接调用外部 API
    const dangerousEndpoints = [
      'api.openai.com',
      'api.anthropic.com',
      'api.deepseek.com'
    ];
    
    if (dangerousEndpoints.some(domain => endpoint.includes(domain))) {
      throw new Error(
        '⛔ 安全限制: 生产环境禁止直接调用外部 API\n' +
        '请使用内置代理或联系管理员配置企业网关'
      );
    }
  }
  
  // 继续原有逻辑...
}
```

#### 方案 B: 服务端代理 (已实现)
```javascript
// functions/v1/chat/completions.js (Cloudflare Workers)
export async function onRequest(context) {
  const { request, env } = context;
  
  // 1. 验证请求来源
  const origin = request.headers.get('Origin');
  if (!isAllowedOrigin(origin)) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // 2. 从环境变量读取 API Key (不暴露给前端)
  const apiKey = env.OPENAI_API_KEY;
  
  // 3. 转发请求
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: await request.text()
  });
  
  return response;
}
```

#### 方案 C: 密钥加密增强
```javascript
// src/common/utils/secureStorage.js
// 当前实现: 基于设备指纹加密
// 问题: 设备指纹可被逆向

// 改进: 添加用户密码保护
export const SecureStorage = {
  async setSecure(key, data, userPassword = null) {
    // 1. 如果提供了用户密码,使用 PBKDF2 派生密钥
    let encryptionKey;
    if (userPassword) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      encryptionKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(userPassword),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        encryptionKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      // 保存 salt
      StorageService.set(`${key}_salt`, Array.from(salt));
    } else {
      // 回退到设备指纹
      const fingerprint = await getDeviceFingerprint();
      encryptionKey = await importKey(fingerprint);
    }
    
    // 2. 加密数据
    // ... (原有逻辑)
  }
};
```

### 修复清单
- [ ] 在 `llmService.js` 添加生产环境检查
- [ ] 在设置页面添加警告提示
- [ ] 更新用户文档,说明安全最佳实践
- [ ] 配置 Cloudflare Workers 代理
- [ ] 测试代理功能

### 用户提示
```javascript
// src/components/settings/systemSettings.js
function renderSecurityWarning() {
  if (EnvConfig.isProduction) {
    return `
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <div class="flex items-start">
          <i class="fas fa-exclamation-triangle text-amber-500 mt-1 mr-3"></i>
          <div>
            <h4 class="font-bold text-amber-800 mb-1">安全提示</h4>
            <p class="text-sm text-amber-700">
              为保护您的 API 密钥安全,生产环境已禁用直接调用外部 API。
              请使用内置代理或联系管理员配置企业网关。
            </p>
          </div>
        </div>
      </div>
    `;
  }
  return '';
}
```

---

## 风险 #3: 循环依赖导致加载失败

### 问题描述
`actionRegistry.js` 和 `BaseModule.js` 之间存在循环依赖:
- `BaseModule` 需要 `registerActionsWithLegacy` 来注册动作
- `actionRegistry` 可能需要 `BaseModule` 的类型定义

### 影响范围
- 模块初始化可能失败
- 热更新 (HMR) 可能出错
- 打包后加载顺序不确定

### 当前临时方案
```javascript
// BaseModule.js
async registerActions(actions) {
  // 动态导入避免循环依赖
  const { registerActionsWithLegacy } = await import('./utils/actionRegistry.js');
  // ...
}
```

**问题**: 动态导入是异步的,可能导致时序问题

### 修复方案

#### 方案 A: 依赖注入 (推荐)
```javascript
// src/common/di/container.js
class DIContainer {
  constructor() {
    this.services = new Map();
  }
  
  register(name, factory) {
    this.services.set(name, factory);
  }
  
  resolve(name) {
    const factory = this.services.get(name);
    if (!factory) throw new Error(`Service not found: ${name}`);
    return factory(this);
  }
}

export const container = new DIContainer();

// main.js
import { container } from './common/di/container.js';
import { actionRegistry } from './common/utils/actionRegistry.js';

container.register('actionRegistry', () => actionRegistry);

// BaseModule.js
import { container } from './di/container.js';

class BaseModule {
  async registerActions(actions) {
    const registry = container.resolve('actionRegistry');
    const actionNames = registry.registerActionsWithLegacy(actions);
    this._registeredActions.push(...actionNames);
  }
}
```

#### 方案 B: 事件驱动 (简单)
```javascript
// src/common/EventBus.js
// 已存在,直接使用

// BaseModule.js
class BaseModule {
  registerActions(actions) {
    // 发送事件而非直接调用
    eventBus.emit('registerActions', {
      moduleId: this.moduleId,
      actions
    });
    
    this._registeredActions.push(...Object.keys(actions));
  }
}

// actionRegistry.js
eventBus.on('registerActions', ({ moduleId, actions }) => {
  registerActionsWithLegacy(actions);
  console.log(`[ActionRegistry] Registered actions for ${moduleId}`);
});
```

#### 方案 C: 提取接口 (TypeScript 风格)
```javascript
// src/common/interfaces/IActionRegistry.js
export class IActionRegistry {
  registerActionsWithLegacy(actions) {
    throw new Error('Not implemented');
  }
  
  unregisterActions(actionNames) {
    throw new Error('Not implemented');
  }
}

// actionRegistry.js
import { IActionRegistry } from '../interfaces/IActionRegistry.js';

class ActionRegistry extends IActionRegistry {
  registerActionsWithLegacy(actions) {
    // 实现
  }
}

// BaseModule.js
// 只依赖接口,不依赖实现
import { IActionRegistry } from './interfaces/IActionRegistry.js';
```

### 修复清单
- [ ] 选择修复方案 (推荐方案 B: 事件驱动)
- [ ] 重构 `BaseModule.registerActions`
- [ ] 重构 `actionRegistry` 监听事件
- [ ] 测试模块加载顺序
- [ ] 测试热更新 (HMR)

### 测试方案
```javascript
// tests/unit/BaseModule.test.js
describe('BaseModule 循环依赖测试', () => {
  test('应该能正常注册动作', async () => {
    const module = new TestModule('test');
    await module.registerActions({
      testAction: () => console.log('test')
    });
    
    expect(module._registeredActions).toContain('testAction');
  });
  
  test('卸载时应该清理动作', () => {
    const module = new TestModule('test');
    module.registerActions({ testAction: () => {} });
    module.unmount();
    
    // 验证动作已从全局注册表移除
    expect(window.testAction).toBeUndefined();
  });
});
```

---

## 修复时间表

### 第 1 天: XSS 修复
- [ ] 上午: 搜索所有 `innerHTML` 使用 (2h)
- [ ] 下午: 修复高危文件 (4h)
- [ ] 晚上: 编写安全测试 (2h)

### 第 2 天: API 密钥安全
- [ ] 上午: 添加生产环境检查 (2h)
- [ ] 下午: 配置 Cloudflare Workers (3h)
- [ ] 晚上: 测试代理功能 (2h)

### 第 3 天: 循环依赖修复
- [ ] 上午: 实现事件驱动方案 (3h)
- [ ] 下午: 测试模块加载 (2h)
- [ ] 晚上: 回归测试 (2h)

---

## 验收标准

### XSS 防护
- [ ] 所有用户输入都经过 `escapeHtml` 处理
- [ ] 所有 `innerHTML` 使用都经过审查
- [ ] 安全测试通过 (无 XSS 漏洞)

### API 密钥安全
- [ ] 生产环境禁止直接调用外部 API
- [ ] Cloudflare Workers 代理正常工作
- [ ] 用户看到安全警告提示

### 循环依赖
- [ ] 模块加载顺序稳定
- [ ] 热更新 (HMR) 正常工作
- [ ] 无控制台错误

---

## 回滚方案

如果修复导致严重问题,按以下步骤回滚:

1. **Git 回滚**
```bash
git revert <commit-hash>
git push origin main
```

2. **Cloudflare 回滚**
```bash
# 回滚到上一个部署版本
wrangler rollback
```

3. **通知用户**
```
发布公告: "由于技术问题,已回滚到上一版本,预计 X 小时后恢复"
```

---

## 后续监控

修复完成后,持续监控以下指标:

1. **错误率**
   - 目标: < 0.1%
   - 监控: Sentry 错误追踪

2. **安全事件**
   - XSS 攻击尝试
   - API 密钥泄露尝试

3. **性能影响**
   - 首屏加载时间
   - API 调用延迟

---

**修复负责人**: 开发团队  
**审查人**: 技术负责人  
**预计完成时间**: 3 个工作日  
**风险等级**: 🔴 P0 - 阻塞发布
