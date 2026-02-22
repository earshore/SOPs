# SafeRenderer API 文档

## 概述

`SafeRenderer` 是一个安全的 DOM 渲染器，提供防止 XSS 攻击的渲染方法。它采用单例模式设计，确保全局只有一个实例。

**核心特性：**
- 自动 HTML 转义，防止 XSS 攻击
- 支持模板插值语法 `{{key}}`
- 高性能列表渲染（使用 DocumentFragment）
- 灵活的白名单机制
- 类型安全的 TypeScript 接口

**文件路径：** `src/common/infrastructure/SafeRenderer.ts`

---

## 快速开始

```typescript
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';

// 获取单例实例
const renderer = SafeRenderer.getInstance();

// 或使用导出的便捷实例
import { safeRenderer } from '@/common/infrastructure/SafeRenderer';
```

---

## API 参考

### 类方法

#### `getInstance()`

获取 SafeRenderer 单例实例。

**签名：**
```typescript
static getInstance(): SafeRenderer
```

**返回值：**
- `SafeRenderer` - SafeRenderer 实例

**示例：**
```typescript
const renderer = SafeRenderer.getInstance();
```

---

#### `renderTemplate()`

渲染静态模板（已审计，无需转义）。

用于渲染已经过安全审计的静态 HTML 模板，不进行任何转义处理。

**签名：**
```typescript
renderTemplate(container: HTMLElement, template: string): void
```

**参数：**
- `container` (HTMLElement) - 目标容器元素
- `template` (string) - HTML 模板字符串

**抛出异常：**
- `Error` - 当 container 为空或 template 不是字符串时

**示例：**
```typescript
const renderer = SafeRenderer.getInstance();
const container = document.getElementById('app');

renderer.renderTemplate(container, `
  <div class="card">
    <h2>Welcome</h2>
    <p>This is a static template</p>
  </div>
`);
```

**使用场景：**
- 渲染预定义的 UI 组件
- 渲染已审计的静态内容
- 渲染不包含用户输入的模板

**注意事项：**
- ⚠️ 此方法不进行任何转义，仅用于已审计的静态内容
- ⚠️ 不要将用户输入直接传入此方法

---

#### `renderDynamic()`

渲染动态内容（自动转义）。

用于渲染包含用户输入或动态数据的内容，自动进行 XSS 防护。支持 `{{key}}` 插值语法。

**签名：**
```typescript
renderDynamic(
  container: HTMLElement,
  template: string,
  data: Record<string, any>,
  options?: RenderOptions
): void
```

**参数：**
- `container` (HTMLElement) - 目标容器元素
- `template` (string) - 模板字符串，支持 `{{key}}` 插值语法
- `data` (Record<string, any>) - 数据对象
- `options` (RenderOptions, 可选) - 渲染选项

**RenderOptions 接口：**
```typescript
interface RenderOptions {
  sanitize?: boolean;        // 是否转义 HTML，默认 true
  allowedTags?: string[];    // 允许的 HTML 标签白名单
  allowedAttrs?: string[];   // 允许的 HTML 属性白名单
}
```

**抛出异常：**
- `Error` - 当 container 为空或 template 不是字符串时

**示例 1：基本用法（自动转义）**
```typescript
const renderer = SafeRenderer.getInstance();
const container = document.getElementById('user-info');

renderer.renderDynamic(
  container,
  '<div class="user">Hello {{name}}, you are {{age}} years old</div>',
  { 
    name: '<script>alert("xss")</script>',
    age: 25 
  }
);

// 输出: <div class="user">Hello &lt;script&gt;alert("xss")&lt;/script&gt;, you are 25 years old</div>
```

**示例 2：使用白名单（允许特定标签）**
```typescript
renderer.renderDynamic(
  container,
  '<div>{{content}}</div>',
  { 
    content: '<p>Hello</p><script>alert("xss")</script>' 
  },
  {
    allowedTags: ['p', 'strong', 'em'],
    allowedAttrs: ['class']
  }
);

// 输出: <div><p>Hello</p></div>
// <script> 标签被移除
```

**示例 3：禁用转义（谨慎使用）**
```typescript
renderer.renderDynamic(
  container,
  '<div>{{html}}</div>',
  { 
    html: '<strong>Bold Text</strong>' 
  },
  { sanitize: false }
);

// 输出: <div><strong>Bold Text</strong></div>
```

**使用场景：**
- 渲染用户输入的内容
- 渲染来自 API 的动态数据
- 渲染包含变量的模板

**注意事项：**
- ✅ 默认会转义所有 HTML 特殊字符
- ✅ 支持 `{{key}}` 插值语法
- ⚠️ 如果设置 `sanitize: false`，请确保数据来源可信

