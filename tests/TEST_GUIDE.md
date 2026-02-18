# 测试指南

## 📋 测试体系概览

本项目采用Vitest作为测试框架,支持单元测试、集成测试和覆盖率报告。

### 测试类型

- **单元测试**: `tests/unit/` - 测试独立模块和函数
- **集成测试**: `tests/integration/` - 测试模块间交互
- **E2E测试**: 暂未实现

### 覆盖率目标

| 指标 | 当前 | 目标 | 状态 |
|------|------|------|------|
| 语句覆盖率 | 18% | 70% | 🔴 进行中 |
| 分支覆盖率 | 63% | 65% | 🟡 接近 |
| 函数覆盖率 | 31% | 75% | 🔴 进行中 |
| 行覆盖率 | 18% | 70% | 🔴 进行中 |

---

## 🚀 快速开始

### 运行所有测试

```bash
npm test
```

### 运行测试并生成覆盖率报告

```bash
npm run test:coverage
```

### 运行测试UI界面

```bash
npm run test:ui
```

### 运行特定测试文件

```bash
npm test -- tests/unit/storageService.test.ts
```

### 监听模式(开发时使用)

```bash
npm test -- --watch
```

---

## 📁 测试文件组织

```
tests/
├── unit/                    # 单元测试
│   ├── storageService.test.ts
│   ├── httpService.test.ts
│   ├── RequestManager.test.ts
│   ├── HttpCacheService.test.ts
│   ├── RouteMiddleware.test.ts
│   ├── RouteErrorHandler.test.ts
│   └── ...
├── integration/             # 集成测试
│   ├── routing.test.ts
│   └── zustand-migration.test.ts
├── setup.ts                 # 测试环境配置
├── run-all-tests.bat       # Windows测试脚本
└── TEST_GUIDE.md           # 本文档
```

---

## ✍️ 编写测试

### 基本结构

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { YourModule } from '@/path/to/module';

describe('YourModule', () => {
    beforeEach(() => {
        // 每个测试前的准备工作
    });

    afterEach(() => {
        // 每个测试后的清理工作
    });

    describe('功能分组', () => {
        it('应该做某事', () => {
            // Arrange: 准备测试数据
            const input = 'test';
            
            // Act: 执行被测试的代码
            const result = YourModule.doSomething(input);
            
            // Assert: 验证结果
            expect(result).toBe('expected');
        });
    });
});
```

### Mock示例

```typescript
import { vi } from 'vitest';

// Mock函数
const mockFn = vi.fn();
mockFn.mockReturnValue('mocked value');

// Mock模块
vi.mock('@/services/httpService', () => ({
    HttpService: {
        get: vi.fn().mockResolvedValue({ data: 'mocked' })
    }
}));

// Spy
const spy = vi.spyOn(object, 'method');
expect(spy).toHaveBeenCalled();
```

### 异步测试

```typescript
it('应该处理异步操作', async () => {
    const result = await asyncFunction();
    expect(result).toBe('expected');
});

it('应该处理Promise拒绝', async () => {
    await expect(failingFunction()).rejects.toThrow('Error message');
});
```

---

## 🎯 测试最佳实践

### 1. 测试命名

- 使用描述性的测试名称
- 使用"应该..."格式
- 清晰表达测试意图

```typescript
// ✅ 好
it('应该在用户未登录时返回401错误', () => {});

// ❌ 差
it('测试登录', () => {});
```

### 2. AAA模式

遵循Arrange-Act-Assert模式:

```typescript
it('应该计算总价', () => {
    // Arrange: 准备
    const items = [{ price: 10 }, { price: 20 }];
    
    // Act: 执行
    const total = calculateTotal(items);
    
    // Assert: 断言
    expect(total).toBe(30);
});
```

### 3. 测试独立性

- 每个测试应该独立运行
- 不依赖其他测试的执行顺序
- 使用beforeEach/afterEach清理状态

```typescript
beforeEach(() => {
    localStorage.clear();
    // 重置所有mock
    vi.clearAllMocks();
});
```

### 4. 边界条件

测试边界情况和异常路径:

```typescript
describe('边界条件', () => {
    it('应该处理空数组', () => {});
    it('应该处理null值', () => {});
    it('应该处理超大数值', () => {});
    it('应该处理特殊字符', () => {});
});
```

### 5. 错误处理

验证错误处理逻辑:

```typescript
it('应该抛出特定错误', () => {
    expect(() => {
        dangerousFunction();
    }).toThrow('Expected error message');
});

