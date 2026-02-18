#!/bin/bash
# tests/run-p0-tests.sh
# ================================================================
# P0优化功能测试运行脚本
# ================================================================

echo "🧪 开始运行P0优化功能测试..."
echo ""

# 运行WorkingStateManager测试
echo "📋 测试 WorkingStateManager..."
npm run test -- tests/unit/WorkingStateManager.test.ts

if [ $? -ne 0 ]; then
    echo "❌ WorkingStateManager 测试失败"
    exit 1
fi

echo ""
echo "✅ WorkingStateManager 测试通过"
echo ""

# 运行MemoryLeakDetector测试
echo "📋 测试 MemoryLeakDetector..."
npm run test -- tests/unit/MemoryLeakDetector.test.ts

if [ $? -ne 0 ]; then
    echo "❌ MemoryLeakDetector 测试失败"
    exit 1
fi

echo ""
echo "✅ MemoryLeakDetector 测试通过"
echo ""

# 运行EventBus测试（验证内存泄漏防护）
echo "📋 测试 EventBus（内存泄漏防护）..."
npm run test -- tests/unit/EventBus.test.ts

if [ $? -ne 0 ]; then
    echo "❌ EventBus 测试失败"
    exit 1
fi

echo ""
echo "✅ EventBus 测试通过"
echo ""

# 生成覆盖率报告
echo "📊 生成测试覆盖率报告..."
npm run test:coverage -- tests/unit/WorkingStateManager.test.ts tests/unit/MemoryLeakDetector.test.ts

echo ""
echo "✅ 所有P0优化功能测试通过！"
echo ""
