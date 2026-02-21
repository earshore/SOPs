@echo off
REM ================================================================
REM Lighthouse 快速基线测试运行脚本 (Windows)
REM 使用已构建的文件进行快速测试
REM ================================================================

echo.
echo ========================================
echo   Lighthouse 快速基线测试
echo ========================================
echo.

cd /d "%~dp0..\.."

echo [1/3] 检查构建文件...
if not exist "dist\index.html" (
    echo [警告] 未找到构建文件，正在构建...
    call npm run build
    if %ERRORLEVEL% NEQ 0 (
        echo [错误] 构建失败
        pause
        exit /b 1
    )
)

echo [2/3] 运行快速测试...
node tests/performance/quick-baseline.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [错误] 测试失败
    pause
    exit /b 1
)

echo.
echo [3/3] 完成！
echo.
echo 查看结果:
echo   - 报告: tests\performance\baseline-reports\quick-baseline-report.md
echo   - 数据: tests\performance\baseline-scores.json
echo.

pause
