@echo off
REM tests/run-p0-tests.bat
REM ================================================================
REM P0优化功能测试运行脚本 (Windows)
REM ================================================================

echo 🧪 开始运行P0优化功能测试...
echo.

REM 运行WorkingStateManager测试
echo 📋 测试 WorkingStateManager...
call npm run test -- tests/unit/WorkingStateManager.test.ts

if %errorlevel% neq 0 (
    echo ❌ WorkingStateManager 测试失败
    exit /b 1
)

echo.
echo ✅ WorkingStateManager 测试通过
echo.

REM 运行MemoryLeakDetector测试
echo 📋 测试 MemoryLeakDetector...
call npm run test -- tests/unit/MemoryLeakDetector.test.ts

if %errorlevel% neq 0 (
    echo ❌ MemoryLeakDetector 测试失败
    exit /b 1
)

echo.
echo ✅ MemoryLeakDetector 测试通过
echo.

REM 运行EventBus测试（验证内存泄漏防护）
echo 📋 测试 EventBus（内存泄漏防护）...
call npm run test -- tests/unit/EventBus.test.ts

if %errorlevel% neq 0 (
    echo ❌ EventBus 测试失败
    exit /b 1
)

echo.
echo ✅ EventBus 测试通过
echo.

REM 生成覆盖率报告
echo 📊 生成测试覆盖率报告...
call npm run test:coverage -- tests/unit/WorkingStateManager.test.ts tests/unit/MemoryLeakDetector.test.ts

echo.
echo ✅ 所有P0优化功能测试通过！
echo.

pause
