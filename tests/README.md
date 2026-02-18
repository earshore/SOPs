# 测试规范 (Testing Standards)

> **版本**: v1.0
> **创建日期**: 2026-02-16
> **状态**: 活跃

---

## 目录

1. [测试原则](#测试原则)
2. [测试类型](#测试类型)
3. [单元测试规范](#单元测试规范)
4. [集成测试规范](#集成测试规范)
5. [测试覆盖率要求](#测试覆盖率要求)
6. [测试最佳实践](#测试最佳实践)
7. [常用工具和命令](#常用工具和命令)

---

## 测试原则

### FIRST 原则

- **F**ast - 测试应该快速执行
- **I**ndependent - 测试之间应该相互独立
- **R**epeatable - 测试应该可以重复执行
- **S**elf-Validating - 测试应该有明确的通过/失败结果
- **T**imely - 测试应该及时编写

### AAA 模式

每个测试用例应该遵循 **Arrange-Act-Assert** 模式：

```typescript
describe('Calculator', () => {
  it('should add two numbers correctly', () => {
    // Arrange - 准备测试数据和环境
    const calculator = new Calculator();
    const a = 5;
    const b = 3;

    // Act - 执行被测试的行为
    const result = calculator.add(a, b);

    // Assert - 验证结果
    expect(result).toBe(8);
  });
});
```

---

## 测试类型

### 1. 单元测试 (Unit Tests)
- 测试单个函数、类或组件
- 不依赖外部系统
- 执行速度快
- 覆盖率要求: **80%+**

### 2. 集成测试 (Integration Tests)
- 测试多个模块之间的交互
- 可以使用真实的依赖或 Mock
- 执行速度中等
- 覆盖率要求: **60%+**

### 3. E2E测试 (End-to-End Tests)
- 测试完整的用户流程
- 使用真实的浏览器环境
- 执行速度较慢
- 用于关键业务路径

---

## 单元测试规范

### 文件命名

测试文件应该与源文件放在同一目录下，命名为：

```
src/common/di/Container.ts
src/common/di/Container.test.ts
```

### 测试结构

```typescript
/**
 * Container.test.ts
 * 测试 DIContainer 的依赖注入功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Container } from './Container';

describe('DIContainer', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe('register', () => {
    it('should register a service with factory', () => {
      // Arrange
      const factory = () => ({ name: 'test' });

      // Act
      container.register('testService', factory);

      // Assert
      expect(container.has('testService')).toBe(true);
    });

    it('should throw error when registering duplicate key', () => {
      // Arrange
      const factory = () => ({ name: 'test' });
      container.register('testService', factory);

      // Act & Assert
      expect(() => {
        container.register('testService', factory);
      }).toThrow('already registered');
    });
  });

  describe('resolve', () => {
    it('should resolve registered service', () => {
      // Arrange
      const factory = () => ({ name: 'test' });
      container.register('testService', factory);

      // Act
      const service = container.resolve('testService');

      // Assert
      expect(service).toEqual({ name: 'test' });
    });

    it('should throw error when resolving unregistered service', () => {
      // Act & Assert
      expect(() => {
        container.resolve('nonExistent');
      }).toThrow('not registered');
    });
  });
});
```

### Mock 规范

使用 `vi.mock()` 来模拟外部依赖：

```typescript
// Mock 整个模块
vi.mock('@/services/loggerService', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

// Mock 部分功能
const mockFetch = vi.fn();
global.fetch = mockFetch;

// 在测试中配置 Mock 行为
beforeEach(() => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'test' })
  });
});

it('should call fetch with correct parameters', async () => {
  await service.getData();

  expect(mockFetch).toHaveBeenCalledWith('/api/data', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## 集成测试规范

### 测试多个模块交互

```typescript
/**
 * StateManager.integration.test.ts
 * 测试状态管理器与事件的集成
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '@/common/state/StateManager';
import { APP_EVENTS } from '@/common/constants/eventConstants';

describe('StateManager Integration', () => {
  let stateManager: StateManager;
  const eventListener = vi.fn();

  beforeEach(() => {
    stateManager = new StateManager();
    window.addEventListener(APP_EVENTS.STATE_UPDATED, eventListener);
  });

  afterEach(() => {
    window.removeEventListener(APP_EVENTS.STATE_UPDATED, eventListener);
  });

  it('should emit STATE_UPDATED event when state changes', () => {
    // Act
    stateManager.set('user.name', 'John');

    // Assert
    expect(eventListener).toHaveBeenCalled();
    const event = eventListener.mock.calls[0][0] as CustomEvent;
    expect(event.detail.path).toBe('user.name');
    expect(event.detail.value).toBe('John');
  });
});
```

---

## 测试覆盖率要求

### 覆盖率目标

| 模块类型 | 语句覆盖率 | 分支覆盖率 | 函数覆盖率 | 行覆盖率 |
|---------|-----------|-----------|-----------|---------|
| 核心基础设施 | 90%+ | 85%+ | 95%+ | 90%+ |
| 服务层 | 80%+ | 75%+ | 85%+ | 80%+ |
| 业务逻辑 | 70%+ | 65%+ | 75%+ | 70%+ |
| 工具函数 | 90%+ | 85%+ | 95%+ | 90%+ |

### 覆盖率配置

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/main.ts'
      ],
      thresholds: {
        lines: 70,
        functions: 75,
        branches: 65,
        statements: 70
      }
    }
  }
});
```

---

## 测试最佳实践

### 1. 测试边界条件

```typescript
describe('ArrayUtils', () => {
  describe('find', () => {
    it('should handle empty array', () => {
      expect(find([], () => true)).toBeUndefined();
    });

    it('should handle single element array', () => {
      expect(find([1], () => true)).toBe(1);
    });

    it('should handle element not found', () => {
      expect(find([1, 2, 3], () => false)).toBeUndefined();
    });
  });
});
```

### 2. 测试异步代码

```typescript
describe('AsyncService', () => {
  it('should handle successful async operation', async () => {
    const result = await service.fetchData();
    expect(result).toBeDefined();
  });

  it('should handle async errors', async () => {
    // Arrange
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    // Act & Assert
    await expect(service.fetchData()).rejects.toThrow('Network error');
  });
});
```

### 3. 测试事件和回调

```typescript
describe('EventEmitter', () => {
  it('should call all registered listeners', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    emitter.on('test', listener1);
    emitter.on('test', listener2);

    emitter.emit('test', { data: 'test' });

    expect(listener1).toHaveBeenCalledWith({ data: 'test' });
    expect(listener2).toHaveBeenCalledWith({ data: 'test' });
  });
});
```

### 4. 使用测试数据构建器

```typescript
// tests/helpers/builders.ts
export class TestDataBuilder {
  private data: any = {};

  static create() {
    return new TestDataBuilder();
  }

  withId(id: string) {
    this.data.id = id;
    return this;
  }

  withName(name: string) {
    this.data.name = name;
    return this;
  }

  build() {
    return { ...this.data };
  }
}

// 使用
const userData = TestDataBuilder.create()
  .withId('123')
  .withName('Test User')
  .build();
```

---

## 常用工具和命令

### NPM Scripts

```bash
# 运行所有测试
npm test

# 监听模式运行测试
npm test -- --watch

# 运行特定测试文件
npm test -- Container.test.ts

# 运行匹配模式的测试
npm test -- --grep "DIContainer"

# 显示测试UI
npm run test:ui

# 生成覆盖率报告
npm run test:coverage

# 在CI环境中运行测试
npm run test:ci
```

### Vitest CLI

```bash
# 运行测试（单次）
npx vitest run

# 监听模式
npx vitest watch

# UI模式
npx vitest --ui

# 覆盖率
npx vitest run --coverage

# 更新快照
npx vitest -u
```

### 调试测试

```typescript
// 在测试中使用 debugger
it('should debug', () => {
  debugger; // 设置断点
  const result = calculate();
  expect(result).toBe(42);
});
```

---

## 测试模板

### 核心模块测试模板

```typescript
/**
 * {{ModuleName}}.test.ts
 * 测试 {{ModuleName}} 的功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { {{ModuleName}} } from './{{ModuleName}}';

describe('{{ModuleName}}', () => {
  let instance: {{ModuleName}};

  beforeEach(() => {
    // 每个测试前执行
    instance = new {{ModuleName}}();
  });

  afterEach(() => {
    // 每个测试后执行清理
    vi.clearAllMocks();
  });

  describe('{{MethodGroup}}', () => {
    it('should {{expected behavior}}', () => {
      // Arrange
      const input = '{{test input}}';

      // Act
      const result = instance.{{method}}(input);

      // Assert
      expect(result).toBe('{{expected output}}');
    });
  });
});
```

---

**文档维护**: 请在更新测试规范时同步更新此文档
**问题反馈**: 在项目 Issue 中提交测试相关问题
