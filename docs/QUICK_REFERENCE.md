# 项目快速参考

本文档提供 SOPs 项目的快速参考信息。

**规范导航：** [INDEX.md](./INDEX.md)（含 30 秒决策树）  
**产品原则：** [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md)  
**文案 / a11y / 运维 / 安全：** [CONTENT_DESIGN](./CONTENT_DESIGN.md) · [ACCESSIBILITY](./ACCESSIBILITY.md) · [OPS_RUNBOOK](./OPS_RUNBOOK.md) · [SECURITY_PLAYBOOK](./SECURITY_PLAYBOOK.md)  
**测试策略：** [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)  
**活债务：** [TECH_DEBT_BOARD.md](./TECH_DEBT_BOARD.md)

---

## 🚀 快速命令

### 开发
```bash
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run preview          # 预览生产版本
```

### 代码质量
```bash
npm run lint             # ESLint 检查
npm run lint:fix         # 自动修复
npm run type-check       # TypeScript 检查
npm run format           # Prettier 格式化
```

### 测试
```bash
npm run test             # 单元测试
npm run test:e2e         # E2E 测试
npm run test:e2e:smoke   # Release smoke
npm run test:unit:settings
npm run test:settings    # 设置域闭环
npm run test:coverage    # 覆盖率报告
```

### CSS 工具
```bash
npm run generate:tokens  # 生成设计令牌
npm run css:audit        # CSS 审查
npm run css:migrate      # CSS 迁移
```

---

## 📁 项目结构

```
SOPs/
├── src/
│   ├── common/          # 公共模块
│   │   ├── config/      # 配置（设计令牌）
│   │   ├── di/          # 依赖注入
│   │   ├── router/      # 路由系统
│   │   └── utils/       # 工具函数
│   ├── css/             # 样式文件
│   ├── modules/         # 业务模块
│   ├── services/        # 服务层
│   └── components/      # 组件
├── docs/                # 文档（archive/ 为历史归档）
├── tests/               # 测试
└── scripts/             # 构建脚本
```

---

## 🎨 设计令牌

### 颜色
```css
var(--color-blue-500)    /* 主色 */
var(--color-gray-100)    /* 背景色 */
var(--color-red-500)     /* 错误色 */
```

### 间距
```css
var(--spacing-4)         /* 16px */
var(--spacing-8)         /* 32px */
var(--spacing-12)        /* 48px */
```

### 圆角
```css
var(--rounded-sm)        /* 2px */
var(--rounded-md)        /* 4px */
var(--rounded-lg)        /* 8px */
```

### 阴影
```css
var(--shadow-sm)         /* 小阴影 */
var(--shadow-md)         /* 中阴影 */
var(--shadow-lg)         /* 大阴影 */
```

---

## 🔧 路径别名

```typescript
@/          → src/
@common/    → src/common/
@services/  → src/services/
@modules/   → src/modules/
@components/→ src/components/
@types/     → src/types/
@router/    → src/common/router/
```

---

## 📝 提交规范

```bash
feat:     新功能
fix:      Bug 修复
docs:     文档更新
style:    代码格式
refactor: 重构
perf:     性能优化
test:     测试相关
chore:    构建/工具变动
```

### 示例
```bash
git commit -m "feat(auth): add user login"
git commit -m "fix(router): fix navigation error"
git commit -m "docs(readme): update installation"
```

---

## 🏗️ 架构模式

### 模块开发
```typescript
export default class MyModule extends BaseModule {
  constructor() {
    super('my-module-id');
  }

  async mount(container: HTMLElement): Promise<void> {
    this.container = container;
    // 初始化逻辑
  }

  unmount(): void {
    super.unmount();
  }
}
```

### 服务使用
```typescript
const logger = await this.getLogger();
const storage = this.getService('storage');
const http = await this.getHttp();
```

### 事件系统
```typescript
import eventBus from '@common/EventBus';
import { APP_EVENTS } from '@common/constants/eventConstants';

// 监听路由系统发出的变更事件
const unsubscribe = eventBus.on(APP_EVENTS.ROUTE_CHANGED, (data) => {
  console.log('Route changed:', data);
});

// 清理
unsubscribe();
```

---

## 🔒 安全实践

### XSS 防护
```typescript
import { escapeHtml } from '@common/utils/security';

// ✅ 安全
element.textContent = userInput;
element.innerHTML = escapeHtml(userInput);

// ❌ 危险
element.innerHTML = userInput;
```

### 存储访问
```typescript
import { storageService } from '@services/storageService';

// ✅ 推荐
storageService.set('key', { data: 'value' });
const data = storageService.get<MyType>('key');

// ❌ 不推荐
localStorage.setItem('key', JSON.stringify(data));
```

---

## 🧪 测试模式

### 单元测试
```typescript
import { describe, it, expect } from 'vitest';

describe('MyFunction', () => {
  it('should return expected result', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### E2E 测试
```typescript
import { test, expect } from '@playwright/test';

test('should navigate to home page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/SOPs/);
});
```

---

## 📊 性能指标

### 目标
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1

### 检查
```bash
npm run lighthouse       # Lighthouse 测试
npm run test:performance # 性能测试
```

---

## 🔍 调试技巧

### 开发工具
```javascript
// 调试接口
window.debugInterface

// Logger
Logger.debug('message', data);
Logger.info('message', data);
Logger.warn('message', data);
Logger.error('message', data);

// EventBus 统计
eventBus.getStats();

// 性能报告
performanceService.getReport();
```

---

## 📚 常用文档

- [README](../README.md) - 项目概览
- [CLAUDE.md](../CLAUDE.md) - 开发指南
- [最佳实践](./development/best-practices.md) - 开发规范
- [CSS 架构](./guides/css/CSS-ARCHITECTURE-README.md) - CSS 系统
- [故障排查](./troubleshooting/troubleshooting-guide.md) - 问题解决
- [文档索引](./INDEX.md) - 完整文档列表

---

## 🆘 获取帮助

1. 查看 [故障排查指南](./troubleshooting/troubleshooting-guide.md)
2. 搜索 [Issues](https://github.com/your-org/SOPs/issues)
3. 查看 [文档索引](./INDEX.md)
4. 联系维护团队

---

## 🔗 有用链接

- [Vite 文档](https://vitejs.dev/)
- [Alpine.js 文档](https://alpinejs.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Vitest 文档](https://vitest.dev/)
- [Playwright 文档](https://playwright.dev/)

---

**最后更新**: 2026-04-17  
**维护者**: sops 开发团队