---

#### `renderList()`

渲染列表（使用 DocumentFragment 优化性能）。

高效渲染大量列表项，避免多次 DOM 操作。使用 DocumentFragment 一次性插入所有元素。

**签名：**
```typescript
renderList<T>(
  container: HTMLElement,
  items: T[],
  renderer: (item: T, index: number) => string,
  options?: ListRenderOptions
): void
```

**参数：**
- `container` (HTMLElement) - 目标容器元素
- `items` (T[]) - 数据数组
- `renderer` (Function) - 渲染函数，接收 item 和 index，返回 HTML 字符串
- `options` (ListRenderOptions, 可选) - 列表渲染选项

**ListRenderOptions 接口：**
```typescript
interface ListRenderOptions extends RenderOptions {
  emptyMessage?: string;     // 空列表时显示的消息
  containerTag?: string;     // 容器标签名，默认 'div'
}
```

**抛出异常：**
- `Error` - 当 container 为空、items 不是数组或 renderer 不是函数时

**示例 1：基本用法**
```typescript
const renderer = SafeRenderer.getInstance();
const container = document.getElementById('user-list');

const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com' }
];

renderer.renderList(
  container,
  users,
  (user, index) => `
    <div class="user-item">
      <span class="name">${user.name}</span>
      <span class="email">${user.email}</span>
    </div>
  `
);
```

**示例 2：空列表提示**
```typescript
renderer.renderList(
  container,
  [],
  (user) => `<div>${user.name}</div>`,
  { emptyMessage: 'No users found' }
);

// 输出: <div class="empty-message">No users found</div>
```

**示例 3：自定义容器标签**
```typescript
renderer.renderList(
  container,
  items,
  (item) => `<span>${item.name}</span>`,
  { containerTag: 'li' }
);

// 每个 item 会被包裹在 <li> 标签中
```

**示例 4：使用白名单**
```typescript
renderer.renderList(
  container,
  comments,
  (comment) => `<p>${comment.text}</p><strong>${comment.author}</strong>`,
  {
    allowedTags: ['p', 'strong'],
    allowedAttrs: ['class']
  }
);
```

**使用场景：**
- 渲染用户列表、评论列表等
- 渲染搜索结果
- 渲染表格行
- 任何需要渲染大量重复元素的场景

**性能优势：**
- ✅ 使用 DocumentFragment 减少 DOM 操作
- ✅ 一次性插入所有元素，避免多次重排
- ✅ 适合渲染大量数据（100+ 项）

**注意事项：**
- ✅ 默认会转义渲染函数返回的 HTML
- ✅ 空数组会清空容器
- ⚠️ 渲染函数应返回字符串，不要返回 DOM 元素

---

#### `renderComponent()`

渲染组件。

渲染预定义的组件模板，将组件名称和属性设置为 data 属性。

**签名：**
```typescript
renderComponent(
  container: HTMLElement,
  componentName: string,
  props?: Record<string, any>
): void
```

**参数：**
- `container` (HTMLElement) - 目标容器元素
- `componentName` (string) - 组件名称
- `props` (Record<string, any>, 可选) - 组件属性

**抛出异常：**
- `Error` - 当 container 为空或 componentName 为空时

**示例：**
```typescript
const renderer = SafeRenderer.getInstance();
const container = document.getElementById('app');

renderer.renderComponent(container, 'user-card', {
  name: 'John Doe',
  age: 30,
  role: 'Developer'
});

// 输出:
// <div data-component="user-card" 
//      data-name="John Doe" 
//      data-age="30" 
//      data-role="Developer">
// </div>
```

**使用场景：**
- 渲染 Web Components
- 渲染 Alpine.js 组件
- 渲染需要延迟初始化的组件

**注意事项：**
- ✅ 只有字符串和数字类型的 props 会被设置为 data 属性
- ✅ 组件名称会被设置为 `data-component` 属性
- ⚠️ 对象和数组类型的 props 会被忽略

---

#### `escapeHtml()`

转义 HTML 特殊字符。

将 HTML 特殊字符转换为实体编码，防止 XSS 攻击。

**签名：**
```typescript
escapeHtml(text: string): string
```

**参数：**
- `text` (string) - 要转义的文本

**返回值：**
- `string` - 转义后的文本

**转义规则：**
```typescript
'&'  → '&amp;'
'<'  → '&lt;'
'>'  → '&gt;'
'"'  → '&quot;'
"'"  → '&#x27;'
'/'  → '&#x2F;'
```