it('应该处理异步错误', async () => {
    await expect(asyncFunction()).rejects.toThrow();
});
```

---

## 🔧 配置说明

### vitest.config.js

```javascript
export default defineConfig({
    test: {
        environment: 'jsdom',        // 浏览器环境模拟
        globals: true,               // 全局API
        coverage: {
            provider: 'v8',          // 覆盖率提供者
            reporter: ['text', 'html', 'lcov'],
            thresholds: {            // 覆盖率阈值
                lines: 70,
                functions: 75,
                branches: 65,
                statements: 70
            }
        }
    }
});
```

### 路径别名

测试中可以使用路径别名:

```typescript
import { Service } from '@services/service';
import { Component } from '@components/component';
import { Util } from '@common/utils/util';
```

---

## 📊 覆盖率报告

### 查看报告

运行测试后,在浏览器中打开:

```
coverage/index.html
```

### 理解覆盖率指标

- **Statements**: 语句覆盖率 - 执行的代码语句百分比
- **Branches**: 分支覆盖率 - 执行的条件分支百分比
- **Functions**: 函数覆盖率 - 调用的函数百分比
- **Lines**: 行覆盖率 - 执行的代码行百分比

### 提高覆盖率

1. 识别未覆盖的代码(红色标记)
2. 为未覆盖的分支编写测试
3. 测试错误处理路径
4. 测试边界条件

---

## 🔄 CI/CD集成

### GitHub Actions

项目配置了自动化测试流程:

- **触发条件**: Push到main/develop分支,或PR
- **测试矩阵**: Node.js 18.x和20.x
- **执行步骤**:
  1. 类型检查
  2. 代码检查
  3. 运行测试
  4. 生成覆盖率报告
  5. 上传测试结果

### 本地运行完整测试套件

```bash
# Windows
tests\run-all-tests.bat

# 或直接运行
npm run type-check && npm run lint && npm run test:coverage
```

---

## 🐛 调试测试

### 使用console.log

```typescript
it('调试测试', () => {
    const value = someFunction();
    console.log('Debug value:', value);
    expect(value).toBe('expected');
});
```

### 使用debugger

```typescript
it('断点调试', () => {
    debugger; // 在此处暂停
    const result = functionToDebug();
    expect(result).toBe('expected');
});
```

### 运行单个测试

```typescript
// 只运行这个测试
it.only('聚焦测试', () => {
    // ...
});

// 跳过这个测试
it.skip('跳过测试', () => {
    // ...
});
```

---

## 📚 常用断言

```typescript
// 相等性
expect(value).toBe(expected);           // 严格相等 ===
expect(value).toEqual(expected);        // 深度相等
expect(value).not.toBe(unexpected);     // 不相等

// 真值
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// 数字
expect(value).toBeGreaterThan(3);
expect(value).toBeGreaterThanOrEqual(3);
expect(value).toBeLessThan(5);
expect(value).toBeCloseTo(0.3, 5);      // 浮点数比较

// 字符串
expect(string).toMatch(/pattern/);
expect(string).toContain('substring');

// 数组/对象
expect(array).toContain(item);
expect(array).toHaveLength(3);
expect(object).toHaveProperty('key');
expect(object).toHaveProperty('key', value);

// 函数
expect(fn).toThrow();
expect(fn).toThrow('error message');
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg1, arg2);
expect(fn).toHaveBeenCalledTimes(3);

// Promise
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();
```

---

## 🎓 学习资源

- [Vitest官方文档](https://vitest.dev/)
- [测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Jest/Vitest API参考](https://vitest.dev/api/)

---

## 📝 测试清单

在提交PR前,确保:

- [ ] 所有测试通过
- [ ] 新代码有对应的测试
- [ ] 覆盖率不低于当前水平
- [ ] 类型检查通过
- [ ] 代码检查通过
- [ ] 测试命名清晰
- [ ] 测试独立且可重复

---

**文档版本**: 1.0.0  
**最后更新**: 2026-02-17
