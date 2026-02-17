@echo off
REM ================================================================
REM 🎯 运行所有测试套件
REM Windows批处理脚本
REM ================================================================

echo.
echo ========================================
echo 🧪 运行完整测试套件
echo ========================================
echo.

REM 1. 类型检查
echo [1/4] 类型检查...
call npm run type-check
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 类型检查失败
    exit /b 1
)
echo ✅ 类型检查通过
echo.

REM 2. 代码检查
echo [2/4] 代码检查...
call npm run lint
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 代码检查失败
    exit /b 1
)
echo ✅ 代码检查通过
echo.

REM 3. 单元测试
echo [3/4] 单元测试...
call npm test -- --run
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 单元测试失败
    exit /b 1
)
echo ✅ 单元测试通过
echo.

REM 4. 覆盖率报告
echo [4/4] 生成覆盖率报告...
call npm run test:coverage
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  覆盖率未达标，但测试已通过
)
echo.

echo ========================================
echo ✅ 所有测试完成
echo ========================================
echo.
echo 📊 查看覆盖率报告: coverage/index.html
echo.

exit /b 0