**示例：**
```typescript
const renderer = SafeRenderer.getInstance();

const unsafe = '<script>alert("xss")</script>';
const safe = renderer.escapeHtml(unsafe);

console.log(safe);
// 输出: &lt;script&gt;alert("xss")&lt;/script&gt;
```

**使用场景：**
- 手动转义用户输入
- 在模板引擎中使用
- 生成安全的 HTML 字符串

**注意事项：**
- ✅ 如果传入非字符串，会自动转换为字符串
- ✅ 转义后的文本可以安全地插入 HTML

---

#### `sanitizeHtml()`

清理 HTML，只保留白名单中的标签和属性。

使用白名单机制过滤 HTML，移除危险的标签和属性。

**签名：**
```typescript
sanitizeHtml(html: string, options?: RenderOptions): string
```

**参数：**
- `html` (string) - 要清理的 HTML 字符串
- `options` (RenderOptions, 可选) - 清理选项

**返回值：**
- `string` - 清理后的 HTML

**默认白名单：**
```typescript
// 默认允许的标签
['p', 'br', 'strong', 'em', 'u', 'span', 'ul', 'ol', 'li', 'a', 'img']

// 默认允许的属性
['href', 'src', 'alt', 'title', 'class']
```

**示例 1：使用默认白名单**
```typescript
const renderer = SafeRenderer.getInstance();

const dirty = `
  <div onclick="alert('xss')">
    <p>Hello</p>
    <script>alert('xss')</script>
    <strong>World</strong>
  </div>
`;

const clean = renderer.sanitizeHtml(dirty);

console.log(clean);
// 输出: <p>Hello</p><strong>World</strong>
// <div> 和 <script> 被移除，onclick 属性被移除
```

**示例 2：自定义白名单**
```typescript
const clean = renderer.sanitizeHtml(dirty, {
  allowedTags: ['div', 'p', 'span'],
  allowedAttrs: ['class', 'id']
});
```

**示例 3：清理富文本编辑器内容**
```typescript
const userContent = `
  <p>Normal text</p>
  <strong>Bold text</strong>
  <a href="https://example.com">Link</a>
  <a href="javascript:alert('xss')">Bad Link</a>
  <img src="image.jpg" onerror="alert('xss')" />
`;

const clean = renderer.sanitizeHtml(userContent);

// javascript: 协议的链接会被移除
// onerror 属性会被移除
```

**使用场景：**
- 清理富文本编辑器内容
- 清理用户提交的 HTML
- 清理来自第三方 API 的 HTML

**安全特性：**
- ✅ 移除不在白名单中的标签
- ✅ 移除不在白名单中的属性
- ✅ 阻止 `javascript:` 和 `data:` 协议
- ✅ 递归清理所有子节点

**注意事项：**
- ✅ 如果传入非字符串，返回空字符串
- ⚠️ 白名单应根据实际需求配置，不要过于宽松

---

## 类型定义

### RenderOptions

渲染选项接口。

```typescript
interface RenderOptions {
  /** 是否转义 HTML，默认 true */
  sanitize?: boolean;
  
  /** 允许的 HTML 标签白名单 */
  allowedTags?: string[];
  
  /** 允许的 HTML 属性白名单 */
  allowedAttrs?: string[];
}
```

### ListRenderOptions

列表渲染选项接口，继承自 RenderOptions。

```typescript
interface ListRenderOptions extends RenderOptions {
  /** 空列表时显示的消息 */
  emptyMessage?: string;
  
  /** 容器标签名，默认 'div' */
  containerTag?: string;
}
```

---

## 使用指南

### 1. 选择合适的渲染方法

| 方法 | 使用场景 | 是否转义 |
|------|---------|---------|
| `renderTemplate()` | 静态模板，已审计的内容 | ❌ 否 |
| `renderDynamic()` | 动态内容，用户输入 | ✅ 是（默认） |
| `renderList()` | 列表渲染，大量数据 | ✅ 是（默认） |
| `renderComponent()` | 组件渲染 | ✅ 是 |

### 2. XSS 防护最佳实践

**✅ 推荐做法：**
```typescript
// 1. 使用 renderDynamic 渲染用户输入
renderer.renderDynamic(container, '<div>{{userInput}}</div>', { userInput });

// 2. 使用 escapeHtml 手动转义
const safe = renderer.escapeHtml(userInput);
container.innerHTML = `<div>${safe}</div>`;

// 3. 使用 sanitizeHtml 清理富文本
const clean = renderer.sanitizeHtml(richText, {
  allowedTags: ['p', 'strong', 'em'],
  allowedAttrs: ['class']
});
```

