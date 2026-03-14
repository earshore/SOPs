@echo off
REM ================================================================
REM Lighthouse性能测试脚本 (Windows)
REM ================================================================

echo.
echo ========================================
echo   Lighthouse 性能测试
echo ========================================
echo.

REM 检查是否已安装lighthouse
where lhci >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未安装 @lhci/cli
    echo.
    echo 请运行: npm install -g @lhci/cli
    echo.
    pause
    exit /b 1
)

REM 构建项目
echo [1/3] 构建项目...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 构建失败
    pause
    exit /b 1
)

echo.
echo [2/3] 启动预览服务器...
echo.

REM 在后台启动预览服务器
start /B npm run preview

REM 等待服务器启动
timeout /t 5 /nobreak >nul

echo.
echo [3/3] 运行 Lighthouse 测试...
echo.

REM 运行Lighthouse
call lhci autorun --config=lighthouserc.js

echo.
echo ========================================
echo   测试完成
echo ========================================
echo.
echo 查看结果: .lighthouseci 目录
echo.

pause
