@echo off
REM ================================================================
REM Lighthouse 性能基线测试运行脚本 (Windows)
REM ================================================================

echo.
echo ========================================
echo   Lighthouse 性能基线测试
echo ========================================
echo.

REM 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查 npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到 npm，请先安装 Node.js
    pause
    exit /b 1
)

REM 切换到项目根目录
cd /d "%~dp0..\.."

echo [1/4] 检查依赖...
call npm list @lhci/cli >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [警告] 未安装 @lhci/cli，正在安装...
    call npm install --save-dev @lhci/cli
    if %ERRORLEVEL% NEQ 0 (
        echo [错误] 安装 @lhci/cli 失败
        pause
        exit /b 1
    )
)

echo [2/4] 构建项目...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 构建失败
    pause
    exit /b 1
)

echo [3/4] 运行 Lighthouse 测试...
echo 提示: 这可能需要几分钟时间...
echo.

node tests/performance/lighthouse-baseline.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [错误] 测试失败
    pause
    exit /b 1
)

echo.
echo [4/4] 测试完成！
echo.
echo 查看报告:
echo   - 详细报告: tests\performance\baseline-reports\baseline-report.md
echo   - 基线数据: tests\performance\baseline-scores.json
echo.

pause
