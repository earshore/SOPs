# P0优化功能测试指南

## 📋 测试概览

本文档说明如何运行和验证P0优化功能的测试。

---

## 🧪 测试文件

### 1. WorkingStateManager 测试
**文件:** `tests/unit/WorkingStateManager.test.ts`

**测试覆盖:**
- ✅ 基础功能（设置、获取、清除工作状态）
- ✅ 超时处理（自动重试、指数退避）
- ✅ 事件通知（start, success, failure, timeout, retry）
- ✅ 统计信息（活跃任务、成功/失败计数）
- ✅ 多任务管理
- ✅ 边界情况处理

**测试用例数:** 25+

### 2. MemoryLeakDetector 测试
**文件:** `tests/unit/MemoryLeakDetector.test.ts`

**测试覆盖:**
- ✅ 基础功能（创建、配置）
- ✅ 启动和停止
- ✅ 内存使用情况获取
- ✅ EventBus监听器检测
- ✅ 快照管理
- ✅ 垃圾回收触发
- ✅ 边界情况处理

**测试用例数:** 20+

---

## 🚀 运行测试

### 方式1: 使用测试脚本（推荐）

#### Windows:
```bash
cd tests
run-p0-tests.bat
```

#### Linux/Mac:
```bash
cd tests
chmod +x run-p0-tests.sh
./run-p0-tests.sh
```

### 方式2: 使用npm命令

#### 运行所有P0测试:
```bash
npm run test -- tests/unit/WorkingStateManager.test.ts tests/unit/MemoryLeakDetector.test.ts
```

#### 运行单个测试文件:
```bash
# WorkingStateManager
npm run test -- tests/unit/WorkingStateManager.test.ts

# MemoryLeakDetector
npm run test -- tests/unit/MemoryLeakDetector.test.ts
```

#### 运行测试并生成覆盖率报告:
```bash
npm run test:coverage -- tests/unit/WorkingStateManager.test.ts tests/unit/MemoryLeakDetector.test.ts
```

#### 运行测试UI（可视化）:
```bash
npm run test:ui
```

### 方式3: 监听模式（开发时）
```bash
npm run test -- --watch tests/unit/WorkingStateManager.test.ts
```

---

## ✅ 验收标准

### WorkingStateManager
- [ ] 所有测试用例通过
- [ ] 测试覆盖率 > 90%
- [ ] 超时重试机制正常工作
- [ ] 事件通知正确触发
- [ ] 统计信息准确

### MemoryLeakDetector
- [ ] 所有测试用例通过
- [ ] 测试覆盖率 > 85%
- [ ] 内存检测正常工作
- [ ] EventBus监听器检测正常
- [ ] 快照管理正常

---

## 🐛 调试测试

### 查看详细输出:
```bash
npm run test -- --reporter=verbose tests/unit/WorkingStateManager.test.ts
```

### 只运行失败的测试:
```bash
npm run test -- --run --reporter=verbose
```

### 调试单个测试用例:
在测试文件中使用 `it.only()`:
```typescript
it.only('应该成功设置工作状态', () => {
  // 测试代码
});
```

---

## 📊 测试覆盖率目标

| 模块 | 目标覆盖率 | 当前状态 |
|------|-----------|---------|
| WorkingStateManager | > 90% | ⏳ 待测试 |
| MemoryLeakDetector | > 85% | ⏳ 待测试 |

---

## 🔍 常见问题

### Q1: 测试超时怎么办？
**A:** 检查是否正确使用了 `vi.useFakeTimers()` 和 `vi.advanceTimersByTime()`。

### Q2: EventBus测试相互影响？
**A:** 确保在 `afterEach` 中清理所有监听器：
```typescript
afterEach(() => {
  eventBus.removeAllListeners('test-event');
});
```

### Q3: 内存API不可用？
**A:** 在测试中mock performance.memory:
```typescript
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 10 * 1024 * 1024,
    totalJSHeapSize: 50 * 1024 * 1024,
    jsHeapSizeLimit: 2048 * 1024 * 1024
  },
  configurable: true
});
```

---

## 📝 测试报告

测试完成后，查看报告：

### 控制台输出
测试结果会直接显示在控制台。

### 覆盖率报告
```bash
# 生成HTML报告
npm run test:coverage

# 查看报告
# Windows: start coverage/index.html
# Mac: open coverage/index.html
# Linux: xdg-open coverage/index.html
```

### CI/CD集成
测试脚本可以直接集成到CI/CD流程：
```yaml
# .github/workflows/test.yml
- name: Run P0 Tests
  run: npm run test -- tests/unit/WorkingStateManager.test.ts tests/unit/MemoryLeakDetector.test.ts
```

---

## 🎯 下一步

测试通过后：
1. ✅ 提交代码到版本控制
2. ✅ 更新 `docs/P0_EXECUTION_PROGRESS.md`
3. ✅ 继续执行P0-3: XSS防护加固
4. ✅ 继续执行P0-4: 错误处理统一

---

**最后更新:** 2024年