**❌ 不推荐做法：**
```typescript
// 1. 直接使用 innerHTML（危险）
container.innerHTML = userInput; // ❌ XSS 风险

// 2. 使用 renderTemplate 渲染用户输入（危险）
renderer.renderTemplate(container, userInput); // ❌ XSS 风险

// 3. 禁用转义而不使用白名单（危险）
renderer.renderDynamic(container, template, data, { sanitize: false }); // ❌ XSS 风险
```

### 3. 性能优化建议

**列表渲染优化：**
```typescript
// ✅ 推荐：使用 renderList（使用 DocumentFragment）
renderer.renderList(container, items, (item) => `<div>${item.name}</div>`);

// ❌ 不推荐：循环使用 innerHTML
items.forEach(item => {
  container.innerHTML += `<div>${item.name}</div>`; // 多次重排
});
```

**模板缓存：**
```typescript
// 缓存常用模板
const templates = {
  userCard: '<div class="card">{{name}} - {{email}}</div>',
  productCard: '<div class="product">{{title}} - ${{price}}</div>'
};

// 重复使用
renderer.renderDynamic(container, templates.userCard, userData);
```

### 4. 与 Alpine.js 集成

```typescript
// 渲染 Alpine.js 组件
renderer.renderTemplate(container, `
  <div x-data="userPanel()">
    <h2 x-text="title"></h2>
    <button @click="handleClick">Click Me</button>
  </div>
`);

// 或使用 renderComponent
renderer.renderComponent(container, 'user-panel', {
  userId: 123,
  mode: 'edit'
});
```

### 5. 错误处理

```typescript
try {
  renderer.renderDynamic(container, template, data);
} catch (error) {
  console.error('Render failed:', error);
  
  // 显示降级 UI
  renderer.renderTemplate(container, `
    <div class="error">
      <p>Failed to render content</p>
      <button onclick="location.reload()">Retry</button>
    </div>
  `);
}
```

---

## 常见问题

### Q1: renderTemplate 和 renderDynamic 有什么区别？

**A:** 
- `renderTemplate()` 不进行任何转义，用于已审计的静态内容
- `renderDynamic()` 默认转义所有插值，用于包含用户输入的动态内容

### Q2: 如何渲染富文本内容？

**A:** 使用 `renderDynamic()` 配合白名单：
```typescript
renderer.renderDynamic(
  container,
  '<div>{{content}}</div>',
  { content: richText },
  {
    allowedTags: ['p', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
    allowedAttrs: ['href', 'class']
  }
);
```

### Q3: renderList 的性能优势是什么？

**A:** 
- 使用 DocumentFragment 一次性插入所有元素
- 避免多次 DOM 操作和重排
- 适合渲染 100+ 项的大列表

### Q4: 如何禁用转义？

**A:** 设置 `sanitize: false`，但请确保数据来源可信：
```typescript
renderer.renderDynamic(
  container,
  template,
  data,
  { sanitize: false } // ⚠️ 谨慎使用
);
```

### Q5: 如何自定义白名单？

**A:** 通过 `allowedTags` 和 `allowedAttrs` 选项：
```typescript
renderer.sanitizeHtml(html, {
  allowedTags: ['div', 'p', 'span', 'a'],
  allowedAttrs: ['href', 'class', 'id', 'data-*']
});
```

---

## 迁移指南

### 从 innerHTML 迁移

**迁移前：**
```typescript
// 旧代码（不安全）
container.innerHTML = `<div>${userInput}</div>`;
```

**迁移后：**
```typescript
// 新代码（安全）
const renderer = SafeRenderer.getInstance();
renderer.renderDynamic(container, '<div>{{input}}</div>', { input: userInput });
```

### 从字符串拼接迁移

**迁移前：**
```typescript
// 旧代码
let html = '<ul>';
items.forEach(item => {
  html += `<li>${item.name}</li>`;
});
html += '</ul>';
container.innerHTML = html;
```

**迁移后：**
```typescript
// 新代码
const renderer = SafeRenderer.getInstance();
renderer.renderList(
  container,
  items,
  (item) => `<li>${item.name}</li>`,
  { containerTag: 'li' }
);
```

---

## 相关文档

- [SafeModuleLoader API 文档](./SafeModuleLoader.md)
- [AlpineRegistry API 文档](./AlpineRegistry.md)
- [系统稳定性优化 - 设计文档](../../.kiro/specs/system-stability-optimization/design.md)
- [系统稳定性优化 - 需求文档](../../.kiro/specs/system-stability-optimization/requirements.md)

---

## 更新日志

### v1.0.0 (2025-01-XX)
- ✅ 初始版本
- ✅ 实现基础渲染方法
- ✅ 实现 XSS 防护
- ✅ 实现白名单机制
- ✅ 实现列表渲染优化

---

## 许可证

MIT License
